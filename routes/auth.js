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

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 */
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with credentials
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in
 */
router.post('/login', ctrl.login);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current session
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', ctrl.logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     responses:
 *       200:
 *         description: Current user info
 */
router.get('/me', ctrl.me);

module.exports = router;
