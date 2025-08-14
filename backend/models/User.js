const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  inviteCode: { type: String, required: true, unique: true },
  invitedCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastGamePlayed: { type: Date },
  chatId: { type: Number, required: true }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
