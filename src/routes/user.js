const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth'); // JWT middleware

// Friend suggestion route
router.get('/suggestions', auth, async (req, res) => {
  try {
    // current user বের করা
    const currentUser = await User.findById(req.userId);
    if (!currentUser || !currentUser.location) {
      return res.status(400).json({ error: 'User location not found' });
    }

    // location অনুযায়ী কাছাকাছি ইউজার খোঁজা
    const suggestions = await User.find({
      _id: { $ne: currentUser._id }, // নিজেকে বাদ দিবে
      location: {
        $near: {
          $geometry: currentUser.location,
          $maxDistance: 5000 // 5km এর মধ্যে ইউজার সাজেস্ট করবে
        }
      }
    }).limit(10);

    res.json({ success: true, suggestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
