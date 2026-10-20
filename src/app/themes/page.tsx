import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";
import { currentUser } from "@/lib/auth";
import { directionCards } from "@/lib/theme/directions";
import { HomeHeader } from "@/components/home/home-chrome";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await serverLang();
  const title = pick(lang, "Les thèmes de référence · E-COM STUDIO IA", "The reference themes · E-COM STUDIO IA");
  const description = pick(lang, "Les modèles de boutique du studio, montrés avec les démonstrations FRAISE, ONDE, ORBE et Atelier Rive. L'IA part de l'un d'eux ou en crée un nouveau à vos couleurs.", "The studio's store designs, shown with the FRAISE, ONDE, ORBE and Atelier Rive demos. The AI starts from one of them or creates a new one in your colors.");
  return { title: { absolute: title }, description, alternates: { canonical: "/themes" } };
}

/** Galerie publique des thèmes de référence (page du site, pas du studio) : le retour ramène à l'accueil. */
export default async function ThemesGallery() {
  const lang = await serverLang();
  const T = (fr: string, en: string) => pick(lang, fr, en);
  const user = await currentUser();
  const cta = user ? "/studio" : "/inscription";
  // Capture allégée (WebP) quand elle existe ; toujours la capture française (les « .en » ne sont plus produites).
  const shot = (src: string) => {
    const jpg = src.replace(/\.en\.jpg$/, ".jpg");
    const webp = jpg.replace(/\.jpg$/, ".webp");
    return fs.existsSync(path.join(process.cwd(), "public", webp)) ? webp : jpg;
  };
  const themes = directionCards(lang);
  const nav = [
    { href: "/#fonctionnalites", label: T("Fonctionnalités", "Features") },
    { href: "/#fonctionnement", label: T("Fonctionnement", "How it works") },
    { href: "/#marque", label: T("Créations", "Creations") },
    { href: "/#demonstrations", label: T("Démonstrations", "Demos") },
    { href: "/#offre", label: T("Tarifs", "Pricing") },
  ];
  return (
    <div className="hp overflow-x-clip">
      <HomeHeader links={nav} loggedIn={!!user} ctaHref={cta} />
      <main id="contenu" className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <Link href="/#themes" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-signal underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> {T("Retour à l'accueil", "Back to the home page")}
        </Link>
        <p className="hp-eyebrow mt-8">{T("Les thèmes", "The themes")}</p>
        <h1 className="hp-title mt-4 text-[clamp(2.2rem,5vw,4rem)]">{T("Quatre modèles de référence,", "Four reference designs,")} <span className="hp-accent">{T("à vos couleurs.", "in your colors.")}</span></h1>
        <p className="hp-lead mt-5 max-w-2xl">{T("Chaque capture montre une démonstration du studio (FRAISE, ONDE, ORBE ou Atelier Rive) dans un modèle différent. Pour votre projet, l'IA part de l'un d'eux ou en crée un tout nouveau, avec votre logo, vos couleurs et vos photos.", "Each screenshot shows one of the studio demos (FRAISE, ONDE, ORBE or Atelier Rive) in a different design. For your project, the AI starts from one of them or creates a brand-new one, with your logo, colors and photos.")}</p>
        <ul className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((d) => (
            <li key={d.id}>
              <img src={shot(d.preview)} alt={T(`Thème ${d.name} : ${d.tagline}`, `${d.name} theme: ${d.tagline}`)} loading="lazy" decoding="async" className="aspect-[16/10] w-full rounded-2xl object-cover object-top shadow-[0_22px_48px_-26px_rgba(10,16,40,.6)] ring-1 ring-black/5" />
              <p className="mt-3 font-display text-lg font-semibold">{d.name} <span className="font-sans text-sm font-normal text-muted">· {d.tagline}</span></p>
            </li>
          ))}
        </ul>
        <div className="mt-16 flex flex-col gap-3 sm:flex-row">
          <Link href={cta} className="hp-btn hp-btn-primary !min-h-14 !px-6">{user ? T("Ouvrir mon studio", "Open my studio") : T("Commencer mon projet", "Start my project")} <ArrowRight className="size-4" aria-hidden /></Link>
          <Link href="/#themes" className="hp-btn hp-btn-ghost !min-h-14 !px-6">{T("Retour à l'accueil", "Back to the home page")}</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
