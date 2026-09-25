# Cyber Attack Surface Lab

> Build. Attack. Defend. Understand.

An open source lab, running entirely in your browser, to **build a simulated infrastructure, watch an attack move through it, and check whether your defense really works**.

> **Status: early development (v0.1 in progress).** The simulation engine is working and tested; the web interface is being built.

## Why

Attack surface, lateral movement, segmentation, blast radius, defense in depth: these ideas are hard to grasp from static diagrams. Cyber Attack Surface Lab makes them visible and explainable:

- every step of the attack comes with **why it worked**,
- every control says **exactly which precondition it breaks**,
- you change one thing and **see the effect**.

Simulation only: no real system is ever scanned or attacked.

## Repository layout

```text
apps/web/           web application (in progress)
packages/engine/    deterministic, explainable simulation engine (TypeScript, no DOM)
packages/schema/    JSON Schema of the .cslab.json lab format
content/templates/  ready-to-use labs (CC BY 4.0)
docs/               product specification
```

## Development

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm test        # engine and schema tests
pnpm typecheck
```

## License

- Code: [Apache License 2.0](LICENSE)
- Educational content (`content/`, `docs/`): [CC BY 4.0](LICENSE-CONTENT)

MITRE ATT&CK® is a registered trademark of The MITRE Corporation.
