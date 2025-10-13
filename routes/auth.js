// routes/auth.js
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/authController');

// تشخيص سريع يطبع الدوال المتاحة
if (!ctrl || typeof ctrl !== 'object') {
  console.error('❌ authController require returned:', ctrl);
}
console.log('✅ Loaded auth controller keys:', Object.keys(ctrl || {}));

// تأكد إن هذه الدوال موجودة
['login', 'logout', 'me'].forEach((k) => {
  if (typeof ctrl[k] !== 'function') {
    console.error(`❌ Missing controller function: ${k} (got: ${typeof ctrl[k]})`);
  }
});

// Routes
router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', ctrl.me);

module.exports = router;
