import http from 'node:http';
import { chromium } from 'playwright';

const centralPort = Number(process.env.CENTRAL_MOCK_PORT || 43159);
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4185/pos-setup';
const events = [];
let setupPayload = null;
let requestReads = 0;

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readJson = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${centralPort}`);
  events.push(`${req.method} ${url.pathname}`);
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4185');
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
  if (req.method === 'GET' && url.pathname === '/api/branches/branch-1/devices') {
    return json(res, 200, { data: [] });
  }
  if (req.method === 'GET' && url.pathname === '/api/pos-registration/requests') {
    requestReads += 1;
    return json(res, 200, { data: [] });
  }
  if (req.method === 'POST' && url.pathname === '/api/pos-registration/setup-codes') {
    setupPayload = await readJson(req);
    return json(res, 500, { message: 'Setup code service unavailable' });
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
  await page.getByRole('heading', { name: 'Generate POS setup code' }).waitFor({ state: 'visible' });
  const requestReadsBefore = requestReads;
  await page.getByPlaceholder('POS-01').fill('POS-08');
  await page.getByPlaceholder('TP-01').fill('TP-08');
  await page.getByRole('button', { name: 'Generate setup code' }).click();
  await page.getByText('Setup code service unavailable (500)', { exact: true }).waitFor({ state: 'visible' });

  const postCount = events.filter((event) => event === 'POST /api/pos-registration/setup-codes').length;
  const posValue = await page.getByPlaceholder('POS-01').inputValue();
  const touchpointValue = await page.getByPlaceholder('TP-01').inputValue();
  const setupCodeVisible = await page.locator('.setup-code').isVisible().catch(() => false);
  const retryEnabled = await page.getByRole('button', { name: 'Generate setup code' }).isEnabled();
  const finalUrl = page.url();
  const payloadOk = setupPayload?.branch_id === 'branch-1'
    && setupPayload?.terminal_id === 'POS-08'
    && setupPayload?.pos_no === 'POS-08'
    && setupPayload?.touchpoint_id === 'TP-08';

  console.log(`CUSTOMERHUB_SETUP_CODE_FAILURE_APP_HTTP=${response?.status()}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_FAILURE_POST_COUNT=${postCount}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_FAILURE_PAYLOAD_OK=${payloadOk}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_FAILURE_REQUEST_READS_BEFORE=${requestReadsBefore}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_FAILURE_REQUEST_READS_AFTER=${requestReads}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_FAILURE_POS_PRESERVED=${posValue === 'POS-08'}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_FAILURE_TOUCHPOINT_PRESERVED=${touchpointValue === 'TP-08'}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_FAILURE_CODE_VISIBLE=${setupCodeVisible}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_FAILURE_RETRY_ENABLED=${retryEnabled}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_FAILURE_FINAL_URL=${finalUrl}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_FAILURE_PAGE_ERRORS=${pageErrors.length}`);

  pass = Boolean(response?.ok())
    && postCount === 1
    && payloadOk
    && requestReads === requestReadsBefore
    && posValue === 'POS-08'
    && touchpointValue === 'TP-08'
    && !setupCodeVisible
    && retryEnabled
    && new URL(finalUrl).pathname === '/pos-setup'
    && pageErrors.length === 0;
  console.log(`CUSTOMERHUB_SETUP_CODE_FAILURE_RUNTIME_PASS=${pass}`);
  if (!pass) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
