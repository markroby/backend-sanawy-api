// routes/attendance.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');
const { ensureAuth, ensureRole } = require('../middleware/auth');

/**
 * @openapi
 * tags:
 *   - name: Attendance
 *     description: Attendance management
 */
/**
 * @openapi
 * /api/attendance:
 *   post:
 *     tags: [Attendance]
 *     summary: Mark attendance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Attendance recorded
 */
router.post('/', ensureAuth, ensureRole(['creator','admin']), ctrl.markAttendance);

/**
 * @openapi
 * /api/attendance:
 *   get:
 *     tags: [Attendance]
 *     summary: Get attendance records
 *     responses:
 *       200:
 *         description: Attendance list
 */
router.get('/', ensureAuth, ensureRole(['creator','admin']), ctrl.getAttendance);

module.exports = router;
