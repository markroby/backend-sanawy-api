const Student = require('../models/student_data');
const Log = require('../models/log_student');

exports.dashboard = async (req, res) => {
  const totalStudents = await Student.countDocuments({ isdeleted: "0" });
  const totalLogs = await Log.countDocuments();
  // top 5 students by aggregation
  const top = await Log.aggregate([
    { $group: { _id: '$student_number', student_name: { $first: '$student_name' }, totalPoints: { $sum: { $add: [
      '$student_attendance','$student_quiz','$student_bible','$student_bible_church',
      '$student_without_bible','$student_Task','$student_Friend','$student_bonus'
    ]}}}},
    { $sort: { totalPoints: -1 }},
    { $limit: 5 }
  ]);
  res.json({ totalStudents, totalLogs, top });
};
