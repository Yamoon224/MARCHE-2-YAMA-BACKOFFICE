import "server-only";
import { cookies } from "next/headers";
import { createApiClient } from "@/lib/api/client";

/** Adresse de l'API Laravel, lue côté serveur uniquement. */
export const BACKEND_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://marche-2-yama.test";

/**
 * Nom distinct de celui de la vitrine : les cookies sont partagés entre ports d'un même hôte
 * (localhost), et une session client ne doit jamais ouvrir le backoffice.
 */
export const TOKEN_COOKIE = "yama_staff_token";

/** Sessions du personnel courtes : 12 heures. */
const SESSION_SECONDS = 60 * 60 * 12;

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(TOKEN_COOKIE)?.value ?? null;
}

export async function setToken(token: string): Promise<void> {
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearToken(): Promise<void> {
  (await cookies()).delete(TOKEN_COOKIE);
}

/** Client typé côté serveur, authentifié par le cookie de session s'il existe. */
export async function serverApi() {
  const token = await getToken();
  return createApiClient({
    baseUrl: BACKEND_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}
