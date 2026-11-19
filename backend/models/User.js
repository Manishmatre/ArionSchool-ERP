const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  mobile: {
    type: String,
    unique: true,
    sparse: true,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{10}$/.test(v);
      },
      message: 'Please provide a valid 10-digit mobile number'
    }
  },
  googleId: {
    type: String,
    sparse: true
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
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
      'school_owner',
      'franchise_admin',
      'super_admin'
    ],
    default: 'student'
  },
  permissions: [{
    type: String,
    trim: true
  }],
  linkedStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise'
  },
  profileImage: {
    type: String,
    default: ''
  },
  profilePicture: {
    type: String,
    default: ''
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Company platform supports multiple super_admin operators (managed via Platform Console)

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index(
  { email: 1 },
  {
    unique: true,
    collation: { locale: 'en', strength: 2 }
  }
);

module.exports = mongoose.model('User', userSchema);
