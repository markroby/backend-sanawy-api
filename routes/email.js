const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/emailController');
const { ensureAuth, ensureRole } = require('../middleware/auth');

router.post('/idcard', ensureAuth, ensureRole(['creator','admin']), ctrl.sendIdCard);

module.exports = router;
