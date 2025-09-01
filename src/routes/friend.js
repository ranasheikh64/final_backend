
const express = require('express');
const router = express.Router();
const FriendRequest = require('../models/FriendRequest');
console.log("FriendRequest model:", FriendRequest);
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
console.log("user model:", User);

// ===== Get My Friends (accepted only) =====
router.get('/my-friends', auth, async (req, res) => {
  try {
    const userId = req.userId;

    // Find all accepted requests where user is either sender or receiver
    const friends = await FriendRequest.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
      status: "accepted"
    })
      .populate('senderId', 'name email profileImage')
      .populate('receiverId', 'name email profileImage')
      .sort({ createdAt: -1 });

    // Map kore friend object banabo
    const friendList = friends.map(req => {
      const friend =
        req.senderId._id.toString() === userId.toString()
          ? req.receiverId
          : req.senderId;

      return {
        id: friend._id,
        name: friend.name,
        email: friend.email,
        profileImage: friend.profileImage || null
      };
    });

    res.json({
      success: true,
      count: friendList.length,
      friends: friendList,
    });
  } catch (err) {
    console.error("❌ Get my friends error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.post('/friend-request', auth, async (req, res) => {
  try {
    const senderId = req.userId; // auth middleware theke
    const { receiverId } = req.body;

    if (!receiverId) return res.status(400).json({ error: "Missing receiverId" });

    const existing = await FriendRequest.findOne({ senderId, receiverId });
    if (existing) return res.status(400).json({ error: "Friend request already sent" });

    const request = new FriendRequest({ senderId, receiverId, status: "pending" });
    await request.save();

    res.json({ success: true, message: "Friend request sent", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


router.post('/accept-request', async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: "Missing requestId" });
    }

    // find request
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    // check if already accepted
    if (request.status === "accepted") {
      return res.status(400).json({ error: "Friend request already accepted" });
    }

    // update status
    request.status = "accepted";
    await request.save();

    res.json({
      success: true,
      message: "Friend request accepted",
      request
    });

  } catch (err) {
    console.error("❌ Accept request error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.get('/get-friend-requests', auth, async (req, res) => {
  try {
    const userId = req.userId; // from auth middleware

    const requests = await FriendRequest.find({ receiverId: userId })
      .populate('senderId', 'name email') // populate sender info
      .sort({ createdAt: -1 }); // latest first

    res.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (err) {
    console.error("❌ Get friend requests error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete('/delete-request/:requestId', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.userId; // from auth middleware

    if (!requestId) return res.status(400).json({ error: "Missing requestId" });

    // Find the request
    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: "Friend request not found" });

    // Only sender or receiver can delete
    if (request.senderId.toString() !== userId && request.receiverId.toString() !== userId) {
      return res.status(403).json({ error: "Not authorized to delete this request" });
    }

    await request.deleteOne();

    res.json({
      success: true,
      message: "Friend request deleted",
    });
  } catch (err) {
    console.error("❌ Delete friend request error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/profile';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.userId}_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// ===== Update profile route =====
router.put('/update', auth, upload.single('image'), async (req, res) => {
  try {
    const userId = req.userId;
    const { name } = req.body;
    const updateData = {};

    if (name) updateData.name = name;

    if (req.file) {
      // Normalize path to use forward slashes
      const relativePath = req.file.path.replace(/\\/g, '/');
      // Make full URL
      updateData.profileImage = `${req.protocol}://${req.get('host')}/${relativePath}`;
    }

    // Update user in DB
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        name: updatedUser.name,
        profileImage: updatedUser.profileImage || null
      }
    });
  } catch (err) {
    console.error('❌ Profile update error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

