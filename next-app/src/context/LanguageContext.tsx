"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LANGUAGE_COOKIE_MAX_AGE,
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_STORAGE_KEY,
  LOCALE_INTL_TAGS,
  isLocale,
  normalizeLocale,
  type Locale,
} from "@/i18n/config";
import { getLoadedDictionary, loadDictionary } from "@/i18n/dictionaries";
import { buildLookup, translateText, type Lookup } from "@/i18n/translate";

type LanguageContextValue = {
  /** Active UI language. English is the source language and the fallback. */
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Translate a single string. Unknown strings are returned unchanged. */
  t: (text: string) => string;
  formatDate: (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** False while a non-English dictionary is being loaded. */
  ready: boolean;
  /** Increments whenever the active dictionary changes. */
  dictionaryVersion: number;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const entry = part.trim();
    if (entry.startsWith(prefix)) {
      return decodeURIComponent(entry.slice(prefix.length));
    }
  }
  return null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${LANGUAGE_COOKIE_MAX_AGE}; samesite=lax`;
}

const FALLBACK: LanguageContextValue = {
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (text) => text,
  formatDate: (value, options) => {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : new Intl.DateTimeFormat(LOCALE_INTL_TAGS[DEFAULT_LOCALE], options).format(date);
  },
  formatNumber: (value, options) =>
    new Intl.NumberFormat(LOCALE_INTL_TAGS[DEFAULT_LOCALE], options).format(value),
  ready: true,
  dictionaryVersion: 0,
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [lookup, setLookup] = useState<Lookup>(() => new Map());
  const [ready, setReady] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [dictionaryVersion, setDictionaryVersion] = useState(0);

  // Read the saved choice after hydration so the server-rendered English
  // markup and the first client render match exactly.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in private modes; fall back to the cookie.
    }
    const initial = normalizeLocale(stored ?? readCookie(LANGUAGE_COOKIE_NAME));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved choice is read after hydration so the server-rendered English markup and the first client render match
    if (initial !== DEFAULT_LOCALE) setLocaleState(initial);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    document.documentElement.lang = locale;
    document.documentElement.setAttribute("data-locale", locale);

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    } catch {
      // Ignore storage failures; the cookie is still written below.
    }
    writeCookie(LANGUAGE_COOKIE_NAME, locale);

    if (locale === DEFAULT_LOCALE) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- returning to English clears the active dictionary chunk
      setLookup(new Map());
      setReady(true);
      setDictionaryVersion((current) => current + 1);
      return;
    }

    let cancelled = false;
    const cached = getLoadedDictionary(locale);
    if (cached) {
      setLookup(buildLookup(cached));
      setReady(true);
      setDictionaryVersion((current) => current + 1);
      return;
    }

    setReady(false);
    loadDictionary(locale)
      .then((dictionary) => {
        if (cancelled) return;
        setLookup(buildLookup(dictionary));
        setReady(true);
        setDictionaryVersion((current) => current + 1);
      })
      .catch(() => {
        if (cancelled) return;
        // English remains available even if a dictionary chunk cannot load.
        setLookup(new Map());
        setReady(true);
        setDictionaryVersion((current) => current + 1);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, locale]);

  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    setLocaleState(next);
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
      document.documentElement.setAttribute("data-locale", next);
    }
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures.
    }
    writeCookie(LANGUAGE_COOKIE_NAME, next);
  }, []);

  const t = useCallback(
    (text: string) => {
      if (locale === DEFAULT_LOCALE || lookup.size === 0) return text;
      return translateText(text, lookup, locale);
    },
    [locale, lookup],
  );

  const formatDate = useCallback(
    (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return String(value ?? "");
      try {
        return new Intl.DateTimeFormat(LOCALE_INTL_TAGS[locale], options).format(date);
      } catch {
        return date.toLocaleDateString();
      }
    },
    [locale],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      try {
        return new Intl.NumberFormat(LOCALE_INTL_TAGS[locale], options).format(value);
      } catch {
        return String(value);
      }
    },
    [locale],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      formatDate,
      formatNumber,
      ready,
      dictionaryVersion,
    }),
    [dictionaryVersion, formatDate, formatNumber, locale, ready, setLocale, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext) ?? FALLBACK;
}
