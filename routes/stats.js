const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/statsController');
const { ensureAuth, ensureRole } = require('../middleware/auth');

router.get('/dashboard', ensureAuth, ensureRole(['creator','admin','user']), ctrl.dashboard);

module.exports = router;
