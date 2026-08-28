import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const inventoryApi = fs.readFileSync(new URL('../src/lib/inventoryApi.js', import.meta.url), 'utf8');
const modules = fs.readFileSync(new URL('../src/config/modules.js', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../src/pages/ProductCatalogPage.jsx', import.meta.url), 'utf8');

const requireText = (source, value, message) => {
  if (!source.includes(value)) throw new Error(message || `Missing required contract: ${value}`);
};

requireText(app, 'path="inventory/catalog" element={<ProductCatalogPage />}', 'RetailHub must route the product catalog workspace.');
requireText(modules, "path: '/inventory/catalog'", 'Inventory product management must be visible in RetailHub navigation.');
requireText(inventoryApi, "centralApi.get('/v1/products'", 'Product catalog must use the Central V1 products contract.');
requireText(inventoryApi, "centralApi.get('/v1/categories'", 'Product category filters must use the Central V1 categories contract.');
requireText(page, 'Central product master', 'Product master authority must be explicit.');
requireText(page, 'Store / branch', 'Product catalog must expose branch scope.');
requireText(page, 'Product, brand/company or barcode', 'Product catalog must expose useful product search.');
requireText(page, 'Batch tracked', 'Batch-managed products must be distinguished from simple stock products.');
requireText(page, 'Inventory truth boundary', 'Product catalog must state the canonical inventory truth boundary.');
requireText(page, 'Page {meta.page} of {meta.total_pages}', 'Product catalog must expose server-backed pagination.');
if (page.includes('posApi') || page.includes('localStorage') || page.includes('indexedDB')) {
  throw new Error('RetailHub product management must not use POS/browser-local product authority.');
}

console.log('RetailHub inventory product catalog acceptance passed.');
