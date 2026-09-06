import http from 'node:http';
import { chromium } from 'playwright';

const centralPort = Number(process.env.CENTRAL_MOCK_PORT || 43153);
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4183/';
const events = [];
let loginBody = '';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${centralPort}`);
  events.push(`${req.method} ${url.pathname}`);
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4183');
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
  const loginVisibleBefore = await page.locator('.login-screen').isVisible();
  await page.getByLabel('Email').fill('cycle-c@example.com');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.locator('.alert.danger').waitFor({ state: 'visible', timeout: 10000 });

  const errorText = (await page.locator('.alert.danger').innerText()).trim();
  const loginVisibleAfter = await page.locator('.login-screen').isVisible();
  const shellCount = await page.locator('.customerhub-shell').count();
  const buttonEnabled = await page.getByRole('button', { name: 'Sign in' }).isEnabled();
  const emailValue = await page.getByLabel('Email').inputValue();
  const loginCount = events.filter((event) => event === 'POST /api/auth/login').length;
  const body = JSON.parse(loginBody || '{}');

  console.log(`CUSTOMERHUB_LOGIN_REJECT_APP_HTTP=${response?.status()}`);
  console.log(`CUSTOMERHUB_LOGIN_REJECT_INITIAL_LOGIN_VISIBLE=${loginVisibleBefore}`);
  console.log(`CUSTOMERHUB_LOGIN_REJECT_POST_COUNT=${loginCount}`);
  console.log(`CUSTOMERHUB_LOGIN_REJECT_BODY_EMAIL=${body.email || ''}`);
  console.log(`CUSTOMERHUB_LOGIN_REJECT_REMEMBER_ME=${body.remember_me}`);
  console.log(`CUSTOMERHUB_LOGIN_REJECT_DEVICE_ID_PRESENT=${Boolean(body.device_id)}`);
  console.log(`CUSTOMERHUB_LOGIN_REJECT_ERROR=${JSON.stringify(errorText)}`);
  console.log(`CUSTOMERHUB_LOGIN_REJECT_LOGIN_VISIBLE_AFTER=${loginVisibleAfter}`);
  console.log(`CUSTOMERHUB_LOGIN_REJECT_AUTH_SHELL_COUNT=${shellCount}`);
  console.log(`CUSTOMERHUB_LOGIN_REJECT_BUTTON_ENABLED=${buttonEnabled}`);
  console.log(`CUSTOMERHUB_LOGIN_REJECT_EMAIL_PRESERVED=${emailValue === 'cycle-c@example.com'}`);
  console.log(`CUSTOMERHUB_LOGIN_REJECT_PAGE_ERRORS=${pageErrors.length}`);

  const verdict = Boolean(response?.ok()) && loginVisibleBefore && loginCount === 1 && body.email === 'cycle-c@example.com' && body.password === 'wrong-password' && body.remember_me === true && Boolean(body.device_id) && errorText === 'Invalid email or password' && loginVisibleAfter && shellCount === 0 && buttonEnabled && emailValue === 'cycle-c@example.com' && pageErrors.length === 0;
  console.log(`CUSTOMERHUB_LOGIN_REJECTION_RUNTIME_PASS=${verdict}`);
  if (!verdict) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
