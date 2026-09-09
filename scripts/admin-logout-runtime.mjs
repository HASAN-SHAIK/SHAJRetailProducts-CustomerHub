import http from 'node:http';
import { chromium } from 'playwright';

const centralPort = Number(process.env.CENTRAL_MOCK_PORT || 43161);
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4193/';
const events = [];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${centralPort}`);
  events.push(`${req.method} ${url.pathname}`);
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4193');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-device-id,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  res.setHeader('Content-Type', 'application/json');
  if (url.pathname === '/api/auth/getLogin') {
    res.writeHead(200);
    return res.end(JSON.stringify({ user: { id: 'admin-cycle-c', role: 'admin', tenant_name: 'Cycle C Tenant' } }));
  }
  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    res.writeHead(200);
    return res.end(JSON.stringify({ ok: true }));
  }
  if (url.pathname === '/api/settings/application') {
    res.writeHead(200);
    return res.end(JSON.stringify({ settings: { company: { shop_name: 'Cycle C Tenant' } } }));
  }
  if (url.pathname === '/api/branches') {
    res.writeHead(200);
    return res.end(JSON.stringify({ branches: [] }));
  }
  res.writeHead(200);
  res.end(JSON.stringify({ data: {} }));
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
  const shellVisible = await page.locator('.customerhub-shell').isVisible().catch(() => false);
  const signOut = page.getByRole('button', { name: /sign out|log out|logout/i });
  const signOutCount = await signOut.count();
  let loginVisibleAfter = false;
  let logoutCount = 0;
  if (signOutCount > 0) {
    await signOut.first().click();
    await page.locator('.login-screen').waitFor({ state: 'visible', timeout: 10000 });
    loginVisibleAfter = await page.locator('.login-screen').isVisible();
    logoutCount = events.filter((event) => event === 'POST /api/auth/logout').length;
  }
  console.log(`CUSTOMERHUB_ADMIN_LOGOUT_APP_HTTP=${response?.status()}`);
  console.log(`CUSTOMERHUB_ADMIN_LOGOUT_SHELL_VISIBLE=${shellVisible}`);
  console.log(`CUSTOMERHUB_ADMIN_LOGOUT_CONTROL_COUNT=${signOutCount}`);
  console.log(`CUSTOMERHUB_ADMIN_LOGOUT_POST_COUNT=${logoutCount}`);
  console.log(`CUSTOMERHUB_ADMIN_LOGOUT_LOGIN_VISIBLE_AFTER=${loginVisibleAfter}`);
  console.log(`CUSTOMERHUB_ADMIN_LOGOUT_PAGE_ERRORS=${pageErrors.length}`);
  const verdict = Boolean(response?.ok()) && shellVisible && signOutCount === 1 && logoutCount === 1 && loginVisibleAfter && pageErrors.length === 0;
  console.log(`CUSTOMERHUB_ADMIN_LOGOUT_RUNTIME_PASS=${verdict}`);
  if (!verdict) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
