import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';

/**
 * Unified Horizontal Top Tab Bar across all portals and roles.
 * Ensures 100% consistent sub-navigation on every Admin, School, Teacher, Accountant, Parent, and Student page.
 */
export default function SectionNavTabs({ extraActions = null, portalRef = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkCanvas, themeMode } = useBranding();
  const role = user?.role || 'super_admin';
  const pathname = location.pathname;
  const search = location.search;

  const requestedReportCategory = new URLSearchParams(search).get('category') || 'all';
  const isReportDetailPath = pathname.startsWith('/admin/reports/') || pathname.startsWith('/school/reports/');
  const reportCategoryFromPath = isReportDetailPath
    ? pathname.includes('/student-') ? 'student'
      : pathname.includes('/course-') ? 'course'
        : pathname.includes('/franchise-') || pathname.includes('/campus-') ? 'campus'
          : pathname.includes('/staff-') || pathname.endsWith('/payroll') ? 'staff'
            : 'financial'
    : requestedReportCategory;

  // 1. MULTI-CAMPUS SCHOOL OWNER / SUPER ADMIN (/admin/*)
  const ownerAdminSections = {
    dashboard: {
      matchPrefixes: ['/admin/dashboard'],
      tabs: [
        { label: 'Overview', path: '/admin/dashboard', exact: true },
        { label: 'School Campuses', path: '/admin/campuses' },
        { label: 'All Students', path: '/admin/students' },
        { label: 'Fee Desk', path: '/admin/school-fees' },
        { label: 'AI Center', path: '/admin/ai-center' },
        { label: 'Branding & Theme', path: '/admin/branding' },
      ]
    },
    campuses: {
      matchPrefixes: ['/admin/campuses', '/admin/franchises', '/admin/subscription-plans', '/admin/seat-requests'],
      tabs: [
        { label: 'School Campuses', path: '/admin/campuses', exact: true },
        { label: 'Register School', path: '/admin/campuses/add' },
        { label: 'Student Quotas', path: '/admin/seat-requests' },
        { label: 'School Certificates (TC)', path: '/admin/transfer-certificates' },
      ]
    },
    students: {
      matchPrefixes: [
        '/admin/students', '/admin/student-promotion', '/admin/classes', '/admin/sections',
        '/admin/transfer-certificates', '/admin/student-certificates', '/admin/id-cards',
        '/admin/enquiries', '/admin/admissions'
      ],
      tabs: [
        { label: 'All Students', path: '/admin/students', exact: true },
        { label: 'Admissions & Enquiry', path: '/admin/enquiries' },
        { label: 'Promotion', path: '/admin/student-promotion' },
        { label: 'Classes', path: '/admin/classes' },
        { label: 'Sections', path: '/admin/sections' },
        { label: 'Transfer Certificates (TC)', path: '/admin/transfer-certificates' },
        { label: 'ID Cards', path: '/admin/id-cards' },
        { label: 'Student Certificates', path: '/admin/student-certificates' },
      ]
    },
    academics: {
      matchPrefixes: [
        '/admin/academic-setup', '/admin/academic-years', '/admin/subjects', '/admin/courses',
        '/admin/programs', '/admin/batches', '/admin/timetable', '/admin/homework',
        '/admin/online-classes', '/admin/topic'
      ],
      tabs: [
        { label: 'Academic Sessions', path: '/admin/academic-setup' },
        { label: 'Subjects & Curriculum', path: '/admin/subjects' },
        { label: 'Smart Timetable', path: '/admin/timetable' },
        { label: 'Homework & Diary', path: '/admin/homework' },
        { label: 'Online Classes', path: '/admin/online-classes' },
      ]
    },
    attendance: {
      matchPrefixes: ['/admin/school-attendance', '/admin/attendance', '/admin/staff-attendance'],
      tabs: [
        { label: 'Student Attendance', path: '/admin/school-attendance' },
        { label: 'Staff Attendance', path: '/admin/staff-attendance' },
        { label: 'Attendance Reports', path: '/admin/reports/student-attendance' },
      ]
    },
    examinations: {
      matchPrefixes: ['/admin/examinations', '/admin/exam-seating', '/admin/exams', '/admin/mcqs', '/admin/marksheet-templates', '/admin/generate-marksheet'],
      tabs: [
        { label: 'Examinations', path: '/admin/examinations' },
        { label: 'Anti-Cheat Seating', path: '/admin/exam-seating' },
        { label: 'CCE Report Cards', path: '/admin/marksheet-templates' },
        { label: 'MCQ & Quiz Bank', path: '/admin/mcqs' },
      ]
    },
    payments: {
      matchPrefixes: ['/admin/school-fees', '/admin/accounting-ledger', '/admin/financial-ledger', '/admin/payments'],
      tabs: [
        { label: 'School Fee Desk', path: '/admin/school-fees' },
        { label: 'Accounting Ledger', path: '/admin/accounting-ledger' },
        { label: 'Financial Ledger', path: '/admin/financial-ledger', matchCheck: (p) => p === '/admin/financial-ledger' && !search.includes('tab=') },
        { label: 'Expenses', path: '/admin/financial-ledger?tab=expenses', matchCheck: () => search.includes('tab=expenses') },
        { label: 'Profit & Loss', path: '/admin/financial-ledger?tab=pnl', matchCheck: () => search.includes('tab=pnl') },
        { label: 'Manage Payments', path: '/admin/payments', exact: true },
      ]
    },
    staff: {
      matchPrefixes: ['/admin/staff', '/admin/staff-salary', '/admin/advance-payment', '/admin/shifts', '/admin/leaves'],
      tabs: [
        { label: 'Staff Directory', path: '/admin/staff', exact: true },
        { label: 'Add Staff', path: '/admin/staff/add' },
        { label: 'Shifts & Leaves', path: '/admin/shifts' },
        { label: 'Payroll & Salary', path: '/admin/staff-salary' },
        { label: 'Advances', path: '/admin/advance-payment' },
      ]
    },
    operations: {
      matchPrefixes: ['/admin/transport', '/admin/library', '/admin/hostel', '/admin/inventory', '/admin/visitors', '/admin/events', '/admin/discipline', '/admin/ptm'],
      tabs: [
        { label: 'Transport & GPS', path: '/admin/transport' },
        { label: 'Library', path: '/admin/library' },
        { label: 'Hostel', path: '/admin/hostel' },
        { label: 'Inventory & Store', path: '/admin/inventory' },
        { label: 'Visitor Gate', path: '/admin/visitors' },
        { label: 'Events & PTM', path: '/admin/events' },
        { label: 'Discipline', path: '/admin/discipline' },
      ]
    },
    reports: {
      matchPrefixes: ['/admin/reports'],
      tabs: [
        { label: 'All Reports', path: '/admin/reports', matchCheck: () => reportCategoryFromPath === 'all' },
        { label: 'Students', path: '/admin/reports?category=student', matchCheck: () => reportCategoryFromPath === 'student' },
        { label: 'Financial', path: '/admin/reports?category=financial', matchCheck: () => reportCategoryFromPath === 'financial' },
        { label: 'School Campuses', path: '/admin/reports?category=campus', matchCheck: () => reportCategoryFromPath === 'campus' || reportCategoryFromPath === 'franchise' },
        { label: 'Staff', path: '/admin/reports?category=staff', matchCheck: () => reportCategoryFromPath === 'staff' },
      ]
    },
    settings: {
      matchPrefixes: [
        '/admin/branding', '/admin/company-profile', '/admin/users', '/admin/ai-center',
        '/admin/onboarding', '/admin/notifications', '/admin/website-settings',
        '/admin/testimonials', '/admin/gallery', '/admin/app-management', '/admin/activity', '/admin/profile'
      ],
      tabs: [
        { label: 'Branding & Theme', path: '/admin/branding' },
        { label: 'School Profile', path: '/admin/company-profile' },
        { label: 'Users & Roles', path: '/admin/users' },
        { label: 'AI Center', path: '/admin/ai-center' },
        { label: 'Bulk Onboarding', path: '/admin/onboarding' },
        { label: 'Communications', path: '/admin/notifications' },
        { label: 'Audit Logs', path: '/admin/activity' },
      ]
    }
  };

  // 2. SINGLE CAMPUS PRINCIPAL / ADMIN (/school/*)
  const campusAdminSections = {
    dashboard: {
      matchPrefixes: ['/school/dashboard'],
      tabs: [
        { label: 'Campus Overview', path: '/school/dashboard', exact: true },
        { label: 'Students', path: '/school/students' },
        { label: 'Attendance', path: '/school/school-attendance' },
        { label: 'Fee Desk', path: '/school/school-fees' },
        { label: 'Examinations', path: '/school/examinations' },
        { label: 'Branding & Settings', path: '/school/branding' },
      ]
    },
    students: {
      matchPrefixes: ['/school/students', '/school/student-promotion', '/school/classes', '/school/sections', '/school/transfer-certificates', '/school/student-certificates', '/school/id-cards'],
      tabs: [
        { label: 'All Students', path: '/school/students', exact: true },
        { label: 'Promotion', path: '/school/student-promotion' },
        { label: 'Classes & Sections', path: '/school/classes' },
        { label: 'Transfer Certificates (TC)', path: '/school/transfer-certificates' },
        { label: 'ID Cards', path: '/school/id-cards' },
        { label: 'Student Certificates', path: '/school/student-certificates' },
      ]
    },
    academics: {
      matchPrefixes: ['/school/academic-setup', '/school/timetable', '/school/homework', '/school/courses', '/school/online-classes'],
      tabs: [
        { label: 'Academic Master', path: '/school/academic-setup' },
        { label: 'Smart Timetable', path: '/school/timetable' },
        { label: 'Homework & Diary', path: '/school/homework' },
        { label: 'Online Classes', path: '/school/online-classes' },
      ]
    },
    attendance: {
      matchPrefixes: ['/school/school-attendance', '/school/attendance', '/school/staff-attendance'],
      tabs: [
        { label: 'Student Attendance', path: '/school/school-attendance' },
        { label: 'Staff Attendance', path: '/school/staff-attendance' },
      ]
    },
    examinations: {
      matchPrefixes: ['/school/examinations', '/school/exam-seating', '/school/marksheet-templates', '/school/generate-marksheet'],
      tabs: [
        { label: 'Examinations', path: '/school/examinations' },
        { label: 'Anti-Cheat Seating', path: '/school/exam-seating' },
        { label: 'CCE Report Cards', path: '/school/marksheet-templates' },
      ]
    },
    payments: {
      matchPrefixes: ['/school/school-fees', '/school/accounting-ledger', '/school/financial-ledger', '/school/payments', '/school/fees'],
      tabs: [
        { label: 'School Fee Desk', path: '/school/school-fees' },
        { label: 'Accounting Ledger', path: '/school/accounting-ledger' },
        { label: 'Manage Payments', path: '/school/payments', exact: true },
        { label: 'Add Payment', path: '/school/payments/add' },
      ]
    },
    staff: {
      matchPrefixes: ['/school/staff', '/school/staff-salary'],
      tabs: [
        { label: 'All Staff', path: '/school/staff', exact: true },
        { label: 'Add Staff', path: '/school/staff/add' },
        { label: 'Staff Attendance', path: '/school/staff-attendance' },
        { label: 'Staff Payroll', path: '/school/staff-salary' },
      ]
    },
    reports: {
      matchPrefixes: ['/school/reports'],
      tabs: [
        { label: 'All Reports', path: '/school/reports', matchCheck: () => reportCategoryFromPath === 'all' },
        { label: 'Students', path: '/school/reports?category=student', matchCheck: () => reportCategoryFromPath === 'student' },
        { label: 'Financial', path: '/school/reports?category=financial', matchCheck: () => reportCategoryFromPath === 'financial' },
        { label: 'Staff', path: '/school/reports?category=staff', matchCheck: () => reportCategoryFromPath === 'staff' },
      ]
    },
    settings: {
      matchPrefixes: ['/school/branding', '/school/settings', '/school/profile', '/school/notifications', '/school/ai-center', '/school/onboarding', '/school/transport', '/school/library', '/school/hostel', '/school/inventory'],
      tabs: [
        { label: 'Branding & Theme', path: '/school/branding' },
        { label: 'Campus Settings', path: '/school/settings' },
        { label: 'AI Center', path: '/school/ai-center' },
        { label: 'Notifications', path: '/school/notifications' },
        { label: 'My Profile', path: '/school/profile' },
      ]
    }
  };

  // 3. UNIFIED STUDENT PORTAL TOP TAB BAR (Consistent across EVERY Student Page!)
  const studentUnifiedTabs = [
    { label: 'Dashboard', path: '/student/dashboard', exact: true },
    { label: 'Attendance', path: '/student/attendance' },
    { label: 'Courses & Subjects', path: '/student/courses' },
    { label: 'Online Exams', path: '/student/exams' },
    { label: 'Results & Marks', path: '/student/results' },
    { label: 'Fees & Receipts', path: '/student/payments' },
    { label: 'Report Cards', path: '/student/marksheets' },
    { label: 'Certificates & TC', path: '/student/certificates' },
    { label: 'Digital ID Card', path: '/student/id-card' },
    { label: 'Live Classes', path: '/student/online-classes' },
  ];

  const studentSections = {
    all: {
      matchPrefixes: ['/student/'],
      tabs: studentUnifiedTabs
    }
  };

  // 4. TEACHER, PARENT & ACCOUNTANT WORKSPACES
  const teacherSections = {
    all: {
      matchPrefixes: ['/teacher/', '/school/'],
      tabs: [
        { label: 'Teacher Dashboard', path: '/teacher/dashboard', exact: true },
        { label: 'Mark Attendance', path: '/school/school-attendance' },
        { label: 'Homework & Diary', path: '/school/homework' },
        { label: 'Examinations', path: '/school/examinations' },
        { label: 'Timetable', path: '/school/timetable' },
        { label: 'Students', path: '/school/students' },
        { label: 'AI Copilot', path: '/school/ai-center' },
      ]
    }
  };

  const parentSections = {
    all: {
      matchPrefixes: ['/parent/', '/student/'],
      tabs: [
        { label: 'Parent Dashboard', path: '/parent/dashboard', exact: true },
        { label: 'Attendance', path: '/student/attendance' },
        { label: 'Pay Fees & Receipts', path: '/student/payments' },
        { label: 'Report Cards', path: '/student/marksheets' },
        { label: 'Exam Results', path: '/student/results' },
      ]
    }
  };

  const accountantSections = {
    all: {
      matchPrefixes: ['/accountant/', '/school/'],
      tabs: [
        { label: 'Accounts Dashboard', path: '/accountant/dashboard', exact: true },
        { label: 'School Fee Desk', path: '/school/school-fees' },
        { label: 'Financial Ledger', path: '/school/accounting-ledger' },
        { label: 'Staff Payroll', path: '/school/staff-salary' },
        { label: 'Financial Reports', path: '/school/reports' },
      ]
    }
  };

  const isSchoolRoute = pathname.startsWith('/school/');
  const isStudentRoute = pathname.startsWith('/student/');
  const activeSectionsConfig =
    role === 'teacher' || role === 'class_teacher' ? teacherSections :
    role === 'accountant' ? accountantSections :
    role === 'parent' ? parentSections :
    role === 'student' || isStudentRoute ? studentSections :
    isSchoolRoute || ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(role) ? campusAdminSections :
    ownerAdminSections;

  let currentSection = null;
  for (const [, section] of Object.entries(activeSectionsConfig)) {
    if (section.matchPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      currentSection = section;
      break;
    }
  }

  // Fallback so no page EVER renders an empty tab strip
  if (!currentSection) {
    currentSection = Object.values(activeSectionsConfig)[0];
  }

  const isDashboard = pathname.endsWith('/dashboard');
  const isSectionRoot = currentSection?.tabs?.some((t) => pathname === t.path.split('?')[0]);
  const isSubPage = !isDashboard && !isSectionRoot;

  const isTabActive = (tab) => {
    if (tab.matchCheck) return tab.matchCheck(pathname);
    if (tab.exact) return pathname === tab.path.split('?')[0];
    return pathname.startsWith(tab.path.split('?')[0]);
  };

  return (
    <div
      className={`border-b shadow-sm z-30 flex-shrink-0 px-3 sm:px-5 lg:px-6 transition-colors duration-200 ${
        isDarkCanvas
          ? 'bg-slate-900 border-slate-800'
          : themeMode === 'tinted-studio'
            ? 'bg-white/90 backdrop-blur-sm border-slate-200/80'
            : 'bg-white border-slate-200/90'
      }`}
    >
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between min-h-[44px] gap-2 sm:gap-3 py-0.5 sm:py-0">
        {/* Left Side: Consistent Horizontal Top Section Tabs */}
        <div className="flex items-center min-w-0 flex-1 overflow-x-auto no-scrollbar gap-0.5 -mb-px">
          {currentSection?.tabs?.map((tab, idx) => {
            const active = isTabActive(tab);
            return (
              <Link
                key={idx}
                to={tab.path}
                style={active ? (
                  isDarkCanvas ? {
                    color: 'rgb(var(--brand-300))',
                    borderBottomColor: 'rgb(var(--brand-400))',
                    backgroundColor: 'rgb(var(--brand-600) / 0.18)'
                  } : {
                    color: 'rgb(var(--brand-700))',
                    borderBottomColor: 'rgb(var(--brand-600))',
                    backgroundColor: 'rgb(var(--brand-50) / 0.72)'
                  }
                ) : undefined}
                className={`text-xs font-semibold px-3 py-2.5 rounded-t-md transition-all whitespace-nowrap border-b-2 flex items-center gap-1.5 ${
                  active
                    ? 'font-bold'
                    : isDarkCanvas
                      ? 'text-slate-300 border-transparent hover:text-white hover:bg-slate-800/80 hover:border-slate-600'
                      : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Right Side: Back Button & Contextual Page Actions */}
        <div className="flex items-center gap-2 py-1 shrink-0 ml-auto">
          {isSubPage && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition whitespace-nowrap"
              title="Go back to previous page"
            >
              <FiArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          {extraActions && (
            <div className="flex items-center gap-2">
              {extraActions}
            </div>
          )}

          {/* Contextual Action Portal Container */}
          <div
            ref={portalRef}
            id="header-extra-actions-portal"
            className="flex items-center gap-2 empty:hidden [&_button]:text-xs [&_button]:py-1.5 [&_button]:px-3 [&_button]:whitespace-nowrap [&_a]:text-xs [&_a]:py-1.5 [&_a]:px-3 [&_a]:whitespace-nowrap"
          />
        </div>
      </div>
    </div>
  );
}
