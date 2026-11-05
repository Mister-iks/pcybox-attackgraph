# @pcybox/attackgraph-engine

The simulation engine of [PCYBOX AttackGraph](https://github.com/Mister-iks/pcybox-attackgraph): a deterministic, explainable attack path simulator. Pure TypeScript, no DOM, no dependencies. Runs in Node.js, in a browser or in a web worker.

**Simulation only**: it never scans, contacts or attacks a real system.

```bash
npm install @pcybox/attackgraph-engine
```

```ts
import { readFileSync } from 'node:fs';
import { simulate, validateLab, withControl } from '@pcybox/attackgraph-engine';

const raw: unknown = JSON.parse(readFileSync('lab.attackgraph.json', 'utf8'));
const check = validateLab(raw); // labs are untrusted input: always validate first
if (!check.ok) throw new Error(check.errors.join('\n'));

const lab = check.lab;
const before = simulate(lab, 'from-internet');
const after = simulate(withControl(lab, 'segmentation', true), 'from-internet');
console.log(before.outcome, '->', after.outcome); // target-reached -> contained
```

Every event of the result carries the technique (mapped to MITRE ATT&CK), the preconditions that held, the control that blocked it and the controls that could have blocked it.

- [How the engine works](https://github.com/Mister-iks/pcybox-attackgraph/blob/main/docs/engine.md)
- [Lab format](https://github.com/Mister-iks/pcybox-attackgraph/blob/main/docs/lab-format.md)
- [Live demo](https://mister-iks.github.io/pcybox-attackgraph/)

License: Apache-2.0.
