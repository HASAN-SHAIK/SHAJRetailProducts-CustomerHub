import fs from 'node:fs';

const api = fs.readFileSync(new URL('../src/lib/api.js', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

const checks = [
  ['central 401 interceptor exists', /response\.use[\s\S]*status !== 401/.test(api)],
  ['refresh endpoint exists', /post\('\/auth\/refresh'\)/.test(api)],
  ['session bootstrap exists', /api\.session\(\)/.test(auth)],
  ['unauthenticated state renders LoginPage', /if \(!user\) return <LoginPage/.test(app)],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) process.exitCode = 1;
}
