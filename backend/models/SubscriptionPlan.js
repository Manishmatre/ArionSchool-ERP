const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide plan name (e.g. Starter, Growth, Enterprise)'],
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: [true, 'Please provide unique plan code (e.g. PLAN_STARTER)'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'annual', 'lifetime'],
    default: 'annual'
  },
  price: {
    type: Number,
    required: [true, 'Please specify plan price (INR)'],
    min: [0, 'Price cannot be negative'],
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  maxStudents: {
    type: Number,
    required: [true, 'Please specify student capacity limit (0 for unlimited)'],
    default: 500
  },
  maxCampuses: {
    type: Number,
    default: 1
  },
  maxStaff: {
    type: Number,
    default: 50
  },
  storageLimitGb: {
    type: Number,
    default: 10
  },
  features: [{
    type: String,
    trim: true
  }],
  trialDays: {
    type: Number,
    default: 14
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

subscriptionPlanSchema.index({ code: 1 }, { unique: true });
subscriptionPlanSchema.index({ isActive: 1 });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
