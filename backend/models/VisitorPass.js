const mongoose = require('mongoose');

const visitorPassSchema = new mongoose.Schema({
  passNumber: {
    type: String,
    unique: true
  },
  visitorName: {
    type: String,
    required: [true, 'Please provide visitor name'],
    trim: true
  },
  mobileNumber: {
    type: String,
    required: [true, 'Please provide visitor mobile number'],
    trim: true
  },
  photo: String,
  idProofType: {
    type: String,
    enum: ['aadhaar', 'voter_id', 'driving_license', 'pan_card', 'other'],
    default: 'aadhaar'
  },
  idProofNumber: String,
  purpose: {
    type: String,
    required: [true, 'Please provide purpose of visit'],
    trim: true
  },
  visitingPersonType: {
    type: String,
    enum: ['student', 'staff', 'principal', 'admin', 'general'],
    default: 'staff'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  personToMeet: String,
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  checkInTime: {
    type: Date,
    default: Date.now
  },
  checkOutTime: Date,
  numberOfPersons: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['inside', 'checked_out', 'denied'],
    default: 'inside'
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  remarks: String
}, { timestamps: true });

// Auto-generate passNumber: VPASS-YYYY-NNNN
visitorPassSchema.pre('save', async function (next) {
  if (this.passNumber) return next();
  const year = new Date().getFullYear();
  const count = await mongoose.model('VisitorPass').countDocuments();
  this.passNumber = `VPASS-${year}-${String(count + 1).padStart(4, '0')}`;
  next();
});

visitorPassSchema.index({ franchise: 1, status: 1 });
visitorPassSchema.index({ mobileNumber: 1 });

module.exports = mongoose.model('VisitorPass', visitorPassSchema);
