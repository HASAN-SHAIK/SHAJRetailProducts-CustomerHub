import http from 'node:http';
import { chromium } from 'playwright';

const centralPort = Number(process.env.CENTRAL_MOCK_PORT || 43169);
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4199/';
let loginCount = 0;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${centralPort}`);
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4199');
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
    loginCount += 1;
    req.resume();
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
  await page.getByLabel('Email').fill('cycle-c-alert@example.com');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  const error = page.locator('.alert.danger');
  await error.waitFor({ state: 'visible', timeout: 10000 });
  const errorText = (await error.innerText()).trim();
  const role = await error.getAttribute('role');
  const live = await error.getAttribute('aria-live');
  const loginVisible = await page.locator('.login-screen').isVisible();
  const shellCount = await page.locator('.customerhub-shell').count();
  const retryEnabled = await page.getByRole('button', { name: 'Sign in' }).isEnabled();

  console.log(`CUSTOMERHUB_LOGIN_ALERT_APP_HTTP=${response?.status() || 0}`);
  console.log(`CUSTOMERHUB_LOGIN_ALERT_POST_COUNT=${loginCount}`);
  console.log(`CUSTOMERHUB_LOGIN_ALERT_TEXT=${JSON.stringify(errorText)}`);
  console.log(`CUSTOMERHUB_LOGIN_ALERT_ROLE=${role || '<none>'}`);
  console.log(`CUSTOMERHUB_LOGIN_ALERT_ARIA_LIVE=${live || '<none>'}`);
  console.log(`CUSTOMERHUB_LOGIN_ALERT_LOGIN_VISIBLE=${loginVisible}`);
  console.log(`CUSTOMERHUB_LOGIN_ALERT_SHELL_COUNT=${shellCount}`);
  console.log(`CUSTOMERHUB_LOGIN_ALERT_RETRY_ENABLED=${retryEnabled}`);
  console.log(`CUSTOMERHUB_LOGIN_ALERT_PAGE_ERRORS=${pageErrors.length}`);

  const verdict = response?.status() === 200 && loginCount === 1 && errorText === 'Invalid email or password' && role === 'alert' && loginVisible && shellCount === 0 && retryEnabled && pageErrors.length === 0;
  console.log(`CUSTOMERHUB_LOGIN_ALERT_RUNTIME_PASS=${verdict}`);
  if (!verdict) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
