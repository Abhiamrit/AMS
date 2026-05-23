const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../models/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth, requireRole('ADMIN'));

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const db = getDb();
  const totalAssignments = db.prepare('SELECT COUNT(*) as c FROM assignments').get().c;
  const pending = db.prepare("SELECT COUNT(*) as c FROM assignments WHERE status='PENDING'").get().c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM assignments WHERE status='COMPLETED'").get().c;
  const draft = db.prepare("SELECT COUNT(*) as c FROM assignments WHERE status='DRAFT'").get().c;
  const inRouting = db.prepare("SELECT COUNT(*) as c FROM assignments WHERE status='IN ROUTING'").get().c;
  const underReview = db.prepare("SELECT COUNT(*) as c FROM assignments WHERE status='UNDER REVIEW'").get().c;
  const totalClients = db.prepare('SELECT COUNT(*) as c FROM clients WHERE is_active=1').get().c;
  const totalStaff = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='STAFF' AND is_active=1").get().c;
  const totalMas = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='MAS' AND is_active=1").get().c;
  const recentActivity = db.prepare(`
    SELECT al.*, u.full_name FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.user_id
    ORDER BY al.created_at DESC LIMIT 10
  `).all();
  res.json({ totalAssignments, pending, completed, draft, inRouting, underReview, totalClients, totalStaff, totalMas, recentActivity });
});

// GET /api/admin/users
router.get('/users', (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT u.user_id, u.username, u.full_name, u.role, u.is_active, u.created_at, u.last_login,
           u.section_id, u.is_section_head, s.section_name
    FROM users u
    LEFT JOIN sections s ON u.section_id = s.section_id
    ORDER BY u.created_at DESC
  `).all();
  res.json({ users });
});

// POST /api/admin/users
router.post('/users', async (req, res) => {
  const { username, password, full_name, role, section_id, is_section_head } = req.body;
  if (!username || !password || !full_name || !role) {
    return res.status(400).json({ error: 'All fields required.' });
  }
  if (!['STAFF', 'MAS'].includes(role)) {
    return res.status(400).json({ error: 'Role must be STAFF or MAS.' });
  }
  // STAFF users must have a section
  if (role === 'STAFF' && !section_id) {
    return res.status(400).json({ error: 'STAFF users must be assigned to a section.' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT user_id FROM users WHERE username = ?').get(username.trim().toLowerCase());
  if (existing) return res.status(409).json({ error: 'Username already exists.' });

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role, created_by, section_id, is_section_head)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    username.trim().toLowerCase(),
    hash,
    full_name.trim(),
    role,
    req.user.user_id,
    role === 'STAFF' ? (section_id || null) : null,
    role === 'STAFF' ? (is_section_head ? 1 : 0) : 0
  );

  auditLog({ userId: req.user.user_id, userRole: req.user.role, actionType: 'USER_CREATED', affectedEntity: 'USER', entityId: result.lastInsertRowid, ipAddress: req.ip });
  res.status(201).json({ message: 'User created.', user_id: result.lastInsertRowid });
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', (req, res) => {
  const { is_active } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.role === 'ADMIN') return res.status(403).json({ error: 'Cannot deactivate admin.' });

  db.prepare('UPDATE users SET is_active = ?, session_token = NULL WHERE user_id = ?').run(is_active ? 1 : 0, user.user_id);
  auditLog({ userId: req.user.user_id, userRole: req.user.role, actionType: is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', affectedEntity: 'USER', entityId: user.user_id, ipAddress: req.ip });
  res.json({ message: `User ${is_active ? 'activated' : 'deactivated'}.` });
});

// PATCH /api/admin/users/:id/reset-password
router.patch('/users/:id/reset-password', async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const hash = await bcrypt.hash(new_password, SALT_ROUNDS);
  db.prepare('UPDATE users SET password_hash = ?, session_token = NULL WHERE user_id = ?').run(hash, user.user_id);
  auditLog({ userId: req.user.user_id, userRole: req.user.role, actionType: 'PASSWORD_RESET', affectedEntity: 'USER', entityId: user.user_id, ipAddress: req.ip });
  res.json({ message: 'Password reset successfully.' });
});

// PATCH /api/admin/users/:id/section  — Update section/head assignment
router.patch('/users/:id/section', (req, res) => {
  const { section_id, is_section_head } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.role !== 'STAFF') return res.status(400).json({ error: 'Only STAFF users can be assigned to sections.' });

  db.prepare('UPDATE users SET section_id = ?, is_section_head = ? WHERE user_id = ?')
    .run(section_id || null, is_section_head ? 1 : 0, user.user_id);
  res.json({ message: 'Section assignment updated.' });
});

// GET /api/admin/assignments — all assignments
router.get('/assignments', (req, res) => {
  const db = getDb();
  const assignments = db.prepare(`
    SELECT a.*, c.client_name, c.client_type, s.section_name, u.full_name as created_by_name
    FROM assignments a
    LEFT JOIN clients c ON a.client_id = c.client_id
    LEFT JOIN sections s ON a.section_id = s.section_id
    LEFT JOIN users u ON a.created_by = u.user_id
    ORDER BY a.created_at DESC
  `).all();
  res.json({ assignments });
});

// GET /api/admin/clients
router.get('/clients', (req, res) => {
  const db = getDb();
  const clients = db.prepare(`
    SELECT c.*, u.full_name as created_by_name FROM clients c
    LEFT JOIN users u ON c.created_by = u.user_id
    ORDER BY c.created_at DESC
  `).all();
  res.json({ clients });
});

// GET /api/admin/audit-logs
router.get('/audit-logs', (req, res) => {
  const { user_id, action_type, from_date, to_date, entity_id, page = 1 } = req.query;
  const db = getDb();
  let sql = `SELECT al.*, u.full_name, u.username FROM audit_logs al LEFT JOIN users u ON al.user_id = u.user_id WHERE 1=1`;
  const params = [];
  if (user_id) { sql += ' AND al.user_id = ?'; params.push(user_id); }
  if (action_type) { sql += ' AND al.action_type = ?'; params.push(action_type); }
  if (from_date) { sql += ' AND al.created_at >= ?'; params.push(from_date); }
  if (to_date) { sql += ' AND al.created_at <= ?'; params.push(to_date + 'T23:59:59'); }
  if (entity_id) { sql += ' AND al.entity_id = ?'; params.push(entity_id); }
  sql += ' ORDER BY al.created_at DESC LIMIT 50 OFFSET ?';
  params.push((parseInt(page) - 1) * 50);
  const logs = db.prepare(sql).all(...params);
  res.json({ logs });
});

module.exports = router;
