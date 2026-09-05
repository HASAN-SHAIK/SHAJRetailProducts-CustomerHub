import http from 'node:http';
import { chromium } from 'playwright';

const centralPort = Number(process.env.CENTRAL_MOCK_PORT || 43153);
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4180/pos-setup';
const events = [];

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${centralPort}`);
  events.push(`${req.method} ${url.pathname}`);
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4180');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-device-id,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.method === 'GET' && url.pathname === '/api/auth/getLogin') {
    return json(res, 200, { data: { user: { id: 'admin-cycle-c', role: 'admin', name: 'Cycle C Admin' } } });
  }
  if (req.method === 'GET' && url.pathname === '/api/branches') {
    return json(res, 200, { data: [{ id: 'branch-1', store_number: 'STORE-01', name: 'Cycle C Store' }] });
  }
  if (req.method === 'GET' && url.pathname === '/api/pos-registration/requests') {
    return json(res, 200, { data: [] });
  }
  if (req.method === 'GET' && url.pathname === '/api/branches/branch-1/devices') {
    return json(res, 200, { data: [{ id: 'device-1', device_id: 'DEVICE-CYCLE-C-01', device_name: 'Counter POS', store_number: 'STORE-01', pos_no: 'POS-01', touchpoint_id: 'TP-01', is_active: true }] });
  }
  if (req.method === 'PATCH' && url.pathname === '/api/branches/branch-1/devices/device-1/deactivate') {
    return json(res, 500, { message: 'Device service unavailable' });
  }
  if (url.pathname.startsWith('/api/')) return json(res, 200, { data: [] });
  return json(res, 404, {});
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(centralPort, '127.0.0.1', resolve);
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error)));

let pass = false;
try {
  const response = await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByText('Counter POS', { exact: true }).waitFor({ state: 'visible' });
  const beforeRegistered = await page.getByText('Registered', { exact: true }).isVisible();
  await page.getByRole('button', { name: 'Deactivate' }).click();
  await page.getByText('Device service unavailable (500)', { exact: true }).waitFor({ state: 'visible' });
  const afterRegistered = await page.getByText('Registered', { exact: true }).isVisible();
  const deactivateStillVisible = await page.getByRole('button', { name: 'Deactivate' }).isVisible();
  const patchCount = events.filter((event) => event === 'PATCH /api/branches/branch-1/devices/device-1/deactivate').length;
  console.log(`CUSTOMERHUB_DEVICE_APP_HTTP=${response?.status()}`);
  console.log(`CUSTOMERHUB_DEVICE_PATCH_COUNT=${patchCount}`);
  console.log(`CUSTOMERHUB_DEVICE_REGISTERED_BEFORE=${beforeRegistered}`);
  console.log(`CUSTOMERHUB_DEVICE_REGISTERED_AFTER_FAILURE=${afterRegistered}`);
  console.log(`CUSTOMERHUB_DEVICE_DEACTIVATE_RETRY_VISIBLE=${deactivateStillVisible}`);
  console.log(`CUSTOMERHUB_DEVICE_PAGE_ERRORS=${pageErrors.length}`);
  pass = Boolean(response?.ok()) && patchCount === 1 && beforeRegistered && afterRegistered && deactivateStillVisible && pageErrors.length === 0;
  console.log(`CUSTOMERHUB_DEVICE_DEACTIVATE_FAILURE_RUNTIME_PASS=${pass}`);
  if (!pass) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
