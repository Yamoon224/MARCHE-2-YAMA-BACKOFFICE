import { describe, expect, it } from "vitest";
import {
  ACTION_LABEL, availableActions, canTransition, isHandledByDelivery, isTerminal, navFor, requiresReason, STATUS_LABEL, STATUSES, TRANSITIONS,
} from "./status";

describe("status tables", () => {
  it("covers the 17 backend statuses consistently", () => {
    expect(STATUSES).toHaveLength(17);
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...STATUSES].sort());

    for (const targets of Object.values(TRANSITIONS)) {
      for (const target of targets) expect(STATUS_LABEL[target], target).toBeTruthy();
    }
  });

  it("has a button label for every reachable status", () => {
    const reachable = new Set(Object.values(TRANSITIONS).flat());
    for (const status of reachable) expect(ACTION_LABEL[status], status).toBeTruthy();
  });

  it("counts the 28 transitions of the specification", () => {
    expect(Object.values(TRANSITIONS).flat()).toHaveLength(28);
  });

  it("never allows a transition to the same status", () => {
    for (const [from, targets] of Object.entries(TRANSITIONS)) expect(targets).not.toContain(from);
  });

  it("has no way out of terminal states", () => {
    for (const status of ["completed", "refunded", "returned", "cancelled"]) expect(isTerminal(status)).toBe(true);
    expect(isTerminal("paid")).toBe(false);
  });

  it("forbids cancelling once the courier has the order", () => {
    for (const status of ["assigned", "out_for_delivery", "delivered", "completed"]) {
      expect(TRANSITIONS[status]).not.toContain("cancelled");
    }
  });

  it("requires a reason for cancellation, claim, delivery failure and return only", () => {
    for (const status of ["cancelled", "claim", "delivery_failed", "returned"]) expect(requiresReason(status)).toBe(true);
    for (const status of ["confirmed", "paid", "delivered"]) expect(requiresReason(status)).toBe(false);
  });
});

describe("role permissions (mirror of the server rules)", () => {
  it("lets managers do everything", () => {
    for (const role of ["admin", "order_operator"]) {
      for (const to of STATUSES) expect(canTransition(role, to)).toBe(true);
    }
  });

  it("restricts pickers to preparation and couriers to delivery", () => {
    expect(availableActions("picker", "confirmed")).toEqual(["preparing"]);
    expect(availableActions("picker", "paid")).toEqual([]);

    expect(availableActions("courier", "assigned")).toEqual(["out_for_delivery"]);
    expect(availableActions("courier", "out_for_delivery")).toEqual(["delivered", "delivery_failed"]);
    expect(availableActions("courier", "confirmed")).toEqual([]);
  });

  it("never offers 'ready' from preparation: it comes from completing the pick list", () => {
    for (const role of ["admin", "order_operator", "picker"]) {
      expect(availableActions(role, "preparing")).not.toContain("ready");
    }
    expect(availableActions("admin", "preparing")).toEqual(["cancelled"]);
  });

  it("leaves the delivery stages of a home delivery to the dispatch and courier screens", () => {
    expect(availableActions("admin", "ready", "delivery")).toEqual([]);
    expect(availableActions("admin", "out_for_delivery", "delivery")).toEqual([]);
    expect(availableActions("courier", "assigned", "delivery")).toEqual([]);

    // retrait en magasin : « prête » -> « retirée » reste possible ici
    expect(availableActions("admin", "ready", "pickup")).toEqual(["assigned", "delivered"]);
    expect(isHandledByDelivery("delivered", "pickup")).toBe(false);
    expect(isHandledByDelivery("confirmed", "delivery")).toBe(false);
  });

  it("gives read-only roles no action", () => {
    for (const role of ["support", "accountant", "buyer", "customer"]) {
      for (const status of STATUSES) expect(availableActions(role, status)).toEqual([]);
    }
  });
});

describe("navFor", () => {
  it("shows sections according to the role", () => {
    expect(navFor("admin").map((i) => i.href)).toEqual(["/dashboard", "/orders", "/preparation", "/stock", "/claims", "/dispatch", "/delivery", "/cash-handover", "/catalog", "/accounting", "/reports", "/customers", "/promotions", "/staff", "/audit"]);
    expect(navFor("support").map((i) => i.href)).toEqual(["/orders", "/claims", "/customers"]);
    expect(navFor("stock_keeper").map((i) => i.href)).toEqual(["/stock"]);
    expect(navFor("order_operator").map((i) => i.href)).toEqual(["/dashboard", "/orders", "/preparation", "/dispatch", "/delivery", "/cash-handover", "/reports", "/customers"]);
    expect(navFor("courier").map((i) => i.href)).toEqual(["/my-route"]);
    expect(navFor("accountant").map((i) => i.href)).toEqual(["/dashboard", "/orders", "/accounting", "/reports"])
    expect(navFor("marketing").map((i) => i.href)).toEqual(["/promotions"]);
    expect(navFor("picker").map((i) => i.href)).toEqual(["/preparation", "/stock"]);
    expect(navFor("customer")).toEqual([]);
  });
});
