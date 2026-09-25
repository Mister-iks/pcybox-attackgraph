# How the engine works

The engine (`packages/engine`) turns a lab into a story of attack steps. It is **deterministic** (the same lab always gives the same result), **explainable** (every step carries its reasons) and **independent of the interface** (pure TypeScript, no DOM; the web app runs it in a worker).

## Capabilities

The attacker's progress is a set of facts:

| Fact | Meaning |
|---|---|
| `foothold(node, level)` | The attacker runs code on the node, as `user` or `admin`. Admin implies user. |
| `credential(identity)` | The attacker holds a working secret of this identity. |
| `data(asset)` | The attacker can read this asset. |

A scenario gives the starting fact: `foothold(internet, admin)` for an external attacker, or a foothold on an internal node for an *assumed breach*.

## Techniques

A technique has **preconditions** and **effects**. Each is mapped to a MITRE ATT&CK tactic and technique, at a conceptual level only.

| Technique | ATT&CK | Preconditions | Effect |
|---|---|---|---|
| `exploit-public-service` | TA0001, T1190 | attacker on the Internet reaches a service; the service has a vulnerable component or an injection flaw | foothold at the service's `runsAs` level |
| `exploit-remote-service` | TA0008, T1210 | same, from an internal foothold | foothold |
| `privilege-escalation` | TA0004, T1068 | user foothold; out of date operating system | admin foothold |
| `credentials-in-files` | TA0006, T1552.001 | foothold at the required level; a configuration secret on the node | credential |
| `credential-dumping` | TA0006, T1003 | admin foothold; credentials cached in memory (the identity logs on to the node) | credential |
| `remote-login` | TA0008, T1021 | credential; the identity may log in to the node over SSH, RDP or SMB (right not revoked); the service is reachable; MFA does not apply or is off | foothold at the identity's level |
| `database-access` | TA0009, T1213 | credential with database privilege; database service reachable | data of the assets on that node |
| `local-data-access` | TA0009, T1005 | foothold at the level the asset requires | data |

## Reachability

`reach(from, to, port)` decides whether a connection can be opened:

1. same node: yes;
2. a declared flow `from → to:port` exists: yes;
3. one end is on the Internet: no (the perimeter only lets declared flows in);
4. same zone: yes (no filtering inside a zone);
5. different internal zones: **yes, unless segmentation is on** (a flat network).

Rule 5 is what makes segmentation meaningful: a declared flow is what the architecture *needs*, everything else between zones is what a flat network *allows*.

## Controls

A control never has a global "blocks the attack" effect. It breaks precise preconditions:

| Control | Breaks | Does not break |
|---|---|---|
| `segmentation` | reachability between zones outside declared flows | declared flows, traffic inside a zone |
| `secrets-vault` | configuration secrets on the listed nodes | credentials cached in memory |
| `mfa` | interactive logins (SSH, RDP, VPN, web) of the listed identities | service logins such as databases |
| `patch` | vulnerable components and out of date systems on the listed nodes | injection flaws in the application code |
| `least-privilege` | the listed rights (identity on node): no login there, and no credential of that identity cached there | the other rights of the identity |
| `credential-protection` | extraction of credentials cached in memory on the listed nodes | credentials stored in configuration files |

Each precondition check returns one of three results:

- **ok**: it holds; the check also lists the *disabled* controls that would break it (shown as "could have been stopped by");
- **blocked**: it would hold, but an *active* control breaks it (shown as a blocked step, with the reason);
- **unmet**: it does not hold at all (the step is not even attempted, nothing is shown).

## Algorithm

1. **Saturation.** Starting from the entry fact, every round applies all techniques to the facts known at the start of the round. New facts are added at the end of the round. This repeats until no new fact appears. Rounds are breadth first, so every fact is first derived by one of its shortest derivations.
2. **Blocked attempts.** A step whose only failing preconditions are *blocked* is recorded as an attempt. Attempts are kept only if the attacker never obtained the same gain another way.
3. **Story.**
   - If the target is reached: the derivation tree of the target (the shortest proof), plus attempts blocked on that path.
   - Otherwise: everything the attacker achieved, plus every relevant blocked attempt.
4. **Result.** Outcome (`target-reached`, `contained`, `stopped-at-entry`, `explored`), blast radius (compromised nodes, stolen identities, reached assets, zones), where the attack was contained, and factual metrics.

## Guarantees tested

- Golden stories for each control combination of the template.
- **Monotonicity**: for every combination of controls, enabling one more control never gives the attacker a new capability.
- Determinism, and translation coverage of every message the engine can emit.

## Limits of the model

The model is a teaching tool, not a risk assessment. It does not model detection timing, probabilities of success, exploit reliability, or real vulnerabilities (CVE). A step either can happen in the modeled lab or it cannot. When the lab is wrong or incomplete, so is the result.
