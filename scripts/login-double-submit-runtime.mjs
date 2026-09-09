import http from 'node:http';
import { chromium } from 'playwright';

const centralPort = Number(process.env.CENTRAL_MOCK_PORT || 43167);
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4198/';
const events = [];
const loginBodies = [];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${centralPort}`);
  events.push(`${req.method} ${url.pathname}`);
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4198');
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
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try { loginBodies.push(JSON.parse(body || '{}')); } catch { loginBodies.push({ parse_error: true, raw: body }); }
      await new Promise((resolve) => setTimeout(resolve, 900));
      res.writeHead(401);
      res.end(JSON.stringify({ message: 'Invalid email or password' }));
    });
    return;
  }

  res.writeHead(404);
  res.end('{}');
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
  await page.getByLabel('Email').fill('cycle-c-double@example.com');
  await page.getByLabel('Password').fill('wrong-password');

  const form = page.locator('form.login-form');
  await form.evaluate((node) => {
    node.requestSubmit();
    node.requestSubmit();
  });

  await page.getByRole('button', { name: 'Signing in…' }).waitFor({ state: 'visible', timeout: 5000 });
  const disabledWhilePending = await page.getByRole('button', { name: 'Signing in…' }).isDisabled();
  await page.locator('.alert.danger').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(150);

  const loginCount = events.filter((event) => event === 'POST /api/auth/login').length;
  const errorText = (await page.locator('.alert.danger').innerText()).trim();
  const loginVisibleAfter = await page.locator('.login-screen').isVisible();
  const shellCount = await page.locator('.customerhub-shell').count();
  const buttonEnabledAfter = await page.getByRole('button', { name: 'Sign in' }).isEnabled();
  const emailValue = await page.getByLabel('Email').inputValue();
  const sameDeviceId = loginBodies.length > 0 && loginBodies.every((body) => body.device_id && body.device_id === loginBodies[0].device_id);

  console.log(`CUSTOMERHUB_DOUBLE_LOGIN_APP_HTTP=${response?.status() || 0}`);
  console.log(`CUSTOMERHUB_DOUBLE_LOGIN_NATIVE_SUBMITS=2`);
  console.log(`CUSTOMERHUB_DOUBLE_LOGIN_POST_COUNT=${loginCount}`);
  console.log(`CUSTOMERHUB_DOUBLE_LOGIN_DISABLED_WHILE_PENDING=${disabledWhilePending}`);
  console.log(`CUSTOMERHUB_DOUBLE_LOGIN_BODIES=${JSON.stringify(loginBodies)}`);
  console.log(`CUSTOMERHUB_DOUBLE_LOGIN_SAME_DEVICE=${sameDeviceId}`);
  console.log(`CUSTOMERHUB_DOUBLE_LOGIN_ERROR=${JSON.stringify(errorText)}`);
  console.log(`CUSTOMERHUB_DOUBLE_LOGIN_LOGIN_VISIBLE_AFTER=${loginVisibleAfter}`);
  console.log(`CUSTOMERHUB_DOUBLE_LOGIN_SHELL_COUNT=${shellCount}`);
  console.log(`CUSTOMERHUB_DOUBLE_LOGIN_BUTTON_ENABLED_AFTER=${buttonEnabledAfter}`);
  console.log(`CUSTOMERHUB_DOUBLE_LOGIN_EMAIL_PRESERVED=${emailValue === 'cycle-c-double@example.com'}`);
  console.log(`CUSTOMERHUB_DOUBLE_LOGIN_PAGE_ERRORS=${pageErrors.length}`);

  const verdict = response?.status() === 200 && loginCount === 1 && disabledWhilePending && sameDeviceId && errorText === 'Invalid email or password' && loginVisibleAfter && shellCount === 0 && buttonEnabledAfter && emailValue === 'cycle-c-double@example.com' && pageErrors.length === 0;
  console.log(`CUSTOMERHUB_DOUBLE_LOGIN_RUNTIME_PASS=${verdict}`);
  if (!verdict) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
