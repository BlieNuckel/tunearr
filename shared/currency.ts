/** A user's spending setup. Purchases keep their own currency; the summary totals only those in this one. */
export type SpendingSettings = {
  /** ISO 4217 code. */
  currency: string;
  /** Soft budget in minor units of `currency`. Null means no limit. */
  monthlyLimit: number | null;
};

export function getMinorUnitExponent(currency: string): number {
  const { minimumFractionDigits } = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions();
  return minimumFractionDigits ?? 2;
}

export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * 10 ** getMinorUnitExponent(currency));
}

export function toMajorUnits(minorUnits: number, currency: string): number {
  return minorUnits / 10 ** getMinorUnitExponent(currency);
}

export function formatCurrency(
  minorUnits: number,
  currency: string,
  locale = "en"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(toMajorUnits(minorUnits, currency));
}

export const COMMON_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "KRW", name: "South Korean Won" },
  { code: "INR", name: "Indian Rupee" },
  { code: "ZAR", name: "South African Rand" },
] as const;

export type CurrencyCode = (typeof COMMON_CURRENCIES)[number]["code"];

/**
 * Spotify Individual plan prices in major units by currency.
 * Source: spotify.com/premium regional pricing pages (as of early 2025).
 * Used for "equivalent to X months of Spotify" comparison.
 */
export const SPOTIFY_MONTHLY_PRICE: Partial<Record<string, number>> = {
  USD: 11.99,
  EUR: 10.99,
  GBP: 10.99,
  JPY: 980,
  CAD: 11.99,
  AUD: 13.99,
  CHF: 14.99,
  SEK: 119,
  NOK: 119,
  DKK: 79,
  PLN: 23.99,
  CZK: 169,
  NZD: 16.99,
  BRL: 21.9,
  MXN: 149,
  KRW: 10900,
  INR: 119,
  ZAR: 79.99,
};

export function getSpotifyMonthlyMinor(currency: string): number | null {
  const price = SPOTIFY_MONTHLY_PRICE[currency];
  if (price === undefined) return null;
  return toMinorUnits(price, currency);
}

/** What a user starts with before picking their own. */
export const DEFAULT_SPENDING: SpendingSettings = {
  currency: "USD",
  monthlyLimit: null,
};

/** Why a spending change can't be saved, or null when it can. Absent fields are left as they are. */
export function spendingSettingsError(
  patch: Partial<SpendingSettings>
): string | null {
  if (
    patch.currency !== undefined &&
    (typeof patch.currency !== "string" || !/^[A-Z]{3}$/.test(patch.currency))
  ) {
    return "currency must be a 3-letter ISO 4217 code";
  }
  if (
    patch.monthlyLimit !== undefined &&
    patch.monthlyLimit !== null &&
    (typeof patch.monthlyLimit !== "number" ||
      !Number.isInteger(patch.monthlyLimit) ||
      patch.monthlyLimit < 0)
  ) {
    return "monthlyLimit must be a non-negative integer or null";
  }
  return null;
}
