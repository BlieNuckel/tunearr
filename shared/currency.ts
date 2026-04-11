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
