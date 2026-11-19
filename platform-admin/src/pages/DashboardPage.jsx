import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiLayers, FiUsers, FiDollarSign, FiInbox, FiActivity, FiServer,
  FiPlus, FiArrowRight, FiCheckCircle, FiAlertCircle, FiCpu, FiRefreshCw
} from 'react-icons/fi';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';
import ConsoleLayout from '../components/ConsoleLayout';
import { platformApi } from '../api/platformApi';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
const fmtINR = (n = 0) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await platformApi.getOverview();
      setData(res.data?.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load platform analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const m = data?.metrics || {};
  const health = data?.systemHealth || {};

  return (
    <ConsoleLayout
      title="Executive SaaS Dashboard"
      subtitle="Live multi-tenant telemetry, recurring revenue, and platform infrastructure health"
      actions={
        <>
          <button onClick={load} className="btn-secondary text-xs py-2 px-3">
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button onClick={() => navigate('/schools?provision=1')} className="btn-primary text-xs py-2 px-3.5">
            <FiPlus className="w-4 h-4" />
            <span>Provision School</span>
          </button>
        </>
      }
    >
      {loading && !data ? (
        <div className="py-20 text-center text-sm text-slate-500">Loading platform analytics...</div>
      ) : (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Schools / Tenants"
              value={m.totalSchools || 0}
              sub={`${m.activeSchools || 0} active • ${m.trialSchools || 0} trial • ${m.suspendedSchools || 0} suspended`}
              icon={FiLayers}
              tone="brand"
              onClick={() => navigate('/schools')}
            />
            <KpiCard
              label="Collected SaaS Revenue"
              value={fmtINR(m.totalRevenue)}
              sub={`Est. MRR: ${fmtINR(m.estimatedMrr)} • ARR: ${fmtINR(m.estimatedArr)}`}
              icon={FiDollarSign}
              tone="emerald"
              onClick={() => navigate('/billing')}
            />
            <KpiCard
              label="Platform Students & Staff"
              value={(m.totalStudents || 0).toLocaleString('en-IN')}
              sub={`${m.totalStaff || 0} staff • ${m.totalUsers || 0} total user accounts`}
              icon={FiUsers}
              tone="indigo"
              onClick={() => navigate('/users')}
            />
            <KpiCard
              label="School Demo Leads"
              value={m.totalLeads || 0}
              sub={`${m.newLeads || 0} awaiting follow-up • ${m.aiCallsCount || 0} AI calls`}
              icon={FiInbox}
              tone="amber"
              onClick={() => navigate('/leads')}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">SaaS Revenue & Onboarding Trend (6 Months)</h2>
                  <p className="text-xs text-slate-500">Paid invoice collections in INR across all school tenants</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.monthlySeries || []}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip formatter={(val) => fmtINR(val)} />
                    <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Plan Distribution + Live System Health */}
            <div className="space-y-6">
              <div className="card p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-3">Tenants by Plan</h2>
                {(data?.planDistribution || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">No active subscriptions yet</p>
                ) : (
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.planDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={66}
                          paddingAngle={4}
                        >
                          {data.planDistribution.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="space-y-1.5 mt-2">
                  {(data?.planDistribution || []).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="truncate max-w-[180px]">{item.name}</span>
                      </span>
                      <span className="font-bold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FiServer className="text-brand-600" />
                    <span>Live Infrastructure Health</span>
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    health.database === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {health.database === 'connected' ? 'Operational' : 'Degraded'}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <dt className="text-slate-400 text-[11px]">MongoDB Database</dt>
                    <dd className="font-bold text-slate-800 truncate mt-0.5">{health.dbName || 'Connected'}</dd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <dt className="text-slate-400 text-[11px]">API Version</dt>
                    <dd className="font-bold text-brand-600 mt-0.5">v{health.systemVersion || '2.0.73'}</dd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <dt className="text-slate-400 text-[11px]">Node Memory</dt>
                    <dd className="font-bold text-slate-800 mt-0.5">{health.memoryUsedMb || 0} MB</dd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <dt className="text-slate-400 text-[11px]">Server Uptime</dt>
                    <dd className="font-bold text-slate-800 mt-0.5">{Math.floor((health.uptimeSeconds || 0) / 60)}m</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Recent Schools & Recent Leads */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">Recently Provisioned Schools</h2>
                <button onClick={() => navigate('/schools')} className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1">
                  <span>View All</span>
                  <FiArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {(data?.recentSchools || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No schools provisioned yet.</p>
                ) : (
                  data.recentSchools.map((s) => (
                    <div key={s._id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{s.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {s.subdomain || s.code} • {s.board || 'CBSE'}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        s.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        s.status === 'suspended' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">Latest School Demo & Onboarding Leads</h2>
                <button onClick={() => navigate('/leads')} className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1">
                  <span>Open CRM</span>
                  <FiArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {(data?.recentLeads || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No inbound leads yet.</p>
                ) : (
                  data.recentLeads.map((l) => (
                    <div key={l._id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{l.schoolName}</p>
                        <p className="text-[11px] text-slate-500">
                          {l.contactName} • {l.phone} • {l.studentCount} students
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        l.status === 'converted' ? 'bg-emerald-100 text-emerald-700' :
                        l.status === 'new' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {l.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ConsoleLayout>
  );
}

function KpiCard({ label, value, sub, icon: Icon, tone, onClick }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 border-brand-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100'
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="card p-5 text-left hover:border-brand-300 hover:shadow-md transition group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-[11px] text-slate-500 mt-3 truncate">{sub}</p>
    </button>
  );
}
