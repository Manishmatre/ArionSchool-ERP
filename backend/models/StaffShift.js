const mongoose = require('mongoose');

const staffShiftSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide shift name'],
    trim: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  startTime: {
    type: String,
    required: true,
    default: '08:00'
  },
  endTime: {
    type: String,
    required: true,
    default: '14:30'
  },
  graceMinutes: {
    type: Number,
    default: 15
  },
  workingDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

staffShiftSchema.index({ franchise: 1, name: 1 });

module.exports = mongoose.model('StaffShift', staffShiftSchema);
