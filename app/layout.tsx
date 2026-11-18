import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AppearanceProvider } from "@/components/AppearanceProvider";
import { AppShell } from "@/components/AppShell";
import { THEME_INIT_SCRIPT } from "@/lib/appearance";
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
      // data-theme est posé par le script ci-dessous avant l'hydratation : c'est le seul écart voulu avec le rendu serveur.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-black/[0.03]">
        <AppearanceProvider>
          {/* Le cadre lit usePathname(), dynamique sur les routes à paramètre : il doit être sous un Suspense. */}
          <Suspense fallback={null}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </AppearanceProvider>
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
