const mongoose = require('mongoose');

/**
 * Unified template field schema used by marksheet, certificate, and ID card templates.
 */
const templateFieldSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  fieldType: {
    type: String,
    enum: ['text', 'image', 'table', 'qrCode', 'date', 'number', 'customText'],
    required: true
  },
  label: { type: String, trim: true },
  defaultValue: { type: String, trim: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  rotation: { type: Number, default: 0 },
  zIndex: { type: Number, default: 0 },
  fontSize: { type: Number, default: 12 },
  fontSizeUnit: { type: String, enum: ['px', '%', 'em', 'auto'], default: 'px' },
  fontFamily: { type: String, default: 'Arial' },
  fontWeight: { type: String, default: 'normal' },
  color: { type: String, default: '#000000' },
  backgroundColor: { type: String, default: 'transparent' },
  alignment: { type: String, enum: ['left', 'center', 'right', 'justify'], default: 'left' },
  verticalAlign: { type: String, enum: ['top', 'middle', 'bottom'], default: 'top' },
  textTransform: {
    type: String,
    enum: ['none', 'uppercase', 'lowercase', 'capitalize'],
    default: 'none'
  },
  letterSpacing: { type: Number, default: 0 },
  lineHeight: { type: Number, default: 1.2 },
  padding: { type: Number, default: 0 },
  borderRadius: { type: Number, default: 0 },
  textShadowX: { type: Number, default: 0 },
  textShadowY: { type: Number, default: 0 },
  textShadowBlur: { type: Number, default: 0 },
  textShadowColor: { type: String, default: '#000000' },
  objectFit: { type: String, enum: ['cover', 'contain', 'fill'], default: 'cover' }
}, { _id: false });

module.exports = templateFieldSchema;
