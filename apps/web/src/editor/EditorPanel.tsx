import {
  ASSET_KINDS,
  CONTROL_TYPES,
  DIFFICULTIES,
  IDENTITY_TYPES,
  NODE_TYPES,
  SECRET_KINDS,
  SERVICE_KINDS,
  ZONE_TYPES,
  type Control,
  type ControlType,
  type Edge,
  type Lab,
  type LabNode,
  type Level,
  type Service,
  type ZoneType,
} from '@pcybox/attackgraph-engine';
import { AlertTriangle, CircleX, Copy, Trash2 } from 'lucide-react';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useFormat } from '../i18n/format.ts';
import { useApp, type EditorTab } from '../store.ts';
import { AddButton, CheckList, Field, LocalizedInput, NumberInput, RemoveButton, Section, Select } from './fields.tsx';
import { findIssues, type Issue } from './issues.ts';
import * as ops from './ops.ts';

const TABS: EditorTab[] = ['element', 'identities', 'assets', 'controls', 'scenarios', 'lab', 'problems'];
const LEVELS: Level[] = ['user', 'admin'];
const EXPLOITABLE = ['vulnerable-component', 'injection'] as const;

/** Applies a change to the lab, as one undo step (typing in the same field is merged). */
function useEdit() {
  return useApp.getState().edit;
}

function useOptions() {
  const f = useFormat();
  const lab = useApp((s) => s.lab);
  return useMemo(
    () => ({
      nodes: lab.nodes.map((n) => ({ value: n.id, label: f.text(n.label) || n.id })),
      zones: lab.zones.map((z) => ({ value: z.id, label: f.text(z.label) || z.id })),
      identities: lab.identities.map((i) => ({ value: i.id, label: f.text(i.label) || i.id })),
      assets: lab.assets.map((a) => ({ value: a.id, label: f.text(a.label) || a.id })),
      levels: LEVELS.map((l) => ({ value: l, label: f.t(`level.${l}`) })),
      kinds: SERVICE_KINDS.map((k) => ({ value: k, label: f.t(`serviceKind.${k}`) })),
    }),
    [f, lab],
  );
}

/* ------------------------------------------------------------------ */
/* Element: node or flow                                               */
/* ------------------------------------------------------------------ */

function ServiceRow({ node, service }: { node: LabNode; service: Service }) {
  const f = useFormat();
  const edit = useEdit();
  const o = useOptions();
  const update = (patch: Partial<Service>, coalesce?: string) =>
    edit((l) => ops.updateNode(l, node.id, { services: node.services.map((s) => (s.id === service.id ? { ...s, ...patch } : s)) }), {
      coalesce,
    });
  return (
    <div className="row-card">
      <div className="row-grid">
        <Field label={f.t('field.service')}>
          <Select value={service.kind} options={o.kinds} onChange={(kind) => update({ kind })} />
        </Field>
        <Field label={f.t('field.port')}>
          <NumberInput value={service.port} min={1} max={65535} onChange={(port) => update({ port }, `port:${node.id}:${service.id}`)} />
        </Field>
        <Field label={f.t('field.auth')}>
          <Select
            value={service.auth}
            options={(['none', 'password', 'key', 'token'] as const).map((a) => ({ value: a, label: f.t(`auth.${a}`) }))}
            onChange={(auth) => update({ auth })}
          />
        </Field>
        <Field label={f.t('field.runsAs')}>
          <Select value={service.runsAs} options={o.levels} onChange={(runsAs) => update({ runsAs })} />
        </Field>
      </div>
      <div className="row-foot">
        <CheckList
          legend={f.t('editor.weaknesses')}
          options={EXPLOITABLE.map((w) => ({ value: w, label: f.t(`weakness.${w}`) }))}
          values={service.weaknesses}
          onChange={(weaknesses) => update({ weaknesses })}
        />
        <RemoveButton
          label={f.t('action.remove')}
          onClick={() => edit((l) => ops.updateNode(l, node.id, { services: node.services.filter((s) => s.id !== service.id) }))}
        />
      </div>
    </div>
  );
}

function NodeEditor({ node }: { node: LabNode }) {
  const f = useFormat();
  const edit = useEdit();
  const select = useApp((s) => s.select);
  const lab = useApp((s) => s.lab);
  const o = useOptions();
  const outgoing = lab.edges.filter((e) => e.source === node.id);
  const others = o.nodes.filter((n) => n.value !== node.id);

  return (
    <div className="editor-form">
      <div className="row-grid">
        <Field label={f.t('field.name')} wide>
          <LocalizedInput value={node.label} onChange={(label) => edit((l) => ops.updateNode(l, node.id, { label }), { coalesce: `label:${node.id}` })} />
        </Field>
        <Field label={f.t('field.type')}>
          <Select
            value={node.type}
            options={NODE_TYPES.map((t) => ({ value: t, label: f.t(`nodeType.${t}`) }))}
            onChange={(type) => edit((l) => ops.updateNode(l, node.id, { type }))}
          />
        </Field>
        <Field label={f.t('field.zone')}>
          <Select value={node.zone} options={o.zones} onChange={(zone) => edit((l) => ops.updateNode(l, node.id, { zone }))} />
        </Field>
      </div>

      <Section
        title={f.t('editor.services')}
        action={<AddButton label={f.t('action.addService')} onClick={() => edit((l) => ops.updateNode(l, node.id, { services: [...node.services, ops.newService(node)] }))} />}
      >
        {node.services.map((s) => (
          <ServiceRow key={s.id} node={node} service={s} />
        ))}
      </Section>

      <Section title={f.t('editor.weaknesses')}>
        <CheckList
          legend={f.t('editor.system')}
          options={[{ value: 'unpatched-os' as const, label: f.t('weakness.unpatched-os') }]}
          values={node.weaknesses.filter((w) => w === 'unpatched-os')}
          onChange={(weaknesses) => edit((l) => ops.updateNode(l, node.id, { weaknesses }))}
        />
      </Section>

      <Section
        title={f.t('editor.secrets')}
        action={
          <AddButton
            label={f.t('action.addSecret')}
            disabled={lab.identities.length === 0}
            onClick={() =>
              edit((l) =>
                ops.updateNode(l, node.id, {
                  secrets: [...node.secrets, { identity: lab.identities[0]!.id, kind: 'config', requires: 'user' }],
                }),
              )
            }
          />
        }
      >
        {lab.identities.length === 0 && <p className="panel-note">{f.t('editor.noIdentity')}</p>}
        {node.secrets.map((secret, i) => {
          const update = (patch: Partial<typeof secret>) =>
            edit((l) => ops.updateNode(l, node.id, { secrets: node.secrets.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
          return (
            <div key={i} className="row-card row-grid">
              <Field label={f.t('field.identity')}>
                <Select value={secret.identity} options={o.identities} onChange={(identity) => update({ identity })} />
              </Field>
              <Field label={f.t('field.kind')}>
                <Select value={secret.kind} options={SECRET_KINDS.map((k) => ({ value: k, label: f.t(`secretKind.${k}`) }))} onChange={(kind) => update({ kind })} />
              </Field>
              <Field label={f.t('field.readableAs')}>
                <Select value={secret.requires} options={o.levels} onChange={(requires) => update({ requires })} />
              </Field>
              <RemoveButton
                label={f.t('action.remove')}
                onClick={() => edit((l) => ops.updateNode(l, node.id, { secrets: node.secrets.filter((_, j) => j !== i) }))}
              />
            </div>
          );
        })}
      </Section>

      <Section
        title={f.t('editor.flows')}
        action={
          <AddButton
            label={f.t('action.addFlow')}
            disabled={others.length === 0}
            onClick={() => edit((l) => ops.addEdge(l, node.id, others[0]!.value).lab)}
          />
        }
      >
        {outgoing.map((e) => (
          <FlowRow key={e.id} edge={e} fixedSource />
        ))}
      </Section>

      <div className="editor-actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            let id = '';
            edit((l) => {
              const r = ops.duplicateNode(l, node.id);
              id = r.id;
              return r.lab;
            });
            select({ kind: 'node', id });
          }}
        >
          <Copy size={14} aria-hidden="true" /> {f.t('action.duplicate')}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            edit((l) => ops.removeNodes(l, [node.id]));
            select(null);
          }}
        >
          <Trash2 size={14} aria-hidden="true" /> {f.t('action.delete')}
        </button>
      </div>
    </div>
  );
}

function FlowRow({ edge, fixedSource }: { edge: Edge; fixedSource?: boolean }) {
  const f = useFormat();
  const edit = useEdit();
  const o = useOptions();
  const update = (patch: Partial<Edge>, coalesce?: string) => edit((l) => ops.updateEdge(l, edge.id, patch), { coalesce });
  return (
    <div className="row-card row-grid">
      {!fixedSource && (
        <Field label={f.t('field.from')}>
          <Select value={edge.source} options={o.nodes} onChange={(source) => update({ source })} />
        </Field>
      )}
      <Field label={f.t('field.to')}>
        <Select value={edge.target} options={o.nodes.filter((n) => n.value !== edge.source)} onChange={(target) => update({ target })} />
      </Field>
      <Field label={f.t('field.port')}>
        <NumberInput value={edge.port} min={1} max={65535} onChange={(port) => update({ port }, `edge-port:${edge.id}`)} />
      </Field>
      <Field label={f.t('field.protocol')}>
        <Select value={edge.protocol} options={[{ value: 'tcp', label: 'TCP' }, { value: 'udp', label: 'UDP' }] as const} onChange={(protocol) => update({ protocol })} />
      </Field>
      <RemoveButton label={f.t('action.remove')} onClick={() => edit((l) => ops.removeEdges(l, [edge.id]))} />
    </div>
  );
}

function ElementTab() {
  const f = useFormat();
  const lab = useApp((s) => s.lab);
  const selection = useApp((s) => s.selection);
  const node = selection?.kind === 'node' ? lab.nodes.find((n) => n.id === selection.id) : undefined;
  const edge = selection?.kind === 'edge' ? lab.edges.find((e) => e.id === selection.id) : undefined;
  if (node) return <NodeEditor node={node} />;
  if (edge) {
    return (
      <div className="editor-form">
        <h3 className="editor-subtitle">{f.t('editor.flow')}</h3>
        <FlowRow edge={edge} />
      </div>
    );
  }
  return (
    <div className="editor-form">
      <p className="panel-note">{f.t('editor.empty')}</p>
      <p className="panel-note">{f.t('editor.shortcuts')}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Identities, assets, controls, scenarios                             */
/* ------------------------------------------------------------------ */

function IdentitiesTab() {
  const f = useFormat();
  const edit = useEdit();
  const lab = useApp((s) => s.lab);
  const locale = useApp((s) => s.locale);
  const o = useOptions();
  return (
    <div className="editor-form">
      <AddButton label={f.t('action.addIdentity')} onClick={() => edit((l) => ops.addIdentity(l, { [locale]: f.t('new.identity') }).lab)} />
      {lab.identities.map((identity) => (
        <div key={identity.id} className="card">
          <div className="row-grid">
            <Field label={f.t('field.name')} wide>
              <LocalizedInput value={identity.label} onChange={(label) => edit((l) => ops.updateIdentity(l, identity.id, { label }), { coalesce: `label:${identity.id}` })} />
            </Field>
            <Field label={f.t('field.type')}>
              <Select
                value={identity.type}
                options={IDENTITY_TYPES.map((t) => ({ value: t, label: f.t(`identityType.${t}`) }))}
                onChange={(type) => edit((l) => ops.updateIdentity(l, identity.id, { type }))}
              />
            </Field>
            <RemoveButton label={f.t('action.remove')} onClick={() => edit((l) => ops.removeIdentity(l, identity.id))} />
          </div>
          <Section
            title={f.t('editor.rights')}
            action={
              <AddButton
                label={f.t('action.addRight')}
                disabled={lab.nodes.length === 0}
                onClick={() =>
                  edit((l) =>
                    ops.updateIdentity(l, identity.id, {
                      privileges: [...identity.privileges, { node: lab.nodes.find((n) => n.type !== 'internet')?.id ?? lab.nodes[0]!.id, level: 'user', via: ['ssh'] }],
                    }),
                  )
                }
              />
            }
          >
            {identity.privileges.map((p, i) => {
              const update = (patch: Partial<typeof p>) =>
                edit((l) => ops.updateIdentity(l, identity.id, { privileges: identity.privileges.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
              return (
                <div key={i} className="row-card">
                  <div className="row-grid">
                    <Field label={f.t('field.element')}>
                      <Select value={p.node} options={o.nodes} onChange={(node) => update({ node })} />
                    </Field>
                    <Field label={f.t('field.level')}>
                      <Select value={p.level} options={o.levels} onChange={(level) => update({ level })} />
                    </Field>
                    <RemoveButton
                      label={f.t('action.remove')}
                      onClick={() => edit((l) => ops.updateIdentity(l, identity.id, { privileges: identity.privileges.filter((_, j) => j !== i) }))}
                    />
                  </div>
                  <CheckList legend={f.t('field.via')} options={o.kinds} values={p.via} onChange={(via) => update({ via })} />
                </div>
              );
            })}
          </Section>
        </div>
      ))}
    </div>
  );
}

function AssetsTab() {
  const f = useFormat();
  const edit = useEdit();
  const lab = useApp((s) => s.lab);
  const locale = useApp((s) => s.locale);
  const o = useOptions();
  const host = lab.nodes.find((n) => n.type !== 'internet');
  const scores = [1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }));
  return (
    <div className="editor-form">
      <AddButton label={f.t('action.addAsset')} disabled={!host} onClick={() => edit((l) => ops.addAsset(l, { [locale]: f.t('new.asset') }, host!.id).lab)} />
      {lab.assets.map((a) => (
        <div key={a.id} className="card row-grid">
          <Field label={f.t('field.name')} wide>
            <LocalizedInput value={a.label} onChange={(label) => edit((l) => ops.updateAsset(l, a.id, { label }), { coalesce: `label:${a.id}` })} />
          </Field>
          <Field label={f.t('field.kind')}>
            <Select value={a.kind} options={ASSET_KINDS.map((k) => ({ value: k, label: f.t(`assetKind.${k}`) }))} onChange={(kind) => edit((l) => ops.updateAsset(l, a.id, { kind }))} />
          </Field>
          <Field label={f.t('field.element')}>
            <Select value={a.node} options={o.nodes} onChange={(node) => edit((l) => ops.updateAsset(l, a.id, { node }))} />
          </Field>
          <Field label={f.t('field.readableAs')}>
            <Select value={a.requires} options={o.levels} onChange={(requires) => edit((l) => ops.updateAsset(l, a.id, { requires }))} />
          </Field>
          {(['c', 'i', 'a'] as const).map((k) => (
            <Field key={k} label={f.t(`field.cia.${k}`)}>
              <Select
                value={String(a.cia[k])}
                options={scores}
                onChange={(v) => edit((l) => ops.updateAsset(l, a.id, { cia: { ...a.cia, [k]: Number(v) } }))}
              />
            </Field>
          ))}
          <RemoveButton label={f.t('action.remove')} onClick={() => edit((l) => ops.removeAsset(l, a.id))} />
        </div>
      ))}
    </div>
  );
}

function ControlTargets({ control }: { control: Control }) {
  const f = useFormat();
  const edit = useEdit();
  const o = useOptions();
  const replace = (c: Control) => edit((l) => ops.replaceControl(l, c));
  switch (control.type) {
    case 'segmentation':
      return <p className="panel-note">{f.t('editor.segmentationHint')}</p>;
    case 'mfa':
      return <CheckList legend={f.t('editor.targets')} options={o.identities} values={control.identities} onChange={(identities) => replace({ ...control, identities })} />;
    case 'least-privilege':
      return (
        <Section
          title={f.t('editor.revoke')}
          action={
            <AddButton
              label={f.t('action.addRevoke')}
              disabled={o.identities.length === 0 || o.nodes.length === 0}
              onClick={() => replace({ ...control, revoke: [...control.revoke, { identity: o.identities[0]!.value, node: o.nodes[0]!.value }] })}
            />
          }
        >
          {control.revoke.map((r, i) => (
            <div key={i} className="row-card row-grid">
              <Field label={f.t('field.identity')}>
                <Select value={r.identity} options={o.identities} onChange={(identity) => replace({ ...control, revoke: control.revoke.map((x, j) => (j === i ? { ...x, identity } : x)) })} />
              </Field>
              <Field label={f.t('field.element')}>
                <Select value={r.node} options={o.nodes} onChange={(node) => replace({ ...control, revoke: control.revoke.map((x, j) => (j === i ? { ...x, node } : x)) })} />
              </Field>
              <RemoveButton label={f.t('action.remove')} onClick={() => replace({ ...control, revoke: control.revoke.filter((_, j) => j !== i) })} />
            </div>
          ))}
        </Section>
      );
    default:
      return <CheckList legend={f.t('editor.targets')} options={o.nodes} values={control.nodes} onChange={(nodes) => replace({ ...control, nodes })} />;
  }
}

function ControlsTab() {
  const f = useFormat();
  const edit = useEdit();
  const lab = useApp((s) => s.lab);
  const locale = useApp((s) => s.locale);
  const [type, setType] = useState<ControlType>('segmentation');
  return (
    <div className="editor-form">
      <div className="inline-add">
        <Field label={f.t('editor.newControl')}>
          <Select value={type} options={CONTROL_TYPES.map((t) => ({ value: t, label: f.t(`controlType.${t}`) }))} onChange={setType} />
        </Field>
        <AddButton label={f.t('action.add')} onClick={() => edit((l) => ops.addControl(l, type, { [locale]: f.t(`controlType.${type}`) }).lab)} />
      </div>
      {lab.controls.map((c) => (
        <div key={c.id} className="card">
          <div className="row-grid">
            <Field label={f.t('field.name')} wide>
              <LocalizedInput value={c.label} onChange={(label) => edit((l) => ops.replaceControl(l, { ...c, label }), { coalesce: `label:${c.id}` })} />
            </Field>
            <p className="control-type">{f.t(`controlType.${c.type}`)}</p>
            <RemoveButton label={f.t('action.remove')} onClick={() => edit((l) => ops.removeControl(l, c.id))} />
          </div>
          <Field label={f.t('field.description')} wide>
            <LocalizedInput multiline value={c.description} onChange={(description) => edit((l) => ops.replaceControl(l, { ...c, description }), { coalesce: `desc:${c.id}` })} />
          </Field>
          <ControlTargets control={c} />
        </div>
      ))}
    </div>
  );
}

function ScenariosTab() {
  const f = useFormat();
  const edit = useEdit();
  const lab = useApp((s) => s.lab);
  const locale = useApp((s) => s.locale);
  const o = useOptions();
  return (
    <div className="editor-form">
      <AddButton label={f.t('action.addScenario')} onClick={() => edit((l) => ops.addScenario(l, { [locale]: f.t('new.scenario2') }).lab)} />
      {lab.scenarios.map((s) => (
        <div key={s.id} className="card row-grid">
          <Field label={f.t('field.name')} wide>
            <LocalizedInput value={s.label} onChange={(label) => edit((l) => ops.updateScenario(l, s.id, { label }), { coalesce: `label:${s.id}` })} />
          </Field>
          <Field label={f.t('field.entry')}>
            <Select value={s.entry.node} options={o.nodes} onChange={(node) => edit((l) => ops.updateScenario(l, s.id, { entry: { ...s.entry, node } }))} />
          </Field>
          <Field label={f.t('field.entryLevel')}>
            <Select value={s.entry.level} options={o.levels} onChange={(level) => edit((l) => ops.updateScenario(l, s.id, { entry: { ...s.entry, level } }))} />
          </Field>
          <Field label={f.t('field.target')}>
            <Select
              value={s.target ?? ''}
              options={[{ value: '', label: f.t('field.noTarget') }, ...o.assets]}
              onChange={(target) => edit((l) => ops.updateScenario(l, s.id, target ? { target } : { target: undefined }))}
            />
          </Field>
          <Field label={f.t('field.description')} wide>
            <LocalizedInput multiline value={s.description} onChange={(description) => edit((l) => ops.updateScenario(l, s.id, { description }), { coalesce: `desc:${s.id}` })} />
          </Field>
          <RemoveButton label={f.t('action.remove')} disabled={lab.scenarios.length <= 1} onClick={() => edit((l) => ops.removeScenario(l, s.id))} />
        </div>
      ))}
    </div>
  );
}

function LabTab() {
  const f = useFormat();
  const edit = useEdit();
  const lab = useApp((s) => s.lab);
  const locale = useApp((s) => s.locale);
  const [zoneType, setZoneType] = useState<ZoneType>('internal');
  const setMeta = (patch: Partial<Lab['meta']>, coalesce?: string) => edit((l) => ({ ...l, meta: { ...l.meta, ...patch } }), { coalesce });
  return (
    <div className="editor-form">
      <Field label={f.t('field.title')} wide>
        <LocalizedInput value={lab.meta.title} onChange={(title) => setMeta({ title }, 'lab-title')} />
      </Field>
      <Field label={f.t('field.description')} wide>
        <LocalizedInput multiline value={lab.meta.description} onChange={(description) => setMeta({ description }, 'lab-description')} />
      </Field>
      <Field label={f.t('field.difficulty')}>
        <Select value={lab.meta.difficulty} options={DIFFICULTIES.map((d) => ({ value: d, label: f.t(`difficulty.${d}`) }))} onChange={(difficulty) => setMeta({ difficulty })} />
      </Field>

      <Section title={f.t('editor.zones')}>
        <div className="inline-add">
          <Field label={f.t('field.type')}>
            <Select value={zoneType} options={ZONE_TYPES.map((t) => ({ value: t, label: f.t(`zoneType.${t}`) }))} onChange={setZoneType} />
          </Field>
          <AddButton label={f.t('action.addZone')} onClick={() => edit((l) => ops.addZone(l, zoneType, { [locale]: f.t(`zoneType.${zoneType}`) }).lab)} />
        </div>
        {lab.zones.map((z) => {
          const used = lab.nodes.some((n) => n.zone === z.id);
          return (
            <div key={z.id} className="row-card row-grid">
              <Field label={f.t('field.name')}>
                <LocalizedInput value={z.label} onChange={(label) => edit((l) => ops.updateZone(l, z.id, { label }), { coalesce: `label:${z.id}` })} />
              </Field>
              <Field label={f.t('field.type')}>
                <Select value={z.type} options={ZONE_TYPES.map((t) => ({ value: t, label: f.t(`zoneType.${t}`) }))} onChange={(type) => edit((l) => ops.updateZone(l, z.id, { type }))} />
              </Field>
              <RemoveButton label={used ? f.t('editor.zoneInUse') : f.t('action.remove')} disabled={used} onClick={() => edit((l) => ops.removeZone(l, z.id))} />
            </div>
          );
        })}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Problems                                                            */
/* ------------------------------------------------------------------ */

export function useIssues(): Issue[] {
  const lab = useApp((s) => s.lab);
  return useMemo(() => findIssues(lab), [lab]);
}

function ProblemsTab() {
  const f = useFormat();
  const lab = useApp((s) => s.lab);
  const issues = useIssues();
  const { select, setEditorTab } = useApp.getState();
  if (issues.length === 0) return <p className="panel-note">{f.t('problems.none')}</p>;

  const go = (issue: Issue) => {
    const t = issue.target;
    if (t.kind === 'node' || t.kind === 'edge') select({ kind: t.kind, id: t.id });
    else if (t.kind === 'identity') setEditorTab('identities');
    else if (t.kind === 'asset') setEditorTab('assets');
    else if (t.kind === 'control') setEditorTab('controls');
    else if (t.kind === 'scenario') setEditorTab('scenarios');
    else setEditorTab('lab');
  };
  const text = (issue: Issue) => {
    const params = { ...issue.params };
    if (params.scenario) params.scenario = f.text(lab.scenarios.find((s) => s.id === params.scenario)?.label) || params.scenario;
    return f.message({ key: issue.key, params });
  };

  return (
    <ul className="problems">
      {issues.map((issue, i) => (
        <li key={i}>
          <button type="button" className={`problem problem-${issue.severity}`} onClick={() => go(issue)}>
            {issue.severity === 'error' ? <CircleX size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
            <span className="sr-only">{f.t(`problems.${issue.severity}`)}: </span>
            <span>{text(issue)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function EditorPanel() {
  const f = useFormat();
  const tab = useApp((s) => s.editorTab);
  const setTab = useApp((s) => s.setEditorTab);
  const issues = useIssues();
  const errors = issues.filter((i) => i.severity === 'error').length;
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent) => {
    const i = TABS.indexOf(tab);
    const next = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : -1;
    if (next < 0) return;
    e.preventDefault();
    e.stopPropagation();
    setTab(TABS[next]!);
    refs.current[next]?.focus();
  };

  return (
    <aside className="sidebar editor-panel" aria-label={f.t('mode.edit')}>
      <div role="tablist" aria-label={f.t('mode.edit')} className="tabs editor-tabs" onKeyDown={onKeyDown}>
        {TABS.map((t, i) => (
          <button
            key={t}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`${baseId}-panel`}
            tabIndex={tab === t ? 0 : -1}
            className={`tab${tab === t ? ' is-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {f.t(`editor.tab.${t}`)}
            {t === 'problems' && issues.length > 0 && (
              <span className={`tab-badge${errors > 0 ? ' is-error' : ''}`}>{issues.length}</span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${tab}`} className="editor-body">
        {tab === 'element' && <ElementTab />}
        {tab === 'identities' && <IdentitiesTab />}
        {tab === 'assets' && <AssetsTab />}
        {tab === 'controls' && <ControlsTab />}
        {tab === 'scenarios' && <ScenariosTab />}
        {tab === 'lab' && <LabTab />}
        {tab === 'problems' && <ProblemsTab />}
      </div>
    </aside>
  );
}
