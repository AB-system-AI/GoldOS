import baseConfig from '@goldos/eslint-config/base';

export default [
  ...baseConfig,
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
];
