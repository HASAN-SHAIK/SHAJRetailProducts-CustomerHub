import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const api = read('src/lib/api.js');
const app = read('src/App.jsx');
const modules = read('src/config/modules.js');
const smart = read('src/pages/SmartInsightsPage.jsx');

const requiredCentralContracts = [
  '/dashboard/revenue-overview',
  '/dashboard/growth-comparison',
  '/dashboard/sales-trend',
  '/reports/inventory',
  '/dashboard/category-performance',
  '/reports/customers-outstanding',
  '/dashboard/location-performance',
  '/dashboard/smart-insights',
];

for (const contract of requiredCentralContracts) {
  if (!api.includes(contract)) throw new Error(`Missing canonical RetailHub analytics contract: ${contract}`);
}

if (!app.includes('analytics/smart-insights') || !modules.includes('Smart Insights')) {
  throw new Error('Smart Insights is not routed and navigable in RetailHub.');
}

for (const stateText of ['Loading Smart Insights', 'Smart Insights unavailable', 'No insights available', 'Retry Central insights']) {
  if (!smart.includes(stateText)) throw new Error(`Missing Smart Insights state: ${stateText}`);
}

if (!smart.includes('api.dashboardSmartInsights')) throw new Error('Smart Insights must use the Central API client.');
if (smart.includes('posApi.') || smart.includes('posDiagnostics') || smart.includes('posStatus')) {
  throw new Error('RetailHub Smart Insights must not derive management analytics from POS-local authority.');
}

console.log('RetailHub dashboard migration acceptance passed.');
