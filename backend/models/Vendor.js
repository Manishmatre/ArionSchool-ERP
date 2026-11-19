const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide vendor or supplier name'],
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Please provide contact phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  gstin: {
    type: String,
    trim: true,
    uppercase: true
  },
  pan: {
    type: String,
    trim: true,
    uppercase: true
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    branch: String
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  category: {
    type: String,
    enum: ['stationery', 'books', 'lab_supplies', 'uniform', 'maintenance', 'catering_mess', 'transport_fuel', 'it_hardware', 'other'],
    default: 'other'
  },
  balance: {
    type: Number,
    default: 0 // positive = we owe vendor, negative = advance paid to vendor
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

vendorSchema.index({ franchise: 1, name: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
