import { describe, expect, it } from 'vitest';
import template from '../../../content/templates/web-application.attackgraph.json' with { type: 'json' };
import { validateLab } from '../src/index.ts';

const clone = () => structuredClone(template) as Record<string, any>;

describe('validateLab', () => {
  it('accepts the template', () => {
    const r = validateLab(template);
    expect(r.ok).toBe(true);
  });

  it('drops unknown fields and prototype keys', () => {
    const input = JSON.parse(JSON.stringify(template).replace('{"id":"web-01"', '{"__proto__":{"polluted":true},"extra":1,"id":"web-01"'));
    const r = validateLab(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const node = r.lab.nodes.find((n) => n.id === 'web-01')!;
    expect(Object.keys(node)).not.toContain('extra');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('reports wrong types with a path', () => {
    const lab = clone();
    lab.nodes[1].services[0].port = 70000;
    const r = validateLab(lab);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toMatch(/^\$\.nodes\[1\]\.services\[0\]\.port/);
  });

  it('reports broken references', () => {
    const lab = clone();
    lab.edges[0].target = 'ghost';
    lab.scenarios[0].target = 'nothing';
    const r = validateLab(lab);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toContain('$.edges[0].target: unknown node "ghost"');
    expect(r.errors).toContain('$.scenarios[0].target: unknown asset "nothing"');
  });

  it('reports duplicate ids', () => {
    const lab = clone();
    lab.nodes[2].id = 'web-01';
    const r = validateLab(lab);
    expect(r.ok).toBe(false);
  });

  it('rejects labels that could inject markup keys or bad language tags', () => {
    const lab = clone();
    lab.meta.title = { '<script>': 'x' };
    expect(validateLab(lab).ok).toBe(false);
  });

  it('rejects non objects and unsupported versions', () => {
    expect(validateLab(null).ok).toBe(false);
    expect(validateLab([]).ok).toBe(false);
    expect(validateLab({ ...clone(), formatVersion: '2.0.0' }).ok).toBe(false);
  });

  it('enforces size limits', () => {
    const lab = clone();
    lab.meta.title = { en: 'x'.repeat(10_000) };
    expect(validateLab(lab).ok).toBe(false);
  });
});
