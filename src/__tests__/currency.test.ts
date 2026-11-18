import {
  getMinorUnitExponent,
  toMinorUnits,
  toMajorUnits,
  formatCurrency,
  getSpotifyMonthlyMinor,
  spendingSettingsError,
} from "@shared/currency";

describe("getMinorUnitExponent", () => {
  it("returns 2 for USD", () => {
    expect(getMinorUnitExponent("USD")).toBe(2);
  });

  it("returns 0 for JPY", () => {
    expect(getMinorUnitExponent("JPY")).toBe(0);
  });

  it("returns 2 for EUR", () => {
    expect(getMinorUnitExponent("EUR")).toBe(2);
  });
});

describe("toMinorUnits", () => {
  it("converts USD amount to cents", () => {
    expect(toMinorUnits(9.99, "USD")).toBe(999);
  });

  it("converts JPY amount (no decimals)", () => {
    expect(toMinorUnits(1000, "JPY")).toBe(1000);
  });

  it("rounds to nearest minor unit", () => {
    expect(toMinorUnits(10.005, "USD")).toBe(1001);
  });
});

describe("toMajorUnits", () => {
  it("converts cents to USD", () => {
    expect(toMajorUnits(999, "USD")).toBe(9.99);
  });

  it("converts JPY minor units (identity)", () => {
    expect(toMajorUnits(1000, "JPY")).toBe(1000);
  });
});

describe("formatCurrency", () => {
  it("formats USD", () => {
    expect(formatCurrency(999, "USD")).toBe("$9.99");
  });

  it("formats JPY", () => {
    const formatted = formatCurrency(1000, "JPY");
    expect(formatted).toContain("1,000");
  });

  it("formats zero", () => {
    expect(formatCurrency(0, "USD")).toBe("$0.00");
  });
});

describe("getSpotifyMonthlyMinor", () => {
  it("returns minor units for USD", () => {
    expect(getSpotifyMonthlyMinor("USD")).toBe(1199);
  });

  it("returns minor units for JPY (zero-decimal)", () => {
    expect(getSpotifyMonthlyMinor("JPY")).toBe(980);
  });

  it("returns minor units for SEK", () => {
    expect(getSpotifyMonthlyMinor("SEK")).toBe(11900);
  });

  it("returns null for unsupported currency", () => {
    expect(getSpotifyMonthlyMinor("XYZ")).toBeNull();
  });
});

describe("spendingSettingsError", () => {
  const unset = { currency: null, monthlyLimit: null };
  const usd = { currency: "USD", monthlyLimit: null };

  it("accepts a first currency, with or without a limit", () => {
    expect(spendingSettingsError({ currency: "SEK" }, unset)).toBeNull();
    expect(
      spendingSettingsError({ currency: "SEK", monthlyLimit: 50000 }, unset)
    ).toBeNull();
  });

  it("accepts an empty patch and a cleared limit", () => {
    expect(spendingSettingsError({}, unset)).toBeNull();
    expect(spendingSettingsError({ monthlyLimit: null }, usd)).toBeNull();
  });

  it("accepts a limit once a currency is chosen", () => {
    expect(spendingSettingsError({ monthlyLimit: 5000 }, usd)).toBeNull();
  });

  it("rejects a limit before a currency is chosen", () => {
    expect(spendingSettingsError({ monthlyLimit: 5000 }, unset)).toBe(
      "Choose a currency before setting a limit"
    );
  });

  it("rejects clearing the currency", () => {
    expect(spendingSettingsError({ currency: null }, usd)).toBe(
      "currency must be a 3-letter ISO 4217 code"
    );
  });

  it("rejects a currency that isn't three upper-case letters", () => {
    for (const currency of ["usd", "EURO", "", "U$D"]) {
      expect(spendingSettingsError({ currency }, usd)).toBe(
        "currency must be a 3-letter ISO 4217 code"
      );
    }
  });

  it("rejects a negative or fractional limit", () => {
    for (const monthlyLimit of [-1, 1.5, Number.NaN]) {
      expect(spendingSettingsError({ monthlyLimit }, usd)).toBe(
        "monthlyLimit must be a non-negative integer or null"
      );
    }
  });
});
