const fs = require('node:fs');

const turboPath = 'turbo.json';
const turbo = JSON.parse(fs.readFileSync(turboPath, 'utf8'));
turbo.globalEnv = [
  'NODE_ENV',
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'AUTH_SECRET',
  'API_URL',
  'WEB_URL',
  'LOG_LEVEL',
  'SKIP_ENV_VALIDATION',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_API_URL',
];
fs.writeFileSync(turboPath, `${JSON.stringify(turbo, null, 2)}\n`, 'utf8');

const healthPath = 'apps/api/src/app/api/health/route.ts';
let health = fs.readFileSync(healthPath, 'utf8');
health = health.replace(
  "version: process.env.npm_package_version ?? '0.1.0',",
  "version: '0.1.0',",
);
fs.writeFileSync(healthPath, health, 'utf8');

console.log('updated turbo env and health route');
