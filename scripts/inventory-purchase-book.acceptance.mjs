import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/inventoryApi.js', import.meta.url), 'utf8');
const modules = fs.readFileSync(new URL('../src/config/modules.js', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../src/pages/PurchaseBookPage.jsx', import.meta.url), 'utf8');
const requireText = (source, value, message) => { if (!source.includes(value)) throw new Error(message || `Missing: ${value}`); };

requireText(app, 'path="inventory/purchases" element={<PurchaseBookPage />}', 'Purchase Book route must be live.');
requireText(modules, "path: '/inventory/purchases'", 'Purchase Book must be navigable.');
requireText(api, "centralApi.get('/v1/purchases'", 'Purchase Book must use Central V1 list.');
requireText(api, 'centralApi.get(`/v1/purchases/${encodeURIComponent(String(purchaseId))}`)', 'Purchase detail must use Central V1 detail.');
requireText(page, 'Read-only purchase authority', 'Purchase Book must state its authority boundary.');
requireText(page, 'Central filters by branch, supplier and received date.', 'Purchase Book must expose canonical filters.');
requireText(page, 'Received batches', 'Purchase Book must expose receiving batch facts.');
if (page.includes('createPurchase(') || page.includes('updateProduct(') || page.includes('stock_quantity =')) throw new Error('Purchase Book must not mutate purchase or stock authority.');
if (page.includes('localStorage') || page.includes('indexedDB') || page.includes('posApi')) throw new Error('Purchase Book must not use browser/POS authority.');
console.log('RetailHub Inventory V1 Purchase Book acceptance passed.');
