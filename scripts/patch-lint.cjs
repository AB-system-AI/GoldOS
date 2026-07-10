const fs = require('node:fs');

const basePath = 'packages/eslint-config/base.js';
let base = fs.readFileSync(basePath, 'utf8');
if (!base.includes('eslint.config.mjs')) {
  base = base.replace(
    `    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/coverage/**',
    ],`,
    `    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/eslint.config.mjs',
      '**/tailwind.config.ts',
      '**/postcss.config.js',
      'next-env.d.ts',
    ],`,
  );
  fs.writeFileSync(basePath, base, 'utf8');
}

const apiPath = 'packages/types/src/api/index.ts';
let api = fs.readFileSync(apiPath, 'utf8');
api = api.replace('details?: Array<{', 'details?: {');
api = api.replace(
  `    }>;
    requestId: string;`,
  `    }[];
    requestId: string;`,
);
fs.writeFileSync(apiPath, api, 'utf8');

const envPath = 'packages/config/src/env/index.ts';
let env = fs.readFileSync(envPath, 'utf8');
env = env.replace(
  `export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: EnvSource,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(\`Invalid environment configuration:\\n\${envErrorMessage(result.error)}\`);
  }
  return result.data;
}`,
  `export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: EnvSource,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(\`Invalid environment configuration:\\n\${envErrorMessage(result.error)}\`);
  }
  return result.data as z.infer<T>;
}`,
);
env = env.replace(
  `  if (options.skipValidation) {
    return options.runtimeEnv as z.infer<TServer> & z.infer<TClient>;
  }`,
  `  if (options.skipValidation) {
    return options.runtimeEnv as unknown as z.infer<TServer> & z.infer<TClient>;
  }`,
);
fs.writeFileSync(envPath, env, 'utf8');

console.log('lint fixes applied');
