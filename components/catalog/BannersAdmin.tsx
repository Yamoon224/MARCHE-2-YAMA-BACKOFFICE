"use client";

import type { FormEvent } from "react";
import { browserApi } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { danger, Feedback, field, ImageField, int, optional, primary, Section, str, useAction } from "./shared";

type Banner = components["schemas"]["Banner"];

function BannerFields({ b }: { b?: Banner }) {
  return (
    <>
      <label className="text-sm font-medium sm:col-span-2">Titre<input name="title" required defaultValue={b?.title} className={field} /></label>
      <label className="text-sm font-medium sm:col-span-2">Texte<input name="text" maxLength={500} defaultValue={b?.text ?? ""} className={field} /></label>
      <label className="text-sm font-medium">Bouton : libellé<input name="label" required maxLength={80} defaultValue={b?.cta_label} className={field} /></label>
      <label className="text-sm font-medium">Bouton : lien<input name="url" required defaultValue={b?.cta_url} placeholder="/rayons ou https://…" className={field} /></label>
      <label className="text-sm font-medium">Position<input name="position" inputMode="numeric" defaultValue={b?.position ?? 0} className={field} /></label>
      <ImageField name="image" defaultValue={b?.image_url} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={b?.is_active ?? true} /> Affichée sur la vitrine</label>
    </>
  );
}

const body = (data: FormData) => ({
  title: str(data, "title"),
  text: optional(data, "text"),
  cta_label: str(data, "label"),
  cta_url: str(data, "url"),
  image_url: optional(data, "image"),
  position: Number.isNaN(int(data, "position")) ? 0 : int(data, "position"),
  is_active: data.get("active") === "on",
});

export function BannersAdmin({ banners }: { banners: Banner[] }) {
  const { run, busy, message } = useAction();

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    void run(() => browserApi().POST("/api/v1/catalog/banners", { body: body(new FormData(form)) }), "Bannière créée.", () => form.reset());
  }

  function update(b: Banner, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(
      () => browserApi().PUT("/api/v1/catalog/banners/{banner}", { params: { path: { banner: b.id } }, body: body(new FormData(event.currentTarget)) }),
      "Bannière enregistrée.",
    );
  }

  function remove(b: Banner) {
    if (!window.confirm(`Supprimer la bannière « ${b.title} » ?`)) return;
    void run(() => browserApi().DELETE("/api/v1/catalog/banners/{banner}", { params: { path: { banner: b.id } } }), "Bannière supprimée.");
  }

  return (
    <div className="space-y-4">
      <Feedback message={message} />
      <ul className="space-y-2">
        {banners.map((b) => (
          <li key={b.id} className="rounded-xl border border-black/10 bg-white">
            <details>
              <summary className="cursor-pointer p-3 text-sm font-medium">
                {b.position}. {b.title} {!b.is_active && <span className="ml-2 rounded-full bg-black/10 px-2 text-xs">Masquée</span>}
              </summary>
              <form onSubmit={(e) => update(b, e)} className="grid gap-3 border-t border-black/10 p-3 sm:grid-cols-2">
                <BannerFields b={b} />
                <div className="flex gap-2 sm:col-span-2">
                  <button type="submit" disabled={busy} className={primary}>Enregistrer</button>
                  <button type="button" disabled={busy} onClick={() => remove(b)} className={danger}>Supprimer</button>
                </div>
              </form>
            </details>
          </li>
        ))}
        {banners.length === 0 && <li className="text-sm text-black/60">Aucune bannière : le carrousel de la vitrine est masqué.</li>}
      </ul>
      <Section title="Nouvelle bannière">
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <BannerFields />
          <div className="sm:col-span-2"><button type="submit" disabled={busy} className={primary}>Créer la bannière</button></div>
        </form>
      </Section>
    </div>
  );
}