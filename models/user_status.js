const mongoose = require('mongoose');

const UserStatusSchema = new mongoose.Schema({
  user: String,
  status: Number,
  login_time: Number,
  logout_time: Number,
  privilege: String,
  computer_name: String,
  homedir: String,
  type: String
}, { timestamps: true });

module.exports = mongoose.model('UserStatus', UserStatusSchema);
