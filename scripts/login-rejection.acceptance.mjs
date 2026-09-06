import fs from 'node:fs';

const loginPage = fs.readFileSync(new URL('../src/pages/LoginPage.jsx', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/api.js', import.meta.url), 'utf8');

const checks = [
  ['login posts through canonical auth api', /login:\s*\(payload\)\s*=>\s*centralApi\.post\('\/auth\/login'/.test(api)],
  ['auth context only sets user after successful login', /const response = await api\.login[\s\S]*setUser\(nextUser\)/.test(auth)],
  ['login page catches rejected credentials', /catch \(err\) \{ setError\(err\?\.response\?\.data\?\.message \|\| 'Unable to sign in\.'\); \}/.test(loginPage)],
  ['login page always releases busy state', /finally \{ setBusy\(false\); \}/.test(loginPage)],
  ['login error remains visibly rendered', /error && <div className="alert danger">\{error\}<\/div>/.test(loginPage)],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) process.exitCode = 1;
}
