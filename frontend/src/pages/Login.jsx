import { APP_VERSION } from '../config/version';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiLogIn, FiAward } from 'react-icons/fi';
import PasswordInput from '../components/PasswordInput';
import { extractApiError } from '../api/axios';
import { Button } from '../components/ui';
import { getHomeRouteForRole } from '../utils/roles';

const Login = () => {
  const { branding, schoolName, shortName, logoUrl, showPlatformAttribution } = useBranding();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { user, login, googleLogin } = useAuth();
  const navigate = useNavigate();

  // Redirect automatically whenever authenticated user state is active
  useEffect(() => {
    if (user?.role) {
      navigate(getHomeRouteForRole(user.role), { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleCallback = async (response) => {
    if (!response?.credential) {
      toast.error('Google sign-in did not return a credential');
      return;
    }
    setGoogleLoading(true);
    try {
      const data = await googleLogin(response.credential);
      toast.success('Signed in with Google successfully!');
      navigate(getHomeRouteForRole(data?.user?.role), { replace: true });
    } catch (error) {
      console.error('Google login error:', error);
      const { message } = extractApiError(error);
      toast.error(message || error?.message || 'Google Sign-In failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '207858797235-1i5rnv0kehqaf34a3cj04el6r4i5rvng.apps.googleusercontent.com';

    const renderGoogleBtn = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          const btnEl = document.getElementById('googleSignInBtn');
          if (btnEl) {
            btnEl.innerHTML = '';
            window.google.accounts.id.renderButton(btnEl, {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              shape: 'rectangular',
              text: 'signin_with',
              logo_alignment: 'left',
              width: 320,
            });
          }
        } catch (err) {
          console.error('Google button rendering failed:', err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleBtn();
    } else {
      const checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          renderGoogleBtn();
        }
      }, 200);
      return () => clearInterval(checkInterval);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!identifier || !String(identifier).trim()) {
      nextErrors.identifier = 'Email or mobile is required';
    }
    if (!password || !String(password).trim()) {
      nextErrors.password = 'Password is required';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const data = await login(identifier, password);
      toast.success('Login successful!');
      navigate(getHomeRouteForRole(data?.user?.role), { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      const resolvedFieldErrors = error?.fieldErrors;
      if (resolvedFieldErrors && typeof resolvedFieldErrors === 'object') {
        setErrors(resolvedFieldErrors);
      }
      const { message } = extractApiError(error);
      toast.error(message || error?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-pop border border-white/20 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30 mb-4 p-2">
              {logoUrl ? (
                <img src={logoUrl} alt={schoolName} className="max-h-full max-w-full object-contain" />
              ) : (
                <FiAward className="text-2xl text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{branding.login?.welcomeTitle || schoolName}</h1>
            <p className="text-xs text-slate-500 mt-1">{branding.login?.welcomeSubtitle || `${branding.identity?.motto || 'School Management ERP'} • ${branding.identity?.address?.city || 'Napier Town'}`}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email or Mobile</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: undefined }));
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition ${
                    errors.identifier ? 'border-danger-300' : 'border-slate-300'
                  }`}
                  placeholder="Enter email or mobile"
                  required
                />
              </div>
              {errors.identifier && <p className="mt-1 text-xs text-danger-600">{errors.identifier}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <PasswordInput
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.password ? 'border-danger-300' : 'border-slate-300'
                  }`}
                  placeholder="Enter password"
                  required
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-danger-600">{errors.password}</p>}
            </div>

            <Button type="submit" variant="primary" loading={loading} icon={FiLogIn} className="w-full py-2.5">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="flex items-center justify-center">
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Forgot password?
              </Link>
            </div>
          </form>

          {/* Social login divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/95 px-3 text-slate-400 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In Container */}
          <div className="flex flex-col items-center justify-center">
            <div id="googleSignInBtn" className="w-full flex justify-center min-h-[44px]"></div>
            {googleLoading && (
              <div className="flex items-center gap-2 mt-3 text-xs text-primary-600 font-medium">
                <svg className="animate-spin h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Verifying Google account...</span>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Need access? <span className="text-slate-700 font-medium">Contact your administrator</span>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} {schoolName}
          {showPlatformAttribution ? (
            <span> • Powered by <span className="font-semibold text-slate-700">SES Educare</span> (STARTOLOGY EDUCARE SERVICES PRIVATE LIMITED)</span>
          ) : (
            <span>. All rights reserved.</span>
          )}
          {' • '}<span className="text-slate-400 font-mono">v{APP_VERSION}</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
