// Typography rule of the project: no em dash (U+2014) or en dash (U+2013) in tracked files.
// Use a colon, a comma, parentheses or a plain hyphen instead.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const FORBIDDEN = /[\u2013\u2014]/;
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const TEXT = /\.(md|json|ts|tsx|js|mjs|cjs|css|html|yml|yaml|svg|txt)$|^(LICENSE.*|NOTICE)$/;

let problems = 0;
for (const file of files) {
  if (!TEXT.test(file) || file === 'pnpm-lock.yaml' || !existsSync(file)) continue;
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (FORBIDDEN.test(line)) {
        problems++;
        console.error(`${file}:${i + 1}: long dash found`);
      }
    });
}
if (problems > 0) {
  console.error(`\n${problems} line(s) with a long dash. Replace them with ":", ",", "(...)" or "-".`);
  process.exit(1);
}
console.log(`check-text: ${files.length} files OK`);
