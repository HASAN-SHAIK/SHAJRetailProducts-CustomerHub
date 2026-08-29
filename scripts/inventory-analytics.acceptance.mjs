import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/pages/InventoryAnalyticsPage.jsx', import.meta.url), 'utf8');
const inventoryApi = fs.readFileSync(new URL('../src/lib/inventoryApi.js', import.meta.url), 'utf8');

const requireText = (source, value, message) => {
  if (!source.includes(value)) throw new Error(message || `Missing required contract: ${value}`);
};

requireText(page, "api.inventoryReport({ branchId })", 'Inventory Analytics must use the canonical Central aggregate inventory report.');
requireText(page, "inventoryApi.products({ branchId", 'Inventory Analytics product drill-down must be branch-scoped through V1 products.');
requireText(page, 'Products needing attention', 'Inventory Analytics must surface product-level operational exceptions.');
requireText(page, 'product.inventory.is_low_stock', 'Low-stock attention must come from the Central product inventory projection.');
requireText(page, 'product.inventory.is_out_of_stock', 'Out-of-stock attention must come from the Central product inventory projection.');
requireText(page, 'expired_quantity', 'Expiry risk must be visible from canonical inventory facts.');
requireText(page, 'provisional_deficit', 'Offline provisional deficits must remain visible.');
requireText(page, 'RetailHub does not recalculate canonical totals', 'Analytics must preserve Central aggregate authority.');
requireText(inventoryApi, "centralApi.get('/v1/products'", 'Product drill-down must reuse the existing V1 product contract.');
if (page.includes('posApi') || page.includes('indexedDB') || page.includes('localStorage')) {
  throw new Error('Inventory Analytics must not use POS/browser-local inventory authority.');
}
if (page.includes('stock_value_purchase =') || page.includes('total_stock =')) {
  throw new Error('RetailHub must not recreate canonical inventory aggregate formulas.');
}

console.log('RetailHub Inventory Analytics acceptance passed.');
