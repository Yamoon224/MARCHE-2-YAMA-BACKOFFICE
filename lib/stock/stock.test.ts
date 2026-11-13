import { describe, expect, it } from "vitest";
import { canRecall, daysUntil, expiryLabel, expiryTone, todayIso, validateRecallReason } from "./stock";

describe("canRecall", () => {
  it("is reserved to admin and stock keeper", () => {
    expect(canRecall("admin")).toBe(true);
    expect(canRecall("stock_keeper")).toBe(true);
    for (const role of ["picker", "buyer", "support", "courier", "order_operator", "customer"]) expect(canRecall(role)).toBe(false);
  });
});

describe("daysUntil", () => {
  it.each([
    ["2026-11-13", "2026-11-13", 0],
    ["2026-11-14", "2026-11-13", 1],
    ["2026-11-20", "2026-11-13", 7],
    ["2026-11-12", "2026-11-13", -1],
    ["2027-01-01", "2026-12-31", 1], // passage d'année
    ["2026-03-29", "2026-03-28", 1], // changement d'heure : jamais décalé
  ])("%s depuis %s -> %d", (expires, today, expected) => {
    expect(daysUntil(expires, today)).toBe(expected);
  });

  it("returns null without a usable date", () => {
    expect(daysUntil(null, "2026-11-13")).toBeNull();
    expect(daysUntil(undefined, "2026-11-13")).toBeNull();
    expect(daysUntil("pas une date", "2026-11-13")).toBeNull();
    expect(daysUntil("2026-11-13", "n'importe quoi")).toBeNull();
  });
});

describe("expiry presentation", () => {
  it("classifies urgency", () => {
    expect(expiryTone(null)).toBe("none");
    expect(expiryTone(-1)).toBe("expired");
    expect(expiryTone(0)).toBe("soon");
    expect(expiryTone(3)).toBe("soon");
    expect(expiryTone(4)).toBe("ok");
  });

  it("words the remaining time", () => {
    expect(expiryLabel(null)).toBe("Sans date limite");
    expect(expiryLabel(-2)).toBe("Périmé depuis 2 j");
    expect(expiryLabel(0)).toBe("Périme aujourd'hui");
    expect(expiryLabel(1)).toBe("Périme demain");
    expect(expiryLabel(10)).toBe("Dans 10 j");
  });
});

describe("validateRecallReason", () => {
  it("requires a real reason", () => {
    expect(validateRecallReason("")).toContain("motif");
    expect(validateRecallReason("  ab ")).toContain("motif");
    expect(validateRecallReason("Listeria détectée")).toBeNull();
  });
});

describe("todayIso", () => {
  it("formats a date as YYYY-MM-DD in UTC", () => {
    expect(todayIso(new Date("2026-11-13T23:59:59Z"))).toBe("2026-11-13");
  });
});
