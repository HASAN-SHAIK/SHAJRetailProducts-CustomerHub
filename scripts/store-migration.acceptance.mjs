import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const api = read('src/lib/api.js');
const page = read('src/pages/StoresPage.jsx');
const devices = read('src/pages/DevicesPage.jsx');
const contract = read('docs/API_CONTRACT.md');

const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`Missing ${label}: ${text}`);
};

requireText(api, "branches: () => centralApi.get('/branches')", 'canonical branch list API');
requireText(api, "createBranch: (payload) => centralApi.post('/branches', payload)", 'canonical branch create API');
requireText(page, "store_number: ''", 'Store Number create form state');
requireText(page, 'Store Number', 'Store Number UI label');
requireText(page, "store_number: form.store_number", 'Store Number create payload');
requireText(page, 'getStoreNumber', 'Store Number display mapping');
requireText(page, 'store-fleet-table', 'Store Number table layout');
requireText(page, '/stores-pos/registered-devices?branch=', 'POS setup route link');
requireText(devices, 'getStoreNumber', 'Store Number POS setup mapping');
requireText(devices, 'Store Number', 'Store Number POS setup display');
requireText(devices, 'touchpoint_id', 'Touchpoint ID setup payload');
requireText(devices, 'pos_no: terminal_id', 'POS No setup payload');
requireText(api, 'createPosSetupCode:', 'POS setup-code API');
requireText(contract, 'store_number', 'Store Number branch contract documentation');

console.log('RetailHub store migration acceptance passed');
