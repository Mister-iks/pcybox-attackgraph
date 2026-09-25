import { withControl, type Lab, type SimResult } from '@pcybox/attackgraph-engine';
import { create } from 'zustand';
import { detectLocale, type Locale } from './i18n/locales.ts';
import { DEFAULT_LAB } from './lab/template.ts';
import { runSimulation } from './sim/client.ts';

export type Tab = 'timeline' | 'why' | 'compare' | 'text';
export type Speed = 1 | 2 | 4;
export type Theme = 'dark' | 'light';

export interface Toast {
  kind: 'info' | 'error';
  /** Message id, translated when displayed. */
  id: string;
  values?: Record<string, string>;
  details?: string[];
  /** A URL shown for manual copy when the clipboard is not available. */
  link?: string;
}

interface AppState {
  lab: Lab;
  scenarioId: string;
  result: SimResult | null;
  baseline: SimResult | null;
  /** Controls changed since the last run. */
  stale: boolean;
  running: boolean;
  /** Number of events revealed on the map. */
  cursor: number;
  playing: boolean;
  speed: Speed;
  /** Event picked in the timeline; defaults to the last revealed one. */
  selectedEvent: number | null;
  selectedNode: string | null;
  tab: Tab;
  locale: Locale;
  theme: Theme;
  toast: Toast | null;

  loadLab(lab: Lab, scenarioId?: string): void;
  setScenario(id: string): void;
  setControl(id: string, enabled: boolean): void;
  run(): Promise<void>;
  togglePlay(): void;
  tick(): void;
  step(delta: number): void;
  seek(cursor: number): void;
  setSpeed(speed: Speed): void;
  selectEvent(index: number | null): void;
  selectNode(id: string | null): void;
  setTab(tab: Tab): void;
  moveNode(id: string, position: { x: number; y: number }): void;
  setLocale(locale: Locale): void;
  setTheme(theme: Theme): void;
  showToast(toast: Toast): void;
  clearToast(): void;
}

const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Private mode or blocked storage: the preference simply is not remembered.
    }
  },
};

function initialTheme(): Theme {
  const stored = storage.get('attackgraph.theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

const cleared = { result: null, baseline: null, stale: false, cursor: 0, playing: false, selectedEvent: null } as const;

/** Ignores results of runs that were superseded by a newer one. */
let runToken = 0;

export const useApp = create<AppState>((set, get) => ({
  lab: DEFAULT_LAB,
  scenarioId: DEFAULT_LAB.scenarios[0]!.id,
  ...cleared,
  running: false,
  speed: 1,
  selectedNode: null,
  tab: 'timeline',
  locale: detectLocale(storage.get('attackgraph.locale')),
  theme: initialTheme(),
  toast: null,

  loadLab(lab, scenarioId) {
    runToken++;
    const scenario = lab.scenarios.find((s) => s.id === scenarioId) ?? lab.scenarios[0]!;
    set({ lab, scenarioId: scenario.id, ...cleared, running: false, selectedNode: null });
  },

  setScenario(id) {
    runToken++;
    set({ scenarioId: id, ...cleared, running: false });
  },

  setControl(id, enabled) {
    set((s) => ({ lab: withControl(s.lab, id, enabled), stale: s.result !== null }));
  },

  async run() {
    const { lab, scenarioId } = get();
    const token = ++runToken;
    set({ running: true });
    try {
      const { result, baseline } = await runSimulation(lab, scenarioId);
      if (token !== runToken) return;
      set({ result, baseline, stale: false, running: false, cursor: 0, playing: true, selectedEvent: null });
    } catch (err) {
      if (token !== runToken) return;
      set({ running: false });
      get().showToast({ kind: 'error', id: 'toast.simulationFailed', details: [String(err)] });
    }
  },

  togglePlay() {
    const { result, cursor, playing } = get();
    if (!result) {
      void get().run();
      return;
    }
    if (cursor >= result.events.length) set({ cursor: 0, playing: true, selectedEvent: null });
    else set({ playing: !playing, selectedEvent: null });
  },

  tick() {
    const { result, cursor } = get();
    if (!result) return;
    const next = Math.min(cursor + 1, result.events.length);
    set({ cursor: next, playing: next < result.events.length });
  },

  step(delta) {
    const { result, cursor } = get();
    if (!result) return;
    set({ cursor: Math.max(0, Math.min(result.events.length, cursor + delta)), playing: false, selectedEvent: null });
  },

  seek(cursor) {
    const { result } = get();
    if (!result) return;
    const c = Math.max(0, Math.min(result.events.length, cursor));
    set({ cursor: c, playing: false, selectedEvent: c > 0 ? c - 1 : null });
  },

  setSpeed(speed) {
    set({ speed });
  },

  selectEvent(index) {
    set({ selectedEvent: index });
  },

  selectNode(id) {
    set({ selectedNode: id });
  },

  setTab(tab) {
    set({ tab });
  },

  moveNode(id, position) {
    set((s) => ({ lab: { ...s.lab, nodes: s.lab.nodes.map((n) => (n.id === id ? { ...n, position } : n)) } }));
  },

  setLocale(locale) {
    storage.set('attackgraph.locale', locale);
    set({ locale });
  },

  setTheme(theme) {
    storage.set('attackgraph.theme', theme);
    set({ theme });
  },

  showToast(toast) {
    set({ toast });
  },

  clearToast() {
    set({ toast: null });
  },
}));

/** Index of the event described in the Why panel and highlighted on the map. */
export function currentEventIndex(s: Pick<AppState, 'selectedEvent' | 'cursor'>): number {
  return s.selectedEvent ?? s.cursor - 1;
}
