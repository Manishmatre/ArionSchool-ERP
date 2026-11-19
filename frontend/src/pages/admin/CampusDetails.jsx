import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { TbCurrencyRupee } from 'react-icons/tb';
import {
  FiBriefcase, FiUser, FiBookOpen, FiMapPin, FiPhone, FiMail, FiCalendar,
  FiUsers, FiAward, FiActivity, FiEdit2, FiTrash2, FiCheckCircle,
  FiXCircle, FiTrendingUp, FiBarChart2, FiFileText, FiUploadCloud,
  FiExternalLink, FiEye, FiLock, FiX, FiCheck, FiDownload, FiLayers
} from 'react-icons/fi';
import api from '../../api/axios';
import { toAbsoluteUrl } from '../../utils/url';
import {
  Card, StatCard, Badge, StatusBadge, Button, PageLoading, EmptyState
} from '../../components/ui';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const formatCurrency = (value = 0) =>
  `₹${Number(value || 0).toLocaleString('en-IN')}`;

const getFinancialIncome = (financial = {}) =>
  Number(financial.totalIncome ?? financial.totalRevenue ?? 0);

const getFinancialExpenses = (financial = {}) =>
  Number(financial.totalExpenses ?? 0);

const getFinancialNetRevenue = (financial = {}) =>
  getFinancialIncome(financial) - getFinancialExpenses(financial);

export default function CampusDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [franchise, setFranchise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Section Edit Modal States
  const [isBasicModalOpen, setIsBasicModalOpen] = useState(false);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Form states for in-page edits
  const [basicForm, setBasicForm] = useState({ name: '', code: '', status: 'active', isMainBranch: false, establishedDate: '' });
  const [ownerForm, setOwnerForm] = useState({ adminName: '', adminEmail: '', adminPhone: '', aadhaarNumber: '', panNumber: '', qualification: '' });
  const [addressForm, setAddressForm] = useState({ street: '', city: '', state: '', pincode: '', phone: '', email: '' });
  const [newPassword, setNewPassword] = useState('');
  const [submittingModal, setSubmittingModal] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState(null);

  useEffect(() => {
    fetchCampusDetails();
  }, [id]);

  useAutoRefresh(
    () => fetchCampusDetails({ silent: true }),
    { interval: 30000, events: ['new-enrollment', 'seat-request-updated', 'payment-verified'] }
  );

  const fetchCampusDetails = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.get(`/campuses/${id}`);
      const data = response.data.data;
      setFranchise(data);


      if (data) {
        setBasicForm({
          name: data.name || '',
          code: data.code || '',
          status: data.status || 'active',
          isMainBranch: Boolean(data.isMainBranch),
          establishedDate: data.establishedDate ? data.establishedDate.split('T')[0] : ''
        });
        setOwnerForm({
          adminName: data.owner?.name || '',
          adminEmail: data.owner?.email || '',
          adminPhone: data.owner?.mobile || '',
          aadhaarNumber: data.owner?.aadhaarNumber || '',
          panNumber: data.owner?.panNumber || '',
          qualification: data.owner?.qualification || ''
        });
        setAddressForm({
          street: data.address?.street || '',
          city: data.address?.city || '',
          state: data.address?.state || '',
          pincode: data.address?.pincode || '',
          phone: data.contactInfo?.phone || '',
          email: data.contactInfo?.email || ''
        });
      }
    } catch (error) {
      if (!silent) toast.error('Failed to fetch campus details');
      console.error(error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    const newStatus = franchise.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/campuses/${id}/status`, { status: newStatus });
      toast.success(`School campus ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      fetchCampusDetails({ silent: true });
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this school campus? This action cannot be undone.')) return;
    try {
      await api.delete(`/campuses/${id}`);
      toast.success('School campus deleted successfully');
      navigate('/admin/campuses');
    } catch (error) {
      toast.error('Failed to delete campus');
    }
  };

  // 1. Submit Basic Info
  const handleSaveBasic = async (e) => {
    e.preventDefault();
    setSubmittingModal(true);
    try {
      await api.put(`/campuses/${id}`, {
        name: basicForm.name,
        code: basicForm.code,
        status: basicForm.status,
        isMainBranch: basicForm.isMainBranch,
        establishedDate: basicForm.establishedDate
      });
      toast.success('Campus information updated');
      setIsBasicModalOpen(false);
      fetchCampusDetails({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update campus information');
    } finally {
      setSubmittingModal(false);
    }
  };

  // 2. Submit Owner Info
  const handleSaveOwner = async (e) => {
    e.preventDefault();
    setSubmittingModal(true);
    try {
      await api.put(`/campuses/${id}`, {
        adminName: ownerForm.adminName,
        adminEmail: ownerForm.adminEmail,
        adminPhone: ownerForm.adminPhone,
        aadhaarNumber: ownerForm.aadhaarNumber,
        panNumber: ownerForm.panNumber,
        qualification: ownerForm.qualification
      });
      toast.success('Principal & Head information updated');
      setIsOwnerModalOpen(false);
      fetchCampusDetails({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update principal information');
    } finally {
      setSubmittingModal(false);
    }
  };

  // 3. Submit Address Info
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setSubmittingModal(true);
    try {
      await api.put(`/campuses/${id}`, {
        address: addressForm.street,
        city: addressForm.city,
        state: addressForm.state,
        pincode: addressForm.pincode,
        phone: addressForm.phone,
        email: addressForm.email
      });
      toast.success('Address & location updated');
      setIsAddressModalOpen(false);
      fetchCampusDetails({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update address');
    } finally {
      setSubmittingModal(false);
    }
  };

  // 4. Submit Plan Change
  const handleSavePlan = async (e) => {
    e.preventDefault();
    setSubmittingModal(true);
    try {
      await api.put(`/campuses/${id}`, { plan: selectedPlanId });
      toast.success('Campus plan updated');
      setIsPlanModalOpen(false);
      fetchCampusDetails({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update plan');
    } finally {
      setSubmittingModal(false);
    }
  };

  // 5. Submit Admin Password Reset
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSubmittingModal(true);
    try {
      await api.put(`/campuses/${id}`, { adminPassword: newPassword });
      toast.success('Campus admin password reset successfully');
      setNewPassword('');
      setIsPasswordModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSubmittingModal(false);
    }
  };

  // 6. Inline Document Upload / Replace
  const handleDocumentUpload = async (docKey, file) => {
    if (!file) return;
    setUploadingDocKey(docKey);
    const formData = new FormData();
    formData.append(docKey, file);

    try {
      await api.put(`/campuses/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded successfully');
      fetchCampusDetails({ silent: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploadingDocKey(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <PageLoading message="Loading school campus profile..." />
      </Layout>
    );
  }

  if (!franchise) {
    return (
      <Layout>
        <Card>
          <EmptyState
            icon={FiBriefcase}
            title="School Campus not found"
            description="The school campus you are looking for does not exist or has been removed."
            action={<Button icon={FiLayers} onClick={() => navigate('/admin/campuses')}>Go to School Campuses</Button>}
          />
        </Card>
      </Layout>
    );
  }

  const financial = franchise.stats || franchise.performance || {};
  const totalStudents = franchise.students?.length || 0;
  const activeStudents = franchise.activeStudentCount
    ?? franchise.students?.filter((s) => s.status === 'active').length
    ?? 0;
  const outstandingAmount = Number(financial.outstandingReceivables ?? 0);

  // Document keys and human labels for KYC section
  const documentsList = [
    { key: 'centerPhoto', label: 'Campus Main Gate / Front Photo', icon: FiLayers, desc: 'Official school campus exterior / main gate' },
    { key: 'ownerSignature', label: 'Principal / Head Official Signature', icon: FiFileText, desc: 'Signature printed on school certificates & marksheets' },
    { key: 'aadhaarFileFront', label: 'Aadhaar Card (Front)', icon: FiUser, desc: 'Government identity proof front side' },
    { key: 'aadhaarFileBack', label: 'Aadhaar Card (Back)', icon: FiUser, desc: 'Government identity proof address side' },
    { key: 'panFile', label: 'PAN Card', icon: FiFileText, desc: 'Permanent Account Number card' },
    { key: 'qualificationFile', label: 'Affiliation / Registration Certificate', icon: FiAward, desc: 'School board affiliation certificate or registration proof' }
  ];

  return (
    <Layout
      title={franchise.name}
      breadcrumbs={`School Campuses / ${franchise.name}`}
      actions={(
        <>
          <button
            type="button"
            onClick={() => setIsBasicModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-2xs transition"
          >
            <FiEdit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={handleStatusToggle}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition ${
              franchise.status === 'active'
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {franchise.status === 'active' ? <FiXCircle className="w-3.5 h-3.5 text-slate-500" /> : <FiCheckCircle className="w-3.5 h-3.5" />}
            <span>{franchise.status === 'active' ? 'Deactivate' : 'Activate'}</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </>
      )}
    >
      <PageHeader />

      <div className="space-y-4">
        {/* Inner Tabs Navigation Strip matching Student Details */}
        <div className="border-b border-slate-200/90 -mt-1 mb-4">
          <nav className="flex space-x-6 sm:space-x-8 overflow-x-auto no-scrollbar" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Overview', icon: FiBriefcase },
              { id: 'documents', label: 'Documents & Affiliation', icon: FiFileText },
              { id: 'financial', label: 'Financials & Ledger', icon: TbCurrencyRupee },
              { id: 'students', label: `Students (${totalStudents})`, icon: FiUsers },
              { id: 'settings', label: 'Settings', icon: FiLock }
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

        {/* 2-Column Split Layout matching Student Details */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left Sticky Profile Card */}
          <div className="w-full lg:w-80 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 shrink-0 flex flex-col items-center lg:sticky lg:top-4 self-start">
            {/* Center Photo / Avatar */}
            <div className="relative mb-3 group">
              <div className="w-24 h-24 rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden bg-slate-50 flex items-center justify-center">
                {franchise.owner?.centerPhoto ? (
                  <img
                    src={toAbsoluteUrl(franchise.owner.centerPhoto)}
                    alt={franchise.name}
                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                    onClick={() => setPreviewImage(toAbsoluteUrl(franchise.owner.centerPhoto))}
                  />
                ) : (
                  <FiBriefcase className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <label
                htmlFor="center-photo-input"
                className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-md cursor-pointer transition"
                title="Change Center Photo"
              >
                <FiUploadCloud className="w-3.5 h-3.5" />
                <input
                  id="center-photo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleDocumentUpload('centerPhoto', e.target.files[0])}
                />
              </label>
            </div>

            <h2 className="text-base font-bold text-slate-900 text-center leading-tight">
              {franchise.name}
            </h2>

            <div className="mt-1.5 mb-4 flex items-center gap-2">
              <StatusBadge status={franchise.status} />
              {franchise.isMainBranch && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  Head Office
                </span>
              )}
            </div>

            <div className="w-full border-t border-slate-100 pt-4 space-y-3.5">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">Campus Code</span>
                <span className="font-mono font-bold text-sm text-slate-900 block">{franchise.code}</span>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">Principal / Campus Head</span>
                <span className="font-bold text-sm text-slate-900 block">{franchise.owner?.name || 'N/A'}</span>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">Login Email</span>
                <a href={`mailto:${franchise.owner?.email || franchise.contactInfo?.email}`} className="text-sm font-semibold text-slate-900 hover:text-primary-600 break-all block">
                  {franchise.owner?.email || franchise.contactInfo?.email || 'N/A'}
                </a>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">Contact Mobile</span>
                <a href={`tel:${franchise.owner?.mobile || franchise.contactInfo?.phone}`} className="text-sm font-semibold text-slate-900 hover:text-primary-600 block">
                  {franchise.owner?.mobile || franchise.contactInfo?.phone || 'N/A'}
                </a>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">Location</span>
                <span className="text-sm font-semibold text-slate-900 block">
                  {[franchise.address?.city, franchise.address?.state].filter(Boolean).join(', ') || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">License Plan</span>
                <span className="text-sm font-semibold text-slate-900 block">
                  {franchise.plan?.name || 'Standard License'}
                </span>
              </div>

              <div>
                <span className="text-xs font-medium text-slate-500 block mb-0.5">Established Date</span>
                <span className="text-sm font-semibold text-slate-900 block">
                  {franchise.establishedDate ? new Date(franchise.establishedDate).toLocaleDateString('en-IN') : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="flex-1 min-w-0 w-full space-y-5">
            {/* 1. Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* Basic Center Info Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FiLayers className="text-primary-600 w-4 h-4" />
                      <span>School Campus Information</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsBasicModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-2xs transition"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Campus Name</span>
                      <p className="font-semibold text-slate-900 text-sm">{franchise.name}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Campus Code</span>
                      <p className="font-mono font-semibold text-slate-900 text-sm">{franchise.code}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Campus Classification</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {franchise.isMainBranch ? 'Main School Campus (Head Office)' : 'Branch School Campus'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Operational Status</span>
                      <span className="capitalize font-semibold text-slate-900 text-sm">{franchise.status}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Established Date</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {franchise.establishedDate ? new Date(franchise.establishedDate).toLocaleDateString('en-IN') : 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Active Enrolled Students</span>
                      <p className="font-semibold text-slate-900 text-sm">
                        {activeStudents} active / {totalStudents} total
                      </p>
                    </div>
                  </div>
                </div>

                {/* Owner & Center Head Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FiUser className="text-primary-600 w-4 h-4" />
                      <span>Principal & Campus Head</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsOwnerModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-2xs transition"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Owner / Administrator Name</span>
                      <p className="font-semibold text-slate-900 text-sm">{franchise.owner?.name || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Login Email</span>
                      <p className="font-semibold text-slate-900 text-sm">{franchise.owner?.email || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Mobile Phone</span>
                      <p className="font-semibold text-slate-900 text-sm">{franchise.owner?.mobile || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Qualification</span>
                      <p className="font-semibold text-slate-900 text-sm">{franchise.owner?.qualification || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Aadhaar Card Number</span>
                      <p className="font-mono font-semibold text-slate-900 text-sm">
                        {franchise.owner?.aadhaarNumber ? `•••• •••• ${franchise.owner.aadhaarNumber.slice(-4)}` : 'N/A'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">PAN Number</span>
                      <p className="font-mono font-semibold text-slate-900 text-sm">{franchise.owner?.panNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Address Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FiMapPin className="text-primary-600 w-4 h-4" />
                      <span>Address & Location Details</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-2xs transition"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Street Address</span>
                      <p className="font-semibold text-slate-900 text-sm">{franchise.address?.street || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">City</span>
                      <p className="font-semibold text-slate-900 text-sm">{franchise.address?.city || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">State</span>
                      <p className="font-semibold text-slate-900 text-sm">{franchise.address?.state || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Pincode</span>
                      <p className="font-semibold text-slate-900 text-sm">{franchise.address?.pincode || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Center Phone Line</span>
                      <p className="font-semibold text-slate-900 text-sm">{franchise.contactInfo?.phone || franchise.owner?.mobile || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">Official Center Email</span>
                      <p className="font-semibold text-slate-900 text-sm">{franchise.contactInfo?.email || franchise.owner?.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Documents & KYC Tab (Dedicated Separate Tab) */}
            {activeTab === 'documents' && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FiFileText className="text-primary-600 w-4 h-4" />
                        <span>School Campus & Board Affiliation Documents</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Uploaded official identity proofs, signatures, and school building photographs.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documentsList.map((doc) => {
                      const fileUrl = franchise.owner?.[doc.key];
                      const absoluteUrl = fileUrl ? toAbsoluteUrl(fileUrl) : null;
                      const hasFile = Boolean(fileUrl);
                      const isUploading = uploadingDocKey === doc.key;
                      const DocIcon = doc.icon;

                      return (
                        <div
                          key={doc.key}
                          className="border border-slate-200/90 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <DocIcon className="w-3.5 h-3.5 text-primary-600" />
                                {doc.label}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  hasFile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {hasFile ? 'Uploaded' : 'Missing'}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 mb-3">{doc.desc}</p>

                            {/* Preview Thumbnail Box */}
                            <div className="w-full h-32 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center mb-3">
                              {hasFile ? (
                                <img
                                  src={absoluteUrl}
                                  alt={doc.label}
                                  className="w-full h-full object-contain cursor-pointer hover:scale-105 transition"
                                  onClick={() => setPreviewImage(absoluteUrl)}
                                />
                              ) : (
                                <div className="text-center p-3 text-slate-400">
                                  <FiFileText className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                                  <span className="text-[11px]">No file uploaded</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                            {hasFile && (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(absoluteUrl)}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                              >
                                <FiEye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                            )}
                            <label
                              htmlFor={`doc-input-${doc.key}`}
                              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                hasFile
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                  : 'bg-primary-600 hover:bg-primary-700 text-white'
                              }`}
                            >
                              <FiUploadCloud className="w-3.5 h-3.5" />
                              <span>{isUploading ? 'Uploading...' : hasFile ? 'Replace' : 'Upload'}</span>
                              <input
                                id={`doc-input-${doc.key}`}
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => e.target.files?.[0] && handleDocumentUpload(doc.key, e.target.files[0])}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Financials Tab */}
            {activeTab === 'financial' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Total Revenue (Inflow)"
                    tone="success"
                    icon={TbCurrencyRupee}
                    value={formatCurrency(getFinancialIncome(financial))}
                    subtitle="All collected fees"
                  />
                  <StatCard
                    title="Total Expenses"
                    tone="danger"
                    icon={FiActivity}
                    value={formatCurrency(getFinancialExpenses(financial))}
                    subtitle="Operational costs"
                  />
                  <StatCard
                    title="Net Revenue / Profit"
                    tone="primary"
                    icon={FiTrendingUp}
                    value={formatCurrency(getFinancialNetRevenue(financial))}
                    subtitle="Income minus expenses"
                  />
                  <StatCard
                    title="Outstanding Receivables"
                    tone="amber"
                    icon={FiBarChart2}
                    value={formatCurrency(outstandingAmount)}
                    subtitle="Pending collections"
                  />
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FiCalendar className="text-primary-600 w-4 h-4" />
                      <span>This Month's Financial Performance</span>
                    </h3>
                    <Button
                      variant="secondary"
                      onClick={() => navigate('/admin/financial-ledger')}
                      className="text-xs"
                    >
                      Open Full Ledger
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                      <span className="text-slate-500 block text-[11px]">Monthly Revenue</span>
                      <p className="text-lg font-bold text-emerald-700 mt-1">
                        {formatCurrency(financial.monthlyIncome || 0)}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100">
                      <span className="text-slate-500 block text-[11px]">Monthly Expenditure</span>
                      <p className="text-lg font-bold text-rose-700 mt-1">
                        {formatCurrency(financial.monthlyExpenses || 0)}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-primary-50/50 border border-primary-100">
                      <span className="text-slate-500 block text-[11px]">Monthly Net Margin</span>
                      <p className="text-lg font-bold text-primary-700 mt-1">
                        {formatCurrency(financial.monthlyNetRevenue || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Students Tab */}
            {activeTab === 'students' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FiUsers className="text-primary-600 w-4 h-4" />
                      <span>Enrolled Students</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Total {totalStudents} students registered at this school campus.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/admin/students?campus=${id}`)}
                    className="text-xs"
                  >
                    View All Students in Directory
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                    <span className="text-slate-500 block text-[11px]">Active Students</span>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{activeStudents}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Total Registrations</span>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{totalStudents}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Settings & Security Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FiLock className="text-primary-600 w-4 h-4" />
                      <span>Campus Admin Login Password</span>
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 mb-4">
                    Reset or update the portal password for campus administrator <strong className="text-slate-700">{franchise.owner?.email}</strong>.
                  </p>

                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
                  >
                    Reset Portal Password
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-2xl border border-rose-200/80 shadow-2xs p-5 sm:p-6">
                  <h3 className="text-sm font-bold text-rose-700 mb-2">Danger Zone</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Permanently delete this school campus and remove all associated records.
                  </p>
                  <Button variant="danger" icon={FiTrash2} onClick={handleDelete} className="text-xs">
                    Delete Campus
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL 1: EDIT BASIC INFO ================= */}
      {isBasicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FiLayers className="text-primary-600" />
                Edit School Campus Information
              </h3>
              <button
                type="button"
                onClick={() => setIsBasicModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBasic} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Campus Name</label>
                <input
                  type="text"
                  value={basicForm.name}
                  onChange={(e) => setBasicForm({ ...basicForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Campus Code</label>
                <input
                  type="text"
                  value={basicForm.code}
                  onChange={(e) => setBasicForm({ ...basicForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Status</label>
                  <select
                    value={basicForm.status}
                    onChange={(e) => setBasicForm({ ...basicForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Established Date</label>
                  <input
                    type="date"
                    value={basicForm.establishedDate}
                    onChange={(e) => setBasicForm({ ...basicForm, establishedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={basicForm.isMainBranch}
                  onChange={(e) => setBasicForm({ ...basicForm, isMainBranch: e.target.checked })}
                  className="rounded text-primary-600"
                />
                <span className="text-slate-700 font-medium">Designate as Main Branch (Head Office)</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBasicModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <Button type="submit" variant="primary" loading={submittingModal}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: EDIT OWNER INFO ================= */}
      {isOwnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FiUser className="text-primary-600" />
                Edit Principal & Campus Head
              </h3>
              <button
                type="button"
                onClick={() => setIsOwnerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOwner} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Owner Name</label>
                <input
                  type="text"
                  value={ownerForm.adminName}
                  onChange={(e) => setOwnerForm({ ...ownerForm, adminName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Email (Username)</label>
                  <input
                    type="email"
                    value={ownerForm.adminEmail}
                    onChange={(e) => setOwnerForm({ ...ownerForm, adminEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={ownerForm.adminPhone}
                    onChange={(e) => setOwnerForm({ ...ownerForm, adminPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    maxLength={12}
                    value={ownerForm.aadhaarNumber}
                    onChange={(e) => setOwnerForm({ ...ownerForm, aadhaarNumber: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">PAN Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={ownerForm.panNumber}
                    onChange={(e) => setOwnerForm({ ...ownerForm, panNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Qualification</label>
                <input
                  type="text"
                  value={ownerForm.qualification}
                  onChange={(e) => setOwnerForm({ ...ownerForm, qualification: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="e.g. Master of Computer Applications (MCA)"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOwnerModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <Button type="submit" variant="primary" loading={submittingModal}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EDIT ADDRESS INFO ================= */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FiMapPin className="text-primary-600" />
                Edit Address & Contact Details
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Street Address</label>
                <input
                  type="text"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="Street / Building / Area"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">State</label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Pincode</label>
                  <input
                    type="text"
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Center Phone</label>
                  <input
                    type="tel"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Center Email</label>
                  <input
                    type="email"
                    value={addressForm.email}
                    onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <Button type="submit" variant="primary" loading={submittingModal}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: RESET ADMIN PASSWORD ================= */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FiLock className="text-primary-600" />
                Reset Portal Password
              </h3>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">New Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <Button type="submit" variant="primary" loading={submittingModal}>
                  Reset Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 6: IMAGE PREVIEW MODAL ================= */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-3xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50">
              <span className="text-xs font-bold text-slate-700">Document Image Preview</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-white text-xs flex items-center gap-1 font-semibold"
                >
                  <FiExternalLink className="w-3.5 h-3.5" />
                  Open Full
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-950/5 overflow-auto max-h-[75vh]">
              <img
                src={previewImage}
                alt="Document preview"
                className="max-w-full max-h-[70vh] object-contain rounded shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
