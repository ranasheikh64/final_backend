const mongoose = require('mongoose');


const messageSchema = new mongoose.Schema({
    chatId: { type: String, required: true }, // chat session ID
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    message: { type: String },
    type: { type: String, default: 'text' }, // text, image, etc
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Message', messageSchema);

