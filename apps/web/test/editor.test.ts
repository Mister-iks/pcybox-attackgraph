import { simulate, validateLab, type Lab } from '@pcybox/attackgraph-engine';
import { describe, expect, it } from 'vitest';
import { findIssues } from '../src/editor/issues.ts';
import {
  addAsset,
  addControl,
  addEdge,
  addIdentity,
  addNode,
  addScenario,
  addZone,
  arrange,
  createLab,
  duplicateNode,
  freeSpot,
  nextId,
  removeAsset,
  removeIdentity,
  removeNodes,
  removeZone,
  updateIdentity,
  updateNode,
  updateScenario,
} from '../src/editor/ops.ts';
import { DEFAULT_LAB } from '../src/lab/templates.ts';

const texts = { title: 'New lab', internet: 'Internet', internal: 'Internal', scenario: 'Attack from the Internet' };
const valid = (lab: Lab) => {
  const r = validateLab(lab);
  if (!r.ok) throw new Error(r.errors.join('\n'));
  return true;
};

describe('editor operations', () => {
  it('creates a valid empty lab', () => {
    const lab = createLab('en', texts);
    expect(valid(lab)).toBe(true);
    expect(findIssues(lab).filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('builds a lab from scratch that the engine can simulate', () => {
    let lab = createLab('en', texts);
    let web: string;
    ({ lab, id: web } = addNode(lab, 'web-server', { en: 'Shop' }, { x: 300, y: 100 }, 'internal'));
    lab = updateNode(lab, web, {
      services: lab.nodes.find((n) => n.id === web)!.services.map((s) => ({ ...s, weaknesses: ['injection'] })),
    });
    ({ lab } = addEdge(lab, 'internet', web));
    let asset: string;
    ({ lab, id: asset } = addAsset(lab, { en: 'Orders' }, web));
    lab = updateScenario(lab, 'from-internet', { target: asset });
    expect(valid(lab)).toBe(true);
    expect(lab.edges[0]).toMatchObject({ source: 'internet', target: web, port: 443 });
    expect(simulate(lab, 'from-internet').outcome).toBe('target-reached');
  });

  it('generates unique ids', () => {
    expect(nextId(['node-1', 'node-2'], 'node')).toBe('node-3');
    let lab = createLab('en', texts);
    const a = addNode(lab, 'server', { en: 'A' }, { x: 0, y: 0 }, 'internal');
    const b = addNode(a.lab, 'server', { en: 'B' }, { x: 0, y: 0 }, 'internal');
    lab = duplicateNode(b.lab, b.id).lab;
    expect(new Set(lab.nodes.map((n) => n.id)).size).toBe(lab.nodes.length);
    expect(valid(lab)).toBe(true);
  });

  it('does not duplicate flows or link an element to itself', () => {
    const lab = createLab('en', texts);
    const { lab: l1, id } = addNode(lab, 'database', { en: 'DB' }, { x: 0, y: 0 }, 'internal');
    const first = addEdge(l1, 'internet', id);
    const second = addEdge(first.lab, 'internet', id);
    expect(second.lab.edges).toHaveLength(1);
    expect(second.id).toBe(first.id);
    expect(addEdge(l1, id, id).id).toBeNull();
  });

  it('removes an element and everything that refers to it', () => {
    const lab = removeNodes(DEFAULT_LAB, ['db-01']);
    expect(valid(lab)).toBe(true);
    expect(lab.edges.some((e) => e.target === 'db-01')).toBe(false);
    expect(lab.assets).toEqual([]);
    expect(lab.scenarios.every((s) => s.target === undefined)).toBe(true);
    expect(lab.identities.every((i) => i.privileges.every((p) => p.node !== 'db-01'))).toBe(true);
  });

  it('moves the scenario entry when its element is removed', () => {
    const lab = removeNodes(DEFAULT_LAB, ['web-01']);
    expect(valid(lab)).toBe(true);
    expect(lab.scenarios.find((s) => s.id === 'assumed-breach-web')!.entry).toEqual({ node: 'internet', level: 'admin' });
  });

  it('removes identities and assets with their references', () => {
    let lab = removeIdentity(DEFAULT_LAB, 'adm-ops');
    expect(valid(lab)).toBe(true);
    expect(lab.nodes.flatMap((n) => n.secrets).some((s) => s.identity === 'adm-ops')).toBe(false);
    lab = removeAsset(lab, 'customer-data');
    expect(valid(lab)).toBe(true);
  });

  it('only removes empty zones', () => {
    expect(removeZone(DEFAULT_LAB, 'dmz').zones).toHaveLength(DEFAULT_LAB.zones.length);
    const { lab, id } = addZone(DEFAULT_LAB, 'cloud', { en: 'Cloud' });
    expect(removeZone(lab, id).zones).toHaveLength(DEFAULT_LAB.zones.length);
  });

  it('adds valid identities, controls and scenarios', () => {
    let lab = DEFAULT_LAB;
    let id: string;
    ({ lab, id } = addIdentity(lab, { en: 'Intern' }));
    lab = updateIdentity(lab, id, { privileges: [{ node: 'api-01', level: 'user', via: ['ssh'] }] });
    for (const type of ['segmentation', 'mfa', 'patch', 'secrets-vault', 'least-privilege', 'credential-protection'] as const) {
      ({ lab } = addControl(lab, type, { en: type }));
    }
    ({ lab } = addScenario(lab, { en: 'Another' }));
    expect(valid(lab)).toBe(true);
  });

  it('places new elements where they do not cover another one', () => {
    const internet = DEFAULT_LAB.nodes.find((n) => n.id === 'internet')!.position;
    const spot = freeSpot(DEFAULT_LAB, internet);
    expect(spot.y).toBe(internet.y);
    expect(spot.x).toBeGreaterThan(internet.x);
    expect(freeSpot(DEFAULT_LAB, { x: -2000, y: -2000 })).toEqual({ x: -2000, y: -2000 });
  });

  it('arranges elements by zone without overlap', () => {
    const lab = arrange(DEFAULT_LAB);
    const keys = lab.nodes.map((n) => `${n.position.x},${n.position.y}`);
    expect(new Set(keys).size).toBe(keys.length);
    const x = (id: string) => lab.nodes.find((n) => n.id === id)!.position.x;
    expect(x('internet')).toBeLessThan(x('web-01'));
    expect(x('web-01')).toBeLessThan(x('db-01'));
  });
});

describe('editor issues', () => {
  it('finds no error in the templates', () => {
    expect(findIssues(DEFAULT_LAB).filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('points at flows to a port without service and controls without target', () => {
    let lab = addEdge(DEFAULT_LAB, 'internet', 'db-01', 9999).lab;
    lab = addControl(lab, 'mfa', { en: 'MFA' }).lab;
    const keys = findIssues(lab).map((i) => i.key);
    expect(keys).toContain('issue.flowWithoutService');
    expect(keys).toContain('issue.controlWithoutTarget');
  });

  it('reports a lab without scenario as an error', () => {
    const lab = { ...DEFAULT_LAB, scenarios: [] };
    expect(findIssues(lab).some((i) => i.severity === 'error')).toBe(true);
  });
});
