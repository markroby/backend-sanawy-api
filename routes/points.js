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
router.get('/students', ctrl.searchStudents);
router.post('/students', ctrl.searchStudents);
router.post('/', ctrl.addPoints);

module.exports = router;
