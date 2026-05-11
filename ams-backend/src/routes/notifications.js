const express = require('express');
const { getDb } = require('../models/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications
router.get('/', (req, res) => {
  const db = getDb();
  const notifications = db.prepare(`
    SELECT n.*, a.assignment_code FROM notifications n
    LEFT JOIN assignments a ON n.related_assignment_id = a.assignment_id
    WHERE n.recipient_user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.user.user_id);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  res.json({ notifications, unreadCount });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND recipient_user_id = ?')
    .run(req.params.id, req.user.user_id);
  res.json({ message: 'Marked as read.' });
});

// PATCH /api/notifications/read-all
router.patch('/read-all/mark', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ?').run(req.user.user_id);
  res.json({ message: 'All notifications marked as read.' });
});

module.exports = router;
