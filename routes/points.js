// routes/points.js
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/pointsController');
let ensureAuth, ensureRole;
try {
  ({ ensureAuth, ensureRole } = require('../middleware/auth'));
} catch (e) {
  // ignore load error for now
}

console.log('✅ pointsController keys:', ctrl && Object.keys(ctrl));
console.log('✅ ensureAuth type:', typeof ensureAuth);
console.log('✅ ensureRole type:', typeof ensureRole);

// TEMP: no middleware to isolate issue
/**
 * @openapi
 * tags:
 *   - name: Points
 *     description: Points awarding and queries
 */
/**
 * @openapi
 * /api/points/students:
 *   get:
 *     tags: [Points]
 *     summary: Search students (GET)
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/students', ctrl.searchStudents);

/**
 * @openapi
 * /api/points/students:
 *   post:
 *     tags: [Points]
 *     summary: Search students (POST)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Search results
 */
router.post('/students', ctrl.searchStudents);

/**
 * @openapi
 * /api/points:
 *   post:
 *     tags: [Points]
 *     summary: Add points to a student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Points added
 */
router.post('/', ctrl.addPoints);

module.exports = router;
