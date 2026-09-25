import { describe, expect, it } from 'vitest';
import template from '../../../content/templates/web-application.attackgraph.json' with { type: 'json' };
import { simulate, validateLab, withControl, withoutControls, type Lab, type SimResult } from '../src/index.ts';

function loadTemplate(): Lab {
  const r = validateLab(template);
  if (!r.ok) throw new Error(r.errors.join('\n'));
  return r.lab;
}

function withControls(lab: Lab, ids: string[]): Lab {
  return ids.reduce((l, id) => withControl(l, id, true), withoutControls(lab));
}

/** Compact, readable form of the story for golden assertions. */
function story(result: SimResult): string[] {
  return result.events.map((e) => `${e.result === 'success' ? '+' : 'x'} ${e.technique} ${e.from}->${e.target}`);
}

const lab = loadTemplate();

describe('web application template, attack from the Internet', () => {
  it('reaches the customer data in 3 steps without controls', () => {
    const r = simulate(lab, 'from-internet');
    expect(r.outcome).toBe('target-reached');
    expect(story(r)).toEqual([
      '+ exploit-public-service internet->web-01',
      '+ credentials-in-files web-01->web-01',
      '+ database-access web-01->db-01',
    ]);
    expect(r.metrics.steps).toBe(3);
    expect(r.metrics.exposedServices).toBe(1);
  });

  it('explains the lateral step with the flat network', () => {
    const r = simulate(lab, 'from-internet');
    const step = r.events.find((e) => e.technique === 'database-access')!;
    expect(step.because.map((m) => m.key)).toContain('evidence.flatNetwork');
    expect(step.couldBlock.map((b) => b.control)).toEqual(['segmentation']);
    expect(step.attack.technique).toBe('T1213');
  });

  it('is contained at the web server with segmentation', () => {
    const r = simulate(withControls(lab, ['segmentation']), 'from-internet');
    expect(r.outcome).toBe('contained');
    expect(r.containedAt).toEqual(['web-01']);
    expect(r.blastRadius.assets).toEqual([]);
    const blockedBy = r.events.filter((e) => e.result === 'blocked').flatMap((e) => e.stoppedBy.map((b) => b.control));
    expect(new Set(blockedBy)).toEqual(new Set(['segmentation']));
  });

  it('finds the second path through privilege escalation when only the secrets are removed', () => {
    const r = simulate(withControls(lab, ['vault-web']), 'from-internet');
    expect(r.outcome).toBe('target-reached');
    expect(story(r)).toEqual([
      '+ exploit-public-service internet->web-01',
      '+ privilege-escalation web-01->web-01',
      '+ credential-dumping web-01->web-01',
      '+ remote-login web-01->db-01',
      '+ local-data-access db-01->db-01',
    ]);
  });

  it('is contained when secrets are removed and administrators use MFA', () => {
    const r = simulate(withControls(lab, ['vault-web', 'mfa-admins']), 'from-internet');
    expect(r.outcome).toBe('contained');
    expect(r.blastRadius.nodes).toEqual([{ node: 'web-01', level: 'admin' }]);
    expect(r.blastRadius.identities).toEqual(['adm-ops']);
  });

  it('stops at the entry when the web server is patched', () => {
    const r = simulate(withControls(lab, ['patch-web']), 'from-internet');
    expect(r.outcome).toBe('stopped-at-entry');
    expect(story(r)).toEqual(['x exploit-public-service internet->web-01']);
    expect(r.events[0]!.stoppedBy[0]!.message.key).toBe('block.patch');
  });
});

describe('web application template, assumed breach of the web server', () => {
  it('shows that patching does not help once the attacker is inside', () => {
    const r = simulate(withControls(lab, ['patch-web']), 'assumed-breach-web');
    expect(r.outcome).toBe('target-reached');
  });

  it('shows that MFA does not protect a service account', () => {
    const r = simulate(withControls(lab, ['mfa-admins']), 'assumed-breach-web');
    expect(r.outcome).toBe('target-reached');
    const step = r.events.find((e) => e.technique === 'database-access')!;
    expect(step.because.map((m) => m.key)).toContain('evidence.mfaNotApplicable');
  });

  it('is contained by segmentation', () => {
    const r = simulate(withControls(lab, ['segmentation']), 'assumed-breach-web');
    expect(r.outcome).toBe('contained');
    expect(r.containedAt).toEqual(['web-01']);
  });
});

describe('engine properties', () => {
  const ids = lab.controls.map((c) => c.id);
  const subsets = Array.from({ length: 1 << ids.length }, (_, mask) => ids.filter((_, i) => mask & (1 << i)));
  const capabilities = (r: SimResult) =>
    new Set([
      // Admin on a node implies user on it.
      ...r.blastRadius.nodes.flatMap((n) => (n.level === 'admin' ? [`${n.node}:user`, `${n.node}:admin`] : [`${n.node}:user`])),
      ...r.blastRadius.identities,
      ...r.blastRadius.assets,
    ]);

  it.each(lab.scenarios.map((s) => s.id))('adding a control never gives the attacker more (%s)', (scenario) => {
    for (const subset of subsets) {
      const before = capabilities(simulate(withControls(lab, subset), scenario));
      for (const extra of ids.filter((id) => !subset.includes(id))) {
        const after = capabilities(simulate(withControls(lab, [...subset, extra]), scenario));
        for (const cap of after) expect(before.has(cap), `${[...subset, extra].join('+')} adds ${cap}`).toBe(true);
      }
    }
  });

  it('is deterministic', () => {
    const a = simulate(lab, 'from-internet');
    const b = simulate(structuredClone(lab), 'from-internet');
    expect(b).toEqual(a);
  });

  it('rejects an unknown scenario', () => {
    expect(() => simulate(lab, 'nope')).toThrow(/Unknown scenario/);
  });
});
