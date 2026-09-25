import { AlertTriangle, CheckCircle2, Info, ShieldCheck, Skull, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFormat } from '../i18n/format.ts';
import { useApp } from '../store.ts';

/** Floating summary above the map: what the attack achieved, or what to do next. */
export function OutcomeBanner() {
  const f = useFormat();
  const result = useApp((s) => s.result);
  const cursor = useApp((s) => s.cursor);
  const running = useApp((s) => s.running);
  const stale = useApp((s) => s.stale);

  let tone = 'neutral';
  let icon = <Info size={18} aria-hidden="true" />;
  let title: string;
  let detail: string | null = null;

  if (running) {
    title = f.t('header.running');
  } else if (!result) {
    title = f.t('outcome.idle');
  } else if (stale) {
    tone = 'warn';
    icon = <AlertTriangle size={18} aria-hidden="true" />;
    title = f.t('outcome.stale');
  } else if (cursor < result.events.length) {
    tone = 'live';
    title = f.t('outcome.playing');
    detail = f.t('player.progress', { current: cursor, total: result.events.length });
  } else {
    const reached = result.outcome === 'target-reached';
    tone = reached ? 'danger' : result.outcome === 'explored' ? 'neutral' : 'safe';
    icon = reached ? <Skull size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />;
    title = f.t(`outcome.${result.outcome}`);
    detail = f.t('outcome.summary', {
      steps: result.metrics.steps,
      nodes: result.metrics.nodesCompromised,
      blocked: result.metrics.attemptsBlocked,
    });
    if (result.containedAt.length > 0) {
      detail += ` · ${f.t('outcome.containedAt', { nodes: f.list(result.containedAt.map(f.label.node)) })}`;
    }
  }

  return (
    <div className={`outcome tone-${tone}`} role="status">
      {icon}
      <div>
        <strong>{title}</strong>
        {detail && <p>{detail}</p>}
      </div>
    </div>
  );
}

/** Announces each revealed step to screen readers while the attack plays. */
export function StepAnnouncer() {
  const f = useFormat();
  const result = useApp((s) => s.result);
  const cursor = useApp((s) => s.cursor);
  const event = result && cursor > 0 ? result.events[cursor - 1] : undefined;
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {event ? `${cursor}. ${f.event(event)}` : ''}
    </div>
  );
}

export function ToastView() {
  const f = useFormat();
  const toast = useApp((s) => s.toast);
  const clearToast = useApp((s) => s.clearToast);
  const [copyable, setCopyable] = useState<string | null>(null);

  useEffect(() => {
    setCopyable(toast?.link ?? null);
    if (!toast || toast.link || toast.kind === 'error') return;
    const timer = setTimeout(clearToast, 5000);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
      {toast.kind === 'error' ? <AlertTriangle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
      <div className="toast-body">
        <p>{f.t(toast.id, toast.values)}</p>
        {copyable && <input className="toast-link" readOnly value={copyable} onFocus={(e) => e.target.select()} />}
        {toast.details && toast.details.length > 0 && (
          <ul className="toast-details">
            {toast.details.map((d) => (
              <li key={d}>
                <code>{d}</code>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" className="icon-btn" onClick={clearToast} aria-label={f.t('toast.close')}>
        <X size={16} />
      </button>
    </div>
  );
}
