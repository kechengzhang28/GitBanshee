import en from "./en.json";

type Translations = Record<string, Record<string, string>>;

const locales: Record<string, Translations> = { en };

let currentLocale = "en";

export function setLocale(locale: string): void {
  if (locales[locale]) {
    currentLocale = locale;
  }
}

export function getLocale(): string {
  return currentLocale;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const translations = locales[currentLocale];
  if (!translations) return key;

  const [ns, k] = key.split(".");
  const nsObj = translations[ns];
  if (!nsObj) return key;

  let value = nsObj[k] || key;

  if (params) {
    for (const [p, v] of Object.entries(params)) {
      value = value.replace(`{{${p}}}`, String(v));
    }
  }

  return value;
}

export function addLocale(locale: string, translations: Translations): void {
  locales[locale] = translations;
}
