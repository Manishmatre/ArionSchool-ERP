const mongoose = require('mongoose');

const StudentCertificateSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'Student',
    required: true
  },
  franchise: {
    type: mongoose.Schema.ObjectId,
    ref: 'SchoolCampus',
    index: true
  },
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
    required: true
  },
  template: {
    type: mongoose.Schema.ObjectId,
    ref: 'StudentCertificateTemplate'
  },
  file: {
    type: Buffer
  },
  fileUrl: {
    type: String
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'revoked'],
    default: 'active'
  },
  certificateNumber: {
    type: String,
    unique: true
  },
  verificationCode: {
    type: String,
    unique: true
  },
  qrCode: {
    type: String
  },
  grade: {
    type: String
  },
  percentage: {
    type: Number
  },
  customFieldValues: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

StudentCertificateSchema.index({ student: 1, createdAt: -1 });
StudentCertificateSchema.index({ course: 1 });
StudentCertificateSchema.index({ createdAt: -1 });
StudentCertificateSchema.index({ status: 1 });

StudentCertificateSchema.pre('save', async function(next) {
  if (!this.certificateNumber) {
    try {
      // Find the highest certificate number
      const lastCertificate = await this.constructor.findOne({})
        .sort({ certificateNumber: -1 })
        .select('certificateNumber');
      
      let nextNumber = 1;
      if (lastCertificate && lastCertificate.certificateNumber) {
        // Extract the numeric part from SES-CERT-YYYY-NNNN format
        const parts = lastCertificate.certificateNumber.split('-');
        if (parts.length === 4 && parts[0] === 'SES' && parts[1] === 'CERT') {
          const year = parts[2];
          const currentYear = new Date().getFullYear();
          
          if (year === currentYear.toString()) {
            // Same year, increment the number
            const numericPart = parts[3];
            nextNumber = parseInt(numericPart) + 1;
          }
          // If different year, start from 1
        }
      }
      
      const year = new Date().getFullYear();
      this.certificateNumber = `SES-CERT-${year}-${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      // Fallback to simple count if there's an error
      const count = await this.constructor.countDocuments();
      const year = new Date().getFullYear();
      this.certificateNumber = `SES-CERT-${year}-${String(count + 1).padStart(4, '0')}`;
    }
  }
  
  if (!this.verificationCode) {
    this.verificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  
  next();
});

module.exports = mongoose.model('StudentCertificate', StudentCertificateSchema);
