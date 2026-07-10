const fs = require('fs');
const p = 'packages/ui/src/components/ui/button.tsx';
let s = fs.readFileSync(p, 'utf8');
s = s.replace("from '../lib/utils.js'", "from '@goldos/utils'");
fs.writeFileSync(p, s, 'utf8');
