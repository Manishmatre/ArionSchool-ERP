import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SchoolsPage from './pages/SchoolsPage';
import PlansPage from './pages/PlansPage';
import BillingPage from './pages/BillingPage';
import LeadsPage from './pages/LeadsPage';
import DomainsPage from './pages/DomainsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import AuditPage from './pages/AuditPage';

function SuperAdminGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">
        Verifying SES Educare Super Admin session...
      </div>
    );
  }
  if (!user || user.role !== 'super_admin') {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<SuperAdminGuard><DashboardPage /></SuperAdminGuard>} />
      <Route path="/schools" element={<SuperAdminGuard><SchoolsPage /></SuperAdminGuard>} />
      <Route path="/plans" element={<SuperAdminGuard><PlansPage /></SuperAdminGuard>} />
      <Route path="/billing" element={<SuperAdminGuard><BillingPage /></SuperAdminGuard>} />
      <Route path="/leads" element={<SuperAdminGuard><LeadsPage /></SuperAdminGuard>} />
      <Route path="/domains" element={<SuperAdminGuard><DomainsPage /></SuperAdminGuard>} />
      <Route path="/users" element={<SuperAdminGuard><UsersPage /></SuperAdminGuard>} />
      <Route path="/audit" element={<SuperAdminGuard><AuditPage /></SuperAdminGuard>} />
      <Route path="/settings" element={<SuperAdminGuard><SettingsPage /></SuperAdminGuard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
