const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise'
  },
  feeStructure: {
    registrationFee: {
      type: Number,
      default: 0
    },
    courseFee: {
      type: Number,
      required: true
    },
    examFee: {
      type: Number,
      default: 0
    },
    certificateFee: {
      type: Number,
      default: 0
    },
    otherFees: {
      type: Number,
      default: 0
    },
    totalFee: {
      type: Number,
      required: true
    }
  },
  installments: [{
    installmentNumber: Number,
    amount: Number,
    dueDate: Date,
    description: String
  }],
  discounts: [{
    type: {
      type: String,
      enum: ['percentage', 'fixed']
    },
    value: Number,
    description: String,
    validFrom: Date,
    validTill: Date
  }],
  taxes: {
    gst: {
      type: Number,
      default: 0
    },
    otherTaxes: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  effectiveTill: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
feeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Fee', feeSchema);
