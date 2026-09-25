import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { validateLab } from '../../engine/src/index.ts';
import schema from '../lab.schema.json' with { type: 'json' };

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true });
const validate = ajv.compile(schema);

const templatesDir = join(import.meta.dirname, '../../../content/templates');
const templates = readdirSync(templatesDir)
  .filter((f) => f.endsWith('.attackgraph.json'))
  .map((f) => [f, JSON.parse(readFileSync(join(templatesDir, f), 'utf8'))] as const);

describe('lab JSON Schema', () => {
  it('has templates to check', () => {
    expect(templates.length).toBeGreaterThan(0);
  });

  it.each(templates)('accepts %s, like the engine validator', (_name, lab) => {
    expect(validate(lab), JSON.stringify(validate.errors)).toBe(true);
    expect(validateLab(lab).ok).toBe(true);
  });

  it('rejects what the engine validator rejects', () => {
    const [, lab] = templates[0]!;
    const cases: ((l: any) => void)[] = [
      (l) => (l.nodes[1].services[0].port = 0),
      (l) => (l.nodes[1].type = 'spaceship'),
      (l) => (l.meta.title = {}),
      (l) => (l.formatVersion = '1.0.0'),
      (l) => (l.scenarios = []),
      (l) => (l.controls[1].nodes = undefined),
    ];
    for (const mutate of cases) {
      const copy = structuredClone(lab);
      mutate(copy);
      expect(validate(copy)).toBe(false);
      expect(validateLab(copy).ok).toBe(false);
    }
  });
});
