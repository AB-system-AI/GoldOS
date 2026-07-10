const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function toUtf8(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 2 && buf[1] === 0 && buf[0] < 128) {
    fs.writeFileSync(filePath, buf.toString('utf16le'), 'utf8');
    return true;
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    fs.writeFileSync(filePath, buf.slice(2).toString('utf16le'), 'utf8');
    return true;
  }
  return false;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next', 'dist', '.turbo'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (/\.(json|md|ts|tsx|js|mjs|cjs|yml|yaml|css|prisma|sql|toml|sh)$/.test(entry.name)) {
      if (toUtf8(full)) {
        console.log(`fixed: ${path.relative(ROOT, full)}`);
      }
    }
  }
}

walk(ROOT);
