// routes/rankings.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rankingsController');
const { ensureAuth, ensureRole } = require('../middleware/auth');

// Podium (top 3 overall, includes ties for 3rd)
router.get('/top3', ensureAuth, ensureRole(['creator','admin','student']), ctrl.getTop3);

/**
 * @openapi
 * tags:
 *   - name: Rankings
 *     description: Leaderboards and rankings
 */
/**
 * @openapi
 * /api/rankings/top3:
 *   get:
 *     tags: [Rankings]
 *     summary: Get top 3 students
 *     responses:
 *       200:
 *         description: Top 3 list
 */

// Full rankings (high -> low). Optional: ?level=1s
router.get('/', ensureAuth, ensureRole(['creator','admin','student']), ctrl.getRankings);

/**
 * @openapi
 * /api/rankings:
 *   get:
 *     tags: [Rankings]
 *     summary: Get full rankings
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rankings
 */

module.exports = router;
