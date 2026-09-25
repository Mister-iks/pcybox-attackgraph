/**
 * Pure lab editing operations. Every function returns a new lab and keeps references consistent:
 * removing an element also removes what points to it.
 */
import {
  FORMAT_VERSION,
  ZONE_TYPES,
  type Asset,
  type Control,
  type ControlType,
  type Edge,
  type Identity,
  type Lab,
  type LabNode,
  type Localized,
  type NodeType,
  type Scenario,
  type Service,
  type ServiceKind,
  type Zone,
  type ZoneType,
} from '@pcybox/attackgraph-engine';

export const NODE_WIDTH = 196;
export const NODE_HEIGHT = 96;

/** Returns `prefix-1`, `prefix-2`... the first id not used in the lab. */
export function nextId(taken: Iterable<string>, prefix: string): string {
  const used = new Set(taken);
  for (let i = 1; ; i++) {
    const id = `${prefix}-${i}`;
    if (!used.has(id)) return id;
  }
}

function allIds(lab: Lab): string[] {
  return [
    ...lab.zones.map((x) => x.id),
    ...lab.nodes.map((x) => x.id),
    ...lab.edges.map((x) => x.id),
    ...lab.identities.map((x) => x.id),
    ...lab.assets.map((x) => x.id),
    ...lab.controls.map((x) => x.id),
    ...lab.scenarios.map((x) => x.id),
  ];
}

const svc = (id: string, kind: ServiceKind, port: number, runsAs: Service['runsAs'] = 'user'): Service => ({
  id,
  kind,
  port,
  protocol: 'tcp',
  auth: kind === 'web' ? 'none' : kind === 'api' ? 'token' : 'password',
  runsAs,
  weaknesses: [],
});

/** Typical services of each kind of element, so a new element is useful right away. */
export function defaultServices(type: NodeType): Service[] {
  switch (type) {
    case 'web-server':
      return [svc('https', 'web', 443)];
    case 'api-server':
      return [svc('https', 'api', 8443)];
    case 'database':
      return [svc('db', 'database', 5432)];
    case 'server':
    case 'jump-host':
    case 'container':
      return [svc('ssh', 'ssh', 22, 'admin')];
    case 'workstation':
    case 'laptop':
      return [svc('rdp', 'rdp', 3389, 'admin')];
    case 'file-share':
    case 'backup-server':
      return [svc('smb', 'smb', 445, 'admin')];
    case 'domain-controller':
      return [svc('smb', 'smb', 445, 'admin'), svc('rdp', 'rdp', 3389, 'admin')];
    case 'vpn-gateway':
      return [svc('vpn', 'vpn', 443)];
    case 'saas-app':
    case 'cloud-service':
      return [svc('https', 'web', 443)];
    default:
      return [];
  }
}

export function newService(node: LabNode): Service {
  return svc(nextId(node.services.map((s) => s.id), 'svc'), 'web', 443);
}

/* ------------------------------------------------------------------ */
/* Lab                                                                 */
/* ------------------------------------------------------------------ */

export interface NewLabTexts {
  title: string;
  internet: string;
  internal: string;
  scenario: string;
}

/** The smallest useful lab: the Internet, one internal zone, one scenario. */
export function createLab(locale: string, texts: NewLabTexts): Lab {
  const t = (s: string): Localized => ({ [locale]: s });
  return {
    formatVersion: FORMAT_VERSION,
    id: `lab-${Date.now().toString(36)}`,
    meta: { title: t(texts.title), authors: [], license: 'CC-BY-4.0', difficulty: 'beginner', tags: [] },
    zones: [
      { id: 'internet', type: 'internet', label: t(texts.internet) },
      { id: 'internal', type: 'internal', label: t(texts.internal) },
    ],
    nodes: [
      {
        id: 'internet',
        type: 'internet',
        label: t(texts.internet),
        zone: 'internet',
        services: [],
        weaknesses: [],
        secrets: [],
        position: { x: 0, y: 120 },
      },
    ],
    edges: [],
    identities: [],
    assets: [],
    controls: [],
    scenarios: [{ id: 'from-internet', label: t(texts.scenario), entry: { node: 'internet', level: 'admin' } }],
  };
}

/** Writes `value` in the current language, keeping the other translations. */
export function setText(text: Localized | undefined, locale: string, value: string): Localized {
  return { ...(text ?? {}), [locale]: value };
}

/* ------------------------------------------------------------------ */
/* Zones                                                               */
/* ------------------------------------------------------------------ */

export function addZone(lab: Lab, type: ZoneType, label: Localized): { lab: Lab; id: string } {
  const id = nextId(allIds(lab), type === 'third-party' ? 'partner' : type);
  return { lab: { ...lab, zones: [...lab.zones, { id, type, label }] }, id };
}

export function updateZone(lab: Lab, id: string, patch: Partial<Omit<Zone, 'id'>>): Lab {
  return { ...lab, zones: lab.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) };
}

/** Only empty zones can be removed, so no element is left without a zone. */
export function removeZone(lab: Lab, id: string): Lab {
  if (lab.nodes.some((n) => n.zone === id)) return lab;
  return { ...lab, zones: lab.zones.filter((z) => z.id !== id) };
}

/* ------------------------------------------------------------------ */
/* Nodes and flows                                                     */
/* ------------------------------------------------------------------ */

export function addNode(
  lab: Lab,
  type: NodeType,
  label: Localized,
  position: { x: number; y: number },
  zone: string,
): { lab: Lab; id: string } {
  const prefix = type === 'internet' ? 'internet' : type.split('-')[0]!.slice(0, 6);
  const id = nextId(allIds(lab), prefix);
  const node: LabNode = { id, type, label, zone, services: defaultServices(type), weaknesses: [], secrets: [], position };
  return { lab: { ...lab, nodes: [...lab.nodes, node] }, id };
}

export function updateNode(lab: Lab, id: string, patch: Partial<Omit<LabNode, 'id'>>): Lab {
  return { ...lab, nodes: lab.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) };
}

export function duplicateNode(lab: Lab, id: string): { lab: Lab; id: string } {
  const source = lab.nodes.find((n) => n.id === id);
  if (!source) return { lab, id };
  const copyId = nextId(allIds(lab), id.replace(/-\d+$/, ''));
  const copy: LabNode = structuredClone({ ...source, id: copyId, position: { x: source.position.x + 40, y: source.position.y + 40 } });
  return { lab: { ...lab, nodes: [...lab.nodes, copy] }, id: copyId };
}

/** Removes elements and everything that refers to them. */
export function removeNodes(lab: Lab, ids: string[]): Lab {
  const gone = new Set(ids);
  const nodes = lab.nodes.filter((n) => !gone.has(n.id));
  const assets = lab.assets.filter((a) => !gone.has(a.node));
  const assetIds = new Set(assets.map((a) => a.id));
  const fallback = nodes.find((n) => n.type === 'internet') ?? nodes[0];
  return {
    ...lab,
    nodes,
    edges: lab.edges.filter((e) => !gone.has(e.source) && !gone.has(e.target)),
    identities: lab.identities.map((i) => ({ ...i, privileges: i.privileges.filter((p) => !gone.has(p.node)) })),
    assets,
    controls: lab.controls.map((c) => {
      if (c.type === 'patch' || c.type === 'secrets-vault' || c.type === 'credential-protection') {
        return { ...c, nodes: c.nodes.filter((n) => !gone.has(n)) };
      }
      if (c.type === 'least-privilege') return { ...c, revoke: c.revoke.filter((r) => !gone.has(r.node)) };
      return c;
    }),
    scenarios: lab.scenarios.flatMap((s) => {
      const target = s.target && assetIds.has(s.target) ? s.target : undefined;
      const base: Scenario = { id: s.id, label: s.label, ...(s.description && { description: s.description }), entry: s.entry };
      if (!gone.has(s.entry.node)) return [{ ...base, ...(target && { target }) }];
      // The entry point is gone: start from the Internet (or the first element) instead.
      if (!fallback) return [];
      const level = fallback.type === 'internet' ? 'admin' : 'user';
      return [{ ...base, entry: { node: fallback.id, level }, ...(target && { target }) }];
    }),
  };
}

export function moveNode(lab: Lab, id: string, position: { x: number; y: number }): Lab {
  return updateNode(lab, id, { position });
}

/** Adds a declared flow. The port defaults to the first service of the target. */
export function addEdge(lab: Lab, source: string, target: string, port?: number): { lab: Lab; id: string | null } {
  if (source === target) return { lab, id: null };
  const targetNode = lab.nodes.find((n) => n.id === target);
  if (!targetNode || !lab.nodes.some((n) => n.id === source)) return { lab, id: null };
  const p = port ?? targetNode.services[0]?.port ?? 443;
  const existing = lab.edges.find((e) => e.source === source && e.target === target && e.port === p);
  if (existing) return { lab, id: existing.id };
  const id = nextId(allIds(lab), 'flow');
  const edge: Edge = { id, source, target, port: p, protocol: 'tcp' };
  return { lab: { ...lab, edges: [...lab.edges, edge] }, id };
}

export function updateEdge(lab: Lab, id: string, patch: Partial<Omit<Edge, 'id'>>): Lab {
  return { ...lab, edges: lab.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) };
}

export function removeEdges(lab: Lab, ids: string[]): Lab {
  const gone = new Set(ids);
  return { ...lab, edges: lab.edges.filter((e) => !gone.has(e.id)) };
}

/* ------------------------------------------------------------------ */
/* Identities, assets, controls, scenarios                             */
/* ------------------------------------------------------------------ */

export function addIdentity(lab: Lab, label: Localized): { lab: Lab; id: string } {
  const id = nextId(allIds(lab), 'account');
  const identity: Identity = { id, type: 'user', label, privileges: [] };
  return { lab: { ...lab, identities: [...lab.identities, identity] }, id };
}

export function updateIdentity(lab: Lab, id: string, patch: Partial<Omit<Identity, 'id'>>): Lab {
  return { ...lab, identities: lab.identities.map((i) => (i.id === id ? { ...i, ...patch } : i)) };
}

export function removeIdentity(lab: Lab, id: string): Lab {
  return {
    ...lab,
    identities: lab.identities.filter((i) => i.id !== id),
    nodes: lab.nodes.map((n) => ({ ...n, secrets: n.secrets.filter((s) => s.identity !== id) })),
    controls: lab.controls.map((c) => {
      if (c.type === 'mfa') return { ...c, identities: c.identities.filter((x) => x !== id) };
      if (c.type === 'least-privilege') return { ...c, revoke: c.revoke.filter((r) => r.identity !== id) };
      return c;
    }),
  };
}

export function addAsset(lab: Lab, label: Localized, node: string): { lab: Lab; id: string } {
  const id = nextId(allIds(lab), 'asset');
  const asset: Asset = { id, kind: 'customer-data', label, node, requires: 'user', cia: { c: 3, i: 3, a: 2 } };
  return { lab: { ...lab, assets: [...lab.assets, asset] }, id };
}

export function updateAsset(lab: Lab, id: string, patch: Partial<Omit<Asset, 'id'>>): Lab {
  return { ...lab, assets: lab.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) };
}

export function removeAsset(lab: Lab, id: string): Lab {
  return {
    ...lab,
    assets: lab.assets.filter((a) => a.id !== id),
    scenarios: lab.scenarios.map((s) => {
      if (s.target !== id) return s;
      const { target: _removed, ...rest } = s;
      return rest;
    }),
  };
}

/** A control of the given type, with the fields that type needs. */
export function blankControl(id: string, type: ControlType, label: Localized, enabled: boolean): Control {
  const base = { id, label, enabled };
  switch (type) {
    case 'segmentation':
      return { ...base, type };
    case 'mfa':
      return { ...base, type, identities: [] };
    case 'least-privilege':
      return { ...base, type, revoke: [] };
    case 'patch':
    case 'secrets-vault':
    case 'credential-protection':
      return { ...base, type, nodes: [] };
  }
}

export function addControl(lab: Lab, type: ControlType, label: Localized): { lab: Lab; id: string } {
  const id = nextId(allIds(lab), type);
  return { lab: { ...lab, controls: [...lab.controls, blankControl(id, type, label, false)] }, id };
}

export function replaceControl(lab: Lab, control: Control): Lab {
  return { ...lab, controls: lab.controls.map((c) => (c.id === control.id ? control : c)) };
}

export function removeControl(lab: Lab, id: string): Lab {
  return { ...lab, controls: lab.controls.filter((c) => c.id !== id) };
}

export function addScenario(lab: Lab, label: Localized): { lab: Lab; id: string } {
  const id = nextId(allIds(lab), 'scenario');
  const entry = lab.nodes.find((n) => n.type === 'internet') ?? lab.nodes[0];
  const scenario: Scenario = {
    id,
    label,
    entry: { node: entry?.id ?? 'internet', level: entry?.type === 'internet' ? 'admin' : 'user' },
  };
  return { lab: { ...lab, scenarios: [...lab.scenarios, scenario] }, id };
}

export function updateScenario(lab: Lab, id: string, patch: Partial<Omit<Scenario, 'id'>>): Lab {
  return {
    ...lab,
    scenarios: lab.scenarios.map((s) => {
      if (s.id !== id) return s;
      const next = { ...s, ...patch };
      if (!next.target) delete next.target;
      return next;
    }),
  };
}

export function removeScenario(lab: Lab, id: string): Lab {
  return { ...lab, scenarios: lab.scenarios.filter((s) => s.id !== id) };
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const ZONE_ORDER = new Map<string, number>(ZONE_TYPES.map((t, i) => [t, i]));

/**
 * Places zones side by side (Internet first, then the more exposed zones) and stacks the
 * elements of each zone in columns. Deterministic, so the same lab always gets the same layout.
 */
export function arrange(lab: Lab): Lab {
  const gapX = 90;
  const gapY = 40;
  const perColumn = 4;
  const zones = [...lab.zones].sort((a, b) => (ZONE_ORDER.get(a.type) ?? 99) - (ZONE_ORDER.get(b.type) ?? 99));
  const positions = new Map<string, { x: number; y: number }>();
  let x = 0;
  for (const zone of zones) {
    const members = lab.nodes.filter((n) => n.zone === zone.id);
    if (members.length === 0) continue;
    members.forEach((n, i) => {
      const col = Math.floor(i / perColumn);
      const row = i % perColumn;
      positions.set(n.id, { x: x + col * (NODE_WIDTH + gapX / 2), y: row * (NODE_HEIGHT + gapY) });
    });
    const columns = Math.ceil(members.length / perColumn);
    x += columns * (NODE_WIDTH + gapX / 2) + gapX;
  }
  return { ...lab, nodes: lab.nodes.map((n) => ({ ...n, position: positions.get(n.id) ?? n.position })) };
}

/** The nearest position to the right of `wanted` where a new element does not cover another one. */
export function freeSpot(lab: Lab, wanted: { x: number; y: number }): { x: number; y: number } {
  const margin = 24;
  const overlaps = (p: { x: number; y: number }) =>
    lab.nodes.some(
      (n) =>
        p.x < n.position.x + NODE_WIDTH + margin &&
        p.x + NODE_WIDTH + margin > n.position.x &&
        p.y < n.position.y + NODE_HEIGHT + margin &&
        p.y + NODE_HEIGHT + margin > n.position.y,
    );
  const spot = { ...wanted };
  for (let i = 0; i < 200 && overlaps(spot); i++) spot.x += NODE_WIDTH / 2;
  return spot;
}
