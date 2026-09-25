import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MESSAGE_KEYS } from '@pcybox/attackgraph-engine';
import { createIntl } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '../src/i18n/locales.ts';

const en: Record<string, string> = LOCALES.en.messages;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** Literal message ids used in the source: t('id'), formatMessage({ id: 'id' }), id: 'toast.x'. */
function usedKeys(): Set<string> {
  const keys = new Set<string>();
  const patterns = [/\bt\(\s*'([A-Za-z0-9.-]+)'/g, /\bid:\s*'([a-z]+\.[A-Za-z0-9.-]+)'/g];
  for (const file of sourceFiles(join(import.meta.dirname, '../src'))) {
    const code = readFileSync(file, 'utf8');
    for (const re of patterns) for (const m of code.matchAll(re)) keys.add(m[1]!);
  }
  return keys;
}

describe('translations', () => {
  it('cover every message the engine can emit', () => {
    const missing = MESSAGE_KEYS.filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });

  it('cover every literal message id used by the interface', () => {
    const missing = [...usedKeys()].filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });

  it.each(Object.keys(LOCALES))('%s has exactly the keys of English', (locale) => {
    const messages: Record<string, string> = LOCALES[locale as keyof typeof LOCALES].messages;
    expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort());
  });

  it.each(Object.keys(LOCALES))('%s messages are valid ICU and format without errors', (locale) => {
    const errors: string[] = [];
    const messages: Record<string, string> = LOCALES[locale as keyof typeof LOCALES].messages;
    const intl = createIntl({ locale, messages, onError: (e) => errors.push(String(e)) });
    const values = new Proxy({} as Record<string, string>, {
      get: (_t, key) => (key === 'kind' ? 'config' : 'x'),
      has: () => true,
    });
    for (const id of Object.keys(messages)) {
      const params = [...messages[id]!.matchAll(/\{(\w+)/g)].map((m) => m[1]!);
      const v = Object.fromEntries(params.map((p) => [p, ['steps', 'nodes', 'blocked', 'current', 'total'].includes(p) ? 2 : values[p]!]));
      intl.formatMessage({ id }, v);
    }
    expect(errors).toEqual([]);
  });

  it('contain no long dashes', () => {
    for (const { messages } of Object.values(LOCALES)) {
      for (const text of Object.values(messages)) expect(text).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
