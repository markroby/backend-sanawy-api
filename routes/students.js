// routes/students.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/studentsController');

// (اختياري) حراس وصول صورية
const ensureAuth = (req, res, next) => next();
const ensureRole = () => (req, res, next) => next();

// (اختياري) لرفع ملفات لو هتستعمله في send-id
let upload;
try {
  const multer = require('multer');
  upload = multer({ dest: 'uploads/' });
} catch {
  upload = { single: () => (req, res, next) => next() };
}

// فحص سريع يساعدك تكشف أي undefined قبل تشغيل السيرفر
[
  'createStudent',
  'getAllStudents',
  'getStudentById',
  'getByNumber',
  'updateStudent',
  'deleteStudent',
  'sendIdCard'
].forEach(name => {
  if (typeof ctrl[name] !== 'function') {
    console.error(`❌ Missing controller function: ${name}`);
  }
});

// routes
/**
 * @openapi
 * tags:
 *   - name: Students
 *     description: Student management
 */
/**
 * @openapi
 * /api/students:
 *   get:
 *     tags: [Students]
 *     summary: Get all students
 *     responses:
 *       200:
 *         description: List of students
 */
router.get('/', ensureAuth, ctrl.getAllStudents);

/**
 * @openapi
 * /api/students/by-number/{student_number}:
 *   get:
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: student_number
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student found by number
 */
router.get('/by-number/:student_number', ensureAuth, ctrl.getByNumber);

/**
 * @openapi
 * /api/students/{id}:
 *   get:
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student details
 */
router.get('/:id', ensureAuth, ctrl.getStudentById);

/**
 * @openapi
 * /api/students:
 *   post:
 *     tags: [Students]
 *     summary: Create a student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Student created
 */
router.post('/', ensureAuth, ensureRole(['creator', 'admin']), ctrl.createStudent);

/**
 * @openapi
 * /api/students/{id}:
 *   patch:
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student updated
 */
router.patch('/:id', ensureAuth, ensureRole(['creator', 'admin']), ctrl.updateStudent);

/**
 * @openapi
 * /api/students/{id}:
 *   delete:
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Student deleted
 */
router.delete('/:id', ensureAuth, ensureRole(['creator', 'admin']), ctrl.deleteStudent);

/**
 * @openapi
 * /api/students/send-id:
 *   post:
 *     tags: [Students]
 *     summary: Upload and send ID card
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               idcard:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: ID sent
 */
router.post('/send-id',
  ensureAuth,
  ensureRole(['creator', 'admin']),
  upload.single('idcard'),
  ctrl.sendIdCard
);

module.exports = router;
