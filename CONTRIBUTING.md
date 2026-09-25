# Contributing

Thank you for helping make attack paths easier to understand, everywhere. There are four main ways to contribute, and none requires being a developer.

## 1. Report a problem or suggest an idea

Open an issue with the matching template: bug, feature, new lab, translation. For security vulnerabilities in the app itself, **do not open a public issue**: see [SECURITY.md](SECURITY.md).

## 2. Review the technique catalog

The value of the lab depends on the model being right. If you work in offensive or defensive security, reviews of [docs/engine.md](docs/engine.md) and of `packages/engine/src/catalog.ts` are extremely valuable. Tell us when a technique, a precondition or a control effect teaches something wrong or oversimplified. Each technique must be reviewed by at least two practitioners before a release.

## 3. Write labs and missions

Labs live in `content/templates/` as `.attackgraph.json` files ([format](docs/lab-format.md)), under CC BY 4.0. A good lab:

- teaches one or two concepts, stated in its description;
- uses generic, neutral names (no brands, countries or currencies);
- has at least one scenario where a control changes the outcome, and makes clear what the control does *not* do;
- passes `pnpm test` (schema and engine validation).

## 4. Translate

All interface texts are in `packages/i18n/messages/<language>.json` ([ICU MessageFormat](https://formatjs.github.io/docs/core-concepts/icu-syntax/)); lab texts are inside the labs. To add a language, copy `en.json`, translate the values (never the keys or the `{placeholders}`), and register it in `apps/web/src/i18n/locales.ts`. The tests check that every key exists and every message is valid. A language is published when it is complete and has a reviewer.

## Development setup

```bash
pnpm install
pnpm dev        # app on http://localhost:5173
pnpm verify     # what the CI runs: text check, types, tests, build, bundle budget
pnpm e2e        # end-to-end tests
```

## Rules for code

- The engine stays pure and deterministic: no DOM, no randomness, no time.
- Every engine change comes with tests. A change in a golden story must be intended and explained in the pull request.
- No hard-coded text in the interface: add a message key in every language file.
- Accessibility is not optional: keyboard, screen reader, contrast, reduced motion, and never color alone.
- Keep the initial bundle under 250 kB gzip.
- Typography: no em dash or en dash anywhere in the repository (`pnpm check:text` enforces it). Use a colon, a comma, parentheses or a hyphen.
- Never add code that contacts, scans or attacks a real system, or step by step exploitation procedures.

## Commits and pull requests

- Small, focused pull requests, one topic each.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat(engine): ...`, `fix(web): ...`, `docs: ...`.
- Changes to the lab format or to the engine model start with an issue labeled `rfc` to discuss them first.

## License of contributions

By contributing, you agree that your code is licensed under Apache-2.0 and your content (labs, texts, documentation) under CC BY 4.0.
