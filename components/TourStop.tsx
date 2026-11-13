"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { browserApi } from "@/lib/api/client";
import {
  courierActions, DELIVERY_STATUS_LABEL, formatAddress, mapsUrl, parseCash, shouldSendLocation, telUrl, validateHandover,
} from "@/lib/courier/courier";
import { extractApiError, formatXof } from "@/lib/format";
import type { BoardDelivery } from "./DispatchBoard";

const field = "rounded-lg border border-black/20 bg-white px-3 py-2 text-sm outline-none focus:border-brand-green";

export function TourStop({ delivery }: { delivery: BoardDelivery }) {
  const router = useRouter();
  const actions = courierActions(delivery.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"handover" | "fail" | null>(null);
  const [code, setCode] = useState("");
  const [cash, setCash] = useState(delivery.cash_due_minor > 0 ? String(delivery.cash_due_minor) : "0");
  const [reason, setReason] = useState("");
  const [sharing, setSharing] = useState(false);
  const lastSent = useRef<number | null>(null);

  // Partage de position : seulement pendant la livraison, au plus toutes les 20 s, arrêté dès que la page se ferme.
  useEffect(() => {
    if (!actions.location || !sharing || !("geolocation" in navigator)) return;

    const watch = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (!shouldSendLocation(lastSent.current, now)) return;
        lastSent.current = now;

        void browserApi().POST("/api/v1/delivery/deliveries/{delivery}/location", {
          params: { path: { delivery: delivery.id } },
          body: { latitude: position.coords.latitude, longitude: position.coords.longitude },
        });
      },
      () => setSharing(false),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watch);
  }, [actions.location, sharing, delivery.id]);

  async function run(call: () => Promise<{ error?: unknown }>) {
    setBusy(true);
    setError(null);

    try {
      const { error: failure } = await call();
      if (failure) return setError(extractApiError(failure));

      setMode(null);
      setCode("");
      setReason("");
      router.refresh();
    } catch {
      setError("Réseau indisponible. Réessayez : l'opération n'a pas été enregistrée.");
    } finally {
      setBusy(false);
    }
  }

  const path = { delivery: delivery.id };

  function handover(event: FormEvent) {
    event.preventDefault();
    const problem = validateHandover(code, cash);
    if (problem) return setError(problem);

    void run(() => browserApi().POST("/api/v1/delivery/deliveries/{delivery}/confirm", {
      params: { path },
      body: { code: code.trim(), cash_collected_minor: parseCash(cash) ?? 0 },
    }));
  }

  function fail(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) return setError("Indiquez le motif de l'échec.");

    void run(() => browserApi().POST("/api/v1/delivery/deliveries/{delivery}/fail", { params: { path }, body: { reason: reason.trim() } }));
  }

  const map = mapsUrl(delivery.address);
  const tel = telUrl(delivery.phone);

  return (
    <li className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Commande n° {delivery.order_id}</p>
        <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium">{DELIVERY_STATUS_LABEL[delivery.status]}</span>
      </div>

      <p className="mt-2">{formatAddress(delivery.address)}</p>
      <p className="mt-1 flex flex-wrap gap-4 text-sm">
        {tel && <a href={tel} className="font-medium text-brand-green underline">Appeler le client</a>}
        {map && <a href={map} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-green underline">Voir sur la carte</a>}
      </p>

      {delivery.cash_due_minor > 0 ? (
        <p className="mt-2 rounded-lg bg-brand-red/10 p-2 text-sm font-semibold text-brand-red">À encaisser en espèces : {formatXof(delivery.cash_due_minor)}</p>
      ) : (
        <p className="mt-2 text-sm text-black/60">Déjà payée : rien à encaisser.</p>
      )}
      {delivery.failure_reason && <p className="mt-1 text-sm text-black/60">Dernier échec : {delivery.failure_reason}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {actions.start && (
          <button type="button" disabled={busy} onClick={() => run(() => browserApi().POST("/api/v1/delivery/deliveries/{delivery}/start", { params: { path } }))} className="rounded-full bg-brand-green px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {delivery.status === "failed" ? "Repartir livrer" : "Partir en livraison"}
          </button>
        )}
        {actions.location && (
          <button type="button" onClick={() => setSharing((v) => !v)} aria-pressed={sharing} className="rounded-full border border-brand-green px-4 py-2 text-sm text-brand-green">
            {sharing ? "Arrêter le partage de position" : "Partager ma position"}
          </button>
        )}
        {actions.handover && <button type="button" onClick={() => setMode("handover")} className="rounded-full bg-brand-red px-5 py-2 text-sm font-medium text-white">Remettre la commande</button>}
        {actions.fail && <button type="button" onClick={() => setMode("fail")} className="rounded-full border border-black/30 px-4 py-2 text-sm">Déclarer un échec</button>}
      </div>

      {mode === "handover" && (
        <form onSubmit={handover} className="mt-3 flex max-w-sm flex-col gap-3 rounded-lg border border-black/10 p-3" noValidate>
          <label className="text-sm font-medium">Code du client (6 chiffres)
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={`${field} mt-1 block w-full tracking-widest`} />
          </label>
          <label className="text-sm font-medium">Espèces encaissées (F CFA)
            <input value={cash} onChange={(e) => setCash(e.target.value)} inputMode="numeric" className={`${field} mt-1 block w-full`} />
          </label>
          <button type="submit" disabled={busy} className="rounded-full bg-brand-red py-2 text-sm font-medium text-white disabled:opacity-50">Confirmer la remise</button>
        </form>
      )}

      {mode === "fail" && (
        <form onSubmit={fail} className="mt-3 flex max-w-sm flex-col gap-3 rounded-lg border border-black/10 p-3" noValidate>
          <label className="text-sm font-medium">Motif
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} placeholder="Client absent, adresse introuvable…" className={`${field} mt-1 block w-full`} />
          </label>
          <button type="submit" disabled={busy} className="rounded-full border border-brand-red py-2 text-sm font-medium text-brand-red disabled:opacity-50">Enregistrer l&apos;échec</button>
        </form>
      )}

      {error && <p role="alert" className="mt-3 rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">{error}</p>}
    </li>
  );
}
