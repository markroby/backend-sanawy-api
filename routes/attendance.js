// routes/attendance.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');
const { ensureAuth, ensureRole } = require('../middleware/auth');

router.post('/', ensureAuth, ensureRole(['creator','admin']), ctrl.markAttendance);
router.get('/', ensureAuth, ensureRole(['creator','admin']), ctrl.getAttendance);

module.exports = router;
