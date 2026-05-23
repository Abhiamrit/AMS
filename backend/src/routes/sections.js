const express = require("express");
const { getDb } = require("../models/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { auditLog } = require("../utils/audit");

const router = express.Router();
router.use(requireAuth);

// GET /api/sections — all active sections (for dropdowns)
router.get("/", (req, res) => {
  const db = getDb();
  const sections = db
    .prepare("SELECT * FROM sections WHERE is_active = 1 ORDER BY section_name")
    .all();
  res.json({ sections });
});

// GET /api/sections/all — including inactive (admin only)
router.get("/all", requireRole("ADMIN"), (req, res) => {
  const db = getDb();
  const sections = db
    .prepare(
      `
    SELECT s.*, u.full_name as created_by_name FROM sections s
    LEFT JOIN users u ON s.created_by = u.user_id
    ORDER BY s.created_at DESC
  `,
    )
    .all();
  res.json({ sections });
});

// POST /api/sections (admin only)
router.post("/", requireRole("ADMIN"), (req, res) => {
  const { section_name, section_head } = req.body;
  if (!section_name || !section_head)
    return res
      .status(400)
      .json({ error: "Section name and head are required." });

  const db = getDb();
  // Generate section code
  const count = db.prepare("SELECT COUNT(*) as c FROM sections").get().c;
  const code = `SEC-${String(count + 1).padStart(4, "0")}`;

  const result = db
    .prepare(
      `
    INSERT INTO sections (section_code, section_name, section_head, created_by)
    VALUES (?, ?, ?, ?)
  `,
    )
    .run(code, section_name.trim(), section_head.trim(), req.user.user_id);

  auditLog({
    userId: req.user.user_id,
    userRole: req.user.role,
    actionType: "SECTION_CREATED",
    affectedEntity: "SECTION",
    entityId: result.lastInsertRowid,
    ipAddress: req.ip,
  });
  res.status(201).json({
    message: "Section created.",
    section_id: result.lastInsertRowid,
    section_code: code,
  });
});

// PATCH /api/sections/:id (admin only)
router.patch("/:id", requireRole("ADMIN"), (req, res) => {
  const { section_name, section_head, is_active } = req.body;
  const db = getDb();
  const section = db
    .prepare("SELECT * FROM sections WHERE section_id = ?")
    .get(req.params.id);
  if (!section) return res.status(404).json({ error: "Section not found." });

  db.prepare(
    `UPDATE sections SET
    section_name = COALESCE(?, section_name),
    section_head = COALESCE(?, section_head),
    is_active = COALESCE(?, is_active)
    WHERE section_id = ?
  `,
  ).run(
    section_name || null,
    section_head || null,
    is_active !== undefined ? (is_active ? 1 : 0) : null,
    req.params.id,
  );

  auditLog({
    userId: req.user.user_id,
    userRole: req.user.role,
    actionType: "SECTION_UPDATED",
    affectedEntity: "SECTION",
    entityId: req.params.id,
    ipAddress: req.ip,
  });
  res.json({ message: "Section updated." });
});

// GET /api/sections/:id/members — All active STAFF members of a section
router.get("/:id/members", (req, res) => {
  const db = getDb();
  const members = db
    .prepare(
      `
    SELECT user_id, full_name, username, is_section_head
    FROM users
    WHERE section_id = ? AND role = 'STAFF' AND is_active = 1
    ORDER BY is_section_head DESC, full_name ASC
  `,
    )
    .all(req.params.id);
  res.json({ members });
});

// POST /api/sections/:id/assign-mas (admin only)
router.post("/:id/assign-mas", requireRole("ADMIN"), (req, res) => {
  const { user_ids } = req.body;
  const db = getDb();
  // Remove existing assignments for this section
  db.prepare("DELETE FROM user_section_assignments WHERE section_id = ?").run(
    req.params.id,
  );
  if (user_ids && user_ids.length > 0) {
    const insert = db.prepare(
      "INSERT OR IGNORE INTO user_section_assignments (user_id, section_id) VALUES (?, ?)",
    );
    for (const uid of user_ids) insert.run(uid, req.params.id);
  }
  res.json({ message: "MAS officers assigned." });
});

module.exports = router;
