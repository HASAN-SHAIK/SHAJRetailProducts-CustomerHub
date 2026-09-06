import fs from 'node:fs';

const devices = fs.readFileSync(new URL('../src/pages/DevicesPage.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/api.js', import.meta.url), 'utf8');

const checks = [
  ['setup-code API binding uses canonical Central endpoint', /createPosSetupCode:\s*\(payload\)\s*=>\s*centralApi\.post\('\/pos-registration\/setup-codes',\s*payload\)/.test(api)],
  ['setup form requires store, POS No and Touchpoint ID', /if \(!branch_id \|\| !terminal_id \|\| !touchpoint_id\)[\s\S]*Choose a store, POS No and Touchpoint ID to generate a setup code\./.test(devices)],
  ['successful setup generation stores returned code', /const response = await api\.createPosSetupCode\(\{ branch_id, terminal_id, pos_no: terminal_id, touchpoint_id \}\);[\s\S]*setSetupCode\(body\)/.test(devices)],
  ['successful setup generation clears terminal and touchpoint fields', /setSetup\(\{ branch_id, terminal_id: '', touchpoint_id: '' \}\)/.test(devices)],
  ['successful setup generation refreshes pending requests', /setSetup\(\{ branch_id, terminal_id: '', touchpoint_id: '' \}\);\s*await loadRequests\(\)/.test(devices)],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) process.exitCode = 1;
}
