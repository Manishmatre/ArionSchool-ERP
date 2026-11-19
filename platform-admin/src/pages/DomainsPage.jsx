import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiGlobe, FiCheckCircle, FiAlertCircle, FiEdit2, FiX } from 'react-icons/fi';
import ConsoleLayout from '../components/ConsoleLayout';
import { platformApi } from '../api/platformApi';

export default function DomainsPage() {
  const [domains, setDomains] = useState([]);
  const [domainConfig, setDomainConfig] = useState({ primaryDomain: 'seseducare.com', appDomain: 'myapp.seseducare.com' });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ subdomain: '', customDomain: '', domainVerified: false });

  const load = async () => {
    setLoading(true);
    try {
      const [res, configRes] = await Promise.all([platformApi.getDomains(), platformApi.getConfig()]);
      setDomains(res.data?.data || []);
      setDomainConfig({
        primaryDomain: configRes.data?.data?.primaryDomain || 'seseducare.com',
        appDomain: configRes.data?.data?.appDomain || 'myapp.seseducare.com'
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      subdomain: d.subdomain || '',
      customDomain: d.customDomain || '',
      domainVerified: Boolean(d.domainVerified)
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await platformApi.updateDomain(editing._id, form);
      toast.success('Domain routing updated');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update domain');
    }
  };

  return (
    <ConsoleLayout
      title="Subdomains & Custom Domain DNS Registry"
      subtitle={`Manage school subdomains under ${domainConfig.primaryDomain} and custom school domains`}
    >
      <div className="card p-4 mb-5 bg-brand-50/50 border-brand-200 text-xs text-slate-700">
        Assign each school a unique portal prefix. Optional custom domains should point to <code className="font-mono text-brand-700">{domainConfig.appDomain}</code>; mark DNS verified after the record and HTTPS route are confirmed.
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                <th className="py-3.5 px-4 font-bold">School Tenant</th>
                <th className="py-3.5 px-4 font-bold">Platform Subdomain</th>
                <th className="py-3.5 px-4 font-bold">Custom White-Label Domain</th>
                <th className="py-3.5 px-4 font-bold">SSL / DNS Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Configure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400">Loading domain registry...</td></tr>
              ) : domains.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400">No school domains mapped yet.</td></tr>
              ) : (
                domains.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{d.name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{d.code}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-brand-700">
                      {d.subdomain ? `https://${d.subdomain}.${domainConfig.primaryDomain}` : <span className="text-slate-400">Not assigned</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {d.customDomain ? `https://${d.customDomain}` : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {d.domainVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          <FiCheckCircle className="w-3 h-3" /> Verified & Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <FiAlertCircle className="w-3 h-3" /> Pending DNS CNAME
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button onClick={() => openEdit(d)} className="btn-secondary text-xs py-1.5 px-3">
                        <FiEdit2 className="w-3.5 h-3.5" /> Edit Routing
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FiGlobe className="text-brand-600" /> Domain Mapping
              </h3>
              <button onClick={() => setEditing(null)}><FiX className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-500 mt-1">{editing.name}</p>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="label">Subdomain Prefix</label>
                <div className="flex items-center">
                  <input className="input rounded-r-none font-mono" value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value })} placeholder="proton" />
                  <span className="px-3 py-2.5 bg-slate-100 border border-l-0 border-slate-300 rounded-r-xl text-xs font-mono text-slate-600">.{domainConfig.primaryDomain}</span>
                </div>
              </div>
              <div>
                <label className="label">Custom Domain (CNAME Target: {domainConfig.appDomain})</label>
                <input className="input font-mono" value={form.customDomain} onChange={(e) => setForm({ ...form, customDomain: e.target.value })} placeholder="portal.schoolname.edu.in" />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.domainVerified} onChange={(e) => setForm({ ...form, domainVerified: e.target.checked })} className="w-4 h-4 accent-brand-600" />
                <span>Mark DNS & SSL Certificate as Verified</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Domain Config</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ConsoleLayout>
  );
}
