// server.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const PORT = process.env.PORT || 6060;

// If you deploy behind a proxy (nginx/render/heroku), leave this on:
app.set('trust proxy', 1);

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

console.log('CORS allowed origins:', allowed);

// helper: check if origin is localhost on any port
const isLocalhost = (origin) =>
  !!origin && (/^http:\/\/localhost(?::\d+)?$/i.test(origin) || /^http:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin));

const corsOptionsDelegate = (origin, cb) => {
  // allow tools with no Origin (curl/Postman/native apps)
  if (!origin) return cb(null, { origin: true, credentials: true });

  if (allowed.includes(origin) || isLocalhost(origin)) {
    return cb(null, {
      origin: true,
      credentials: true,
      methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
      allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Cookie'],
    });
  }

  // ⛔ Not allowed — DO NOT throw an Error (would become 500 on preflight)
  return cb(null, { origin: false });
};

app.use(cors(corsOptionsDelegate));

// Proper preflight handling with same policy
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && (allowed.includes(origin) || isLocalhost(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Cookie');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  return res.sendStatus(204);
});

// ---------- Sessions (cookie-based auth) ----------
/**
 * Local HTTP dev (same machine):
 *   sameSite: 'lax', secure: false
 *
 * Cross-site production over HTTPS (web app domain ≠ API domain):
 *   sameSite: 'none', secure: true  <-- API MUST be HTTPS then
 *
 * Switch via COOKIE_MODE env:
 *   COOKIE_MODE=dev                 -> lax / not secure
 *   COOKIE_MODE=cross-site-https    -> none / secure
 */
const isCrossSiteHttps = process.env.COOKIE_MODE === 'cross-site-https';

if (!process.env.SESSION_SECRET) {
  console.warn('⚠️ Missing SESSION_SECRET in .env (using dev default).');
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: isCrossSiteHttps ? 'none' : 'lax',
    secure: isCrossSiteHttps
  }
}));

// ---------- Routes ----------
try {
  const authRoutes = require('./routes/auth');
  const studentsRoutes = require('./routes/students');
  const attendanceRoutes = require('./routes/attendance');
  const pointsRoutes = require('./routes/points');
  const rankingsRoutes = require('./routes/rankings');
  const emailRoutes = require('./routes/email');
  const dashboardRoutes = require('./routes/dashboard');

  app.use('/api/auth', authRoutes);
  app.use('/api/students', studentsRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/points', pointsRoutes);
  app.use('/api/rankings', rankingsRoutes);
  app.use('/api/email', emailRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  console.log('✅ Routes mounted');
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
  if (origin && (allowed.includes(origin) || isLocalhost(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(500).json({ error: err.message || 'Server Error' });
});

// ---------- Start server ----------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
