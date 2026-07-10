/** @type {import('lint-staged').Configuration} */
const config = {
  '*.{ts,tsx,js,jsx,mjs,cjs,json,md,yml,yaml,css}': ['prettier --write'],
};

export default config;
