import { TbCurrencyRupee } from 'react-icons/tb';
import {
  useState,
  useEffect } from 'react';
import { useParams,
  useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import ProfilePictureUpload from '../../components/ProfilePictureUpload';
import { 
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBook,
  FiCalendar,
  FiEdit2,
  FiTrash2,
  FiAward,
  FiTrendingUp,
  FiClock,
  FiArrowLeft,
  FiDownload,
  FiFileText,
  FiPlus,
  FiUnlock,
  FiCheckCircle,
  FiCheckSquare,
  FiXCircle,
  FiAlertCircle
} from 'react-icons/fi';
import api from '../../api/axios';
import { getStudent, deleteStudent, getStudentExamAccess, updateStudentExamAccess } from '../../api/studentApi';
import { getStudentAttendance } from '../../api/attendanceApi';
import { downloadReceipt } from '../../api/paymentApi';
import { getUnifiedPaymentHistory, getStudentObligations } from '../../api/transactionApi';
import { normalizeInflowRecord } from '../../utils/transactionHelpers';
import { useAuth } from '../../context/AuthContext';
import { toAbsoluteUrl } from '../../utils/url';
import EnrollCourseModal from '../../components/EnrollCourseModal';
import {
  Card, CardHeader, StatCard, Badge, StatusBadge, Button, PageLoading, EmptyState,
  TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty,
  Modal, FormField, FormGrid, TextField, TextArea, SelectField
} from '../../components/ui';

const FileViewer = ({ fileUrl, label }) => {
  const absoluteUrl = toAbsoluteUrl(fileUrl);
  const [showPreview, setShowPreview] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [dimensionsLoaded, setDimensionsLoaded] = useState(false);
  
  if (!absoluteUrl) return <p className="text-slate-500 text-xs">Not available</p>;

  const isImage = /\.(jpeg|jpg|gif|png)$/i.test(absoluteUrl);
  const fileName = absoluteUrl.split('/').pop() || label;

  useEffect(() => {
    if (isImage && fileUrl) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
        setDimensionsLoaded(true);
      };
      img.onerror = () => {
        setDimensionsLoaded(true);
      };
      img.src = absoluteUrl;
    } else {
      setDimensionsLoaded(true);
    }
  }, [fileUrl, isImage]);

  const handleImageClick = () => {
    if (isImage && dimensionsLoaded) {
      const screenHeight = window.innerHeight;
      const screenWidth = window.innerWidth;
      
      if (imageDimensions.height > screenHeight * 0.9 || imageDimensions.width > screenWidth * 0.9) {
        window.open(absoluteUrl, '_blank');
      } else {
        setShowPreview(!showPreview);
      }
    }
  };

  if (isImage) {
    return (
      <div>
        <p className="text-xs text-slate-500 mb-1.5 capitalize font-medium">{label.replace(/([A-Z])/g, ' $1').trim()}</p>
        <div className="flex flex-col items-center">
          <div className="relative group cursor-pointer w-full" onClick={handleImageClick}>
            <img 
              src={absoluteUrl} 
              alt={label} 
              className="w-full h-32 object-contain rounded-xl shadow-xs border border-slate-200 hover:shadow-md transition bg-slate-50"
            />
            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 rounded-xl transition flex items-center justify-center">
              <span className="text-white text-xs font-semibold px-2 py-1 bg-black/60 rounded">
                {dimensionsLoaded && imageDimensions.height > window.innerHeight * 0.9 ? 'Open new tab' : 'Click to view'}
              </span>
            </div>
          </div>
          
          {dimensionsLoaded && imageDimensions.height <= window.innerHeight * 0.9 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPreview(!showPreview);
              }}
              className="mt-1.5 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
            >
              {showPreview ? 'Hide Full Image' : 'View Full Image'}
            </button>
          )}
          
          {showPreview && dimensionsLoaded && imageDimensions.height <= window.innerHeight * 0.9 && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
              <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
                <img 
                  src={absoluteUrl} 
                  alt={label} 
                  className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                />
                <button
                  onClick={() => setShowPreview(false)}
                  className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-lg hover:bg-slate-100 text-slate-700"
                >
                  <FiXCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-slate-500 mb-1.5 capitalize font-medium">{label.replace(/([A-Z])/g, ' $1').trim()}</p>
      <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200/90 rounded-xl">
        <FiFileText className="text-primary-600 w-4 h-4 shrink-0" />
        <a 
          href={absoluteUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-primary-600 hover:underline text-xs font-medium truncate"
        >
          View {fileName}
        </a>
      </div>
    </div>
  );
};

const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [obligationSummary, setObligationSummary] = useState(null);
  const [obligations, setObligations] = useState([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [examAccess, setExamAccess] = useState(null);
  const [examAccessLoading, setExamAccessLoading] = useState(false);

  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState('all');

  // Quick Modular Edit Modals State
  const [personalModalOpen, setPersonalModalOpen] = useState(false);
  const [personalSaving, setPersonalSaving] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    firstName: '',
    lastName: '',
    fatherName: '',
    motherName: '',
    aadhaarNumber: '',
    dateOfBirth: '',
    gender: 'male',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: ''
  });

  const openPersonalModal = () => {
    setPersonalForm({
      firstName: student?.personalInfo?.firstName || '',
      lastName: student?.personalInfo?.lastName || '',
      fatherName: student?.personalInfo?.fatherName || '',
      motherName: student?.personalInfo?.motherName || '',
      aadhaarNumber: student?.personalInfo?.aadhaarNumber || '',
      dateOfBirth: student?.personalInfo?.dateOfBirth ? new Date(student.personalInfo.dateOfBirth).toISOString().split('T')[0] : '',
      gender: student?.personalInfo?.gender || 'male',
      phone: student?.contactInfo?.mobile || '',
      address: student?.contactInfo?.address?.street || '',
      city: student?.contactInfo?.address?.city || '',
      state: student?.contactInfo?.address?.state || '',
      pincode: student?.contactInfo?.address?.pincode || '',
      guardianName: student?.guardianInfo?.name || '',
      guardianPhone: student?.guardianInfo?.mobile || '',
      guardianEmail: student?.guardianInfo?.email || ''
    });
    setPersonalModalOpen(true);
  };

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    setPersonalSaving(true);
    try {
      const payload = {
        firstName: personalForm.firstName,
        lastName: personalForm.lastName,
        fatherName: personalForm.fatherName,
        motherName: personalForm.motherName,
        aadhaarNumber: personalForm.aadhaarNumber,
        dateOfBirth: personalForm.dateOfBirth || undefined,
        gender: personalForm.gender,
        phone: personalForm.phone,
        address: personalForm.address,
        city: personalForm.city,
        state: personalForm.state,
        pincode: personalForm.pincode,
        guardianName: personalForm.guardianName,
        guardianPhone: personalForm.guardianPhone,
        guardianEmail: personalForm.guardianEmail
      };
      await api.put(`/students/${id}`, payload);
      await fetchStudent();
      setPersonalModalOpen(false);
      toast.success('Personal and contact details updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update personal details');
    } finally {
      setPersonalSaving(false);
    }
  };

  const [academicModalOpen, setAcademicModalOpen] = useState(false);
  const [academicSaving, setAcademicSaving] = useState(false);
  const [academicForm, setAcademicForm] = useState({
    lastQualification: '',
    boardOrUniversity: '',
    schoolOrCollege: '',
    yearOfPassing: '',
    percentage: ''
  });

  const openAcademicModal = () => {
    setAcademicForm({
      lastQualification: student?.academicInfo?.lastQualification || '',
      boardOrUniversity: student?.academicInfo?.boardOrUniversity || '',
      schoolOrCollege: student?.academicInfo?.schoolOrCollege || '',
      yearOfPassing: student?.academicInfo?.yearOfPassing || '',
      percentage: student?.academicInfo?.percentage || ''
    });
    setAcademicModalOpen(true);
  };

  const handleSaveAcademic = async (e) => {
    e.preventDefault();
    setAcademicSaving(true);
    try {
      const payload = {
        lastQualification: academicForm.lastQualification,
        boardOrUniversity: academicForm.boardOrUniversity,
        schoolOrCollege: academicForm.schoolOrCollege,
        yearOfPassing: academicForm.yearOfPassing,
        percentage: academicForm.percentage
      };
      await api.put(`/students/${id}`, payload);
      await fetchStudent();
      setAcademicModalOpen(false);
      toast.success('Academic details updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update academic details');
    } finally {
      setAcademicSaving(false);
    }
  };

  const getEnrollmentStatus = (enrollment) => {
    if (enrollment.isActive === false) {
      return { label: 'Inactive', className: 'bg-red-100 text-red-800' };
    }
    if ((enrollment.progress || 0) >= 100 || enrollment.status === 'completed') {
      return { label: 'Completed', className: 'bg-blue-100 text-blue-800' };
    }
    return { label: 'Active', className: 'bg-green-100 text-green-800' };
  };

  const getCoursePendingFromObligations = (courseId) => {
    const courseKey = courseId?.toString();
    if (!courseKey || !obligations.length) return null;
    return obligations
      .filter((o) => (o.course?._id || o.course)?.toString() === courseKey)
      .reduce((sum, o) => sum + (o.amountPending || 0), 0);
  };

  // Course-based payment calculation functions
  const getCoursePaymentStats = () => {
    if (!payments || !student?.enrolledCourses) return {
      totalCourseFees: 0,
      totalCompletedAmount: 0,
      totalRefundedAmount: 0,
      totalPendingAmount: 0,
      totalFailedAmount: 0,
      totalNetPaid: 0,
      totalTransactions: 0,
      courseBreakdown: []
    };

    const totalCourseFees = student.enrolledCourses.reduce((total, enrollment) => {
      const course = enrollment.course;
      const discountedFee = course?.discountedFee || course?.regularFee || 0;
      const registrationFee = course?.registrationFee || 0;
      return total + discountedFee + registrationFee;
    }, 0);

    const enrolledCourseIds = (student.enrolledCourses || []).map(e => e.course?._id?.toString() || e.course?.toString());
    const coursePayments = (payments || []).filter(p => 
      p.course && enrolledCourseIds.includes(p.course._id?.toString() || p.course?.toString())
    );

    const completedPayments = coursePayments.filter(p => p.paymentStatus === 'completed');
    const pendingPayments = coursePayments.filter(p => p.paymentStatus === 'pending');
    const refundedPayments = coursePayments.filter(p => p.paymentStatus === 'refunded');
    const failedPayments = coursePayments.filter(p => p.paymentStatus === 'failed');
    
    const completedAmount = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const refundedAmount = refundedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const netPaid = completedAmount - refundedAmount;
    
    const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalFailedAmount = failedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const courseBreakdown = student.enrolledCourses.map(enrollment => {
      const course = enrollment.course;
      const coursePayments = payments.filter(p => p.course?._id === course?._id) || [];
      const courseCompleted = coursePayments.filter(p => p.paymentStatus === 'completed');
      const courseRefunded = coursePayments.filter(p => p.paymentStatus === 'refunded');
      const coursePending = coursePayments.filter(p => p.paymentStatus === 'pending');
      const courseFailed = coursePayments.filter(p => p.paymentStatus === 'failed');
      
      const discountedFee = course?.discountedFee || course?.regularFee || 0;
      const registrationFee = course?.registrationFee || 0;
      const totalCourseFee = discountedFee + registrationFee;
      
      const completedAmount = courseCompleted.reduce((sum, p) => sum + p.amount, 0);
      const refundedAmount = courseRefunded.reduce((sum, p) => sum + p.amount, 0);
      const netPaid = completedAmount - refundedAmount;
      const pendingAmount = coursePending.reduce((sum, p) => sum + p.amount, 0);
      const failedAmount = courseFailed.reduce((sum, p) => sum + p.amount, 0);
      
      return {
        courseId: course?._id,
        courseName: course?.title,
        totalCourseFee,
        completedAmount,
        refundedAmount,
        netPaid,
        pendingAmount,
        failedAmount,
        completedCount: courseCompleted.length,
        refundedCount: courseRefunded.length,
        pendingCount: coursePending.length,
        failedCount: courseFailed.length
      };
    });
    
    return {
      totalCourseFees,
      totalCompletedAmount: completedAmount,
      totalRefundedAmount: refundedAmount,
      totalPendingAmount,
      totalFailedAmount,
      totalNetPaid: netPaid,
      totalTransactions: coursePayments.length,
      courseBreakdown
    };
  };

  const fetchExamAccess = async () => {
    try {
      setExamAccessLoading(true);
      const res = await getStudentExamAccess(id);
      setExamAccess(res.data || null);
    } catch (error) {
      console.error('Failed to fetch exam access:', error);
    } finally {
      setExamAccessLoading(false);
    }
  };

  const handleExamAccessUpdate = async (payload) => {
    try {
      const res = await updateStudentExamAccess(id, payload);
      setExamAccess(res.data || null);
      toast.success(res.message || 'Exam access updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update exam access');
    }
  };

  const fetchObligations = async () => {
    try {
      const obligationsRes = await getStudentObligations(id);
      setObligations(obligationsRes.data || []);
      setObligationSummary(obligationsRes.summary || null);
    } catch (error) {
      console.error('Failed to fetch obligations:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true);
      const [historyRes, obligationsRes] = await Promise.all([
        getUnifiedPaymentHistory({ student: id }),
        getStudentObligations(id)
      ]);
      const rows = (historyRes.data || []).map(normalizeInflowRecord).filter(Boolean);
      setPayments(rows);
      setObligations(obligationsRes.data || []);
      setObligationSummary(obligationsRes.summary || null);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      setAttendanceLoading(true);
      const res = await getStudentAttendance(id);
      if (res?.data) {
        setAttendanceRecords(res.data.records || []);
        setAttendanceStats(res.data.statistics || null);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleDownloadReceipt = async (paymentId) => {
    try {
      const blob = await downloadReceipt(paymentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${paymentId}.pdf`;
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

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const data = await getStudent(id);
      setStudent(data.data);
    } catch (error) {
      toast.error('Failed to fetch student details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUploadSuccess = (photoUrl) => {
    setStudent(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        photo: photoUrl
      }
    }));
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) return;
    
    try {
      await deleteStudent(id);
      toast.success('Student deleted successfully');
      navigate(['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? '/school/students' : '/admin/students');
    } catch (error) {
      toast.error('Failed to delete student');
      console.error(error);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'fees') {
      fetchPayments();
    } else if (activeTab === 'exam-access') {
      fetchExamAccess();
    } else if (activeTab === 'courses') {
      fetchObligations();
    } else if (activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [activeTab, id]);

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Student Details" subtitle="View and manage student information" icon={FiUser} />
        <PageLoading message="Loading student details..." />
      </Layout>
    );
  }

  if (!student) {
    return (
      <Layout>
        <PageHeader title="Student Details" subtitle="View and manage student information" icon={FiUser} />
        <Card>
          <EmptyState
            icon={FiUser}
            title="Student not found"
            description="The student you are looking for does not exist or has been removed."
            action={(
              <Button
                icon={FiArrowLeft}
                onClick={() => navigate(['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? '/school/students' : '/admin/students')}
              >
                Back to Students
              </Button>
            )}
          />
        </Card>
      </Layout>
    );
  }

  const filteredAttendance = attendanceRecords.filter((rec) => {
    if (attendanceFilter === 'all') return true;
    return rec.status === attendanceFilter;
  });

  return (
    <Layout
      title="Student Details"
      breadcrumbs="Students / Student Details"
      actions={(
        <>
          <button
            type="button"
            onClick={() => navigate(['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? `/school/students/${id}/edit` : `/admin/students/${id}/edit`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-2xs transition"
          >
            <FiEdit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          {user.role === 'super_admin' && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </>
      )}
    >
      <div className="space-y-4">
        {/* Inner Tabs Navigation Strip */}
        <div className="border-b border-slate-200/90 -mt-1 mb-4">
          <nav className="flex space-x-6 sm:space-x-8 overflow-x-auto no-scrollbar" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Overview', icon: FiUser },
              { id: 'courses', label: 'Courses', icon: FiBook },
              { id: 'attendance', label: 'Attendance', icon: FiCalendar },
              { id: 'fees', label: 'Fees', icon: TbCurrencyRupee },
              { id: 'exam-access', label: 'Exam Access', icon: FiCheckSquare },
              { id: 'academic', label: 'Academic & documents', icon: FiFileText }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2.5 px-1 border-b-2 font-semibold text-xs transition-colors flex items-center gap-2 whitespace-nowrap ${
                    active
                      ? 'border-primary-600 text-primary-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Arion School 2-Column Split Layout */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left Sticky Profile Card - Fixed while right area scrolls */}
          <div className="w-full lg:w-80 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 shrink-0 flex flex-col items-center lg:sticky lg:top-4 self-start">
            <div className="relative mb-3">
              <ProfilePictureUpload
                currentPhoto={toAbsoluteUrl(student.personalInfo?.photo)}
                userId={id}
                userType="student"
                onUploadSuccess={handlePhotoUploadSuccess}
                size="large"
              />
            </div>

            <h2 className="text-base font-bold text-slate-900 text-center">
              {student.personalInfo?.firstName} {student.personalInfo?.lastName}
            </h2>

            <div className="mt-1.5 mb-4">
              <StatusBadge status={student.status} />
            </div>

            <div className="w-full border-t border-slate-100 pt-4 space-y-3.5 text-xs">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">Student ID</span>
                <span className="text-sm font-bold text-slate-900 font-mono block">{student.studentId || 'N/A'}</span>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">Enrollment Number</span>
                <span className="text-sm font-bold text-slate-900 font-mono block">{student.enrollmentNumber || 'N/A'}</span>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">Email</span>
                {student.contactInfo?.email ? (
                  <a href={`mailto:${student.contactInfo.email}`} className="text-sm font-bold text-slate-900 hover:text-primary-600 break-all block">
                    {student.contactInfo.email}
                  </a>
                ) : (
                  <span className="text-sm font-bold text-slate-400 block">N/A</span>
                )}
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">Mobile</span>
                {student.contactInfo?.mobile ? (
                  <a href={`tel:${student.contactInfo.mobile}`} className="text-sm font-bold text-slate-900 hover:text-primary-600 block">
                    {student.contactInfo.mobile}
                  </a>
                ) : (
                  <span className="text-sm font-bold text-slate-400 block">N/A</span>
                )}
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">School Campus</span>
                <span className="text-sm font-bold text-slate-900 block">
                  {student.franchise?.name || 'The Vits School - Main Campus'}
                </span>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">Class & Section</span>
                <span className="text-sm font-bold text-indigo-700 block">
                  {student.schoolClass?.name || 'Class'} {student.section?.name ? `(Section ${student.section.name})` : ''}
                </span>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">Roll Number</span>
                <span className="text-sm font-bold text-slate-900 block font-mono">
                  {student.rollNumber ? `#${student.rollNumber}` : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">Academic Session</span>
                <span className="text-sm font-bold text-slate-900 block">
                  {student.academicSession?.sessionName || student.session || '2026-2027'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="flex-1 min-w-0 w-full space-y-5">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* Personal Information Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FiUser className="text-primary-600 w-4 h-4" />
                      <span>Personal Information</span>
                    </h3>
                    <button
                      type="button"
                      onClick={openPersonalModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-2xs transition"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Full Name</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.personalInfo?.firstName} {student.personalInfo?.lastName}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Father's Name</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.personalInfo?.fatherName || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Mother's Name</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.personalInfo?.motherName || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Aadhaar Number</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.personalInfo?.aadhaarNumber || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Date of Birth</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.personalInfo?.dateOfBirth 
                          ? new Date(student.personalInfo.dateOfBirth).toLocaleDateString('en-IN')
                          : 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Gender</span>
                      <p className="font-semibold text-slate-900 text-sm capitalize">
                        {student.personalInfo?.gender || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Blood Group</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.personalInfo?.bloodGroup || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Category</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.category || 'General'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">School House</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.house?.name || 'Not Assigned'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Admission Date</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-IN') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact & Guardian Information Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FiMail className="text-primary-600 w-4 h-4" />
                      <span>Contact & Guardian Information</span>
                    </h3>
                    <button
                      type="button"
                      onClick={openPersonalModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-2xs transition"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Email</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.contactInfo?.email || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Phone</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.contactInfo?.mobile || 'N/A'}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px] mb-0.5">Address</span>
                      <p className="font-semibold text-slate-900 text-sm leading-relaxed">
                        {[
                          student.contactInfo?.address?.street,
                          student.contactInfo?.address?.city,
                          student.contactInfo?.address?.state,
                          student.contactInfo?.address?.pincode || student.contactInfo?.address?.zipCode,
                          student.contactInfo?.address?.country
                        ].filter(Boolean).join(', ') || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Guardian Name</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.guardianInfo?.name || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Guardian Phone</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.guardianInfo?.mobile || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Campus Information Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FiMapPin className="text-primary-600 w-4 h-4" />
                      <span>School Campus / Branch</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Campus Name</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {student.franchise?.name || 'Main Senior Secondary Campus'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Campus Code</span>
                      <p className="font-semibold text-slate-900 text-sm font-mono">
                        {student.franchise?.code || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Courses Tab */}
            {activeTab === 'courses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Enrolled Courses ({student.enrolledCourses?.length || 0})</h3>
                    <p className="text-xs text-slate-500">All registered training programs and syllabus tracks</p>
                  </div>
                  <Button icon={FiPlus} onClick={() => setShowEnrollModal(true)}>
                    Enroll in Another Course
                  </Button>
                </div>
                {student.enrolledCourses && student.enrolledCourses.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3.5">
                    {student.enrolledCourses.map((enrollment) => {
                      const status = getEnrollmentStatus(enrollment);
                      const courseId = enrollment.course?._id;
                      const pending = getCoursePendingFromObligations(courseId);
                      return (
                      <div key={enrollment._id || courseId} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {enrollment.course?.title || 'Course Title'}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span>Program: <strong className="text-slate-700">{enrollment.course?.program?.name || 'General'}</strong></span>
                              <span>•</span>
                              <span>Enrolled: <strong className="text-slate-700">
                                {enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toLocaleDateString('en-IN') : 
                                 enrollment.enrollmentDate ? new Date(enrollment.enrollmentDate).toLocaleDateString('en-IN') : 'N/A'}
                              </strong></span>
                            </div>
                            {pending !== null && (
                              <p className="text-xs mt-1">
                                <span className="text-slate-500">Outstanding: </span>
                                <span className={pending > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                                  ₹{pending.toLocaleString('en-IN')}
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2">
                            <StatusBadge status={status.label} />
                            <div className="text-xs font-semibold text-slate-600">
                              Progress: <span className="text-primary-600 font-bold">{enrollment.progress || 0}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );})}
                  </div>
                ) : (
                  <EmptyState
                    icon={FiBook}
                    title="No courses enrolled"
                    description="This student is not enrolled in any courses yet."
                    action={<Button icon={FiPlus} onClick={() => setShowEnrollModal(true)}>Enroll in a Course</Button>}
                  />
                )}
              </div>
            )}

            {/* Attendance Tab - Day-wise full attendance log */}
            {activeTab === 'attendance' && (
              <div className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard 
                    title="Total Sessions" 
                    tone="info" 
                    icon={FiCalendar} 
                    value={attendanceStats?.totalDays ?? student.attendance?.totalClasses ?? 0} 
                  />
                  <StatCard 
                    title="Attended" 
                    tone="success" 
                    icon={FiCheckCircle} 
                    value={attendanceStats?.presentDays ?? student.attendance?.attendedClasses ?? 0} 
                  />
                  <StatCard 
                    title="Absent" 
                    tone="danger" 
                    icon={FiXCircle} 
                    value={attendanceStats?.absentDays ?? 0} 
                  />
                  <StatCard 
                    title="Attendance Rate" 
                    tone="purple" 
                    icon={FiTrendingUp} 
                    value={`${attendanceStats?.percentage ?? student.attendance?.attendancePercentage?.toFixed(1) ?? 0}%`} 
                  />
                </div>

                {/* Day-wise Table Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Day-wise Attendance Logs</h4>
                      <p className="text-xs text-slate-500">Detailed records of session attendance, check-in timestamps, and remarks</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={attendanceFilter}
                        onChange={(e) => setAttendanceFilter(e.target.value)}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs focus:ring-1 focus:ring-primary-500 outline-none"
                      >
                        <option value="all">All Statuses</option>
                        <option value="present">Present Only</option>
                        <option value="absent">Absent Only</option>
                        <option value="late">Late Only</option>
                        <option value="half_day">Half Day Only</option>
                      </select>
                    </div>
                  </div>

                  {attendanceLoading ? (
                    <PageLoading message="Loading attendance logs..." />
                  ) : filteredAttendance.length > 0 ? (
                    <TableWrapper>
                      <Table>
                        <TableHead>
                          <tr>
                            <TableHeader>Date & Day</TableHeader>
                            <TableHeader>Course / Session</TableHeader>
                            <TableHeader>Status</TableHeader>
                            <TableHeader>Punch In / Out</TableHeader>
                            <TableHeader>Method</TableHeader>
                            <TableHeader>Remarks</TableHeader>
                          </tr>
                        </TableHead>
                        <TableBody>
                          {filteredAttendance.map((rec) => {
                            const recDate = rec.date ? new Date(rec.date) : null;
                            const formattedDate = recDate ? recDate.toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : 'N/A';
                            const weekday = recDate ? recDate.toLocaleDateString('en-IN', { weekday: 'short' }) : '';
                            
                            const statusColor = 
                              rec.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              rec.status === 'absent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              rec.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              rec.status === 'half_day' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-purple-50 text-purple-700 border-purple-200';

                            return (
                              <TableRow key={rec._id}>
                                <TableCell>
                                  <div className="font-semibold text-slate-900">{formattedDate}</div>
                                  <div className="text-[11px] text-slate-400">{weekday}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium text-slate-800">{rec.course?.title || 'General Batch'}</div>
                                  {rec.session && (
                                    <span className="text-[10px] text-slate-400 capitalize">{rec.session} session</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border capitalize ${statusColor}`}>
                                    {rec.status?.replace('_', ' ')}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-slate-600 font-mono">
                                  {rec.checkInTime || rec.checkOutTime ? (
                                    <span>{rec.checkInTime || '--:--'} - {rec.checkOutTime || '--:--'}</span>
                                  ) : (
                                    <span className="text-slate-400">Regular</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-slate-600 capitalize">
                                  {rec.method || 'Manual'}
                                </TableCell>
                                <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                                  {rec.remarks || '—'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableWrapper>
                  ) : (
                    <div className="p-8 text-center">
                      <EmptyState
                        icon={FiCalendar}
                        title="No attendance records found"
                        description={attendanceFilter !== 'all' ? `No ${attendanceFilter} attendance entries found.` : "No day-wise attendance has been marked for this student yet."}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fees Tab - Clean top stats and payment transactions list */}
            {activeTab === 'fees' && (
              <div className="space-y-4">
                {/* Clean Top Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard
                    title="Net Paid"
                    tone="info"
                    icon={TbCurrencyRupee}
                    value={`₹${getCoursePaymentStats().totalNetPaid.toLocaleString('en-IN')}`}
                    subtitle={`${getCoursePaymentStats().courseBreakdown.reduce((sum, c) => sum + c.completedCount, 0)} completed`}
                  />
                  <StatCard
                    title="Outstanding Fees"
                    tone="warning"
                    icon={FiClock}
                    value={`₹${(obligationSummary?.totalPending ?? getCoursePaymentStats().totalPendingAmount).toLocaleString('en-IN')}`}
                    subtitle="From fee obligations"
                  />
                  <StatCard
                    title="Refunded"
                    tone="danger"
                    icon={FiDownload}
                    value={`₹${getCoursePaymentStats().totalRefundedAmount.toLocaleString('en-IN')}`}
                    subtitle={`${getCoursePaymentStats().courseBreakdown.reduce((sum, c) => sum + c.refundedCount, 0)} refunds`}
                  />
                  <StatCard
                    title="Failed"
                    tone="slate"
                    icon={FiFileText}
                    value={`₹${getCoursePaymentStats().totalFailedAmount.toLocaleString('en-IN')}`}
                    subtitle={`${getCoursePaymentStats().courseBreakdown.reduce((sum, c) => sum + c.failedCount, 0)} failed`}
                  />
                </div>

                {/* Payment Transactions Table */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <TbCurrencyRupee className="text-primary-600 w-4 h-4" />
                        <span>Payment Transactions</span>
                      </h4>
                      <p className="text-xs text-slate-500">History of fee installments, payments, and receipts</p>
                    </div>
                  </div>

                  {paymentsLoading ? (
                    <PageLoading message="Loading payment transactions..." />
                  ) : payments && payments.length > 0 ? (
                    <TableWrapper>
                      <Table>
                        <TableHead>
                          <tr>
                            <TableHeader>Date</TableHeader>
                            <TableHeader>Type</TableHeader>
                            <TableHeader>Amount</TableHeader>
                            <TableHeader>Status</TableHeader>
                            <TableHeader>Method</TableHeader>
                            <TableHeader>Actions</TableHeader>
                          </tr>
                        </TableHead>
                        <TableBody>
                          {payments.map((payment) => (
                            <TableRow key={payment.ledgerId || payment._id}>
                              <TableCell className="font-semibold text-slate-900">
                                {new Date(payment.paymentDate).toLocaleDateString('en-IN')}
                              </TableCell>
                              <TableCell className="capitalize text-slate-700">{payment.paymentType}</TableCell>
                              <TableCell className="font-bold text-slate-900">₹{payment.amount?.toLocaleString('en-IN')}</TableCell>
                              <TableCell><StatusBadge status={payment.paymentStatus} /></TableCell>
                              <TableCell className="capitalize text-slate-600">{payment.paymentMethod}</TableCell>
                              <TableCell>
                                {payment.paymentStatus === 'completed' && (
                                  <button
                                    onClick={() => handleDownloadReceipt(payment._id)}
                                    className="text-primary-600 hover:text-primary-800 flex items-center gap-1 font-semibold text-xs transition"
                                  >
                                    <FiDownload className="w-3.5 h-3.5" /> Receipt
                                  </button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableWrapper>
                  ) : (
                    <div className="p-8 text-center">
                      <EmptyState icon={TbCurrencyRupee} title="No payment transactions found" description="No transactions have been recorded for this student yet." />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Exam Access Tab - Dedicated Tab */}
            {activeTab === 'exam-access' && (
              <div className="space-y-4">
                <Card className="rounded-2xl border-slate-200/90 shadow-2xs">
                  <CardHeader
                    icon={FiUnlock}
                    title="Exam Access Permission"
                    subtitle="Allow this student to take exams even when course or exam fees are pending."
                    action={
                      examAccess?.bypassAllPendingFees ? (
                        <Button variant="danger" onClick={() => handleExamAccessUpdate({ action: 'revoke-all' })}>
                          Revoke All-Courses Access
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            const reason = window.prompt('Reason for granting exam access (optional):') || '';
                            handleExamAccessUpdate({ action: 'grant-all', reason });
                          }}
                        >
                          Allow All Courses
                        </Button>
                      )
                    }
                  />

                  {examAccess?.bypassAllPendingFees && (
                    <div className="mb-4 p-3.5 bg-primary-50 border border-primary-200 rounded-xl text-xs text-primary-900 flex items-center gap-2">
                      <FiCheckCircle className="text-primary-600 w-4 h-4 shrink-0" />
                      <span>
                        All-course exam access is <strong>actively enabled</strong>
                        {examAccess.bypassAllReason ? ` — ${examAccess.bypassAllReason}` : ''}.
                      </span>
                    </div>
                  )}

                  {examAccessLoading ? (
                    <PageLoading message="Loading exam access..." />
                  ) : (
                    <TableWrapper>
                      <Table>
                        <TableHead>
                          <tr>
                            <TableHeader>Course</TableHeader>
                            <TableHeader>Pending Fees</TableHeader>
                            <TableHeader>Exam Access Status</TableHeader>
                            <TableHeader>Action</TableHeader>
                          </tr>
                        </TableHead>
                        <TableBody>
                          {(!examAccess?.courses || examAccess.courses.length === 0) ? (
                            <TableEmpty colSpan={4} title="No enrolled courses found" />
                          ) : (
                            (examAccess?.courses || []).map((courseAccess) => (
                              <TableRow key={courseAccess.courseId}>
                                <TableCell className="!whitespace-normal">
                                  <div className="font-semibold text-slate-900">{courseAccess.courseTitle}</div>
                                  {courseAccess.courseCode && (
                                    <div className="text-xs text-slate-400 font-mono">{courseAccess.courseCode}</div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {courseAccess.totalPending > 0 ? (
                                    <span className="text-amber-600 font-bold">
                                      ₹{courseAccess.totalPending.toLocaleString('en-IN')}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 font-semibold">Cleared</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {courseAccess.allowed ? (
                                    <Badge variant={courseAccess.overridden ? 'primary' : 'success'}>
                                      {courseAccess.overridden ? 'Admin Override' : 'Allowed'}
                                    </Badge>
                                  ) : (
                                    <Badge variant="danger">Blocked (Fees Pending)</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {!examAccess?.bypassAllPendingFees && (
                                    courseAccess.hasCourseOverride || courseAccess.overridden ? (
                                      <button
                                        type="button"
                                        onClick={() => handleExamAccessUpdate({
                                          action: 'revoke-course',
                                          courseId: courseAccess.courseId
                                        })}
                                        className="text-rose-600 hover:text-rose-800 text-xs font-semibold"
                                      >
                                        Revoke Override
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const reason = window.prompt('Reason (optional):') || '';
                                          handleExamAccessUpdate({
                                            action: 'grant-course',
                                            courseId: courseAccess.courseId,
                                            reason
                                          });
                                        }}
                                        className="text-primary-600 hover:text-primary-800 text-xs font-semibold"
                                      >
                                        Grant Access
                                      </button>
                                    )
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableWrapper>
                  )}
                </Card>
              </div>
            )}

            {/* Academic & Documents Tab */}
            {activeTab === 'academic' && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FiAward className="text-primary-600 w-4 h-4" />
                      <span>Academic Background</span>
                    </h3>
                    <button
                      type="button"
                      onClick={openAcademicModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-2xs transition"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                      <span>Edit Academic Record</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Last Qualification</span>
                      <p className="font-semibold text-slate-900 text-sm">{student.academicInfo?.lastQualification || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Board / University</span>
                      <p className="font-semibold text-slate-900 text-sm">{student.academicInfo?.boardOrUniversity || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">School / College</span>
                      <p className="font-semibold text-slate-900 text-sm">{student.academicInfo?.schoolOrCollege || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Year of Passing</span>
                      <p className="font-semibold text-slate-900 text-sm">{student.academicInfo?.yearOfPassing || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Percentage / Grade</span>
                      <p className="font-semibold text-slate-900 text-sm">{student.academicInfo?.percentage || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">First Enrollment Date</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {(() => {
                          const dates = (student.enrolledCourses || [])
                            .map((e) => e.enrolledAt || e.enrollmentDate)
                            .filter(Boolean)
                            .map((d) => new Date(d).getTime());
                          if (!dates.length) return 'N/A';
                          return new Date(Math.min(...dates)).toLocaleDateString('en-IN');
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
                  <div className="mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FiFileText className="text-primary-600 w-4 h-4" />
                      <span>Uploaded Verification Documents</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {Object.entries(student.documents || {}).map(([key, doc]) => (
                      <FileViewer 
                        key={key}
                        fileUrl={doc?.url} 
                        label={key}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <EnrollCourseModal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        studentId={id}
        enrolledCourseIds={(student.enrolledCourses || []).map(
          (e) => e.course?._id?.toString() || e.course?.toString()
        ).filter(Boolean)}
        onSuccess={(updatedStudent) => {
          setStudent(updatedStudent);
          fetchObligations();
          if (activeTab === 'fees') fetchPayments();
        }}
      />

      {/* Edit Personal & Contact Info Modal */}
      <Modal
        open={personalModalOpen}
        onClose={() => setPersonalModalOpen(false)}
        title="Edit Personal & Contact Information"
        size="lg"
      >
        <form onSubmit={handleSavePersonal} className="space-y-4">
          <p className="text-xs text-slate-500 mb-2">
            Update personal identity, contact details, and parent/guardian information without leaving this page.
          </p>
          <FormGrid cols={2}>
            <FormField label="First Name" required>
              <TextField
                value={personalForm.firstName}
                onChange={(e) => setPersonalForm({ ...personalForm, firstName: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Last Name" required>
              <TextField
                value={personalForm.lastName}
                onChange={(e) => setPersonalForm({ ...personalForm, lastName: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Father's Name">
              <TextField
                value={personalForm.fatherName}
                onChange={(e) => setPersonalForm({ ...personalForm, fatherName: e.target.value })}
              />
            </FormField>
            <FormField label="Mother's Name">
              <TextField
                value={personalForm.motherName}
                onChange={(e) => setPersonalForm({ ...personalForm, motherName: e.target.value })}
              />
            </FormField>
            <FormField label="Aadhaar Number">
              <TextField
                value={personalForm.aadhaarNumber}
                onChange={(e) => setPersonalForm({ ...personalForm, aadhaarNumber: e.target.value })}
                maxLength={12}
                placeholder="12-digit Aadhaar"
              />
            </FormField>
            <FormField label="Date of Birth">
              <TextField
                type="date"
                value={personalForm.dateOfBirth}
                onChange={(e) => setPersonalForm({ ...personalForm, dateOfBirth: e.target.value })}
              />
            </FormField>
            <FormField label="Gender">
              <SelectField
                value={personalForm.gender}
                onChange={(e) => setPersonalForm({ ...personalForm, gender: e.target.value })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </SelectField>
            </FormField>
            <FormField label="Phone Number" required>
              <TextField
                value={personalForm.phone}
                onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                required
              />
            </FormField>
          </FormGrid>

          <FormField label="Address / Street">
            <TextField
              value={personalForm.address}
              onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
              placeholder="House/Street/Locality"
            />
          </FormField>

          <FormGrid cols={3}>
            <FormField label="City">
              <TextField
                value={personalForm.city}
                onChange={(e) => setPersonalForm({ ...personalForm, city: e.target.value })}
              />
            </FormField>
            <FormField label="State">
              <TextField
                value={personalForm.state}
                onChange={(e) => setPersonalForm({ ...personalForm, state: e.target.value })}
              />
            </FormField>
            <FormField label="Pincode">
              <TextField
                value={personalForm.pincode}
                onChange={(e) => setPersonalForm({ ...personalForm, pincode: e.target.value })}
              />
            </FormField>
          </FormGrid>

          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Guardian Information</h4>
            <FormGrid cols={3}>
              <FormField label="Guardian Name">
                <TextField
                  value={personalForm.guardianName}
                  onChange={(e) => setPersonalForm({ ...personalForm, guardianName: e.target.value })}
                />
              </FormField>
              <FormField label="Guardian Phone">
                <TextField
                  value={personalForm.guardianPhone}
                  onChange={(e) => setPersonalForm({ ...personalForm, guardianPhone: e.target.value })}
                />
              </FormField>
              <FormField label="Guardian Email">
                <TextField
                  type="email"
                  value={personalForm.guardianEmail}
                  onChange={(e) => setPersonalForm({ ...personalForm, guardianEmail: e.target.value })}
                />
              </FormField>
            </FormGrid>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setPersonalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={personalSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Academic Record Modal */}
      <Modal
        open={academicModalOpen}
        onClose={() => setAcademicModalOpen(false)}
        title="Edit Academic Record"
        size="md"
      >
        <form onSubmit={handleSaveAcademic} className="space-y-4">
          <p className="text-xs text-slate-500 mb-2">
            Update educational background, school/university, and examination score.
          </p>
          <FormField label="Last Qualification">
            <TextField
              value={academicForm.lastQualification}
              onChange={(e) => setAcademicForm({ ...academicForm, lastQualification: e.target.value })}
              placeholder="e.g. 10th / 12th / Graduation"
            />
          </FormField>
          <FormField label="Board / University">
            <TextField
              value={academicForm.boardOrUniversity}
              onChange={(e) => setAcademicForm({ ...academicForm, boardOrUniversity: e.target.value })}
              placeholder="e.g. CBSE / State Board / University Name"
            />
          </FormField>
          <FormField label="School / College">
            <TextField
              value={academicForm.schoolOrCollege}
              onChange={(e) => setAcademicForm({ ...academicForm, schoolOrCollege: e.target.value })}
              placeholder="e.g. Govt Higher Secondary School"
            />
          </FormField>
          <FormGrid cols={2}>
            <FormField label="Year of Passing">
              <TextField
                value={academicForm.yearOfPassing}
                onChange={(e) => setAcademicForm({ ...academicForm, yearOfPassing: e.target.value })}
                placeholder="e.g. 2023"
              />
            </FormField>
            <FormField label="Percentage / Grade">
              <TextField
                value={academicForm.percentage}
                onChange={(e) => setAcademicForm({ ...academicForm, percentage: e.target.value })}
                placeholder="e.g. 82.5%"
              />
            </FormField>
          </FormGrid>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setAcademicModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={academicSaving}>
              Save Record
            </Button>
          </div>
        </form>
      </Modal>

    </Layout>
  );
};

export default StudentDetails;

