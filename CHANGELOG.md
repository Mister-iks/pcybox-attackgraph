# Changelog

All notable changes are documented here. The project follows [Semantic Versioning](https://semver.org/) once it reaches 1.0.

## [Unreleased]

### Added

- Controls `least-privilege` (revoke a right, which also removes the credential it leaves cached) and `credential-protection`.
- Templates: Small Office and Active Directory.
- Simulation engine: capabilities, 8 techniques mapped to MITRE ATT&CK, 4 controls with precise effects, breadth-first saturation, explanations for every step.
- Strict validator for untrusted labs and JSON Schema of the `.attackgraph.json` format (0.1.0).
- Web Application template with two scenarios.
- Web app: animated attack map, timeline with replay speeds, Why? panel with one-click what if, before/after comparison, text view.
- Sharing by link (lab in the URL fragment), export and import of lab files.
- English and French, light and dark themes, keyboard shortcuts, reduced motion.
- CI: text check, types, unit tests, build, 250 kB bundle budget, Playwright tests on desktop and mobile.
