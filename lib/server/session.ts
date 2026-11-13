import "server-only";
import { NextResponse } from "next/server";
import { BACKEND_URL, clearToken, getToken, setToken } from "./backend";

type StaffUser = { id: number; name: string; role: string };

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function revoke(token: string): Promise<unknown> {
  return fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);
}

/**
 * Connexion réservée au personnel : un compte client est refusé et son jeton révoqué aussitôt,
 * pour qu'il ne reste aucun jeton valide émis par le backoffice. Le jeton n'est jamais renvoyé au navigateur.
 */
export async function startStaffSession(request: Request): Promise<NextResponse> {
  const body = await readJson(request);
  if (!body) return NextResponse.json({ message: "Requête invalide." }, { status: 400 });

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ login: body.login, password: body.password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Service momentanément indisponible." }, { status: 503 });
  }

  const payload = (await upstream.json().catch(() => null)) as { token?: string; user?: StaffUser; message?: string; errors?: unknown } | null;

  if (!upstream.ok || !payload?.token || !payload.user) {
    return NextResponse.json({ message: payload?.message ?? "Identifiants incorrects.", errors: payload?.errors }, { status: upstream.ok ? 502 : upstream.status });
  }

  if (payload.user.role === "customer") {
    await revoke(payload.token);
    return NextResponse.json({ message: "Accès réservé à l'équipe Marché de Yama." }, { status: 403 });
  }

  await setToken(payload.token);

  return NextResponse.json({ user: payload.user });
}

export async function currentStaff(): Promise<NextResponse> {
  const token = await getToken();
  if (!token) return NextResponse.json({ user: null });

  const upstream = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) return NextResponse.json({ user: null }, { status: 503 });

  if (upstream.status === 401) {
    await clearToken();
    return NextResponse.json({ user: null });
  }

  const payload = (await upstream.json().catch(() => null)) as { data?: StaffUser } | null;

  // Un compte devenu client (rôle retiré) perd l'accès immédiatement.
  if (!payload?.data || payload.data.role === "customer") {
    await clearToken();
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: payload.data });
}

export async function endStaffSession(): Promise<NextResponse> {
  const token = await getToken();
  if (token) await revoke(token);
  await clearToken();

  return new NextResponse(null, { status: 204 });
}
