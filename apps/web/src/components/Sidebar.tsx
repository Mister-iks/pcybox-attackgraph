import { useId } from 'react';
import { useFormat } from '../i18n/format.ts';
import { useApp } from '../store.ts';

function ScenarioPicker() {
  const f = useFormat();
  const lab = useApp((s) => s.lab);
  const scenarioId = useApp((s) => s.scenarioId);
  const setScenario = useApp((s) => s.setScenario);
  const titleId = useId();
  const current = lab.scenarios.find((s) => s.id === scenarioId);

  return (
    <section className="panel-section" aria-labelledby={titleId}>
      <h2 id={titleId} className="panel-title">
        {f.t('scenario.title')}
      </h2>
      <div role="radiogroup" aria-labelledby={titleId} className="scenario-list">
        {lab.scenarios.map((s) => (
          <label key={s.id} className={`scenario-option${s.id === scenarioId ? ' is-active' : ''}`}>
            <input
              type="radio"
              name="scenario"
              value={s.id}
              checked={s.id === scenarioId}
              onChange={() => setScenario(s.id)}
            />
            <span>{f.text(s.label)}</span>
          </label>
        ))}
      </div>
      {current?.description && <p className="panel-note">{f.text(current.description)}</p>}
    </section>
  );
}

function ControlsPanel() {
  const f = useFormat();
  const controls = useApp((s) => s.lab.controls);
  const setControl = useApp((s) => s.setControl);
  const titleId = useId();

  return (
    <section className="panel-section" aria-labelledby={titleId}>
      <h2 id={titleId} className="panel-title">
        {f.t('controls.title')}
      </h2>
      <p className="panel-note">{f.t('controls.hint')}</p>
      <ul className="control-list">
        {controls.map((c) => {
          const descId = `${titleId}-${c.id}`;
          return (
            <li key={c.id} className={`control-item${c.enabled ? ' is-on' : ''}`}>
              <button
                type="button"
                role="switch"
                aria-checked={c.enabled}
                aria-describedby={c.description ? descId : undefined}
                className="control-switch"
                onClick={() => setControl(c.id, !c.enabled)}
              >
                <span className="switch-track" aria-hidden="true">
                  <span className="switch-thumb" />
                </span>
                <span className="control-label">{f.text(c.label)}</span>
                <span className="control-state">{f.t(c.enabled ? 'controls.on' : 'controls.off')}</span>
              </button>
              {c.description && (
                <p id={descId} className="control-desc">
                  {f.text(c.description)}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Inspector() {
  const f = useFormat();
  const lab = useApp((s) => s.lab);
  const selected = useApp((s) => (s.selection?.kind === 'node' ? s.selection.id : null));
  const titleId = useId();
  const node = lab.nodes.find((n) => n.id === selected);

  return (
    <section className="panel-section" aria-labelledby={titleId} aria-live="polite">
      <h2 id={titleId} className="panel-title">
        {f.t('inspector.title')}
      </h2>
      {!node ? (
        <p className="panel-note">{f.t('inspector.empty')}</p>
      ) : (
        <dl className="inspector">
          <dt>{f.t('text.col.name')}</dt>
          <dd>
            {f.text(node.label)} <span className="muted">({f.t(`nodeType.${node.type}`)})</span>
          </dd>
          <dt>{f.t('inspector.zone')}</dt>
          <dd>{f.label.zone(node.zone)}</dd>
          <dt>{f.t('inspector.services')}</dt>
          <dd>
            {node.services.length === 0
              ? f.t('inspector.none')
              : node.services.map((s) => (
                  <div key={s.id}>
                    {f.t('inspector.service', { port: String(s.port), protocol: s.protocol, kind: f.t(`serviceKind.${s.kind}`) })}
                    {s.weaknesses.length > 0 && (
                      <span className="weak"> · {f.list(s.weaknesses.map((w) => f.t(`weakness.${w}`)))}</span>
                    )}
                  </div>
                ))}
          </dd>
          <dt>{f.t('inspector.weaknesses')}</dt>
          <dd>
            {node.weaknesses.length === 0
              ? f.t('inspector.none')
              : f.list(node.weaknesses.map((w) => f.t(`weakness.${w}`)))}
          </dd>
          <dt>{f.t('inspector.secrets')}</dt>
          <dd>
            {node.secrets.length === 0
              ? f.t('inspector.none')
              : node.secrets.map((s) => (
                  <div key={`${s.identity}-${s.kind}`}>
                    {f.t('inspector.secret', {
                      identity: f.label.identity(s.identity),
                      kind: s.kind,
                      level: f.t(`level.${s.requires}`),
                    })}
                  </div>
                ))}
          </dd>
          {lab.assets.some((a) => a.node === node.id) && (
            <>
              <dt>{f.t('inspector.assets')}</dt>
              <dd>{f.list(lab.assets.filter((a) => a.node === node.id).map((a) => f.text(a.label)))}</dd>
            </>
          )}
        </dl>
      )}
    </section>
  );
}

export function Sidebar() {
  const f = useFormat();
  return (
    <aside className="sidebar" aria-label={f.t('controls.title')}>
      <ScenarioPicker />
      <ControlsPanel />
      <Inspector />
      <footer className="sidebar-footer">
        <p>{f.t('app.simulationOnly')}</p>
        <p>{f.t('app.attackTrademark')}</p>
        <p>
          <a href="https://github.com/Mister-iks/pcybox-attackgraph" target="_blank" rel="noopener noreferrer">
            {f.t('app.source')}
          </a>
        </p>
      </footer>
    </aside>
  );
}
