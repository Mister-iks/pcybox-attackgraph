import { TECHNIQUES, factKey, type StateView } from './catalog.ts';
import { LEVEL_RANK, LabContext } from './context.ts';
import type { Block, Fact, Lab, Level, Message, Outcome, SimEvent, SimResult } from './types.ts';

const MAX_ROUNDS = 1000;

class State implements StateView {
  constructor(private readonly facts: ReadonlyMap<string, Fact>) {}

  hasFoothold(node: string, level: Level): boolean {
    return this.facts.has(`foothold:${node}:admin`) || (level === 'user' && this.facts.has(`foothold:${node}:user`));
  }

  footholds(): { node: string; level: Level; key: string }[] {
    const best = new Map<string, Level>();
    for (const f of this.facts.values()) {
      if (f.type !== 'foothold') continue;
      const current = best.get(f.node);
      if (!current || LEVEL_RANK[f.level] > LEVEL_RANK[current]) best.set(f.node, f.level);
    }
    return [...best].map(([node, level]) => ({ node, level, key: this.footholdKey(node, 'user') }));
  }

  footholdKey(node: string, level: Level): string {
    const exact = `foothold:${node}:${level}`;
    return this.facts.has(exact) ? exact : `foothold:${node}:admin`;
  }

  hasCredential(identity: string): boolean {
    return this.facts.has(`credential:${identity}`);
  }

  credentials(): string[] {
    const out: string[] = [];
    for (const f of this.facts.values()) if (f.type === 'credential') out.push(f.identity);
    return out;
  }

  hasData(asset: string): boolean {
    return this.facts.has(`data:${asset}`);
  }

  has(f: Fact): boolean {
    return f.type === 'foothold' ? this.hasFoothold(f.node, f.level) : this.facts.has(factKey(f));
  }
}

interface Recorded {
  event: SimEvent;
  seq: number;
  premises: string[];
}

/**
 * Runs a scenario on a lab. Deterministic: the same lab and scenario always give the same result.
 *
 * The attacker's capabilities are saturated round by round (breadth first), so every fact is
 * first derived by one of its shortest derivations. The story replayed in the UI is then:
 * - the derivation tree of the target when it is reached,
 * - otherwise everything the attacker achieved plus the attempts that controls stopped.
 */
export function simulate(lab: Lab, scenarioId: string): SimResult {
  const scenario = lab.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) throw new Error(`Unknown scenario "${scenarioId}"`);
  const ctx = new LabContext(lab);
  ctx.node(scenario.entry.node);

  const entry: Fact = { type: 'foothold', node: scenario.entry.node, level: scenario.entry.level };
  const known = new Map<string, Fact>([[factKey(entry), entry]]);
  const derivedBy = new Map<string, Recorded>();
  const attempts = new Map<string, Recorded>();
  let seq = 0;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const state = new State(new Map(known));
    const fresh = new Map<string, Fact>();
    const freshState = new State(fresh);

    for (const technique of TECHNIQUES) {
      for (const cand of technique.candidates(ctx, state)) {
        const gains = cand.gains.filter((g) => !state.has(g) && !freshState.has(g));
        if (gains.length === 0) continue;
        if (cand.checks.some((c) => c.status === 'unmet')) continue;

        const because: Message[] = [];
        const couldBlock: Block[] = [];
        const stoppedBy: Block[] = [];
        for (const c of cand.checks) {
          if (c.status === 'ok') {
            because.push(c.evidence);
            couldBlock.push(...c.couldBlock);
          } else if (c.status === 'blocked') {
            stoppedBy.push(...c.blockedBy);
          }
        }
        const params: Record<string, string> = {};
        for (const [k, v] of Object.entries(cand.params)) params[k] = String(v);
        const event: SimEvent = {
          id: `e${seq}`,
          round,
          technique: technique.id,
          attack: technique.attack,
          from: cand.from,
          target: cand.target,
          result: stoppedBy.length > 0 ? 'blocked' : 'success',
          gained: gains,
          because,
          stoppedBy,
          couldBlock: dedupeBlocks(couldBlock),
          params,
        };

        if (event.result === 'blocked') {
          const key = `${technique.id}|${cand.target}|${gains.map(factKey).sort().join(',')}`;
          if (!attempts.has(key)) attempts.set(key, { event, seq: seq++, premises: cand.premises });
          continue;
        }
        const recorded: Recorded = { event, seq: seq++, premises: cand.premises };
        for (const g of gains) {
          fresh.set(factKey(g), g);
          derivedBy.set(factKey(g), recorded);
        }
      }
    }

    if (fresh.size === 0) break;
    for (const [k, f] of fresh) known.set(k, f);
  }

  const finalState = new State(known);
  // An attempt only matters if the attacker never got what it was after by another way.
  const relevantAttempts = [...attempts.values()].filter((a) => !a.event.gained.every((g) => finalState.has(g)));
  const successes = uniqueRecords([...derivedBy.values()]);

  const targetKey = scenario.target ? `data:${scenario.target}` : undefined;
  const reached = targetKey !== undefined && known.has(targetKey);

  let story: Recorded[];
  if (reached) {
    const proof = new Map<string, Recorded>();
    const proofFacts = new Set<string>([factKey(entry)]);
    const visit = (key: string) => {
      const rec = derivedBy.get(key);
      if (!rec) return;
      for (const g of rec.event.gained) proofFacts.add(factKey(g));
      if (proof.has(rec.event.id)) return;
      proof.set(rec.event.id, rec);
      rec.premises.forEach(visit);
    };
    visit(targetKey);
    const blockedOnPath = relevantAttempts.filter((a) => a.premises.every((p) => proofFacts.has(p)));
    story = [...proof.values(), ...blockedOnPath];
  } else {
    story = [...successes, ...relevantAttempts];
  }
  story.sort((a, b) => a.event.round - b.event.round || a.seq - b.seq);
  const events = story.map((r) => r.event);

  let outcome: Outcome;
  if (reached) outcome = 'target-reached';
  else if (successes.length === 0) outcome = 'stopped-at-entry';
  else if (scenario.target) outcome = 'contained';
  else outcome = 'explored';

  const compromised = finalState.footholds().filter((f) => !ctx.isInternet(f.node));
  const identities = finalState.credentials();
  const assets = lab.assets.filter((a) => finalState.hasData(a.id)).map((a) => a.id);
  const zones = [...new Set(compromised.map((f) => ctx.node(f.node).zone))];
  const containedAt = reached
    ? []
    : [...new Set(events.filter((e) => e.result === 'blocked' && !ctx.isInternet(e.from)).map((e) => e.from))];

  const exposed = new Set(
    lab.edges.filter((e) => ctx.nodes.has(e.source) && ctx.isInternet(e.source)).map((e) => `${e.target}:${e.port}`),
  );

  return {
    scenario: scenario.id,
    outcome,
    events,
    blastRadius: {
      nodes: compromised.map(({ node, level }) => ({ node, level })),
      identities,
      assets,
      zones,
    },
    containedAt,
    metrics: {
      steps: events.filter((e) => e.result === 'success').length,
      nodesCompromised: compromised.length,
      credentialsStolen: identities.length,
      assetsReached: assets.length,
      attemptsBlocked: events.filter((e) => e.result === 'blocked').length,
      exposedServices: exposed.size,
    },
  };
}

function uniqueRecords(records: Recorded[]): Recorded[] {
  const seen = new Set<string>();
  return records.filter((r) => (seen.has(r.event.id) ? false : (seen.add(r.event.id), true)));
}

function dedupeBlocks(blocks: Block[]): Block[] {
  const seen = new Set<string>();
  return blocks.filter((b) => (seen.has(b.control) ? false : (seen.add(b.control), true)));
}

/** The same lab with every control disabled: the "before" of a before/after comparison. */
export function withoutControls(lab: Lab): Lab {
  return { ...lab, controls: lab.controls.map((c) => ({ ...c, enabled: false })) };
}

/** The same lab with one control switched on or off. */
export function withControl(lab: Lab, controlId: string, enabled: boolean): Lab {
  return { ...lab, controls: lab.controls.map((c) => (c.id === controlId ? { ...c, enabled } : c)) };
}
