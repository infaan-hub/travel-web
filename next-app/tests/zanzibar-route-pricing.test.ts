import { describe, expect, it } from "vitest";
import {
  DEFAULT_ZANZIBAR_ROUTE_PRICES,
  USD_TO_TZS_RATE,
  normalizeRoutePlaceKey,
  resolveRoutePriceQuote,
  tzsToUsd,
  usdToTzs,
} from "@/lib/zanzibar-route-pricing";

describe("Zanzibar route pricing catalog & algorithm", () => {
  it("contains all 100 numbered Zanzibar routes across 10 hubs", () => {
    expect(DEFAULT_ZANZIBAR_ROUTE_PRICES).toHaveLength(100);
    const numbers = DEFAULT_ZANZIBAR_ROUTE_PRICES.map((r) => r.no);
    expect(numbers[0]).toBe(1);
    expect(numbers[99]).toBe(100);
    expect(new Set(DEFAULT_ZANZIBAR_ROUTE_PRICES.map((r) => r.group)).size).toBe(10);
  });

  it("matches all USD to TSh conversions at $1 = TSh 2,600", () => {
    expect(USD_TO_TZS_RATE).toBe(2600);
    expect(usdToTzs(20)).toBe(52000);
    expect(usdToTzs(35)).toBe(91000);
    expect(usdToTzs(45)).toBe(117000);
    expect(usdToTzs(60)).toBe(156000);
    expect(usdToTzs(70)).toBe(182000);
    expect(usdToTzs(95)).toBe(247000);
    expect(usdToTzs(100)).toBe(260000);
    expect(usdToTzs(150)).toBe(390000);
    expect(usdToTzs(160)).toBe(416000);
    expect(tzsToUsd(117000)).toBe(45);
  });

  it("normalizes airport and landmark names to exact catalog quotes", () => {
    expect(normalizeRoutePlaceKey("Abeid Amani Karume International Airport (ZNZ)")).toBe("airport");
    expect(normalizeRoutePlaceKey("Jozani Chwaka Bay National Park")).toBe("jozani forest");

    const quote = resolveRoutePriceQuote({
      origin: "Abeid Amani Karume International Airport (ZNZ)",
      destination: "Stone Town, Zanzibar",
    });
    expect(quote.matched).toBe(true);
    expect(quote.source).toBe("standard");
    expect(quote.oneWayUsd).toBe(20);
    expect(quote.waitReturnUsd).toBe(35);
    expect(quote.fullDayUsd).toBe(100);
    expect(quote.oneWayTzs).toBe(52000);
    expect(quote.waitReturnTzs).toBe(91000);
    expect(quote.fullDayTzs).toBe(260000);
  });

  it("prefers custom company/driver prices over standard defaults", () => {
    const quote = resolveRoutePriceQuote({
      origin: "Airport",
      destination: "Nungwi",
      customPrices: [
        {
          origin: "Airport",
          destination: "Nungwi",
          oneWayUsd: 55,
          waitReturnUsd: 90,
          fullDayUsd: 155,
        },
      ],
    });
    expect(quote.matched).toBe(true);
    expect(quote.source).toBe("custom");
    expect(quote.oneWayUsd).toBe(55);
    expect(quote.waitReturnUsd).toBe(90);
    expect(quote.fullDayUsd).toBe(155);
    expect(quote.oneWayTzs).toBe(143000);
  });

  it("estimates non-catalog routes cleanly from route distance", () => {
    const quote = resolveRoutePriceQuote({
      origin: "Bububu Village",
      destination: "Kiboje",
      distanceKm: 30,
    });
    expect(quote.matched).toBe(false);
    expect(quote.source).toBe("distance_estimate");
    expect(quote.oneWayUsd).toBe(35);
    expect(quote.waitReturnUsd).toBe(60);
    expect(quote.fullDayUsd).toBe(120);
  });
});
