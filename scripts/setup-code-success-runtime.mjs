import http from 'node:http';
import { chromium } from 'playwright';

const centralPort = Number(process.env.CENTRAL_MOCK_PORT || 43157);
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4182/pos-setup';
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
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4182');
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
    return json(res, 201, {
      data: {
        setup_code: 'CYCLE-C-482913',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    });
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
  await page.getByPlaceholder('POS-01').fill('POS-07');
  await page.getByPlaceholder('TP-01').fill('TP-07');
  await page.getByRole('button', { name: 'Generate setup code' }).click();
  await page.getByText('CYCLE-C-482913', { exact: true }).waitFor({ state: 'visible' });

  const postCount = events.filter((event) => event === 'POST /api/pos-registration/setup-codes').length;
  const posValue = await page.getByPlaceholder('POS-01').inputValue();
  const touchpointValue = await page.getByPlaceholder('TP-01').inputValue();
  const finalUrl = page.url();
  const payloadOk = setupPayload?.branch_id === 'branch-1'
    && setupPayload?.terminal_id === 'POS-07'
    && setupPayload?.pos_no === 'POS-07'
    && setupPayload?.touchpoint_id === 'TP-07';

  console.log(`CUSTOMERHUB_SETUP_CODE_APP_HTTP=${response?.status()}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_POST_COUNT=${postCount}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_PAYLOAD_OK=${payloadOk}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_REQUEST_READS=${requestReads}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_RENDERED=true`);
  console.log(`CUSTOMERHUB_SETUP_CODE_POS_CLEARED=${posValue === ''}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_TOUCHPOINT_CLEARED=${touchpointValue === ''}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_FINAL_URL=${finalUrl}`);
  console.log(`CUSTOMERHUB_SETUP_CODE_PAGE_ERRORS=${pageErrors.length}`);

  pass = Boolean(response?.ok())
    && postCount === 1
    && payloadOk
    && requestReads >= 2
    && posValue === ''
    && touchpointValue === ''
    && new URL(finalUrl).pathname === '/pos-setup'
    && pageErrors.length === 0;
  console.log(`CUSTOMERHUB_SETUP_CODE_SUCCESS_RUNTIME_PASS=${pass}`);
  if (!pass) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
