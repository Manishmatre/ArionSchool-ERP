const mongoose = require('mongoose');

const timetableEntrySchema = new mongoose.Schema({
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
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
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  periodNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  startTime: {
    type: String,
    required: true // e.g. "08:30"
  },
  endTime: {
    type: String,
    required: true // e.g. "09:15"
  },
  roomNumber: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Constraint Index: Section cannot have two subjects in the same period on the same day
timetableEntrySchema.index({ section: 1, dayOfWeek: 1, periodNumber: 1 }, { unique: true });

// Constraint Index: Teacher cannot teach two classes in the same period on the same day
timetableEntrySchema.index({ teacher: 1, dayOfWeek: 1, periodNumber: 1 }, { unique: true });

module.exports = mongoose.model('TimetableEntry', timetableEntrySchema);
