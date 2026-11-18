"use client";

import { SearchSelect } from "@/components/SearchSelect";
import { Btn } from "@/components/Btn";
import { useState, type FormEvent } from "react";
import { DataTable } from "@/components/DataTable";
import { Feedback, field, int, optional, primary, Section, str, useAction, amount } from "@/components/catalog/shared";
import { browserApi } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { centsToInput } from "@/lib/format";
import { fromLocalInput, PROMOTION_STATE_LABEL, promotionValueLabel, toLocalInput, usageLabel } from "@/lib/promotions/promotions";
import { dateCell, moneyCell } from "@/lib/table/cells";

type Promotion = components["schemas"]["Promotion"];

const STATE_CLASS: Record<string, string> = {
  active: "bg-brand-green/10 text-brand-green",
  scheduled: "bg-black/5",
  expired: "bg-black/10",
  exhausted: "bg-brand-red/10 text-brand-red",
  disabled: "bg-black/10",
};

function Fields({ p }: { p?: Promotion }) {
  const [type, setType] = useState<string>(p?.type ?? "percent");

  return (
    <>
      <label className="text-sm font-medium">Code<input name="code" required defaultValue={p?.code} maxLength={40} pattern="[A-Za-z0-9_\-]+" placeholder="Ex. BIENVENUE10" className={`${field} uppercase`} /></label>
      <label className="text-sm font-medium">Description<input name="description" placeholder="Ex. Offre de bienvenue" defaultValue={p?.description ?? ""} maxLength={255} className={field} /></label>
      <label className="text-sm font-medium">
        Type de remise
        <SearchSelect name="type" value={type} onChange={setType} aria-label="Type de remise" className="mt-1" options={[{ value: "percent", label: "Pourcentage" }, { value: "fixed", label: "Montant fixe (€)" }]} />
      </label>
      <label className="text-sm font-medium">
        {type === "percent" ? "Pourcentage (1 à 100)" : "Montant (€)"}
        <input name="value" required inputMode="decimal" placeholder={type === "percent" ? "Ex. 10" : "Ex. 5,00"} defaultValue={p ? (p.type === "percent" ? p.value : centsToInput(p.value)) : ""} className={field} />
      </label>
      <label className="text-sm font-medium">Minimum de commande (€)<input name="min_order" inputMode="decimal" defaultValue={p?.min_order_minor ? centsToInput(p.min_order_minor) : ""} placeholder="Aucun" className={field} /></label>
      <label className="text-sm font-medium">Utilisations maximum<input name="max_uses" inputMode="numeric" defaultValue={p?.max_uses ?? ""} placeholder="Illimité" className={field} /></label>
      <label className="text-sm font-medium">Début<input name="starts_at" type="datetime-local" placeholder="jj/mm/aaaa hh:mm" defaultValue={toLocalInput(p?.starts_at)} className={field} /></label>
      <label className="text-sm font-medium">Fin<input name="ends_at" type="datetime-local" placeholder="jj/mm/aaaa hh:mm" defaultValue={toLocalInput(p?.ends_at)} className={field} /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="active" defaultChecked={p?.is_active ?? true} /> Code activé</label>
    </>
  );
}

type PromotionBody = {
  code: string;
  description: string | null;
  type: "percent" | "fixed";
  value: number;
  min_order_minor: number;
  max_uses: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

type Parsed = { body: PromotionBody } | { error: string };

function parse(data: FormData): Parsed {
  const type = str(data, "type") as "percent" | "fixed";
  const rawValue = str(data, "value");
  const value = type === "percent" ? int(data, "value") : amount(data, "value");
  if (value === null || Number.isNaN(value) || !/^[\d\s.,]+$/.test(rawValue) || value < 1) return { error: "La valeur de la remise est invalide." };
  if (type === "percent" && value > 100) return { error: "Un pourcentage ne peut pas dépasser 100." };

  const min = amount(data, "min_order");
  if (Number.isNaN(min)) return { error: "Le minimum de commande est invalide." };

  const maxRaw = str(data, "max_uses");
  const maxUses = maxRaw === "" ? null : Number.parseInt(maxRaw, 10);
  if (maxUses !== null && (!/^\d+$/.test(maxRaw) || maxUses < 1)) return { error: "Le nombre d'utilisations doit être un entier positif." };

  const startsAt = fromLocalInput(str(data, "starts_at"));
  const endsAt = fromLocalInput(str(data, "ends_at"));
  if (startsAt === undefined || endsAt === undefined) return { error: "Une date est invalide." };

  return {
    body: {
      code: str(data, "code").toUpperCase(),
      description: optional(data, "description"),
      type,
      value,
      min_order_minor: min ?? 0,
      max_uses: maxUses,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: data.get("active") === "on",
    },
  };
}

export function PromotionsAdmin({ promotions }: { promotions: Promotion[] }) {
  const { run, busy, message, setMessage } = useAction();

  function submit(event: FormEvent<HTMLFormElement>, send: (body: PromotionBody) => Promise<{ error?: unknown }>, success: string, after?: () => void) {
    event.preventDefault();
    const parsed = parse(new FormData(event.currentTarget));
    if ("error" in parsed) return setMessage({ kind: "error", text: parsed.error });
    void run(() => send(parsed.body), success, after);
  }

  function toggle(p: Promotion) {
    const path = p.is_active ? "/api/v1/promotions/{promotion}/deactivate" : "/api/v1/promotions/{promotion}/activate";
    void run(() => browserApi().POST(path, { params: { path: { promotion: p.id } } }), p.is_active ? `Code ${p.code} désactivé.` : `Code ${p.code} activé.`);
  }

  function remove(p: Promotion) {
    if (!window.confirm(`Supprimer le code ${p.code} ?`)) return;
    void run(() => browserApi().DELETE("/api/v1/promotions/{promotion}", { params: { path: { promotion: p.id } } }), `Code ${p.code} supprimé.`);
  }

  return (
    <div className="space-y-4">
      <Feedback message={message} />

      <DataTable
        name="promotions"
        title="Codes promotionnels"
        emptyMessage="Aucun code promotionnel."
        columns={[
          { header: "Code" },
          { header: "Remise" },
          { header: "Minimum", type: "number", align: "right" },
          { header: "Utilisations" },
          { header: "Début", type: "date" },
          { header: "Fin", type: "date" },
          { header: "État" },
          { header: "Actions", actions: true },
        ]}
        rows={promotions.map((p) => ({
          key: p.id,
          cells: [
            { value: p.code, node: <span className="font-mono font-medium">{p.code}</span> },
            promotionValueLabel(p.type, p.value),
            moneyCell(p.min_order_minor ?? 0),
            usageLabel(p.used_count, p.max_uses),
            dateCell(p.starts_at, true),
            dateCell(p.ends_at, true),
            {
              value: PROMOTION_STATE_LABEL[p.state] ?? p.state,
              node: <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${STATE_CLASS[p.state] ?? "bg-black/5"}`}>{PROMOTION_STATE_LABEL[p.state] ?? p.state}</span>,
            },
            {
              value: "",
              node: (
                <span className="flex gap-3 whitespace-nowrap text-sm">
                  <Btn type="button" disabled={busy} onClick={() => toggle(p)} className="text-brand-green underline disabled:opacity-60">{p.is_active ? "Désactiver" : "Activer"}</Btn>
                  <Btn type="button" disabled={busy} onClick={() => remove(p)} className="text-brand-red underline disabled:opacity-60">Supprimer</Btn>
                </span>
              ),
            },
          ],
          detail: (
            <details className="px-4 py-2">
              <summary className="cursor-pointer text-sm font-medium">Modifier {p.code}</summary>
              <form
                onSubmit={(e) => submit(e, (body) => browserApi().PUT("/api/v1/promotions/{promotion}", { params: { path: { promotion: p.id } }, body }), `Code ${p.code} enregistré.`)}
                className="mt-3 grid gap-3 sm:grid-cols-2"
              >
                <Fields p={p} />
                <div className="sm:col-span-2"><Btn type="submit" disabled={busy} className={primary}>Enregistrer</Btn></div>
              </form>
            </details>
          ),
        }))}
      />

      <Section title="Nouveau code promotionnel">
        <form
          onSubmit={(e) => {
            const form = e.currentTarget;
            submit(e, (body) => browserApi().POST("/api/v1/promotions", { body }), "Code créé.", () => form.reset());
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <Fields />
          <div className="sm:col-span-2"><Btn type="submit" disabled={busy} className={primary}>Créer le code</Btn></div>
        </form>
      </Section>
      <p className="text-xs text-black/50">La remise se calcule déjà via le contrôle d&apos;un code ; son application automatique au passage de commande n&apos;est pas encore branchée côté serveur.</p>
    </div>
  );
}
