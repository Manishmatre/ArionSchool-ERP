import { TbCurrencyRupee } from 'react-icons/tb';
import {
  useState,
  useEffect,
  useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiUsers,
  FiBookOpen,
  FiActivity,
  FiAward,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiStar,
  FiBell,
  FiArrowRight,
  FiX,
  FiPhone,
  FiMail,
  FiGlobe,
  FiAlertCircle,
  FiTrendingUp,
  FiPieChart,
  FiDownload,
  FiUserPlus,
  FiRefreshCw,
  FiMapPin
} from 'react-icons/fi';
import api from '../../api/axios';
import { getMyNotifications } from '../../api/notificationApi';
import { getRevenueReport } from '../../api/reportApi';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import Layout from '../../components/Layout';
import DashboardAiInsights from '../../components/ai/DashboardAiInsights';
import { Card, CardHeader, StatCard, ChartCard, EmptyState, Badge } from '../../components/ui';
import { RevenueTrendChart, RevenueSourceChart } from '../../components/dashboard/DashboardCharts';
import { formatCurrency, aggregateRevenueByMonth, aggregateRevenueBySource } from '../../utils/dashboard';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const FranchiseDashboard = () => {
  const { user } = useAuth();
  const { schoolName } = useBranding();
  const [stats, setStats] = useState(null);
  const [franchise, setFranchise] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [franchiseCertificate, setFranchiseCertificate] = useState(null);
  const [revenueMonthly, setRevenueMonthly] = useState([]);
  const [revenueBySource, setRevenueBySource] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [inactiveData, setInactiveData] = useState(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const results = await Promise.allSettled([
        api.get('/reports/dashboard-stats'),
        user?.franchise?._id ? api.get(`/campuses/${user.franchise._id}`) : Promise.resolve(null),
        getMyNotifications(),
        getRevenueReport(),
      ]);
      const [statsResult, franchiseResult, notificationsResult, revenueResult] = results;

      if (statsResult.status === 'fulfilled') setStats(statsResult.value?.data?.data || null);
      else if (statsResult.reason?.response?.status === 403 && statsResult.reason?.response?.data?.requiresRenewal) showFranchiseInactiveModal(statsResult.reason.response.data);
      else if (!silent) toast.error('Failed to fetch campus overview data.');

      if (franchiseResult.status === 'fulfilled') setFranchise(franchiseResult.value?.data?.data || null);
      else if (franchiseResult.reason?.response?.status === 403 && franchiseResult.reason?.response?.data?.requiresRenewal) showFranchiseInactiveModal(franchiseResult.reason.response.data);

      if (notificationsResult.status === 'fulfilled') setNotifications(notificationsResult.value?.data || []);
      if (revenueResult.status === 'fulfilled' && revenueResult.value?.success) {
        const rows = revenueResult.value.data || [];
        setRevenueMonthly(aggregateRevenueByMonth(rows).slice(-12));
        setRevenueBySource(aggregateRevenueBySource(rows));
      }
    } catch (error) {
      console.error(error);
      if (error.response?.status === 403 && error.response?.data?.requiresRenewal) {
        showFranchiseInactiveModal(error.response.data);
      } else if (!silent) {
        toast.error('Failed to fetch dashboard data');
      }
    } finally {
      if (!silent) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const handleFranchiseInactive = (event) => showFranchiseInactiveModal(event.detail);
    window.addEventListener('franchiseInactive', handleFranchiseInactive);

    const storedData = localStorage.getItem('franchiseInactiveData');
    if (storedData) {
      try {
        showFranchiseInactiveModal(JSON.parse(storedData));
        localStorage.removeItem('franchiseInactiveData');
      } catch (e) {
        console.error('Error parsing stored school data:', e);
      }
    }

    fetchData();
    return () => window.removeEventListener('franchiseInactive', handleFranchiseInactive);
  }, [user, fetchData]);

  // Live updates without manual refresh.
  useAutoRefresh(
    () => fetchData({ silent: true }),
    { interval: 30000, events: ['payment-verified', 'new-enrollment', 'batch-created', 'attendance-updated'] }
  );

  const showFranchiseInactiveModal = (data) => {
    setInactiveData(data);
    setShowInactiveModal(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData({ silent: true });
    setRefreshing(false);
    toast.success('Dashboard refreshed.');
  };

  const q = stats?.quickStats || {};
  const netRevenue = (q.totalRevenue || 0) - (q.totalExpenses || 0);

  const kpis = [
    { title: 'Total Students', tone: 'info', icon: FiUsers, value: (q.totalStudents || 0).toLocaleString('en-IN'), onClick: () => navigate('/school/students') },
    { title: 'Total Income', tone: 'success', icon: TbCurrencyRupee, value: formatCurrency(q.totalRevenue, { compact: true }), subtitle: `${formatCurrency(q.monthlyRevenue, { compact: true })} this month` },
    { title: 'Net Revenue', tone: 'primary', icon: FiTrendingUp, value: formatCurrency(netRevenue, { compact: true }), subtitle: `Expenses ${formatCurrency(q.totalExpenses, { compact: true })}` },
    { title: 'Outstanding Fees', tone: 'amber', icon: FiAlertCircle, value: formatCurrency(q.outstandingReceivables, { compact: true }), subtitle: q.outstandingReceivableCount ? `${q.outstandingReceivableCount} open` : 'All cleared' },
  ];

  const quickActions = [
    { label: 'Add Student', icon: FiUserPlus, tone: 'text-primary-600 bg-primary-50', onClick: () => navigate('/school/students/add') },
    { label: 'School Fees', icon: TbCurrencyRupee, tone: 'text-success-600 bg-success-50', onClick: () => navigate('/school/school-fees') },
    { label: 'Attendance', icon: FiCalendar, tone: 'text-amber-600 bg-amber-50', onClick: () => navigate('/school/school-attendance') },
    { label: 'Timetable', icon: FiCalendar, tone: 'text-indigo-600 bg-indigo-50', onClick: () => navigate('/school/timetable') },
    { label: 'Exams & CCE', icon: FiAward, tone: 'text-cyan-600 bg-cyan-50', onClick: () => navigate('/school/examinations') },
    { label: 'Homework', icon: FiBookOpen, tone: 'text-purple-600 bg-purple-50', onClick: () => navigate('/school/homework') },
    { label: 'Gate Pass', icon: FiCheckCircle, tone: 'text-emerald-600 bg-emerald-50', onClick: () => navigate('/school/visitor-pass') },
    { label: 'Transport GPS', icon: FiMapPin, tone: 'text-rose-600 bg-rose-50', onClick: () => navigate('/school/transport') },
  ];

  const secondaryKpis = [
    { title: 'Classes & Subjects', tone: 'indigo', icon: FiBookOpen, value: (q.totalCourses || 0).toLocaleString('en-IN'), onClick: () => navigate('/school/academic-setup') },
    { title: 'Admissions', tone: 'cyan', icon: FiActivity, value: (q.totalEnrollments || 0).toLocaleString('en-IN'), onClick: () => navigate('/school/students') },
    { title: 'Certificates & TC', tone: 'teal', icon: FiAward, value: (q.totalCertificates || 0).toLocaleString('en-IN'), onClick: () => navigate('/school/transfer-certificates') },
    { title: 'Pending Fees', tone: 'rose', icon: FiClock, value: (q.pendingPayments || 0).toLocaleString('en-IN'), onClick: () => navigate('/school/school-fees') },
    { title: 'Fee Collections', tone: 'success', icon: FiCheckCircle, value: (q.completedPayments || 0).toLocaleString('en-IN'), onClick: () => navigate('/school/accounting-ledger') },
    { title: 'New Admissions', tone: 'purple', icon: FiUserPlus, value: (q.studentsThisMonth || 0).toLocaleString('en-IN'), onClick: () => navigate('/school/students') },
  ];

  if (loading) {
    return (
      <Layout title="Dashboard" breadcrumbs="School Admin / Dashboard">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-5 h-24"><div className="skeleton mb-3 h-3.5 w-24" /><div className="skeleton h-6 w-32" /></div>)}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-20 p-4"><div className="skeleton mb-2 h-3 w-20" /><div className="skeleton h-5 w-12" /></div>)}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><div className="card h-[320px] p-5 lg:col-span-2"><div className="skeleton h-full w-full" /></div><div className="card h-[320px] p-5"><div className="skeleton h-full w-full" /></div></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard" breadcrumbs="School Admin / Dashboard">
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-2xl border border-primary-900 bg-gradient-to-r from-slate-950 via-primary-950 to-primary-800 px-5 py-5 text-white shadow-sm sm:px-6">
          <div className="absolute -right-8 -top-16 h-48 w-48 rounded-full border-[28px] border-white/5" />
          <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-200">School Campus Overview</p>
              <h1 className="mt-1 text-xl font-bold sm:text-2xl">Welcome back, {user?.name?.trim().split(/\s+/)[0] || 'there'}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-primary-100"><FiMapPin className="shrink-0" />{franchise?.name || user?.franchise?.name || 'Your School Campus'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button type="button" onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-70" title="Refresh dashboard data">
                <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />Refresh data
              </button>
            </div>
          </div>
        </section>

        {/* Real-time AI Operational Insights Brief */}
        <DashboardAiInsights />

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k, i) => <StatCard key={i} {...k} />)}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {secondaryKpis.map((k, i) => <StatCard key={i} {...k} compact />)}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard className="lg:col-span-2" title="Revenue Trend" subtitle="Monthly income over the last 12 months" icon={FiTrendingUp} height={290}>
            <RevenueTrendChart data={revenueMonthly} />
          </ChartCard>
          <ChartCard title="Income by Source" subtitle="Collections by payment type" icon={FiPieChart} height={290}>
            <RevenueSourceChart data={revenueBySource} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Quick Actions" subtitle="Common tasks for your school campus" icon={FiActivity} />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return <button key={i} type="button" onClick={action.onClick} className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-3 transition hover:border-primary-300 hover:bg-primary-50/40 hover:shadow-sm">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.tone} transition group-hover:scale-105`}><Icon className="text-lg" /></span>
                  <span className="text-xs font-semibold text-slate-700">{action.label}</span>
                </button>;
              })}
            </div>
          </Card>
          <Card>
            <CardHeader title="School Affiliation" subtitle="Official accreditation details" icon={FiAward} />
            <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Institution:</span>
                <span className="text-xs font-bold text-primary-700">{schoolName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Board Affiliation:</span>
                <Badge variant="success">CBSE Senior Secondary</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Campus Code:</span>
                <span className="font-mono text-xs text-slate-600">{user?.franchise?.code || 'ARION-001'}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader title="Recent Students" icon={FiUsers} action={<button onClick={() => navigate('/school/students')} className="flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900">View all <FiArrowRight /></button>} />
            <div className="space-y-1">
              {stats?.recentActivities?.students?.length ? stats.recentActivities.students.slice(0, 5).map((student) => (
                <div key={student._id} className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 transition hover:bg-slate-50">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">{(student.personalInfo?.firstName || 'S')[0]}</span>
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{student.personalInfo?.firstName} {student.personalInfo?.lastName}</p><p className="text-xs text-slate-500">{student.studentId}</p></div>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-IN') : ''}</span>
                </div>
              )) : <EmptyState icon={FiUsers} title="No recent students" />}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent Payments" icon={TbCurrencyRupee} action={<button onClick={() => navigate('/school/payments')} className="flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900">View all <FiArrowRight /></button>} />
            <div className="space-y-1">
              {stats?.recentActivities?.payments?.length ? stats.recentActivities.payments.slice(0, 5).map((payment) => (
                <div key={payment._id} className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 transition hover:bg-slate-50">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{payment.student?.personalInfo?.firstName || 'Student payment'} {payment.student?.personalInfo?.lastName || ''}</p><p className="text-xs text-slate-500">{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-IN') : 'Date unavailable'}</p></div>
                  <span className="shrink-0 text-sm font-bold text-slate-900">{formatCurrency(payment.amount || 0)}</span>
                </div>
              )) : <EmptyState icon={TbCurrencyRupee} title="No recent payments" />}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent Notifications" icon={FiBell} action={<button onClick={() => navigate('/school/notifications')} className="flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900">View all <FiArrowRight /></button>} />
            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {notifications.length === 0 ? <EmptyState icon={FiBell} title="No notifications" description="You’re all caught up." /> : notifications.slice(0, 5).map((notification) => {
                const tone = notification.type === 'error' ? 'bg-danger-100 text-danger-600' : notification.type === 'success' ? 'bg-success-100 text-success-600' : notification.type === 'warning' ? 'bg-warning-100 text-warning-600' : notification.type === 'announcement' ? 'bg-purple-100 text-purple-600' : 'bg-primary-100 text-primary-600';
                return <div key={notification._id} className="flex items-start gap-2.5 rounded-xl p-2.5 hover:bg-slate-50"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}><FiBell /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{notification.title}</p><p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{notification.message}</p><p className="mt-1 text-[11px] text-slate-400">{new Date(notification.createdAt).toLocaleDateString('en-IN')}</p></div></div>;
              })}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default FranchiseDashboard;
