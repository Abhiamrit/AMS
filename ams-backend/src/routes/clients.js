const express = require('express');
const { getDb } = require('../models/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');
const { generateClientCode } = require('../utils/idgen');

const router = express.Router();
router.use(requireAuth);

// GET /api/clients
router.get('/', (req, res) => {
  const db = getDb();
  const { search } = req.query;
  let sql, params;

  if (req.user.role === 'ADMIN') {
    sql = `SELECT c.*, u.full_name as created_by_name FROM clients c LEFT JOIN users u ON c.created_by = u.user_id WHERE c.is_active = 1`;
    params = [];
  } else {
    sql = `SELECT c.*, u.full_name as created_by_name FROM clients c LEFT JOIN users u ON c.created_by = u.user_id WHERE c.is_active = 1 AND c.created_by = ?`;
    params = [req.user.user_id];
  }

  if (search) {
    sql += ` AND (c.client_name LIKE ? OR c.client_type LIKE ? OR c.associated_project LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY c.created_at DESC';
  const clients = db.prepare(sql).all(...params);
  res.json({ clients });
});

// GET /api/clients/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE client_id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });
  if (req.user.role === 'STAFF' && client.created_by !== req.user.user_id) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  res.json({ client });
});

// POST /api/clients
router.post('/', requireRole('STAFF', 'ADMIN'), (req, res) => {
  const { client_name, client_type, address, associated_project } = req.body;
  if (!client_name || !client_type) return res.status(400).json({ error: 'Client name and type are required.' });
  if (!['GOVERNMENT', 'PRIVATE'].includes(client_type)) return res.status(400).json({ error: 'Invalid client type.' });

  const db = getDb();
  const code = generateClientCode();
  const result = db.prepare(`
    INSERT INTO clients (client_code, client_name, client_type, address, associated_project, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(code, client_name.trim(), client_type, address || null, associated_project || null, req.user.user_id);

  auditLog({ userId: req.user.user_id, userRole: req.user.role, actionType: 'CREATE_CLIENT', affectedEntity: 'CLIENT', entityId: result.lastInsertRowid, ipAddress: req.ip });
  res.status(201).json({ message: 'Client created.', client_id: result.lastInsertRowid, client_code: code });
});

// PATCH /api/clients/:id
router.patch('/:id', requireRole('STAFF', 'ADMIN'), (req, res) => {
  const db = getDb();
  const client = db.prepare('SELECT * FROM clients WHERE client_id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });
  if (req.user.role === 'STAFF' && client.created_by !== req.user.user_id) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  // Check if linked to forwarded/completed assignment
  const linked = db.prepare(`
    SELECT COUNT(*) as c FROM assignments WHERE client_id = ? AND status IN ('PENDING','COMPLETED')
  `).get(req.params.id);
  if (linked.c > 0) return res.status(400).json({ error: 'Cannot edit client linked to a forwarded or completed assignment.' });

  const { client_name, client_type, address, associated_project } = req.body;
  db.prepare(`UPDATE clients SET
    client_name = COALESCE(?, client_name),
    client_type = COALESCE(?, client_type),
    address = COALESCE(?, address),
    associated_project = COALESCE(?, associated_project)
    WHERE client_id = ?
  `).run(client_name || null, client_type || null, address || null, associated_project || null, req.params.id);

  res.json({ message: 'Client updated.' });
});

module.exports = router;
