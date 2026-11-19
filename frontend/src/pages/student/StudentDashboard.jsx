import { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiBook, FiBookOpen, FiCheckSquare, FiAward, FiTrendingUp, FiCalendar, FiVideo, FiClock,
  FiBell, FiArrowRight, FiCreditCard, FiTarget, FiBarChart2, FiCheckCircle, FiShield,
  FiMapPin, FiPlayCircle, FiZap, FiDownload, FiExternalLink, FiHelpCircle, FiSmartphone
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { toast } from 'react-toastify';
import { Card, CardHeader, Badge } from '../../components/ui';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { toAbsoluteUrl } from '../../utils/url';
import DownloadAppModal from '../../components/DownloadAppModal';

// Curated daily student study tips for engagement & motivation
const DAILY_STUDY_TIPS = [
  'Consistent 20-minute daily review is 3x more effective than cramming before exams.',
  'Solve at least 5 MCQ questions after every video lecture to cement practical concepts.',
  'Take handwritten notes during key lectures to boost memory retention and recall speed.',
  'Review yesterday’s lecture notes for 5 minutes every morning to stay ahead of your batch.',
  'Keep your digital ID card and attendance up-to-date for timely exam and certificate approval.'
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [enrolledCoursesData, setEnrolledCoursesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  // Daily study tip based on day of month
  const todayTip = useMemo(() => {
    const day = new Date().getDate();
    return DAILY_STUDY_TIPS[day % DAILY_STUDY_TIPS.length];
  }, []);

  const fetchDashboardData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const studentId = user?.studentProfile?._id || user?.studentDetails?._id || user?.studentDetails || 'me';
      const [dashRes, enrollRes] = await Promise.all([
        api.get(`/students/${studentId}/dashboard`),
        api.get('/courses/my/enrolled').catch(() => ({ data: { data: [] } }))
      ]);

      if (dashRes.data?.success) {
        setDashboardData(dashRes.data.data);
      }
      const enrollList = enrollRes.data?.data || enrollRes.data || [];
      if (Array.isArray(enrollList)) {
        setEnrolledCoursesData(enrollList);
      }
    } catch (error) {
      console.error('Error fetching student dashboard data:', error);
      if (!silent) toast.error('Could not load student dashboard metrics.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Live auto-refresh for attendance punches, exam results, and course progress
  useAutoRefresh(
    () => {
      fetchDashboardData({ silent: true });
    },
    { interval: 30000, events: ['exam-result-ready', 'progress-updated', 'payment-verified', 'attendance-updated'] }
  );

  if (loading) {
    return (
      <Layout>
        <div className="space-y-5 animate-pulse">
          {/* Header Skeleton */}
          <div className="h-36 rounded-2xl bg-slate-200" />
          {/* KPI Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-200" />
            ))}
          </div>
          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 h-72 rounded-2xl bg-slate-200" />
            <div className="h-72 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </Layout>
    );
  }

  const {
    student = {},
    progress = {},
    courses = {},
    fees = {},
    attendance = {},
    certificates = 0,
    recentExams = [],
    onlineClasses = [],
    notifications = [],
    todayAttendance = {},
    enrolledCoursesList = []
  } = dashboardData || {};

  // Extract student identifiers
  const studentName = student.name || user?.name || 'Student';
  const firstName = student.firstName || studentName.split(' ')[0] || 'Student';
  const studentIdNumber = student.studentId || user?.studentId || 'SES-STU';
  const enrollmentNumber = student.enrollmentNumber || user?.enrollmentNumber || studentIdNumber;
  const franchiseInfo = student.franchise || null;

  // Active or Primary Course for "Continue Learning" Hero Card
  const primaryCourse =
    enrolledCoursesData[0]?.course ||
    enrolledCoursesData[0] ||
    enrolledCoursesList[0] ||
    null;
  const primaryCourseProgress =
    enrolledCoursesData[0]?.progress ??
    enrolledCoursesList[0]?.progress ??
    progress.overallProgress ??
    0;

  // Pie Chart Data for Progress Ring
  const chartData = [
    { name: 'Completed', value: progress.completedTopics || 0 },
    { name: 'Remaining', value: Math.max((progress.totalTopics || 0) - (progress.completedTopics || 0), progress.totalTopics ? 0 : 1) }
  ];
  const COLORS = ['#2563eb', '#e2e8f0'];

  // Quick Action Modules matching SES Educare SaaS Architecture
  const academicServices = [
    {
      title: 'My Courses',
      sub: `${courses.active || enrolledCoursesList.length || 0} In-Progress`,
      icon: FiBookOpen,
      to: '/student/courses',
      badge: 'Active',
      color: 'bg-blue-50 text-blue-600 border-blue-200'
    },
    {
      title: 'Attendance Register',
      sub: todayAttendance.punched ? 'Today: Present' : 'View Monthly Records',
      icon: FiCalendar,
      to: '/student/attendance',
      badge: todayAttendance.punched ? 'Present' : 'View Only',
      color: todayAttendance.punched ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
    },
    {
      title: 'Digital ID Card',
      sub: 'Verified Student Card',
      icon: FiCreditCard,
      to: '/student/id-card',
      badge: 'Verified',
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200'
    },
    {
      title: 'Online Exams',
      sub: 'CBT Assessments',
      icon: FiAward,
      to: '/student/test',
      badge: 'Assessments',
      color: 'bg-purple-50 text-purple-600 border-purple-200'
    },
    {
      title: 'Certificates',
      sub: `${certificates} Verified Issued`,
      icon: FiShield,
      to: '/student/certificates',
      badge: 'Accredited',
      color: 'bg-teal-50 text-teal-600 border-teal-200'
    },
    {
      title: 'Live Classes',
      sub: `${onlineClasses.length} Scheduled`,
      icon: FiVideo,
      to: '/student/online-classes',
      badge: 'Live',
      color: 'bg-rose-50 text-rose-600 border-rose-200'
    }
  ];

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        {/* 1. TOP OFFICIAL VERIFIED STUDENT IDENTITY BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-primary-950 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
          {/* Subtle Ambient Background Glows */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Student Profile & Official Badges */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-6 min-w-0">
              <div className="relative shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 p-0.5 shadow-lg overflow-hidden">
                  {student.photo || user?.avatar ? (
                    <img
                      src={toAbsoluteUrl(student.photo || user?.avatar)}
                      alt={studentName}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-white bg-slate-800">
                      {firstName.charAt(0)}
                    </div>
                  )}
                </div>
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-slate-900"
                  title="Verified Student ID"
                >
                  <FiCheckCircle className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                    <FiShield className="w-3 h-3 text-emerald-400" />
                    Verified Active Student
                  </span>
                  {franchiseInfo?.centerCode && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-300 border border-white/10">
                      Campus: {franchiseInfo.centerCode}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight truncate">
                  Welcome back, {firstName}! 👋
                </h1>

                {/* Identifier Meta Row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs font-mono text-slate-300">
                  <span className="inline-flex items-center gap-1 text-primary-300 font-semibold">
                    <FiCreditCard className="w-3.5 h-3.5 text-primary-400" />
                    ID: {studentIdNumber}
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="inline-flex items-center gap-1 text-slate-300">
                    <FiAward className="w-3.5 h-3.5 text-amber-400" />
                    Enrollment: {enrollmentNumber}
                  </span>
                  {franchiseInfo?.name && (
                    <>
                      <span className="text-slate-400">|</span>
                      <span className="inline-flex items-center gap-1 text-slate-300 font-sans">
                        <FiMapPin className="w-3.5 h-3.5 text-rose-400" />
                        {franchiseInfo.name}
                        {franchiseInfo.city ? ` (${franchiseInfo.city})` : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick ID Card & Direct Navigation Shortcuts */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/student/id-card"
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/15 backdrop-blur inline-flex items-center gap-2 shadow-sm"
              >
                <FiCreditCard className="w-4 h-4 text-primary-300" />
                <span>View ID Card</span>
              </Link>
              <Link
                to="/student/courses"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-primary-900/50 inline-flex items-center gap-2"
              >
                <span>My Workspace</span>
                <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* 2. TODAY'S ATTENDANCE STATUS WIDGET */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            todayAttendance.punched
              ? 'bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border-emerald-200/90 text-emerald-950'
              : 'bg-gradient-to-r from-slate-50 via-blue-50/30 to-white border-slate-200/90 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                todayAttendance.punched ? 'bg-emerald-600 text-white' : 'bg-primary-600 text-white'
              }`}
            >
              {todayAttendance.punched ? (
                <FiCheckCircle className="w-6 h-6" />
              ) : (
                <FiSmartphone className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Daily Center Attendance
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    todayAttendance.punched
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  {todayAttendance.punched ? 'Verified Present' : 'Mobile QR Scan Required'}
                </span>
              </div>

              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                {todayAttendance.punched
                  ? `Today's Attendance: PRESENT (${todayAttendance.punchInTimeFormatted || 'Verified'})`
                  : 'Daily Attendance: Not Recorded Today'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                {todayAttendance.punched
                  ? 'Your biometric/QR punch is verified with official study center records.'
                  : 'Attendance cannot be marked from the web portal. To punch daily attendance, scan your Study Center QR Code via the SES Educare Mobile App.'}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-2.5">
            {todayAttendance.punched ? (
              <Link
                to="/student/attendance"
                className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5"
              >
                <span>View Attendance Register</span>
                <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setDownloadModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
                >
                  <FiSmartphone className="w-4 h-4" />
                  <span>Download App to Punch</span>
                </button>
                <Link
                  to="/student/attendance"
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold transition inline-flex items-center gap-1"
                >
                  <span>View Register</span>
                  <FiArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 3. DYNAMIC METRIC CARDS (4 PILLARS OF PROGRESS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Syllabus Progress */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Progress</span>
                <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-sm">
                  <FiTarget />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{progress.overallProgress || 0}%</span>
                <span className="text-xs text-slate-500 font-medium">Completed</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {progress.completedTopics || 0} of {progress.totalTopics || 0} topics completed
              </p>
            </div>
            <div className="mt-4 w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-600 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress.overallProgress || 0))}%` }}
              />
            </div>
          </div>

          {/* Card 2: Enrolled Courses */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled Courses</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  <FiBookOpen />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{courses.total || enrolledCoursesList.length || 0}</span>
                <span className="text-xs text-slate-500 font-medium">Active Programs</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {courses.completed || 0} certified · {courses.active || enrolledCoursesList.length || 0} in progress
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 font-semibold pt-1 border-t border-slate-100">
              <Link to="/student/courses" className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
                <span>Browse Syllabus</span>
                <FiArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Card 3: Attendance Compliance */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Rate</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  <FiCalendar />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-600">{attendance.percentage || 100}%</span>
                <span className="text-xs text-emerald-700 font-bold px-2 py-0.5 rounded-full bg-emerald-50">
                  Good Standing
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {attendance.attended || 0} attended of {attendance.totalClasses || 0} classes
              </p>
            </div>
            <div className="mt-4 w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, attendance.percentage || 100))}%` }}
              />
            </div>
          </div>

          {/* Card 4: Tests & Exams */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assessments</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
                  <FiAward />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{recentExams.length}</span>
                <span className="text-xs text-slate-500 font-medium">Tests Attempted</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {recentExams.filter((e) => e.isPassed).length} passed · {certificates} certificates awarded
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 font-semibold pt-1 border-t border-slate-100">
              <Link to="/student/test" className="text-purple-600 hover:text-purple-700 inline-flex items-center gap-1">
                <span>Take Online CBT</span>
                <FiArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* 4. CONTINUE LEARNING HERO WORKSPACE CARD */}
        {primaryCourse && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-6 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center text-white shadow-md relative group">
                  {primaryCourse.thumbnail ? (
                    <img
                      src={toAbsoluteUrl(primaryCourse.thumbnail)}
                      alt={primaryCourse.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FiPlayCircle className="w-8 h-8 text-primary-400 group-hover:scale-110 transition" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary-100 text-primary-800">
                      Primary Course
                    </span>
                    <span className="text-xs text-slate-400">
                      {primaryCourse.category || 'Information Technology'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {primaryCourse.title || 'Interactive Course Workspace'}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>Progress: <strong>{primaryCourseProgress}%</strong></span>
                    <span>·</span>
                    <span>Self-Paced with Verified Certification</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/student/courses/${primaryCourse._id || primaryCourse.id}/learn`)}
                  className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-primary-900/30 inline-flex items-center gap-2"
                >
                  <FiPlayCircle className="w-4 h-4" />
                  <span>Resume Learning</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <FiZap className="w-3.5 h-3.5 text-amber-500" />
                Anti-Piracy Protected Stream & Single Moving Watermark Enabled
              </span>
              <Link to="/student/courses" className="text-primary-600 hover:text-primary-700 font-semibold">
                View All Courses →
              </Link>
            </div>
          </div>
        )}

        {/* 5. ACADEMIC SERVICES GRID (6-ITEM QUICK ACCESS HUB) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FiZap className="text-primary-600" />
              <span>Academic Services & Portals</span>
            </h2>
            <span className="text-xs text-slate-400">Full Student Workspace</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {academicServices.map((srv, idx) => {
              const Icon = srv.icon;
              return (
                <Link
                  key={idx}
                  to={srv.to}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-primary-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${srv.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600 group-hover:bg-primary-50 group-hover:text-primary-700 transition">
                        {srv.badge}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-primary-600 transition">
                      {srv.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 truncate">{srv.sub}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 6. DAILY STUDY TIP & MOTIVATION BANNER */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-lg">
            💡
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
              Daily Smart Study Tip
            </p>
            <p className="text-xs sm:text-sm text-slate-700 font-medium mt-0.5 leading-relaxed">
              {todayTip}
            </p>
          </div>
        </div>

        {/* 7. SPLIT CONTENT: ASSESSMENTS & CLASSES (LEFT) + PROGRESS & NOTICES (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Recent Assessments & Test Scores */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FiCheckSquare className="text-primary-600" />
                  <span>Recent Assessment Results</span>
                </h3>
                <Link to="/student/results" className="text-xs font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
                  <span>View All</span>
                  <FiArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {recentExams.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <FiAward className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold">No tests attempted yet</p>
                    <p className="text-xs text-slate-400 mt-1">Take your module tests to evaluate learning performance.</p>
                    <Link
                      to="/student/test"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline"
                    >
                      Start Mock Test →
                    </Link>
                  </div>
                ) : (
                  recentExams.slice(0, 4).map((test, tIdx) => {
                    const isPass = test.isPassed || (test.percentage || 0) >= 40;
                    return (
                      <div
                        key={test._id || tIdx}
                        className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/70 transition flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {test.percentage != null ? `${test.percentage}%` : 'CBT'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {test.exam?.title || test.title || `Module Assessment ${tIdx + 1}`}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {test.date ? new Date(test.date).toLocaleDateString() : 'Recent Test'} · Marks: {test.obtainedMarks || 0}/{test.totalMarks || 100}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                            isPass
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPass ? 'Passed' : 'Needs Review'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 text-right">
              <Link to="/student/test" className="text-xs font-bold text-purple-600 hover:text-purple-700 inline-flex items-center gap-1">
                <span>Take CBT Assessment</span>
                <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* RIGHT: Learning Progress Breakdown & Circular Ring */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <FiBarChart2 className="text-primary-600" />
                  <span>Curriculum Completion</span>
                </h3>
                <span className="text-xs font-bold text-primary-600">
                  {progress.overallProgress || 0}% Completed
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
                <div className="w-36 h-36 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={64}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-lg font-black text-slate-900">{progress.overallProgress || 0}%</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Syllabus</span>
                  </div>
                </div>

                <div className="space-y-2.5 flex-1 w-full">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">Completed Topics</span>
                    <span className="text-xs font-bold text-primary-700">
                      {progress.completedTopics || 0} / {progress.totalTopics || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">Completed Chapters</span>
                    <span className="text-xs font-bold text-indigo-700">
                      {progress.completedChapters || 0} / {progress.totalChapters || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">Verified Certificate Status</span>
                    <span className="text-xs font-bold text-emerald-700">
                      {progress.overallProgress >= 80 ? 'Eligible' : 'In Progress'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Updated automatically with playback tracking</span>
              <Link to="/student/progress" className="text-primary-600 hover:text-primary-700 font-semibold">
                Detailed Analytics →
              </Link>
            </div>
          </div>
        </div>

        {/* 8. LIVE SCHEDULED CLASSES & OFFICIAL NOTICES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scheduled Live Classes */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FiVideo className="text-rose-500" />
                <span>Scheduled Live Lectures</span>
              </h3>
              <Link to="/student/online-classes" className="text-xs font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
                <span>View All</span>
                <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {onlineClasses.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FiVideo className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">No live classes scheduled today</p>
                  <p className="text-xs text-slate-400 mt-0.5">Your mentor will broadcast when a live session is scheduled.</p>
                </div>
              ) : (
                onlineClasses.slice(0, 3).map((item) => (
                  <div key={item._id} className="p-3.5 rounded-xl border border-slate-200/80 hover:border-primary-300 transition flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.course?.title || item.title || 'Live Classroom'}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3" /> {new Date(item.scheduledDate).toLocaleDateString()}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><FiClock className="w-3 h-3" /> {new Date(item.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {item.meetingLink ? (
                      <a
                        href={item.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition inline-flex items-center gap-1 shrink-0 shadow-xs"
                      >
                        <span>Join</span>
                        <FiExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                        Scheduled
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Official Notices & Broadcasts */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FiBell className="text-amber-500" />
                <span>Official Center Announcements</span>
              </h3>
              <Link to="/student/notifications" className="text-xs font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
                <span>All Notices</span>
                <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FiBell className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">No new announcements</p>
                  <p className="text-xs text-slate-400 mt-0.5">You are up-to-date with all center broadcasts.</p>
                </div>
              ) : (
                notifications.slice(0, 3).map((item) => (
                  <div key={item._id} className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-100/60 transition">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{item.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 9. OFFICIAL ACCREDITATION & TRUST FOOTER */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold shrink-0">
              <FiShield className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                SES Educare Certified Education Network
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Official learning curriculum, digital student credentials, and examination records are cryptographically verified and recognized.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
              <FiCheckCircle className="w-3.5 h-3.5" /> 100% Anti-Piracy Protected
            </span>
          </div>
        </div>

        {/* Mobile Download Modal for Attendance Scanning */}
        <DownloadAppModal
          isOpen={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
        />
      </div>
    </Layout>
  );
}
