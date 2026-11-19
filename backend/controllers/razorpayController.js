const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const SchoolFeeReceipt = require('../models/SchoolFeeReceipt');
const FeeObligation = require('../models/FeeObligation');
const Student = require('../models/Student');
const Franchise = require('../models/SchoolCampus');

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured in backend environment');
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
};

const recordId = (value) => value?._id?.toString() || value?.toString() || '';

const ensureCanPayStudentFees = (req, student) => {
  if (!student) return { status: 404, message: 'Student not found' };
  const role = req.user?.role;
  if (['super_admin', 'school_owner'].includes(role)) return null;

  if (role === 'student') {
    return recordId(student.user) === recordId(req.user._id)
      ? null
      : { status: 403, message: 'You can only pay fees for your own student account.' };
  }

  if (role === 'parent') {
    const linkedByRecord = recordId(student.parent) === recordId(req.user._id)
      || (Array.isArray(req.user.linkedStudents) && req.user.linkedStudents.some((id) => recordId(id) === recordId(student)));
    const linkedByGuardianPhone = Boolean(req.user.mobile && (
      student.guardianInfo?.mobile === req.user.mobile || student.contactInfo?.mobile === req.user.mobile
    ));
    return linkedByRecord || linkedByGuardianPhone
      ? null
      : { status: 403, message: 'You are not authorized to pay fees for this student.' };
  }

  if (['school_admin', 'franchise_admin', 'principal', 'vice_principal', 'accountant'].includes(role)) {
    return recordId(student.franchise) === recordId(req.user.franchise)
      ? null
      : { status: 403, message: 'Student is outside your school campus.' };
  }

  return { status: 403, message: 'This account cannot initiate school fee payments.' };
};

// 1. Get Public Configuration for Frontend Checkout
exports.getPublicConfig = async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const mode = process.env.RAZORPAY_MODE || 'test';
    res.status(200).json({
      success: true,
      data: {
        keyId,
        mode,
        currency: 'INR',
        configured: Boolean(keyId && process.env.RAZORPAY_KEY_SECRET)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve Razorpay public configuration' });
  }
};

// 2. Create Razorpay Order
exports.createOrder = async (req, res) => {
  try {
    const { studentId, obligationId, amount, notes = {} } = req.body;

    const requestedAmount = Number(amount);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'A valid payment amount is required' });
    }

    let student = null;
    if (studentId) {
      student = await Student.findById(studentId);
    } else if (req.user.studentId) {
      student = await Student.findOne({ studentId: req.user.studentId });
    }

    const accessError = ensureCanPayStudentFees(req, student);
    if (accessError) return res.status(accessError.status).json({ success: false, message: accessError.message });

    // Validate obligation ownership and balance if an installment is selected.
    let obligation = null;
    if (obligationId) {
      obligation = await FeeObligation.findById(obligationId);
      if (!obligation || recordId(obligation.student) !== recordId(student)) {
        return res.status(404).json({ success: false, message: 'Fee obligation was not found for this student.' });
      }
      if (requestedAmount > obligation.amountPending) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (INR ${requestedAmount}) exceeds outstanding balance (INR ${obligation.amountPending})`
        });
      }
    } else {
      const openObligations = await FeeObligation.find({ student: student._id, amountPending: { $gt: 0 } }).select('amountPending').lean();
      const obligationBalance = openObligations.reduce((total, item) => total + Number(item.amountPending || 0), 0);
      const maxPending = openObligations.length
        ? obligationBalance
        : Number(student.fees?.pendingAmount ?? Math.max(0, (student.fees?.totalFees || 0) - (student.fees?.paidAmount || 0)));
      if (requestedAmount > maxPending) {
        return res.status(400).json({ success: false, message: 'Payment amount exceeds the student’s outstanding fee balance.' });
      }
    }

    const rzp = getRazorpayInstance();
    const amountInPaise = Math.round(requestedAmount * 100);
    const receiptShort = `ord_${Date.now().toString().slice(-8)}`;

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptShort,
      notes: {
        ...notes,
        studentId: student?._id?.toString() || studentId || '',
        obligationId: obligationId || '',
        studentName: student ? `${student.personalInfo?.firstName} ${student.personalInfo?.lastName}` : '',
        purpose: notes.purpose || 'School Fee Payment'
      }
    };

    const order = await rzp.orders.create(options);

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        keyId: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('[Razorpay Create Order Error]:', error);
    const msg = error.error?.description || error.message || 'Failed to create Razorpay payment order';
    res.status(500).json({
      success: false,
      message: msg.includes('Authentication failed')
        ? 'Razorpay Gateway Authentication Failed: Please check RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in server settings.'
        : msg
    });
  }
};

// 3. Verify Payment Signature & Process Receipt
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      studentId,
      obligationId,
      amount,
      breakdown,
      notes = {}
    } = req.body;

    const requestedAmount = Number(amount);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'A valid payment amount is required.' });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, Payment ID, and Signature are required for payment verification'
      });
    }

    // 1. Cryptographic Signature Verification
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const bodyToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyToSign)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Cryptographic signature mismatch: payment verification failed.'
      });
    }

    const razorpay = getRazorpayInstance();
    const [gatewayOrder, gatewayPayment] = await Promise.all([
      razorpay.orders.fetch(razorpay_order_id),
      razorpay.payments.fetch(razorpay_payment_id)
    ]);
    if (
      gatewayPayment.order_id !== razorpay_order_id
      || gatewayOrder.notes?.studentId !== recordId(studentId)
      || (gatewayOrder.notes?.obligationId || '') !== (obligationId || '')
      || gatewayOrder.currency !== 'INR'
      || gatewayPayment.currency !== 'INR'
      || gatewayPayment.status !== 'captured'
      || Number(gatewayPayment.amount) !== Number(gatewayOrder.amount)
      || Math.round(requestedAmount * 100) !== Number(gatewayPayment.amount)
    ) {
      return res.status(400).json({ success: false, message: 'Gateway payment amount or capture status could not be verified.' });
    }

    // 2. Prevent Duplicate Processing (Idempotency)
    const existingPayment = await Payment.findOne({
      'transactionDetails.razorpayPaymentId': razorpay_payment_id,
      paymentStatus: 'completed'
    });

    if (existingPayment) {
      return res.status(200).json({
        success: true,
        message: 'Payment already processed and verified',
        data: {
          paymentId: existingPayment._id,
          receiptNumber: existingPayment.receiptNumber
        }
      });
    }

    // 3. Resolve Student and Campus
    let student = null;
    if (studentId) {
      student = await Student.findById(studentId);
    }
    const accessError = ensureCanPayStudentFees(req, student);
    if (accessError) return res.status(accessError.status).json({ success: false, message: accessError.message });
    const franchiseId = student?.franchise || req.user.franchise || (await Franchise.findOne({ status: 'active' }))?._id;

    // 4. Update Fee Obligation if provided
    let obligation = null;
    if (obligationId) {
      obligation = await FeeObligation.findById(obligationId);
      if (!obligation || recordId(obligation.student) !== recordId(student)) {
        return res.status(404).json({ success: false, message: 'Fee obligation was not found for this student.' });
      }
      if (requestedAmount > Number(obligation.amountPending)) {
        return res.status(400).json({ success: false, message: 'Payment amount exceeds the current outstanding obligation balance.' });
      }
      obligation.amountPaid = (obligation.amountPaid || 0) + requestedAmount;
      obligation.recalculate();
      await obligation.save();
    } else {
      const openObligations = await FeeObligation.find({ student: student._id, amountPending: { $gt: 0 } }).sort({ dueDate: 1, createdAt: 1 });
      const obligationBalance = openObligations.reduce((total, item) => total + Number(item.amountPending || 0), 0);
      if (openObligations.length && requestedAmount > obligationBalance) {
        return res.status(400).json({ success: false, message: 'Payment amount exceeds the current outstanding fee balance.' });
      }
      if (openObligations.length) {
        let remaining = requestedAmount;
        for (const item of openObligations) {
          if (remaining <= 0) break;
          const applied = Math.min(remaining, Number(item.amountPending || 0));
          item.amountPaid = (item.amountPaid || 0) + applied;
          item.recalculate();
          await item.save();
          remaining = Math.round((remaining - applied) * 100) / 100;
        }
      } else {
        student.fees = student.fees || {};
        student.fees.paidAmount = Number(student.fees.paidAmount || 0) + requestedAmount;
        student.fees.pendingAmount = Math.max(0, Number(student.fees.totalFees || 0) - student.fees.paidAmount);
        await student.save();
      }
    }

    // 5. Generate Official Unique School Fee Receipt
    const year = new Date().getFullYear();
    const countReceipts = await SchoolFeeReceipt.countDocuments();
    const uniqueReceiptNumber = `SFR-${year}-${String(countReceipts + 1).padStart(6, '0')}`;

    const receiptBreakdown = [{ component: obligation?.component || 'total', amount: requestedAmount }];

    const feeReceipt = await SchoolFeeReceipt.create({
      receiptNumber: uniqueReceiptNumber,
      student: student?._id || studentId,
      franchise: franchiseId,
      amount: requestedAmount,
      paymentMethod: 'online',
      gatewayPaymentId: razorpay_payment_id,
      breakdown: receiptBreakdown,
      paidAt: new Date(),
      collectedBy: req.user._id,
      remarks: notes.remarks || `Online payment via Razorpay (${razorpay_payment_id})`
    });

    // 6. Record Payment Transaction
    const paymentRecord = await Payment.create({
      student: student?._id || studentId,
      franchise: franchiseId,
      receiptNumber: uniqueReceiptNumber,
      amount: requestedAmount,
      paymentMethod: 'online',
      paymentType: 'installment',
      paymentStatus: 'completed',
      transactionDetails: {
        transactionId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature
      },
      description: `Online School Fee Payment [${razorpay_order_id}]`,
      collectedBy: req.user._id,
      paymentDate: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and official receipt generated successfully',
      data: {
        receiptNumber: uniqueReceiptNumber,
        receiptId: feeReceipt._id,
        paymentId: paymentRecord._id,
        amount: Number(amount),
        status: 'completed',
        date: new Date()
      }
    });
  } catch (error) {
    console.error('[Razorpay Verify Payment Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment verification encountered an internal error'
    });
  }
};

// 4. Handle Razorpay Webhook Events
exports.handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!webhookSecret || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay webhook secret or signature missing'
      });
    }

    // Verify webhook signature with raw payload
    const rawPayload = req.rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('[Razorpay Webhook Warning]: Signature verification failed');
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`[Razorpay Webhook Received]: ${event}`);

    switch (event) {
      case 'payment.captured': {
        const paymentEntity = payload.payment?.entity;
        if (paymentEntity) {
          const paymentId = paymentEntity.id;
          const orderId = paymentEntity.order_id;
          // Check if already recorded
          const existing = await Payment.findOne({
            'transactionDetails.razorpayPaymentId': paymentId
          });
          if (existing && existing.paymentStatus !== 'completed') {
            existing.paymentStatus = 'completed';
            await existing.save();
          }
        }
        break;
      }

      case 'payment.failed': {
        const paymentEntity = payload.payment?.entity;
        if (paymentEntity) {
          console.log(`[Razorpay Webhook]: Payment ${paymentEntity.id} failed: ${paymentEntity.error_description}`);
        }
        break;
      }

      case 'refund.processed': {
        const refundEntity = payload.refund?.entity;
        if (refundEntity) {
          const paymentId = refundEntity.payment_id;
          const payment = await Payment.findOne({
            'transactionDetails.razorpayPaymentId': paymentId
          });
          if (payment) {
            payment.paymentStatus = 'refunded';
            await payment.save();
          }
        }
        break;
      }

      default:
        // Acknowledge other events gracefully
        break;
    }

    res.status(200).json({ status: 'ok', event });
  } catch (error) {
    console.error('[Razorpay Webhook Error]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 5. Razorpay Transaction History & Monitoring
exports.getTransactions = async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const query = {
      paymentMethod: 'online',
      'transactionDetails.razorpayOrderId': { $exists: true }
    };

    if (status) query.paymentStatus = status;
    if (req.user.franchise && !['super_admin', 'school_owner'].includes(req.user.role)) {
      query.franchise = req.user.franchise;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const transactions = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('student', 'personalInfo admissionNumber studentId')
      .populate('collectedBy', 'name email');

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve transactions' });
  }
};

// 6. Admin Configuration & Gateway Health
exports.getAdminConfig = async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const maskedKeyId = keyId ? `${keyId.substring(0, 8)}...${keyId.slice(-4)}` : '';
    const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
    const hasWebhookSecret = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
    const mode = process.env.RAZORPAY_MODE || 'test';

    // Compute online transaction metrics
    const totalTransactions = await Payment.countDocuments({ paymentMethod: 'online' });
    const successful = await Payment.countDocuments({ paymentMethod: 'online', paymentStatus: 'completed' });
    const failed = await Payment.countDocuments({ paymentMethod: 'online', paymentStatus: 'failed' });

    res.status(200).json({
      success: true,
      data: {
        keyId: maskedKeyId,
        hasKeyId: Boolean(keyId),
        hasSecret,
        hasWebhookSecret,
        mode,
        webhookUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/razorpay/webhook`,
        stats: {
          total: totalTransactions,
          successful,
          failed
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve Razorpay admin configuration' });
  }
};
