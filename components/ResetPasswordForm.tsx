"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FIELD } from "@/components/LoginForm";
import { PasswordInput } from "@/components/PasswordInput";
import { extractApiError } from "@/lib/format";
import { PASSWORD_PROBLEM_TEXT, passwordProblem } from "@/lib/password";

/** Étape 2 : la page qu'ouvre le lien reçu par e-mail (jeton et adresse sont dans l'URL). */
export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setExpired(false);

    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    const problem = passwordProblem(password, confirmation);

    if (problem) {
      setError(PASSWORD_PROBLEM_TEXT[problem]);
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/session/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password, password_confirmation: confirmation }),
      });

      if (response.ok) {
        setDone(true);
        return;
      }

      const body = await response.json().catch(() => null);
      setExpired(response.status === 422 && !body?.errors);
      setError(extractApiError(body, "Le mot de passe n'a pas pu être changé. Réessayez."));
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center text-2xl font-bold">Nouveau mot de passe</h1>

      {done ? (
        <div role="status" className="flex flex-col gap-4 text-sm">
          <p className="rounded-lg bg-brand-green/10 p-4">Votre mot de passe a été changé. Vous pouvez maintenant vous connecter.</p>
          <Link href="/" className="rounded-full bg-brand-red py-2.5 text-center font-medium text-white">Se connecter</Link>
        </div>
      ) : token === "" || email === "" ? (
        <div className="flex flex-col gap-3 text-sm text-black/70">
          <p>Ce lien est incomplet. Utilisez le lien reçu par e-mail, ou demandez-en un nouveau.</p>
          <Link href="/forgot-password" className="text-brand-green underline">Demander un nouveau lien</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-black/70">{email}</p>

          <label className="text-sm font-medium">
            Nouveau mot de passe
            <PasswordInput name="password" required minLength={8} autoComplete="new-password" className={FIELD} />
            <span className="mt-1 block text-xs font-normal text-black/60">8 caractères minimum, avec au moins une lettre et un chiffre.</span>
          </label>

          <label className="text-sm font-medium">
            Confirmer le mot de passe
            <PasswordInput name="confirmation" required minLength={8} autoComplete="new-password" className={FIELD} />
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">
              {error} {expired && <Link href="/forgot-password" className="underline">Demander un nouveau lien</Link>}
            </p>
          )}

          <button type="submit" disabled={busy} className="rounded-full bg-brand-red py-2.5 font-medium text-white disabled:opacity-60">
            {busy ? "Patientez…" : "Changer le mot de passe"}
          </button>
        </form>
      )}
    </div>
  );
}
