const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Please provide course title'],
    trim: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'Computer'
  },
  eligibility: {
    type: String,
    default: '10th Pass and Above'
  },
  popular: {
    type: Boolean,
    default: false
  },
  comingSoon: {
    type: Boolean,
    default: false
  },
  iconKey: {
    type: String,
    default: 'web'
  },
  courseCode: {
    type: String,
    required: [true, 'Please provide course code'],
    unique: true,
    uppercase: true
  },
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: [true, 'Please select a program']
  },
  shortDescription: {
    type: String,
    required: [true, 'Please provide short description'],
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  fullDescription: {
    type: String,
    required: [true, 'Please provide full description']
  },

  // Course Details
  duration: {
    type: String,
    default: ''
  },
  durationType: {
    type: String,
    enum: ['days', 'weeks', 'months', 'years'],
    default: 'months'
  },
  durationValue: {
    type: Number,
    required: [true, 'Please provide course duration'],
    min: 1
  },
  totalHours: {
    type: Number,
    default: 0
  },
  totalSessions: {
    type: Number,
    default: 0
  },
  thumbnail: {
    type: String,
    default: ''
  },

  // Seat Management
  totalSeats: {
    type: Number,
    default: 0
  },
  franchiseSeats: [{
    franchise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Franchise'
    },
    seats: {
      type: Number,
      default: 0
    }
  }],

  // Fees Structure
  regularFee: {
    type: Number,
    required: [true, 'Please provide regular fee'],
    min: 0
  },
  discountedFee: {
    type: Number,
    default: 0,
    min: 0
  },
  originalPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  registrationFee: {
    type: Number,
    default: 0
  },
  examFee: {
    type: Number,
    default: 0
  },
  certificateFee: {
    type: Number,
    default: 0
  },
  installmentAllowed: {
    type: Boolean,
    default: false
  },
  installmentPlan: [{
    installmentNumber: Number,
    amount: Number,
    dueAfterDays: Number
  }],

  // Trainers/Faculty
  trainers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  }],
  trainerName: {
    type: String,
    default: ''
  },
  primaryTrainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },

  // Course Status
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String
  }],
  language: {
    type: String,
    default: 'Hindi & English'
  },
  prerequisites: [{
    type: String
  }],
  requirements: [{
    type: String
  }],
  highlights: [{
    type: String
  }],
  faqs: [{
    question: { type: String, default: '' },
    answer: { type: String, default: '' }
  }],
  instructor: {
    name: { type: String, default: '' },
    title: { type: String, default: '' },
    experience: { type: String, default: '' },
    bio: { type: String, default: '' },
    students: { type: String, default: '' },
    courses: { type: String, default: '' }
  },
  learningOutcomes: [{
    type: String
  }],
  targetAudience: {
    type: String,
    default: ''
  },
  certificateAvailable: {
    type: Boolean,
    default: true
  },
  skillLevel: {
    type: String,
    default: 'Beginner to Advanced'
  },
  estimatedTime: {
    type: String, // e.g., "4 weeks", "2 months"
    default: ''
  },
  totalLectures: {
    type: Number,
    required: [true, 'Please provide total number of lectures'],
    min: [1, 'Course must have at least 1 lecture']
  },
  videoUrl: {
    type: String,
    default: ''
  },
  curriculum: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    duration: {
      type: String,
      default: ''
    },
    topics: [{
      topicTitle: {
        type: String,
        required: true
      },
      topicDescription: {
        type: String,
        default: ''
      },
      contentType: {
        type: String,
        enum: ['video', 'pdf', 'text', 'quiz', 'assignment', 'live'],
        default: 'video'
      },
      videoUrl: {
        type: String,
        default: ''
      },
      pdfUrl: {
        type: String,
        default: ''
      },
      textContent: {
        type: String,
        default: ''
      },
      duration: {
        type: Number, // in minutes
        default: 0
      },
      isFreePreview: {
        type: Boolean,
        default: false
      },
      order: {
        type: Number,
        default: 0
      },
      resources: [{
        title: String,
        type: String, // pdf, doc, link, etc.
        url: String
      }]
    }]
  }],
  videoCount: {
    type: Number,
    default: 0
  },
  articleCount: {
    type: Number,
    default: 0
  },
  downloadableResources: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  order: {
    type: Number,
    default: 0
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

// Update timestamp on save
courseSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.durationValue) {
    const unit = this.durationType || 'months';
    this.duration = `${this.durationValue} ${unit.charAt(0).toUpperCase() + unit.slice(1)}`;
  }
  if (!this.trainerName && this.instructor?.name) {
    this.trainerName = this.instructor.name;
  }
  next();
});

// Virtual for enrolled count
courseSchema.virtual('enrolledCount').get(function () {
  return this.enrolledStudents.length;
});

module.exports = mongoose.model('Course', courseSchema);
