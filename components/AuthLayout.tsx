import Image from "next/image";
import type { ReactNode } from "react";

const POINTS = ["Commandes, préparation et livraison au même endroit", "Stock, réclamations et remboursements suivis en temps réel", "Caisse et comptabilité toujours à jour"];

/**
 * Écrans d'accès (connexion, mot de passe oublié, nouveau mot de passe) : une photo sur 7/12 de la largeur
 * et la carte du formulaire sur les 5/12 restants. Sous le point de rupture `lg`, la photo disparaît
 * et la carte occupe tout l'écran.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-12">
      <aside className="relative hidden overflow-hidden bg-black lg:col-span-7 lg:block">
        <Image src="/brand/login-hero.webp" alt="" fill priority sizes="(min-width: 1024px) 58vw, 0px" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/25" aria-hidden />

        <div className="absolute inset-x-0 bottom-0 flex max-w-xl flex-col gap-4 p-10 text-white xl:p-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/80">Backoffice · Marché de Yama</p>
          <h2 className="text-3xl font-extrabold leading-tight xl:text-4xl">Les meilleurs produits, aux meilleurs prix : pilotez-les en toute simplicité.</h2>
          <p className="text-white/85">L&apos;outil de l&apos;équipe pour faire arriver chaque commande, fraîche et à l&apos;heure, jusqu&apos;à nos clients.</p>
          <ul className="flex flex-col gap-1.5 text-sm text-white/90">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#ffdc37]" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="flex items-center justify-center bg-black/[0.03] px-4 py-12 sm:px-8 lg:col-span-5">
        <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-6 flex justify-center">
            <Image src="/brand/logo-trimmed.png" alt="Marché de Yama" width={761} height={689} priority className="h-28 w-auto" />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
