import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const apiSource = read('src/lib/api.js');
const overviewSource = read('src/pages/OverviewPage.jsx');

console.log('Testing FEAT-REP-003 CustomerHub HQ Executive Sales & Revenue Console...');

// 1. Verify Central API client contracts
if (!apiSource.includes('dashboardOverview:')) {
  throw new Error('api.js must export dashboardOverview function.');
}
if (!apiSource.includes('/dashboard/overview')) {
  throw new Error('api.js must route dashboardOverview to /dashboard/overview.');
}
if (!apiSource.includes('dashboardLocationPerformance:')) {
  throw new Error('api.js must export dashboardLocationPerformance.');
}

// 2. Verify OverviewPage imports and wire-up
if (!overviewSource.includes("import { api, unwrap } from '../lib/api';")) {
  throw new Error('OverviewPage must import api and unwrap from ../lib/api.');
}

if (!overviewSource.includes('api.dashboardOverview')) {
  throw new Error('OverviewPage must call api.dashboardOverview.');
}

if (!overviewSource.includes('api.dashboardLocationPerformance')) {
  throw new Error('OverviewPage must call api.dashboardLocationPerformance for multi-store comparison.');
}

// 3. Verify that old hardcoded mock cards are removed
const mockSnippets = [
  '₹12.48L',
  '42 inactive VIPs',
  'Downtown stock transfer completed',
  'Product A stock low',
];

for (const snippet of mockSnippets) {
  if (overviewSource.includes(snippet)) {
    throw new Error(`OverviewPage must not contain legacy mock snippet: "${snippet}"`);
  }
}

// 4. Verify explicit UI states
const requiredStates = [
  'Loading executive overview metrics',
  'Unable to load executive metrics',
  'Retry Central metrics',
  'Lead Sales Performance',
  'Store Performance',
  'THINGS NEEDING ATTENTION',
];

for (const stateText of requiredStates) {
  if (!overviewSource.includes(stateText)) {
    throw new Error(`OverviewPage is missing required UI state/section: "${stateText}"`);
  }
}

console.log('FEAT-REP-003 Executive Console acceptance criteria passed successfully.');
