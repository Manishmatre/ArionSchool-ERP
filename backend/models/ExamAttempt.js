const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'timed_out'],
    default: 'in_progress'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  completedAt: {
    type: Date
  },
  // Saved randomized order of questions and options for this specific attempt
  randomizedQuestions: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MCQ',
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    // Shuffled options with stable option IDs (never expose isCorrect to student)
    options: [{
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      text: {
        type: String,
        required: true
      }
    }],
    selectedOptionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    isMarkedForReview: {
      type: Boolean,
      default: false
    },
    timeSpentSeconds: {
      type: Number,
      default: 0
    }
  }],
  totalTimeTaken: {
    type: Number, // in seconds
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  isPassed: {
    type: Boolean,
    default: false
  },
  testResult: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestResult'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

examAttemptSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index to quickly look up student's active attempt on an exam
examAttemptSchema.index({ exam: 1, student: 1, status: 1 });

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);

