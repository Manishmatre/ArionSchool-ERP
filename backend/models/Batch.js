const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  // Basic Information
  batchName: {
    type: String,
    required: [true, 'Please provide batch name'],
    trim: true
  },
  batchCode: {
    type: String,
    required: [true, 'Please provide batch code'],
    unique: true,
    uppercase: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Please select a course']
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise'
  },
  
  // Schedule
  startDate: {
    type: Date,
    required: [true, 'Please provide start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please provide end date']
  },
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: String, // e.g., "09:00"
    endTime: String    // e.g., "11:00"
  }],
  timing: {
    type: String, // e.g., "Morning", "Evening", "Weekend"
    enum: ['Morning', 'Afternoon', 'Evening', 'Weekend', 'Custom']
  },
  
  // Trainer
  trainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: [true, 'Please assign a trainer']
  },
  assistantTrainers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  }],
  
  // Students
  students: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'dropped', 'transferred'],
      default: 'active'
    },
    completionDate: Date,
    certificateIssued: {
      type: Boolean,
      default: false
    }
  }],
  
  // Capacity
  maxCapacity: {
    type: Number,
    default: 30
  },
  currentStrength: {
    type: Number,
    default: 0
  },
  
  // Mode
  mode: {
    type: String,
    enum: ['offline', 'online', 'hybrid'],
    default: 'offline'
  },
  classroom: {
    type: String,
    default: ''
  },
  meetingLink: {
    type: String,
    default: ''
  },
  
  // Status
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Additional Info
  description: {
    type: String,
    default: ''
  },
  remarks: {
    type: String,
    default: ''
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Update current strength before saving
batchSchema.pre('save', function(next) {
  this.currentStrength = this.students.filter(s => s.status === 'active').length;
  
  // Auto-update status based on dates
  const now = new Date();
  if (now < this.startDate) {
    this.status = 'upcoming';
  } else if (now >= this.startDate && now <= this.endDate) {
    this.status = 'ongoing';
  } else if (now > this.endDate) {
    this.status = 'completed';
  }
  
  next();
});

// Virtual for available seats
batchSchema.virtual('availableSeats').get(function() {
  return this.maxCapacity - this.currentStrength;
});

module.exports = mongoose.model('Batch', batchSchema);
