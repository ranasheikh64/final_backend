const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  profileImage: { type: String },
  resetPasswordToken: { type: String },      // token for password reset
  resetPasswordExpires: { type: Date },      // token expiry
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
