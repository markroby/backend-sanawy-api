// controllers/pointsController.js
const Student = require('../models/student_data');
const Log = require('../models/log_student');
const Points = require('../models/points_value');
const moment = require('moment-timezone');

const onlyDigits = (v = '') => String(v).replace(/\D+/g, '');
const trimLeadingZeros = (v = '') => v.replace(/^0+/, '');
const stripCountry = (d = '') => (d.startsWith('0020') ? d.slice(4) : d.startsWith('20') ? d.slice(2) : d);
const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const asStr = (v) => String(v);

const activeFilterOr = [
  { isdeleted: { $exists: false } },
  { isdeleted: 0 },
  { isdeleted: "0" }
];

async function loadPointsConfig() {
  const cfg = await Points.findOne({ status: { $in: [1, "1"] }, isdeleted: { $in: [0, "0"] } }).sort({ updatedAt: -1 });
  if (!cfg) return { student_quiz: 15, student_Task: 10, student_Friend: 10, student_bonus: 5 };
  const n = (k, d=0) => (Number(cfg?.[k]) || d);
  return {
    student_quiz:   n('student_quiz', 15),
    student_Task:   n('student_Task', 10),
    student_Friend: n('student_Friend', 10),
    student_bonus:  n('student_bonus', 5)
  };
}

function normalizePhoneCandidates(query) {
  const raw   = String(query).trim();
  const digs0 = onlyDigits(raw);
  const digs1 = stripCountry(digs0);
  const no0   = trimLeadingZeros(digs1);
  const with0 = no0.startsWith('0') ? no0 : ('0' + no0);

  const strCands = Array.from(new Set([raw, digs0, digs1, no0, with0].filter(Boolean)));
  const numCands = strCands.map(toNum).filter(n => n !== null);
  return { raw, digs0, digs1, no0, with0, strCands, numCands };
}

async function findStudents(q) {
  const { raw, digs0, digs1, no0, with0, strCands, numCands } = normalizePhoneCandidates(q);
  const looksLikeName = /[a-zA-Z\u0600-\u06FF]/.test(raw);
  const nameRegex = looksLikeName ? new RegExp(raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

  const or = [
    ...strCands.map(v => ({ student_number: v })),
    ...numCands.map(n => ({ student_number: n })),
    ...(nameRegex ? [{ student_name: nameRegex }] : [])
  ];

  const students = await Student.collection.find({
    $and: [
      { $or: activeFilterOr },
      { $or: or }
    ]
  }).limit(20).toArray();

  return students;
}

exports.searchStudents = async (req, res) => {
  try {
    const query = (req.method === 'GET') ? req.query.query : req.body?.query;
    if (!query || !String(query).trim()) {
      return res.status(400).json({ ok:false, error:'query is required' });
    }
    const students = await findStudents(query);
    return res.json({
      ok: true,
      count: students.length,
      students: students.map(s => ({
        _id: s._id,
        student_name: s.student_name,
        student_number: s.student_number,
        student_level: s.student_level,
        isdeleted: s.isdeleted
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, error: err.message || 'Internal Server Error' });
  }
};

exports.addPoints = async (req, res) => {
  try {
    const { student_code, actions = {}, date } = req.body || {};
    if (!student_code) return res.status(400).json({ ok:false, error:'student_code is required (name or phone)' });

    const students = await findStudents(student_code);
    if (!students.length) return res.status(404).json({ ok:false, error:'Student not found' });
    const student = students[0];

    const cfg = await loadPointsConfig();

    const valOrDefault = (k, def) => {
      if (!actions || !actions[k] || !('value' in actions[k])) return def;
      const raw = actions[k].value;
      if (raw === '' || raw === null || raw === undefined) return def;
      const num = Number(raw);
      return Number.isFinite(num) ? num : def;
    };
    const on = (k) => actions?.[k]?.enabled === true;

    const row_quiz   = on('quiz')   ? valOrDefault('quiz',   cfg.student_quiz)    : 0;
    const row_task   = on('task')   ? valOrDefault('task',   cfg.student_Task)    : 0;
    const row_friend = on('friend') ? valOrDefault('friend', cfg.student_Friend)  : 0;
    const row_bonus  = on('bonus')  ? valOrDefault('bonus',  cfg.student_bonus)   : 0;

    const dateStr = (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) ? date : moment().format('YYYY-MM-DD');

    const log = new Log({
      student_name:   student.student_name,
      student_number: String(student.student_number),
      student_date:   dateStr,

      student_attendance:   "",
      student_bible:        "",
      student_bible_church: "",
      student_without_bible:"",

      student_quiz:   asStr(row_quiz),
      student_Task:   asStr(row_task),
      student_Friend: asStr(row_friend),
      student_bonus:  asStr(row_bonus)
    });

    await log.save();
    return res.json({ ok:true, log });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, error: err.message || 'Internal Server Error' });
  }
};
