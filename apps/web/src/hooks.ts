import { useEffect } from 'react';
import { LOCALES } from './i18n/locales.ts';
import { decodeShareHash } from './lab/share.ts';
import { useApp } from './store.ts';

const BASE_DELAY_MS = 1400;

/** Reveals one event at a time while playing. */
export function usePlayback(): void {
  const playing = useApp((s) => s.playing);
  const speed = useApp((s) => s.speed);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => useApp.getState().tick(), BASE_DELAY_MS / speed);
    return () => clearInterval(timer);
  }, [playing, speed]);
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
}

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return isEditable(target) || target.closest('button, a, [role="tab"], [role="switch"], [role="radio"]') !== null;
}

/** Space plays or pauses, arrows step, Home goes back to the start. */
export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isEditable(e.target)) return;
      // Arrow keys move a focused node on the map, and tabs handle their own arrows.
      const inMap = e.target instanceof HTMLElement && e.target.closest('.react-flow__node') !== null;
      const s = useApp.getState();
      if (e.key === ' ' && !isInteractive(e.target) && !inMap) {
        e.preventDefault();
        s.togglePlay();
      } else if (e.key === 'ArrowRight' && !inMap && !isInteractive(e.target)) {
        s.step(1);
      } else if (e.key === 'ArrowLeft' && !inMap && !isInteractive(e.target)) {
        s.step(-1);
      } else if (e.key === 'Home' && !isInteractive(e.target)) {
        s.seek(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Opens a lab shared in the URL fragment, once, then cleans the address bar. */
export function useSharedLab(): void {
  useEffect(() => {
    const decoded = decodeShareHash(location.hash);
    if (decoded.status === 'none') return;
    const s = useApp.getState();
    if (decoded.status === 'ok') s.loadLab(decoded.lab, decoded.scenario);
    else s.showToast({ kind: 'error', id: 'hash.invalid', details: decoded.errors.slice(0, 5) });
    history.replaceState(null, '', location.pathname + location.search);
  }, []);
}

/** Keeps <html> lang, dir and theme in sync with the app. */
export function useDocumentSettings(): void {
  const locale = useApp((s) => s.locale);
  const theme = useApp((s) => s.theme);
  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = LOCALES[locale].dir;
    html.dataset.theme = theme;
  }, [locale, theme]);
}
