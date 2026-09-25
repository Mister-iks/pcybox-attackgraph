import { Download, FolderOpen, Languages, Loader2, Moon, Play, Redo2, RotateCcw, Share2, Sun, Undo2, Upload } from 'lucide-react';
import { useRef } from 'react';
import { useIssues } from '../editor/EditorPanel.tsx';
import { createLab } from '../editor/ops.ts';
import { useFormat } from '../i18n/format.ts';
import { LOCALES, isLocale } from '../i18n/locales.ts';
import { downloadLab, readLabFile } from '../lab/file.ts';
import { encodeShareHash } from '../lab/share.ts';
import { TEMPLATES } from '../lab/templates.ts';
import { useApp } from '../store.ts';

export function Header() {
  const f = useFormat();
  const lab = useApp((s) => s.lab);
  const scenarioId = useApp((s) => s.scenarioId);
  const running = useApp((s) => s.running);
  const hasResult = useApp((s) => s.result !== null);
  const stale = useApp((s) => s.stale);
  const locale = useApp((s) => s.locale);
  const theme = useApp((s) => s.theme);
  const mode = useApp((s) => s.mode);
  const canUndo = useApp((s) => s.past.length > 0);
  const canRedo = useApp((s) => s.future.length > 0);
  const { run, setLocale, setTheme, showToast, loadLab, setMode, undo, redo } = useApp.getState();
  const fileInput = useRef<HTMLInputElement>(null);
  const errors = useIssues().filter((i) => i.severity === 'error').length;

  const runAttack = () => {
    setMode('simulate');
    void run();
  };

  const open = (choice: string) => {
    if (choice === 'new') {
      loadLab(
        createLab(locale, {
          title: f.t('new.lab'),
          internet: f.t('zoneType.internet'),
          internal: f.t('new.internal'),
          scenario: f.t('new.scenario'),
        }),
      );
      setMode('edit');
      return;
    }
    const template = TEMPLATES.find((t) => t.id === choice);
    if (template) loadLab(template);
  };

  const share = async () => {
    const hash = encodeShareHash(lab, scenarioId);
    if (!hash) {
      showToast({ kind: 'error', id: 'share.tooLarge' });
      return;
    }
    const url = `${location.origin}${location.pathname}${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast({ kind: 'info', id: 'share.copied' });
    } catch {
      showToast({ kind: 'info', id: 'share.manual', link: url });
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const r = await readLabFile(file);
    if (r.ok) {
      loadLab(r.lab);
      showToast({ kind: 'info', id: 'import.loaded', values: { title: f.text(r.lab.meta.title) } });
    } else {
      const id = r.reason === 'tooLarge' ? 'import.tooLarge' : r.reason === 'notJson' ? 'import.notJson' : 'import.invalid';
      showToast({ kind: 'error', id, details: r.errors.slice(0, 5) });
    }
  };

  return (
    <header className="app-header">
      <div className="brand">
        <img className="brand-mark" src={`${import.meta.env.BASE_URL}logo-mark.png`} alt="" width={36} height={36} />
        <div className="brand-text">
          <h1>{f.t('app.title')}</h1>
          <p>
            {f.text(lab.meta.title)} <span className="muted">· {f.t('app.tagline')}</span>
          </p>
        </div>
      </div>

      <div className="mode-switch" role="radiogroup" aria-label={f.t('mode.label')}>
        {(['simulate', 'edit'] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} className={`mode-btn${mode === m ? ' is-active' : ''}`} onClick={() => setMode(m)}>
            {f.t(`mode.${m}`)}
          </button>
        ))}
      </div>

      <div className="header-actions">
        {mode === 'edit' && (
          <>
            <button type="button" className="icon-btn" onClick={undo} disabled={!canUndo} aria-label={f.t('header.undo')} title={f.t('header.undo')}>
              <Undo2 size={16} />
            </button>
            <button type="button" className="icon-btn" onClick={redo} disabled={!canRedo} aria-label={f.t('header.redo')} title={f.t('header.redo')}>
              <Redo2 size={16} />
            </button>
          </>
        )}
        <button
          type="button"
          className="btn btn-run"
          onClick={runAttack}
          disabled={running || errors > 0}
          title={errors > 0 ? f.t('problems.blocked') : undefined}
        >
          {running ? <Loader2 size={16} className="spin" /> : hasResult && !stale ? <RotateCcw size={16} /> : <Play size={16} />}
          <span>{f.t(running ? 'header.running' : hasResult ? 'header.rerun' : 'header.run')}</span>
        </button>
        <label className="select">
          <FolderOpen size={16} aria-hidden="true" />
          <span className="sr-only">{f.t('header.open')}</span>
          <select
            value=""
            onChange={(e) => {
              open(e.target.value);
              e.target.value = '';
            }}
          >
            <option value="" disabled>
              {f.t('header.open')}
            </option>
            <optgroup label={f.t('header.templates')}>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {f.text(t.meta.title)}
                </option>
              ))}
            </optgroup>
            <option value="new">{f.t('header.newLab')}</option>
          </select>
        </label>
        <button type="button" className="btn" onClick={() => void share()} title={f.t('header.share')}>
          <Share2 size={16} />
          <span className="btn-label">{f.t('header.share')}</span>
        </button>
        <button type="button" className="btn" onClick={() => downloadLab(lab)} title={f.t('header.export')}>
          <Download size={16} />
          <span className="btn-label">{f.t('header.export')}</span>
        </button>
        <button type="button" className="btn" onClick={() => fileInput.current?.click()} title={f.t('header.import')}>
          <Upload size={16} />
          <span className="btn-label">{f.t('header.import')}</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            void importFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <label className="select">
          <Languages size={16} aria-hidden="true" />
          <span className="sr-only">{f.t('header.language')}</span>
          <select value={locale} onChange={(e) => isLocale(e.target.value) && setLocale(e.target.value)}>
            {Object.entries(LOCALES).map(([code, l]) => (
              <option key={code} value={code} lang={code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={f.t(theme === 'dark' ? 'header.themeLight' : 'header.themeDark')}
          title={f.t(theme === 'dark' ? 'header.themeLight' : 'header.themeDark')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
