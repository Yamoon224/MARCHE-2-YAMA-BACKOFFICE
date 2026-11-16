"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { extractApiError, safeNext } from "@/lib/format";

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

      router.push(safeNext(next));
      router.refresh();
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 w-full rounded-lg border border-black/20 bg-white px-3 py-2 outline-none focus:border-brand-green";

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-sm flex-col gap-4 rounded-xl border border-black/10 bg-white p-6" noValidate>
      <h1 className="text-2xl font-bold">Connexion équipe</h1>

      <label className="text-sm font-medium">
        E-mail ou téléphone
        <input name="login" required autoComplete="username" placeholder="E-mail ou téléphone" className={field} />
      </label>

      <label className="text-sm font-medium">
        Mot de passe
        <PasswordInput name="password" required autoComplete="current-password" placeholder="Votre mot de passe" className={field} />
      </label>

      {error && <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">{error}</p>}

      <button type="submit" disabled={busy} className="rounded-full bg-brand-red py-2.5 font-medium text-white disabled:opacity-60">
        {busy ? "Patientez…" : "Se connecter"}
      </button>
    </form>
  );
}
