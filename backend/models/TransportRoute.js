const mongoose = require('mongoose');

const transportRouteSchema = new mongoose.Schema({
  routeName: {
    type: String,
    required: [true, 'Please provide route name (e.g. Route 3 - City Center)'],
    trim: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  monthlyFee: {
    type: Number,
    required: true,
    default: 1500
  },
  stops: [{
    stopName: {
      type: String,
      required: true
    },
    pickupTime: {
      type: String, // e.g. "07:15 AM"
      required: true
    },
    dropTime: {
      type: String, // e.g. "02:45 PM"
      required: true
    },
    fare: {
      type: Number,
      default: 0
    },
    order: Number
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

transportRouteSchema.index({ franchise: 1, routeName: 1 });

module.exports = mongoose.model('TransportRoute', transportRouteSchema);
