// models/points_value.js
const mongoose = require('mongoose');

const PointsSchema = new mongoose.Schema({
  student_quiz:         { type: String, default: "0" },
  student_bible:        { type: String, default: "0" },
  student_bible_church: { type: String, default: "0" },
  student_without_bible:{ type: String, default: "0" },
  student_Task:         { type: String, default: "0" },
  student_Friend:       { type: String, default: "0" },
  student_bonus:        { type: String, default: "0" },
  attendance_points:    { type: String, default: "0" },
  status:               { type: String, default: "1" }, // 1 = active
  Date_points:          { type: String, default: "" },
  user_name:            { type: String, default: "" },
  isdeleted:            { type: String, default: "0" },
  date_delete:          { type: String, default: "" }
}, { timestamps: true, collection: 'points_value' });

module.exports = mongoose.model('PointsValue', PointsSchema, 'points_value');
