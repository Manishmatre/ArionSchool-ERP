const Payment = require('../models/Payment');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const Student = require('../models/Student');
const Course = require('../models/Course');
const { createOrder, verifyPaymentSignature } = require('../utils/paymentService');
const { sendPaymentReceiptEmail } = require('../utils/emailService');
const { getIO } = require('../utils/socket');
const { syncFromPayment, getFinancialStats } = require('../utils/transactionService');
const { isServerPdfDisabled } = require('../utils/productionSafety');

const syncPaymentLedger = async (payment, studentDoc) => {
  try {
    await syncFromPayment(payment, { student: studentDoc });
  } catch (error) {
    console.error('Transaction ledger sync failed:', error.message);
  }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private (Super Admin / School Admin)
exports.getAllPayments = async (req, res, next) => {
  try {
    let query = {};

    // If school admin, only show their franchise payments
    if (isSchoolTenantUser(req.user)) {
      query.franchise = req.user.franchise;
    }

    // Filter by school
    if (!isSchoolTenantUser(req.user) && req.query.franchise) {
      query.franchise = req.query.franchise;
    }

    // Filter by student
    if (req.query.student) {
      query.student = req.query.student;
    }

    // Filter by status
    if (req.query.status) {
      query.paymentStatus = req.query.status;
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.paymentDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const payments = await Payment.find(query)
      .populate('student', 'studentId personalInfo firstName lastName')
      .populate('franchise', 'name code')
      .populate('course', 'title')
      .populate('collectedBy', 'name')
      .sort('-paymentDate');

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
exports.getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('student')
      .populate('franchise')
      .populate('course')
      .populate('collectedBy', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create payment
// @route   POST /api/payments
// @access  Private (Super Admin / School Admin)
exports.createPayment = async (req, res, next) => {
  try {
    console.log('Received request body:', req.body);
    
    const { 
      student, course, amount, paymentMethod, paymentType, paymentStatus, 
      paymentDate, transactionId, receiptNumber, remarks 
    } = req.body;

    // Get student data
    const studentData = await Student.findById(student).populate('franchise');
    if (!studentData) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Generate receipt number if not provided
    const finalReceiptNumber = receiptNumber || `REC-${Date.now()}`;

    // Create payment record
    const payment = await Payment.create({
      student,
      franchise: studentData.franchise._id,
      course,
      amount,
      paymentMethod,
      paymentType,
      paymentStatus,
      paymentDate: paymentDate || new Date(),
      transactionDetails: transactionId ? { transactionId } : {},
      receiptNumber: finalReceiptNumber,
      description: remarks,
      collectedBy: req.user._id
    });

    await syncPaymentLedger(payment, studentData);

    // Update student fees if payment is completed
    if (paymentStatus === 'completed') {
      // Always update main totals for any payment type
      studentData.fees.paidAmount = (Number(studentData.fees.paidAmount) || 0) + Number(amount);
      studentData.fees.lastPaymentDate = new Date();
      
      // Handle different payment types properly
      if (paymentType === 'course_fee') {
        // Update course fee totals (main totals already updated above)
        studentData.fees.pendingAmount = Math.max(0, (studentData.fees.totalFees || 0) - studentData.fees.paidAmount);
      } else if (paymentType === 'registration') {
        // Update registration fee separately and add to total fees if needed
        studentData.fees.registrationPaid = (Number(studentData.fees.registrationPaid) || 0) + Number(amount);
        studentData.fees.registrationPending = Math.max(0, (studentData.fees.registrationFee || 0) - studentData.fees.registrationPaid);
        
        // Update total fees to include registration fee if not already included
        if (studentData.fees.totalFees < (studentData.fees.registrationFee || 0)) {
          studentData.fees.totalFees = studentData.fees.registrationFee || 0;
        }
        studentData.fees.pendingAmount = Math.max(0, studentData.fees.totalFees - studentData.fees.paidAmount);
      } else if (paymentType === 'exam_fee') {
        // Update exam fee separately and add to total fees
        studentData.fees.examPaid = (Number(studentData.fees.examPaid) || 0) + Number(amount);
        studentData.fees.examPending = Math.max(0, (studentData.fees.examFee || 0) - studentData.fees.examPaid);
        
        // Update total fees to include exam fee if not already included
        if (!studentData.fees.totalFees || studentData.fees.totalFees < (studentData.fees.examFee || 0)) {
          studentData.fees.totalFees = (studentData.fees.totalFees || 0) + (studentData.fees.examFee || 0);
        }
        studentData.fees.pendingAmount = Math.max(0, studentData.fees.totalFees - studentData.fees.paidAmount);
      } else if (paymentType === 'certificate_fee') {
        // Update certificate fee separately and add to total fees
        studentData.fees.certificatePaid = (Number(studentData.fees.certificatePaid) || 0) + Number(amount);
        studentData.fees.certificatePending = Math.max(0, (studentData.fees.certificateFee || 0) - studentData.fees.certificatePaid);
        
        // Update total fees to include certificate fee if not already included
        if (!studentData.fees.totalFees || studentData.fees.totalFees < (studentData.fees.certificateFee || 0)) {
          studentData.fees.totalFees = (studentData.fees.totalFees || 0) + (studentData.fees.certificateFee || 0);
        }
        studentData.fees.pendingAmount = Math.max(0, studentData.fees.totalFees - studentData.fees.paidAmount);
      } else if (paymentType === 'installment') {
        // Update installment payments (main totals already updated above)
        studentData.fees.pendingAmount = Math.max(0, (studentData.fees.totalFees || 0) - studentData.fees.paidAmount);
      } else {
        // For 'other' payment types, update general totals (main totals already updated above)
        studentData.fees.pendingAmount = Math.max(0, (studentData.fees.totalFees || 0) - studentData.fees.paidAmount);
      }
      
      await studentData.save();
      
      // Note: PDF receipt generation removed - receipts now generated through new system
    }

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create offline payment
// @route   POST /api/payments/offline
// @access  Private (Super Admin / School Admin)
exports.createOfflinePayment = async (req, res, next) => {
  try {
    const { studentId, amount, paymentMethod, paymentType, description } = req.body;

    const student = await Student.findById(studentId)
      .populate('franchise')
      .populate('enrolledCourses.course');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Create payment record
    const payment = await Payment.create({
      student: studentId,
      franchise: student.franchise._id,
      course: student.enrolledCourses[0]?.course._id,
      amount,
      paymentMethod,
      paymentType,
      description,
      paymentStatus: 'completed',
      collectedBy: req.user._id,
      paymentDate: new Date()
    });

    // Update student fees
    student.fees.paidAmount = (Number(student.fees.paidAmount) || 0) + Number(amount);
    student.fees.pendingAmount = student.fees.totalFees - student.fees.paidAmount;
    student.fees.lastPaymentDate = new Date();
    await student.save();

    await syncPaymentLedger(payment, student);

    // Note: PDF receipt generation removed - receipts now generated through new system

    // Send email with receipt
    await sendPaymentReceiptEmail(student, payment);

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create online payment order
// @route   POST /api/payments/create-order
// @access  Private (Student)
exports.createPaymentOrder = async (req, res, next) => {
  try {
    const { amount, studentId, courseId } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Generate receipt number for order
    const count = await Payment.countDocuments();
    const receiptNumber = `RCP${new Date().getFullYear()}${String(count + 1).padStart(6, '0')}`;

    // Create Razorpay order
    const order = await createOrder(amount, 'INR', receiptNumber);

    // Create pending payment record
    const payment = await Payment.create({
      student: studentId,
      franchise: student.franchise,
      course: courseId,
      receiptNumber,
      amount,
      paymentMethod: 'online',
      paymentType: 'course_fee',
      paymentStatus: 'pending',
      transactionDetails: {
        razorpayOrderId: order.id
      }
    });

    await syncPaymentLedger(payment);

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentId: payment._id,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify online payment
// @route   POST /api/payments/verify
// @access  Private (Student)
exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderId, paymentId, signature, paymentRecordId } = req.body;

    // Verify signature
    const isValid = verifyPaymentSignature(orderId, paymentId, signature);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Update payment record
    const payment = await Payment.findById(paymentRecordId)
      .populate('student')
      .populate('franchise')
      .populate('course');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    payment.paymentStatus = 'completed';
    if (!payment.transactionDetails) payment.transactionDetails = {};
    payment.transactionDetails.razorpayOrderId = orderId;
    payment.transactionDetails.razorpayPaymentId = paymentId;
    payment.transactionDetails.razorpaySignature = signature;
    payment.paymentDate = new Date();
    await payment.save();

    // Emit real-time payment update
    const io = getIO();
    io.emit('payment-verified', {
      message: `Payment of ₹${payment.amount} received for ${payment.course?.title || 'course'}`,
      payment: payment,
      studentId: payment.student._id,
      timestamp: new Date()
    });

    const student = await Student.findById(payment.student._id);
    await syncPaymentLedger(payment, student);

    // Update student fees
    student.fees.paidAmount = (Number(student.fees.paidAmount) || 0) + Number(payment.amount);
    student.fees.pendingAmount = student.fees.totalFees - student.fees.paidAmount;
    student.fees.lastPaymentDate = new Date();
    await student.save();

    // Generate receipt PDF
    const receiptData = {
      receiptNumber: payment.receiptNumber,
      studentName: payment.student.fullName,
      courseName: payment.course?.title || 'N/A',
      amount: payment.amount,
      paymentMethod: 'Online',
      paymentDate: payment.paymentDate,
      franchise: payment.franchise.name
    };

    // Note: PDF receipt generation removed - receipts now generated through new system

    // Send email with receipt
    await sendPaymentReceiptEmail(payment.student, payment);

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student payment history
// @route   GET /api/payments/student/:studentId
// @access  Private
exports.getStudentPayments = async (req, res, next) => {
  try {
    // If the studentId is a User ID (from auth), find the corresponding Student document
    let studentId = req.params.studentId;
    
    // Check if the provided ID is a User ID by looking for a Student document with this user reference
    const student = await Student.findOne({ user: studentId });
    if (student) {
      studentId = student._id; // Use the Student document ID instead
    }
    
    const payments = await Payment.find({ student: studentId })
      .populate('course', 'title')
      .populate('franchise', 'name')
      .sort('-paymentDate');

    const totalPaid = payments
      .filter(p => p.paymentStatus === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      count: payments.length,
      totalPaid,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download payment receipt
// @route   GET /api/payments/:id/receipt
// @access  Private
exports.downloadReceipt = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('student', 'firstName lastName studentId personalInfo')
      .populate('course', 'title')
      .populate('franchise', 'name address');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Get pending balance details for the student
    const pendingPayments = await Payment.find({
      student: payment.student._id,
      paymentStatus: 'pending',
      _id: { $ne: payment._id } // Exclude current payment from pending list
    }).populate('course', 'title');

    const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Payment Receipt</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .receipt-info { margin: 20px 0; }
        .receipt-info div { margin: 10px 0; }
        .footer { margin-top: 40px; text-align: center; color: #666; }
        @media print {
            body { margin: 20px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Payment Receipt</h1>
        <p>Receipt Number: ${payment.receiptNumber}</p>
        <p><strong>Franchise:</strong> ${payment.franchise?.name || 'N/A'}</p>
    </div>
    <div class="receipt-info">
        <div><strong>Student Name:</strong> ${payment.student?.personalInfo?.firstName || 'N/A'} ${payment.student?.personalInfo?.lastName || ''}</div>
        <div><strong>Student ID:</strong> ${payment.student?.studentId || 'N/A'}</div>
        <div><strong>Course:</strong> ${payment.course?.title || 'N/A'}</div>
        <div><strong>Amount:</strong> ₹${payment.amount}</div>
        <div><strong>Payment Method:</strong> ${payment.paymentMethod}</div>
        <div><strong>Payment Type:</strong> ${payment.paymentType}</div>
        <div><strong>Payment Date:</strong> ${new Date(payment.paymentDate).toLocaleDateString()}</div>
        <div><strong>Status:</strong> ${payment.paymentStatus}</div>
        ${payment.description ? `<div><strong>Description:</strong> ${payment.description}</div>` : ''}
    </div>
    
    ${totalPending > 0 ? `
    <div class="pending-balance" style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
        <h3 style="color: #856404; margin-bottom: 15px;">Pending Balance Details</h3>
        <div><strong>Total Pending Amount:</strong> ₹${totalPending}</div>
        <div><strong>Number of Pending Payments:</strong> ${pendingPayments.length}</div>
        ${pendingPayments.length > 0 ? `
            <div style="margin-top: 10px;">
                <strong>Pending Payment Breakdown:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    ${pendingPayments.map(p => `
                        <li>${p.course?.title || 'N/A'} - ₹${p.amount} (${p.paymentType})</li>
                    `).join('')}
                </ul>
            </div>
        ` : ''}
    </div>
    ` : ''}
    <div class="footer">
        <p>This is a computer-generated receipt. No signature required.</p>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
    </div>
</body>
</html>`;

    // Server-side PDF generation guarded to reduce CPU usage on small VPS
    if (isServerPdfDisabled()) {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename=receipt-${payment.receiptNumber}.html`);
      return res.send(receiptHTML);
    }

    // Generate PDF
    const pdf = require('html-pdf');
    pdf.create(receiptHTML, {
        format: 'A4',
        orientation: 'portrait',
        border: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
        }
    }).toBuffer((err, buffer) => {
      if (err) {
        console.error('PDF generation error:', err);
        return next(err);
      }
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.receiptNumber}.pdf`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Private (Super Admin / School Admin)
exports.getPaymentStats = async (req, res, next) => {
  try {
    let query = {};

    if (isSchoolTenantUser(req.user)) {
      query.franchise = req.user.franchise;
    }

    const franchiseFilter = isSchoolTenantUser(req.user)
      ? { franchise: req.user.franchise }
      : (req.query.franchise ? { franchise: req.query.franchise } : {});

    const financialStats = await getFinancialStats(franchiseFilter);

    const totalPayments = await Payment.countDocuments({ ...query, paymentStatus: 'completed' });
    
    // Calculate total revenue: sum of completed payments minus refunded payments
    const completedRevenue = await Payment.aggregate([
      { $match: { ...query, paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const refundedAmount = await Payment.aggregate([
      { $match: { ...query, paymentStatus: 'refunded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalRevenue = (completedRevenue[0]?.total || 0) - (refundedAmount[0]?.total || 0);

    const pendingPayments = await Payment.countDocuments({ ...query, paymentStatus: 'pending' });
    const failedPayments = await Payment.countDocuments({ ...query, paymentStatus: 'failed' });
    const refundedPayments = await Payment.countDocuments({ ...query, paymentStatus: 'refunded' });

    // Monthly revenue
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          ...query,
          paymentStatus: 'completed',
          paymentDate: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
        }
      },
      {
        $group: {
          _id: { $month: '$paymentDate' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPayments,
        totalRevenue,
        pendingPayments,
        failedPayments,
        refundedPayments,
        monthlyRevenue,
        ledger: financialStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private (Super Admin / School Admin)
exports.updatePayment = async (req, res, next) => {
  try {
    let payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check ownership for school admin
    if (isSchoolTenantUser(req.user) && payment.franchise.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({
        success: false,
        message: 'User not authorized to update this payment'
      });
    }

    // Note: Re-adjusting student fee balances on update can be complex.
    // For simplicity, this example updates the payment record directly.
    // A more robust implementation would handle fee adjustments.

    payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    await syncPaymentLedger(payment);

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Private (Super Admin / School Admin)
exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check ownership for school admin
    if (isSchoolTenantUser(req.user) && payment.franchise.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({
        success: false,
        message: 'User not authorized to delete this payment'
      });
    }

    // If payment was completed, adjust student's fee balance back
    if (payment.paymentStatus === 'completed') {
      const student = await Student.findById(payment.student);
      if (student) {
        student.fees.paidAmount = (student.fees.paidAmount || 0) - payment.amount;
        student.fees.pendingAmount = student.fees.totalFees - student.fees.paidAmount;
        await student.save();
      }
    }

    const Transaction = require('../models/Transaction');
    await Transaction.updateMany(
      { 'references.payment': payment._id },
      { status: 'cancelled' }
    );

    await payment.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Record partial payment on existing payment
// @route   PUT /api/payments/:id/partial-payment
// @access  Private (Super Admin / School Admin)
exports.recordPartialPayment = async (req, res, next) => {
  try {
    const { amount, paymentMethod, transactionId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount is required'
      });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check authorization
    if (isSchoolTenantUser(req.user) && payment.franchise.toString() !== req.user.franchise.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this payment'
      });
    }

    // Only allow partial payments on pending payments
    if (payment.paymentStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only record partial payments on pending payments'
      });
    }

    // Check if partial payment amount exceeds the original amount
    if (amount > payment.amount) {
      return res.status(400).json({
        success: false,
        message: 'Partial payment amount cannot exceed the original payment amount'
      });
    }

    // Generate receipt number
    const generateReceiptNumber = () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `REC-${year}${month}-${random}`;
    };

    // For partial payment, we SHOULD create a new completed payment record
    // and reduce the amount of the pending one.
    const remainingAmount = payment.amount - amount;
    
    // 1. Create a NEW completed payment record for the amount just paid
    const newPayment = await Payment.create({
      student: payment.student,
      franchise: payment.franchise,
      course: payment.course,
      amount: amount,
      paymentMethod: paymentMethod || payment.paymentMethod,
      paymentType: payment.paymentType,
      paymentStatus: 'completed',
      paymentDate: new Date(),
      transactionDetails: transactionId ? { transactionId } : {},
      receiptNumber: generateReceiptNumber(),
      description: `Partial payment for ${payment.description || 'course fee'}`,
      collectedBy: req.user._id
    });

    await syncPaymentLedger(newPayment);

    if (remainingAmount > 0) {
      payment.amount = remainingAmount;
      payment.description = payment.description || '';
      if (!payment.description.includes('Remaining balance')) {
        payment.description = `Remaining balance - ${payment.description}`;
      }
      await payment.save();
      await syncPaymentLedger(payment);
    } else {
      const Transaction = require('../models/Transaction');
      await Transaction.updateMany(
        { 'references.payment': payment._id },
        { status: 'cancelled' }
      );
      await payment.deleteOne();
    }

    // Update student's fee information
    const student = await Student.findById(payment.student);
    if (student) {
      student.fees.paidAmount = (Number(student.fees.paidAmount) || 0) + Number(amount);
      // Re-calculate pending amount from total
      student.fees.pendingAmount = Math.max(0, (Number(student.fees.totalFees) || 0) - student.fees.paidAmount);
      student.fees.lastPaymentDate = new Date();

      // Update specific fee type paid amounts if possible
      if (payment.paymentType === 'registration') {
        student.fees.registrationPaid = (Number(student.fees.registrationPaid) || 0) + Number(amount);
      } else if (payment.paymentType === 'exam_fee') {
        student.fees.examPaid = (Number(student.fees.examPaid) || 0) + Number(amount);
      } else if (payment.paymentType === 'certificate_fee') {
        student.fees.certificatePaid = (Number(student.fees.certificatePaid) || 0) + Number(amount);
      }
      
      await student.save();
    }

    res.status(200).json({
      success: true,
      message: remainingAmount > 0 ? 'Partial payment recorded successfully' : 'Payment completed successfully',
      data: newPayment
    });
  } catch (error) {
    next(error);
  }
};
