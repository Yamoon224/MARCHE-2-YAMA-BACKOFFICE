import Link from "next/link";

export const DOWN_MESSAGE = "Service momentanément indisponible. Réessayez dans un instant.";

export function DownNotice() {
  return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">{DOWN_MESSAGE}</p>;
}

/** Réponse d'erreur de l'API pour une page : accès refusé (403) ou échec de chargement. */
export function LoadError({ status, what }: { status?: number; what: string }) {
  if (status === 403) {
    return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Votre rôle n&apos;a pas accès à cette page.</p>;
  }
  return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Impossible de charger {what}.</p>;
}

type Meta = { current_page?: number; last_page?: number; total?: number };

/** Précédent / Suivant pour une liste paginée côté serveur ; `params` garde les filtres en cours. */
export function Pager({ path, params, meta }: { path: string; params: Record<string, string | undefined>; meta?: Meta }) {
  const page = meta?.current_page ?? 1;
  const last = meta?.last_page ?? 1;
  if (last <= 1) return null;

  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    if (target > 1) query.set("page", String(target));
    const text = query.toString();
    return text ? `${path}?${text}` : path;
  };
  const link = "rounded-full border border-black/20 px-3 py-1 text-sm";

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-center gap-3 text-sm">
      {page > 1 ? <Link href={href(page - 1)} className={link}>Précédent</Link> : <span className={`${link} opacity-40`}>Précédent</span>}
      <span>Page {page} / {last}{meta?.total !== undefined ? ` · ${meta.total} au total` : ""}</span>
      {page < last ? <Link href={href(page + 1)} className={link}>Suivant</Link> : <span className={`${link} opacity-40`}>Suivant</span>}
    </nav>
  );
}

export function SearchForm({ path, q, children }: { path: string; q: string; children?: React.ReactNode }) {
  return (
    <form action={path} className="mb-4 flex flex-wrap items-end gap-2">
      <label className="text-sm font-medium">
        Recherche
        <input type="search" name="q" defaultValue={q} placeholder="Nom, e-mail ou téléphone" className="mt-1 block rounded-lg border border-black/20 bg-white px-3 py-1.5 text-sm" />
      </label>
      {children}
      <button type="submit" className="rounded-full bg-brand-green px-4 py-1.5 text-sm font-medium text-white">Filtrer</button>
    </form>
  );
}

/** Lit un paramètre d'adresse comme texte simple (le premier si répété). */
export function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function pageNumber(value: string | string[] | undefined): number {
  return Math.max(1, Number.parseInt(first(value) || "1", 10) || 1);
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <p className="text-xs uppercase text-black/60">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-black/60">{hint}</p>}
    </div>
  );
}
