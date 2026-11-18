import "server-only";
import { NextResponse } from "next/server";
import { BACKEND_URL } from "./backend";

const FIELDS = {
  "forgot-password": ["email"],
  "reset-password": ["token", "email", "password", "password_confirmation"],
} as const;

/**
 * Relaie une demande de mot de passe oublié ou de réinitialisation vers l'API. Ces routes d'authentification
 * ne passent volontairement pas par le relais général : seuls les champs attendus sont transmis, et aucun jeton
 * de session n'est ni lu ni renvoyé.
 */
export async function relayPasswordRequest(action: keyof typeof FIELDS, request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ message: "Requête invalide." }, { status: 400 });

  const payload = Object.fromEntries(FIELDS[action].map((field) => [field, (body as Record<string, unknown>)[field]]));

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/v1/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Service momentanément indisponible." }, { status: 503 });
  }

  const result = (await upstream.json().catch(() => null)) as { message?: string; errors?: unknown } | null;

  return NextResponse.json({ message: result?.message, errors: result?.errors }, { status: upstream.status });
}
