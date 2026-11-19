const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide homework title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  schoolClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass',
    required: true
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  assignedDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  attachments: [{
    name: String,
    url: String
  }],
  maxMarks: {
    type: Number,
    default: 10
  }
}, { timestamps: true });

homeworkSchema.index({ schoolClass: 1, section: 1, dueDate: -1 });

module.exports = mongoose.model('Homework', homeworkSchema);
