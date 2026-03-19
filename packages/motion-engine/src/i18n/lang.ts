import type { Locale } from './locales';

const STORAGE_KEY = 'motion-games-lang';

export function getLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch { /* SSR / blocked storage */ }
  return navigator.language.startsWith('zh') ? 'zh' : 'en';
}

export function setLocale(locale: Locale) {
  try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* noop */ }
}
