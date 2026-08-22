import fs from 'node:fs';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const modules = fs.readFileSync('src/config/modules.js', 'utf8');
const api = fs.readFileSync('src/lib/api.js', 'utf8');
const page = fs.readFileSync('src/pages/ExpensesPage.jsx', 'utf8');

const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`Missing ${label}: ${text}`);
};

requireText(app, 'finance/expenses', 'RetailHub expenses route');
requireText(modules, "label: 'Finance'", 'Finance navigation group');
requireText(modules, "label: 'Expenses'", 'Expenses navigation item');
requireText(api, "centralApi.get('/expenses'", 'Central expense read authority');
requireText(api, "centralApi.post('/expenses'", 'Central expense write authority');
requireText(page, 'Central/PostgreSQL', 'canonical authority presentation');
requireText(page, 'POS remains responsible only for store-execution cash actions', 'POS execution boundary');
requireText(page, "status==='loading'", 'loading state');
requireText(page, 'Expense data unavailable', 'error state');
requireText(page, 'No expenses found', 'empty state');
if (page.includes('posApi.') || page.includes('localStorage.getItem') || page.includes('indexedDB')) {
  throw new Error('Expense management must not use POS/browser-local authority');
}
console.log('RetailHub expense migration acceptance passed');
