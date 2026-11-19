const mongoose = require('mongoose');

const loginActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  eventType: { type: String, enum: ['sign_in', 'action'], default: 'sign_in', index: true },
  occurredAt: { type: Date, default: Date.now, index: true },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  method: { type: String, enum: ['password', 'google', 'api_action'], default: 'password' },
  action: { type: String, default: '' },
  resource: { type: String, default: '' },
  path: { type: String, default: '' },
  httpMethod: { type: String, default: '' },
  statusCode: { type: Number, default: null },
  role: { type: String, default: '' },
  franchise: { type: mongoose.Schema.Types.ObjectId, ref: 'Franchise', default: null }
}, { timestamps: true });

loginActivitySchema.index({ user: 1, occurredAt: -1 });
loginActivitySchema.index({ eventType: 1, occurredAt: -1 });

module.exports = mongoose.model('LoginActivity', loginActivitySchema);
