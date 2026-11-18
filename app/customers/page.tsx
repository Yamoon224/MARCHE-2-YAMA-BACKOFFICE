import { SearchSelect } from "@/components/SearchSelect";
import Link from "next/link";
import { Suspense } from "react";
import { DownNotice, LoadError, Pager, SearchForm, first, pageNumber } from "@/components/admin/notices";
import { DataTable } from "@/components/DataTable";
import { dateCell, moneyCell } from "@/lib/table/cells";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Clients - Backoffice Marché de Yama" };

type SearchParams = Promise<{ q?: string | string[]; guest?: string | string[]; page?: string | string[] }>;

export default function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Clients</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const q = first(raw.q).trim().slice(0, 100);
  const guest = ["true", "false"].includes(first(raw.guest)) ? first(raw.guest) : "";
  const page = pageNumber(raw.page);

  const staff = await requireStaff("/customers");
  if (staff.status === "down") return <DownNotice />;

  const list = await staff.api
    .GET("/api/v1/customers", { params: { query: { q: q || undefined, guest: guest ? guest === "true" : undefined, page, per_page: 100 } } })
    .catch(() => null);
  if (!list?.data) return <LoadError status={list?.response.status} what="les clients" />;

  const customers = list.data.data;

  return (
    <>
      <SearchForm path="/customers" q={q}>
        <label className="text-sm font-medium">
          Type
          <SearchSelect name="guest" defaultValue={guest} emptyLabel="Tous les clients" aria-label="Type de client" className="mt-1 min-w-52" options={[{ value: "false", label: "Avec compte" }, { value: "true", label: "Invités (sans compte)" }]} />
        </label>
      </SearchForm>

      {customers.length === 0 ? <p className="text-black/70">Aucun client ne correspond.</p> : (
        <DataTable
          name="clients"
          title="Clients"
          columns={[
            { header: "Nom" },
            { header: "E-mail" },
            { header: "Téléphone" },
            { header: "Type" },
            { header: "Commandes", type: "number", align: "right" },
            { header: "Total dépensé", type: "number", align: "right" },
            { header: "Inscrit le", type: "date" },
          ]}
          rows={customers.map((c) => ({
            key: c.id,
            className: c.is_active ? undefined : "opacity-60",
            cells: [
              { value: c.name, node: <Link href={`/customers/${c.id}`} className="font-medium text-brand-green underline">{c.name}</Link> },
              c.email ?? null,
              c.phone ?? null,
              c.is_guest ? "Invité" : "Compte",
              c.orders_count,
              moneyCell(c.total_spent_minor),
              dateCell(c.created_at),
            ],
          }))}
        />
      )}
      <Pager path="/customers" params={{ q, guest }} meta={list.data.meta} />
    </>
  );
}
