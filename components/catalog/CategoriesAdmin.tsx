"use client";

import type { FormEvent } from "react";
import { browserApi } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { danger, Feedback, field, ImageField, int, optional, primary, Section, str, useAction } from "./shared";

type Category = components["schemas"]["Category"];

function CategoryFields({ c }: { c?: Category }) {
  return (
    <>
      <label className="text-sm font-medium">Nom<input name="name" required placeholder="Ex. Fruits et légumes" defaultValue={c?.name} className={field} /></label>
      <label className="text-sm font-medium">Identifiant d&apos;URL<input name="slug" required defaultValue={c?.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="Ex. fruits-legumes" className={field} /></label>
      <label className="text-sm font-medium">Icône (emoji)<input name="icon" placeholder="Ex. 🥬" maxLength={16} defaultValue={c?.icon ?? ""} className={field} /></label>
      <label className="text-sm font-medium">Position<input name="position" placeholder="0" inputMode="numeric" defaultValue={c?.position ?? 0} className={field} /></label>
      <ImageField name="image" defaultValue={c?.image_url} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={c?.is_active ?? true} /> Visible sur la vitrine</label>
    </>
  );
}

const body = (data: FormData) => ({
  name: str(data, "name"),
  slug: str(data, "slug"),
  icon: optional(data, "icon"),
  image_url: optional(data, "image"),
  position: Number.isNaN(int(data, "position")) ? 0 : int(data, "position"),
  is_active: data.get("active") === "on",
});

export function CategoriesAdmin({ categories }: { categories: Category[] }) {
  const { run, busy, message } = useAction();

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    void run(() => browserApi().POST("/api/v1/catalog/categories", { body: body(new FormData(form)) }), "Rayon créé.", () => form.reset());
  }

  function update(c: Category, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(
      () => browserApi().PUT("/api/v1/catalog/categories/{category}", { params: { path: { category: c.id } }, body: body(new FormData(event.currentTarget)) }),
      `Rayon « ${c.name} » enregistré.`,
    );
  }

  function remove(c: Category) {
    if (!window.confirm(`Supprimer le rayon « ${c.name} » ?`)) return;
    void run(() => browserApi().DELETE("/api/v1/catalog/categories/{category}", { params: { path: { category: c.id } } }), "Rayon supprimé.");
  }

  return (
    <div className="space-y-4">
      <Feedback message={message} />
      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="rounded-xl border border-black/10 bg-white">
            <details>
              <summary className="cursor-pointer p-3 text-sm font-medium">
                <span aria-hidden="true">{c.icon ?? "🛒"}</span> {c.name} {!c.is_active && <span className="ml-2 rounded-full bg-black/10 px-2 text-xs">Masqué</span>}
              </summary>
              <form onSubmit={(e) => update(c, e)} className="grid gap-3 border-t border-black/10 p-3 sm:grid-cols-2">
                <CategoryFields c={c} />
                <div className="flex gap-2 sm:col-span-2">
                  <button type="submit" disabled={busy} className={primary}>Enregistrer</button>
                  <button type="button" disabled={busy} onClick={() => remove(c)} className={danger}>Supprimer</button>
                </div>
              </form>
            </details>
          </li>
        ))}
      </ul>
      <Section title="Nouveau rayon">
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <CategoryFields />
          <div className="sm:col-span-2"><button type="submit" disabled={busy} className={primary}>Créer le rayon</button></div>
        </form>
      </Section>
    </div>
  );
}