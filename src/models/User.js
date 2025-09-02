const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'], // GeoJSON Point
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  profileImage: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// 🔴 spelling fix
UserSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', UserSchema);
