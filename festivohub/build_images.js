require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { connectToDatabase } = require('./api/db');

const CACHE_DIR = path.join(__dirname, 'public', 'images', 'cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });
const WIDTHS = [200, 320, 640, 960, 1400, 1600];
const ACCEPT = 'image/avif,image/webp,image/jpeg';

function hash(base, w) {
  return crypto.createHash('md5').update(base + '|' + w).digest('hex').toLowerCase();
}

function exists(key) {
  return ['avif', 'webp', 'jpg', 'png'].some((ext) => fs.existsSync(path.join(CACHE_DIR, key + '.' + ext)));
}

async function download(base, w) {
  const key = hash(base, w);
  if (exists(key)) return [null, 0];
  const up = new URL(base);
  up.searchParams.set('w', String(w));
  up.searchParams.set('fit', 'crop');
  up.searchParams.set('q', '70');
  up.searchParams.set('auto', 'format');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(up.toString(), { headers: { accept: ACCEPT }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) return [null, 0];
      const ct = (r.headers.get('content-type') || '').split(';')[0];
      const ext = ct === 'image/avif' ? 'avif' : ct === 'image/webp' ? 'webp' : ct === 'image/png' ? 'png' : 'jpg';
      const buf = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(path.join(CACHE_DIR, key + '.' + ext), buf);
      return [ext, buf.length];
    } catch (e) {
      if (attempt === 1) return [null, 0];
    }
  }
  return [null, 0];
}

(async () => {
  const { db } = await connectToDatabase();
  const events = await db.collection('events').find({}).toArray();
  const urls = [];
  events.forEach((e) => {
    const u = e.image || (e.images && e.images[0]);
    if (u && /^https?:\/\//.test(u) && urls.indexOf(u) < 0) urls.push(u);
  });
  urls.push('https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3'); // hero
  urls.push('https://images.unsplash.com/photo-1540575467063-178a50c2df87'); // fallback/detail

  let files = 0, bytes = 0, failed = 0;
  for (const u of urls) {
    const base = u.split('?')[0];
    for (const w of WIDTHS) {
      const [ext, len] = await download(base, w);
      if (ext) { files++; bytes += len; }
      else if (!exists(hash(base, w))) failed++;
    }
  }
  console.log('Cached ' + files + ' files, ' + (bytes / 1048576).toFixed(1) + ' MB, ' + failed + ' failures, sources ' + urls.length);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });