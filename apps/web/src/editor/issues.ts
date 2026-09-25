import { validateLab, type Lab, type Localized } from '@pcybox/attackgraph-engine';

export type IssueTarget =
  | { kind: 'node' | 'edge' | 'identity' | 'asset' | 'control' | 'scenario' | 'zone'; id: string }
  | { kind: 'lab' };

export interface Issue {
  /** Errors prevent running the attack; warnings point at something probably unintended. */
  severity: 'error' | 'warning';
  key: string;
  params: Record<string, string>;
  target: IssueTarget;
}

const isBlank = (text: Localized) => Object.values(text).every((v) => v.trim() === '');

/** Problems of a lab being edited, in terms a learner can act on. */
export function findIssues(lab: Lab): Issue[] {
  const issues: Issue[] = [];
  const add = (severity: Issue['severity'], key: string, target: IssueTarget, params: Record<string, string> = {}) =>
    issues.push({ severity, key, params, target });

  const structural = validateLab(lab);
  if (!structural.ok) {
    for (const detail of structural.errors) add('error', 'issue.structure', { kind: 'lab' }, { detail });
    return issues;
  }

  if (lab.scenarios.length === 0) add('error', 'issue.noScenario', { kind: 'lab' });
  if (isBlank(lab.meta.title)) add('warning', 'issue.noTitle', { kind: 'lab' });

  const named: [IssueTarget['kind'], { id: string; label: Localized }[]][] = [
    ['zone', lab.zones],
    ['node', lab.nodes],
    ['identity', lab.identities],
    ['asset', lab.assets],
    ['control', lab.controls],
    ['scenario', lab.scenarios],
  ];
  for (const [kind, items] of named) {
    for (const item of items) if (isBlank(item.label)) add('warning', 'issue.noName', { kind, id: item.id } as IssueTarget, { id: item.id });
  }

  for (const node of lab.nodes) {
    const ports = node.services.map((s) => `${s.port}/${s.protocol}`);
    const dup = ports.find((p, i) => ports.indexOf(p) !== i);
    if (dup) add('warning', 'issue.duplicatePort', { kind: 'node', id: node.id }, { node: node.id, port: dup });
    const connected = lab.edges.some((e) => e.source === node.id || e.target === node.id);
    const alone = lab.nodes.filter((n) => n.zone === node.zone).length === 1;
    if (!connected && alone && node.type !== 'internet') add('warning', 'issue.isolated', { kind: 'node', id: node.id }, { node: node.id });
    for (const secret of node.secrets) {
      const identity = lab.identities.find((i) => i.id === secret.identity);
      if (secret.kind === 'cached-credential' && identity && !identity.privileges.some((p) => p.node === node.id)) {
        add('warning', 'issue.cachedWithoutLogin', { kind: 'node', id: node.id }, { node: node.id, identity: identity.id });
      }
    }
  }

  for (const edge of lab.edges) {
    const target = lab.nodes.find((n) => n.id === edge.target);
    if (target && !target.services.some((s) => s.port === edge.port && s.protocol === edge.protocol)) {
      add('warning', 'issue.flowWithoutService', { kind: 'edge', id: edge.id }, { from: edge.source, to: edge.target, port: String(edge.port) });
    }
  }

  for (const identity of lab.identities) {
    for (const p of identity.privileges) {
      const node = lab.nodes.find((n) => n.id === p.node);
      if (node && !node.services.some((s) => p.via.includes(s.kind))) {
        add('warning', 'issue.rightWithoutService', { kind: 'identity', id: identity.id }, { identity: identity.id, node: node.id });
      }
    }
  }

  for (const c of lab.controls) {
    const empty =
      ((c.type === 'patch' || c.type === 'secrets-vault' || c.type === 'credential-protection') && c.nodes.length === 0) ||
      (c.type === 'mfa' && c.identities.length === 0) ||
      (c.type === 'least-privilege' && c.revoke.length === 0);
    if (empty) add('warning', 'issue.controlWithoutTarget', { kind: 'control', id: c.id }, { control: c.id });
  }

  for (const s of lab.scenarios) {
    if (!s.target) add('warning', 'issue.scenarioWithoutTarget', { kind: 'scenario', id: s.id }, { scenario: s.id });
  }

  return issues;
}
