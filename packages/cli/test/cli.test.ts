import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { main } from '../src/cli.ts';

const templates = join(import.meta.dirname, '../../../content/templates');
const web = join(templates, 'web-application.attackgraph.json');
const ad = join(templates, 'active-directory.attackgraph.json');

function run(...args: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = main(args, { out: (l) => out.push(l), err: (l) => err.push(l) });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

describe('attackgraph CLI', () => {
  it('validates the templates', () => {
    const r = run('validate', web, ad);
    expect(r.code).toBe(0);
    expect(r.out).toContain('ok  ');
  });

  it('validates every lab of a folder', () => {
    const r = run('validate', templates);
    expect(r.code).toBe(0);
    expect(r.out.match(/^ok /gm)?.length).toBeGreaterThanOrEqual(3);
  });

  it('reports invalid files with a non zero exit code', () => {
    const dir = mkdtempSync(join(tmpdir(), 'attackgraph-'));
    const bad = join(dir, 'bad.attackgraph.json');
    writeFileSync(bad, '{"formatVersion":"0.1.0"}');
    const r = run('validate', bad, join(dir, 'missing.json'));
    expect(r.code).toBe(1);
    expect(r.err).toContain('invalid lab');
    expect(r.err).toContain('file not found');
  });

  it('tells the attack story with its reasons', () => {
    const r = run('simulate', web);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Target reached');
    expect(r.out).toContain('flat network');
    expect(r.out).toContain('T1213');
  });

  it('applies controls given on the command line', () => {
    const r = run('simulate', web, '--enable', 'segmentation');
    expect(r.out).toContain('Attack contained');
    expect(r.out).toContain('[blocked]');
  });

  it('speaks French and writes Markdown', () => {
    const r = run('simulate', ad, '--scenario', 'phishing', '--enable', 'tiering', '--format', 'markdown', '--lang', 'fr');
    expect(r.out).toMatch(/^## Active Directory: /);
    expect(r.out).toContain('Attaque contenue');
    expect(r.out).toContain('**Blocked**');
  });

  it('outputs JSON for other tools', () => {
    const r = run('simulate', web, '--format', 'json');
    expect(JSON.parse(r.out).outcome).toBe('target-reached');
  });

  it('compares with the lab without controls', () => {
    const r = run('compare', web, '--all-controls');
    expect(r.out).toContain('Without controls');
    expect(r.out).toMatch(/Outcome\s+Target reached\s+Attack stopped at the entry/);
  });

  it('explains wrong arguments', () => {
    expect(run('simulate', web, '--scenario', 'nope').err).toContain('available: from-internet');
    expect(run('simulate', web, '--enable', 'nope').err).toContain('unknown control');
    expect(run('explode').code).toBe(2);
    expect(run('--help').code).toBe(0);
  });
});
