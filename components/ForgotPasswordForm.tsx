"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FIELD } from "@/components/LoginForm";
import { extractApiError } from "@/lib/format";

/** Étape 1 : l'adresse e-mail. La réponse ne dit jamais si un compte existe. */
export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();

    try {
      const response = await fetch("/api/session/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) setSent(true);
      else setError(extractApiError(await response.json().catch(() => null), "L'envoi a échoué. Vérifiez l'adresse et réessayez."));
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-center text-2xl font-bold">Mot de passe oublié</h1>

      {sent ? (
        <div role="status" className="flex flex-col gap-2 rounded-lg bg-brand-green/10 p-4 text-sm">
          <p>Si un compte de l&apos;équipe correspond à cette adresse, un e-mail de réinitialisation vient d&apos;être envoyé. Le lien est valable une heure.</p>
          <p className="text-black/60">Pensez à regarder dans vos courriers indésirables.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-black/70">Saisissez l&apos;adresse e-mail de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe.</p>

          <label className="text-sm font-medium">
            Adresse e-mail
            <input name="email" type="email" required autoComplete="email" placeholder="prenom.nom@exemple.com" className={FIELD} />
          </label>

          {error && <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">{error}</p>}

          <button type="submit" disabled={busy} className="rounded-full bg-brand-red py-2.5 font-medium text-white disabled:opacity-60">
            {busy ? "Patientez…" : "Envoyer le lien"}
          </button>
        </form>
      )}

      <Link href="/login" className="text-center text-sm text-brand-green underline">Retour à la connexion</Link>
    </div>
  );
}
