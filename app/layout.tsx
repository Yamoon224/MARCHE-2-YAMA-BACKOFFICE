import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { StaffNav } from "@/components/StaffNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "Backoffice - Marché de Yama";
const DESCRIPTION = "Gestion des commandes, de la livraison et de la comptabilité";

export const metadata: Metadata = {
  // URL publique du backoffice (obligatoire pour que les images de partage soient en URL absolue).
  metadataBase: new URL(siteUrl()),
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  // L'image de partage vient de app/opengraph-image.png et app/twitter-image.png.
  openGraph: { type: "website", siteName: "Marché de Yama", title: TITLE, description: DESCRIPTION, locale: "fr_FR" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black/[0.03]">
        <header className="bg-brand-red text-white">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2">
            <Link href="/" aria-label="Backoffice Marché de Yama">
              <Image src="/brand/logo-on-red.jpg" alt="Marché de Yama" width={72} height={64} priority />
            </Link>
            <Suspense fallback={null}>
              <StaffNav />
            </Suspense>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}

/** URL publique : variable explicite, sinon domaine de production Vercel, sinon développement local. */
function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3001";
}
