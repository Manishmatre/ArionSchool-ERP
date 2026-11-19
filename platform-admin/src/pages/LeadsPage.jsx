import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiZap, FiEdit2, FiX, FiPhone, FiMail } from 'react-icons/fi';
import ConsoleLayout from '../components/ConsoleLayout';
import { platformApi } from '../api/platformApi';

const EMPTY_LEAD = {
  schoolName: '', contactName: '', designation: 'Principal', email: '', phone: '',
  city: '', state: '', studentCount: '500-1000', board: 'CBSE',
  requestedSubdomain: '', status: 'new', notes: ''
};

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_LEAD);

  const load = async () => {
    setLoading(true);
    try {
      const res = await platformApi.getLeads({ status: statusFilter });
      setLeads(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await platformApi.updateLead(editing._id, form);
        toast.success('Lead updated');
      } else {
        await platformApi.createLead(form);
        toast.success('Lead added to CRM');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleConvert = async (lead) => {
    if (!window.confirm(`Provision a school tenant for "${lead.schoolName}" and create its principal login?`)) return;
    try {
      const res = await platformApi.convertLead(lead._id, {});
      const creds = res.data?.data?.adminCredentials;
      toast.success(`Converted! Principal Login: ${creds?.email} / ${creds?.password}`, { autoClose: 8000 });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion failed');
    }
  };

  const handleDelete = async (lead) => {
    if (!window.confirm(`Delete lead "${lead.schoolName}"?`)) return;
    try {
      await platformApi.deleteLead(lead._id);
      toast.success('Lead deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <ConsoleLayout
      title="School Onboarding Leads"
      subtitle="Manage school demo requests, follow up with contacts, and provision school tenants when they are ready"
      actions={
        <button
          onClick={() => { setEditing(null); setForm(EMPTY_LEAD); setModalOpen(true); }}
          className="btn-primary text-xs py-2 px-4"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add School Lead</span>
        </button>
      }
    >
      <div className="flex flex-wrap gap-2 mb-5">
        {['all', 'new', 'contacted', 'demo_scheduled', 'proposal_sent', 'converted', 'lost'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize border transition ${
              statusFilter === st
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                <th className="py-3.5 px-4 font-bold">School & Subdomain</th>
                <th className="py-3.5 px-4 font-bold">Decision Maker</th>
                <th className="py-3.5 px-4 font-bold">School Size / Board</th>
                <th className="py-3.5 px-4 font-bold">Pipeline Stage</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400">Loading CRM leads...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400">No leads found in this stage.</td></tr>
              ) : (
                leads.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 text-sm">{l.schoolName}</p>
                      <p className="text-[11px] text-slate-500">
                        {l.board} • {[l.city, l.state].filter(Boolean).join(', ') || 'India'}
                        {l.requestedSubdomain && (
                          <span className="ml-2 font-mono text-brand-600">Portal requested: {l.requestedSubdomain}</span>
                        )}
                      </p>
                      {l.notes && <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{l.notes}</p>}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{l.contactName} <span className="font-normal text-slate-400">({l.designation})</span></p>
                      <p className="text-slate-500 flex items-center gap-1 mt-0.5"><FiMail className="w-3 h-3" /> {l.email}</p>
                      <p className="text-slate-500 flex items-center gap-1"><FiPhone className="w-3 h-3" /> {l.phone}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{l.studentCount} Students</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px] font-bold">
                        {l.board || 'Board not specified'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        l.status === 'converted' ? 'bg-emerald-100 text-emerald-700' :
                        l.status === 'new' ? 'bg-brand-100 text-brand-700' :
                        l.status === 'lost' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {l.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {l.status !== 'converted' && (
                          <button
                            onClick={() => handleConvert(l)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-xs"
                          >
                            <FiZap className="w-3 h-3" /> Convert to School
                          </button>
                        )}
                        <button
                          onClick={() => { setEditing(l); setForm({ ...EMPTY_LEAD, ...l }); setModalOpen(true); }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(l)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">{editing ? 'Update Lead' : 'Add School Lead'}</h3>
              <button onClick={() => setModalOpen(false)}><FiX className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div><label className="label">School Name *</label><input required className="input" value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} /></div>
                <div><label className="label">Contact Name *</label><input required className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
                <div><label className="label">Email *</label><input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><label className="label">Phone *</label><input required className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="label">City</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><label className="label">Requested Subdomain</label><input className="input font-mono" value={form.requestedSubdomain} onChange={(e) => setForm({ ...form, requestedSubdomain: e.target.value })} /></div>
                <div>
                  <label className="label">Pipeline Status</label>
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="demo_scheduled">Demo Scheduled</option>
                    <option value="proposal_sent">Proposal Sent</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>
              <div><label className="label">Sales / Onboarding Notes</label><textarea rows={3} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update Lead' : 'Create Lead'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ConsoleLayout>
  );
}
