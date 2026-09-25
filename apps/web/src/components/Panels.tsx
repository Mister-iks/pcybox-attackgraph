import type { Block, SimResult } from '@cslab/engine';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useFormat, type Formatter } from '../i18n/format.ts';
import { currentEventIndex, useApp } from '../store.ts';

function attackUrl(id: string): string {
  const path = id.startsWith('TA') ? `tactics/${id}` : `techniques/${id.replace('.', '/')}`;
  return `https://attack.mitre.org/${path}/`;
}

export function Timeline() {
  const f = useFormat();
  const result = useApp((s) => s.result);
  const cursor = useApp((s) => s.cursor);
  const current = useApp(currentEventIndex);
  const seek = useApp((s) => s.seek);
  const setTab = useApp((s) => s.setTab);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    listRef.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  if (!result) return <p className="panel-empty">{f.t('timeline.empty')}</p>;

  return (
    <ol className="timeline" ref={listRef}>
      {result.events.map((e, i) => {
        const revealed = i < cursor;
        return (
          <li key={e.id}>
            <button
              type="button"
              className={`timeline-item result-${e.result}${revealed ? '' : ' is-hidden'}`}
              aria-current={i === current ? 'step' : undefined}
              onClick={() => seek(i + 1)}
              onDoubleClick={() => setTab('why')}
            >
              <span className="timeline-step">{i + 1}</span>
              <span className="timeline-tactic" title={`${e.attack.tacticName} · ${e.attack.technique}`}>
                {e.attack.tacticName}
              </span>
              <span className="timeline-text">
                {e.result === 'blocked' && (
                  <span className="timeline-blocked">
                    <ShieldCheck size={12} aria-hidden="true" /> {f.t('timeline.blocked')}
                  </span>
                )}
                {f.event(e)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function BlockList({ blocks, f, tryIt }: { blocks: Block[]; f: Formatter; tryIt?: (control: string) => void }) {
  return (
    <ul className="why-list">
      {blocks.map((b) => (
        <li key={b.control}>
          <strong>{f.label.control(b.control)}</strong>: {f.message(b.message)}
          {tryIt && (
            <button type="button" className="btn btn-small" onClick={() => tryIt(b.control)}>
              {f.t('why.tryIt')}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function WhyPanel() {
  const f = useFormat();
  const result = useApp((s) => s.result);
  const index = useApp(currentEventIndex);
  const setControl = useApp((s) => s.setControl);
  const run = useApp((s) => s.run);
  const event = result && index >= 0 ? result.events[index] : undefined;

  if (!event) return <p className="panel-empty">{f.t('why.empty')}</p>;

  const tryIt = (control: string) => {
    setControl(control, true);
    void run();
  };

  return (
    <article className="why">
      <header className="why-head">
        <span className={`why-result result-${event.result}`}>{index + 1}</span>
        <p className="why-sentence">{f.event(event)}</p>
      </header>
      <p className="why-attack">
        {f.t('why.attack')}:{' '}
        <a href={attackUrl(event.attack.tactic)} target="_blank" rel="noopener noreferrer">
          {event.attack.tacticName} ({event.attack.tactic}) <ExternalLink size={11} aria-hidden="true" />
        </a>{' '}
        ·{' '}
        <a href={attackUrl(event.attack.technique)} target="_blank" rel="noopener noreferrer">
          {event.attack.techniqueName} ({event.attack.technique}) <ExternalLink size={11} aria-hidden="true" />
        </a>
      </p>
      <div className="why-grid">
        <section>
          <h3>{f.t(event.result === 'success' ? 'why.because' : 'why.becauseBlocked')}</h3>
          <ul className="why-list">
            {event.because.map((m, i) => (
              <li key={i}>{f.message(m)}</li>
            ))}
          </ul>
        </section>
        {event.result === 'blocked' ? (
          <section>
            <h3>{f.t('why.stoppedBy')}</h3>
            <BlockList blocks={event.stoppedBy} f={f} />
          </section>
        ) : (
          <section>
            <h3>{f.t('why.couldBlock')}</h3>
            {event.couldBlock.length === 0 ? (
              <p className="muted">{f.t('why.noCouldBlock')}</p>
            ) : (
              <BlockList blocks={event.couldBlock} f={f} tryIt={tryIt} />
            )}
          </section>
        )}
      </div>
    </article>
  );
}

export function ComparePanel() {
  const f = useFormat();
  const result = useApp((s) => s.result);
  const baseline = useApp((s) => s.baseline);
  const controls = useApp((s) => s.lab.controls);

  if (!result || !baseline) return <p className="panel-empty">{f.t('compare.empty')}</p>;

  const enabled = controls.filter((c) => c.enabled);
  // Only measures where "less" clearly means "better for the defender" are colored.
  // A longer story is not worse: a contained attack often tries more before giving up.
  const rows: [string, (r: SimResult) => number, boolean][] = [
    ['compare.steps', (r) => r.metrics.steps, false],
    ['compare.nodes', (r) => r.metrics.nodesCompromised, true],
    ['compare.credentials', (r) => r.metrics.credentialsStolen, true],
    ['compare.assets', (r) => r.metrics.assetsReached, true],
    ['compare.blocked', (r) => r.metrics.attemptsBlocked, false],
    ['compare.exposed', (r) => r.metrics.exposedServices, true],
  ];

  return (
    <div className="compare">
      <p className="panel-note">
        {enabled.length === 0
          ? f.t('compare.noneEnabled')
          : f.t('compare.enabled', { controls: f.list(enabled.map((c) => f.text(c.label))) })}
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{f.t('compare.metric')}</th>
            <th scope="col">{f.t('compare.before')}</th>
            <th scope="col">{f.t('compare.after')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{f.t('compare.outcome')}</th>
            <td className={`outcome-cell outcome-${baseline.outcome}`}>{f.t(`outcome.${baseline.outcome}`)}</td>
            <td className={`outcome-cell outcome-${result.outcome}`}>{f.t(`outcome.${result.outcome}`)}</td>
          </tr>
          {rows.map(([id, get, lowerIsBetter]) => {
            const before = get(baseline);
            const after = get(result);
            const tone = !lowerIsBetter || after === before ? undefined : after < before ? 'is-better' : 'is-worse';
            return (
              <tr key={id}>
                <th scope="row">{f.t(id)}</th>
                <td>{before}</td>
                <td className={tone}>{after}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Complete textual equivalent of the map and the simulation, for screen readers and printing. */
export function TextView() {
  const f = useFormat();
  const lab = useApp((s) => s.lab);
  const result = useApp((s) => s.result);

  return (
    <div className="text-view">
      <h3>{f.text(lab.meta.title)}</h3>
      {lab.meta.description && <p>{f.text(lab.meta.description)}</p>}

      <h3>{f.t('text.nodes')}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{f.t('text.col.name')}</th>
            <th scope="col">{f.t('text.col.zone')}</th>
            <th scope="col">{f.t('text.col.services')}</th>
            <th scope="col">{f.t('text.col.weaknesses')}</th>
          </tr>
        </thead>
        <tbody>
          {lab.nodes.map((n) => (
            <tr key={n.id}>
              <th scope="row">
                {f.text(n.label)} <span className="muted">({f.t(`nodeType.${n.type}`)})</span>
              </th>
              <td>{f.label.zone(n.zone)}</td>
              <td>{n.services.map((s) => `${s.port}/${s.protocol} ${f.t(`serviceKind.${s.kind}`)}`).join(', ') || '-'}</td>
              <td>
                {f.list([...n.weaknesses, ...n.services.flatMap((s) => s.weaknesses)].map((w) => f.t(`weakness.${w}`))) || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{f.t('text.flows')}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{f.t('text.col.from')}</th>
            <th scope="col">{f.t('text.col.to')}</th>
            <th scope="col">{f.t('text.col.port')}</th>
          </tr>
        </thead>
        <tbody>
          {lab.edges.map((e) => (
            <tr key={e.id}>
              <td>{f.label.node(e.source)}</td>
              <td>{f.label.node(e.target)}</td>
              <td>
                {e.port}/{e.protocol}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{f.t('text.identities')}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{f.t('text.col.name')}</th>
            <th scope="col">{f.t('text.col.privileges')}</th>
          </tr>
        </thead>
        <tbody>
          {lab.identities.map((i) => (
            <tr key={i.id}>
              <th scope="row">{f.text(i.label)}</th>
              <td>
                {f.list(
                  i.privileges.map(
                    (p) => `${f.label.node(p.node)} (${f.t(`level.${p.level}`)}, ${p.via.map((v) => f.t(`serviceKind.${v}`)).join('/')})`,
                  ),
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{f.t('text.controls')}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{f.t('text.col.control')}</th>
            <th scope="col">{f.t('text.col.state')}</th>
            <th scope="col">{f.t('text.col.description')}</th>
          </tr>
        </thead>
        <tbody>
          {lab.controls.map((c) => (
            <tr key={c.id}>
              <th scope="row">{f.text(c.label)}</th>
              <td>{f.t(c.enabled ? 'controls.on' : 'controls.off')}</td>
              <td>{f.text(c.description)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{f.t('text.story')}</h3>
      {!result ? (
        <p>{f.t('text.noStory')}</p>
      ) : (
        <>
          <p>
            <strong>{f.t(`outcome.${result.outcome}`)}</strong>
          </p>
          <ol>
            {result.events.map((e) => (
              <li key={e.id}>
                {f.event(e)}{' '}
                <span className="muted">
                  ({e.attack.techniqueName}, {e.attack.technique})
                </span>
                <ul>
                  {(e.result === 'blocked' ? e.stoppedBy.map((b) => b.message) : e.because).map((m, i) => (
                    <li key={i}>{f.message(m)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
