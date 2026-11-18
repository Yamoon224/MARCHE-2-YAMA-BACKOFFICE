"use client";

import { useState, type FormEvent } from "react";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { browserApi } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { bannerBody, bannerStateLabel, sortBanners } from "@/lib/catalog/banners";
import { danger, Feedback, field, ImageField, primary, useAction } from "@/components/catalog/shared";

type Banner = components["schemas"]["Banner"];

type Dialog = { kind: "create" } | { kind: "edit"; banner: Banner } | { kind: "details"; banner: Banner } | { kind: "delete"; banner: Banner } | null;

const small = "rounded-full border border-black/20 bg-white px-3 py-1.5 text-xs font-medium hover:bg-black/5 disabled:opacity-40";
const FORM_ID = "banner-form";

function Picture({ banner, className }: { banner: Banner; className: string }) {
  return banner.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element -- image servie par l'API
    <img src={banner.image_url} alt={banner.title} loading="lazy" className={`${className} object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${className} grid place-items-center bg-black/5 text-2xl text-black/30`}>🖼</span>
  );
}

function StateBadge({ banner }: { banner: Banner }) {
  const active = banner.is_active ?? true;

  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-brand-green/10 text-brand-green" : "bg-black/10 text-black/70"}`}>{bannerStateLabel(active)}</span>;
}

function BannerFields({ banner }: { banner?: Banner }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium sm:col-span-2">Titre<input name="title" placeholder="Ex. Du frais, tous les jours" required defaultValue={banner?.title} className={field} /></label>
      <label className="text-sm font-medium sm:col-span-2">Accroche (petit texte au-dessus du titre)<input name="eyebrow" placeholder="Ex. Authentique & savoureux" maxLength={80} defaultValue={banner?.eyebrow ?? ""} className={field} /></label>
      <label className="text-sm font-medium sm:col-span-2">Texte<input name="text" placeholder="Ex. Fruits, légumes, viandes et poissons suivis par lot" maxLength={500} defaultValue={banner?.text ?? ""} className={field} /></label>
      <label className="text-sm font-medium">Bouton : libellé<input name="label" placeholder="Ex. Voir les rayons" required maxLength={80} defaultValue={banner?.cta_label} className={field} /></label>
      <label className="text-sm font-medium">Bouton : lien<input name="url" required defaultValue={banner?.cta_url} placeholder="/aisles ou https://…" className={field} /></label>
      <label className="text-sm font-medium">Ordre d&apos;affichage<input name="position" placeholder="0" inputMode="numeric" defaultValue={banner?.position ?? 0} className={field} /></label>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={banner?.is_active ?? true} /> Affichée sur la vitrine</label>
      <div className="sm:col-span-2"><ImageField name="image" defaultValue={banner?.image_url} large /></div>
    </div>
  );
}

/** Gestion des bannières du carrousel de la vitrine : grille et liste, ajout, modification, détails et suppression en modales. */
export function BannersManager({ banners }: { banners: Banner[] }) {
  const [tab, setTab] = useState<"grid" | "list">("grid");
  const [dialog, setDialog] = useState<Dialog>(null);
  const { run, busy, message, setMessage } = useAction();
  const sorted = sortBanners(banners);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = bannerBody(new FormData(event.currentTarget));
    const current = dialog?.kind === "edit" ? dialog.banner : null;

    void run(
      () => (current
        ? browserApi().PUT("/api/v1/catalog/banners/{banner}", { params: { path: { banner: current.id } }, body })
        : browserApi().POST("/api/v1/catalog/banners", { body })),
      current ? "Bannière enregistrée." : "Bannière créée.",
      () => setDialog(null),
    );
  }

  function remove(banner: Banner) {
    void run(
      () => browserApi().DELETE("/api/v1/catalog/banners/{banner}", { params: { path: { banner: banner.id } } }),
      `Bannière « ${banner.title} » supprimée.`,
      () => setDialog(null),
    );
  }

  const actions = (banner: Banner) => (
    <span className="flex flex-wrap gap-1.5">
      <button type="button" onClick={() => setDialog({ kind: "details", banner })} className={small}>Détails</button>
      <button type="button" onClick={() => { setMessage(null); setDialog({ kind: "edit", banner }); }} className={small}>Modifier</button>
      <button type="button" onClick={() => setDialog({ kind: "delete", banner })} className={`${small} text-brand-red`}>Supprimer</button>
    </span>
  );

  const tabClass = (active: boolean) =>
    `-mb-px border-b-2 px-5 py-3 text-sm font-medium ${active ? "border-[var(--active)] text-[var(--active)]" : "border-transparent text-black/60 hover:text-black"}`;

  const formOpen = dialog?.kind === "create" || dialog?.kind === "edit";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-black/60">Le carrousel de la page d&apos;accueil de la vitrine suit l&apos;ordre ci-dessous. Sans bannière active, il est masqué.</p>
        <button type="button" onClick={() => { setMessage(null); setDialog({ kind: "create" }); }} className={primary}>+ Nouvelle bannière</button>
      </div>

      <Feedback message={message} />

      <div role="tablist" aria-label="Mode d'affichage" className="flex border-b border-black/10">
        <button role="tab" type="button" id="tab-grid" aria-selected={tab === "grid"} aria-controls="panel-banners" onClick={() => setTab("grid")} className={tabClass(tab === "grid")}>Grille</button>
        <button role="tab" type="button" id="tab-list" aria-selected={tab === "list"} aria-controls="panel-banners" onClick={() => setTab("list")} className={tabClass(tab === "list")}>Liste</button>
        <span className="ml-auto self-center text-xs text-black/60">{sorted.length} bannière{sorted.length > 1 ? "s" : ""}</span>
      </div>

      <div role="tabpanel" id="panel-banners" aria-labelledby={tab === "grid" ? "tab-grid" : "tab-list"}>
        {sorted.length === 0 ? (
          <p className="rounded-xl bg-black/5 p-6 text-center text-sm text-black/60">Aucune bannière : le carrousel de la vitrine est masqué.</p>
        ) : tab === "grid" ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {sorted.map((b) => (
              <li key={b.id} data-testid="banner-card" className={`flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white ${b.is_active === false ? "opacity-70" : ""}`}>
                <Picture banner={b} className="aspect-[16/7] w-full" />
                <div className="flex flex-1 flex-col gap-1 p-4">
                  {b.eyebrow ? <p className="text-xs uppercase tracking-wide text-black/50">{b.eyebrow}</p> : null}
                  <p className="font-semibold">{b.title}</p>
                  {b.text ? <p className="line-clamp-2 text-sm text-black/60">{b.text}</p> : null}
                  <p className="flex flex-wrap items-center gap-2 pt-1 text-xs text-black/60">
                    <span className="rounded-full bg-black/5 px-2 py-0.5">Ordre {b.position ?? 0}</span>
                    <StateBadge banner={b} />
                    <span className="truncate">→ {b.cta_url}</span>
                  </p>
                  <div className="mt-auto pt-3">{actions(b)}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <DataTable
            name="bannieres"
            title="Bannières"
            emptyMessage="Aucune bannière."
            columns={[
              { header: "Image", actions: true },
              { header: "Titre" },
              { header: "Bouton" },
              { header: "Lien" },
              { header: "Ordre", type: "number", align: "right" },
              { header: "État" },
              { header: "Actions", actions: true },
            ]}
            rows={sorted.map((b) => ({
              key: b.id,
              cells: [
                { value: null, node: <Picture banner={b} className="h-12 w-24 rounded-lg" /> },
                b.title,
                b.cta_label,
                b.cta_url,
                b.position ?? 0,
                { value: bannerStateLabel(b.is_active ?? true), node: <StateBadge banner={b} /> },
                { value: null, node: actions(b) },
              ],
            }))}
          />
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "edit" ? "Modifier la bannière" : "Nouvelle bannière"}
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)} className={small}>Annuler</button>
            <button type="submit" form={FORM_ID} disabled={busy} className={primary}>{dialog?.kind === "edit" ? "Enregistrer" : "Créer la bannière"}</button>
          </>
        }
      >
        {formOpen ? (
          <form id={FORM_ID} onSubmit={save} className="space-y-3">
            <BannerFields banner={dialog?.kind === "edit" ? dialog.banner : undefined} />
            <Feedback message={message?.kind === "error" ? message : null} />
          </form>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === "details"}
        onClose={() => setDialog(null)}
        title="Détails de la bannière"
        footer={
          dialog?.kind === "details" ? (
            <>
              <button type="button" onClick={() => setDialog(null)} className={small}>Fermer</button>
              <button type="button" onClick={() => setDialog({ kind: "edit", banner: dialog.banner })} className={primary}>Modifier</button>
            </>
          ) : null
        }
      >
        {dialog?.kind === "details" ? (
          <div className="space-y-4">
            <Picture banner={dialog.banner} className="aspect-[16/7] w-full rounded-xl" />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2"><dt className="text-xs text-black/60">Titre</dt><dd className="font-semibold">{dialog.banner.title}</dd></div>
              <div><dt className="text-xs text-black/60">Accroche</dt><dd>{dialog.banner.eyebrow || "-"}</dd></div>
              <div><dt className="text-xs text-black/60">État</dt><dd><StateBadge banner={dialog.banner} /></dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-black/60">Texte</dt><dd>{dialog.banner.text || "-"}</dd></div>
              <div><dt className="text-xs text-black/60">Bouton</dt><dd>{dialog.banner.cta_label}</dd></div>
              <div><dt className="text-xs text-black/60">Lien</dt><dd className="break-all">{dialog.banner.cta_url}</dd></div>
              <div><dt className="text-xs text-black/60">Ordre d&apos;affichage</dt><dd>{dialog.banner.position ?? 0}</dd></div>
            </dl>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={dialog?.kind === "delete"}
        onClose={() => setDialog(null)}
        title="Supprimer cette bannière ?"
        size="md"
        footer={
          dialog?.kind === "delete" ? (
            <>
              <button type="button" onClick={() => setDialog(null)} className={small}>Annuler</button>
              <button type="button" disabled={busy} onClick={() => remove(dialog.banner)} className={danger}>Supprimer définitivement</button>
            </>
          ) : null
        }
      >
        {dialog?.kind === "delete" ? (
          <p className="text-sm">
            La bannière <b>« {dialog.banner.title} »</b> disparaîtra du carrousel de la vitrine. Cette action est définitive.
            Pour la retirer sans la perdre, décochez plutôt « Affichée sur la vitrine » dans sa modification.
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
