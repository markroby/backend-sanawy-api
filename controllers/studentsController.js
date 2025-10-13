// controllers/studentsController.js
const Student = require('../models/student_data');

// helper لتقليل try/catch
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// POST /students
exports.createStudent = asyncHandler(async (req, res) => {
  const {
    student_name,
    student_number,
    student_mail,
    student_location,
    student_level,
    user_name,
    status
  } = req.body;

  const doc = await Student.create({
    student_name,
    student_number,
    student_mail,
    student_location,
    student_level,
    user_name,
    status,
    isdeleted: "0",
  });

  res.status(201).json({ ok: true, student: doc });
});

// GET /students
exports.getAllStudents = asyncHandler(async (req, res) => {
  const filter = { isdeleted: { $ne: "1" } };
  const students = await Student.find(filter).sort({ student_name: 1 });
  res.json({ ok: true, count: students.length, students });
});

// GET /students/:id
exports.getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student || student.isdeleted === "1") {
    return res.status(404).json({ ok: false, error: 'Student not found' });
  }
  res.json({ ok: true, student });
});

// GET /students/by-number/:student_number
exports.getByNumber = asyncHandler(async (req, res) => {
  const s = await Student.findOne({ student_number: req.params.student_number, isdeleted: { $ne: "1" } });
  if (!s) return res.status(404).json({ ok: false, error: 'Student not found' });
  res.json({ ok: true, student: s });
});

// PATCH /students/:id
exports.updateStudent = asyncHandler(async (req, res) => {
  const updated = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ ok: false, error: 'Student not found' });
  res.json({ ok: true, student: updated });
});

// DELETE /students/:id (soft delete)
exports.deleteStudent = asyncHandler(async (req, res) => {
  const updated = await Student.findByIdAndUpdate(req.params.id, { isdeleted: "1" }, { new: true });
  if (!updated) return res.status(404).json({ ok: false, error: 'Student not found' });
  res.json({ ok: true, student: updated });
});

// POST /students/send-id  (stub)
exports.sendIdCard = asyncHandler(async (req, res) => {
  res.json({ ok: true, note: 'sendIdCard is not implemented yet' });
});
