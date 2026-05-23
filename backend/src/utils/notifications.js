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

// NEW: Notify all active members of a specific section
function notifySectionHead({ sectionId, message, relatedAssignmentId }) {
  const db = getDb();
  const heads = db.prepare(
    `SELECT user_id FROM users WHERE section_id = ? AND is_section_head = 1 AND is_active = 1`
  ).all(sectionId);
  for (const u of heads) {
    createNotification({ recipientUserId: u.user_id, message, relatedAssignmentId });
  }
}

// NEW: Notify a specific user (section member assigned work)
function notifyUser({ userId, message, relatedAssignmentId }) {
  createNotification({ recipientUserId: userId, message, relatedAssignmentId });
}

// NEW: Notify creator of assignment
function notifyCreator({ creatorUserId, message, relatedAssignmentId }) {
  createNotification({ recipientUserId: creatorUserId, message, relatedAssignmentId });
}

module.exports = {
  createNotification,
  notifyAllMAS,
  notifyAdmins,
  notifySectionHead,
  notifyUser,
  notifyCreator,
};
