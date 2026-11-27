import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import SubNavTabs from '../../components/SubNavTabs';
import {
  FiSliders, FiImage, FiDroplet, FiLogIn, FiLayout,
  FiMail, FiFileText, FiGlobe, FiEye, FiSave, FiRotateCcw,
  FiUploadCloud, FiCheck, FiInfo, FiExternalLink, FiShield,
  FiCpu, FiCreditCard, FiActivity, FiRefreshCw, FiAlertCircle
} from 'react-icons/fi';
import { Button, Card } from '../../components/ui';
import { useBranding } from '../../context/BrandingContext';
import api from '../../api/axios';
import { SES_DEFAULT_BRANDING } from '../../config/branding';
import { getAiUsageStats, getAiConfig } from '../../api/aiApi';
import { getRazorpayAdminConfig, getRazorpayTransactions } from '../../api/razorpayApi';

const THEME_LAYOUT_MODES = [
  {
    id: 'brand-chrome',
    name: 'Brand Chrome (Classic)',
    desc: 'Colored Sidebar & Header + Clean Light Workspace',
    preview: { sidebar: 'brand', header: 'brand', main: 'light' }
  },
  {
    id: 'sidebar-accent',
    name: 'Sidebar Only Colored',
    desc: 'Colored Sidebar + Crisp White Header & Light Main',
    preview: { sidebar: 'brand', header: 'light', main: 'light' }
  },
  {
    id: 'header-accent',
    name: 'Header Only Colored',
    desc: 'Colored Header + Clean Light Sidebar & Main',
    preview: { sidebar: 'light', header: 'brand', main: 'light' }
  },
  {
    id: 'tinted-studio',
    name: 'Header + Theme Tinted',
    desc: 'Colored Header + Brand-Tinted Sidebar & Main Canvas',
    preview: { sidebar: 'tint', header: 'brand', main: 'tint' }
  },
  {
    id: 'full-light',
    name: 'Pure Light Mode',
    desc: 'All-Daylight White Sidebar, Header & Workspace',
    preview: { sidebar: 'light', header: 'light', main: 'light' }
  },
  {
    id: 'full-dark',
    name: 'All Dark Mode (Noir)',
    desc: 'Full Dark Sidebar, Header, Cards, Tables & Inputs',
    preview: { sidebar: 'dark', header: 'dark', main: 'dark' }
  }
];

const PRESET_PALETTES = [
  { name: 'SES Navy (Default)', tag: 'Executive ERP', primary: '#0f172a', secondary: '#2563eb', accent: '#0ea5e9' },
  { name: 'Cambridge Blue', tag: 'Public School', primary: '#0c2d48', secondary: '#145da0', accent: '#2e8bc0' },
  { name: 'Convent Maroon', tag: 'Heritage K-12', primary: '#5c1118', secondary: '#9b1c26', accent: '#e05a65' },
  { name: 'Royal Crimson', tag: 'Senior Sec.', primary: '#881337', secondary: '#e11d48', accent: '#fb7185' },
  { name: 'Emerald Academy', tag: 'CBSE Modern', primary: '#064e3b', secondary: '#059669', accent: '#34d399' },
  { name: 'Montessori Sage', tag: 'Pre-Primary', primary: '#1b4332', secondary: '#2d6a4f', accent: '#52b788' },
  { name: 'Ivy League Green', tag: 'Boarding', primary: '#0f2e1d', secondary: '#15803d', accent: '#4ade80' },
  { name: 'Forest Pine', tag: 'Eco Campus', primary: '#14532d', secondary: '#16a34a', accent: '#4ade80' },
  { name: 'Oxford Slate', tag: 'Academic', primary: '#1e293b', secondary: '#475569', accent: '#38bdf8' },
  { name: 'Charcoal Executive', tag: 'Trust HQ', primary: '#18181b', secondary: '#2563eb', accent: '#60a5fa' },
  { name: 'Obsidian Noir', tag: 'Minimalist', primary: '#111827', secondary: '#374151', accent: '#9ca3af' },
  { name: 'Midnight Indigo', tag: 'Digital School', primary: '#1e1b4b', secondary: '#4f46e5', accent: '#818cf8' },
  { name: 'Sapphire Royal', tag: 'ICSE / ISC', primary: '#172554', secondary: '#1d4ed8', accent: '#60a5fa' },
  { name: 'STEM Cyber Blue', tag: 'Science & Tech', primary: '#0a192f', secondary: '#0284c7', accent: '#38bdf8' },
  { name: 'Oceanic Teal', tag: 'International', primary: '#134e4a', secondary: '#0d9488', accent: '#2dd4bf' },
  { name: 'Cobalt Cyan', tag: 'Smart Campus', primary: '#083344', secondary: '#0891b2', accent: '#22d3ee' },
  { name: 'Imperial Violet', tag: 'IB World', primary: '#3b0764', secondary: '#7c3aed', accent: '#c084fc' },
  { name: 'Deccan Plum', tag: 'Arts Academy', primary: '#3b185f', secondary: '#6d28d9', accent: '#a78bfa' },
  { name: 'Plum Berry', tag: 'Girls Convent', primary: '#4a044e', secondary: '#a21caf', accent: '#e879f9' },
  { name: 'Burgundy Prestige', tag: 'Foundation', primary: '#4c0519', secondary: '#be123c', accent: '#fda4af' },
  { name: 'Gurukul Ochre', tag: 'Vidyalaya', primary: '#6b2e08', secondary: '#c2410c', accent: '#f97316' },
  { name: 'Saffron Heritage', tag: 'Bharatiya', primary: '#7c2d12', secondary: '#ea580c', accent: '#fb923c' },
  { name: 'Amber Gold', tag: 'Prestige', primary: '#78350f', secondary: '#d97706', accent: '#fbbf24' },
  { name: 'Bronze Espresso', tag: 'Classic Hall', primary: '#451a03', secondary: '#b45309', accent: '#f59e0b' }
];

const SchoolBrandingSettings = () => {
  const { branding, saveBranding, resetToDefault, previewVisualTheme } = useBranding();
  const [activeTab, setActiveTab] = useState('identity');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Form State
  const [form, setForm] = useState(branding);

  // AI & Payment Settings State
  const [aiStats, setAiStats] = useState(null);
  const [aiConfig, setAiConfig] = useState(null);
  const [razorpayAdmin, setRazorpayAdmin] = useState(null);
  const [razorpayTxns, setRazorpayTxns] = useState([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingRzp, setLoadingRzp] = useState(false);

  const fetchAiData = async () => {
    setLoadingAi(true);
    try {
      const [statsRes, configRes] = await Promise.allSettled([
        getAiUsageStats(),
        getAiConfig()
      ]);
      if (statsRes.status === 'fulfilled') setAiStats(statsRes.value.data?.data);
      if (configRes.status === 'fulfilled') setAiConfig(configRes.value.data?.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  const fetchRazorpayData = async () => {
    setLoadingRzp(true);
    try {
      const [cfgRes, txnRes] = await Promise.allSettled([
        getRazorpayAdminConfig(),
        getRazorpayTransactions({ limit: 10 })
      ]);
      if (cfgRes.status === 'fulfilled') setRazorpayAdmin(cfgRes.value.data?.data);
      if (txnRes.status === 'fulfilled') setRazorpayTxns(txnRes.value.data?.data?.transactions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRzp(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai') fetchAiData();
    if (activeTab === 'payments') fetchRazorpayData();
  }, [activeTab]);

  useEffect(() => {
    if (branding) {
      setForm(branding);
    }
  }, [branding]);

  const handleIdentityChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      identity: { ...prev.identity, [field]: value }
    }));
  };

  const handleAddressChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      identity: {
        ...prev.identity,
        address: { ...(prev.identity?.address || {}), [field]: value }
      }
    }));
  };

  const handleContactChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      identity: {
        ...prev.identity,
        contact: { ...(prev.identity?.contact || {}), [field]: value }
      }
    }));
  };

  const handleVisualChange = (field, value) => {
    setForm((prev) => {
      const nextVisual = { ...prev.visual, [field]: value };
      if (field === 'primaryColor') {
        nextVisual.sidebarColor = value;
        nextVisual.headerColor = value;
      }
      previewVisualTheme(nextVisual);
      return { ...prev, visual: nextVisual };
    });
  };

  const applyPresetPalette = (palette) => {
    setForm((prev) => {
      const nextVisual = {
        ...prev.visual,
        primaryColor: palette.primary,
        secondaryColor: palette.secondary,
        accentColor: palette.accent,
        sidebarColor: palette.primary,
        headerColor: palette.primary
      };
      previewVisualTheme(nextVisual);
      return { ...prev, visual: nextVisual };
    });
    toast.info(`Previewing "${palette.name}" theme — click Save Branding to persist.`, { autoClose: 2200 });
  };

  const handleLoginChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      login: { ...prev.login, [field]: value }
    }));
  };

  const handleWhiteLabelChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      whiteLabel: { ...prev.whiteLabel, [field]: value }
    }));
  };

  const handleDocumentChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      document: { ...prev.document, [field]: value }
    }));
  };

  const handleEmailChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      email: { ...prev.email, [field]: value }
    }));
  };

  // Image upload handler
  const handleFileUpload = async (e, targetField) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image file exceeds maximum 2MB size limit');
      return;
    }

    const formData = new FormData();
    formData.append('asset', file);

    try {
      setUploadingLogo(true);
      const res = await api.post('/branding/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success && res.data?.url) {
        handleVisualChange(targetField, res.data.url);
        toast.success('Asset uploaded successfully');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload asset');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      await saveBranding(form);
      toast.success('School branding saved and applied across platform');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  // Reset
  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all branding to official Arion School defaults?')) {
      try {
        setSaving(true);
        await resetToDefault();
        setForm(SES_DEFAULT_BRANDING);
        toast.info('Branding reset to Arion School official defaults');
      } catch (err) {
        toast.error('Failed to reset branding');
      } finally {
        setSaving(false);
      }
    }
  };

  const tabs = [
    { id: 'identity', label: 'School Identity', icon: FiSliders },
    { id: 'logos', label: 'Logos', icon: FiImage },
    { id: 'colors', label: 'Colors & Theme', icon: FiDroplet },
    { id: 'login', label: 'Login Page', icon: FiLogIn },
    { id: 'portal', label: 'Portal UI', icon: FiLayout },
    { id: 'documents', label: 'Documents & PDF', icon: FiFileText },
    { id: 'email', label: 'Email', icon: FiMail },
    { id: 'domain', label: 'Domain', icon: FiGlobe },
    { id: 'preview', label: 'Live Preview', icon: FiEye },
    { id: 'ai', label: 'AI Engine', icon: FiCpu },
    { id: 'payments', label: 'Payments', icon: FiCreditCard }
  ];

  return (
    <Layout>
      <PageHeader
        title="School Branding & White-Label Settings"
        subtitle="Manage your institution's public branding, colors, logos, login page, and custom domain mapping."
        actions={
          <div className="flex items-center space-x-2.5">
            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={saving}
              className="flex items-center space-x-2"
            >
              <FiRotateCcw className="w-4 h-4" />
              <span>Reset to Default</span>
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2"
            >
              <FiSave className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Branding'}</span>
            </Button>
          </div>
        }
      />

      {/* Compact Sub-Navigation Tab Bar (matches main topbar) */}
      <SubNavTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: IDENTITY */}
      {activeTab === 'identity' && (
        <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Institution Identity & Profile</h3>
            <p className="text-sm text-slate-500">Legal school details displayed on transcripts, ID cards, and portal banners.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Official School Name *</label>
              <input
                type="text"
                value={form.identity?.schoolName || ''}
                onChange={(e) => handleIdentityChange('schoolName', e.target.value)}
                placeholder="e.g. The Vits School / Delhi Public School"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Short Name / Abbreviation</label>
              <input
                type="text"
                value={form.identity?.shortName || ''}
                onChange={(e) => handleIdentityChange('shortName', e.target.value)}
                placeholder="e.g. VITS / DPS"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">School Motto / Tagline</label>
              <input
                type="text"
                value={form.identity?.motto || ''}
                onChange={(e) => handleIdentityChange('motto', e.target.value)}
                placeholder="e.g. Empowering Minds, Building Futures"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Affiliation Board</label>
              <select
                value={form.identity?.affiliationBoard || 'CBSE'}
                onChange={(e) => handleIdentityChange('affiliationBoard', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="CBSE">Central Board of Secondary Education (CBSE)</option>
                <option value="ICSE">Council for the Indian School Certificate Examinations (ICSE)</option>
                <option value="State Board">State Board of Secondary Education</option>
                <option value="IB">International Baccalaureate (IB)</option>
                <option value="Cambridge">Cambridge International (IGCSE)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Registration / Affiliation Number</label>
              <input
                type="text"
                value={form.identity?.registrationNumber || ''}
                onChange={(e) => handleIdentityChange('registrationNumber', e.target.value)}
                placeholder="e.g. CBSE/AFF/2026/042"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Official Website URL</label>
              <input
                type="url"
                value={form.identity?.contact?.websiteUrl || ''}
                onChange={(e) => handleContactChange('websiteUrl', e.target.value)}
                placeholder="https://www.thevits.edu.in"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Contact Phone</label>
              <input
                type="text"
                value={form.identity?.contact?.phone || ''}
                onChange={(e) => handleContactChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Official Email</label>
              <input
                type="email"
                value={form.identity?.contact?.email || ''}
                onChange={(e) => handleContactChange('email', e.target.value)}
                placeholder="admissions@thevits.edu.in"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Campus Physical Address</label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={form.identity?.address?.street || ''}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="Street / Sector"
                  className="md:col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                />
                <input
                  type="text"
                  value={form.identity?.address?.city || 'Jabalpur'}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  placeholder="City"
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                />
                <input
                  type="text"
                  value={form.identity?.address?.state || 'Madhya Pradesh'}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                  placeholder="State"
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 2: LOGOS & IMAGES */}
      {activeTab === 'logos' && (
        <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Brand Assets & Logos</h3>
            <p className="text-sm text-slate-500">Upload high-resolution transparent PNG or SVG assets for dark and light surfaces.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Logo */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm text-slate-800">Primary School Logo</span>
                <span className="text-xs text-slate-500">Max 2MB (PNG / SVG)</span>
              </div>
              <div className="h-24 bg-white border border-dashed border-slate-300 rounded-lg flex items-center justify-center p-2">
                {form.visual?.logoUrl ? (
                  <img src={form.visual.logoUrl} alt="Primary Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Default Logo: Arion School</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  id="primary-logo-upload"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'logoUrl')}
                />
                <label
                  htmlFor="primary-logo-upload"
                  className="flex-1 text-center py-2 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 cursor-pointer transition"
                >
                  {uploadingLogo ? 'Uploading...' : 'Upload New Logo'}
                </label>
                {form.visual?.logoUrl && (
                  <button
                    onClick={() => handleVisualChange('logoUrl', '')}
                    className="text-xs text-rose-600 hover:underline px-2 py-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Favicon */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm text-slate-800">Browser Tab Favicon</span>
                <span className="text-xs text-slate-500">ICO / PNG (32x32)</span>
              </div>
              <div className="h-24 bg-white border border-dashed border-slate-300 rounded-lg flex items-center justify-center p-2">
                {form.visual?.faviconUrl ? (
                  <img src={form.visual.faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Default: /favicon.ico</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/x-icon,image/png,image/svg+xml"
                  id="favicon-upload"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'faviconUrl')}
                />
                <label
                  htmlFor="favicon-upload"
                  className="flex-1 text-center py-2 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 cursor-pointer transition"
                >
                  Upload Favicon
                </label>
                {form.visual?.faviconUrl && (
                  <button
                    onClick={() => handleVisualChange('faviconUrl', '')}
                    className="text-xs text-rose-600 hover:underline px-2 py-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 3: COLORS & THEME */}
      {activeTab === 'colors' && (
        <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-7">
          <div>
            <h3 className="text-base font-bold text-slate-900">Portal Appearance, Layout Mode & School Color Theme</h3>
            <p className="text-sm text-slate-500">Choose your surface layout (All Dark, Pure Light, Colored Sidebar Only, Colored Header Only, or Brand Tinted) and pair it with 24 curated K-12 School ERP palettes.</p>
          </div>

          {/* 1. Surface & Chrome Theme Layout Mode Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2.5">
              1. Portal Surface & Chrome Mode (Instant Live Preview)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {THEME_LAYOUT_MODES.map((mode) => {
                const currentMode = form.visual?.themeMode || 'brand-chrome';
                const isSelected = currentMode === mode.id;
                const brandFill = form.visual?.primaryColor || '#0f172a';
                const accentFill = form.visual?.secondaryColor || '#2563eb';
                const resolveRegion = (type) => {
                  if (type === 'brand') return brandFill;
                  if (type === 'dark') return '#0f172a';
                  if (type === 'tint') return `${accentFill}22`;
                  return '#ffffff';
                };
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleVisualChange('themeMode', mode.id)}
                    className={`p-3.5 border rounded-2xl text-left transition flex flex-col gap-3 ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50/60 ring-2 ring-primary-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-primary-400 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Mini App Wireframe Preview */}
                    <div className="w-full h-16 rounded-xl border border-slate-200 overflow-hidden flex shadow-2xs">
                      <div
                        className="w-1/4 h-full border-r border-black/10 p-1.5 flex flex-col gap-1"
                        style={{ backgroundColor: resolveRegion(mode.preview.sidebar) }}
                      >
                        <span className="h-1.5 w-3/4 rounded-full opacity-60" style={{ backgroundColor: mode.preview.sidebar === 'light' || mode.preview.sidebar === 'tint' ? accentFill : '#ffffff' }} />
                        <span className="h-1 w-full rounded-full opacity-35" style={{ backgroundColor: mode.preview.sidebar === 'light' || mode.preview.sidebar === 'tint' ? '#64748b' : '#ffffff' }} />
                        <span className="h-1 w-2/3 rounded-full opacity-35" style={{ backgroundColor: mode.preview.sidebar === 'light' || mode.preview.sidebar === 'tint' ? '#64748b' : '#ffffff' }} />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div
                          className="h-4 w-full border-b border-black/10 px-2 flex items-center justify-between"
                          style={{ backgroundColor: resolveRegion(mode.preview.header) }}
                        >
                          <span className="h-1.5 w-10 rounded-full opacity-70" style={{ backgroundColor: mode.preview.header === 'light' ? '#334155' : '#ffffff' }} />
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentFill }} />
                        </div>
                        <div
                          className="flex-1 p-2 flex items-center gap-1.5"
                          style={{ backgroundColor: mode.preview.main === 'dark' ? '#090e1a' : mode.preview.main === 'tint' ? `${accentFill}18` : '#f8fafc' }}
                        >
                          <span className="h-full flex-1 rounded-md border" style={{ backgroundColor: mode.preview.main === 'dark' ? '#111827' : '#ffffff', borderColor: mode.preview.main === 'dark' ? '#1f2937' : '#e2e8f0' }} />
                          <span className="h-full w-1/3 rounded-md border" style={{ backgroundColor: mode.preview.main === 'dark' ? '#111827' : '#ffffff', borderColor: mode.preview.main === 'dark' ? '#1f2937' : '#e2e8f0' }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{mode.name}</p>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{mode.desc}</p>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0">
                          <FiCheck className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Preset School ERP Color Palettes (24 Themes) */}
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2.5">
              2. Curated K-12 School ERP Palettes ({PRESET_PALETTES.length} Themes — Click for Live Preview)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PRESET_PALETTES.map((palette, i) => {
                const isSelected =
                  (form.visual?.primaryColor || '').toLowerCase() === palette.primary.toLowerCase() &&
                  (form.visual?.secondaryColor || '').toLowerCase() === palette.secondary.toLowerCase();
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyPresetPalette(palette)}
                    className={`p-3 border rounded-xl text-left transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50/70 ring-2 ring-primary-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-primary-400 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0">
                            <FiCheck className="w-3 h-3" />
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-800 truncate">{palette.name}</span>
                      </div>
                      {palette.tag && (
                        <span className="text-[10px] font-medium text-slate-400 block mt-0.5">{palette.tag}</span>
                      )}
                    </div>
                    <div className="flex space-x-1 shrink-0">
                      <span className="w-4 h-4 rounded-full border border-black/15 shadow-2xs" style={{ backgroundColor: palette.primary }} />
                      <span className="w-4 h-4 rounded-full border border-black/15 shadow-2xs" style={{ backgroundColor: palette.secondary }} />
                      <span className="w-4 h-4 rounded-full border border-black/15 shadow-2xs" style={{ backgroundColor: palette.accent }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Color Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Primary (Deep Navy)</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={form.visual?.primaryColor || '#0f172a'}
                  onChange={(e) => handleVisualChange('primaryColor', e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                />
                <input
                  type="text"
                  value={form.visual?.primaryColor || '#0f172a'}
                  onChange={(e) => handleVisualChange('primaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Secondary (Royal Blue)</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={form.visual?.secondaryColor || '#2563eb'}
                  onChange={(e) => handleVisualChange('secondaryColor', e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                />
                <input
                  type="text"
                  value={form.visual?.secondaryColor || '#2563eb'}
                  onChange={(e) => handleVisualChange('secondaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Accent (Cyan / Sky)</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={form.visual?.accentColor || '#0ea5e9'}
                  onChange={(e) => handleVisualChange('accentColor', e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                />
                <input
                  type="text"
                  value={form.visual?.accentColor || '#0ea5e9'}
                  onChange={(e) => handleVisualChange('accentColor', e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-800"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: LOGIN EXPERIENCE */}
      {activeTab === 'login' && (
        <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Login Portal Customization</h3>
            <p className="text-sm text-slate-500">Configure what students, parents, teachers, and admins see when signing in.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Login Welcome Title</label>
              <input
                type="text"
                value={form.login?.welcomeTitle || ''}
                onChange={(e) => handleLoginChange('welcomeTitle', e.target.value)}
                placeholder="Welcome to Delhi Public School"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Login Subtitle</label>
              <input
                type="text"
                value={form.login?.welcomeSubtitle || ''}
                onChange={(e) => handleLoginChange('welcomeSubtitle', e.target.value)}
                placeholder="Access your academic portal, grades, and fee receipts."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800"
              />
            </div>

            <div className="md:col-span-2 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="block font-semibold text-sm text-slate-800">Show Platform Attribution</span>
                <span className="text-xs text-slate-500">Displays "Powered by Arion School — STARTOLOGY EDUCARE SERVICES PRIVATE LIMITED" at the footer of login screens.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.login?.showPlatformAttribution !== false}
                  onChange={(e) => handleLoginChange('showPlatformAttribution', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 5: PORTAL BRANDING */}
      {activeTab === 'portal' && (
        <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Multi-Role Portal Verification</h3>
            <p className="text-sm text-slate-500">Each role automatically isolates data and renders this school's branding.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Super Admin', 'School Admin', 'Teacher', 'Student', 'Parent', 'Accountant', 'Principal', 'Receptionist'].map(role => (
              <div key={role} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-center space-x-3">
                <FiCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">{role}</div>
                  <div className="text-xs text-slate-500">Branded Portal Active</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 6: DOCUMENTS & PDF */}
      {activeTab === 'documents' && (
        <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Official Document & PDF Headers</h3>
            <p className="text-sm text-slate-500">Printed on Fee Receipts, Transfer Certificates, Marksheets, and Student ID Cards.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Report Header Text</label>
              <input
                type="text"
                value={form.document?.reportHeader || ''}
                onChange={(e) => handleDocumentChange('reportHeader', e.target.value)}
                placeholder="e.g. THE VITS SCHOOL, JABALPUR"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Authorized Signatory Title</label>
              <input
                type="text"
                value={form.document?.authorizedSignatoryTitle || ''}
                onChange={(e) => handleDocumentChange('authorizedSignatoryTitle', e.target.value)}
                placeholder="Principal / Controller of Examinations"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800"
              />
            </div>
          </div>
        </Card>
      )}

      {/* TAB 7: EMAIL BRANDING */}
      {activeTab === 'email' && (
        <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Outgoing Email Notifications</h3>
            <p className="text-sm text-slate-500">Branded signatures on fee reminders, attendance alerts, and exam schedules.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Sender Display Name</label>
              <input
                type="text"
                value={form.email?.senderName || ''}
                onChange={(e) => handleEmailChange('senderName', e.target.value)}
                placeholder="e.g. The Vits School Administration"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Email Footer Disclaimer</label>
              <input
                type="text"
                value={form.email?.footerText || ''}
                onChange={(e) => handleEmailChange('footerText', e.target.value)}
                placeholder="Official automated dispatch from School Management System."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800"
              />
            </div>
          </div>
        </Card>
      )}

      {/* TAB 8: DOMAIN & WHITE-LABEL */}
      {activeTab === 'domain' && (
        <Card className="p-6 bg-white border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Domain & Multi-Tenant Deployment</h3>
            <p className="text-sm text-slate-500">Route your custom school domain or subdomains directly to this tenant.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Assigned Subdomain</label>
              <div className="flex">
                <input
                  type="text"
                  value={form.whiteLabel?.subdomain || ''}
                  onChange={(e) => handleWhiteLabelChange('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="vits"
                  className="flex-1 px-3.5 py-2.5 bg-white border border-r-0 border-slate-200 rounded-l-xl text-sm font-mono text-slate-800"
                />
                <span className="inline-flex items-center px-3.5 rounded-r-xl border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm">
                  .seseducare.com
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Custom School Domain</label>
              <input
                type="text"
                value={form.whiteLabel?.customDomain || ''}
                onChange={(e) => handleWhiteLabelChange('customDomain', e.target.value.toLowerCase().trim())}
                placeholder="portal.thevits.edu.in"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono text-slate-800"
              />
            </div>
          </div>
        </Card>
      )}

      {/* TAB 9: REAL-TIME PREVIEW */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          <Card className="p-6 bg-white border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Live Real-Time Brand Preview</h3>
            
            {/* Mock Header */}
            <div
              className="p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between mb-6"
              style={{ backgroundColor: form.visual?.headerColor || '#ffffff' }}
            >
              <div className="flex items-center space-x-3">
                {form.visual?.logoUrl ? (
                  <img src={form.visual.logoUrl} alt="Logo" className="h-8 max-w-[140px] object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: form.visual?.primaryColor || '#0f172a' }}>
                    {(form.identity?.shortName || 'A')[0]}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{form.identity?.schoolName || 'Arion School'}</h4>
                  <p className="text-xs text-slate-500">{form.identity?.motto || 'One Platform. Complete School Management.'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: form.visual?.accentColor || '#0ea5e9' }} />
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: form.visual?.secondaryColor || '#2563eb' }}>
                  Live Theme Active
                </span>
              </div>
            </div>

            {/* Mock Login Card Preview */}
            <div className="max-w-md mx-auto p-6 rounded-2xl border border-slate-200 shadow-md bg-white text-center space-y-4">
              <div className="flex justify-center">
                {form.visual?.logoUrl ? (
                  <img src={form.visual.logoUrl} alt="Logo" className="h-10 object-contain" />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow" style={{ backgroundColor: form.visual?.primaryColor || '#0f172a' }}>
                    {(form.identity?.shortName || 'A')[0]}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">{form.login?.welcomeTitle || form.identity?.schoolName || 'Welcome'}</h4>
                <p className="text-xs text-slate-500 mt-1">{form.login?.welcomeSubtitle || 'Sign in to access your portal.'}</p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white shadow-sm transition"
                  style={{ backgroundColor: form.visual?.primaryColor || '#0f172a' }}
                >
                  Sign In to School Portal
                </button>
              </div>

              {form.login?.showPlatformAttribution !== false && (
                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  Powered by <span className="font-semibold text-slate-600">Arion School</span> — STARTOLOGY EDUCARE SERVICES PRIVATE LIMITED
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 10: AI ENGINE & USAGE MONITORING */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white">
                  <FiCpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">SES AI Engine Configuration & Usage</h3>
                  <p className="text-xs text-slate-500">Live LLM Provider metrics, token consumption, and module telemetry.</p>
                </div>
              </div>
              <Button variant="secondary" onClick={fetchAiData} loading={loadingAi} className="text-xs">
                <FiRefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Telemetry
              </Button>
            </div>

            {/* Provider Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-xs text-slate-500 font-medium">Configured LLM Provider</span>
                <h4 className="text-lg font-bold text-slate-900 uppercase mt-1">{aiConfig?.provider || 'Groq'}</h4>
                <div className="mt-2 flex items-center space-x-1.5 text-xs text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>API Connected & Verified</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-xs text-slate-500 font-medium">Active Model</span>
                <h4 className="text-sm font-mono font-bold text-primary-700 mt-1 truncate">{aiConfig?.model || 'openai/gpt-oss-120b'}</h4>
                <p className="text-[11px] text-slate-500 mt-2">High-speed reasoning & pedagogical analysis</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-xs text-slate-500 font-medium">Monthly Free Allocation</span>
                <h4 className="text-lg font-bold text-slate-900 mt-1">100,000 reqs</h4>
                <p className="text-[11px] text-slate-500 mt-2">Remaining: {aiStats?.quotaRemaining?.toLocaleString() || '100,000'}</p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500">Total AI Requests</span>
                <h4 className="text-2xl font-bold text-slate-900 mt-1">{aiStats?.totalRequests || 0}</h4>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500">Successful</span>
                <h4 className="text-2xl font-bold text-emerald-600 mt-1">{aiStats?.successRequests || 0}</h4>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500">Total Tokens</span>
                <h4 className="text-2xl font-bold text-primary-600 mt-1">{(aiStats?.totalTokens || 0).toLocaleString()}</h4>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500">Avg Response Time</span>
                <h4 className="text-2xl font-bold text-indigo-600 mt-1">{aiStats?.avgResponseTimeMs || 0} ms</h4>
              </div>
            </div>

            {/* Module Breakdown */}
            <div className="mt-6">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">AI Module Utilization</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {aiStats?.moduleStats?.length ? (
                  aiStats.moduleStats.map((m) => (
                    <div key={m._id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                      <span className="capitalize font-semibold text-slate-700">{m._id?.replace('_', ' ')}</span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-800">
                        {m.count} calls
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 sm:col-span-3">No module activity recorded yet. Start chatting with SES Copilot!</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 11: RAZORPAY PAYMENT GATEWAY MONITORING */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                  <FiCreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Razorpay Payment Gateway Monitoring</h3>
                  <p className="text-xs text-slate-500">Live transaction status, webhook verification, and settlement ledger.</p>
                </div>
              </div>
              <Button variant="secondary" onClick={fetchRazorpayData} loading={loadingRzp} className="text-xs">
                <FiRefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Gateway Data
              </Button>
            </div>

            {/* Gateway Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-xs text-slate-500 font-medium">Gateway Operating Mode</span>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                    {razorpayAdmin?.mode || 'TEST MODE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Real money is simulated in test mode.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-xs text-slate-500 font-medium">Configured Key ID</span>
                <h4 className="text-sm font-mono font-bold text-slate-900 mt-1">{razorpayAdmin?.keyId || 'rzp_test_...'}</h4>
                <div className="mt-2 flex items-center space-x-1 text-xs text-emerald-600 font-semibold">
                  <FiCheck className="w-3.5 h-3.5" />
                  <span>Public Key ID Active</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-xs text-slate-500 font-medium">Webhook Signature Verification</span>
                <div className="mt-1 flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold">
                  <FiShield className="w-4 h-4 text-emerald-600" />
                  <span>Raw HMAC SHA256 Verification Enabled</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 truncate" title={razorpayAdmin?.webhookUrl}>
                  URL: {razorpayAdmin?.webhookUrl || '/api/payments/razorpay/webhook'}
                </p>
              </div>
            </div>

            {/* Transaction Totals */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500">Total Online Transactions</span>
                <h4 className="text-2xl font-bold text-slate-900 mt-1">{razorpayAdmin?.stats?.total || 0}</h4>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500">Verified & Completed</span>
                <h4 className="text-2xl font-bold text-emerald-600 mt-1">{razorpayAdmin?.stats?.successful || 0}</h4>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500">Failed / Cancelled</span>
                <h4 className="text-2xl font-bold text-rose-600 mt-1">{razorpayAdmin?.stats?.failed || 0}</h4>
              </div>
            </div>

            {/* Recent Transaction Log Table */}
            <div className="mt-6">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Recent Online Gateway Transactions</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Receipt #</th>
                      <th className="px-4 py-2.5">Student</th>
                      <th className="px-4 py-2.5">Amount</th>
                      <th className="px-4 py-2.5">Gateway Order / Payment ID</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {razorpayTxns.length ? (
                      razorpayTxns.map((t) => (
                        <tr key={t._id}>
                          <td className="px-4 py-2.5 text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-2.5 font-mono font-bold text-primary-600">{t.receiptNumber}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-800">
                            {t.student?.personalInfo?.firstName} {t.student?.personalInfo?.lastName}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-900">INR {(t.amount || 0).toLocaleString()}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-500 text-[11px]">
                            {t.transactionDetails?.razorpayPaymentId || t.transactionDetails?.razorpayOrderId || 'N/A'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${
                              t.paymentStatus === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {t.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No online Razorpay transactions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default SchoolBrandingSettings;

