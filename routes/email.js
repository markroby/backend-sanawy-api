// routes/email.js
const express = require('express');
const router = express.Router();
const { sendIdCard, previewIdCard } = require('../controllers/emailController');
const { ensureAuth, ensureRole } = require('../middleware/auth');

// Preview card (no auth if you want; here we protect)
router.get('/idcard/preview', ensureAuth, ensureRole(['creator','admin']), previewIdCard);

// Generate & send email
router.post('/idcard', ensureAuth, ensureRole(['creator','admin']), sendIdCard);

module.exports = router;
