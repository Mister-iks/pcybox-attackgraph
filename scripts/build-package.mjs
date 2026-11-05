// Builds a package for npm: compiles src/ to dist/ (JavaScript and type declarations).
// Run from a package folder, as its build script: pnpm build
// The sources import each other with .ts extensions; tsc rewrites them to .js in the
// JavaScript output, and this script does the same in the declarations.
import { execSync } from 'node:child_process';
import { chmodSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
rmSync(dist, { recursive: true, force: true });

// Run through a package script, so that tsc from the package dependencies is on the PATH.
execSync('tsc -p tsconfig.build.json', { stdio: 'inherit' });

const RELATIVE_TS = /(from\s+|import\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\.ts\2/g;
for (const entry of readdirSync(dist, { recursive: true, encoding: 'utf8' })) {
  if (!entry.endsWith('.d.ts')) continue;
  const file = join(dist, entry);
  const text = readFileSync(file, 'utf8');
  const fixed = text.replace(RELATIVE_TS, (_, before, quote, path) => `${before}${quote}${path}.js${quote}`);
  if (fixed !== text) writeFileSync(file, fixed);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const bins = pkg.publishConfig?.bin ?? {};
for (const bin of Object.values(bins)) chmodSync(bin, 0o755);
