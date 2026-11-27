import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import {
  FiBriefcase, FiUser, FiMail, FiPhone, FiMapPin,
  FiCalendar, FiLock, FiAward, FiCheck, FiRefreshCw
} from 'react-icons/fi';
import api from '../../api/axios';
import { Button, Card, FormField, FormGrid } from '../../components/ui';

const AddCampus = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    city: '',
    state: '',
    pincode: '',
    address: '',
    affiliationBoard: 'CBSE',
    campusType: 'Main Senior Secondary Campus',
    establishedDate: new Date().toISOString().split('T')[0],
    status: 'active',
    isMainBranch: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      // Auto-sync school email/phone with admin email/phone if empty
      if (name === 'adminEmail' && !prev.email) {
        next.email = value;
      }
      if (name === 'adminPhone' && !prev.phone) {
        next.phone = value;
      }
      return next;
    });
  };

  const handleGenerateCode = () => {
    const prefix = formData.name
      ? formData.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()
      : 'SES';
    const rand = Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({ ...prev, code: `${prefix || 'SES'}-${rand}` }));
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, adminPassword: pass }));
    setShowPassword(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter school campus name');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('Please enter or generate a campus code');
      return;
    }
    if (!formData.adminName.trim()) {
      toast.error('Please enter center head / owner name');
      return;
    }
    if (!formData.adminEmail.trim()) {
      toast.error('Please enter login email');
      return;
    }
    if (!formData.adminPassword || formData.adminPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!formData.adminPhone.trim()) {
      toast.error('Please enter contact mobile number');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        email: formData.email.trim() || formData.adminEmail.trim(),
        phone: formData.phone.trim() || formData.adminPhone.trim(),
        adminName: formData.adminName.trim(),
        adminEmail: formData.adminEmail.trim(),
        adminPhone: formData.adminPhone.trim(),
        adminPassword: formData.adminPassword,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        affiliationBoard: formData.affiliationBoard,
        campusType: formData.campusType,
        establishedDate: formData.establishedDate || new Date().toISOString(),
        status: formData.status,
        isMainBranch: formData.isMainBranch
      };

      const res = await api.post('/campuses', payload);
      const newCampus = res.data.data;

      toast.success('School campus created successfully!');
      if (newCampus?._id) {
        navigate(`/admin/campuses/${newCampus._id}`);
      } else {
        navigate('/admin/campuses');
      }
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to create school campus';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      title="Add New School Campus"
      breadcrumbs="School Campuses / Add New"
    >
      <PageHeader />

      <div className="w-full py-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Campus Identity */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                <FiBriefcase className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">School Campus Identity</h3>
                <p className="text-xs text-slate-500">Official school campus branch details and unique institutional code</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <FormField label="School Campus Name" required>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Arion School Patna Main Center"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  required
                />
              </FormField>

              <FormField label="Campus Code" required>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="e.g. SES-PAT-01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-semibold uppercase focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs whitespace-nowrap transition flex items-center gap-1"
                    title="Auto-generate campus code"
                  >
                    <FiRefreshCw className="w-3 h-3" />
                    Auto
                  </button>
                </div>
              </FormField>

              <FormField label="Affiliation Board">
                <select
                  name="affiliationBoard"
                  value={formData.affiliationBoard}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                >
                  <option value="CBSE">CBSE (Central Board of Secondary Education)</option>
                  <option value="ICSE">ICSE / CISCE</option>
                  <option value="State Board">M.P. State Board</option>
                  <option value="Other">Other Educational Board</option>
                </select>
              </FormField>

              <FormField label="Campus Wing / Type">
                <select
                  name="campusType"
                  value={formData.campusType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                >
                  <option value="Main Senior Secondary Campus">Main Senior Secondary Campus</option>
                  <option value="Secondary Wing">Secondary Wing (Class 6 - 10)</option>
                  <option value="Primary Campus">Primary Campus (Class 1 - 5)</option>
                  <option value="Kindergarten / Pre-Primary Wing">Kindergarten / Pre-Primary Wing</option>
                </select>
              </FormField>

              <FormField label="Established Date">
                <input
                  type="date"
                  name="establishedDate"
                  value={formData.establishedDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white"
                />
              </FormField>
            </div>
          </div>

          {/* 2. Center Head & Login Credentials */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FiUser className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Center Head & Portal Credentials</h3>
                <p className="text-xs text-slate-500">Login email and password used to access the Campus Principal & Admin Portal</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <FormField label="Owner / Center Head Name" required>
                <input
                  type="text"
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  required
                />
              </FormField>

              <FormField label="Mobile / Phone Number" required>
                <input
                  type="tel"
                  name="adminPhone"
                  value={formData.adminPhone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  required
                />
              </FormField>

              <FormField label="Login Email (Username)" required>
                <input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  placeholder="e.g. rahul.ses@gmail.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  required
                />
              </FormField>

              <FormField label="Login Password" required>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="adminPassword"
                    value={formData.adminPassword}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs whitespace-nowrap transition"
                    title="Generate secure password"
                  >
                    Generate
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-2.5 py-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 text-xs"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </FormField>
            </div>
          </div>

          {/* 3. Location & Address */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FiMapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Center Location & Address</h3>
                <p className="text-xs text-slate-500">Physical institute center address</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <FormField label="City">
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Patna"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </FormField>

              <FormField label="State">
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Bihar"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </FormField>

              <FormField label="Pincode">
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="e.g. 800001"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </FormField>

              <div className="sm:col-span-3">
                <FormField label="Street Address">
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g. 2nd Floor, Main Road, Near Station"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/admin/campuses')}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-xs transition"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              icon={FiCheck}
              className="text-xs px-5 py-2.5 rounded-xl font-semibold shadow-xs"
            >
              Save & Register School Campus
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AddCampus;

