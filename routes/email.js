// routes/email.js
const express = require('express');
const router = express.Router();
const { sendIdCard, previewIdCard } = require('../controllers/emailController');
const { ensureAuth, ensureRole } = require('../middleware/auth');

// Preview card (no auth if you want; here we protect)
/**
 * @openapi
 * tags:
 *   - name: Email
 *     description: Email utilities
 */
/**
 * @openapi
 * /api/email/idcard/preview:
 *   get:
 *     tags: [Email]
 *     summary: Preview ID card email
 *     responses:
 *       200:
 *         description: Preview HTML
 */
router.get('/idcard/preview', ensureAuth, ensureRole(['creator','admin']), previewIdCard);

// Generate & send email
/**
 * @openapi
 * /api/email/idcard:
 *   post:
 *     tags: [Email]
 *     summary: Send ID card email
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Email sent
 */
router.post('/idcard', ensureAuth, ensureRole(['creator','admin']), sendIdCard);

module.exports = router;
