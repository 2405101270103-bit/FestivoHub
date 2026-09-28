const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { connectToDatabase } = require('./db');
const { seedIfEmpty } = require('./seed');
const config = require('../config');
const svc = require('./services');
const sec = require('./security');
const pay = require('./payment');

const app = express();

// ---- Global middleware ----
app.use(sec.securityHeaders);
app.use(rateLimiterTuned);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public'), { setHeaders: (res, p) => { if (p.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store'); } }));

// Stricter rate limits on costly endpoints; generous default for reads.
const RL = sec.rateLimit;
const authLimiter = RL({ windowMs: 60000, max: 15, keyPrefix: 'auth' });
const writeLimiter = RL({ windowMs: 60000, max: 40, keyPrefix: 'w' });
const readLimiter = RL({ windowMs: 60000, max: 240, keyPrefix: 'r' });
function rateLimiterTuned(req, res, next) {
  const p = req.path ? req.path.split('/') : (req.url || req._parsedOriginalUrl).path.split('/');
  const heavy = p.includes('auth') || p.includes('register') || p.includes('forgot') || p.includes('reset');
  if (heavy) return authLimiter(req, res, next);
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE' || req.method === 'PATCH') return writeLimiter(req, res, next);
  return readLimiter(req, res, next);
}

// ---- Image proxy: same-origin cached images (no more external buffering) ----
const IMG_ALLOW = new Set(['images.unsplash.com', 'plus.unsplash.com']);
const IMG_STATIC_CACHE_DIR = path.join(__dirname, '..', 'public', 'images', 'cache');
const IMG_CACHE_DIR = process.env.IMAGE_CACHE_DIR || (process.env.VERCEL ? path.join('/tmp', 'festivohub-images') : IMG_STATIC_CACHE_DIR);
const IMG_WIDTHS = [200, 320, 640, 960, 1400, 1600];
const IMG_MAX_BYTES = 5 * 1024 * 1024;
const imgInflight = new Map();

try { fs.mkdirSync(IMG_CACHE_DIR, { recursive: true }); } catch (e) {}

function imageWidth(value) {
  const requested = parseInt(value, 10);
  if (!Number.isFinite(requested)) return 960;
  return IMG_WIDTHS.reduce((best, width) => Math.abs(width - requested) < Math.abs(best - requested) ? width : best, IMG_WIDTHS[0]);
}

function imageFormats(req) {
  const accept = String(req.headers.accept || '').toLowerCase();
  const any = !accept || accept.includes('*/*');
  const formats = [];
  if (any || accept.includes('image/avif')) formats.push('avif');
  if (any || accept.includes('image/avif') || accept.includes('image/webp')) formats.push('webp');
  formats.push('jpg');
  return [...new Set(formats)];
}

function imageExt(contentType) {
  const type = String(contentType || '').split(';')[0].toLowerCase();
  if (type === 'image/avif') return 'avif';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/png') return 'png';
  if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg';
  return '';
}

function imageType(ext) {
  return ext === 'avif' ? 'image/avif' : ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
}

function cachedImage(key, formats) {
  const dirs = [...new Set([IMG_CACHE_DIR, IMG_STATIC_CACHE_DIR])];
  for (const dir of dirs) {
    for (const ext of formats) {
      const file = path.join(dir, key + '.' + ext);
      if (fs.existsSync(file)) return { file, ext };
    }
  }
  return null;
}

async function loadImage(key, formats, upstreamUrl) {
  const local = cachedImage(key, formats);
  if (local) return { buf: await fs.promises.readFile(local.file), ext: local.ext };
  const inflightKey = key + '|' + formats.join(',');
  if (imgInflight.has(inflightKey)) return imgInflight.get(inflightKey);
  const task = (async () => {
    const accept = formats.map((ext) => ext === 'jpg' ? 'image/jpeg' : 'image/' + ext).join(',');
    const upstream = await fetch(upstreamUrl.toString(), { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { accept } });
    if (!upstream.ok) throw new Error('upstream image request failed');
    const finalUrl = new URL(upstream.url);
    if (!IMG_ALLOW.has(finalUrl.hostname.toLowerCase())) throw new Error('upstream image host not allowed');
    const length = Number(upstream.headers.get('content-length') || 0);
    if (length > IMG_MAX_BYTES) throw new Error('image too large');
    const ext = imageExt(upstream.headers.get('content-type'));
    if (!ext) throw new Error('unsupported image type');
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length > IMG_MAX_BYTES) throw new Error('image too large');
    const file = path.join(IMG_CACHE_DIR, key + '.' + ext);
    await fs.promises.writeFile(file, buf);
    return { buf, ext };
  })();
  imgInflight.set(inflightKey, task);
  try {
    return await task;
  } finally {
    imgInflight.delete(inflightKey);
  }
}

app.get('/img', asyncHandler(async (req, res) => {
  const u = req.query.u;
  if (!u || typeof u !== 'string' || u.length > 2048) return res.status(400).end('bad url');
  let up;
  try { up = new URL(u); } catch (e) { return res.status(400).end('bad url'); }
  if (up.protocol !== 'https:' && up.protocol !== 'http:') return res.status(400).end('bad scheme');
  if (!IMG_ALLOW.has(up.hostname.toLowerCase())) return res.status(400).end('image host not allowed');
  const w = imageWidth(req.query.w);
  up.searchParams.set('w', String(w));
  up.searchParams.set('fit', 'crop');
  up.searchParams.set('q', '70');
  up.searchParams.set('auto', 'format');
  up.searchParams.delete('h');
  const key = crypto.createHash('md5').update(up.origin + up.pathname + '|' + w).digest('hex').toLowerCase();
  try {
    const result = await loadImage(key, imageFormats(req), up);
    const etag = '"' + crypto.createHash('sha1').update(key + result.ext).digest('hex') + '"';
    res.set('Content-Type', imageType(result.ext));
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Vary', 'Accept');
    res.set('ETag', etag);
    res.set('Access-Control-Allow-Origin', '*');
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    return res.send(result.buf);
  } catch (e) {
    return res.status(502).end('image unavailable');
  }
}));

// ---- Token helpers ----
function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}
function getToken(req) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return req.cookies.token || null;
}
function auth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}
const authUser = (req, res, n) => req.user && req.user.role === 'user' ? n() : res.status(403).json({ error: 'Users only' });
const authOrganizer = (req, res, n) => req.user && req.user.role === 'organizer' ? n() : res.status(403).json({ error: 'Organizers only' });
const authAdmin = (req, res, n) => req.user && req.user.role === 'admin' ? n() : res.status(403).json({ error: 'Admins only' });

function asyncHandler(fn) {
  return (req, res) => {
    fn(req, res).catch((e) => {
      console.error('ApiError:', e.message);
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    });
  };
}

// Safe ObjectId builder (never throws on bad hex).
function oid(v) { const s = String(v); return ObjectId.isValid(s) ? new ObjectId(s) : null; }

let catByName = {}; // populated per request from DB

// ---- Health (also bootstraps demo data on serverless) ----
app.get('/api/health', asyncHandler(async (req, res) => {
  await seedIfEmpty();
  const { db } = await connectToDatabase();
  res.json({ ok: true, service: 'FestivoHub API', db: 'connected' });
}));

// ---- Categories ----
app.get('/api/categories', asyncHandler(async (req, res) => {
  const { seedIfEmpty: _seed, ensureCategories } = require('./seed');
  await ensureCategories();
  const { db } = await connectToDatabase();
  const cats = await db.collection('categories').find({}).sort({ name: 1 }).toArray();
  res.json(cats.map((c) => ({ ...svc.safe(c), _id: c._id.toString() })));
}));

// ---- Home / public stats (never hardcoded) ----
app.get('/api/stats', asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const E = db.collection('events'), U = db.collection('users'), R = db.collection('reviews');
  const eventCount = await E.countDocuments({ status: { $in: ['Approved', 'Published'] } });
  const cities = await E.distinct('city', { status: { $in: ['Approved', 'Published'] }, city: { $nin: [null, ''] } });
  const userCount = await U.countDocuments({ role: { $ne: 'admin' } }) || await U.countDocuments({});
  const avgPipe = await R.aggregate([
    { $match: { status: 'Approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' } } },
  ]).toArray();
  const avg = avgPipe.length ? Math.round((avgPipe[0].avg || 0) * 10) / 10 : 0;
  res.json({
    events_hosted: eventCount,
    cities_covered: cities.length,
    happy_users: userCount,
    avg_rating: avg,
  });
}));

function buildEventFilter(q) {
  const filter = {};
  const visible = ['Approved', 'Published'];
  if (!q.includeHidden) filter.status = { $in: visible };
  if (q.status) filter.status = q.status;
  if (q.category) {
    const c = catByName[q.category];
    if (c) filter.category_id = c;
  }
  if (q.city) filter.city = { $regex: q.city, $options: 'i' };
  if (q.keyword) filter.$or = [
    { title: { $regex: q.keyword, $options: 'i' } },
    { venue: { $regex: q.keyword, $options: 'i' } },
    { description: { $regex: q.keyword, $options: 'i' } },
  ];
  if (q.price_max) filter.price = { $lte: parseFloat(q.price_max) };
  if (q.event_date) filter.event_date = { $lte: q.event_date };
  if (q.featured) filter.featured = true;
  if (q.trending) filter.trending = true;
  return filter;
}

// ---- Events list (DB-backed search/filter/pagination/sort) ----
app.get('/api/events', asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const q = req.query;
  const cats = await db.collection('categories').find({}).toArray();
  catByName = {};
  cats.forEach((c) => (catByName[c.name] = c._id));
  const orgMap = {};
  (await db.collection('organizers').find({}).toArray()).forEach((o) => (orgMap[o._id.toString()] = o.org_name));

  const filter = buildEventFilter(q);
  const sort = {};
  const sortVal = q.sort || 'date';
  if (sortVal === 'date') sort.event_date = 1;
  else if (sortVal === 'date_desc') sort.event_date = -1;
  else if (sortVal === 'price') sort.price = 1;
  else if (sortVal === 'price_desc') sort.price = -1;
  else if (sortVal === 'popular') sort.views = -1;
  else if (sortVal === 'rating') sort.avg_rating = -1;

  const page = Math.max(parseInt(q.page || '1', 10), 1);
  const perPage = Math.min(Math.max(parseInt(q.per_page || '12', 10), 1), 48);

  const total = await db.collection('events').countDocuments(filter);
  let events = await db.collection('events')
    .find(filter).sort(sort)
    .skip((page - 1) * perPage).limit(perPage)
    .toArray();

  const eventIds = events.map((e) => e._id);
  const tt = await db.collection('ticket_types').find({ event_id: { $in: eventIds } }).toArray();
  const ttMap = {};
  tt.forEach((t) => { (ttMap[t.event_id.toString()] = ttMap[t.event_id.toString()] || []).push({ name: t.name, price: t.price, quantity: t.quantity, sold: t.sold }); });
  const eventBookings = await db.collection('bookings').find({ event_id: { $in: eventIds } }).toArray();
  const soldMap = {};
  Object.entries(bookingStatsByEvent(eventBookings)).forEach(([eventId, stats]) => {
    soldMap[eventId] = stats.tickets_sold;
  });

  const out = events.map((e) => ({
    ...svc.safe(e),
    _id: e._id.toString(),
    category_name: cats.length && e.category_id ? (cats.find((c) => String(c._id) === String(e.category_id)) || {}).name : 'Unknown',
    org_name: orgMap[String(e.organizer_id)] || 'Unknown',
    sold: soldMap[e._id.toString()] || 0,
    remaining: Math.max(0, (e.total_seats || 0) - (soldMap[e._id.toString()] || 0)),
    ticket_types: ttMap[e._id.toString()] || [],
  }));
  res.json({ total, page, per_page: perPage, events: out, meta: { sort: sortVal } });
}));

// ---- Event detail (with ticket types, organizer, reviews, related) ----
app.get('/api/events/:id', asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const id = oid(req.params.id);
  if (!id) return res.status(404).json({ error: 'Event not found' });
  const event = await db.collection('events').findOne({ _id: id });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const tts = await db.collection('ticket_types').find({ event_id: event._id }).toArray();
  const org = event.organizer_id ? await db.collection('organizers').findOne({ _id: event.organizer_id }) : null;
  const reviews = await db.collection('reviews').find({ event_id: event._id, status: 'Approved' }).sort({ created_at: -1 }).toArray();
  const eventBookings = await db.collection('bookings').find({ event_id: event._id }).toArray();
  const eventStats = bookingStatsByEvent(eventBookings);
  const sold = eventStats[event._id.toString()] ? eventStats[event._id.toString()].tickets_sold : 0;
  const userMap = {};
  const rUsers = await db.collection('users').find({ _id: { $in: reviews.map((r) => r.user_id) } }).toArray();
  rUsers.forEach((u) => (userMap[u._id.toString()] = u.full_name || u.email));
  const related = await db.collection('events').find({
    _id: { $ne: event._id }, status: { $in: ['Approved', 'Published'] },
    $or: [{ category_id: event.category_id }, { city: event.city }],
  }).limit(6).toArray();

  await db.collection('events').updateOne({ _id: event._id }, { $inc: { views: 1 } });

  const catName = event.category_id ? (await db.collection('categories').findOne({ _id: event.category_id })).name : 'Unknown';
  res.json({
    ...svc.safe(event),
    _id: event._id.toString(),
    sold: safeMetric(sold),
    remaining: Math.max(0, safeMetric(event.total_seats) - safeMetric(sold)),
    category_name: catName,
    org_name: org ? org.org_name : 'Unknown',
    organizer: org ? svc.safe(org) : null,
    ticket_types: tts.map((t) => ({ _id: t._id.toString(), name: t.name, price: t.price, quantity: t.quantity, sold: t.sold, sale_start: t.sale_start, sale_end: t.sale_end })),
    reviews: reviews.map((r) => ({ ...svc.safe(r), _id: r._id.toString(), user_name: userMap[r.user_id.toString()] || 'Anonymous', user_id: undefined })),
    related: related.map((e) => ({ ...svc.safe(e), _id: e._id.toString(), org_name: org ? org.org_name : 'Unknown' })),
    event_status: computeEventStatus(event),
    seo: { slug: svc.sanitize(event.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) },
  });
}));

// ---- Booking helpers: single source of truth for dashboard stats ----
const VALID_BOOKING_STATUSES = ['Confirmed', 'Checked In'];
const BOOKING_QUANTITY_FIELDS = ['quantity', 'qty', 'seats_booked', 'ticketCount', 'ticket_count', 'tickets'];

function numberValue(value) {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) return NaN;
  return Number(value);
}

function bookingQty(b) {
  if (!b || typeof b !== 'object') return 1;
  for (const field of BOOKING_QUANTITY_FIELDS) {
    const value = b[field];
    if (value === undefined || value === null || value === '') continue;
    const n = Array.isArray(value) ? value.length : (typeof value === 'object' ? numberValue(value.quantity ?? value.count ?? value.total) : numberValue(value));
    if (Number.isFinite(n) && n > 0) return Math.max(1, Math.floor(n));
  }
  return 1;
}

function bookingAmount(b) {
  if (!b || typeof b !== 'object') return 0;
  for (const value of [b.total_amount, b.amount, b.totalAmount, b.grand_total]) {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) continue;
    const n = numberValue(value);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

function bookingStatus(b) {
  if (!b) return '';
  const value = b.booking_status !== undefined && b.booking_status !== null && String(b.booking_status).trim() !== '' ? b.booking_status : b.status;
  return String(value || '').trim().toLowerCase();
}

function isValidBooking(b) {
  const status = bookingStatus(b);
  return VALID_BOOKING_STATUSES.some((valid) => valid.toLowerCase() === status);
}

function validBookings(bookings) {
  return (Array.isArray(bookings) ? bookings : []).filter(isValidBooking);
}

function bookingStats(bookings) {
  const valid = validBookings(bookings);
  const tickets = valid.reduce((sum, b) => sum + bookingQty(b), 0);
  const revenue = Math.round(valid.reduce((sum, b) => sum + bookingAmount(b), 0) * 100) / 100;
  return { valid, tickets_sold: tickets, revenue };
}

function bookingStatsByEvent(bookings) {
  const map = {};
  validBookings(bookings).forEach((b) => {
    if (!b.event_id) return;
    const key = b.event_id.toString();
    if (!map[key]) map[key] = { tickets_sold: 0, revenue: 0 };
    map[key].tickets_sold += bookingQty(b);
    map[key].revenue += bookingAmount(b);
  });
  Object.values(map).forEach((entry) => { entry.revenue = Math.round(entry.revenue * 100) / 100; });
  return map;
}

function safeMetric(value) {
  const n = numberValue(value);
  return Number.isFinite(n) ? n : 0;
}

function isPublishedEvent(ev) {
  return !!ev && ['approved', 'published'].includes(String(ev.status || '').trim().toLowerCase());
}

function computeEventStatus(ev) {
  if (ev.status === 'Cancelled') return 'Cancelled';
  if (ev.status === 'Completed') return 'Completed';
  if ((ev.available_seats ?? ev.total_seats ?? 0) <= 0) return 'Sold Out';
  return 'Upcoming';
}

// ---- AUTH: register ----
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { full_name, email, phone, password, role, org_name, ...rest } = req.body;
  const name = (full_name || org_name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!svc.validEmail(email || '')) return res.status(400).json({ error: 'A valid email is required' });
  if (!svc.validPhone(phone || '')) return res.status(400).json({ error: 'A valid 10-digit phone number is required' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!['user', 'organizer'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const { db } = await connectToDatabase();
  const col = role === 'organizer' ? db.collection('organizers') : db.collection('users');
  const existing = await col.findOne({ email: email.trim().toLowerCase() });
  if (existing) return res.status(400).json({ error: 'This email is already registered for that role' });

  const hash = await bcrypt.hash(password, 10);
  const verification_token = crypto.randomBytes(24).toString('hex');
  const doc = role === 'organizer'
    ? { org_name: name, email: email.trim().toLowerCase(), phone, password: hash, status: 'Approved', verification_status: 'Pending', verified: false, verification_token, profile_image: 'default-org.png', created_at: new Date() }
    : { full_name: name, email: email.trim().toLowerCase(), phone, password: hash, status: 'Active', verified: false, verification_token, favorites: [], profile_image: 'default-user.png', created_at: new Date() };
  const result = await col.insertOne(doc);
  const id = result.insertedId.toString();
  const token = signToken({ id, role });
  res.cookie('token', token, { httpOnly: true, secure: config.env === 'production', sameSite: 'lax', path: '/' });
  // Demo-friendly: expose verification token ONLY outside production so email flow is testable.
  const payload = { token, role, id, name, verified: false };
  if (config.env !== 'production') payload.devVerifyToken = verification_token;
  res.status(201).json(payload);
}));

// ---- AUTH: verify email ----
app.post('/api/auth/verify', asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });
  const { db } = await connectToDatabase();
  for (const col of [db.collection('users'), db.collection('organizers')]) {
    const doc = await col.findOne({ email: email.trim().toLowerCase(), verification_token: code });
    if (doc) {
      await col.updateOne({ _id: doc._id }, { $set: { verified: true, verification_token: null } });
      return res.json({ success: true, role: col.collectionName === 'organizers' ? 'organizer' : 'user' });
    }
  }
  res.status(400).json({ error: 'Invalid or expired verification code' });
}));

// ---- AUTH: forgot / reset ----
app.post('/api/auth/forgot', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!svc.validEmail(email || '')) return res.status(400).json({ error: 'A valid email is required' });
  const { db } = await connectToDatabase();
  let found = false;
  for (const col of [db.collection('users'), db.collection('organizers'), db.collection('admins')]) {
    const doc = await col.findOne({ email: email.trim().toLowerCase() });
    if (doc) {
      const code = crypto.randomBytes(6).toString('hex');
      await col.updateOne({ _id: doc._id }, { $set: { reset_code: await bcrypt.hash(code, 8), reset_expires: new Date(Date.now() + 30 * 60000) } });
      found = true;
      if (config.env !== 'production') {
        return res.json({ ok: true, message: 'Reset code sent', devResetCode: code, id: doc._id.toString() });
      }
    }
  }
  // Always respond the same to avoid user enumeration; in production no code is returned.
  if (!found && config.env === 'production') return res.json({ ok: true, message: 'If that email exists, a reset code has been sent.' });
  if (!found) return res.status(404).json({ error: 'No account found with that email' });
}));

app.post('/api/auth/reset', asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;
  if (!svc.validEmail(email || '')) return res.status(400).json({ error: 'A valid email is required' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!code) return res.status(400).json({ error: 'Reset code is required' });
  const { db } = await connectToDatabase();
  for (const col of [db.collection('users'), db.collection('organizers'), db.collection('admins')]) {
    const doc = await col.findOne({ email: email.trim().toLowerCase(), reset_code: { $exists: true } });
    if (!doc) continue;
    if (!doc.reset_expires || doc.reset_expires < new Date()) return res.status(400).json({ error: 'Reset code expired. Request a new one.' });
    if (!(await bcrypt.compare(code, doc.reset_code))) return res.status(400).json({ error: 'Invalid reset code' });
    const hash = await bcrypt.hash(password, 10);
    await col.updateOne({ _id: doc._id }, { $set: { password: hash, reset_code: null, reset_expires: null } });
    return res.json({ ok: true, message: 'Password updated. You can now log in.' });
  }
  res.status(404).json({ error: 'No account found with that email' });
}));

// ---- AUTH: login ----
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  if (!svc.validEmail(email || '')) return res.status(400).json({ error: 'A valid email is required' });
  if (!password) return res.status(400).json({ error: 'Password is required' });
  if (!['user', 'organizer', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const { db } = await connectToDatabase();

  let profile = null;
  if (role === 'organizer') profile = await db.collection('organizers').findOne({ email: email.trim().toLowerCase() });
  else if (role === 'admin') {
    if (!config.allowedAdmins.includes(email.trim().toLowerCase())) {
      return res.status(403).json({ error: 'Access denied for this account' });
    }
    profile = await db.collection('admins').findOne({ email: email.trim().toLowerCase() });
  }
  else profile = await db.collection('users').findOne({ email: email.trim().toLowerCase() });

  if (!profile || !(await bcrypt.compare(password, profile.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (profile.status && profile.status !== 'Active' && profile.status !== 'Approved' && profile.status !== 'Verified') {
    return res.status(403).json({ error: 'Your account is ' + profile.status.toLowerCase() + '. Contact support.' });
  }
  const token = signToken({ id: profile._id.toString(), role });
  res.cookie('token', token, { httpOnly: true, secure: config.env === 'production', sameSite: 'lax', path: '/' });
  const name = role === 'organizer' ? profile.org_name : role === 'admin' ? profile.name : profile.full_name;
  res.json({ token, role, name, id: profile._id.toString(), email: profile.email, verified: !!profile.verified });
}));

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true });
});

// Dev-only: convenient demo login without exposing password material.
app.post('/api/auth/demo', asyncHandler(async (req, res) => {
  if (config.env === 'production') return res.status(404).json({ error: 'Not available in production' });
  const { role } = req.body;
  if (!['user', 'organizer', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const { db } = await connectToDatabase();
  const col = role === 'organizer' ? 'organizers' : role === 'admin' ? 'admins' : 'users';
  const profile = await db.collection(col).findOne({});
  if (!profile) return res.status(404).json({ error: 'No demo account' });
  const token = signToken({ id: profile._id.toString(), role });
  res.cookie('token', token, { httpOnly: true, secure: config.env === 'production', sameSite: 'lax', path: '/' });
  res.json({ token, role, name: role === 'organizer' ? profile.org_name : profile.full_name || profile.name, id: profile._id.toString(), email: profile.email });
}));

// ---- Me ----
app.get('/api/me', auth, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const col = req.user.role === 'admin' ? 'admins' : req.user.role === 'organizer' ? 'organizers' : 'users';
  const profile = await db.collection(col).findOne({ _id: oid(req.user.id) });
  if (!profile) return res.status(404).json({ error: 'Account not found' });
  const safe = svc.safe(profile);
  safe._id = safe._id.toString();
  safe.role = req.user.role;
  res.json(safe);
}));

// ---- Profile update + password change ----
app.put('/api/profile', auth, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const col = req.user.role === 'admin' ? 'admins' : req.user.role === 'organizer' ? 'organizers' : 'users';
  const { full_name, org_name, phone, address, city, profile_photo, website, social, description } = req.body;
  const update = {};
  if (req.user.role === 'organizer') {
    if (org_name) update.org_name = svc.sanitize(org_name).slice(0, 120);
    if (description) update.description = svc.sanitize(description).slice(0, 1000);
    if (website) update.website = String(website).slice(0, 255);
    if (social) update.social = social;
  } else {
    if (full_name) update.full_name = svc.sanitize(full_name).slice(0, 120);
  }
  if (phone) { if (!svc.validPhone(phone)) return res.status(400).json({ error: 'Invalid phone' }); update.phone = phone; }
  if (address) update.address = svc.sanitize(address).slice(0, 255);
  if (city) update.city = svc.sanitize(city).slice(0, 120);
  if (profile_photo) update.profile_image = String(profile_photo).slice(0, 500);
  await db.collection(col).updateOne({ _id: oid(req.user.id) }, { $set: update });
  res.json({ success: true });
}));

app.post('/api/profile/password', auth, asyncHandler(async (req, res) => {
  const { current, next } = req.body;
  if (!current || !next || next.length < 6) return res.status(400).json({ error: 'Current and new password (min 6) required' });
  const { db } = await connectToDatabase();
  const col = req.user.role === 'admin' ? 'admins' : req.user.role === 'organizer' ? 'organizers' : 'users';
  const profile = await db.collection(col).findOne({ _id: oid(req.user.id) });
  if (!profile || !(await bcrypt.compare(current, profile.password))) return res.status(400).json({ error: 'Current password is incorrect' });
  await db.collection(col).updateOne({ _id: profile._id }, { $set: { password: await bcrypt.hash(next, 10) } });
  res.json({ success: true });
}));

// ---- Favorites ----
app.get('/api/favorites', auth, authUser, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const user = await db.collection('users').findOne({ _id: oid(req.user.id) });
  const favs = user && user.favorites ? user.favorites : [];
  const events = await db.collection('events').find({ _id: { $in: favs.map((f) => { const o = oid(f); return o || null; }).filter(Boolean) } }).toArray();
  res.json(events.map((e) => ({ ...svc.safe(e), _id: e._id.toString() })));
}));

app.post('/api/favorites', auth, authUser, asyncHandler(async (req, res) => {
  const { event_id } = req.body;
  const id = oid(event_id);
  if (!id) return res.status(400).json({ error: 'Invalid event' });
  const { db } = await connectToDatabase();
  const user = await db.collection('users').findOne({ _id: oid(req.user.id) });
  const favs = user && user.favorites ? user.favorites.map(String) : [];
  let added = false;
  if (favs.includes(String(id))) {
    favs.splice(favs.indexOf(String(id)), 1);
  } else {
    favs.push(String(id)); added = true;
  }
  await db.collection('users').updateOne({ _id: oid(req.user.id) }, { $set: { favorites: favs } });
  res.json({ added, favorites: favs });
}));

// ---- Notifications ----
app.get('/api/notifications', auth, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const notes = await db.collection('notifications').find({ user_id: oid(req.user.id) }).sort({ created_at: -1 }).limit(50).toArray();
  res.json(notes.map((n) => ({ ...svc.safe(n), _id: n._id.toString() })));
}));

app.post('/api/notifications/read', auth, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const { id } = req.body;
  if (id) await db.collection('notifications').updateOne({ _id: oid(id), user_id: oid(req.user.id) }, { $set: { read: true } });
  else await db.collection('notifications').updateMany({ user_id: oid(req.user.id) }, { $set: { read: true } });
  res.json({ success: true });
}));

// ---- Contact (public form) ----
app.post('/api/contact', asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !svc.validEmail(email || '') || !subject || !message) return res.status(400).json({ error: 'All fields are required' });
  if (String(message).length < 10) return res.status(400).json({ error: 'Message too short' });
  const { db } = await connectToDatabase();
  await db.collection('contact_messages').insertOne({
    name: svc.sanitize(name).slice(0, 120), email: email.trim().toLowerCase(), phone: phone || '',
    subject: svc.sanitize(subject).slice(0, 160), message: svc.sanitize(message).slice(0, 2000),
    status: 'New', created_at: new Date(),
  });
  res.status(201).json({ success: true, message: 'Message received. We will get back to you soon.' });
}));

// ================= BOOKINGS / PAYMENTS =================
app.post('/api/bookings', auth, authUser, asyncHandler(async (req, res) => {
  const { event_id, ticket_type, quantity, qty: requestedQty } = req.body;
  const qty = parseInt(quantity !== undefined && quantity !== null ? quantity : (requestedQty !== undefined && requestedQty !== null ? requestedQty : 1), 10);
  if (!event_id || !Number.isInteger(qty) || qty < 1 || qty > 10) return res.status(400).json({ error: 'Select a ticket (1-10)' });
  const { db } = await connectToDatabase();
  const ev = await db.collection('events').findOne({ _id: oid(event_id) });
  if (!ev || !['Approved', 'Published'].includes(ev.status)) return res.status(404).json({ error: 'Event not available' });
  if (ev.status === 'Cancelled') return res.status(400).json({ error: 'This event is cancelled' });

  // Ticket-type-aware selection
  let unitPrice = ev.price || 0;
  let invCollection = db.collection('events');
  let invFilter = { _id: ev._id, available_seats: { $gte: qty } };
  const ttName = ticket_type || 'General';
  const tt = await db.collection('ticket_types').findOne({ event_id: ev._id, name: ttName });
  if (tt) {
    unitPrice = tt.price;
    invCollection = db.collection('ticket_types');
    invFilter = { _id: tt._id, quantity: { $gte: tt.sold + qty } };
  }
  // Atomic inventory reservation prevents overselling the last seat.
  const reserve = await invCollection.updateOne(invFilter, { $inc: { available_seats: -qty, sold: qty } });
  if (reserve.modifiedCount === 0) return res.status(409).json({ error: 'Sorry, those seats just got booked. Try a lower quantity.' });

  const fee = config.platform.bookingFee;
  const taxes = 0;
  const total = Math.round((unitPrice * qty + fee + taxes) * 100) / 100;

  const bookingDoc = {
    booking_id: 'FHB' + Math.floor(100000 + Math.random() * 900000),
    user_id: oid(req.user.id), event_id: ev._id, organizer_id: ev.organizer_id,
    ticket_type: ttName, quantity: qty, unit_price: unitPrice, fees: fee, taxes,
    total_amount: total, payment_status: 'Pending', booking_status: 'Pending',
    booked_at: new Date(),
  };
  const bk = await db.collection('bookings').insertOne(bookingDoc);

  const order = pay.createPaymentOrder(Math.round(total * 100));
  const pmt = await db.collection('payments').insertOne({
    booking_id: bk.insertedId, user_id: oid(req.user.id), event_id: ev._id,
    order_id: order.order_id, gateway: order.gateway, amount: total, currency: 'INR',
    status: 'Pending', method: order.gateway === 'test' ? 'test' : null, created_at: new Date(),
  });

  res.status(201).json({
    success: true, booking_id: bk.insertedId.toString(), booking_code: bookingDoc.booking_id,
    total_amount: total, currency: config.platform.currency, order: order, payment_id: pmt.insertedId.toString(),
  });
}));

// Server-side payment verification. In test mode we require the stored pending
// payment/order to match - the client can never self-approve.
app.post('/api/payments/verify', auth, authUser, asyncHandler(async (req, res) => {
  const { booking_id, order_id, payment_id, signature, razorpay_payment_id } = req.body;
  if (!booking_id || !order_id) return res.status(400).json({ error: 'booking_id and order_id are required' });
  const { db } = await connectToDatabase();
  const bk = await db.collection('bookings').findOne({ _id: oid(booking_id), user_id: oid(req.user.id) });
  if (!bk) return res.status(404).json({ error: 'Booking not found' });
  if (bk.booking_status === 'Confirmed') return res.json({ success: true, already: true, ticket: await getTicketPayload(db, bk) });
  const pmt = await db.collection('payments').findOne({ booking_id: bk._id, order_id });
  if (!pmt) return res.status(400).json({ error: 'No matching payment order' });

  let ok = false, reason = 'Payment pending';
  if (pmt.gateway === 'test') {
    // Authoritative server-side check: payment exists, pending, belongs to user, order matches.
    ok = pmt.status === 'Pending' && String(pmt.order_id) === String(order_id);
    reason = ok ? 'Paid (test gateway)' : 'Payment not finalized';
  } else if (pmt.gateway === 'razorpay') {
    const v = pay.razorpayVerifySignature({ order_id, payment_id: razorpay_payment_id || payment_id, signature });
    ok = v.ok; reason = v.reason;
  } else if (pmt.gateway === 'stripe') {
    ok = !!pay.stripeVerifySignature; reason = 'Stripe webhook verification required';
  }

  if (!ok) return res.status(400).json({ error: 'Payment verification failed. ' + reason });
  if (bk.booking_status === 'Pending') {
    await db.collection('bookings').updateOne({ _id: bk._id }, { $set: { payment_status: 'Paid', booking_status: 'Confirmed' } });
    await db.collection('payments').updateOne({ _id: pmt._id }, { $set: { status: 'Paid', paid_at: new Date(), txn_id: razorpay_payment_id || payment_id || payment_id || 'TEST-TXN' } });
  }
  // Generate digital ticket
  const tkt = await db.collection('digital_tickets').findOneAndUpdate(
    { booking_id: bk._id },
    { $setOnInsert: { ticket_number: 'TKT-' + (bk.booking_id || crypto.randomBytes(4).toString('hex').toUpperCase()), booking_id: bk._id, user_id: oid(req.user.id), event_id: bk.event_id, qr_payload: 'FHB:' + bk.booking_id + ':' + bk.event_id.toString(), status: 'Active', issued_at: new Date() } },
    { upsert: true, returnDocument: 'after' }
  );
  await sec.notify(db, { user_id: req.user.id, type: 'Booking', title: 'Booking confirmed', message: 'Your ticket for #' + bk.booking_id + ' is ready.', link: '/ticket/' + bk.booking_id });
  res.json({ success: true, ticket: await getTicketPayload(db, bk) });
}));

async function getTicketPayload(db, bk) {
  const ev = await db.collection('events').findOne({ _id: bk.event_id });
  const user = await db.collection('users').findOne({ _id: bk.user_id });
  const tkt = await db.collection('digital_tickets').findOne({ booking_id: bk._id });
  return {
    booking_id: bk._id.toString(), booking_code: bk.booking_id, event_title: ev ? ev.title : '',
    event_date: ev ? ev.event_date : '', event_time: ev ? ev.event_time : '', venue: ev ? ev.venue : '',
    user_name: user ? user.full_name : '', ticket_type: bk.ticket_type, quantity: bookingQty(bk),
    total_amount: bookingAmount(bk), status: bk.booking_status, payment_status: bk.payment_status,
    qr_payload: tkt ? tkt.qr_payload : '', ticket_number: tkt ? tkt.ticket_number : '',
  };
}

// ---- My bookings (user) ----
app.get('/api/my-bookings', auth, authUser, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const bookings = await db.collection('bookings').find({ user_id: oid(req.user.id) }).sort({ booked_at: -1 }).toArray();
  const evIds = [...new Set(bookings.map((b) => b.event_id.toString()))];
  const events = await db.collection('events').find({ _id: { $in: evIds.map((x) => { const o = oid(x); return o || null; }).filter(Boolean) } }).toArray();
  const eMap = {}; events.forEach((e) => (eMap[e._id.toString()] = e));
  const out = [];
  for (const b of bookings) {
    const ev = eMap[b.event_id.toString()];
    const tkt = await db.collection('digital_tickets').findOne({ booking_id: b._id });
    out.push({
      ...svc.safe(b), _id: b._id.toString(), event_id: b.event_id.toString(),
      event_title: ev ? ev.title : 'Event removed', event_date: ev ? ev.event_date : '', event_time: ev ? ev.event_time : '', venue: ev ? ev.venue : '',
      quantity: bookingQty(b), seats_booked: bookingQty(b), total_amount: bookingAmount(b), booking_status: b.booking_status, payment_status: b.payment_status,
      qr_payload: tkt ? tkt.qr_payload : '', ticket_number: tkt ? tkt.ticket_number : '',
    });
  }
  res.json(out);
}));

// ---- Cancel / refund ----
app.post('/api/bookings/:id/cancel', auth, authUser, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const bk = await db.collection('bookings').findOne({ _id: oid(req.params.id), user_id: oid(req.user.id) });
  if (!bk) return res.status(404).json({ error: 'Booking not found' });
  if (bk.booking_status !== 'Confirmed' && bk.booking_status !== 'Pending') return res.status(400).json({ error: 'This booking cannot be cancelled' });
  const quantity = bookingQty(bk);
  await db.collection('events').updateOne({ _id: bk.event_id }, { $inc: { available_seats: quantity } });
  if (bk.ticket_type) await db.collection('ticket_types').updateOne({ event_id: bk.event_id, name: bk.ticket_type }, { $inc: { sold: -quantity } });
  const refunded = bk.payment_status === 'Paid';
  await db.collection('bookings').updateOne({ _id: bk._id }, { $set: { booking_status: refunded ? 'Refunded' : 'Cancelled', payment_status: refunded ? 'Refunded' : bk.payment_status } });
  if (refunded) {
    await db.collection('payments').updateMany({ booking_id: bk._id }, { $set: { status: 'Refunded' } });
    await db.collection('refunds').insertOne({ booking_id: bk._id, user_id: bk.user_id, event_id: bk.event_id, amount: bookingAmount(bk), method: 'Gateway', status: 'Processed', created_at: new Date() });
    await sec.notify(db, { user_id: req.user.id, type: 'Refund', title: 'Refund processed', message: 'Your refund of ' + config.platform.currencySymbol + bookingAmount(bk) + ' for #' + bk.booking_id + ' has been processed.' });
  }
  res.json({ success: true, refunded });
}));

// ---- Reviews ----
app.post('/api/reviews', auth, authUser, asyncHandler(async (req, res) => {
  const { event_id, rating, text } = req.body;
  const r = parseInt(rating, 10);
  if (!event_id || !Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ error: 'Rating 1-5 is required' });
  if (!text || String(text).length < 5) return res.status(400).json({ error: 'Review is too short' });
  const { db } = await connectToDatabase();
  // Only users who booked (and arguably attended) can review.
  const attended = await db.collection('bookings').findOne({ event_id: oid(event_id), user_id: oid(req.user.id), booking_status: { $in: ['Confirmed', 'Checked In'] } });
  if (!attended) return res.status(403).json({ error: 'You can only review events you have booked.' });
  const dup = await db.collection('reviews').findOne({ event_id: oid(event_id), user_id: oid(req.user.id) });
  if (dup) return res.status(400).json({ error: 'You have already reviewed this event' });
  const result = await db.collection('reviews').insertOne({ user_id: oid(req.user.id), event_id: oid(event_id), rating: r, text: svc.sanitize(String(text)).slice(0, 1000), status: 'Approved', created_at: new Date() });
  res.status(201).json({ success: true, id: result.insertedId.toString() });
}));

// ================= ORGANIZER =================
app.get('/api/organizer/stats', auth, authOrganizer, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const myE = await db.collection('events').find({ organizer_id: oid(req.user.id) }).toArray();
  const eIds = myE.map((e) => e._id);
  const bookings = await db.collection('bookings').find({ event_id: { $in: eIds } }).toArray();
  const summary = bookingStats(bookings);
  const published = myE.filter(isPublishedEvent).length;
  const pending = bookings.filter((b) => bookingStatus(b) === 'pending').length;
  const upcoming = myE.filter((e) => computeEventStatus(e) === 'Upcoming').length;
  res.json({
    total_events: safeMetric(myE.length), published_events: safeMetric(published), total_bookings: safeMetric(bookings.length),
    tickets_sold: safeMetric(summary.tickets_sold), revenue: safeMetric(summary.revenue),
    pending_bookings: safeMetric(pending), upcoming_events: safeMetric(upcoming),
  });
}));

app.get('/api/organizer/my-events', auth, authOrganizer, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const events = await db.collection('events').find({ organizer_id: oid(req.user.id) }).sort({ created_at: -1 }).toArray();
  const eIds = events.map((e) => e._id);
  const bookings = await db.collection('bookings').find({ event_id: { $in: eIds } }).toArray();
  const map = bookingStatsByEvent(bookings);
  res.json(events.map((e) => ({
    ...svc.safe(e), _id: e._id.toString(), tickets_booked: safeMetric((map[e._id.toString()] || {}).tickets_sold), revenue: safeMetric((map[e._id.toString()] || {}).revenue),
  })));
}));

app.post('/api/organizer/events', auth, authOrganizer, asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.title || !b.description || !b.venue || !b.event_date || !b.event_time) return res.status(400).json({ error: 'Title, description, venue, date and time are required' });
  if (!b.total_seats || parseInt(b.total_seats, 10) < 1) return res.status(400).json({ error: 'Valid capacity required' });
  if (!b.category_name) return res.status(400).json({ error: 'Category is required' });
  const { db } = await connectToDatabase();
  const cat = await db.collection('categories').findOne({ name: b.category_name });
  if (!cat) return res.status(400).json({ error: 'Invalid category' });
  const draft = b.status === 'Draft';
  const result = await db.collection('events').insertOne({
    title: svc.sanitize(b.title).slice(0, 160), description: svc.sanitize(b.description).slice(0, 3000),
    venue: svc.sanitize(b.venue).slice(0, 200), city: svc.sanitize(b.city || b.venue.split(',')[0]).slice(0, 100), state: svc.sanitize(b.state || '').slice(0, 100),
    event_date: b.event_date, event_time: b.event_time, attendance_start_time: b.start_time || b.event_time, attendance_end_time: b.end_time || '',
    price: parseFloat(b.price || 0), total_seats: parseInt(b.total_seats, 10), available_seats: parseInt(b.total_seats, 10),
    image: b.image || null, images: Array.isArray(b.images) ? b.images.filter(Boolean).slice(0, 8) : (b.image ? [b.image] : []),
    category_id: cat._id, organizer_id: oid(req.user.id), status: draft ? 'Draft' : 'Pending',
    terms: svc.sanitize(b.terms || 'Tickets are non-refundable after purchase.').slice(0, 2000),
    featured: false, trending: false, views: 0, created_at: new Date(),
  });
  if (Array.isArray(b.ticket_types) && b.ticket_types.length) {
    const inserts = b.ticket_types.filter((t) => t.name && t.price >= 0).map((t) => ({
      event_id: result.insertedId, name: svc.sanitize(t.name).slice(0, 60), price: parseFloat(t.price || 0),
      quantity: parseInt(t.quantity || 0, 10), sold: 0, sale_start: t.sale_start || null, sale_end: t.sale_end || null,
    }));
    if (inserts.length) await db.collection('ticket_types').insertMany(inserts);
  } else {
    await db.collection('ticket_types').insertOne({ event_id: result.insertedId, name: 'General', price: parseFloat(b.price || 0), quantity: parseInt(b.total_seats, 10), sold: 0, sale_start: null, sale_end: null });
  }
  await sec.notify(db, { user_id: null, type: 'Event', title: 'New event submitted', message: svc.sanitize(b.title) + ' submitted for ' + (draft ? 'draft' : 'approval') });
  res.status(201).json({ success: true, id: result.insertedId.toString(), status: draft ? 'Draft' : 'Pending' });
}));

app.put('/api/organizer/events/:id', auth, authOrganizer, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const ev = await db.collection('events').findOne({ _id: oid(req.params.id), organizer_id: oid(req.user.id) });
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  const b = req.body;
  await db.collection('events').updateOne({ _id: ev._id }, { $set: {
    title: b.title ? svc.sanitize(b.title).slice(0, 160) : ev.title,
    description: b.description ? svc.sanitize(b.description).slice(0, 3000) : ev.description,
    venue: b.venue || ev.venue, city: b.city || ev.city, price: b.price !== undefined ? parseFloat(b.price || 0) : ev.price,
    image: b.image || ev.image, images: Array.isArray(b.images) ? b.images : ev.images,
  } });
  if (Array.isArray(b.ticket_types)) {
    await db.collection('ticket_types').deleteMany({ event_id: ev._id });
    await db.collection('ticket_types').insertMany(b.ticket_types.filter((t) => t.name).map((t) => ({ event_id: ev._id, name: svc.sanitize(t.name).slice(0, 60), price: parseFloat(t.price || 0), quantity: parseInt(t.quantity || 0, 10), sold: 0, sale_start: t.sale_start || null, sale_end: t.sale_end || null })));
  }
  res.json({ success: true });
}));

app.post('/api/organizer/events/:id/status', auth, authOrganizer, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const { status } = req.body;
  if (!['Published', 'Unpublished', 'Draft'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const ev = await db.collection('events').findOne({ _id: oid(req.params.id), organizer_id: oid(req.user.id) });
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  await db.collection('events').updateOne({ _id: ev._id }, { $set: { status } });
  res.json({ success: true });
}));

app.delete('/api/organizer/events/:id', auth, authOrganizer, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const ev = await db.collection('events').findOne({ _id: oid(req.params.id), organizer_id: oid(req.user.id) });
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  await db.collection('events').deleteOne({ _id: ev._id });
  await db.collection('ticket_types').deleteMany({ event_id: ev._id });
  res.json({ success: true });
}));

app.get('/api/organizer/bookings', auth, authOrganizer, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const q = req.query;
  const myE = await db.collection('events').find({ organizer_id: oid(req.user.id) }).toArray();
  const eIds = myE.map((e) => e._id);
  if (!eIds.length) return res.json({ total: 0, page: 1, per_page: 0, bookings: [] });
  let filter = { event_id: { $in: eIds } };
  if (q.status) filter.booking_status = q.status;
  if (q.search) {
    const uids = (await db.collection('users').find({ $or: [{ full_name: { $regex: q.search, $options: 'i' } }, { email: { $regex: q.search, $options: 'i' } }] }).toArray()).map((u) => u._id);
    filter.$or = [{ user_id: { $in: uids } }, { booking_id: { $regex: q.search, $options: 'i' } }];
  }
  const page = Math.max(parseInt(q.page || '1', 10), 1);
  const perPage = Math.min(Math.max(parseInt(q.per_page || '10', 10), 1), 50);
  const total = await db.collection('bookings').countDocuments(filter);
  const bks = await db.collection('bookings').find(filter).sort({ booked_at: -1 }).skip((page - 1) * perPage).limit(perPage).toArray();
  const uMap = {};
  (await db.collection('users').find({ _id: { $in: [...new Set(bks.map((b) => b.user_id))] } }).toArray()).forEach((u) => (uMap[u._id.toString()] = u));
  const eMap = {}; myE.forEach((e) => (eMap[e._id.toString()] = e));
  res.json({ total, page, per_page: perPage, bookings: bks.map((b) => {
    const u = uMap[b.user_id.toString()];
    return { ...svc.safe(b), _id: b._id.toString(), user_name: u ? u.full_name : 'Unknown', user_email: u ? u.email : '', user_phone: u ? u.phone : '', event_title: eMap[b.event_id.toString()] ? eMap[b.event_id.toString()].title : 'Unknown', quantity: bookingQty(b), seats_booked: bookingQty(b), total_amount: bookingAmount(b) };
  }) });
}));

app.get('/api/organizer/bookings/export', auth, authOrganizer, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const myE = await db.collection('events').find({ organizer_id: oid(req.user.id) }).toArray();
  const eIds = myE.map((e) => e._id);
  const bks = await db.collection('bookings').find({ event_id: { $in: eIds } }).sort({ booked_at: -1 }).toArray();
  const userMap = {};
  (await db.collection('users').find({ _id: { $in: [...new Set(bks.map((b) => b.user_id))] } }).toArray()).forEach((u) => (userMap[u._id.toString()] = u));
  const eMap = {}; myE.forEach((e) => (eMap[e._id.toString()] = e));
  const header = ['Booking ID', 'Customer', 'Email', 'Phone', 'Event', 'Ticket Type', 'Quantity', 'Amount', 'Payment', 'Status', 'Date'];
  const rows = bks.map((b) => {
    const u = userMap[b.user_id.toString()];
    return [b.booking_id, u ? u.full_name : '', u ? u.email : '', u ? u.phone : '', eMap[b.event_id.toString()] ? eMap[b.event_id.toString()].title : '', b.ticket_type, bookingQty(b), bookingAmount(b), b.payment_status, b.booking_status, b.booked_at ? new Date(b.booked_at).toISOString() : ''];
  });
  const csv = [header, ...rows].map((r) => r.map((c) => '"' + String(c || '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="organizer-bookings.csv"');
  res.send('\uFEFF' + csv);
}));

// ---- QR Check-in ----
app.post('/api/organizer/check-in', auth, authOrganizer, asyncHandler(async (req, res) => {
  const { qr_payload } = req.body;
  if (!qr_payload) return res.status(400).json({ error: 'QR payload required' });
  const { db } = await connectToDatabase();
  const parts = String(qr_payload).split(':');
  const bookingCode = parts.length >= 2 ? parts[1] : null;
  if (!bookingCode) return res.status(400).json({ error: 'Invalid QR format' });
  const bk = await db.collection('bookings').findOne({ booking_id: bookingCode });
  const myE = await db.collection('events').findOne({ _id: bk ? bk.event_id : null, organizer_id: oid(req.user.id) });
  if (!bk || !myE) return res.status(404).json({ error: 'Invalid ticket' });
  if (!isValidBooking(bk) || !['Confirmed', 'Paid'].includes(bk.payment_status)) return res.status(400).json({ error: 'Invalid ticket' });
  const existing = await db.collection('check_ins').findOne({ booking_id: bk._id });
  if (existing) {
    const user = await db.collection('users').findOne({ _id: bk.user_id });
    return res.json({ already_checked_in: true, customer: user ? user.full_name : '', event: myE.title, ticket_type: bk.ticket_type, quantity: bookingQty(bk), booking_id: bk.booking_id, checked_in_at: existing.checked_in_at });
  }
  const ci = await db.collection('check_ins').insertOne({ booking_id: bk._id, event_id: bk.event_id, user_id: bk.user_id, checked_in_by: oid(req.user.id), checked_in_at: new Date(), status: 'Checked In' });
  await db.collection('bookings').updateOne({ _id: bk._id }, { $set: { booking_status: 'Checked In' } });
  const user = await db.collection('users').findOne({ _id: bk.user_id });
  res.json({ success: true, customer: user ? user.full_name : '', event: myE.title, ticket_type: bk.ticket_type, quantity: bookingQty(bk), booking_id: bk.booking_id, checked_in_at: new Date() });
}));

// ================= ADMIN =================
app.get('/api/admin/stats', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const c = (col, f = {}) => db.collection(col).countDocuments(f);
  const bookings = await db.collection('bookings').find({}).toArray();
  const summary = bookingStats(bookings);
  const commission = Math.round(summary.revenue * config.platform.commissionPercent / 10000 * 100) / 100;
  const allEvents = await db.collection('events').find({}).toArray();
  const upcoming = allEvents.filter((e) => computeEventStatus(e) === 'Upcoming').length;
  res.json({
    total_users: safeMetric(await c('users')), total_organizers: safeMetric(await c('organizers')),
    total_events: safeMetric(allEvents.length), published_events: safeMetric(allEvents.filter(isPublishedEvent).length),
    total_bookings: safeMetric(bookings.length), tickets_sold: safeMetric(summary.tickets_sold), total_revenue: safeMetric(summary.revenue),
    platform_commission: safeMetric(commission), pending_events: safeMetric(await c('events', { status: 'Pending' })),
    pending_organizers: safeMetric(await c('organizers', { status: 'Pending' })),
    open_contacts: safeMetric(await c('contact_messages', { status: { $ne: 'Resolved' } })),
    upcoming_events: safeMetric(upcoming),
  });
}));

// Users management
app.get('/api/admin/users', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const q = req.query;
  let filter = {};
  if (q.search) filter.$or = [{ full_name: { $regex: q.search, $options: 'i' } }, { email: { $regex: q.search, $options: 'i' } }, { phone: { $regex: q.search, $options: 'i' } }];
  if (q.status) filter.status = q.status;
  const users = await db.collection('users').find(filter).sort({ created_at: -1 }).toArray();
  const bookings = await db.collection('bookings').find({ user_id: { $in: users.map((u) => u._id) } }).toArray();
  const m = {};
  validBookings(bookings).forEach((b) => {
    const key = b.user_id && b.user_id.toString();
    if (!key) return;
    if (!m[key]) m[key] = { n: 0, amt: 0 };
    m[key].n += 1;
    m[key].amt += bookingAmount(b);
  });
  res.json(users.map((u) => ({ ...svc.safe(u), _id: u._id.toString(), bookings_count: safeMetric((m[u._id.toString()] || {}).n), spent: safeMetric((m[u._id.toString()] || {}).amt) })));
}));

app.get('/api/admin/users/:id', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const user = await db.collection('users').findOne({ _id: oid(req.params.id) });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const bookings = await db.collection('bookings').find({ user_id: user._id }).sort({ booked_at: -1 }).toArray();
  res.json({ ...svc.safe(user), _id: user._id.toString(), bookings });
}));

app.patch('/api/admin/users/:id', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const { status } = req.body;
  if (!svc.USER_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const user = await db.collection('users').findOne({ _id: oid(req.params.id) });
  if (!user) return res.status(404).json({ error: 'User not found' });
  await db.collection('users').updateOne({ _id: user._id }, { $set: { status } });
  await sec.audit(db, { admin_id: req.user.id, action: 'user.' + status.toLowerCase(), target_entity: 'user', target_id: user._id.toString(), metadata: { email: user.email } });
  await sec.notify(db, { user_id: user._id.toString(), type: 'Account', title: 'Account ' + status.toLowerCase(), message: 'Your FestivoHub account has been ' + status.toLowerCase() + '.' });
  res.json({ success: true });
}));

app.delete('/api/admin/users/:id', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const user = await db.collection('users').findOne({ _id: oid(req.params.id) });
  if (!user) return res.status(404).json({ error: 'User not found' });
  await db.collection('users').deleteOne({ _id: user._id });
  await db.collection('bookings').deleteMany({ user_id: user._id });
  await sec.audit(db, { admin_id: req.user.id, action: 'user.delete', target_entity: 'user', target_id: user._id.toString(), metadata: { email: user.email } });
  res.json({ success: true });
}));

// Organizers management
app.get('/api/admin/organizers', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const q = req.query;
  let filter = {};
  if (q.search) filter.$or = [{ org_name: { $regex: q.search, $options: 'i' } }, { email: { $regex: q.search, $options: 'i' } }];
  if (q.status) filter.status = q.status;
  const orgs = await db.collection('organizers').find(filter).sort({ created_at: -1 }).toArray();
  res.json(orgs.map((o) => ({ ...svc.safe(o), _id: o._id.toString() })));
}));

app.patch('/api/admin/organizers/:id', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const { status } = req.body;
  if (!svc.ORG_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const o = await db.collection('organizers').findOne({ _id: oid(req.params.id) });
  if (!o) return res.status(404).json({ error: 'Organizer not found' });
  await db.collection('organizers').updateOne({ _id: o._id }, { $set: { status } });
  const set = { status }; if (status === 'Verified') set.verification_status = 'Verified';
  await db.collection('organizers').updateOne({ _id: o._id }, { $set: set });
  await sec.audit(db, { admin_id: req.user.id, action: 'organizer.' + status.toLowerCase(), target_entity: 'organizer', target_id: o._id.toString(), metadata: { email: o.email } });
  res.json({ success: true });
}));

app.delete('/api/admin/organizers/:id', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const o = await db.collection('organizers').findOne({ _id: oid(req.params.id) });
  if (!o) return res.status(404).json({ error: 'Organizer not found' });
  const evs = await db.collection('events').find({ organizer_id: o._id }).toArray();
  await db.collection('events').deleteMany({ organizer_id: o._id });
  await db.collection('bookings').deleteMany({ event_id: { $in: evs.map((e) => e._id) } });
  await db.collection('organizers').deleteOne({ _id: o._id });
  await sec.audit(db, { admin_id: req.user.id, action: 'organizer.delete', target_entity: 'organizer', target_id: o._id.toString(), metadata: { email: o.email } });
  res.json({ success: true });
}));

// Events management (admin)
app.get('/api/admin/events', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const events = await db.collection('events').find({}).sort({ created_at: -1 }).toArray();
  const eIds = events.map((e) => e._id);
  const bookings = await db.collection('bookings').find({ event_id: { $in: eIds } }).toArray();
  const m = bookingStatsByEvent(bookings);
  const orgMap = {};
  (await db.collection('organizers').find({}).toArray()).forEach((o) => (orgMap[o._id.toString()] = o.org_name));
  res.json(events.map((e) => ({ ...svc.safe(e), _id: e._id.toString(), tickets_booked: safeMetric((m[e._id.toString()] || {}).tickets_sold), revenue: safeMetric((m[e._id.toString()] || {}).revenue), org_name: orgMap[String(e.organizer_id)] || 'Unknown' })));
}));

app.patch('/api/admin/events/:id', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const { status, featured, trending } = req.body;
  const ev = await db.collection('events').findOne({ _id: oid(req.params.id) });
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  const set = {};
  if (status) { if (!svc.EVENT_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' }); set.status = status; }
  if (featured !== undefined) set.featured = !!featured;
  if (trending !== undefined) set.trending = !!trending;
  await db.collection('events').updateOne({ _id: ev._id }, { $set: set });
  if (status) {
    await sec.audit(db, { admin_id: req.user.id, action: 'event.' + status.toLowerCase(), target_entity: 'event', target_id: ev._id.toString(), metadata: { title: ev.title } });
    const org = ev.organizer_id ? await db.collection('organizers').findOne({ _id: ev.organizer_id }) : null;
    if (org) await sec.notify(db, { user_id: ev.organizer_id.toString(), type: 'Event', title: 'Event ' + status, message: 'Your event "' + ev.title + '" was ' + status + '.', link: '' });
  }
  res.json({ success: true });
}));

app.put('/api/admin/events/:id', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const ev = await db.collection('events').findOne({ _id: oid(req.params.id) });
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  const b = req.body;
  const update = { title: b.title || ev.title, description: b.description || ev.description, venue: b.venue || ev.venue, event_date: b.event_date || ev.event_date, event_time: b.event_time || ev.event_time, price: b.price !== undefined ? parseFloat(b.price || 0) : ev.price };
  if (b.total_seats) { update.total_seats = parseInt(b.total_seats, 10); update.available_seats = parseInt(b.total_seats, 10); }
  if (b.category_name) { const cat = await db.collection('categories').findOne({ name: b.category_name }); if (cat) update.category_id = cat._id; }
  await db.collection('events').updateOne({ _id: ev._id }, { $set: update });
  await sec.audit(db, { admin_id: req.user.id, action: 'event.edit', target_entity: 'event', target_id: ev._id.toString(), metadata: { title: ev.title } });
  res.json({ success: true });
}));

app.delete('/api/admin/events/:id', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const ev = await db.collection('events').findOne({ _id: oid(req.params.id) });
  await db.collection('events').deleteOne({ _id: ev._id });
  await db.collection('bookings').deleteMany({ event_id: ev._id });
  await db.collection('ticket_types').deleteMany({ event_id: ev._id });
  await sec.audit(db, { admin_id: req.user.id, action: 'event.delete', target_entity: 'event', target_id: ev._id.toString(), metadata: ev ? { title: ev.title } : {} });
  res.json({ success: true });
}));

// Admin: all bookings/user/event joins
app.get('/api/admin/bookings', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const q = req.query;
  let filter = {};
  if (q.status) filter.booking_status = q.status;
  const q_ = q.search ? await db.collection('bookings').find({ booking_id: { $regex: q.search, $options: 'i' } }).toArray() : [];
  const bookings = await db.collection('bookings').find(filter).sort({ booked_at: -1 }).toArray();
  const uids = [...new Set(bookings.map((b) => b.user_id.toString()))];
  const eids = [...new Set(bookings.map((b) => b.event_id.toString()))];
  const umap = {}; (await db.collection('users').find({ _id: { $in: uids.map((x) => { const o = oid(x); return o || null; }).filter(Boolean) } }).toArray()).forEach((u) => (umap[u._id.toString()] = u));
  const emap = {}; (await db.collection('events').find({ _id: { $in: eids.map((x) => { const o = oid(x); return o || null; }).filter(Boolean) } }).toArray()).forEach((e) => (emap[e._id.toString()] = e));
  res.json(bookings.map((b) => ({ ...svc.safe(b), _id: b._id.toString(), event_title: emap[b.event_id.toString()] ? emap[b.event_id.toString()].title : 'Unknown', user_name: umap[b.user_id.toString()] ? umap[b.user_id.toString()].full_name : 'Unknown', quantity: bookingQty(b), seats: bookingQty(b), total: bookingAmount(b), total_amount: bookingAmount(b), status: b.booking_status })));
}));

// Admin: payments
app.get('/api/admin/payments', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const payments = await db.collection('payments').find({}).sort({ created_at: -1 }).limit(100).toArray();
  res.json(payments.map((p) => ({ ...svc.safe(p), _id: p._id.toString(), booking_id: p.booking_id.toString() })));
}));

// Admin: refund requests
app.get('/api/admin/refunds', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const refunds = await db.collection('refunds').find({}).sort({ created_at: -1 }).toArray();
  res.json(refunds.map((r) => ({ ...svc.safe(r), _id: r._id.toString(), booking_id: r.booking_id.toString() })));
}));

// Admin: categories CRUD
app.get('/api/admin/categories', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  res.json(await db.collection('categories').find({}).sort({ name: 1 }).toArray());
}));
app.post('/api/admin/categories', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const rawName = String(req.body.name || '').trim().slice(0, 60);
  if (!rawName) return res.status(400).json({ error: 'Name required' });
  const name = svc.sanitize(rawName);
  const slug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';
  const existing = await db.collection('categories').findOne({ $or: [{ name }, { slug }] });
  if (existing) return res.status(409).json({ error: 'Category already exists' });
  const result = await db.collection('categories').insertOne({ name, slug, created_at: new Date() });
  await sec.audit(db, { admin_id: req.user.id, action: 'category.create', target_entity: 'category', target_id: result.insertedId.toString() });
  res.status(201).json({ success: true, category: { _id: result.insertedId.toString(), name, slug } });
}));
app.delete('/api/admin/categories/:id', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const id = oid(req.params.id);
  if (!id) return res.status(404).json({ error: 'Category not found' });
  const category = await db.collection('categories').findOne({ _id: id });
  if (!category) return res.status(404).json({ error: 'Category not found' });
  const inUse = await db.collection('events').countDocuments({ category_id: id });
  if (inUse) return res.status(409).json({ error: 'Category is used by ' + inUse + ' event(s). Reassign them before deleting.' });
  await db.collection('categories').deleteOne({ _id: id });
  await sec.audit(db, { admin_id: req.user.id, action: 'category.delete', target_entity: 'category', target_id: id.toString() });
  res.json({ success: true });
}));

// Admin: reviews moderation
app.get('/api/admin/reviews', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const reviews = await db.collection('reviews').find({}).sort({ created_at: -1 }).toArray();
  res.json(reviews.map((r) => ({ ...svc.safe(r), _id: r._id.toString() })));
}));
app.patch('/api/admin/reviews/:id', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const { status } = req.body;
  if (!svc.REVIEW_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await db.collection('reviews').updateOne({ _id: oid(req.params.id) }, { $set: { status } });
  await sec.audit(db, { admin_id: req.user.id, action: 'review.' + status.toLowerCase(), target_entity: 'review', target_id: req.params.id });
  res.json({ success: true });
}));

// Admin: contact management
app.get('/api/admin/contacts', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const q = req.query;
  let filter = {};
  if (q.status) filter.status = q.status;
  const list = await db.collection('contact_messages').find(filter).sort({ created_at: -1 }).toArray();
  res.json(list.map((m) => ({ ...svc.safe(m), _id: m._id.toString() })));
}));
app.patch('/api/admin/contacts/:id', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const { status } = req.body;
  if (!svc.CONTACT_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await db.collection('contact_messages').updateOne({ _id: oid(req.params.id) }, { $set: { status } });
  await sec.audit(db, { admin_id: req.user.id, action: 'contact.' + status.toLowerCase(), target_entity: 'contact', target_id: req.params.id });
  res.json({ success: true });
}));

// Admin: audit log
app.get('/api/admin/audit', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const log = await db.collection('admin_actions').find({}).sort({ timestamp: -1 }).limit(200).toArray();
  res.json(log.map((l) => ({ ...svc.safe(l), _id: l._id.toString(), admin_id: l.admin_id ? l.admin_id.toString() : null })));
}));

// Admin: settings
app.get('/api/admin/settings', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const s = await db.collection('platform_settings').findOne({ key: 'global' });
  res.json(s ? s.value : {});
}));
app.put('/api/admin/settings', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const value = req.body;
  await db.collection('platform_settings').updateOne({ key: 'global' }, { $set: { value } }, { upsert: true });
  await sec.audit(db, { admin_id: req.user.id, action: 'settings.update', target_entity: 'settings', target_id: 'global' });
  res.json({ success: true });
}));

// ---- POST aliases for status updates (frontend calls POST, backend uses PATCH) ----
app.post('/api/admin/events/:id/status', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const { status } = req.body;
  if (!svc.EVENT_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const ev = await db.collection('events').findOne({ _id: oid(req.params.id) });
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  await db.collection('events').updateOne({ _id: ev._id }, { $set: { status } });
  await sec.audit(db, { admin_id: req.user.id, action: 'event.' + status.toLowerCase(), target_entity: 'event', target_id: ev._id.toString(), metadata: { title: ev.title } });
  const org = ev.organizer_id ? await db.collection('organizers').findOne({ _id: ev.organizer_id }) : null;
  if (org) await sec.notify(db, { user_id: ev.organizer_id.toString(), type: 'Event', title: 'Event ' + status, message: 'Your event "' + ev.title + '" was ' + status + '.' });
  res.json({ success: true });
}));

app.post('/api/admin/organizers/:id/status', auth, authAdmin, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const { status } = req.body;
  if (!svc.ORG_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const o = await db.collection('organizers').findOne({ _id: oid(req.params.id) });
  if (!o) return res.status(404).json({ error: 'Organizer not found' });
  const set = { status }; if (status === 'Approved' || status === 'Verified') set.verification_status = status;
  await db.collection('organizers').updateOne({ _id: o._id }, { $set: set });
  await sec.audit(db, { admin_id: req.user.id, action: 'organizer.' + status.toLowerCase(), target_entity: 'organizer', target_id: o._id.toString(), metadata: { email: o.email } });
  res.json({ success: true });
}));

// ---- Organizer analytics ----
app.get('/api/organizer/analytics', auth, authOrganizer, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const myE = await db.collection('events').find({ organizer_id: oid(req.user.id) }).toArray();
  const eIds = myE.map((e) => e._id);
  const bookings = await db.collection('bookings').find({ event_id: { $in: eIds } }).toArray();
  const summary = bookingStats(bookings);
  const valid = summary.valid;
  const ticketsSold = summary.tickets_sold;
  const totalRevenue = summary.revenue;
  const totalViews = safeMetric(myE.reduce((s, e) => s + numberValue(e.views || 0), 0));
  const published = myE.filter(isPublishedEvent);
  const avgPrice = ticketsSold > 0 ? Math.round(totalRevenue / ticketsSold) : 0;
  const conversionRate = totalViews > 0 ? Math.round((ticketsSold / totalViews) * 10000) / 100 : 0;
  const bestEvent = myE.reduce((best, e) => {
    const sold = valid.filter((b) => b.event_id && b.event_id.toString() === e._id.toString()).reduce((s, b) => s + bookingQty(b), 0);
    return sold > (best ? best.sold : 0) ? { ...e, sold } : best;
  }, null);

  // Revenue by day (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentBookings = valid.filter((b) => b.booked_at && new Date(b.booked_at) >= thirtyDaysAgo);
  const revByDay = {};
  const bkByDay = {};
  recentBookings.forEach((b) => {
    const day = new Date(b.booked_at).toISOString().slice(0, 10);
    revByDay[day] = (revByDay[day] || 0) + bookingAmount(b);
    bkByDay[day] = (bkByDay[day] || 0) + 1;
  });

  res.json({
    total_events: safeMetric(myE.length), published_events: safeMetric(published.length),
    tickets_sold: safeMetric(ticketsSold), total_revenue: safeMetric(totalRevenue), total_views: safeMetric(totalViews),
    avg_ticket_price: safeMetric(avgPrice), conversion_rate: safeMetric(conversionRate),
    best_event: bestEvent ? { title: bestEvent.title, sold: safeMetric(bestEvent.sold) } : null,
    revenue_by_day: revByDay, bookings_by_day: bkByDay,
  });
}));

// ---- Organizer revenue ----
app.get('/api/organizer/revenue', auth, authOrganizer, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const myE = await db.collection('events').find({ organizer_id: oid(req.user.id) }).toArray();
  const eIds = myE.map((e) => e._id);
  const bookings = await db.collection('bookings').find({ event_id: { $in: eIds } }).sort({ booked_at: -1 }).toArray();
  const summary = bookingStats(bookings);
  const eMap = {}; myE.forEach((e) => (eMap[e._id.toString()] = e));
  const totalRevenue = summary.revenue;
  const platformFee = Math.round(totalRevenue * config.platform.commissionPercent / 10000 * 100) / 100;
  const netRevenue = totalRevenue - platformFee;
  const recentBookings = summary.valid.slice(0, 50).map((b) => ({
    _id: b._id.toString(), event_title: eMap[b.event_id.toString()] ? eMap[b.event_id.toString()].title : 'Unknown',
    amount: bookingAmount(b), booking_id: b.booking_id, booked_at: b.booked_at,
  }));
  res.json({ total_revenue: safeMetric(totalRevenue), platform_fee: safeMetric(platformFee), net_revenue: safeMetric(netRevenue), currency: config.platform.currencySymbol, recent_bookings: recentBookings });
}));

// ---- Organizer check-in history ----
app.get('/api/organizer/check-ins', auth, authOrganizer, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const myE = await db.collection('events').find({ organizer_id: oid(req.user.id) }).toArray();
  const eIds = myE.map((e) => e._id);
  const checks = await db.collection('check_ins').find({ event_id: { $in: eIds } }).sort({ checked_in_at: -1 }).limit(100).toArray();
  const eMap = {}; myE.forEach((e) => (eMap[e._id.toString()] = e));
  const uIds = checks.map((c) => c.user_id).filter(Boolean);
  const uMap = {};
  (await db.collection('users').find({ _id: { $in: uIds } }).toArray()).forEach((u) => (uMap[u._id.toString()] = u));
  res.json(checks.map((c) => ({
    _id: c._id.toString(), event_title: eMap[c.event_id.toString()] ? eMap[c.event_id.toString()].title : 'Unknown',
    user_name: uMap[c.user_id.toString()] ? uMap[c.user_id.toString()].full_name : 'Unknown',
    checked_in_at: c.checked_in_at,
  })));
}));

// ---- User tickets ----
app.get('/api/user/tickets', auth, authUser, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const tickets = await db.collection('digital_tickets').find({ user_id: oid(req.user.id) }).sort({ issued_at: -1 }).toArray();
  const bkIds = tickets.map((t) => t.booking_id).filter(Boolean);
  const bookings = await db.collection('bookings').find({ _id: { $in: bkIds } }).toArray();
  const bkMap = {}; bookings.forEach((b) => (bkMap[b._id.toString()] = b));
  const evIds = [...new Set(bookings.map((b) => b.event_id.toString()))];
  const events = await db.collection('events').find({ _id: { $in: evIds.map((x) => oid(x)).filter(Boolean) } }).toArray();
  const eMap = {}; events.forEach((e) => (eMap[e._id.toString()] = e));
  res.json(tickets.map((t) => {
    const bk = bkMap[t.booking_id.toString()];
    const ev = bk ? eMap[bk.event_id.toString()] : null;
    return {
      _id: t._id.toString(), ticket_number: t.ticket_number, qr_payload: t.qr_payload,
      status: t.status, issued_at: t.issued_at, checked_in_at: t.checked_in_at,
      event_title: ev ? ev.title : 'Unknown', event_date: ev ? ev.event_date : '', event_time: ev ? ev.event_time : '',
      venue: ev ? ev.venue : '', city: ev ? ev.city : '',
      ticket_type: bk ? bk.ticket_type : '', quantity: bk ? bookingQty(bk) : 0,
      booking_id: bk ? bk._id.toString() : '', booking_code: bk ? bk.booking_id : '',
      total_amount: bk ? bookingAmount(bk) : 0,
    };
  }));
}));

// ---- Event reviews endpoint ----
app.get('/api/events/:id/reviews', asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const id = oid(req.params.id);
  if (!id) return res.status(404).json({ error: 'Event not found' });
  const reviews = await db.collection('reviews').find({ event_id: id, status: 'Approved' }).sort({ created_at: -1 }).toArray();
  const uIds = reviews.map((r) => r.user_id).filter(Boolean);
  const uMap = {};
  (await db.collection('users').find({ _id: { $in: uIds } }).toArray()).forEach((u) => (uMap[u._id.toString()] = u));
  res.json(reviews.map((r) => ({
    _id: r._id.toString(), rating: r.rating, text: r.text, status: r.status, created_at: r.created_at,
    user_name: uMap[r.user_id.toString()] ? uMap[r.user_id.toString()].full_name : 'Anonymous',
  })));
}));

// ---- QR Ticket image endpoint ----
const QRCode = require('qrcode');
app.get('/api/tickets/:id/qr', auth, asyncHandler(async (req, res) => {
  const { db } = await connectToDatabase();
  const tkt = await db.collection('digital_tickets').findOne({ _id: oid(req.params.id) });
  if (!tkt) return res.status(404).json({ error: 'Ticket not found' });
  if (tkt.user_id.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'organizer') {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const dataUrl = await QRCode.toDataURL(tkt.qr_payload || 'INVALID', { width: 300, margin: 2, color: { dark: '#1a1a35', light: '#ffffff' } });
    res.json({ qr: dataUrl, payload: tkt.qr_payload });
  } catch (e) {
    res.status(500).json({ error: 'QR generation failed' });
  }
}));

// ---- API 404 (JSON, never HTML) ----
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// ---- SPA fallback for non-API routes ----
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;