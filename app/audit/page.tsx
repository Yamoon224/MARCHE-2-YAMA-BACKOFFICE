import { Suspense } from "react";
import { AuditVerify } from "@/components/admin/AuditVerify";
import { DownNotice, LoadError, Pager, first, pageNumber } from "@/components/admin/notices";
import { DataTable } from "@/components/DataTable";
import { dateCell } from "@/lib/table/cells";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Journal d'audit - Backoffice Marché de Yama" };

type SearchParams = Promise<Record<"user_id" | "method" | "path" | "failed" | "from" | "to" | "page", string | string[] | undefined>>;

const METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const input = "mt-1 block rounded-lg border border-black/20 bg-white px-3 py-1.5 text-sm";

export default function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Journal d&apos;audit</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const userId = /^\d+$/.test(first(raw.user_id)) ? first(raw.user_id) : "";
  const method = METHODS.find((m) => m === first(raw.method)) ?? "";
  const path = first(raw.path).trim().slice(0, 100);
  const failed = first(raw.failed) === "true";
  const from = ISO_DAY.test(first(raw.from)) ? first(raw.from) : "";
  const to = ISO_DAY.test(first(raw.to)) ? first(raw.to) : "";
  const page = pageNumber(raw.page);

  const staff = await requireStaff("/audit");
  if (staff.status === "down") return <DownNotice />;

  const [logs, members] = await Promise.all([
    staff.api
      .GET("/api/v1/audit", {
        params: { query: { user_id: userId ? Number(userId) : undefined, method: method || undefined, path: path || undefined, failed: failed || undefined, from: from || undefined, to: to || undefined, page, per_page: 50 } },
      })
      .catch(() => null),
    staff.api.GET("/api/v1/staff", { params: { query: { per_page: 100 } } }).catch(() => null),
  ]);
  if (!logs?.data) return <LoadError status={logs?.response.status} what="le journal" />;

  // Le journal ne stocke que l'identifiant : le nom vient de la liste de l'équipe (100 premiers comptes).
  const names = new Map((members?.data?.data ?? []).map((m) => [m.id, m.name]));
  const entries = logs.data.data;

  return (
    <>
      <AuditVerify />

      <form action="/audit" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-sm font-medium">
          Utilisateur
          <select name="user_id" defaultValue={userId} className={input}>
            <option value="">Tous</option>
            {[...names.entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          Méthode
          <select name="method" defaultValue={method} className={input}>
            <option value="">Toutes</option>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Chemin<input name="path" defaultValue={path} placeholder="Ex. /orders" className={input} /></label>
        <label className="text-sm font-medium">Du<input type="date" name="from" defaultValue={from} className={input} /></label>
        <label className="text-sm font-medium">Au<input type="date" name="to" defaultValue={to} className={input} /></label>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="failed" value="true" defaultChecked={failed} /> Échecs seulement</label>
        <button type="submit" className="rounded-full bg-brand-green px-4 py-1.5 text-sm font-medium text-white">Filtrer</button>
      </form>

      {entries.length === 0 ? <p className="text-black/70">Aucune entrée ne correspond.</p> : (
        <DataTable
          name="journal-audit"
          title="Journal d'audit"
          columns={[
            { header: "Date", type: "date" },
            { header: "Utilisateur" },
            { header: "Méthode" },
            { header: "Chemin" },
            { header: "Statut", type: "number", align: "right" },
            { header: "IP" },
            { header: "Données" },
          ]}
          rows={entries.map((entry) => {
            const payload = Object.keys(entry.payload ?? {}).length > 0 ? JSON.stringify(entry.payload) : "";
            return {
              key: entry.id,
              cells: [
                dateCell(entry.created_at, true),
                names.get(entry.user_id) ?? `Compte n° ${entry.user_id}`,
                entry.method,
                { value: entry.path, node: <span className="font-mono text-xs">{entry.path}</span> },
                { value: entry.status, node: <span className={entry.status >= 400 ? "font-medium text-brand-red" : ""}>{entry.status}</span> },
                entry.ip ?? null,
                { value: payload, node: payload ? <code className="block max-w-xs truncate text-xs" title={payload}>{payload}</code> : "-" },
              ],
            };
          })}
        />
      )}
      <Pager path="/audit" params={{ user_id: userId, method, path, failed: failed ? "true" : "", from, to }} meta={logs.data.meta} />
    </>
  );
}
