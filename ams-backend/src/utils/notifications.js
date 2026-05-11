const { getDb } = require('../models/db');

function createNotification({ recipientUserId, message, relatedAssignmentId }) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO notifications (recipient_user_id, message, related_assignment_id)
      VALUES (?, ?, ?)
    `).run(recipientUserId, message, relatedAssignmentId || null);
  } catch (e) {
    console.error('Notification error:', e.message);
  }
}

function notifyAllMAS({ message, relatedAssignmentId }) {
  const db = getDb();
  const masUsers = db.prepare(`SELECT user_id FROM users WHERE role='MAS' AND is_active=1`).all();
  for (const u of masUsers) {
    createNotification({ recipientUserId: u.user_id, message, relatedAssignmentId });
  }
}

function notifyAdmins({ message, relatedAssignmentId }) {
  const db = getDb();
  const admins = db.prepare(`SELECT user_id FROM users WHERE role='ADMIN' AND is_active=1`).all();
  for (const u of admins) {
    createNotification({ recipientUserId: u.user_id, message, relatedAssignmentId });
  }
}

module.exports = { createNotification, notifyAllMAS, notifyAdmins };
