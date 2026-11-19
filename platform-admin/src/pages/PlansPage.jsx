import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiStar, FiX } from 'react-icons/fi';
import ConsoleLayout from '../components/ConsoleLayout';
import { platformApi } from '../api/platformApi';

const EMPTY_PLAN = {
  name: '', code: '', description: '', billingCycle: 'annual', price: 12000,
  maxStudents: 1000, maxCampuses: 1, maxStaff: 100, storageLimitGb: 50,
  trialDays: 14, isPopular: false, isActive: true, featuresText: ''
};

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PLAN);

  const load = async () => {
    setLoading(true);
    try {
      const res = await platformApi.getPlans();
      setPlans(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_PLAN);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name,
      code: p.code,
      description: p.description || '',
      billingCycle: p.billingCycle || 'annual',
      price: p.price || 0,
      maxStudents: p.maxStudents ?? 500,
      maxCampuses: p.maxCampuses ?? 1,
      maxStaff: p.maxStaff ?? 50,
      storageLimitGb: p.storageLimitGb ?? 10,
      trialDays: p.trialDays ?? 14,
      isPopular: Boolean(p.isPopular),
      isActive: Boolean(p.isActive),
      featuresText: (p.features || []).join('\n')
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: Number(form.price),
      maxStudents: Number(form.maxStudents),
      maxCampuses: Number(form.maxCampuses),
      maxStaff: Number(form.maxStaff),
      storageLimitGb: Number(form.storageLimitGb),
      trialDays: Number(form.trialDays),
      features: form.featuresText.split('\n').map((l) => l.trim()).filter(Boolean)
    };
    try {
      if (editing) {
        await platformApi.updatePlan(editing._id, payload);
        toast.success('Subscription plan updated');
      } else {
        await platformApi.createPlan(payload);
        toast.success('New subscription plan created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save plan');
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete plan "${p.name}"?`)) return;
    try {
      await platformApi.deletePlan(p._id);
      toast.success('Plan deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete plan');
    }
  };

  return (
    <ConsoleLayout
      title="SaaS Subscription Plans & Pricing Engine"
      subtitle="Configure school subscription tiers, student limits, campus capacity, and feature access"
      actions={
        <button onClick={openCreate} className="btn-primary text-xs py-2 px-4">
          <FiPlus className="w-4 h-4" />
          <span>Create Pricing Plan</span>
        </button>
      }
    >
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">Loading plans...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((p) => (
            <div key={p._id} className={`card p-6 flex flex-col justify-between relative ${p.isPopular ? 'border-brand-500 ring-2 ring-brand-500/15' : ''}`}>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {p.code}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-2">{p.name}</h3>
                  </div>
                  {p.isPopular && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      <FiStar className="w-3 h-3" /> Featured
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1.5 min-h-[34px]">{p.description}</p>

                <div className="mt-4 pb-4 border-b border-slate-100">
                  <span className="text-3xl font-black text-slate-900">₹{Number(p.price).toLocaleString('en-IN')}</span>
                  <span className="text-xs text-slate-500 capitalize"> / {p.billingCycle}</span>
                  <p className="text-[11px] font-semibold text-brand-600 mt-1">
                    {p.activeTenants || 0} active school(s) on this tier
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 my-4 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-slate-400 block">Student Limit</span>
                    <strong className="text-slate-800">{p.maxStudents === 0 ? 'Unlimited' : p.maxStudents}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-slate-400 block">Campuses / Trial</span>
                    <strong className="text-slate-800">{p.maxCampuses} • {p.trialDays}d</strong>
                  </div>
                </div>

                <ul className="space-y-1.5 text-xs text-slate-600">
                  {(p.features || []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <FiCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {p.isActive ? 'Active' : 'Archived'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(p)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(p)} className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600">
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editing ? `Edit Plan: ${editing.name}` : 'Create New SaaS Subscription Plan'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700"><FiX className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Plan Name *</label>
                  <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Plan Code *</label>
                  <input required className="input uppercase font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div>
                  <label className="label">Price (INR) *</label>
                  <input required type="number" min={0} className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <label className="label">Billing Cycle</label>
                  <select className="input" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
                <div>
                  <label className="label">Max Students (0 = Unlimited)</label>
                  <input type="number" min={0} className="input" value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: e.target.value })} />
                </div>
                <div>
                  <label className="label">Max Campuses</label>
                  <input type="number" min={1} className="input" value={form.maxCampuses} onChange={(e) => setForm({ ...form, maxCampuses: e.target.value })} />
                </div>
                <div>
                  <label className="label">Trial Days</label>
                  <input type="number" min={0} className="input" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} />
                </div>
                <div>
                  <label className="label">Storage Limit (GB)</label>
                  <input type="number" min={1} className="input" value={form.storageLimitGb} onChange={(e) => setForm({ ...form, storageLimitGb: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="label">Included Features (one per line)</label>
                <textarea rows={4} className="input" value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} placeholder="Razorpay Fee Desk&#10;CBSE CCE Report Cards&#10;Teacher AI Copilot" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.isPopular} onChange={(e) => setForm({ ...form, isPopular: e.target.checked })} className="w-4 h-4 accent-brand-600" />
                  <span>Highlight as Featured / Popular</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-brand-600" />
                  <span>Active & Available</span>
                </label>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update Plan' : 'Create Plan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ConsoleLayout>
  );
}
