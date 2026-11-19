const mongoose = require('mongoose');

const schoolEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide event title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  eventType: {
    type: String,
    enum: ['academic', 'holiday', 'examination', 'ptm', 'sports', 'cultural', 'celebration', 'other'],
    default: 'academic'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  startTime: String,
  endTime: String,
  location: String,
  targetAudience: {
    type: String,
    enum: ['all', 'students', 'teachers', 'parents'],
    default: 'all'
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
  isHoliday: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

schoolEventSchema.index({ franchise: 1, startDate: 1 });

module.exports = mongoose.model('SchoolEvent', schoolEventSchema);
