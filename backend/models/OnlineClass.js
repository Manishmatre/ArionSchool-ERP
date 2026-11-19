const mongoose = require('mongoose');

const onlineClassSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 15,
    max: 480
  },
  meetingLink: {
    type: String,
    required: true
  },
  meetingId: { type: String },
  password: { type: String },
  platform: {
    type: String,
    enum: ['zoom', 'google_meet', 'teams', 'jitsi', 'youtube', 'custom'],
    default: 'zoom'
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  maxParticipants: {
    type: Number,
    default: 100
  },
  participants: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    joinedAt: Date,
    leftAt: Date,
    duration: Number // in minutes
  }],
  recording: {
    url: String,
    duration: Number,
    size: Number, // in MB
    available: {
      type: Boolean,
      default: false
    }
  },
  materials: [{
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  notes: String,
  reminderSent: {
    type: Boolean,
    default: false
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

onlineClassSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better performance
onlineClassSchema.index({ course: 1, scheduledDate: 1 });
onlineClassSchema.index({ instructor: 1, scheduledDate: 1 });
onlineClassSchema.index({ franchise: 1, status: 1 });

module.exports = mongoose.model('OnlineClass', onlineClassSchema);
