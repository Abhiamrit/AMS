const express = require("express");
const { getDb } = require("../models/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { auditLog } = require("../utils/audit");
const { generateAssignmentCode } = require("../utils/idgen");
const {
  notifyAllMAS,
  notifyAdmins,
  createNotification,
} = require("../utils/notifications");

const router = express.Router();
router.use(requireAuth);

function getFullAssignment(db, assignmentId) {
  const assignment = db
    .prepare(
      `
    SELECT a.*, c.client_name, c.client_type, c.client_code, c.address, c.associated_project,
           s.section_name, s.section_head,
           u.full_name as created_by_name,
           comp.full_name as completed_by_name
    FROM assignments a
    LEFT JOIN clients c ON a.client_id = c.client_id
    LEFT JOIN sections s ON a.section_id = s.section_id
    LEFT JOIN users u ON a.created_by = u.user_id
    LEFT JOIN users comp ON a.completed_by = comp.user_id
    WHERE a.assignment_id = ?
  `,
    )
    .get(assignmentId);

  if (!assignment) return null;

  const columns = db
    .prepare(
      "SELECT * FROM assignment_table_columns WHERE assignment_id = ? ORDER BY column_order",
    )
    .all(assignmentId);
  const rows = db
    .prepare(
      "SELECT * FROM assignment_table_rows WHERE assignment_id = ? ORDER BY row_order",
    )
    .all(assignmentId);
  const cells = db
    .prepare(
      `
    SELECT atc.* FROM assignment_table_cells atc
    JOIN assignment_table_rows atr ON atc.row_id = atr.row_id
    WHERE atr.assignment_id = ?
  `,
    )
    .all(assignmentId);

  const rowsWithCells = rows.map((row) => {
    const rowCells = {};
    cells
      .filter((c) => c.row_id === row.row_id)
      .forEach((cell) => {
        rowCells[cell.column_id] = cell.cell_value;
      });
    return { ...row, cells: rowCells };
  });

  return { ...assignment, columns, rows: rowsWithCells };
}

// Insert columns and return array of { tempIndex -> real column_id }
function insertColumns(db, assignmentId, columns) {
  const insertCol = db.prepare(
    `INSERT INTO assignment_table_columns (assignment_id, column_name, column_type, column_order, is_predefined) VALUES (?, ?, ?, ?, ?)`,
  );
  const colMap = []; // index in array -> real column_id
  columns.forEach((col, i) => {
    const result = insertCol.run(
      assignmentId,
      col.column_name,
      col.column_type || "TEXT",
      col.column_order !== undefined ? col.column_order : i,
      col.is_predefined ? 1 : 0,
    );
    colMap[i] = result.lastInsertRowid;
  });
  return colMap;
}

// Insert rows; cells keyed by column order index (0,1,2...) mapped via colMap
function insertRows(db, assignmentId, rows, colMap) {
  const insertRow = db.prepare(
    `INSERT INTO assignment_table_rows (assignment_id, row_order) VALUES (?, ?)`,
  );
  const insertCell = db.prepare(
    `INSERT OR REPLACE INTO assignment_table_cells (row_id, column_id, cell_value) VALUES (?, ?, ?)`,
  );
  rows.forEach((row, ri) => {
    const rowResult = insertRow.run(assignmentId, ri);
    const rowId = rowResult.lastInsertRowid;
    if (row.cells) {
      Object.entries(row.cells).forEach(([colIdx, val]) => {
        const realColId = colMap[parseInt(colIdx)];
        if (realColId !== undefined) {
          insertCell.run(
            rowId,
            realColId,
            val !== undefined && val !== null ? String(val) : null,
          );
        }
      });
    }
  });
}

// GET /api/assignments
router.get("/", (req, res) => {
  const db = getDb();
  const { status } = req.query;
  let sql = `
    SELECT a.*, c.client_name, s.section_name, u.full_name as created_by_name
    FROM assignments a
    LEFT JOIN clients c ON a.client_id = c.client_id
    LEFT JOIN sections s ON a.section_id = s.section_id
    LEFT JOIN users u ON a.created_by = u.user_id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === "STAFF") {
    // Show assignments created by this user OR routed/assigned to this user via assignment_routing
    sql += ` AND (
      a.created_by = ?
      OR a.assignment_id IN (
        SELECT ar.assignment_id FROM assignment_routing ar
        WHERE ar.assigned_to = ?
      )
      OR (
        ? IS NOT NULL AND a.assignment_id IN (
          SELECT ar2.assignment_id FROM assignment_routing ar2
          WHERE ar2.section_id = ? AND ar2.assigned_to IS NULL AND ar2.status = 'IN PROGRESS'
        )
      )
    )`;
    params.push(
      req.user.user_id,
      req.user.user_id,
      req.user.section_id || null,
      req.user.section_id || null,
    );
  }
  if (req.user.role === "MAS") {
    sql += " AND a.status IN ('PENDING','COMPLETED')";
  }
  if (status) {
    sql += " AND a.status = ?";
    params.push(status.toUpperCase());
  }
  sql += " ORDER BY a.created_at DESC";

  const assignments = db.prepare(sql).all(...params);
  res.json({ assignments });
});

// GET /api/assignments/inbox  — section members: assignments assigned to them
router.get("/inbox", (req, res) => {
  const db = getDb();
  const items = db
    .prepare(
      `
    SELECT ar.*, a.assignment_code, a.assignment_name, a.status as assignment_status,
           s.section_name, u.full_name as assigned_by_name,
           c.client_name
    FROM assignment_routing ar
    JOIN assignments a ON ar.assignment_id = a.assignment_id
    JOIN sections s ON ar.section_id = s.section_id
    LEFT JOIN users u ON ar.assigned_by = u.user_id
    LEFT JOIN clients c ON a.client_id = c.client_id
    WHERE ar.assigned_to = ? AND ar.status IN ('IN PROGRESS', 'SENT BACK')
    ORDER BY ar.assigned_at DESC
  `,
    )
    .all(req.user.user_id);
  res.json({ items });
});

// GET /api/assignments/:id
router.get("/:id", (req, res) => {
  const db = getDb();
  const full = getFullAssignment(db, req.params.id);
  if (!full) return res.status(404).json({ error: "Assignment not found." });
  if (req.user.role === "STAFF" && full.created_by !== req.user.user_id) {
    const isRoutedToUser = db
      .prepare(
        `
      SELECT 1 FROM assignment_routing
      WHERE assignment_id = ? AND (
        assigned_to = ?
        OR (section_id = ? AND assigned_to IS NULL AND status = 'IN PROGRESS')
      ) LIMIT 1
    `,
      )
      .get(req.params.id, req.user.user_id, req.user.section_id || -1);
    if (!isRoutedToUser) return res.status(403).json({ error: "Forbidden." });
  }
  res.json({ assignment: full });
});

// POST /api/assignments
router.post("/", requireRole("STAFF", "ADMIN"), (req, res) => {
  const { assignment_name, client_id, section_id, scope, columns, rows } =
    req.body;
  if (!assignment_name || !client_id || !section_id)
    return res
      .status(400)
      .json({ error: "Assignment name, client, and section are required." });

  const db = getDb();
  const code = generateAssignmentCode();
  const assignmentResult = db
    .prepare(
      `INSERT INTO assignments (assignment_code, assignment_name, client_id, section_id, scope, created_by, status) VALUES (?, ?, ?, ?, ?, ?, 'DRAFT')`,
    )
    .run(
      code,
      assignment_name.trim(),
      client_id,
      section_id,
      scope || null,
      req.user.user_id,
    );
  const assignmentId = assignmentResult.lastInsertRowid;

  const colMap =
    columns && columns.length > 0
      ? insertColumns(db, assignmentId, columns)
      : [];
  if (rows && rows.length > 0) insertRows(db, assignmentId, rows, colMap);

  auditLog({
    userId: req.user.user_id,
    userRole: req.user.role,
    actionType: "CREATE_ASSIGNMENT",
    affectedEntity: "ASSIGNMENT",
    entityId: assignmentId,
    ipAddress: req.ip,
  });
  res.status(201).json({
    message: "Assignment created.",
    assignment_id: assignmentId,
    assignment_code: code,
  });
});

// PUT /api/assignments/:id
router.put("/:id", requireRole("STAFF", "ADMIN"), (req, res) => {
  const db = getDb();
  const assignment = db
    .prepare("SELECT * FROM assignments WHERE assignment_id = ?")
    .get(req.params.id);
  if (!assignment)
    return res.status(404).json({ error: "Assignment not found." });
  if (req.user.role === "STAFF" && assignment.created_by !== req.user.user_id)
    return res.status(403).json({ error: "Forbidden." });
  if (assignment.status !== "DRAFT")
    return res
      .status(400)
      .json({ error: "Only draft assignments can be edited." });

  const { assignment_name, client_id, section_id, scope, columns, rows } =
    req.body;

  db.prepare(
    `UPDATE assignments SET
    assignment_name = COALESCE(?, assignment_name),
    client_id = COALESCE(?, client_id),
    section_id = COALESCE(?, section_id),
    scope = ?
    WHERE assignment_id = ?
  `,
  ).run(
    assignment_name || null,
    client_id || null,
    section_id || null,
    scope || null,
    req.params.id,
  );

  if (columns !== undefined) {
    db.prepare(
      "DELETE FROM assignment_table_columns WHERE assignment_id = ?",
    ).run(req.params.id);
    db.prepare("DELETE FROM assignment_table_rows WHERE assignment_id = ?").run(
      req.params.id,
    );
    const colMap =
      columns.length > 0 ? insertColumns(db, req.params.id, columns) : [];
    if (rows && rows.length > 0) insertRows(db, req.params.id, rows, colMap);
  }

  res.json({ message: "Assignment updated." });
});

// POST /api/assignments/:id/route  — Creator starts routing
router.post("/:id/route", requireRole("STAFF", "ADMIN"), (req, res) => {
  const db = getDb();
  const assignment = db
    .prepare("SELECT * FROM assignments WHERE assignment_id = ?")
    .get(req.params.id);
  if (!assignment)
    return res.status(404).json({ error: "Assignment not found." });
  if (assignment.created_by !== req.user.user_id && req.user.role !== "ADMIN")
    return res.status(403).json({ error: "Forbidden." });
  if (assignment.status !== "DRAFT")
    return res
      .status(400)
      .json({ error: "Only DRAFT assignments can be routed." });

  const { section_ids } = req.body; // ordered array of section IDs
  if (!section_ids || !Array.isArray(section_ids) || section_ids.length === 0)
    return res.status(400).json({ error: "section_ids array is required." });

  // Remove creator's own section from routing if present
  const creatorSection = req.user.section_id;
  const filteredSections = section_ids.filter((sid) => sid !== creatorSection);
  if (filteredSections.length === 0)
    return res.status(400).json({
      error: "At least one section (excluding your own) is required.",
    });

  // Insert routing steps
  const insertRouting = db.prepare(`
    INSERT INTO assignment_routing (assignment_id, section_id, routing_order, status)
    VALUES (?, ?, ?, ?)
  `);
  filteredSections.forEach((sectionId, idx) => {
    insertRouting.run(
      assignment.assignment_id,
      sectionId,
      idx,
      idx === 0 ? "IN PROGRESS" : "WAITING",
    );
  });

  // Update assignment status
  db.prepare(
    `UPDATE assignments SET status = 'IN ROUTING', current_routing_step = 0, total_routing_steps = ? WHERE assignment_id = ?`,
  ).run(filteredSections.length, assignment.assignment_id);

  // Notify section head of first section
  const { notifySectionHead } = require("../utils/notifications");
  notifySectionHead({
    sectionId: filteredSections[0],
    message: `Assignment ${assignment.assignment_code} has been routed to your section for review.`,
    relatedAssignmentId: assignment.assignment_id,
  });

  auditLog({
    userId: req.user.user_id,
    userRole: req.user.role,
    actionType: "ASSIGNMENT_ROUTED",
    affectedEntity: "ASSIGNMENT",
    entityId: assignment.assignment_id,
    ipAddress: req.ip,
  });
  res.json({ message: "Assignment routing started." });
});

// GET /api/assignments/:id/routing  — Full routing history
router.get("/:id/routing", (req, res) => {
  const db = getDb();
  const routing = db
    .prepare(
      `
    SELECT ar.*, s.section_name, s.section_code,
           u1.full_name as assigned_to_name,
           u2.full_name as assigned_by_name
    FROM assignment_routing ar
    JOIN sections s ON ar.section_id = s.section_id
    LEFT JOIN users u1 ON ar.assigned_to = u1.user_id
    LEFT JOIN users u2 ON ar.assigned_by = u2.user_id
    WHERE ar.assignment_id = ?
    ORDER BY ar.routing_order
  `,
    )
    .all(req.params.id);
  res.json({ routing });
});

// POST /api/assignments/:id/forward  — Send to MAS (only when UNDER REVIEW)
router.post("/:id/forward", requireRole("STAFF"), (req, res) => {
  const db = getDb();
  const assignment = db
    .prepare("SELECT * FROM assignments WHERE assignment_id = ?")
    .get(req.params.id);
  if (!assignment)
    return res.status(404).json({ error: "Assignment not found." });
  if (assignment.created_by !== req.user.user_id)
    return res.status(403).json({ error: "Forbidden." });
  if (assignment.status !== "UNDER REVIEW")
    return res.status(400).json({
      error: "Assignment must be UNDER REVIEW before forwarding to MAS.",
    });

  db.prepare(
    `UPDATE assignments SET status = 'PENDING', forwarded_at = ? WHERE assignment_id = ?`,
  ).run(new Date().toISOString(), req.params.id);

  notifyAllMAS({
    message: `New assignment ${assignment.assignment_code} has been forwarded for review.`,
    relatedAssignmentId: assignment.assignment_id,
  });
  notifyAdmins({
    message: `Assignment ${assignment.assignment_code} forwarded to MAS by ${req.user.full_name}.`,
    relatedAssignmentId: assignment.assignment_id,
  });
  auditLog({
    userId: req.user.user_id,
    userRole: req.user.role,
    actionType: "FORWARD_ASSIGNMENT",
    affectedEntity: "ASSIGNMENT",
    entityId: assignment.assignment_id,
    ipAddress: req.ip,
  });
  res.json({ message: "Assignment forwarded to MAS." });
});

// POST /api/assignments/:id/complete  — MAS marks complete
router.post("/:id/complete", requireRole("MAS"), (req, res) => {
  const { mas_remarks } = req.body;
  const db = getDb();
  const assignment = db
    .prepare("SELECT * FROM assignments WHERE assignment_id = ?")
    .get(req.params.id);
  if (!assignment)
    return res.status(404).json({ error: "Assignment not found." });
  if (assignment.status !== "PENDING")
    return res.status(400).json({ error: "Assignment is not pending." });

  db.prepare(
    `UPDATE assignments SET status = 'COMPLETED', completed_at = ?, completed_by = ?, mas_remarks = ? WHERE assignment_id = ?`,
  ).run(
    new Date().toISOString(),
    req.user.user_id,
    mas_remarks || null,
    req.params.id,
  );

  createNotification({
    recipientUserId: assignment.created_by,
    message: `Your assignment ${assignment.assignment_code} has been marked as Completed by MAS.`,
    relatedAssignmentId: assignment.assignment_id,
  });
  notifyAdmins({
    message: `Assignment ${assignment.assignment_code} marked Completed by ${req.user.full_name}.`,
    relatedAssignmentId: assignment.assignment_id,
  });
  auditLog({
    userId: req.user.user_id,
    userRole: req.user.role,
    actionType: "ASSIGNMENT_COMPLETED",
    affectedEntity: "ASSIGNMENT",
    entityId: assignment.assignment_id,
    ipAddress: req.ip,
  });
  res.json({ message: "Assignment marked as completed." });
});

// PATCH /api/assignments/:id/remarks
router.patch("/:id/remarks", requireRole("MAS"), (req, res) => {
  const { mas_remarks } = req.body;
  const db = getDb();
  db.prepare(
    "UPDATE assignments SET mas_remarks = ? WHERE assignment_id = ?",
  ).run(mas_remarks || null, req.params.id);
  res.json({ message: "Remarks saved." });
});

module.exports = router;
