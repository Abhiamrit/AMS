const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const { auditLog } = require('../utils/audit');

const router = express.Router();

const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCKOUT_MS = parseInt(process.env.LOCKOUT_DURATION_MS) || 900000;

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. Please try again.' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Account deactivated. Contact Administrator.' });
  }

  // Check lockout
  if (user.locked_until) {
    const lockTime = new Date(user.locked_until).getTime();
    if (Date.now() < lockTime) {
      const remaining = Math.ceil((lockTime - Date.now()) / 60000);
      return res.status(423).json({ error: `Account locked. Try again in ${remaining} minute(s).` });
    } else {
      db.prepare('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE user_id = ?').run(user.user_id);
    }
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    const attempts = (user.login_attempts || 0) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_MS).toISOString();
      db.prepare('UPDATE users SET login_attempts = ?, locked_until = ? WHERE user_id = ?').run(attempts, lockedUntil, user.user_id);
      auditLog({ userId: user.user_id, userRole: user.role, actionType: 'ACCOUNT_LOCKED', affectedEntity: 'USER', entityId: user.user_id, ipAddress: req.ip });
      return res.status(423).json({ error: `Too many failed attempts. Account locked for 15 minutes.` });
    }
    db.prepare('UPDATE users SET login_attempts = ? WHERE user_id = ?').run(attempts, user.user_id);
    return res.status(401).json({ error: 'Invalid credentials. Please try again.' });
  }

  // Success — generate session token (single session enforcement)
  const sessionToken = uuidv4();
  db.prepare('UPDATE users SET session_token = ?, login_attempts = 0, locked_until = NULL, last_login = ? WHERE user_id = ?')
    .run(sessionToken, new Date().toISOString(), user.user_id);

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Session error.' });
    req.session.userId = user.user_id;
    req.session.sessionToken = sessionToken;

    auditLog({ userId: user.user_id, userRole: user.role, actionType: 'LOGIN', affectedEntity: 'USER', entityId: user.user_id, ipAddress: req.ip });

    res.json({
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      }
    });
  });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const { user_id, role } = req.user;
  const db = getDb();
  db.prepare('UPDATE users SET session_token = NULL WHERE user_id = ?').run(user_id);
  auditLog({ userId: user_id, userRole: role, actionType: 'LOGOUT', affectedEntity: 'USER', entityId: user_id, ipAddress: req.ip });
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully.' });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const { user_id, username, full_name, role } = req.user;
  res.json({ user: { user_id, username, full_name, role } });
});

// POST /api/auth/verify-password (used for forward-to-MAS confirmation)
router.post('/verify-password', requireAuth, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required.' });
  const match = await bcrypt.compare(password, req.user.password_hash);
  if (!match) return res.status(401).json({ error: 'Incorrect password.' });
  res.json({ verified: true });
});

module.exports = router;
