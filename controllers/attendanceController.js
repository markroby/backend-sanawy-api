// controllers/attendanceController.js
const Student = require('../models/student_data');
const Log = require('../models/log_student');
const Points = require('../models/points_value');
const moment = require('moment-timezone');

// ===== Helpers =====
const onlyDigits = (v = '') => String(v).replace(/\D+/g, '');
const trimLeadingZeros = (v = '') => v.replace(/^0+/, '');
const stripCountryCode = (digs = '') => {
  if (digs.startsWith('0020')) return digs.slice(4);
  if (digs.startsWith('20'))   return digs.slice(2);
  return digs;
};
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const asStr = (v) => String(v);

// allow both 0 and "0" or missing
const activeFilterOr = [
  { isdeleted: { $exists: false } },
  { isdeleted: 0 },
  { isdeleted: "0" }
];

// Load points config from points_value (active)
async function loadPointsConfig() {
  let cfg = await Points.findOne({ status: { $in: [1, "1"] }, isdeleted: { $in: [0, "0"] } }).sort({ updatedAt: -1 });
  if (!cfg) {
    return { attendance: 5, with_bible: 10, from_church: 5, without_bible: 0 };
  }
  return {
    attendance: Number(cfg.attendance_points ?? 5) || 5,
    with_bible: Number(cfg.student_bible ?? 10) || 10,
    from_church: Number(cfg.student_bible_church ?? 5) || 5,
    without_bible: Number(cfg.student_without_bible ?? 0) || 0
  };
}

// ===== Controllers =====

// POST /api/attendance
// body: { attendance_code: <phone>, bible_status: "with_bible"|"from_church"|"without_bible" }
exports.markAttendance = async (req, res) => {
  try {
    const { attendance_code, bible_status } = req.body || {};

    if (!attendance_code) {
      return res.status(400).json({ ok: false, error: 'attendance_code (student phone) is required' });
    }
    if (!['with_bible', 'from_church', 'without_bible'].includes(String(bible_status))) {
      return res.status(400).json({ ok: false, error: 'bible_status must be one of with_bible | from_church | without_bible' });
    }

    // Normalize phone
    const raw   = String(attendance_code).trim();
    const digs0 = onlyDigits(raw);
    const digs1 = stripCountryCode(digs0);
    const no0   = trimLeadingZeros(digs1);
    const with0 = no0.startsWith('0') ? no0 : ('0' + no0);

    const strCands = Array.from(new Set([raw, digs0, digs1, no0, with0].filter(Boolean)));
    const numCands = strCands.map(toNum).filter(n => n !== null);

    // ---- CRITICAL CHANGE: use native collection (no Mongoose casting) ----
    // Query both string and number variants for student_number and (optionally) student_phone
    const baseOr = [
      ...strCands.map(v => ({ student_number: v })),
      ...numCands.map(n => ({ student_number: n })),
      ...strCands.map(v => ({ student_phone: v })),
      ...numCands.map(n => ({ student_phone: n }))
    ];

    let student = await Student.collection.findOne({
      $and: [
        { $or: activeFilterOr },
        { $or: baseOr }
      ]
    });

    // Regex fallback on last 7 digits
    if (!student && no0) {
      const tail = no0.slice(-7);
      student = await Student.collection.findOne({
        $and: [
          { $or: activeFilterOr },
          {
            $or: [
              { student_number: { $regex: tail + '$' } },
              { student_phone:   { $regex: tail + '$' } },
            ]
          }
        ]
      });
    }

    if (!student) {
      if (String(req.query.debug) === '1') {
        const near = await Student.collection.find({
          $and: [
            { $or: activeFilterOr },
            {
              $or: [
                { student_number: { $regex: (no0 || digs1 || digs0) } },
                { student_phone:  { $regex: (no0 || digs1 || digs0) } }
              ]
            }
          ]
        }).limit(10).toArray();
        return res.status(404).json({
          ok: false,
          error: 'Student not found',
          tried: { raw, digs0, digs1, no0, with0, strCands, numCands },
          nearMatchesCount: near.length,
          nearMatches: near.map(x => ({
            _id: x._id,
            student_name: x.student_name,
            student_number: x.student_number,
            student_phone: x.student_phone,
            isdeleted: x.isdeleted
          }))
        });
      }
      return res.status(404).json({ ok: false, error: 'Student not found' });
    }

    // Points
    const cfg = await loadPointsConfig();
    const attendancePoints = cfg.attendance;

    let bible = 0, bibleChurch = 0, without = 0;
    if (bible_status === 'with_bible')       bible = cfg.with_bible;
    if (bible_status === 'from_church')      bibleChurch = cfg.from_church;
    if (bible_status === 'without_bible')    without = cfg.without_bible;

    const dateStr = moment().format('YYYY-MM-DD');

    // Save log (strings for compatibility)
    const log = new Log({
      student_name:          student.student_name,
      student_number:        String(student.student_number),
      student_attendance:    String(attendancePoints),
      student_bible:         String(bible),
      student_bible_church:  String(bibleChurch),
      student_without_bible: String(without),
      student_quiz:          "",
      student_Task:          "",
      student_Friend:        "",
      student_bonus:         "",
      student_date:          dateStr
    });

    await log.save();
    return res.json({ ok: true, log });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
  }
};

// GET /api/attendance
exports.getAttendance = async (req, res) => {
  try {
    const { date, student_number, limit } = req.query;
    const q = {};
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) q.student_date = date;
    if (student_number) q.student_number = String(student_number);
    const lim = Math.min(Number(limit) || 200, 1000);
    const records = await Log.find(q).sort({ createdAt: -1 }).limit(lim);
    return res.json({ ok: true, count: records.length, records });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
  }
};
