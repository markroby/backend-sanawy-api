require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const path = require('path');

const connectDB = require('./config/database');

// 🧩 ROUTES
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const pointsRoutes = require('./routes/points');
const rankingsRoutes = require('./routes/rankings');
const emailRoutes = require('./routes/email');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 6060;

connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🧩 CORS
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',');
app.use(cors({
  origin: function (origin, cb) {
    // Allow requests with no origin (e.g., Postman, mobile apps)
    if (!origin) return cb(null, true);
    if (allowed.indexOf(origin) !== -1) return cb(null, true);
    return cb(new Error('CORS policy blocked'), false);
  },
  credentials: true
}));

// 🧩 SESSION
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true }
}));

// 🧩 ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/stats', statsRoutes);

// 🧩 HEALTH CHECK
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

// 🧩 GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// 🧩 START SERVER
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
