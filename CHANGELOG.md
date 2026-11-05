# Changelog

All notable changes are documented here. The project follows [Semantic Versioning](https://semver.org/) once it reaches 1.0.

## [Unreleased]

## [0.2.0] - 2026-11-05

First versioned release. The live demo has been online since v0.1; from now on, every release is tagged and its packages are published on npm.

### Added

- Packages on npm: `@pcybox/attackgraph-engine`, `@pcybox/attackgraph-cli` (run it with `npx @pcybox/attackgraph-cli`), `@pcybox/attackgraph-i18n` and `@pcybox/attackgraph-schema`.
- Controls `least-privilege` (revoke a right, which also removes the credential it leaves cached) and `credential-protection`.
- Templates: Small Office and Active Directory.
- Lab editor: palette with drag and drop, connections between elements, forms for services, weaknesses, credentials, identities, assets, controls and scenarios, live problem detection, undo and redo, duplicate, arrange by zone, autosave in the browser.
- Template picker and new empty lab.
- Command line tool: `attackgraph validate`, `list`, `simulate` (text, Markdown, JSON) and `compare`, in English and French.
- Simulation engine: capabilities, 8 techniques mapped to MITRE ATT&CK, 4 controls with precise effects, breadth-first saturation, explanations for every step.
- Strict validator for untrusted labs and JSON Schema of the `.attackgraph.json` format (0.1.0).
- Web Application template with two scenarios.
- Web app: animated attack map, timeline with replay speeds, Why? panel with one-click what if, before/after comparison, text view.
- Sharing by link (lab in the URL fragment), export and import of lab files.
- English and French, light and dark themes, keyboard shortcuts, reduced motion.
- CI: text check, types, unit tests, build, 250 kB bundle budget, Playwright tests on desktop and mobile.

[Unreleased]: https://github.com/Mister-iks/pcybox-attackgraph/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Mister-iks/pcybox-attackgraph/releases/tag/v0.2.0
