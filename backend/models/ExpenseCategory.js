const mongoose = require('mongoose');

const expenseCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  key: { type: String, required: true, lowercase: true, trim: true },
  franchise: { type: mongoose.Schema.Types.ObjectId, ref: 'Franchise', default: null },
  active: { type: Boolean, default: true }
}, { timestamps: true });

expenseCategorySchema.index({ key: 1, franchise: 1 }, { unique: true });

module.exports = mongoose.model('ExpenseCategory', expenseCategorySchema);
