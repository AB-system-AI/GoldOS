import nextConfig from '@goldos/eslint-config/next';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nextConfig,
  {
    files: ['src/app/api/v1/**/*.ts'],
    ignores: ['src/app/api/v1/auth/**'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
];
