
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AppearanceProvider } from "@/components/AppearanceProvider";
import { AppShell } from "@/components/AppShell";
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
  metadataBase: new URL(siteUrl()),
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Marché de Yama",
    title: TITLE,
    description: DESCRIPTION,
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "only light" }}
    >
      <body
        className="min-h-full flex flex-col bg-white text-gray-900"
        style={{ colorScheme: "only light" }}
      >
        <AppearanceProvider>
          <Suspense fallback={null}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </AppearanceProvider>
      </body>
    </html>
  );
}

/** URL publique du backoffice. */
function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return "http://localhost:3001";
}
