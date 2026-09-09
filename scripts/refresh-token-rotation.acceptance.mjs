import fs from 'node:fs';

const api = fs.readFileSync(new URL('../src/lib/api.js', import.meta.url), 'utf8');

const checks = [
  ['401 response interceptor exists', /interceptors\.response\.use[\s\S]*status !== 401/.test(api)],
  ['refresh endpoint is invoked', /centralApi\.post\('\/auth\/refresh'\)/.test(api)],
  ['access token setter exists', /export const setAccessToken/.test(api)],
  ['refresh response token is applied before retry', /(?:const|let)\s+\w+\s*=\s*await\s+refreshPromise[\s\S]{0,500}setAccessToken\([\s\S]{0,120}(?:token|access_token)/.test(api)],
  ['retried request can attach Authorization', /original\.headers\.Authorization\s*=\s*`Bearer \$\{token\}`/.test(api)],
];

for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) process.exitCode = 1;
}
