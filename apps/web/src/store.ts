import { validateLab, withControl, type Lab, type SimResult } from '@pcybox/attackgraph-engine';
import { create } from 'zustand';
import { moveNode } from './editor/ops.ts';
import { detectLocale, type Locale } from './i18n/locales.ts';
import { DEFAULT_LAB } from './lab/templates.ts';
import { runSimulation } from './sim/client.ts';

export type Tab = 'timeline' | 'why' | 'compare' | 'text';
export type EditorTab = 'element' | 'identities' | 'assets' | 'controls' | 'scenarios' | 'lab' | 'problems';
export type Mode = 'simulate' | 'edit';
export type Speed = 1 | 2 | 4;
export type Theme = 'dark' | 'light';
export type Selection = { kind: 'node' | 'edge'; id: string } | null;

export interface Toast {
  kind: 'info' | 'error';
  /** Message id, translated when displayed. */
  id: string;
  values?: Record<string, string>;
  details?: string[];
  /** A URL shown for manual copy when the clipboard is not available. */
  link?: string;
}

export interface EditOptions {
  /** Consecutive edits with the same key (typing in a field) form a single undo step. */
  coalesce?: string;
  /** The change does not affect the simulation (moving an element). */
  keepResult?: boolean;
}

interface AppState {
  lab: Lab;
  scenarioId: string;
  mode: Mode;
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
  selection: Selection;
  tab: Tab;
  editorTab: EditorTab;
  past: Lab[];
  future: Lab[];
  lastEdit: { key: string; at: number } | null;
  locale: Locale;
  theme: Theme;
  toast: Toast | null;

  loadLab(lab: Lab, scenarioId?: string): void;
  edit(change: (lab: Lab) => Lab, options?: EditOptions): void;
  undo(): void;
  redo(): void;
  setMode(mode: Mode): void;
  setScenario(id: string): void;
  setControl(id: string, enabled: boolean): void;
  run(): Promise<void>;
  togglePlay(): void;
  tick(): void;
  step(delta: number): void;
  seek(cursor: number): void;
  setSpeed(speed: Speed): void;
  selectEvent(index: number | null): void;
  select(selection: Selection): void;
  setTab(tab: Tab): void;
  setEditorTab(tab: EditorTab): void;
  moveNode(id: string, position: { x: number; y: number }): void;
  setLocale(locale: Locale): void;
  setTheme(theme: Theme): void;
  showToast(toast: Toast): void;
  clearToast(): void;
}

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1500;
const AUTOSAVE_KEY = 'attackgraph.autosave';

export const storage = {
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
      // Private mode, blocked or full storage: the value simply is not remembered.
    }
  },
};

function initialTheme(): Theme {
  const stored = storage.get('attackgraph.theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** The lab being worked on survives a reload. Anything unreadable falls back to the default template. */
function restoreAutosave(): { lab: Lab; scenarioId: string } {
  const raw = storage.get(AUTOSAVE_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw) as { lab?: unknown; scenarioId?: unknown };
      const result = validateLab(saved.lab);
      if (result.ok) {
        return { lab: result.lab, scenarioId: validScenario(result.lab, saved.scenarioId) };
      }
    } catch {
      // Corrupted save: ignore it.
    }
  }
  return { lab: DEFAULT_LAB, scenarioId: DEFAULT_LAB.scenarios[0]!.id };
}

function validScenario(lab: Lab, id: unknown): string {
  return lab.scenarios.find((s) => s.id === id)?.id ?? lab.scenarios[0]?.id ?? '';
}

const cleared = { result: null, baseline: null, stale: false, cursor: 0, playing: false, selectedEvent: null } as const;

/** Ignores results of runs that were superseded by a newer one. */
let runToken = 0;

const initial = restoreAutosave();

export const useApp = create<AppState>((set, get) => ({
  lab: initial.lab,
  scenarioId: initial.scenarioId,
  mode: 'simulate',
  ...cleared,
  running: false,
  speed: 1,
  selection: null,
  tab: 'timeline',
  editorTab: 'element',
  past: [],
  future: [],
  lastEdit: null,
  locale: detectLocale(storage.get('attackgraph.locale')),
  theme: initialTheme(),
  toast: null,

  loadLab(lab, scenarioId) {
    runToken++;
    set((s) => ({
      lab,
      scenarioId: validScenario(lab, scenarioId),
      ...cleared,
      running: false,
      selection: null,
      past: [...s.past, s.lab].slice(-HISTORY_LIMIT),
      future: [],
      lastEdit: null,
    }));
  },

  edit(change, options = {}) {
    const s = get();
    const next = change(s.lab);
    if (next === s.lab) return;
    const now = Date.now();
    const merge =
      options.coalesce !== undefined && s.lastEdit?.key === options.coalesce && now - s.lastEdit.at < COALESCE_MS;
    if (!options.keepResult) runToken++;
    set({
      lab: next,
      scenarioId: validScenario(next, s.scenarioId),
      past: merge ? s.past : [...s.past, s.lab].slice(-HISTORY_LIMIT),
      future: [],
      lastEdit: options.coalesce ? { key: options.coalesce, at: now } : null,
      ...(options.keepResult ? {} : { ...cleared, running: false }),
    });
  },

  undo() {
    const { past, future, lab, scenarioId } = get();
    const previous = past[past.length - 1];
    if (!previous) return;
    runToken++;
    set({
      lab: previous,
      scenarioId: validScenario(previous, scenarioId),
      past: past.slice(0, -1),
      future: [lab, ...future],
      lastEdit: null,
      ...cleared,
      running: false,
    });
  },

  redo() {
    const { past, future, lab, scenarioId } = get();
    const next = future[0];
    if (!next) return;
    runToken++;
    set({
      lab: next,
      scenarioId: validScenario(next, scenarioId),
      past: [...past, lab],
      future: future.slice(1),
      lastEdit: null,
      ...cleared,
      running: false,
    });
  },

  setMode(mode) {
    set({ mode, playing: false, lastEdit: null });
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
    if (!lab.scenarios.some((s) => s.id === scenarioId)) return;
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

  select(selection) {
    const s = get();
    if (s.selection?.kind === selection?.kind && s.selection?.id === selection?.id) return;
    set({ selection, ...(selection && s.mode === 'edit' ? { editorTab: 'element' } : {}) });
  },

  setTab(tab) {
    set({ tab });
  },

  setEditorTab(editorTab) {
    set({ editorTab });
  },

  moveNode(id, position) {
    get().edit((lab) => moveNode(lab, id, position), { keepResult: true });
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

/** Saves the lab shortly after each change. */
let saveTimer: ReturnType<typeof setTimeout> | undefined;
useApp.subscribe((state, previous) => {
  if (state.lab === previous.lab && state.scenarioId === previous.scenarioId) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { lab, scenarioId } = useApp.getState();
    storage.set(AUTOSAVE_KEY, JSON.stringify({ lab, scenarioId }));
  }, 400);
});

/** Index of the event described in the Why panel and highlighted on the map. */
export function currentEventIndex(s: Pick<AppState, 'selectedEvent' | 'cursor'>): number {
  return s.selectedEvent ?? s.cursor - 1;
}
