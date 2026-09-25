import { Download, Languages, Loader2, Moon, Play, RotateCcw, Share2, Sun, Upload } from 'lucide-react';
import { useRef } from 'react';
import { useFormat } from '../i18n/format.ts';
import { LOCALES, isLocale } from '../i18n/locales.ts';
import { downloadLab, readLabFile } from '../lab/file.ts';
import { encodeShareHash } from '../lab/share.ts';
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
  const { run, setLocale, setTheme, showToast, loadLab } = useApp.getState();
  const fileInput = useRef<HTMLInputElement>(null);

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

      <div className="header-actions">
        <button type="button" className="btn btn-run" onClick={() => void run()} disabled={running}>
          {running ? <Loader2 size={16} className="spin" /> : hasResult && !stale ? <RotateCcw size={16} /> : <Play size={16} />}
          <span>{f.t(running ? 'header.running' : hasResult ? 'header.rerun' : 'header.run')}</span>
        </button>
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
