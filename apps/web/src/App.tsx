import { ReactFlowProvider } from '@xyflow/react';
import { IntlProvider } from 'react-intl';
import { BottomPanel } from './components/BottomPanel.tsx';
import { Canvas } from './components/Canvas.tsx';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { OutcomeBanner, StepAnnouncer, ToastView } from './components/Status.tsx';
import { useDocumentSettings, usePlayback, useSharedLab, useShortcuts } from './hooks.ts';
import { useFormat } from './i18n/format.ts';
import { LOCALES } from './i18n/locales.ts';
import { useApp } from './store.ts';

function Layout() {
  const f = useFormat();
  usePlayback();
  useShortcuts();
  useSharedLab();
  useDocumentSettings();

  return (
    <div className="app">
      <a href="#map" className="skip-link">
        {f.t('app.skip')}
      </a>
      <Header />
      <main className="workspace">
        <section id="map" className="map" tabIndex={-1}>
          <Canvas />
          <OutcomeBanner />
        </section>
        <BottomPanel />
        <Sidebar />
      </main>
      <StepAnnouncer />
      <ToastView />
    </div>
  );
}

export function App() {
  const locale = useApp((s) => s.locale);
  return (
    <IntlProvider locale={locale} messages={LOCALES[locale].messages} defaultLocale="en">
      <ReactFlowProvider>
        <Layout />
      </ReactFlowProvider>
    </IntlProvider>
  );
}
