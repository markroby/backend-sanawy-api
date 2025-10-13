// controllers/rankingsController.js
const Log = require('../models/log_student');      // collection: log_student
const Student = require('../models/student_data'); // collection: student_data

// normal (non-$expr) filter for active students
const activeStudentMatch = {
  $or: [
    { isdeleted: { $exists: false } },
    { isdeleted: 0 },
    { isdeleted: "0" }
  ]
};

// common aggregation, optional filter by level
function buildPipeline({ level = null } = {}) {
  const pipeline = [
    // 1) Sum all point categories per student_number
    {
      $group: {
        _id: "$student_number",
        student_name: { $first: "$student_name" },
        attendance:     { $sum: { $convert: { input: "$student_attendance",    to: "int", onError: 0, onNull: 0 } } },
        bible_church:   { $sum: { $convert: { input: "$student_bible_church",  to: "int", onError: 0, onNull: 0 } } },
        bible:          { $sum: { $convert: { input: "$student_bible",         to: "int", onError: 0, onNull: 0 } } },
        without_bible:  { $sum: { $convert: { input: "$student_without_bible", to: "int", onError: 0, onNull: 0 } } },
        task:           { $sum: { $convert: { input: "$student_Task",          to: "int", onError: 0, onNull: 0 } } },
        friend:         { $sum: { $convert: { input: "$student_Friend",        to: "int", onError: 0, onNull: 0 } } },
        contest:        { $sum: { $convert: { input: "$student_bonus",         to: "int", onError: 0, onNull: 0 } } },
        quiz:           { $sum: { $convert: { input: "$student_quiz",          to: "int", onError: 0, onNull: 0 } } }
      }
    },

    // 2) Compute total
    {
      $addFields: {
        total: {
          $add: [
            "$attendance","$bible_church","$bible","$without_bible",
            "$task","$friend","$contest","$quiz"
          ]
        }
      }
    },

    // 3) Join student level
    {
      $lookup: {
        from: "student_data",
        let: { sid: { $toString: "$_id" } },
        pipeline: [
          { $match: {
              $and: [
                activeStudentMatch,                                        // outside $expr
                { $expr: { $eq: [ { $toString: "$student_number" }, "$$sid" ] } }
              ]
            }
          },
          { $project: { student_level: 1, student_name: 1 } }
        ],
        as: "studentDoc"
      }
    },
    {
      $addFields: {
        student_level: { $ifNull: [ { $arrayElemAt: ["$studentDoc.student_level", 0] }, null ] },
        // fallback to student_data name if grouped one is empty
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

  if (level) pipeline.push({ $match: { student_level: level } });

  // 4) Sort high -> low for readability
  pipeline.push({ $sort: { total: -1, student_name: 1 } });

  // 5) Rank by ONE field only (Mongo requirement)
  pipeline.push({
    $setWindowFields: {
      sortBy: { total: -1 },         // <-- exactly one field
      output: { rank: { $rank: {} } }
    }
  });

  // (optional) stable sort again for final output
  pipeline.push({ $sort: { total: -1, student_name: 1 } });

  // 6) Final shape
  pipeline.push({
    $project: {
      _id: 0,
      student_number: "$_id",
      student_name: 1,
      student_level: 1,
      attendance: 1,
      bible_church: 1,
      bible: 1,
      without_bible: 1,
      task: 1,
      friend: 1,
      contest: 1,
      quiz: 1,
      total: 1,
      rank: 1
    }
  });

  return pipeline;
}

// GET /api/rankings/top3  (includes ties for rank 3)
exports.getTop3 = async (req, res) => {
  try {
    const pipeline = buildPipeline({});
    // compute ranks, then keep rank <= 3 (captures ties)
    const results = await Log.aggregate(pipeline.concat([{ $match: { rank: { $lte: 3 } } }]));
    const podium = { first: [], second: [], third: [] };
    for (const r of results) {
      if (r.rank === 1) podium.first.push(r);
      else if (r.rank === 2) podium.second.push(r);
      else if (r.rank === 3) podium.third.push(r);
    }
    return res.json({ ok: true, podium, results });
  } catch (err) {
    console.error('Ranking top3 error:', err);
    return res.status(500).json({ ok:false, error: err.message || 'Internal Server Error' });
  }
};

// GET /api/rankings?level=1s   (sorted high -> low)
exports.getRankings = async (req, res) => {
  try {
    const { level } = req.query;
    const pipeline = buildPipeline({ level: level || null });
    const results = await Log.aggregate(pipeline);
    return res.json({ ok: true, level: level || null, count: results.length, results });
  } catch (err) {
    console.error('Ranking list error:', err);
    return res.status(500).json({ ok:false, error: err.message || 'Internal Server Error' });
  }
};
