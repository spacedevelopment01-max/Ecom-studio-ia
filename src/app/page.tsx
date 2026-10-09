import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Briefcase, Check, Clapperboard, FileCheck2, Lock, Minus, PackageOpen, PlugZap, ShieldCheck, Sparkles, UserRound, Wand2 } from "lucide-react";
import { pick, type Lang } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";
import { SiteFooter } from "@/components/site-footer";
import { FilesSorter } from "@/components/files-sorter";
import { AutoVideo, BeforeAfter, DemoTabs, RevealObserver, ScrollFX, ThemeShowcase, type Demo } from "@/components/landing-client";
import { HomeHeader } from "@/components/home/home-chrome";
import { HeroFilm, HowItWorks } from "@/components/home/home-media";
import { StoryScroll, type StoryDemo, type StoryStep } from "@/components/home/home-story";
import { AdEditorDemo, BrandLab, ConnectedHub, ControlDemo, SeoDocDemo, SocialCalendarDemo, StoreDevices, type BrandDemo, type SocialPost, type StoreDemo } from "@/components/home/home-demos";
import { directionById, directionCards } from "@/lib/theme/directions";
import { DISCOVERY, PLAN_IDS, PLANS, REFUND_DAYS } from "@/lib/plans";
import { CompareTable, PackCards, PricingCards } from "@/components/pricing";
import { paymentsLive } from "@/lib/payments";
import { currentUser } from "@/lib/auth";
import { SECTORS } from "@/lib/project-types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await serverLang();
  const title = pick(lang, "E-COM STUDIO IA · Toute votre activité e-commerce, un seul studio", "E-COM STUDIO IA · Your entire e-commerce business, one studio");
  const description = pick(
    lang,
    "Créez votre marque, concevez votre boutique, produisez vos contenus et développez votre activité grâce à l'intelligence artificielle, depuis une seule plateforme.",
    "Create your brand, design your store, produce your content and grow your business with artificial intelligence, all from a single platform.",
  );
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, type: "website", siteName: "E-COM STUDIO IA", images: [{ url: "/explainers/film-court.jpg", width: 1280, height: 720 }] },
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

/** En-tête de section : sur-titre, titre (dont une partie mise en valeur) et chapeau. */
function Head({ eyebrow, title, accent, lead, center, compact, className = "" }: { eyebrow: string; title: string; accent?: string; lead?: string; center?: boolean; compact?: boolean; className?: string }) {
  return (
    <div className={`${center ? "mx-auto text-center" : ""} max-w-3xl ${className}`}>
      <p className="hp-eyebrow reveal">{eyebrow}</p>
      <h2 className={`hp-title reveal mt-4 ${compact ? "text-[clamp(2rem,3.6vw,3rem)]" : "text-[clamp(2.2rem,5vw,4.1rem)]"}`} style={{ ["--d" as any]: 1 }}>
        {title} {accent && <span className="hp-accent">{accent}</span>}
      </h2>
      {lead && <p className={`hp-lead reveal mt-5 ${center ? "mx-auto max-w-2xl" : "max-w-2xl"}`} style={{ ["--d" as any]: 2 }}>{lead}</p>}
    </div>
  );
}

export default async function Home() {
  const lang = await serverLang();
  const T = (fr: string, en: string) => pick(lang, fr, en);
  // Médias à texte incrusté (films, captures, visuels) : version anglaise « .en » quand elle existe.
  const M = (src: string) => {
    if (lang !== "en") return src;
    const en = src.replace(/(\.\w+)$/, ".en$1");
    return fs.existsSync(path.join(process.cwd(), "public", en)) ? en : src;
  };
  // Images : copie WebP allégée quand elle existe (scripts/optimize-home-images.ts), sinon l'original.
  const W = (src: string) => {
    if (!/\.jpe?g$/i.test(src)) return src;
    const w = src.replace(/\.jpe?g$/i, ".webp");
    return fs.existsSync(path.join(process.cwd(), "public", w)) ? w : src;
  };
  const webp = (d: Demo): Demo => ({ ...d, photo: W(d.photo), shopDesktop: W(d.shopDesktop), shopMobile: W(d.shopMobile), videoPoster: W(d.videoPoster), images: d.images.map((im) => ({ ...im, src: W(im.src) })) });
  // Interface anglaise : démonstration produite en anglais (manifest.en.json) quand elle existe, sinon la française aux textes traduits.
  const rawEn = lang === "en" ? demos("manifest.en.json") : [];
  const raw = demos().map((d) => rawEn.find((x) => x.id === d.id) ?? d);
  const list = raw.map((d) => (rawEn.includes(d) ? d : localizeDemo(d, lang))).map(webp);
  const user = await currentUser();
  const live = paymentsLive();
  const cta = user ? "/studio" : "/inscription";
  const themes = directionCards(lang).map((c) => ({ ...c, preview: W(M(c.preview)) }));

  // Projet de démonstration qui traverse le parcours : Somnéa (oreiller), sinon la première démonstration.
  const hero = list.find((d) => d.id === "oreiller") ?? list[0];
  const img = (d: Demo | undefined, label: RegExp, n = 0) => d?.images.filter((x) => label.test(x.label))[n]?.src ?? d?.photo ?? "";
  const fontsOf = (d: Demo) => directionById(d.direction).previewFonts;
  const story: StoryDemo | null = hero
    ? {
        brand: hero.brand,
        product: hero.product,
        logo: hero.logo,
        palette: hero.palette,
        fonts: { ...fontsOf(hero), accent: T("Cormorant italique", "Cormorant italic") },
        direction: directionById(hero.direction).name,
        shopDesktop: hero.shopDesktop,
        shopMobile: hero.shopMobile,
        cutout: img(hero, /détourage|cutout/i),
        packshot: img(hero, /packshot/i),
        detail: img(hero, /détail|detail/i),
        scene1: img(hero, /scène|scene/i),
        scene2: img(hero, /scène|scene/i, 1),
        social: img(hero, /social/i),
        ad: img(hero, /publicité|ad$/i),
        banner: img(hero, /bannière|banner/i),
        videoPoster: hero.videoPoster,
      }
    : null;

  const nav = [
    { href: "#fonctionnalites", label: T("Fonctionnalités", "Features") },
    { href: "#fonctionnement", label: T("Fonctionnement", "How it works") },
    { href: "#demonstrations", label: T("Démonstrations", "Demos") },
    { href: "#offre", label: T("Tarifs", "Pricing") },
  ];

  const steps = [
    { title: T("Vous donnez une photo, un lien ou une description.", "You provide a photo, a link or a description."), text: T("Une photo de votre produit, l'adresse de votre site ou quelques lignes sur votre activité suffisent. Pas encore de photo ? Ouvrez le studio quand même : vous l'ajouterez plus tard.", "A photo of your product, your website's address or a few lines about your business is enough. No photo yet? Open the studio anyway: you can add one later."), video: M("/explainers/photo.mp4"), poster: M("/explainers/photo.jpg") },
    { title: T("Le studio comprend le projet et prépare les créations.", "The studio understands the project and prepares the creations."), text: T("Analyse du produit, marque et logo, boutique ou site, images, textes et publications : tout est préparé dans un seul projet, à vos couleurs.", "Product analysis, brand and logo, store or website, images, copy and posts: everything is prepared in a single project, in your colors."), video: M("/explainers/themes.mp4"), poster: M("/explainers/themes.jpg") },
    { title: T("Vous personnalisez et vous validez.", "You customize and approve."), text: T("Désignez un élément et demandez ce que vous voulez, ou modifiez-le vous-même. Seul l'élément visé change, et chaque version reste restaurable.", "Point to an element and ask for what you want, or edit it yourself. Only that element changes, and every version can be restored."), video: M("/explainers/chat.mp4"), poster: M("/explainers/chat.jpg") },
    { title: T("Vos créations développent votre activité.", "Your creations grow your business."), text: T("Boutique exportée pour votre plateforme, publicités aux bons formats, publications prêtes dans le calendrier. Rien n'est publié sans votre accord.", "Store exported for your platform, ads in the right formats, posts ready in the calendar. Nothing is published without your approval."), video: M("/explainers/cal.mp4"), poster: M("/explainers/cal.jpg") },
  ];

  const modules: StoryStep[] = [
    { key: "brand", label: T("Marque", "Brand"), title: T("Une identité qui part de votre produit.", "An identity that starts from your product."), text: T("Nom, logo vectoriel, palette mesurée sur l'objet lui-même et typographies : la marque est posée avant tout le reste, puis réutilisée partout.", "Name, vector logo, a palette measured on the object itself, and typefaces: the brand comes first, then is reused everywhere."), points: [T("Logo SVG", "SVG logo"), T("Palette", "Palette"), T("Typographies", "Typefaces")] },
    { key: "store", label: T("Boutique", "Store"), title: T("Une boutique composée pour votre marque.", "A store designed for your brand."), text: T("Mise en page, sections et textes pensés pour votre produit, vérifiés sur ordinateur et téléphone, puis livrés pour votre plateforme.", "Layout, sections and copy designed around your product, checked on desktop and mobile, then delivered for your platform."), points: ["Shopify", "WooCommerce", "PrestaShop"] },
    { key: "images", label: T("Images", "Images"), title: T("Des visuels fidèles au vrai produit.", "Visuals true to the real product."), text: T("Détourage, packshots, détails et scènes d'usage : le studio compose autour des pixels réels de votre produit, sans le réinventer.", "Cutouts, packshots, details and lifestyle scenes: the studio builds around your product's real pixels, without reinventing it."), points: [T("Détourage", "Cutout"), "Packshot", T("Scènes", "Scenes")] },
    { key: "ads", label: T("Publicités", "Ads"), title: T("Des publicités que vous retouchez vous-même.", "Ads you can edit yourself."), text: T("Chaque publicité s'ouvre dans un éditeur : texte, photo, formes et logo se modifient à la main, puis s'exportent aux formats des réseaux.", "Every ad opens in an editor: text, photo, shapes and logo are edited by hand, then exported in the networks' formats."), points: ["1:1", "4:5", "9:16", "16:9"] },
    { key: "video", label: T("Vidéos", "Videos"), title: T("Du storyboard à la vidéo exportée.", "From storyboard to exported video."), text: T("Plan, script et storyboard d'abord ; l'estimation s'affiche et le rendu attend votre accord. Vous approuvez, puis vous exportez.", "Plan, script and storyboard first; the estimate is shown and rendering waits for your approval. You approve, then export."), points: [T("Storyboard", "Storyboard"), T("Accord avant rendu", "Approval before render"), "MP4"] },
    { key: "seo", label: "SEO", title: T("Des textes qui se modifient comme un document.", "Copy you edit like a document."), text: T("Fiches produit, pages et articles sont des documents éditables. Une information inconnue reste « à compléter » au lieu d'être inventée.", "Product pages, pages and articles are editable documents. Unknown information stays \"to complete\" instead of being made up."), points: [T("Fiche produit", "Product page"), T("Pages", "Pages"), T("Articles", "Articles")] },
    { key: "social", label: T("Réseaux sociaux", "Social media"), title: T("Un calendrier que vous validez.", "A calendar you approve."), text: T("Publications préparées pour chaque réseau, réparties dans la semaine. Vous approuvez une par une ou en lot ; rien ne part sans vous.", "Posts prepared for each network, spread across the week. You approve one by one or in bulk; nothing goes out without you."), points: ["Instagram", "Facebook", "TikTok", "Pinterest"] },
  ];

  const brands: BrandDemo[] = list.map((d) => ({ id: d.id, brand: d.brand, sector: d.sector, direction: directionById(d.direction).name, palette: d.palette, logo: d.logo, photo: d.photo, fonts: fontsOf(d) }));
  const stores: StoreDemo[] = [
    ...["drone", "tribunes", "chat"]
      .map((id, k): StoreDemo | null => {
        const d = list.find((x) => x.id === id);
        if (!d) return null;
        const label = [T("Monoproduit", "Single-product"), T("Multiproduits", "Multi-product"), "Niche"][k];
        const text = [T("Un produit phare mis en scène sur toute la boutique.", "One hero product showcased across the whole store."), T("Un catalogue, des collections et une fiche pour chaque article.", "A catalog, collections and a page for every item."), T("Plusieurs produits d'un même univers, pour une communauté précise.", "Several products from the same world, for a specific community.")][k];
        return { id, label, text: `${text} ${T("Démonstration :", "Demo:")} ${d.brand} · ${d.product}.`, desktop: d.shopDesktop, mobile: d.shopMobile, caption: `${d.brand.toLowerCase().replace(/\s+/g, "")}.myshopify.com` };
      })
      .filter((x): x is StoreDemo => !!x),
    { id: "services", label: T("Entreprise de services", "Service business"), text: T("Démonstration fictive : « Studio Maëlle », coach sportive, publiée pour WordPress. Aucun panier : chaque bouton mène à la prise de rendez-vous.", "Fictional demo: \"Studio Maëlle\", a personal trainer, published for WordPress. No cart: every button leads to booking."), desktop: W(M("/demo/services/site-bureau.jpg")), mobile: W(M("/demo/services/site-mobile.jpg")), caption: "studio-maelle.fr" },
  ];

  const docs = story
    ? [
        { tab: T("Fiche produit", "Product page"), kind: `${T("Fiche produit", "Product page")} · ${story.brand}`, meta: T(`${story.product} · ${story.brand} — forme papillon, deux coloris.`, `${story.product} · ${story.brand} — butterfly shape, two colors.`), blocks: [{ k: "h1" as const, text: story.product }, { k: "p" as const, text: T("Oreiller ergonomique en forme de papillon, proposé en deux coloris.", "Butterfly-shaped ergonomic pillow, available in two colors.") }, { k: "li" as const, text: T("Forme papillon", "Butterfly shape") }, { k: "li" as const, text: T("Deux coloris", "Two colors") }, { k: "li" as const, text: T("Garantie : [À compléter : durée de la garantie]", "Warranty: [To complete: warranty length]") }, { k: "faq" as const, text: T("Comment l'entretenir ? [À compléter : consignes du fabricant]", "How do I care for it? [To complete: manufacturer's instructions]") }] },
        { tab: T("Page d'accueil", "Home page"), kind: `${T("Page d'accueil", "Home page")} · ${story.brand}`, meta: T(`${story.brand} · des objets à vivre pour la chambre.`, `${story.brand} · objects to live with, for the bedroom.`), blocks: [{ k: "h1" as const, text: T("Des objets à vivre.", "Objects to live with.") }, { k: "p" as const, text: T(`${story.brand} présente son oreiller ergonomique Papillon.`, `${story.brand} presents its Papillon ergonomic pillow.`) }, { k: "li" as const, text: T("Livraison : [À compléter]", "Shipping: [To complete]") }, { k: "li" as const, text: T("Retours : [À compléter]", "Returns: [To complete]") }, { k: "faq" as const, text: T("Où expédiez-vous ? [À compléter]", "Where do you ship? [To complete]") }] },
        { tab: T("Article de blog", "Blog post"), kind: T("Article de blog", "Blog post"), meta: T("Comment choisir un oreiller ergonomique : forme, hauteur, entretien.", "How to choose an ergonomic pillow: shape, height, care."), blocks: [{ k: "h1" as const, text: T("Comment choisir un oreiller ergonomique ?", "How do you choose an ergonomic pillow?") }, { k: "p" as const, text: T("Forme, hauteur, entretien : les critères à regarder avant d'acheter.", "Shape, height, care: what to look at before buying.") }, { k: "li" as const, text: T("La forme", "The shape") }, { k: "li" as const, text: T("La hauteur", "The height") }, { k: "faq" as const, text: T("Faut-il le changer régulièrement ? [À compléter : source à citer]", "Should it be replaced regularly? [To complete: source to cite]") }] },
      ]
    : [];

  const posts: SocialPost[] = story
    ? [
        { day: 0, time: "18:00", network: "Instagram", image: story.social, caption: T(`${story.product} : la forme papillon, en deux coloris.`, `${story.product}: the butterfly shape, in two colors.`) },
        { day: 2, time: "12:30", network: "Facebook", image: story.scene2, caption: T(`Découvrez ${story.brand} sur notre boutique.`, `Discover ${story.brand} in our store.`) },
        { day: 4, time: "20:00", network: "Pinterest", image: story.banner, caption: T("Idée pour la chambre : l'oreiller Papillon.", "Bedroom idea: the Papillon pillow.") },
        { day: 5, time: "11:00", network: "TikTok", image: story.scene1, caption: T("Comment bien l'installer ? Réponse en vidéo.", "How to set it up? Answer on video.") },
      ]
    : [];

  const hub = [
    { key: "brand", label: T("Marque", "Brand"), text: T("Couleurs, logo et typographies validés une fois, puis réutilisés par tous les modules du projet.", "Colors, logo and typefaces approved once, then reused by every module in the project.") },
    { key: "store", label: T("Boutique", "Store"), text: T("La boutique reprend la marque, les textes de référence et les images du projet.", "The store uses the project's brand, reference copy and images.") },
    { key: "images", label: T("Images", "Images"), text: T("Chaque visuel est rangé dans le projet et réutilisable dans la boutique, les publicités et les publications.", "Every visual is stored in the project and reusable in the store, the ads and the posts.") },
    { key: "copy", label: T("Textes", "Copy"), text: T("Les textes de référence (fiche produit, accueil) sont ceux qu'affichent la boutique et ses exports.", "The reference copy (product page, home page) is what the store and its exports display.") },
    { key: "ads", label: T("Publicités", "Ads"), text: T("Les publicités utilisent les images, la palette et le logo du projet.", "Ads use the project's images, palette and logo.") },
    { key: "video", label: T("Vidéos", "Videos"), text: T("Les vidéos partent du produit et des images du projet, avec votre accord avant le rendu.", "Videos start from the project's product and images, with your approval before rendering.") },
    { key: "social", label: T("Réseaux", "Social"), text: T("Le calendrier puise dans les mêmes visuels et textes ; rien ne part sans votre accord.", "The calendar draws on the same visuals and copy; nothing goes out without your approval.") },
  ];

  const discoveryLabel: Record<(typeof DISCOVERY.includes)[number], string> = {
    analysis: T("L'analyse de votre produit", "An analysis of your product"),
    brand: T("Votre marque : nom, couleurs, ton", "Your brand: name, colors, tone"),
    logos: T("Vos logos", "Your logos"),
    homePreview: T("Un aperçu de votre page d'accueil", "A preview of your home page"),
  };
  const packDiscount = PLAN_IDS.filter((id) => PLANS[id].packDiscount > 0)
    .map((id) => T(`-${Math.round(PLANS[id].packDiscount * 100)} % avec ${PLANS[id].name.fr}`, `${Math.round(PLANS[id].packDiscount * 100)}% off with ${PLANS[id].name.en}`))
    .join(", ");
  const ba = list.find((d) => d.id === "drone");

  // Plateformes : uniquement ce qui existe (src/lib/cms-v2/capabilities.ts, src/lib/social-v2/platforms.ts).
  type Cell = { ok: "yes" | "beta" | "no" | "kit"; text: string };
  const yes = (text: string): Cell => ({ ok: "yes", text });
  const no = (text = T("Non", "No")): Cell => ({ ok: "no", text });
  const platforms: { name: string; native: Cell; connect: Cell; kit: Cell }[] = [
    { name: "Shopify", native: yes(T("Thème Online Store 2.0 en ZIP, vérifié par Theme Check", "Online Store 2.0 theme as a ZIP, checked by Theme Check")), connect: { ok: "beta", text: T("Envoi comme thème non publié : développé, pas encore essayé sur une vraie boutique", "Upload as an unpublished theme: built, not yet tried on a real store") }, kit: no(T("Inutile", "Not needed")) },
    { name: "WordPress · WooCommerce", native: yes(T("Thème de blocs en ZIP (Apparence › Thèmes), catalogue CSV", "Block theme as a ZIP (Appearance › Themes), CSV catalog")), connect: no(), kit: no(T("Inutile", "Not needed")) },
    { name: "PrestaShop 1.7 · 8", native: yes(T("Thème enfant de Classic en ZIP", "Child theme of Classic as a ZIP")), connect: no(), kit: no(T("Inutile", "Not needed")) },
    { name: "Wix · Squarespace", native: no(T("Ces plateformes n'acceptent pas de thème importé", "These platforms don't accept imported themes")), connect: no(), kit: { ok: "kit", text: T("Pages, textes, médias, couleurs, typographies et guide pas à pas", "Pages, copy, media, colors, typefaces and a step-by-step guide") } },
  ];
  const Mark = ({ c }: { c: Cell }) => (
    <span className="flex gap-2.5">
      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${c.ok === "yes" || c.ok === "kit" ? "bg-signal text-signal-ink" : c.ok === "beta" ? "bg-[#FCEBD0] text-[#7A4500]" : "bg-paper-2 text-muted"}`}>
        {c.ok === "no" ? <Minus className="size-3" aria-hidden /> : <Check className="size-3" aria-hidden />}
      </span>
      <span className={c.ok === "no" ? "text-muted" : "text-ink-2"}>
        {c.ok === "beta" && <span className="mr-1.5 rounded bg-[#FCEBD0] px-1.5 py-0.5 text-xs font-semibold text-[#7A4500]">{T("Bêta", "Beta")}</span>}
        {c.text}
      </span>
    </span>
  );

  const faq: [string, string][] = [
    [T("Et si je vends des services, pas des produits ?", "What if I sell services, not products?"), T("Choisissez « Le site de mon entreprise de services » en créant le projet. Le studio construit alors un site vitrine (prestations, tarifs, rendez-vous ou devis, horaires, zone d'intervention) au lieu d'une boutique, et adapte les textes, images, publications et publicités. WordPress est conseillé ; Shopify convient aussi, et Wix ou Squarespace avec un kit de reprise.", "Pick \"My services business website\" when creating the project. The studio then builds a business website (services, prices, booking or quotes, opening hours, service area) instead of a store, and adapts the copy, images, posts and ads. WordPress is recommended; Shopify works too, and Wix or Squarespace with a rebuild kit.")],
    [T("J'ai déjà un site et un logo : puis-je utiliser le studio ?", "I already have a website and a logo: can I use the studio?"), T("Oui. Choisissez « J'ai déjà mon site et mon logo » et indiquez son adresse (le site doit vous appartenir ou vous devez être autorisé à l'utiliser). Le studio reconnaît la plateforme et reprend votre logo, vos pages, vos produits, vos couleurs et vos polices, sans créer de nouvelle marque. Sur Shopify, WordPress / WooCommerce, PrestaShop, Wix ou Squarespace, votre site reste tel quel ; sur une autre plateforme ou un site sur mesure, il est reproduit sur Shopify (boutique) ou WordPress (services), avec les mêmes textes et images — le studio indique ce qui est fidèle et ce qui est approché. Les contenus que votre site charge uniquement en JavaScript peuvent ne pas être lus : c'est signalé.", "Yes. Choose \"I already have my website and logo\" and enter its address (the website must be yours or you must be authorized to use it). The studio recognizes the platform and takes your logo, pages, products, colors and fonts, without creating a new brand. On Shopify, WordPress / WooCommerce, PrestaShop, Wix or Squarespace, your website stays as it is; on another platform or a custom-built site, it is reproduced on Shopify (store) or WordPress (services), with the same text and images — the studio shows what is exact and what is approximated. Content your website loads only with JavaScript may not be read: this is flagged.")],
    [T("Où choisir Shopify, WordPress ou une autre plateforme ?", "Where do I choose Shopify, WordPress or another platform?"), T("Dans le formulaire de création du projet, juste après le choix « boutique » ou « entreprise de services » : rubrique « Sur quelle plateforme vendrez-vous ? » (ou « Où sera publié votre site ? » pour une entreprise de services), avec une carte par plateforme. Vous pouvez aussi en changer plus tard depuis l'onglet Boutique : le studio relivre le site pour la nouvelle plateforme.", "In the project creation form, right after choosing \"store\" or \"services business\": \"Which platform will you sell on?\" (or \"Where will your website live?\" for a services business), with one card per platform. You can also change it later from the Store tab: the studio redelivers the site for the new platform.")],
    [T("Faut-il une photo pour commencer ?", "Do I need a photo to get started?"), T("Non. Vous pouvez ouvrir le studio sans rien, explorer les espaces et les thèmes, puis ajouter une photo, un lien ou quelques lignes quand vous êtes prêt : la création démarre à ce moment-là.", "No. You can open the studio with nothing, explore the workspaces and themes, then add a photo, a link or a few lines when you're ready: creation starts at that point.")],
    [T("Les démonstrations de cette page sont-elles des résultats clients ?", "Are the demos on this page client results?"), T("Non. Ce sont des marques créées par le studio, sans l'IA des forfaits, à partir de produits vendus en marque blanche par des fournisseurs (et un site de services fictif). Les petites démonstrations interactives tournent dans votre navigateur : rien n'est enregistré ni publié.", "No. They are brands created by the studio, without the plans' AI, from products sold white-label by suppliers (plus a fictional services website). The small interactive demos run in your browser: nothing is saved or published.")],
    [T("Puis-je arrêter une création en cours ?", "Can I stop a creation in progress?"), T("Oui. Le bouton « Pause » arrête la création à la fin de l'étape en cours ; « Reprendre » repart de là. Les étapes déjà terminées sont conservées et ne sont ni refaites ni refacturées.", "Yes. The \"Pause\" button stops the creation at the end of the current step; \"Resume\" picks up from there. Completed steps are kept and are neither redone nor charged again.")],
    [T("Le thème Shopify est-il vraiment installable ?", "Can the Shopify theme really be installed?"), T("Oui : c'est un thème Online Store 2.0 complet (sections, blocs, réglages natifs, panier latéral, recherche, pages), vérifié par Theme Check, l'outil officiel de Shopify. Vous l'importez en ZIP. L'envoi direct dans votre boutique est développé mais pas encore essayé sur une vraie boutique.", "Yes: it's a complete Online Store 2.0 theme (sections, blocks, native settings, cart drawer, search, pages), checked by Theme Check, Shopify's official tool. You upload it as a ZIP. Direct upload to your store is built but not yet tried on a real store.")],
    [T("Que se passe-t-il si une information manque ?", "What happens if some information is missing?"), T("Elle reste visible « à compléter » dans les textes, et le studio vous pose la question. Quand vous répondez, seuls les passages concernés sont mis à jour, sans écraser ce que vous avez validé.", "It stays visible as \"to complete\" in the copy, and the studio asks you about it. When you answer, only the relevant passages are updated, without overwriting what you've approved.")],
    [T("Mes publications partent-elles toutes seules ?", "Do my posts go out on their own?"), T("Seulement celles que vous avez approuvées, et une fois vos comptes connectés. La publication par les connexions officielles (Instagram, Facebook, TikTok, YouTube, Pinterest) est développée mais pas encore essayée sur de vrais comptes ; pour LinkedIn, le studio prépare les publications à publier vous-même.", "Only the ones you've approved, once your accounts are connected. Publishing through the official connections (Instagram, Facebook, TikTok, YouTube, Pinterest) is built but not yet tried on real accounts; for LinkedIn, the studio prepares posts for you to publish yourself.")],
    [T("La découverte gratuite, c'est quoi ?", "What is the free discovery?"), T("Sans carte bancaire, le moteur du studio analyse votre produit, crée votre marque et vos logos, et vous montre un aperçu de votre page d'accueil. La découverte n'utilise pas l'IA : pour profiter de l'IA, créer des images et des vidéos, et exporter ou publier la boutique, choisissez un forfait. Une découverte par compte.", "With no credit card, the studio engine analyzes your product, creates your brand and logos, and shows you a preview of your home page. The discovery doesn't use AI: to get AI, create images and videos, and export or publish the store, choose a plan. One discovery per account.")],
    [T("Puis-je gérer plusieurs boutiques ?", "Can I manage several stores?"), T("Une boutique par abonnement : pour une deuxième boutique, un deuxième abonnement.", "One store per subscription: for a second store, a second subscription.")],
    [T("Que se passe-t-il si j'arrive au bout de mes visuels ?", "What happens when I run out of visuals?"), T("Vous ajoutez un pack (il n'expire pas), ou vous attendez le mois suivant : vos quotas reviennent à la date de renouvellement. Avec Vendre et Dominer, ce que vous n'utilisez pas est reporté au mois suivant.", "You add a pack (it never expires), or you wait for next month: your quotas come back on the renewal date. With Sell and Dominate, whatever you don't use rolls over to the next month.")],
    [T("Puis-je changer de forfait ?", "Can I change plans?"), T("Oui, à tout moment, depuis « Mon compte » dans le studio.", "Yes, at any time, from \"My account\" in the studio.")],
    [T("Puis-je me faire rembourser ?", "Can I get a refund?"), T(`Oui : satisfait ou remboursé pendant ${REFUND_DAYS} jours. En mensuel, sans engagement et résiliable à tout moment.`, `Yes: ${REFUND_DAYS}-day money-back guarantee. Monthly billing has no commitment and can be canceled anytime.`)],
  ];

  return (
    <div className="hp overflow-x-clip">
      <RevealObserver />
      <ScrollFX />
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-card focus:px-4 focus:py-2">{T("Aller au contenu", "Skip to content")}</a>
      <HomeHeader links={nav} loggedIn={!!user} ctaHref={cta} />

      <main id="contenu">
        {/* ───────────── Hero : la vidéo d'entrée (fichier d'origine) dans la fenêtre du studio ───────────── */}
        <section className="relative isolate -mt-16 pt-16 sm:-mt-[72px] sm:pt-[72px]">
          <div className="hp-aura absolute inset-0 -z-10" aria-hidden />
          <div className="hp-grid absolute inset-0 -z-10" aria-hidden />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-6 sm:gap-12 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-12 lg:gap-10 lg:pt-20">
            <div className="min-w-0 lg:col-span-6 xl:col-span-6">
              <p className="hp-load inline-flex items-center gap-2 rounded-full border border-line bg-card/70 py-1.5 pl-1.5 pr-4 text-xs font-semibold tracking-[.14em] text-ink-2">
                <span className="grid size-6 place-items-center rounded-full bg-signal text-signal-ink"><Sparkles className="size-3.5" aria-hidden /></span>
                E-COM STUDIO IA
              </p>
              <h1 className="hp-title hp-load mt-6 text-[clamp(2.55rem,4.5vw,4.15rem)] !leading-[0.98]" style={{ ["--d" as any]: 1 }}>
                {lang === "en" ? <>Your entire <span className="whitespace-nowrap">e&#8209;commerce</span> business.</> : <>Toute votre activité <span className="whitespace-nowrap">e&#8209;commerce.</span></>} <span className="hp-accent">{T("Un seul studio.", "One studio.")}</span>
              </h1>
              <p className="hp-lead hp-load mt-5 max-w-xl sm:mt-6" style={{ ["--d" as any]: 2 }}>
                {T("Créez votre marque, concevez votre boutique, produisez vos contenus et développez votre activité grâce à l'intelligence artificielle, depuis une seule plateforme.", "Create your brand, design your store, produce your content and grow your business with artificial intelligence, all from a single platform.")}
              </p>
              <div className="hp-load mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap" style={{ ["--d" as any]: 3 }}>
                <Link href={cta} className="hp-btn hp-btn-primary !min-h-14 !px-6">
                  {user ? T("Ouvrir mon studio", "Open my studio") : T("Commencer mon projet", "Start my project")} <ArrowRight className="size-4" aria-hidden />
                </Link>
                <a href="#fonctionnalites" className="hp-btn hp-btn-ghost !min-h-14 !px-6">{T("Découvrir les fonctionnalités", "Explore the features")}</a>
              </div>
              <ul className="hp-load mt-6 grid gap-2 text-sm text-ink-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-x-6" style={{ ["--d" as any]: 4 }}>
                <li className="flex items-center gap-2"><Check className="size-4 text-signal" aria-hidden /> {T("Découverte gratuite, sans carte bancaire", "Free discovery, no credit card")}</li>
                <li className="flex items-center gap-2"><Lock className="size-4 text-signal" aria-hidden /> {T("Rien n'est publié sans votre accord", "Nothing is published without your approval")}</li>
              </ul>
            </div>
            <div className="relative min-w-0 lg:col-span-6 xl:col-span-6">
              {/* Deux conteneurs : l'arrivée au chargement (hp-load) et l'inclinaison au défilement (hp-hero-tilt)
                  ne se disputent plus la même propriété transform. */}
              <div className="hp-load relative" style={{ ["--d" as any]: 2 }}>
              <div data-sfx className="hp-hero-tilt relative">
                <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,var(--glow),transparent)] opacity-70 blur-2xl" aria-hidden />
                <div className="overflow-hidden rounded-[1.6rem] border border-line bg-card shadow-[var(--hp-elev)] sm:rounded-[2rem]">
                  <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
                    <span className="hp-dot" /><span className="hp-dot" /><span className="hp-dot" />
                    <span className="ml-2 truncate text-xs text-muted">{T("Comment ça marche · 1 min", "How it works · 1 min")}</span>
                  </div>
                  <HeroFilm src={M("/explainers/film-court.mp4")} poster={M("/explainers/film-court.jpg")} description={T("Film explicatif sans voix : de la photo à la publication en 7 étapes", "Explainer film without voice-over: from photo to post in 7 steps")} />
                </div>
                <ol className="scrollbar-none mt-5 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible" aria-label={T("Les modules du studio", "The studio's modules")}>
                  {modules.map((m, i) => (
                    <li key={m.key}>
                      <a href={`#module-${m.key}`} className="hp-chip min-h-11 whitespace-nowrap transition hover:border-signal hover:text-ink sm:min-h-9">
                        <span className="font-display text-xs font-semibold text-signal">{String(i + 1).padStart(2, "0")}</span> {m.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
              </div>
            </div>
          </div>
          <div className="border-y border-line bg-card/60">
            <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-5 text-sm text-muted sm:px-6">
              <span className="font-medium text-ink-2">{T("Livré pour", "Delivered for")}</span>
              <span className="font-display text-base font-semibold text-ink">Shopify</span>
              <span className="font-display text-base font-semibold text-ink">WordPress · WooCommerce</span>
              <span className="font-display text-base font-semibold text-ink">PrestaShop</span>
              <span>{T("Kit pour Wix et Squarespace", "Kit for Wix and Squarespace")}</span>
            </p>
          </div>
        </section>

        {/* ───────────── Comment ça fonctionne ───────────── */}
        <section id="fonctionnement" className="relative scroll-mt-20 py-24 sm:py-32">
          <span id="video" className="absolute -top-20" aria-hidden />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Head eyebrow={T("Comment ça fonctionne", "How it works")} title={T("Quatre étapes,", "Four steps,")} accent={T("un seul projet.", "one single project.")} lead={T("Vous apportez votre produit ou votre activité. Le studio prépare, vous décidez.", "You bring your product or your business. The studio prepares, you decide.")} />
            <div className="reveal mt-12 sm:mt-16" style={{ ["--d" as any]: 2 }}>
              <HowItWorks steps={steps} />
            </div>
          </div>
        </section>

        {/* ───────────── Parcours au défilement : les sept modules ───────────── */}
        <section id="fonctionnalites" className="hp-band relative scroll-mt-16 border-y border-line py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Head eyebrow={T("Fonctionnalités", "Features")} title={T("De la marque aux réseaux sociaux,", "From brand to social media,")} accent={T("dans le même studio.", "in the same studio.")} lead={T("Faites défiler : un même projet passe par les sept modules. Chacun reprend ce que les précédents ont créé.", "Scroll on: one project moves through all seven modules. Each one builds on what the previous ones created.")} />
            {story && (
              <div className="mt-8 lg:mt-4">
                <StoryScroll steps={modules} demo={story} />
              </div>
            )}
          </div>
        </section>

        {/* ───────────── Création de marque ───────────── */}
        <section id="marque" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <Head eyebrow={T("Création de marque", "Brand creation")} title={T("Une photo de départ,", "One starting photo,")} accent={T("une identité complète.", "a complete identity.")} lead={T("Choisissez une marque de démonstration : logo, palette et typographies ont été créés par le studio à partir de la photo du produit.", "Pick a demo brand: its logo, palette and typefaces were created by the studio from the product photo.")} />
              <p className="reveal max-w-xs text-sm text-muted lg:text-right">{T("Démonstrations réalisées sans l'IA des forfaits.", "Demos made without the plans' AI.")}</p>
            </div>
            <div className="reveal mt-12" style={{ ["--d" as any]: 2 }}>
              <BrandLab brands={brands} />
            </div>
          </div>
        </section>

        {/* ───────────── Création de boutique ───────────── */}
        <section id="boutiques" className="hp-band scroll-mt-20 border-y border-line py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Head eyebrow={T("Création de boutique", "Store creation")} title={T("Votre boutique,", "Your store,")} accent={T("sur ordinateur et téléphone.", "on desktop and mobile.")} lead={T("Un produit, un catalogue, une niche ou une entreprise de services : le studio adapte la mise en page, les collections et la navigation.", "One product, a catalog, a niche or a service business: the studio adapts the layout, the collections and the navigation.")} />
            <div className="reveal mt-12" style={{ ["--d" as any]: 2 }}>
              <StoreDevices stores={stores} />
            </div>

            {/* Thème sur mesure */}
            <div id="sur-mesure" className="mt-20 scroll-mt-24 grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="hp-eyebrow reveal">{T("Sur mesure", "Custom-made")}</p>
                <h3 className="hp-title reveal mt-4 text-[clamp(1.9rem,3.6vw,2.8rem)]">{T("Pas un modèle repeint.", "Not a repainted template.")}</h3>
                <p className="hp-lead reveal mt-4">{T("Le studio conçoit la boutique comme une agence, puis la vérifie lui-même avant de vous la montrer.", "The studio designs the store the way an agency would, then checks it itself before showing it to you.")}</p>
              </div>
              <ol className="grid gap-x-8 sm:grid-cols-2 lg:col-span-8">
                {[
                  [T("Identité", "Identity"), T("Logo, palette, typographies et ton : la marque d'abord, le thème ensuite.", "Logo, palette, typefaces and tone: brand first, theme second.")],
                  [T("Composition", "Layout"), T("Sections choisies et ordonnées pour raconter votre produit.", "Sections chosen and ordered to tell your product's story.")],
                  [T("Sections inédites", "Brand-new sections"), T("Avec l'IA, une section nouvelle peut être codée pour votre idée, réglable dans l'éditeur.", "With AI, a new section can be coded for your idea, adjustable in the theme editor.")],
                  [T("Relecture visuelle", "Visual review"), T("La boutique est photographiée sur ordinateur et téléphone, puis corrigée.", "The store is captured on desktop and mobile, then corrected.")],
                  [T("Retouches", "Edits"), T("Seul l'élément visé change ; chaque version reste restaurable.", "Only the targeted element changes; every version can be restored.")],
                  [T("Onze directions", "Eleven directions"), T("Sans IA, le moteur intégré part de l'une des onze directions, à vos couleurs.", "Without AI, the built-in engine starts from one of eleven directions, in your colors.")],
                ].map(([t, d], i) => (
                  <li key={t} className="reveal flex gap-4 border-t border-line py-5" style={{ ["--d" as any]: i % 2 }}>
                    <span className="font-display text-sm font-semibold tabular-nums text-signal">{String(i + 1).padStart(2, "0")}</span>
                    <span><span className="block font-display text-lg font-semibold">{t}</span><span className="mt-1 block text-[15px] leading-relaxed text-ink-2">{d}</span></span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Les onze directions (défilement horizontal fixé sur ordinateur, carrousel sur téléphone) */}
        <ThemeShowcase themes={themes}>
          <div className="grid items-end gap-6 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="hp-eyebrow reveal">{T("Les thèmes", "The themes")}</p>
              <h2 className="hp-title reveal mt-4 text-[clamp(2.2rem,5vw,4rem)]">{T("Onze points de départ.", "Eleven starting points.")} <span className="hp-accent">{T("Ou aucun.", "Or none.")}</span></h2>
            </div>
            <div>
              <p className="hp-lead reveal">{T("L'IA peut partir de l'une de ces onze directions ou composer un thème entièrement nouveau. Tout reste modifiable : en discutant avec le studio, puis dans l'éditeur de votre plateforme.", "The AI can start from one of these eleven directions or design an entirely new theme. Everything stays editable: by chatting with the studio, then in your platform's editor.")}</p>
              <Link href={user ? "/studio/themes" : "/inscription"} className="hp-btn hp-btn-ghost reveal mt-5">{T("Voir la galerie", "View the gallery")} <ArrowUpRight className="size-4" aria-hidden /></Link>
            </div>
          </div>
        </ThemeShowcase>

        {/* ───────────── Images et publicités ───────────── */}
        <section id="visuels" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Head eyebrow={T("Images et publicités", "Images and ads")} title={T("Fidèle au produit.", "True to the product.")} accent={T("Modifiable à la main.", "Editable by hand.")} lead={T("Le studio ne réinvente jamais votre produit : il le détoure et compose autour de ses pixels réels. Ensuite, chaque publicité se retouche comme dans un logiciel de mise en page.", "The studio never reinvents your product: it cuts it out and builds around its real pixels. Then every ad can be edited like in a layout tool.")} />
            {ba && (
              <div className="mt-12 grid items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14">
                <div className="reveal reveal-scale overflow-hidden rounded-[1.75rem] border border-line hp-elev">
                  <BeforeAfter before={ba.photo} after={W(M("/demo/drone/avant-apres.jpg"))} aspect="18 / 11" beforeLabel={T("Photo d'origine", "Original photo")} afterLabel={T("Création du studio", "Studio creation")} />
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold leading-snug">{T("Glissez pour comparer.", "Drag to compare.")}</p>
                  <ul className="mt-5 grid gap-3 text-[15px] text-ink-2">
                    {[T("Forme, proportions, étiquette et logo conservés", "Shape, proportions, label and logo preserved"), T("Textes publicitaires composés typographiquement, nets", "Ad copy typeset properly, crisp"), T("Cadrages et marges de sécurité contrôlés pour chaque format", "Framing and safe margins checked for every format")].map((x) => (
                      <li key={x} className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden /> {x}</li>
                    ))}
                  </ul>
                  <p className="mt-5 text-xs text-muted">{T(`Démonstration : ${ba.brand}, produit de fournisseur (inscriptions d'origine retirées).`, `Demo: ${ba.brand}, a supplier product (original markings removed).`)}</p>
                </div>
              </div>
            )}
            {story && (
              <div id="editeur-publicite" className="reveal mt-20 scroll-mt-24" style={{ ["--d" as any]: 1 }}>
                <AdEditorDemo cutout={story.cutout} logo={story.logo} palette={story.palette} brand={story.brand} />
              </div>
            )}
          </div>
        </section>

        {/* ───────────── Vidéo et UGC ───────────── */}
        <section id="videos" className="relative isolate scroll-mt-20 overflow-hidden bg-[#060A18] py-24 text-white sm:py-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(700px_420px_at_85%_0%,rgba(88,101,242,.35),transparent_60%),radial-gradient(600px_420px_at_0%_100%,rgba(168,144,255,.16),transparent_60%)]" aria-hidden />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-3xl">
              <p className="reveal text-[.78rem] font-semibold uppercase tracking-[.18em] text-[#AEB7FF]">{T("Vidéo et UGC", "Video and UGC")}</p>
              <h2 className="hp-title reveal mt-4 text-[clamp(2.2rem,5vw,4.1rem)] text-white">{T("Un storyboard d'abord.", "A storyboard first.")} <span className="bg-gradient-to-r from-[#AEB7FF] to-[#C9B8FF] bg-clip-text text-transparent">{T("La vidéo ensuite.", "Then the video.")}</span></h2>
              <p className="reveal mt-5 max-w-2xl text-lg leading-relaxed text-white/75">{T("Le studio prépare le plan et le storyboard, affiche l'estimation, puis attend votre accord avant le rendu. Vous approuvez la vidéo et vous l'exportez.", "The studio prepares the plan and the storyboard, shows the estimate, then waits for your approval before rendering. You approve the video and export it.")}</p>
            </div>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [Wand2, T("Stratégie et script", "Strategy and script"), T("Message, ton et déroulé adaptés à votre produit et au réseau visé.", "Message, tone and flow adapted to your product and the target network.")],
                [Clapperboard, T("Storyboard plan par plan", "Shot-by-shot storyboard"), T("Chaque plan est décrit et illustré avant toute dépense.", "Every shot is described and illustrated before any spending.")],
                [FileCheck2, T("Votre accord", "Your approval"), T("L'estimation s'affiche ; rien n'est rendu sans votre autorisation.", "The estimate is shown; nothing is rendered without your authorization.")],
                [PackageOpen, T("Rendu et exports", "Render and exports"), T("MP4 aux formats 9:16, 1:1, 4:5 et 16:9, après approbation.", "MP4 in 9:16, 1:1, 4:5 and 16:9, after approval.")],
              ].map(([Icon, t, d]: any, i) => (
                <li key={t} className="reveal bg-[#0A1024] p-6" style={{ ["--d" as any]: i }}>
                  <span className="flex items-center justify-between"><Icon className="size-5 text-[#AEB7FF]" aria-hidden /><span className="font-display text-sm text-white/40">{String(i + 1).padStart(2, "0")}</span></span>
                  <p className="mt-5 font-display text-lg font-semibold">{t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <p className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-5 text-sm leading-relaxed text-white/80"><UserRound className="mt-0.5 size-5 shrink-0 text-[#AEB7FF]" aria-hidden /> {T("Vidéo UGC (forfaits Vendre et Dominer) : une personne générée par IA présente votre produit réel face caméra, signalée comme contenu IA.", "UGC video (Sell and Dominate plans): an AI-generated person presents your real product to camera, labeled as AI content.")}</p>
              <p className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-5 text-sm leading-relaxed text-white/80"><Minus className="mt-0.5 size-5 shrink-0 text-white/50" aria-hidden /> {T("Pas encore de montage plan par plan dans une timeline interactive : vous retouchez en français et pouvez régénérer un plan, avec votre accord.", "No shot-by-shot editing in an interactive timeline yet: you make edits in plain language and can regenerate a shot, with your approval.")}</p>
            </div>
            {list.length > 0 && (
              <div className="mt-14">
                <p className="reveal font-display text-2xl font-semibold">{T("Publicités vidéo 9:16 des démonstrations", "9:16 video ads from the demos")}</p>
                <div className="scrollbar-none -mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
                  {list.map((d) => (
                    <figure key={d.id} className="w-[44vw] max-w-[220px] shrink-0 snap-start">
                      <div className="overflow-hidden rounded-[1.4rem] border-[5px] border-white/10 bg-black">
                        <AutoVideo src={d.video} poster={d.videoPoster} label={T(`Publicité vidéo 9:16 pour ${d.brand}`, `9:16 video ad for ${d.brand}`)} className="aspect-[9/16] w-full object-cover" />
                      </div>
                      <figcaption className="mt-2 text-sm"><span className="font-medium">{d.brand}</span> <span className="text-white/60">· {d.sector}</span></figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ───────────── SEO et rédaction ───────────── */}
        {docs.length > 0 && (
          <section id="seo" className="scroll-mt-20 py-24 sm:py-32">
            <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-14">
              <div className="lg:col-span-4">
                <Head compact eyebrow={T("SEO et rédaction", "SEO and copywriting")} title={T("Des textes que vous", "Copy you")} accent={T("modifiez comme un document.", "edit like a document.")} lead={T("Fiches produit, pages et articles de blog : le studio rédige, contrôle le référencement et signale ce qu'il ne sait pas. Ce que vous modifiez n'est jamais écrasé.", "Product pages, pages and blog posts: the studio writes, checks the SEO and flags what it doesn't know. What you edit is never overwritten.")} />
              </div>
              <div className="reveal lg:col-span-8" style={{ ["--d" as any]: 2 }}>
                <SeoDocDemo docs={docs} />
              </div>
            </div>
          </section>
        )}

        {/* ───────────── Réseaux sociaux ───────────── */}
        {posts.length > 0 && (
          <section id="social" className="hp-band scroll-mt-20 border-y border-line py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <Head eyebrow={T("Réseaux sociaux", "Social media")} title={T("Votre semaine de publications,", "Your week of posts,")} accent={T("validée en quelques clics.", "approved in a few clicks.")} lead={T("Cliquez sur une publication pour l'ouvrir, puis approuvez-la. Dans le studio, la publication programmée tourne même navigateur fermé, une fois vos comptes connectés.", "Click a post to open it, then approve it. In the studio, scheduled publishing runs even with your browser closed, once your accounts are connected.")} />
              <div className="reveal mt-12" style={{ ["--d" as any]: 2 }}>
                <SocialCalendarDemo posts={posts} />
              </div>
              <ul className="mt-8 flex flex-wrap gap-2 text-sm">
                {["Instagram", "Facebook", "TikTok", "YouTube", "Pinterest"].map((n) => <li key={n} className="hp-chip !text-sm">{n} <span className="rounded bg-[#FCEBD0] px-1.5 text-xs font-semibold text-[#7A4500]">{T("Bêta", "Beta")}</span></li>)}
                <li className="hp-chip !text-sm">LinkedIn <span className="text-muted">· {T("export", "export")}</span></li>
              </ul>
              <p className="mt-3 text-xs text-muted">{T("Bêta : publication par la connexion officielle développée, pas encore essayée sur de vrais comptes. Export : publications préparées, à publier vous-même.", "Beta: publishing through the official connection is built, not yet tried on real accounts. Export: posts prepared for you to publish yourself.")}</p>
            </div>
          </section>
        )}

        {/* ───────────── Tout est connecté ───────────── */}
        <section id="connecte" className="scroll-mt-20 py-24 sm:py-32">
          <span id="studio" className="sr-only" aria-hidden />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Head center eyebrow={T("Tout est connecté", "Everything is connected")} title={T("Un seul projet.", "One single project.")} accent={T("Aucune double saisie.", "No double entry.")} lead={T("Marque, images, textes, boutique, publicités, vidéos et publications partagent le même projet : ce que vous validez quelque part est réutilisé partout.", "Brand, images, copy, store, ads, videos and posts share the same project: what you approve in one place is reused everywhere.")} />
            <div className="reveal mt-14" style={{ ["--d" as any]: 2 }}>
              <ConnectedHub nodes={hub} center={story?.brand ?? "E-COM STUDIO IA"} />
            </div>
          </div>
        </section>

        {/* ───────────── Personnalisation ───────────── */}
        {story && (
          <section id="personnalisation" className="hp-band scroll-mt-20 border-y border-line py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <Head eyebrow={T("Personnalisation", "Customization")} title={T("L'IA crée.", "AI creates.")} accent={T("Vous gardez le contrôle.", "You stay in control.")} lead={T("Les retouches simples se font à la main ou par le moteur du studio, sans IA : un titre, une couleur, un arrondi, une section à masquer. Essayez.", "Simple edits are made by hand or by the studio engine, without AI: a heading, a color, rounded corners, a section to hide. Try it.")} />
              <div className="reveal mt-12" style={{ ["--d" as any]: 2 }}>
                <ControlDemo brand={story.brand} image={story.scene1} palette={story.palette} />
              </div>
            </div>
          </section>
        )}

        {/* ───────────── Plateformes et exports ───────────── */}
        <section id="plateformes" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Head eyebrow={T("Plateformes et exports", "Platforms and exports")} title={T("Ce qui est livré,", "What is delivered,")} accent={T("plateforme par plateforme.", "platform by platform.")} lead={T("Rien n'est promis au-delà de ce que chaque plateforme accepte. Vous choisissez la plateforme en créant le projet et pouvez en changer ensuite.", "Nothing is promised beyond what each platform accepts. You pick the platform when creating the project and can change it later.")} />
            <div className="reveal mt-12 overflow-hidden rounded-[1.75rem] border border-line bg-card hp-elev" style={{ ["--d" as any]: 2 }}>
              <div className="hidden grid-cols-[1.1fr_1.3fr_1.3fr_1.2fr] gap-6 border-b border-line bg-paper-2/60 px-6 py-4 text-xs font-semibold uppercase tracking-[.14em] text-muted md:grid">
                <span>{T("Plateforme", "Platform")}</span>
                <span className="flex items-center gap-1.5"><PackageOpen className="size-3.5" aria-hidden /> {T("Export natif", "Native export")}</span>
                <span className="flex items-center gap-1.5"><PlugZap className="size-3.5" aria-hidden /> {T("Connexion", "Connection")}</span>
                <span className="flex items-center gap-1.5"><Briefcase className="size-3.5" aria-hidden /> {T("Kit de reconstruction", "Rebuild kit")}</span>
              </div>
              {platforms.map((p) => (
                <div key={p.name} className="grid gap-3 border-b border-line px-5 py-5 text-sm last:border-b-0 md:grid-cols-[1.1fr_1.3fr_1.3fr_1.2fr] md:gap-6 md:px-6">
                  <p className="font-display text-lg font-semibold text-ink">{p.name}</p>
                  <div><span className="mb-1 block text-xs font-semibold uppercase tracking-[.12em] text-muted md:hidden">{T("Export natif", "Native export")}</span><Mark c={p.native} /></div>
                  <div><span className="mb-1 block text-xs font-semibold uppercase tracking-[.12em] text-muted md:hidden">{T("Connexion", "Connection")}</span><Mark c={p.connect} /></div>
                  <div><span className="mb-1 block text-xs font-semibold uppercase tracking-[.12em] text-muted md:hidden">{T("Kit de reconstruction", "Rebuild kit")}</span><Mark c={p.kit} /></div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="reveal rounded-[1.5rem] border border-line bg-card p-6">
                <p className="font-display text-lg font-semibold">{T("Vous avez déjà votre site ?", "Already have a website?")}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{T("Choisissez « J'ai déjà mon site et mon logo » : le studio reprend votre logo, vos pages, vos produits, vos couleurs et vos polices, puis vous utilisez le reste du studio (images, vidéos, publications, publicités, calendrier).", "Choose \"I already have my website and logo\": the studio takes your logo, pages, products, colors and fonts, then you use the rest of the studio (images, videos, posts, ads, calendar).")}</p>
              </div>
              <div id="services" className="reveal scroll-mt-24 rounded-[1.5rem] border border-line bg-card p-6" style={{ ["--d" as any]: 1 }}>
                <p className="font-display text-lg font-semibold">{T("Entreprises de services", "Service businesses")}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{T("Un site vitrine pensé pour être contacté : prestations, rendez-vous ou devis, horaires, zone d'intervention.", "A business website built to get you contacted: services, booking or quotes, opening hours, service area.")}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={T("Exemples d'activités", "Example businesses")}>
                  {SECTORS.filter((x) => x.kind === "services").slice(0, 8).map((x) => <li key={x.id} className="hp-chip">{lang === "en" ? x.labelEn : x.label}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────── Démonstrations complètes ───────────── */}
        <section id="demonstrations" className="hp-band scroll-mt-20 border-y border-line py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <Head eyebrow={T("Démonstrations", "Demos")} title={T(`${list.length} produits,`, `${list.length} products,`)} accent={T("une seule photo chacun.", "a single photo each.")} />
              <p className="reveal max-w-md text-sm leading-relaxed text-muted">{T("Chaque démonstration part d'un vrai produit vendu en marque blanche par un fournisseur : photo retouchée, inscriptions du fabricant retirées, marque refaite par le studio. Réalisées sans l'IA des forfaits ; ce ne sont pas des résultats clients.", "Each demo starts from a real product sold white-label by a supplier: photo retouched, manufacturer markings removed, brand redone by the studio. Made without the plans' AI; these are not client results.")}</p>
            </div>
            {list.length ? <DemoTabs demos={list} /> : <p className="text-muted">{T("Les démonstrations s'affichent après génération (script « npm run demos »).", "Demos appear once generated (\"npm run demos\" script).")}</p>}
          </div>
        </section>

        {/* ───────────── Rangement automatique et engagements ───────────── */}
        <section id="rangement" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Head compact eyebrow={T("Rangement automatique", "Automatic organization")} title={T("Tout est rangé.", "Everything in its place.")} accent={T("Rien n'est écrasé.", "Nothing is overwritten.")} lead={T("Chaque projet a ses dossiers : produit, marque, images, vidéos, boutique, contenus. Chaque création arrive à sa place ; les originaux sont toujours conservés.", "Each project has its folders: product, brand, images, videos, store, content. Every creation lands in its place; originals are always kept.")} />
            </div>
            <div className="reveal reveal-scale lg:col-span-7"><FilesSorter /></div>
          </div>
          <div className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
            <div className="grid gap-px overflow-hidden rounded-[1.75rem] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {[
                [T("N'invente pas", "Doesn't make things up"), T("Pas de certification, de délai, d'avis ou de chiffre tiré d'une photo : un manque reste « à compléter ».", "No certifications, delivery times, reviews or figures drawn from a photo: a gap stays \"to complete.\"")],
                [T("Ne publie pas sans vous", "Doesn't publish without you"), T("Aucune publication ni dépense publicitaire sans votre autorisation.", "No post and no ad spend without your authorization.")],
                [T("N'obéit pas aux pages importées", "Doesn't obey imported pages"), T("Un lien importé est une source d'information, jamais une instruction.", "An imported link is a source of information, never an instruction.")],
                [T("Ne simule pas", "Doesn't fake it"), T("Un script n'est pas une vidéo ; une publication préparée n'est pas une publication envoyée.", "A script is not a video; a prepared post is not a sent one.")],
              ].map(([t, d], i) => (
                <div key={t} className="reveal bg-card p-6" style={{ ["--d" as any]: i }}>
                  <ShieldCheck className="size-5 text-signal" aria-hidden />
                  <p className="mt-4 font-display text-lg font-semibold">{t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── Tarifs (tout vient de src/lib/plans.ts) ───────────── */}
        <section id="offre" className="hp-band scroll-mt-20 border-y border-line py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Head center eyebrow={T("Tarifs", "Pricing")} title={T("Un forfait, une boutique,", "One plan, one store,")} accent={T("l'IA comprise.", "AI included.")} lead={T("Vous savez chaque mois combien de visuels et de vidéos vous pouvez créer.", "Every month you know exactly how many visuals and videos you can create.")} />
            <div className="reveal mt-12"><PricingCards loggedIn={!!user} /></div>
            <ul className="reveal mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-2">
              <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-signal" aria-hidden /> {T(`Satisfait ou remboursé ${REFUND_DAYS} jours`, `${REFUND_DAYS}-day money-back guarantee`)}</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-signal" aria-hidden /> {T("Sans engagement en mensuel", "No commitment on monthly billing")}</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-signal" aria-hidden /> {T("Résiliable à tout moment", "Cancel anytime")}</li>
            </ul>
            <CompareTable className="reveal mt-8" />
            {!live && <p className="mt-4 text-center text-xs text-muted">{T("Le paiement en ligne ouvre bientôt : vous pouvez déjà créer votre compte et faire la découverte gratuite.", "Online payment opens soon: you can already create your account and try the free discovery.")}</p>}

            <div className="reveal mt-16 grid gap-8 overflow-hidden rounded-[2rem] border border-line bg-card p-6 hp-elev sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="hp-eyebrow">{T("Découverte gratuite", "Free discovery")}</p>
                <h3 className="hp-title mt-3 text-3xl sm:text-4xl">{T("Voyez votre marque avant de payer.", "See your brand before you pay.")}</h3>
                <ul className="mt-5 grid gap-2.5 text-[15px] text-ink sm:grid-cols-2">
                  {DISCOVERY.includes.map((k) => <li key={k} className="flex gap-2.5"><Check className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden /> {discoveryLabel[k]}</li>)}
                </ul>
                <p className="mt-4 text-sm text-ink-2">{T("Sans carte bancaire. Une découverte par compte, réalisée par le moteur du studio. L'IA, les images, les vidéos et l'export de la boutique sont inclus dans les forfaits.", "No credit card. One discovery per account, made by the studio engine. AI, images, videos and store export come with the plans.")}</p>
              </div>
              <Link href={cta} className="hp-btn hp-btn-primary !min-h-14 !px-7 whitespace-nowrap"><Sparkles className="size-4" aria-hidden /> {T("Essayer gratuitement", "Try it for free")}</Link>
            </div>

            <div id="packs" className="mt-16 scroll-mt-24">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-2xl">
                  <h3 className="hp-title reveal text-3xl sm:text-4xl">{T("Besoin de plus ? Les packs.", "Need more? Packs.")}</h3>
                  <p className="reveal mt-2 text-ink-2">{T("À ajouter à votre forfait quand vous voulez. Ils n'expirent pas.", "Add them to your plan whenever you like. They never expire.")}</p>
                </div>
                {packDiscount && <p className="reveal rounded-full bg-card px-4 py-2 text-sm font-medium text-ink-2 ring-1 ring-line">{packDiscount}</p>}
              </div>
              <div className="reveal mt-6"><PackCards /></div>
              <p className="mt-3 text-xs text-muted">{T("Prix TTC. Les packs s'ajoutent à un forfait.", "Prices incl. VAT. Packs are added to a plan.")}</p>
            </div>
          </div>
        </section>

        {/* ───────────── Questions fréquentes ───────────── */}
        <section id="questions" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Head compact eyebrow="FAQ" title={T("Questions", "Frequently asked")} accent={T("fréquentes.", "questions.")} />
              <p className="reveal mt-5 text-[15px] text-ink-2">{T("Une autre question ?", "Another question?")} <Link href="/contact" className="font-semibold text-signal underline-offset-4 hover:underline">{T("Écrivez-nous", "Write to us")}</Link>.</p>
            </div>
            <div className="lg:col-span-8">
              {faq.map(([q, a]) => (
                <details key={q} className="group border-b border-line">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-lg font-semibold sm:text-xl [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-lg transition group-open:rotate-45 group-open:border-signal group-open:bg-signal group-open:text-signal-ink" aria-hidden>+</span>
                  </summary>
                  <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-ink-2">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── Appel final ───────────── */}
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 sm:pb-32">
          <div className="scroll-scale relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-[#060A18] px-6 py-16 text-white sm:px-14 sm:py-24">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(800px_400px_at_85%_0%,rgba(88,101,242,.45),transparent_60%),radial-gradient(600px_400px_at_0%_100%,rgba(168,144,255,.2),transparent_60%)]" aria-hidden />
            <h2 className="hp-title max-w-3xl text-[clamp(2.4rem,6vw,4.8rem)] text-white">
              {T("Toute votre activité e-commerce.", "Your entire e-commerce business.")} <span className="bg-gradient-to-r from-[#AEB7FF] to-[#C9B8FF] bg-clip-text text-transparent">{T("Un seul studio.", "One studio.")}</span>
            </h2>
            <p className="mt-5 max-w-xl text-lg text-white/75">{T("Commencez par la découverte gratuite : votre marque, vos logos et un aperçu de votre page d'accueil, sans carte bancaire.", "Start with the free discovery: your brand, your logos and a preview of your home page, no credit card.")}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={cta} className="hp-btn !min-h-14 bg-white !px-7 !text-base text-[#0B1533] hover:-translate-y-0.5">{user ? T("Ouvrir mon studio", "Open my studio") : T("Commencer mon projet", "Start my project")} <ArrowRight className="size-4" aria-hidden /></Link>
              <a href="#themes" className="hp-btn !min-h-14 border border-white/25 !px-7 !text-base text-white hover:border-white/60">{T("Revoir les thèmes", "See the themes again")}</a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
