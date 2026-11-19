const mongoose = require('mongoose');

const libraryBookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide book title'],
    trim: true
  },
  isbn: {
    type: String,
    trim: true
  },
  author: {
    type: String,
    required: [true, 'Please provide author name'],
    trim: true
  },
  publisher: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['textbook', 'reference', 'fiction', 'non_fiction', 'science', 'mathematics', 'history', 'literature', 'magazine', 'journal', 'other'],
    default: 'textbook'
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  totalCopies: {
    type: Number,
    default: 1,
    min: 1
  },
  availableCopies: {
    type: Number,
    default: 1,
    min: 0
  },
  shelfLocation: {
    type: String,
    trim: true
  },
  barcode: {
    type: String,
    trim: true
  },
  language: {
    type: String,
    default: 'English'
  },
  price: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

libraryBookSchema.index({ franchise: 1, title: 1 });
libraryBookSchema.index({ franchise: 1, isbn: 1 });

module.exports = mongoose.model('LibraryBook', libraryBookSchema);
