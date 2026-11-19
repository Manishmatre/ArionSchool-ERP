import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { isRoleAllowed, getHomeRouteForRole } from './utils/roles';
import AppToast from './components/ui/AppToast';
import { SocketProvider } from './context/SocketContext';
import ReportsLayout from './components/ReportsLayout';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterSuperAdmin from './pages/RegisterSuperAdmin';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/admin/AdminDashboard';
import PlatformDashboard from './pages/super_admin/PlatformDashboard';
import ManageSubscriptionPlans from './pages/super_admin/ManageSubscriptionPlans';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ParentDashboard from './pages/parent/ParentDashboard';
import AccountantDashboard from './pages/accountant/AccountantDashboard';
import ActivityLog from './pages/admin/ActivityLog';
import StudentDashboard from './pages/student/StudentDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageCourses from './pages/admin/Courses';
import AddCourse from './pages/admin/AddCourse';
import CourseDetails from './pages/admin/CourseDetails';
import ManageCategories from './pages/admin/ManageCategories';
import ManageChapters from './pages/admin/ManageChapters';
import ManageTopics from './pages/admin/ManageTopics';
import ManageMCQs from './pages/admin/ManageMCQs';
import ManageExams from './pages/admin/ManageExams';
import PreviewExam from './pages/admin/PreviewExam';
import AddExam from './pages/admin/AddExam';
import CreateExam from './pages/admin/CreateExam';
import ExamDetails from './pages/admin/ExamDetails';
import EditExam from './pages/admin/EditExam';
import ExamAnalytics from './pages/admin/ExamAnalytics';
import AddEditMCQ from './pages/admin/AddEditMCQ';
import BatchAddLessons from './pages/admin/course-curriculum/BatchAddLessons';
import BatchAddMCQs from './pages/admin/course-curriculum/BatchAddMCQs';
import Reports from './pages/admin/Reports';
import StudentPerformanceReport from './pages/admin/reports/StudentPerformanceReport';
import StudentAttendanceReport from './pages/admin/reports/StudentAttendanceReport';
import StudentEnrollmentReport from './pages/admin/reports/StudentEnrollmentReport';
import StudentCertificateReport from './pages/admin/reports/StudentCertificateReport';
import RevenueReport from './pages/admin/reports/RevenueReport';
import PaymentReport from './pages/admin/reports/PaymentReport';
import OutstandingPaymentsReport from './pages/admin/reports/OutstandingPaymentsReport';
import CourseRevenueReport from './pages/admin/reports/CourseRevenueReport';
import CoursePopularityReport from './pages/admin/reports/CoursePopularityReport';
import CourseCompletionReport from './pages/admin/reports/CourseCompletionReport';
import StaffAttendanceReport from './pages/admin/reports/StaffAttendanceReport';
import StaffPerformanceReport from './pages/admin/reports/StaffPerformanceReport';
import PayrollReport from './pages/admin/reports/PayrollReport';
import CampusPerformanceReport from './pages/admin/reports/CampusPerformanceReport';
import CampusComplianceReport from './pages/admin/reports/CampusComplianceReport';
import CampusReports from './pages/school_admin/CampusReports';
import ManageCampuses from './pages/admin/ManageCampuses';
import StudentPromotion from './pages/admin/StudentPromotion';
import SchoolBrandingSettings from './pages/admin/SchoolBrandingSettings';
import AddCampus from './pages/admin/AddCampus';
import CampusDetails from './pages/admin/CampusDetails';
import EditCampus from './pages/admin/EditCampus';
import ManageStudents from './pages/admin/ManageStudents';
import AddStudent from './pages/admin/AddStudent';
import StudentDetails from './pages/admin/StudentDetails';
import EditStudent from './pages/admin/EditStudent';
import ManageStaff from './pages/admin/ManageStaff';
import AddStaff from './pages/admin/AddStaff';
import StaffDetails from './pages/admin/StaffDetails';
import EditStaff from './pages/admin/EditStaff';
import StaffAttendance from './pages/admin/StaffAttendance';
import StaffSalary from './pages/admin/StaffSalary';
import StaffSalaryDetails from './pages/admin/StaffSalaryDetails';
import GenerateSalary from './pages/admin/GenerateSalary';
import AdvancePayment from './pages/admin/AdvancePayment';
import ManagePrograms from './pages/admin/ManagePrograms';
import ManageBatches from './pages/admin/ManageBatches';
import AcademicSetup from './pages/admin/AcademicSetup';
import SchoolFees from './pages/admin/SchoolFees';
import AccountingLedger from './pages/admin/AccountingLedger';
import SchoolInventory from './pages/admin/SchoolInventory';
import HostelManagement from './pages/admin/HostelManagement';
import SchoolExaminations from './pages/admin/SchoolExaminations';
import SchoolTimetable from './pages/admin/SchoolTimetable';
import SchoolLibrary from './pages/admin/SchoolLibrary';
import SchoolHomework from './pages/admin/SchoolHomework';
import VisitorGatePass from './pages/admin/VisitorGatePass';
import TransportGPS from './pages/admin/TransportGPS';
import LeaveManagement from './pages/admin/LeaveManagement';
import CommunicationsHub from './pages/admin/CommunicationsHub';
import ExcelOnboarding from './pages/admin/ExcelOnboarding';
import SchoolAttendance from './pages/admin/SchoolAttendance';
import SchoolTransferCertificates from './pages/admin/SchoolTransferCertificates';
import StudentDiscipline from './pages/admin/StudentDiscipline';
import SchoolEventsCalendar from './pages/admin/SchoolEventsCalendar';
import SchoolSurveys from './pages/admin/SchoolSurveys';
import AddBatch from './pages/admin/AddBatch';
import BatchDetails from './pages/admin/BatchDetails';
import EditBatch from './pages/admin/EditBatch';
import EditCourse from './pages/admin/EditCourse';
import ManagePayments from './pages/admin/ManagePayments';
import FinancialTransactions from './pages/admin/FinancialTransactions';
import AddPayment from './pages/admin/AddPayment';
import EditPayment from './pages/admin/EditPayment.jsx';
import GenerateCertificate from './pages/admin/GenerateCertificate';
import GenerateIdCard from './pages/admin/GenerateIdCard';
import IdCardManagement from './pages/admin/IdCardManagement';
import IdCardTemplateForm from './pages/admin/IdCardTemplateForm';
import StudentCertificateManagement from './pages/admin/StudentCertificateManagement';
import GenerateStudentCertificate from './pages/admin/GenerateStudentCertificate';
import StudentCertificateTemplateForm from './pages/admin/StudentCertificateTemplateForm';
import MarksheetManagement from './pages/admin/MarksheetManagement';
import MarksheetTemplateForm from './pages/admin/MarksheetTemplateForm';
import GenerateMarksheet from './pages/admin/GenerateMarksheet';
import CompanyProfile from './pages/admin/CompanyProfile';
import WebsiteSettings from './pages/admin/WebsiteSettings';
import AppManagement from './pages/admin/AppManagement';
import VerifyCertificate from './pages/VerifyCertificate';
import CertificateVerification from './pages/CertificateVerification';
import ManageOnlineClasses from './pages/admin/ManageOnlineClasses';
import AddOnlineClass from './pages/admin/AddOnlineClass';
import OnlineClassDetails from './pages/admin/OnlineClassDetails';
import EditOnlineClass from './pages/admin/EditOnlineClass';
import ManageAttendance from './pages/admin/ManageAttendance';
import ManageEnquiries from './pages/admin/ManageEnquiries';
import ManageAdmissions from './pages/admin/ManageAdmissions';
import ManageGallery from './pages/admin/ManageGallery';
import ManageNotifications from './pages/admin/ManageNotifications';
import CampusDashboard from './pages/school_admin/CampusDashboard';
import CampusSettings from './pages/school_admin/CampusSettings';
import CampusStudents from './pages/school_admin/CampusStudents';
import CampusAddStudent from './pages/school_admin/AddStudent';
import CampusEditStudent from './pages/school_admin/EditStudent';
import CampusAttendance from './pages/school_admin/CampusAttendance';
import CampusStaffAttendance from './pages/school_admin/CampusStaffAttendance';
import CampusPayments from './pages/school_admin/CampusPayments';
import CampusAddPayment from './pages/school_admin/AddPayment';
import CampusEditPayment from './pages/school_admin/EditPayment';
import CampusManageOnlineClasses from './pages/school_admin/ManageOnlineClasses';
import CampusAddOnlineClass from './pages/school_admin/AddOnlineClass';
import MyCertificates from './pages/student/MyCertificates';
import MyIdCard from './pages/student/MyIdCard';
import MyMarksheets from './pages/student/MyMarksheets';
import OnlineClasses from './pages/student/OnlineClasses';
import MyPayments from './pages/student/MyPayments';
import MyAttendance from './pages/student/MyAttendance';
import StudentProgress from './pages/student/StudentProgress';
import StudentCourses from './pages/student/MyCourses';
import StudentCourseDetails from './pages/student/CourseDetails';
import CourseLearning from './pages/student/CourseLearning';
import ViewChapters from './pages/student/ViewChapters';
import ViewTopic from './pages/student/ViewTopic';
import SelectTest from './pages/student/SelectTest';
import TakeTest from './pages/student/TakeTest';
import StudentExams from './pages/student/StudentExams';
import TakeExam from './pages/student/TakeExam';
import TestResults from './pages/student/TestResults';
import ViewResult from './pages/student/ViewResult';
import Profile from './pages/Profile';
import Notification from './components/Notification';
import Notifications from './pages/Notifications';
import ManageTestimonials from './pages/admin/ManageTestimonials';
import CampusTestimonials from './pages/school_admin/CampusTestimonials';
import StudentReviews from './pages/student/StudentReviews';

// Protected Route Component with School Role Equivalence
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !isRoleAllowed(user.role, allowedRoles)) {
    const home = getHomeRouteForRole(user.role);
    if (location.pathname === home) {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to={home} replace />;
  }

  return children;
};

const RedirectCampusParam = ({ subPath = '' }) => {
  const { id } = useParams();
  return <Navigate to={`/admin/campuses/${id}${subPath}`} replace />;
};

const LegacySchoolPathRedirect = () => {
  const location = useLocation();
  const nextPath = location.pathname.replace(/^\/franchise_admin/, '/school') + (location.search || '');
  return <Navigate to={nextPath} replace />;
};

function App() {
  const { user } = useAuth();

  return (
    <SocketProvider>
      <Router>
        <AppToast />
        <Notification />
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/register-super-admin" element={<RegisterSuperAdmin />} />

          {/* Public Routes */}
          <Route path="/verify-certificate" element={<CertificateVerification />} />
          <Route path="/campuses" element={<Navigate to="/login" replace />} />
          <Route path="/verify-certificate-public" element={<VerifyCertificate />} />

          {/* Default route based on role / Landing Page */}
          <Route
            path="/"
            element={user ? <Navigate to={getHomeRouteForRole(user.role)} replace /> : <LandingPage />}
          />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />

          {/* Platform Super Admin Routes */}
          <Route
            path="/super_admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <PlatformDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super_admin/plans"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManageSubscriptionPlans />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_owner']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Dedicated Teacher Workspace Route */}
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'class_teacher', 'school_admin', 'franchise_admin', 'super_admin']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          {/* Dedicated Parent & Guardian Portal Route */}
          <Route
            path="/parent/dashboard"
            element={
              <ProtectedRoute allowedRoles={['parent', 'student', 'super_admin']}>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/notifications"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* Dedicated Accountant Desk Route */}
          <Route
            path="/accountant/dashboard"
            element={
              <ProtectedRoute allowedRoles={['accountant', 'school_admin', 'franchise_admin', 'super_admin']}>
                <AccountantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManageUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activity"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ActivityLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManageCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/add"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AddCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <EditCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/:courseId"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <CourseDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/:courseId/add-lessons"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <BatchAddLessons />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses/:courseId/mcqs/batch"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <BatchAddMCQs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/courses/:courseId/add-lessons"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <BatchAddLessons />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/courses/:courseId/mcqs/batch"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <BatchAddMCQs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/lessons/add"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <BatchAddLessons />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mcqs/batch"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <BatchAddMCQs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/testimonials"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManageTestimonials />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManageTestimonials />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManageCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/chapters"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManageChapters />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/topics"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManageTopics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mcqs"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <ManageMCQs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exams"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <ManageExams />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exams/:examId"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <ExamDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exams/preview/:examId"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <PreviewExam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exams/:examId/edit"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <EditExam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exams/:examId/analytics"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <ExamAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exams/add"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <CreateExam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exams/create"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <CreateExam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={["super_admin"]}>
                <ReportsLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Reports />} />
            <Route path="student-performance/:studentId?" element={<StudentPerformanceReport />} />
            <Route path="student-attendance" element={<StudentAttendanceReport />} />
            <Route path="student-enrollment" element={<StudentEnrollmentReport />} />
            <Route path="student-certificates" element={<StudentCertificateReport />} />
            <Route path="revenue" element={<RevenueReport />} />
            <Route path="payments" element={<PaymentReport />} />
            <Route path="outstanding-payments" element={<OutstandingPaymentsReport />} />
            <Route path="course-revenue" element={<CourseRevenueReport />} />
            <Route path="course-popularity" element={<CoursePopularityReport />} />
            <Route path="course-completion" element={<CourseCompletionReport />} />
            <Route path="staff-attendance" element={<StaffAttendanceReport />} />
            <Route path="staff-performance" element={<StaffPerformanceReport />} />
            <Route path="payroll" element={<PayrollReport />} />
            <Route path="campus-performance" element={<CampusPerformanceReport />} />
            <Route path="campus-compliance" element={<CampusComplianceReport />} />
          </Route>
          <Route
            path="/admin/mcqs/add"
            element={
              <ProtectedRoute allowedRoles={["super_admin"]}>
                <BatchAddMCQs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mcqs/edit/:id"
            element={
              <ProtectedRoute allowedRoles={["super_admin"]}>
                <AddEditMCQ />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/franchises"
            element={
              <Navigate to="/admin/campuses" replace />
            }
          />
          <Route
            path="/admin/franchises/add"
            element={
              <Navigate to="/admin/campuses/add" replace />
            }
          />
          <Route
            path="/admin/franchises/:id"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <RedirectCampusParam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/franchises/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <RedirectCampusParam subPath="/edit" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/seat-requests"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Navigate to="/admin/campuses" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/franchise-plans"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Navigate to="/admin/campuses" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/franchise-plans/add"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Navigate to="/admin/campuses" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/franchise-plans/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Navigate to="/admin/campuses" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/franchise-plans/:id"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Navigate to="/admin/campuses" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <ManageStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students/add"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <AddStudent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students/:id"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <StudentDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <EditStudent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <ManageStaff />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff/add"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <AddStaff />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff/:id"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <StaffDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <EditStaff />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff-attendance"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <StaffAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff-salary"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <StaffSalary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff-salary/generate"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <GenerateSalary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff-salary/:id"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <StaffSalaryDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/advance-payment"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <AdvancePayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/programs"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManagePrograms />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/academic-setup"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <AcademicSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <AcademicSetup defaultTab="classes" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sections"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <AcademicSetup defaultTab="classes" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/academic-years"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <AcademicSetup defaultTab="sessions" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/subjects"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <AcademicSetup defaultTab="subjects" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/academic-setup"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <AcademicSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/classes"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <AcademicSetup defaultTab="classes" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/sections"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <AcademicSetup defaultTab="classes" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/academic-years"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <AcademicSetup defaultTab="sessions" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/subjects"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <AcademicSetup defaultTab="subjects" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/school-fees"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'accountant']}>
                <SchoolFees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/school-fees"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'accountant']}>
                <SchoolFees />
              </ProtectedRoute>
            }
          />

          {/* School Student Promotion Routes */}
          <Route
            path="/admin/student-promotion"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin', 'franchise_admin', 'principal']}>
                <StudentPromotion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/student-promotion"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin', 'franchise_admin', 'principal']}>
                <StudentPromotion />
              </ProtectedRoute>
            }
          />

          {/* Fee Collection & Quick Receipt Routes */}
          <Route
            path="/admin/school-fees/collect"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'accountant']}>
                <SchoolFees defaultTab="collect" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fees"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'accountant']}>
                <SchoolFees defaultTab="collect" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/school-fees/collect"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'accountant']}>
                <SchoolFees defaultTab="collect" />
              </ProtectedRoute>
            }
          />

          {/* School Campuses & Administration Aliases */}
          <Route
            path="/admin/campuses"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManageCampuses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/campuses/add"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AddCampus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/campuses/:id"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <CampusDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/campuses/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <EditCampus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <WebsiteSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ActivityLog />
              </ProtectedRoute>
            }
          />

          {/* School Branding & Multi-Tenant Settings */}
          <Route
            path="/admin/settings/branding"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin', 'franchise_admin', 'principal']}>
                <SchoolBrandingSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/branding"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin', 'franchise_admin', 'principal']}>
                <SchoolBrandingSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/settings/branding"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin', 'franchise_admin', 'principal']}>
                <SchoolBrandingSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/branding"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin', 'franchise_admin', 'principal']}>
                <SchoolBrandingSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/accounting-ledger"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'accountant']}>
                <AccountingLedger />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/accounting-ledger"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'accountant']}>
                <AccountingLedger />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/inventory"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'accountant', 'librarian']}>
                <SchoolInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/inventory"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'accountant', 'librarian']}>
                <SchoolInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/hostel"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'accountant']}>
                <HostelManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/examinations"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolExaminations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/examinations"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolExaminations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/timetable"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher']}>
                <SchoolTimetable />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/timetable"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolTimetable />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/library"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'librarian']}>
                <SchoolLibrary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/library"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'librarian']}>
                <SchoolLibrary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/homework"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolHomework />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/homework"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolHomework />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/visitor-pass"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'security_staff', 'principal']}>
                <VisitorGatePass />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/visitor-pass"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'security_staff', 'principal']}>
                <VisitorGatePass />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/transport"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'transport_manager', 'principal']}>
                <TransportGPS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/transport"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'transport_manager', 'principal']}>
                <TransportGPS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/leaves"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'hr_manager', 'teacher', 'staff']}>
                <LeaveManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/leaves"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'hr_manager', 'teacher', 'staff']}>
                <LeaveManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/communications"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher']}>
                <CommunicationsHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/communications"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher']}>
                <CommunicationsHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/onboarding"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <ExcelOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/onboarding"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <ExcelOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/school-attendance"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/school-attendance"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/transfer-certificates"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <SchoolTransferCertificates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/transfer-certificates"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <SchoolTransferCertificates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/discipline"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <StudentDiscipline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/discipline"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <StudentDiscipline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events-calendar"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher']}>
                <SchoolEventsCalendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/events-calendar"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher']}>
                <SchoolEventsCalendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/surveys"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <SchoolSurveys />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/surveys"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <SchoolSurveys />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/hostel"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'accountant']}>
                <HostelManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/examinations"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolExaminations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/examinations"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolExaminations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/timetable"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher']}>
                <SchoolTimetable />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/timetable"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolTimetable />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/library"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'librarian']}>
                <SchoolLibrary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/library"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'librarian']}>
                <SchoolLibrary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/homework"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolHomework />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/homework"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolHomework />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/visitor-pass"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'security_staff', 'principal']}>
                <VisitorGatePass />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/visitor-pass"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'security_staff', 'principal']}>
                <VisitorGatePass />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/transport"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'transport_manager', 'principal']}>
                <TransportGPS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/transport"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'transport_manager', 'principal']}>
                <TransportGPS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/leaves"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'hr_manager', 'teacher', 'staff']}>
                <LeaveManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/leaves"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'hr_manager', 'teacher', 'staff']}>
                <LeaveManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/communications"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher']}>
                <CommunicationsHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/communications"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher']}>
                <CommunicationsHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/onboarding"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <ExcelOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/onboarding"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <ExcelOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/school-attendance"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/school-attendance"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <SchoolAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/transfer-certificates"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <SchoolTransferCertificates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/transfer-certificates"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <SchoolTransferCertificates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/discipline"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <StudentDiscipline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/discipline"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher', 'class_teacher']}>
                <StudentDiscipline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events-calendar"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher']}>
                <SchoolEventsCalendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/events-calendar"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal', 'teacher']}>
                <SchoolEventsCalendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/surveys"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <SchoolSurveys />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/surveys"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'franchise_admin', 'school_admin', 'principal']}>
                <SchoolSurveys />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/batches"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <ManageBatches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/batches/add"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <AddBatch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/batches/:id"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <BatchDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/batches/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <EditBatch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/financial-ledger"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <FinancialTransactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManagePayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <EditPayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments/add"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AddPayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/certificates/generate"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <GenerateCertificate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/id-cards"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <IdCardManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/id-cards/generate"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <GenerateIdCard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/id-cards/templates/new"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <IdCardTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/id-cards/templates/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <IdCardTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/franchise-certificates"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Navigate to="/admin/transfer-certificates" replace />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/franchise-certificates/*" element={<ProtectedRoute allowedRoles={['super_admin']}><Navigate to="/admin/transfer-certificates" replace /></ProtectedRoute>} />
          <Route path="/admin/student-certificates"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <StudentCertificateManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/student-certificates/generate"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <GenerateStudentCertificate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/student-certificates/templates/new"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <StudentCertificateTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/student-certificates/templates/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <StudentCertificateTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/student-certificates/templates/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <StudentCertificateTemplateForm />
              </ProtectedRoute>
            }
          />
          {/* Marksheet Routes */}
          <Route
            path="/admin/marksheet-templates"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <MarksheetManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/marksheet-templates/new"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <MarksheetTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/marksheet-templates/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <MarksheetTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/generate-marksheet"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <GenerateMarksheet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/company-profile"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <CompanyProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/template-assets"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <CompanyProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/online-classes"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManageOnlineClasses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/online-classes/:classId"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <OnlineClassDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/online-classes/:classId/edit"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <EditOnlineClass />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/online-classes/add"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AddOnlineClass />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/attendance"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <ManageAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/enquiries"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <ManageEnquiries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/admissions"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManageAdmissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/gallery"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManageGallery />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/website-settings"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <WebsiteSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/app-management"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AppManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ManageNotifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* School Admin Routes */}
          <Route
            path="/school/dashboard"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <CampusDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/notifications"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/students"
            element={
              <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'class_teacher']}>
                <CampusStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/students/add"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <CampusAddStudent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/students/:id"
            element={
              <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'class_teacher']}>
                <StudentDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/students/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <CampusEditStudent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/marksheet-templates"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
                <MarksheetManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/generate-marksheet"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <GenerateMarksheet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/attendance"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <CampusAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/staff-attendance"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <CampusStaffAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/financial-ledger"
            element={
              <ProtectedRoute allowedRoles={['school_admin', 'accountant']}>
                <FinancialTransactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/payments"
            element={
              <ProtectedRoute allowedRoles={['school_admin', 'accountant']}>
                <CampusPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/fees"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <CampusPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/payments/add"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <CampusAddPayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/payments/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <CampusEditPayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/fees/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <CampusEditPayment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/certificates"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <Navigate to="/school/transfer-certificates" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/certificates/*"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <Navigate to="/school/transfer-certificates" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/id-cards"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <IdCardManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/id-cards/generate"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <GenerateIdCard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/id-cards/templates/new"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <IdCardTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/id-cards/templates/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <IdCardTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/transfer-certificates"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <Navigate to="/school/transfer-certificates" replace />
              </ProtectedRoute>
            }
          />

          {/* School Admin Report Routes */}
          <Route
            path="/school/reports"
            element={
              <ProtectedRoute allowedRoles={['school_admin', 'principal', 'vice_principal', 'franchise_admin', 'accountant']}>
                <ReportsLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CampusReports />} />
            <Route path="student-performance/:studentId?" element={<StudentPerformanceReport />} />
            <Route path="student-attendance" element={<StudentAttendanceReport />} />
            <Route path="student-enrollment" element={<StudentEnrollmentReport />} />
            <Route path="student-certificates" element={<StudentCertificateReport />} />
            <Route path="revenue" element={<RevenueReport />} />
            <Route path="payments" element={<PaymentReport />} />
            <Route path="outstanding-payments" element={<OutstandingPaymentsReport />} />
            <Route path="course-revenue" element={<CourseRevenueReport />} />
            <Route path="course-popularity" element={<CoursePopularityReport />} />
            <Route path="course-completion" element={<CourseCompletionReport />} />
            <Route path="staff-attendance" element={<StaffAttendanceReport />} />
            <Route path="staff-performance" element={<StaffPerformanceReport />} />
            <Route path="payroll" element={<PayrollReport />} />
            <Route path="campus-performance" element={<CampusPerformanceReport />} />
            <Route path="campus-compliance" element={<CampusComplianceReport />} />
          </Route>
          <Route
            path="/school/transfer-certificates/templates/*"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <Navigate to="/school/transfer-certificates" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/student-certificates"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <StudentCertificateManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/student-certificates/templates/new"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <StudentCertificateTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/student-certificates/templates/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <StudentCertificateTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/student-certificates/templates/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <StudentCertificateTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/student-certificates"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <StudentCertificateManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/student-certificates/generate"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <GenerateStudentCertificate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/student-certificates/templates/new"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <StudentCertificateTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/student-certificates/templates/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <StudentCertificateTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/student-certificates/templates/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <StudentCertificateTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/online-classes"
            element={
              <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'class_teacher']}>
                <CampusManageOnlineClasses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/online-classes/:classId"
            element={
              <ProtectedRoute allowedRoles={['school_admin', 'teacher', 'class_teacher']}>
                <OnlineClassDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/online-classes/:classId/edit"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <EditOnlineClass />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/online-classes/add"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <CampusAddOnlineClass />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/courses/:courseId"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <CourseDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/courses"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <ManageCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/seat-requests"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <Navigate to="/school/students" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/staff"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <ManageStaff />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/staff/add"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <AddStaff />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/profile"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/settings"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <CampusSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/subscription"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <Navigate to="/school/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school/testimonials"
            element={
              <ProtectedRoute allowedRoles={['school_admin']}>
                <CampusTestimonials />
              </ProtectedRoute>
            }
          />

          {/* Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/notifications"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/progress"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentProgress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/courses"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/courses/:courseId"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentCourseDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/learn/course/:courseId"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <CourseLearning />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/chapters"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ViewChapters />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/topic/:topicId"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ViewTopic />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/test"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <SelectTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/take-test"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <TakeTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exams"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentExams />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exam/:examId"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <TakeExam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/results"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <TestResults />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/result/:resultId"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ViewResult />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/certificates"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyCertificates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/id-card"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyIdCard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/marksheets"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyMarksheets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/online-classes/:classId"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <OnlineClassDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/online-classes"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <OnlineClasses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/payments"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/attendance"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/testimonials"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentReviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/reviews"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentReviews />
              </ProtectedRoute>
            }
          />
          {/* Seamless redirect for any legacy bookmarks */}
          <Route path="/franchise_admin/*" element={<LegacySchoolPathRedirect />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
