import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Motion } from "@/components/motion";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3100"),
  title: { default: "Allô Papiers — La paperasse en mode simplifié", template: "%s · Allô Papiers" },
  description:
    "Comprenez vos courriers administratifs, préparez vos réponses et suivez vos démarches. Service privé indépendant, non affilié à l'administration.",
  applicationName: "Allô Papiers",
  formatDetection: { telephone: false },
  openGraph: { title: "Allô Papiers", description: "La paperasse en mode simplifié", locale: "fr_FR", type: "website" },
};

export const viewport: Viewport = { themeColor: "#F8F5F0", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession().catch(() => null);
  return (
    <html lang="fr">
      <body className="flex min-h-dvh flex-col">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-navy focus:px-4 focus:py-3 focus:text-white">
          Aller au contenu
        </a>
        {env.demoMode && (
          <div className="bg-navy px-4 py-2 text-center text-[0.95rem] font-semibold text-white" role="status">
            Mode démonstration : les analyses sont simulées et ne lisent pas vos documents.
          </div>
        )}
        <Header connected={Boolean(session && !session.session.locked)} />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <Footer />
        <Motion />
      </body>
    </html>
  );
}
