import { useCallback, useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { PageLoading } from '../../components/ui';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import {
  FiActivity,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiLogIn,
  FiRefreshCw,
  FiSearch,
  FiShield,
} from 'react-icons/fi';

const PAGE_SIZE = 20;
const initialFilters = { search: '', eventType: '', role: '', startDate: '', endDate: '' };

const titleCase = (value = '') => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const ActivityLog = () => {
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivity = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const params = { page, limit: PAGE_SIZE };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const response = await api.get('/activity', { params });
      const body = response?.data ?? response;
      setActivities(Array.isArray(body?.data) ? body.data : []);
      setPagination(body?.pagination || { page, limit: PAGE_SIZE, total: body?.data?.length || 0, totalPages: 1 });
    } catch (error) {
      console.error('Could not load platform activity:', error);
      toast.error(error?.response?.data?.message || 'Could not load platform activity.');
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchActivity(), filters.search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchActivity, filters.search]);

  const updateFilter = (event) => {
    const { name, value } = event.target;
    setPage(1);
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters(initialFilters);
  };

  const pageActions = (
    <button
      type="button"
      onClick={() => fetchActivity(true)}
      disabled={refreshing}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
    >
      <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />Refresh
    </button>
  );

  return (
    <Layout title="Platform Activity" breadcrumbs="Settings / Activity" actions={pageActions}>
      <div className="space-y-5">
        <PageHeader title="Platform Activity" subtitle="Review account sign-ins and recorded platform actions" icon={FiActivity} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><FiActivity /></span>
              <div><p className="text-xs font-semibold text-slate-500">Matching events</p><p className="mt-0.5 text-xl font-bold text-slate-900">{pagination.total.toLocaleString('en-IN')}</p></div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><FiLogIn /></span>
              <div><p className="text-xs font-semibold text-slate-500">Shown on this page</p><p className="mt-0.5 text-xl font-bold text-slate-900">{activities.length} <span className="text-sm font-medium text-slate-400">/ {PAGE_SIZE}</span></p></div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><FiShield /></span>
              <div><p className="text-xs font-semibold text-slate-500">Audit coverage</p><p className="mt-0.5 text-sm font-bold text-slate-900">Sign-ins + API changes</p></div>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <FiFilter className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-800">Filter activity</h2>
            <button type="button" onClick={clearFilters} className="ml-auto text-xs font-semibold text-primary-700 hover:text-primary-900">Clear filters</button>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
            <label className="relative sm:col-span-2 xl:col-span-1">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input name="search" value={filters.search} onChange={updateFilter} placeholder="Search user, action, IP..." className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
            </label>
            <select name="eventType" value={filters.eventType} onChange={updateFilter} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100">
              <option value="">All activity</option><option value="action">Actions</option><option value="sign_in">Sign-ins</option>
            </select>
            <select name="role" value={filters.role} onChange={updateFilter} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100">
              <option value="">All roles</option><option value="super_admin">Super Admin</option><option value="franchise_admin">School Campus Admin</option><option value="student">Student</option>
            </select>
            <label className="relative">
              <FiCalendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input aria-label="From date" type="date" name="startDate" value={filters.startDate} onChange={updateFilter} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-2 text-sm text-slate-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
            </label>
            <label className="relative">
              <FiCalendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input aria-label="To date" type="date" name="endDate" value={filters.endDate} onChange={updateFilter} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-2 text-sm text-slate-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <div><h2 className="text-sm font-bold text-slate-900">Activity timeline</h2><p className="mt-0.5 text-xs text-slate-500">Newest events first · each page shows {PAGE_SIZE} records</p></div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{pagination.total.toLocaleString('en-IN')} total</span>
          </div>
          {loading ? <div className="p-5"><PageLoading message="Loading platform activity..." /></div> : activities.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <FiActivity className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-800">No matching activity yet</p>
              <p className="mt-1 text-xs text-slate-500">New successful sign-ins and authenticated API actions will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Activity</th><th className="px-4 py-3">Area</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">IP address</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activities.map((entry) => {
                    const isAction = entry.eventType === 'action';
                    const succeeded = isAction ? Number(entry.statusCode) < 400 : true;
                    const icon = isAction ? <FiActivity /> : <FiLogIn />;
                    const actionText = isAction
                      ? `${titleCase(entry.action || 'changed')} record in ${titleCase(entry.resource || 'platform')}`
                      : `Signed in with ${titleCase(entry.method || 'password')}`;
                    return (
                      <tr key={entry._id} className="align-top hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{new Date(entry.occurredAt).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{entry.user?.name || 'Deleted account'}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{entry.user?.email || 'Account unavailable'} · {titleCase(entry.user?.role || entry.role || 'unknown')}</p>
                          {(entry.franchise?.name || entry.user?.franchise?.name) && <p className="mt-0.5 text-[11px] text-slate-400">{entry.franchise?.name || entry.user?.franchise?.name}</p>}
                        </td>
                        <td className="max-w-[360px] px-4 py-3">
                          <div className="flex items-start gap-2">
                            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isAction ? 'bg-primary-50 text-primary-700' : 'bg-indigo-50 text-indigo-700'}`}>{icon}</span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800">{actionText}</p>
                              {isAction && <p className="mt-1 break-all font-mono text-[11px] text-slate-400">{entry.httpMethod} {entry.path}</p>}
                              <p className="mt-1 max-w-xs truncate text-[11px] text-slate-400" title={entry.userAgent || ''}>{entry.userAgent || 'Device details unavailable'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{isAction ? titleCase(entry.resource || 'platform') : 'Account access'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${succeeded ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{isAction ? `${succeeded ? 'Completed' : 'Failed'}${entry.statusCode ? ` · ${entry.statusCode}` : ''}` : 'Successful'}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">{entry.ipAddress || 'Unavailable'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Page {pagination.page || page} of {Math.max(1, pagination.totalPages || 1)}</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><FiChevronLeft />Previous</button>
              <button type="button" disabled={page >= (pagination.totalPages || 1) || loading} onClick={() => setPage((current) => current + 1)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Next<FiChevronRight /></button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default ActivityLog;
