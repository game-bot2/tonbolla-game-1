const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  status: { 
    type: String, 
    enum: ['scheduled', 'active', 'completed'], 
    default: 'scheduled' 
  },
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: { type: Number, default: 0 }
  }],
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;
