import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo, ThemeToggle } from "@/components/ui";
import { ThemeGrid } from "@/components/studio/theme-gallery";
import { directionCards } from "@/lib/theme/directions";

export const metadata = { title: "Thèmes" };

/** Galerie des onze directions, consultable sans projet. */
export default function ThemesPage() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/studio"><Logo /></Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link href="/studio" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Mes boutiques</Link>
        <h1 className="mt-4 font-display text-4xl font-semibold sm:text-5xl">Les onze thèmes</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-2">Chaque direction est un vrai thème Shopify Online Store 2.0, avec sa composition, ses typographies, ses animations et sa combinaison d'en-tête, de pied de page et de bandeau. Tout reste modifiable dans l'éditeur Shopify. Le studio en choisit un selon votre produit ; vous en changez quand vous voulez depuis l'onglet Boutique (bouton « Thèmes »).</p>
        <p className="mt-2 text-sm text-muted">Aperçus réalisés sur un produit de démonstration fictif.</p>
        <div className="mt-8"><ThemeGrid directions={directionCards()} /></div>
      </main>
    </div>
  );
}
