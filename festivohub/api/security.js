const { ObjectId } = require('mongodb');
const config = require('../config');

// ---- In-memory rate limiter (per route-key + IP) ----
const hits = new Map(); // key -> { count, resetAt }

function rateLimit({ windowMs = 60000, max = 60, keyPrefix = 'g' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    // Prune occasionally
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
    }
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
    const key = `${keyPrefix}:${ip}`;
    let entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }
    next();
  };
}

// ---- Security headers ----
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
}

// ---- Audit log (every sensitive admin/organizer action) ----
async function audit(db, { admin_id, admin_role = 'admin', action, target_entity, target_id, metadata = {} }) {
  try {
    await db.collection('admin_actions').insertOne({
      admin_id: admin_id ? new ObjectId(String(admin_id)) : null,
      admin_role,
      action,
      target_entity,
      target_id: String(target_id || ''),
      metadata,
      timestamp: new Date(),
    });
  } catch {
    // never let an audit write break the main request
  }
}

// ---- Notification service ----
async function notify(db, { user_id, type = 'General', title, message, link = '', actor = 'system' }) {
  try {
    await db.collection('notifications').insertOne({
      user_id: user_id ? new ObjectId(String(user_id)) : null,
      type,
      title: String(title).slice(0, 160),
      message: String(message).slice(0, 500),
      link,
      actor,
      read: false,
      created_at: new Date(),
    });
  } catch {
    // best-effort
  }
}

module.exports = { rateLimit, securityHeaders, audit, notify, hits };