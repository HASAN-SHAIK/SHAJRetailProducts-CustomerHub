import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/inventoryApi.js', import.meta.url), 'utf8');
const modules = fs.readFileSync(new URL('../src/config/modules.js', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../src/pages/PurchaseEntryPage.jsx', import.meta.url), 'utf8');

const requireText = (source, text, message) => { if (!source.includes(text)) throw new Error(message || `Missing: ${text}`); };

requireText(app, 'path="inventory/purchases/new" element={<PurchaseEntryPage />}', 'Purchase Entry route must be live.');
requireText(modules, "path: '/inventory/purchases/new'", 'Purchase Entry must be discoverable in navigation.');
requireText(api, "centralApi.post('/v1/purchases'", 'Purchase Entry must reuse Central V1 purchase creation.');
requireText(page, 'Central owns batches, stock movement, supplier payable and accounting postings.', 'Purchase authority boundary must be explicit.');
requireText(page, 'product_id: Number(product.id)', 'Receiving must submit canonical product IDs.');
requireText(page, 'branch_id: branchId', 'Purchase receiving must preserve branch scope.');
requireText(page, 'supplier_id: Number(supplierId)', 'Purchase receiving must preserve supplier identity.');
requireText(page, 'Batch number is required', 'Batch-managed products must require a batch identifier in RetailHub.');
requireText(page, 'Inventory invariant', 'Purchase Entry must document inventory invariants.');
if (page.includes('localStorage') || page.includes('indexedDB') || page.includes('posApi')) throw new Error('Purchase management must not introduce POS/browser-local authority.');
if (page.includes('UPDATE products') || page.includes('INSERT INTO batches')) throw new Error('RetailHub must not duplicate Central inventory mutation logic.');

console.log('RetailHub inventory purchase entry acceptance passed.');
