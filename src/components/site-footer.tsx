/** Pied de page du site vitrine et des pages légales. */
import Link from "next/link";
import { Logo } from "./ui";
import { company, legalLinks } from "@/lib/legal";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";

export async function SiteFooter() {
  const lang = await serverLang();
  const T = (fr: string, en: string) => pick(lang, fr, en);
  const COMPANY = company(lang);
  const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: T("Produit", "Product"),
      links: [
        { href: "/#fonctionnalites", label: T("Fonctionnalités", "Features") },
        { href: "/#video", label: T("Comment ça marche", "How it works") },
        { href: "/#boutiques", label: T("Création de boutique", "Store creation") },
        { href: "/#sur-mesure", label: T("Thème sur mesure", "Custom theme") },
        { href: "/#plateformes", label: T("Plateformes et exports", "Platforms and exports") },
        { href: "/#rangement", label: T("Rangement des fichiers", "File organization") },
        { href: "/#demonstrations", label: T("Démonstrations", "Demos") },
        { href: "/#offre", label: T("Tarifs", "Pricing") },
      ],
    },
    {
      title: "Studio",
      links: [
        { href: "/inscription", label: T("Créer un compte", "Create an account") },
        { href: "/connexion", label: T("Se connecter", "Sign in") },
        { href: "/#questions", label: T("Questions fréquentes", "FAQ") },
        { href: "/contact", label: T("Nous écrire", "Contact us") },
      ],
    },
    { title: T("Légal", "Legal"), links: legalLinks(lang).filter((l) => l.href !== "/contact") },
  ];
  return (
    <footer className="relative overflow-hidden border-t border-line bg-[#070B17] text-white">
      <div className="pointer-events-none absolute -left-40 -top-40 size-[30rem] rounded-full bg-[radial-gradient(circle,rgba(61,110,240,.28),transparent_65%)]" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="text-white [&_path]:[fill:#070B17]"><Logo /></div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">{T("Toute votre activité e-commerce, un seul studio : votre marque, votre boutique (Shopify, WooCommerce, PrestaShop), vos images, vos vidéos, vos publicités et vos publications.", "Your entire e-commerce business, one studio: your brand, your store (Shopify, WooCommerce, PrestaShop), your images, your videos, your ads and your posts.")}</p>
          <Link href="/inscription" className="btn-glow mt-6 inline-flex h-11 items-center rounded-full bg-[#3D6EF0] px-5 text-sm font-semibold text-white">{T("Essayer le studio", "Try the studio")}</Link>
        </div>
        <nav className="grid gap-10 sm:grid-cols-3 lg:col-span-8" aria-label={T("Pied de page", "Footer")}>
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
          <p>© {new Date().getFullYear()} {COMPANY.brand}. {T("Tous droits réservés.", "All rights reserved.")}</p>
          <p>{T("Démonstrations : produits réels de fournisseurs, marques et boutiques créées par le studio.", "Demos: real supplier products; brands and stores created by the studio.")}</p>
        </div>
      </div>
    </footer>
  );
}
