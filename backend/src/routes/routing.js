const express = require('express');
const { getDb } = require('../models/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');
const { notifySectionHead, notifyUser, notifyCreator, notifyAdmins } = require('../utils/notifications');

const router = express.Router();
router.use(requireAuth);

// ─── GET /api/routing/:routingId  ────────────────────────────────────────────
// Fetch a single routing step — accessible to: the assigned user, the section
// head of that section, or an admin.  This is what AssignmentWork.js calls so
// section heads can open the work page without being in assigned_to.
router.get('/:routingId', (req, res) => {
  const db = getDb();

  const routing = db.prepare(`
    SELECT ar.*,
           a.assignment_code, a.assignment_name, a.status as assignment_status,
           a.created_by,
           s.section_name,
           u_ab.full_name as assigned_by_name,
           u_at.full_name as assigned_to_name,
           c.client_name
    FROM assignment_routing ar
    JOIN assignments a  ON ar.assignment_id = a.assignment_id
    JOIN sections s     ON ar.section_id    = s.section_id
    LEFT JOIN users u_ab ON ar.assigned_by  = u_ab.user_id
    LEFT JOIN users u_at ON ar.assigned_to  = u_at.user_id
    LEFT JOIN clients c  ON a.client_id     = c.client_id
    WHERE ar.routing_id = ?
  `).get(req.params.routingId);

  if (!routing) return res.status(404).json({ error: 'Routing step not found.' });

  const isSectionHead = req.user.section_id === routing.section_id && !!req.user.is_section_head;
  const isAssigned    = routing.assigned_to === req.user.user_id;
  const isAdmin       = req.user.role === 'ADMIN';

  if (!isSectionHead && !isAssigned && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  res.json({ routing });
});

// ─── POST /api/routing/:routingId/fill-myself  ───────────────────────────────
// Section head takes the work themselves (sets assigned_to = self).
router.post('/:routingId/fill-myself', (req, res) => {
  const db = getDb();

  const routing = db.prepare(`
    SELECT ar.*, a.assignment_code
    FROM assignment_routing ar
    JOIN assignments a ON ar.assignment_id = a.assignment_id
    WHERE ar.routing_id = ?
  `).get(req.params.routingId);

  if (!routing) return res.status(404).json({ error: 'Routing step not found.' });

  if (req.user.section_id !== routing.section_id || !req.user.is_section_head) {
    return res.status(403).json({ error: 'Only the section head of this section can do this.' });
  }
  if (routing.status === 'DONE') {
    return res.status(400).json({ error: 'This routing step is already completed.' });
  }

  db.prepare(`
    UPDATE assignment_routing
    SET assigned_to = ?, assigned_by = ?, assigned_at = ?, status = 'IN PROGRESS'
    WHERE routing_id = ?
  `).run(req.user.user_id, req.user.user_id, new Date().toISOString(), req.params.routingId);

  auditLog({ userId: req.user.user_id, userRole: req.user.role, actionType: 'SECTION_FILL_MYSELF', affectedEntity: 'ROUTING', entityId: req.params.routingId, ipAddress: req.ip });
  res.json({ message: 'You are now assigned to fill this section\'s data.' });
});

// ─── POST /api/routing/:routingId/assign  ────────────────────────────────────
// Section head assigns to a member.
router.post('/:routingId/assign', (req, res) => {
  const db = getDb();
  const { assigned_to } = req.body;
  if (!assigned_to) return res.status(400).json({ error: 'assigned_to user_id is required.' });

  const routing = db.prepare(`
    SELECT ar.*, a.assignment_code FROM assignment_routing ar
    JOIN assignments a ON ar.assignment_id = a.assignment_id
    WHERE ar.routing_id = ?
  `).get(req.params.routingId);
  if (!routing) return res.status(404).json({ error: 'Routing step not found.' });

  if (req.user.section_id !== routing.section_id || !req.user.is_section_head) {
    return res.status(403).json({ error: 'Only the section head of this section can assign.' });
  }

  db.prepare(`
    UPDATE assignment_routing
    SET assigned_to = ?, assigned_by = ?, assigned_at = ?, status = 'IN PROGRESS'
    WHERE routing_id = ?
  `).run(assigned_to, req.user.user_id, new Date().toISOString(), req.params.routingId);

  notifyUser({
    userId: assigned_to,
    message: `You have been assigned to work on assignment ${routing.assignment_code}.`,
    relatedAssignmentId: routing.assignment_id,
  });

  auditLog({ userId: req.user.user_id, userRole: req.user.role, actionType: 'SECTION_ASSIGNED', affectedEntity: 'ROUTING', entityId: req.params.routingId, ipAddress: req.ip });
  res.json({ message: 'Assignment assigned to member.' });
});

// ─── POST /api/routing/:routingId/complete  ──────────────────────────────────
// Section member (or head) marks their section done.
router.post('/:routingId/complete', (req, res) => {
  const db = getDb();
  const { notes } = req.body;

  const routing = db.prepare(`
    SELECT ar.*, a.assignment_code, a.created_by, a.total_routing_steps
    FROM assignment_routing ar
    JOIN assignments a ON ar.assignment_id = a.assignment_id
    WHERE ar.routing_id = ?
  `).get(req.params.routingId);
  if (!routing) return res.status(404).json({ error: 'Routing step not found.' });

  const isSectionHead = req.user.section_id === routing.section_id && !!req.user.is_section_head;
  const isAssigned    = routing.assigned_to === req.user.user_id;
  if (!isSectionHead && !isAssigned) return res.status(403).json({ error: 'Forbidden.' });

  if (routing.status === 'DONE') return res.status(400).json({ error: 'Already completed.' });

  // Mark this step done
  db.prepare(`
    UPDATE assignment_routing SET status = 'DONE', completed_at = ?, notes = ? WHERE routing_id = ?
  `).run(new Date().toISOString(), notes || null, req.params.routingId);

  // Find next step
  const nextStep = db.prepare(`
    SELECT * FROM assignment_routing WHERE assignment_id = ? AND routing_order = ? AND status = 'WAITING'
  `).get(routing.assignment_id, routing.routing_order + 1);

  if (nextStep) {
    db.prepare(`UPDATE assignment_routing SET status = 'IN PROGRESS' WHERE routing_id = ?`).run(nextStep.routing_id);
    db.prepare(`UPDATE assignments SET current_routing_step = ? WHERE assignment_id = ?`)
      .run(routing.routing_order + 1, routing.assignment_id);

    notifySectionHead({
      sectionId: nextStep.section_id,
      message: `Assignment ${routing.assignment_code} has been passed to your section for review.`,
      relatedAssignmentId: routing.assignment_id,
    });
    notifyCreator({
      creatorUserId: routing.created_by,
      message: `Section ${routing.routing_order + 1} of ${routing.total_routing_steps} has completed work on assignment ${routing.assignment_code}.`,
      relatedAssignmentId: routing.assignment_id,
    });
  } else {
    // All sections done — return to creator (UNDER REVIEW)
    db.prepare(`UPDATE assignments SET status = 'UNDER REVIEW' WHERE assignment_id = ?`).run(routing.assignment_id);
    notifyCreator({
      creatorUserId: routing.created_by,
      message: `All sections have completed their review of assignment ${routing.assignment_code}. It is now UNDER REVIEW — you may forward it to MAS.`,
      relatedAssignmentId: routing.assignment_id,
    });
    notifyAdmins({
      message: `Assignment ${routing.assignment_code} has completed all section routing and is now UNDER REVIEW.`,
      relatedAssignmentId: routing.assignment_id,
    });
    auditLog({ userId: req.user.user_id, userRole: req.user.role, actionType: 'ASSIGNMENT_RETURNED_TO_CREATOR', affectedEntity: 'ASSIGNMENT', entityId: routing.assignment_id, ipAddress: req.ip });
  }

  auditLog({ userId: req.user.user_id, userRole: req.user.role, actionType: 'SECTION_COMPLETED', affectedEntity: 'ROUTING', entityId: req.params.routingId, ipAddress: req.ip });
  res.json({ message: 'Section work marked as completed.' });
});

// ─── POST /api/routing/:routingId/sendback  ──────────────────────────────────
router.post('/:routingId/sendback', requireRole('STAFF', 'ADMIN'), (req, res) => {
  const db = getDb();
  const { reason } = req.body;

  const routing = db.prepare(`
    SELECT ar.*, a.assignment_code, a.created_by FROM assignment_routing ar
    JOIN assignments a ON ar.assignment_id = a.assignment_id
    WHERE ar.routing_id = ?
  `).get(req.params.routingId);
  if (!routing) return res.status(404).json({ error: 'Routing step not found.' });

  if (routing.created_by !== req.user.user_id && req.user.role !== 'ADMIN')
    return res.status(403).json({ error: 'Forbidden.' });

  const assignment = db.prepare('SELECT * FROM assignments WHERE assignment_id = ?').get(routing.assignment_id);
  if (assignment.status !== 'UNDER REVIEW')
    return res.status(400).json({ error: 'Assignment must be UNDER REVIEW to send back.' });

  db.prepare(`
    UPDATE assignment_routing SET status = 'SENT BACK', sent_back_reason = ?, completed_at = NULL
    WHERE routing_id = ?
  `).run(reason || null, req.params.routingId);

  db.prepare(`UPDATE assignments SET status = 'IN ROUTING' WHERE assignment_id = ?`).run(routing.assignment_id);

  notifySectionHead({
    sectionId: routing.section_id,
    message: `Assignment ${routing.assignment_code} has been sent back to your section by the creator${reason ? ': ' + reason : '.'}`,
    relatedAssignmentId: routing.assignment_id,
  });

  auditLog({ userId: req.user.user_id, userRole: req.user.role, actionType: 'ASSIGNMENT_SENT_BACK', affectedEntity: 'ROUTING', entityId: req.params.routingId, ipAddress: req.ip });
  res.json({ message: 'Assignment sent back to section.' });
});

// ─── GET /api/routing/:routingId/table  ──────────────────────────────────────
router.get('/:routingId/table', (req, res) => {
  const db = getDb();

  const tableHeader = db.prepare(`
    SELECT sdt.*, s.section_name FROM section_data_tables sdt
    JOIN sections s ON sdt.section_id = s.section_id
    WHERE sdt.routing_id = ?
  `).get(req.params.routingId);

  if (!tableHeader) return res.json({ table: null });

  const columns = db.prepare(`SELECT * FROM section_table_columns WHERE section_table_id = ? ORDER BY column_order`).all(tableHeader.section_table_id);
  const rows    = db.prepare(`SELECT * FROM section_table_rows    WHERE section_table_id = ? ORDER BY row_order`).all(tableHeader.section_table_id);
  const cells   = db.prepare(`
    SELECT stc.* FROM section_table_cells stc
    JOIN section_table_rows str ON stc.row_id = str.row_id
    WHERE str.section_table_id = ?
  `).all(tableHeader.section_table_id);

  const rowsWithCells = rows.map(row => {
    const rowCells = {};
    cells.filter(c => c.row_id === row.row_id).forEach(cell => { rowCells[cell.column_id] = cell.cell_value; });
    return { ...row, cells: rowCells };
  });

  res.json({ table: { ...tableHeader, columns, rows: rowsWithCells } });
});

// ─── POST /api/routing/:routingId/table  ─────────────────────────────────────
// Save (or replace) the section's data table + remarks.
// Blocked after the step is DONE (data locked).
router.post('/:routingId/table', (req, res) => {
  const db = getDb();
  const { columns, rows, remarks } = req.body;

  const routing = db.prepare('SELECT * FROM assignment_routing WHERE routing_id = ?').get(req.params.routingId);
  if (!routing) return res.status(404).json({ error: 'Routing step not found.' });

  // Locked after completion
  if (routing.status === 'DONE') {
    return res.status(403).json({ error: 'This section\'s data is locked after submission.' });
  }

  // Auth: only assigned user or section head
  const isSectionHead = req.user.section_id === routing.section_id && !!req.user.is_section_head;
  const isAssigned    = routing.assigned_to === req.user.user_id;
  if (!isSectionHead && !isAssigned) return res.status(403).json({ error: 'Forbidden.' });

  // Delete existing table for this routing step
  const existing = db.prepare('SELECT * FROM section_data_tables WHERE routing_id = ?').get(req.params.routingId);
  if (existing) {
    const existingRows = db.prepare('SELECT row_id FROM section_table_rows WHERE section_table_id = ?').all(existing.section_table_id);
    existingRows.forEach(r => { db.prepare('DELETE FROM section_table_cells WHERE row_id = ?').run(r.row_id); });
    db.prepare('DELETE FROM section_table_rows    WHERE section_table_id = ?').run(existing.section_table_id);
    db.prepare('DELETE FROM section_table_columns WHERE section_table_id = ?').run(existing.section_table_id);
    db.prepare('DELETE FROM section_data_tables   WHERE section_table_id = ?').run(existing.section_table_id);
  }

  // Insert new table header (with remarks)
  const tableResult = db.prepare(`
    INSERT INTO section_data_tables (assignment_id, section_id, routing_id, created_by, remarks)
    VALUES (?, ?, ?, ?, ?)
  `).run(routing.assignment_id, routing.section_id, routing.routing_id, req.user.user_id, remarks || null);
  const sectionTableId = tableResult.lastInsertRowid;

  // Insert columns
  const colMap = [];
  if (columns && columns.length > 0) {
    const insertCol = db.prepare(`
      INSERT INTO section_table_columns (section_table_id, column_name, column_type, column_order, is_predefined)
      VALUES (?, ?, ?, ?, ?)
    `);
    columns.forEach((col, i) => {
      const r = insertCol.run(sectionTableId, col.column_name, col.column_type || 'TEXT', i, col.is_predefined ? 1 : 0);
      colMap[i] = r.lastInsertRowid;
    });
  }

  // Insert rows and cells
  if (rows && rows.length > 0) {
    const insertRow  = db.prepare(`INSERT INTO section_table_rows (section_table_id, row_order) VALUES (?, ?)`);
    const insertCell = db.prepare(`INSERT OR REPLACE INTO section_table_cells (row_id, column_id, cell_value) VALUES (?, ?, ?)`);
    rows.forEach((row, ri) => {
      const rowResult = insertRow.run(sectionTableId, ri);
      const rowId     = rowResult.lastInsertRowid;
      if (row.cells) {
        Object.entries(row.cells).forEach(([colIdx, val]) => {
          const realColId = colMap[parseInt(colIdx)];
          if (realColId !== undefined) {
            insertCell.run(rowId, realColId, val != null ? String(val) : null);
          }
        });
      }
    });
  }

  res.json({ message: 'Section data table saved.', section_table_id: sectionTableId });
});

// ─── GET /api/routing/section/:sectionId  ────────────────────────────────────
router.get('/section/:sectionId', (req, res) => {
  const db = getDb();

  if (req.user.role !== 'ADMIN' && (req.user.section_id !== parseInt(req.params.sectionId) || !req.user.is_section_head)) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const items = db.prepare(`
    SELECT ar.*,
           a.assignment_code, a.assignment_name, a.status as assignment_status,
           a.created_by,
           u_creator.full_name  as creator_name,
           u_assigned.full_name as assigned_to_name,
           c.client_name
    FROM assignment_routing ar
    JOIN assignments a ON ar.assignment_id = a.assignment_id
    LEFT JOIN users u_creator  ON a.created_by    = u_creator.user_id
    LEFT JOIN users u_assigned ON ar.assigned_to  = u_assigned.user_id
    LEFT JOIN clients c        ON a.client_id     = c.client_id
    WHERE ar.section_id = ?
    ORDER BY ar.created_at DESC
  `).all(req.params.sectionId);

  res.json({ items });
});

// ─── GET /api/routing/assignment/:assignmentId/tables  ───────────────────────
router.get('/assignment/:assignmentId/tables', (req, res) => {
  const db = getDb();

  const tables = db.prepare(`
    SELECT sdt.*, s.section_name, ar.routing_order, ar.status as routing_status
    FROM section_data_tables sdt
    JOIN sections s ON sdt.section_id = s.section_id
    JOIN assignment_routing ar ON sdt.routing_id = ar.routing_id
    WHERE sdt.assignment_id = ?
    ORDER BY ar.routing_order
  `).all(req.params.assignmentId);

  const result = tables.map(t => {
    const columns = db.prepare(`SELECT * FROM section_table_columns WHERE section_table_id = ? ORDER BY column_order`).all(t.section_table_id);
    const rows    = db.prepare(`SELECT * FROM section_table_rows    WHERE section_table_id = ? ORDER BY row_order`).all(t.section_table_id);
    const cells   = db.prepare(`
      SELECT stc.* FROM section_table_cells stc
      JOIN section_table_rows str ON stc.row_id = str.row_id
      WHERE str.section_table_id = ?
    `).all(t.section_table_id);

    const rowsWithCells = rows.map(row => {
      const rowCells = {};
      cells.filter(c => c.row_id === row.row_id).forEach(cell => { rowCells[cell.column_id] = cell.cell_value; });
      return { ...row, cells: rowCells };
    });

    return { ...t, columns, rows: rowsWithCells, remarks: t.remarks || null };
  });

  res.json({ tables: result });
});

module.exports = router;
