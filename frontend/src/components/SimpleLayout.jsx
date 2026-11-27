import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { FiLogOut, FiHome, FiAward, FiBriefcase } from 'react-icons/fi';

const SimpleLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { schoolName, shortName, logoUrl, showPlatformAttribution } = useBranding();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex-shrink-0 flex items-center">
                {logoUrl ? (
                  <img src={logoUrl} alt={schoolName} className="h-9 max-w-[140px] object-contain mr-2" />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-900 to-blue-700 rounded-lg flex items-center justify-center mr-2 shadow-xs">
                    <span className="text-white font-bold text-lg">{(shortName || 'A')[0]}</span>
                  </div>
                )}
                <span className="text-xl font-bold text-slate-900 tracking-tight">
                  {schoolName}
                </span>
              </Link>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link to="/campuses" className="border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  <FiBriefcase className="mr-2" /> Campuses
                </Link>
                <Link to="/verify-certificate-public" className="border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  <FiAward className="mr-2" /> Verify Certificate
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <Link
                    to={
                      user.role === 'super_admin' ? '/admin/dashboard' :
                      ['school_admin', 'principal', 'vice_principal', 'franchise_admin'].includes(user.role) ? '/school/dashboard' :
                      '/student/dashboard'
                    }
                    className="text-slate-500 hover:text-slate-700 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                  >
                    <FiHome className="mr-2" /> Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-red-600 hover:text-red-700 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                  >
                    <FiLogOut className="mr-2" /> Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Platform</h3>
              <ul className="mt-4 space-y-2">
                <li><Link to="/campuses" className="text-base text-slate-500 hover:text-slate-900">School Campuses</Link></li>
                <li><Link to="/verify-certificate-public" className="text-base text-slate-500 hover:text-slate-900">Verify Certificate</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Contact</h3>
              <ul className="mt-4 space-y-2">
                <li className="text-base text-slate-500">{schoolName}</li>
                <li className="text-base text-slate-500">support@seseducare.com</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Legal</h3>
              <ul className="mt-4 space-y-2">
                <li className="text-base text-slate-500">Privacy Policy</li>
                <li className="text-base text-slate-500">Terms of Service</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-8 text-center">
            <p className="text-base text-slate-400">
              &copy; {new Date().getFullYear()} {schoolName}
              {showPlatformAttribution && ' • Arion School by STARTOLOGY EDUCARE SERVICES PRIVATE LIMITED'}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SimpleLayout;

