const mongoose = require('mongoose');

const mcqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Please provide question text'],
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  questionType: {
    type: String,
    enum: ['single_choice', 'multiple_choice', 'true_false'],
    default: 'single_choice'
  },
  options: [{
    text: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  },
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  },
  // Retained for backward compatibility with existing data
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter'
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  },
  explanation: {
    type: String,
    default: ''
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  marks: {
    type: Number,
    default: 1
  },
  negativeMarks: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
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

// Validation & sync
mcqSchema.pre('save', function (next) {
  // Sync module and chapter
  if (!this.module && this.chapter) {
    this.module = this.chapter;
  }
  if (!this.chapter && this.module) {
    this.chapter = this.module;
  }
  // Sync lesson and topic
  if (!this.lesson && this.topic) {
    this.lesson = this.topic;
  }
  if (!this.topic && this.lesson) {
    this.topic = this.lesson;
  }
  // Sync status and isActive
  if (this.status === 'inactive') {
    this.isActive = false;
  } else if (this.status === 'active') {
    this.isActive = true;
  }

  // Ensure at least one correct answer
  const correctAnswers = this.options.filter(opt => opt.isCorrect);
  if (correctAnswers.length < 1) {
    return next(new Error('Question must have at least one correct answer'));
  }
  if (this.questionType === 'single_choice' && correctAnswers.length !== 1) {
    return next(new Error('Single choice question must have exactly one correct answer'));
  }

  this.updatedAt = Date.now();
  next();
});

// Indices
mcqSchema.index({ course: 1, module: 1, lesson: 1 });
mcqSchema.index({ difficulty: 1, status: 1 });

module.exports = mongoose.model('MCQ', mcqSchema);
