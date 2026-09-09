import fs from 'node:fs';

const loginPage = fs.readFileSync(new URL('../src/pages/LoginPage.jsx', import.meta.url), 'utf8');

const checks = [
  ['login rejection is rendered', /\{error && <div className="alert danger"/.test(loginPage)],
  ['login rejection exposes an accessible alert role', /\{error && <div[^>]*className="alert danger"[^>]*role="alert"/.test(loginPage) || /\{error && <div[^>]*role="alert"[^>]*className="alert danger"/.test(loginPage)],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) process.exitCode = 1;
}
