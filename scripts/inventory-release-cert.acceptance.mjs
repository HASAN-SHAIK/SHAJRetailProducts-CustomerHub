import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const app = read('src/App.jsx');
const api = read('src/lib/inventoryApi.js');
const policies = read('src/pages/InventoryPoliciesPage.jsx');
const pkg = JSON.parse(read('package.json'));
const workflow = read('.github/workflows/ci.yml');

const requiredRoutes = [
  'inventory/catalog',
  'inventory/products/new',
  'inventory/suppliers',
  'inventory/purchases/new',
  'inventory/purchases',
  'inventory/purchase-returns',
  'inventory/stock-adjustments',
  'analytics/inventory',
];
for (const route of requiredRoutes) assert(app.includes(`path="${route}"`), `Missing Inventory V1 route: ${route}`);
assert(app.includes('path="inventory" element={<InventoryPoliciesPage />}'), 'Inventory Policies route must remain wired through the certified workspace.');
assert(policies.includes('<ConfigurationPage kind="inventory" />'), 'Inventory Policies must remain on the canonical configuration engine.');
assert(policies.includes('System → Business → Store → POS'), 'Inventory Policies must preserve the effective-configuration inheritance boundary.');

const requiredApiContracts = [
  "centralApi.get('/v1/products'",
  "centralApi.post('/v1/products'",
  "centralApi.put(`/v1/products/",
  "centralApi.get('/v1/suppliers'",
  "centralApi.post('/v1/suppliers'",
  "centralApi.put(`/v1/suppliers/",
  "centralApi.get('/v1/purchases'",
  "centralApi.post('/v1/purchases'",
  "centralApi.get('/v1/purchase-returns'",
  "centralApi.post('/v1/purchase-returns'",
  "centralApi.get('/stock'",
  "centralApi.post('/stock/adjustments'",
];
for (const contract of requiredApiContracts) assert(api.includes(contract), `Missing canonical Inventory V1 API contract: ${contract}`);

const requiredTests = [
  'test:inventory-catalog',
  'test:inventory-editor',
  'test:inventory-suppliers',
  'test:inventory-purchase-entry',
  'test:inventory-purchase-book',
  'test:inventory-purchase-returns',
  'test:inventory-stock-adjustments',
  'test:inventory-analytics',
  'test:inventory-policies',
];
for (const name of requiredTests) {
  assert(pkg.scripts?.[name], `Missing Inventory V1 acceptance script: ${name}`);
  assert(workflow.includes(`npm run ${name}`), `Customer Hub CI does not execute ${name}`);
}

const forbiddenBrowserAuthority = ['localStorage', 'indexedDB', 'IndexedDB'];
for (const token of forbiddenBrowserAuthority) assert(!api.includes(token), `Inventory API client must not establish browser-local authority (${token}).`);

console.log('Inventory V1 release certification boundary checks passed.');
