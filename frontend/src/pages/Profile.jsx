import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiUser, FiMail, FiPhone, FiCalendar, FiEdit2, 
  FiSave, FiX, FiLock, FiBriefcase, FiFileText,
  FiHome, FiInfo, FiCheckCircle, FiCopy, 
  FiKey, FiAward, FiBookOpen, FiTrendingUp, FiMapPin, FiShield, FiLayers
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import ProfilePictureUpload from '../components/ProfilePictureUpload';
import PasswordInput from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getTransactionStats } from '../api/transactionApi';
import { toAbsoluteUrl } from '../utils/url';
import {
  StatCard, Button, PageLoading
} from '../components/ui';

const ROLE_META = {
  super_admin: { label: 'Super Administrator', variant: 'danger', desc: 'Master platform and institutional administration' },
  admin: { label: 'Administrator', variant: 'primary', desc: 'Central operations management' },
  franchise_admin: { label: 'School Admin', variant: 'warning', desc: 'School campus & academic administration' },
  student: { label: 'Enrolled Student', variant: 'primary', desc: 'Active student portal access' },
};

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginActivity, setLoginActivity] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [stats, setStats] = useState({
    enrolledCourses: 0,
    completedTests: 0,
    averageScore: 0,
    totalStudents: 0,
    activeCourses: 0,
    certificatesIssued: 0,
    totalFranchises: 0,
    totalRevenue: 0,
    netRevenue: 0,
    outstandingReceivables: 0,
  });

  useEffect(() => {
    if (user) {
      if (['super_admin', 'franchise_admin'].includes(user.role)) {
        api.get('/auth/login-activity').then((response) => setLoginActivity(response.data.data || []))
          .catch((error) => console.error('Failed to load sign-in activity', error));
      }
      setFormData({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
      });
      
      if (user.role === 'student') {
        fetchStudentStats();
      } else if (['super_admin', 'admin', 'franchise_admin'].includes(user.role)) {
        fetchAdminStats();
      }
    }
  }, [user]);

  const fetchStudentStats = async () => {
    try {
      const [coursesRes, testsRes, certsRes] = await Promise.allSettled([
        api.get('/courses/enrolled'),
        api.get('/tests/my-results'),
        api.get('/student-certificates/my')
      ]);

      const enrolledCourses = coursesRes.status === 'fulfilled' && coursesRes.value?.data?.data ? coursesRes.value.data.data.length : 0;
      const testResults = testsRes.status === 'fulfilled' && testsRes.value?.data?.data ? testsRes.value.data.data : [];
      const completedTests = testResults.length;
      const averageScore = completedTests > 0 
        ? Math.round(testResults.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedTests)
        : 0;
      const certificatesIssued = certsRes.status === 'fulfilled' && certsRes.value?.data?.data ? certsRes.value.data.data.length : 0;

      setStats(prev => ({
        ...prev,
        enrolledCourses,
        completedTests,
        averageScore,
        certificatesIssued
      }));
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const [studentsRes, coursesRes, certsRes, franchisesRes] = await Promise.allSettled([
        api.get('/students?limit=1'),
        api.get('/courses?limit=1'),
        api.get('/student-certificates?limit=1'),
        api.get('/campuses?limit=1')
      ]);

      let financialMetrics = { totalRevenue: 0, netRevenue: 0, outstandingReceivables: 0 };
      try {
        const transStats = await getTransactionStats();
        if (transStats?.data) {
          financialMetrics = {
            totalRevenue: transStats.data.totalIncome || 0,
            netRevenue: (transStats.data.totalIncome || 0) - (transStats.data.totalExpense || 0),
            outstandingReceivables: transStats.data.pendingReceivables || 0
          };
        }
      } catch (err) {
        console.error('Financial stats load error:', err);
      }

      setStats(prev => ({
        ...prev,
        totalStudents: studentsRes.status === 'fulfilled' ? studentsRes.value?.data?.total || studentsRes.value?.data?.count || 0 : 0,
        activeCourses: coursesRes.status === 'fulfilled' ? coursesRes.value?.data?.total || coursesRes.value?.data?.count || 0 : 0,
        certificatesIssued: certsRes.status === 'fulfilled' ? certsRes.value?.data?.total || certsRes.value?.data?.count || 0 : 0,
        totalFranchises: franchisesRes.status === 'fulfilled' ? franchisesRes.value?.data?.total || franchisesRes.value?.data?.count || 0 : 0,
        ...financialMetrics
      }));
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.put('/users/profile', {
        name: formData.name,
        mobile: formData.mobile,
      });

      if (updateUser) {
        updateUser(response.data.data);
      }

      toast.success('Profile details updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await api.put('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      toast.success('Password changed successfully');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      mobile: user?.mobile || '',
    });
    setIsEditing(false);
  };

  const copyAccountId = () => {
    if (accountId) {
      navigator.clipboard.writeText(accountId);
      toast.success('User ID copied to clipboard');
    }
  };

  const roleMeta = ROLE_META[user?.role] || ROLE_META.student;
  const accountId = user?._id || user?.id;
  const studentRecord = user?.studentProfile || user?.studentDetails;
  const franchiseRecord = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role)
    ? (user?.franchise && typeof user.franchise === 'object' ? user.franchise : null)
    : (studentRecord?.franchise && typeof studentRecord.franchise === 'object' ? studentRecord.franchise : null);
  const portalPrefix = ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user?.role) ? '/school' : '/admin';

  if (!user) {
    return (
      <Layout>
        <PageHeader title="My Profile" subtitle="Manage your account information" icon={FiUser} />
        <PageLoading message="Loading profile..." />
      </Layout>
    );
  }

  return (
    <Layout
      title="User Profile"
      breadcrumbs="Account / User Profile"
      actions={
        user.role === 'super_admin' ? (
          <Button
            variant="secondary"
            icon={FiHome}
            onClick={() => navigate('/admin/company-profile')}
          >
            Company Profile & Assets
          </Button>
        ) : null
      }
    >
      <div className="space-y-5 max-w-[1440px] mx-auto pb-10">
        {/* User Profile Header Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white via-white to-primary-50/70 p-5 shadow-2xs sm:p-7">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-primary-500" />
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
            <div className="shrink-0 relative">
              <ProfilePictureUpload
                currentPhoto={toAbsoluteUrl(user.profilePicture || user.profileImage)}
                userId={accountId}
                userType="user"
                onUploadSuccess={(photoUrl) => {
                  if (updateUser) {
                    updateUser({ ...user, profilePicture: photoUrl, profileImage: photoUrl });
                  }
                  toast.success('Profile avatar updated');
                }}
                size="large"
              />
              <div className="pointer-events-none absolute bottom-2 left-2 z-10 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm" title="Active" aria-label="Online" />
            </div>

            <div className="min-w-0 flex-1 space-y-2 text-center sm:py-2 sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h2 className="break-words text-xl font-bold text-slate-900 sm:text-2xl">{user.name}</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200">
                  {roleMeta.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </div>

              <p className="text-slate-600 text-sm flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <FiMail className="w-4 h-4 text-slate-400" />
                <span className="break-all">{user.email}</span>
                {user.mobile && (
                  <>
                    <span className="text-slate-300">•</span>
                    <FiPhone className="w-4 h-4 text-slate-400" />
                    <span>{user.mobile}</span>
                  </>
                )}
              </p>

              <p className="mx-auto max-w-2xl text-xs leading-relaxed text-slate-500 sm:mx-0">
                {roleMeta.desc}
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Layout: Profile Info + Security & Stats */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Left Column: Personal Form & Security */}
          <div className="order-2 space-y-5 xl:order-1 xl:col-span-2">
            {/* Personal Information Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FiUser className="text-primary-600 w-4 h-4" />
                    Personal Information
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your full name and registered contact mobile number
                  </p>
                </div>

                {!isEditing && (
                  <Button size="sm" variant="secondary" icon={FiEdit2} onClick={() => setIsEditing(true)}>
                    Edit details
                  </Button>
                )}
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <FiUser className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm font-medium transition ${
                          isEditing
                            ? 'bg-white border-primary-500 focus:ring-2 focus:ring-primary-500 text-slate-800'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        readOnly
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-100/70 text-slate-500 text-sm font-medium cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Verified account primary email</p>
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mobile number
                    </label>
                    <div className="relative">
                      <FiPhone className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="+91 98765 43210"
                        className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm font-medium transition ${
                          isEditing
                            ? 'bg-white border-primary-500 focus:ring-2 focus:ring-primary-500 text-slate-800'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">For notifications and communication</p>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-3 pt-3 border-t border-slate-100">
                    <Button type="submit" icon={FiSave} loading={loading} disabled={loading} className="flex-1 justify-center">
                      {loading ? 'Saving...' : 'Save changes'}
                    </Button>
                    <Button type="button" variant="secondary" icon={FiX} onClick={handleCancelEdit} disabled={loading} className="flex-1 justify-center">
                      Cancel
                    </Button>
                  </div>
                )}
              </form>
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FiLock className="text-primary-600 w-4 h-4" />
                    Security & Password
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Keep your account secure by updating your access password
                  </p>
                </div>

                {!isChangingPassword && (
                  <Button variant="secondary" size="sm" icon={FiKey} onClick={() => setIsChangingPassword(true)}>
                    Change password
                  </Button>
                )}
              </div>

              {isChangingPassword ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Current password <span className="text-rose-500">*</span>
                    </label>
                    <PasswordInput
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter your current password"
                      className="px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        New password <span className="text-rose-500">*</span>
                      </label>
                      <PasswordInput
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Minimum 6 characters"
                        className="px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Confirm new password <span className="text-rose-500">*</span>
                      </label>
                      <PasswordInput
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Re-enter new password"
                        className="px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-start gap-2">
                    <FiInfo className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Password must contain at least 6 characters. Mixing letters and numbers is recommended.</span>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" icon={FiSave} loading={loading} disabled={loading} className="flex-1 justify-center">
                      {loading ? 'Updating...' : 'Update password'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      icon={FiX}
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                      disabled={loading}
                      className="flex-1 justify-center"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Password was set securely. Last changed recently.</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                    <FiCheckCircle className="w-3.5 h-3.5" /> Protected
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Organization Snapshot or Student Metrics */}
          <div className="order-1 space-y-4 xl:order-2">
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><FiShield className="h-4 w-4" /></span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Account details</h3>
                  <p className="text-[11px] text-slate-500">Your registered identity and portal access</p>
                </div>
              </div>
              <dl className="space-y-3 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">Account role</dt>
                  <dd className="text-right font-semibold text-slate-800">{roleMeta.label}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="max-w-[65%] break-all text-right font-medium text-slate-800">{user.email || '—'}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">Mobile</dt>
                  <dd className="text-right font-medium text-slate-800">{user.mobile || 'Not added'}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-1 text-slate-500"><FiCalendar className="h-3.5 w-3.5" /> Member since</dt>
                  <dd className="text-right font-medium text-slate-800">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</dd>
                </div>
                {user.role === 'student' && (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-slate-500">Student ID</dt>
                      <dd className="text-right font-mono font-semibold text-slate-800">{studentRecord?.studentId || '—'}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-slate-500">Enrollment No.</dt>
                      <dd className="text-right font-mono font-semibold text-slate-800">{studentRecord?.enrollmentNumber || '—'}</dd>
                    </div>
                    {studentRecord?.session && (
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-slate-500">Session</dt>
                        <dd className="text-right font-medium text-slate-800">{studentRecord.session}</dd>
                      </div>
                    )}
                  </>
                )}
                {franchiseRecord && (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="flex items-center gap-1 text-slate-500"><FiLayers className="h-3.5 w-3.5" /> Campus</dt>
                      <dd className="max-w-[65%] text-right font-semibold text-slate-800">{franchiseRecord.name || '—'}</dd>
                    </div>
                    {franchiseRecord.code && (
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-slate-500">Campus code</dt>
                        <dd className="text-right font-mono font-semibold text-slate-800">{franchiseRecord.code}</dd>
                      </div>
                    )}
                    {franchiseRecord.fullAddress && (
                      <div className="flex items-start justify-between gap-3">
                        <dt className="flex shrink-0 items-center gap-1 text-slate-500"><FiMapPin className="h-3.5 w-3.5" /> Location</dt>
                        <dd className="max-w-[65%] text-right leading-relaxed text-slate-700">{franchiseRecord.fullAddress}</dd>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-start justify-between gap-3 border-t border-slate-100 pt-3">
                  <dt className="text-slate-500">Account ID</dt>
                  <dd className="flex max-w-[70%] items-center gap-1.5 text-right font-mono text-[11px] font-semibold text-slate-700">
                    <span className="break-all">{accountId || '—'}</span>
                    {accountId && <button type="button" onClick={copyAccountId} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-primary-600" title="Copy account ID"><FiCopy className="h-3.5 w-3.5" /></button>}
                  </dd>
                </div>
              </dl>
            </section>

            <div className="space-y-3">
              <h4 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                {user.role === 'student' ? 'Academic snapshot' : 'Organization snapshot'}
              </h4>

            {user.role === 'student' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatCard title="Enrolled Courses" tone="primary" icon={FiBookOpen} value={stats.enrolledCourses || 0} compact={true} />
                <StatCard title="Completed Tests" tone="info" icon={FiAward} value={stats.completedTests || 0} compact={true} />
                <StatCard title="Average Score" tone="success" icon={FiTrendingUp} value={`${stats.averageScore || 0}%`} compact={true} />
                <StatCard title="Certificates Earned" tone="purple" icon={FiFileText} value={stats.certificatesIssued || 0} compact={true} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {!['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) && <StatCard title="Total Campuses" tone="purple" icon={FiLayers} value={stats.totalFranchises || 0} compact={true} onClick={() => navigate('/admin/campuses')} />}
                <StatCard title="Active Courses" tone="indigo" icon={FiBookOpen} value={stats.activeCourses || 0} compact={true} onClick={() => navigate(`${portalPrefix}/courses`)} />
                <StatCard title="Enrolled Students" tone="info" icon={FiUser} value={stats.totalStudents || 0} compact={true} onClick={() => navigate(`${portalPrefix}/students`)} />
                <StatCard title="Certificates Issued" tone="teal" icon={FiAward} value={stats.certificatesIssued || 0} compact={true} onClick={() => navigate(`${portalPrefix}/student-certificates`)} />
              </div>
            )}
            </div>
          </div>
        </div>
        {['super_admin', 'franchise_admin'].includes(user.role) && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><FiLock className="h-4 w-4" /></span>
              <div>
                <h3 className="font-bold text-slate-900">Recent sign-ins</h3>
                <p className="text-xs text-slate-500">This account’s last 20 successful logins</p>
              </div>
            </div>
            {loginActivity.length === 0 ? <p className="text-sm text-slate-500">No sign-in history recorded yet. New logins will appear here.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b text-xs text-slate-500"><th className="py-2 pr-4">Time</th><th className="py-2 pr-4">Method</th><th className="py-2 pr-4">IP address</th><th className="py-2">Device</th></tr></thead>
                  <tbody>{loginActivity.map((entry) => (
                    <tr key={entry._id} className="border-b last:border-0">
                      <td className="py-3 pr-4 text-slate-700">{new Date(entry.occurredAt).toLocaleString()}</td>
                      <td className="py-3 pr-4 capitalize text-slate-700">{entry.method}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{entry.ipAddress || 'Unavailable'}</td>
                      <td className="max-w-sm whitespace-normal break-words py-3 text-xs text-slate-600">{entry.userAgent || 'Unknown device'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
