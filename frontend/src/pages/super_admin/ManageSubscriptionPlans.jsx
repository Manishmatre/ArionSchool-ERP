import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  FiCreditCard, FiCheck, FiPlus, FiEdit2, FiTrash2, FiUsers,
  FiHardDrive, FiActivity, FiLayers, FiDollarSign, FiClock, FiX
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { Button, Modal } from '../../components/ui';
import api from '../../api/axios';

const AVAILABLE_MODULES = [
  { id: 'student_admissions', label: 'Student Admissions & Scholar Register' },
  { id: 'academic_calendar', label: 'Academic Years & Sessions' },
  { id: 'classes_and_sections', label: 'Classes & Sections' },
  { id: 'student_attendance', label: 'Student Daily Attendance' },
  { id: 'razorpay_fees', label: 'Razorpay & Multi-Head Fee Desk' },
  { id: 'transfer_certificates', label: 'CBSE Transfer Certificates (TC) & QR' },
  { id: 'cce_report_cards', label: 'Continuous Evaluation & CCE Report Cards' },
  { id: 'anti_cheat_seating', label: 'Anti-Cheat Examination Seating Matrix' },
  { id: 'ai_pedagogy', label: 'AI Teacher Copilot & Lesson Planner' },
  { id: 'rfid_attendance', label: 'RFID & Biometric Gate Sync' },
  { id: 'transport_gps', label: 'Transport GPS & Fleet Tracking' },
  { id: 'digital_library', label: 'Digital Library & Barcode Management' },
  { id: 'staff_payroll', label: 'Staff HR, Shifts & Salary Ledger' },
  { id: 'hostel_management', label: 'Hostel & Dormitory Allocation' },
  { id: 'visitor_gate_pass', label: 'Visitor Pass & Security Gate' },
  { id: 'multi_branch_hq', label: 'Multi-Branch Trust Consolidation' },
  { id: 'white_label_custom_domain', label: 'Custom Domain & Subdomain Mapping' },
  { id: 'priority_dedicated_support', label: 'Dedicated Account Manager & SLA' },
];

export default function ManageSubscriptionPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    billingCycle: 'annual',
    price: 36000,
    maxStudents: 500,
    maxCampuses: 1,
    maxStaff: 50,
    storageLimitGb: 20,
    trialDays: 14,
    features: ['student_admissions', 'academic_calendar', 'classes_and_sections', 'student_attendance', 'razorpay_fees'],
    isPopular: false,
    isActive: true
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscriptions/plans');
      setPlans(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEdit(false);
    setCurrentPlanId(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      billingCycle: 'annual',
      price: 48000,
      maxStudents: 1000,
      maxCampuses: 1,
      maxStaff: 60,
      storageLimitGb: 25,
      trialDays: 14,
      features: ['student_admissions', 'academic_calendar', 'classes_and_sections', 'student_attendance', 'razorpay_fees'],
      isPopular: false,
      isActive: true
    });
    setPlanModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setIsEdit(true);
    setCurrentPlanId(plan._id);
    setFormData({
      name: plan.name,
      code: plan.code,
      description: plan.description || '',
      billingCycle: plan.billingCycle || 'annual',
      price: plan.price || 0,
      maxStudents: plan.maxStudents || 500,
      maxCampuses: plan.maxCampuses || 1,
      maxStaff: plan.maxStaff || 50,
      storageLimitGb: plan.storageLimitGb || 20,
      trialDays: plan.trialDays || 14,
      features: plan.features || [],
      isPopular: plan.isPopular || false,
      isActive: plan.isActive !== false
    });
    setPlanModalOpen(true);
  };

  const handleFeatureToggle = (featureId) => {
    setFormData(prev => {
      const exists = prev.features.includes(featureId);
      return {
        ...prev,
        features: exists
          ? prev.features.filter(f => f !== featureId)
          : [...prev.features, featureId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await api.put(`/subscriptions/plans/${currentPlanId}`, formData);
        toast.success('Subscription plan updated successfully');
      } else {
        await api.post('/subscriptions/plans', formData);
        toast.success('New subscription plan created successfully');
      }
      setPlanModalOpen(false);
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save plan');
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this subscription plan?')) return;
    try {
      await api.delete(`/subscriptions/plans/${planId}`);
      toast.success('Subscription plan removed');
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete plan');
    }
  };

  return (
    <Layout
      title="SaaS Subscription Plans"
      breadcrumbs="Platform Admin / Subscription Plans"
      actions={(
        <Button
          variant="primary"
          icon={FiPlus}
          onClick={handleOpenCreate}
          className="text-xs"
        >
          Create New Plan
        </Button>
      )}
    >
      <PageHeader />

      <div className="mb-6">
        <p className="text-xs text-slate-500">
          Configure tier pricing, student quotas, and feature flags available to member schools across SES Educare SaaS.
        </p>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map(plan => (
          <div
            key={plan._id}
            className={`bg-white rounded-2xl p-6 border shadow-2xs flex flex-col justify-between relative transition hover:shadow-md ${
              plan.isPopular ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-slate-200/90'
            }`}
          >
            {plan.isPopular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                Most Popular
              </span>
            )}

            <div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <span className="font-mono text-[11px] text-slate-400 font-semibold">{plan.code}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(plan)}
                    className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition"
                    title="Edit Plan"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                    title="Delete Plan"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-4 min-h-[32px]">{plan.description}</p>

              <div className="mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-950">₹{(plan.price || 0).toLocaleString('en-IN')}</span>
                  <span className="text-xs text-slate-400 font-medium">/ {plan.billingCycle}</span>
                </div>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <FiClock className="w-3 h-3" /> {plan.trialDays || 14}-Day Free Trial Included
                </p>
              </div>

              {/* Quota Highlights */}
              <div className="space-y-2 mb-5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><FiUsers className="w-3.5 h-3.5 text-slate-400" /> Max Students:</span>
                  <strong className="text-slate-800">{plan.maxStudents === 0 ? 'Unlimited' : `${plan.maxStudents.toLocaleString('en-IN')} Students`}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><FiLayers className="w-3.5 h-3.5 text-slate-400" /> Allowed Campuses:</span>
                  <strong className="text-slate-800">{plan.maxCampuses} Branch(es)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><FiHardDrive className="w-3.5 h-3.5 text-slate-400" /> Cloud Storage:</span>
                  <strong className="text-slate-800">{plan.storageLimitGb || 20} GB</strong>
                </div>
              </div>

              {/* Features List */}
              <div>
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2.5">Included Capabilities</p>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {(plan.features || []).slice(0, 8).map((feat, idx) => {
                    const label = AVAILABLE_MODULES.find(m => m.id === feat)?.label || feat.replace(/_/g, ' ');
                    return (
                      <li key={idx} className="flex items-center gap-2">
                        <FiCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{label}</span>
                      </li>
                    );
                  })}
                  {(plan.features || []).length > 8 && (
                    <li className="text-[11px] font-semibold text-primary-600 pt-1">
                      + {(plan.features || []).length - 8} more modules included
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                plan.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
              }`}>
                {plan.isActive ? 'Active Plan' : 'Draft Plan'}
              </span>
              <button
                onClick={() => handleOpenEdit(plan)}
                className="text-xs font-bold text-primary-600 hover:text-primary-700"
              >
                Configure Plan →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Plan Form Modal */}
      {planModalOpen && (
        <Modal
          isOpen={planModalOpen}
          onClose={() => setPlanModalOpen(false)}
          title={isEdit ? `Edit Plan: ${formData.name}` : 'Create New SaaS Subscription Plan'}
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starter School"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PLAN_STARTER"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                placeholder="Brief summary of who this plan is designed for..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Annual Price (INR) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Cycle</label>
                <select
                  value={formData.billingCycle}
                  onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="annual">Annual (1 Year)</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Max Students (0 = Unlim)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxStudents}
                  onChange={(e) => setFormData({ ...formData, maxStudents: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Max Campuses</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxCampuses}
                  onChange={(e) => setFormData({ ...formData, maxCampuses: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Storage Quota (GB)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.storageLimitGb}
                  onChange={(e) => setFormData({ ...formData, storageLimitGb: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Free Trial (Days)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.trialDays}
                  onChange={(e) => setFormData({ ...formData, trialDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            {/* Feature Modules Checkboxes */}
            <div className="pt-2 border-t border-slate-200">
              <label className="block font-bold text-slate-800 mb-2">Included Modules & Feature Flags</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_MODULES.map(module => {
                  const checked = formData.features.includes(module.id);
                  return (
                    <label
                      key={module.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                        checked ? 'bg-primary-50/60 border-primary-300 text-slate-900 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleFeatureToggle(module.id)}
                        className="rounded text-primary-600 focus:ring-primary-500"
                      />
                      <span>{module.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPopular}
                  onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="font-semibold text-slate-700">Mark as Popular</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="font-semibold text-slate-700">Active (Visible in Portal)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setPlanModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Subscription Plan</Button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
