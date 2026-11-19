import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import PageHeader from '../../components/PageHeader';
import SubNavTabs from '../../components/SubNavTabs';
import {
  FiHome, FiUpload, FiTrash2, FiCheckCircle, FiLayers, FiAward,
  FiFileText, FiRefreshCw, FiShield, FiImage, FiSave,
  FiCreditCard, FiGlobe, FiPhone, FiMail, FiMapPin
} from 'react-icons/fi';
import {
  getTemplateAssets,
  uploadTemplateAsset,
  deleteTemplateAsset,
  updateCompanyDetails
} from '../../api/templateAssetApi';
import { Card, Button, IconButton, Badge, PageLoading } from '../../components/ui';
import { toAbsoluteUrl } from '../../utils/url';

function DefaultAssetPreview({ assetKey, label }) {
  switch (assetKey) {
    case 'companySeal':
      return (
        <svg viewBox="0 0 160 160" className="w-24 h-24 text-amber-700/80 drop-shadow-xs" fill="none" stroke="currentColor">
          <circle cx="80" cy="80" r="74" strokeWidth="3" stroke="#b45309" strokeDasharray="3 3" />
          <circle cx="80" cy="80" r="68" strokeWidth="2.5" stroke="#92400e" />
          <circle cx="80" cy="80" r="50" strokeWidth="1.5" stroke="#b45309" />
          <path id="sealText" d="M 28 80 A 52 52 0 1 1 132 80" fill="none" />
          <text fontSize="7" fill="#92400e" fontWeight="700" letterSpacing="1.2">
            <textPath href="#sealText" startOffset="50%" textAnchor="middle">
              SES EDUCARE SERVICES PVT LTD
            </textPath>
          </text>
          <g transform="translate(80, 80) scale(0.9)">
            <polygon points="0,-16 4,-5 15,-5 7,2 10,13 0,7 -10,13 -7,2 -15,-5 -4,-5" fill="#d97706" />
            <text y="22" textAnchor="middle" fontSize="6.5" fill="#78350f" fontWeight="800">
              OFFICIAL SEAL
            </text>
          </g>
        </svg>
      );
    case 'logo':
      return (
        <div className="flex items-center gap-2.5 px-3 py-2 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-lg shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-amber-400 text-blue-950 font-black flex items-center justify-center text-base shadow-inner">
            SES
          </div>
          <div className="text-left">
            <div className="text-sm font-black tracking-wide leading-tight text-white">SES EDUCARE</div>
            <div className="text-[9px] text-amber-300 font-semibold tracking-wider uppercase">Services Pvt Ltd</div>
          </div>
        </div>
      );
    case 'superAdminSignature':
      return (
        <div className="text-center py-1">
          <svg viewBox="0 0 200 60" className="w-40 h-14 mx-auto text-blue-900">
            <path
              d="M 15 40 Q 40 10, 60 38 T 90 20 Q 120 45, 140 18 T 175 35"
              fill="none"
              stroke="#1e3a8a"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 20 46 Q 90 42, 180 44"
              fill="none"
              stroke="#1e3a8a"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Authorized Signatory • CEO
          </span>
        </div>
      );
    case 'controllerSignature':
      return (
        <div className="text-center py-1">
          <svg viewBox="0 0 200 60" className="w-40 h-14 mx-auto text-indigo-900">
            <path
              d="M 20 32 Q 50 12, 75 38 T 115 15 Q 145 42, 175 22"
              fill="none"
              stroke="#312e81"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M 25 45 Q 100 40, 170 43"
              fill="none"
              stroke="#312e81"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Controller of Examinations
          </span>
        </div>
      );
    case 'isoLogo':
      return (
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-1 shadow-md flex flex-col items-center justify-center text-center text-slate-900 border-2 border-amber-300">
          <div className="w-full h-full rounded-full border border-dashed border-amber-800/40 flex flex-col items-center justify-center p-1">
            <span className="text-[8px] font-black uppercase tracking-wider text-amber-950">Certified</span>
            <span className="text-xs font-black text-amber-950 leading-tight">ISO</span>
            <span className="text-[8px] font-bold text-amber-950">9001:2015</span>
          </div>
        </div>
      );
    case 'msmeLogo':
      return (
        <div className="px-3 py-1.5 rounded-lg border border-amber-200 bg-gradient-to-r from-orange-50 via-white to-emerald-50 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
          </div>
          <span className="text-xs font-black tracking-widest text-slate-800 block">MSME</span>
          <span className="text-[9px] font-semibold text-slate-500">UDYAM REGISTERED</span>
        </div>
      );
    case 'govtEmblem':
      return (
        <div className="text-center">
          <div className="w-10 h-10 mx-auto rounded-full bg-amber-50 border border-amber-300 flex items-center justify-center mb-1 text-amber-800">
            <FiShield className="w-5 h-5 text-amber-700" />
          </div>
          <span className="text-[10px] font-bold text-slate-700 uppercase block">Govt. of India</span>
          <span className="text-[9px] text-slate-500">MCA Recognized</span>
        </div>
      );
    case 'skillIndiaLogo':
      return (
        <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1 text-emerald-700 font-black text-xs mb-0.5">
            <FiAward className="w-3.5 h-3.5" /> Skill India
          </div>
          <span className="text-[9px] font-semibold text-emerald-800">कौशल भारत - कुशल भारत</span>
        </div>
      );
    case 'watermarkImage':
      return (
        <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
          <FiShield className="w-8 h-8 opacity-40 mb-1" />
          <span className="text-[9px] font-bold tracking-wider uppercase opacity-60">Security WM</span>
        </div>
      );
    case 'idCardHeaderBanner':
      return (
        <div className="w-full h-12 rounded-lg bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-700 p-2 flex items-center justify-between text-white shadow-inner">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black tracking-wide text-amber-300">SES</span>
            <span className="text-[10px] font-bold">STUDENT IDENTITY CARD</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
      );
    default:
      return (
        <div className="text-center text-slate-400">
          <FiImage className="w-8 h-8 mx-auto mb-1 opacity-50" />
          <span className="text-xs">Built-in vector default</span>
        </div>
      );
  }
}

export default function CompanyProfile({ embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'assets'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploadingKey, setUploadingKey] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);

  // Registration details form state
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    description: '',
    cin: '',
    isoNumber: '',
    registrationNumber: '',
    establishedYear: '',
    gstNumber: '',
    panNumber: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    phone: '',
    email: '',
    website: ''
  });

  const fileInputRefs = useRef({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getTemplateAssets();
      if (res.data?.success) {
        const payload = res.data.data;
        setAssets(payload.assets || []);
        const details = payload.companyDetails || {};
        setCompanyInfo(details);

        // Parse address if structured details available or fallback
        const addrDetails = details.addressDetails || {};
        let streetVal = addrDetails.street || '';
        let cityVal = addrDetails.city || '';
        let stateVal = addrDetails.state || '';
        let zipVal = addrDetails.zipCode || '';
        let countryVal = addrDetails.country || 'India';

        if (!streetVal && details.address) {
          const parts = details.address.split(',').map((s) => s.trim());
          if (parts.length >= 3) {
            streetVal = parts.slice(0, parts.length - 3).join(', ');
            cityVal = parts[parts.length - 3] || '';
            stateVal = parts[parts.length - 2] || '';
            const lastPart = parts[parts.length - 1] || '';
            const pinMatch = lastPart.match(/\b\d{6}\b/);
            zipVal = pinMatch ? pinMatch[0] : '';
          } else {
            streetVal = details.address;
          }
        }

        setFormData({
          name: details.name || '',
          legalName: details.legalName || details.name || '',
          description: details.description || '',
          cin: details.cin || '',
          isoNumber: details.isoNumber || 'ISO 9001:2015',
          registrationNumber: details.registrationNumber || '',
          establishedYear: details.establishedYear || '2024',
          gstNumber: details.gstNumber || '',
          panNumber: details.panNumber || '',
          street: streetVal,
          city: cityVal,
          state: stateVal,
          zipCode: zipVal,
          country: countryVal,
          phone: details.phone || '',
          email: details.email || '',
          website: details.website || ''
        });
      }
    } catch (err) {
      console.error('Error fetching template assets:', err);
      toast.error('Failed to load company details and branding assets');
    } finally {
      setLoading(false);
    }
  };

  // Submit Company Credentials
  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingDetails(true);
      const addressString = [formData.street, formData.city, formData.state, formData.zipCode, formData.country]
        .filter(Boolean)
        .join(', ');

      const payload = {
        name: formData.name,
        legalName: formData.legalName,
        description: formData.description,
        cin: formData.cin,
        isoNumber: formData.isoNumber,
        registrationNumber: formData.registrationNumber,
        establishedYear: formData.establishedYear,
        gstNumber: formData.gstNumber,
        panNumber: formData.panNumber,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        address: addressString,
        addressDetails: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country
        }
      };

      const res = await updateCompanyDetails(payload);
      if (res.data?.success) {
        toast.success('Company registration credentials updated successfully');
        await fetchData();
      } else {
        toast.error(res.data?.message || 'Failed to update credentials');
      }
    } catch (err) {
      console.error('Error updating company details:', err);
      toast.error(err.response?.data?.message || 'Failed to update company credentials');
    } finally {
      setSavingDetails(false);
    }
  };

  // Upload Asset (Logo, Seal, Signature, etc.)
  const handleAssetUpload = async (assetKey, file) => {
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|webp|svg\+xml)$/)) {
      toast.error('Please upload a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }

    try {
      setUploadingKey(assetKey);
      const data = new FormData();
      data.append('assetKey', assetKey);
      data.append('file', file);

      const res = await uploadTemplateAsset(data);
      if (res.data?.success) {
        toast.success(res.data.message || 'Asset uploaded successfully');
        await fetchData();
      } else {
        toast.error(res.data?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading asset:', err);
      toast.error(err.response?.data?.message || 'Failed to upload asset');
    } finally {
      setUploadingKey(null);
      if (fileInputRefs.current[assetKey]) {
        fileInputRefs.current[assetKey].value = '';
      }
    }
  };

  // Revert Asset to System Default
  const handleAssetRevert = async (assetKey) => {
    if (!window.confirm('Revert this asset to default built-in styling?')) return;

    try {
      setDeletingKey(assetKey);
      const res = await deleteTemplateAsset(assetKey);
      if (res.data?.success) {
        toast.success(res.data.message || 'Reverted to default built-in vector graphics');
        await fetchData();
      }
    } catch (err) {
      console.error('Error reverting asset:', err);
      toast.error(err.response?.data?.message || 'Failed to revert asset');
    } finally {
      setDeletingKey(null);
    }
  };

  const categories = [
    { id: 'all', label: 'All Branding Assets', count: assets.length },
    { id: 'identity', label: 'Logos & Watermarks', count: assets.filter((a) => a.category === 'identity').length },
    { id: 'signatures', label: 'Signatures & Seals', count: assets.filter((a) => a.category === 'signatures').length },
    { id: 'accreditation', label: 'Accreditations', count: assets.filter((a) => a.category === 'accreditation').length },
    { id: 'id_card', label: 'Student ID Card', count: assets.filter((a) => a.category === 'id_card').length }
  ];

  const filteredAssets =
    selectedCategory === 'all' ? assets : assets.filter((a) => a.category === selectedCategory);

  if (loading) {
    if (embedded) {
      return <PageLoading message="Loading company credentials & assets..." />;
    }
    return (
      <Layout>
        <PageHeader
          title="Company Profile & Assets"
          subtitle="Loading corporate credentials and official assets..."
          icon={FiHome}
        />
        <PageLoading message="Loading company credentials..." />
      </Layout>
    );
  }

  const content = (
    <div className={`space-y-6 ${embedded ? '' : 'max-w-7xl mx-auto pb-12'}`}>
      {/* Header (only when standalone) */}
      {!embedded && (
        <PageHeader
          title="Company Profile & Assets"
          subtitle="Manage official institute registration, legal credentials, and branding assets."
          icon={FiHome}
        />
      )}

      {/* Top Summary Banner - Clean & Light */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FiHome className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Entity name</p>
            <p className="text-sm font-semibold text-slate-900 truncate">{formData.name || 'SES Educare'}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FiShield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Corporate CIN</p>
            <p className="text-sm font-semibold text-slate-900 truncate">{formData.cin || 'N/A'}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FiAward className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Accreditation</p>
            <p className="text-sm font-semibold text-slate-900 truncate">{formData.isoNumber || 'ISO 9001:2015'}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FiLayers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Branding assets</p>
            <p className="text-sm font-semibold text-slate-900">
              {assets.filter((a) => a.isCustom).length} of {assets.length} customized
            </p>
          </div>
        </div>
      </div>

      {/* Compact Sub-Navigation Tabs */}
      <SubNavTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'details', label: 'School Information & Credentials', icon: FiHome },
          { id: 'assets', label: 'Official Branding & Seals', icon: FiLayers, badge: assets.length }
        ]}
      />

      {/* Clean Light Card for Content */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">

        {/* TAB 1: REGISTRATION & CREDENTIALS FORM */}
        {activeTab === 'details' && (
          <form onSubmit={handleDetailsSubmit} className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Official Entity & Incorporation Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These registration numbers, campus address, and contact details appear on official student marksheets, ID cards, and certificates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Brand Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Brand / Display name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  placeholder="e.g. SES Educare"
                />
              </div>

              {/* Legal Name */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full legal registered entity name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  placeholder="e.g. Startology Educare Services Private Limited"
                />
              </div>

              {/* CIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Corporate Identification Number (CIN) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.cin}
                  onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  placeholder="e.g. U78100CT2025PTC018743"
                />
              </div>

              {/* ISO Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ISO certification standard
                </label>
                <input
                  type="text"
                  value={formData.isoNumber}
                  onChange={(e) => setFormData({ ...formData, isoNumber: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  placeholder="e.g. ISO 9001:2015"
                />
              </div>

              {/* Registration / UDYAM */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Registration / MSME UDYAM number
                </label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  placeholder="e.g. UDYAM-CG-14-0012948"
                />
              </div>

              {/* Established Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Established year
                </label>
                <input
                  type="text"
                  value={formData.establishedYear}
                  onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  placeholder="e.g. 2024"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Helpline / phone number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  placeholder="e.g. 9165179272"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Official contact email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  placeholder="e.g. info@seseducare.com"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Official website URL
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  placeholder="e.g. www.seseducare.com"
                />
              </div>

              {/* GST */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  GSTIN (optional)
                </label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  placeholder="e.g. 22AAAAA0000A1Z5"
                />
              </div>

              {/* PAN */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  PAN number (optional)
                </label>
                <input
                  type="text"
                  value={formData.panNumber}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  placeholder="e.g. AAAAA0000A"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Entity description & slogan
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                placeholder="e.g. An ISO 9001:2015 Certified Educational Institution"
              />
            </div>

            {/* Address Details */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
                <FiMapPin className="text-primary-600 w-4 h-4" />
                Administrative Campus & Address Details
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                This exact address is printed on the backside of student ID cards and official marksheets.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Street address / building *</label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                    placeholder="e.g. First Floor, Gariyaband Road, Near SBI Bank"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">City *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                    placeholder="e.g. Rajim"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">State *</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                    placeholder="e.g. Chhattisgarh"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Postal code (PIN) *</label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                    placeholder="e.g. 493885"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                    placeholder="India"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button type="submit" loading={savingDetails} icon={FiSave}>
                Save Company Credentials
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: BRANDING ASSETS (LOGOS, SEALS, SIGNATURES) */}
        {activeTab === 'assets' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Official Branding Assets & Seals
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload official high-resolution logos, stamps, and signatures. If not uploaded, the system automatically uses built-in default graphics.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                      selectedCategory === c.id
                        ? 'bg-primary-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c.label}
                    <span className="text-[10px] opacity-75">({c.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAssets.map((asset) => {
                const isCustom = asset.isCustom;
                const isUploading = uploadingKey === asset.key;
                const isDeleting = deletingKey === asset.key;
                const assetLabel = asset.label || asset.title || asset.key;
                const assetUrl = asset.url || asset.currentUrl;

                return (
                  <div
                    key={asset.key}
                    className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between hover:border-slate-300 transition"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">{assetLabel}</h4>
                          <span className="text-xs text-slate-400 capitalize">
                            {asset.category?.replace('_', ' ')}
                          </span>
                        </div>
                        {isCustom ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <FiCheckCircle className="w-3 h-3" /> Custom
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                            System default
                          </span>
                        )}
                      </div>

                      {/* Image Preview Box */}
                      <div className="h-32 rounded-xl bg-slate-50/80 border border-dashed border-slate-200 flex items-center justify-center p-3 mb-3 overflow-hidden relative">
                        {assetUrl ? (
                          <>
                            <img
                              src={toAbsoluteUrl(assetUrl)}
                              alt={assetLabel}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }
                              }}
                            />
                            <div className="hidden w-full h-full items-center justify-center">
                              <DefaultAssetPreview assetKey={asset.key} label={assetLabel} />
                            </div>
                          </>
                        ) : (
                          <DefaultAssetPreview assetKey={asset.key} label={assetLabel} />
                        )}
                      </div>

                      {/* Description & Recommended Size */}
                      <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                        {asset.description}
                      </p>

                      <div className="text-[11px] text-slate-400 mb-3 space-y-1">
                        <p>
                          <span className="font-medium text-slate-600">Recommended:</span> {asset.recommendedSize || asset.recommendedFormat || 'PNG / JPG'}
                        </p>
                        {asset.usedIn?.length > 0 && (
                          <p>
                            <span className="font-medium text-slate-600">Used in:</span> {asset.usedIn.join(', ')}
                          </p>
                        )}
                        {asset.defaultNote && (
                          <p className="text-[10px] text-slate-400 italic pt-0.5">
                            {asset.defaultNote}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        ref={(el) => (fileInputRefs.current[asset.key] = el)}
                        onChange={(e) => handleAssetUpload(asset.key, e.target.files?.[0])}
                      />

                      <Button
                        variant="secondary"
                        size="sm"
                        icon={FiUpload}
                        loading={isUploading}
                        onClick={() => fileInputRefs.current[asset.key]?.click()}
                        className="flex-1"
                      >
                        {isCustom ? 'Replace image' : 'Upload image'}
                      </Button>

                      {isCustom && (
                        <IconButton
                          icon={FiTrash2}
                          variant="danger"
                          size="sm"
                          title="Revert to built-in default"
                          loading={isDeleting}
                          onClick={() => handleAssetRevert(asset.key)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <Layout>{content}</Layout>;
}
