import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiSliders, FiKey, FiExternalLink,
  FiCheckCircle, FiPauseCircle, FiX, FiGlobe, FiShield
} from 'react-icons/fi';
import ConsoleLayout from '../components/ConsoleLayout';
import { platformApi } from '../api/platformApi';

const MODULE_LIST = [
  { key: 'fees', label: 'Razorpay Fee Desk & Receipts' },
  { key: 'exams', label: 'CBSE / State CCE Report Cards' },
  { key: 'attendance', label: 'Daily & RFID Attendance' },
  { key: 'aiCopilot', label: 'Teacher AI Copilot' },
  { key: 'certificates', label: 'Transfer Certificates (TC)' },
  { key: 'seating', label: 'Anti-Cheat Exam Seating' },
  { key: 'library', label: 'School Library & Circulation' },
  { key: 'transport', label: 'Bus Fleet & GPS Telemetry' },
  { key: 'lms', label: 'Online Classes & Homework' },
  { key: 'hostel', label: 'Hostel & Dormitory' },
  { key: 'payroll', label: 'Staff HR & Payroll' },
  { key: 'parentPortal', label: 'Parent Mobile & Web Portal' }
];

const EMPTY_FORM = {
  name: '', code: '', subdomain: '', customDomain: '', board: 'CBSE', affiliationNumber: '',
  ownerName: '', ownerEmail: '', ownerMobile: '', adminPassword: '',
  street: '', city: '', state: '', pincode: '', planId: '', subscriptionStatus: 'active'
};

export default function SchoolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [schools, setSchools] = useState([]);
  const [plans, setPlans] = useState([]);
  const [primaryDomain, setPrimaryDomain] = useState('seseducare.com');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [featureModalSchool, setFeatureModalSchool] = useState(null);
  const [moduleState, setModuleState] = useState({});

  const [pwModalSchool, setPwModalSchool] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, cRes] = await Promise.all([
        platformApi.getSchools({ search, status: statusFilter }),
        platformApi.getPlans(),
        platformApi.getConfig()
      ]);
      setSchools(sRes.data?.data || []);
      setPlans(pRes.data?.data || []);
      setPrimaryDomain(cRes.data?.data?.primaryDomain || 'seseducare.com');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [statusFilter]);

  useEffect(() => {
    if (searchParams.get('provision') === '1') {
      openCreateModal();
      setSearchParams({});
    }
  }, [searchParams]);

  const openCreateModal = () => {
    setEditingSchool(null);
    setForm({ ...EMPTY_FORM, planId: plans[0]?._id || '' });
    setShowFormModal(true);
  };

  const openEditModal = (s) => {
    setEditingSchool(s);
    setForm({
      name: s.name || '',
      code: s.code || '',
      subdomain: s.subdomain || '',
      customDomain: s.customDomain || '',
      board: s.board || 'CBSE',
      affiliationNumber: s.affiliationNumber || '',
      ownerName: s.owner?.name || '',
      ownerEmail: s.owner?.email || '',
      ownerMobile: s.owner?.mobile || '',
      adminPassword: '',
      street: s.address?.street || '',
      city: s.address?.city || '',
      state: s.address?.state || '',
      pincode: s.address?.pincode || '',
      planId: s.subscription?.plan?._id || s.plan || '',
      subscriptionStatus: s.subscription?.status || 'active'
    });
    setShowFormModal(true);
  };

  const handleSaveSchool = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSchool) {
        await platformApi.updateSchool(editingSchool._id, form);
        toast.success('School tenant updated successfully');
      } else {
        const res = await platformApi.provisionSchool(form);
        const creds = res.data?.data?.adminCredentials;
        toast.success(`Provisioned ${form.name}! Login: ${creds?.email} / ${creds?.password}`, { autoClose: 7000 });
      }
      setShowFormModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save school');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (s) => {
    const next = s.status === 'active' ? 'suspended' : 'active';
    const reason = next === 'suspended' ? window.prompt('Suspension reason (optional):', 'Payment overdue') : '';
    if (next === 'suspended' && reason === null) return;
    try {
      await platformApi.updateSchoolStatus(s._id, { status: next, suspensionReason: reason || '' });
      toast.success(`School ${next === 'active' ? 'activated' : 'suspended'}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Permanently delete school tenant "${s.name}" (${s.code})?`)) return;
    try {
      await platformApi.deleteSchool(s._id);
      toast.success('School tenant deleted');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const openFeaturesModal = (s) => {
    setFeatureModalSchool(s);
    const defaults = {};
    MODULE_LIST.forEach((m) => {
      defaults[m.key] = s.enabledModules?.[m.key] ?? true;
    });
    setModuleState(defaults);
  };

  const handleSaveFeatures = async () => {
    try {
      await platformApi.updateSchoolFeatures(featureModalSchool._id, moduleState);
      toast.success('Module permissions saved for ' + featureModalSchool.name);
      setFeatureModalSchool(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update feature flags');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await platformApi.resetSchoolPassword(pwModalSchool._id, newPassword);
      toast.success(res.data?.message || 'Password reset successfully');
      setPwModalSchool(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed');
    }
  };

  const handleImpersonate = async (s) => {
    try {
      const res = await platformApi.impersonateSchool(s._id);
      const { token, user } = res.data.data;
      navigator.clipboard?.writeText(token).catch(() => {});
      toast.info(`Support impersonation token generated for ${user.email} (copied to clipboard).`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impersonation failed');
    }
  };

  return (
    <ConsoleLayout
      title="Schools & Multi-Tenant Directory"
      subtitle="Provision, edit, suspend, configure feature flags, and manage every school on the SaaS platform"
      actions={
        <button onClick={openCreateModal} className="btn-primary text-xs py-2 px-4">
          <FiPlus className="w-4 h-4" />
          <span>Provision New School</span>
        </button>
      }
    >
      {/* Filter Bar */}
      <div className="card p-4 mb-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <form
          onSubmit={(e) => { e.preventDefault(); loadData(); }}
          className="relative flex-1 max-w-md"
        >
          <FiSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by school name, code, subdomain, city, email..."
            className="input pl-10"
          />
        </form>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-full sm:w-44"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={loadData} className="btn-secondary text-xs py-2.5">Search</button>
      </div>

      {/* Schools Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 font-bold">School & Subdomain</th>
                <th className="py-3.5 px-4 font-bold">Principal / Admin</th>
                <th className="py-3.5 px-4 font-bold">Plan & Students</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold text-right">SaaS Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400">Loading school tenants...</td></tr>
              ) : schools.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400">No schools found. Click "Provision New School" to onboard a tenant.</td></tr>
              ) : (
                schools.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                          {s.code}
                        </span>
                        {s.subdomain && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-brand-600 font-mono">
                            <FiGlobe className="w-3 h-3" />
                            {s.subdomain}.{primaryDomain}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">{s.board || 'CBSE'} • {s.address?.city}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{s.owner?.name || s.admin?.name || '-'}</p>
                      <p className="text-slate-500">{s.owner?.email || s.admin?.email}</p>
                      <p className="text-slate-400 text-[11px]">{s.owner?.mobile}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{s.subscription?.plan?.name || 'No Plan'}</p>
                      <p className="text-slate-500 mt-0.5">
                        <strong>{s.activeStudentCount || 0}</strong> students • {s.staffCount || 0} staff
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                        s.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        s.status === 'suspended' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openFeaturesModal(s)}
                          title="Module Feature Flags"
                          className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                        >
                          <FiSliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(s)}
                          title="Edit School"
                          className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPwModalSchool(s)}
                          title="Reset Principal Password"
                          className="p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                        >
                          <FiKey className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleImpersonate(s)}
                          title="Generate Support Impersonation Token"
                          className="p-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                        >
                          <FiExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(s)}
                          title={s.status === 'active' ? 'Suspend School' : 'Activate School'}
                          className={`p-2 rounded-lg transition ${
                            s.status === 'active'
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {s.status === 'active' ? <FiPauseCircle className="w-3.5 h-3.5" /> : <FiCheckCircle className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          title="Delete School"
                          className="p-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit School Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingSchool ? `Edit School: ${editingSchool.name}` : 'Provision New Multi-Tenant School'}
              </h3>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-700">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchool} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">School Name *</label>
                  <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Delhi Public Academy" />
                </div>
                <div>
                  <label className="label">Unique School Code *</label>
                  <input required className="input uppercase font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. DPA-DEL" />
                </div>
                <div>
                  <label className="label">School portal subdomain (.{primaryDomain})</label>
                  <input className="input font-mono" value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value })} placeholder="e.g. dpa-delhi" />
                </div>
                <div>
                  <label className="label">Custom Domain (Optional CNAME)</label>
                  <input className="input font-mono" value={form.customDomain} onChange={(e) => setForm({ ...form, customDomain: e.target.value })} placeholder="portal.yourschool.edu.in" />
                </div>
                <div>
                  <label className="label">Affiliation Board</label>
                  <select className="input" value={form.board} onChange={(e) => setForm({ ...form, board: e.target.value })}>
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE / ISC</option>
                    <option value="State Board">State Board</option>
                    <option value="IB">IB / Cambridge</option>
                  </select>
                </div>
                <div>
                  <label className="label">Affiliation Number</label>
                  <input className="input" value={form.affiliationNumber} onChange={(e) => setForm({ ...form, affiliationNumber: e.target.value })} placeholder="e.g. 1030492" />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-900 mb-3">Principal / School Admin Credentials</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Principal / Director Name *</label>
                    <input required className="input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Admin Login Email *</label>
                    <input required type="email" className="input" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">10-Digit Mobile *</label>
                    <input required className="input" value={form.ownerMobile} onChange={(e) => setForm({ ...form, ownerMobile: e.target.value })} placeholder="9876543210" />
                  </div>
                  {!editingSchool && (
                    <div>
                      <label className="label">Initial Portal Password</label>
                      <input type="password" minLength={8} autoComplete="new-password" className="input" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="Leave blank to generate a secure password" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Street Address</label>
                  <input className="input" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                </div>
                <div>
                  <label className="label">City *</label>
                  <input required className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <label className="label">State *</label>
                  <input required className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
                <div>
                  <label className="label">Pincode</label>
                  <input className="input" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                </div>
              </div>

              {!editingSchool && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">SaaS Subscription Plan</label>
                    <select className="input" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
                      {plans.map((p) => (
                        <option key={p._id} value={p._id}>{p.name} (₹{p.price})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Initial Billing State</label>
                    <select className="input" value={form.subscriptionStatus} onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value })}>
                      <option value="active">Active (Paid)</option>
                      <option value="trial">14-Day Free Trial</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setShowFormModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : editingSchool ? 'Save Changes' : 'Provision School Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module Feature Flags Modal */}
      {featureModalSchool && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FiShield className="text-brand-600" />
                  <span>Module Feature Flags</span>
                </h3>
                <p className="text-xs text-slate-500">{featureModalSchool.name}</p>
              </div>
              <button onClick={() => setFeatureModalSchool(null)} className="text-slate-400 hover:text-slate-700">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto">
              {MODULE_LIST.map((mod) => (
                <label
                  key={mod.key}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                    moduleState[mod.key]
                      ? 'bg-brand-50/60 border-brand-200 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <span className="text-xs font-semibold pr-2">{mod.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(moduleState[mod.key])}
                    onChange={(e) => setModuleState({ ...moduleState, [mod.key]: e.target.checked })}
                    className="w-4 h-4 accent-brand-600"
                  />
                </label>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setFeatureModalSchool(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveFeatures} className="btn-primary">Save Feature Matrix</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {pwModalSchool && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <h3 className="text-base font-extrabold text-slate-900">Reset Principal Password</h3>
            <p className="text-xs text-slate-500 mt-1">School: {pwModalSchool.name} ({pwModalSchool.owner?.email})</p>
            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <div>
                <label className="label">New Password (min 6 chars)</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPwModalSchool(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ConsoleLayout>
  );
}
