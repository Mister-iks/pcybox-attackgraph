/// <reference lib="webworker" />
import { simulate, withoutControls } from '@pcybox/attackgraph-engine';
import type { SimRequest, SimResponse } from './protocol.ts';

// The engine runs off the main thread so large labs never freeze the interface.
self.onmessage = (e: MessageEvent<SimRequest>) => {
  const { id, lab, scenario } = e.data;
  let response: SimResponse;
  try {
    response = { id, ok: true, result: simulate(lab, scenario), baseline: simulate(withoutControls(lab), scenario) };
  } catch (err) {
    response = { id, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  self.postMessage(response);
};
