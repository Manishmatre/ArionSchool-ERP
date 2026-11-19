const mongoose = require('mongoose');

const schoolClassSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide class name (e.g. Class 10, Nursery)'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide class code (e.g. CLS-10)'],
    trim: true,
    uppercase: true
  },
  order: {
    type: Number,
    default: 0
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

schoolClassSchema.index({ franchise: 1, name: 1 }, { unique: true });
schoolClassSchema.index({ franchise: 1, order: 1 });

module.exports = mongoose.model('SchoolClass', schoolClassSchema);
