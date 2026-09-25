import type { LabNode } from '@pcybox/attackgraph-engine';
import {
  applyNodeChanges,
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useInternalNode,
  type Edge,
  type EdgeProps,
  type InternalNode,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Crosshair, Crown, ShieldCheck, Skull, Bug } from 'lucide-react';
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useFormat } from '../i18n/format.ts';
import { currentEventIndex, useApp } from '../store.ts';
import { deriveView, type MapView } from '../view.ts';
import { NODE_ICONS } from './icons.tsx';

const NODE_WIDTH = 196;
const NODE_HEIGHT = 96;
const ZONE_PADDING = 28;
const ZONE_HEADER = 30;

const ViewContext = createContext<MapView | null>(null);

type AssetNodeData = { labNode: LabNode };
type ZoneNodeData = { label: string; zoneType: string };
type AttackEdgeData = { result: 'success' | 'blocked'; steps: number[]; current: boolean };

/* ------------------------------------------------------------------ */
/* Nodes                                                               */
/* ------------------------------------------------------------------ */

type NodeStatus = 'entry' | 'user' | 'admin' | 'reached' | 'blocked' | 'safe';

function statusOf(view: MapView | null, id: string): NodeStatus {
  if (!view) return 'safe';
  const level = view.footholds.get(id);
  if (level) return level;
  if (view.entry === id) return 'entry';
  // Data stolen through a legitimate login: the attacker does not control the node, but got what it holds.
  if (view.breached.has(id)) return 'reached';
  if (view.blocked.has(id)) return 'blocked';
  return 'safe';
}

const STATUS_ICON = { entry: Crosshair, user: Bug, admin: Skull, reached: Crown, blocked: ShieldCheck } as const;

const AssetNode = memo(function AssetNode({ data }: NodeProps<Node<AssetNodeData>>) {
  const f = useFormat();
  const view = useContext(ViewContext);
  const lab = useApp((s) => s.lab);
  const target = useApp((s) => s.lab.scenarios.find((sc) => sc.id === s.scenarioId)?.target);
  const n = data.labNode;
  const Icon = NODE_ICONS[n.type];
  const status = statusOf(view, n.id);
  const StatusIcon = status === 'safe' ? null : STATUS_ICON[status];
  const current = view?.current;
  const isCurrent = current !== null && current !== undefined && current.target === n.id;
  const assets = lab.assets.filter((a) => a.node === n.id);

  return (
    <div
      className={`lab-node status-${status}${isCurrent ? ` is-current current-${current.result}` : ''}`}
      style={{ width: NODE_WIDTH }}
    >
      <Handle type="target" position={Position.Left} className="lab-handle" isConnectable={false} />
      <Handle type="source" position={Position.Right} className="lab-handle" isConnectable={false} />
      <div className="lab-node-head">
        <span className="lab-node-icon" aria-hidden="true">
          <Icon size={18} />
        </span>
        <span className="lab-node-title">
          <span className="lab-node-label">{f.text(n.label)}</span>
          <span className="lab-node-type">{f.t(`nodeType.${n.type}`)}</span>
        </span>
      </div>
      {StatusIcon && (
        <span className={`lab-badge badge-${status}`}>
          <StatusIcon size={12} aria-hidden="true" />
          {f.t(`status.${status}`)}
        </span>
      )}
      {n.services.length > 0 && (
        <div className="lab-ports" aria-hidden="true">
          {n.services.map((s) => (
            <span key={s.id} className={`lab-port${s.weaknesses.length ? ' is-weak' : ''}`}>
              {s.port}
            </span>
          ))}
        </div>
      )}
      {assets.map((a) => {
        const reached = view?.reachedAssets.has(a.id) ?? false;
        return (
          <div key={a.id} className={`lab-asset${reached ? ' is-reached' : ''}`}>
            <Crown size={12} aria-hidden="true" />
            <span>{f.text(a.label)}</span>
            {(reached || a.id === target) && (
              <span className="lab-asset-tag">{f.t(reached ? 'status.reached' : 'status.target')}</span>
            )}
          </div>
        );
      })}
    </div>
  );
});

const ZoneNode = memo(function ZoneNode({ data }: NodeProps<Node<ZoneNodeData>>) {
  return (
    <div className={`lab-zone zone-${data.zoneType}`}>
      <span className="lab-zone-label">{data.label}</span>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Edges                                                               */
/* ------------------------------------------------------------------ */

function center(n: InternalNode) {
  const w = n.measured.width ?? NODE_WIDTH;
  const h = n.measured.height ?? NODE_HEIGHT;
  return { x: n.internals.positionAbsolute.x + w / 2, y: n.internals.positionAbsolute.y + h / 2, w: w / 2, h: h / 2 };
}

/** Point where the segment from the center of `n` towards `to` leaves the node box. */
function border(n: InternalNode, to: { x: number; y: number }) {
  const c = center(n);
  const dx = to.x - c.x;
  const dy = to.y - c.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return c;
  const sx = Math.abs(dx) < 1e-6 ? Infinity : c.w / Math.abs(dx);
  const sy = Math.abs(dy) < 1e-6 ? Infinity : c.h / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

function useEnds(source: string, target: string) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;
  const sc = center(s);
  const tc = center(t);
  return { from: border(s, tc), to: border(t, sc) };
}

const FlowEdge = memo(function FlowEdge({ id, source, target, label, markerEnd }: EdgeProps) {
  const ends = useEnds(source, target);
  if (!ends) return null;
  const { from, to } = ends;
  const path = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} className="flow-edge" />
      <EdgeLabelRenderer>
        <span
          className="flow-edge-label"
          style={{ transform: `translate(-50%, -50%) translate(${(from.x + to.x) / 2}px, ${(from.y + to.y) / 2}px)` }}
        >
          {label}
        </span>
      </EdgeLabelRenderer>
    </>
  );
});

const AttackEdge = memo(function AttackEdge({ id, source, target, data, markerEnd }: EdgeProps<Edge<AttackEdgeData>>) {
  const ends = useEnds(source, target);
  if (!ends || !data) return null;
  const { from, to } = ends;
  // Bend the arrow so it does not hide the declared flow drawn as a straight line.
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const bend = data.result === 'blocked' ? -34 : 34;
  const cx = mx + (-(to.y - from.y) / len) * bend;
  const cy = my + ((to.x - from.x) / len) * bend;
  const path = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
  const lx = 0.25 * from.x + 0.5 * cx + 0.25 * to.x;
  const ly = 0.25 * from.y + 0.5 * cy + 0.25 * to.y;
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className={`attack-edge attack-${data.result}${data.current ? ' is-current' : ''}`}
      />
      <EdgeLabelRenderer>
        <span
          className={`attack-edge-label attack-${data.result}`}
          style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}
        >
          {data.result === 'blocked' && <ShieldCheck size={11} aria-hidden="true" />}
          {data.steps.join(', ')}
        </span>
      </EdgeLabelRenderer>
    </>
  );
});

const nodeTypes = { asset: AssetNode, zone: ZoneNode };
const edgeTypes = { flow: FlowEdge, attack: AttackEdge };

/* ------------------------------------------------------------------ */
/* Canvas                                                              */
/* ------------------------------------------------------------------ */

function toFlowNodes(nodes: LabNode[]): Node<AssetNodeData>[] {
  return nodes.map((n) => ({ id: n.id, type: 'asset', position: n.position, data: { labNode: n }, zIndex: 1 }));
}

export function Canvas() {
  const f = useFormat();
  const lab = useApp((s) => s.lab);
  const scenarioId = useApp((s) => s.scenarioId);
  const result = useApp((s) => s.result);
  const cursor = useApp((s) => s.cursor);
  const currentIndex = useApp(currentEventIndex);
  const theme = useApp((s) => s.theme);
  const selectNode = useApp((s) => s.selectNode);
  const moveNode = useApp((s) => s.moveNode);

  const [assetNodes, setAssetNodes] = useState(() => toFlowNodes(lab.nodes));
  useEffect(() => setAssetNodes(toFlowNodes(lab.nodes)), [lab.nodes]);

  const view = useMemo(
    () => deriveView(lab, scenarioId, result, cursor, currentIndex),
    [lab, scenarioId, result, cursor, currentIndex],
  );

  const zoneNodes = useMemo<Node<ZoneNodeData>[]>(() => {
    const positions = new Map(assetNodes.map((n) => [n.id, n.position]));
    return lab.zones.flatMap((z) => {
      const members = lab.nodes.filter((n) => n.zone === z.id).map((n) => positions.get(n.id) ?? n.position);
      if (members.length === 0) return [];
      const minX = Math.min(...members.map((p) => p.x)) - ZONE_PADDING;
      const minY = Math.min(...members.map((p) => p.y)) - ZONE_PADDING - ZONE_HEADER;
      const maxX = Math.max(...members.map((p) => p.x)) + NODE_WIDTH + ZONE_PADDING;
      const maxY = Math.max(...members.map((p) => p.y)) + NODE_HEIGHT + ZONE_PADDING + 24;
      return [
        {
          id: `zone:${z.id}`,
          type: 'zone',
          position: { x: minX, y: minY },
          width: maxX - minX,
          height: maxY - minY,
          data: { label: f.text(z.label), zoneType: z.type },
          selectable: false,
          draggable: false,
          focusable: false,
          zIndex: 0,
        },
      ];
    });
  }, [assetNodes, lab, f]);

  const nodes = useMemo<Node[]>(() => {
    const statusText = (id: string) => f.t(`status.${statusOf(view, id)}`);
    const withLabels = assetNodes.map((n) => {
      const labNode = n.data.labNode;
      return {
        ...n,
        ariaLabel: f.t('node.aria', {
          label: f.text(labNode.label),
          type: f.t(`nodeType.${labNode.type}`),
          zone: f.label.zone(labNode.zone),
          status: statusText(n.id),
        }),
      };
    });
    return [...zoneNodes, ...withLabels];
  }, [zoneNodes, assetNodes, view, f]);

  const edges = useMemo<Edge[]>(() => {
    const flows: Edge[] = lab.edges.map((e) => ({
      id: `flow:${e.id}`,
      source: e.source,
      target: e.target,
      type: 'flow',
      label: String(e.port),
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: 'var(--edge)' },
      focusable: false,
      selectable: false,
      zIndex: 0,
    }));
    const attacks: Edge<AttackEdgeData>[] = view.arrows.map((a) => ({
      id: a.id,
      source: a.from,
      target: a.to,
      type: 'attack',
      data: { result: a.result, steps: a.steps, current: a.current },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: a.result === 'success' ? 'var(--danger)' : 'var(--shield)',
      },
      focusable: false,
      selectable: false,
      zIndex: 2,
    }));
    return [...flows, ...attacks];
  }, [lab.edges, view.arrows]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setAssetNodes((ns) => applyNodeChanges(changes, ns) as Node<AssetNodeData>[]);
  }, []);

  return (
    <ViewContext.Provider value={view}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={(_e, node) => moveNode(node.id, node.position)}
        onSelectionChange={({ nodes: selected }) => selectNode(selected.find((n) => n.type === 'asset')?.id ?? null)}
        nodesConnectable={false}
        edgesFocusable={false}
        colorMode={theme}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.25}
        maxZoom={2}
        aria-label={f.text(lab.meta.title)}
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </ViewContext.Provider>
  );
}
