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
router.get('/', ensureAuth, ctrl.getAllStudents);
router.get('/by-number/:student_number', ensureAuth, ctrl.getByNumber);
router.get('/:id', ensureAuth, ctrl.getStudentById);
router.post('/', ensureAuth, ensureRole(['creator', 'admin']), ctrl.createStudent);
router.patch('/:id', ensureAuth, ensureRole(['creator', 'admin']), ctrl.updateStudent);
router.delete('/:id', ensureAuth, ensureRole(['creator', 'admin']), ctrl.deleteStudent);

router.post('/send-id',
  ensureAuth,
  ensureRole(['creator', 'admin']),
  upload.single('idcard'),
  ctrl.sendIdCard
);

module.exports = router;
