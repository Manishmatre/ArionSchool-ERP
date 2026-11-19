const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Course = require('../models/Course');

// Temporary route to generate receipts for existing payments
router.post('/generate-receipts', async (req, res) => {
  try {
    console.log('Finding payments without receipts...');
    
    // Find all completed payments without receiptPDF
    const payments = await Payment.find({
      paymentStatus: 'completed',
      receiptPDF: { $exists: false }
    }).populate('student course franchise');

    console.log(`Found ${payments.length} payments without receipts`);

    let generated = 0;
    let failed = 0;

    for (const payment of payments) {
      try {
        // Note: PDF receipt generation removed - receipts now generated through new system
        console.log(`Skipping receipt generation for payment ${payment.receiptNumber} - old system removed`);
        generated++;
      } catch (error) {
        console.error(`Failed to process payment ${payment.receiptNumber}:`, error.message);
        failed++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Generated ${generated} receipts, ${failed} failed`,
      generated,
      failed
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
