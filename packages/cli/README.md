# @pcybox/attackgraph-cli

The command line tool of [PCYBOX AttackGraph](https://github.com/Mister-iks/pcybox-attackgraph): validate `.attackgraph.json` labs, simulate attack scenarios and compare controls, in English or French. Useful in CI, to check lab files, or to generate exercises.

**Simulation only**: it never scans, contacts or attacks a real system.

```bash
npx @pcybox/attackgraph-cli validate labs/
npx @pcybox/attackgraph-cli list lab.attackgraph.json
npx @pcybox/attackgraph-cli simulate lab.attackgraph.json --scenario from-internet --enable segmentation
npx @pcybox/attackgraph-cli compare lab.attackgraph.json --enable segmentation --lang fr
npx @pcybox/attackgraph-cli simulate lab.attackgraph.json --format markdown   # or json
```

Or install it once: `npm install -g @pcybox/attackgraph-cli`, then run `attackgraph`.

Requires Node.js 22 or later. Ready-made labs are in the [templates folder](https://github.com/Mister-iks/pcybox-attackgraph/tree/main/content/templates), and you can build your own in the [web app](https://mister-iks.github.io/pcybox-attackgraph/).

License: Apache-2.0.
