import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCreditCard, FiFileText, FiPlus, FiEdit2, FiX, FiCheckCircle } from 'react-icons/fi';
import ConsoleLayout from '../components/ConsoleLayout';
import { platformApi } from '../api/platformApi';

export default function BillingPage() {
  const [tab, setTab] = useState('subscriptions');
  const [subs, setSubs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editSub, setEditSub] = useState(null);
  const [subForm, setSubForm] = useState({ planId: '', status: 'active', currentPeriodEnd: '', studentQuotaOverride: '' });

  const [invoiceModalSub, setInvoiceModalSub] = useState(null);
  const [invForm, setInvForm] = useState({ amount: 12000, paymentMethod: 'razorpay', paymentReference: '', extendDays: 365 });

  const load = async () => {
    setLoading(true);
    try {
      const [subRes, invRes, planRes] = await Promise.all([
        platformApi.getSubscriptions(),
        platformApi.getInvoices(),
        platformApi.getPlans()
      ]);
      setSubs(subRes.data?.data || []);
      setInvoices(invRes.data?.data || []);
      setPlans(planRes.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEditSub = (s) => {
    setEditSub(s);
    setSubForm({
      planId: s.plan?._id || '',
      status: s.status || 'active',
      currentPeriodEnd: s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toISOString().split('T')[0] : '',
      studentQuotaOverride: s.studentQuotaOverride ?? ''
    });
  };

  const handleUpdateSub = async (e) => {
    e.preventDefault();
    try {
      await platformApi.updateSubscription(editSub.school._id, subForm);
      toast.success('Subscription updated');
      setEditSub(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const openRecordInvoice = (s) => {
    setInvoiceModalSub(s);
    setInvForm({
      amount: s.plan?.price || 12000,
      paymentMethod: 'razorpay',
      paymentReference: '',
      extendDays: 365
    });
  };

  const handleRecordInvoice = async (e) => {
    e.preventDefault();
    try {
      await platformApi.recordInvoice(invoiceModalSub.school._id, invForm);
      toast.success('Invoice recorded & subscription extended');
      setInvoiceModalSub(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record invoice');
    }
  };

  const totalCollected = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount || 0), 0);

  return (
    <ConsoleLayout
      title="SaaS Billing, Subscriptions & Invoices"
      subtitle="Track school licenses, student quota utilization, renewals, and Razorpay/manual invoices"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="inline-flex bg-white border border-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setTab('subscriptions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              tab === 'subscriptions' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FiCreditCard className="w-3.5 h-3.5" />
            <span>Active Subscriptions ({subs.length})</span>
          </button>
          <button
            onClick={() => setTab('invoices')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              tab === 'invoices' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FiFileText className="w-3.5 h-3.5" />
            <span>Invoices Ledger ({invoices.length})</span>
          </button>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold text-emerald-800">
          Total Collected Revenue: ₹{totalCollected.toLocaleString('en-IN')}
        </div>
      </div>

      {tab === 'subscriptions' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                  <th className="py-3.5 px-4 font-bold">School Tenant</th>
                  <th className="py-3.5 px-4 font-bold">Plan</th>
                  <th className="py-3.5 px-4 font-bold">Seat Utilization</th>
                  <th className="py-3.5 px-4 font-bold">Valid Until</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400">Loading subscriptions...</td></tr>
                ) : subs.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400">No subscriptions recorded.</td></tr>
                ) : (
                  subs.map((s) => {
                    const quota = s.studentQuotaOverride || s.plan?.maxStudents || 0;
                    const pct = quota > 0 ? Math.min(100, Math.round(((s.currentStudents || 0) / quota) * 100)) : 0;
                    return (
                      <tr key={s._id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{s.school?.name || 'Deleted'}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{s.school?.code}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{s.plan?.name || '-'}</p>
                          <p className="text-[11px] text-slate-500">₹{Number(s.plan?.price || 0).toLocaleString('en-IN')} / {s.plan?.billingCycle}</p>
                        </td>
                        <td className="py-3.5 px-4 min-w-[160px]">
                          <div className="flex justify-between text-[11px] font-semibold mb-1">
                            <span>{s.currentStudents || 0} students</span>
                            <span className="text-slate-400">{quota === 0 ? 'Unlimited' : `of ${quota}`}</span>
                          </div>
                          {quota > 0 && (
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct > 85 ? 'bg-rose-500' : 'bg-brand-600'}`} style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            s.status === 'trial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button onClick={() => openRecordInvoice(s)} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1">
                              <FiPlus className="w-3 h-3" /> Record Payment
                            </button>
                            <button onClick={() => openEditSub(s)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                  <th className="py-3.5 px-4 font-bold">Invoice #</th>
                  <th className="py-3.5 px-4 font-bold">School & Plan</th>
                  <th className="py-3.5 px-4 font-bold">Amount</th>
                  <th className="py-3.5 px-4 font-bold">Method / Ref</th>
                  <th className="py-3.5 px-4 font-bold">Date</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400">No invoices generated yet.</td></tr>
                ) : (
                  invoices.map((inv, idx) => (
                    <tr key={inv._id || idx} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{inv.schoolName}</p>
                        <p className="text-[11px] text-slate-500">{inv.planName}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                        ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="uppercase font-semibold text-slate-700">{inv.paymentMethod}</span>
                        {inv.paymentReference && <p className="text-[11px] font-mono text-slate-400">{inv.paymentReference}</p>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(inv.paidAt || inv.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                          <FiCheckCircle className="w-3 h-3" /> {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {editSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Edit Subscription — {editSub.school?.name}</h3>
              <button onClick={() => setEditSub(null)}><FiX className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleUpdateSub} className="mt-4 space-y-4">
              <div>
                <label className="label">Subscription Plan</label>
                <select className="input" value={subForm.planId} onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })}>
                  {plans.map((p) => <option key={p._id} value={p._id}>{p.name} (₹{p.price})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={subForm.status} onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="past_due">Past Due</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="label">Renewal / Expiry Date</label>
                <input type="date" className="input" value={subForm.currentPeriodEnd} onChange={(e) => setSubForm({ ...subForm, currentPeriodEnd: e.target.value })} />
              </div>
              <div>
                <label className="label">Custom Student Quota Override (blank = plan default)</label>
                <input type="number" className="input" value={subForm.studentQuotaOverride} onChange={(e) => setSubForm({ ...subForm, studentQuotaOverride: e.target.value })} placeholder="e.g. 2500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditSub(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Subscription</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment / Issue Invoice Modal */}
      {invoiceModalSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">Record SaaS Payment</h3>
              <button onClick={() => setInvoiceModalSub(null)}><FiX className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-500 mt-1">School: {invoiceModalSub.school?.name}</p>
            <form onSubmit={handleRecordInvoice} className="mt-4 space-y-4">
              <div>
                <label className="label">Amount Received (INR) *</label>
                <input required type="number" min={0} className="input" value={invForm.amount} onChange={(e) => setInvForm({ ...invForm, amount: e.target.value })} />
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select className="input" value={invForm.paymentMethod} onChange={(e) => setInvForm({ ...invForm, paymentMethod: e.target.value })}>
                  <option value="razorpay">Razorpay</option>
                  <option value="upi">UPI Direct</option>
                  <option value="bank_transfer">NEFT / RTGS Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="manual">Manual / Cash</option>
                </select>
              </div>
              <div>
                <label className="label">Transaction / UTR Reference</label>
                <input className="input font-mono" value={invForm.paymentReference} onChange={(e) => setInvForm({ ...invForm, paymentReference: e.target.value })} placeholder="pay_xxx / UTR12345" />
              </div>
              <div>
                <label className="label">Extend License By (Days)</label>
                <input type="number" min={1} className="input" value={invForm.extendDays} onChange={(e) => setInvForm({ ...invForm, extendDays: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setInvoiceModalSub(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Issue Invoice & Activate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ConsoleLayout>
  );
}
