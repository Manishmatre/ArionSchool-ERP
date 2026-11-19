import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiGlobe, FiLayers, FiUsers, FiActivity, FiShield, FiCheckCircle,
  FiAlertCircle, FiClock, FiPlus, FiArrowRight, FiRadio, FiServer,
  FiSearch, FiTrendingUp, FiCreditCard, FiSettings, FiRefreshCw
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import { HiSparkles } from 'react-icons/hi';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import { StatCard, Button, StatusBadge, TableWrapper, Table, TableHead, TableBody, TableRow, TableHeader, TableCell, TableEmpty, Modal } from '../../components/ui';
import api from '../../api/axios';
import { APP_VERSION } from '../../config/version';

export default function PlatformDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalSchools: 0,
    activeSchools: 0,
    trialSchools: 0,
    suspendedSchools: 0,
    expiredSchools: 0,
    totalStudents: 0,
    totalStaff: 0,
    totalRevenue: 0,
    systemVersion: APP_VERSION
  });
  const [schools, setSchools] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Broadcast Modal State
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastData, setBroadcastData] = useState({ title: '', message: '', priority: 'medium' });
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    fetchPlatformData();
  }, [statusFilter]);

  const fetchPlatformData = async () => {
    setLoading(true);
    try {
      const [overviewRes, schoolsRes] = await Promise.all([
        api.get('/platform-admin/overview'),
        api.get(`/platform-admin/schools?status=${statusFilter}`)
      ]);
      if (overviewRes.data?.data?.metrics) {
        setMetrics(overviewRes.data.data.metrics);
      }
      setSchools(schoolsRes.data?.data || []);
    } catch (error) {
      console.error('Failed to load platform data:', error);
      toast.error('Failed to load platform SaaS metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (schoolId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/platform-admin/schools/${schoolId}/status`, { status: nextStatus });
      toast.success(`School status updated to ${nextStatus}`);
      fetchPlatformData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update school status');
    }
  };

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    setBroadcasting(true);
    try {
      await api.post('/platform-admin/broadcast', broadcastData);
      toast.success('Platform announcement broadcasted to all schools');
      setBroadcastModalOpen(false);
      setBroadcastData({ title: '', message: '', priority: 'medium' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  const filteredSchools = schools.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.address?.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout
      title="Platform SaaS Super Admin"
      breadcrumbs="STARTOLOGY EDUCARE SERVICES PRIVATE LIMITED / Platform Overview"
      actions={(
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={FiRadio}
            onClick={() => setBroadcastModalOpen(true)}
            className="text-xs"
          >
            Broadcast to Schools
          </Button>
          <Button
            variant="secondary"
            icon={FiCreditCard}
            onClick={() => navigate('/super_admin/plans')}
            className="text-xs"
          >
            SaaS Plans
          </Button>
          <Button
            variant="primary"
            icon={FiPlus}
            onClick={() => navigate('/admin/campuses/add')}
            className="text-xs"
          >
            Register School
          </Button>
        </div>
      )}
    >
      <PageHeader />

      {/* 1. SaaS PLATFORM METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Schools & Tenants"
          value={metrics.totalSchools}
          icon={FiGlobe}
          tone="primary"
          subtitle={`${metrics.activeSchools} Active • ${metrics.trialSchools} Trial`}
          onClick={() => navigate('/admin/campuses')}
        />
        <StatCard
          title="Active Students Across SaaS"
          value={(metrics.totalStudents || 0).toLocaleString('en-IN')}
          icon={FiUsers}
          tone="indigo"
          subtitle="All enrolled school learners"
        />
        <StatCard
          title="Subscription Revenue (MRR/ARR)"
          value={`₹${(metrics.totalRevenue || 0).toLocaleString('en-IN')}`}
          icon={TbCurrencyRupee}
          tone="emerald"
          subtitle="Total platform collection"
          onClick={() => navigate('/super_admin/plans')}
        />
        <StatCard
          title="Platform Health & SLA"
          value="99.98%"
          icon={FiServer}
          tone="success"
          subtitle={`Engine v${metrics.systemVersion || APP_VERSION} • 0 Incidents`}
        />
      </div>

      {/* 2. SECONDARY METRICS / STATUS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Active Schools</span>
            <span className="text-xl font-black text-emerald-600">{metrics.activeSchools}</span>
          </div>
          <FiCheckCircle className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Trial Period</span>
            <span className="text-xl font-black text-amber-500">{metrics.trialSchools}</span>
          </div>
          <FiClock className="w-5 h-5 text-amber-500" />
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Suspended / Past Due</span>
            <span className="text-xl font-black text-rose-600">{metrics.suspendedSchools + metrics.expiredSchools}</span>
          </div>
          <FiAlertCircle className="w-5 h-5 text-rose-500" />
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Educators</span>
            <span className="text-xl font-black text-indigo-600">{metrics.totalStaff}</span>
          </div>
          <FiActivity className="w-5 h-5 text-indigo-500" />
        </div>
      </div>

      {/* 3. MULTI-TENANT SCHOOL DIRECTORY */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FiGlobe className="text-primary-600" />
              <span>Multi-Tenant School Directory</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live tenant isolation, subscription tier allocation, and administrative overrides.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search schools, codes, cities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 w-48 sm:w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>

            <button
              onClick={fetchPlatformData}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
              title="Refresh"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <TableWrapper>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>School & Campus Name</TableHeader>
                <TableHeader>Code</TableHeader>
                <TableHeader>Location</TableHeader>
                <TableHeader>Principal / Contact</TableHeader>
                <TableHeader>Active Students</TableHeader>
                <TableHeader>SaaS Plan</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSchools.length === 0 ? (
                <TableEmpty colSpan={8} message={loading ? 'Loading school directory...' : 'No school tenants found'} />
              ) : (
                filteredSchools.map((school) => {
                  const planName = school.subscription?.plan?.name || school.plan?.name || 'Starter School';
                  return (
                    <TableRow key={school._id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 font-bold flex items-center justify-center text-xs shrink-0 border border-primary-200">
                            {school.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{school.name}</span>
                            <span className="text-[11px] text-slate-400">{school.isMainBranch ? 'Main Campus' : 'Branch Campus'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {school.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-700">
                          {[school.address?.city, school.address?.state].filter(Boolean).join(', ') || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="font-medium text-slate-800">{school.owner?.name || school.admin?.name || 'Administrator'}</p>
                          <p className="text-[11px] text-slate-400">{school.contactInfo?.email || school.owner?.email || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {(school.activeStudentCount || 0).toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                          {planName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={school.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => navigate(`/admin/campuses/${school._id}`)}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          >
                            Manage
                          </button>
                          <button
                            onClick={() => handleStatusToggle(school._id, school.status)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                              school.status === 'active'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {school.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableWrapper>
      </div>

      {/* 4. BROADCAST MODAL */}
      {broadcastModalOpen && (
        <Modal
          isOpen={broadcastModalOpen}
          onClose={() => setBroadcastModalOpen(false)}
          title="Broadcast Platform Announcement"
        >
          <form onSubmit={handleBroadcastSubmit} className="space-y-4 text-xs">
            <p className="text-slate-500">
              Send an urgent platform-wide notification to all school administrators and principals across SES Educare SaaS.
            </p>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Announcement Headline *</label>
              <input
                type="text"
                required
                placeholder="e.g. Scheduled Maintenance & Board By-Law Updates"
                value={broadcastData.title}
                onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Announcement Details *</label>
              <textarea
                required
                rows={4}
                placeholder="Detailed announcement text..."
                value={broadcastData.message}
                onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority Level</label>
              <select
                value={broadcastData.priority}
                onChange={(e) => setBroadcastData({ ...broadcastData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="low">Low (General Notice)</option>
                <option value="medium">Medium (Standard Advisory)</option>
                <option value="high">High (Urgent Action Required)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setBroadcastModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={broadcasting}>Dispatch Broadcast</Button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
