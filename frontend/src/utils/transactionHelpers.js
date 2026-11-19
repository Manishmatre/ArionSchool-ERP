export const CATEGORY_TO_PAYMENT_TYPE = {
  student_registration: 'registration',
  student_course_fee: 'course_fee',
  student_installment: 'installment',
  student_exam_fee: 'exam_fee',
  student_certificate_fee: 'certificate_fee',
  student_other: 'other'
};

export const PAYMENT_TYPE_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_TO_PAYMENT_TYPE).map(([k, v]) => [v, k])
);

export const formatCurrency = (amount) =>
  `₹${(amount || 0).toLocaleString('en-IN')}`;

export const categoryToPaymentType = (category) =>
  CATEGORY_TO_PAYMENT_TYPE[category] || 'other';

export const paymentTypeToCategory = (paymentType) =>
  PAYMENT_TYPE_TO_CATEGORY[paymentType] || 'student_other';

export const categoryLabel = (category) =>
  (category || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Normalize ledger transaction or legacy payment into a unified row for tables */
export const normalizeInflowRecord = (row) => {
  if (!row) return null;

  const isLegacy = row.isLegacyPayment || row.source === 'legacy_payment' || row.paymentType;

  if (isLegacy) {
    return {
      _id: row.references?.payment || row._id,
      ledgerId: row.transactionId,
      receiptNumber: row.receiptNumber || row.transactionNumber,
      student: row.student || row.references?.student,
      course: row.course || row.references?.course,
      amount: row.amount,
      paymentMethod: row.paymentMethod,
      paymentType: row.paymentType || categoryToPaymentType(row.category),
      category: row.category || paymentTypeToCategory(row.paymentType),
      paymentStatus: row.paymentStatus || row.status,
      paymentDate: row.paymentDate || row.paidAt || row.createdAt,
      dueDate: row.dueDate,
      description: row.description,
      isLedger: Boolean(row.transactionNumber?.startsWith?.('TXN'))
    };
  }

  const paymentRef = row.references?.payment;
  const paymentId =
    paymentRef?._id || paymentRef || (row.isLegacyPayment || row.paymentType ? row._id : null);

  return {
    _id: paymentId,
    ledgerId: row._id,
    receiptNumber: row.receiptNumber || row.transactionNumber,
    student: row.references?.student || row.party,
    course: row.references?.course,
    amount: row.amount,
    paymentMethod: row.paymentMethod,
    paymentType: categoryToPaymentType(row.category),
    category: row.category,
    paymentStatus: row.status,
    paymentDate: row.paidAt || row.createdAt,
    dueDate: row.dueDate,
    description: row.description,
    isLedger: true
  };
};

/** Stats from normalized inflow payment rows */
export const calcInflowStats = (rows) => {
  const payments = rows.map(normalizeInflowRecord).filter(Boolean);
  const completed = payments.filter((p) => p.paymentStatus === 'completed');
  const pending = payments.filter((p) => p.paymentStatus === 'pending');
  const refunded = payments.filter((p) => p.paymentStatus === 'refunded');
  const failed = payments.filter((p) => p.paymentStatus === 'failed');

  const completedAmount = completed.reduce((s, p) => s + (p.amount || 0), 0);
  const refundedAmount = refunded.reduce((s, p) => s + (p.amount || 0), 0);

  return {
    netRevenue: completedAmount - refundedAmount,
    totalNetPaid: completedAmount - refundedAmount,
    grossRevenue: completedAmount,
    totalPendingAmount: pending.reduce((s, p) => s + (p.amount || 0), 0),
    totalRefundedAmount: refundedAmount,
    totalFailedAmount: failed.reduce((s, p) => s + (p.amount || 0), 0),
    totalCompletedPayments: completed.length,
    totalPendingPayments: pending.length,
    totalRefundedPayments: refunded.length,
    totalFailedPayments: failed.length,
    totalTransactions: payments.length
  };
};

/** Normalize fee obligation for outstanding reports */
export const normalizeObligation = (ob) => ({
  _id: ob._id,
  student: ob.student,
  course: ob.course,
  component: ob.component,
  amountDue: ob.amountDue,
  amountPaid: ob.amountPaid,
  amountPending: ob.amountPending ?? Math.max(0, (ob.amountDue || 0) - (ob.amountPaid || 0)),
  balance: ob.amountPending ?? Math.max(0, (ob.amountDue || 0) - (ob.amountPaid || 0)),
  dueDate: ob.dueDate,
  status: ob.status,
  franchise: ob.franchise,
  daysOverdue: ob.dueDate && new Date(ob.dueDate) < new Date()
    ? Math.floor((Date.now() - new Date(ob.dueDate)) / (1000 * 60 * 60 * 24))
    : 0
});
