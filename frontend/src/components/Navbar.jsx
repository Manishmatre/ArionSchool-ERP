import { APP_VERSION } from '../config/version';
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { 
  FiLogOut, FiUser, FiHome, FiSearch, FiSettings, 
  FiChevronDown, FiBell, FiMenu, FiX, FiBook, FiFileText, FiVideo,
  FiDownload, FiSmartphone
} from 'react-icons/fi';
import { FaAndroid, FaApple } from 'react-icons/fa';
import DownloadAppModal from './DownloadAppModal';
import { toAbsoluteUrl } from '../utils/url';
import api from '../api/axios';

const Navbar = ({
  isSidebarOpen = false,
  toggleSidebar = () => {},
  pageTitle = '',
  pageBreadcrumbs = ''
}) => {
  const { user, logout } = useAuth();
  const { isLightHeader } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadPlatform, setDownloadPlatform] = useState('android');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const pathname = location.pathname;

  const getDashboardLink = () => {
    if (user?.role === 'super_admin' || user?.role === 'school_owner') return '/admin/dashboard';
    if (['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role)) return '/school/dashboard';
    if (user?.role === 'teacher' || user?.role === 'class_teacher') return '/teacher/dashboard';
    if (user?.role === 'parent') return '/parent/dashboard';
    if (user?.role === 'accountant') return '/accountant/dashboard';
    return '/student/dashboard';
  };

  // Auto-resolve title if not explicitly passed
  const resolveHeaderMeta = () => {
    if (pageTitle) {
      return { title: pageTitle };
    }

    if (pathname.includes('/students/') && !pathname.endsWith('/add')) {
      return { title: 'Student Details' };
    }
    if (pathname.includes('/students/add')) {
      return { title: 'Add New Student' };
    }
    if (pathname.includes('/students')) {
      return { title: 'Student Directory' };
    }
    if (pathname.includes('/attendance')) {
      return { title: 'Attendance Management' };
    }
    if (pathname.includes('/student-certificates')) {
      return { title: 'Student Certificates' };
    }
    if (pathname.includes('/marksheet-templates')) {
      return { title: 'Marksheets & Transcripts' };
    }
    if (pathname.includes('/id-cards')) {
      return { title: 'Student ID Cards' };
    }
    if (pathname.includes('/online-classes')) {
      return { title: 'Online Classes & Live Sessions' };
    }

    if (pathname.includes('/courses/') && !pathname.endsWith('/add')) {
      return { title: 'Course Details & Curriculum' };
    }
    if (pathname.includes('/courses/add')) {
      return { title: 'Create New Course' };
    }
    if (pathname.includes('/courses')) {
      return { title: 'Course Catalog & Curriculum' };
    }
    if (pathname.includes('/programs')) {
      return { title: 'Academic Programs' };
    }
    if (pathname.includes('/mcqs')) {
      return { title: 'MCQ Bank & Quizzes' };
    }
    if (pathname.includes('/exams')) {
      return { title: 'Exams & Assessments' };
    }
    if (pathname.includes('/batches')) {
      return { title: 'Batches & Scheduling' };
    }

    if (pathname.includes('/school-attendance')) {
      return { title: 'Daily School Attendance' };
    }
    if (pathname.includes('/transfer-certificates')) {
      return { title: 'Transfer Certificates (TC) & Bonafide' };
    }
    if (pathname.includes('/discipline')) {
      return { title: 'Student Discipline & Merits' };
    }
    if (pathname.includes('/events-calendar')) {
      return { title: 'Academic & School Events Calendar' };
    }
    if (pathname.includes('/surveys')) {
      return { title: 'School Feedback & Satisfaction Surveys' };
    }
    if (pathname.includes('/academic-setup')) {
      return { title: 'Academic Setup & Classes' };
    }
    if (pathname.includes('/school-fees')) {
      return { title: 'School Fee Management' };
    }
    if (pathname.includes('/accounting-ledger')) {
      return { title: 'Accounts & General Ledger' };
    }
    if (pathname.includes('/inventory')) {
      return { title: 'Inventory & Asset Management' };
    }
    if (pathname.includes('/hostel')) {
      return { title: 'Hostel & Residence Management' };
    }
    if (pathname.includes('/examinations')) {
      return { title: 'Examinations & Report Cards' };
    }
    if (pathname.includes('/timetable')) {
      return { title: 'Smart Timetable Engine' };
    }
    if (pathname.includes('/library')) {
      return { title: 'School Library Management' };
    }
    if (pathname.includes('/homework')) {
      return { title: 'Homework & Daily Dairy' };
    }
    if (pathname.includes('/visitor-pass')) {
      return { title: 'Visitor Gate Pass & Security' };
    }
    if (pathname.includes('/transport')) {
      return { title: 'School Transport & Fleet GPS' };
    }
    if (pathname.includes('/leaves')) {
      return { title: 'Staff & Student Leave Management' };
    }
    if (pathname.includes('/communications')) {
      return { title: 'Communications Hub & Parent Bot' };
    }
    if (pathname.includes('/onboarding')) {
      return { title: 'Bulk Excel Onboarding' };
    }

    if (pathname.includes('/campuses') || pathname.includes('/campuses')) {
      return { title: 'School Campuses & Branches' };
    }

    if (pathname.includes('/staff')) {
      return { title: 'Staff Directory' };
    }
    if (pathname.includes('/financial-ledger')) {
      return { title: 'Financial Ledger & P&L' };
    }
    if (pathname.includes('/payments')) {
      return { title: 'Payment Transactions' };
    }

    if (pathname.includes('/enquiries')) {
      return { title: 'CRM & Lead Management' };
    }
    if (pathname.includes('/admissions')) {
      return { title: 'Admissions Pipeline' };
    }
    if (pathname.includes('/notifications')) {
      return { title: 'Notifications & Broadcasts' };
    }

    if (pathname.includes('/website-settings')) {
      return { title: 'Website Settings' };
    }
    if (pathname.includes('/testimonials')) {
      return { title: 'Reviews & Testimonials' };
    }
    if (pathname.includes('/gallery')) {
      return { title: 'Media Gallery' };
    }

    if (pathname.includes('/branding')) {
      return { title: 'Branding & White-Label Theme' };
    }
    if (pathname.includes('/school-fees')) {
      return { title: 'School Fee Desk & Receipts' };
    }
    if (pathname.includes('/accounting-ledger')) {
      return { title: 'Accounting & Financial Ledger' };
    }
    if (pathname.includes('/classes') || pathname.includes('/sections')) {
      return { title: 'Classes & Sections' };
    }
    if (pathname.includes('/academic-setup') || pathname.includes('/academic-years')) {
      return { title: 'Academic Sessions & Master Setup' };
    }
    if (pathname.includes('/subjects')) {
      return { title: 'Subjects & Curriculum' };
    }
    if (pathname.includes('/timetable')) {
      return { title: 'Smart Timetable' };
    }
    if (pathname.includes('/homework')) {
      return { title: 'Homework & Daily Diary' };
    }
    if (pathname.includes('/examinations') || pathname.includes('/exam-seating')) {
      return { title: 'Examinations & Anti-Cheat Seating' };
    }
    if (pathname.includes('/transfer-certificates')) {
      return { title: 'Transfer Certificates (TC) & Bonafide' };
    }
    if (pathname.includes('/student-promotion')) {
      return { title: 'Student Promotion & Session Rollover' };
    }
    if (pathname.includes('/ai-center')) {
      return { title: 'SES AI Pedagogical Center' };
    }
    if (pathname.includes('/transport')) {
      return { title: 'Transport Fleet & GPS Tracking' };
    }
    if (pathname.includes('/library')) {
      return { title: 'School Library & Circulation' };
    }
    if (pathname.includes('/hostel')) {
      return { title: 'Hostel & Dormitory Management' };
    }
    if (pathname.includes('/inventory')) {
      return { title: 'Inventory & School Store' };
    }
    if (pathname.includes('/visitors')) {
      return { title: 'Gate Security & Visitor Passes' };
    }
    if (pathname.includes('/events')) {
      return { title: 'Events & School Calendar' };
    }
    if (pathname.includes('/discipline')) {
      return { title: 'Behavior & Discipline Records' };
    }
    if (pathname.includes('/ptm')) {
      return { title: 'Parent-Teacher Meetings (PTM)' };
    }
    if (pathname.includes('/activity')) {
      return { title: 'Audit & Activity Logs' };
    }
    if (pathname.includes('/company-profile')) {
      return { title: 'School Profile & Assets' };
    }
    if (pathname.includes('/users')) {
      return { title: 'Users & Roles' };
    }
    if (pathname.includes('/app-management')) {
      return { title: 'Mobile App Management' };
    }
    if (pathname.includes('/reports')) {
      return { title: 'Reports & Analytics' };
    }
    if (pathname.includes('/profile')) {
      return { title: 'User Profile' };
    }
    if (pathname.includes('/student/test')) {
      return { title: 'Online Practice Tests' };
    }
    if (pathname.includes('/student/results')) {
      return { title: 'Exam Results & Performance' };
    }
    if (pathname.includes('/student/id-card')) {
      return { title: 'Digital Student ID Card' };
    }
    if (pathname.includes('/student/marksheets')) {
      return { title: 'My Report Cards & Marksheets' };
    }
    if (pathname.includes('/student/certificates')) {
      return { title: 'My Certificates & TC' };
    }

    return { title: 'Dashboard' };
  };

  const headerMeta = resolveHeaderMeta();

  // Resolve breadcrumbs into a clean array of navigable items with Home icon at start
  const resolveBreadcrumbItems = () => {
    const rolePrefix = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? 'school' : user?.role === 'student' ? 'student' : 'admin';

    const sectionPathMap = {
      'students': `/${rolePrefix}/students`,
      'courses': `/${rolePrefix}/courses`,
      'campuses': '/admin/campuses',
      'franchises': '/admin/campuses',
      'branches': '/admin/campuses',
      'staff': `/${rolePrefix}/staff`,
      'payments': `/${rolePrefix}/financial-ledger`,
      'financial-ledger': `/${rolePrefix}/financial-ledger`,
      'communication': '/admin/enquiries',
      'crm': '/admin/enquiries',
      'enquiries': '/admin/enquiries',
      'admissions': '/admin/admissions',
      'website': '/admin/website-settings',
      'settings': '/admin/company-profile',
      'reports': `/${rolePrefix}/reports`
    };

    if (pageBreadcrumbs) {
      // Strip redundant "Dashboard /" or "Dashboard" if passed
      const clean = pageBreadcrumbs.replace(/^Dashboard\s*\/?\s*/i, '').trim();
      if (!clean) return [];

      const parts = clean.split('/').map(p => p.trim()).filter(Boolean);
      return parts.map((part, index) => {
        const lower = part.toLowerCase();
        const to = sectionPathMap[lower] || null;
        return {
          label: part,
          to: index < parts.length - 1 ? to : null
        };
      });
    }

    // Auto-resolve from pathname
    const pathSegments = pathname.split('/').filter(Boolean);
    const meaningfulSegments = pathSegments.slice(1);

    if (meaningfulSegments.length === 0 || meaningfulSegments[0] === 'dashboard') {
      return [{ label: 'Overview', to: null }];
    }

    const segmentLabels = {
      'students': 'Students',
      'courses': 'Courses',
      'programs': 'Programs',
      'mcqs': 'MCQs',
      'exams': 'Exams',
      'batches': 'Batches',
      'campuses': 'School Campuses',
      'franchises': 'School Campuses',
      'staff': 'Staff',
      'financial-ledger': 'Payments & Ledger',
      'payments': 'Payments',
      'enquiries': 'CRM & Enquiries',
      'admissions': 'Admissions',
      'notifications': 'Notifications',
      'website-settings': 'Website CMS',
      'testimonials': 'Testimonials',
      'gallery': 'Gallery',
      'company-profile': 'Company Profile',
      'users': 'Users',
      'app-management': 'App Releases',
      'reports': 'Reports',
      'profile': 'Profile',
      'attendance': 'Attendance',
      'student-certificates': 'Certificates',
      'marksheet-templates': 'Marksheets',
      'id-cards': 'ID Cards',
      'online-classes': 'Online Classes'
    };

    const firstSeg = meaningfulSegments[0];
    const firstLabel = segmentLabels[firstSeg] || firstSeg.charAt(0).toUpperCase() + firstSeg.slice(1).replace(/-/g, ' ');
    const firstTo = `/${rolePrefix}/${firstSeg}`;

    if (meaningfulSegments.length === 1) {
      return [{ label: firstLabel, to: null }];
    }

    const secondSeg = meaningfulSegments[1];
    let secondLabel = secondSeg;
    if (secondSeg === 'add') secondLabel = 'Add New';
    else if (secondSeg === 'edit') secondLabel = 'Edit';
    else if (meaningfulSegments.length > 2 && meaningfulSegments[2] === 'edit') secondLabel = 'Edit';
    else if (/^[0-9a-fA-F]{24}$/.test(secondSeg) || /^[A-Z0-9_-]+$/.test(secondSeg)) secondLabel = 'Details';
    else secondLabel = secondSeg.charAt(0).toUpperCase() + secondSeg.slice(1).replace(/-/g, ' ');

    return [
      { label: firstLabel, to: firstTo },
      { label: secondLabel, to: null }
    ];
  };

  const breadcrumbItems = resolveBreadcrumbItems();
  // Keep the section crumb visible on one-level pages; on detail pages the
  // current item is already represented by the page title below.
  const visibleBreadcrumbItems = breadcrumbItems.length > 1
    ? breadcrumbItems.slice(0, -1)
    : breadcrumbItems;

  const openDownloadApp = (platform = 'android') => {
    setDownloadPlatform(platform);
    setIsDownloadModalOpen(true);
    setIsProfileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = async (query) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchResults(response.data);
      setIsSearchOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ courses: [], topics: [], tests: [], users: [] });
      setIsSearchOpen(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  const handleResultClick = (result) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    
    if (result.type === 'course') {
      navigate(`/${user?.role === 'student' ? 'student' : ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? 'franchise_admin' : 'admin'}/courses/${result._id}`);
    } else if (result.type === 'topic') {
      navigate(`/${user?.role === 'student' ? 'student' : 'admin'}/topic/${result._id}`);
    } else if (result.type === 'test') {
      navigate(`/${user?.role === 'student' ? 'student' : 'admin'}/exams/${result._id}`);
    } else if (result.type === 'user') {
      if (result.role === 'student') {
        navigate(`/${['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? 'franchise_admin' : 'admin'}/students/${result._id}`);
      } else {
        navigate(`/admin/users`);
      }
    }
  };

  // Close search and profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <nav
      style={{
        backgroundColor: 'var(--brand-header, #131b2e)',
        borderColor: 'var(--brand-header-border, #1e2742)'
      }}
      className="border-b z-40 h-14 flex-shrink-0 select-none shadow-xs transition-colors duration-200"
    >
      <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 h-full flex lg:grid items-center gap-2 lg:gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(180px,28vw)_auto] xl:grid-cols-[minmax(0,1fr)_minmax(300px,38vw)_auto]">
        {/* Left: Mobile Toggle, Clickable Home Icon, Navigable Breadcrumbs & Page Title */}
        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
          <button
            type="button"
            onClick={toggleSidebar}
            className={`lg:hidden p-2 rounded-lg transition shrink-0 ${isLightHeader ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
          >
            {isSidebarOpen ? <FiX size={18} /> : <FiMenu size={18} />}
          </button>

          <div className="flex flex-col justify-center min-w-0">
            {/* Navigable Breadcrumb Bar with Home Icon */}
            <div className={`flex items-center gap-1.5 text-xs font-medium leading-none ${isLightHeader ? 'text-slate-500' : 'text-white/75'}`}>
              <Link
                to={getDashboardLink()}
                className={`transition flex items-center p-0.5 rounded ${isLightHeader ? 'text-slate-500 hover:text-primary-600 hover:bg-slate-100' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                title="Go to Dashboard"
              >
                <FiHome className="w-3.5 h-3.5" />
              </Link>

              {visibleBreadcrumbItems.map((item, idx) => (
                <React.Fragment key={idx}>
                  <span className={`text-[11px] select-none ${isLightHeader ? 'text-slate-300' : 'text-white/40'}`}>/</span>
                  {item.to ? (
                    <Link
                      to={item.to}
                      className={`hover:underline transition truncate max-w-[120px] sm:max-w-[200px] ${isLightHeader ? 'text-slate-500 hover:text-primary-600' : 'text-white/70 hover:text-white'}`}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className={`font-semibold truncate max-w-[140px] sm:max-w-[240px] ${isLightHeader ? 'text-slate-700' : 'text-white/95'}`}>
                      {item.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Page Title */}
            <h1 className={`text-sm font-bold tracking-tight leading-tight mt-1 truncate ${isLightHeader ? 'text-slate-900' : 'text-white'}`}>
              {headerMeta.title}
            </h1>
          </div>
        </div>

        {/* Center: White Search Pill */}
        <div className="hidden lg:flex w-full min-w-0 items-center" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search students, classes, subjects, staff..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={() => searchQuery.trim().length >= 2 && setIsSearchOpen(true)}
                className="w-full pl-9 pr-14 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-2xs transition"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setIsSearchOpen(false); searchInputRef.current?.focus(); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  <FiX className="text-xs" />
                </button>
              ) : (
                <kbd className="hidden lg:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-0.5 px-1 py-0.5 text-[9px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded pointer-events-none">
                  Ctrl K
                </kbd>
              )}

              {/* Search Dropdown */}
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-96 overflow-y-auto z-50 text-xs">
                  {searchLoading ? (
                    <div className="p-4 text-center text-slate-500">Searching...</div>
                  ) : searchResults.courses?.length > 0 || searchResults.topics?.length > 0 || 
                         searchResults.tests?.length > 0 || searchResults.users?.length > 0 ? (
                    <div>
                      {searchResults.courses?.length > 0 && (
                        <div className="border-b border-slate-100">
                          <div className="px-3 py-1.5 bg-slate-50 font-bold text-slate-500 uppercase text-[10px]">Courses</div>
                          {searchResults.courses.slice(0, 3).map((course) => (
                            <div
                              key={course._id}
                              onClick={() => handleResultClick(course)}
                              className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                            >
                              <div className="w-6 h-6 bg-primary-100 rounded flex items-center justify-center shrink-0">
                                <FiBook className="text-primary-600 text-xs" />
                              </div>
                              <div className="truncate">
                                <p className="font-semibold text-slate-800">{course.title}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {searchResults.topics?.length > 0 && (
                        <div className="border-b border-slate-100">
                          <div className="px-3 py-1.5 bg-slate-50 font-bold text-slate-500 uppercase text-[10px]">Lessons / Topics</div>
                          {searchResults.topics.slice(0, 3).map((topic) => (
                            <div
                              key={topic._id}
                              onClick={() => handleResultClick(topic)}
                              className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                            >
                              <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center shrink-0">
                                <FiFileText className="text-emerald-600 text-xs" />
                              </div>
                              <div className="truncate">
                                <p className="font-semibold text-slate-800">{topic.title}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {searchResults.tests?.length > 0 && (
                        <div className="border-b border-slate-100">
                          <div className="px-3 py-1.5 bg-slate-50 font-bold text-slate-500 uppercase text-[10px]">Exams & Quizzes</div>
                          {searchResults.tests.slice(0, 3).map((test) => (
                            <div
                              key={test._id}
                              onClick={() => handleResultClick(test)}
                              className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                            >
                              <div className="w-6 h-6 bg-amber-100 rounded flex items-center justify-center shrink-0">
                                <FiFileText className="text-amber-600 text-xs" />
                              </div>
                              <div className="truncate">
                                <p className="font-semibold text-slate-800">{test.title}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {searchResults.users?.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 bg-slate-50 font-bold text-slate-500 uppercase text-[10px]">Users</div>
                          {searchResults.users.slice(0, 3).map((u) => (
                            <div
                              key={u._id}
                              onClick={() => handleResultClick(u)}
                              className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                            >
                              <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center shrink-0">
                                <FiUser className="text-purple-600 text-xs" />
                              </div>
                              <div className="truncate">
                                <p className="font-semibold text-slate-800">{u.name}</p>
                                <p className="text-[10px] text-slate-500 capitalize">{u.role?.replace('_', ' ')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500">No results found</div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: Notifications & Profile */}
        <div className="flex items-center justify-end gap-2 lg:gap-3 shrink-0 min-w-max lg:justify-self-end" ref={dropdownRef}>
          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => {
              if (user?.role === 'super_admin' || user?.role === 'school_owner') navigate('/admin/notifications');
              else if (['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role)) navigate('/school/notifications');
              else navigate('/student/notifications');
            }}
            className={`relative p-2 rounded-lg transition ${isLightHeader ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
            title="Notifications"
          >
            <FiBell className="w-4 h-4" />
            <span className={`absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ${isLightHeader ? 'ring-white' : 'ring-white/25'}`} />
          </button>

          {/* Vertical Divider */}
          <span className={`h-6 w-px ${isLightHeader ? 'bg-slate-200' : 'bg-white/15'}`} aria-hidden="true" />

          {/* User Profile Pill Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl transition ${isLightHeader ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`}
            >
              <div
                style={{ backgroundColor: 'rgb(var(--brand-600))' }}
                className={`w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 shadow-sm ring-2 ${isLightHeader ? 'ring-slate-200' : 'ring-white/25'}`}
              >
                {user?.profilePicture ? (
                  <img src={toAbsoluteUrl(user.profilePicture)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{getInitials(user?.name)}</span>
                )}
              </div>

              <div className="text-left hidden sm:block">
                <p className={`text-xs font-bold leading-tight truncate max-w-[120px] ${isLightHeader ? 'text-slate-900' : 'text-white'}`}>
                  {user?.name || 'Admin'}
                </p>
                <p className={`text-[10px] capitalize leading-tight ${isLightHeader ? 'text-slate-500' : 'text-white/75'}`}>
                  {['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? 'School Admin' : user?.role?.replace('_', ' ') || 'Super Admin'}
                </p>
              </div>

              <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${isLightHeader ? 'text-slate-500' : 'text-white/70'} ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-xs z-50 animate-fade-in">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary-100 text-primary-700 capitalize">
                    {['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? 'School Admin' : user?.role?.replace('_', ' ')}
                  </span>
                </div>

                <Link
                  to={(user?.role === 'super_admin' || user?.role === 'school_owner') ? '/admin/profile' : ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? '/school/profile' : '/student/profile'}
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-primary-600 transition"
                >
                  <FiUser className="w-3.5 h-3.5 text-slate-400" />
                  <span>User Profile</span>
                </Link>

                <Link
                  to={getDashboardLink()}
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-primary-600 transition"
                >
                  <FiHome className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dashboard</span>
                </Link>

                {user?.role === 'super_admin' && (
                  <Link
                    to="/admin/company-profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-primary-600 transition"
                  >
                    <FiSettings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Company Profile & Assets</span>
                  </Link>
                )}

                {/* Mobile App Download Actions */}
                <div className="border-t border-slate-100 my-1 pt-1">
                  <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Apps
                  </div>
                  <button
                    type="button"
                    onClick={() => openDownloadApp('android')}
                    className="flex items-center justify-between w-full px-3.5 py-1.5 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                  >
                    <div className="flex items-center gap-2">
                      <FaAndroid className="text-emerald-600 text-xs" />
                      <span>Arion School for Android</span>
                    </div>
                    <FiDownload className="text-slate-400 text-xs" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openDownloadApp('ios')}
                    className="flex items-center justify-between w-full px-3.5 py-1.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
                  >
                    <div className="flex items-center gap-2">
                      <FaApple className="text-slate-800 text-xs" />
                      <span>Arion School for iOS</span>
                    </div>
                    <FiSmartphone className="text-slate-400 text-xs" />
                  </button>
                </div>

                <div className="px-3.5 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Platform Version</span>
                  <span className="font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">v{APP_VERSION}</span>
                </div>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 w-full text-left transition font-medium"
                >
                  <FiLogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Download App Modal */}
      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        defaultPlatform={downloadPlatform}
      />
    </nav>
  );
};

export default Navbar;

