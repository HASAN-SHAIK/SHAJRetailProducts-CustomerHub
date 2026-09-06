import fs from 'node:fs';

const loginPage = fs.readFileSync(new URL('../src/pages/LoginPage.jsx', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/api.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

const checks = [
  ['login posts through canonical auth api with device/remember state', /login:\s*\(payload\)\s*=>\s*centralApi\.post\('\/auth\/login',\s*\{\s*\.\.\.payload,\s*device_id:\s*getDeviceId\(\),\s*remember_me:\s*true\s*\}\)/.test(api)],
  ['auth context persists successful token', /setAccessToken\(body\.token \|\| null\)/.test(auth)],
  ['auth context promotes only returned successful user', /const nextUser = body\.user \|\| null;\s*setUser\(nextUser\);\s*return nextUser;/.test(auth)],
  ['login form awaits auth success before leaving busy state', /try \{ await login\(form\); \}[\s\S]*finally \{ setBusy\(false\); \}/.test(loginPage)],
  ['protected application shell is gated on authenticated user', /if \(!user\) return <LoginPage \/>;/.test(app) && /<AppShell/.test(app)],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) process.exitCode = 1;
}
