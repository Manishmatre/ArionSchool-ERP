const mongoose = require('mongoose');

const homeworkSubmissionSchema = new mongoose.Schema({
  homework: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Homework',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  attachments: [{
    name: String,
    url: String
  }],
  studentNotes: String,
  status: {
    type: String,
    enum: ['submitted', 'evaluated', 'resubmit_required'],
    default: 'submitted'
  },
  marksObtained: {
    type: Number,
    min: 0
  },
  teacherFeedback: String,
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  evaluatedAt: Date
}, { timestamps: true });

homeworkSubmissionSchema.index({ homework: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('HomeworkSubmission', homeworkSubmissionSchema);
