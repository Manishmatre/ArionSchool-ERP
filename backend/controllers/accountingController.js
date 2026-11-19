const Transaction = require('../models/Transaction');
const AccountVoucher = require('../models/AccountVoucher');
const Vendor = require('../models/Vendor');
const Franchise = require('../models/SchoolCampus');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

// ==========================================
// 1. CASHBOOK
// ==========================================

exports.getCashbook = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : new Date(new Date().setHours(23, 59, 59, 999));

    const baseQuery = {
      paymentMethod: 'cash',
      status: 'completed'
    };
    if (franchiseId) baseQuery.franchise = franchiseId;

    // Calculate opening balance before start date
    const priorInflows = await Transaction.aggregate([
      { $match: { ...baseQuery, direction: 'inflow', paidAt: { $lt: start } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const priorOutflows = await Transaction.aggregate([
      { $match: { ...baseQuery, direction: 'outflow', paidAt: { $lt: start } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const openingInflow = priorInflows[0]?.total || 0;
    const openingOutflow = priorOutflows[0]?.total || 0;
    const openingBalance = openingInflow - openingOutflow;

    // Period transactions
    const periodQuery = {
      ...baseQuery,
      paidAt: { $gte: start, $lte: end }
    };

    const transactions = await Transaction.find(periodQuery)
      .populate('collectedBy', 'name')
      .sort({ paidAt: 1 });

    let currentBalance = openingBalance;
    const entries = transactions.map((t) => {
      const isReceipt = t.direction === 'inflow';
      const debit = isReceipt ? t.amount : 0;
      const credit = isReceipt ? 0 : t.amount;
      currentBalance = currentBalance + debit - credit;

      return {
        _id: t._id,
        transactionNumber: t.transactionNumber,
        date: t.paidAt,
        receiptNumber: t.receiptNumber,
        category: t.category,
        description: t.description || t.remarks,
        party: t.party,
        debit, // Cash Receipt
        credit, // Cash Payment
        runningBalance: currentBalance
      };
    });

    const totalDebits = entries.reduce((acc, e) => acc + e.debit, 0);
    const totalCredits = entries.reduce((acc, e) => acc + e.credit, 0);
    const closingBalance = currentBalance;

    res.status(200).json({
      success: true,
      startDate: start,
      endDate: end,
      openingBalance,
      totalReceipts: totalDebits,
      totalPayments: totalCredits,
      closingBalance,
      count: entries.length,
      data: entries
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. BANKBOOK
// ==========================================

exports.getBankbook = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : new Date(new Date().setHours(23, 59, 59, 999));

    const baseQuery = {
      paymentMethod: { $in: ['bank_transfer', 'cheque', 'online', 'upi', 'card'] },
      status: 'completed'
    };
    if (franchiseId) baseQuery.franchise = franchiseId;

    // Prior transactions for opening balance
    const priorInflows = await Transaction.aggregate([
      { $match: { ...baseQuery, direction: 'inflow', paidAt: { $lt: start } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const priorOutflows = await Transaction.aggregate([
      { $match: { ...baseQuery, direction: 'outflow', paidAt: { $lt: start } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const openingInflow = priorInflows[0]?.total || 0;
    const openingOutflow = priorOutflows[0]?.total || 0;
    const openingBalance = openingInflow - openingOutflow;

    const transactions = await Transaction.find({
      ...baseQuery,
      paidAt: { $gte: start, $lte: end }
    }).sort({ paidAt: 1 });

    let currentBalance = openingBalance;
    const entries = transactions.map((t) => {
      const isDeposit = t.direction === 'inflow';
      const deposit = isDeposit ? t.amount : 0;
      const withdrawal = isDeposit ? 0 : t.amount;
      currentBalance = currentBalance + deposit - withdrawal;

      return {
        _id: t._id,
        transactionNumber: t.transactionNumber,
        date: t.paidAt,
        paymentMethod: t.paymentMethod,
        bankDetails: t.bankDetails,
        category: t.category,
        party: t.party,
        description: t.description || t.remarks,
        deposit,
        withdrawal,
        runningBalance: currentBalance
      };
    });

    const totalDeposits = entries.reduce((acc, e) => acc + e.deposit, 0);
    const totalWithdrawals = entries.reduce((acc, e) => acc + e.withdrawal, 0);

    res.status(200).json({
      success: true,
      startDate: start,
      endDate: end,
      openingBalance,
      totalDeposits,
      totalWithdrawals,
      closingBalance: currentBalance,
      count: entries.length,
      data: entries
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. TRIAL BALANCE
// ==========================================

exports.getTrialBalance = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = { status: 'completed' };
    if (franchiseId) query.franchise = franchiseId;

    if (req.query.financialYear) {
      const [y1, y2] = req.query.financialYear.split('-');
      if (y1 && y2) {
        query.paidAt = {
          $gte: new Date(`${y1}-04-01`),
          $lte: new Date(`${y2}-03-31T23:59:59.999Z`)
        };
      }
    }

    const categoryAgg = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: { category: '$category', direction: '$direction' },
          total: { $sum: '$amount' }
        }
      }
    ]);

    const accounts = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const item of categoryAgg) {
      const category = item._id.category;
      const direction = item._id.direction;
      const amount = item.total;

      const isOutflowExpense = direction === 'outflow';
      const debit = isOutflowExpense ? amount : 0;
      const credit = isOutflowExpense ? 0 : amount;

      totalDebits += debit;
      totalCredits += credit;

      accounts.push({
        accountName: category.replace(/_/g, ' ').toUpperCase(),
        category,
        direction,
        debit,
        credit
      });
    }

    // Add cash & bank balances as asset debits
    const cashRes = await Transaction.aggregate([
      { $match: { ...query, paymentMethod: 'cash' } },
      { $group: { _id: '$direction', sum: { $sum: '$amount' } } }
    ]);
    const cashIn = cashRes.find((c) => c._id === 'inflow')?.sum || 0;
    const cashOut = cashRes.find((c) => c._id === 'outflow')?.sum || 0;
    const cashOnHand = Math.max(0, cashIn - cashOut);

    res.status(200).json({
      success: true,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 1,
      cashOnHand,
      accounts: accounts.sort((a, b) => a.accountName.localeCompare(b.accountName))
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. INCOME & EXPENDITURE STATEMENT (P&L)
// ==========================================

exports.getIncomeExpenditure = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = { status: 'completed' };
    if (franchiseId) query.franchise = franchiseId;

    if (req.query.startDate && req.query.endDate) {
      query.paidAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(new Date(req.query.endDate).setHours(23, 59, 59, 999))
      };
    }

    const incomeAgg = await Transaction.aggregate([
      { $match: { ...query, direction: 'inflow' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]);

    const expenseAgg = await Transaction.aggregate([
      { $match: { ...query, direction: 'outflow' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]);

    const incomeBreakdown = incomeAgg.map((i) => ({
      category: i._id,
      label: i._id.replace(/_/g, ' ').toUpperCase(),
      amount: i.total
    }));

    const expenseBreakdown = expenseAgg.map((e) => ({
      category: e._id,
      label: e._id.replace(/_/g, ' ').toUpperCase(),
      amount: e.total
    }));

    const totalIncome = incomeBreakdown.reduce((acc, i) => acc + i.amount, 0);
    const totalExpenditure = expenseBreakdown.reduce((acc, e) => acc + e.amount, 0);
    const netSurplus = totalIncome - totalExpenditure;

    res.status(200).json({
      success: true,
      summary: {
        totalIncome,
        totalExpenditure,
        netSurplus,
        isSurplus: netSurplus >= 0
      },
      incomeBreakdown,
      expenseBreakdown
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. VENDORS & VOUCHERS
// ==========================================

exports.getVendors = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }

    const vendors = await Vendor.find(query).sort({ name: 1 });
    res.status(200).json({ success: true, count: vendors.length, data: vendors });
  } catch (error) {
    next(error);
  }
};

exports.createVendor = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const vendor = await Vendor.create({
      ...req.body,
      franchise: franchiseId
    });
    res.status(201).json({ success: true, message: 'Vendor added successfully', data: vendor });
  } catch (error) {
    next(error);
  }
};

exports.getVouchers = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};

    if (req.query.voucherType) query.voucherType = req.query.voucherType;

    const vouchers = await AccountVoucher.find(query)
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    res.status(200).json({ success: true, count: vouchers.length, data: vouchers });
  } catch (error) {
    next(error);
  }
};

exports.createVoucher = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const year = new Date().getFullYear();

    const lastVch = await AccountVoucher.findOne({ voucherNumber: { $regex: `^VCH-${year}-` } })
      .sort({ voucherNumber: -1 })
      .select('voucherNumber');

    let nextSeq = 1;
    if (lastVch && lastVch.voucherNumber) {
      const parts = lastVch.voucherNumber.split('-');
      if (parts.length === 3) nextSeq = parseInt(parts[2], 10) + 1;
    }
    const voucherNumber = `VCH-${year}-${String(nextSeq).padStart(4, '0')}`;

    const voucher = await AccountVoucher.create({
      ...req.body,
      voucherNumber,
      franchise: franchiseId,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Account voucher posted successfully',
      data: voucher
    });
  } catch (error) {
    next(error);
  }
};
