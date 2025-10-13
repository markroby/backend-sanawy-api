// models/student_data.js
const mongoose = require('mongoose');
const StudentSchema = new mongoose.Schema({
  student_name:     { type: String, required: true },
  student_number:   { type: mongoose.Schema.Types.Mixed, required: true, unique: true },
  student_mail:     { type: String },
  student_location: { type: String },
  student_level:    { type: String },
  user_name:        { type: String },
  isdeleted:        { type: mongoose.Schema.Types.Mixed, default: 0 },
  status:           { type: mongoose.Schema.Types.Mixed, default: 0 }
}, { timestamps: true, collection: 'student_data' });
module.exports = mongoose.model('StudentData', StudentSchema, 'student_data');
