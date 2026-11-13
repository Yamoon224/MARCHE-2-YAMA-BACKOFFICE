import { describe, expect, it } from "vitest";
import { buildDecisionBody, canDecideClaims, initialDecision, parseAmount, validateDecision, type DecisionDraft } from "./claims";

const accept = (over: Partial<DecisionDraft> = {}): DecisionDraft => ({
  decision: "accept", resolution: "refund", costBearer: "supplier", amount: "1500", note: "Briques percées", ...over,
});

describe("canDecideClaims", () => {
  it("is reserved to admin and support", () => {
    expect(canDecideClaims("admin")).toBe(true);
    expect(canDecideClaims("support")).toBe(true);
    for (const role of ["order_operator", "picker", "courier", "accountant", "stock_keeper", "customer"]) expect(canDecideClaims(role)).toBe(false);
  });
});

describe("parseAmount", () => {
  it.each([["1500", 1500], [" 1 500 ", 1500], ["1 500", 1500], ["1", 1]])("accepts %j", (input, expected) => expect(parseAmount(input)).toBe(expected));
  it.each(["", "0", "-5", "12,5", "12.5", "abc", "1e3", "1234567890"])("rejects %j", (input) => expect(parseAmount(input)).toBeNull());
});

describe("validateDecision", () => {
  const ceiling = 2000;

  it("accepts a valid refund up to the ceiling", () => {
    expect(validateDecision(accept(), ceiling)).toBeNull();
    expect(validateDecision(accept({ amount: "2000" }), ceiling)).toBeNull();
  });

  it("refuses a refund above the ceiling", () => {
    expect(validateDecision(accept({ amount: "2001" }), ceiling)).toContain("dépasser");
  });

  it("always requires a reason, even to reject", () => {
    expect(validateDecision(accept({ note: "" }), ceiling)).toContain("Motivez");
    expect(validateDecision(accept({ decision: "reject", note: "ab" }), ceiling)).toContain("Motivez");
    expect(validateDecision(accept({ decision: "reject", note: "Photo d'un autre produit" }), ceiling)).toBeNull();
  });

  it("requires a cost bearer to accept, but not to reject", () => {
    expect(validateDecision(accept({ costBearer: "" }), ceiling)).toContain("imputer");
    expect(validateDecision(accept({ decision: "reject", costBearer: "" }), ceiling)).toBeNull();
  });

  it("needs a valid amount only for a refund, not for a new shipment", () => {
    expect(validateDecision(accept({ amount: "abc" }), ceiling)).toContain("montant");
    expect(validateDecision(accept({ resolution: "redelivery", amount: "" }), ceiling)).toBeNull();
  });
});

describe("buildDecisionBody", () => {
  it("sends only a note for a rejection", () => {
    expect(buildDecisionBody(accept({ decision: "reject", note: " Refusée " }))).toEqual({ decision: "reject", note: "Refusée" });
  });

  it("sends the amount for a refund and none for a new shipment", () => {
    expect(buildDecisionBody(accept({ amount: " 1 500 " }))).toEqual({ decision: "accept", note: "Briques percées", resolution: "refund", cost_bearer: "supplier", amount_minor: 1500 });
    expect(buildDecisionBody(accept({ resolution: "redelivery" }))).toEqual({ decision: "accept", note: "Briques percées", resolution: "redelivery", cost_bearer: "supplier" });
  });
});

describe("initialDecision", () => {
  it("proposes to refund the full value of the claimed items, with no cost bearer chosen for the agent", () => {
    expect(initialDecision(2000)).toEqual({ decision: "accept", resolution: "refund", costBearer: "", amount: "2000", note: "" });
  });
});
