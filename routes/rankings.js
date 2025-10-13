// routes/rankings.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rankingsController');
const { ensureAuth, ensureRole } = require('../middleware/auth');

// Podium (top 3 overall, includes ties for 3rd)
router.get('/top3', ensureAuth, ensureRole(['creator','admin']), ctrl.getTop3);

// Full rankings (high -> low). Optional: ?level=1s
router.get('/', ensureAuth, ensureRole(['creator','admin']), ctrl.getRankings);

module.exports = router;
