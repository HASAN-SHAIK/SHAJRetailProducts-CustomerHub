import http from 'node:http';
import { chromium } from 'playwright';

const centralPort = Number(process.env.CENTRAL_MOCK_PORT || 43157);
const appUrl = process.env.APP_URL || 'http://127.0.0.1:4189/inventory/stock-adjustments';
const events = [];
let adjustmentBody = null;
let canonicalQuantity = 10;

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${centralPort}`);
  events.push(`${req.method} ${url.pathname}${url.search}`);
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4189');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-device-id,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (url.pathname === '/api/auth/getLogin') {
    return json(res, 200, { data: { user: { id: 13, name: 'Runtime Admin', role: 'admin', tenant_id: 'tenant-test1', tenant_name: 'Runtime Retail' } } });
  }
  if (url.pathname === '/api/settings/application') return json(res, 200, { data: { settings: {} } });
  if (url.pathname === '/api/branches') return json(res, 200, { data: [{ branch_id: 'branch-001', branch_name: 'Main Store' }] });
  if (url.pathname === '/api/v1/products') {
    return json(res, 200, { data: { products: [{ id: 101, name: 'Runtime Product', is_batch_enabled: false, inventory: { projected_net_quantity: canonicalQuantity } }] } });
  }
  if (url.pathname === '/api/batches') return json(res, 200, { data: { batches: [] } });
  if (url.pathname === '/api/stock' && req.method === 'GET') {
    return json(res, 200, { data: { stock: [{ branch_id: 'branch-001', product_id: 101, quantity: canonicalQuantity }] } });
  }
  if (url.pathname === '/api/stock/adjustments' && req.method === 'POST') {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      adjustmentBody = JSON.parse(raw || '{}');
      const before = canonicalQuantity;
      canonicalQuantity += Number(adjustmentBody.delta_quantity || 0);
      json(res, 200, { data: { adjustment: { before_quantity: before, delta_quantity: adjustmentBody.delta_quantity, after_quantity: canonicalQuantity, reason: adjustmentBody.reason, reference_id: adjustmentBody.reference_id } } });
    });
    return;
  }
  return json(res, 404, { message: `not mocked: ${req.method} ${url.pathname}` });
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
  await page.getByRole('heading', { name: 'Stock Adjustments' }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('Manual correction').waitFor({ state: 'visible', timeout: 10000 });

  const productSelect = page.getByLabel('Product');
  await productSelect.selectOption('101');
  await page.getByText('Current canonical quantity').waitFor({ state: 'visible', timeout: 10000 });

  await page.getByLabel('Adjustment quantity').fill('2');
  await page.getByLabel('Reason').fill('Runtime count');
  await page.getByLabel('Reference').fill('COUNT-13');
  await page.getByRole('button', { name: 'Apply audited adjustment' }).click();
  await page.getByRole('heading', { name: 'Adjustment recorded' }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('Reason: Runtime count · Reference: COUNT-13').waitFor({ state: 'visible', timeout: 10000 });

  const bodyText = await page.locator('body').innerText();
  const postCount = events.filter((event) => event.startsWith('POST /api/stock/adjustments')).length;
  const stockReads = events.filter((event) => event.startsWith('GET /api/stock?')).length;
  const productReads = events.filter((event) => event.startsWith('GET /api/v1/products?')).length;
  const routePreserved = new URL(page.url()).pathname === '/inventory/stock-adjustments';
  const payloadOk = adjustmentBody?.branch_id === 'branch-001'
    && adjustmentBody?.product_id === 101
    && adjustmentBody?.batch_id === null
    && adjustmentBody?.delta_quantity === 2
    && adjustmentBody?.reason === 'Runtime count'
    && adjustmentBody?.reference_id === 'COUNT-13';
  const resultVisible = bodyText.includes('Before') && bodyText.includes('Delta') && bodyText.includes('After') && bodyText.includes('12');

  console.log(`CH13_APP_HTTP=${response?.status()}`);
  console.log(`CH13_ADJUSTMENT_POST_COUNT=${postCount}`);
  console.log(`CH13_ADJUSTMENT_PAYLOAD_OK=${payloadOk}`);
  console.log(`CH13_STOCK_READ_COUNT=${stockReads}`);
  console.log(`CH13_PRODUCT_READ_COUNT=${productReads}`);
  console.log(`CH13_CANONICAL_QUANTITY_AFTER=${canonicalQuantity}`);
  console.log(`CH13_RESULT_VISIBLE=${resultVisible}`);
  console.log(`CH13_ROUTE_PRESERVED=${routePreserved}`);
  console.log(`CH13_PAGE_ERRORS=${pageErrors.length}`);

  const verdict = Boolean(response?.ok()) && postCount === 1 && payloadOk && stockReads >= 2 && productReads >= 2 && canonicalQuantity === 12 && resultVisible && routePreserved && pageErrors.length === 0;
  console.log(`CH13_RUNTIME_PASS=${verdict}`);
  if (!verdict) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
