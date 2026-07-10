const fs = require('node:fs');
const path = require('node:path');

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.ts')) {
      const content = fs.readFileSync(full, 'utf8');
      const next = content.replace(/from '(@\/[^']+)\.js'/g, "from '$1'");
      if (next !== content) {
        fs.writeFileSync(full, next, 'utf8');
        console.log('fixed', full);
      }
    }
  }
}

walk(path.join(__dirname, '..', 'apps', 'api', 'src'));
