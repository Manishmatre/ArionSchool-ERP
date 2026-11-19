const mongoose = require('mongoose');

const schoolCertificateSchema = new mongoose.Schema({
  certificateNumber: {
    type: String,
    unique: true
  },
  certificateType: {
    type: String,
    enum: ['transfer_certificate', 'bonafide', 'character', 'study', 'migration', 'fee_clearance', 'leaving'],
    required: true,
    default: 'transfer_certificate'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
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
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  leavingDate: Date,
  reasonForLeaving: {
    type: String,
    trim: true,
    default: 'Parent transfer / completion of studies'
  },
  conduct: {
    type: String,
    enum: ['Excellent', 'Very Good', 'Good', 'Satisfactory'],
    default: 'Good'
  },
  promotedToClass: String,
  duesCleared: {
    type: Boolean,
    default: true
  },
  totalWorkingDays: Number,
  totalDaysPresent: Number,
  remarks: String,
  status: {
    type: String,
    enum: ['draft', 'issued', 'cancelled'],
    default: 'issued'
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Auto-generate certificate serial number: TC-YYYY-NNNN or BON-YYYY-NNNN
schoolCertificateSchema.pre('save', async function (next) {
  if (this.certificateNumber) return next();
  const year = new Date().getFullYear();
  const prefix = this.certificateType === 'transfer_certificate' ? 'TC' :
                 this.certificateType === 'bonafide' ? 'BON' :
                 this.certificateType === 'character' ? 'CHAR' : 'CERT';
  const count = await mongoose.model('SchoolCertificate').countDocuments({ certificateType: this.certificateType });
  this.certificateNumber = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  next();
});

schoolCertificateSchema.index({ franchise: 1, certificateType: 1 });
schoolCertificateSchema.index({ student: 1 });

module.exports = mongoose.model('SchoolCertificate', schoolCertificateSchema);
