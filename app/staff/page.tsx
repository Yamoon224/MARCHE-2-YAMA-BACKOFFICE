import { SearchSelect } from "@/components/SearchSelect";
import { Suspense } from "react";
import { DownNotice, LoadError, Pager, SearchForm, first, pageNumber } from "@/components/admin/notices";
import { StaffAdmin } from "@/components/admin/StaffAdmin";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Équipe - Backoffice Marché de Yama" };

type SearchParams = Promise<{ q?: string | string[]; role?: string | string[]; active?: string | string[]; page?: string | string[] }>;

export default function StaffPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Équipe</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const q = first(raw.q).trim().slice(0, 100);
  const role = first(raw.role);
  const active = ["true", "false"].includes(first(raw.active)) ? first(raw.active) : "";
  const page = pageNumber(raw.page);

  const staff = await requireStaff("/staff");
  if (staff.status === "down") return <DownNotice />;

  const [list, roles] = await Promise.all([
    staff.api.GET("/api/v1/staff", { params: { query: { q: q || undefined, role: role || undefined, active: active ? active === "true" : undefined, page, per_page: 100 } } }).catch(() => null),
    staff.api.GET("/api/v1/roles").catch(() => null),
  ]);

  if (!list?.data || !roles?.data) return <LoadError status={list?.response.status ?? roles?.response.status} what="l'équipe" />;

  const roleOptions = roles.data.data;

  return (
    <>
      <SearchForm path="/staff" q={q}>
        <label className="text-sm font-medium">
          Rôle
          <SearchSelect name="role" defaultValue={role} emptyLabel="Tous les rôles" aria-label="Rôle" className="mt-1 min-w-52" options={roleOptions.map((r) => ({ value: r.value, label: r.label }))} />
        </label>
        <label className="text-sm font-medium">
          Statut
          <SearchSelect name="active" defaultValue={active} emptyLabel="Tous les statuts" aria-label="Statut" className="mt-1 min-w-44" options={[{ value: "true", label: "Actifs" }, { value: "false", label: "Désactivés" }]} />
        </label>
      </SearchForm>

      <StaffAdmin members={list.data.data} roles={roleOptions} currentUserId={staff.user.id} />
      <Pager path="/staff" params={{ q, role, active }} meta={list.data.meta} />
    </>
  );
}
