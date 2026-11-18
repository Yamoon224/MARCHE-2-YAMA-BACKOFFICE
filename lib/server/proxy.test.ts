import { describe, expect, it } from "vitest";
import { buildUpstreamHeaders, isAllowedPath } from "./proxy";

describe("isAllowedPath (backoffice)", () => {
  it.each([
    "api/v1/orders", "api/v1/orders/12/transitions", "api/v1/orders/12/invoice", "api/v1/payments/3/validate-cash-on-delivery",
    "api/v1/delivery/zones", "api/v1/delivery/slots", "api/v1/fulfillment/pick-lists", "api/v1/fulfillment/pick-lists/3/lines/9/pick", "api/v1/claims", "api/v1/claims/4/decision", "api/v1/claims/4/photos/9", "api/v1/inventory/lots", "api/v1/inventory/lots/3/recall", "api/v1/accounting/trial-balance", "api/v1/products", "api/v1/catalog/media", "api/v1/catalog/recipes/3", "api/v1/auth/me",
    "api/v1/staff", "api/v1/staff/4/reactivate", "api/v1/roles", "api/v1/customers/9", "api/v1/promotions/3/activate", "api/v1/promotions/validate", "api/v1/audit/verify", "api/v1/reports/sales", "api/v1/reports/dashboard",
  ])("allows %s", (path) => {
    expect(isAllowedPath(path.split("/"))).toBe(true);
  });

  it.each([
    "api/v1/auth/login", "api/v1/auth/register", "api/v1/auth/logout", "api/v1/webhooks/payments/fake",
    "api/v1/orderss", "api/v1/catalogue", "api/v1/accounting-secret", "api/v1/fulfillments", "api/v1/staffing", "api/v1/reportsx", "api/v1/audits", "up", "",
  ])("blocks %s", (path) => {
    expect(isAllowedPath(path.split("/"))).toBe(false);
  });

  it("blocks path traversal attempts", () => {
    expect(isAllowedPath(["api", "v1", "orders", "..", "auth", "login"])).toBe(false);
    expect(isAllowedPath(["api", "v1", "orders", ".", "1"])).toBe(false);
    expect(isAllowedPath(["api", "v1", "orders\\..\\auth"])).toBe(false);
  });
});

describe("buildUpstreamHeaders (backoffice)", () => {
  it("forwards only safe headers and adds the staff token", () => {
    const headers = buildUpstreamHeaders(
      new Headers({ "Content-Type": "application/json", "Idempotency-Key": "k", Cookie: "yama_staff_token=secret", Authorization: "Bearer forged" }),
      "staff-token",
    );

    expect(headers.get("authorization")).toBe("Bearer staff-token");
    expect(headers.get("idempotency-key")).toBe("k");
    expect(headers.has("cookie")).toBe(false);
  });

  it("never lets the browser choose the Authorization header", () => {
    expect(buildUpstreamHeaders(new Headers({ Authorization: "Bearer forged" }), null).has("authorization")).toBe(false);
  });
});
