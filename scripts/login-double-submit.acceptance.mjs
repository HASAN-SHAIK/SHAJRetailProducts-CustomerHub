import fs from 'node:fs';

const loginPage = fs.readFileSync(new URL('../src/pages/LoginPage.jsx', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/api.js', import.meta.url), 'utf8');

const checks = [
  ['login uses a form submit boundary', /<form onSubmit=\{submit\}/.test(loginPage)],
  ['login exposes pending busy state', /setBusy\(true\)/.test(loginPage)],
  ['pending login disables the submit button', /<button[^>]*disabled=\{busy\}/.test(loginPage)],
  ['busy state is released after the request settles', /finally \{ setBusy\(false\); \}/.test(loginPage)],
  ['auth context delegates login to the canonical API helper', /const response = await api\.login\(\{ email, password \}\)/.test(auth)],
  ['canonical API helper posts to auth login', /login:\s*\(payload\)\s*=>\s*centralApi\.post\('\/auth\/login'/.test(api)],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) process.exitCode = 1;
}
