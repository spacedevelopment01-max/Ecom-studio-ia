import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangProvider } from "@/components/i18n";
import { serverLang } from "@/lib/i18n-server";
import { pick } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await serverLang();
  return {
    title: { default: pick(lang, "E-COM STUDIO IA · du produit à la boutique", "E-COM STUDIO IA · from product to store"), template: "%s · E-COM STUDIO IA" },
    description: pick(
      lang,
      "Une photo ou un lien suffit : l'IA construit la marque, la boutique en ligne, les images, les vidéos et le calendrier de publications. Vous gardez la main à chaque étape.",
      "A photo or a link is all it takes: AI builds the brand, the online store, the images, the videos and the posting calendar. You stay in control at every step.",
    ),
    icons: { icon: "/favicon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F7FC" },
    { media: "(prefers-color-scheme: dark)", color: "#070B17" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeScript = `(function(){try{var t=localStorage.getItem('ecs-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await serverLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preload" href="/fonts/bricolage.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="min-h-dvh">
        <LangProvider initial={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
