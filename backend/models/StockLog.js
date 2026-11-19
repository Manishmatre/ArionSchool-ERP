const mongoose = require('mongoose');

const stockLogSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true
  },
  transactionType: {
    type: String,
    enum: ['inward', 'outward', 'adjustment', 'return'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.1
  },
  unitPrice: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  issuedToStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  recipientName: String,
  department: String,
  date: {
    type: Date,
    default: Date.now
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, { timestamps: true });

stockLogSchema.index({ franchise: 1, item: 1, date: -1 });

module.exports = mongoose.model('StockLog', stockLogSchema);
