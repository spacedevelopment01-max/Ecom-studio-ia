import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Briefcase, Check, Camera, Link2, Type, Sparkles, Store, Image as ImageIcon, Film, CalendarDays, FolderTree, BookOpen, Plug, ShieldCheck, MessageSquare, Pause, Palette, Lock } from "lucide-react";
import type { Metadata } from "next";
import { Logo, ThemeToggle } from "@/components/ui";
import { LangSwitch } from "@/components/i18n";
import { pick, type Lang } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";
import { SiteFooter } from "@/components/site-footer";
import { FilesSorter } from "@/components/files-sorter";
import { AutoVideo, BeforeAfter, FilmPlayer, DemoTabs, RevealObserver, ScrollFX, ThemeShowcase, VideoChapters, type Demo } from "@/components/landing-client";
import { directionCards } from "@/lib/theme/directions";
import { DISCOVERY, PLAN_IDS, PLANS, REFUND_DAYS } from "@/lib/plans";
import { CompareTable, PackCards, PricingCards } from "@/components/pricing";
import { paymentsLive } from "@/lib/payments";
import { currentUser } from "@/lib/auth";
import { PROMPT_STATS } from "@/lib/prompts-library";
import { SECTORS } from "@/lib/project-types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await serverLang();
  return {
    title: { absolute: pick(lang, "E-COM STUDIO IA · du produit à la boutique", "E-COM STUDIO IA · from product to store") },
    description: pick(
      lang,
      "Une photo ou un lien suffit : l'IA construit la marque, la boutique en ligne, les images, les vidéos et le calendrier de publications. Vous gardez la main à chaque étape.",
      "A photo or a link is all it takes: AI builds the brand, the online store, the images, the videos and the posting calendar. You stay in control at every step.",
    ),
  };
}

/** Démonstrations : manifest.json (français) ou manifest.en.json (projets créés en anglais, fichiers « .en » à côté des français). */
function demos(file: "manifest.json" | "manifest.en.json" = "manifest.json"): Demo[] {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "demo", file), "utf8")).demos;
  } catch {
    return [];
  }
}

/** Repli si public/demo/manifest.en.json n'est pas généré : textes des démonstrations françaises traduits pour l'interface anglaise. */
const DEMO_EN: Record<string, { product?: string; note?: string }> = {
  verger: { product: "Peach iced tea", note: "A supplier's 33 cl can of iced tea, relabeled: the brand and the three flavors are created by the studio." },
  oreiller: { product: "Papillon ergonomic pillow", note: "A white-label ergonomic pillow from a supplier, in two colors: the brand, the visuals and the store are created by the studio." },
  drone: { product: "Foldable drone with stabilized camera", note: "A white-label foldable drone from a supplier; the manufacturer's markings were removed from the photo, and the brand and store are created by the studio." },
  chat: { product: "De-shedding glove", note: "White-label cat products from suppliers: the brand, the visuals and the store are created by the studio." },
  tribunes: { product: "Lavender supporter T-shirt", note: "Supporter T-shirts from a supplier (supplier visuals): the brand and the store are created by the studio. Designs featuring the federation's official crest were excluded." },
};
const SECTOR_EN: Record<string, string> = { Boissons: "Beverages", Maison: "Home", "High-tech": "Tech", Animaux: "Pets", Mode: "Fashion", Beauté: "Beauty", Sport: "Sports", Alimentation: "Food", Bijoux: "Jewelry", Enfants: "Kids" };
const IMAGE_LABEL_EN: Record<string, string> = { Bannière: "Banner", Détail: "Detail", Détourage: "Cutout", Packshot: "Packshot", Publicité: "Ad", Scène: "Scene", "Visuel social": "Social visual" };

function localizeDemo(d: Demo, lang: Lang): Demo {
  if (lang !== "en") return d;
  const en = DEMO_EN[d.id] ?? {};
  return {
    ...d,
    product: en.product ?? d.product,
    sector: SECTOR_EN[d.sector] ?? d.sector,
    images: d.images.map((im) => ({ ...im, label: IMAGE_LABEL_EN[im.label] ?? im.label })),
    source: d.source ? { ...d.source, note: en.note ?? d.source.note } : d.source,
  };
}


/** Titre animé mot à mot (les espaces sont conservés pour la lecture et le copier-coller). */
function Words({ text, className = "", d = 0 }: { text: string; className?: string; d?: number }) {
  const parts = text.split(" ");
  return (
    <>
      {parts.map((w, i) => (
        <span key={i} className={`w ${className}`} style={{ ["--i" as any]: i, ["--d" as any]: d }}>
          {w}
          {i < parts.length - 1 ? "\u00a0" : ""}
        </span>
      ))}
    </>
  );
}

const SECTIONS_COUNT = (() => {
  try {
    return fs.readdirSync(path.join(process.cwd(), "theme-base", "sections")).filter((f) => f.endsWith(".liquid")).length;
  } catch {
    return 40;
  }
})();

export default async function Home() {
  const lang = await serverLang();
  const T = (fr: string, en: string) => pick(lang, fr, en);
  // Médias à texte incrusté (films, courtes vidéos, visuel avant/après) : version anglaise « .en » quand elle existe.
  const M = (src: string) => {
    if (lang !== "en") return src;
    const en = src.replace(/(\.\w+)$/, ".en$1");
    return fs.existsSync(path.join(process.cwd(), "public", en)) ? en : src;
  };
  // Interface anglaise : démonstration produite en anglais (manifest.en.json) quand elle existe, sinon la française aux textes traduits.
  const rawEn = lang === "en" ? demos("manifest.en.json") : [];
  const raw = demos().map((d) => rawEn.find((x) => x.id === d.id) ?? d);
  const list = raw.map((d) => (rawEn.includes(d) ? d : localizeDemo(d, lang)));
  const d0 = list[0];
  // Avant / après : le drone (photo fournisseur sur fond de ciel) puis composé dans un décor du quotidien,
  // au même cadrage que la photo d'origine (public/demo/drone/avant-apres.jpg, produit réel détouré).
  const ba = list.find((d) => d.id === "drone") ?? d0;
  const baAfter = ba?.id === "drone" ? M("/demo/drone/avant-apres.jpg") : (raw.find((d) => d.id === ba?.id) ?? ba)?.images.find((x) => /scène|scene/i.test(x.label))?.src ?? ba?.photo;
  const user = await currentUser();
  const live = paymentsLive();
  const themes = directionCards(lang).map((c) => ({ ...c, preview: M(c.preview) }));
  const cta = user ? "/studio" : "/inscription";
  const discoveryLabel: Record<(typeof DISCOVERY.includes)[number], string> = {
    analysis: T("L'IA analyse votre produit", "AI analyzes your product"),
    brand: T("Votre marque : nom, couleurs, ton", "Your brand: name, colors, tone"),
    logos: T("Vos logos", "Your logos"),
    homePreview: T("Un aperçu de votre page d'accueil", "A preview of your home page"),
  };
  // « -10 % avec Vendre, -20 % avec Dominer » (remises des forfaits sur les packs).
  const packDiscount = PLAN_IDS.filter((id) => PLANS[id].packDiscount > 0)
    .map((id) => T(`-${Math.round(PLANS[id].packDiscount * 100)} % avec ${PLANS[id].name.fr}`, `${Math.round(PLANS[id].packDiscount * 100)}% off with ${PLANS[id].name.en}`))
    .join(", ");
  const chapters = [
    { tag: T("Analyse", "Analysis"), title: T("Une photo suffit pour démarrer.", "One photo is all it takes."), text: T("Le studio détoure votre produit au pixel près, mesure sa palette sur l'objet et dessine logo et charte. Pas encore de photo ? Ouvrez le studio quand même : vous l'ajouterez plus tard.", "The studio cuts out your product with pixel precision, measures its palette on the object itself and designs your logo and brand guidelines. No photo yet? Open the studio anyway: you can add one later."), video: M("/explainers/photo.mp4"), poster: M("/explainers/photo.jpg") },
    { tag: T("Boutique sur mesure", "Custom store"), title: T("Votre thème, créé de A à Z par l'IA.", "Your theme, built from A to Z by AI."), text: T("Couleurs et typographies de votre marque, mise en page pensée pour votre produit, sections inédites codées pour lui : un vrai thème unique, prêt pour Shopify, WooCommerce ou PrestaShop, que vous retouchez ensuite en discutant.", "Your brand's colors and fonts, a layout designed around your product, brand-new sections coded just for it: a truly unique theme, ready for Shopify, WooCommerce or PrestaShop, that you then fine-tune just by chatting."), video: M("/explainers/themes.mp4"), poster: M("/explainers/themes.jpg") },
    { tag: T("Retouche", "Editing"), title: T("Vous modifiez en discutant.", "Edit by chatting."), text: T("Boutons, titres, couleurs, images, sections : désignez n'importe quel élément dans l'aperçu et demandez ce que vous voulez, seul cet élément change. Chaque modification crée une version que vous pouvez restaurer.", "Buttons, headings, colors, images, sections: point to any element in the preview and ask for what you want; only that element changes. Every edit creates a version you can restore."), video: M("/explainers/chat.mp4"), poster: M("/explainers/chat.jpg") },
    { tag: T("Images et vidéos", "Images and videos"), title: T("Chaque visuel au bon format.", "Every visual in the right format."), text: T("Packshots, scènes, publicités et vidéos montées en 1:1, 4:5, 9:16 et 16:9, toujours à partir des pixels réels de votre produit, avec des textes nets.", "Packshots, scenes, ads and edited videos in 1:1, 4:5, 9:16 and 16:9, always built from your product's real pixels, with crisp text."), video: M("/explainers/formats.mp4"), poster: M("/explainers/formats.jpg") },
    { tag: T("Calendrier", "Calendar"), title: T("Vous validez, le studio publie.", "You approve, the studio publishes."), text: T("Des semaines de publications préparées pour chaque réseau. Rien ne part sans votre accord ; une fois vos comptes connectés, la publication programmée tourne même navigateur fermé.", "Weeks of posts prepared for each network. Nothing goes out without your approval; once your accounts are connected, scheduled publishing runs even with your browser closed."), video: M("/explainers/cal.mp4"), poster: M("/explainers/cal.jpg") },
  ];
  const features: [any, string, string][] = [
    [MessageSquare, T("Boutique par conversation", "Store by conversation"), T("Discutez à gauche, la boutique s'actualise à droite. Désignez une zone, joignez une image, demandez « modifie uniquement ce bouton ».", "Chat on the left, the store updates on the right. Point to an area, attach an image, ask \"change only this button.\"")],
    [Palette, T("Thème sur mesure par l'IA", "Custom AI-built theme"), T("Identité, composition et sections codées pour votre produit. Livré pour Shopify (Online Store 2.0 contrôlé avec Theme Check), WooCommerce ou PrestaShop, identique à l'aperçu.", "Identity, layout and sections coded for your product. Delivered for Shopify (Online Store 2.0, validated with Theme Check), WooCommerce or PrestaShop, identical to the preview.")],
    [ImageIcon, T("Images fidèles", "True-to-product images"), T("Packshots, détails, scènes, bannières, visuels sociaux et publicitaires, rangés et réutilisables partout.", "Packshots, details, scenes, banners, social and ad visuals, organized and reusable everywhere.")],
    [Film, T("Vidéos et UGC par IA", "AI videos and UGC"), T("Motion design animé, ou vidéo UGC : une personne générée par IA présente votre produit réel face caméra, avec voix et sous-titres, signalée comme contenu IA. MP4 en 9:16, 1:1, 4:5 et 16:9.", "Animated motion design, or UGC video: an AI-generated person presents your real product to camera, with voice and subtitles, labeled as AI content. MP4 in 9:16, 1:1, 4:5 and 16:9.")],
    [CalendarDays, T("Calendrier qui publie", "A calendar that publishes"), T("Jour, semaine, mois. Validation à l'unité ou en lot, règles d'automatisation, reprises sans doublon.", "Day, week, month. Approve one by one or in bulk, automation rules, retries with no duplicates.")],
    [Pause, T("Pause et reprise", "Pause and resume"), T("Mettez une création en pause, reprenez-la plus tard : les étapes terminées sont conservées, rien n'est refait.", "Pause a creation and resume it later: completed steps are kept, nothing is redone.")],
    [BookOpen, T(`${PROMPT_STATS.total} prompts sectoriels`, `${PROMPT_STATS.total} industry prompts`), T(`${PROMPT_STATS.sectors} secteurs, complétés automatiquement avec votre produit, votre marque et vos médias.`, `${PROMPT_STATS.sectors} industries, automatically filled in with your product, your brand and your media.`)],
    [FolderTree, T("Fichiers rangés par l'IA", "Files organized by AI"), T("Dossiers et sous-dossiers par boutique : l'IA classe et renomme chaque fichier, vous gardez la main pour déplacer ou créer les vôtres.", "Folders and subfolders for each store: the AI sorts and renames every file, and you stay free to move files or create your own folders.")],
    [Plug, T("Connexions officielles", "Official connections"), T("Instagram, Facebook, TikTok, YouTube, Pinterest, Canva et Shopify par leurs autorisations officielles. Jamais de mot de passe.", "Instagram, Facebook, TikTok, YouTube, Pinterest, Canva and Shopify through their official authorizations. Never a password.")],
    [Sparkles, T("Une IA qui se souvient", "An AI that remembers"), T("Faits confirmés, décisions et corrections forment une mémoire commune, respectée par toutes les créations suivantes.", "Confirmed facts, decisions and corrections build a shared memory that every following creation respects.")],
  ];
  const span = ["lg:col-span-3", "lg:col-span-3", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-3", "lg:col-span-3"];
  return (
    <div className="overflow-x-clip">
      <RevealObserver />
      <ScrollFX />
      {/* En-tête */}
      <header className="glass sticky top-0 z-50 border-b border-line/70" style={{ background: "color-mix(in srgb, var(--card) 94%, transparent)" }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label={T("E-COM STUDIO IA, accueil", "E-COM STUDIO IA, home")} className="shrink-0">
            {/* Sur petit écran (< 480 px), logo seul pour laisser la place au sélecteur de langue. */}
            <Logo className="max-[479px]:hidden" />
            <Logo compact className="min-[480px]:hidden" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-ink-2 lg:flex" aria-label={T("Navigation principale", "Main navigation")}>
            <a href="#video" className="hover:text-ink">{T("En vidéo", "Video")}</a>
            <a href="#sur-mesure" className="hover:text-ink">{T("Sur mesure", "Custom")}</a>
            <a href="#boutiques" className="hover:text-ink">{T("Plateformes", "Platforms")}</a>
            <a href="#demonstrations" className="hover:text-ink">{T("Démonstrations", "Demos")}</a>
            <a href="#studio" className="hover:text-ink">{T("Le studio", "The studio")}</a>
            <a href="#offre" className="hover:text-ink">{T("Offre", "Pricing")}</a>
            <a href="#questions" className="hover:text-ink">{T("Questions", "FAQ")}</a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LangSwitch />
            <ThemeToggle />
            {user ? (
              <Link href="/studio" className="btn-glow inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-signal px-4 text-sm font-semibold text-signal-ink">
                {T("Mon studio", "My studio")} <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link href="/connexion" className="hidden h-10 items-center rounded-full px-4 text-sm font-medium hover:bg-paper-2 sm:inline-flex">{T("Connexion", "Sign in")}</Link>
                <Link href="/inscription" className="btn-glow inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-signal px-4 text-sm font-semibold text-signal-ink">{T("Essayer", "Try it")}</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Héros */}
        <section className="relative isolate">
          <div className="hero-glow absolute inset-0 -z-10" aria-hidden />
          <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-12 lg:pb-28">
            <div className="lg:col-span-5">
              <p className="reveal glass inline-flex items-center gap-2.5 rounded-full border border-line py-1.5 pl-1.5 pr-4 text-xs font-medium uppercase tracking-[.16em] text-signal">
                <span className="grid size-7 place-items-center rounded-full bg-signal-soft"><Sparkles className="size-3.5" /></span>
                {T("Le studio e-commerce nouvelle génération", "The next-generation e-commerce studio")}
              </p>
              <h1 className="words mt-7 font-display text-[clamp(3rem,7.6vw,5.4rem)] font-semibold leading-[0.93]">
                <Words text={T("Une photo.", "One photo.")} />
                <br />
                <Words text={T("Une marque.", "One brand.")} d={2} />
                <br />
                <Words text={T("Un site qui vend.", "A site that sells.")} className="text-gradient pb-1" d={4} />
              </h1>
              <p className="reveal mt-7 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl" style={{ ["--d" as any]: 6 }}>
                {T("Vous vendez des produits ou des services ? Déposez une photo, collez un lien, ou décrivez votre activité. L'IA construit la marque, la boutique ou le site vitrine (Shopify, WordPress, PrestaShop…), les images, les vidéos et vos publications. Vous gardez la main à chaque étape.", "Selling products or services? Drop in a photo, paste a link, or describe your business. AI builds the brand, the online store or the business website (Shopify, WordPress, PrestaShop…), the images, the videos and your posts. You stay in control at every step.")}
              </p>
              <div className="reveal mt-9 flex flex-wrap items-center gap-3" style={{ ["--d" as any]: 7 }}>
                <Link href={cta} className="btn-glow inline-flex h-14 items-center gap-2.5 rounded-full bg-signal px-7 text-[15px] font-semibold text-signal-ink transition hover:-translate-y-0.5">
                  <Sparkles className="size-4" /> {T("Créer avec l'IA", "Create with AI")}
                </Link>
                <a href="#video" className="glass inline-flex h-14 items-center gap-2 rounded-full border border-line px-7 text-[15px] font-medium transition hover:border-ink">
                  {T("Voir en vidéo", "Watch the video")}
                </a>
              </div>
              <ul className="reveal mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted" style={{ ["--d" as any]: 8 }}>
                <li className="flex items-center gap-2"><Lock className="size-4 text-signal" aria-hidden /> {T("Espace privé", "Private workspace")}</li>
                <li className="flex items-center gap-2"><Check className="size-4 text-signal" aria-hidden /> {T("Découverte gratuite, sans carte bancaire", "Free discovery, no credit card")}</li>
                <li className="flex items-center gap-2"><Pause className="size-4 text-signal" aria-hidden /> {T("Pause et reprise à tout moment", "Pause and resume anytime")}</li>
              </ul>
            </div>
            <div className="relative lg:col-span-7">
              <div data-sfx className="sfx-tilt reveal reveal-scale relative mx-auto max-w-[860px]" style={{ ["--d" as any]: 3 }}>
                <div className="neon on overflow-hidden rounded-[2rem] border border-line bg-[#070B17] shadow-[0_40px_120px_-40px_var(--glow)]">
                  <FilmPlayer
                    films={[
                      { label: T("Comment ça marche · 1 min", "How it works · 1 min"), src: M("/explainers/film-court.mp4"), poster: M("/explainers/film-court.jpg"), description: T("Film explicatif sans voix : de la photo à la publication en 7 étapes", "Explainer film without voice-over: from photo to post in 7 steps") },
                    ]}
                  />
                </div>
                <ul className="mt-6 flex flex-wrap justify-center gap-2">
                  {[T("Produits ou services", "Products or services"), "Shopify · WordPress · PrestaShop", T("Vidéos et UGC par IA", "AI videos and UGC")].map((t, i) => (
                    <li key={t} className="floaty glass rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-2 shadow-soft" style={{ animationDelay: `${-i * 2}s` }}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Bandeau */}
        <div className="border-y border-white/10 bg-[#0A1024] py-4 text-white" aria-hidden>
          <div className="marquee flex w-max">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center gap-10 pr-10 font-display text-xl sm:text-2xl">
                {(lang === "en" ? ["Product analysis", "Brand direction", "Vector logo", "Custom AI-built theme", "True-to-product packshots", "Videos 9:16 · 1:1 · 4:5 · 16:9", "AI UGC videos", "Edit by chatting", "Editorial calendar", "Pause and resume"] : ["Analyse produit", "Direction de marque", "Logo vectoriel", "Thème sur mesure par l'IA", "Packshots fidèles", "Vidéos 9:16 · 1:1 · 4:5 · 16:9", "Vidéos UGC par IA", "Retouche en discutant", "Calendrier éditorial", "Pause et reprise"]).map((t) => (
                  <span key={t} className="flex items-center gap-10">
                    {t} <span className="text-[#7CC4FF]">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* En vidéo */}
        <section id="video" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
          <div className="mb-10 max-w-3xl lg:mb-4">
            <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">{T("Le studio en vidéo", "The studio on video")}</p>
            <h2 className="words mt-4 font-display text-[clamp(2.3rem,5.6vw,4.4rem)] font-semibold leading-[0.98]">
              <Words text={T("Cinq vidéos de dix secondes", "Five ten-second videos")} /> <Words text={T("pour tout comprendre.", "to understand it all.")} className="text-gradient" d={3} />
            </h2>
          </div>
          <VideoChapters chapters={chapters} />
        </section>

        {/* Chiffres */}
        <section className="border-y border-line bg-card">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-line lg:grid-cols-4">
            {[
              [1, T("thème unique, composé pour votre marque", "unique theme, designed for your brand")],
              [SECTIONS_COUNT, T("sections modifiables dans l'éditeur", "sections editable in the theme editor")],
              [4, T("formats vidéo par création", "video formats per creation")],
              [PROMPT_STATS.total, T("prompts sectoriels", "industry prompts")],
            ].map(([n, l], i) => (
              <div key={l as string} className="reveal bg-card px-5 py-10 sm:px-8 sm:py-14" style={{ ["--d" as any]: i }}>
                <p className="text-gradient font-display text-5xl font-semibold sm:text-7xl" data-count data-to={n}>{n}</p>
                <p className="mt-2 text-sm text-muted sm:text-base">{l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sur mesure, de A à Z */}
        <section id="sur-mesure" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-3xl">
              <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">{T("Sur mesure", "Custom-made")}</p>
              <h2 className="words mt-4 font-display text-[clamp(2.3rem,5.2vw,4.4rem)] font-semibold leading-[0.96]">
                <Words text={T("Un thème créé pour votre marque,", "A theme built for your brand,")} /> <Words text={T("de A à Z.", "from A to Z.")} className="text-gradient" d={5} />
              </h2>
              <p className="reveal mt-5 text-[17px] leading-relaxed text-ink-2">{T("Pas un modèle repeint : l'IA du studio conçoit votre boutique comme le ferait une agence, puis la vérifie elle-même avant de vous la montrer.", "Not a repainted template: the studio's AI designs your store the way an agency would, then reviews it itself before showing it to you.")}</p>
            </div>
            <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["01", T("Identité", "Identity"), T("Logo, palette mesurée sur votre produit, typographies et ton éditorial : la marque d'abord, le thème ensuite.", "Logo, palette measured on your product, fonts and editorial tone: brand first, theme second.")],
                ["02", T("Composition", "Layout"), T("Les sections sont choisies et ordonnées pour raconter votre produit : ouverture, preuves, détails, usage, questions.", "Sections are chosen and ordered to tell your product's story: opening, proof, details, usage, questions.")],
                ["03", T("Sections inédites", "Brand-new sections"), T("Quand rien n'existe pour votre idée, l'IA code une nouvelle section (animation, présentation, comparateur), réglable dans l'éditeur.", "When nothing exists for your idea, the AI codes a new section (animation, showcase, comparison) that you can adjust in the theme editor.")],
                ["04", T("Relecture visuelle", "Visual review"), T("Le studio photographie la boutique sur ordinateur et téléphone, la note comme un directeur artistique et corrige ce qui se voit.", "The studio screenshots the store on desktop and mobile, grades it like an art director and fixes whatever shows.")],
                ["05", T("Retouches en discutant", "Edits by chatting"), T("« Plus premium », « ce bouton en noir », « ajoute une section avis » : seul l'élément visé change, chaque version reste restaurable.", "\"More premium,\" \"make this button black,\" \"add a reviews section\": only the targeted element changes, and every version can be restored.")],
                ["06", T("Prête pour votre plateforme", "Ready for your platform"), T("Shopify (Online Store 2.0 contrôlé avec Theme Check, installé directement ou en ZIP), WooCommerce et PrestaShop (thèmes installables), kit de reprise pour Wix et Squarespace.", "Shopify (Online Store 2.0, validated with Theme Check, installed directly or as a ZIP), WooCommerce and PrestaShop (installable themes), migration kit for Wix and Squarespace.")],
              ].map(([n, t, d], i) => (
                <li key={n} className="reveal rounded-3xl border border-line bg-card p-6" style={{ ["--d" as any]: i }}>
                  <p className="font-display text-sm font-semibold text-signal">{n}</p>
                  <h3 className="mt-3 font-display text-xl font-semibold">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
                </li>
              ))}
            </ol>
            <p className="reveal mt-6 text-xs text-muted">{T("Conception sur mesure avec l'IA du studio. Sans IA, le moteur intégré part de l'une des onze directions, aux couleurs et au logo de votre marque.", "Custom design with the studio's AI. Without AI, the built-in engine starts from one of eleven directions, in your brand's colors and with your logo.")}</p>
          </div>
        </section>

        {/* Types de boutique et plateformes */}
        <section id="boutiques" className="scroll-mt-20 border-y border-line bg-card py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-3xl">
              <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">{T("Produits ou services", "Products or services")}</p>
              <h2 className="words mt-4 font-display text-[clamp(2.3rem,5.2vw,4.4rem)] font-semibold leading-[0.96]">
                <Words text={T("Un produit, un catalogue", "One product, a catalog")} /> <Words text={T("ou une niche.", "or a niche.")} className="text-gradient" d={4} />
              </h2>
              <p className="reveal mt-5 text-[17px] leading-relaxed text-ink-2">{T("Vous choisissez le type de boutique en créant le projet : le studio adapte la marque, la mise en page, les collections et la navigation.", "You choose the store type when creating the project: the studio adapts the brand, the layout, the collections and the navigation.")}</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                [T("Monoproduit", "Single-product"), T("Un produit phare mis en scène sur toute la boutique.", "One hero product showcased across the whole store."), M("/demo/drone/boutique-bureau.jpg"), T("Ostral · drone pliable", "Ostral · foldable drone")],
                [T("Multiproduits", "Multi-product"), T("Un catalogue, des collections, une fiche pour chaque article.", "A catalog, collections, a page for every item."), M("/demo/tribunes/boutique-bureau.jpg"), T("Les Tribunes · t-shirts", "Les Tribunes · T-shirts")],
                ["Niche", T("Plusieurs produits d'un même univers, pour une communauté précise.", "Several products from the same world, for a specific community."), M("/demo/chat/boutique-bureau.jpg"), T("Ronron · accessoires pour chat", "Ronron · cat accessories")],
              ].map(([t, d, img, cap], i) => (
                <figure key={t} className="reveal overflow-hidden rounded-3xl border border-line bg-paper" style={{ ["--d" as any]: i }}>
                  <img src={img} alt={T(`Boutique ${t.toLowerCase()} générée : ${cap}`, `Generated ${t.toLowerCase()} store: ${cap}`)} loading="lazy" className="aspect-[16/10] w-full object-cover object-top" />
                  <figcaption className="p-5">
                    <h3 className="font-display text-xl font-semibold">{t}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
                    <p className="mt-3 text-xs text-ink-2">{T("Démonstration :", "Demo:")} {cap}</p>
                  </figcaption>
                </figure>
              ))}
            </div>

            {/* Entreprises de services */}
            <div id="services" className="mt-20 scroll-mt-24 overflow-hidden rounded-[2rem] border border-line bg-paper">
              <div className="grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <p className="reveal inline-flex items-center gap-2 rounded-full bg-signal-soft px-3 py-1 text-xs font-semibold uppercase tracking-[.16em] text-signal"><Briefcase className="size-3.5" aria-hidden /> {T("Entreprises de services", "Service businesses")}</p>
                  <h3 className="words mt-5 font-display text-[clamp(2rem,4.2vw,3.4rem)] font-semibold leading-[1]">
                    <Words text={T("Pas de produit à vendre\u00a0?", "Nothing to ship?")} /> <Words text={T("Un site qui remplit votre agenda.", "A website that fills your calendar.")} className="text-gradient" d={3} />
                  </h3>
                  <p className="reveal mt-5 text-[17px] leading-relaxed text-ink-2">{T("Artisan, coach, salon, cabinet, restaurant, agence… Choisissez « Le site de mon entreprise de services » en créant le projet : le studio construit un site vitrine pensé pour être contacté, pas une boutique avec panier.", "Tradesperson, coach, salon, practice, restaurant, agency… Pick \"My services business website\" when creating the project: the studio builds a business website designed to get you contacted, not a store with a cart.")}</p>
                  <ul className="mt-6 grid gap-2.5 text-[15px] text-ink-2">
                    {[
                      T("Vos prestations, avec tarifs et durées si vous les donnez", "Your services, with prices and durations if you provide them"),
                      T("Prise de rendez-vous, demande de devis, appel ou formulaire", "Booking, quote request, phone call or contact form"),
                      T("Zone d'intervention, horaires, adresse et infos pratiques", "Service area, opening hours, address and practical info"),
                      T("Méthode en étapes, questions fréquentes, page à propos", "Step-by-step approach, FAQ, about page"),
                      T("Images, publications et publicités sans photo produit", "Images, posts and ads without any product photo"),
                    ].map((t, i) => (
                      <li key={t} className="reveal flex gap-2.5" style={{ ["--d" as any]: i }}><Check className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden /> {t}</li>
                    ))}
                  </ul>
                  <ul className="mt-7 flex flex-wrap gap-2" aria-label={T("Exemples d'activités", "Example businesses")}>
                    {SECTORS.filter((x) => x.kind === "services").map((x) => (
                      <li key={x.id} className="rounded-full border border-line bg-card px-3 py-1.5 text-xs text-ink-2">{lang === "en" ? x.labelEn : x.label}</li>
                    ))}
                  </ul>
                </div>
                <figure className="relative lg:col-span-7">
                  <div className="reveal reveal-scale overflow-hidden rounded-2xl border border-line bg-[#070B17] shadow-[0_30px_90px_-40px_var(--glow)]">
                    <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5" aria-hidden><span className="size-2.5 rounded-full bg-white/20" /><span className="size-2.5 rounded-full bg-white/20" /><span className="size-2.5 rounded-full bg-white/20" /></div>
                    <img src={M("/demo/services/site-bureau.jpg")} alt={T("Site vitrine généré pour une coach sportive (démonstration fictive)", "Business website generated for a personal trainer (fictional demo)")} loading="lazy" className="aspect-[16/10] w-full object-cover object-top" />
                  </div>
                  <img src={M("/demo/services/site-mobile.jpg")} alt="" aria-hidden loading="lazy" className="reveal absolute -bottom-6 right-3 hidden w-[24%] rounded-[1.4rem] border-4 border-[#0A1024] shadow-2xl sm:block" style={{ ["--d" as any]: 3 }} />
                  <figcaption className="mt-4 text-xs text-muted sm:pr-[28%]">{T("Démonstration fictive générée par le studio : « Studio Maëlle », coach sportive à Nantes, publiée pour WordPress. Aucun panier : chaque bouton mène à la prise de rendez-vous.", "Fictional demo generated by the studio: \"Studio Maëlle\", a personal trainer in Nantes, published for WordPress. No cart: every button leads to booking.")}</figcaption>
                </figure>
              </div>
            </div>

            <div className="mt-20 grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">{T("Plateformes", "Platforms")}</p>
                <h3 className="words mt-4 font-display text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1]">
                  <Words text={T("Pas seulement", "Not just")} /> <Words text="Shopify." className="text-gradient" d={2} />
                </h3>
                <p className="reveal mt-5 text-[17px] leading-relaxed text-ink-2">{T("Vous choisissez la plateforme en créant le projet (et pouvez en changer ensuite dans l'onglet Boutique). Le même site est livré pour elle ; rien n'est promis au-delà de ce que chaque plateforme accepte.", "You pick the platform when creating the project (and can change it later in the Store tab). The same site is delivered for it; nothing is promised beyond what each platform accepts.")}</p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
                {[
                  ["Shopify", T("Thème Online Store 2.0 complet, contrôlé avec Theme Check, installé directement dans votre boutique ou exporté en ZIP. Catalogue en CSV.", "Complete Online Store 2.0 theme, validated with Theme Check, installed directly in your store or exported as a ZIP. Catalog as CSV.")],
                  ["WordPress · WooCommerce", T("Thème de blocs WordPress à téléverser (Apparence › Thèmes), avec vos couleurs, typographies, images et textes. Avec WooCommerce et un catalogue CSV pour vendre des produits, ou en site vitrine sans boutique pour une entreprise de services.", "WordPress block theme to upload (Appearance › Themes), with your colors, fonts, images and copy. With WooCommerce and a CSV catalog to sell products, or as a business website without a store for a service company.")],
                  ["PrestaShop", T("Thème enfant du thème Classic (versions 1.7 et 8), installable depuis l'administration, aux couleurs de votre marque.", "Child theme of the Classic theme (versions 1.7 and 8), installable from the back office, in your brand's colors.")],
                  [T("Wix et Squarespace", "Wix and Squarespace"), T("Ces plateformes n'acceptent pas de thème importé : le studio fournit un kit de reprise (images, charte, textes, catalogue CSV et guide pas à pas).", "These platforms don't accept imported themes: the studio provides a migration kit (images, brand guidelines, copy, CSV catalog and step-by-step guide).")],
                ].map(([t, d], i) => (
                  <li key={t} className="reveal rounded-3xl border border-line bg-paper p-6" style={{ ["--d" as any]: i }}>
                    <p className="flex items-center gap-2 font-display text-lg font-semibold"><Store className="size-4 text-signal" aria-hidden /> {t}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
                  </li>
                ))}
                <li className="reveal rounded-3xl border-2 border-signal/40 bg-signal-soft/40 p-6 sm:col-span-2" style={{ ["--d" as any]: 4 }}>
                  <p className="font-display text-lg font-semibold">{T("Vous avez déjà votre site ?", "Already have a website?")}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{T("Choisissez « J'ai déjà mon site et mon logo » : le studio lit votre site et reprend votre logo, vos pages, vos produits, vos couleurs et vos polices. Fait avec Shopify, WordPress / WooCommerce, PrestaShop, Wix ou Squarespace, il est conservé tel quel ; sinon, il est reproduit sur Shopify ou WordPress avec les mêmes pages, textes et images (le code de l'ancien thème n'est pas copié, et la mise en page peut différer légèrement). Vous utilisez ensuite tout le reste du studio : images, vidéos, publications, publicités, calendrier.", "Choose \"I already have my website and logo\": the studio reads your site and takes your logo, pages, products, colors and fonts. Built with Shopify, WordPress / WooCommerce, PrestaShop, Wix or Squarespace, it is kept as it is; otherwise, it is reproduced on Shopify or WordPress with the same pages, text and images (the old theme's code is not copied, and the layout may differ slightly). You then use everything else in the studio: images, videos, posts, ads, calendar.")}</p>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Thèmes */}
        <ThemeShowcase themes={themes}>
          <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
            <div>
              <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">{T("Les thèmes", "The themes")}</p>
              <h2 className="words mt-4 font-display text-[clamp(2.3rem,5.2vw,4.4rem)] font-semibold leading-[0.96]">
                <Words text={T("Onze points de départ.", "Eleven starting points.")} /> <Words text={T("Ou aucun.", "Or none.")} className="text-gradient" d={3} />
              </h2>
            </div>
            <div>
              <p className="reveal text-[17px] leading-relaxed text-ink-2">{T("L'IA peut partir de l'une de ces onze directions (chacune avec sa composition, ses typographies et ses animations) ou composer un thème entièrement nouveau pour votre produit. Dans tous les cas, tout reste modifiable : en discutant avec le studio, puis dans l'éditeur Shopify.", "The AI can start from one of these eleven directions (each with its own layout, fonts and animations) or design an entirely new theme for your product. Either way, everything stays editable: by chatting with the studio, then in the Shopify theme editor.")}</p>
              <Link href={user ? "/studio/themes" : "/inscription"} className="reveal mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-5 text-sm font-medium hover:border-ink">
                {T("Voir la galerie", "View the gallery")} <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </ThemeShowcase>

        {/* Démonstrations */}
        <section id="demonstrations" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">{T("Démonstrations", "Demos")}</p>
                <h2 className="words mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.98]">
                  <Words text={T(`${(["Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"][list.length - 1] ?? list.length)} produits,`, `${(["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][list.length - 1] ?? list.length)} ${list.length === 1 ? "product" : "products"},`)} /> <Words text={T("une seule photo chacun.", "a single photo each.")} className="text-gradient" d={2} />
                </h2>
              </div>
              <p className="reveal max-w-md text-sm leading-relaxed text-muted">
                {lang === "en" ? (
                  <>The brands are <strong className="text-ink">created by the studio</strong>. Each demo starts from a real product sold white-label by a supplier: original photo retouched, manufacturer markings removed, brand and labels redone. Cutout, logo, store, images and videos are produced by the studio itself.</>
                ) : (
                  <>Les marques sont <strong className="text-ink">créées par le studio</strong>. Chaque démonstration part d'un vrai produit vendu en marque blanche par un fournisseur : photo d'origine retouchée, inscriptions du fabricant retirées, marque et étiquettes refaites. Détourage, logo, boutique, images et vidéos sont produits par le studio lui-même.</>
                )}
              </p>
            </div>
            {list.length ? <DemoTabs demos={list} /> : <p className="text-muted">{T("Les démonstrations s'affichent après génération (script « npm run demos »).", "Demos appear once generated (\"npm run demos\" script).")}</p>}
            {list.length > 0 && <p className="reveal mt-6 text-center text-sm text-muted">{lang === "en" ? <>These demos were made <strong className="text-ink">without the AI included in the plans</strong>. With a plan, results are far better: custom copy and branding, realistic photos, UGC videos.</> : <>Ces démonstrations ont été réalisées <strong className="text-ink">sans l'IA des forfaits</strong>. Avec un forfait, les résultats sont bien meilleurs : textes et marque sur mesure, photos réalistes, vidéos UGC.</>}</p>}
          </div>
          {list.length > 0 && (
            <div className="mt-20">
              <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <h3 className="reveal font-display text-3xl font-semibold sm:text-4xl">{T(`${list.length} publicités vidéo, aucun montage à la main.`, `${list.length} video ads, zero manual editing.`)}</h3>
                <p className="reveal mt-2 text-muted">{T("Générées par le studio à partir de chaque photo : révélation du produit, textes animés, musique originale.", "Generated by the studio from each photo: product reveal, animated text, original music.")}</p>
              </div>
              <div className="scrollbar-none mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw_-_80rem)/2_+_1.5rem))] scroll-px-4 sm:scroll-px-6 lg:scroll-px-[max(1.5rem,calc((100vw_-_80rem)/2_+_1.5rem))]">
                {list.map((d, i) => (
                  <figure key={d.id} className="reveal w-[46vw] shrink-0 snap-start sm:w-[220px]" style={{ ["--d" as any]: i % 4 }}>
                    <div className="overflow-hidden rounded-[1.6rem] border-[5px] border-[#0A1024] bg-[#0A1024] shadow-soft">
                      <AutoVideo src={d.video} poster={d.videoPoster} label={T(`Publicité vidéo 9:16 pour ${d.brand}`, `9:16 video ad for ${d.brand}`)} className="aspect-[9/16] w-full object-cover" />
                    </div>
                    <figcaption className="mt-2 text-sm"><span className="font-medium">{d.brand}</span> <span className="text-muted">· {d.sector}</span></figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Fidélité */}
        {ba && (
          <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 sm:px-6 sm:pb-32 lg:grid-cols-2">
            <div className="reveal reveal-scale">
              <BeforeAfter before={ba.photo} after={baAfter!} aspect={ba.id === "drone" ? "18 / 11" : undefined} beforeLabel={T("Photo d'origine", "Original photo")} afterLabel={T("Création du studio", "Studio creation")} />
            </div>
            <div>
              <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">{T("Fidélité au produit", "True to the product")}</p>
              <h2 className="words mt-4 font-display text-[clamp(2rem,4.6vw,3.6rem)] font-semibold leading-[1]">
                <Words text={T("Une belle image d'un autre objet", "A beautiful image of a different object")} /> <Words text={T("est un échec.", "is a failure.")} className="text-gradient" d={4} />
              </h2>
              <p className="reveal mt-5 text-lg leading-relaxed text-ink-2">
                {T("Le studio ne « réinvente » jamais votre produit. Il le détoure, puis compose le décor autour de ses pixels réels. Lorsqu'un fournisseur d'images est activé, seul l'environnement est peint ; le produit d'origine est replacé par-dessus et une vérification visuelle compare la création à votre photo.", "The studio never \"reinvents\" your product. It cuts it out, then builds the scene around its real pixels. When an image provider is enabled, only the surroundings are painted; the original product is placed back on top and a visual check compares the creation with your photo.")}
              </p>
              <ul className="reveal mt-7 grid gap-3 text-[15px]">
                {(lang === "en" ? ["Shape, proportions, label and logo preserved", "Ad copy typeset properly, crisp and error-free", "Shadows, framing and safe margins checked for every format"] : ["Forme, proportions, étiquette et logo conservés", "Textes publicitaires composés typographiquement, nets et sans faute", "Ombres, cadrages et marges de sécurité contrôlés pour chaque format"]).map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check className="mt-0.5 size-5 shrink-0 text-signal" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Rangement */}
        <section id="rangement" className="scroll-mt-20 border-y border-line bg-card py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">{T("Rangement automatique", "Automatic organization")}</p>
              <h2 className="words mt-4 font-display text-[clamp(2rem,4.6vw,3.6rem)] font-semibold leading-[1]">
                <Words text={T("Tout est rangé.", "Everything in its place.")} /> <Words text={T("C'est l'IA qui classe.", "The AI does the sorting.")} className="text-gradient" d={3} />
              </h2>
              <p className="reveal mt-5 text-lg leading-relaxed text-ink-2">
                {T("Chaque boutique a son arborescence de dossiers et sous-dossiers : produit, marque, images, vidéos, boutique, contenus. Chaque création arrive directement à sa place. Les fichiers que vous importez sont classés et renommés par l'IA.", "Each store has its own tree of folders and subfolders: product, brand, images, videos, store, content. Every creation lands right where it belongs. The files you upload are sorted and renamed by the AI.")}
              </p>
              <ul className="reveal mt-7 grid gap-3 text-[15px]">
                {(lang === "en" ? ["Folders and subfolders ready from your first project", "Uploaded files sorted and clearly renamed by the AI", "Your own folders, drag and drop, bulk moves", "Originals always kept, nothing is overwritten"] : ["Dossiers et sous-dossiers prêts dès le premier projet", "Fichiers importés classés et renommés clairement par l'IA", "Vos propres dossiers, glisser-déposer et déplacement en lot", "Originaux toujours conservés, rien n'est écrasé"]).map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check className="mt-0.5 size-5 shrink-0 text-signal" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal reveal-scale lg:col-span-7">
              <FilesSorter />
            </div>
          </div>
        </section>

        {/* Le studio */}
        <section id="studio" className="relative isolate scroll-mt-20 py-24 sm:py-32">
          <div className="hero-glow absolute inset-0 -z-10 opacity-60" aria-hidden />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-14 max-w-3xl">
              <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">{T("Le studio", "The studio")}</p>
              <h2 className="words mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.98]">
                <Words text={T("Douze espaces de travail,", "Twelve workspaces,")} /> <Words text={T("un seul projet.", "one single project.")} className="text-gradient" d={3} />
              </h2>
              <p className="reveal mt-5 text-lg text-ink-2">{T("Chaque boutique a son pilote, sa mémoire et ses fichiers. Vous revenez sur n'importe quelle partie sans recommencer : les éléments validés sont réutilisés partout.", "Each store has its own copilot, memory and files. Come back to any part without starting over: approved elements are reused everywhere.")}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              {features.map(([Icon, t, x], i) => (
                <article key={t} className={`reveal neon spot group rounded-3xl border border-line bg-card p-7 transition hover:-translate-y-1 hover:shadow-soft ${span[i]}`} style={{ ["--d" as any]: i % 3 }}>
                  <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-signal to-signal-2 text-white shadow-[0_10px_30px_-12px_var(--glow)]">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-display text-2xl">{t}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{x}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Engagements */}
        <section className="border-y border-line bg-card py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <ShieldCheck className="size-9 text-signal" />
              <h2 className="words mt-4 font-display text-[clamp(2rem,4.4vw,3.4rem)] font-semibold leading-[1]"><Words text={T("Ce que le studio", "What the studio")} /> <Words text={T("refuse de faire.", "refuses to do.")} className="text-gradient" d={3} /></h2>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
              {[
                [T("Inventer", "Make things up"), T("Une inconnue reste inconnue : pas de certification, de délai, d'avis ou de promesse d'efficacité tirés d'une photo. Elle apparaît « à compléter ».", "An unknown stays unknown: no certifications, delivery times, reviews or efficacy claims drawn from a photo. It shows up as \"to complete.\"")],
                [T("Publier sans vous", "Publish without you"), T("Aucune publication ni dépense publicitaire sans votre autorisation. Une fois une règle validée, elle s'exécute comme prévu.", "No post and no ad spend without your authorization. Once a rule is approved, it runs exactly as planned.")],
                [T("Obéir aux pages importées", "Obey imported pages"), T("Un lien importé est une source d'information, jamais une instruction capable de modifier les règles de l'IA.", "An imported link is a source of information, never an instruction that can change the AI's rules.")],
                [T("Simuler", "Fake it"), T("Un lien qui ouvre un réseau n'est pas une connexion ; un script n'est pas une vidéo ; une publication préparée n'est pas envoyée.", "A link that opens a network is not a connection; a script is not a video; a prepared post is not a sent one.")],
              ].map(([t, x], i) => (
                <li key={t} className="reveal spot rounded-3xl border border-line bg-paper p-6" style={{ ["--d" as any]: i }}>
                  <p className="font-display text-xl">
                    <span className="text-signal">{T("Jamais", "Never")}</span> {lang === "en" ? t.charAt(0).toLowerCase() + t.slice(1) : t.toLowerCase()}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{x}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Offre : forfaits, découverte gratuite, packs (tout vient de src/lib/plans.ts) */}
        <section id="offre" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="reveal text-sm font-medium uppercase tracking-[.2em] text-signal">{T("Offre", "Pricing")}</p>
            <h2 className="words mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.98]">
              <Words text={T("Un forfait, une boutique,", "One plan, one store,")} /> <Words text={T("tout compris.", "all included.")} className="text-gradient" d={3} />
            </h2>
            <p className="reveal mt-5 text-lg text-ink-2">{T("L'IA est comprise : vous savez chaque mois combien de visuels et de vidéos vous pouvez créer.", "AI is included: every month you know exactly how many visuals and videos you can create.")}</p>
          </div>
          <div className="reveal mt-10">
            <PricingCards loggedIn={!!user} />
          </div>
          <ul className="reveal mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-2">
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-signal" aria-hidden /> {T(`Satisfait ou remboursé ${REFUND_DAYS} jours`, `${REFUND_DAYS}-day money-back guarantee`)}</li>
            <li className="flex items-center gap-2"><Check className="size-4 text-signal" aria-hidden /> {T("Sans engagement en mensuel", "No commitment on monthly billing")}</li>
            <li className="flex items-center gap-2"><Check className="size-4 text-signal" aria-hidden /> {T("Résiliable à tout moment", "Cancel anytime")}</li>
          </ul>
          <CompareTable className="reveal mt-8" />
          {!live && <p className="mt-4 text-center text-xs text-muted">{T("Le paiement en ligne ouvre bientôt : vous pouvez déjà créer votre compte et faire la découverte gratuite.", "Online payment opens soon: you can already create your account and try the free discovery.")}</p>}

          {/* Découverte gratuite */}
          <div className="reveal mt-16 grid gap-8 overflow-hidden rounded-[2rem] border border-signal/30 bg-signal-soft p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-medium uppercase tracking-[.16em] text-signal">{T("Découverte gratuite", "Free discovery")}</p>
              <h3 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">{T("Voyez votre marque avant de payer.", "See your brand before you pay.")}</h3>
              <ul className="mt-5 grid gap-2.5 text-[15px] text-ink sm:grid-cols-2">
                {DISCOVERY.includes.map((k) => (
                  <li key={k} className="flex gap-2.5"><Check className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden /> {discoveryLabel[k]}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-ink-2">{T("Sans carte bancaire. Une découverte par compte. Les images, les vidéos et l'export de la boutique sont inclus dans les forfaits.", "No credit card. One discovery per account. Images, videos and store export come with the plans.")}</p>
            </div>
            <Link href={user ? "/studio" : "/inscription"} className="btn-glow inline-flex h-14 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-signal px-7 text-[15px] font-semibold text-signal-ink transition hover:-translate-y-0.5">
              <Sparkles className="size-4" aria-hidden /> {T("Essayer gratuitement", "Try it for free")}
            </Link>
          </div>

          {/* Packs */}
          <div id="packs" className="mt-16 scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <h3 className="reveal font-display text-3xl font-semibold sm:text-4xl">{T("Besoin de plus ? Les packs.", "Need more? Packs.")}</h3>
                <p className="reveal mt-2 text-ink-2">{T("À ajouter à votre forfait quand vous voulez. Ils n'expirent pas.", "Add them to your plan whenever you like. They never expire.")}</p>
              </div>
              <p className="reveal rounded-full bg-paper-2 px-4 py-2 text-sm font-medium text-ink-2">{packDiscount}</p>
            </div>
            <div className="reveal mt-6">
              <PackCards />
            </div>
            <p className="mt-3 text-xs text-muted">{T("Prix TTC. Les packs s'ajoutent à un forfait.", "Prices incl. VAT. Packs are added to a plan.")}</p>
          </div>
        </section>

        {/* Questions */}
        <section id="questions" className="scroll-mt-20 bg-paper-2 py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12">
            <h2 className="words font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1] lg:col-span-4"><Words text={T("Questions", "Frequently asked")} /> <Words text={T("fréquentes", "questions")} className="text-gradient" d={1} /></h2>
            <div className="lg:col-span-8">
              {[
                [T("Et si je vends des services, pas des produits ?", "What if I sell services, not products?"), T("Choisissez « Le site de mon entreprise de services » en créant le projet. Le studio construit alors un site vitrine (prestations, tarifs, rendez-vous ou devis, horaires, zone d'intervention) au lieu d'une boutique, et adapte les textes, images, publications et publicités. WordPress est conseillé ; Shopify convient aussi, et Wix ou Squarespace avec un kit de reprise.", "Pick \"My services business website\" when creating the project. The studio then builds a business website (services, prices, booking or quotes, opening hours, service area) instead of a store, and adapts the copy, images, posts and ads. WordPress is recommended; Shopify works too, and Wix or Squarespace with a rebuild kit.")],
                [T("J'ai déjà un site et un logo : puis-je utiliser le studio ?", "I already have a website and a logo: can I use the studio?"), T("Oui. Choisissez « J'ai déjà mon site et mon logo » et indiquez son adresse (le site doit vous appartenir ou vous devez être autorisé à l'utiliser). Le studio reconnaît la plateforme et reprend votre logo, vos pages, vos produits, vos couleurs et vos polices, sans créer de nouvelle marque. Sur Shopify, WordPress / WooCommerce, PrestaShop, Wix ou Squarespace, votre site reste tel quel ; sur une autre plateforme ou un site sur mesure, il est reproduit sur Shopify (boutique) ou WordPress (services), avec les mêmes textes et images — le studio indique ce qui est fidèle et ce qui est approché. Les contenus que votre site charge uniquement en JavaScript peuvent ne pas être lus : c'est signalé.", "Yes. Choose \"I already have my website and logo\" and enter its address (the website must be yours or you must be authorized to use it). The studio recognizes the platform and takes your logo, pages, products, colors and fonts, without creating a new brand. On Shopify, WordPress / WooCommerce, PrestaShop, Wix or Squarespace, your website stays as it is; on another platform or a custom-built site, it is reproduced on Shopify (store) or WordPress (services), with the same text and images — the studio shows what is exact and what is approximated. Content your website loads only with JavaScript may not be read: this is flagged.")],
                [T("Où choisir Shopify, WordPress ou une autre plateforme ?", "Where do I choose Shopify, WordPress or another platform?"), T("Dans le formulaire de création du projet, juste après le choix « boutique » ou « entreprise de services » : rubrique « Sur quelle plateforme vendrez-vous ? » (ou « Où sera publié votre site ? » pour une entreprise de services), avec une carte par plateforme. Vous pouvez aussi en changer plus tard depuis l'onglet Boutique : le studio relivre le site pour la nouvelle plateforme.", "In the project creation form, right after choosing \"store\" or \"services business\": \"Which platform will you sell on?\" (or \"Where will your website live?\" for a services business), with one card per platform. You can also change it later from the Store tab: the studio redelivers the site for the new platform.")],
                [T("Faut-il une photo pour commencer ?", "Do I need a photo to get started?"), T("Non. Vous pouvez ouvrir le studio sans rien, explorer les espaces et les thèmes, puis ajouter une photo, un lien ou quelques lignes quand vous êtes prêt : la création démarre à ce moment-là.", "No. You can open the studio with nothing, explore the workspaces and themes, then add a photo, a link or a few lines when you're ready: creation starts at that point.")],
                [T("Puis-je arrêter une création en cours ?", "Can I stop a creation in progress?"), T("Oui. Le bouton « Pause » arrête la création à la fin de l'étape en cours ; « Reprendre » repart de là. Les étapes déjà terminées sont conservées et ne sont ni refaites ni refacturées.", "Yes. The \"Pause\" button stops the creation at the end of the current step; \"Resume\" picks up from there. Completed steps are kept and are neither redone nor charged again.")],
                [T("Faut-il savoir écrire des prompts ?", "Do I need to know how to write prompts?"), T("Non. Une photo, un lien ou quelques lignes suffisent pour démarrer. La bibliothèque de prompts sert à aller plus loin, quand vous le souhaitez.", "No. A photo, a link or a few lines are enough to get started. The prompt library is there to go further, whenever you want.")],
                [T("Le thème Shopify est-il vraiment installable ?", "Can the Shopify theme really be installed?"), T("Oui : c'est un thème Online Store 2.0 complet (sections, blocs, réglages natifs, panier latéral, recherche, pages). Vous l'importez en ZIP, ou le studio l'installe comme thème non publié si vous connectez votre boutique.", "Yes: it's a complete Online Store 2.0 theme (sections, blocks, native settings, cart drawer, search, pages). You upload it as a ZIP, or the studio installs it as an unpublished theme if you connect your store.")],
                [T("Puis-je changer de thème après coup ?", "Can I switch themes afterwards?"), T("Oui, à tout moment depuis l'onglet Boutique (bouton « Thèmes »). Textes, images et produit sont conservés ; l'ancienne version reste restaurable.", "Yes, at any time from the Store tab (\"Themes\" button). Copy, images and product are kept; the previous version can still be restored.")],
                [T("Que se passe-t-il si une information manque ?", "What happens if some information is missing?"), T("Elle reste visible « à compléter » dans les textes, et le studio vous pose la question. Quand vous répondez, seuls les passages concernés sont mis à jour, sans écraser ce que vous avez validé.", "It stays visible as \"to complete\" in the copy, and the studio asks you about it. When you answer, only the relevant passages are updated, without overwriting what you've approved.")],
                [T("Mes publications partent-elles si mon ordinateur est éteint ?", "Do my posts go out if my computer is off?"), T("Oui, une fois vos comptes connectés. Les publications programmées sont exécutées par le serveur, avec reprises contrôlées et protection contre les doublons. Les limites propres à chaque réseau sont indiquées dans le studio.", "Yes, once your accounts are connected. Scheduled posts are run by the server, with controlled retries and duplicate protection. Each network's own limits are shown in the studio.")],
                [T("La découverte gratuite, c'est quoi ?", "What is the free discovery?"), T("Sans carte bancaire, l'IA analyse votre produit, crée votre marque et vos logos, et vous montre un aperçu de votre page d'accueil. Pour créer des images, des vidéos et exporter ou publier la boutique, choisissez un forfait. Une découverte par compte.", "With no credit card, AI analyzes your product, creates your brand and logos, and shows you a preview of your home page. To create images and videos and to export or publish the store, choose a plan. One discovery per account.")],
                [T("Puis-je gérer plusieurs boutiques ?", "Can I manage several stores?"), T("Une boutique par abonnement : pour une deuxième boutique, un deuxième abonnement.", "One store per subscription: for a second store, a second subscription.")],
                [T("Que se passe-t-il si j'arrive au bout de mes visuels ?", "What happens when I run out of visuals?"), T("Vous ajoutez un pack (il n'expire pas), ou vous attendez le mois suivant : vos quotas reviennent à la date de renouvellement. Avec Vendre et Dominer, ce que vous n'utilisez pas est reporté au mois suivant.", "You add a pack (it never expires), or you wait for next month: your quotas come back on the renewal date. With Sell and Dominate, whatever you don't use rolls over to the next month.")],
                [T("Puis-je changer de forfait ?", "Can I change plans?"), T("Oui, à tout moment, depuis « Mon compte » dans le studio.", "Yes, at any time, from \"My account\" in the studio.")],
                [T("Puis-je me faire rembourser ?", "Can I get a refund?"), T(`Oui : satisfait ou remboursé pendant ${REFUND_DAYS} jours. En mensuel, sans engagement et résiliable à tout moment.`, `Yes: ${REFUND_DAYS}-day money-back guarantee. Monthly billing has no commitment and can be canceled anytime.`)],
              ].map(([q, a]) => (
                <details key={q} className="group border-b border-line py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-xl">
                    {q}
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line transition group-open:rotate-45 group-open:border-signal group-open:bg-signal group-open:text-white">+</span>
                  </summary>
                  <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Appel final */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="scroll-scale relative isolate overflow-hidden rounded-[2rem] bg-[#0A1024] px-6 py-16 text-white sm:px-14 sm:py-24">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(800px_400px_at_85%_0%,rgba(61,110,240,.6),transparent_60%),radial-gradient(600px_400px_at_0%_100%,rgba(124,196,255,.25),transparent_60%)]" aria-hidden />
            <h2 className="words max-w-3xl font-display text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[0.95]">
              <Words text={T("Votre produit mérite mieux", "Your product deserves better")} /> <Words text={T("qu'une page blanche.", "than a blank page.")} className="bg-gradient-to-r from-[#7CC4FF] to-white bg-clip-text text-transparent" d={4} />
            </h2>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={cta} className="btn-glow inline-flex h-14 items-center gap-2 rounded-full bg-[#3D6EF0] px-7 font-semibold text-white">
                <Sparkles className="size-4" /> {T("Créer avec l'IA", "Create with AI")} <ArrowUpRight className="size-4" />
              </Link>
              <a href="#themes" className="inline-flex h-14 items-center rounded-full border border-white/20 px-7 font-medium text-white hover:border-white/50">{T("Revoir les thèmes", "See the themes again")}</a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
