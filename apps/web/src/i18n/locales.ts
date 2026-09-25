import type { Localized } from '@pcybox/attackgraph-engine';
import en from './en.json';
import fr from './fr.json';

export const LOCALES = {
  en: { name: 'English', dir: 'ltr', messages: en },
  fr: { name: 'Français', dir: 'ltr', messages: fr },
} as const satisfies Record<string, { name: string; dir: 'ltr' | 'rtl'; messages: Record<string, string> }>;

export type Locale = keyof typeof LOCALES;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && Object.hasOwn(LOCALES, value);
}

/** Stored choice first, then the browser languages, then English. */
export function detectLocale(stored: string | null): Locale {
  if (isLocale(stored)) return stored;
  const preferred = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return 'en';
}

/** Picks the best translation of a lab text, falling back to English, then to any language. */
export function pick(text: Localized | undefined, locale: string): string {
  if (!text) return '';
  return text[locale] ?? text[locale.split('-')[0] ?? ''] ?? text.en ?? Object.values(text)[0] ?? '';
}
