import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://marche-2-yama.test";

type ClientOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
  getToken?: () => string | null;
};

/** Client typé généré depuis l'OpenAPI du backend (`npm run api:generate`), avec jeton Sanctum optionnel. */
export function createApiClient({ baseUrl = API_BASE_URL, fetch, headers, getToken }: ClientOptions = {}) {
  const client = createClient<paths>({ baseUrl, fetch, headers });

  const bearer: Middleware = {
    onRequest({ request }) {
      const token = getToken?.();
      if (token) request.headers.set("Authorization", `Bearer ${token}`);
      return request;
    },
  };
  client.use(bearer);

  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;

/**
 * Client utilisé dans le navigateur : il passe par le relais `/api/backend` du backoffice,
 * qui ajoute le jeton du cookie httpOnly. Le navigateur ne manipule jamais le jeton.
 */
export function browserApi(fetchImpl?: typeof fetch): ApiClient {
  return createApiClient({ baseUrl: "/api/backend", fetch: fetchImpl });
}
