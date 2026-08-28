import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const modules = fs.readFileSync(new URL('../src/config/modules.js', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/inventoryApi.js', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../src/pages/SuppliersPage.jsx', import.meta.url), 'utf8');

const requireText = (source, value, message) => {
  if (!source.includes(value)) throw new Error(message || `Missing required contract: ${value}`);
};

requireText(app, 'path="inventory/suppliers" element={<SuppliersPage />}', 'RetailHub must route supplier management.');
requireText(modules, "path: '/inventory/suppliers'", 'Suppliers must be visible in inventory navigation.');
requireText(api, "centralApi.get('/v1/suppliers'", 'Supplier list must use Central V1 supplier API.');
requireText(api, "centralApi.post('/v1/suppliers'", 'Supplier create must use Central V1 supplier API.');
requireText(api, "centralApi.put(`/v1/suppliers/", 'Supplier update must use Central V1 supplier API.');
requireText(page, 'Outstanding balance remains a Central financial projection', 'Supplier balance authority must be explicit.');
requireText(page, '`current_balance` is intentionally excluded from create/update payloads', 'Supplier UI must not directly edit current balance.');
requireText(page, 'credit_limit', 'Supplier credit limit must be managed as master data.');
requireText(page, 'gst_number', 'Supplier GST master data must be supported.');
requireText(page, 'branch_id', 'Supplier branch association must be supported.');
if (page.includes('posApi') || page.includes('localStorage') || page.includes('indexedDB')) {
  throw new Error('Supplier management must not use POS/browser-local authority.');
}

console.log('RetailHub inventory supplier acceptance passed.');
