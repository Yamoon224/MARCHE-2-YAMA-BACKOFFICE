"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { browserApi } from "@/lib/api/client";
import { extractApiError, formatMoney, parseEuros } from "@/lib/format";

type Zone = { id: number; name: string; fee_minor: number; free_above_minor?: number | null; min_order_minor: number };

const field = "mt-1 w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-sm outline-none focus:border-brand-green";

/** Montant en euros saisi (ex. 4,90) converti en centimes ; `null` si vide ou invalide. */
function toAmount(value: FormDataEntryValue | null): number | null {
  return parseEuros(String(value ?? ""));
}

/** Entier strictement positif (capacité d'un créneau) ; `null` si invalide. */
function toCount(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}

export function DeliveryAdmin({ zones }: { zones: Zone[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ error?: unknown }>, success: string, form: HTMLFormElement) {
    setBusy(true);
    setMessage(null);

    try {
      const { error } = await action();
      if (error) return setMessage({ kind: "error", text: extractApiError(error) });

      setMessage({ kind: "ok", text: success });
      form.reset();
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Service momentanément indisponible. Réessayez." });
    } finally {
      setBusy(false);
    }
  }

  function createZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const fee = toAmount(data.get("fee"));
    const minimum = toAmount(data.get("minimum")) ?? 0;
    const freeAbove = toAmount(data.get("freeAbove"));

    if (fee === null) return setMessage({ kind: "error", text: "Les frais doivent être un montant en euros (ex. 4,90)." });

    void run(
      () => browserApi().POST("/api/v1/delivery/zones", {
        body: { name: String(data.get("name")), fee_minor: fee, min_order_minor: minimum, free_above_minor: freeAbove },
      }),
      "Zone créée.",
      form,
    );
  }

  function createSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const capacity = toCount(data.get("capacity"));

    if (capacity === null || capacity < 1) return setMessage({ kind: "error", text: "La capacité doit être au moins 1." });

    void run(
      () => browserApi().POST("/api/v1/delivery/slots", {
        body: {
          delivery_zone_id: Number(data.get("zone")),
          starts_at: new Date(String(data.get("start"))).toISOString(),
          ends_at: new Date(String(data.get("end"))).toISOString(),
          capacity,
        },
      }),
      "Créneau ouvert.",
      form,
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="zones" className="lg:col-span-2">
        <h2 id="zones" className="mb-2 font-semibold">Zones desservies</h2>
        {zones.length === 0 ? (
          <p className="text-sm text-black/60">Aucune zone pour le moment.</p>
        ) : (
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10 bg-white text-sm">
            {zones.map((z) => (
              <li key={z.id} className="flex flex-wrap justify-between gap-2 p-3">
                <span className="font-medium">{z.name}</span>
                <span className="text-black/70">
                  Frais {formatMoney(z.fee_minor)} · offerts dès {z.free_above_minor != null ? formatMoney(z.free_above_minor) : "—"} · minimum {formatMoney(z.min_order_minor)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={createZone} className="rounded-xl border border-black/10 bg-white p-4" noValidate>
        <h2 className="mb-2 font-semibold">Nouvelle zone</h2>
        <label className="block text-sm font-medium">Nom<input name="name" required placeholder="Ex. Paris (75)" className={field} /></label>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="text-sm font-medium">Frais (€)<input name="fee" inputMode="decimal" required placeholder="Ex. 4,90" className={field} /></label>
          <label className="text-sm font-medium">Offerts dès<input name="freeAbove" inputMode="decimal" placeholder="Ex. 50" className={field} /></label>
          <label className="text-sm font-medium">Minimum<input name="minimum" inputMode="decimal" placeholder="Ex. 20" className={field} /></label>
        </div>
        <button type="submit" disabled={busy} className="mt-4 rounded-full bg-brand-green px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Créer la zone</button>
      </form>

      <form onSubmit={createSlot} className="rounded-xl border border-black/10 bg-white p-4" noValidate>
        <h2 className="mb-2 font-semibold">Ouvrir un créneau</h2>
        <label className="block text-sm font-medium">
          Zone
          <select name="zone" required className={field}>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">Début<input name="start" type="datetime-local" required placeholder="jj/mm/aaaa hh:mm" className={field} /></label>
          <label className="text-sm font-medium">Fin<input name="end" type="datetime-local" required placeholder="jj/mm/aaaa hh:mm" className={field} /></label>
        </div>
        <label className="mt-3 block text-sm font-medium">Capacité (commandes)<input name="capacity" inputMode="numeric" required placeholder="Ex. 20" className={field} /></label>
        <button type="submit" disabled={busy || zones.length === 0} className="mt-4 rounded-full bg-brand-green px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Ouvrir le créneau</button>
      </form>

      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-lg p-3 text-sm lg:col-span-2 ${message.kind === "error" ? "bg-brand-red/10 text-brand-red" : "bg-brand-green/10 text-brand-green"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
