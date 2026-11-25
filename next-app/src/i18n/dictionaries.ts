import type { Locale } from "./config";

export type Dictionary = Record<string, string>;

type TranslatedLocale = Exclude<Locale, "en">;

const LOADERS: Record<TranslatedLocale, () => Promise<Dictionary>> = {
  sw: () => import("./dictionaries/sw.json").then((module) => module.default as Dictionary),
  fr: () => import("./dictionaries/fr.json").then((module) => module.default as Dictionary),
  es: () => import("./dictionaries/es.json").then((module) => module.default as Dictionary),
  de: () => import("./dictionaries/de.json").then((module) => module.default as Dictionary),
};

const loaded = new Map<TranslatedLocale, Dictionary>();
const pending = new Map<TranslatedLocale, Promise<Dictionary>>();

export function hasTranslatedDictionary(locale: Locale): locale is TranslatedLocale {
  return locale !== "en";
}

export function getLoadedDictionary(locale: Locale): Dictionary | null {
  if (!hasTranslatedDictionary(locale)) return null;
  return loaded.get(locale) ?? null;
}

export function loadDictionary(locale: Locale): Promise<Dictionary> {
  if (!hasTranslatedDictionary(locale)) return Promise.resolve({});
  const ready = loaded.get(locale);
  if (ready) return Promise.resolve(ready);

  const inFlight = pending.get(locale);
  if (inFlight) return inFlight;

  const request = LOADERS[locale]()
    .then((dictionary) => {
      loaded.set(locale, dictionary);
      pending.delete(locale);
      return dictionary;
    })
    .catch((error) => {
      pending.delete(locale);
      throw error;
    });

  pending.set(locale, request);
  return request;
}
