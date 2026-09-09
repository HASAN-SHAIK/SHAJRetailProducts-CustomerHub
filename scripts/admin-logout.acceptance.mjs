import fs from 'node:fs';

const auth = fs.readFileSync(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8');
const shell = fs.readFileSync(new URL('../src/components/AppShell.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../src/lib/api.js', import.meta.url), 'utf8');

const checks = [
  ['canonical logout api exists', /logout:\s*\(\)\s*=>\s*centralApi\.post\('\/auth\/logout'\)/.test(api)],
  ['logout clears local token and user state', /const logout = async \(\) => \{[\s\S]*api\.logout\(\)[\s\S]*setAccessToken\(null\)[\s\S]*setUser\(null\)/.test(auth)],
  ['authenticated admin shell exposes logout action', /useAuth\(\)[\s\S]*(logout|signOut)/.test(shell) && /Sign out|Log out|Logout/.test(shell)],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) process.exitCode = 1;
}
