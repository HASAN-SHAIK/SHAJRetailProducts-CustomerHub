import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const inventoryPages = fs.readFileSync(new URL('../src/pages/InventoryPages.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/api.js', import.meta.url), 'utf8');

const requireText = (source, value, message) => {
  if (!source.includes(value)) throw new Error(message || `Missing required contract: ${value}`);
};

requireText(app, 'path="inventory/suppliers" element={<SuppliersPage />}', 'RetailHub must route supplier management.');
requireText(app, "from './pages/InventoryPages.jsx'", 'The runtime supplier route must be checked against its actual imported module.');

const start = inventoryPages.indexOf('export function SuppliersPage()');
const end = inventoryPages.indexOf('export function PurchaseEntryPage()', start);
if (start < 0 || end < 0) throw new Error('Unable to locate the routed SuppliersPage implementation.');
const routedPage = inventoryPages.slice(start, end);

requireText(routedPage, 'Outstanding balance remains a Central financial projection', 'Routed supplier UI must explicitly preserve Central balance authority.');
requireText(routedPage, 'balances are purchase/payment owned', 'Routed supplier UI must state the purchase/payment balance boundary.');
requireText(routedPage, 'api.updateSupplier', 'Routed supplier UI must support canonical supplier updates.');
requireText(api, "centralApi.get('/v1/suppliers'", 'Runtime supplier list must use the canonical Central V1 API.');
requireText(api, "centralApi.post('/v1/suppliers'", 'Runtime supplier create must use the canonical Central V1 API.');
requireText(api, "centralApi.put(`/v1/suppliers/", 'Runtime supplier update must use the canonical Central V1 API.');

if (/current_balance\s*:\s*Number\(form\.current_balance/.test(routedPage) || routedPage.includes("set('current_balance'")) {
  throw new Error('Routed supplier UI must not directly edit or submit current_balance.');
}

console.log('RetailHub routed inventory supplier acceptance passed.');
