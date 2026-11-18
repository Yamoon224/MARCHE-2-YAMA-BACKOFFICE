import { Suspense } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata = { title: "Nouveau mot de passe - Backoffice Marché de Yama" };

type SearchParams = Promise<{ token?: string | string[]; email?: string | string[] }>;

export default function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthLayout>
      <Suspense fallback={<p className="text-center text-black/60">Chargement…</p>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthLayout>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const { token, email } = await searchParams;

  return <ResetPasswordForm token={typeof token === "string" ? token : ""} email={typeof email === "string" ? email : ""} />;
}
