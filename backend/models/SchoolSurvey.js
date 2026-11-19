const mongoose = require('mongoose');

const schoolSurveySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide survey title'],
    trim: true
  },
  description: String,
  targetAudience: {
    type: String,
    enum: ['parents', 'students', 'teachers', 'all'],
    default: 'parents'
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  questions: [{
    questionText: { type: String, required: true },
    questionType: { type: String, enum: ['rating_5', 'rating_10', 'yes_no', 'text'], default: 'rating_5' }
  }],
  responses: [{
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userRole: String,
    answers: [{
      questionIndex: Number,
      answerValue: String
    }],
    submittedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  }
}, { timestamps: true });

schoolSurveySchema.index({ franchise: 1, status: 1 });

module.exports = mongoose.model('SchoolSurvey', schoolSurveySchema);
