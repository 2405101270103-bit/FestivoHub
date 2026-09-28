require('dotenv').config();
const app = require('./api/index');
const { seedIfEmpty } = require('./api/seed');
const config = require('./config');

const port = process.env.PORT || config.port;

(async () => {
  try {
    await seedIfEmpty();
    console.log('Database seed complete.');
  } catch (e) {
    console.error('Seed warning:', e.message);
  }
  app.listen(port, () => {
    console.log('FestivoHub running on http://localhost:' + port);
  });
})();
