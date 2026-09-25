import type { Lab, Level, SimEvent, SimResult } from '@pcybox/attackgraph-engine';

export interface AttackArrow {
  id: string;
  from: string;
  to: string;
  result: 'success' | 'blocked';
  /** Step numbers (1 based) drawn on the arrow. */
  steps: number[];
  current: boolean;
}

export interface MapView {
  /** Where the attacker starts. */
  entry: string;
  footholds: Map<string, Level>;
  /** Nodes where a revealed step was blocked and that the attacker does not hold. */
  blocked: Set<string>;
  reachedAssets: Set<string>;
  /** Nodes hosting a reached asset. */
  breached: Set<string>;
  arrows: AttackArrow[];
  current: SimEvent | null;
}

/** What the map shows after `cursor` events have been revealed. */
export function deriveView(lab: Lab, scenarioId: string, result: SimResult | null, cursor: number, currentIndex: number): MapView {
  const scenario = lab.scenarios.find((s) => s.id === scenarioId) ?? lab.scenarios[0]!;
  const entryIsInternet = lab.nodes.find((n) => n.id === scenario.entry.node)?.type === 'internet';
  const footholds = new Map<string, Level>();
  if (!entryIsInternet) footholds.set(scenario.entry.node, scenario.entry.level);

  const view: MapView = {
    entry: scenario.entry.node,
    footholds,
    blocked: new Set(),
    reachedAssets: new Set(),
    breached: new Set(),
    arrows: [],
    current: null,
  };
  if (!result) return view;

  const arrows = new Map<string, AttackArrow>();
  result.events.slice(0, cursor).forEach((e, i) => {
    if (e.result === 'success') {
      for (const g of e.gained) {
        if (g.type === 'foothold' && (g.level === 'admin' || !footholds.has(g.node))) footholds.set(g.node, g.level);
        if (g.type === 'data') view.reachedAssets.add(g.asset);
      }
    } else {
      view.blocked.add(e.target);
    }
    if (e.from !== e.target) {
      const key = `${e.from}>${e.target}>${e.result}`;
      const arrow = arrows.get(key) ?? { id: `attack-${key}`, from: e.from, to: e.target, result: e.result, steps: [], current: false };
      arrow.steps.push(i + 1);
      if (i === currentIndex) arrow.current = true;
      arrows.set(key, arrow);
    }
  });
  for (const node of footholds.keys()) view.blocked.delete(node);
  for (const a of lab.assets) if (view.reachedAssets.has(a.id)) view.breached.add(a.node);
  view.arrows = [...arrows.values()];
  view.current = currentIndex >= 0 && currentIndex < cursor ? (result.events[currentIndex] ?? null) : null;
  return view;
}
