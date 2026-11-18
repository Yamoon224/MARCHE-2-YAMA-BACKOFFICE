import { Suspense } from "react";
import { DownNotice, LoadError } from "@/components/admin/notices";
import { ProfileForm } from "@/components/ProfileForm";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Mon profil - Backoffice Marché de Yama" };

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Mon profil</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const staff = await requireStaff("/profile");
  if (staff.status === "down") return <DownNotice />;

  const me = await staff.api.GET("/api/v1/auth/me").catch(() => null);
  if (!me?.data?.data) return <LoadError status={me?.response.status} what="votre profil" />;

  return <ProfileForm user={me.data.data} />;
}
