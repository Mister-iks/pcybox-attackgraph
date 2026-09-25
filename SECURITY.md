# Security policy

## Scope

This policy covers vulnerabilities in Cyber Attack Surface Lab itself: the web application, the engine, the lab format and the build and release pipeline. Examples: a crafted lab file or share link that runs script in the page, breaks out of validation, or freezes the browser; a supply chain issue in our dependencies or workflows.

The attack scenarios *inside* the labs are fictional and are not vulnerabilities.

## Reporting a vulnerability

Please report privately through GitHub: **Security** tab of the repository, then **Report a vulnerability**. Do not open a public issue.

Include what you can: affected version or commit, steps to reproduce, a proof of concept lab or link, and the impact you expect.

We aim to acknowledge reports within 5 working days and to agree on a disclosure date with you. We credit reporters who wish to be named.

## Supported versions

Until 1.0, only the latest commit on `main` is supported.

## Design principles

- Imported labs and share links are untrusted input: strict validation, size limits, no HTML rendering.
- A strict Content-Security-Policy in production builds: no inline or third party scripts, no `eval`.
- No data leaves the browser: share links keep the lab in the URL fragment, which is never sent to a server.
- Dependencies are kept minimal; GitHub Actions are pinned by commit hash.
