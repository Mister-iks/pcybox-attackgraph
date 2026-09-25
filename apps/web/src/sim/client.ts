import { simulate, withoutControls, type Lab } from '@pcybox/attackgraph-engine';
import type { SimOutput, SimResponse } from './protocol.ts';

let worker: Worker | null | undefined;
let nextId = 0;
const pending = new Map<number, { resolve: (v: SimOutput) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<SimResponse>) => {
      const job = pending.get(e.data.id);
      if (!job) return;
      pending.delete(e.data.id);
      if (e.data.ok) job.resolve({ result: e.data.result, baseline: e.data.baseline });
      else job.reject(new Error(e.data.error));
    };
    worker.onerror = () => {
      for (const job of pending.values()) job.reject(new Error('Simulation worker failed'));
      pending.clear();
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

function simulateHere(lab: Lab, scenario: string): SimOutput {
  return { result: simulate(lab, scenario), baseline: simulate(withoutControls(lab), scenario) };
}

/** Simulates a scenario and the same scenario without any control, for the before/after view. */
export function runSimulation(lab: Lab, scenario: string): Promise<SimOutput> {
  const w = getWorker();
  // Environments without module workers still get a result, on the main thread.
  if (!w) return Promise.resolve().then(() => simulateHere(lab, scenario));
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, lab, scenario });
  });
}
