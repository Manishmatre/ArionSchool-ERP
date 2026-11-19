const Transaction = require('../models/Transaction');
const { isSchoolTenantUser } = require('../utils/tenantAccess');
const Payment = require('../models/Payment');
const ExpenseCategory = require('../models/ExpenseCategory');
const {
  getFinancialStats,
  syncFromPayment,
  paymentToTransactionView,
  allocateInflowToObligations,
  generateTransactionNumber
} = require('../utils/transactionService');

const buildFranchiseFilter = (req) => {
  if (isSchoolTenantUser(req.user)) {
    return { franchise: req.user.franchise };
  }
  if (req.query.franchise) {
    return { franchise: req.query.franchise };
  }
  return {};
};

exports.getExpenseCategories = async (req, res, next) => {
  try {
    const scope = isSchoolTenantUser(req.user)
      ? { $or: [{ franchise: null }, { franchise: req.user.franchise }] }
      : { franchise: null };
    const categories = await ExpenseCategory.find({ active: true, ...scope }).sort('name').lean();
    res.status(200).json({ success: true, data: categories });
  } catch (error) { next(error); }
};

exports.createExpenseCategory = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name || name.length > 60) return res.status(400).json({ success: false, message: 'Category name must be 1–60 characters.' });
    const key = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const franchise = isSchoolTenantUser(req.user) ? req.user.franchise : null;
    const category = await ExpenseCategory.create({ name, key, franchise });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'That expense category already exists.' });
    next(error);
  }
};

exports.deleteExpenseCategory = async (req, res, next) => {
  try {
    const scope = isSchoolTenantUser(req.user) ? { franchise: req.user.franchise } : { franchise: null };
    const category = await ExpenseCategory.findOneAndUpdate({ _id: req.params.id, ...scope }, { active: false }, { new: true });
    if (!category) return res.status(404).json({ success: false, message: 'Expense category not found.' });
    res.status(200).json({ success: true, data: category });
  } catch (error) { next(error); }
};

exports.getAllTransactions = async (req, res, next) => {
  try {
    const query = { ...buildFranchiseFilter(req) };

    if (req.query.direction) query.direction = req.query.direction;
    if (req.query.category) query.category = req.query.category;
    if (req.query.status) query.status = req.query.status;
    if (req.query.student) query['references.student'] = req.query.student;
    if (req.query.staff) query['references.staff'] = req.query.staff;

    if (req.query.startDate && req.query.endDate) {
      query.paidAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const paginationRequested = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(20, Math.max(10, Number.parseInt(req.query.limit, 10) || 10));
    const transactionQuery = Transaction.find(query)
      .populate('franchise', 'name code')
      .populate('references.student', 'studentId personalInfo')
      .populate('references.course', 'title')
      .populate('references.staff', 'staffId personalInfo')
      .populate('collectedBy', 'name')
      .populate('paidBy', 'name')
      .sort('-paidAt -createdAt');
    if (paginationRequested) {
      transactionQuery.skip((page - 1) * limit).limit(limit);
    }
    const [transactions, total] = await Promise.all([
      transactionQuery,
      paginationRequested ? Transaction.countDocuments(query) : Promise.resolve(null)
    ]);

    res.status(200).json({
      success: true,
      count: paginationRequested ? total : transactions.length,
      data: transactions,
      ...(paginationRequested ? {
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      } : {})
    });
  } catch (error) {
    next(error);
  }
};

exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('franchise')
      .populate('references.student')
      .populate('references.course')
      .populate('references.staff')
      .populate('references.payment')
      .populate('collectedBy', 'name email')
      .populate('paidBy', 'name email');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

exports.getTransactionStats = async (req, res, next) => {
  try {
    const stats = await getFinancialStats(buildFranchiseFilter(req));
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

exports.createTransaction = async (req, res, next) => {
  try {
    const {
      direction,
      category,
      amount,
      franchise,
      party,
      references,
      paymentMethod,
      status,
      description,
      remarks,
      dueDate,
      paidAt,
      bankDetails
    } = req.body;

    const transaction = await Transaction.create({
      transactionNumber: await generateTransactionNumber(),
      direction,
      category,
      amount,
      franchise,
      party,
      references,
      paymentMethod: paymentMethod || 'cash',
      status: status || 'completed',
      description,
      remarks,
      dueDate,
      paidAt: paidAt || (status === 'completed' ? new Date() : undefined),
      bankDetails,
      collectedBy: direction === 'inflow' ? req.user._id : undefined,
      paidBy: direction === 'outflow' ? req.user._id : undefined
    });

    if (transaction.direction === 'inflow' && transaction.status === 'completed') {
      await allocateInflowToObligations(transaction);
    }

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

exports.getUnifiedPaymentHistory = async (req, res, next) => {
  try {
    const Student = require('../models/Student');
    const franchiseFilter = buildFranchiseFilter(req);
    let studentId = req.query.student;

    if (req.user.role === 'student') {
      const ownProfile = await Student.findOne({ user: req.user._id });
      if (!ownProfile) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
      }
      studentId = ownProfile._id;
    } else if (studentId) {
      const student = await Student.findOne({ user: studentId });
      if (student) studentId = student._id;
    }

    const txQuery = { ...franchiseFilter, direction: 'inflow' };
    if (studentId) txQuery['references.student'] = studentId;

    const [transactions, legacyPayments] = await Promise.all([
      Transaction.find(txQuery)
        .populate('references.student', 'studentId personalInfo')
        .populate('references.course', 'title')
        .sort('-paidAt -createdAt'),
      Payment.find({
        ...franchiseFilter,
        ...(studentId ? { student: studentId } : {})
      })
        .populate('student', 'studentId personalInfo')
        .populate('course', 'title')
        .sort('-paymentDate')
    ]);

    const syncedPaymentIds = new Set(
      transactions
        .map((t) => t.references?.payment?.toString())
        .filter(Boolean)
    );

    const merged = [
      ...transactions.map((t) => ({ ...t.toObject(), source: 'transaction' })),
      ...legacyPayments
        .filter((p) => !syncedPaymentIds.has(p._id.toString()))
        .map((p) => ({ ...paymentToTransactionView(p), source: 'legacy_payment' }))
    ].sort((a, b) => new Date(b.paidAt || b.paymentDate || b.createdAt) - new Date(a.paidAt || a.paymentDate || a.createdAt));

    const totalPaid = merged
      .filter((t) => (t.status || t.paymentStatus) === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    res.status(200).json({
      success: true,
      count: merged.length,
      totalPaid,
      data: merged
    });
  } catch (error) {
    next(error);
  }
};

exports.syncPaymentToTransaction = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const transaction = await syncFromPayment(payment);
    res.status(200).json({
      success: true,
      message: 'Payment synced to transaction ledger',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

const assertFranchiseAccess = (req, transaction) => {
  if (
    isSchoolTenantUser(req.user) &&
    transaction.franchise?.toString() !== req.user.franchise?.toString()
  ) {
    const err = new Error('Not authorized for this transaction');
    err.statusCode = 403;
    throw err;
  }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    assertFranchiseAccess(req, transaction);

    if (transaction.references?.payment) {
      return res.status(400).json({
        success: false,
        message: 'This transaction is linked to a payment. Edit the payment record instead.'
      });
    }

    const allowed = [
      'category', 'amount', 'status', 'description', 'remarks',
      'paymentMethod', 'dueDate', 'paidAt', 'bankDetails', 'party'
    ];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) transaction[field] = req.body[field];
    });

    if (req.body.status === 'completed' && !transaction.paidAt) {
      transaction.paidAt = new Date();
    }

    await transaction.save();

    if (transaction.direction === 'inflow' && transaction.status === 'completed') {
      await allocateInflowToObligations(transaction);
    }

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    assertFranchiseAccess(req, transaction);

    if (transaction.references?.payment) {
      return res.status(400).json({
        success: false,
        message: 'This transaction is linked to a payment. Delete the payment record instead.'
      });
    }

    transaction.status = 'cancelled';
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Transaction cancelled successfully',
      data: transaction
    });
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};
