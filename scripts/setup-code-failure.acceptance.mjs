import fs from 'node:fs';

const devices = fs.readFileSync(new URL('../src/pages/DevicesPage.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/api.js', import.meta.url), 'utf8');

const checks = [
  ['setup-code API binding uses canonical Central endpoint', /createPosSetupCode:\s*\(payload\)\s*=>\s*centralApi\.post\('\/pos-registration\/setup-codes',\s*payload\)/.test(api)],
  ['setup generation clears stale error before request', /setBusy\('setup-code'\);\s*setError\(''\);\s*try/.test(devices)],
  ['setup generation surfaces authoritative API failure', /catch \(err\) \{\s*setError\(apiMessage\(err, 'Unable to create POS setup code\.'\)\);\s*\}/.test(devices)],
  ['setup busy state is released after failure or success', /finally \{\s*setBusy\(''\);\s*\}/.test(devices)],
  ['setup fields are cleared only inside successful try path', /try \{[\s\S]*setSetupCode\(body\);\s*setSetup\(\{ branch_id, terminal_id: '', touchpoint_id: '' \}\);\s*await loadRequests\(\);\s*\} catch/.test(devices)],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) process.exitCode = 1;
}
