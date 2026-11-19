const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const aiConversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise'
  },
  title: {
    type: String,
    default: 'New School Assistant Conversation'
  },
  module: {
    type: String,
    default: 'assistant'
  },
  messages: [messageSchema],
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

aiConversationSchema.index({ user: 1, updatedAt: -1 });
aiConversationSchema.index({ franchise: 1, updatedAt: -1 });

module.exports = mongoose.model('AiConversation', aiConversationSchema);
