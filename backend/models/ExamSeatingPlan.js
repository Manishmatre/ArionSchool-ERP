const mongoose = require('mongoose');

const examSeatingPlanSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolExam',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  session: {
    type: String,
    enum: ['morning', 'afternoon', 'evening'],
    default: 'morning'
  },
  roomName: {
    type: String,
    required: [true, 'Please provide exam hall / room name'],
    trim: true
  },
  capacity: {
    type: Number,
    required: true
  },
  rows: {
    type: Number,
    default: 5
  },
  cols: {
    type: Number,
    default: 6
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  allocations: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    seatNumber: String,
    row: Number,
    col: Number,
    schoolClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolClass'
    }
  }],
  invigilator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  notes: String
}, { timestamps: true });

examSeatingPlanSchema.index({ franchise: 1, exam: 1, date: 1 });

module.exports = mongoose.model('ExamSeatingPlan', examSeatingPlanSchema);
