import { Pause, Play, SkipBack, StepBack, StepForward } from 'lucide-react';
import { useId, useRef, type KeyboardEvent } from 'react';
import { useFormat } from '../i18n/format.ts';
import { useApp, type Speed, type Tab } from '../store.ts';
import { ComparePanel, TextView, Timeline, WhyPanel } from './Panels.tsx';

const TABS: Tab[] = ['timeline', 'why', 'compare', 'text'];
const SPEEDS: Speed[] = [1, 2, 4];

function Player() {
  const f = useFormat();
  const result = useApp((s) => s.result);
  const cursor = useApp((s) => s.cursor);
  const playing = useApp((s) => s.playing);
  const speed = useApp((s) => s.speed);
  const { togglePlay, step, seek, setSpeed } = useApp.getState();
  const total = result?.events.length ?? 0;
  const disabled = !result;

  return (
    <div className="player" role="group" aria-label={f.t('tab.timeline')}>
      <button type="button" className="icon-btn" onClick={() => seek(0)} disabled={disabled} aria-label={f.t('player.reset')} title={f.t('player.reset')}>
        <SkipBack size={16} />
      </button>
      <button type="button" className="icon-btn" onClick={() => step(-1)} disabled={disabled || cursor === 0} aria-label={f.t('player.back')} title={f.t('player.back')}>
        <StepBack size={16} />
      </button>
      <button
        type="button"
        className="icon-btn is-primary"
        onClick={togglePlay}
        aria-label={f.t(playing ? 'player.pause' : 'player.play')}
        title={f.t(playing ? 'player.pause' : 'player.play')}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button type="button" className="icon-btn" onClick={() => step(1)} disabled={disabled || cursor >= total} aria-label={f.t('player.forward')} title={f.t('player.forward')}>
        <StepForward size={16} />
      </button>
      <div className="speed" role="radiogroup" aria-label={f.t('player.speed')}>
        {SPEEDS.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={speed === s} className={`speed-btn${speed === s ? ' is-active' : ''}`} onClick={() => setSpeed(s)}>
            x{s}
          </button>
        ))}
      </div>
      {result && (
        <span className="player-progress" aria-live="off">
          {f.t('player.progress', { current: cursor, total })}
        </span>
      )}
    </div>
  );
}

export function BottomPanel() {
  const f = useFormat();
  const tab = useApp((s) => s.tab);
  const setTab = useApp((s) => s.setTab);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern.
  const onKeyDown = (e: KeyboardEvent) => {
    const i = TABS.indexOf(tab);
    const next = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : -1;
    if (next < 0) return;
    e.preventDefault();
    e.stopPropagation();
    setTab(TABS[next]!);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="bottom-panel">
      <div className="bottom-head">
        <div role="tablist" aria-label={f.t('tab.timeline')} className="tabs" onKeyDown={onKeyDown}>
          {TABS.map((t, i) => (
            <button
              key={t}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${t}`}
              aria-selected={tab === t}
              aria-controls={`${baseId}-panel-${t}`}
              tabIndex={tab === t ? 0 : -1}
              className={`tab${tab === t ? ' is-active' : ''}`}
              onClick={() => setTab(t)}
            >
              {f.t(`tab.${t}`)}
            </button>
          ))}
        </div>
        <Player />
      </div>
      <div role="tabpanel" id={`${baseId}-panel-${tab}`} aria-labelledby={`${baseId}-tab-${tab}`} className="tab-panel" tabIndex={0}>
        {tab === 'timeline' && <Timeline />}
        {tab === 'why' && <WhyPanel />}
        {tab === 'compare' && <ComparePanel />}
        {tab === 'text' && <TextView />}
      </div>
    </section>
  );
}
