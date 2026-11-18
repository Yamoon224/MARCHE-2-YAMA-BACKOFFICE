"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { Section } from "@/components/SettingsPanel";
import { browserApi } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { extractApiError } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/navigation";
import { PASSWORD_PROBLEM_TEXT, passwordProblem } from "@/lib/password";

type User = components["schemas"]["User"];
type Message = { kind: "ok" | "error"; text: string } | null;

const FIELD = "mt-1 block w-full py-2 text-sm";
const BUTTON = "rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-60";

function Notice({ message }: { message: Message }) {
  if (!message) return null;

  return (
    <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${message.kind === "error" ? "bg-brand-red/10 text-brand-red" : "bg-brand-green/10 text-brand-green"}`}>
      {message.text}
    </p>
  );
}

/** Page Profil : identité du compte, modification du nom et du téléphone, changement de mot de passe. */
export function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<Message>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();

    if (!name) return setProfileMessage({ kind: "error", text: "Le nom est obligatoire." });

    setProfileBusy(true);
    setProfileMessage(null);

    try {
      const { error } = await browserApi().PUT("/api/v1/auth/me", { body: { name, phone: phone || null } });
      if (error) return setProfileMessage({ kind: "error", text: extractApiError(error) });

      setProfileMessage({ kind: "ok", text: "Profil enregistré." });
      router.refresh();
    } catch {
      setProfileMessage({ kind: "error", text: "Service momentanément indisponible. Réessayez." });
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const current = String(data.get("current") ?? "");
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");

    if (!current) return setPasswordMessage({ kind: "error", text: "Saisissez votre mot de passe actuel." });

    const problem = passwordProblem(password, confirmation);
    if (problem) return setPasswordMessage({ kind: "error", text: PASSWORD_PROBLEM_TEXT[problem] });

    setPasswordBusy(true);
    setPasswordMessage(null);

    try {
      const { error } = await browserApi().POST("/api/v1/auth/change-password", {
        body: { current_password: current, password, password_confirmation: confirmation },
      });
      if (error) return setPasswordMessage({ kind: "error", text: extractApiError(error) });

      form.reset();
      setPasswordMessage({ kind: "ok", text: "Mot de passe changé. Vos autres appareils devront se reconnecter." });
    } catch {
      setPasswordMessage({ kind: "error", text: "Service momentanément indisponible. Réessayez." });
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Section title="Mon compte">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-black/60">Nom</dt><dd className="font-medium">{user.name}</dd></div>
          <div><dt className="text-xs text-black/60">Rôle</dt><dd className="font-medium">{ROLE_LABEL[user.role] ?? user.role}</dd></div>
          <div><dt className="text-xs text-black/60">E-mail</dt><dd className="font-medium">{user.email ?? "-"}</dd></div>
          <div><dt className="text-xs text-black/60">Téléphone</dt><dd className="font-medium">{user.phone ?? "-"}</dd></div>
        </dl>
      </Section>

      <Section title="Modifier mes informations">
        <form onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2" noValidate>
          <label className="text-sm font-medium">Nom<input name="name" required maxLength={120} autoComplete="name" defaultValue={user.name} className={FIELD} /></label>
          <label className="text-sm font-medium">Téléphone<input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="+33612345678" defaultValue={user.phone ?? ""} className={FIELD} /></label>
          <p className="text-xs text-black/60 sm:col-span-2">L&apos;adresse e-mail et le rôle sont gérés par un administrateur.</p>
          <div className="space-y-3 sm:col-span-2">
            <Notice message={profileMessage} />
            <button type="submit" disabled={profileBusy} style={{ backgroundColor: "var(--active)" }} className={BUTTON}>{profileBusy ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </form>
      </Section>

      <Section title="Changer mon mot de passe">
        <form onSubmit={changePassword} className="grid gap-3 sm:grid-cols-2" noValidate>
          <label className="text-sm font-medium sm:col-span-2">Mot de passe actuel<PasswordInput name="current" autoComplete="current-password" className={FIELD} /></label>
          <label className="text-sm font-medium">Nouveau mot de passe<PasswordInput name="password" autoComplete="new-password" className={FIELD} /></label>
          <label className="text-sm font-medium">Confirmation<PasswordInput name="confirmation" autoComplete="new-password" className={FIELD} /></label>
          <p className="text-xs text-black/60 sm:col-span-2">8 caractères minimum, avec au moins une lettre et un chiffre.</p>
          <div className="space-y-3 sm:col-span-2">
            <Notice message={passwordMessage} />
            <button type="submit" disabled={passwordBusy} style={{ backgroundColor: "var(--active)" }} className={BUTTON}>{passwordBusy ? "Changement…" : "Changer le mot de passe"}</button>
          </div>
        </form>
      </Section>
    </div>
  );
}
