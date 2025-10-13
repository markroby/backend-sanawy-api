const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  student_name: String,
  student_number: String,
  student_attendance: { type: Number, default: 0 },
  student_quiz: { type: Number, default: 0 },
  student_bible: { type: Number, default: 0 },
  student_bible_church: { type: Number, default: 0 },
  student_without_bible: { type: Number, default: 0 },
  student_Task: { type: Number, default: 0 },
  student_Friend: { type: Number, default: 0 },
  student_bonus: { type: Number, default: 0 },
  student_date: { type: String } // YYYY-MM-DD
}, { timestamps: true });

module.exports = mongoose.model('LogStudent', LogSchema, 'log_student');
