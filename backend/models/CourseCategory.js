const mongoose = require('mongoose');

const courseCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  normalizedName: { type: String, required: true, unique: true, index: true },
  description: { type: String, default: '', trim: true, maxlength: 500 },
  icon: { type: String, default: '📚', maxlength: 8 },
  color: { type: String, default: '#6B7280', match: /^#[0-9A-Fa-f]{6}$/ }
}, { timestamps: true });

courseCategorySchema.pre('validate', function normalizeCategoryName(next) {
  if (this.name) this.normalizedName = this.name.trim().toLocaleLowerCase('en');
  next();
});

module.exports = mongoose.model('CourseCategory', courseCategorySchema);
