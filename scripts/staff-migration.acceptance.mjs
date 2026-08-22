import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/api.js', import.meta.url), 'utf8');
const modules = fs.readFileSync(new URL('../src/config/modules.js', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../src/pages/StaffPage.jsx', import.meta.url), 'utf8');

const requireText = (source, value, message) => {
  if (!source.includes(value)) throw new Error(message || `Missing required contract: ${value}`);
};

requireText(app, 'path="staff" element={<StaffPage />}', 'RetailHub must route canonical staff management.');
requireText(modules, "path: '/staff'", 'Staff must be visible in RetailHub management navigation.');
requireText(api, "centralApi.get('/v1/staff'", 'Staff directory must use the Central staff API.');
requireText(api, "centralApi.post('/v1/staff'", 'Staff creation must use the Central staff API.');
requireText(api, "centralApi.put(`/v1/staff/", 'Staff updates/status changes must use the Central staff API.');
requireText(page, 'Central/PostgreSQL is authoritative for staff profile data.', 'Staff profile authority must be explicit.');
requireText(page, 'Login roles and permissions remain a separate access-control concern.', 'Staff profile role must not be conflated with login RBAC.');
requireText(page, 'Deactivate', 'RetailHub must expose staff activation/deactivation management.');
requireText(page, 'Branch assignment', 'RetailHub must expose canonical branch assignment.');
if (page.includes('posApi') || page.includes('localStorage') || page.includes('indexedDB')) {
  throw new Error('RetailHub staff management must not use POS/browser-local staff authority.');
}

console.log('RetailHub staff migration acceptance passed.');
