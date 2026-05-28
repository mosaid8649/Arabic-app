require('dotenv').config();
const { initDb } = require('./db');
initDb().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
