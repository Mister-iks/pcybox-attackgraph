import {
  ASSET_KINDS,
  CONTROL_TYPES,
  DIFFICULTIES,
  IDENTITY_TYPES,
  NODE_TYPES,
  SECRET_KINDS,
  SERVICE_KINDS,
  WEAKNESSES,
  ZONE_TYPES,
  type Asset,
  type Control,
  type Edge,
  type Identity,
  type Lab,
  type LabMeta,
  type LabNode,
  type Localized,
  type Privilege,
  type Scenario,
  type Service,
  type StoredSecret,
  type Zone,
} from './types.ts';

/**
 * Validates untrusted input (imported file, shared link) and returns a fresh, normalized lab.
 *
 * Only known fields are copied, so unexpected keys (including "__proto__") never reach the app.
 * This validator runs without code generation, which keeps a strict Content-Security-Policy possible.
 */
export type ValidationResult = { ok: true; lab: Lab } | { ok: false; errors: string[] };

export const LIMITS = {
  nodes: 1000,
  edges: 5000,
  items: 1000,
  text: 500,
  languages: 50,
  listItems: 64,
} as const;

const ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const MAX_ERRORS = 50;

class Invalid extends Error {}

class Reader {
  readonly errors: string[] = [];

  fail(path: string, message: string): never {
    this.errors.push(`${path}: ${message}`);
    throw new Invalid();
  }

  /** Runs a sub-read, collecting its error instead of aborting the whole validation. */
  attempt<T>(fn: () => T): T | undefined {
    if (this.errors.length >= MAX_ERRORS) throw new Invalid();
    try {
      return fn();
    } catch (e) {
      if (e instanceof Invalid) return undefined;
      throw e;
    }
  }

  object(v: unknown, path: string): Record<string, unknown> {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) this.fail(path, 'must be an object');
    return v as Record<string, unknown>;
  }

  array(v: unknown, path: string, max: number): unknown[] {
    if (!Array.isArray(v)) this.fail(path, 'must be an array');
    if (v.length > max) this.fail(path, `must have at most ${max} items`);
    return v;
  }

  string(v: unknown, path: string, max: number = LIMITS.text): string {
    if (typeof v !== 'string') this.fail(path, 'must be a string');
    if (v.length > max) this.fail(path, `must be at most ${max} characters`);
    return v;
  }

  id(v: unknown, path: string): string {
    const s = this.string(v, path, 64);
    if (!ID.test(s)) this.fail(path, 'must be an id (letters, digits, "-", "_", "."; 64 characters max)');
    return s;
  }

  bool(v: unknown, path: string): boolean {
    if (typeof v !== 'boolean') this.fail(path, 'must be a boolean');
    return v;
  }

  int(v: unknown, path: string, min: number, max: number): number {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
      this.fail(path, `must be an integer between ${min} and ${max}`);
    }
    return v;
  }

  finite(v: unknown, path: string): number {
    if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 1e6) this.fail(path, 'must be a finite number');
    return v;
  }

  oneOf<T extends string>(v: unknown, allowed: readonly T[], path: string): T {
    if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
      this.fail(path, `must be one of: ${allowed.join(', ')}`);
    }
    return v as T;
  }

  localized(v: unknown, path: string): Localized {
    const o = this.object(v, path);
    const entries = Object.keys(o);
    if (entries.length === 0) this.fail(path, 'must have at least one language');
    if (entries.length > LIMITS.languages) this.fail(path, `must have at most ${LIMITS.languages} languages`);
    const out: Localized = Object.create(null);
    for (const lang of entries) {
      if (!LANG.test(lang)) this.fail(`${path}.${lang}`, 'must be a language tag such as "en" or "pt-BR"');
      out[lang] = this.string(o[lang], `${path}.${lang}`);
    }
    return { ...out };
  }

  list<T>(v: unknown, path: string, max: number, item: (x: unknown, p: string) => T): T[] {
    const out: T[] = [];
    this.array(v, path, max).forEach((x, i) => {
      const r = this.attempt(() => item(x, `${path}[${i}]`));
      if (r !== undefined) out.push(r);
    });
    return out;
  }

  optional<T>(o: Record<string, unknown>, key: string, read: (v: unknown) => T): T | undefined {
    return o[key] === undefined ? undefined : read(o[key]);
  }
}

export function validateLab(input: unknown): ValidationResult {
  const r = new Reader();
  let lab: Lab | undefined;
  try {
    lab = readLab(r, input);
  } catch (e) {
    if (!(e instanceof Invalid)) throw e;
  }
  if (lab && r.errors.length === 0) checkReferences(r, lab);
  if (r.errors.length > 0 || !lab) return { ok: false, errors: r.errors.slice(0, MAX_ERRORS) };
  return { ok: true, lab };
}

function readLab(r: Reader, input: unknown): Lab {
  const o = r.object(input, '$');
  const formatVersion = r.string(o.formatVersion, '$.formatVersion', 20);
  if (!/^0\.\d+\.\d+$/.test(formatVersion)) r.fail('$.formatVersion', 'unsupported version (this app reads 0.x.y)');
  return {
    formatVersion,
    id: r.id(o.id, '$.id'),
    meta: readMeta(r, o.meta),
    zones: r.list(o.zones, '$.zones', LIMITS.items, (x, p) => readZone(r, x, p)),
    nodes: r.list(o.nodes, '$.nodes', LIMITS.nodes, (x, p) => readNode(r, x, p)),
    edges: r.list(o.edges, '$.edges', LIMITS.edges, (x, p) => readEdge(r, x, p)),
    identities: r.list(o.identities, '$.identities', LIMITS.items, (x, p) => readIdentity(r, x, p)),
    assets: r.list(o.assets, '$.assets', LIMITS.items, (x, p) => readAsset(r, x, p)),
    controls: r.list(o.controls, '$.controls', LIMITS.items, (x, p) => readControl(r, x, p)),
    scenarios: r.list(o.scenarios, '$.scenarios', LIMITS.items, (x, p) => readScenario(r, x, p)),
  };
}

function readMeta(r: Reader, v: unknown): LabMeta {
  const o = r.object(v, '$.meta');
  const description = r.optional(o, 'description', (x) => r.localized(x, '$.meta.description'));
  return {
    title: r.localized(o.title, '$.meta.title'),
    ...(description && { description }),
    authors: r.list(o.authors, '$.meta.authors', LIMITS.listItems, (x, p) => r.string(x, p, 200)),
    license: r.string(o.license, '$.meta.license', 100),
    difficulty: r.oneOf(o.difficulty, DIFFICULTIES, '$.meta.difficulty'),
    tags: r.list(o.tags, '$.meta.tags', LIMITS.listItems, (x, p) => r.string(x, p, 64)),
  };
}

function readZone(r: Reader, v: unknown, p: string): Zone {
  const o = r.object(v, p);
  return { id: r.id(o.id, `${p}.id`), type: r.oneOf(o.type, ZONE_TYPES, `${p}.type`), label: r.localized(o.label, `${p}.label`) };
}

function readService(r: Reader, v: unknown, p: string): Service {
  const o = r.object(v, p);
  return {
    id: r.id(o.id, `${p}.id`),
    kind: r.oneOf(o.kind, SERVICE_KINDS, `${p}.kind`),
    port: r.int(o.port, `${p}.port`, 1, 65535),
    protocol: r.oneOf(o.protocol, ['tcp', 'udp'] as const, `${p}.protocol`),
    auth: r.oneOf(o.auth, ['none', 'password', 'key', 'token'] as const, `${p}.auth`),
    runsAs: r.oneOf(o.runsAs, ['user', 'admin'] as const, `${p}.runsAs`),
    weaknesses: r.list(o.weaknesses, `${p}.weaknesses`, LIMITS.listItems, (x, q) => r.oneOf(x, WEAKNESSES, q)),
  };
}

function readSecret(r: Reader, v: unknown, p: string): StoredSecret {
  const o = r.object(v, p);
  return {
    identity: r.id(o.identity, `${p}.identity`),
    kind: r.oneOf(o.kind, SECRET_KINDS, `${p}.kind`),
    requires: r.oneOf(o.requires, ['user', 'admin'] as const, `${p}.requires`),
  };
}

function readNode(r: Reader, v: unknown, p: string): LabNode {
  const o = r.object(v, p);
  const pos = r.object(o.position, `${p}.position`);
  return {
    id: r.id(o.id, `${p}.id`),
    type: r.oneOf(o.type, NODE_TYPES, `${p}.type`),
    label: r.localized(o.label, `${p}.label`),
    zone: r.id(o.zone, `${p}.zone`),
    services: r.list(o.services, `${p}.services`, LIMITS.listItems, (x, q) => readService(r, x, q)),
    weaknesses: r.list(o.weaknesses, `${p}.weaknesses`, LIMITS.listItems, (x, q) => r.oneOf(x, WEAKNESSES, q)),
    secrets: r.list(o.secrets, `${p}.secrets`, LIMITS.listItems, (x, q) => readSecret(r, x, q)),
    position: { x: r.finite(pos.x, `${p}.position.x`), y: r.finite(pos.y, `${p}.position.y`) },
  };
}

function readEdge(r: Reader, v: unknown, p: string): Edge {
  const o = r.object(v, p);
  return {
    id: r.id(o.id, `${p}.id`),
    source: r.id(o.source, `${p}.source`),
    target: r.id(o.target, `${p}.target`),
    port: r.int(o.port, `${p}.port`, 1, 65535),
    protocol: r.oneOf(o.protocol, ['tcp', 'udp'] as const, `${p}.protocol`),
  };
}

function readPrivilege(r: Reader, v: unknown, p: string): Privilege {
  const o = r.object(v, p);
  return {
    node: r.id(o.node, `${p}.node`),
    level: r.oneOf(o.level, ['user', 'admin'] as const, `${p}.level`),
    via: r.list(o.via, `${p}.via`, SERVICE_KINDS.length, (x, q) => r.oneOf(x, SERVICE_KINDS, q)),
  };
}

function readIdentity(r: Reader, v: unknown, p: string): Identity {
  const o = r.object(v, p);
  return {
    id: r.id(o.id, `${p}.id`),
    type: r.oneOf(o.type, IDENTITY_TYPES, `${p}.type`),
    label: r.localized(o.label, `${p}.label`),
    privileges: r.list(o.privileges, `${p}.privileges`, LIMITS.items, (x, q) => readPrivilege(r, x, q)),
  };
}

function readAsset(r: Reader, v: unknown, p: string): Asset {
  const o = r.object(v, p);
  const cia = r.object(o.cia, `${p}.cia`);
  return {
    id: r.id(o.id, `${p}.id`),
    kind: r.oneOf(o.kind, ASSET_KINDS, `${p}.kind`),
    label: r.localized(o.label, `${p}.label`),
    node: r.id(o.node, `${p}.node`),
    requires: r.oneOf(o.requires, ['user', 'admin'] as const, `${p}.requires`),
    cia: { c: r.int(cia.c, `${p}.cia.c`, 1, 4), i: r.int(cia.i, `${p}.cia.i`, 1, 4), a: r.int(cia.a, `${p}.cia.a`, 1, 4) },
  };
}

function readControl(r: Reader, v: unknown, p: string): Control {
  const o = r.object(v, p);
  const description = r.optional(o, 'description', (x) => r.localized(x, `${p}.description`));
  const base = {
    id: r.id(o.id, `${p}.id`),
    label: r.localized(o.label, `${p}.label`),
    ...(description && { description }),
    enabled: r.bool(o.enabled, `${p}.enabled`),
  };
  const type = r.oneOf(o.type, CONTROL_TYPES, `${p}.type`);
  const ids = (key: string) => r.list(o[key], `${p}.${key}`, LIMITS.items, (x, q) => r.id(x, q));
  switch (type) {
    case 'segmentation':
      return { ...base, type };
    case 'secrets-vault':
    case 'patch':
      return { ...base, type, nodes: ids('nodes') };
    case 'mfa':
      return { ...base, type, identities: ids('identities') };
    case 'credential-protection':
      return { ...base, type, nodes: ids('nodes') };
    case 'least-privilege':
      return {
        ...base,
        type,
        revoke: r.list(o.revoke, `${p}.revoke`, LIMITS.items, (x, q) => {
          const rv = r.object(x, q);
          return { identity: r.id(rv.identity, `${q}.identity`), node: r.id(rv.node, `${q}.node`) };
        }),
      };
  }
}

function readScenario(r: Reader, v: unknown, p: string): Scenario {
  const o = r.object(v, p);
  const entry = r.object(o.entry, `${p}.entry`);
  const description = r.optional(o, 'description', (x) => r.localized(x, `${p}.description`));
  const target = r.optional(o, 'target', (x) => r.id(x, `${p}.target`));
  return {
    id: r.id(o.id, `${p}.id`),
    label: r.localized(o.label, `${p}.label`),
    ...(description && { description }),
    entry: { node: r.id(entry.node, `${p}.entry.node`), level: r.oneOf(entry.level, ['user', 'admin'] as const, `${p}.entry.level`) },
    ...(target && { target }),
  };
}

function checkReferences(r: Reader, lab: Lab): void {
  const unique = (items: { id: string }[], path: string) => {
    const seen = new Set<string>();
    items.forEach((it, i) => {
      if (seen.has(it.id)) r.errors.push(`${path}[${i}].id: duplicate id "${it.id}"`);
      seen.add(it.id);
    });
    return seen;
  };
  const zones = unique(lab.zones, '$.zones');
  const nodes = unique(lab.nodes, '$.nodes');
  const identities = unique(lab.identities, '$.identities');
  const assets = unique(lab.assets, '$.assets');
  unique(lab.edges, '$.edges');
  unique(lab.controls, '$.controls');
  unique(lab.scenarios, '$.scenarios');

  const ref = (set: Set<string>, id: string, path: string, what: string) => {
    if (!set.has(id)) r.errors.push(`${path}: unknown ${what} "${id}"`);
  };
  lab.nodes.forEach((n, i) => {
    ref(zones, n.zone, `$.nodes[${i}].zone`, 'zone');
    unique(n.services, `$.nodes[${i}].services`);
    n.secrets.forEach((s, j) => ref(identities, s.identity, `$.nodes[${i}].secrets[${j}].identity`, 'identity'));
  });
  lab.edges.forEach((e, i) => {
    ref(nodes, e.source, `$.edges[${i}].source`, 'node');
    ref(nodes, e.target, `$.edges[${i}].target`, 'node');
  });
  lab.identities.forEach((id, i) =>
    id.privileges.forEach((pr, j) => ref(nodes, pr.node, `$.identities[${i}].privileges[${j}].node`, 'node')),
  );
  lab.assets.forEach((a, i) => ref(nodes, a.node, `$.assets[${i}].node`, 'node'));
  lab.controls.forEach((c, i) => {
    if (c.type === 'patch' || c.type === 'secrets-vault' || c.type === 'credential-protection') {
      c.nodes.forEach((n, j) => ref(nodes, n, `$.controls[${i}].nodes[${j}]`, 'node'));
    }
    if (c.type === 'mfa') c.identities.forEach((n, j) => ref(identities, n, `$.controls[${i}].identities[${j}]`, 'identity'));
    if (c.type === 'least-privilege') {
      c.revoke.forEach((rv, j) => {
        ref(identities, rv.identity, `$.controls[${i}].revoke[${j}].identity`, 'identity');
        ref(nodes, rv.node, `$.controls[${i}].revoke[${j}].node`, 'node');
      });
    }
  });
  lab.scenarios.forEach((s, i) => {
    ref(nodes, s.entry.node, `$.scenarios[${i}].entry.node`, 'node');
    if (s.target) ref(assets, s.target, `$.scenarios[${i}].target`, 'asset');
  });
  if (lab.scenarios.length === 0) r.errors.push('$.scenarios: a lab needs at least one scenario');
}
