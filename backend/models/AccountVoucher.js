const mongoose = require('mongoose');

const accountVoucherSchema = new mongoose.Schema({
  voucherNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  voucherType: {
    type: String,
    enum: ['payment', 'receipt', 'journal', 'contra'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  debitAccount: {
    type: String,
    required: true,
    trim: true
  },
  creditAccount: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  party: {
    partyType: {
      type: String,
      enum: ['vendor', 'student', 'staff', 'bank', 'cash', 'other'],
      default: 'other'
    },
    id: mongoose.Schema.Types.ObjectId,
    name: String
  },
  narration: {
    type: String,
    required: [true, 'Please provide transaction narration/description'],
    trim: true
  },
  referenceNumber: String, // Cheque number, UTR number, invoice number
  supportingDocument: String,
  status: {
    type: String,
    enum: ['draft', 'posted', 'cancelled'],
    default: 'posted'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

accountVoucherSchema.index({ franchise: 1, voucherNumber: 1 });
accountVoucherSchema.index({ franchise: 1, date: -1 });

module.exports = mongoose.model('AccountVoucher', accountVoucherSchema);
