import type { NodeType } from '@pcybox/attackgraph-engine';
import { useReactFlow } from '@xyflow/react';
import { LayoutGrid } from 'lucide-react';
import { NODE_DRAG_TYPE } from '../components/Canvas.tsx';
import { NODE_ICONS } from '../components/icons.tsx';
import { useFormat } from '../i18n/format.ts';
import { useApp } from '../store.ts';
import { addNode, arrange, freeSpot, NODE_HEIGHT, NODE_WIDTH } from './ops.ts';

const GROUPS: [string, NodeType[]][] = [
  ['network', ['internet', 'router', 'firewall', 'vpn-gateway', 'jump-host']],
  ['servers', ['server', 'web-server', 'api-server', 'database', 'file-share', 'backup-server', 'domain-controller', 'identity-provider']],
  ['endpoints', ['workstation', 'laptop', 'iot-device', 'plc']],
  ['cloud', ['cloud-service', 'container', 'k8s-cluster', 'saas-app']],
];

export function Palette() {
  const f = useFormat();
  const locale = useApp((s) => s.locale);
  const { edit, select } = useApp.getState();
  const { screenToFlowPosition, fitView } = useReactFlow();

  /** Click or keyboard: adds the element in the middle of the visible map, in the selected element's zone. */
  const addAtCenter = (type: NodeType) => {
    const map = document.getElementById('map')?.getBoundingClientRect();
    const center = map
      ? screenToFlowPosition({ x: map.left + map.width / 2, y: map.top + map.height / 2 })
      : { x: 0, y: 0 };
    const { lab, selection } = useApp.getState();
    // The selected element's zone, otherwise the zone of the element closest to the middle of the map.
    const distance = (p: { x: number; y: number }) => Math.hypot(p.x + NODE_WIDTH / 2 - center.x, p.y + NODE_HEIGHT / 2 - center.y);
    const closest = lab.nodes
      .filter((n) => n.type !== 'internet')
      .sort((a, b) => distance(a.position) - distance(b.position))[0];
    const near = (selection?.kind === 'node' ? lab.nodes.find((n) => n.id === selection.id) : undefined) ?? closest;
    const zone =
      type === 'internet'
        ? (lab.zones.find((z) => z.type === 'internet')?.id ?? lab.zones[0]?.id)
        : (near?.zone ?? lab.zones.find((z) => z.type !== 'internet')?.id ?? lab.zones[0]?.id);
    if (!zone) return;
    const position = freeSpot(lab, { x: Math.round(center.x - NODE_WIDTH / 2), y: Math.round(center.y - NODE_HEIGHT / 2) });
    let id = '';
    edit((l) => {
      const r = addNode(
        l,
        type,
        { [locale]: f.t(`nodeType.${type}`) },
        position,
        zone,
      );
      id = r.id;
      return r.lab;
    });
    select({ kind: 'node', id });
  };

  return (
    <nav className="palette" aria-label={f.t('palette.title')}>
      <h2 className="panel-title">{f.t('palette.title')}</h2>
      <p className="panel-note">{f.t('palette.hint')}</p>
      {GROUPS.map(([group, types]) => (
        <section key={group} className="palette-group">
          <h3>{f.t(`palette.group.${group}`)}</h3>
          <ul>
            {types.map((type) => {
              const Icon = NODE_ICONS[type];
              return (
                <li key={type}>
                  <button
                    type="button"
                    className="palette-item"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(NODE_DRAG_TYPE, type);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => addAtCenter(type)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{f.t(`nodeType.${type}`)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <button
        type="button"
        className="btn palette-arrange"
        onClick={() => {
          edit((l) => arrange(l), { keepResult: true });
          requestAnimationFrame(() => void fitView({ padding: 0.12, maxZoom: 1, duration: 300 }));
        }}
      >
        <LayoutGrid size={16} aria-hidden="true" />
        {f.t('palette.arrange')}
      </button>
    </nav>
  );
}
