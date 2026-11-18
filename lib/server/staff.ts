import "server-only";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/format";
import { landingFor } from "@/lib/navigation";
import { serverApi } from "./backend";

export type Staff = { id: number; name: string; role: string };

export type StaffContext =
  | { status: "ok"; user: Staff; api: Awaited<ReturnType<typeof serverApi>> }
  | { status: "down" };

/**
 * Barrière d'accès des pages : sans session valide de personnel, retour à la connexion.
 * Les droits fins restent imposés par l'API (403) ; ici on évite seulement d'afficher une coquille vide.
 */
export async function requireStaff(next: string): Promise<StaffContext> {
  const api = await serverApi();
  const result = await api.GET("/api/v1/auth/me").catch(() => null);

  if (!result) return { status: "down" };

  const user = result.data?.data;
  if (result.response.status === 401 || !user || user.role === "customer") {
    redirect(`/?next=${encodeURIComponent(next)}`);
  }

  return { status: "ok", user: user as Staff, api };
}

/** Page de connexion : une session de personnel déjà ouverte renvoie directement vers la page voulue. */
export async function redirectIfSignedIn(requested?: string): Promise<void> {
  const api = await serverApi();
  const result = await api.GET("/api/v1/auth/me").catch(() => null);
  const user = result?.data?.data;

  if (result?.response.ok && user && user.role !== "customer") redirect(requested ? safeNext(requested) : landingFor(user.role));
}
