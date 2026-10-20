"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isCurrencyCode, type CurrencyCode } from "@/lib/currency";

const STORAGE_KEY = "infaan_currency";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  toggleCurrency: () => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === "undefined") return "TZS";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isCurrencyCode(stored) ? stored : "TZS";
  });

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrencyState((current) => {
      const next: CurrencyCode = current === "TZS" ? "USD" : "TZS";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ currency, setCurrency, toggleCurrency }),
    [currency, setCurrency, toggleCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    return { currency: "TZS", setCurrency: () => {}, toggleCurrency: () => {} };
  }
  return context;
}
