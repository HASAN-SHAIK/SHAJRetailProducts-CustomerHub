import fs from 'node:fs';

const devices = fs.readFileSync(new URL('../src/pages/DevicesPage.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/api.js', import.meta.url), 'utf8');

const checks = [
  ['deactivate API binding exists', /deactivateDevice:\s*\(branchId, deviceId\)\s*=>\s*centralApi\.patch\(`\/branches\/\$\{branchId\}\/devices\/\$\{deviceId\}\/deactivate`\)/.test(api)],
  ['successful deactivation reloads authoritative devices', /await api\.deactivateDevice\(branchId, device\.id\);\s*await loadDevices\(branchId\);/.test(devices)],
  ['inactive device renders Inactive state', /device\.is_active === false \|\| device\.active === false \? 'Inactive' : 'Registered'/.test(devices)],
  ['inactive device hides Deactivate control', /device\.is_active !== false && device\.active !== false && <button[\s\S]*>Deactivate<\/button>/.test(devices)],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) process.exitCode = 1;
}
