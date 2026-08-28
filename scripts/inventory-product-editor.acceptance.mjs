import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/inventoryApi.js', import.meta.url), 'utf8');
const catalog = fs.readFileSync(new URL('../src/pages/ProductCatalogPage.jsx', import.meta.url), 'utf8');
const editor = fs.readFileSync(new URL('../src/pages/ProductEditorPage.jsx', import.meta.url), 'utf8');

const requireText = (source, value, message) => {
  if (!source.includes(value)) throw new Error(message || `Missing required contract: ${value}`);
};

requireText(app, 'path="inventory/products/new" element={<ProductEditorPage />}', 'Add Product must be a live RetailHub route.');
requireText(app, 'path="inventory/products/:productId/edit" element={<ProductEditorPage />}', 'Edit Product must be a live RetailHub route.');
requireText(api, "centralApi.post('/v1/products'", 'Product creation must use the Central V1 product API.');
requireText(api, 'centralApi.put(`/v1/products/${encodeURIComponent(String(productId))}`', 'Product editing must use the Central V1 product API.');
requireText(catalog, 'to="/inventory/products/new"', 'Catalog must provide an Add Product action.');
requireText(catalog, '/edit`}', 'Catalog rows must provide an Edit action.');
requireText(editor, 'Stock audit boundary', 'Product editor must make the stock mutation boundary explicit.');
requireText(editor, 'does not directly edit `stock_quantity`', 'Product editor must not expose direct stock editing.');
requireText(editor, 'Batch quantities and expiry dates are created by purchase receiving.', 'Batch expiry must remain a purchase-receiving concern.');
requireText(editor, 'MRP cannot be lower than the selling price.', 'Product editor must validate commercial pricing before submission.');
requireText(editor, 'GST percentage must be between 0 and 100.', 'Product editor must validate GST percentage before submission.');
if (editor.includes('posApi') || editor.includes('localStorage') || editor.includes('indexedDB')) {
  throw new Error('RetailHub product editing must not use POS/browser-local product authority.');
}
if (/stock_quantity\s*:\s*/.test(editor)) {
  throw new Error('Product editor payload must not directly mutate stock_quantity.');
}

console.log('RetailHub inventory product editor acceptance passed.');
