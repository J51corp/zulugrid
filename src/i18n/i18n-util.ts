import en, { type Translations } from './en/index';

let currentLocale: Translations = en;

export function t<K extends keyof Translations>(key: K): Translations[K] {
  return currentLocale[key];
}

export function setLocale(locale: Translations) {
  currentLocale = locale;
}
