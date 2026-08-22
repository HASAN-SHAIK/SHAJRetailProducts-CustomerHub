import axios from 'axios';

const CENTRAL_API_URL = import.meta.env.VITE_CENTRAL_API_URL || 'http://localhost:5001/api';
const POS_SERVICE_URL = import.meta.env.VITE_POS_SERVICE_URL || 'http://127.0.0.1:4782';
const POS_LOCAL_API_TOKEN = import.meta.env.VITE_POS_LOCAL_API_TOKEN || '';
const TOKEN_KEY = 'shaj_hub_access_token';
const DEVICE_KEY = 'shaj_hub_device_id';

const getDeviceId = () => {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `hub-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
};

export const centralApi = axios.create({ baseURL: CENTRAL_API_URL, withCredentials: true, timeout: 12000 });
export const posApi = axios.create({ baseURL: POS_SERVICE_URL, timeout: 5000 });

centralApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  config.headers = config.headers || {};
  config.headers['x-device-id'] = getDeviceId();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

posApi.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (POS_LOCAL_API_TOKEN) config.headers['X-POS-Local-Token'] = POS_LOCAL_API_TOKEN;
  return config;
});

let refreshPromise = null;
centralApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    if (error?.response?.status !== 401 || original?._hubRetried || String(original?.url || '').includes('/auth/')) throw error;
    original._hubRetried = true;
    refreshPromise ||= centralApi.post('/auth/refresh').finally(() => { refreshPromise = null; });
    const refresh = await refreshPromise;
    if (refresh?.data?.token) {
      setAccessToken(refresh.data.token);
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${refresh.data.token}`;
      return centralApi(original);
    }
    throw error;
  }
);

export const setAccessToken = (token) => token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const unwrap = (response, key) => { const body = response?.data?.data ?? response?.data ?? {}; return key ? body?.[key] ?? body : body; };

export const api = {
  login: (payload) => centralApi.post('/auth/login', { ...payload, device_id: getDeviceId(), remember_me: true }),
  session: () => centralApi.get('/auth/getLogin'),
  logout: () => centralApi.post('/auth/logout'),

  applicationSettings: () => centralApi.get('/settings/application'),
  updateApplicationSettings: (payload) => centralApi.put('/settings/application', payload),

  configurationCatalog: () => centralApi.get('/configuration/catalog'),
  effectiveConfiguration: ({ branchId, deviceId } = {}) => centralApi.get('/configuration/effective', {
    params: { branch_id: branchId || undefined, device_id: deviceId || undefined },
  }),
  scopeConfiguration: (scopeType, scopeId) => centralApi.get(`/configuration/scopes/${scopeType}/${scopeId}`),
  updateScopeConfiguration: (scopeType, scopeId, values) => centralApi.put(`/configuration/scopes/${scopeType}/${scopeId}`, { values }),
  resetScopeConfiguration: (scopeType, scopeId, settingKey) => centralApi.delete(`/configuration/scopes/${scopeType}/${scopeId}/${encodeURIComponent(settingKey)}`),
  configurationAudit: (scopeType, scopeId, limit = 100) => centralApi.get(`/configuration/scopes/${scopeType}/${scopeId}/audit`, { params: { limit } }),

  branches: () => centralApi.get('/branches'),
  createBranch: (payload) => centralApi.post('/branches', payload),
  branchDevices: (branchId) => centralApi.get(`/branches/${branchId}/devices`),
  registerDevice: (branchId, payload) => centralApi.post(`/branches/${branchId}/devices/register`, payload),
  deactivateDevice: (branchId, deviceId) => centralApi.patch(`/branches/${branchId}/devices/${deviceId}/deactivate`),
  posRegistrationRequests: (status) => centralApi.get('/pos-registration/requests', { params: { status: status || undefined } }),
  approvePosRegistration: (requestId, payload) => centralApi.post(`/pos-registration/requests/${requestId}/approve`, payload),
  rejectPosRegistration: (requestId) => centralApi.post(`/pos-registration/requests/${requestId}/reject`),

  users: () => centralApi.get('/users'),
  createUser: (payload) => centralApi.post('/users', payload),
  updateUserRole: (userId, role) => centralApi.patch(`/users/${userId}/role`, { role }),
  updateUserAccess: (userId, payload) => centralApi.patch(`/users/${userId}/access`, payload),

  customers: ({ search = '', page = 1, limit = 100 } = {}) => centralApi.get('/v1/customers', {
    params: { search: search || undefined, page, limit },
  }),
  customerDetail: (customerId) => centralApi.get(`/v1/customers/${encodeURIComponent(String(customerId))}`),
  createCustomer: (payload) => centralApi.post('/v1/customers', payload),
  updateCustomer: (customerId, payload) => centralApi.put(`/v1/customers/${encodeURIComponent(String(customerId))}`, payload),

  staff: ({ search = '', status = '', branchId = '' } = {}) => centralApi.get('/v1/staff', {
    params: { search: search || undefined, status: status || undefined, branch_id: branchId || undefined },
  }),
  staffMember: (staffId) => centralApi.get(`/v1/staff/${encodeURIComponent(String(staffId))}`),
  createStaff: (payload) => centralApi.post('/v1/staff', payload),
  updateStaff: (staffId, payload) => centralApi.put(`/v1/staff/${encodeURIComponent(String(staffId))}`, payload),
  deleteStaff: (staffId) => centralApi.delete(`/v1/staff/${encodeURIComponent(String(staffId))}`),

  expenses: ({ branchId = '', type = '', from = '', to = '', page = 1, limit = 200 } = {}) => centralApi.get('/expenses', {
    params: { branch_id: branchId || undefined, type: type || undefined, from: from || undefined, to: to || undefined, page, limit },
  }),
  createExpense: (payload) => centralApi.post('/expenses', payload),
  updateExpense: (expenseId, payload) => centralApi.put(`/expenses/${encodeURIComponent(String(expenseId))}`, payload),
  deleteExpense: (expenseId) => centralApi.delete(`/expenses/${encodeURIComponent(String(expenseId))}`),
  dailyExpenseReport: ({ date, branchId } = {}) => centralApi.get('/expenses/daily', { params: { date: date || undefined, branch_id: branchId || undefined } }),
  monthlyExpenseReport: ({ month, branchId } = {}) => centralApi.get('/expenses/monthly', { params: { month: month || undefined, branch_id: branchId || undefined } }),

  dashboardRevenueOverview: ({ range = 'this_month', branchId, location } = {}) => centralApi.get('/dashboard/revenue-overview', {
    params: { range, branch_id: branchId || undefined, location: location || undefined },
  }),
  dashboardGrowthComparison: ({ range = 'this_month', branchId, location } = {}) => centralApi.get('/dashboard/growth-comparison', {
    params: { range, branch_id: branchId || undefined, location: location || undefined },
  }),
  dashboardSalesTrend: ({ range = 'this_month', branchId, location } = {}) => centralApi.get('/dashboard/sales-trend', {
    params: { range, branch_id: branchId || undefined, location: location || undefined },
  }),
  dashboardCategoryPerformance: ({ range = 'this_month', location } = {}) => centralApi.get('/dashboard/category-performance', {
    params: { range, location: location || undefined },
  }),
  dashboardLocationPerformance: ({ range = 'this_month' } = {}) => centralApi.get('/dashboard/location-performance', {
    params: { range },
  }),
  dashboardSmartInsights: ({ range = 'this_month', branchId, location } = {}) => centralApi.get('/dashboard/smart-insights', {
    params: { range, branch_id: branchId || undefined, location: location || undefined },
  }),
  dashboardLocationsList: () => centralApi.get('/dashboard/locations-list'),
  inventoryReport: ({ branchId } = {}) => centralApi.get('/reports/inventory', {
    params: { branch_id: branchId || undefined },
  }),
  customerOutstandingReport: ({ page = 1, limit = 50 } = {}) => centralApi.get('/reports/customers-outstanding', {
    params: { page, limit },
  }),

  posHealth: () => posApi.get('/api/v1/health'),
  posReady: () => posApi.get('/api/v1/ready'),
  posStatus: () => posApi.get('/api/v1/status'),
  posDiagnostics: () => posApi.get('/api/v1/diagnostics'),
  posSyncDiagnostics: () => posApi.get('/api/v1/diagnostics/sync-events', { params: { limit: 50 } }),
  posSyncStatus: () => posApi.get('/api/v1/sync/status'),
  runPosSync: () => posApi.post('/api/v1/sync/now'),
  posConfiguration: () => posApi.get('/api/v1/config'),
  refreshPosConfiguration: () => posApi.post('/api/v1/config/refresh'),
};
