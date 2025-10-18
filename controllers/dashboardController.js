// controllers/dashboardController.js
const Student = require('../models/student_data');
const Log = require('../models/log_student');

/* -------------------- Helpers -------------------- */

const activeStudentMatch = {
  $or: [
    { isdeleted: { $exists: false } },
    { isdeleted: 0 },
    { isdeleted: "0" }
  ]
};

// student_date is a YYYY-MM-DD STRING in your DB.
const toDateMatch = (from, to) => {
  const cond = {};
  if (from) cond.$gte = from;
  if (to)   cond.$lte = to;
  return Object.keys(cond).length ? { student_date: cond } : {};
};

// Normalize numeric-like strings
const addTotalFieldsStage = {
  $addFields: {
    _attendance:    { $convert: { input: "$student_attendance",    to: "int", onError: 0, onNull: 0 } },
    _bible_church:  { $convert: { input: "$student_bible_church",  to: "int", onError: 0, onNull: 0 } },
    _bible:         { $convert: { input: "$student_bible",         to: "int", onError: 0, onNull: 0 } },
    _without_bible: { $convert: { input: "$student_without_bible", to: "int", onError: 0, onNull: 0 } },
    _task:          { $convert: { input: "$student_Task",          to: "int", onError: 0, onNull: 0 } },
    _friend:        { $convert: { input: "$student_Friend",        to: "int", onError: 0, onNull: 0 } },
    _contest:       { $convert: { input: "$student_bonus",         to: "int", onError: 0, onNull: 0 } },
    _quiz:          { $convert: { input: "$student_quiz",          to: "int", onError: 0, onNull: 0 } }
  }
};

const addTotalSumStage = {
  $addFields: {
    _total: {
      $add: [
        "$_attendance","$_bible_church","$_bible","$_without_bible",
        "$_task","$_friend","$_contest","$_quiz"
      ]
    }
  }
};

// Lookup student level/name by student_number (handles string/number)
function levelLookupStages() {
  return [
    {
      $lookup: {
        from: 'student_data',
        let: { sid: { $toString: "$_id" } },
        pipeline: [
          {
            $match: {
              $and: [
                activeStudentMatch,
                { $expr: { $eq: [ { $toString: "$student_number" }, "$$sid" ] } }
              ]
            }
          },
          { $project: { student_level: 1, student_name: 1 } }
        ],
        as: 'studentDoc'
      }
    },
    {
      $addFields: {
        student_level: { $ifNull: [ { $arrayElemAt: ["$studentDoc.student_level", 0] }, null ] },
        student_name: {
          $cond: [
            { $and: [ { $ne: ["$student_name", null] }, { $ne: ["$student_name", ""] } ] },
            "$student_name",
            { $ifNull: [ { $arrayElemAt: ["$studentDoc.student_name", 0] }, "" ] }
          ]
        }
      }
    }
  ];
}

// Timeseries bucket key using real dates (robust across Mongo versions)
function makeTimeseriesProjectKey(granularity) {
  const parsedDate = { $dateFromString: { dateString: "$student_date", format: "%Y-%m-%d" } };

  if (granularity === 'month') {
    return { $dateToString: { format: "%Y-%m", date: parsedDate } };
  }
  if (granularity === 'week') {
    // ISO week label "YYYY-W##"
    return {
      $concat: [
        { $toString: { $isoWeekYear: parsedDate } },
        "-W",
        {
          $let: {
            vars: { wk: { $isoWeek: parsedDate } },
            in: {
              $cond: [
                { $lt: ["$$wk", 10] },
                { $concat: [ "0", { $toString: "$$wk" } ] },
                { $toString: "$$wk" }
              ]
            }
          }
        }
      ]
    };
  }
  // default day
  return { $dateToString: { format: "%Y-%m-%d", date: parsedDate } };
}

/* -------------------- SUMMARY -------------------- */
exports.getSummary = async (req, res) => {
  try {
    const { from, to } = req.query;

    const [totalStudents, activeStudents, withEmail, logsCount, lastLog] = await Promise.all([
      Student.countDocuments({}),
      Student.countDocuments(activeStudentMatch),
      Student.countDocuments({ ...activeStudentMatch, student_mail: { $exists: true, $ne: "" } }),
      Log.countDocuments({ ...toDateMatch(from, to) }),
      Log.findOne({}, { student_date: 1 }).sort({ student_date: -1 })
    ]);

    const byLevel = await Student.aggregate([
      { $match: activeStudentMatch },
      { $group: { _id: "$student_level", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } }
    ]);

    res.json({
      ok: true,
      cards: {
        totalStudents,
        activeStudents,
        withEmail,
        logsThisPeriod: logsCount,
        lastLogDate: lastLog?.student_date || null
      },
      byLevel
    });
  } catch (err) {
    console.error('dashboard summary error:', err);
    res.status(500).json({ ok:false, error: err.message || 'Internal Server Error' });
  }
};

/* -------------------- LEADERBOARD -------------------- */
// GET /api/dashboard/points/leaderboard?limit=10&level=1s&from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 10, level, from, to } = req.query;
    const lim = Math.max(1, Math.min(100, Number(limit) || 10));

    const pipeline = [
      { $match: toDateMatch(from, to) },
      addTotalFieldsStage,
      addTotalSumStage,
      {
        $group: {
          _id: "$student_number",
          student_name: { $first: "$student_name" },
          total: { $sum: "$_total" },
          attendance:    { $sum: "$_attendance" },
          bible_church:  { $sum: "$_bible_church" },
          bible:         { $sum: "$_bible" },
          without_bible: { $sum: "$_without_bible" },
          task:          { $sum: "$_task" },
          friend:        { $sum: "$_friend" },
          contest:       { $sum: "$_contest" },
          quiz:          { $sum: "$_quiz" }
        }
      },
      ...levelLookupStages()
    ];

    if (level) pipeline.push({ $match: { student_level: level } });

    pipeline.push(
      { $sort: { total: -1, student_name: 1 } },
      { $limit: lim },
      {
        $project: {
          _id: 0,
          student_number: "$_id",
          student_name: 1,
          student_level: 1,
          total: 1,
          attendance: 1, bible_church: 1, bible: 1, without_bible: 1,
          task: 1, friend: 1, contest: 1, quiz: 1
        }
      }
    );

    const results = await Log.aggregate(pipeline);
    res.json({ ok:true, level: level || null, from: from || null, to: to || null, count: results.length, results });
  } catch (err) {
    console.error('leaderboard error:', err);
    res.status(500).json({ ok:false, error: err.message || 'Internal Server Error' });
  }
};

/* -------------------- POINTS TIMESERIES -------------------- */
// GET /api/dashboard/points/timeseries?granularity=day|week|month&from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getPointsTimeseries = async (req, res) => {
  try {
    const { granularity = 'day', from, to } = req.query;

    const bucketExpr = makeTimeseriesProjectKey(granularity);

    const pipe = [
      { $match: toDateMatch(from, to) },
      addTotalFieldsStage,
      addTotalSumStage,
      { $project: { bucket: bucketExpr, total: "$_total" } },
      { $group: { _id: "$bucket", value: { $sum: "$total" } } },
      { $sort: { _id: 1 } }
    ];

    const rows = await Log.aggregate(pipe);
    res.json({
      ok: true,
      granularity,
      from: from || null,
      to: to || null,
      points: rows.map(r => ({ bucket: r._id, value: r.value }))
    });
  } catch (err) {
    console.error('points timeseries error:', err);
    res.status(500).json({ ok:false, error: err.message || 'Internal Server Error' });
  }
};

/* -------------------- ATTENDANCE TIMESERIES -------------------- */
// GET /api/dashboard/attendance/timeseries?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getAttendanceTimeseries = async (req, res) => {
  try {
    const { from, to } = req.query;

    const pipe = [
      { $match: toDateMatch(from, to) },
      {
        $addFields: {
          _attendance: { $convert: { input: "$student_attendance", to: "int", onError: 0, onNull: 0 } }
        }
      },
      { $project: { bucket: "$student_date", value: "$_attendance" } },
      { $group: { _id: "$bucket", value: { $sum: "$value" } } },
      { $sort: { _id: 1 } }
    ];

    const rows = await Log.aggregate(pipe);
    res.json({
      ok: true,
      from: from || null,
      to: to || null,
      attendance: rows.map(r => ({ bucket: r._id, value: r.value }))
    });
  } catch (err) {
    console.error('attendance timeseries error:', err);
    res.status(500).json({ ok:false, error: err.message || 'Internal Server Error' });
  }
};

/* -------------------- LEVELS BREAKDOWN -------------------- */
// GET /api/dashboard/levels?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getLevels = async (req, res) => {
  try {
    const { from, to } = req.query;

    // active students per level
    const studentsByLevel = await Student.aggregate([
      { $match: activeStudentMatch },
      { $group: { _id: "$student_level", students: { $sum: 1 } } }
    ]);

    // total points per level in (optional) date window
    const pointsByLevel = await Log.aggregate([
      { $match: toDateMatch(from, to) },
      addTotalFieldsStage,
      addTotalSumStage,
      {
        $group: {
          _id: "$student_number",
          student_name: { $first: "$student_name" },
          total: { $sum: "$_total" }
        }
      },
      ...levelLookupStages(),
      { $group: { _id: "$student_level", points: { $sum: "$total" } } }
    ]);

    // merge
    const map = new Map();
    studentsByLevel.forEach(r => map.set(r._id || null, { level: r._id || null, students: r.students, points: 0 }));
    pointsByLevel.forEach(r => {
      const k = r._id || null;
      if (!map.has(k)) map.set(k, { level: k, students: 0, points: r.points });
      else map.get(k).points = r.points;
    });

    const results = Array.from(map.values()).sort(
      (a, b) => (b.points - a.points) || ((a.level || '').localeCompare(b.level || ''))
    );

    res.json({ ok:true, from: from || null, to: to || null, count: results.length, results });
  } catch (err) {
    console.error('levels breakdown error:', err);
    res.status(500).json({ ok:false, error: err.message || 'Internal Server Error' });
  }
};

/* -------------------- RECENT LOGS -------------------- */
// GET /api/dashboard/recent-logs?limit=20
exports.getRecentLogs = async (req, res) => {
  try {
    const lim = Math.max(1, Math.min(200, Number(req.query.limit) || 20));
    const rows = await Log.find({}, {
      student_name: 1,
      student_number: 1,
      student_date: 1,
      student_attendance: 1,
      student_bible_church: 1,
      student_bible: 1,
      student_without_bible: 1,
      student_Task: 1,
      student_Friend: 1,
      student_bonus: 1,
      student_quiz: 1
    })
      .sort({ student_date: -1, _id: -1 })
      .limit(lim)
      .lean();

    res.json({ ok:true, count: rows.length, results: rows });
  } catch (err) {
    console.error('recent logs error:', err);
    res.status(500).json({ ok:false, error: err.message || 'Internal Server Error' });
  }
};
