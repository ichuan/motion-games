import { useSyncExternalStore } from 'react';
import { getLocale, setLocale } from './lang';
import { common, type Locale } from './locales';

type Entry = Record<Locale, string>;
type Texts = Record<string, Entry>;

let currentLocale = getLocale();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot() { return currentLocale; }

export function switchLocale(l: Locale) {
  currentLocale = l;
  setLocale(l);
  listeners.forEach((cb) => cb());
}

export function useT<G extends Texts>(gameTexts: G) {
  const lang = useSyncExternalStore(subscribe, getSnapshot);
  const merged: Texts = { ...common, ...gameTexts };

  function t(key: string): string {
    const entry = merged[key];
    return entry?.[lang] ?? key;
  }

  return { t, locale: lang, switchLocale };
}
