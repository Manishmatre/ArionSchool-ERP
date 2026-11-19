const mongoose = require('mongoose');

const tenantMembershipSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolCampus',
    required: true
  },
  role: {
    type: String,
    enum: [
      'student',
      'parent',
      'teacher',
      'class_teacher',
      'principal',
      'vice_principal',
      'accountant',
      'admission_officer',
      'hr_manager',
      'transport_manager',
      'librarian',
      'security_staff',
      'school_admin',
      'franchise_admin'
    ],
    required: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  linkedStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  assignedClasses: [{
    schoolClass: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass' },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }
  }],
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

tenantMembershipSchema.index({ user: 1, school: 1 }, { unique: true });
tenantMembershipSchema.index({ school: 1, role: 1 });
tenantMembershipSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('TenantMembership', tenantMembershipSchema);
