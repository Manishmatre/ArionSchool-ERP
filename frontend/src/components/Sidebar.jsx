import { APP_VERSION } from '../config/version';
import React, { useRef, useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useBranding } from '../context/BrandingContext';
import { TbCurrencyRupee } from 'react-icons/tb';
import {
  FiHome, FiUsers, FiCheckSquare, FiBarChart2, FiAward, FiActivity,
  FiBookOpen, FiBriefcase, FiCalendar, FiBell, FiImage,
  FiMail, FiUserCheck, FiChevronLeft, FiChevronRight,
  FiSettings, FiLayers, FiFileText, FiGlobe, FiVideo,
  FiCreditCard, FiTrendingUp, FiStar, FiSmartphone, FiBox, FiDollarSign,
  FiShield, FiTruck, FiMessageSquare, FiUploadCloud, FiAlertTriangle, FiPieChart,
  FiClock, FiGrid, FiEdit3, FiDroplet
} from 'react-icons/fi';

let persistedScrollTop = 0;

const Sidebar = ({ role, user, isOpen = true, toggleSidebar = () => { } }) => {
  const location = useLocation();
  const scrollRef = useRef(null);
  const { schoolName, shortName, logoUrl, branding, isLightSidebar } = useBranding();
  const pathname = location.pathname;
  const portalLabel = 
    role === 'school_owner' ? 'School Owner Super Admin' :
    role === 'super_admin' ? 'Multi-Campus Super Admin' :
    (role === 'franchise_admin' || role === 'school_admin' || role === 'principal' || role === 'vice_principal') ? 'Campus Admin Portal' :
    (role === 'teacher' || role === 'class_teacher') ? 'Teacher Portal' :
    role === 'parent' ? 'Parent & Guardian Portal' :
    role === 'accountant' ? 'Accounts Desk' :
    role === 'admission_officer' ? 'Admissions Office' :
    role === 'hr_manager' ? 'Human Resources' :
    role === 'librarian' ? 'Library Desk' :
    role === 'security_staff' ? 'Campus Security' :
    role === 'transport_manager' ? 'Transport Desk' :
    'Student Portal';

  // Structured Multi-Campus School Owner / Super Admin Navigation
  const superAdminMenu = [
    {
      path: '/admin/dashboard',
      icon: FiHome,
      label: 'Owner Super Dashboard',
      matchPrefixes: ['/admin/dashboard']
    },
    {
      path: '/admin/campuses',
      icon: FiGlobe,
      label: 'Multi-Campus Manager',
      matchPrefixes: ['/admin/campuses']
    },

    // 1. STUDENT MANAGEMENT
    { section: 'Student Management' },
    {
      path: '/admin/enquiries',
      icon: FiMail,
      label: 'Admissions & Enquiry',
      matchPrefixes: ['/admin/enquiries', '/admin/admissions']
    },
    {
      path: '/admin/students',
      icon: FiUsers,
      label: 'All Students (SIS)',
      matchPrefixes: ['/admin/students']
    },
    {
      path: '/admin/student-promotion',
      icon: FiTrendingUp,
      label: 'Student Promotion',
      matchPrefixes: ['/admin/student-promotion']
    },
    {
      path: '/admin/classes',
      icon: FiLayers,
      label: 'Class Management',
      matchPrefixes: ['/admin/classes']
    },
    {
      path: '/admin/sections',
      icon: FiGrid,
      label: 'Section Management',
      matchPrefixes: ['/admin/sections']
    },
    {
      path: '/admin/transfer-certificates',
      icon: FiFileText,
      label: 'Student Documents & TC',
      matchPrefixes: ['/admin/transfer-certificates', '/admin/student-certificates']
    },

    // 2. ACADEMICS
    { section: 'Academics' },
    {
      path: '/admin/academic-setup',
      icon: FiCalendar,
      label: 'Academic Sessions',
      matchPrefixes: ['/admin/academic-setup', '/admin/academic-years']
    },
    {
      path: '/admin/subjects',
      icon: FiBookOpen,
      label: 'Subjects & Curriculum',
      matchPrefixes: ['/admin/subjects', '/admin/courses']
    },
    {
      path: '/admin/timetable',
      icon: FiClock,
      label: 'Smart Timetable',
      matchPrefixes: ['/admin/timetable']
    },
    {
      path: '/admin/homework',
      icon: FiEdit3,
      label: 'Homework & Diary',
      matchPrefixes: ['/admin/homework']
    },

    // 3. ATTENDANCE
    { section: 'Attendance' },
    {
      path: '/admin/school-attendance',
      icon: FiCheckSquare,
      label: 'Student Attendance',
      matchPrefixes: ['/admin/school-attendance', '/admin/attendance']
    },
    {
      path: '/admin/staff-attendance',
      icon: FiUserCheck,
      label: 'Staff Attendance',
      matchPrefixes: ['/admin/staff-attendance']
    },
    {
      path: '/admin/reports/student-attendance',
      icon: FiBarChart2,
      label: 'Attendance Reports',
      matchPrefixes: ['/admin/reports/student-attendance', '/admin/reports/staff-attendance']
    },

    // 4. EXAMINATIONS
    { section: 'Examinations' },
    {
      path: '/admin/examinations',
      icon: FiAward,
      label: 'Examination Setup',
      matchPrefixes: ['/admin/examinations']
    },
    {
      path: '/admin/marksheet-templates',
      icon: FiFileText,
      label: 'Marks Entry & CCE Cards',
      matchPrefixes: ['/admin/marksheet-templates', '/admin/generate-marksheet']
    },
    {
      path: '/admin/reports/student-performance',
      icon: FiTrendingUp,
      label: 'Results & Performance',
      matchPrefixes: ['/admin/reports/student-performance']
    },

    // 5. FEES & ACCOUNTS
    { section: 'Fees & Accounts' },
    {
      path: '/admin/school-fees',
      icon: TbCurrencyRupee,
      label: 'Fee Structure & Heads',
      matchPrefixes: ['/admin/school-fees']
    },
    {
      path: '/admin/payments',
      icon: FiCreditCard,
      label: 'Fee Collection & Receipts',
      matchPrefixes: ['/admin/payments']
    },
    {
      path: '/admin/accounting-ledger',
      icon: FiDollarSign,
      label: 'Financial Ledger & Cashbook',
      matchPrefixes: ['/admin/accounting-ledger', '/admin/financial-ledger']
    },
    {
      path: '/admin/reports/revenue',
      icon: FiPieChart,
      label: 'Financial Reports',
      matchPrefixes: ['/admin/reports/revenue', '/admin/reports/payment']
    },

    // 6. STAFF MANAGEMENT
    { section: 'Staff Management' },
    {
      path: '/admin/staff',
      icon: FiUsers,
      label: 'Teachers & Employees',
      matchPrefixes: ['/admin/staff']
    },
    {
      path: '/admin/staff-salary',
      icon: TbCurrencyRupee,
      label: 'Payroll & Salary',
      matchPrefixes: ['/admin/staff-salary', '/admin/advance-payment']
    },
    {
      path: '/admin/leaves',
      icon: FiCalendar,
      label: 'Leave Management',
      matchPrefixes: ['/admin/leaves']
    },

    // 7. SCHOOL OPERATIONS
    { section: 'School Operations' },
    {
      path: '/admin/transport',
      icon: FiTruck,
      label: 'Transport & GPS Fleet',
      matchPrefixes: ['/admin/transport']
    },
    {
      path: '/admin/library',
      icon: FiBookOpen,
      label: 'Library Books & Circulation',
      matchPrefixes: ['/admin/library']
    },
    {
      path: '/admin/id-cards',
      icon: FiAward,
      label: 'Student & Staff ID Cards',
      matchPrefixes: ['/admin/id-cards']
    },
    {
      path: '/admin/visitor-pass',
      icon: FiShield,
      label: 'Visitor Gate Pass',
      matchPrefixes: ['/admin/visitor-pass']
    },
    {
      path: '/admin/hostel',
      icon: FiHome,
      label: 'Hostel & Residence',
      matchPrefixes: ['/admin/hostel']
    },
    {
      path: '/admin/inventory',
      icon: FiBox,
      label: 'Inventory & Assets',
      matchPrefixes: ['/admin/inventory']
    },
    {
      path: '/admin/events-calendar',
      icon: FiCalendar,
      label: 'Events & Calendar',
      matchPrefixes: ['/admin/events-calendar', '/admin/gallery']
    },
    {
      path: '/admin/communications',
      icon: FiMessageSquare,
      label: 'Communications & WhatsApp',
      matchPrefixes: ['/admin/communications']
    },
    {
      path: '/admin/surveys',
      icon: FiPieChart,
      label: 'School Surveys',
      matchPrefixes: ['/admin/surveys']
    },

    // 8. ADMINISTRATION
    { section: 'Administration' },
    {
      path: '/admin/users',
      icon: FiUserCheck,
      label: 'Users & Roles (RBAC)',
      matchPrefixes: ['/admin/users']
    },
    {
      path: '/admin/company-profile',
      icon: FiSettings,
      label: 'School Settings',
      matchPrefixes: ['/admin/company-profile', '/admin/website-settings']
    },
    {
      path: '/admin/settings/branding',
      icon: FiDroplet,
      label: 'School Branding & Identity',
      matchPrefixes: ['/admin/settings/branding', '/admin/branding']
    },
    {
      path: '/admin/campuses',
      icon: FiLayers,
      label: 'School Campuses',
      matchPrefixes: ['/admin/campuses', '/admin/franchises']
    },
    {
      path: '/admin/onboarding',
      icon: FiUploadCloud,
      label: 'Excel Onboarding & Import',
      matchPrefixes: ['/admin/onboarding']
    },
    {
      path: '/admin/notifications',
      icon: FiBell,
      label: 'Notifications',
      matchPrefixes: ['/admin/notifications']
    },
    {
      path: '/admin/activity',
      icon: FiAlertTriangle,
      label: 'Audit & Activity Logs',
      matchPrefixes: ['/admin/activity']
    }
  ];

  const franchiseAdminMenu = [
    {
      path: '/school/dashboard',
      icon: FiHome,
      label: 'Campus Dashboard',
      matchPrefixes: ['/school/dashboard']
    },

    // Student Management
    { section: 'Student Management' },
    {
      path: '/school/students',
      icon: FiUsers,
      label: 'All Students',
      matchPrefixes: ['/school/students']
    },
    {
      path: '/school/student-promotion',
      icon: FiTrendingUp,
      label: 'Student Promotion',
      matchPrefixes: ['/school/student-promotion']
    },
    {
      path: '/school/classes',
      icon: FiLayers,
      label: 'Classes & Sections',
      matchPrefixes: ['/school/classes', '/school/sections']
    },
    {
      path: '/school/transfer-certificates',
      icon: FiFileText,
      label: 'Transfer Certificates (TC)',
      matchPrefixes: ['/school/transfer-certificates']
    },

    // Academics & Classes
    { section: 'Academics' },
    {
      path: '/school/academic-setup',
      icon: FiCalendar,
      label: 'Academic Master',
      matchPrefixes: ['/school/academic-setup']
    },
    {
      path: '/school/timetable',
      icon: FiClock,
      label: 'Smart Timetable',
      matchPrefixes: ['/school/timetable']
    },
    {
      path: '/school/homework',
      icon: FiEdit3,
      label: 'Homework & Diary',
      matchPrefixes: ['/school/homework']
    },

    // Attendance
    { section: 'Attendance' },
    {
      path: '/school/school-attendance',
      icon: FiCheckSquare,
      label: 'Student Attendance',
      matchPrefixes: ['/school/school-attendance', '/school/attendance']
    },
    {
      path: '/school/staff-attendance',
      icon: FiUserCheck,
      label: 'Staff Attendance',
      matchPrefixes: ['/school/staff-attendance']
    },
    {
      path: '/school/staff',
      icon: FiUsers,
      label: 'Teachers & Employees',
      matchPrefixes: ['/school/staff/']
    },

    // Examinations
    { section: 'Examinations' },
    {
      path: '/school/examinations',
      icon: FiAward,
      label: 'Examinations & CCE',
      matchPrefixes: ['/school/examinations']
    },

    // Fees & Accounts
    { section: 'Fees & Accounts' },
    {
      path: '/school/school-fees',
      icon: TbCurrencyRupee,
      label: 'School Fees',
      matchPrefixes: ['/school/school-fees']
    },
    {
      path: '/school/accounting-ledger',
      icon: FiTrendingUp,
      label: 'Accounts & Ledger',
      matchPrefixes: ['/school/accounting-ledger', '/school/payments']
    },

    // Operations
    { section: 'Campus Operations' },
    {
      path: '/school/transport',
      icon: FiTruck,
      label: 'Transport & GPS Fleet',
      matchPrefixes: ['/school/transport']
    },
    {
      path: '/school/library',
      icon: FiBookOpen,
      label: 'Library Circulation',
      matchPrefixes: ['/school/library']
    },
    {
      path: '/school/visitor-pass',
      icon: FiShield,
      label: 'Visitor Gate Pass',
      matchPrefixes: ['/school/visitor-pass']
    },
    {
      path: '/school/hostel',
      icon: FiHome,
      label: 'Hostel & Residence',
      matchPrefixes: ['/school/hostel']
    },
    {
      path: '/school/inventory',
      icon: FiBox,
      label: 'Inventory & Assets',
      matchPrefixes: ['/school/inventory']
    },
    {
      path: '/school/events-calendar',
      icon: FiCalendar,
      label: 'Events & Calendar',
      matchPrefixes: ['/school/events-calendar']
    },
    {
      path: '/school/communications',
      icon: FiMessageSquare,
      label: 'Communications & Bot',
      matchPrefixes: ['/school/communications']
    },
    {
      path: '/school/surveys',
      icon: FiPieChart,
      label: 'School Surveys',
      matchPrefixes: ['/school/surveys']
    },
    {
      path: '/school/onboarding',
      icon: FiUploadCloud,
      label: 'Excel Onboarding',
      matchPrefixes: ['/school/onboarding']
    },
    {
      path: '/school/reports',
      icon: FiBarChart2,
      label: 'Reports & Analytics',
      matchPrefixes: ['/school/reports']
    },
    {
      path: '/school/settings',
      icon: FiSettings,
      label: 'Campus Settings',
      matchPrefixes: ['/school/settings']
    },
    {
      path: '/school/settings/branding',
      icon: FiDroplet,
      label: 'School Branding & Identity',
      matchPrefixes: ['/school/settings/branding', '/school/branding']
    }
  ];

  const studentMenu = [
    {
      path: '/student/dashboard',
      icon: FiHome,
      label: 'Dashboard',
      matchPrefixes: ['/student/dashboard']
    },
    {
      path: '/student/courses',
      icon: FiBookOpen,
      label: 'My Classes & Subjects',
      matchPrefixes: ['/student/courses', '/student/progress']
    },
    {
      path: '/student/test',
      icon: FiCheckSquare,
      label: 'Exams & Assessments',
      matchPrefixes: ['/student/test', '/student/exams', '/student/results']
    },
    {
      path: '/student/attendance',
      icon: FiCalendar,
      label: 'Attendance & Records',
      matchPrefixes: ['/student/attendance', '/student/payments', '/student/certificates', '/student/marksheets']
    },
    {
      path: '/student/notifications',
      icon: FiBell,
      label: 'School Notices',
      matchPrefixes: ['/student/notifications']
    }
  ];

  // Dedicated Teacher Navigation
  const teacherMenu = [
    {
      path: '/teacher/dashboard',
      icon: FiHome,
      label: 'Teacher Workspace',
      matchPrefixes: ['/teacher/dashboard']
    },
    { section: 'Classroom Operations' },
    {
      path: '/school/school-attendance',
      icon: FiCheckSquare,
      label: 'Mark Attendance',
      matchPrefixes: ['/school/school-attendance', '/school/attendance']
    },
    {
      path: '/school/homework',
      icon: FiBookOpen,
      label: 'Homework & Tasks',
      matchPrefixes: ['/school/homework']
    },
    {
      path: '/school/examinations',
      icon: FiAward,
      label: 'Marks & Evaluations',
      matchPrefixes: ['/school/examinations']
    },
    {
      path: '/school/timetable',
      icon: FiClock,
      label: 'Class Timetable',
      matchPrefixes: ['/school/timetable']
    },
    {
      path: '/school/students',
      icon: FiUsers,
      label: 'Assigned Students',
      matchPrefixes: ['/school/students']
    },
    { section: 'School Notices' },
    {
      path: '/school/notifications',
      icon: FiBell,
      label: 'Notices & Circulars',
      matchPrefixes: ['/school/notifications']
    }
  ];

  // Dedicated Parent & Guardian Navigation
  const parentMenu = [
    {
      path: '/parent/dashboard',
      icon: FiHome,
      label: 'Parent Workspace',
      matchPrefixes: ['/parent/dashboard']
    },
    { section: 'Student Profile & Fees' },
    {
      path: '/parent/dashboard',
      icon: TbCurrencyRupee,
      label: 'Fee Obligations',
      matchPrefixes: ['/parent/dashboard']
    },
    {
      path: '/parent/dashboard#attendance',
      icon: FiCalendar,
      label: 'Attendance Record',
      matchPrefixes: ['/parent/dashboard']
    },
    {
      path: '/verify-certificate-public',
      icon: FiAward,
      label: 'Report Card & TC',
      matchPrefixes: ['/verify-certificate-public']
    },
    {
      path: '/parent/dashboard#homework',
      icon: FiBookOpen,
      label: 'Daily Homework',
      matchPrefixes: ['/parent/dashboard']
    },
    {
      path: '/parent/notifications',
      icon: FiBell,
      label: 'School Circulars',
      matchPrefixes: ['/parent/notifications']
    }
  ];

  // Dedicated Accountant Navigation
  const accountantMenu = [
    {
      path: '/accountant/dashboard',
      icon: FiHome,
      label: 'Accounts Dashboard',
      matchPrefixes: ['/accountant/dashboard']
    },
    { section: 'Fee Desk & Receipts' },
    {
      path: '/school/school-fees',
      icon: TbCurrencyRupee,
      label: 'School Fee Desk',
      matchPrefixes: ['/school/school-fees']
    },
    {
      path: '/school/accounting-ledger',
      icon: FiFileText,
      label: 'Financial Ledger & Expenses',
      matchPrefixes: ['/school/accounting-ledger', '/school/payments']
    },
    {
      path: '/school/reports/payroll',
      icon: FiUsers,
      label: 'Payroll Reports',
      matchPrefixes: ['/school/reports/payroll']
    },
    {
      path: '/school/reports',
      icon: FiActivity,
      label: 'Financial Reports',
      matchPrefixes: ['/school/reports']
    }
  ];

  const operationalMenus = {
    admission_officer: [
      { path: '/school/admissions', icon: FiMail, label: 'Admissions', matchPrefixes: ['/school/admissions'] },
      { path: '/school/students', icon: FiUsers, label: 'Student Records', matchPrefixes: ['/school/students'] }
    ],
    hr_manager: [
      { path: '/school/leaves', icon: FiCalendar, label: 'Leave Management', matchPrefixes: ['/school/leaves'] }
    ],
    librarian: [
      { path: '/school/library', icon: FiBookOpen, label: 'Library Circulation', matchPrefixes: ['/school/library'] }
    ],
    security_staff: [
      { path: '/school/visitor-pass', icon: FiShield, label: 'Visitor Gate Pass', matchPrefixes: ['/school/visitor-pass'] }
    ],
    transport_manager: [
      { path: '/school/transport', icon: FiTruck, label: 'Transport & GPS Fleet', matchPrefixes: ['/school/transport'] }
    ],
    staff: [
      { path: '/school/leaves', icon: FiCalendar, label: 'Leave Management', matchPrefixes: ['/school/leaves'] }
    ]
  };

  const menu =
    (role === 'super_admin' || role === 'school_owner') ? superAdminMenu :
    (role === 'franchise_admin' || role === 'school_admin' || role === 'principal' || role === 'vice_principal') ? franchiseAdminMenu :
    (role === 'teacher' || role === 'class_teacher') ? teacherMenu :
    role === 'parent' ? parentMenu :
    role === 'accountant' ? accountantMenu :
    operationalMenus[role] || studentMenu;

  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = persistedScrollTop;
    }
  }, []);

  const handleScroll = (e) => {
    persistedScrollTop = e.currentTarget.scrollTop;
  };

  const isItemActive = (item) => {
    if (pathname === item.path) return true;
    if (item.matchPrefixes && item.matchPrefixes.length > 0) {
      return item.matchPrefixes.some(prefix => pathname.startsWith(prefix));
    }
    return pathname === item.path;
  };

  return (
    <aside
      style={{
        backgroundColor: 'var(--brand-sidebar, #131b2e)',
        borderColor: 'var(--brand-sidebar-border, #1e2742)'
      }}
      className={`fixed lg:static inset-y-0 left-0 z-40 border-r flex flex-col transition-all duration-300 ease-in-out shrink-0 select-none shadow-md ${isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'
        }`}
    >
      {/* Top Header / Multi-Tenant School Branding with Collapse Icon */}
      <div
        style={{
          backgroundColor: 'var(--brand-sidebar, #131b2e)',
          borderColor: 'var(--brand-sidebar-border, #1e2742)'
        }}
        className="h-14 flex items-center justify-between px-3.5 sm:px-4 border-b shrink-0"
      >
        <Link to={menu[0]?.path || '/'} className="flex items-center gap-2.5 overflow-hidden">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0 p-1 ${isLightSidebar ? 'bg-primary-600 text-white' : 'bg-white'}`}>
            {logoUrl ? (
              <img src={logoUrl} alt={schoolName} className="w-full h-full object-contain" />
            ) : (
              <span className={`font-extrabold text-sm ${isLightSidebar ? 'text-white' : 'text-primary-600'}`}>{(shortName || 'A')[0]}</span>
            )}
          </div>
          {isOpen && (
            <div className="flex min-w-0 flex-col truncate leading-tight">
              <span className={`font-extrabold text-sm tracking-tight truncate ${isLightSidebar ? 'text-slate-900' : 'text-white'}`}>{schoolName}</span>
              <span className={`text-[9px] font-semibold uppercase tracking-wider ${isLightSidebar ? 'text-primary-600' : 'text-primary-300'}`}>
                {branding.identity?.address?.city || 'SES'} • {portalLabel}
              </span>
            </div>
          )}
        </Link>

        {/* Toggle Collapse Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          className={`p-1.5 rounded-lg transition ${isLightSidebar ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <FiChevronLeft className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List - Section headers + items */}
      <nav
        ref={scrollRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto px-3 py-3 space-y-1 ${isLightSidebar ? '' : 'sidebar-scroll'}`}
      >
        {menu.map((item, idx) => {
          if (item.section) {
            if (!isOpen) return <div key={idx} className={`my-2 border-t ${isLightSidebar ? 'border-slate-200' : 'border-white/10'}`} />;
            return (
              <div key={idx} className={`pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider ${isLightSidebar ? 'text-slate-400' : 'text-white/45'}`}>
                {item.section}
              </div>
            );
          }

          const Icon = item.icon;
          const active = isItemActive(item);

          return (
            <Link
              key={idx}
              to={item.path}
              title={!isOpen ? item.label : undefined}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group relative ${
                isLightSidebar
                  ? active
                    ? 'bg-primary-50 text-primary-700 font-bold ring-1 ring-primary-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  : active
                    ? 'bg-white/15 text-white shadow-xs ring-1 ring-white/15'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
              } ${!isOpen ? 'justify-center px-2' : ''}`}
            >
              <Icon
                className={`w-[17px] h-[17px] shrink-0 transition-colors ${
                  isLightSidebar
                    ? active ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-700'
                    : active ? 'text-primary-300' : 'text-white/55 group-hover:text-white/90'
                }`}
              />

              {isOpen && (
                <span className="truncate flex-1 tracking-wide">{item.label}</span>
              )}

              {isOpen && item.badge && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                  isLightSidebar
                    ? 'bg-primary-100 text-primary-700 border-primary-200'
                    : 'bg-primary-500/25 text-primary-200 border-primary-400/30'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Branding & Version */}
      {isOpen && (
        <div
          style={{
            backgroundColor: 'var(--brand-sidebar, #131b2e)',
            borderColor: 'var(--brand-sidebar-border, #1e2742)'
          }}
          className={`p-3.5 border-t text-xs flex items-center justify-between shrink-0 ${isLightSidebar ? 'text-slate-500' : 'text-white/60'}`}
        >
          <div className={`flex items-center gap-1.5 font-medium ${isLightSidebar ? 'text-slate-700' : 'text-white/80'}`}>
            <span className="truncate max-w-[120px]">{schoolName}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
              isLightSidebar ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/10 text-white/85 border-white/15'
            }`}>v{APP_VERSION}</span>
          </div>
          <span className="text-emerald-500 font-semibold flex items-center gap-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
