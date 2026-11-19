const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise'
  },
  // Master set of questions selected/approved for this exam
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MCQ',
    required: true
  }],
  masterQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MCQ'
  }],
  // Generation configuration (for automatically generated exams)
  generationConfig: {
    mode: {
      type: String,
      enum: ['automatic', 'manual'],
      default: 'automatic'
    },
    modules: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module'
    }],
    totalQuestions: {
      type: Number,
      default: 0
    },
    difficultyDistribution: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 }
    },
    moduleDistribution: [{
      module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
      count: { type: Number, default: 0 }
    }]
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String
  },
  duration: {
    type: Number, // Duration in minutes
    required: [true, 'Duration is required']
  },
  passPercentage: {
    type: Number,
    default: 60
  },
  isFinalExam: {
    type: Boolean,
    default: false
  },
  maxAttempts: {
    type: Number,
    default: 1
  },
  negativeMarking: {
    type: Boolean,
    default: false
  },
  negativeMarksPerQuestion: {
    type: Number,
    default: 0
  },
  resultVisibility: {
    type: String,
    enum: ['immediate', 'after_exam_end', 'manual'],
    default: 'immediate'
  },
  instructions: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'completed'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

examSchema.pre('save', function (next) {
  // Sync masterQuestions and questions
  if ((!this.masterQuestions || this.masterQuestions.length === 0) && this.questions && this.questions.length > 0) {
    this.masterQuestions = this.questions;
  }
  if ((!this.questions || this.questions.length === 0) && this.masterQuestions && this.masterQuestions.length > 0) {
    this.questions = this.masterQuestions;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Exam', examSchema);
