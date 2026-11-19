import { TbCurrencyRupee } from 'react-icons/tb';
import {
  useState,
  useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import PartialPaymentModal from '../../components/PartialPaymentModal.jsx';
import { FiDownload,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiCreditCard
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import {
  StatCard, PageLoading, FilterBar, FilterBarActions, SearchInput, SelectField, Button, Card,
} from '../../components/ui';
import { formatCurrency } from '../../utils/dashboard';
import { 
  downloadReceipt, 
  deletePayment 
} from '../../api/paymentApi';
import { getUnifiedPaymentHistory, getTransactionStats } from '../../api/transactionApi';
import { normalizeInflowRecord, calcInflowStats } from '../../utils/transactionHelpers';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const ManagePayments = ({ isFranchise = false }) => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, []);

  // Live updates without manual refresh.
  useAutoRefresh(
    () => {
      fetchPayments({ silent: true });
      fetchStats();
    },
    { interval: 30000, events: ['payment-verified', 'new-enrollment'] }
  );

  const fetchPayments = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await getUnifiedPaymentHistory();
      const rows = (response.data || []).map(normalizeInflowRecord).filter(Boolean);
      setPayments(rows);
    } catch (error) {
      if (!silent) toast.error('Failed to fetch payments');
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getTransactionStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      try {
        await deletePayment(id);
        toast.success('Payment deleted successfully');
        fetchPayments();
        fetchStats();
      } catch (error) {
        toast.error('Failed to delete payment');
      }
    }
  };

  const handlePartialPayment = (payment) => {
    setSelectedPayment(payment);
    setShowPartialModal(true);
  };

  const onPartialPaymentSuccess = () => {
    fetchPayments();
    fetchStats();
    setShowPartialModal(false);
    setSelectedPayment(null);
  };

  const handleDownloadReceipt = async (id) => {
    try {
      const blob = await downloadReceipt(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      toast.error('Failed to download receipt');
      console.error(error);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.student?.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.student?.personalInfo?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.student?.personalInfo?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.course?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentType?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.paymentStatus === statusFilter;
    const matchesMethod = methodFilter === 'all' || payment.paymentMethod === methodFilter;
    const matchesType = typeFilter === 'all' || payment.paymentType === typeFilter;
    return matchesSearch && matchesStatus && matchesMethod && matchesType;
  });

  // Calculate overall stats from ledger-backed payment rows
  const getOverallStats = () => calcInflowStats(payments);

  // Pagination logic
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Manage Payments" subtitle="Track and manage all payment transactions" icon={TbCurrencyRupee} />
        <PageLoading message="Loading payments..." />
      </Layout>
    );
  }

  const overall = getOverallStats();

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Manage Payments"
          subtitle="Track and manage all payment transactions"
          icon={TbCurrencyRupee}
          actions={
            <Button icon={FiPlus} onClick={() => navigate(isFranchise ? '/school/payments/add' : '/admin/payments/add')}>
              Record Payment
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Net Revenue" tone="primary" icon={TbCurrencyRupee} value={formatCurrency(overall.netRevenue, { compact: true })} subtitle={`${overall.totalCompletedPayments} completed`} />
          <StatCard title="Pending Amount" tone="warning" icon={FiCreditCard} value={formatCurrency(overall.totalPendingAmount, { compact: true })} subtitle={`${overall.totalPendingPayments} awaiting`} />
          <StatCard title="Refunded" tone="danger" icon={TbCurrencyRupee} value={formatCurrency(overall.totalRefundedAmount, { compact: true })} subtitle={`${overall.totalRefundedPayments} refunds`} />
          <StatCard title="Outstanding Fees" tone="amber" icon={TbCurrencyRupee} value={formatCurrency(stats?.outstandingReceivables || 0, { compact: true })} subtitle={`${stats?.outstandingReceivableCount || 0} open`} />
        </div>

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl p-4 border border-success-100 bg-success-50 text-sm">
              <p className="text-slate-500">Ledger income</p>
              <p className="text-lg font-bold text-success-700 mt-1">{formatCurrency(stats.totalIncome || 0)}</p>
            </div>
            <div className="rounded-xl p-4 border border-danger-100 bg-danger-50 text-sm">
              <p className="text-slate-500">Ledger expenses</p>
              <p className="text-lg font-bold text-danger-700 mt-1">{formatCurrency(stats.totalExpenses || 0)}</p>
            </div>
            <div className="rounded-xl p-4 border border-primary-100 bg-primary-50 text-sm">
              <p className="text-slate-500">Net revenue</p>
              <p className="text-lg font-bold text-primary-700 mt-1">{formatCurrency(stats.netRevenue || 0)}</p>
            </div>
          </div>
        )}

        <Card>
          <h4 className="section-title mb-2">Revenue Breakdown</h4>
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-success-600">{formatCurrency(overall.grossRevenue || 0)}</span> completed
            <span className="mx-2 text-slate-300">−</span>
            <span className="font-semibold text-danger-600">{formatCurrency(overall.totalRefundedAmount || 0)}</span> refunded
            <span className="mx-2 text-slate-300">=</span>
            <span className="font-semibold text-primary-600">{formatCurrency(overall.netRevenue || 0)}</span> net
            <span className="mx-2">·</span>
            {overall.totalCompletedPayments || 0} completed · {overall.totalRefundedPayments || 0} refunds
          </p>
        </Card>

        <FilterBar>
          <SearchInput
            className="flex-1 lg:max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by receipt, student, course..."
          />
          <FilterBarActions>
            <SelectField value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[130px]">
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </SelectField>
            <SelectField value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="min-w-[130px]">
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank Transfer</option>
            </SelectField>
            <SelectField value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="min-w-[150px]">
              <option value="all">All Types</option>
              <option value="registration">Registration Fee</option>
              <option value="course_fee">Course Fee</option>
              <option value="installment">Installment</option>
              <option value="exam_fee">Exam Fee</option>
              <option value="certificate_fee">Certificate Fee</option>
              <option value="other">Other</option>
            </SelectField>
          </FilterBarActions>
        </FilterBar>

      {/* Payments Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Receipt No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Payment Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((payment) => (
                  <tr key={payment.ledgerId || payment._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-slate-900">{payment.receiptNumber}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {payment.student?.personalInfo?.firstName} {payment.student?.personalInfo?.lastName}
                      </div>
                      <div className="text-sm text-slate-500">{payment.student?.studentId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {payment.course?.title || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                        payment.paymentType === 'registration' 
                          ? 'bg-purple-100 text-purple-800'
                          : payment.paymentType === 'course_fee'
                          ? 'bg-blue-100 text-blue-800'
                          : payment.paymentType === 'installment'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {payment.paymentType?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-slate-900">
                        ₹{payment.amount?.toLocaleString('en-IN')}
                      </span>
                      {payment.dueDate && payment.paymentStatus === 'pending' && (
                        <div className="text-xs text-orange-600 mt-1">
                          Due: {new Date(payment.dueDate).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 capitalize">{payment.paymentMethod?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-900">
                        {new Date(payment.paymentDate).toLocaleDateString('en-IN')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.paymentStatus === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : payment.paymentStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {payment.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {payment.paymentStatus === 'pending' && payment._id && (
                          <button
                            onClick={() => handlePartialPayment(payment)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Record Partial Payment"
                          >
                            <FiCreditCard size={18} />
                          </button>
                        )}
                        {payment._id && (
                          <button
                            onClick={() => handleDownloadReceipt(payment._id)}
                            className="p-2 text-primary-600 hover:bg-blue-50 rounded-lg transition"
                            title="Download Receipt"
                          >
                            <FiDownload size={18} />
                          </button>
                        )}
                        {payment._id && (
                          <button
                            onClick={() => navigate(isFranchise ? `/school/payments/${payment._id}/edit` : `/admin/payments/${payment._id}/edit`)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Edit Payment"
                          >
                            <FiEdit size={18} />
                          </button>
                        )}
                        {payment._id && (
                          <button
                            onClick={() => handleDelete(payment._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Payment"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          totalItems={filteredPayments.length}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>

      {/* Partial Payment Modal */}
      {showPartialModal && selectedPayment && (
        <PartialPaymentModal
          isOpen={showPartialModal}
          onClose={() => {
            setShowPartialModal(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
          onSuccess={onPartialPaymentSuccess}
        />
      )}
      </div>
    </Layout>
  );
};

export default ManagePayments;
