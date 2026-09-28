const bcrypt = require('bcryptjs');
const { connectToDatabase } = require('./db');
const { ObjectId } = require('mongodb');

// Demo/development credentials (do not put secrets here in production).
const CRED_EMAIL = 'parmarprachi@gmail.com';
const CRED_PASS = 'Prachi';
const DEMO = process.env.SEED_DEMO_DATA !== 'false'; // safety switch

const CATEGORY_NAMES = [
  'Music', 'Garba', 'Cultural', 'Religious', 'Food', 'Sports',
  'Technology', 'Business', 'Comedy', 'Workshops', 'Dance', 'Cricket', 'Education', 'Art', 'Other',
];

function catSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function extractCityFromVenue(venue) {
  if (!venue) return '';
  const parts = venue.split(',').map((s) => s.trim());
  return parts.length >= 2 ? parts[0] : venue;
}
function extractStateFromVenue(venue) {
  if (!venue) return '';
  const parts = venue.split(',').map((s) => s.trim());
  return parts.length >= 2 ? parts[parts.length - 1] : '';
}

// Lightweight idempotent migration: adds missing fields to old-seed events.
async function migrateExistingEvents(db) {
  const col = db.collection('events');
  const missing = await col.find({ city: { $in: [null, ''] } }).limit(50).toArray();
  for (const ev of missing) {
    const city = extractCityFromVenue(ev.venue);
    const state = extractStateFromVenue(ev.venue);
    await col.updateOne({ _id: ev._id }, { $set: { city, state, images: ev.images || (ev.image ? [ev.image] : []), featured: !!ev.featured, trending: !!ev.trending, views: ev.views || 0, created_at: ev.created_at || new Date() } });
  }
}

// Idempotent: always ensure the full category set exists (safe to run every boot).
async function ensureCategories(dbArg) {
  const db = dbArg || (await connectToDatabase()).db;
  const col = db.collection('categories');
  for (const name of CATEGORY_NAMES) {
    const existing = await col.findOne({ name });
    if (!existing) {
      await col.insertOne({ name, slug: catSlug(name), created_at: new Date() });
    }
  }
  return col.find({ name: { $in: CATEGORY_NAMES } }).toArray();
}

async function seedIfEmpty() {
  const { db } = await connectToDatabase();

  const cats = await ensureCategories(db);
  const catByName = {};
  cats.forEach((c) => (catByName[c.name] = c._id));

  // Light migration for events missing new fields
  await migrateExistingEvents(db);

  // ---- ADMINS ----
  const admins = db.collection('admins');
  if ((await admins.countDocuments({})) === 0) {
    const hash = await bcrypt.hash(CRED_PASS, 10);
    await admins.insertOne({
      name: 'Super Admin', email: CRED_EMAIL, password: hash, role: 'admin',
      status: 'Active', verified: true, created_at: new Date(),
    });
  }

  // ---- ORGANIZERS ----
  const organizers = db.collection('organizers');
  if ((await organizers.countDocuments({})) === 0) {
    const hash = await bcrypt.hash(CRED_PASS, 10);
    await organizers.insertOne({
      org_name: 'Prachi Events', email: CRED_EMAIL, phone: '9876543210',
      password: hash, profile_image: 'default-org.png',
      description: 'A leading full-service event production house across Gujarat & India.',
      website: '', social: { instagram: '', facebook: '' },
      address: 'Ahmedabad, Gujarat', city: 'Ahmedabad', state: 'Gujarat',
      verification_status: 'Verified', status: 'Approved', verified: true, created_at: new Date(),
    });
  }

  // ---- USERS ----
  const users = db.collection('users');
  if ((await users.countDocuments({})) === 0) {
    const hash = await bcrypt.hash(CRED_PASS, 10);
    await users.insertOne({
      full_name: 'Prachi Parmar', email: CRED_EMAIL, phone: '9876543210',
      password: hash, address: 'Ahmedabad, Gujarat', city: 'Ahmedabad', gender: 'Male',
      profile_image: 'default-user.png', status: 'Active', verified: true,
      favorites: [], created_at: new Date(),
    });
  }

  // ---- EVENTS (only when empty; uses approved/cancelled/upcoming variety) ----
  const events = db.collection('events');
  if ((await events.countDocuments({})) === 0 && DEMO) {
    const org = await organizers.findOne({});
    const C = catByName;
    const rows = [
      { title: 'Navratri Garba Night', desc: '9 nights of traditional garba and dandiya with live folk music, food stalls and a vibrant cultural atmosphere.', venue: 'Vadodara, Gujarat', city: 'Vadodara', state: 'Gujarat', date: '2026-10-12', time: '19:00', price: 499, seats: 120, img: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800', cat: C['Garba'] || C['Cultural'] },
      { title: 'Sunburn Music Festival', desc: "India's largest electronic dance music festival with international artists, giant stages and beach-side parties.", venue: 'Goa', city: 'Goa', state: 'Goa', date: '2026-12-28', time: '16:00', price: 1999, seats: 45, img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800', cat: C['Music'] },
      { title: 'Tech Innovators Summit', desc: 'A one-day conference for developers and startups featuring keynotes, workshops and a hackathon.', venue: 'Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', date: '2026-11-05', time: '10:00', price: 0, seats: 80, img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', cat: C['Technology'] },
      { title: 'Street Food Carnival', desc: 'An evening of the best street food from across Gujarat with live cooking demos and music.', venue: 'Surat, Gujarat', city: 'Surat', state: 'Gujarat', date: '2026-09-20', time: '17:00', price: 99, seats: 200, img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', cat: C['Food'] },
      { title: 'International Kite Festival', desc: 'A colorful sky celebration with kite-making workshops, live performances and evening light shows.', venue: 'Ahmedabad, Gujarat', city: 'Ahmedabad', state: 'Gujarat', date: '2026-08-14', time: '09:00', price: 0, seats: 500, img: 'https://images.unsplash.com/photo-1501862700950-18382cd41497?w=800', cat: C['Cultural'] || C['Other'] },
      { title: 'Bollywood Music Night', desc: 'An electrifying night of Bollywood hits performed live by top playback singers. Dance, sing and celebrate!', venue: 'Mumbai, Maharashtra', city: 'Mumbai', state: 'Maharashtra', date: '2026-11-15', time: '20:00', price: 799, seats: 300, img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800', cat: C['Music'] },
      { title: 'IPL Screening Bash', desc: 'Watch the IPL finals on a giant LED screen with food, drinks and an electrifying stadium-like atmosphere.', venue: 'Bangalore, Karnataka', city: 'Bangalore', state: 'Karnataka', date: '2026-05-25', time: '18:00', price: 249, seats: 150, img: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800', cat: C['Sports'] },
      { title: 'AI & Machine Learning Workshop', desc: 'Hands-on workshop covering neural networks, GPT models and real-world AI applications. Bring your laptop!', venue: 'Pune, Maharashtra', city: 'Pune', state: 'Maharashtra', date: '2026-10-20', time: '10:00', price: 599, seats: 50, img: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800', cat: C['Workshops'] || C['Technology'] },
      { title: 'Gujarati Thali Festival', desc: 'Taste 50+ authentic Gujarati dishes from royal Kathiawadi to sweet Surti delicacies. Unlimited refills!', venue: 'Rajkot, Gujarat', city: 'Rajkot', state: 'Gujarat', date: '2026-11-22', time: '12:00', price: 399, seats: 100, img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', cat: C['Food'] },
      { title: 'Diwali Mela & Fireworks', desc: 'Grand Diwali celebration with traditional lamp lighting, cultural performances, shopping stalls and a stunning fireworks finale.', venue: 'Jaipur, Rajasthan', city: 'Jaipur', state: 'Rajasthan', date: '2026-10-20', time: '17:00', price: 199, seats: 400, img: 'https://images.unsplash.com/photo-1606503153255-59d8b2e4b8e2?w=800', cat: C['Cultural'] || C['Religious'] || C['Other'] },
      { title: 'Marathon for Mental Health', desc: 'Run for a cause! 5K and 10K marathon promoting mental health awareness with post-run yoga and music sessions.', venue: 'Delhi', city: 'Delhi', state: 'Delhi', date: '2026-10-10', time: '06:00', price: 150, seats: 500, img: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800', cat: C['Sports'] },
      { title: 'Stand-up Comedy Night', desc: 'An intimate evening of laughter with India\u2019s funniest comics. 18+ only.', venue: 'Mumbai, Maharashtra', city: 'Mumbai', state: 'Maharashtra', date: '2026-12-05', time: '21:00', price: 299, seats: 90, img: 'https://images.unsplash.com/photo-1532494615167-8d5f8f5c0e0b?w=800', cat: C['Comedy'] || C['Other'] },
    ];
    const docs = rows.map((r) => ({
      title: r.title, description: r.desc, venue: r.venue, city: r.city, state: r.state,
      event_date: r.date, event_time: r.time, attendance_start_time: r.time, attendance_end_time: null,
      price: r.price, total_seats: r.seats, available_seats: r.seats, status: 'Approved',
      image: r.img, images: [r.img], category_id: r.cat, organizer_id: org._id,
      terms: 'Tickets are non-refundable after purchase. Please arrive 30 minutes early.',
      featured: false, trending: r.title.includes('Garba') || r.title.includes('Sunburn'),
      views: 0, created_at: new Date(),
    }));
    const res = await events.insertMany(docs);
    const eventDocs = await events.find({ _id: { $in: Object.values(res.insertedIds) } }).toArray();

    // ---- TICKET TYPES for each event ----
    const tts = db.collection('ticket_types');
    if ((await tts.countDocuments({})) === 0) {
      const inserts = [];
      eventDocs.forEach((ev) => {
        inserts.push(
          { event_id: ev._id, name: 'General', price: ev.price, quantity: Math.max(ev.total_seats, 1), sold: 0, sale_start: null, sale_end: null },
          { event_id: ev._id, name: 'VIP', price: Math.round((ev.price || 0) * 1.6), quantity: Math.max(Math.round(ev.total_seats * 0.2), 5), sold: 0, sale_start: null, sale_end: null }
        );
      });
      await tts.insertMany(inserts);
    }

    // ---- DEMO BOOKINGS + REVIEWS (only for the seeded demo users) ----
    const bookings = db.collection('bookings');
    const reviews = db.collection('reviews');
    const payments = db.collection('payments');
    const tickets = db.collection('digital_tickets');
    if ((await bookings.countDocuments({})) === 0) {
      const user = await users.findOne({});
      const sample = eventDocs.slice(0, 4);
      for (let i = 0; i < sample.length; i++) {
        const ev = sample[i];
        const qty = 1 + (i % 2);
        const amt = (ev.price || 199) * qty;
        const code = 'FHB' + Math.floor(100000 + Math.random() * 900000);
        const bk = await bookings.insertOne({
          booking_id: code, user_id: user._id, event_id: ev._id, organizer_id: org._id,
          ticket_type: 'General', quantity: qty, unit_price: ev.price || 199,
          taxes: 0, fees: 0, total_amount: amt, payment_status: 'Paid',
          booking_status: i < 3 ? 'Confirmed' : 'Cancelled', booked_at: new Date(Date.now() - (1000 * 60 * 60 * 24 * (i + 3))),
        });
        await payments.insertOne({ booking_id: bk.insertedId, user_id: user._id, event_id: ev._id, amount: amt, currency: 'INR', status: 'Paid', method: 'test', created_at: new Date() });
        await tickets.insertOne({ ticket_number: 'TKT-' + code, booking_id: bk.insertedId, user_id: user._id, event_id: ev._id, qr_payload: 'FHB:' + code + ':' + ev._id.toString(), status: 'Active', created_at: new Date() });
        if (i === 0) {
          await reviews.insertOne({ user_id: user._id, event_id: ev._id, rating: 5, text: 'Amazing experience, highly recommended!', status: 'Approved', created_at: new Date() });
        }
      }
    }
  }
}

module.exports = { seedIfEmpty, ensureCategories, CATEGORY_NAMES };