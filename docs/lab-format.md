# Lab format (`.cslab.json`)

A lab is a JSON file described by [`packages/schema/lab.schema.json`](../packages/schema/lab.schema.json). Add `"$schema"` at the top of a lab to get completion and validation in most editors. The reference example is [`content/templates/web-application.cslab.json`](../content/templates/web-application.cslab.json).

Format version: `0.1.0`. Until 1.0, minor versions may change the format; the app will migrate older labs when that happens.

## Top level

| Field | Content |
|---|---|
| `formatVersion` | `"0.1.0"` |
| `id` | Stable identifier (letters, digits, `-`, `_`, `.`) |
| `meta` | `title`, `description`, `authors`, `license`, `difficulty`, `tags` |
| `zones` | Security zones: `internet`, `dmz`, `internal`, `management`... |
| `nodes` | Machines and services |
| `edges` | Declared network flows |
| `identities` | Accounts and what they may log in to |
| `assets` | What the attacker is after |
| `controls` | Security controls that can be switched on or off |
| `scenarios` | Entry point and target of an attack |

## Localized texts

Every text shown to people is an object keyed by language tag:

```json
{ "en": "Customer Database", "fr": "Base clients" }
```

The app falls back to English, then to any available language. Identifiers never need translation.

## Nodes

```json
{
  "id": "web-01",
  "type": "web-server",
  "label": { "en": "Web Server" },
  "zone": "dmz",
  "services": [
    { "id": "https", "kind": "web", "port": 443, "protocol": "tcp", "auth": "none", "runsAs": "user", "weaknesses": ["vulnerable-component"] }
  ],
  "weaknesses": ["unpatched-os"],
  "secrets": [{ "identity": "svc-db-app", "kind": "config", "requires": "user" }],
  "position": { "x": 280, "y": 150 }
}
```

- `services[].runsAs`: the level an attacker gets by exploiting the service.
- `weaknesses` (v0.1): `vulnerable-component`, `injection` on services; `unpatched-os` on nodes.
- `secrets`: credentials readable on the node. `kind` is `config` (a file) or `cached-credential` (in memory); `requires` is the level needed to read it.

## Edges

An edge is a **declared, intended flow**, not a cable: `source` opens connections to `target:port`. Between internal zones, anything not declared is still reachable unless a `segmentation` control is on.

## Identities

```json
{ "id": "adm-ops", "type": "admin", "label": { "en": "Operations administrator" },
  "privileges": [{ "node": "db-01", "level": "admin", "via": ["ssh"] }] }
```

`via` lists the service kinds the identity logs in through: `ssh`, `rdp`, `smb` give a foothold; `database` gives access to the data of the node.

## Assets

```json
{ "id": "customer-data", "kind": "customer-data", "label": { "en": "Customer data" },
  "node": "db-01", "requires": "admin", "cia": { "c": 4, "i": 3, "a": 3 } }
```

`requires` is the level needed to read the asset locally on its node.

## Controls

| `type` | Extra field | Effect |
|---|---|---|
| `segmentation` | none | only declared flows cross zones |
| `secrets-vault` | `nodes` | configuration secrets on these nodes are gone |
| `mfa` | `identities` | interactive logins of these identities need a second factor |
| `patch` | `nodes` | vulnerable components and out of date systems on these nodes are fixed |

## Scenarios

```json
{ "id": "from-internet", "label": { "en": "Attack from the Internet" },
  "entry": { "node": "internet", "level": "admin" }, "target": "customer-data" }
```

## Validation and limits

Imported labs are untrusted. The app validates them strictly (types, references between objects, unique identifiers) and enforces limits: 1 MB per file, 1000 nodes, 5000 edges, 500 characters per text.
