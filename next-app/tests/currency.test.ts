import { describe, expect, it } from "vitest";
import { convertAmount, formatCurrency, isCurrencyCode } from "@/lib/currency";

describe("currency formatting", () => {
  it("formats TZS amounts", () => {
    expect(formatCurrency(30, "TZS")).toBe("TSh 30");
    expect(formatCurrency("1250.5", "TZS")).toBe("TSh 1,251");
  });

  it("converts to USD with two decimals", () => {
    expect(convertAmount(1000, "USD")).toBeCloseTo(0.4, 5);
    expect(formatCurrency(1000, "USD")).toBe("$ 0.40");
  });

  it("handles missing amounts", () => {
    expect(formatCurrency(null, "TZS")).toBe("TSh 0");
    expect(formatCurrency("not-a-number", "TZS")).toBe("TSh 0");
  });

  it("validates currency codes", () => {
    expect(isCurrencyCode("TZS")).toBe(true);
    expect(isCurrencyCode("USD")).toBe(true);
    expect(isCurrencyCode("EUR")).toBe(false);
    expect(isCurrencyCode(null)).toBe(false);
  });
});
