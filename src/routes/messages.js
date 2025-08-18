const express = require('express');
const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

const router = express.Router();

// create conversation (between participants array of userIds)
router.post('/conversation', auth, async (req, res) => {
  try {
    const { participants, isGroup = false, name } = req.body;
    if (!participants || !Array.isArray(participants) || participants.length < 1) {
      return res.status(400).json({ error: 'participants array required' });
    }

    const conv = await Conversation.create({ participants, isGroup, name });
    res.json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// get user's conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const convs = await Conversation.find({ participants: userId }).populate('participants', 'name email avatar');
    res.json(convs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// post a message (client can also store messages locally; this endpoint stores message server-side)
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, message, type = 'text', mediaUrl } = req.body;
    if (!receiverId || !message) return res.status(400).json({ error: 'receiverId and message required' });

    // find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, receiverId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({ participants: [req.userId, receiverId] });
    }

    const msg = await Message.create({
      conversation: conversation._id,
      sender: req.userId,
      text: message,
      type,
      mediaUrl
    });

    res.json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// get messages for a conversation
router.get('/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversation: conversationId }).populate('sender', 'name email avatar').sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
