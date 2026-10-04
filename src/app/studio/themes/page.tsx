import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo, ThemeToggle } from "@/components/ui";
import { LangSwitch } from "@/components/i18n";
import { ThemeGrid } from "@/components/studio/theme-gallery";
import { directionCards } from "@/lib/theme/directions";
import { serverLang } from "@/lib/i18n-server";
import { pick } from "@/lib/i18n";

export async function generateMetadata() {
  const lang = await serverLang();
  return { title: pick(lang, "Thèmes", "Themes") };
}

/** Galerie des onze directions, consultable sans projet. */
export default async function ThemesPage() {
  const lang = await serverLang();
  const t = (fr: string, en: string) => pick(lang, fr, en);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/studio"><Logo /></Link>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link href="/studio" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> {t("Mes boutiques", "My stores")}</Link>
        <h1 className="mt-4 font-display text-4xl font-semibold sm:text-5xl">{t("Les onze thèmes", "The eleven themes")}</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-2">
          {t(
            "Chaque direction est un vrai thème Shopify Online Store 2.0, avec sa composition, ses typographies, ses animations et sa combinaison d'en-tête, de pied de page et de bandeau. Tout reste modifiable dans l'éditeur Shopify. Le studio en choisit un selon votre produit ; vous en changez quand vous voulez depuis l'onglet Boutique (bouton « Thèmes »).",
            "Each direction is a real Shopify Online Store 2.0 theme, with its own layout, typography, animations and combination of header, footer and announcement bar. Everything stays editable in the Shopify editor. The studio picks one based on your product; you can switch whenever you like from the Store tab (“Themes” button).",
          )}
        </p>
        <p className="mt-2 text-sm text-muted">{t("Aperçus réalisés sur un produit de démonstration fictif.", "Previews built on a fictional demo product.")}</p>
        <div className="mt-8"><ThemeGrid directions={directionCards(lang)} /></div>
      </main>
    </div>
  );
}
