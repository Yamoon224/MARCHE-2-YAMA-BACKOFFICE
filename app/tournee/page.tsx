import { Suspense } from "react";
import { TourStop } from "@/components/TourStop";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Ma tournée — Backoffice Marché de Yama" };

export default function TourneePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Ma tournée</h1>
      <Suspense fallback={<p className="text-black/60">Chargement de votre tournée…</p>}>
        <Stops />
      </Suspense>
    </main>
  );
}

async function Stops() {
  const staff = await requireStaff("/tournee");
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Réseau indisponible. Réessayez dans un instant.</p>;
  }

  const result = await staff.api.GET("/api/v1/delivery/my-tour").catch(() => null);

  if (result?.response.status === 403) {
    return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Cet écran est réservé aux livreurs.</p>;
  }

  const stops = result?.data?.data;
  if (!stops) return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Impossible de charger votre tournée.</p>;

  if (stops.length === 0) return <p className="text-black/70">Aucune livraison pour le moment. Bonne pause !</p>;

  return (
    <ul className="flex flex-col gap-4">
      {stops.map((stop) => <TourStop key={stop.id} delivery={stop} />)}
    </ul>
  );
}
