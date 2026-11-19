const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const Course = require('../models/Course');
const { generateReceipt } = require('../utils/pdfGenerator');

// Load env vars
dotenv.config({ path: __dirname + '/../.env' });

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const generateMissingReceipts = async () => {
  try {
    console.log('Finding payments without receipts...');
    
    // Find all completed payments without receiptPDF
    const payments = await Payment.find({
      paymentStatus: 'completed',
      receiptPDF: { $exists: false }
    }).populate('student course franchise');

    console.log(`Found ${payments.length} payments without receipts`);

    for (const payment of payments) {
      try {
        const receiptData = {
          receiptNumber: payment.receiptNumber,
          studentName: `${payment.student.personalInfo?.firstName || ''} ${payment.student.personalInfo?.lastName || ''}`.trim() || 'N/A',
          courseName: payment.course?.title || 'N/A',
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          paymentDate: payment.paymentDate,
          franchise: payment.franchise?.name || 'N/A'
        };
        
        const { filePath } = await generateReceipt(receiptData);
        payment.receiptPDF = filePath;
        await payment.save();
        
        console.log(`Generated receipt for payment ${payment.receiptNumber}`);
      } catch (error) {
        console.error(`Failed to generate receipt for payment ${payment.receiptNumber}:`, error.message);
      }
    }

    console.log('Receipt generation completed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

generateMissingReceipts();
