import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiBell,
  FiCreditCard,
  FiMapPin,
  FiSettings,
  FiShield,
  FiUser,
} from 'react-icons/fi';
import Layout from '../../components/Layout';
import { Card, LoadingSpinner } from '../../components/ui';
import { getCampus } from '../../api/campusApi';
import { useAuth } from '../../context/AuthContext';

const SettingLink = ({ to, icon: Icon, title, description, action = 'Open' }) => (
  <Link to={to} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-primary-300 hover:bg-primary-50/30 hover:shadow-sm">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><Icon className="h-5 w-5" /></span>
    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span></span>
    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-700">{action}<FiArrowRight className="transition group-hover:translate-x-0.5" /></span>
  </Link>
);

const FranchiseSettings = () => {
  const { user } = useAuth();
  const rawFranchise = user?.franchise;
  const franchiseId = typeof rawFranchise === 'string'
    ? rawFranchise
    : rawFranchise?._id || rawFranchise?.id || user?.franchiseId;
  const [franchise, setFranchise] = useState(typeof rawFranchise === 'object' ? rawFranchise : null);
  const [loading, setLoading] = useState(Boolean(franchiseId));

  useEffect(() => {
    let cancelled = false;
    if (!franchiseId) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    getCampus(franchiseId)
      .then((response) => { if (!cancelled) setFranchise(response?.data || null); })
      .catch((error) => console.error('Could not load school settings:', error))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [franchiseId]);

  const address = [franchise?.address?.street, franchise?.address?.city, franchise?.address?.state, franchise?.address?.pincode]
    .filter(Boolean).join(', ');

  return (
    <Layout title="Campus Settings" breadcrumbs="School Admin / Settings">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-primary-50/60 p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700"><FiSettings className="h-5 w-5" /></span>
            <div><h1 className="text-lg font-bold text-slate-900">Campus Settings</h1><p className="mt-1 text-sm text-slate-600">Manage your school campus profile, administrator security, and preferences.</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><FiMapPin /></span><div><h2 className="text-sm font-bold text-slate-900">Campus Information</h2><p className="text-xs text-slate-500">Your school campus and branch details</p></div></div>
            {loading ? <div className="flex h-20 items-center justify-center"><LoadingSpinner /></div> : (
              <dl className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Campus name</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{franchise?.name || 'Not available'}</dd></div>
                <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Campus code</dt><dd className="mt-1 font-mono text-sm font-semibold text-slate-800">{franchise?.code || 'Not available'}</dd></div>
                <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Account status</dt><dd className="mt-1 text-sm font-semibold capitalize text-slate-800">{franchise?.status || 'Not available'}</dd></div>
                <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contact</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{franchise?.contactInfo?.phone || user?.mobile || 'Not available'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Address</dt><dd className="mt-1 text-sm text-slate-700">{address || 'Not available'}</dd></div>
              </dl>
            )}
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">For changes to registered campus or ownership details, contact school administration.</p>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><FiShield /></span><div><h2 className="text-sm font-bold text-slate-900">Account and security</h2><p className="text-xs text-slate-500">Keep your administrator account up to date</p></div></div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><FiUser className="text-slate-400" />{user?.name || 'School administrator'}</p>
              <p className="mt-1 break-all text-xs text-slate-500">{user?.email || 'Account email unavailable'}</p>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Update your profile and password, review recent sign-ins, and keep your contact number current.</p>
            <Link to="/school/profile" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-900">Profile and security <FiArrowRight /></Link>
          </Card>
        </div>

        <section className="space-y-3">
          <h2 className="px-1 text-sm font-bold text-slate-900">Portal preferences</h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <SettingLink to="/school/notifications" icon={FiBell} title="Notifications" description="View account notices and important updates for your school campus." />
            <SettingLink to="/school/academic-setup" icon={FiCreditCard} title="Academic Setup" description="Configure academic sessions, classes, sections, and subjects for your campus." />
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default FranchiseSettings;
