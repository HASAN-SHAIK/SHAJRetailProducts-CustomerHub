import fs from 'node:fs';

const devices = fs.readFileSync(new URL('../src/pages/DevicesPage.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/api.js', import.meta.url), 'utf8');

const checks = [
  ['deactivate API binding exists', /deactivateDevice:\s*\(branchId, deviceId\)\s*=>\s*centralApi\.patch\(`\/branches\/\$\{branchId\}\/devices\/\$\{deviceId\}\/deactivate`\)/.test(api)],
  ['device deactivation reloads only after success', /await api\.deactivateDevice\(branchId, device\.id\);\s*await loadDevices\(branchId\);/.test(devices)],
  ['device deactivation surfaces API error', /catch \(err\) \{\s*setError\(apiMessage\(err, 'Unable to update device\.'\)\);/.test(devices)],
  ['active device retains explicit Deactivate control', /device\.is_active !== false && device\.active !== false[\s\S]*>Deactivate<\/button>/.test(devices)],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) process.exitCode = 1;
}
