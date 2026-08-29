import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const inventoryApi = fs.readFileSync(new URL('../src/lib/inventoryApi.js', import.meta.url), 'utf8');
const modules = fs.readFileSync(new URL('../src/config/modules.js', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../src/pages/StockAdjustmentsPage.jsx', import.meta.url), 'utf8');

const requireText = (source, value, message) => {
  if (!source.includes(value)) throw new Error(message || `Missing required contract: ${value}`);
};

requireText(app, 'path="inventory/stock-adjustments" element={<StockAdjustmentsPage />}', 'Stock Adjustments must have a live RetailHub route.');
requireText(modules, "path: '/inventory/stock-adjustments'", 'Stock Adjustments must be visible in Inventory navigation.');
requireText(inventoryApi, "centralApi.post('/stock/adjustments'", 'Stock correction must use the canonical Central adjustment endpoint.');
requireText(inventoryApi, "centralApi.get('/stock'", 'Stock correction must read canonical branch stock before adjustment.');
requireText(inventoryApi, "centralApi.get('/batches'", 'Batch-managed corrections must select canonical Central batches.');
requireText(page, 'Reason is required for every manual stock adjustment.', 'Every manual correction must require an audit reason.');
requireText(page, 'reference_id: referenceId.trim() || null', 'Manual adjustment must carry an optional audit reference.');
requireText(page, 'Adjustment cannot make canonical stock negative.', 'UI must reject obvious negative-stock corrections before submission.');
requireText(page, "selectedProduct?.is_batch_enabled && !batchId", 'Batch-managed adjustments must require the exact batch.');
requireText(page, 'This page never writes stock locally.', 'RetailHub must state the Central stock authority boundary.');
if (page.includes('stock_quantity:') || page.includes('localStorage') || page.includes('indexedDB') || page.includes('posApi')) {
  throw new Error('Stock Adjustments must not create a browser/POS stock authority or edit product stock directly.');
}

console.log('RetailHub audited stock adjustments acceptance passed.');
