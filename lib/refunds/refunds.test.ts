import { describe, expect, it } from "vitest";
import { canRefund, parseAmount, remainingRefundable, validateRefund } from "./refunds";

describe("canRefund", () => {
  it("is reserved to admin and support, mirroring the server", () => {
    expect(canRefund("admin")).toBe(true);
    expect(canRefund("support")).toBe(true);
    for (const role of ["order_operator", "picker", "courier", "accountant", "customer"]) expect(canRefund(role)).toBe(false);
  });
});

describe("parseAmount", () => {
  it.each([["2500", 2500], [" 2 500 ", 2500], ["1 000", 1000], ["1", 1]])("accepts %j", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(["", "0", "000", "-5", "12,5", "12.5", "abc", "1e3", "1234567890"])("rejects %j", (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

describe("validateRefund", () => {
  it("accepts a valid refund within the refundable amount", () => {
    expect(validateRefund("1000", "Produit abîmé", 5000)).toBeNull();
    expect(validateRefund("5000", "Tout le solde", 5000)).toBeNull();
    expect(validateRefund("1000", "Produit abîmé", null)).toBeNull();
  });

  it.each([
    ["", "Motif valide", 5000, "montant entier"],
    ["abc", "Motif valide", 5000, "montant entier"],
    ["1000", "", 5000, "motif"],
    ["1000", "ab", 5000, "motif"],
    ["5001", "Motif valide", 5000, "dépasse"],
  ])("rejects amount=%j reason=%j", (amount, reason, refundable, keyword) => {
    expect(validateRefund(amount, reason, refundable)).toContain(keyword);
  });
});

describe("remainingRefundable", () => {
  it("subtracts succeeded and pending refunds but not failed ones", () => {
    const refunds = [
      { amount_minor: 3000, status: "succeeded" },
      { amount_minor: 1000, status: "pending" },
      { amount_minor: 4000, status: "failed" },
    ];

    expect(remainingRefundable(10_000, refunds)).toBe(6000);
    expect(remainingRefundable(10_000, [])).toBe(10_000);
    expect(remainingRefundable(2000, [{ amount_minor: 5000, status: "succeeded" }])).toBe(0);
  });
});
