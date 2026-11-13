import { Suspense } from "react";
import { DispatchBoard } from "@/components/DispatchBoard";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Régulation — Backoffice Marché de Yama" };

export default function RegulationPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Régulation des livraisons</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Board />
      </Suspense>
    </main>
  );
}

async function Board() {
  const staff = await requireStaff("/regulation");
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  const [deliveries, couriers] = await Promise.all([
    staff.api.GET("/api/v1/delivery/deliveries").catch(() => null),
    staff.api.GET("/api/v1/delivery/couriers").catch(() => null),
  ]);

  if (deliveries?.response.status === 403) {
    return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Votre rôle ne permet pas de réguler les livraisons.</p>;
  }

  if (!deliveries?.data) return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Impossible de charger les livraisons.</p>;

  return <DispatchBoard deliveries={deliveries.data.data} couriers={couriers?.data?.data ?? []} />;
}
