import { describe, expect, it } from "vitest";
import { createApiClient } from "./client";

/** Faux `fetch` qui mémorise les requêtes reçues. */
function recordingFetch() {
  const requests: Request[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    requests.push(input as Request);
    return Response.json({ data: { id: 1, name: "Admin", role: "admin" } });
  }) as typeof fetch;

  return { requests, impl };
}

describe("createApiClient", () => {
  it("ajoute le jeton Bearer quand il existe", async () => {
    const { requests, impl } = recordingFetch();
    const api = createApiClient({ baseUrl: "http://api.test", fetch: impl, getToken: () => "abc123" });

    await api.GET("/api/v1/auth/me");

    expect(requests[0].url).toBe("http://api.test/api/v1/auth/me");
    expect(requests[0].headers.get("Authorization")).toBe("Bearer abc123");
  });

  it("n'envoie pas d'en-tête Authorization sans jeton", async () => {
    const { requests, impl } = recordingFetch();
    const api = createApiClient({ baseUrl: "http://api.test", fetch: impl, getToken: () => null });

    await api.GET("/api/v1/auth/me");

    expect(requests[0].headers.has("Authorization")).toBe(false);
  });
});
