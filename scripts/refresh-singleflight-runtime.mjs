import http from 'node:http';
import { chromium } from 'playwright';

const appUrl = process.env.APP_URL || 'http://127.0.0.1:4196/billing';
const mockPort = Number(process.env.CENTRAL_MOCK_PORT || 43165);
const allowedOrigin = new URL(appUrl).origin;
let refreshed = false;
let refreshCount = 0;
let catalog401 = 0;
let branches401 = 0;
let catalog200 = 0;
let branches200 = 0;
const events = [];

const send = (res, status, body = {}) => {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type,x-device-id,authorization',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  });
  res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${mockPort}`);
  events.push(`${req.method} ${url.pathname}`);
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (url.pathname === '/api/auth/getLogin') return send(res, 200, { user: { id: 'admin-1', role: 'admin', email: 'cycle-c@example.com', tenant_id: 'tenant-1' } });
  if (url.pathname === '/api/settings/application') return send(res, 200, { business_name: 'Cycle C Retail' });
  if (url.pathname === '/api/auth/refresh' && req.method === 'POST') {
    refreshCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 500));
    refreshed = true;
    return send(res, 200, { success: true });
  }
  if (url.pathname === '/api/configuration/catalog') {
    if (!refreshed) { catalog401 += 1; return send(res, 401, { message: 'expired' }); }
    catalog200 += 1;
    return send(res, 200, { settings: [{ key: 'billing.allow_discount', group: 'billing', scopes: ['tenant'], type: 'boolean' }] });
  }
  if (url.pathname === '/api/branches') {
    if (!refreshed) { branches401 += 1; return send(res, 401, { message: 'expired' }); }
    branches200 += 1;
    return send(res, 200, { branches: [{ id: 'branch-1', name: 'Main Store' }] });
  }
  if (url.pathname === '/api/configuration/scopes/tenant/current') {
    return send(res, 200, { overrides: {}, effective: { values: { 'billing.allow_discount': true }, sources: { 'billing.allow_discount': { scope_type: 'system' } }, etag: 'cycle-c-etag' } });
  }
  return send(res, 200, {});
});

await new Promise((resolve) => server.listen(mockPort, '127.0.0.1', resolve));
let browser;
let pageErrors = [];
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  const response = await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.getByText('Billing & Checkout', { exact: true }).waitFor({ timeout: 15000 });
  await page.getByText('Allow Discount', { exact: true }).waitFor({ timeout: 15000 });
  const appHttp = response?.status() || 0;
  const pass = appHttp === 200 && refreshCount === 1 && catalog401 === 1 && branches401 === 1 && catalog200 >= 1 && branches200 >= 1 && pageErrors.length === 0;
  console.log(`CUSTOMERHUB_SINGLEFLIGHT_APP_HTTP=${appHttp}`);
  console.log(`CUSTOMERHUB_SINGLEFLIGHT_REFRESH_COUNT=${refreshCount}`);
  console.log(`CUSTOMERHUB_SINGLEFLIGHT_CATALOG_401=${catalog401}`);
  console.log(`CUSTOMERHUB_SINGLEFLIGHT_BRANCHES_401=${branches401}`);
  console.log(`CUSTOMERHUB_SINGLEFLIGHT_CATALOG_200=${catalog200}`);
  console.log(`CUSTOMERHUB_SINGLEFLIGHT_BRANCHES_200=${branches200}`);
  console.log(`CUSTOMERHUB_SINGLEFLIGHT_PAGE_ERRORS=${pageErrors.length}`);
  console.log(`CUSTOMERHUB_SINGLEFLIGHT_EVENTS=${JSON.stringify(events)}`);
  console.log(`CUSTOMERHUB_SINGLEFLIGHT_RUNTIME_PASS=${pass}`);
  if (!pass) process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
