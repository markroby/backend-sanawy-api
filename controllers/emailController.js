// controllers/emailController.js
const nodemailer = require('nodemailer');
const { generateIdCardPng } = require('../utils/idCard');
const Student = require('../models/student_data');

// try to find student by phone/student_number (string/number tolerant)
async function findStudentByNumber(number) {
  const nStr = String(number);
  const nNum = Number(nStr);
  const or = [{ student_number: nStr }];
  if (Number.isFinite(nNum)) or.push({ student_number: nNum });

  // accept active students (isdeleted 0 / "0" / missing)
  const active = { $or: [
    { isdeleted: { $exists: false } },
    { isdeleted: 0 },
    { isdeleted: "0" }
  ]};

  return await Student.collection.findOne({ $and: [ active, { $or: or } ] });
}

// POST /api/email/idcard
// Body can be either:
//  { "name": "...", "number": "010...", "email": "..." }
// or just:
//  { "number": "010..." }   -> will look up name + email from student_data
exports.sendIdCard = async (req, res) => {
  try {
    let { name, number, email } = req.body || {};
    if (!number) {
      return res.status(400).json({ ok: false, error: 'number is required' });
    }

    // Lookup if name/email not provided
    if (!name || !email) {
      const stu = await findStudentByNumber(number);
      if (!stu) {
        return res.status(404).json({ ok: false, error: 'Student not found for given number' });
      }
      name  = name  || stu.student_name || 'Student';
      email = email || stu.student_mail;
      if (!email) {
        return res.status(400).json({ ok: false, error: 'Email is missing for this student; please provide email' });
      }
    }

    // Generate ID card PNG buffer
    const png = await generateIdCardPng({ name, number });

    // Setup mailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // e.g. 'mm3906760@gmail.com'
        pass: process.env.EMAIL_PASS  // app password
      }
    });

    const filenameSafe = `${name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}_id_card.png`;

    // Send email
    await transporter.sendMail({
      from: `"Sanawy Bible" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Student ID Card',
      text: `Dear ${name},

Please find attached your Student ID card.

Student Number: ${number}

Best regards,
Sanawy Bible Team`,
      attachments: [
        {
          filename: filenameSafe,
          content: png,
          contentType: 'image/png'
        }
      ]
    });

    return res.json({ ok: true, sent: true, to: email, name, number, filename: filenameSafe });
  } catch (err) {
    console.error('sendIdCard error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to send email' });
  }
};

// GET /api/email/idcard/preview?name=...&number=...
// returns PNG directly for quick preview (no email)
exports.previewIdCard = async (req, res) => {
  try {
    let { name, number } = req.query || {};
    if (!number) return res.status(400).send('number is required');

    if (!name) {
      const stu = await findStudentByNumber(number);
      name = stu?.student_name || 'Student';
    }

    const png = await generateIdCardPng({ name, number });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="id_card.png"`);
    return res.send(png);
  } catch (err) {
    console.error('previewIdCard error:', err);
    return res.status(500).send('Failed to generate preview');
  }
};
