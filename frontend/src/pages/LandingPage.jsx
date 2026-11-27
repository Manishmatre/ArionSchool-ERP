import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiShield, FiCheckCircle, FiArrowRight, FiBookOpen, FiAward,
  FiCalendar, FiCreditCard, FiUsers, FiCpu, FiCompass, FiLock,
  FiPhone, FiMail, FiMapPin, FiLayers, FiActivity, FiClock,
  FiFileText, FiCheck, FiChevronRight, FiChevronDown, FiStar,
  FiSmartphone, FiServer, FiGlobe, FiHelpCircle, FiX, FiShare2
} from 'react-icons/fi';
import { TbCurrencyRupee } from 'react-icons/tb';
import { HiSparkles } from 'react-icons/hi';
import { APP_VERSION } from '../config/version';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import api from '../api/axios';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { branding } = useBranding();

  const [activePreviewTab, setActivePreviewTab] = useState('fees');
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({
    schoolName: '',
    contactPerson: '',
    email: '',
    phone: '',
    studentCount: '500-1500',
    board: 'CBSE'
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoError, setDemoError] = useState('');

  const schoolName = branding?.identity?.schoolName || 'Arion School';
  const companyName = branding?.attribution?.developerCompany || 'STARTOLOGY EDUCARE SERVICES PRIVATE LIMITED';

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    setDemoSubmitting(true);
    setDemoError('');
    try {
      const response = await api.post('/platform-admin/public/leads', {
        schoolName: demoForm.schoolName,
        contactName: demoForm.contactPerson,
        email: demoForm.email,
        phone: demoForm.phone,
        studentCount: demoForm.studentCount,
        board: demoForm.board
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Could not submit your demo request.');
      setDemoSubmitted(true);
      setDemoForm({
        schoolName: '',
        contactPerson: '',
        email: '',
        phone: '',
        studentCount: '500-1500',
        board: 'CBSE'
      });
    } catch (error) {
      setDemoError(error.response?.data?.message || error.message || 'Could not submit your demo request. Please try again.');
    } finally {
      setDemoSubmitting(false);
    }
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'super_admin' || user.role === 'school_owner') return '/admin/dashboard';
    if (user.role === 'franchise_admin' || user.role === 'school_admin' || user.role === 'principal' || user.role === 'vice_principal') return '/school/dashboard';
    if (user.role === 'teacher' || user.role === 'class_teacher') return '/teacher/dashboard';
    if (user.role === 'parent') return '/parent/dashboard';
    if (user.role === 'accountant') return '/accountant/dashboard';
    return '/student/dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary-500 selection:text-white">
      {/* 1. SCHOOL ERP ANNOUNCEMENT */}
      <div className="bg-gradient-to-r from-amber-600 via-primary-700 to-indigo-900 text-white text-xs sm:text-sm font-semibold py-2.5 px-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide animate-pulse">
              Arion School School ERP
            </span>
            <span>
              One connected platform for everyday school operations
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-amber-200 text-xs hidden md:inline">
              Admissions, academics, fees, communication and reporting
            </span>
            <button
              onClick={() => setDemoModalOpen(true)}
              className="bg-white text-slate-900 hover:bg-amber-100 px-3 py-1 rounded-md text-xs font-bold transition shadow-xs flex items-center gap-1"
            >
              <span>Book a Demo</span>
              <FiArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. STICKY MAIN NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-700 via-primary-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-primary-500/20 group-hover:scale-105 transition transform">
              <FiBookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">{schoolName}</span>
                <span className="bg-primary-50 text-primary-700 font-bold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-primary-200">
                  ERP
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">By {companyName}</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-primary-600 transition">Core Modules</a>
            <a href="#preview" className="hover:text-primary-600 transition">Interactive Demo</a>
            <a href="#ai-copilot" className="hover:text-primary-600 transition flex items-center gap-1">
              <HiSparkles className="w-4 h-4 text-amber-500" /> AI Pedagogy
            </a>
            <a href="#compliance" className="hover:text-primary-600 transition">Board Compliance</a>
            <a href="#faq" className="hover:text-primary-600 transition">FAQ</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-3">
            {user ? (
              <button
                onClick={() => navigate(getDashboardLink())}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 shadow-sm transition transform hover:-translate-y-0.5"
              >
                <span>Open ERP Dashboard</span>
                <FiArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  Sign In
                </Link>
                <button
                  onClick={() => setDemoModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition transform hover:-translate-y-0.5"
                >
                  <span>Book School Demo</span>
                </button>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 shadow-sm transition"
                >
                  <span>Portal Login</span>
                  <FiChevronRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-white via-slate-50 to-slate-100 border-b border-slate-200">
        {/* Ambient Glow & Grid Backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />
        <div className="absolute -top-40 right-1/4 w-96 h-96 bg-primary-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-10 w-80 h-80 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Aligned Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold mb-6 shadow-2xs">
            <span className="flex h-2 w-2 rounded-full bg-primary-600 animate-pulse" />
            <span>Dedicated Multi-Campus School Management ERP for Indian Schools</span>
          </div>

          {/* Master Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.15] max-w-4xl mx-auto">
            The Complete Operating System for <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Visionary Schools.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto font-normal leading-relaxed">
            Eliminate operational chaos. Unify student admissions, automated Razorpay fee collection, anti-cheat exam seating, AI pedagogy, RFID attendance, and digital Transfer Certificates into one high-performance platform.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-500/25 transition transform hover:-translate-y-0.5 text-sm"
            >
              <span>Launch School ERP Portal</span>
              <FiArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setDemoModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition text-sm"
            >
              <FiCalendar className="w-4 h-4 text-primary-600" />
              <span>Request Campus Onboarding Demo</span>
            </button>
            <Link
              to="/verify-certificate-public"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-slate-600 hover:text-slate-900 text-sm transition"
            >
              <FiShield className="w-4 h-4 text-emerald-600" />
              <span>Verify Student TC</span>
            </Link>
          </div>

          {/* Trust Badges Bar */}
          <div className="mt-14 pt-8 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <FiCheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">100% Board Ready</p>
                <p className="text-[11px] text-slate-500">CBSE, ICSE & State</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <TbCurrencyRupee className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Razorpay Direct</p>
                <p className="text-[11px] text-slate-500">Instant UPI & Receipts</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <FiCpu className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">AI Pedagogy Copilot</p>
                <p className="text-[11px] text-slate-500">Lesson plans in seconds</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <FiShield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">QR Cryptographic TC</p>
                <p className="text-[11px] text-slate-500">Tamper-proof certificates</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE PRODUCT PREVIEW SHOWCASE */}
      <section id="preview" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-3 py-1 rounded-full border border-primary-200">
              Live Interactive Interface
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-3">
              Designed for How Schools Truly Operate
            </h2>
            <p className="text-slate-600 mt-3 text-sm sm:text-base">
              Explore the actual interfaces crafted with meticulous attention to Indian school workflows, fee heads, examination seating, and student records.
            </p>
          </div>

          {/* Tab Selector Strip */}
          <div className="flex items-center justify-start sm:justify-center overflow-x-auto gap-2 pb-4 mb-8 no-scrollbar">
            {[
              { id: 'fees', label: 'Smart Fee Desk & Razorpay', icon: TbCurrencyRupee },
              { id: 'reportCard', label: 'CBSE CCE Report Cards', icon: FiAward },
              { id: 'seating', label: 'Anti-Cheat Seating Matrix', icon: FiLayers },
              { id: 'ai', label: 'Teacher AI Copilot', icon: HiSparkles },
              { id: 'tc', label: 'QR Transfer Certificates', icon: FiFileText },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activePreviewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Screen Container */}
          <div className="bg-slate-900 rounded-2xl p-3 sm:p-6 shadow-2xl border border-slate-800 text-slate-100 max-w-5xl mx-auto">
            {/* Window Top Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="ml-2 font-mono text-slate-500 text-[11px]">school-portal.example</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-300">
                  Campus: Example School
                </span>
                <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold">
                  INTERACTIVE SAMPLE
                </span>
              </div>
            </div>

            {/* TAB CONTENT: 1. FEES */}
            {activePreviewTab === 'fees' && (
              <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-800/80 rounded-xl p-5 border border-slate-700/60">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-bold text-white">Student Fee Collection Desk</h4>
                      <p className="text-xs text-slate-400">Aarav Sharma • Class 10-A • Roll #14 • Adm #2026-0142</p>
                    </div>
                    <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-full font-bold">
                      Term 2 Pending
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-2 border-b border-slate-700 text-slate-300">
                      <span>Tuition Fee (Quarterly)</span>
                      <span className="font-semibold text-white">₹14,500.00</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700 text-slate-300">
                      <span>Computer & Science Lab Fee</span>
                      <span className="font-semibold text-white">₹2,800.00</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-700 text-slate-300">
                      <span>School Bus Transport Route #4</span>
                      <span className="font-semibold text-white">₹3,200.00</span>
                    </div>
                    <div className="flex justify-between py-2 text-slate-300">
                      <span>Examination & Board Registration</span>
                      <span className="font-semibold text-white">₹1,500.00</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">Total Payable</span>
                      <span className="text-2xl font-black text-emerald-400">₹22,000.00</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate('/login')}
                        className="bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition flex items-center gap-1.5"
                      >
                        <TbCurrencyRupee className="w-4 h-4" /> Collect via Razorpay / UPI
                      </button>
                    </div>
                  </div>
                </div>

                {/* Receipt Card Preview */}
                <div className="bg-white text-slate-900 rounded-xl p-5 shadow-lg border border-slate-200 text-xs flex flex-col justify-between">
                  <div>
                    <div className="text-center pb-3 border-b border-slate-200">
                      <p className="font-black text-sm text-slate-900">{schoolName}</p>
                      <p className="text-[10px] text-slate-500">Official Fee Receipt #REC-2026-9041</p>
                    </div>
                    <div className="mt-3 space-y-1.5 text-[11px]">
                      <div className="flex justify-between"><span className="text-slate-500">Date:</span><span className="font-semibold">17 Nov 2026</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Payment Mode:</span><span className="font-semibold text-primary-700">Razorpay UPI</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Txn Ref:</span><span className="font-mono font-semibold">pay_Q8aN9xL201</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Status:</span><span className="text-emerald-700 font-bold">CLEARED (Success)</span></div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center">
                    <div className="w-16 h-16 bg-slate-100 border border-slate-300 rounded mx-auto flex items-center justify-center text-[9px] text-slate-400 font-mono mb-2">
                      [QR VERIFY]
                    </div>
                    <p className="text-[9px] text-slate-400">Scan to verify authentic fee receipt on school portal</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. REPORT CARD */}
            {activePreviewTab === 'reportCard' && (
              <div className="pt-6">
                <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/60">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-bold text-white">CBSE Continuous and Comprehensive Evaluation (CCE) Card</h4>
                      <p className="text-xs text-slate-400">Class 10 Annual Academic Performance • Roll #14</p>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold">
                      Grade: A1 (94.2%)
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-900/80 text-slate-300 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Subject</th>
                          <th className="py-2.5 px-3">Theory (80)</th>
                          <th className="py-2.5 px-3">Internal (20)</th>
                          <th className="py-2.5 px-3">Total (100)</th>
                          <th className="py-2.5 px-3">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/60 text-slate-200">
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-white">English Language & Literature</td>
                          <td className="py-2.5 px-3">74</td>
                          <td className="py-2.5 px-3">19</td>
                          <td className="py-2.5 px-3 font-bold text-white">93</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">A1</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-white">Mathematics Standard</td>
                          <td className="py-2.5 px-3">78</td>
                          <td className="py-2.5 px-3">20</td>
                          <td className="py-2.5 px-3 font-bold text-white">98</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">A1</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-white">Science (Phy/Chem/Bio)</td>
                          <td className="py-2.5 px-3">72</td>
                          <td className="py-2.5 px-3">19</td>
                          <td className="py-2.5 px-3 font-bold text-white">91</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">A1</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-white">Social Science</td>
                          <td className="py-2.5 px-3">76</td>
                          <td className="py-2.5 px-3">19</td>
                          <td className="py-2.5 px-3 font-bold text-white">95</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">A1</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
                    <p>Co-Scholastic: Work Education (A), Art Education (A), Health & Physical (A)</p>
                    <button onClick={() => navigate('/login')} className="text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1">
                      Print CBSE Marksheet <FiArrowRight />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. SEATING MATRIX */}
            {activePreviewTab === 'seating' && (
              <div className="pt-6">
                <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/60">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-bold text-white">Anti-Cheat Examination Room Seating Generator</h4>
                      <p className="text-xs text-slate-400">Hall #3 • Alternating Zig-Zag Roll Allocation (Class 9 & Class 10)</p>
                    </div>
                    <span className="bg-primary-500/20 text-primary-300 text-xs px-2.5 py-1 rounded-full font-bold">
                      Zero Cheating Matrix
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 text-center">
                      <span className="text-[10px] text-slate-500 block">DESK A-1</span>
                      <span className="text-xs font-bold text-emerald-400">Class 10-A</span>
                      <span className="text-[11px] text-slate-300 block font-mono">Roll: 1001</span>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 text-center">
                      <span className="text-[10px] text-slate-500 block">DESK A-2</span>
                      <span className="text-xs font-bold text-indigo-400">Class 9-B</span>
                      <span className="text-[11px] text-slate-300 block font-mono">Roll: 9001</span>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 text-center">
                      <span className="text-[10px] text-slate-500 block">DESK A-3</span>
                      <span className="text-xs font-bold text-emerald-400">Class 10-A</span>
                      <span className="text-[11px] text-slate-300 block font-mono">Roll: 1002</span>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 text-center">
                      <span className="text-[10px] text-slate-500 block">DESK A-4</span>
                      <span className="text-xs font-bold text-indigo-400">Class 9-B</span>
                      <span className="text-[11px] text-slate-300 block font-mono">Roll: 9002</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    Generates door seating charts and student desk stickers with roll numbers and student photos in 1 click.
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 4. AI PEDAGOGY */}
            {activePreviewTab === 'ai' && (
              <div className="pt-6">
                <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/60 font-mono text-xs">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <HiSparkles className="w-4 h-4" />
                      <span>Arion School Teacher Copilot • Lesson Planning</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">Prompt: Class 10 Physics - Reflection of Light</span>
                  </div>

                  <div className="space-y-3 text-slate-300 leading-relaxed">
                    <p className="text-emerald-400">✓ Learning Objective: Understand Laws of Reflection, Concave & Convex Mirrors.</p>
                    <p className="text-slate-200 font-sans">
                      <strong className="text-white">Lesson Structure (45 Mins):</strong><br/>
                      • 0-10 Min: Hook & Real-world Demonstration (Spoon reflection experiment)<br/>
                      • 10-25 Min: Interactive Ray Diagram Drawing (Principal Focus & Center of Curvature)<br/>
                      • 25-35 Min: Group Activity: Determining focal length of concave mirror<br/>
                      • 35-45 Min: Formative 5-Question MCQ Assessment via School ERP App
                    </p>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 font-sans">
                      <span className="text-xs font-bold text-primary-400 block mb-1">Generated Assessment Question:</span>
                      <p className="text-xs text-slate-200">Where should an object be placed in front of a concave mirror to get an image of the same size? <span className="text-emerald-400 font-semibold">[Ans: At Center of Curvature (C)]</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 5. TC GENERATOR */}
            {activePreviewTab === 'tc' && (
              <div className="pt-6">
                <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/60">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-bold text-white">CBSE Aligned School Transfer Certificate (TC)</h4>
                      <p className="text-xs text-slate-400">Official Leaving Certificate with Cryptographic QR Code</p>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold">
                      Verified & Issued
                    </span>
                  </div>

                  <div className="bg-white text-slate-900 p-4 rounded-xl border border-slate-200 text-xs">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                      <div>
                        <h5 className="font-black text-sm text-slate-950 uppercase">{schoolName}</h5>
                        <p className="text-[10px] text-slate-500">Affiliation No. 1030999 • School Code: 50921</p>
                      </div>
                      <span className="font-mono font-bold text-primary-700">TC-2026-088</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                      <div><span className="text-slate-500">Student:</span> <strong className="text-slate-800">Priya Patel</strong></div>
                      <div><span className="text-slate-500">Mother/Father:</span> <strong className="text-slate-800">Smt. Meera / Shri Rajesh Patel</strong></div>
                      <div><span className="text-slate-500">Class Last Studied:</span> <strong className="text-slate-800">Class 12th (Science Stream)</strong></div>
                      <div><span className="text-slate-500">Reason for Leaving:</span> <strong className="text-slate-800">Completed Higher Secondary</strong></div>
                      <div><span className="text-slate-500">General Conduct:</span> <strong className="text-emerald-700 font-bold">Exemplary / Very Good</strong></div>
                      <div><span className="text-slate-500">Fees Paid Upto:</span> <strong className="text-slate-800">March 2026 (All Cleared)</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. COMPLETE SCHOOL ERP MODULES MATRIX */}
      <section id="features" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-3 py-1 rounded-full border border-primary-200">
              Enterprise School Modules
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-3">
              Everything Your School Needs in One Single License
            </h2>
            <p className="text-slate-600 mt-3 text-sm sm:text-base">
              No fragmented third-party plugins. Every module is deeply connected to your central student registry and financial ledger.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FiUsers,
                title: 'Student Admissions & Lifecycle',
                desc: 'Online enquiry pipeline, document upload (Aadhaar, Birth Certificate), automatic scholar enrollment, and annual promotion/detention.',
                badge: 'Core Registry'
              },
              {
                icon: TbCurrencyRupee,
                title: 'Automated Fees & Razorpay Gateway',
                desc: 'Multi-head fee structures (Tuition, Lab, Transport), instant parent UPI payment links, late fine automation, and GST receipts.',
                badge: 'Finance'
              },
              {
                icon: FiLayers,
                title: 'Anti-Cheat Seating & Exams',
                desc: 'Automated zig-zag classroom seating planner, CBSE CCE continuous evaluation, marksheets, and printable admit cards.',
                badge: 'Academics'
              },
              {
                icon: HiSparkles,
                title: 'AI Pedagogy & Lesson Planner',
                desc: 'AI Teacher Assistant creates 45-minute structured lesson plans, remedial practice quizzes, and bilingual flashcards in seconds.',
                badge: 'AI Powered'
              },
              {
                icon: FiClock,
                title: 'RFID & Biometric Attendance',
                desc: 'Student gate scanning, staff punch-in tracking, instant WhatsApp/SMS absence alerts to parents, and monthly attendance registers.',
                badge: 'Hardware Sync'
              },
              {
                icon: FiCompass,
                title: 'Transport GPS & Fleet Management',
                desc: 'Bus routes, pickup point management, driver details, live vehicle GPS tracking, and transport fee allocation.',
                badge: 'Logistics'
              },
              {
                icon: FiBookOpen,
                title: 'Digital Library & Barcode System',
                desc: 'Book cataloging with ISBN/barcodes, student book checkout tracking, overdue fine calculation, and inventory audits.',
                badge: 'Library'
              },
              {
                icon: FiFileText,
                title: 'Transfer Certificates (TC) & Bonafide',
                desc: 'Official CBSE compliant Transfer Certificates, Character Certificates, and Bonafide letters with tamper-proof public QR verification.',
                badge: 'Certification'
              },
              {
                icon: FiActivity,
                title: 'Staff HR, Payroll & Leaves',
                desc: 'Teacher biometric integration, salary ledger, PF/ESI deductions, pay slip generation, and teacher timetable allocation.',
                badge: 'Human Resources'
              },
              {
                icon: FiSmartphone,
                title: 'Parent & Student Mobile Apps',
                desc: 'Dedicated Android app for fee payments, homework viewing, exam timetables, attendance reports, and push notifications.',
                badge: 'Mobile First'
              },
              {
                icon: FiGlobe,
                title: 'Multi-Campus & Super Admin',
                desc: 'Centralized control for multi-branch institutions. Consolidated fee revenue, inter-branch student transfers, and head office audit.',
                badge: 'Institutional'
              },
              {
                icon: FiShield,
                title: 'Bank-Grade Data Security & Backups',
                desc: '256-bit SSL encryption, granular Role-Based Access Control (RBAC), daily automated cloud backups, and zero data leakage.',
                badge: 'Security'
              }
            ].map((module, i) => {
              const Icon = module.icon;
              return (
                <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {module.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition">
                      {module.title}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {module.desc}
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-primary-600 group-hover:text-primary-700">
                    <span>Explore module</span>
                    <FiChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. BUILT FOR INDIAN BOARDS & COMPLIANCE */}
      <section id="compliance" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Statutory & Board Compliance
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-4 leading-tight">
                Fully Aligned with CBSE, ICSE and NEP 2020 Guidelines
              </h2>
              <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
                Schools can organize academic records and reports around their board and local requirements.
              </p>

              <div className="mt-6 space-y-4 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FiCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-slate-900">NEP 2020 Holistic Progress Card (HPC):</strong> Tracks 360-degree learner assessment including co-curricular, cognitive, socio-emotional, and physical domains.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FiCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-slate-900">CBSE Affiliation By-Laws Clause 14:</strong> Complete digital maintenance of student attendance, teacher qualification dossiers, and transparent fee disclosures.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <FiCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-slate-900">UDISE+ Ready Data Structure:</strong> Effortlessly export student enrollment, Aadhaar validation status, and infrastructure metrics for government portal submissions.
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <button
                  onClick={() => setDemoModalOpen(true)}
                  className="px-5 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 text-xs sm:text-sm shadow-sm transition"
                >
                  Schedule Compliance Walkthrough
                </button>
              </div>
            </div>

            {/* Compliance Stats Box */}
            <div className="bg-gradient-to-tr from-slate-900 via-primary-950 to-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <FiShield className="text-emerald-400" /> Government & Board Audit Readiness
              </h3>

              <div className="space-y-5">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="text-xs text-slate-400 block">Student Register Verification</span>
                  <span className="text-lg font-bold text-white">Full Admission Register (Form 12)</span>
                  <p className="text-[11px] text-slate-400 mt-1">Permanent scholar numbers with father, mother, category & Aadhaar.</p>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="text-xs text-slate-400 block">Cryptographic Authentication</span>
                  <span className="text-lg font-bold text-white">Tamper-Proof Digital TC Verification</span>
                  <p className="text-[11px] text-slate-400 mt-1">Instant public verification URL and scanable QR code on all issued certificates.</p>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="text-xs text-slate-400 block">Financial Transparency</span>
                  <span className="text-lg font-bold text-white">GST & Non-Profit Compliant Ledger</span>
                  <p className="text-[11px] text-slate-400 mt-1">Categorized fee heads, concession tracking, and audit-ready collection registers.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SCHOOL ERP PLANS & ONBOARDING */}
      <section id="pricing" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="px-3.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-extrabold uppercase tracking-wider border border-amber-300">
              School ERP
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-950 mt-3">
              One platform for <span className="text-primary-600">your school’s daily operations</span>
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3">
              Request a walkthrough to discuss modules, subscriptions and onboarding for your school.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {/* Starter Plan */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-7 flex flex-col justify-between shadow-2xs">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Starter Campus</h3>
                <p className="text-xs text-slate-500 mt-1">For primary schools and pre-schools.</p>
                <div className="mt-4 pb-4 border-b border-slate-200">
                  <span className="text-3xl font-black text-slate-900">School</span>
                  <span className="text-xs text-slate-500 font-medium"> ERP</span>
                </div>
                <ul className="mt-5 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-600 shrink-0" />
                    <span>Admissions, fees and student records</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-600 shrink-0" />
                    <span>Admissions & Fee Management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-600 shrink-0" />
                    <span>Student Report Cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-600 shrink-0" />
                    <span>School Subdomain Access</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => setDemoModalOpen(true)}
                className="mt-8 w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition"
              >
                Request a demo
              </button>
            </div>

            {/* COMPLETE SCHOOL ERP */}
            <div className="relative bg-gradient-to-b from-indigo-900 via-primary-900 to-indigo-950 text-white border-2 border-amber-400 rounded-2xl p-7 flex flex-col justify-between shadow-xl lg:-translate-y-2">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-indigo-950 text-[11px] font-black uppercase tracking-wider shadow">
                SES EDUCARE
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Complete School ERP</h3>
                <p className="text-xs text-amber-200 mt-1">Review modules and access needs with the onboarding team.</p>
                <div className="mt-4 pb-4 border-b border-indigo-800">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-amber-300">Flexible</span>
                  </div>
                  <p className="text-[11px] text-emerald-300 font-semibold mt-1">
                    Plan details confirmed during onboarding
                  </p>
                </div>
                <ul className="mt-5 space-y-3 text-xs text-indigo-100">
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-amber-400 shrink-0 font-bold" />
                    <span><strong>All Modules:</strong> Fees, CCE, RFID, AI, TC, Seating</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-amber-400 shrink-0 font-bold" />
                    <span>School portal and custom domain setup</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-amber-400 shrink-0 font-bold" />
                    <span><strong>Automated Razorpay Fee Desk</strong> with split heads</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-amber-400 shrink-0 font-bold" />
                    <span><strong>Teacher AI Copilot:</strong> Lesson plans & quiz generator</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-amber-400 shrink-0 font-bold" />
                    <span>Data migration planned with your school team</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-amber-400 shrink-0 font-bold" />
                    <span>Onboarding and support for school staff</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => setDemoModalOpen(true)}
                className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-indigo-950 font-black text-sm transition shadow-lg shadow-amber-400/20 hover:scale-[1.02]"
              >
                Request a school demo
              </button>
            </div>

            {/* Enterprise / Trust Plan */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-7 flex flex-col justify-between shadow-2xs">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Multi-Campus Trust</h3>
                <p className="text-xs text-slate-500 mt-1">For educational groups managing 3+ branches.</p>
                <div className="mt-4 pb-4 border-b border-slate-200">
                  <span className="text-3xl font-black text-slate-900">Custom</span>
                  <span className="text-xs text-slate-500 font-medium"> Group Licensing</span>
                </div>
                <ul className="mt-5 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-600 shrink-0" />
                    <span>Unlimited Campuses & Branches</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-600 shrink-0" />
                    <span>Central Trust Headquarters Console</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-600 shrink-0" />
                    <span>Cross-Campus Student Transfers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck className="text-emerald-600 shrink-0" />
                    <span>Custom ERP Integration APIs</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => setDemoModalOpen(true)}
                className="mt-8 w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition"
              >
                Contact Enterprise
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-3 py-1 rounded-full border border-primary-200">
              Got Questions?
            </span>
            <h2 className="text-3xl font-extrabold text-slate-950 mt-3">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How long does it take to migrate our existing school data?',
                a: 'Most schools transition within 24 to 48 hours. Our automated Excel / CSV importer quickly ingests student rosters, pending fee balances, and staff profiles with zero disruption.'
              },
              {
                q: 'Does Arion School support multiple school campuses?',
                a: 'Yes! Built on a modern multi-tenant architecture, school management groups can oversee all branches with centralized financial dashboards while each campus principal maintains independent daily control.'
              },
              {
                q: 'Can parents pay school fees online using UPI, Credit Cards, or Net Banking?',
                a: 'Directly integrated with Razorpay, parents can settle tuition and transport fees instantly via Google Pay, PhonePe, Paytm, cards, or net banking. Fee receipts with official QR verification are generated automatically.'
              },
              {
                q: 'How does the Anti-Cheat Exam Seating system work?',
                a: 'The system inputs room capacity and student roll numbers across multiple classes (e.g. Class 9 and Class 10), automatically generating an interleaved zig-zag desk allocation and printing room door charts and desk labels in one click.'
              },
              {
                q: 'Is our student and financial data safe and backed up?',
                a: 'Yes. We employ 256-bit AES encryption at rest and in transit, strict Role-Based Access Control (RBAC), and automated daily cloud snapshots so your records are protected permanently against data loss.'
              }
            ].map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                    className="w-full py-4 px-5 text-left flex items-center justify-between font-bold text-slate-900 text-sm sm:text-base hover:bg-slate-50 transition"
                  >
                    <span>{faq.q}</span>
                    <FiChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-primary-600' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION BANNER */}
      <section className="py-16 bg-gradient-to-r from-primary-900 via-slate-900 to-primary-950 text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Transform Your School Operations?
          </h2>
          <p className="mt-4 text-slate-300 text-sm sm:text-base max-w-2xl mx-auto">
            Join modern educational institutions delivering seamless administrative excellence for teachers, students, and parents.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-500/30 transition transform hover:-translate-y-0.5 text-sm"
            >
              Sign In to ERP Portal
            </Link>
            <button
              onClick={() => setDemoModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-sm transition text-sm"
            >
              Book Personal Demo
            </button>
            <Link
              to="/verify-certificate-public"
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl font-semibold text-slate-300 hover:text-white text-sm transition"
            >
              Public Certificate Verification
            </Link>
          </div>
        </div>
      </section>

      {/* 9. ENTERPRISE FOOTER */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800/80">
            {/* Col 1: Brand Info */}
            <div className="md:col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
                  <FiBookOpen className="w-4 h-4" />
                </div>
                <span className="text-white font-bold text-base tracking-tight">{schoolName}</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Dedicated School Management ERP & Academic Administration Platform.
              </p>
              <div className="pt-2 text-slate-400 text-[11px] space-y-1">
                <p className="flex items-center gap-1.5"><FiMapPin className="text-primary-400 shrink-0" /> Rajim, Gariyaband, Chhattisgarh, India</p>
                <p className="flex items-center gap-1.5"><FiMail className="text-primary-400 shrink-0" /> seseducare@gmail.com</p>
                <p className="flex items-center gap-1.5"><FiPhone className="text-primary-400 shrink-0" /> +91 91651 79272</p>
              </div>
            </div>

            {/* Col 2: ERP Portals */}
            <div>
              <p className="text-white font-bold text-xs uppercase tracking-wider mb-3">ERP Portals</p>
              <ul className="space-y-2">
                <li><Link to="/login" className="hover:text-white transition">Admin & Principal Portal</Link></li>
                <li><Link to="/login" className="hover:text-white transition">Teacher & Staff Desk</Link></li>
                <li><Link to="/login" className="hover:text-white transition">Student & Parent Portal</Link></li>
                <li><Link to="/verify-certificate-public" className="hover:text-white transition">Verify Student Certificate</Link></li>
              </ul>
            </div>

            {/* Col 3: Modules */}
            <div>
              <p className="text-white font-bold text-xs uppercase tracking-wider mb-3">Core Modules</p>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition">Admissions & Scholar Register</a></li>
                <li><a href="#features" className="hover:text-white transition">Razorpay Fee Desk</a></li>
                <li><a href="#features" className="hover:text-white transition">Anti-Cheat Seating Matrix</a></li>
                <li><a href="#features" className="hover:text-white transition">CBSE CCE Report Cards</a></li>
                <li><a href="#features" className="hover:text-white transition">RFID Attendance System</a></li>
              </ul>
            </div>

            {/* Col 4: Platform Attribution */}
            <div>
              <p className="text-white font-bold text-xs uppercase tracking-wider mb-3">Engineering & Support</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Engineered and maintained by <strong className="text-slate-200">{companyName}</strong>.
              </p>
              <div className="mt-4 p-3 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">System Status</span>
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                  Arion School School Management ERP
                </span>
                <span className="text-[10px] text-slate-400 block mt-1 font-mono">v{APP_VERSION} (Web Core)</span>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
            <p>© {new Date().getFullYear()} {schoolName} by {companyName}. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/verify-certificate-public" className="hover:text-slate-200">Public TC Verification</Link>
              <span>•</span>
              <a href="#compliance" className="hover:text-slate-200">Board Compliance</a>
              <span>•</span>
              <Link to="/login" className="hover:text-slate-200">Sign In</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* 10. BOOK DEMO MODAL */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => { setDemoModalOpen(false); setDemoSubmitted(false); setDemoError(''); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <FiX className="w-5 h-5" />
            </button>

            {demoSubmitted ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Demo Request Submitted!</h3>
                <p className="text-sm text-slate-600 mt-2">
                  Thank you! Our school ERP onboarding specialist from {companyName} will contact you shortly on <strong>{demoForm.phone}</strong>.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-bold mb-2">
                    <HiSparkles className="w-3.5 h-3.5 text-primary-600" /> Free Campus Onboarding Demo
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">Schedule a Live ERP Walkthrough</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    See how {schoolName} ERP streamlines admissions, fees, and examination workflows for your school.
                  </p>
                </div>

                <form onSubmit={handleDemoSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">School / Institution Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Modern Public School"
                      value={demoForm.schoolName}
                      onChange={(e) => setDemoForm({ ...demoForm, schoolName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Contact Person *</label>
                      <input
                        type="text"
                        required
                        placeholder="Principal / Trustee"
                        value={demoForm.contactPerson}
                        onChange={(e) => setDemoForm({ ...demoForm, contactPerson: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={demoForm.phone}
                        onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Official Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="principal@school.edu"
                        value={demoForm.email}
                        onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Affiliation Board</label>
                      <select
                        value={demoForm.board}
                        onChange={(e) => setDemoForm({ ...demoForm, board: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="CBSE">CBSE Board</option>
                        <option value="ICSE">ICSE / ISC Board</option>
                        <option value="State">State Education Board</option>
                        <option value="IB/Cambridge">IB / Cambridge</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Total Student Strength</label>
                    <select
                      value={demoForm.studentCount}
                      onChange={(e) => setDemoForm({ ...demoForm, studentCount: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    >
                      <option value="under-500">Under 500 Students</option>
                      <option value="500-1500">500 to 1,500 Students</option>
                      <option value="1500-3000">1,500 to 3,000 Students</option>
                      <option value="3000+">3,000+ Students (Multi-Branch)</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={demoSubmitting}
                      className="w-full py-2.5 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-500/20 transition"
                    >
                      {demoSubmitting ? 'Submitting request…' : 'Submit Demo Request'}
                    </button>
                  </div>
                  {demoError && <p role="alert" className="text-rose-600 text-xs">{demoError}</p>}
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

