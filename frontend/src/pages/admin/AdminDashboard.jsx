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
  FiTrendingUp,
  FiActivity,
  FiAward,
  FiCalendar,
  FiBriefcase,
  FiRefreshCw,
  FiVideo,
  FiClock,
  FiAlertCircle,
  FiCheckCircle,
  FiArrowRight,
  FiBell,
  FiPieChart,
  FiBarChart2,
  FiCreditCard,
  FiLayers
} from 'react-icons/fi';
import { getDashboardStats, getRevenueReport, getCoursePopularityReport } from '../../api/reportApi';
import { getMyNotifications } from '../../api/notificationApi';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import DashboardAiInsights from '../../components/ai/DashboardAiInsights';
import { Card, CardHeader, StatCard, ChartCard, Button, EmptyState } from '../../components/ui';
import {
  RevenueTrendChart, RevenueSourceChart, TopCoursesChart, StatusDonut,
} from '../../components/dashboard/DashboardCharts';
import {
  formatCurrency, aggregateRevenueByMonth, aggregateRevenueBySource, percentOf,
} from '../../utils/dashboard';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const activeTab = 'overview';

  const [stats, setStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [revenueMonthly, setRevenueMonthly] = useState([]);
  const [revenueBySource, setRevenueBySource] = useState([]);
  const [topCourses, setTopCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, revenueRes, coursesRes] = await Promise.allSettled([
        getDashboardStats(),
        getRevenueReport(),
        getCoursePopularityReport(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
        setStats(statsRes.value.data.quickStats);
        setRecentActivities(statsRes.value.data.recentActivities);
      } else {
        toast.error('Failed to fetch dashboard data');
      }

      if (revenueRes.status === 'fulfilled' && revenueRes.value?.success) {
        const rows = revenueRes.value.data || [];
        setRevenueMonthly(aggregateRevenueByMonth(rows).slice(-12));
        setRevenueBySource(aggregateRevenueBySource(rows));
      }

      if (coursesRes.status === 'fulfilled' && coursesRes.value?.success) {
        const rows = coursesRes.value.data || [];
        setTopCourses(
          rows.slice(0, 6).map((r) => ({
            name: r.course?.title || r.course?.name || 'Course',
            enrollments: r.totalEnrollments || 0,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getMyNotifications();
      setNotifications(data.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchNotifications();
  }, [fetchAll, fetchNotifications]);

  useAutoRefresh(
    () => {
      fetchAll();
      fetchNotifications();
    },
    { interval: 30000, events: ['payment-verified', 'batch-created', 'exam-submitted', 'new-enrollment'] }
  );

  useEffect(() => {
    const handleNewEnrollment = (event) => {
      const data = event.detail;
      setStats((prev) => ({ ...prev, totalEnrollments: (prev?.totalEnrollments || 0) + 1 }));
      setRecentActivities((prev) => ({
        ...prev,
        _live: [
          { type: 'enrollment', message: data.message, timestamp: data.timestamp },
          ...((prev?._live) || []).slice(0, 9),
        ],
      }));
    };
    const refresh = () => fetchAll();
    window.addEventListener('new-enrollment', handleNewEnrollment);
    window.addEventListener('course-stats-updated', refresh);
    window.addEventListener('class-updated', refresh);
    return () => {
      window.removeEventListener('new-enrollment', handleNewEnrollment);
      window.removeEventListener('course-stats-updated', refresh);
      window.removeEventListener('class-updated', refresh);
    };
  }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAll(), fetchNotifications()]);
    setRefreshing(false);
    toast.success('Dashboard refreshed successfully');
  };

  const handleRecalculateFees = async () => {
    if (!window.confirm('Recalculate all student fees? This may take a moment.')) return;
    try {
      toast.info('Recalculating fees...');
      const response = await api.post('/utility/recalculate-fees');
      toast.success(response.data.message);
      fetchAll();
    } catch (error) {
      toast.error('Failed to recalculate fees');
    }
  };

  const primaryKpis = stats ? [
    {
      title: 'Total Revenue', tone: 'success', icon: TbCurrencyRupee,
      value: formatCurrency(stats.totalRevenue, { compact: true }),
      subtitle: `${formatCurrency(stats.monthlyRevenue, { compact: true })} this month`,
      onClick: () => navigate('/admin/financial-ledger'),
    },
    {
      title: 'Net Revenue', tone: 'primary', icon: FiTrendingUp,
      value: formatCurrency(stats.netRevenue ?? stats.totalRevenue, { compact: true }),
      subtitle: stats.monthlyNetRevenue != null ? `${formatCurrency(stats.monthlyNetRevenue, { compact: true })} this month` : null,
      onClick: () => navigate('/admin/financial-ledger'),
    },
    {
      title: 'Total Students', tone: 'info', icon: FiUsers,
      value: (stats.totalStudents || 0).toLocaleString('en-IN'),
      subtitle: stats.studentsThisMonth ? `+${stats.studentsThisMonth} this month` : 'Active students',
      trend: stats.studentsThisMonth ? { direction: 'up', value: percentOf(stats.studentsThisMonth, stats.totalStudents) } : null,
      onClick: () => navigate('/admin/students'),
    },
    {
      title: 'Outstanding Fees', tone: 'amber', icon: FiAlertCircle,
      value: formatCurrency(stats.outstandingReceivables, { compact: true }),
      subtitle: stats.outstandingReceivableCount ? `${stats.outstandingReceivableCount} pending` : 'All cleared',
      onClick: () => navigate('/admin/financial-ledger'),
    },
  ] : [];

  const secondaryKpis = stats ? [
    { title: 'School Campuses', tone: 'purple', icon: FiLayers, value: stats.totalFranchises || 0, onClick: () => navigate('/admin/campuses') },
    { title: 'Classes & Subjects', tone: 'indigo', icon: FiBookOpen, value: stats.totalCourses || 0, onClick: () => navigate('/admin/courses') },
    { title: 'Admissions', tone: 'cyan', icon: FiActivity, value: (stats.totalEnrollments || 0).toLocaleString('en-IN'), onClick: () => navigate('/admin/students') },
    { title: 'Certificates & TC', tone: 'teal', icon: FiAward, value: stats.totalCertificates || 0, onClick: () => navigate('/admin/transfer-certificates') },
    { title: 'School Expenses', tone: 'rose', icon: FiCreditCard, value: formatCurrency(stats.totalExpenses, { compact: true }), onClick: () => navigate('/admin/accounting-ledger') },
    { title: 'Pending Dues', tone: 'danger', icon: FiClock, value: stats.pendingPayments || 0, onClick: () => navigate('/admin/school-fees') },
  ] : [];

  const paymentsData = stats ? [
    { name: 'Completed', value: stats.completedPayments || 0 },
    { name: 'Pending', value: stats.pendingPayments || 0 },
  ] : [];

  const quickActions = [
    { label: 'School Fees', icon: TbCurrencyRupee, tone: 'text-purple-600 bg-purple-50', onClick: () => navigate('/admin/school-fees') },
    { label: 'Attendance', icon: FiCalendar, tone: 'text-cyan-600 bg-cyan-50', onClick: () => navigate('/admin/school-attendance') },
    { label: 'Exams & CCE', icon: FiAward, tone: 'text-amber-600 bg-amber-50', onClick: () => navigate('/admin/examinations') },
    { label: 'Timetable', icon: FiCalendar, tone: 'text-indigo-600 bg-indigo-50', onClick: () => navigate('/admin/timetable') },
    { label: 'Students', icon: FiUsers, tone: 'text-success-600 bg-success-50', onClick: () => navigate('/admin/students') },
    { label: 'Gate Pass', icon: FiCheckCircle, tone: 'text-primary-600 bg-primary-50', onClick: () => navigate('/admin/visitor-pass') },
    { label: 'Transport', icon: FiArrowRight, tone: 'text-teal-600 bg-teal-50', onClick: () => navigate('/admin/transport') },
    { label: 'Reports', icon: FiBarChart2, tone: 'text-rose-600 bg-rose-50', onClick: () => navigate('/admin/reports') },
  ];

  if (loading) {
    return (
      <Layout title="Dashboard" breadcrumbs="Admin / Dashboard">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 h-[96px]">
              <div className="skeleton h-3.5 w-24 mb-3" />
              <div className="skeleton h-6 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="card p-5 h-[320px] lg:col-span-2"><div className="skeleton h-full w-full" /></div>
          <div className="card p-5 h-[320px]"><div className="skeleton h-full w-full" /></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Dashboard"
      breadcrumbs="Admin / Dashboard"
      actions={
        <Button variant="secondary" icon={FiRefreshCw} loading={refreshing} onClick={handleRefresh}>
          Refresh Data
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Real-time AI Operational Insights Brief */}
        <DashboardAiInsights />

        {/* Primary KPIs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {primaryKpis.map((k, i) => <StatCard key={i} {...k} />)}
        </div>

        {/* Secondary KPIs Row - Compact, sleek, space-saving cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {secondaryKpis.map((k, i) => (
            <StatCard key={i} {...k} compact={true} />
          ))}
        </div>

        {/* Dynamic Content Based on Active Sub-Tab */}
        {(activeTab === 'overview' || activeTab === 'activity') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Quick Actions (immediately accessible) */}
            <Card className="lg:col-span-2">
              <CardHeader title="Quick Actions" subtitle="Jump to core daily operational tasks" icon={FiActivity} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {quickActions.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={i}
                      onClick={action.onClick}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200/90 hover:border-primary-400 hover:shadow-xs transition bg-white group cursor-pointer"
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.tone} transition group-hover:scale-105`}>
                        <Icon className="text-lg" />
                      </span>
                      <span className="text-xs font-semibold text-slate-700 text-center">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Recent Notifications & Broadcasts */}
            <Card>
              <CardHeader
                title="Recent Notifications"
                icon={FiBell}
                action={
                  <button onClick={() => navigate('/admin/notifications')} className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                    View all <FiArrowRight className="w-3.5 h-3.5" />
                  </button>
                }
              />
              <div className="space-y-2 max-h-64 overflow-y-auto -mr-1 pr-1">
                {notifications.length === 0 ? (
                  <EmptyState icon={FiBell} title="No notifications" description="All caught up." />
                ) : (
                  notifications.slice(0, 5).map((n) => {
                    const tone = n.type === 'error' ? 'bg-danger-100 text-danger-600'
                      : n.type === 'success' ? 'bg-success-100 text-success-600'
                      : n.type === 'warning' ? 'bg-warning-100 text-warning-600'
                      : n.type === 'announcement' ? 'bg-purple-100 text-purple-600'
                      : 'bg-primary-100 text-primary-600';
                    return (
                      <div key={n._id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 ${tone}`}>
                          <FiBell className="text-xs" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{n.title}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{n.message}</p>
                          <p className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleDateString('en-IN')}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        )}

        {(activeTab === 'overview' || activeTab === 'revenue') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard
              className="lg:col-span-2"
              title="Revenue Trend"
              subtitle="Monthly financial collection over the last 12 months"
              icon={FiTrendingUp}
              height={290}
            >
              <RevenueTrendChart data={revenueMonthly} />
            </ChartCard>

            <ChartCard title="Income by Source" subtitle="Revenue breakdown across programs & fees" icon={FiPieChart} height={290}>
              <RevenueSourceChart data={revenueBySource} />
            </ChartCard>
          </div>
        )}

        {(activeTab === 'overview' || activeTab === 'academics') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard
              className="lg:col-span-2"
              title="Top Courses by Enrollment"
              subtitle="Highest student registration programs"
              icon={FiBarChart2}
              height={290}
            >
              <TopCoursesChart data={topCourses} />
            </ChartCard>

            <ChartCard title="Payments Status" subtitle="Completed collections vs pending dues" icon={FiPieChart} height={290}>
              <StatusDonut data={paymentsData} colors={['#10b981', '#f59e0b']} />
            </ChartCard>
          </div>
        )}

        {/* Upcoming Classes & Pending Payments */}
        {(activeTab === 'overview' || activeTab === 'activity' || activeTab === 'academics') &&
          (recentActivities?.upcomingClasses?.length > 0 || recentActivities?.pendingPayments?.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recentActivities?.upcomingClasses?.length > 0 && (
              <Card>
                <CardHeader
                  title="Upcoming Classes"
                  icon={FiVideo}
                  action={
                    <button onClick={() => navigate('/admin/online-classes')} className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                      View all <FiArrowRight className="w-3.5 h-3.5" />
                    </button>
                  }
                />
                <div className="space-y-2">
                  {recentActivities.upcomingClasses.slice(0, 4).map((c) => (
                    <div key={c._id} className="border-l-[3px] border-teal-500 pl-3 py-1.5 bg-slate-50/60 rounded-r-lg">
                      <p className="text-xs font-bold text-slate-800">{c.title || c.course?.title || 'Untitled Class'}</p>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500">
                        <FiClock className="w-3 h-3 text-teal-600" />
                        <span>{new Date(c.startTime).toLocaleDateString('en-IN')}</span>
                        <span>•</span>
                        <span>{new Date(c.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {recentActivities?.pendingPayments?.length > 0 && (
              <Card>
                <CardHeader
                  title="Pending Dues & Payments"
                  icon={FiAlertCircle}
                  action={
                    <button onClick={() => navigate('/admin/payments?status=pending')} className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                      View all <FiArrowRight className="w-3.5 h-3.5" />
                    </button>
                  }
                />
                <div className="space-y-2">
                  {recentActivities.pendingPayments.slice(0, 4).map((p) => (
                    <div key={p._id} className="flex items-center justify-between border-l-[3px] border-amber-500 pl-3 py-1.5 bg-slate-50/60 rounded-r-lg">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {p.student?.personalInfo?.firstName || 'N/A'} {p.student?.personalInfo?.lastName || ''}
                        </p>
                        <p className="text-[11px] text-slate-500">Due: {p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                      </div>
                      <span className="text-xs font-bold text-amber-600">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminDashboard;
