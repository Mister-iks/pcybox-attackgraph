import {
  LEVEL_RANK,
  UNMET,
  blocked,
  msg,
  ok,
  partition,
  reach,
  type Check,
  type LabContext,
} from './context.ts';
import type { AttackRef, Block, Control, Fact, LabNode, Level, Service, ServiceKind } from './types.ts';

/** What the attacker holds at the start of a round. */
export interface StateView {
  hasFoothold(node: string, level: Level): boolean;
  /**
   * Highest level held on each compromised node. `key` is the fact proving the lowest level held,
   * which is all a technique needs when it only acts from the node.
   */
  footholds(): { node: string; level: Level; key: string }[];
  /** Fact key proving at least `level` on the node. */
  footholdKey(node: string, level: Level): string;
  hasCredential(identity: string): boolean;
  credentials(): string[];
  hasData(asset: string): boolean;
}

/** One concrete way to apply a technique. */
export interface Candidate {
  from: string;
  target: string;
  premises: string[];
  gains: Fact[];
  checks: Check[];
  params: Record<string, string | number>;
}

export interface Technique {
  id: string;
  attack: AttackRef;
  candidates(ctx: LabContext, state: StateView): Iterable<Candidate>;
}

export function factKey(f: Fact): string {
  switch (f.type) {
    case 'foothold':
      return `foothold:${f.node}:${f.level}`;
    case 'credential':
      return `credential:${f.identity}`;
    case 'data':
      return `data:${f.asset}`;
  }
}

const EXPLOITABLE = ['vulnerable-component', 'injection'] as const;
/** Weaknesses removed by the patch control. Injection is a code flaw: patching the platform does not fix it. */
const PATCHABLE = new Set(['vulnerable-component', 'unpatched-os']);
const REMOTE_LOGIN_KINDS: ServiceKind[] = ['ssh', 'rdp', 'smb'];
/** Interactive logins where MFA applies. Service logins (databases, APIs) do not prompt for a second factor. */
const MFA_KINDS = new Set<ServiceKind>(['ssh', 'rdp', 'vpn', 'web']);

function patchesFor(ctx: LabContext, node: string) {
  return partition(ctx.controlsOf('patch').filter((c) => c.nodes.includes(node)));
}

/** Is there an exploitable weakness on this service once active patches are applied? */
function exploitCheck(ctx: LabContext, node: LabNode, service: Service): Check {
  const found = service.weaknesses.filter((w) => (EXPLOITABLE as readonly string[]).includes(w));
  if (found.length === 0) return UNMET;
  const patches = patchesFor(ctx, node.id);
  const remaining = found.filter((w) => !(PATCHABLE.has(w) && patches.active.length > 0));
  const block = (c: Control, weakness: string): Block => ({
    control: c.id,
    message: msg('block.patch', { node: node.id, service: service.id, weakness }),
  });
  const first = remaining[0];
  if (first === undefined) return blocked(patches.active.map((c) => block(c, found[0]!)));
  const couldBlock = remaining.every((w) => PATCHABLE.has(w)) ? patches.inactive.map((c) => block(c, first)) : [];
  return ok(msg('evidence.weakness', { node: node.id, service: service.id, port: service.port, weakness: first }), couldBlock);
}

function exploitTechnique(id: string, attack: AttackRef, fromInternet: boolean): Technique {
  return {
    id,
    attack,
    *candidates(ctx, state) {
      for (const src of state.footholds()) {
        if (ctx.isInternet(src.node) !== fromInternet) continue;
        for (const node of ctx.lab.nodes) {
          if (node.id === src.node || node.type === 'internet') continue;
          for (const service of node.services) {
            if (state.hasFoothold(node.id, service.runsAs)) continue;
            yield {
              from: src.node,
              target: node.id,
              premises: [src.key],
              gains: [{ type: 'foothold', node: node.id, level: service.runsAs }],
              checks: [reach(ctx, src.node, node.id, service.port), exploitCheck(ctx, node, service)],
              params: { from: src.node, node: node.id, service: service.id, port: service.port, level: service.runsAs },
            };
          }
        }
      }
    },
  };
}

const exploitPublicService = exploitTechnique(
  'exploit-public-service',
  {
    tactic: 'TA0001',
    tacticName: 'Initial Access',
    technique: 'T1190',
    techniqueName: 'Exploit Public-Facing Application',
  },
  true,
);

const exploitRemoteService = exploitTechnique(
  'exploit-remote-service',
  {
    tactic: 'TA0008',
    tacticName: 'Lateral Movement',
    technique: 'T1210',
    techniqueName: 'Exploitation of Remote Services',
  },
  false,
);

const privilegeEscalation: Technique = {
  id: 'privilege-escalation',
  attack: {
    tactic: 'TA0004',
    tacticName: 'Privilege Escalation',
    technique: 'T1068',
    techniqueName: 'Exploitation for Privilege Escalation',
  },
  *candidates(ctx, state) {
    for (const f of state.footholds()) {
      if (f.level !== 'user' || ctx.isInternet(f.node)) continue;
      const node = ctx.node(f.node);
      if (!node.weaknesses.includes('unpatched-os')) continue;
      const patches = patchesFor(ctx, node.id);
      const block = (c: Control): Block => ({
        control: c.id,
        message: msg('block.patch', { node: node.id, weakness: 'unpatched-os' }),
      });
      const check =
        patches.active.length > 0
          ? blocked(patches.active.map(block))
          : ok(msg('evidence.unpatchedOs', { node: node.id }), patches.inactive.map(block));
      yield {
        from: node.id,
        target: node.id,
        premises: [f.key],
        gains: [{ type: 'foothold', node: node.id, level: 'admin' }],
        checks: [ok(msg('evidence.foothold', { node: node.id, level: 'user' })), check],
        params: { node: node.id },
      };
    }
  },
};

function secretTechnique(id: string, kind: 'config' | 'cached-credential', attack: AttackRef): Technique {
  return {
    id,
    attack,
    *candidates(ctx, state) {
      for (const f of state.footholds()) {
        if (ctx.isInternet(f.node)) continue;
        const node = ctx.node(f.node);
        for (const secret of node.secrets) {
          if (secret.kind !== kind || state.hasCredential(secret.identity)) continue;
          if (LEVEL_RANK[f.level] < LEVEL_RANK[secret.requires]) continue;
          const checks: Check[] = [
            ok(msg('evidence.foothold', { node: node.id, level: f.level })),
            ok(msg('evidence.secret', { node: node.id, identity: secret.identity, kind })),
          ];
          if (kind === 'config') {
            const vaults = partition(ctx.controlsOf('secrets-vault').filter((c) => c.nodes.includes(node.id)));
            const block = (c: Control): Block => ({
              control: c.id,
              message: msg('block.vault', { node: node.id, identity: secret.identity }),
            });
            checks[1] =
              vaults.active.length > 0
                ? blocked(vaults.active.map(block))
                : ok(msg('evidence.secret', { node: node.id, identity: secret.identity, kind }), vaults.inactive.map(block));
          }
          yield {
            from: node.id,
            target: node.id,
            premises: [state.footholdKey(node.id, secret.requires)],
            gains: [{ type: 'credential', identity: secret.identity }],
            checks,
            params: { node: node.id, identity: secret.identity },
          };
        }
      }
    },
  };
}

const credentialsInFiles = secretTechnique('credentials-in-files', 'config', {
  tactic: 'TA0006',
  tacticName: 'Credential Access',
  technique: 'T1552.001',
  techniqueName: 'Unsecured Credentials: Credentials In Files',
});

const credentialDumping = secretTechnique('credential-dumping', 'cached-credential', {
  tactic: 'TA0006',
  tacticName: 'Credential Access',
  technique: 'T1003',
  techniqueName: 'OS Credential Dumping',
});

const remoteLogin: Technique = {
  id: 'remote-login',
  attack: {
    tactic: 'TA0008',
    tacticName: 'Lateral Movement',
    technique: 'T1021',
    techniqueName: 'Remote Services',
  },
  *candidates(ctx, state) {
    for (const identityId of state.credentials()) {
      const identity = ctx.identities.get(identityId);
      if (!identity) continue;
      for (const priv of identity.privileges) {
        if (state.hasFoothold(priv.node, priv.level)) continue;
        const node = ctx.node(priv.node);
        for (const service of node.services) {
          if (!REMOTE_LOGIN_KINDS.includes(service.kind) || !priv.via.includes(service.kind)) continue;
          const mfa = mfaCheck(ctx, identityId, node.id, service.kind);
          for (const src of state.footholds()) {
            if (src.node === node.id) continue;
            yield {
              from: src.node,
              target: node.id,
              premises: [`credential:${identityId}`, src.key],
              gains: [{ type: 'foothold', node: node.id, level: priv.level }],
              checks: [
                ok(msg('evidence.privilege', { identity: identityId, node: node.id, level: priv.level, service: service.id })),
                reach(ctx, src.node, node.id, service.port),
                mfa,
              ],
              params: { from: src.node, node: node.id, identity: identityId, service: service.id, port: service.port, level: priv.level },
            };
          }
        }
      }
    }
  },
};

function mfaCheck(ctx: LabContext, identity: string, node: string, kind: ServiceKind): Check {
  if (!MFA_KINDS.has(kind)) return ok(msg('evidence.mfaNotApplicable', { identity, kind }));
  const { active, inactive } = partition(ctx.controlsOf('mfa').filter((c) => c.identities.includes(identity)));
  const block = (c: Control): Block => ({ control: c.id, message: msg('block.mfa', { identity, node }) });
  if (active.length > 0) return blocked(active.map(block));
  return ok(msg('evidence.noMfa', { identity }), inactive.map(block));
}

const databaseAccess: Technique = {
  id: 'database-access',
  attack: {
    tactic: 'TA0009',
    tacticName: 'Collection',
    technique: 'T1213',
    techniqueName: 'Data from Information Repositories',
  },
  *candidates(ctx, state) {
    for (const identityId of state.credentials()) {
      const identity = ctx.identities.get(identityId);
      if (!identity) continue;
      for (const priv of identity.privileges) {
        if (!priv.via.includes('database')) continue;
        const assets = (ctx.assetsByNode.get(priv.node) ?? []).filter((a) => !state.hasData(a.id));
        if (assets.length === 0) continue;
        const node = ctx.node(priv.node);
        for (const service of node.services) {
          if (service.kind !== 'database') continue;
          for (const src of state.footholds()) {
            yield {
              from: src.node,
              target: node.id,
              premises: [`credential:${identityId}`, src.key],
              gains: assets.map((a) => ({ type: 'data', asset: a.id }) as const),
              checks: [
                ok(msg('evidence.privilege', { identity: identityId, node: node.id, level: priv.level, service: service.id })),
                reach(ctx, src.node, node.id, service.port),
                mfaCheck(ctx, identityId, node.id, service.kind),
              ],
              params: {
                from: src.node,
                node: node.id,
                identity: identityId,
                service: service.id,
                port: service.port,
                asset: assets.map((a) => a.id).join(','),
              },
            };
          }
        }
      }
    }
  },
};

const localDataAccess: Technique = {
  id: 'local-data-access',
  attack: {
    tactic: 'TA0009',
    tacticName: 'Collection',
    technique: 'T1005',
    techniqueName: 'Data from Local System',
  },
  *candidates(ctx, state) {
    for (const f of state.footholds()) {
      for (const asset of ctx.assetsByNode.get(f.node) ?? []) {
        if (state.hasData(asset.id) || LEVEL_RANK[f.level] < LEVEL_RANK[asset.requires]) continue;
        yield {
          from: f.node,
          target: f.node,
          premises: [state.footholdKey(f.node, asset.requires)],
          gains: [{ type: 'data', asset: asset.id }],
          checks: [ok(msg('evidence.foothold', { node: f.node, level: f.level }))],
          params: { node: f.node, asset: asset.id, level: f.level },
        };
      }
    }
  },
};

/** Order matters only for tie breaking inside a round: first success wins. */
export const TECHNIQUES: readonly Technique[] = [
  exploitPublicService,
  exploitRemoteService,
  privilegeEscalation,
  credentialsInFiles,
  credentialDumping,
  remoteLogin,
  databaseAccess,
  localDataAccess,
];

/** Every message key the engine can emit, for translation coverage tests. */
export const MESSAGE_KEYS = [
  ...TECHNIQUES.map((t) => `technique.${t.id}.success`),
  ...TECHNIQUES.map((t) => `technique.${t.id}.blocked`),
  'evidence.local',
  'evidence.flow',
  'evidence.sameZone',
  'evidence.flatNetwork',
  'evidence.weakness',
  'evidence.unpatchedOs',
  'evidence.foothold',
  'evidence.secret',
  'evidence.privilege',
  'evidence.noMfa',
  'evidence.mfaNotApplicable',
  'block.segmentation',
  'block.patch',
  'block.vault',
  'block.mfa',
] as const;
