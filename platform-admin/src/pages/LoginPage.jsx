import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiShield, FiLock, FiMail, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success('Welcome to SES Educare Platform Console');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D18] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-8 relative z-10">
        <div className="text-center mb-7">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-brand-600/30 mb-4">
            <FiShield className="w-7 h-7" />
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-bold uppercase tracking-wider border border-brand-200 mb-2">
            Company Control Plane
          </span>
          <h1 className="text-2xl font-black text-slate-900">SES Educare Platform Admin</h1>
          <p className="text-xs text-slate-500 mt-1">
            Super Admin sign-in to manage SES Educare multi-tenant SaaS infrastructure.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Super Admin Email</label>
            <div className="relative">
              <FiMail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Platform administrator email"
                className="input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <FiLock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your platform password"
                className="input pl-10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3 mt-2"
          >
            <span>{submitting ? 'Authenticating...' : 'Sign In to Platform Console'}</span>
            <FiArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Strictly restricted to authorized SES Educare SaaS operators. All sessions are audited.
          </p>
        </div>
      </div>
    </div>
  );
}
