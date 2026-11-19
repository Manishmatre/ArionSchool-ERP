const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide inventory item name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide item code or SKU'],
    trim: true,
    uppercase: true
  },
  category: {
    type: String,
    enum: ['stationery', 'lab_equipment', 'sports', 'books', 'furniture', 'it_hardware', 'uniform', 'medical_first_aid', 'maintenance', 'other'],
    default: 'stationery'
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  unit: {
    type: String,
    enum: ['pcs', 'boxes', 'kg', 'liters', 'meters', 'sets', 'packets'],
    default: 'pcs'
  },
  quantityOnHand: {
    type: Number,
    default: 0,
    min: 0
  },
  minimumStockThreshold: {
    type: Number,
    default: 5,
    min: 0
  },
  unitCost: {
    type: Number,
    default: 0
  },
  location: {
    type: String,
    trim: true
  },
  isConsumable: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

inventoryItemSchema.index({ franchise: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
