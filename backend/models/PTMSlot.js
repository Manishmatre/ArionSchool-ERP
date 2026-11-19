const mongoose = require('mongoose');

const ptmSlotSchema = new mongoose.Schema({
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true // e.g. "Term 1 Parent Teacher Meeting"
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  schoolClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass',
    required: true
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true // e.g. "10:00 AM"
  },
  endTime: {
    type: String,
    required: true // e.g. "10:15 AM"
  },
  mode: {
    type: String,
    enum: ['in_person', 'video_call'],
    default: 'in_person'
  },
  videoMeetingUrl: String,
  status: {
    type: String,
    enum: ['available', 'booked', 'completed', 'cancelled'],
    default: 'available'
  },
  bookedByStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  parentNotes: String,
  teacherFeedback: String
}, { timestamps: true });

ptmSlotSchema.index({ franchise: 1, date: 1, teacher: 1 });

module.exports = mongoose.model('PTMSlot', ptmSlotSchema);
