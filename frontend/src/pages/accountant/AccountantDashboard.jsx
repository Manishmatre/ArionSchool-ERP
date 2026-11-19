import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiClock, FiCreditCard, FiFileText, FiPlus, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { StatCard, Button, StatusBadge, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty } from '../../components/ui';
import api from '../../api/axios';

const money = (amount) => `₹${(Number(amount) || 0).toLocaleString('en-IN')}`;
const dateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AccountantDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [monthSummary, setMonthSummary] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const [dailyResult, defaultersResult, monthResult] = await Promise.allSettled([
      api.get('/school-fees/reports/daily-collection', { params: { date: dateOnly(now) } }),
      api.get('/school-fees/defaulters'),
      api.get('/accounting/income-expenditure', { params: { startDate: dateOnly(start), endDate: dateOnly(now) } })
    ]);
    if (dailyResult.status === 'fulfilled') setDaily(dailyResult.value.data || null);
    else toast.error(dailyResult.reason?.response?.data?.message || 'Could not load today’s fee receipts.');
    if (defaultersResult.status === 'fulfilled') setDefaulters(defaultersResult.value.data?.data || []);
    else toast.error(defaultersResult.reason?.response?.data?.message || 'Could not load outstanding fee accounts.');
    if (monthResult.status === 'fulfilled') setMonthSummary(monthResult.value.data?.summary || null);
    else toast.error(monthResult.reason?.response?.data?.message || 'Could not load this month’s account summary.');
    setLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const outstandingDues = useMemo(
    () => defaulters.reduce((total, item) => total + Number(item.totalPending || 0), 0),
    [defaulters]
  );
  const receipts = daily?.receipts || [];

  return (
    <Layout title="School Accounts & Fee Desk" breadcrumbs="Financial Ledger / Accounts Desk">
      <PageHeader
        title="School Accounts & Fee Desk"
        subtitle="Live fee collections, outstanding balances, and the current month’s account summary."
        actions={(
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon={FiRefreshCw} onClick={loadDashboard}>Refresh</Button>
            <Button variant="secondary" icon={FiFileText} onClick={() => navigate('/school/accounting-ledger')}>General Ledger</Button>
            <Button variant="primary" icon={TbCurrencyRupee} onClick={() => navigate('/school/school-fees')}>Collect School Fees</Button>
          </div>
        )}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Collections" value={money(daily?.totalCollected)} icon={TbCurrencyRupee} tone="emerald" subtitle={`${daily?.count || 0} receipts recorded today`} />
        <StatCard title="Monthly Fee Revenue" value={money(monthSummary?.totalIncome)} icon={FiTrendingUp} tone="primary" subtitle="Recorded income this month" />
        <StatCard title="Outstanding Fee Receivables" value={money(outstandingDues)} icon={FiClock} tone="rose" subtitle={`${defaulters.length} students with open dues`} onClick={() => navigate('/school/school-fees')} />
        <StatCard title="Monthly Expenses" value={money(monthSummary?.totalExpenditure)} icon={FiCreditCard} tone="indigo" subtitle="Posted expenses this month" onClick={() => navigate('/school/accounting-ledger')} />
      </div>

      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900"><TbCurrencyRupee className="text-emerald-600" /> Today’s fee receipts</h3>
            <p className="mt-0.5 text-xs text-slate-500">Receipts returned by the school fee register for today.</p>
          </div>
          <Button variant="secondary" icon={FiPlus} onClick={() => navigate('/school/school-fees')}>New Fee Entry</Button>
        </div>
        <TableWrapper>
          <Table>
            <TableHead><TableRow>
              <TableHeader>Receipt #</TableHeader><TableHeader>Student</TableHeader><TableHeader>Class</TableHeader>
              <TableHeader>Amount</TableHeader><TableHeader>Payment Mode</TableHeader><TableHeader>Time</TableHeader>
              <TableHeader>Status</TableHeader><TableHeader>Action</TableHeader>
            </TableRow></TableHead>
            <TableBody>
              {loading ? <TableEmpty colSpan={8} message="Loading today’s fee receipts…" /> : receipts.length === 0 ? <TableEmpty colSpan={8} message="No fee receipts have been recorded today." /> : receipts.map((receipt) => {
                const student = receipt.student || {};
                const studentName = `${student.personalInfo?.firstName || ''} ${student.personalInfo?.lastName || ''}`.trim() || 'Student';
                return (
                  <TableRow key={receipt._id}>
                    <TableCell><span className="rounded bg-primary-50 px-2 py-0.5 font-mono text-xs font-bold text-primary-700">{receipt.receiptNumber || '—'}</span></TableCell>
                    <TableCell><span className="text-xs font-bold text-slate-900">{studentName}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-600">{receipt.schoolClass?.name || '—'}{student.rollNumber ? ` · Roll ${student.rollNumber}` : ''}</span></TableCell>
                    <TableCell><span className="text-xs font-black text-emerald-700">{money(receipt.amount)}</span></TableCell>
                    <TableCell><span className="text-xs capitalize text-slate-700">{String(receipt.paymentMethod || '—').replace(/_/g, ' ')}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-500">{receipt.paidAt ? new Date(receipt.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span></TableCell>
                    <TableCell><StatusBadge status={receipt.status || 'completed'} /></TableCell>
                    <TableCell><Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => navigate('/school/school-fees')}>Open Fee Desk</Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableWrapper>
      </section>

      {daily && (
        <p className="text-xs text-slate-500">Daily collection total: {money(daily.totalCollected)} across {daily.count || 0} receipts.</p>
      )}
    </Layout>
  );
}
