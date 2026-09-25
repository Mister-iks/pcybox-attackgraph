import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { simulate, validateLab, withControl, withoutControls, type Lab, type SimResult } from '../src/index.ts';

const dir = join(import.meta.dirname, '../../../content/templates');
const templates = new Map<string, Lab>(
  readdirSync(dir)
    .filter((f) => f.endsWith('.attackgraph.json'))
    .map((f) => {
      const r = validateLab(JSON.parse(readFileSync(join(dir, f), 'utf8')));
      if (!r.ok) throw new Error(`${f}:\n${r.errors.join('\n')}`);
      return [r.lab.id, r.lab] as const;
    }),
);

function lab(id: string): Lab {
  const l = templates.get(id);
  if (!l) throw new Error(`missing template ${id}`);
  return l;
}

function run(id: string, scenario: string, controls: string[] = []): SimResult {
  const l = controls.reduce((acc, c) => withControl(acc, c, true), withoutControls(lab(id)));
  return simulate(l, scenario);
}

const story = (r: SimResult) => r.events.map((e) => `${e.result === 'success' ? '+' : 'x'} ${e.technique} ${e.from}->${e.target}`);

describe('every template', () => {
  it.each([...templates.keys()])('%s: each scenario reaches its target without controls', (id) => {
    for (const s of lab(id).scenarios) expect(run(id, s.id).outcome, s.id).toBe('target-reached');
  });

  it.each([...templates.keys()])('%s: adding a control never gives the attacker more', (id) => {
    const l = lab(id);
    const ids = l.controls.map((c) => c.id);
    const subsets = Array.from({ length: 1 << ids.length }, (_, m) => ids.filter((_, i) => m & (1 << i)));
    const caps = (r: SimResult) =>
      new Set([
        ...r.blastRadius.nodes.flatMap((n) => (n.level === 'admin' ? [`${n.node}:user`, `${n.node}:admin`] : [`${n.node}:user`])),
        ...r.blastRadius.identities,
        ...r.blastRadius.assets,
      ]);
    for (const s of l.scenarios) {
      for (const subset of subsets) {
        const before = caps(run(id, s.id, subset));
        for (const extra of ids.filter((c) => !subset.includes(c))) {
          for (const cap of caps(run(id, s.id, [...subset, extra]))) {
            expect(before.has(cap), `${s.id}: ${[...subset, extra].join('+')} adds ${cap}`).toBe(true);
          }
        }
      }
    }
  });
});

describe('small office', () => {
  it('phishing reaches the accounting files through the shared local admin password', () => {
    expect(story(run('tpl-small-office', 'phishing'))).toEqual([
      '+ privilege-escalation ws-01->ws-01',
      '+ credential-dumping ws-01->ws-01',
      '+ remote-login ws-01->fs-01',
      '+ local-data-access fs-01->fs-01',
    ]);
  });

  it('unique local passwords are not enough while the IT admin logs on everywhere', () => {
    const r = run('tpl-small-office', 'phishing', ['unique-local-admin']);
    expect(r.outcome).toBe('target-reached');
    expect(r.events.find((e) => e.technique === 'remote-login')?.params.identity).toBe('it-admin');
  });

  it('MFA on remote desktop does not stop SMB logins', () => {
    expect(run('tpl-small-office', 'phishing', ['unique-local-admin', 'mfa-it']).outcome).toBe('target-reached');
  });

  it('segmentation does not block the file sharing flow the PCs need', () => {
    expect(run('tpl-small-office', 'phishing', ['segmentation']).outcome).toBe('target-reached');
  });

  it('patching the PCs stops both scenarios at the entry', () => {
    expect(run('tpl-small-office', 'phishing', ['patch-pcs']).outcome).toBe('stopped-at-entry');
    expect(run('tpl-small-office', 'exposed-rdp', ['patch-pcs']).outcome).toBe('stopped-at-entry');
  });
});

describe('active directory', () => {
  it('phishing takes the domain with the cached domain admin credentials', () => {
    expect(story(run('tpl-active-directory', 'phishing'))).toEqual([
      '+ privilege-escalation ws-01->ws-01',
      '+ credential-dumping ws-01->ws-01',
      '+ remote-login ws-01->dc-01',
      '+ local-data-access dc-01->dc-01',
    ]);
  });

  it('segmentation and MFA do not stop SMB with stolen domain admin credentials', () => {
    expect(run('tpl-active-directory', 'phishing', ['segmentation', 'mfa-da']).outcome).toBe('target-reached');
  });

  it('admin tiering contains both scenarios, and explains why', () => {
    for (const s of ['phishing', 'server-breach']) {
      const r = run('tpl-active-directory', s, ['tiering']);
      expect(r.outcome, s).toBe('contained');
      const keys = r.events.flatMap((e) => e.stoppedBy.map((b) => b.message.key));
      expect(keys, s).toContain('block.leastPrivilegeCache');
    }
  });

  it('credential protection contains the attack too', () => {
    expect(run('tpl-active-directory', 'phishing', ['credential-protection']).outcome).toBe('contained');
  });

  it('points to tiering as a control that could have stopped the dump', () => {
    const dump = run('tpl-active-directory', 'phishing').events.find((e) => e.technique === 'credential-dumping')!;
    expect(dump.couldBlock.map((b) => b.control).sort()).toEqual(['credential-protection', 'tiering']);
  });
});
