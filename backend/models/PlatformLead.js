const mongoose = require('mongoose');

const platformLeadSchema = new mongoose.Schema({
  schoolName: {
    type: String,
    required: [true, 'School name is required'],
    trim: true
  },
  contactName: {
    type: String,
    required: [true, 'Contact person name is required'],
    trim: true
  },
  designation: {
    type: String,
    default: 'Principal / Director',
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Contact email is required'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Contact phone is required'],
    trim: true
  },
  city: {
    type: String,
    default: '',
    trim: true
  },
  state: {
    type: String,
    default: '',
    trim: true
  },
  studentCount: {
    type: String,
    default: '500-1000',
    trim: true
  },
  board: {
    type: String,
    default: 'CBSE',
    trim: true
  },
  requestedSubdomain: {
    type: String,
    lowercase: true,
    trim: true,
    default: ''
  },
  offerCode: {
    type: String,
    default: 'SCHOOL_DEMO',
    trim: true
  },
  source: {
    type: String,
    enum: ['landing_page', 'manual', 'referral', 'partner', 'direct'],
    default: 'landing_page'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'demo_scheduled', 'proposal_sent', 'converted', 'lost'],
    default: 'new'
  },
  notes: {
    type: String,
    default: ''
  },
  convertedSchool: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolCampus',
    default: null
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

platformLeadSchema.index({ status: 1, createdAt: -1 });
platformLeadSchema.index({ email: 1 });

module.exports = mongoose.model('PlatformLead', platformLeadSchema);
