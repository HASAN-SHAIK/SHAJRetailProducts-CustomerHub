import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import UserDirectory from './components/UserDirectory';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import SalesRevenuePage from './pages/SalesRevenuePage';
import ProfitGrowthPage from './pages/ProfitGrowthPage';
import BusinessPage from './pages/BusinessPage';
import StoresPage from './pages/StoresPage';
import DevicesPage from './pages/DevicesPage';
import OfflineSyncPage from './pages/OfflineSyncPage';
import ConfigurationPage from './pages/ConfigurationPage';
import ConfigurationAuditPage from './pages/ConfigurationAuditPage';
import GenericModulePage from './pages/GenericModulePage';
import './styles/users.css';

export default function App() {
  const { user, loading, logout } = useAuth();
  if (loading) return <div className="app-loader"><div className="brand-mark large">S</div><span>Loading SHAJ Retail Hub…</span></div>;
  if (!user) return <LoginPage />;
  if (String(user.role || '').toLowerCase() !== 'admin') return <div className="app-loader"><div className="brand-mark large">S</div><strong>Tenant administrator access required</strong><span>SHAJ Retail Hub manages business, store and POS policies.</span><button className="secondary-btn" onClick={logout}>Sign out</button></div>;
  return <Routes><Route element={<AppShell />}><Route index element={<OverviewPage />} /><Route path="analytics/sales" element={<SalesRevenuePage />} /><Route path="analytics/profit-growth" element={<ProfitGrowthPage />} /><Route path="business" element={<BusinessPage />} /><Route path="stores" element={<StoresPage />} /><Route path="devices" element={<DevicesPage />} /><Route path="offline-sync" element={<OfflineSyncPage />} /><Route path="offline-policies" element={<ConfigurationPage kind="offline" />} /><Route path="hardware" element={<ConfigurationPage kind="hardware" />} /><Route path="receipts" element={<ConfigurationPage kind="receipts" />} /><Route path="tax" element={<ConfigurationPage kind="tax" />} /><Route path="billing" element={<ConfigurationPage kind="billing" />} /><Route path="inventory" element={<ConfigurationPage kind="inventory" />} /><Route path="users" element={<UserDirectory />} /><Route path="payments" element={<GenericModulePage moduleKey="payments" />} /><Route path="integrations" element={<GenericModulePage moduleKey="integrations" />} /><Route path="security" element={<ConfigurationPage kind="security" />} /><Route path="audit" element={<ConfigurationAuditPage />} /><Route path="notifications" element={<GenericModulePage moduleKey="notifications" />} /><Route path="data" element={<GenericModulePage moduleKey="data" />} /><Route path="automation" element={<GenericModulePage moduleKey="automation" status="future" />} /><Route path="ai-insights" element={<GenericModulePage moduleKey="ai-insights" status="future" />} /><Route path="commerce" element={<GenericModulePage moduleKey="commerce" status="future" />} /><Route path="developer" element={<GenericModulePage moduleKey="developer" status="future" />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes>;
}
