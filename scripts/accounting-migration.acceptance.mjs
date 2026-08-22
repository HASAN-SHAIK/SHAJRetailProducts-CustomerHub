import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const app = read('src/App.jsx');
const modules = read('src/config/modules.js');
const api = read('src/lib/api.js');
const page = read('src/pages/AccountsPage.jsx');

const required = [
  [app.includes('AccountsPage'), 'Accounts page is routed'],
  [app.includes('finance/accounts'), 'Accounts route is under Finance'],
  [modules.includes("label: 'Accounts'"), 'Accounts navigation is live'],
  [api.includes("'/accounts/receipt'"), 'Receipt Entry uses Central accounting API'],
  [api.includes("'/accounts/payment'"), 'Payment Entry uses Central accounting API'],
  [api.includes("'/accounts/cashbook'"), 'Cash Book uses Central accounting API'],
  [api.includes("'/accounts/bankbook'"), 'Bank Book uses Central accounting API'],
  [api.includes("'/accounts/ledger'"), 'Ledger uses Central accounting API'],
  [api.includes("'/accounts/outstanding'"), 'Outstanding uses Central accounting API'],
  [api.includes("'/accounts/opening-setup'"), 'Opening Setup uses Central accounting API'],
  [page.includes('Central/PostgreSQL accounting authority'), 'Page declares Central accounting authority'],
  [page.includes('POS keeps only store-execution cash/register actions'), 'POS operational cash boundary is preserved'],
  [!page.includes('posApi') && !page.includes('localStorage') && !page.includes('indexedDB'), 'Accounts management has no POS/browser-local authority fallback'],
  [page.includes('Loading accounting data') && page.includes('Accounting data unavailable') && page.includes('No entries found'), 'Loading/error/empty states are explicit'],
  [page.includes('client_txn_id'), 'Receipt/payment mutations use client transaction idempotency keys'],
];

const failed = required.filter(([ok]) => !ok);
for (const [ok, label] of required) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
if (failed.length) process.exit(1);
