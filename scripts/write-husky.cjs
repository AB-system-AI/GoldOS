const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const preCommit = `#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
npx lint-staged
`;
const commitMsg = `#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
npx commitlint --edit "$1"
`;

fs.writeFileSync(path.join(root, '.husky', 'pre-commit'), preCommit, 'utf8');
fs.writeFileSync(path.join(root, '.husky', 'commit-msg'), commitMsg, 'utf8');
console.log('husky hooks written');
