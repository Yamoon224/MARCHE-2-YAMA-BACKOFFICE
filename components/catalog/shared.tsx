"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { browserApi } from "@/lib/api/client";
import { extractApiError } from "@/lib/format";

export const field = "mt-1 w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-sm outline-none focus:border-brand-green";
export const primary = "rounded-full bg-brand-green px-4 py-2 text-sm font-medium text-white disabled:opacity-60";
export const danger = "rounded-full border border-brand-red px-4 py-2 text-sm font-medium text-brand-red disabled:opacity-60";

export type Message = { kind: "ok" | "error"; text: string } | null;

/** Exécute un appel d'API, affiche le résultat et rafraîchit la page. */
export function useAction() {
  const router = useRouter();
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ error?: unknown }>, success: string, after?: () => void): Promise<boolean> {
    setBusy(true);
    setMessage(null);

    try {
      const { error } = await action();
      if (error) {
        setMessage({ kind: "error", text: extractApiError(error) });
        return false;
      }
      setMessage({ kind: "ok", text: success });
      after?.();
      router.refresh();
      return true;
    } catch {
      setMessage({ kind: "error", text: "Service momentanément indisponible. Réessayez." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { run, busy, message, setMessage };
}

export function Feedback({ message }: { message: Message }) {
  if (!message) return null;

  return (
    <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-lg p-3 text-sm ${message.kind === "error" ? "bg-brand-red/10 text-brand-red" : "bg-brand-green/10 text-brand-green"}`}>
      {message.text}
    </p>
  );
}

/** Champ image : téléverse le fichier vers l'API et conserve l'adresse renvoyée (ou une adresse collée). */
export function ImageField({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");

  async function upload(file: File | undefined) {
    if (!file) return;
    setState("uploading");

    try {
      const body = new FormData();
      body.append("image", file);
      const { data } = await browserApi().POST("/api/v1/catalog/media", { body: { image: "" }, bodySerializer: () => body });
      if (!data?.data) return setState("error");
      setUrl(data.data.url);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="text-sm font-medium">
      Image
      <div className="mt-1 flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu d'une image servie par l'API
          <img src={url} alt="" className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-black/5" aria-hidden="true">🖼</span>
        )}
        <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Téléverser une image" onChange={(e) => void upload(e.target.files?.[0])} className="text-xs" />
        {url && <button type="button" onClick={() => setUrl("")} className="text-xs text-brand-red underline">Retirer</button>}
      </div>
      <input type="hidden" name={name} value={url} />
      {state === "uploading" && <span className="text-xs text-black/60">Envoi…</span>}
      {state === "error" && <span role="alert" className="text-xs text-brand-red">Image refusée (JPG, PNG ou WebP, 4 Mo maximum).</span>}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export const str = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
export const optional = (data: FormData, key: string) => str(data, key) || null;
export const int = (data: FormData, key: string) => Number.parseInt(str(data, key), 10);
/** Entier ≥ 0 saisi dans un champ texte ; `null` si vide, `NaN` si invalide. */
export function amount(data: FormData, key: string): number | null {
  const text = str(data, key);
  return text === "" ? null : /^\d+$/.test(text) ? Number(text) : Number.NaN;
}