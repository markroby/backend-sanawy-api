const nodemailer = require('nodemailer');

exports.sendIdCard = async (req, res) => {
  const { to, subject, text } = req.body;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: subject || 'Sanawy ID',
      text: text || 'Attached your ID',
      // attachments could be included if frontend uploads to /uploads and sends path
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
