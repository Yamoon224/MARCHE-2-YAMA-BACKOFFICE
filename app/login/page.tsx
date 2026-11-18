import { redirect } from "next/navigation";
import { Suspense } from "react";

type SearchParams = Promise<{ next?: string | string[] }>;

/** Ancienne adresse de la connexion : elle vit maintenant à la racine. On y renvoie, sans perdre `?next=`. */
export default function LoginRedirect({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <Redirect searchParams={searchParams} />
    </Suspense>
  );
}

async function Redirect({ searchParams }: { searchParams: SearchParams }): Promise<null> {
  const { next } = await searchParams;

  redirect(typeof next === "string" ? `/?next=${encodeURIComponent(next)}` : "/");
}
