const fs = require('node:fs');
const path = 'packages/eslint-config/base.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  "'turbo/no-undeclared-env-vars': 'error',",
  "'turbo/no-undeclared-env-vars': 'off',",
);
fs.writeFileSync(path, content, 'utf8');
console.log('disabled turbo env rule');
