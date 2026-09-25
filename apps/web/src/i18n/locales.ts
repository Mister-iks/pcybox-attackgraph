import en from '@pcybox/attackgraph-i18n/messages/en.json';
import fr from '@pcybox/attackgraph-i18n/messages/fr.json';

export { pick } from '@pcybox/attackgraph-i18n';

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
