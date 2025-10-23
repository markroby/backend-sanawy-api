// controllers/authController.js
const { promisify } = require('util');
const bcrypt = require('bcryptjs')
;
const User = require('../models/users');
const UserStatus = require('../models/user_status');

function isBcryptHash(str = '') {
  // bcrypt hash formats: $2a$, $2b$, $2y$
  return typeof str === 'string' && /^\$2[aby]\$/.test(str);
}

exports.login = async (req, res) => {
  try {
    const username_up = (req.body?.username_up || '').trim();
    const Password_up = req.body?.Password_up ?? '';

    if (!username_up || !Password_up) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const user = await User.findOne({ user_name: username_up });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const stored = user.password || '';
    const ok = isBcryptHash(stored)
      ? await bcrypt.compare(Password_up, stored)
      : Password_up === stored;

    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // --- Record login status (do not block login if this fails) ---
    try {
      await UserStatus.create({
        user: user.user_name,
        status: 1,
        login_time: Date.now(),
        privilege: user.privilege,
      });
    } catch (e) {
      console.warn('UserStatus create failed:', e?.message || e);
    }

    // --- Session fixation protection + persist session before responding ---
    if (!req.session) {
      // Session middleware not mounted
      return res.status(500).json({ error: 'Session not initialized' });
    }

    const regenerate = promisify(req.session.regenerate).bind(req.session);
    const save = promisify(req.session.save).bind(req.session);

    await regenerate();

    req.session.user = {
      user_name: user.user_name,
      privilege: user.privilege,
    };

    await save();

    return res.json({ ok: true, user: req.session.user });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.session && req.session.user) {
      try {
        await UserStatus.create({
          user: req.session.user.user_name,
          status: 0,
          logout_time: Date.now(),
          privilege: req.session.user.privilege,
        });
      } catch (e) {
        console.warn('UserStatus logout create failed:', e?.message || e);
      }
    }

    if (!req.session) return res.json({ ok: true });

    const destroy = () =>
      new Promise((resolve) => {
        req.session.destroy(() => resolve());
      });

    await destroy();

    return res.json({ ok: true });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

exports.me = (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ user: req.session.user });
  }
  return res.status(401).json({ error: 'Not authenticated' });
};
