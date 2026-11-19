import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiSave, FiSend, FiTrash2, FiAlertTriangle, FiSettings, FiBell } from 'react-icons/fi';
import ConsoleLayout from '../components/ConsoleLayout';
import { platformApi } from '../api/platformApi';

export default function SettingsPage() {
  const [config, setConfig] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: '', message: '', priority: 'high', link: '' });

  const load = async () => {
    try {
      const [cRes, bRes] = await Promise.all([
        platformApi.getConfig(),
        platformApi.getBroadcasts()
      ]);
      setConfig(cRes.data?.data || {});
      setBroadcasts(bRes.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load system settings');
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await platformApi.updateConfig(config);
      toast.success('Global SaaS platform configuration updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    try {
      await platformApi.createBroadcast(announcement);
      toast.success('Platform broadcast sent to all schools');
      setAnnouncement({ title: '', message: '', priority: 'high', link: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed');
    }
  };

  const handleDeleteBroadcast = async (id) => {
    if (!window.confirm('Remove this broadcast?')) return;
    try {
      await platformApi.deleteBroadcast(id);
      toast.success('Broadcast removed');
      load();
    } catch (err) {
      toast.error('Failed to delete broadcast');
    }
  };

  return (
    <ConsoleLayout
      title="Global System Config & Broadcasts"
      subtitle="Manage school platform domains, onboarding defaults, maintenance, and school-wide announcements"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Platform Settings */}
        <div className="card p-6">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <FiSettings className="text-brand-600" /> Global SaaS Configuration
          </h2>
          {!config ? (
            <p className="text-xs text-slate-400 py-8">Loading configuration...</p>
          ) : (
            <form onSubmit={handleSaveConfig} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Primary Marketing Domain</label>
                  <input className="input font-mono" value={config.primaryDomain || ''} onChange={(e) => setConfig({ ...config, primaryDomain: e.target.value })} />
                </div>
                <div>
                  <label className="label">ERP App Wildcard Domain</label>
                  <input className="input font-mono" value={config.appDomain || ''} onChange={(e) => setConfig({ ...config, appDomain: e.target.value })} />
                </div>
                <div>
                  <label className="label">Support Email</label>
                  <input className="input" value={config.supportEmail || ''} onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })} />
                </div>
                <div>
                  <label className="label">Support Phone</label>
                  <input className="input" value={config.supportPhone || ''} onChange={(e) => setConfig({ ...config, supportPhone: e.target.value })} />
                </div>
                <div>
                  <label className="label">Default Free Trial Days</label>
                  <input type="number" className="input" value={config.defaultTrialDays ?? 14} onChange={(e) => setConfig({ ...config, defaultTrialDays: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Razorpay Platform Mode</label>
                  <select className="input" value={config.razorpayMode || 'test'} onChange={(e) => setConfig({ ...config, razorpayMode: e.target.value })}>
                    <option value="test">Test / Sandbox</option>
                    <option value="live">Live Production</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-2">
                    <FiAlertTriangle className="text-amber-600" /> Platform Maintenance Mode
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(config.maintenanceMode)}
                    onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                    className="w-4 h-4 accent-amber-600"
                  />
                </label>
                <input
                  className="input text-xs"
                  value={config.maintenanceMessage || ''}
                  onChange={(e) => setConfig({ ...config, maintenanceMessage: e.target.value })}
                  placeholder="Maintenance banner message"
                />
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full">
                <FiSave className="w-4 h-4" />
                <span>{saving ? 'Saving Configuration...' : 'Save Global Settings'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Platform Broadcasts */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <FiBell className="text-brand-600" /> Broadcast Global Announcement
            </h2>
            <form onSubmit={handleBroadcast} className="mt-4 space-y-3.5">
              <div>
                <label className="label">Announcement Title *</label>
                <input required className="input" value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} placeholder="e.g. Scheduled Cloud Upgrade — Sunday 2:00 AM" />
              </div>
              <div>
                <label className="label">Message *</label>
                <textarea required rows={3} className="input" value={announcement.message} onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })} placeholder="Enter message visible to all school administrators..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={announcement.priority} onChange={(e) => setAnnouncement({ ...announcement, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="label">Optional Action URL</label>
                  <input className="input" value={announcement.link} onChange={(e) => setAnnouncement({ ...announcement, link: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                <FiSend className="w-4 h-4" />
                <span>Send Global Broadcast</span>
              </button>
            </form>
          </div>

          <div className="card p-6">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
              Recent Platform Broadcasts ({broadcasts.length})
            </h3>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {broadcasts.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No global announcements sent yet.</p>
              ) : (
                broadcasts.map((b) => (
                  <div key={b._id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{b.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{b.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(b.createdAt).toLocaleString('en-IN')} • Priority: {b.priority}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteBroadcast(b._id)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50">
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </ConsoleLayout>
  );
}
