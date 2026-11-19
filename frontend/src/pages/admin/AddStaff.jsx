import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiArrowLeft,
  FiCheckCircle,
  FiShield,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui';

const AddStaff = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [franchises, setFranchises] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const defaultFranchise = user?.franchise?._id || user?.franchise || '';

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    department: 'Teaching',
    employeeType: 'full-time',
    joiningDate: new Date().toISOString().split('T')[0],
    franchise: defaultFranchise,
    gender: 'male',
    password: '',
    status: 'active'
  });

  useEffect(() => {
    if (isSuperAdmin) {
      fetchFranchises();
    }
  }, [isSuperAdmin]);

  const fetchFranchises = async () => {
    try {
      const response = await api.get('/campuses');
      const list = response.data?.data || response.data || [];
      setFranchises(Array.isArray(list) ? list : []);
      if (list.length === 1 && !formData.franchise) {
        setFormData((prev) => ({ ...prev, franchise: list[0]._id }));
      }
    } catch (error) {
      console.error('Failed to fetch schools:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectedFranchise = useMemo(() => {
    if (!isSuperAdmin) return user?.franchise;
    return franchises.find((f) => f._id === formData.franchise);
  }, [franchises, formData.franchise, isSuperAdmin, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email address is required');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Mobile phone is required');
      return;
    }
    if (!formData.designation.trim()) {
      toast.error('Designation is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        designation: formData.designation.trim(),
        department: formData.department,
        employeeType: formData.employeeType,
        joiningDate: formData.joiningDate,
        franchise: isSuperAdmin ? (formData.franchise || undefined) : defaultFranchise,
        gender: formData.gender,
        password: formData.password || `Staff@${Math.floor(1000 + Math.random() * 9000)}`,
        status: formData.status
      };

      const response = await api.post('/staff', payload);
      if (response.data && (response.data.success || response.status === 201)) {
        toast.success('Staff member registered successfully!');
        const staffId = response.data.data?._id || response.data._id;
        const targetList = isSuperAdmin ? '/admin/staff' : '/school/staff';
        navigate(staffId ? `${targetList}/${staffId}` : targetList);
      } else {
        toast.error(response.data?.message || 'Failed to add staff member');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Error adding staff member');
    } finally {
      setLoading(false);
    }
  };

  const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ') || 'New Staff';

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Add Staff Member"
          subtitle="Quickly onboard a trainer, counselor, or administrative staff member"
          icon={FiUser}
          actions={(
            <Button
              variant="secondary"
              icon={FiArrowLeft}
              onClick={() => navigate(isSuperAdmin ? '/admin/staff' : '/school/staff')}
            >
              Back to Staff
            </Button>
          )}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Form: Essentials */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Card 1: Personal Information */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 border border-primary-100 flex items-center justify-center font-bold">
                    <FiUser className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
                    <p className="text-xs text-slate-500">Staff identity and contact details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="e.g. Priya"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="e.g. Sharma"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="staff@seseducare.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <FiPhone className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                      <input
                        type="tel"
                        name="phone"
                        required
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="10-digit mobile"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition capitalize"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 2: Employment Details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
                    <FiBriefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Employment Details</h3>
                    <p className="text-xs text-slate-500">Designation, department, and joining date</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {isSuperAdmin && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        School Campus / Branch
                      </label>
                      <select
                        name="franchise"
                        value={formData.franchise}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                      >
                        <option value="">Central Office / Main Branch</option>
                        {franchises.map((f) => (
                          <option key={f._id} value={f._id}>
                            {f.name} {f.code ? `(${f.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Designation <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="designation"
                      required
                      value={formData.designation}
                      onChange={handleChange}
                      placeholder="e.g. Senior IT Trainer"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Department
                    </label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    >
                      <option value="Teaching">Teaching / Academics</option>
                      <option value="Management">Management</option>
                      <option value="Administration">Administration</option>
                      <option value="Accounts">Accounts / Finance</option>
                      <option value="Counseling">Admission / Counseling</option>
                      <option value="Technical">Technical Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      name="joiningDate"
                      value={formData.joiningDate}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Employment Type
                    </label>
                    <select
                      name="employeeType"
                      value={formData.employeeType}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    >
                      <option value="full-time">Full-Time</option>
                      <option value="part-time">Part-Time</option>
                      <option value="contract">Contract</option>
                      <option value="visiting">Visiting Faculty</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 3: Portal Access */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
                    <FiShield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Portal Access Credentials</h3>
                    <p className="text-xs text-slate-500">Login password for staff portal access</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Password (Optional)
                  </label>
                  <div className="relative max-w-md">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Leave blank to auto-generate"
                      className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/60 focus:border-transparent text-sm transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Login credentials will be sent to their email automatically.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(isSuperAdmin ? '/admin/staff' : '/school/staff')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={loading} icon={FiCheckCircle}>
                  Add Staff Member
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Staff Card Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Live Preview
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Ready to onboard
                </span>
              </div>

              {/* Avatar + Name */}
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-primary-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0 shadow-xs">
                  <span>{formData.firstName?.[0] || 'S'}</span>
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-slate-900 truncate">
                    {fullName}
                  </h4>
                  <p className="text-xs text-primary-600 font-semibold truncate">
                    {formData.designation || 'Staff Designation'}
                  </p>
                </div>
              </div>

              {/* Details List */}
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-slate-500 font-medium">Department:</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {formData.department}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-slate-500 font-medium">Center:</span>
                  <span className="font-semibold text-slate-800 text-right truncate">
                    {selectedFranchise?.name || 'Central Campus'}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-slate-500 font-medium">Type:</span>
                  <span className="font-semibold text-slate-800 text-right capitalize">
                    {formData.employeeType}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between gap-2">
                  <span className="text-slate-500 font-medium">Email:</span>
                  <span className="font-semibold text-slate-800 text-right truncate">
                    {formData.email || '—'}
                  </span>
                </div>
              </div>

              {/* Informational Hint */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500 leading-relaxed">
                💡 <strong>Tip:</strong> Bank accounts, salary packages, PF/ESI allowances, and ID cards can be configured anytime from the staff details page.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AddStaff;
