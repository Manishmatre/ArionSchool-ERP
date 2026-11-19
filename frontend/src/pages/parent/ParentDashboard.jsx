import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiBookOpen, FiCheckCircle, FiClock, FiCreditCard, FiFileText, FiRefreshCw
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { StatCard, Button } from '../../components/ui';
import RazorpayFeeModal from '../../components/payments/RazorpayFeeModal';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import schoolFeeApi from '../../api/schoolFeeApi';
import homeworkApi from '../../api/homeworkApi';
import { getStudentAttendance } from '../../api/attendanceApi';

const currency = (value) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`;

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [feeDetails, setFeeDetails] = useState(null);
  const [homework, setHomework] = useState([]);
  const [attendanceDetails, setAttendanceDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [payObligation, setPayObligation] = useState(null);

  const currentChild = children[selectedChildIndex] || null;

  const loadChildDetails = useCallback(async (child) => {
    if (!child?._id) {
      setFeeDetails(null);
      setHomework([]);
      setAttendanceDetails(null);
      return;
    }
    setDetailsLoading(true);
    const [feesResult, homeworkResult, attendanceResult] = await Promise.allSettled([
      schoolFeeApi.getStudentFees(child._id),
      homeworkApi.getHomework(),
      getStudentAttendance(child._id)
    ]);
    if (feesResult.status === 'fulfilled') {
      setFeeDetails(feesResult.value.data?.data || null);
    } else {
      setFeeDetails(null);
      toast.error(feesResult.reason?.response?.data?.message || 'Could not load this student’s fee details.');
    }
    if (homeworkResult.status === 'fulfilled') {
      setHomework(homeworkResult.value.data?.data || []);
    } else {
      setHomework([]);
      toast.error(homeworkResult.reason?.response?.data?.message || 'Could not load school homework.');
    }
    if (attendanceResult.status === 'fulfilled') {
      setAttendanceDetails(attendanceResult.value?.data || null);
    } else {
      setAttendanceDetails(null);
      toast.error(attendanceResult.reason?.response?.data?.message || 'Could not load this student’s attendance records.');
    }
    setDetailsLoading(false);
  }, []);

  const fetchParentChildren = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/students');
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setChildren(list);
      setSelectedChildIndex((index) => Math.min(index, Math.max(0, list.length - 1)));
    } catch (err) {
      setChildren([]);
      toast.error(err.response?.data?.message || 'Failed to load linked student profiles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchParentChildren(); }, [fetchParentChildren]);
  useEffect(() => { loadChildDetails(currentChild); }, [currentChild?._id, loadChildDetails]);

  const obligations = feeDetails?.obligations || [];
  const receipts = feeDetails?.receipts || [];
  const feeSummary = feeDetails?.summary || {};
  const pendingAmount = Number(feeSummary.totalPending ?? currentChild?.fees?.pendingAmount ?? 0);
  const totalDue = Number(feeSummary.totalDue ?? currentChild?.fees?.totalFees ?? 0);
  const paidAmount = Number(feeSummary.totalPaid ?? currentChild?.fees?.paidAmount ?? 0);
  const attendanceStats = attendanceDetails?.statistics || currentChild?.attendance || {};
  const attendancePercent = Number(attendanceStats.percentage ?? attendanceStats.attendancePercentage ?? 0);
  const payableObligations = useMemo(
    () => obligations.filter((item) => Number(item.amountPending) > 0),
    [obligations]
  );

  const handlePaymentSuccess = async () => {
    setPayObligation(null);
    await loadChildDetails(currentChild);
    await fetchParentChildren();
  };

  return (
    <Layout title="Parent & Guardian Portal" breadcrumbs={`School Portal / Guardian Desk / ${user?.name || 'Parent'}`}>
      <PageHeader
        title="Parent & Guardian Portal"
        subtitle="View linked student records, attendance, fee obligations, receipts, and class homework."
        actions={(
          <Button variant="secondary" icon={FiRefreshCw} onClick={() => { fetchParentChildren(); loadChildDetails(currentChild); }}>
            Refresh
          </Button>
        )}
      />

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading linked student profiles…</div>
      ) : children.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="font-bold text-slate-900">No linked students found</h2>
          <p className="mt-2 text-sm text-slate-500">Ask the school office to connect your parent account to your student profile.</p>
        </div>
      ) : (
        <>
          {children.length > 1 && (
            <div className="mb-6 flex items-center gap-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3">
              <span className="shrink-0 pl-2 text-xs font-bold uppercase tracking-wider text-slate-500">Select child:</span>
              {children.map((child, index) => (
                <button key={child._id} onClick={() => setSelectedChildIndex(index)} className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold ${selectedChildIndex === index ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {child.personalInfo?.firstName} {child.personalInfo?.lastName} · {child.schoolClass?.name || 'Class not set'}
                </button>
              ))}
            </div>
          )}

          <section className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900">{currentChild?.personalInfo?.firstName} {currentChild?.personalInfo?.lastName}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {currentChild?.schoolClass?.name || 'Class not assigned'}{currentChild?.section?.name ? ` · Section ${currentChild.section.name}` : ''}
                {currentChild?.rollNumber ? ` · Roll ${currentChild.rollNumber}` : ''}
                {currentChild?.studentId ? ` · Student ID ${currentChild.studentId}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" icon={FiFileText} onClick={() => navigate('/verify-certificate-public')}>Verify a school document</Button>
              {payableObligations.length > 0 && (
                <Button variant="primary" icon={TbCurrencyRupee} onClick={() => setPayObligation(payableObligations[0])}>
                  Pay {currency(payableObligations[0].amountPending)}
                </Button>
              )}
            </div>
          </section>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Attendance" value={`${attendancePercent.toFixed(1)}%`} icon={FiCheckCircle} tone={attendancePercent >= 75 ? 'success' : 'danger'} subtitle={`${attendanceStats.presentDays ?? attendanceStats.attendedClasses ?? 0} of ${attendanceStats.totalDays ?? attendanceStats.totalClasses ?? 0} recorded days`} />
            <StatCard title="Fees Due" value={currency(pendingAmount)} icon={TbCurrencyRupee} tone={pendingAmount > 0 ? 'rose' : 'success'} subtitle={pendingAmount > 0 ? 'Outstanding balance' : 'No outstanding balance'} />
            <StatCard title="Fees Paid" value={currency(paidAmount)} icon={FiCreditCard} tone="indigo" subtitle={`Of ${currency(totalDue)} assessed`} />
            <StatCard title="Open Homework" value={homework.length} icon={FiBookOpen} tone="amber" subtitle="Assignments for linked classes" />
          </div>

          <section id="attendance" className="mb-6 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900"><FiCheckCircle className="text-emerald-600" /> Recent attendance records</h3>
            {detailsLoading ? <p className="text-sm text-slate-500">Loading attendance…</p> : attendanceDetails?.records?.length ? (
              <div className="space-y-2">
                {attendanceDetails.records.slice(0, 8).map((record) => (
                  <div key={record._id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs">
                    <span className="text-slate-700">{new Date(record.date).toLocaleDateString()} · {record.session?.replace(/_/g, ' ') || 'Full day'}</span>
                    <span className={`font-bold capitalize ${record.status === 'present' || record.status === 'late' ? 'text-emerald-700' : 'text-rose-700'}`}>{record.status}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">No attendance records are available for this student yet.</p>}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900"><TbCurrencyRupee className="text-emerald-600" /> Fees, obligations & receipts</h3>
              {detailsLoading ? <p className="text-sm text-slate-500">Loading fee account…</p> : obligations.length === 0 && receipts.length === 0 ? (
                <p className="text-sm text-slate-500">The school has not posted fee obligations or receipts for this student.</p>
              ) : (
                <div className="space-y-3">
                  {obligations.map((item) => (
                    <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.component || item.title || 'School fee'}</p>
                        <p className="mt-1 text-xs text-slate-500">Due {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'date not set'} · Balance {currency(item.amountPending)}</p>
                      </div>
                      {Number(item.amountPending) > 0 && <Button variant="primary" onClick={() => setPayObligation(item)}>Pay {currency(item.amountPending)}</Button>}
                    </div>
                  ))}
                  {receipts.slice(0, 4).map((receipt) => (
                    <div key={receipt._id} className="flex items-center justify-between rounded-xl bg-emerald-50/70 p-3 text-xs">
                      <span className="font-medium text-slate-700">Receipt {receipt.receiptNumber || receipt._id}</span>
                      <span className="font-bold text-emerald-700">{currency(receipt.amount)} · {receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString() : 'Paid'}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section id="homework" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900"><FiBookOpen className="text-primary-600" /> Homework for linked classes</h3>
              {detailsLoading ? <p className="text-sm text-slate-500">Loading homework…</p> : homework.length === 0 ? (
                <p className="text-sm text-slate-500">No homework assignments are currently posted for your linked students.</p>
              ) : (
                <div className="space-y-3">
                  {homework.map((item) => (
                    <article key={item._id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                          <p className="mt-1 text-xs text-slate-600">{item.subject?.name || 'General'} · {item.schoolClass?.name || 'Class'}{item.section?.name ? ` / ${item.section.name}` : ''}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-slate-500"><FiClock className="mr-1 inline" />{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'}</span>
                      </div>
                      {item.description && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{item.description}</p>}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {payObligation && currentChild && (
        <RazorpayFeeModal
          isOpen={Boolean(payObligation)}
          onClose={() => setPayObligation(null)}
          student={currentChild}
          obligation={payObligation}
          amountToPay={Number(payObligation.amountPending)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </Layout>
  );
}
