const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide subject name (e.g. Mathematics)'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide subject code (e.g. MATH-10)'],
    trim: true,
    uppercase: true
  },
  subjectType: {
    type: String,
    enum: ['theory', 'practical', 'both', 'activity', 'language'],
    default: 'theory'
  },
  schoolClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass'
  }],
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  creditHours: {
    type: Number,
    default: 4
  },
  passMarks: {
    type: Number,
    default: 33
  },
  maxMarks: {
    type: Number,
    default: 100
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

subjectSchema.index({ franchise: 1, code: 1 }, { unique: true });
subjectSchema.index({ franchise: 1, name: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
