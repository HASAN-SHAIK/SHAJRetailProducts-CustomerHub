import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const app = read('src/App.jsx');
const modules = read('src/config/modules.js');
const api = read('src/lib/api.js');
const page = read('src/pages/CustomersPage.jsx');
const matrix = read('docs/RETAILHUB_CUSTOMER_MIGRATION_MATRIX.md');

const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`Missing ${label}: ${text}`);
};

requireText(app, 'path="customers"', 'RetailHub customer route');
requireText(app, 'CustomersPage', 'RetailHub customer page import');
requireText(modules, "path: '/customers'", 'RetailHub customer navigation');
for (const endpoint of ["'/v1/customers'", "`/v1/customers/${encodeURIComponent(String(customerId))}`"]) {
  requireText(api, endpoint, 'canonical customer API');
}
requireText(api, 'createCustomer:', 'customer create API');
requireText(api, 'updateCustomer:', 'customer update API');
requireText(page, 'Central/PostgreSQL is the authority', 'customer authority statement');
requireText(page, 'Loading customers', 'loading state');
requireText(page, 'Retry customers', 'retry state');
requireText(page, 'No customers found', 'empty state');
requireText(page, 'Edit master profile', 'customer management action');
requireText(page, 'Credit limit', 'credit limit administration');
requireText(page, 'Outstanding balance is a Central financial projection and is not directly editable here.', 'financial projection boundary');
requireText(matrix, 'Checkout customer search/select', 'POS retained checkout boundary');
requireText(matrix, 'Offline lightweight capture', 'POS retained offline capture boundary');

for (const forbidden of ['posApi.get', 'posDiagnostics', 'posStatus', 'getAllCustomers', 'IndexedDB', 'Dexie']) {
  if (page.includes(forbidden)) throw new Error(`RetailHub customer management must not depend on POS/browser authority: ${forbidden}`);
}

console.log('RetailHub customer migration acceptance passed');
