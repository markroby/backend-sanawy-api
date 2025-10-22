// server.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 6060;

// ---------- Connect to Mongo ----------
(async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ Missing MONGODB_URI in .env');
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('MongoDB connect error:', err.message);
    process.exit(1);
  }
})();

// ---------- Middleware ----------
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- CORS ----------
const allowed = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true); // allow tools like Postman
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked for origin: ' + origin), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

// Preflight response
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  return res.sendStatus(204);
});

// ---------- Routes ----------
try {
  const authRoutes = require('./routes/auth');
  const studentsRoutes = require('./routes/students');
  const attendanceRoutes = require('./routes/attendance');
  const pointsRoutes = require('./routes/points');
  const rankingsRoutes = require('./routes/rankings');
  const emailRoutes = require('./routes/email');

  app.use('/api/auth', authRoutes);
  app.use('/api/students', studentsRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/points', pointsRoutes);
  app.use('/api/rankings', rankingsRoutes);
  app.use('/api/email', emailRoutes);
} catch (e) {
  console.warn('⚠️ Some route files missing:', e.message);
}

// Health check route
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ---------- 404 ----------
app.use((req, res) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// ---------- Error handler ----------
app.use((err, req, res, _next) => {
  console.error('❌ Error:', err.message);
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.status(500).json({ error: err.message || 'Server Error' });
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
