/** Pied de page du site vitrine et des pages légales. */
import Link from "next/link";
import { Logo } from "./ui";
import { COMPANY, LEGAL_LINKS } from "@/lib/legal";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Produit",
    links: [
      { href: "/#video", label: "Comment ça marche" },
      { href: "/#sur-mesure", label: "Thème sur mesure" },
      { href: "/#boutiques", label: "Plateformes" },
      { href: "/#rangement", label: "Rangement des fichiers" },
      { href: "/#demonstrations", label: "Démonstrations" },
      { href: "/#offre", label: "Offre" },
    ],
  },
  {
    title: "Studio",
    links: [
      { href: "/inscription", label: "Créer un compte" },
      { href: "/connexion", label: "Se connecter" },
      { href: "/#questions", label: "Questions fréquentes" },
      { href: "/contact", label: "Nous écrire" },
    ],
  },
  { title: "Légal", links: LEGAL_LINKS.filter((l) => l.href !== "/contact") },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-[#070B17] text-white">
      <div className="pointer-events-none absolute -left-40 -top-40 size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(61,110,240,.28),transparent_65%)]" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="text-white [&_path]:[fill:#070B17]"><Logo /></div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">Une photo, une marque, une boutique qui vend. Le studio crée votre marque, votre boutique (Shopify, WooCommerce, PrestaShop), vos images, vos vidéos et vos publications.</p>
          <Link href="/inscription" className="btn-glow mt-6 inline-flex h-11 items-center rounded-full bg-[#3D6EF0] px-5 text-sm font-semibold text-white">Essayer le studio</Link>
        </div>
        <nav className="grid gap-10 sm:grid-cols-3 lg:col-span-8" aria-label="Pied de page">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="text-xs font-medium uppercase tracking-[.18em] text-white/50">{c.title}</p>
              <ul className="mt-4 grid gap-2.5 text-sm">
                {c.links.map((l) => (
                  <li key={l.href}><Link href={l.href} className="text-white/80 transition hover:text-white">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {COMPANY.brand}. Tous droits réservés.</p>
          <p>Démonstrations : produits réels de fournisseurs, marques et boutiques créées par le studio.</p>
        </div>
      </div>
    </footer>
  );
}
