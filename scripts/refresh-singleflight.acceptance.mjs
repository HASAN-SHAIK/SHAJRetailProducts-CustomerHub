import fs from 'node:fs';

const api = fs.readFileSync(new URL('../src/lib/api.js', import.meta.url), 'utf8');
const config = fs.readFileSync(new URL('../src/pages/ConfigurationPage.jsx', import.meta.url), 'utf8');

const requiredApi = [
  'let refreshPromise = null',
  'refreshPromise ||= centralApi.post(\'/auth/refresh\')',
  'await refreshPromise',
  'original._hubRetried = true',
  'return centralApi(original)',
];
for (const needle of requiredApi) {
  if (!api.includes(needle)) throw new Error(`Missing refresh single-flight contract: ${needle}`);
}
if (!config.includes('Promise.all([api.configurationCatalog(), api.branches()])')) {
  throw new Error('Billing configuration no longer exercises parallel protected reads.');
}
console.log('CustomerHub refresh single-flight acceptance passed.');
