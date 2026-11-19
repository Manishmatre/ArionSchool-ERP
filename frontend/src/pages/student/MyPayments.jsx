import { TbCurrencyRupee } from 'react-icons/tb';
import {
  useState,
  useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { FiDownload,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiXCircle
} from 'react-icons/fi';
import { downloadReceipt } from '../../api/paymentApi';
import { getUnifiedPaymentHistory, getStudentObligations } from '../../api/transactionApi';
import { normalizeInflowRecord, calcInflowStats } from '../../utils/transactionHelpers';
import { useAuth } from '../../context/AuthContext';
import {
  StatCard, PageLoading, Card,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  StatusBadge,
} from '../../components/ui';

const MyPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [obligationSummary, setObligationSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && (user._id || user.id)) {
      fetchPayments();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const studentId = user._id || user.id;
      const [historyRes, obligationsRes] = await Promise.all([
        getUnifiedPaymentHistory({ student: studentId }),
        getStudentObligations(studentId),
      ]);
      const rows = (historyRes.data || []).map(normalizeInflowRecord).filter(Boolean);
      setPayments(rows);
      setObligationSummary(obligationsRes.summary || null);
    } catch (error) {
      toast.error('Failed to fetch payments');
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (id) => {
    if (!id) return;
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

  const stats = calcInflowStats(payments);
  const outstandingFees = obligationSummary?.totalPending ?? stats.totalPendingAmount;

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="My Payments" subtitle="View your payment history and download receipts" icon={TbCurrencyRupee} />

        {loading ? (
          <PageLoading message="Loading payments..." />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Net Paid" tone="info" icon={FiCheckCircle} value={`₹${stats.totalNetPaid.toLocaleString('en-IN')}`} subtitle={`${stats.totalCompletedPayments} completed`} />
              <StatCard title="Outstanding Fees" tone="amber" icon={FiClock} value={`₹${outstandingFees.toLocaleString('en-IN')}`} subtitle="From fee obligations" />
              <StatCard title="Refunded" tone="danger" icon={FiRefreshCw} value={`₹${stats.totalRefundedAmount.toLocaleString('en-IN')}`} subtitle={`${stats.totalRefundedPayments} refunds`} />
              <StatCard title="Failed" tone="slate" icon={FiXCircle} value={`₹${stats.totalFailedAmount.toLocaleString('en-IN')}`} subtitle={`${stats.totalFailedPayments} failed`} />
            </div>

            <Card className="card-pad">
              <h4 className="section-title mb-3">My Payment Breakdown</h4>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className="font-semibold text-success-600">₹{stats.grossRevenue.toLocaleString('en-IN')}</span> completed
                <span className="text-slate-400">-</span>
                <span className="font-semibold text-danger-600">₹{stats.totalRefundedAmount.toLocaleString('en-IN')}</span> refunded
                <span className="text-slate-400">=</span>
                <span className="font-semibold text-primary-600">₹{stats.netRevenue.toLocaleString('en-IN')}</span> net paid
                <span className="text-slate-400">across</span>
                <span className="font-semibold">{stats.totalCompletedPayments}</span> transactions
              </div>
            </Card>

            <TableWrapper>
              <Table>
                <TableHead>
                  <tr>
                    <TableHeader>Receipt No.</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Amount</TableHeader>
                    <TableHeader>Method</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Action</TableHeader>
                  </tr>
                </TableHead>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableEmpty colSpan={7} title="No payment history found" />
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.ledgerId || payment._id}>
                        <TableCell><span className="font-mono text-xs">{payment.receiptNumber || '—'}</span></TableCell>
                        <TableCell>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                        <TableCell className="capitalize">{payment.paymentType?.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="font-semibold text-slate-900">₹{payment.amount?.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
                        <TableCell><StatusBadge status={payment.paymentStatus} /></TableCell>
                        <TableCell>
                          {payment._id ? (
                            <button onClick={() => handleDownloadReceipt(payment._id)} className="text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1">
                              <FiDownload /> Receipt
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableWrapper>
          </>
        )}
      </div>
    </Layout>
  );
};

export default MyPayments;
