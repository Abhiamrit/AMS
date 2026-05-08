const { getDb } = require('../models/db');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  // Validate session token matches DB (single session enforcement)
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE user_id = ? AND is_active = 1').get(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Session invalid or account deactivated.' });
  }

  if (user.session_token !== req.session.sessionToken) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Session superseded by another login.' });
  }

  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient privileges.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
