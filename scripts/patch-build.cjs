const fs = require('node:fs');

const healthPath = 'apps/api/src/app/api/health/route.ts';
let health = fs.readFileSync(healthPath, 'utf8');
health = health.replace(
  /if \(process\.env\.DATABASE_URL\) \{\s*try \{\s*const \{ prisma \} = await import\('@goldos\/database'\);\s*await prisma\.\$queryRaw`SELECT 1`;\s*databaseStatus = 'ok';\s*\} catch \{\s*databaseStatus = 'error';\s*\}\s*\}/,
  `if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw\`SELECT 1\`;
      databaseStatus = 'ok';
    } catch {
      databaseStatus = 'error';
    }
  }`,
);
if (!health.includes('import { prisma }')) {
  health = `import { prisma } from '@goldos/database';\n\n${health}`;
}
fs.writeFileSync(healthPath, health, 'utf8');

const apiConfigPath = 'apps/api/next.config.ts';
let apiConfig = fs.readFileSync(apiConfigPath, 'utf8');
if (!apiConfig.includes('@goldos/database')) {
  apiConfig = apiConfig.replace("'@goldos/auth',", "'@goldos/auth',\n    '@goldos/database',");
  fs.writeFileSync(apiConfigPath, apiConfig, 'utf8');
}

const webConfigPath = 'apps/web/next.config.ts';
let webConfig = fs.readFileSync(webConfigPath, 'utf8');
webConfig = webConfig.replace(
  `  experimental: {
    typedRoutes: true,
  },`,
  '  typedRoutes: true,',
);
fs.writeFileSync(webConfigPath, webConfig, 'utf8');

console.log('patched');
