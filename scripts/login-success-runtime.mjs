import http from 'node:http';
import { chromium } from 'playwright';

const centralPort = Number(process.env.CENTRAL_MOCK_PORT || 43155);
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4184/';
const events = [];
let loginBody = '';
let settingsAuthorization = '';
let settingsDeviceId = '';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${centralPort}`);
  events.push(`${req.method} ${url.pathname}`);
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4184');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-device-id,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  res.setHeader('Content-Type', 'application/json');

  if (url.pathname === '/api/auth/getLogin') {
    res.writeHead(401);
    return res.end(JSON.stringify({ message: 'not signed in' }));
  }
  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    req.setEncoding('utf8');
    req.on('data', (chunk) => { loginBody += chunk; });
    req.on('end', () => {
      res.writeHead(200);
      res.end(JSON.stringify({ data: { token: 'cycle-c-login-success-token', user: { id: 77, name: 'Cycle C Admin', role: 'admin', tenant_id: 'tenant-cycle-c', tenant_name: 'Cycle C Market' } } }));
    });
    return;
  }
  if (url.pathname === '/api/settings/application' && req.method === 'GET') {
    settingsAuthorization = String(req.headers.authorization || '');
    settingsDeviceId = String(req.headers['x-device-id'] || '');
    res.writeHead(200);
    return res.end(JSON.stringify({ data: { settings: { company: { shop_name: 'Cycle C Market' } } } }));
  }
  res.writeHead(404);
  res.end(JSON.stringify({ message: 'not mocked' }));
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(centralPort, '127.0.0.1', resolve);
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error)));

try {
  const response = await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 30000 });
  const loginVisibleBefore = await page.locator('.login-screen').isVisible();
  await page.getByLabel('Email').fill('cycle-c-success@example.com');
  await page.getByLabel('Password').fill('correct-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.locator('.customerhub-shell').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('Good morning, Hasan.').waitFor({ state: 'visible', timeout: 10000 });

  const loginCount = events.filter((event) => event === 'POST /api/auth/login').length;
  const settingsCount = events.filter((event) => event === 'GET /api/settings/application').length;
  const body = JSON.parse(loginBody || '{}');
  const loginVisibleAfter = await page.locator('.login-screen').count();
  const shellCount = await page.locator('.customerhub-shell').count();
  const tenantVisible = await page.getByText('Cycle C Market').first().isVisible();
  const accessToken = await page.evaluate(() => localStorage.getItem('shaj_hub_access_token'));
  const storedDeviceId = await page.evaluate(() => localStorage.getItem('shaj_hub_device_id'));

  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_APP_HTTP=${response?.status()}`);
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_INITIAL_LOGIN_VISIBLE=${loginVisibleBefore}`);
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_POST_COUNT=${loginCount}`);
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_BODY_EMAIL=${body.email || ''}`);
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_REMEMBER_ME=${body.remember_me}`);
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_DEVICE_ID_PRESENT=${Boolean(body.device_id)}`);
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_LOGIN_COUNT_AFTER=${loginVisibleAfter}`);
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_SHELL_COUNT=${shellCount}`);
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_TENANT_VISIBLE=${tenantVisible}`);
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_TOKEN_PERSISTED=${accessToken === 'cycle-c-login-success-token'}`);
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_DEVICE_STABLE=${Boolean(storedDeviceId) && storedDeviceId === body.device_id && settingsDeviceId === body.device_id}`);
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_AUTH_HEADER=${settingsAuthorization === 'Bearer cycle-c-login-success-token'}`);
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_SETTINGS_COUNT=${settingsCount}`);
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_PAGE_ERRORS=${pageErrors.length}`);

  const verdict = Boolean(response?.ok()) && loginVisibleBefore && loginCount === 1 && body.email === 'cycle-c-success@example.com' && body.password === 'correct-password' && body.remember_me === true && Boolean(body.device_id) && loginVisibleAfter === 0 && shellCount === 1 && tenantVisible && accessToken === 'cycle-c-login-success-token' && Boolean(storedDeviceId) && storedDeviceId === body.device_id && settingsDeviceId === body.device_id && settingsAuthorization === 'Bearer cycle-c-login-success-token' && settingsCount === 1 && pageErrors.length === 0;
  console.log(`CUSTOMERHUB_LOGIN_SUCCESS_RUNTIME_PASS=${verdict}`);
  if (!verdict) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
