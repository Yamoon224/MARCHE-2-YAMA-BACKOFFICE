import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ClaimDecision } from "@/components/ClaimDecision";
import {
  canDecideClaims, CLAIM_STATUS_LABEL, COST_BEARER_LABEL, ISSUE_LABEL, RESOLUTION_LABEL, type CostBearer, type Issue, type Resolution,
} from "@/lib/claims/claims";
import { formatXof } from "@/lib/format";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Réclamation — Backoffice Marché de Yama" };

type Props = { params: Promise<{ id: string }> };

export default function ClaimPage(props: Props) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Detail {...props} />
      </Suspense>
    </main>
  );
}

async function Detail({ params }: Props) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const staff = await requireStaff(`/reclamations/${id}`);
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  const result = await staff.api.GET("/api/v1/claims/{claim}", { params: { path: { claim: Number(id) } } }).catch(() => null);
  if (result?.response.status === 404 || result?.response.status === 403) notFound();

  const claim = result?.data?.data;
  if (!claim) return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Impossible de charger la réclamation.</p>;

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/reclamations" className="text-brand-green underline">← Réclamations</Link></p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Réclamation n° {claim.id}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${claim.status === "open" ? "bg-brand-red/10 text-brand-red" : "bg-black/5"}`}>{CLAIM_STATUS_LABEL[claim.status] ?? claim.status}</span>
      </div>
      <p className="mt-1 text-sm text-black/60">Commande <Link href={`/commandes/${claim.order_id}`} className="underline">#{claim.order_id}</Link> · plafond remboursable {formatXof(claim.claimable_minor)}</p>

      {claim.description && <p className="mt-4 rounded-lg bg-black/5 p-3 text-sm">{claim.description}</p>}

      <section aria-labelledby="articles" className="mt-6">
        <h2 id="articles" className="mb-2 font-semibold">Articles concernés</h2>
        <ul className="divide-y divide-black/10 rounded-xl border border-black/10 bg-white text-sm">
          {claim.items.map((item) => (
            <li key={item.id} className="flex flex-wrap justify-between gap-2 p-3">
              <span><strong>{item.name}</strong> — {ISSUE_LABEL[item.issue as Issue] ?? item.issue} · quantité {item.quantity}{item.note ? ` · « ${item.note} »` : ""}</span>
              <span className="text-black/60">jusqu&apos;à {formatXof(item.claimable_minor)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="photos" className="mt-6">
        <h2 id="photos" className="mb-2 font-semibold">Photos du client</h2>
        {claim.photos.length === 0 ? <p className="text-sm text-black/60">Aucune photo (article manquant).</p> : (
          <ul className="flex flex-wrap gap-3">
            {claim.photos.map((photo) => (
              <li key={photo.id}>
                {/* Servie par la route autorisée de l'API via le relais (cookie du personnel) ; jamais publique. */}
                <a href={`/api/backend${photo.url}`} target="_blank" rel="noopener noreferrer">
                  <Image src={`/api/backend${photo.url}`} alt={`Photo ${photo.id} de la réclamation ${claim.id}`} width={160} height={120} unoptimized className="h-30 w-40 rounded-lg border border-black/10 object-cover" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="decision" className="mt-8 rounded-xl border border-black/10 bg-white p-4">
        <h2 id="decision" className="mb-3 font-semibold">Décision</h2>
        {claim.status === "open" ? (
          canDecideClaims(staff.user.role)
            ? <ClaimDecision claimId={claim.id} ceilingMinor={claim.claimable_minor} />
            : <p className="text-sm text-black/60">Votre rôle ne permet pas de décider les réclamations.</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="font-medium">Résultat</dt><dd>{CLAIM_STATUS_LABEL[claim.status]}{claim.resolution ? ` — ${RESOLUTION_LABEL[claim.resolution as Resolution]}` : ""}</dd>
            {claim.refund_amount_minor > 0 && (<><dt className="font-medium">Remboursement</dt><dd>{formatXof(claim.refund_amount_minor)} — {claim.refund_completed ? "effectué" : <span className="font-medium text-brand-red">en attente (repris automatiquement)</span>}</dd></>)}
            {claim.cost_bearer && (<><dt className="font-medium">Coût imputé à</dt><dd>{COST_BEARER_LABEL[claim.cost_bearer as CostBearer]}</dd></>)}
            <dt className="font-medium">Motif</dt><dd>{claim.decision_note}</dd>
          </dl>
        )}
      </section>
    </>
  );
}
