/**
 * Currency helpers. Prices are stored in TZS; the display currency is a
 * client preference persisted in localStorage.
 */
export const CURRENCIES = {
  TZS: { code: "TZS", symbol: "TSh", rate: 1 },
  USD: { code: "USD", symbol: "$", rate: 0.0004 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export function isCurrencyCode(value: string | null | undefined): value is CurrencyCode {
  return Boolean(value && value in CURRENCIES);
}

export function convertAmount(amount: number, currency: CurrencyCode): number {
  return amount * CURRENCIES[currency].rate;
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: CurrencyCode = "TZS",
): string {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  if (!Number.isFinite(value)) return `${CURRENCIES[currency].symbol} 0`;
  const converted = convertAmount(value, currency);
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: currency === "USD" ? 2 : 0,
    minimumFractionDigits: currency === "USD" ? 2 : 0,
  }).format(converted);
  return `${CURRENCIES[currency].symbol} ${formatted}`;
}
