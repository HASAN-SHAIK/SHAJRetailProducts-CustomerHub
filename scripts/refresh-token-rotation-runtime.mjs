import http from 'node:http';
import { chromium } from 'playwright';

const centralPort = Number(process.env.CENTRAL_MOCK_PORT || 43163);
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4195/';
const origin = new URL(appUrl).origin;
const events = [];
let settingsReads = 0;
let refreshCount = 0;
let retryAuthorized = false;

const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${centralPort}`);
  const auth = String(req.headers.authorization || '');
  events.push(`${req.method} ${url.pathname} auth=${auth || '<none>'}`);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-device-id,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (url.pathname === '/api/auth/getLogin') {
    return sendJson(res, 200, { data: { user: { id: 'admin-1', role: 'admin', name: 'Cycle C Admin' } } });
  }
  if (url.pathname === '/api/auth/refresh' && req.method === 'POST') {
    refreshCount += 1;
    return sendJson(res, 200, { data: { token: 'rotated-cycle-c-token' } });
  }
  if (url.pathname === '/api/settings/application') {
    settingsReads += 1;
    if (settingsReads === 1) return sendJson(res, 401, { message: 'expired access token' });
    retryAuthorized = auth === 'Bearer rotated-cycle-c-token';
    if (!retryAuthorized) return sendJson(res, 401, { message: 'rotated token required' });
    return sendJson(res, 200, { data: { settings: { company: { shop_name: 'Cycle C Refresh Shop' }, store: { currency: 'INR' }, tax: { gst_mode: 'INCLUSIVE' }, printer: { receipt_paper_width_mm: 80 } } } });
  }
  return sendJson(res, 404, { message: 'not found' });
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(centralPort, '127.0.0.1', resolve);
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

let verdict = false;
try {
  const response = await page.goto(new URL('/business', appUrl).toString(), { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  const body = await page.locator('body').innerText();
  const businessLoaded = body.includes('Cycle C Refresh Shop');
  const failureVisible = body.includes('Unable to load settings from the Backend.');
  const storedToken = await page.evaluate(() => localStorage.getItem('shaj_hub_access_token'));
  const appHttp = response?.status() || 0;

  console.log(`CUSTOMERHUB_REFRESH_APP_HTTP=${appHttp}`);
  console.log(`CUSTOMERHUB_REFRESH_SETTINGS_READS=${settingsReads}`);
  console.log(`CUSTOMERHUB_REFRESH_COUNT=${refreshCount}`);
  console.log(`CUSTOMERHUB_REFRESH_RETRY_AUTHORIZED=${retryAuthorized}`);
  console.log(`CUSTOMERHUB_REFRESH_STORED_TOKEN=${storedToken || '<none>'}`);
  console.log(`CUSTOMERHUB_REFRESH_BUSINESS_LOADED=${businessLoaded}`);
  console.log(`CUSTOMERHUB_REFRESH_FAILURE_VISIBLE=${failureVisible}`);
  console.log(`CUSTOMERHUB_REFRESH_PAGE_ERRORS=${pageErrors.length}`);
  console.log(`CUSTOMERHUB_REFRESH_EVENTS=${JSON.stringify(events)}`);

  verdict = appHttp === 200 && settingsReads === 2 && refreshCount === 1 && retryAuthorized && storedToken === 'rotated-cycle-c-token' && businessLoaded && !failureVisible && pageErrors.length === 0;
  console.log(`CUSTOMERHUB_REFRESH_TOKEN_ROTATION_RUNTIME_PASS=${verdict}`);
  if (!verdict) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
