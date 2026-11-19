const mongoose = require('mongoose');

const aiUsageLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise'
  },
  module: {
    type: String,
    enum: [
      'assistant',
      'dashboard_insights',
      'student_summary',
      'lesson_plan',
      'question_generator',
      'exam_analysis',
      'fee_insights',
      'enquiry_summary',
      'communication_draft',
      'report_summary',
      'general'
    ],
    default: 'assistant'
  },
  action: {
    type: String,
    trim: true
  },
  provider: {
    type: String,
    default: 'groq'
  },
  model: {
    type: String,
    default: 'openai/gpt-oss-120b'
  },
  promptTokens: {
    type: Number,
    default: 0
  },
  completionTokens: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  estimatedCost: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'rate_limited'],
    default: 'success'
  },
  error: {
    type: String
  },
  responseTimeMs: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

aiUsageLogSchema.index({ franchise: 1, createdAt: -1 });
aiUsageLogSchema.index({ user: 1, createdAt: -1 });
aiUsageLogSchema.index({ module: 1, createdAt: -1 });

module.exports = mongoose.model('AiUsageLog', aiUsageLogSchema);
