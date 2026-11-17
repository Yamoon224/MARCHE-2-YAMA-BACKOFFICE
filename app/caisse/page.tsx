import { Suspense } from "react";
import { CashDesk } from "@/components/CashDesk";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Remise de fonds - Backoffice Marché de Yama" };

export default function CaissePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Remise de fonds des livreurs</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Desk />
      </Suspense>
    </main>
  );
}

async function Desk() {
  const staff = await requireStaff("/caisse");
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  const [holders, handovers] = await Promise.all([
    staff.api.GET("/api/v1/delivery/cash").catch(() => null),
    staff.api.GET("/api/v1/delivery/cash/handovers").catch(() => null),
  ]);

  if (holders?.response.status === 403) {
    return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Votre rôle ne permet pas de recevoir les espèces des livreurs.</p>;
  }
  if (!holders?.data) return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Impossible de charger les espèces détenues.</p>;

  return <CashDesk holders={holders.data.data} handovers={handovers?.data?.data ?? []} />;
}
