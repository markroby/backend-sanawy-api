// controllers/authController.js
const User = require('../models/users');
const UserStatus = require('../models/user_status');
const bcrypt = require('bcrypt');

function isBcryptHash(str = '') {
  // bcrypt hash formats: $2a$, $2b$, $2y$
  return typeof str === 'string' && /^\$2[aby]\$/.test(str);
}

exports.login = async (req, res) => {
  try {
    const { username_up, Password_up } = req.body;
    if (!username_up || !Password_up) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const user = await User.findOne({ user_name: username_up });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    let ok = false;
    const stored = user.password;

    if (isBcryptHash(stored)) {
      // كلمة المرور مخزّنة كهاش: استخدم bcrypt
      ok = await bcrypt.compare(Password_up, stored);
    } else {
      // كلمة المرور مخزّنة كنص صريح: قارن نصيًا
      ok = (Password_up === stored);
    }

    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // سجّل حالة الدخول + الجلسة
    await UserStatus.create({
      user: user.user_name,
      status: 1,
      login_time: Date.now(),
      privilege: user.privilege
    });

    req.session.user = { user_name: user.user_name, privilege: user.privilege };
    return res.json({ ok: true, user: req.session.user });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.session && req.session.user) {
      await UserStatus.create({
        user: req.session.user.user_name,
        status: 0,
        logout_time: Date.now(),
        privilege: req.session.user.privilege
      });
    }
    req.session.destroy(() => {});
    return res.json({ ok: true });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.me = (req, res) => {
  if (req.session && req.session.user) return res.json({ user: req.session.user });
  return res.status(401).json({ error: 'Not authenticated' });
};
