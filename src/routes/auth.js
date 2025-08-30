const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User'); // tumar User model
const { ChatTokenBuilder } = require('agora-token'); // tumi je working code e use korcho
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const router = express.Router();

console.log("EMAIL_USER from .env:", process.env.EMAIL_USER);
console.log("EMAIL_PASS from .env:", process.env.EMAIL_PASS); // only for testing

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,

     // the 16-character app password, no spaces
  }

});
console.log("EMAIL_USER from .env:", process.env.EMAIL_USER);
console.log("EMAIL_PASS from .env:", process.env.EMAIL_PASS); // only for testing

// ===========================
// Generate Agora Chat token
// ===========================
const getAgoraChatToken = (userId) => {
  const APP_ID = process.env.AGORA_APP_ID;
  const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
  const expire = parseInt(process.env.TOKEN_EXPIRE_SECONDS || '3600');
  return ChatTokenBuilder.buildUserToken(APP_ID, APP_CERTIFICATE, userId, expire);
};

// ===========================
// Generate Agora App Token
// ===========================
const getAgoraAppToken = () => {
  const APP_ID = process.env.AGORA_APP_ID;
  const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
  const expire = parseInt(process.env.TOKEN_EXPIRE_SECONDS || '3600');
  return ChatTokenBuilder.buildAppToken(APP_ID, APP_CERTIFICATE, expire);
};

// ===========================
// REGISTER
// ===========================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Missing fields' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already used' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash: hash });

    // JWT for frontend auth
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Agora Chat token
    const chatToken = getAgoraChatToken(user._id.toString());

    // Create user in Agora
    let agoraUserCreated = false;
    try {
      const appToken = getAgoraAppToken();
      const ORG_NAME = process.env.ORG_NAME;
      const APP_NAME = process.env.APP_NAME;
      const url = `https://a61.chat.agora.io/${ORG_NAME}/${APP_NAME}/users`;

      await axios.post(url, { username: user._id.toString() }, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appToken}` }
      });

      agoraUserCreated = true;
    } catch (err) {
      console.error("❌ Agora user creation failed:", err.response?.data || err.message);
    }

    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      jwtToken,
      chatToken,
      agoraUserCreated
    });

  } catch (err) {
    console.error("❌ Register error:", err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/all-users', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash'); // exclude passwords
    res.json({
      success: true,
      users,
    });
  } catch (err) {
    console.error("❌ Get all users error:", err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===========================
// LOGIN
// ===========================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    // Generate JWT and Agora Chat token
    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const chatToken = getAgoraChatToken(user._id.toString());

    // Respond without creating Agora user
    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      jwtToken,
      chatToken,
      agoraUserCreated: true // Assume already created during registration
    });

  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP and expiry (e.g., 10 minutes)
    user.resetPasswordToken = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    const mailOptions = {
      from: `"Your App Name" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset OTP',
      html: `<p>Your password reset OTP is: <b>${otp}</b></p>
             <p>This OTP will expire in 10 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "OTP sent to your email" });

  } catch (err) {
    console.error("❌ Forgot password error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});


router.post('/verify-otp', async (req, res) => {
    console.log('✅ /verify-otp called', req.body);
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ error: "Email and OTP are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.resetPasswordToken !== otp)
      return res.status(400).json({ error: "Invalid OTP" });

    if (user.resetPasswordExpires < Date.now())
      return res.status(400).json({ error: "OTP has expired" });

    res.json({ success: true, message: "OTP verified successfully" });

  } catch (err) {
    console.error("❌ Verify OTP error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword)
      return res.status(400).json({ error: "Email and new password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Only allow reset if OTP was verified (resetPasswordToken exists and not expired)
    if (!user.resetPasswordToken || user.resetPasswordExpires < Date.now())
      return res.status(400).json({ error: "OTP not verified or expired" });

    const hash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hash;

    // Clear OTP fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ success: true, message: "Password has been reset successfully" });

  } catch (err) {
    console.error("❌ Reset password error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});





module.exports = router;
