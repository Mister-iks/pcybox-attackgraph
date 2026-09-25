import type { Asset, Block, Control, Edge, Identity, Lab, LabNode, Level, Message, Zone } from './types.ts';

/** Read-only indexes over a lab, built once per simulation. */
export class LabContext {
  readonly lab: Lab;
  readonly nodes = new Map<string, LabNode>();
  readonly zones = new Map<string, Zone>();
  readonly identities = new Map<string, Identity>();
  readonly assetsByNode = new Map<string, Asset[]>();
  private readonly edges = new Map<string, Edge>();

  constructor(lab: Lab) {
    this.lab = lab;
    for (const n of lab.nodes) this.nodes.set(n.id, n);
    for (const z of lab.zones) this.zones.set(z.id, z);
    for (const i of lab.identities) this.identities.set(i.id, i);
    for (const a of lab.assets) {
      const list = this.assetsByNode.get(a.node) ?? [];
      list.push(a);
      this.assetsByNode.set(a.node, list);
    }
    for (const e of lab.edges) this.edges.set(edgeKey(e.source, e.target, e.port), e);
  }

  node(id: string): LabNode {
    const n = this.nodes.get(id);
    if (!n) throw new Error(`Unknown node "${id}"`);
    return n;
  }

  zoneOf(nodeId: string): Zone {
    const z = this.zones.get(this.node(nodeId).zone);
    if (!z) throw new Error(`Unknown zone for node "${nodeId}"`);
    return z;
  }

  isInternet(nodeId: string): boolean {
    return this.node(nodeId).type === 'internet' || this.zoneOf(nodeId).type === 'internet';
  }

  edge(source: string, target: string, port: number): Edge | undefined {
    return this.edges.get(edgeKey(source, target, port));
  }

  controlsOf<T extends Control['type']>(type: T): Extract<Control, { type: T }>[] {
    return this.lab.controls.filter((c): c is Extract<Control, { type: T }> => c.type === type);
  }
}

function edgeKey(source: string, target: string, port: number): string {
  return `${source}>${target}:${port}`;
}

export const LEVEL_RANK: Record<Level, number> = { user: 1, admin: 2 };

export function msg(key: string, params: Record<string, string | number> = {}): Message {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) out[k] = String(v);
  return { key, params: out };
}

/**
 * Outcome of one precondition.
 * - ok: holds; couldBlock lists disabled controls that would break it.
 * - blocked: would hold, but active controls break it.
 * - unmet: does not hold at all, so the step is not even attempted.
 */
export type Check =
  | { status: 'ok'; evidence: Message; couldBlock: Block[] }
  | { status: 'blocked'; blockedBy: Block[] }
  | { status: 'unmet' };

export const ok = (evidence: Message, couldBlock: Block[] = []): Check => ({ status: 'ok', evidence, couldBlock });
export const blocked = (blockedBy: Block[]): Check => ({ status: 'blocked', blockedBy });
export const UNMET: Check = { status: 'unmet' };

/** Splits controls into those that currently apply and those that would apply if enabled. */
export function partition<C extends Control>(controls: C[]): { active: C[]; inactive: C[] } {
  return { active: controls.filter((c) => c.enabled), inactive: controls.filter((c) => !c.enabled) };
}

/** Can an attacker on `from` open a connection to `to:port`? */
export function reach(ctx: LabContext, from: string, to: string, port: number): Check {
  if (from === to) return ok(msg('evidence.local', { node: to }));
  if (ctx.edge(from, to, port)) return ok(msg('evidence.flow', { from, to, port }));
  if (ctx.isInternet(from) || ctx.isInternet(to)) return UNMET;

  const fromZone = ctx.node(from).zone;
  const toZone = ctx.node(to).zone;
  if (fromZone === toZone) return ok(msg('evidence.sameZone', { from, to, port, zone: fromZone }));

  // Different internal zones and no declared flow: only a flat network lets this through.
  const { active, inactive } = partition(ctx.controlsOf('segmentation'));
  const block = (c: Control): Block => ({
    control: c.id,
    message: msg('block.segmentation', { from, to, port, fromZone, toZone }),
  });
  if (active.length > 0) return blocked(active.map(block));
  return ok(msg('evidence.flatNetwork', { from, to, port, fromZone, toZone }), inactive.map(block));
}
