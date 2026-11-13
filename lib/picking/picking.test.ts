import { describe, expect, it } from "vitest";
import {
  canComplete, describeAdjustment, formatQuantity, parseQuantity, pendingCount, unitSuffix, validateQuantity,
  type PickLine,
} from "./picking";

const weighed = { sale_unit: "kg" as const, max_quantity: 1650 };

describe("parseQuantity", () => {
  it.each([["1200", 1200], [" 12 ", 12], ["0", 0]])("accepts %j", (input, expected) => {
    expect(parseQuantity(input)).toBe(expected);
  });

  it.each(["", "  ", "1,5", "1.5", "-3", "abc", "12g", "99999999", "1e3"])("rejects %j", (input) => {
    expect(parseQuantity(input)).toBeNull();
  });
});

describe("validateQuantity", () => {
  it("accepts a quantity up to the ceiling and refuses above it", () => {
    expect(validateQuantity(weighed, "1650")).toBeNull();
    expect(validateQuantity(weighed, "0")).toBeNull();
    expect(validateQuantity(weighed, "1651")).toContain("1,65 kg");
  });

  it("explains an invalid input", () => {
    expect(validateQuantity(weighed, "1,5")).toContain("nombre entier");
  });
});

describe("formatting", () => {
  it.each([
    ["piece", 1, "1 pièce"], ["piece", 3, "3 pièces"], ["kg", 750, "750 g"], ["kg", 1500, "1,5 kg"],
    ["l", 500, "500 ml"], ["l", 2000, "2 l"],
  ] as const)("%s %d -> %s", (unit, quantity, expected) => {
    expect(formatQuantity(unit, quantity)).toBe(expected);
  });

  it("gives the input unit", () => {
    expect(unitSuffix("piece")).toBe("pièce(s)");
    expect(unitSuffix("kg")).toBe("g");
    expect(unitSuffix("l")).toBe("ml");
  });
});

describe("completion", () => {
  const line = (status: PickLine["status"]) => ({ status });

  it("is possible only when nothing is left to handle", () => {
    expect(canComplete([line("picked"), line("short"), line("substituted")])).toBe(true);
    expect(canComplete([line("picked"), line("pending")])).toBe(false);
    expect(canComplete([])).toBe(false);
    expect(pendingCount([line("pending"), line("pending"), line("picked")])).toBe(2);
  });
});

describe("describeAdjustment", () => {
  const fmt = (n: number) => `${n} F CFA`;

  it("tells whether to refund, collect or nothing", () => {
    expect(describeAdjustment(-270, fmt)).toBe("Écart de 270 F CFA à rembourser au client.");
    expect(describeAdjustment(90, fmt)).toBe("Écart de 90 F CFA à encaisser auprès du client.");
    expect(describeAdjustment(0, fmt)).toContain("Aucun écart");
  });
});
