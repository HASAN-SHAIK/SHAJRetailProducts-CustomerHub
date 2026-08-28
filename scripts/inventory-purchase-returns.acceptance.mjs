import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const inventoryApi = fs.readFileSync(new URL('../src/lib/inventoryApi.js', import.meta.url), 'utf8');
const modules = fs.readFileSync(new URL('../src/config/modules.js', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../src/pages/PurchaseReturnsPage.jsx', import.meta.url), 'utf8');

const requireText = (source, value, message) => {
  if (!source.includes(value)) throw new Error(message || `Missing required contract: ${value}`);
};

requireText(app, 'path="inventory/purchase-returns" element={<PurchaseReturnsPage />}', 'RetailHub must route Purchase Returns.');
requireText(modules, "path: '/inventory/purchase-returns'", 'Purchase Returns must be visible in inventory navigation.');
requireText(inventoryApi, "centralApi.get('/v1/purchase-returns'", 'Return history must use the Central V1 purchase-return contract.');
requireText(inventoryApi, "centralApi.post('/v1/purchase-returns'", 'Return mutation must use the Central V1 purchase-return contract.');
requireText(page, 'Return quantity cannot exceed the selected batch remaining quantity.', 'RetailHub must reject obvious over-returns before submission.');
requireText(page, 'batch_id: selectedBatch.id', 'Return mutation must preserve canonical batch identity.');
requireText(page, 'product_id: Number(selectedBatch.product_id)', 'Return mutation must preserve canonical product identity.');
requireText(page, 'purchase_id: Number(order.id)', 'Return mutation must preserve original purchase identity.');
requireText(page, 'Inventory invariant', 'Purchase Returns must state the Central inventory authority boundary.');
if (page.includes('stock_quantity =') || page.includes('localStorage') || page.includes('indexedDB') || page.includes('posApi')) {
  throw new Error('RetailHub Purchase Returns must not implement browser/POS inventory mutation authority.');
}

console.log('RetailHub inventory purchase returns acceptance passed.');
