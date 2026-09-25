// Performance budget from the specification: initial JavaScript at most 250 kB gzip.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_JS = 250 * 1024;
const BUDGET_CSS = 50 * 1024;
const dir = 'apps/web/dist/assets';

let js = 0;
let css = 0;
for (const file of readdirSync(dir)) {
  const size = gzipSync(readFileSync(join(dir, file))).length;
  // The simulation worker loads after the page, it is not part of the initial load.
  if (file.endsWith('.js') && !file.startsWith('worker')) js += size;
  if (file.endsWith('.css')) css += size;
  console.log(`${file.padEnd(40)} ${(size / 1024).toFixed(1)} kB gzip`);
}

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
console.log(`\ninitial JS ${kb(js)} / ${kb(BUDGET_JS)}, CSS ${kb(css)} / ${kb(BUDGET_CSS)}`);
if (js > BUDGET_JS || css > BUDGET_CSS) {
  console.error('Bundle budget exceeded.');
  process.exit(1);
}
