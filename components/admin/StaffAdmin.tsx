"use client";

import type { FormEvent } from "react";
import { DataTable } from "@/components/DataTable";
import { browserApi } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { dateCell } from "@/lib/table/cells";
import { Feedback, field, optional, primary, Section, str, useAction } from "@/components/catalog/shared";

type Member = components["schemas"]["StaffMember"];
/** Le contrat OpenAPI marque le mot de passe obligatoire aussi à la modification ; le serveur l'accepte absent (« sometimes »). */
type StaffBody = { name: string; email: string; phone?: string | null; role: string; password: string };
type RoleOption = { value: string; label: string; permissions: string[] };

function permissionsText(role: RoleOption | undefined): string {
  if (!role) return "";
  return role.permissions.includes("*") ? "Toutes les permissions" : role.permissions.join(", ") || "Aucune permission particulière";
}

function Fields({ member, roles, creating }: { member?: Member; roles: RoleOption[]; creating?: boolean }) {
  return (
    <>
      <label className="text-sm font-medium">Nom<input name="name" required defaultValue={member?.name} maxLength={120} className={field} /></label>
      <label className="text-sm font-medium">E-mail<input name="email" type="email" required defaultValue={member?.email ?? ""} maxLength={190} className={field} /></label>
      <label className="text-sm font-medium">Téléphone<input name="phone" inputMode="tel" defaultValue={member?.phone ?? ""} placeholder="+33612345678" className={field} /></label>
      <label className="text-sm font-medium">
        Rôle
        <select name="role" required defaultValue={member?.role ?? ""} className={field}>
          {creating && <option value="" disabled>Choisir un rôle…</option>}
          {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        {creating ? "Mot de passe" : "Nouveau mot de passe (laisser vide pour le conserver)"}
        <input name="password" type="password" required={creating} minLength={8} autoComplete="new-password" className={field} />
      </label>
    </>
  );
}

export function StaffAdmin({ members, roles, currentUserId }: { members: Member[]; roles: RoleOption[]; currentUserId: number }) {
  const { run, busy, message } = useAction();
  const roleOf = (value: string) => roles.find((r) => r.value === value);

  const body = (data: FormData, creating: boolean) => {
    const password = str(data, "password");
    return {
      name: str(data, "name"),
      email: str(data, "email"),
      phone: optional(data, "phone"),
      role: str(data, "role"),
      ...(creating || password ? { password } : {}),
    };
  };

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    void run(() => browserApi().POST("/api/v1/staff", { body: body(new FormData(form), true) as StaffBody }), "Compte créé.", () => form.reset());
  }

  function update(member: Member, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    void run(
      () => browserApi().PUT("/api/v1/staff/{user}", { params: { path: { user: member.id } }, body: body(new FormData(form), false) as StaffBody }),
      `Compte de ${member.name} enregistré.`,
    );
  }

  function deactivate(member: Member) {
    if (!window.confirm(`Désactiver le compte de ${member.name} ? La personne ne pourra plus se connecter.`)) return;
    void run(() => browserApi().DELETE("/api/v1/staff/{user}", { params: { path: { user: member.id } } }), `Compte de ${member.name} désactivé.`);
  }

  function reactivate(member: Member) {
    void run(() => browserApi().POST("/api/v1/staff/{user}/reactivate", { params: { path: { user: member.id } } }), `Compte de ${member.name} réactivé.`);
  }

  return (
    <div className="space-y-4">
      <Feedback message={message} />

      <DataTable
        name="equipe"
        title="Équipe"
        columns={[
          { header: "Nom" },
          { header: "E-mail" },
          { header: "Rôle" },
          { header: "Statut" },
          { header: "Créé le", type: "date" },
          { header: "Actions", actions: true },
        ]}
        rows={members.map((m) => ({
          key: m.id,
          className: m.is_active ? undefined : "opacity-60",
          cells: [
            m.id === currentUserId ? `${m.name} (vous)` : m.name,
            m.email ?? null,
            { value: m.role_label, node: <span title={permissionsText(roleOf(m.role))}>{m.role_label}</span> },
            {
              value: m.is_active ? "Actif" : "Désactivé",
              node: <span className={`rounded-full px-3 py-1 text-xs font-medium ${m.is_active ? "bg-brand-green/10 text-brand-green" : "bg-black/10"}`}>{m.is_active ? "Actif" : "Désactivé"}</span>,
            },
            dateCell(m.created_at),
            {
              value: "",
              node: m.id === currentUserId ? <span className="text-xs text-black/50">Votre compte</span> : m.is_active ? (
                <button type="button" disabled={busy} onClick={() => deactivate(m)} className="text-sm text-brand-red underline disabled:opacity-60">Désactiver</button>
              ) : (
                <button type="button" disabled={busy} onClick={() => reactivate(m)} className="text-sm text-brand-green underline disabled:opacity-60">Réactiver</button>
              ),
            },
          ],
          detail: (
            <details className="px-4 py-2">
              <summary className="cursor-pointer text-sm font-medium">Modifier {m.name}</summary>
              <form onSubmit={(e) => update(m, e)} className="mt-3 grid gap-3 sm:grid-cols-2">
                <Fields member={m} roles={roles} />
                <p className="text-xs text-black/60 sm:col-span-2">Permissions du rôle : {permissionsText(roleOf(m.role))}</p>
                <div className="sm:col-span-2"><button type="submit" disabled={busy} className={primary}>Enregistrer</button></div>
              </form>
            </details>
          ),
        }))}
      />

      <Section title="Nouveau membre de l'équipe">
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <Fields roles={roles} creating />
          <div className="sm:col-span-2"><button type="submit" disabled={busy} className={primary}>Créer le compte</button></div>
        </form>
      </Section>
      <p className="text-xs text-black/50">Un compte ne peut pas être supprimé, seulement désactivé ; vous ne pouvez ni désactiver votre propre compte ni changer votre rôle.</p>
    </div>
  );
}
