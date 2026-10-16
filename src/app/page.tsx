import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Briefcase, Check, Clapperboard, FileCheck2, Lock, Minus, MousePointerClick, PackageOpen, PlugZap, ShieldCheck, Sparkles, UserRound, Wand2 } from "lucide-react";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";
import { SiteFooter } from "@/components/site-footer";
import { FilesSorter } from "@/components/files-sorter";
import { BeforeAfter, RevealObserver, ScrollFX, type Demo } from "@/components/landing-client";
import { HomeHeader } from "@/components/home/home-chrome";
import { HeroFilm, HowItWorks } from "@/components/home/home-media";
import { StoryScroll, type StoryDemo, type StoryStep } from "@/components/home/home-story";
import { storyMedia } from "@/components/home/story-media";
import { allowsLiveAd, CALENDAR_POSTS, curateForHome, DEMO_FILMS, homeExtras, SECTION_DEMO, wallExtras } from "@/components/home/demo-curation";
import { DemoFilms, type DemoFilm } from "@/components/home/home-films";
import { AdEditorDemo, BrandLab, ConnectedHub, ControlDemo, SeoDocDemo, SocialCalendarDemo, StoreDevices, type BrandDemo, type SocialPost, type StoreDemo } from "@/components/home/home-demos";
import { BoardShowcase, FeedShowcase, PostsWall, ThemesWall, type BoardDemo, type FeedDemo, type WallItem } from "@/components/home/home-showcase";
import { directionById, directionCards } from "@/lib/theme/directions";
import { PLANS, REFUND_DAYS, TOPUP_PRICE_EUR } from "@/lib/plans";
import { demos, localizeDemo } from "@/lib/demo-content";
import { CompareTable, PricingCards } from "@/components/pricing";
import { paymentsLive } from "@/lib/payments";
import { currentUser } from "@/lib/auth";
import { SECTORS } from "@/lib/project-types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await serverLang();
  // Titre et résumé affichés par Google : les mots que tape un client (boutique en ligne, logo, publicités, IA).
  const title = pick(lang, "Boutique en ligne, logo et publicités avec l'IA · E-COM STUDIO IA", "Online store, logo and ads with AI · E-COM STUDIO IA");
  const description = pick(
    lang,
    "Une photo de votre produit suffit : l'IA crée votre logo, votre boutique Shopify, WordPress ou PrestaShop, vos images, vos publicités et vos publications. Vous validez tout. Découverte gratuite.",
    "One product photo is enough: AI creates your logo, your Shopify, WordPress or PrestaShop store, your images, your ads and your posts. You approve everything. Free discovery.",
  );
  return {
    title: { absolute: title },
    description,
    twitter: { card: "summary_large_image", title, description, images: ["/explainers/film-court.jpg"] },
    alternates: { canonical: "/" },
    openGraph: { title, description, url: "/", type: "website", siteName: "E-COM STUDIO IA", locale: lang === "en" ? "en_US" : "fr_FR", images: [{ url: "/explainers/film-court.jpg", width: 1280, height: 720 }] },
  };
}

/** Données structurées (schema.org) : uniquement ce que la page affiche, sans note, avis ni prix inventés. */
function jsonLd(lang: "fr" | "en", faq: [string, string][]) {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "E-COM STUDIO IA",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: lang,
      description: pick(lang, "Studio en ligne qui crée avec l'IA le logo, la boutique en ligne (Shopify, WordPress, PrestaShop), les images, les publicités, les vidéos et les publications d'une marque.", "Online studio that uses AI to create a brand's logo, online store (Shopify, WordPress, PrestaShop), images, ads, videos and posts."),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: lang,
      mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Bandeau « À vous d'essayer » au-dessus d'une démonstration qu'on peut manipuler. */
function TryHint({ label, text }: { label: string; text: string }) {
  return (
    <p className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-signal/30 bg-signal-soft px-4 py-3 text-[15px] text-ink-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-signal px-3 py-1 text-sm font-semibold text-signal-ink"><MousePointerClick className="size-4" aria-hidden /> {label}</span>
      <span>{text}</span>
    </p>
  );
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
  const webp = (d: Demo): Demo => ({ ...d, photo: W(d.photo), shopDesktop: W(d.shopDesktop), shopMobile: W(d.shopMobile), videoPoster: W(d.videoPoster), images: d.images.map((im) => ({ ...im, src: W(im.src) })), posts: d.posts?.map(W), board: d.board ? W(d.board) : d.board });
  // Interface anglaise : démonstration produite en anglais (manifest.en.json) quand elle existe, sinon la française aux textes traduits.
  const rawEn = lang === "en" ? demos("manifest.en.json") : [];
  const raw = demos().map((d) => rawEn.find((x) => x.id === d.id) ?? d);
  // Accueil : seuls les visuels créés par l'IA et vérifiés sans défaut (demo-curation.ts) ; aucun gabarit du studio.
  const list = raw.map((d) => (rawEn.includes(d) ? d : localizeDemo(d, lang))).map(curateForHome).map(webp);
  const user = await currentUser();
  const live = paymentsLive();
  const cta = user ? "/studio" : "/inscription";
  const themes = directionCards(lang).map((c) => ({ ...c, preview: W(M(c.preview.replace(/\.en\.jpg$/, ".jpg"))) }));

  // Projet de démonstration qui traverse le parcours (détourage, packshot, scènes, éditeur de publicité) : la première
  // boutique de produits dont la photo a pu être détourée, sinon la première boutique de produits.
  const productDemos = list.filter((d) => d.business !== "services");
  const serviceDemos = list.filter((d) => d.business === "services");
  const hero = productDemos.find((d) => d.images.some((x) => /détourage|cutout/i.test(x.label))) ?? productDemos[0] ?? list[0];
  const fontsOf = (d: Demo) => directionById(d.direction).previewFonts;
  // Images du parcours : uniquement les vraies créations de la démonstration, chacune sous sa vraie nature.
  const media = hero ? storyMedia(hero) : null;
  const extras = homeExtras(hero?.id ?? "");
  const story: StoryDemo | null = hero && media
    ? {
        brand: hero.brand,
        product: hero.product,
        logo: hero.logo,
        palette: hero.palette,
        fonts: { ...fontsOf(hero), accent: T("Cormorant italique", "Cormorant italic") },
        direction: directionById(hero.direction).name,
        shopDesktop: hero.shopDesktop,
        shopMobile: hero.shopMobile,
        ...media,
        videoPoster: hero.videoPoster,
        video: hero.video,
        // Publicité faite dans l'éditeur (quatre formats) et publications du calendrier, préparées pour l'accueil.
        adTitle: extras.editorAd?.title ?? null,
        adFormats: extras.editorAd?.formats.map((f) => ({ ...f, src: W(f.src) })) ?? [],
        ...(extras.editorAd ? { ad: W(extras.editorAd.formats.find((f) => f.aspect === "9:16")?.src ?? extras.editorAd.formats[0].src) } : {}),
        socialPosts: extras.social.map((x) => ({ src: W(x.src), network: x.network, caption: T(...x.caption) })),
      }
    : null;

  // Texte du module « Images » : exactement les sortes d'images que montre la démonstration, rien de plus.
  const KIND_NAMES: Record<string, [string, string]> = { cutout: ["Produit découpé", "Cut-out product"], packshot: ["Fond blanc", "White background"], detail: ["Gros plans", "Close-ups"], scene: ["Mises en situation", "Lifestyle shots"], social: ["Publications", "Posts"], ad: ["Publicités", "Ads"] };
  const shownKinds = [...new Set((media?.tiles ?? []).map((x) => x.kind))].filter((k) => KIND_NAMES[k]);
  const kindList = (i: 0 | 1) => {
    const n = shownKinds.map((k, j) => (j ? KIND_NAMES[k][i].toLowerCase() : KIND_NAMES[k][i]));
    const and = i === 0 ? " et " : " and ";
    const txt = n.length > 1 ? `${n.slice(0, -1).join(", ")}${and}${n[n.length - 1]}` : (n[0] ?? (i === 0 ? "Images" : "Images"));
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  };
  // Puces : les étiquettes mêmes des cases (« Produit découpé », « Fond blanc », « Mise en situation », « Publicité »).
  const TILE_NAMES: Record<string, [string, string]> = { cutout: ["Produit découpé", "Cut-out product"], packshot: ["Fond blanc", "White background"], detail: ["Détail", "Detail"], scene: ["Mise en situation", "Lifestyle shot"], social: ["Publication", "Post"], ad: ["Publicité", "Ad"] };
  const imageKinds = { fr: kindList(0), en: kindList(1), points: shownKinds.map((k) => T(...TILE_NAMES[k])) };

  const nav = [
    { href: "#fonctionnalites", label: T("Fonctionnalités", "Features") },
    { href: "#fonctionnement", label: T("Fonctionnement", "How it works") },
    { href: "#marque", label: T("Créations", "Creations") },
    { href: "#demonstrations", label: T("Démonstrations", "Demos") },
    { href: "#offre", label: T("Tarifs", "Pricing") },
  ];

  const steps = [
    { title: T("Vous donnez une photo, un lien ou une description.", "You provide a photo, a link or a description."), text: T("Une photo de votre produit, l'adresse de votre site ou quelques lignes sur votre activité suffisent. Pas encore de photo ? Ouvrez le studio quand même : vous l'ajouterez plus tard.", "A photo of your product, your website's address or a few lines about your business is enough. No photo yet? Open the studio anyway: you can add one later."), video: M("/explainers/photo.mp4"), poster: M("/explainers/photo.jpg") },
    { title: T("Le studio prépare tout pour vous.", "The studio prepares everything for you."), text: T("Votre logo, vos couleurs, votre boutique ou votre site, vos images, vos textes et vos publications : tout est créé au même endroit, dans le même style.", "Your logo, your colors, your store or website, your images, your copy and your posts: everything is created in one place, in the same style."), video: M("/explainers/themes.mp4"), poster: M("/explainers/themes.jpg") },
    { title: T("Vous changez ce que vous voulez, puis vous validez.", "You change what you want, then approve."), text: T("Cliquez sur un élément et dites ce que vous voulez, ou modifiez-le vous-même. Le reste ne bouge pas, et vous pouvez toujours revenir en arrière.", "Click an element and say what you want, or edit it yourself. Nothing else moves, and you can always go back."), video: M("/explainers/chat.mp4"), poster: M("/explainers/chat.jpg") },
    { title: T("Vous publiez et vous vendez.", "You publish and you sell."), text: T("Votre boutique est prête pour votre plateforme, vos publicités sont aux bonnes tailles et vos publications attendent dans le calendrier. Rien n'est publié sans votre accord.", "Your store is ready for your platform, your ads are in the right sizes and your posts wait in the calendar. Nothing is published without your approval."), video: M("/explainers/cal.mp4"), poster: M("/explainers/cal.jpg") },
  ];

  const modules: StoryStep[] = [
    { key: "brand", label: T("Marque", "Brand"), title: T("Un logo et des couleurs qui vous ressemblent.", "A logo and colors that look like you."), text: T("Le studio crée votre logo, choisit vos couleurs à partir de votre produit et les polices de vos textes. Ensuite, tout le reste suit ce style.", "The studio creates your logo, picks your colors from your product and the fonts for your text. Everything else then follows that style."), points: [T("Logo", "Logo"), T("Couleurs", "Colors"), T("Polices", "Fonts")] },
    { key: "store", label: T("Boutique", "Store"), title: T("Une boutique en ligne faite pour votre produit.", "An online store made for your product."), text: T("Les pages, les textes et la mise en page sont pensés pour votre produit, vérifiés sur ordinateur et sur téléphone, puis livrés pour votre plateforme.", "Pages, copy and layout are designed around your product, checked on desktop and mobile, then delivered for your platform."), points: ["Shopify", "WooCommerce", "PrestaShop"] },
    { key: "images", label: T("Images", "Images"), title: T("Des visuels fidèles au vrai produit.", "Visuals true to the real product."), text: T(`${imageKinds.fr} : le studio part de la photo de votre vrai produit et le garde tel qu'il est.`, `${imageKinds.en}: the studio starts from the photo of your real product and keeps it as it is.`), points: imageKinds.points },
    { key: "ads", label: T("Publicités", "Ads"), title: T("Des publicités que vous retouchez vous-même.", "Ads you can edit yourself."), text: T("Vous changez le texte, la photo ou le logo d'un clic, puis vous téléchargez la publicité aux bonnes tailles pour chaque réseau.", "You change the text, photo or logo in a click, then download the ad in the right sizes for each network."), points: [T("Carré", "Square"), T("Portrait", "Portrait"), T("Story", "Story"), T("Paysage", "Landscape")] },
    { key: "video", label: T("Vidéos", "Videos"), title: T("Des vidéos préparées pas à pas.", "Videos prepared step by step."), text: T("Le studio écrit le déroulé de la vidéo et vous montre chaque image avant de la fabriquer. Le prix s'affiche, et rien n'est lancé sans votre accord.", "The studio writes the video's outline and shows you each frame before making it. The price is shown, and nothing starts without your approval."), points: [T("Déroulé en images", "Outline in pictures"), T("Votre accord d'abord", "Your approval first"), T("Prête à publier", "Ready to post")] },
    { key: "seo", label: T("Google", "Google"), title: T("Des textes qui aident Google à vous trouver.", "Copy that helps Google find you."), text: T("Le studio écrit vos fiches produit, vos pages et vos articles avec des mots simples que vos clients pourraient chercher. Vous les modifiez comme un texte normal. Ce qu'il ne sait pas reste « à compléter », jamais inventé.", "The studio writes your product pages, pages and articles with simple words your customers might search for. You edit them like any text. What it doesn't know stays \"to complete\", never made up."), points: [T("Fiche produit", "Product page"), T("Pages", "Pages"), T("Articles", "Articles")] },
    { key: "social", label: T("Réseaux sociaux", "Social media"), title: T("Un calendrier que vous validez.", "A calendar you approve."), text: T("Publications préparées pour chaque réseau, réparties dans la semaine. Vous approuvez une par une ou en lot ; rien ne part sans vous.", "Posts prepared for each network, spread across the week. You approve one by one or in bulk; nothing goes out without you."), points: ["Instagram", "Facebook", "TikTok", "Pinterest"] },
  ];

  const brands: BrandDemo[] = list.map((d) => ({ id: d.id, brand: d.brand, sector: d.sector, direction: directionById(d.direction).name, palette: d.palette, logo: d.logo, photo: d.photo, fonts: fontsOf(d) }));
  // Équilibre voulu par le propriétaire : chaque vitrine commence par une démo différente (produits et services mêlés).
  const startAt = <X extends { id: string }>(xs: X[], id: string) => {
    const k = xs.findIndex((x) => x.id === id);
    return k > 0 ? [...xs.slice(k), ...xs.slice(0, k)] : xs;
  };
  // Boutiques de produits puis sites d'entreprises de services, tels que le studio les a composés.
  const handle = (b: string) => b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
  const stores: StoreDemo[] = [
    ...startAt(productDemos.filter((d) => d.shopDesktop && d.shopMobile), SECTION_DEMO.stores).map((d): StoreDemo => ({ id: d.id, label: d.sector, text: T(`Boutique ${directionById(d.direction).name} composée pour ${d.brand} · ${d.product}.`, `${directionById(d.direction).name} store designed for ${d.brand} · ${d.product}.`), desktop: d.shopDesktop, mobile: d.shopMobile, caption: `${handle(d.brand)}.myshopify.com` })),
    ...serviceDemos.filter((d) => d.shopDesktop && d.shopMobile).map((d): StoreDemo => ({ id: d.id, label: d.sector, text: T(`Entreprise fictive : ${d.brand}, site WordPress. Aucun panier : chaque bouton mène au devis, au rendez-vous ou à l'appel.`, `Fictional business: ${d.brand}, WordPress website. No cart: every button leads to a quote, a booking or a call.`), desktop: d.shopDesktop, mobile: d.shopMobile, caption: `${handle(d.brand)}.fr` })),
  ];


  // Textes et Google : une autre démo que le parcours (les sections tournent entre les démos).
  const seoDemo = list.find((d) => d.id === SECTION_DEMO.seo) ?? hero;
  const sd = seoDemo ? { brand: seoDemo.brand, product: seoDemo.product } : null;
  const docs = sd
    ? [
        { tab: T("Fiche produit", "Product page"), kind: `${T("Fiche produit", "Product page")} · ${sd.brand}`, meta: `${sd.product} · ${sd.brand}`, blocks: [{ k: "h1" as const, text: sd.product }, { k: "p" as const, text: seoDemo?.source ? T(`${sd.product}, par ${sd.brand}.`, `${sd.product} by ${sd.brand}.`) : sd.product }, { k: "li" as const, text: T("Ce que l'on voit sur la photo, décrit sans exagérer", "What the photo shows, described without exaggerating") }, { k: "li" as const, text: T("Garantie : [À compléter : durée de la garantie]", "Warranty: [To complete: warranty length]") }, { k: "faq" as const, text: T("Comment l'entretenir ? [À compléter : consignes du fabricant]", "How do I care for it? [To complete: manufacturer's instructions]") }] },
        { tab: T("Page d'accueil", "Home page"), kind: `${T("Page d'accueil", "Home page")} · ${sd.brand}`, meta: T(`${sd.brand} · page d'accueil`, `${sd.brand} · home page`), blocks: [{ k: "h1" as const, text: sd.brand }, { k: "p" as const, text: T(`${sd.brand} présente son produit : ${sd.product.toLowerCase()}.`, `${sd.brand} presents its product: ${sd.product.toLowerCase()}.`) }, { k: "li" as const, text: T("Livraison : [À compléter]", "Shipping: [To complete]") }, { k: "li" as const, text: T("Retours : [À compléter]", "Returns: [To complete]") }, { k: "faq" as const, text: T("Où expédiez-vous ? [À compléter]", "Where do you ship? [To complete]") }] },
        { tab: T("Article de blog", "Blog post"), kind: T("Article de blog", "Blog post"), meta: T(`Comment bien choisir : ${sd.product.toLowerCase()}.`, `How to choose: ${sd.product.toLowerCase()}.`), blocks: [{ k: "h1" as const, text: T(`Bien choisir : ${sd.product.toLowerCase()}`, `How to choose: ${sd.product.toLowerCase()}`) }, { k: "p" as const, text: T("Les critères à regarder avant d'acheter, sans promesse inventée.", "What to look at before buying, with no made-up promises.") }, { k: "li" as const, text: T("L'usage", "The use") }, { k: "li" as const, text: T("Le confort", "Comfort") }, { k: "faq" as const, text: T("Quelle durée de vie prévoir ? [À compléter : source à citer]", "How long does it last? [To complete: source to cite]") }] },
      ]
    : [];

  // Section « Votre semaine de publications » : une autre démo que le parcours ARVEN, avec ses vraies publications.
  const calDemo = list.find((d) => d.id === SECTION_DEMO.calendar);
  const slots = [{ day: 0, time: "18:00" }, { day: 2, time: "12:30" }, { day: 4, time: "20:00" }, { day: 5, time: "11:00" }];
  const posts: SocialPost[] = calDemo ? CALENDAR_POSTS.slice(0, 4).map((x, k) => ({ ...slots[k], network: x.network, image: W(x.src), caption: T(...x.caption) })) : [];

  // Personnalisation : une autre démo (sa mise en scène où le produit est entier).
  const ctrlDemo = list.find((d) => d.id === SECTION_DEMO.control);
  const ctrlImage = ctrlDemo?.images.find((x) => /scène|scene/i.test(x.label))?.src;
  const ctrl = ctrlDemo && ctrlImage ? { brand: ctrlDemo.brand, image: ctrlImage, palette: ctrlDemo.palette } : null;
  // Vidéos de démonstration : une par démo retenue (regardées image par image), produits et services mêlés.
  const films: DemoFilm[] = DEMO_FILMS.flatMap((f) => {
    const d = list.find((x) => x.id === f.id);
    return d ? [{ id: f.id, brand: d.brand, kind: d.business === "services" ? "services" : "products", label: T(...f.label), src: f.src, poster: W(f.poster) } as DemoFilm] : [];
  });

  const hub = [
    { key: "brand", label: T("Marque", "Brand"), text: T("Couleurs, logo et polices validés une fois, puis repris partout dans le projet.", "Colors, logo and fonts approved once, then reused everywhere in the project.") },
    { key: "store", label: T("Boutique", "Store"), text: T("La boutique reprend votre logo, vos couleurs, vos textes et vos images.", "The store uses your logo, colors, copy and images.") },
    { key: "images", label: T("Images", "Images"), text: T("Chaque visuel est rangé dans le projet et réutilisable dans la boutique, les publicités et les publications.", "Every visual is stored in the project and reusable in the store, the ads and the posts.") },
    { key: "copy", label: T("Textes", "Copy"), text: T("La fiche produit et la page d'accueil que vous validez sont celles qu'affiche votre boutique.", "The product page and home page you approve are the ones your store shows.") },
    { key: "ads", label: T("Publicités", "Ads"), text: T("Les publicités reprennent vos images, vos couleurs et votre logo.", "Ads use your images, colors and logo.") },
    { key: "video", label: T("Vidéos", "Videos"), text: T("Les vidéos partent de votre produit et de vos images, et ne sont fabriquées qu'avec votre accord.", "Videos start from your product and your images, and are only made with your approval.") },
    { key: "social", label: T("Réseaux", "Social"), text: T("Le calendrier puise dans les mêmes visuels et textes ; rien ne part sans votre accord.", "The calendar draws on the same visuals and copy; nothing goes out without your approval.") },
  ];

  // Avant / après : la photo d'origine (Pixabay) et une création du studio sur le vrai produit.
  // Après : une publication faite par le studio sur la vraie photo (sinon une image du produit).
  const ba = productDemos.find((d) => d.id === SECTION_DEMO.beforeAfter) ?? productDemos[0];
  const baAfter = ba ? (ba.posts?.[0] ?? (ba.images.find((x) => /scène|scene/i.test(x.label)) ?? ba.images.find((x) => /packshot/i.test(x.label)))?.src) : undefined;

  // Créations réelles des démonstrations : planches d'identité, fils de publications, mur de publications.
  const boards: BoardDemo[] = startAt(list.filter((d) => d.board), SECTION_DEMO.boards).map((d) => ({ id: d.id, brand: d.brand, sector: d.sector, board: d.board!, palette: d.palette }));
  const feeds: FeedDemo[] = startAt(list.filter((d) => (d.posts?.length ?? 0) >= 4), SECTION_DEMO.feeds).map((d) => ({ id: d.id, brand: d.brand, handle: d.brand.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, ""), logo: d.logo, palette: d.palette, posts: d.posts! }));
  // Mur : les publications des marques entremêlées (jamais deux d'une même marque côte à côte).
  const wall: WallItem[] = [];
  for (let k = 0; k < 8; k++) for (const f of feeds) if (f.posts[k]) wall.push({ src: f.posts[k], brand: f.brand });
  // Publications créées par l'IA (ARVEN) : une au milieu de chaque rangée du mur, jamais côte à côte.
  const iaWall: WallItem[] = list.flatMap((d) => wallExtras(d.id).map((src) => ({ src: W(src), brand: d.brand, tall: true })));
  const wallBrands = new Set([...feeds.map((f) => f.brand), ...iaWall.map((x) => x.brand)]).size;
  if (wall.length >= 6)
    iaWall.forEach((x, j) => {
      const half = Math.ceil((wall.length + iaWall.length) / 2);
      wall.splice(Math.min(wall.length, j * half + Math.floor(half / 2)), 0, x);
    });

  // Plateformes : uniquement ce qui existe (src/lib/cms-v2/capabilities.ts, src/lib/social-v2/platforms.ts).
  type Cell = { ok: "yes" | "beta" | "no" | "kit"; text: string };
  const yes = (text: string): Cell => ({ ok: "yes", text });
  const no = (text = T("Non", "No")): Cell => ({ ok: "no", text });
  const platforms: { name: string; native: Cell; connect: Cell; kit: Cell }[] = [
    { name: "Shopify", native: yes(T("Thème Shopify complet à importer, vérifié par l'outil officiel de Shopify", "Complete Shopify theme to import, checked by Shopify's official tool")), connect: { ok: "beta", text: T("Envoi dans votre boutique sans la mettre en ligne : prêt, pas encore essayé sur une vraie boutique", "Sent to your store without going live: built, not yet tried on a real store") }, kit: no(T("Pas besoin", "Not needed")) },
    { name: "WordPress · WooCommerce", native: yes(T("Thème à importer (Apparence › Thèmes) et fichier de vos produits", "Theme to import (Appearance › Themes) and a file of your products")), connect: no(), kit: no(T("Pas besoin", "Not needed")) },
    { name: "PrestaShop 1.7 · 8", native: yes(T("Thème à importer, basé sur le thème Classic", "Theme to import, based on the Classic theme")), connect: no(), kit: no(T("Pas besoin", "Not needed")) },
    { name: "Wix · Squarespace", native: no(T("Ces plateformes n'acceptent pas de thème importé", "These platforms don't accept imported themes")), connect: no(), kit: { ok: "kit", text: T("Vos pages, textes, images, couleurs et polices, avec un guide pas à pas", "Your pages, copy, images, colors and fonts, with a step-by-step guide") } },
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
    [T("Et si je vends des services, pas des produits ?", "What if I sell services, not products?"), T("Choisissez « Le site de mon entreprise de services » en créant le projet. Le studio construit alors un site pour présenter votre activité (prestations, tarifs, rendez-vous ou devis, horaires, zone d'intervention) au lieu d'une boutique, et adapte les textes, images, publications et publicités. WordPress est conseillé ; Shopify convient aussi, et Wix ou Squarespace avec un guide pas à pas.", "Pick \"My services business website\" when creating the project. The studio then builds a business website (services, prices, booking or quotes, opening hours, service area) instead of a store, and adapts the copy, images, posts and ads. WordPress is recommended; Shopify works too, and Wix or Squarespace with a step-by-step guide.")],
    [T("J'ai déjà un site et un logo : puis-je utiliser le studio ?", "I already have a website and a logo: can I use the studio?"), T("Oui. Choisissez « J'ai déjà mon site et mon logo » et indiquez son adresse (le site doit vous appartenir ou vous devez être autorisé à l'utiliser). Le studio reconnaît la plateforme et reprend votre logo, vos pages, vos produits, vos couleurs et vos polices, sans créer de nouvelle marque. Sur Shopify, WordPress / WooCommerce, PrestaShop, Wix ou Squarespace, votre site reste tel quel ; sur une autre plateforme ou un site sur mesure, il est reproduit sur Shopify (boutique) ou WordPress (services), avec les mêmes textes et images — le studio indique ce qui est fidèle et ce qui est approché. Certains contenus de sites très techniques peuvent ne pas être lus : le studio vous le signale.", "Yes. Choose \"I already have my website and logo\" and enter its address (the website must be yours or you must be authorized to use it). The studio recognizes the platform and takes your logo, pages, products, colors and fonts, without creating a new brand. On Shopify, WordPress / WooCommerce, PrestaShop, Wix or Squarespace, your website stays as it is; on another platform or a custom-built site, it is reproduced on Shopify (store) or WordPress (services), with the same text and images — the studio shows what is exact and what is approximated. Some content on very technical websites may not be read: the studio tells you.")],
    [T("Où choisir Shopify, WordPress ou une autre plateforme ?", "Where do I choose Shopify, WordPress or another platform?"), T("Dans le formulaire de création du projet, juste après le choix « boutique » ou « entreprise de services » : rubrique « Sur quelle plateforme vendrez-vous ? » (ou « Où sera publié votre site ? » pour une entreprise de services), avec une carte par plateforme. Vous pouvez aussi en changer plus tard depuis l'onglet Boutique : le studio relivre le site pour la nouvelle plateforme.", "In the project creation form, right after choosing \"store\" or \"services business\": \"Which platform will you sell on?\" (or \"Where will your website live?\" for a services business), with one card per platform. You can also change it later from the Store tab: the studio redelivers the site for the new platform.")],
    [T("Faut-il une photo pour commencer ?", "Do I need a photo to get started?"), T("Non. Vous pouvez ouvrir le studio sans rien, explorer les espaces et les thèmes, puis ajouter une photo, un lien ou quelques lignes quand vous êtes prêt : la création démarre à ce moment-là.", "No. You can open the studio with nothing, explore the workspaces and themes, then add a photo, a link or a few lines when you're ready: creation starts at that point.")],
    [T("Les démonstrations de cette page sont-elles des résultats clients ?", "Are the demos on this page client results?"), T("Non. Ce sont des marques et des entreprises fictives, créées dans le studio avec l'IA comme pour un client, à partir de vraies photos (Pixabay, fournisseur) ou de photos créées par l'IA : un casque, des articles de supporter, une gourde, un fleuriste et un paysagiste. Les petites démonstrations interactives tournent dans votre navigateur : rien n'est enregistré ni publié.", "No. They are fictional brands and businesses, created in the studio with AI just like for a client, from real photos (Pixabay, supplier) or AI-created photos: headphones, supporter gear, a water bottle, a florist and a landscaper. The small interactive demos run in your browser: nothing is saved or published.")],
    [T("Puis-je arrêter une création en cours ?", "Can I stop a creation in progress?"), T("Oui. Le bouton « Pause » arrête la création à la fin de l'étape en cours ; « Reprendre » repart de là. Les étapes déjà terminées sont conservées et ne sont ni refaites ni refacturées.", "Yes. The \"Pause\" button stops the creation at the end of the current step; \"Resume\" picks up from there. Completed steps are kept and are neither redone nor charged again.")],
    [T("Le thème Shopify est-il vraiment installable ?", "Can the Shopify theme really be installed?"), T("Oui. C'est un thème Shopify complet (pages, panier, recherche, réglages), vérifié par l'outil officiel de Shopify. Vous l'importez en un seul fichier. L'envoi direct dans votre boutique est prêt, mais pas encore essayé sur une vraie boutique.", "Yes. It's a complete Shopify theme (pages, cart, search, settings), checked by Shopify's official tool. You import it as a single file. Sending it directly to your store is built, but not yet tried on a real store.")],
    [T("Que se passe-t-il si une information manque ?", "What happens if some information is missing?"), T("Elle reste visible « à compléter » dans les textes, et le studio vous pose la question. Quand vous répondez, seuls les passages concernés sont mis à jour, sans écraser ce que vous avez validé.", "It stays visible as \"to complete\" in the copy, and the studio asks you about it. When you answer, only the relevant passages are updated, without overwriting what you've approved.")],
    [T("Mes publications partent-elles toutes seules ?", "Do my posts go out on their own?"), T("Seulement celles que vous avez approuvées, et une fois vos comptes connectés. La publication par les connexions officielles (Instagram, Facebook, TikTok, YouTube, Pinterest) est développée mais pas encore essayée sur de vrais comptes ; pour LinkedIn, le studio prépare les publications à publier vous-même.", "Only the ones you've approved, once your accounts are connected. Publishing through the official connections (Instagram, Facebook, TikTok, YouTube, Pinterest) is built but not yet tried on real accounts; for LinkedIn, the studio prepares posts for you to publish yourself.")],
    [T("La découverte gratuite, c'est quoi ?", "What is the free discovery?"), T("Un compte gratuit, sans carte bancaire, qui ouvre le studio de démonstration : les 30 thèmes en aperçu, des marques, boutiques, publicités, vidéos et calendriers d'exemple que vous manipulez dans votre navigateur. Aucun projet réel, aucun appel IA, aucune publication ni export. Pour créer votre projet, choisissez un forfait.", "A free account, with no credit card, that opens the demo studio: all 30 themes in preview, plus sample brands, stores, ads, videos and calendars you can play with in your browser. No real project, no AI calls, no posting or export. To create your project, choose a plan.")],
    [T("Un abonnement permet-il de créer plusieurs projets ?", "Can one subscription create several projects?"), T("Non : 1 abonnement = 1 projet unique (une boutique ou un site), définitivement. Supprimer, archiver ou dupliquer un projet ne libère pas son abonnement. Pour une nouvelle activité, vous souscrivez un nouvel abonnement.", "No: 1 subscription = 1 unique project (a store or a website), for good. Deleting, archiving or duplicating a project doesn't free its subscription. For a new business, you take out a new subscription.")],
    [T("Puis-je gérer plusieurs activités ?", "Can I manage several businesses?"), T("Oui, depuis un seul compte : chaque projet a son propre abonnement, son budget IA, ses recharges et ses droits. Vous pouvez changer le forfait d'un projet ou le résilier sans toucher aux autres.", "Yes, from a single account: each project has its own subscription, AI budget, top-ups and features. You can change one project's plan or cancel it without affecting the others.")],
    [T("Et si le budget IA de mon projet est épuisé ?", "What if my project's AI budget runs out?"), T(`Vous ajoutez une recharge de ${TOPUP_PRICE_EUR} € à ce projet (elle n'expire pas), ou vous attendez le renouvellement. En attendant, le moteur local du studio continue sans IA.`, `You add a €${TOPUP_PRICE_EUR} top-up to that project (it never expires), or you wait for the renewal. Meanwhile, the studio's local engine keeps working without AI.`)],
    [T("Puis-je changer de forfait ?", "Can I change plans?"), T("Oui, projet par projet, depuis « Mes projets » › « Gérer mon abonnement ». Une hausse est facturée au prorata.", "Yes, project by project, from \"My projects\" › \"Manage my subscription\". An upgrade is prorated.")],
    [T("Puis-je me faire rembourser ?", "Can I get a refund?"), T(`Oui : satisfait ou remboursé pendant ${REFUND_DAYS} jours. En mensuel, sans engagement et résiliable à tout moment.`, `Yes: ${REFUND_DAYS}-day money-back guarantee. Monthly billing has no commitment and can be canceled anytime.`)],
  ];

  return (
    <div className="hp overflow-x-clip">
      <RevealObserver />
      <ScrollFX />
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-card focus:px-4 focus:py-2">{T("Aller au contenu", "Skip to content")}</a>
      <HomeHeader links={nav} loggedIn={!!user} ctaHref={cta} />
      {/* Données lues par Google : le studio (application en ligne) et les questions fréquentes affichées plus bas. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(lang, faq) }} />

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
                {T("Une photo de votre produit ou quelques lignes sur votre activité suffisent. L'IA crée votre logo, votre boutique en ligne, vos images, vos publicités et vos publications. Vous gardez la main sur tout.", "A photo of your product or a few lines about your business is all it takes. AI creates your logo, your online store, your images, your ads and your posts. You stay in control of everything.")}
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
                <ol className="scrollbar-none mt-5 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible" aria-label={T("Ce que fait le studio", "What the studio does")}>
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
              <span>{T("Guide pour Wix et Squarespace", "Guide for Wix and Squarespace")}</span>
            </p>
          </div>
          {wall.length >= 6 && (
            <div className="pt-14 sm:pt-20">
              <p className="hp-eyebrow reveal mx-auto max-w-7xl px-4 text-center sm:px-6">{T("Créé par le studio, sans retouche", "Created by the studio, untouched")}</p>
              <p className="reveal mx-auto mt-3 max-w-2xl px-4 text-center text-[15px] text-ink-2 sm:px-6">{T(`${wallBrands} marques de démonstration, une ligne graphique chacune : ce sont leurs vraies publications, telles que le studio les prépare.`, `${wallBrands} demo brands, each with its own visual line: these are their real posts, exactly as the studio prepares them.`)}</p>
              <div className="mt-8"><PostsWall items={wall} label={T("Publications créées par le studio pour les marques de démonstration", "Posts created by the studio for the demo brands")} /></div>
            </div>
          )}
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
            <Head eyebrow={T("Fonctionnalités", "Features")} title={T("De la marque aux réseaux sociaux,", "From brand to social media,")} accent={T("dans le même studio.", "in the same studio.")} lead={T("Faites défiler : un même projet passe par sept étapes, et chacune reprend ce que les précédentes ont créé.", "Scroll on: one project goes through seven steps, and each one builds on what the previous ones created.")} />
            {story && (
              <div className="mt-8 lg:mt-4">
                <StoryScroll steps={modules} demo={story} />
              </div>
            )}
          </div>
        </section>

        {/* ───────────── Création de marque ───────────── */}
        <section id="marque" className="scroll-mt-20 py-24 sm:py-32">
          <span id="demonstrations" className="sr-only" aria-hidden />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <Head eyebrow={T("Création de marque", "Brand creation")} title={T("Une photo de départ,", "One starting photo,")} accent={T("une identité complète.", "a complete identity.")} lead={boards.length ? T("Logo et ses variantes, couleurs, polices, icônes, motif, cartes de visite et exemples d'utilisation : chaque marque reçoit sa planche, et toutes ses créations gardent ce style.", "Logo and its variants, colors, fonts, icons, pattern, business cards and usage examples: every brand gets its board, and all its creations keep that style.") : T("Choisissez une marque de démonstration : son logo, ses couleurs et ses polices ont été créés par le studio à partir de la photo du produit.", "Pick a demo brand: its logo, colors and fonts were created by the studio from the product photo.")} />
              <p className="reveal max-w-xs text-sm text-muted lg:text-right">{T("Projets de démonstration réalisés dans le studio, avec l'IA, comme pour un client.", "Demo projects made in the studio, with AI, just like for a client.")}</p>
            </div>
            <div className="reveal mt-12" style={{ ["--d" as any]: 2 }}>
              {boards.length ? <BoardShowcase boards={boards} /> : <BrandLab brands={brands} />}
            </div>
          </div>
        </section>

        {/* ───────────── Création de boutique ───────────── */}
        <section id="boutiques" className="hp-band scroll-mt-20 border-y border-line py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Head eyebrow={T("Création de boutique", "Store creation")} title={T("Votre boutique,", "Your store,")} accent={T("sur ordinateur et téléphone.", "on desktop and mobile.")} lead={T("Un seul produit, beaucoup de produits ou une entreprise de services : le studio adapte les pages et les menus.", "One product, many products or a service business: the studio adapts the pages and menus.")} />
            <div className="reveal mt-12" style={{ ["--d" as any]: 2 }}>
              <StoreDevices stores={stores} />
            </div>

            {/* Thème sur mesure */}
            <div id="sur-mesure" className="mt-20 scroll-mt-24 grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="hp-eyebrow reveal">{T("Sur mesure", "Custom-made")}</p>
                <h3 className="hp-title reveal mt-4 text-[clamp(1.9rem,3.6vw,2.8rem)]">{T("Une boutique vraiment à vous.", "A store that is truly yours.")}</h3>
                <p className="hp-lead reveal mt-4">{T("Le studio crée votre boutique comme le ferait une agence, puis la vérifie lui-même avant de vous la montrer.", "The studio builds your store the way an agency would, then checks it itself before showing it to you.")}</p>
              </div>
              <ol className="grid gap-x-8 sm:grid-cols-2 lg:col-span-8">
                {[
                  [T("Votre marque d'abord", "Your brand first"), T("Logo, couleurs, polices et façon de parler : la marque d'abord, la boutique ensuite.", "Logo, colors, fonts and tone of voice: brand first, store second.")],
                  [T("Mise en page", "Layout"), T("Les blocs de chaque page sont choisis et rangés pour bien présenter votre produit.", "The blocks on each page are chosen and ordered to show your product well.")],
                  [T("Blocs sur mesure", "Custom blocks"), T("Avec l'IA, un bloc nouveau peut être créé pour votre idée, puis réglé dans l'éditeur.", "With AI, a new block can be created for your idea, then adjusted in the editor.")],
                  [T("Vérifiée à l'écran", "Checked on screen"), T("La boutique est regardée sur ordinateur et sur téléphone, puis corrigée.", "The store is looked at on desktop and mobile, then corrected.")],
                  [T("Retouches", "Edits"), T("Seul ce que vous changez bouge, et vous pouvez toujours revenir en arrière.", "Only what you change moves, and you can always go back.")],
                  [T("Trente thèmes", "Thirty themes"), T("Une bibliothèque de 30 thèmes : 10 avec Créer, 20 avec Développer, les 30 avec Dominer.", "A library of 30 themes: 10 with Create, 20 with Grow, all 30 with Dominate.")],
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

        {/* Les 30 thèmes : de simples captures qui défilent ; la galerie complète est une page du site (/themes). */}
        <section id="themes" className="scroll-mt-16 overflow-hidden bg-paper-2 py-24 sm:py-28">
          <div className="mx-auto grid max-w-7xl items-end gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="hp-eyebrow reveal">{T("Les thèmes", "The themes")}</p>
              <h2 className="hp-title reveal mt-4 text-[clamp(2.2rem,5vw,4rem)]">{T("30 modèles de boutique,", "30 store designs,")} <span className="hp-accent">{T("à vos couleurs.", "in your colors.")}</span></h2>
            </div>
            <div>
              <p className="hp-lead reveal">{T("L'IA part de l'un de ces modèles ou en crée un tout nouveau pour vous. Tout reste modifiable : en écrivant au studio, puis dans l'éditeur de votre plateforme.", "The AI starts from one of these designs or creates a brand-new one for you. Everything stays editable: by writing to the studio, then in your platform's editor.")}</p>
              <Link href="/themes" className="hp-btn hp-btn-ghost reveal mt-5">{T("Voir la galerie", "View the gallery")} <ArrowUpRight className="size-4" aria-hidden /></Link>
            </div>
          </div>
          <div className="mt-12"><ThemesWall themes={themes.map((c) => ({ id: c.id, name: c.name, src: c.preview }))} label={T("Captures des 30 thèmes de boutique, avec la gourde de démonstration Cime", "Screenshots of the 30 store themes, with the Cime demo water bottle")} /></div>
        </section>

        {/* ───────────── Images et publicités ───────────── */}
        <section id="visuels" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Head eyebrow={T("Images et publicités", "Images and ads")} title={T("Fidèle au produit.", "True to the product.")} accent={T("Modifiable à la main.", "Editable by hand.")} lead={T("Le studio part de la photo de votre vrai produit et le garde tel qu'il est : même forme, mêmes couleurs, même étiquette. Ensuite, vous retouchez chaque publicité vous-même, en quelques clics.", "The studio starts from the photo of your real product and keeps it as it is: same shape, same colors, same label. Then you edit each ad yourself, in a few clicks.")} />
            {ba && baAfter && (
              <div className="mt-12 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
                {/* Format des photos (portrait 2:3) : la gourde se voit en entier, avant comme après. */}
                <div className="reveal reveal-scale mx-auto w-full max-w-[26rem] overflow-hidden rounded-[1.75rem] border border-line hp-elev">
                  <BeforeAfter before={ba.photo} after={baAfter} aspect="2 / 3" beforeLabel={T("Photo d'origine", "Original photo")} afterLabel={T("Création du studio", "Studio creation")} />
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold leading-snug">{T("Glissez pour comparer.", "Drag to compare.")}</p>
                  <ul className="mt-5 grid gap-3 text-[15px] text-ink-2">
                    {[T("Forme, proportions, étiquette et logo conservés", "Shape, proportions, label and logo preserved"), T("Des textes nets et faciles à lire", "Crisp, easy-to-read text"), T("Rien n'est coupé, quelle que soit la taille de la publicité", "Nothing gets cut off, whatever the ad size")].map((x) => (
                      <li key={x} className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden /> {x}</li>
                    ))}
                  </ul>
                  <p className="mt-5 text-xs text-muted">{T(`Démonstration : ${ba.brand}, à partir de la photo du produit fournie à la création du projet.`, `Demo: ${ba.brand}, from the product photo provided when the project was created.`)}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ───────────── Publications : le fil de chaque marque ───────────── */}
        {feeds.length > 0 && (
          <section id="publications" className="hp-band scroll-mt-20 border-y border-line py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <Head eyebrow={T("Publications", "Posts")} title={T("Des publications qui vont ensemble,", "Posts that belong together,")} accent={T("sans se répéter.", "without repeating.")} lead={T("Chaque marque garde son style : mêmes couleurs, mêmes polices, même ambiance. Les publications changent d'un jour à l'autre, mais on reconnaît la marque. Le produit est toujours le vrai, et rien n'est inventé.", "Each brand keeps its style: same colors, same fonts, same mood. Posts change from day to day, but you recognize the brand. The product is always the real one, and nothing is made up.")} />
              <div className="reveal mt-12" style={{ ["--d" as any]: 2 }}>
                <FeedShowcase feeds={feeds} />
              </div>
            {story && hero && allowsLiveAd(hero.id) && (
              <div id="editeur-publicite" className="reveal mt-16 scroll-mt-24" style={{ ["--d" as any]: 1 }}>
                <TryHint text={T("Changez le titre, le bouton, la couleur du fond, la place du logo ou le format : la publicité de gauche change en direct.", "Change the title, the button, the background color, the logo position or the format: the ad on the left updates live.")} label={T("À vous d'essayer", "Try it yourself")} />
                <AdEditorDemo cutout={story.cutout} logo={story.logo} palette={story.palette} brand={story.brand} />
              </div>
            )}
            </div>
          </section>
        )}

        {/* ───────────── Vidéo et UGC ───────────── */}
        <section id="videos" className="relative isolate scroll-mt-20 overflow-hidden bg-[#060A18] py-24 text-white sm:py-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(700px_420px_at_85%_0%,rgba(88,101,242,.35),transparent_60%),radial-gradient(600px_420px_at_0%_100%,rgba(168,144,255,.16),transparent_60%)]" aria-hidden />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-3xl">
              <p className="reveal text-[.78rem] font-semibold uppercase tracking-[.18em] text-[#AEB7FF]">{T("Vidéos", "Videos")}</p>
              <h2 className="hp-title reveal mt-4 text-[clamp(2.2rem,5vw,4.1rem)] text-white">{T("Vous voyez la vidéo en images,", "You see the video in pictures,")} <span className="bg-gradient-to-r from-[#AEB7FF] to-[#C9B8FF] bg-clip-text text-transparent">{T("avant qu'elle soit fabriquée.", "before it is made.")}</span></h2>
              <p className="reveal mt-5 max-w-2xl text-lg leading-relaxed text-white/75">{T("Le studio prépare le déroulé de la vidéo et vous montre chaque image. Le prix s'affiche. La vidéo n'est fabriquée qu'avec votre accord, puis vous la téléchargez.", "The studio prepares the video's outline and shows you each frame. The price is shown. The video is only made with your approval, then you download it.")}</p>
            </div>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [Wand2, T("Le message", "The message"), T("Ce que la vidéo doit dire, adapté à votre produit et au réseau choisi.", "What the video should say, adapted to your product and the chosen network.")],
                [Clapperboard, T("Le déroulé en images", "The outline in pictures"), T("Chaque moment de la vidéo est montré en image avant de dépenser quoi que ce soit.", "Each moment of the video is shown as a picture before anything is spent.")],
                [FileCheck2, T("Votre accord", "Your approval"), T("Le prix s'affiche ; rien n'est fabriqué sans votre feu vert.", "The price is shown; nothing is made without your go-ahead.")],
                [PackageOpen, T("La vidéo prête", "The finished video"), T("Une vidéo à télécharger, en vertical, carré ou horizontal.", "A video to download, vertical, square or horizontal.")],
              ].map(([Icon, t, d]: any, i) => (
                <li key={t} className="reveal bg-[#0A1024] p-6" style={{ ["--d" as any]: i }}>
                  <span className="flex items-center justify-between"><Icon className="size-5 text-[#AEB7FF]" aria-hidden /><span className="font-display text-sm text-white/40">{String(i + 1).padStart(2, "0")}</span></span>
                  <p className="mt-5 font-display text-lg font-semibold">{t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <p className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-5 text-sm leading-relaxed text-white/80"><UserRound className="mt-0.5 size-5 shrink-0 text-[#AEB7FF]" aria-hidden /> {T(`Vidéo « témoignage » (forfait ${PLANS.dominer.name.fr}) : une personne créée par l'IA présente votre vrai produit face caméra, uniquement avec votre accord. La vidéo est signalée comme créée par l'IA.`, `"Testimonial" video (${PLANS.dominer.name.en} plan): an AI-created person presents your real product to camera, only with your approval. The video is labeled as AI-made.`)}</p>
              <p className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-5 text-sm leading-relaxed text-white/80"><Minus className="mt-0.5 size-5 shrink-0 text-white/50" aria-hidden /> {T("Pas encore de montage image par image : vous demandez les changements avec vos mots et pouvez refaire un passage, avec votre accord.", "No frame-by-frame editing yet: you ask for changes in your own words and can redo a part, with your approval.")}</p>
            </div>
            {films.length > 0 && (
              <div id="videos-demo" className="mt-16 scroll-mt-24">
                <p className="reveal text-[.78rem] font-semibold uppercase tracking-[.18em] text-[#AEB7FF]">{T("Vidéos de démonstration", "Demo videos")}</p>
                <h3 className="hp-title reveal mt-3 text-[clamp(1.7rem,3.4vw,2.6rem)] text-white">{T("Une vidéo par projet de démonstration.", "One video per demo project.")}</h3>
                <p className="reveal mt-3 max-w-2xl text-[15px] leading-relaxed text-white/70">{T("Produits et services : cliquez pour lancer la vidéo (son coupé par défaut).", "Products and services: click to play (sound off by default).")}</p>
                <div className="reveal mt-8" style={{ ["--d" as any]: 1 }}><DemoFilms films={films} /></div>
              </div>
            )}
          </div>
        </section>

        {/* ───────────── SEO et rédaction ───────────── */}
        {docs.length > 0 && (
          <section id="seo" className="scroll-mt-20 py-24 sm:py-32">
            <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-14">
              <div className="lg:col-span-4">
                <Head compact eyebrow={T("Textes et Google", "Copy and Google")} title={T("Des textes clairs,", "Clear copy,")} accent={T("pensés pour Google.", "written for Google.")} lead={T("Fiches produit, pages et articles de blog : le studio les écrit avec des mots simples que vos clients pourraient chercher, prépare le titre et le résumé que Google affiche, et signale ce qu'il ne sait pas. Vos modifications ne sont jamais écrasées. Votre site part ainsi sur de bonnes bases ; le classement final, lui, c'est Google qui le décide.", "Product pages, pages and blog posts: the studio writes them with simple words your customers might search for, prepares the title and summary Google shows, and flags what it doesn't know. Your edits are never overwritten. Your site starts on a solid footing; the final ranking is up to Google.")} />
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
              <Head eyebrow={T("Réseaux sociaux", "Social media")} title={T("Votre semaine de publications,", "Your week of posts,")} accent={T("validée en quelques clics.", "approved in a few clicks.")} lead={T("Cliquez sur une publication pour l'ouvrir, puis approuvez-la. Une fois vos comptes connectés, le studio publie à l'heure prévue, même si vous avez fermé votre navigateur.", "Click a post to open it, then approve it. Once your accounts are connected, the studio posts at the planned time, even if you have closed your browser.")} />
              <div className="reveal mt-12" style={{ ["--d" as any]: 2 }}>
                <SocialCalendarDemo posts={posts} />
              </div>
              <ul className="mt-8 flex flex-wrap gap-2 text-sm">
                {["Instagram", "Facebook", "TikTok", "YouTube", "Pinterest"].map((n) => <li key={n} className="hp-chip !text-sm">{n} <span className="rounded bg-[#FCEBD0] px-1.5 text-xs font-semibold text-[#7A4500]">{T("Bêta", "Beta")}</span></li>)}
                <li className="hp-chip !text-sm">LinkedIn <span className="text-muted">· {T("à publier vous-même", "post it yourself")}</span></li>
              </ul>
              <p className="mt-3 text-xs text-muted">{T("Bêta : la publication automatique est prête, mais pas encore essayée sur de vrais comptes. LinkedIn : le studio prépare la publication, vous la publiez vous-même.", "Beta: automatic posting is built but not yet tried on real accounts. LinkedIn: the studio prepares the post, you publish it yourself.")}</p>
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
              <Head eyebrow={T("Personnalisation", "Customization")} title={T("L'IA crée.", "AI creates.")} accent={T("Vous gardez le contrôle.", "You stay in control.")} lead={T("Les petits changements se font tout de suite, sans IA : un titre, une couleur, des coins arrondis, un bloc à cacher. Essayez.", "Small changes happen instantly, without AI: a heading, a color, rounded corners, a block to hide. Try it.")} />
              <div className="reveal mt-12" style={{ ["--d" as any]: 2 }}>
                <TryHint text={T("Modifiez le titre, la couleur du bouton, les coins arrondis ou le bandeau : l'aperçu de la boutique change en direct.", "Edit the heading, the button color, the rounded corners or the banner: the store preview updates live.")} label={T("À vous d'essayer", "Try it yourself")} />
                <ControlDemo brand={ctrl?.brand ?? story.brand} image={ctrl?.image ?? story.scene1} palette={ctrl?.palette ?? story.palette} />
              </div>
            </div>
          </section>
        )}

        {/* ───────────── Plateformes et exports ───────────── */}
        <section id="plateformes" className="scroll-mt-20 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Head eyebrow={T("Plateformes et exports", "Platforms and exports")} title={T("Ce que vous recevez,", "What you get,")} accent={T("selon votre plateforme.", "depending on your platform.")} lead={T("Voici exactement ce qui est livré pour chaque plateforme, sans rien promettre de plus. Vous la choisissez en créant le projet et pouvez en changer ensuite.", "Here is exactly what is delivered for each platform, with nothing more promised. You pick it when creating the project and can change it later.")} />
            <div className="reveal mt-12 overflow-hidden rounded-[1.75rem] border border-line bg-card hp-elev" style={{ ["--d" as any]: 2 }}>
              <div className="hidden grid-cols-[1.1fr_1.3fr_1.3fr_1.2fr] gap-6 border-b border-line bg-paper-2/60 px-6 py-4 text-xs font-semibold uppercase tracking-[.14em] text-muted md:grid">
                <span>{T("Plateforme", "Platform")}</span>
                <span className="flex items-center gap-1.5"><PackageOpen className="size-3.5" aria-hidden /> {T("Fichier à installer", "File to install")}</span>
                <span className="flex items-center gap-1.5"><PlugZap className="size-3.5" aria-hidden /> {T("Envoi direct", "Direct sending")}</span>
                <span className="flex items-center gap-1.5"><Briefcase className="size-3.5" aria-hidden /> {T("Guide pour refaire le site", "Guide to rebuild the site")}</span>
              </div>
              {platforms.map((p) => (
                <div key={p.name} className="grid gap-3 border-b border-line px-5 py-5 text-sm last:border-b-0 md:grid-cols-[1.1fr_1.3fr_1.3fr_1.2fr] md:gap-6 md:px-6">
                  <p className="font-display text-lg font-semibold text-ink">{p.name}</p>
                  <div><span className="mb-1 block text-xs font-semibold uppercase tracking-[.12em] text-muted md:hidden">{T("Fichier à installer", "File to install")}</span><Mark c={p.native} /></div>
                  <div><span className="mb-1 block text-xs font-semibold uppercase tracking-[.12em] text-muted md:hidden">{T("Envoi direct", "Direct sending")}</span><Mark c={p.connect} /></div>
                  <div><span className="mb-1 block text-xs font-semibold uppercase tracking-[.12em] text-muted md:hidden">{T("Guide pour refaire le site", "Guide to rebuild the site")}</span><Mark c={p.kit} /></div>
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
                [T("Ne suit pas d'ordres cachés", "Doesn't follow hidden orders"), T("Quand vous donnez l'adresse d'un site, le studio y lit des informations, jamais des ordres.", "When you give a website address, the studio reads information there, never orders.")],
                [T("Ne fait pas semblant", "Doesn't pretend"), T("Il dit clairement ce qui est fait et ce qui reste à faire : une publication préparée n'est pas une publication envoyée.", "It says clearly what is done and what is left: a prepared post is not a sent one.")],
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
            <Head center eyebrow={T("Tarifs", "Pricing")} title={T("Quatre offres claires,", "Four clear offers,")} accent={T("1 projet par abonnement.", "1 project per subscription.")} lead={T("Découvrez gratuitement, puis choisissez le forfait de chaque projet. Prix TTC.", "Discover for free, then choose each project's plan. Prices incl. VAT.")} />
            <div className="reveal mt-12"><PricingCards loggedIn={!!user} withDiscovery /></div>
            <p className="reveal mx-auto mt-6 max-w-2xl text-center text-[15px] text-ink-2">{T("Vous gérez plusieurs activités ? Souscrivez un abonnement par projet et retrouvez toutes vos activités dans un seul compte E-COM STUDIO IA.", "Running several businesses? Take out one subscription per project and find all your businesses in a single E-COM STUDIO IA account.")}</p>
            <ul className="reveal mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-2">
              <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-signal" aria-hidden /> {T(`Satisfait ou remboursé ${REFUND_DAYS} jours`, `${REFUND_DAYS}-day money-back guarantee`)}</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-signal" aria-hidden /> {T("Sans engagement en mensuel", "No commitment on monthly billing")}</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-signal" aria-hidden /> {T("Résiliable à tout moment, projet par projet", "Cancel anytime, project by project")}</li>
            </ul>
            <CompareTable className="reveal mt-8" />
            {!live && <p className="mt-4 text-center text-xs text-muted">{T("Le paiement en ligne ouvre bientôt : vous pouvez déjà créer votre compte et ouvrir le studio de démonstration.", "Online payment opens soon: you can already create your account and open the demo studio.")}</p>}

            <div id="packs" className="reveal mt-16 grid scroll-mt-24 gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-line bg-card p-6 sm:p-8">
                <p className="hp-eyebrow">{T("Recharge IA", "AI top-up")}</p>
                <p className="mt-3 font-display text-3xl font-semibold">{T(`${TOPUP_PRICE_EUR} € TTC`, `€${TOPUP_PRICE_EUR} incl. VAT`)}</p>
                <p className="mt-2 text-[15px] text-ink-2">{T("S'ajoute au budget IA d'un projet précis, quand le forfait du mois ne suffit plus. N'expire pas.", "Added to one specific project's AI budget when the month's plan isn't enough. Never expires.")}</p>
              </div>
              <div className="rounded-[1.75rem] border border-line bg-card p-6 sm:p-8">
                <p className="hp-eyebrow">{T("Accompagnement téléphonique", "Phone coaching")}</p>
                <p className="mt-3 font-display text-3xl font-semibold">{T("1 heure", "1 hour")}</p>
                <p className="mt-2 text-[15px] text-ink-2">{T(`${PLANS.creer.name.fr} : ${PLANS.creer.callPrice} € · ${PLANS.vendre.name.fr} : ${PLANS.vendre.callPrice} € · ${PLANS.dominer.name.fr} : la première heure est offerte, une seule fois.`, `${PLANS.creer.name.en}: €${PLANS.creer.callPrice} · ${PLANS.vendre.name.en}: €${PLANS.vendre.callPrice} · ${PLANS.dominer.name.en}: the first hour is free, once.`)}</p>
              </div>
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
            <p className="mt-5 max-w-xl text-lg text-white/75">{T("Commencez par la découverte gratuite, sans carte bancaire : explorez le studio, les 30 thèmes et les exemples. Choisissez ensuite un forfait pour créer votre projet.", "Start with the free discovery, no credit card: explore the studio, the 30 themes and the examples. Then choose a plan to create your project.")}</p>
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
