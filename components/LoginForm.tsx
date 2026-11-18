"use client";

import { Btn } from "@/components/Btn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { extractApiError, safeNext } from "@/lib/format";
import { landingFor } from "@/lib/navigation";

export const FIELD = "mt-1 w-full rounded-lg border border-black/20 bg-white px-3 py-2 outline-none focus:border-brand-green";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: String(data.get("login") ?? "").trim(), password: data.get("password") }),
      });

      if (!response.ok) {
        setError(extractApiError(await response.json().catch(() => null), "Connexion impossible."));
        return;
      }

      const body = (await response.json().catch(() => null)) as { user?: { role?: string } } | null;
      // Page demandée si elle existe, sinon la page d'arrivée du rôle.
      router.push(next ? safeNext(next) : landingFor(body?.user?.role ?? ""));
      router.refresh();
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <h1 className="text-center text-2xl font-bold">Connexion équipe</h1>

      <label className="text-sm font-medium">
        E-mail ou téléphone
        <input name="login" required autoComplete="username" placeholder="E-mail ou téléphone" className={FIELD} />
      </label>

      <label className="text-sm font-medium">
        <span className="flex items-baseline justify-between">
          Mot de passe
          <Link href="/forgot-password" className="text-xs font-normal text-brand-green underline">Mot de passe oublié ?</Link>
        </span>
        <PasswordInput name="password" required autoComplete="current-password" placeholder="Votre mot de passe" className={FIELD} />
      </label>

      {error && <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">{error}</p>}

      <Btn type="submit" action="login" disabled={busy} className="rounded-full bg-brand-red py-2.5 font-medium text-white disabled:opacity-60">
        {busy ? "Patientez…" : "Se connecter"}
      </Btn>
    </form>
  );
}
