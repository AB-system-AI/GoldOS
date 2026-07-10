import baseConfig from '@goldos/eslint-config/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      'dist/**',
      'prisma/**',
      'scripts/**',
      '**/*.cjs',
      'prisma.config.ts',
      'src/**/*.js',
      'src/**/*.d.ts',
      'src/**/*.js.map',
      'src/**/*.d.ts.map',
    ],
  },
  ...baseConfig,
];
