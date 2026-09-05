import http from 'node:http';
import { chromium } from 'playwright';

const centralPort = Number(process.env.CENTRAL_MOCK_PORT || 43151);
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4179/';
const events = [];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${centralPort}`);
  events.push(`${req.method} ${url.pathname}`);
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4179');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-device-id,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  res.setHeader('Content-Type', 'application/json');
  if (url.pathname === '/api/auth/getLogin') {
    res.writeHead(200);
    return res.end(JSON.stringify({ data: { user: { id: 'admin-1', role: 'admin', name: 'Cycle C Admin' } } }));
  }
  if (url.pathname === '/api/auth/refresh') {
    res.writeHead(401);
    return res.end(JSON.stringify({ message: 'session expired' }));
  }
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(401);
    return res.end(JSON.stringify({ message: 'expired access session' }));
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
page.on('pageerror', (e) => pageErrors.push(String(e)));

let verdict = false;
try {
  const response = await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`CUSTOMERHUB_APP_HTTP=${response?.status()}`);
  await page.waitForTimeout(1500);
  const bodyText = await page.locator('body').innerText();
  const loginVisible = await page.locator('.login-screen').isVisible().catch(() => false);
  const refreshCount = events.filter((x) => x === 'POST /api/auth/refresh').length;
  const protected401Count = events.filter((x) => x.startsWith('GET /api/') && x !== 'GET /api/auth/getLogin').length;
  console.log(`CUSTOMERHUB_SESSION_BOOTSTRAP=${events.includes('GET /api/auth/getLogin')}`);
  console.log(`CUSTOMERHUB_PROTECTED_401_COUNT=${protected401Count}`);
  console.log(`CUSTOMERHUB_REFRESH_COUNT=${refreshCount}`);
  console.log(`CUSTOMERHUB_LOGIN_VISIBLE_AFTER_REFRESH_401=${loginVisible}`);
  console.log(`CUSTOMERHUB_PAGE_ERRORS=${pageErrors.length}`);
  console.log(`CUSTOMERHUB_BODY_SNIPPET=${JSON.stringify(bodyText.slice(0, 240))}`);
  verdict = Boolean(response?.ok()) && protected401Count > 0 && refreshCount > 0 && loginVisible;
  console.log(`CUSTOMERHUB_EXPIRED_SESSION_RUNTIME_PASS=${verdict}`);
  if (!verdict) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
