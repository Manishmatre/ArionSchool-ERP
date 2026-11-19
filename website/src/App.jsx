import React, { useState } from 'react';
import {
  FiShield, FiZap, FiCheckCircle, FiUsers, FiCreditCard, FiAward,
  FiBookOpen, FiClock, FiActivity, FiArrowRight, FiCheck, FiCpu,
  FiFileText, FiLayers, FiDollarSign, FiGlobe, FiLock, FiStar,
  FiChevronDown, FiChevronUp, FiX, FiExternalLink, FiSmartphone,
  FiMail, FiPhone, FiMapPin, FiCalendar, FiSearch, FiSliders
} from 'react-icons/fi';
import { getApiBaseUrl } from './utils/api';

export default function App() {
  const [subdomainInput, setSubdomainInput] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState(null); // 'available' | 'checking' | null
  const [activePreviewTab, setActivePreviewTab] = useState('fees');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [demoFormData, setDemoFormData] = useState({
    name: '',
    schoolName: '',
    email: '',
    phone: '',
    studentCount: '500-1000',
    board: 'CBSE'
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [demoSuccess, setDemoSuccess] = useState('');
  const [subdomainError, setSubdomainError] = useState('');

  const handleCheckSubdomain = async (e) => {
    e.preventDefault();
    const clean = subdomainInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!clean) return;

    setSubdomainStatus('checking');
    setSubdomainError('');
    try {
      const response = await fetch(`${getApiBaseUrl()}/platform-admin/public/check-subdomain/${encodeURIComponent(clean)}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Could not check this school portal name.');
      setSubdomainStatus(payload);
    } catch (error) {
      setSubdomainStatus(null);
      setSubdomainError(error.message || 'Could not check this school portal name. Please try again.');
    }
  };

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setDemoError('');
    try {
      const response = await fetch(`${getApiBaseUrl()}/platform-admin/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: demoFormData.schoolName,
          contactName: demoFormData.name,
          email: demoFormData.email,
          phone: demoFormData.phone,
          studentCount: demoFormData.studentCount,
          board: demoFormData.board,
          requestedSubdomain: subdomainStatus?.available ? subdomainStatus.subdomain : ''
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || 'We could not submit your request. Please try again.');
      setDemoSuccess(payload.message || 'Your school demo request has been received. Our team will contact you.');
      setDemoFormData({ name: '', schoolName: '', email: '', phone: '', studentCount: '500-1000', board: 'CBSE' });
    } catch (error) {
      setDemoError(error.message || 'We could not submit your request. Please try again.');
    } finally {
      setDemoSubmitted(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-100 font-sans selection:bg-indigo-600 selection:text-white">
      {/* 1. SCHOOL ERP ANNOUNCEMENT */}
      <div className="bg-gradient-to-r from-amber-600 via-indigo-600 to-purple-600 text-white text-xs sm:text-sm font-semibold py-2.5 px-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide">
              SES Educare School ERP
            </span>
            <span>
              A connected platform for your school’s daily operations
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-amber-200 text-xs hidden md:inline">
              Admissions, academics, finance, communication and reporting
            </span>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="bg-white text-indigo-900 hover:bg-amber-100 px-3 py-1 rounded-md text-xs font-bold transition shadow-xs flex items-center gap-1"
            >
              <span>Book a Demo</span>
              <FiArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER / NAVIGATION */}
      <header className="border-b border-slate-800/80 bg-[#0A0E1A]/90 backdrop-blur-md sticky top-[41px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
              S
            </div>
            <div>
              <span className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
                SES Educare
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded">
                  ERP
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium">School Management ERP</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition">ERP Modules</a>
            <a href="#subdomains" className="hover:text-white transition">School Subdomains</a>
            <a href="#live-previews" className="hover:text-white transition">Live Previews</a>
            <a href="#pricing" className="text-amber-300 hover:text-amber-200 font-bold transition flex items-center gap-1">
              <span>Request a Demo</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            </a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={import.meta.env.VITE_LMS_BASE_URL || 'https://myapp.seseducare.com'}
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg border border-slate-700 hover:border-slate-500 transition"
            >
              School Portal Login
            </a>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6 shadow-inner">
            <FiZap className="text-amber-400" />
            <span>School and campus management • Role-based access • Connected operations</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
            The Intelligent School ERP Built for{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300 bg-clip-text text-transparent">
              Modern Educational Excellence
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Automate student admissions, multi-head Razorpay fee collection, anti-cheat exam seating,
            CBSE/State CCE report cards, RFID attendance, and Teacher AI copilot on your school's own dedicated portal.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 group"
            >
              <span>Request a School Demo</span>
              <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
            <a
              href="#live-previews"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              <FiActivity className="text-indigo-400 w-4 h-4" />
              <span>Explore Live ERP Previews</span>
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-14 pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {['Admissions', 'Attendance', 'Fees', 'Academics'].map((module) => (
              <div key={module}>
                <p className="text-lg sm:text-xl font-extrabold text-white">{module}</p>
                <p className="text-xs text-slate-400 mt-1">Connected school workflow</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SUBDOMAIN CLAIMER SECTION */}
      <section id="subdomains" className="py-16 bg-[#0E1322] border-y border-slate-800/80 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-900/40 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-3">
            <FiGlobe className="w-3.5 h-3.5" />
            <span>Dedicated School Domain</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Claim Your School’s Dedicated Cloud Portal
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            Every school gets its own isolated branded subdomain with independent logins for Super Admins, Teachers, Accountants, Parents, and Students.
          </p>

          <form onSubmit={handleCheckSubdomain} className="mt-8 max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="e.g. dps-delhi, stmarys-pune"
                value={subdomainInput}
                onChange={(e) => {
                  setSubdomainInput(e.target.value);
                  setSubdomainStatus(null);
                }}
                className="w-full px-4 py-3 bg-[#131b2e] border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-md shadow-indigo-600/30 whitespace-nowrap"
            >
              Check Availability
            </button>
          </form>

      {subdomainStatus && typeof subdomainStatus === 'object' && (
            <div className="mt-4 p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/40 max-w-xl mx-auto text-left animate-fade-in flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <FiCheckCircle className="w-4 h-4" />
                  <span>{subdomainStatus.available ? 'School portal name is available' : 'School portal name is unavailable'}</span>
                </p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">
                  {subdomainStatus.subdomain}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {subdomainStatus.message || 'You can request this portal name during school onboarding.'}
                </p>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shrink-0"
              >
                Request a demo
              </button>
            </div>
          )}
          {subdomainError && <p role="alert" className="mt-3 text-sm text-rose-300">{subdomainError}</p>}
        </div>
      </section>

      {/* 5. AUTHENTIC & REALISTIC ERP LIVE PREVIEWS */}
      <section id="live-previews" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/40 text-purple-400 text-xs font-bold uppercase tracking-wider mb-3">
            <FiSliders className="w-3.5 h-3.5" />
            <span>Workflow Examples</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            School Workflow Previews
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-2">
            Explore the workflows available in SES Educare School ERP.
          </p>

          {/* Tab Selector */}
          <div className="mt-8 inline-flex p-1 rounded-xl bg-[#131b2e] border border-slate-800 overflow-x-auto max-w-full">
            {[
              { id: 'fees', label: 'Fee Counter & Razorpay', icon: FiCreditCard },
              { id: 'reportcard', label: 'CBSE CCE Report Card', icon: FiAward },
              { id: 'attendance', label: 'RFID Attendance & WhatsApp', icon: FiClock },
              { id: 'ai-copilot', label: 'Teacher AI Copilot', icon: FiCpu },
              { id: 'tc', label: 'Transfer Certificate (TC)', icon: FiFileText },
              { id: 'seating', label: 'Anti-Cheat Seating', icon: FiShield },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activePreviewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Multi-Head Fee Desk & Razorpay */}
        {activePreviewTab === 'fees' && (
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-start justify-between gap-6 pb-6 border-b border-slate-800">
              <div>
                <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider border border-indigo-500/20">
                  Fee Management Module
                </span>
                <h3 className="text-xl font-bold text-white mt-2">
                  Multi-Head Counter & Automated Razorpay Invoicing
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Handles granular fee breakdowns (Tuition, Lab, Smart Class, Bus) with auto-receipt QR generation.
                </p>
              </div>
              <div className="bg-emerald-950/60 border border-emerald-500/30 px-4 py-2 rounded-xl text-right">
                <span className="text-[11px] text-emerald-300 block font-semibold">Payment Gateway</span>
                <span className="text-xs font-bold text-white flex items-center gap-1.5 justify-end mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Razorpay UPI / NetBanking Active
                </span>
              </div>
            </div>

            {/* Simulated Receipt Preview */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-[#0A0E1A] rounded-xl border border-slate-800/90 p-5">
                <div className="flex justify-between items-start pb-4 border-b border-slate-800 text-xs">
                  <div>
                    <p className="font-bold text-white">Student: Aarav Sharma</p>
                    <p className="text-slate-400">Class: 10th - Section A | Roll: #1042</p>
                    <p className="text-slate-400">Admission No: ADM-2026-089</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      PAID IN FULL
                    </span>
                    <p className="text-slate-400 text-[11px] mt-1">Receipt: #REC-2026-1402</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
                    <span>1. Quarterly Tuition Fee (Q3)</span>
                    <span className="font-mono font-bold text-white">₹14,500.00</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
                    <span>2. Composite Science & Computer Lab Fee</span>
                    <span className="font-mono font-bold text-white">₹2,800.00</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
                    <span>3. AC Bus Transportation (Route #4)</span>
                    <span className="font-mono font-bold text-white">₹3,200.00</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60 text-slate-300">
                    <span>4. Smart Class & Library Digital Access</span>
                    <span className="font-mono font-bold text-white">₹1,100.00</span>
                  </div>
                  <div className="flex justify-between pt-3 font-bold text-sm text-white">
                    <span>Total Amount Paid</span>
                    <span className="text-emerald-400 font-mono">₹21,600.00</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0E1A] rounded-xl border border-slate-800/90 p-5 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Instant Parent WhatsApp Alert
                  </p>
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-lg text-xs text-slate-200 leading-relaxed font-sans">
                    <p className="text-emerald-400 font-bold mb-1">💬 SES Educare School Updates</p>
                    Dear Parent, payment of <strong>₹21,600</strong> for Aarav Sharma (Class 10-A) is received with thanks.
                    <p className="mt-2 text-[11px] text-indigo-300 underline cursor-pointer">
                      Download Official GST Receipt PDF
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                  Automated Razorpay Webhook updates student ledger instantly with zero manual bookkeeping.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: CBSE CCE Report Card */}
        {activePreviewTab === 'reportcard' && (
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl max-w-5xl mx-auto">
            <div className="pb-6 border-b border-slate-800">
              <span className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-wider border border-purple-500/20">
                Examination & Grading Module
              </span>
              <h3 className="text-xl font-bold text-white mt-2">
                CBSE 9-Point CCE Scholastic & Co-Scholastic Report Card
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Calculates periodic tests, notebook submissions, subject enrichment, term exams, and discipline grades automatically.
              </p>
            </div>

            <div className="mt-6 bg-[#0A0E1A] rounded-xl border border-slate-800/90 overflow-hidden text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#131b2e] text-slate-300 border-b border-slate-800">
                      <th className="py-2.5 px-4 font-bold">Subject</th>
                      <th className="py-2.5 px-3 font-semibold text-center">PT (10)</th>
                      <th className="py-2.5 px-3 font-semibold text-center">NB (5)</th>
                      <th className="py-2.5 px-3 font-semibold text-center">SE (5)</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Term (80)</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Total (100)</th>
                      <th className="py-2.5 px-4 font-bold text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-white">English Language & Literature</td>
                      <td className="text-center font-mono">9.5</td>
                      <td className="text-center font-mono">5.0</td>
                      <td className="text-center font-mono">4.5</td>
                      <td className="text-center font-mono">74.0</td>
                      <td className="text-center font-mono font-bold text-white">93.0</td>
                      <td className="text-center font-bold text-emerald-400">A1</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-white">Mathematics Standard</td>
                      <td className="text-center font-mono">9.0</td>
                      <td className="text-center font-mono">5.0</td>
                      <td className="text-center font-mono">5.0</td>
                      <td className="text-center font-mono">76.0</td>
                      <td className="text-center font-mono font-bold text-white">95.0</td>
                      <td className="text-center font-bold text-emerald-400">A1</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-white">Science (Physics / Chem / Bio)</td>
                      <td className="text-center font-mono">8.5</td>
                      <td className="text-center font-mono">4.5</td>
                      <td className="text-center font-mono">4.5</td>
                      <td className="text-center font-mono">71.0</td>
                      <td className="text-center font-mono font-bold text-white">88.5</td>
                      <td className="text-center font-bold text-indigo-400">A2</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-bold text-white">Social Science</td>
                      <td className="text-center font-mono">9.0</td>
                      <td className="text-center font-mono">5.0</td>
                      <td className="text-center font-mono">5.0</td>
                      <td className="text-center font-mono">72.0</td>
                      <td className="text-center font-mono font-bold text-white">91.0</td>
                      <td className="text-center font-bold text-emerald-400">A1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-[#131b2e] border-t border-slate-800 flex flex-wrap justify-between items-center text-[11px] text-slate-400 gap-2">
                <span>Overall Result: <strong className="text-emerald-400">PASSED • 91.87% (Grade A1)</strong></span>
                <span>Principal Cryptographic Signature: <strong className="text-white font-mono">VERIFIED [SHA-256]</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: RFID Attendance & WhatsApp */}
        {activePreviewTab === 'attendance' && (
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl max-w-5xl mx-auto">
            <div className="pb-6 border-b border-slate-800">
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                Gate & Classroom Attendance
              </span>
              <h3 className="text-xl font-bold text-white mt-2">
                RFID Tap-In & Parent WhatsApp Dispatcher
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Real-time sync between school gate readers and cloud database with auto-notifications sent to guardians.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0A0E1A] p-5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                  <span className="font-bold text-white">Gate Terminal #01 (Main Entry)</span>
                  <span className="text-emerald-400 font-mono font-bold">ONLINE ●</span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#131b2e] border border-slate-800">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-white">Priya Patel (Class 8-B)</p>
                      <p className="text-slate-400">RFID: 004829104 • 07:51:22 AM</p>
                    </div>
                    <span className="ml-auto text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      ON TIME
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#131b2e] border border-slate-800">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-white">Aarav Sharma (Class 10-A)</p>
                      <p className="text-slate-400">RFID: 004829105 • 07:54:10 AM</p>
                    </div>
                    <span className="ml-auto text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      ON TIME
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0E1A] p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Guardian Notification Dispatcher
                  </p>
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-lg text-xs text-slate-200 leading-relaxed font-sans">
                    <p className="text-emerald-400 font-bold mb-1">📲 WhatsApp Gate Pass</p>
                    Dear Mr. Sharma, your ward <strong>Aarav Sharma</strong> has safely entered the school campus at <strong>07:54 AM</strong> today.
                    <p className="mt-2 text-[10px] text-slate-400">
                      Class Teacher: Mrs. Sunita Verma | Status: Present
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  Zero SMS costs: Leverage official WhatsApp Cloud API templates for instant high-delivery parent engagement.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Teacher AI Copilot */}
        {activePreviewTab === 'ai-copilot' && (
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl max-w-5xl mx-auto">
            <div className="pb-6 border-b border-slate-800">
              <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-500/20">
                AI Pedagogical Intelligence
              </span>
              <h3 className="text-xl font-bold text-white mt-2">
                Teacher AI Copilot: Lesson Plans & Quiz Generation
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Generates 45-minute lesson plans, blackboard flowcharts, and Bloom's Taxonomy question banks aligned with CBSE NCERT curriculum.
              </p>
            </div>

            <div className="mt-6 bg-[#0A0E1A] p-5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-3 font-sans">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-white">Lesson Plan: Reflection of Light & Spherical Mirrors</span>
                <span className="text-indigo-400 font-semibold">Subject: Class 10 Science (Physics)</span>
              </div>
              <div className="space-y-2">
                <p><strong className="text-white">Learning Objectives:</strong> Students will be able to distinguish between concave and convex mirrors, apply mirror formula \(\frac{1}{f} = \frac{1}{v} + \frac{1}{u}\), and construct ray diagrams.</p>
                <p><strong className="text-white">Classroom Time Split (45 Mins):</strong></p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>0-10 Min: Concept Hook — Why does a spoon invert your image?</li>
                  <li>10-25 Min: Blackboard derivation of focal length and principal focus.</li>
                  <li>25-35 Min: Interactive ray diagram practice with students.</li>
                  <li>35-45 Min: 5-Question AI Exit Ticket Quiz.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Transfer Certificate (TC) */}
        {activePreviewTab === 'tc' && (
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl max-w-5xl mx-auto">
            <div className="pb-6 border-b border-slate-800">
              <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/20">
                Regulatory Compliance
              </span>
              <h3 className="text-xl font-bold text-white mt-2">
                CBSE School Transfer Certificate (TC) & Bonafide
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Official, tamper-proof student transfer certificates with live QR verification and digital signature verification.
              </p>
            </div>

            <div className="mt-6 bg-[#0A0E1A] p-5 rounded-xl border border-slate-800 text-xs space-y-3">
              <div className="flex justify-between items-start pb-3 border-b border-slate-800">
                <div>
                  <h4 className="font-bold text-white text-sm">TRANSFER CERTIFICATE (TC)</h4>
                  <p className="text-slate-400">TC Number: TC-2026-0041 • Affiliation No: 1030492</p>
                </div>
                <div className="p-2 bg-white rounded-md text-black font-mono font-bold text-[10px] text-center">
                  [ QR VERIFIED ]
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-slate-300">
                <div>Pupil Name: <strong className="text-white">Rohan Mehra</strong></div>
                <div>Father's Name: <strong className="text-white">Rajesh Mehra</strong></div>
                <div>Admission No: <strong className="text-white">ADM-2022-512</strong></div>
                <div>Class in which Pupil studied: <strong className="text-white">Class 10 (Tenth)</strong></div>
                <div>School / Board Annual Exam Taken: <strong className="text-white">Passed AISSE 2026</strong></div>
                <div>Whether Failed, once/twice: <strong className="text-white">No</strong></div>
                <div>Month up to which school dues paid: <strong className="text-white">March 2026 (Clear)</strong></div>
                <div>Total No. of Working Days: <strong className="text-white">224 Days (Present: 211)</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Anti-Cheat Seating */}
        {activePreviewTab === 'seating' && (
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl max-w-5xl mx-auto">
            <div className="pb-6 border-b border-slate-800">
              <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 text-xs font-bold uppercase tracking-wider border border-rose-500/20">
                Examination Security
              </span>
              <h3 className="text-xl font-bold text-white mt-2">
                Automated Anti-Cheat Exam Hall Seating Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Randomizes desk allocation across rooms so adjacent desks never share the same class, paper set, or subject.
              </p>
            </div>

            <div className="mt-6 bg-[#0A0E1A] p-5 rounded-xl border border-slate-800">
              <p className="text-xs font-bold text-white mb-3">Examination Hall #3 (Row 1 - Row 3 Matrix)</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                {[
                  { desk: 'Desk 1', std: 'Class 9-A', code: 'SET A' },
                  { desk: 'Desk 2', std: 'Class 10-B', code: 'SET B' },
                  { desk: 'Desk 3', std: 'Class 9-A', code: 'SET C' },
                  { desk: 'Desk 4', std: 'Class 10-B', code: 'SET A' },
                  { desk: 'Desk 5', std: 'Class 9-A', code: 'SET B' },
                  { desk: 'Desk 6', std: 'Class 10-B', code: 'SET C' },
                ].map((d, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-[#131b2e] border border-slate-800">
                    <p className="font-mono text-[10px] text-slate-400">{d.desk}</p>
                    <p className="font-bold text-white mt-1">{d.std}</p>
                    <p className="text-[10px] text-indigo-400 font-bold mt-0.5">{d.code}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-slate-400 text-center">
                Instantly exports printable door charts and student roll-number desk tags.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 6. SCHOOL ERP ONBOARDING */}
      <section id="pricing" className="py-20 bg-[#0E1322] border-t border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-extrabold uppercase tracking-wider border border-amber-500/30">School ERP</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-3">
              A practical platform for <span className="text-amber-400">everyday school operations</span>
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mt-3">
              Talk with our team about your school’s size, workflows and onboarding needs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
            {/* Standard Tier */}
            <div className="bg-[#111726] border border-slate-800 rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Starter School</h3>
                <p className="text-xs text-slate-400 mt-1">For primary or standalone institutions.</p>
                <div className="mt-4 pb-4 border-b border-slate-800">
                  <span className="text-3xl font-black text-white">School</span>
                  <span className="text-xs text-slate-400 font-medium"> ERP</span>
                </div>
                <ul className="mt-5 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0" />
                    <span>Student records, admissions and school operations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0" />
                    <span>Admissions & Fee Management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0" />
                    <span>Student Report Cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0" />
                    <span>School portal setup</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="mt-8 w-full py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-bold transition"
              >
                Request a demo
              </button>
            </div>

            {/* FULL SCHOOL ERP */}
            <div className="relative bg-gradient-to-b from-[#182038] to-[#111726] border-2 border-amber-500/80 rounded-2xl p-7 flex flex-col justify-between shadow-2xl shadow-indigo-500/10 lg:-translate-y-2">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-indigo-950 text-[11px] font-black uppercase tracking-wider shadow">
                SES EDUCARE
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Complete School ERP</h3>
                <p className="text-xs text-amber-200 mt-1">All modules unlocked. Zero feature restrictions.</p>
                <div className="mt-4 pb-4 border-b border-slate-800">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-amber-400">Flexible</span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                    Plans are tailored to your school’s requirements
                  </p>
                </div>
                <ul className="mt-5 space-y-3 text-xs text-slate-200">
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0 font-bold" />
                    <span><strong>All Modules Included:</strong> Fees, CCE, RFID, AI, TC, Seating</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0 font-bold" />
                    <span><strong>Dedicated School Subdomain</strong> + Custom Domain (CNAME)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0 font-bold" />
                    <span><strong>Automated Razorpay Fee Desk</strong> with split heads</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0 font-bold" />
                    <span><strong>Teacher AI Copilot:</strong> Lesson plans & quiz engine</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0 font-bold" />
                    <span><strong>Data onboarding:</strong> Migration planned with your school team</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0 font-bold" />
                    <span><strong>Onboarding support</strong> for administrators and school staff</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-indigo-950 font-black text-sm transition shadow-lg shadow-amber-500/30 hover:scale-[1.02]"
              >
                Request a school demo
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-[#111726] border border-slate-800 rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Trust / Multi-Campus</h3>
                <p className="text-xs text-slate-400 mt-1">For school groups managing multiple campuses.</p>
                <div className="mt-4 pb-4 border-b border-slate-800">
                  <span className="text-3xl font-black text-white">Custom</span>
                  <span className="text-xs text-slate-400 font-medium"> School Group</span>
                </div>
                <ul className="mt-5 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0" />
                    <span>Unlimited Campuses & Branches</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0" />
                    <span>Centralized Headquarters Dashboard</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0" />
                    <span>Cross-Campus Student Transfers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-400 shrink-0" />
                    <span>Custom ERP Integration APIs</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="mt-8 w-full py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-bold transition"
              >
                Contact Enterprise
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Answers about SES Educare School ERP.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "How can our school get started?",
              a: "Request a demo with your school name and contact details. The SES Educare team will follow up to understand your requirements and plan onboarding."
            },
            {
              q: "Will our school get its own dedicated login and URL?",
              a: "Each school has its own secure workspace. Portal URLs and any custom domain setup are confirmed during onboarding."
            },
            {
              q: "How do we migrate our existing student data from Excel or another software?",
              a: "We review your existing records with you and agree on a migration plan before importing student, staff and fee data. Timing depends on data quality and volume."
            },
            {
              q: "Is our school's financial and student data strictly private and isolated?",
              a: "School data is separated by tenant and campus access. Staff permissions determine which school records each account can access."
            },
            {
              q: "Can parents pay school fees online via UPI or Net Banking?",
              a: "Online payment options depend on your school’s configured payment gateway and account. Our team can review the setup during onboarding."
            }
          ].map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-[#111726] border border-slate-800 rounded-xl overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between text-sm font-bold text-white hover:text-indigo-300 transition"
                >
                  <span>{item.q}</span>
                  {isOpen ? <FiChevronUp className="w-4 h-4 text-indigo-400" /> : <FiChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="border-t border-slate-800 bg-[#070A12] py-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">
                S
              </div>
              <span className="font-extrabold text-white text-base">SES Educare</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              School Management ERP for school leaders, teachers, staff, parents and students.
            </p>
            <p className="text-[11px] text-slate-500 mt-3">
              © {new Date().getFullYear()} SES Educare. All rights reserved.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3 text-[11px]">Core Modules</h4>
            <ul className="space-y-2">
              <li><a href="#live-previews" className="hover:text-white transition">Razorpay Fee Counter</a></li>
              <li><a href="#live-previews" className="hover:text-white transition">CBSE CCE Report Cards</a></li>
              <li><a href="#live-previews" className="hover:text-white transition">RFID Student Attendance</a></li>
              <li><a href="#live-previews" className="hover:text-white transition">Teacher AI Copilot</a></li>
              <li><a href="#live-previews" className="hover:text-white transition">Transfer Certificates (TC)</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3 text-[11px]">SaaS Architecture</h4>
            <ul className="space-y-2">
              <li><a href="#subdomains" className="hover:text-white transition">School Subdomains</a></li>
              <li><a href="#pricing" className="hover:text-white transition">School ERP Plans</a></li>
              <li><a href={import.meta.env.VITE_LMS_BASE_URL || 'https://myapp.seseducare.com'} className="hover:text-white transition">School Login</a></li>
              <li><a href="#faq" className="hover:text-white transition">Data & Onboarding</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3 text-[11px]">Contact & Support</h4>
            <p className="flex items-center gap-2 text-slate-300">
              <FiMapPin className="text-indigo-400" />
              <span>Rajim, Gariyaband, Chhattisgarh</span>
            </p>
            <p className="flex items-center gap-2 text-slate-300 mt-2">
              <FiMail className="text-indigo-400" />
              <span>seseducare@gmail.com</span>
            </p>
            <p className="flex items-center gap-2 text-slate-300 mt-2">
              <FiPhone className="text-indigo-400" />
              <span>+91 91651 79272</span>
            </p>
          </div>
        </div>
      </footer>

      {/* 9. SCHOOL DEMO REQUEST */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111726] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsDemoModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <FiX className="w-5 h-5" />
            </button>

            <div className="text-center pb-4 border-b border-slate-800">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                SES Educare
              </span>
              <h3 className="text-xl font-bold text-white mt-2">
                Request a School ERP Demo
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Share your school details and our team will contact you about the platform and onboarding.
              </p>
            </div>

            {demoSuccess ? (
              <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center" role="status">
                <FiCheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">Request received</p>
                <p className="text-xs text-slate-300 mt-1">{demoSuccess}</p>
                <button type="button" onClick={() => { setIsDemoModalOpen(false); setDemoSuccess(''); }} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Done</button>
              </div>
            ) : <form onSubmit={handleDemoSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Your Full Name & Designation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Sharma, Principal"
                  value={demoFormData.name}
                  onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#0A0E1A] border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">School / Institution Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. St. Xavier's International School"
                  value={demoFormData.schoolName}
                  onChange={(e) => setDemoFormData({ ...demoFormData, schoolName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#0A0E1A] border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    placeholder="principal@school.edu"
                    value={demoFormData.email}
                    onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0A0E1A] border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mobile / WhatsApp</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={demoFormData.phone}
                    onChange={(e) => setDemoFormData({ ...demoFormData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0A0E1A] border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Approx. Student Strength</label>
                  <select
                    value={demoFormData.studentCount}
                    onChange={(e) => setDemoFormData({ ...demoFormData, studentCount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0A0E1A] border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="100-500">100 - 500 Students</option>
                    <option value="500-1000">500 - 1,000 Students</option>
                    <option value="1000-2500">1,000 - 2,500 Students</option>
                    <option value="2500+">2,500+ Students</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Affiliation Board</label>
                  <select
                    value={demoFormData.board}
                    onChange={(e) => setDemoFormData({ ...demoFormData, board: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0A0E1A] border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE / ISC</option>
                    <option value="State">State Board</option>
                    <option value="IB/Cambridge">IB / Cambridge</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={demoSubmitted}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-indigo-950 font-black text-sm transition shadow-lg shadow-amber-500/20 mt-4 disabled:opacity-70"
              >
                {demoSubmitted ? 'Sending request…' : 'Request a school demo'}
              </button>
              {demoError && <p role="alert" className="text-rose-300 text-xs">{demoError}</p>}
            </form>}
          </div>
        </div>
      )}
    </div>
  );
}
