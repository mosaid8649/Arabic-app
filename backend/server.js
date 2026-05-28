require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { initDb } = require('./src/models/db');
const { errorHandler, notFound } = require('./src/middleware');

const uploadRoutes = require('./src/routes/upload');
const wordRoutes = require('./src/routes/words');
const lessonRoutes = require('./src/routes/lessons');
const practiceRoutes = require('./src/routes/practice');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

app.use('/api/upload', uploadRoutes);
app.use('/api/words', wordRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/practice', practiceRoutes);


// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  if (require('fs').existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendDist, 'index.html'));
      }
    });
    console.log('📦 Serving frontend from:', frontendDist);
  }
}

app.use(notFound);
app.use(errorHandler);

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`\n🚀 Arabic Learning API running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV}`);
    console.log(`🗄️  Database: ${process.env.DB_PATH || './data/arabic_vocab.db'}\n`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
