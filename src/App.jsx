import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { flatV1Items } from './config/v1Navigation';
import AppShell from './components/AppShell.jsx';
import UserDirectory from './components/UserDirectory.jsx';
import LoginPage from './pages/LoginPage.jsx';
import OverviewPage from './pages/OverviewPage.jsx';
import SalesRevenuePage from './pages/SalesRevenuePage.jsx';
import ProfitGrowthPage from './pages/ProfitGrowthPage.jsx';
import InventoryAnalyticsPage from './pages/InventoryAnalyticsPage.jsx';
import ProductCategoryAnalyticsPage from './pages/ProductCategoryAnalyticsPage.jsx';
import CustomerCreditAnalyticsPage from './pages/CustomerCreditAnalyticsPage.jsx';
import BranchPerformancePage from './pages/BranchPerformancePage.jsx';
import SmartInsightsPage from './pages/SmartInsightsPage.jsx';
import CustomersPage from './pages/CustomersPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import StaffPage from './pages/StaffPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import AccountsPage from './pages/AccountsPage.jsx';
import BusinessPage from './pages/BusinessPage.jsx';
import StoresPage from './pages/StoresPage.jsx';
import DevicesPage from './pages/DevicesPage.jsx';
import OfflineSyncPage from './pages/OfflineSyncPage.jsx';
import ConfigurationPage from './pages/ConfigurationPage.jsx';
import ConfigurationAuditPage from './pages/ConfigurationAuditPage.jsx';
import GenericModulePage from './pages/GenericModulePage.jsx';
import V1FeaturePage from './pages/V1FeaturePage.jsx';
import './styles/users.css';

const routePath = (path) => path.replace(/^\//, '') || undefined;
const implementedPaths = new Set([
  '/',
  '/analytics/sales',
  '/analytics/profit-growth',
  '/analytics/inventory',
  '/analytics/products-categories',
  '/analytics/customers-credit',
  '/analytics/branches',
  '/analytics/smart-insights',
  '/customers',
  '/orders',
  '/staff',
  '/staff/new',
  '/staff/edit',
  '/staff/salary',
  '/staff/branch-assignment',
  '/staff/roles-status',
  '/finance/expenses',
  '/staff/expenses',
  '/staff/performance',
  '/finance/accounts',
  '/business',
  '/stores',
  '/pos-setup',
  '/devices',
  '/offline-sync',
  '/offline-policies',
  '/hardware',
  '/receipts',
  '/tax',
  '/billing',
  '/inventory',
  '/inventory/policies',
  '/users',
  '/payments',
  '/integrations',
  '/security',
  '/audit',
  '/notifications',
  '/data',
]);

const v1PlaceholderItems = flatV1Items.filter((item) => !implementedPaths.has(item.path));

export default function App() {
  const { user, loading, logout } = useAuth();
  if (loading) return <div className="app-loader"><div className="brand-mark large">S</div><span>Loading SHAJ Retail Hub...</span></div>;
  if (!user) return <LoginPage />;
  if (String(user.role || '').toLowerCase() !== 'admin') return <div className="app-loader"><div className="brand-mark large">S</div><strong>Tenant administrator access required</strong><span>SHAJ Retail Hub manages business, store and POS policies.</span><button className="secondary-btn" onClick={logout}>Sign out</button></div>;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="analytics/sales" element={<SalesRevenuePage />} />
        <Route path="analytics/profit-growth" element={<ProfitGrowthPage />} />
        <Route path="analytics/inventory" element={<InventoryAnalyticsPage />} />
        <Route path="analytics/products-categories" element={<ProductCategoryAnalyticsPage />} />
        <Route path="analytics/customers-credit" element={<CustomerCreditAnalyticsPage />} />
        <Route path="analytics/branches" element={<BranchPerformancePage />} />
        <Route path="analytics/smart-insights" element={<SmartInsightsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="staff/new" element={<StaffPage mode="new" />} />
        <Route path="staff/edit" element={<StaffPage mode="edit" />} />
        <Route path="staff/salary" element={<StaffPage mode="salary" />} />
        <Route path="staff/branch-assignment" element={<StaffPage mode="branch-assignment" />} />
        <Route path="staff/roles-status" element={<StaffPage mode="roles-status" />} />
        <Route path="staff/expenses" element={<StaffPage mode="expenses" />} />
        <Route path="staff/performance" element={<StaffPage mode="performance" />} />
        <Route path="finance/expenses" element={<ExpensesPage />} />
        <Route path="finance/accounts" element={<AccountsPage />} />
        <Route path="business" element={<BusinessPage />} />
        <Route path="stores" element={<StoresPage />} />
        <Route path="pos-setup" element={<DevicesPage />} />
        <Route path="devices" element={<Navigate to="/pos-setup" replace />} />
        <Route path="stores-pos/registered-devices" element={<Navigate to="/pos-setup" replace />} />
        <Route path="offline-sync" element={<OfflineSyncPage />} />
        <Route path="offline-policies" element={<ConfigurationPage kind="offline" />} />
        <Route path="hardware" element={<ConfigurationPage kind="hardware" />} />
        <Route path="receipts" element={<ConfigurationPage kind="receipts" />} />
        <Route path="tax" element={<ConfigurationPage kind="tax" />} />
        <Route path="billing" element={<ConfigurationPage kind="billing" />} />
        <Route path="inventory" element={<Navigate to="/inventory/policies" replace />} />
        <Route path="inventory/policies" element={<ConfigurationPage kind="inventory" />} />
        <Route path="users" element={<UserDirectory />} />
        <Route path="payments" element={<GenericModulePage moduleKey="payments" />} />
        <Route path="integrations" element={<GenericModulePage moduleKey="integrations" />} />
        <Route path="security" element={<ConfigurationPage kind="security" />} />
        <Route path="audit" element={<ConfigurationAuditPage />} />
        <Route path="notifications" element={<GenericModulePage moduleKey="notifications" />} />
        <Route path="data" element={<GenericModulePage moduleKey="data" />} />
        <Route path="automation" element={<GenericModulePage moduleKey="automation" status="future" />} />
        <Route path="ai-insights" element={<GenericModulePage moduleKey="ai-insights" status="future" />} />
        <Route path="commerce" element={<GenericModulePage moduleKey="commerce" status="future" />} />
        <Route path="developer" element={<GenericModulePage moduleKey="developer" status="future" />} />
        {v1PlaceholderItems.map((item) => <Route key={item.path} path={routePath(item.path)} element={<V1FeaturePage />} />)}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
