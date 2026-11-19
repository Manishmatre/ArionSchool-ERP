import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiShield, FiCpu, FiRefreshCw } from 'react-icons/fi';
import ConsoleLayout from '../components/ConsoleLayout';
import { platformApi } from '../api/platformApi';

export default function AuditPage() {
  const [tab, setTab] = useState('audit');
  const [logs, setLogs] = useState([]);
  const [aiData, setAiData] = useState({ recentLogs: [], summaryBySchool: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, aiRes] = await Promise.all([
        platformApi.getAuditLogs(),
        platformApi.getAiTelemetry()
      ]);
      setLogs(aRes.data?.data || []);
      setAiData(aiRes.data?.data || { recentLogs: [], summaryBySchool: [] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <ConsoleLayout
      title="Security Audit Trail & AI Usage Telemetry"
      subtitle="Monitor authentication sessions across all schools and track LLM token usage per tenant"
      actions={
        <button onClick={load} className="btn-secondary text-xs py-2 px-3">
          <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      }
    >
      <div className="inline-flex bg-white border border-slate-200 p-1 rounded-xl mb-5">
        <button
          onClick={() => setTab('audit')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
            tab === 'audit' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FiShield className="w-3.5 h-3.5" /> Security & Login Logs ({logs.length})
        </button>
        <button
          onClick={() => setTab('ai')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
            tab === 'ai' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FiCpu className="w-3.5 h-3.5" /> AI Copilot Telemetry ({aiData.recentLogs?.length || 0})
        </button>
      </div>

      {tab === 'audit' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                  <th className="py-3 px-4 font-bold">Timestamp</th>
                  <th className="py-3 px-4 font-bold">User</th>
                  <th className="py-3 px-4 font-bold">Role</th>
                  <th className="py-3 px-4 font-bold">School Tenant</th>
                  <th className="py-3 px-4 font-bold">IP / Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">No security activity recorded yet.</td></tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l._id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-slate-600">{new Date(l.createdAt).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{l.user?.name || 'System'}</p>
                        <p className="text-[11px] text-slate-500">{l.user?.email || l.email}</p>
                      </td>
                      <td className="py-3 px-4 uppercase font-semibold text-slate-700">{l.user?.role || l.role || '-'}</td>
                      <td className="py-3 px-4 text-slate-700">{l.school?.name || 'Global'}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{l.ipAddress || l.ip || '-'}</td>
                    </tr>
                  ))
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
                  <th className="py-3 px-4 font-bold">Timestamp</th>
                  <th className="py-3 px-4 font-bold">School</th>
                  <th className="py-3 px-4 font-bold">Module</th>
                  <th className="py-3 px-4 font-bold">Tokens</th>
                  <th className="py-3 px-4 font-bold">Latency</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(aiData.recentLogs || []).length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400">No AI copilot requests recorded yet.</td></tr>
                ) : (
                  aiData.recentLogs.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-slate-600">{new Date(r.createdAt).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{r.school?.name || 'Global'}</td>
                      <td className="py-3 px-4 text-slate-700">{r.module || 'assistant'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.totalTokens || 0}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{r.responseTimeMs || 0} ms</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {r.status || 'ok'}
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
    </ConsoleLayout>
  );
}
