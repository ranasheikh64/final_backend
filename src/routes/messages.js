const express = require('express');
const auth = require('../middleware/auth');
const Message = require('../models/Message');

const router = express.Router();

// save message
router.post('/messages', auth, async (req, res) => {
  try {
    const { senderId, receiverId, message, type = 'text' } = req.body;

    if (!senderId || !receiverId || !message) {
      return res.status(400).json({ error: 'senderId, receiverId and message required' });
    }

    // create unique chatId per two users
    const chatId = [senderId, receiverId].sort().join('_');

    const newMessage = new Message({
      chatId,
      senderId,
      receiverId,
      message,
      type
    });

    await newMessage.save();

    res.json({ success: true, message: newMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// get messages between two users
router.get('/messages/:user1/:user2', auth, async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const chatId = [user1, user2].sort().join('_');

    const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
