/**
 * Lab format (.attackgraph.json) and simulation types.
 * The JSON Schema in packages/schema/lab.schema.json describes the same shape.
 */

export const FORMAT_VERSION = '0.1.0';

export type Level = 'user' | 'admin';

/** Text keyed by BCP 47 language tag, for example { "en": "Web Server", "fr": "Serveur web" }. */
export type Localized = Record<string, string>;

export const ZONE_TYPES = [
  'internet',
  'dmz',
  'internal',
  'restricted',
  'management',
  'production',
  'development',
  'cloud',
  'third-party',
  'ot',
] as const;
export type ZoneType = (typeof ZONE_TYPES)[number];

export const NODE_TYPES = [
  'internet',
  'router',
  'firewall',
  'workstation',
  'laptop',
  'server',
  'web-server',
  'api-server',
  'database',
  'file-share',
  'cloud-service',
  'container',
  'k8s-cluster',
  'iot-device',
  'plc',
  'domain-controller',
  'identity-provider',
  'vpn-gateway',
  'jump-host',
  'backup-server',
  'saas-app',
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const SERVICE_KINDS = ['web', 'api', 'ssh', 'rdp', 'database', 'smb', 'vpn'] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

/** Weaknesses supported by the v0.1 catalog. The list grows with the technique catalog. */
export const WEAKNESSES = ['vulnerable-component', 'injection', 'unpatched-os'] as const;
export type Weakness = (typeof WEAKNESSES)[number];

export const SECRET_KINDS = ['config', 'cached-credential'] as const;
export type SecretKind = (typeof SECRET_KINDS)[number];

export const IDENTITY_TYPES = [
  'user',
  'developer',
  'service-account',
  'admin',
  'domain-admin',
  'cloud-admin',
] as const;
export type IdentityType = (typeof IDENTITY_TYPES)[number];

export const ASSET_KINDS = [
  'customer-data',
  'payment',
  'patient-records',
  'source-code',
  'domain-control',
  'backups',
  'industrial-process',
] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const CONTROL_TYPES = ['segmentation', 'secrets-vault', 'mfa', 'patch'] as const;
export type ControlType = (typeof CONTROL_TYPES)[number];

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface Zone {
  id: string;
  type: ZoneType;
  label: Localized;
}

export interface Service {
  id: string;
  kind: ServiceKind;
  port: number;
  protocol: 'tcp' | 'udp';
  auth: 'none' | 'password' | 'key' | 'token';
  /** Privilege level obtained by exploiting this service. */
  runsAs: Level;
  weaknesses: Weakness[];
}

/** A secret readable on a node, which grants the credential of an identity. */
export interface StoredSecret {
  identity: string;
  kind: SecretKind;
  /** Level needed on the node to read the secret. */
  requires: Level;
}

export interface LabNode {
  id: string;
  type: NodeType;
  label: Localized;
  zone: string;
  services: Service[];
  /** Node level weaknesses, such as an unpatched operating system. */
  weaknesses: Weakness[];
  secrets: StoredSecret[];
  position: { x: number; y: number };
}

/** A declared, intended network flow. It is directed: source opens connections to target:port. */
export interface Edge {
  id: string;
  source: string;
  target: string;
  port: number;
  protocol: 'tcp' | 'udp';
}

export interface Privilege {
  node: string;
  level: Level;
  /** Service kinds through which the identity can log in. */
  via: ServiceKind[];
}

export interface Identity {
  id: string;
  type: IdentityType;
  label: Localized;
  privileges: Privilege[];
}

export interface Asset {
  id: string;
  kind: AssetKind;
  label: Localized;
  node: string;
  /** Level needed on the hosting node to read the asset locally. */
  requires: Level;
  cia: { c: number; i: number; a: number };
}

interface ControlBase {
  id: string;
  label: Localized;
  description?: Localized;
  enabled: boolean;
}

export type Control =
  | (ControlBase & { type: 'segmentation' })
  | (ControlBase & { type: 'secrets-vault'; nodes: string[] })
  | (ControlBase & { type: 'mfa'; identities: string[] })
  | (ControlBase & { type: 'patch'; nodes: string[] });

export interface Scenario {
  id: string;
  label: Localized;
  description?: Localized;
  entry: { node: string; level: Level };
  /** Asset the attacker is after. Without a target the simulation explores everything reachable. */
  target?: string;
}

export interface LabMeta {
  title: Localized;
  description?: Localized;
  authors: string[];
  license: string;
  difficulty: Difficulty;
  tags: string[];
}

export interface Lab {
  formatVersion: string;
  id: string;
  meta: LabMeta;
  zones: Zone[];
  nodes: LabNode[];
  edges: Edge[];
  identities: Identity[];
  assets: Asset[];
  controls: Control[];
  scenarios: Scenario[];
}

/* ------------------------------------------------------------------ */
/* Simulation                                                          */
/* ------------------------------------------------------------------ */

/** A capability held by the attacker. */
export type Fact =
  | { type: 'foothold'; node: string; level: Level }
  | { type: 'credential'; identity: string }
  | { type: 'data'; asset: string };

/**
 * A translatable sentence. Params hold ids (node, identity, zone...) that the UI
 * resolves to localized labels, plus plain values such as ports.
 */
export interface Message {
  key: string;
  params: Record<string, string>;
}

/** A control that stops (or could stop) a step, and why. */
export interface Block {
  control: string;
  message: Message;
}

export interface AttackRef {
  tactic: string;
  tacticName: string;
  technique: string;
  techniqueName: string;
}

export interface SimEvent {
  id: string;
  /** Breadth-first round in which the step became possible. */
  round: number;
  technique: string;
  attack: AttackRef;
  /** Node the attacker acts from. Equal to target for local steps. */
  from: string;
  /** Node the step acts on. */
  target: string;
  result: 'success' | 'blocked';
  gained: Fact[];
  /** Preconditions that held. */
  because: Message[];
  /** Active controls that stopped the step. */
  stoppedBy: Block[];
  /** Disabled controls of the lab that would have stopped the step. */
  couldBlock: Block[];
  params: Record<string, string>;
}

export type Outcome = 'target-reached' | 'contained' | 'stopped-at-entry' | 'explored';

export interface SimMetrics {
  steps: number;
  nodesCompromised: number;
  credentialsStolen: number;
  assetsReached: number;
  attemptsBlocked: number;
  exposedServices: number;
}

export interface SimResult {
  scenario: string;
  outcome: Outcome;
  /** Ordered story of the attack, ready to be replayed. */
  events: SimEvent[];
  blastRadius: {
    nodes: { node: string; level: Level }[];
    identities: string[];
    assets: string[];
    zones: string[];
  };
  /** Compromised nodes where the attack was stopped. */
  containedAt: string[];
  metrics: SimMetrics;
}
