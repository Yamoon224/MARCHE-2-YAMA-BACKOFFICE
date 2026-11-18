import { describe, expect, it } from "vitest";
import { addressLines, DELIVERY_STATUS_LABEL, label, PAYMENT_STATUS_LABEL } from "./details";

describe("addressLines", () => {
  it("lists neighborhood, landmark and coordinates", () => {
    expect(addressLines({ neighborhood: "Kaloum", landmark: "Près du marché", latitude: 9.5092, longitude: -13.7122 })).toEqual([
      "Kaloum", "Repère : Près du marché", "GPS : 9.50920, -13.71220",
    ]);
  });

  it("ignores missing or blank parts", () => {
    expect(addressLines({ neighborhood: "  ", landmark: null })).toEqual([]);
    expect(addressLines(null)).toEqual([]);
    expect(addressLines("Kaloum")).toEqual([]);
  });
});

describe("label", () => {
  it("falls back to the raw key, and to a dash when empty", () => {
    expect(label(PAYMENT_STATUS_LABEL, "succeeded")).toBe("Payé");
    expect(label(DELIVERY_STATUS_LABEL, "unknown")).toBe("unknown");
    expect(label(DELIVERY_STATUS_LABEL, null)).toBe("-");
  });
});
