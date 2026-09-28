const crypto = require('crypto');

// ---- Input validation helpers ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;

function validEmail(v) { return typeof v === 'string' && EMAIL_RE.test(v.trim()); }
function validPhone(v) { return typeof v === 'string' && PHONE_RE.test(v.replace(/[\s-]/g, '')); }

// DB-backed, well-known authorization values only; everything else refused.
const EVENT_STATUSES = ['Pending', 'Approved', 'Rejected', 'Published', 'Unpublished', 'Cancelled', 'Completed', 'Featured'];
const ORG_STATUSES = ['Pending', 'Approved', 'Rejected', 'Suspended', 'Verified'];
const USER_STATUSES = ['Active', 'Blocked', 'Suspended'];
const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Cancelled', 'Refunded', 'Failed', 'Checked In'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];
const REVIEW_STATUSES = ['Pending', 'Approved', 'Rejected'];
const CONTACT_STATUSES = ['New', 'In Progress', 'Resolved'];
const CATEGORIES = ['Music', 'Garba', 'Cultural', 'Religious', 'Food', 'Sports', 'Technology', 'Business', 'Comedy', 'Workshops', 'Dance', 'Cricket', 'Education', 'Art', 'Other'];
const TICKET_GENRES = ['General', 'VIP', 'Premium', 'Early Bird'];

function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

// Strong unique booking / ticket / payment / referral codes.
function code(prefix, len) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes((len + 2) | 0);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return prefix ? prefix + '-' + out : out;
}

// Basic XSS sanitizer for free-text user content rendered via innerHTML.
function sanitize(v) {
  if (typeof v !== 'string') return '';
  return v
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

// Strip a password (and audit secrets) out of any projection object.
function safe(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const { password, __v, ...rest } = obj;
  return rest;
}

module.exports = {
  EMAIL_RE, PHONE_RE, validEmail, validPhone, clamp, code, sanitize, safe,
  EVENT_STATUSES, ORG_STATUSES, USER_STATUSES, BOOKING_STATUSES,
  PAYMENT_STATUSES, REVIEW_STATUSES, CONTACT_STATUSES,
  CATEGORIES, TICKET_GENRES,
};