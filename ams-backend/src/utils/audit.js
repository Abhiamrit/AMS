const { getDb } = require('../models/db');

function auditLog({ userId, userRole, actionType, affectedEntity, entityId, details, ipAddress }) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (user_id, user_role, action_type, affected_entity, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId || null,
      userRole || null,
      actionType,
      affectedEntity || null,
      entityId ? String(entityId) : null,
      details ? JSON.stringify(details) : null,
      ipAddress || null
    );
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
}

module.exports = { auditLog };
