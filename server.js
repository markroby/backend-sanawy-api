// server.js
// ✅ Works on both: local dev (node server.js) and Vercel (serverless)

// 1) Must be before any bwip-js imports:
process.env.BWIPJS_CANVAS = '@napi-rs/canvas';

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// ---- CORS (reads comma-separated ALLOWED_ORIGINS) ----
const allowed = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    if (!origin || allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('CORS not allowed: ' + origin), false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- MongoDB (lazy connect so serverless doesn’t crash) ----
const mongoose = require('mongoose');
let isConnected = 0;
async function dbConnect() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);
  isConnected = 1;
}
app.use(async (_req, _res, next) => {
  try { await dbConnect(); next(); } catch (e) { next(e); }
});

// ---- Static (uploads) ----
// On Vercel, filesystem is ephemeral, but serving existing files is fine.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- Health check ----
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// ---- Your routes ----
// If you previously had: app.use('/api/auth', require('./routes/auth'))     etc.
// KEEP them as they are. Example:
try {
  // Only require routes if they exist in your project
  const authRoutes = require('./routes/auth');            // adjust to your project
  const attendanceRoutes = require('./routes/attendance');
  const dashboardRoutes = require('./routes/dashboard');
  const emailRoutes = require('./routes/email');
  const pointsRoutes = require('./routes/points');

  app.use('/api/auth', authRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/email', emailRoutes);
  app.use('/api/points', pointsRoutes);
} catch (e) {
  // If your routes live at a different path (e.g., ./models, ./utils), keep your original requires instead.
  // This try/catch prevents crashes if filenames differ; edit to match your repo.
  console.warn('Route attach warning:', e.message);
}

// ---- Error handler (helps surface serverless crashes) ----
app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 6060;
if (process.env.VERCEL) {
  // Export for serverless
  module.exports = app;
} else {
  // Local dev
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
