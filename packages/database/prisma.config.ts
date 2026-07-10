import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'prisma/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  schema: path.join(rootDir, 'prisma'),
  migrations: {
    path: path.join(rootDir, 'prisma', 'migrations'),
  },
});
