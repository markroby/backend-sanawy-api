// routes/dashboard.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboardController');

// Try to load auth middleware; fall back to pass-through in dev
let ensureAuth, ensureRole;
try { ({ ensureAuth, ensureRole } = require('../middleware/auth')); } catch (_) {}
const pass = (_req,_res,next)=>next();
const needAuth = typeof ensureAuth === 'function' ? ensureAuth : pass;
const needRole = typeof ensureRole === 'function' ? ensureRole(['creator','admin']) : pass;

// Sanity check (no auth) — use to confirm router is mounted
router.get('/ping', (_req, res) => res.json({ ok: true, where: 'dashboard router' }));

// Summary cards
router.get('/summary', needAuth, needRole, ctrl.getSummary);

// Leaderboard (top N) — optional level/from/to
router.get('/points/leaderboard', needAuth, needRole, ctrl.getLeaderboard);

// Points time series (granularity=day|week|month) — optional from/to
router.get('/points/timeseries', needAuth, needRole, ctrl.getPointsTimeseries);

// Attendance time series — optional from/to
router.get('/attendance/timeseries', needAuth, needRole, ctrl.getAttendanceTimeseries);

// Levels breakdown (students + points by level) — optional from/to (applies to points)
router.get('/levels', needAuth, needRole, ctrl.getLevels);

// Recent logs feed
router.get('/recent-logs', needAuth, needRole, ctrl.getRecentLogs);

module.exports = router;
