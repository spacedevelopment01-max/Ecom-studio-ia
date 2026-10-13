import Link from "next/link";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { Logo, ThemeToggle } from "@/components/ui";
import { LangSwitch } from "@/components/i18n";
import { DemoTabs, RevealObserver } from "@/components/landing-client";
import { AdEditorDemo, BrandLab, ControlDemo, SeoDocDemo, SocialCalendarDemo, StoreDevices, type BrandDemo, type SocialPost, type StoreDemo } from "@/components/home/home-demos";
import { ThemeGrid } from "@/components/studio/theme-gallery";
import { directionById, directionCards } from "@/lib/theme/directions";
import { demoList, localMedia, webpOf } from "@/lib/demo-content";
import { serverLang } from "@/lib/i18n-server";
import { pick } from "@/lib/i18n";
import { PAGE_MODELS } from "@/lib/theme/page-templates";

export async function generateMetadata() {
  const lang = await serverLang();
  return { title: pick(lang, "Découverte", "Discovery") };
}

/**
 * Forfait DÉCOUVERTE : studio de démonstration interactif, réservé aux comptes connectés. Uniquement des exemples
 * préexistants (public/demo) et des manipulations dans le navigateur : aucun projet réel, aucun appel IA, aucune
 * publication, aucun export, rien n'est enregistré.
 */
export default async function DiscoveryPage() {
  const lang = await serverLang();
  const T = (fr: string, en: string) => pick(lang, fr, en);
  const list = demoList(lang);
  const productDemos = list.filter((d) => d.business !== "services");
  const hero = list.find((d) => d.id === "casque") ?? productDemos[0] ?? list[0];
  const img = (label: RegExp, n = 0) => hero?.images.filter((x) => label.test(x.label))[n]?.src ?? hero?.photo ?? "";
  const brands: BrandDemo[] = list.map((d) => ({ id: d.id, brand: d.brand, sector: d.sector, direction: directionById(d.direction).name, palette: d.palette, logo: d.logo, photo: d.photo, fonts: directionById(d.direction).previewFonts }));
  const stores: StoreDemo[] = [
    ...productDemos.slice(0, 4).map((d) => ({ id: d.id, label: d.brand, text: `${d.product} · ${d.sector}`, desktop: d.shopDesktop, mobile: d.shopMobile, caption: `${d.brand.toLowerCase().replace(/\s+/g, "")}.myshopify.com` })),
    ...list.filter((d) => d.business === "services").map((d) => ({ id: d.id, label: d.brand, text: T(`Entreprise fictive : ${d.sector.toLowerCase()}, site WordPress sans panier.`, `Fictional business: ${d.sector.toLowerCase()}, WordPress website with no cart.`), desktop: d.shopDesktop, mobile: d.shopMobile, caption: `${d.brand.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "")}.fr` })),
  ];

  const posts: SocialPost[] = hero
    ? [
        { day: 0, time: "18:00", network: "Instagram", image: img(/social/i), caption: T(`${hero.product} : découvrez-le en images.`, `${hero.product}: see it in pictures.`) },
        { day: 2, time: "12:30", network: "Facebook", image: img(/scène|scene/i, 1), caption: T(`Découvrez ${hero.brand} sur notre boutique.`, `Discover ${hero.brand} in our store.`) },
        { day: 4, time: "20:00", network: "Pinterest", image: img(/bannière|banner/i), caption: T("Une idée à garder pour plus tard.", "An idea to save for later.") },
        { day: 5, time: "11:00", network: "TikTok", image: img(/scène|scene/i), caption: T("Comment l'utiliser ? Réponse en vidéo.", "How do you use it? Answer on video.") },
      ]
    : [];
  const docs = hero
    ? [
        { tab: T("Fiche produit", "Product page"), kind: `${T("Fiche produit", "Product page")} · ${hero.brand}`, meta: `${hero.product} · ${hero.brand}`, blocks: [{ k: "h1" as const, text: hero.product }, { k: "p" as const, text: T("Description rédigée à partir de ce que montre la photo, sans rien inventer.", "Description written from what the photo shows, without making anything up.") }, { k: "li" as const, text: T("Garantie : [À compléter : durée de la garantie]", "Warranty: [To complete: warranty length]") }, { k: "faq" as const, text: T("Comment l'entretenir ? [À compléter : consignes du fabricant]", "How do I care for it? [To complete: manufacturer's instructions]") }] },
        { tab: T("Article de blog", "Blog post"), kind: T("Article de blog", "Blog post"), meta: T("Un article utile pour vos clients.", "A useful article for your customers."), blocks: [{ k: "h1" as const, text: T("Comment bien choisir ?", "How to choose well?") }, { k: "p" as const, text: T("Les critères à regarder avant d'acheter.", "What to look at before buying.") }, { k: "faq" as const, text: T("[À compléter : source à citer]", "[To complete: source to cite]") }] },
      ]
    : [];
  const themes = directionCards(lang).map((c) => ({ ...c, preview: webpOf(localMedia(c.preview, lang)) }));
  const tabs = [
    ["marque", T("Marque", "Brand")],
    ["boutique", T("Boutique", "Store")],
    ["themes", T("30 thèmes", "30 themes")],
    ["modeles", T("Modèles de pages", "Page templates")],
    ["images", T("Images", "Images")],
    ["publicites", T("Publicités", "Ads")],
    ["textes", T("Textes", "Copy")],
    ["calendrier", T("Calendrier", "Calendar")],
    ["retouches", T("Retouches", "Edits")],
  ] as const;
  const section = "scroll-mt-32 border-t border-line py-14";
  const h = (title: string, text: string) => (
    <div className="mb-8 max-w-2xl">
      <h2 className="font-display text-3xl font-semibold">{title}</h2>
      <p className="mt-2 text-ink-2">{text}</p>
    </div>
  );
  return (
    <div className="hp min-h-dvh overflow-x-clip">
      <RevealObserver />
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/studio" className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink"><ArrowLeft className="size-4" aria-hidden /> <span className="hidden sm:inline">{T("Mes projets", "My projects")}</span><span className="sm:hidden"><Logo compact /></span></Link>
          <span className="hidden sm:inline"><Logo /></span>
          <div className="flex items-center gap-2"><LangSwitch /><ThemeToggle /></div>
        </div>
        <nav aria-label={T("Démonstrations", "Demos")} className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {tabs.map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-line bg-card px-3 py-1.5 text-sm hover:border-ink">{label}</a>)}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="py-10">
          <p className="text-sm font-medium uppercase tracking-[.18em] text-signal">{T("Forfait Découverte · gratuit", "Discovery plan · free")}</p>
          <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{T("Le studio, en démonstration.", "The studio, as a demo.")}</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-2">{T("Manipulez les outils sur des marques d'exemple : couleurs, textes, mises en page, publicités, calendrier. Tout tourne dans votre navigateur.", "Try the tools on sample brands: colors, copy, layouts, ads, calendar. Everything runs in your browser.")}</p>
          <p className="mt-5 flex max-w-2xl gap-2 rounded-2xl bg-paper-2 p-4 text-sm text-ink-2"><Info className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden /> {T("Démonstration : exemples créés à l'avance par le studio, pas des résultats clients. Aucun appel IA, aucune publication, aucun export, rien n'est enregistré. Pour créer votre vrai projet, choisissez un forfait.", "Demo: examples made in advance by the studio, not client results. No AI calls, no posting, no export, nothing is saved. To create your real project, choose a plan.")}</p>
          <Link href="/studio?nouveau=1" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-signal px-6 font-semibold text-signal-ink">{T("Créer mon vrai projet", "Create my real project")} <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
        <section id="marque" className={section}>{h(T("Marque", "Brand"), T("Logos, palettes et typographies de marques d'exemple.", "Logos, palettes and typefaces of sample brands."))}<BrandLab brands={brands} /></section>
        <section id="boutique" className={section}>{h(T("Boutique", "Store"), T("Boutiques et site d'exemple, sur ordinateur et sur téléphone.", "Sample stores and website, on desktop and on mobile."))}<StoreDevices stores={stores} /></section>
        <section id="themes" className={section}>{h(T("Les 30 thèmes", "The 30 themes"), T("Tous les thèmes en aperçu. Créer : 10 · Développer : 20 · Dominer : 30.", "Every theme in preview. Create: 10 · Grow: 20 · Dominate: 30."))}<ThemeGrid directions={themes} /></section>
        <section id="modeles" className={section}>
          {h(T("Modèles de pages", "Page templates"), T("Avec Développer et Dominer : ajoutez des pages à votre site depuis ces modèles, et donnez à chaque produit ou prestation sa propre mise en page.", "With Grow and Dominate: add pages to your site from these templates, and give each product or service its own layout."))}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PAGE_MODELS.map((m) => (
              <li key={m.id} className="rounded-2xl border border-line bg-card p-4">
                <p className="font-display text-lg font-semibold">{pick(lang, m.name.fr, m.name.en)}</p>
                <p className="mt-1 text-sm text-ink-2">{pick(lang, m.description.fr, m.description.en)}</p>
                <p className="mt-2 text-xs text-muted">{pick(lang, m.usage.fr, m.usage.en)}</p>
              </li>
            ))}
          </ul>
        </section>
        <section id="images" className={section}>{h(T("Images et vidéos", "Images and videos"), T("Détourages, packshots, scènes, visuels sociaux et vidéos des démonstrations.", "Cutouts, packshots, scenes, social visuals and videos from the demos."))}<DemoTabs demos={list} /></section>
        {hero && <section id="publicites" className={section}>{h(T("Publicités", "Ads"), T("Déplacez le texte, changez les couleurs : l'éditeur de publicités en miniature.", "Move the text, change the colors: the ad editor in miniature."))}<AdEditorDemo cutout={img(/détourage|cutout/i)} logo={hero.logo} palette={hero.palette} brand={hero.brand} /></section>}
        <section id="textes" className={section}>{h(T("Textes et SEO", "Copy and SEO"), T("Des documents modifiables ; une information inconnue reste « à compléter ».", "Editable documents; unknown information stays \"to complete\"."))}<SeoDocDemo docs={docs} /></section>
        <section id="calendrier" className={section}>{h(T("Calendrier social", "Social calendar"), T("Publications d'exemple réparties dans la semaine. En démonstration, rien n'est programmé ni publié.", "Sample posts spread across the week. In the demo, nothing is scheduled or posted."))}<SocialCalendarDemo posts={posts} /></section>
        {hero && <section id="retouches" className={section}>{h(T("Retouches", "Edits"), T("Changez une couleur ou un texte et voyez le résultat.", "Change a color or some copy and see the result."))}<ControlDemo brand={hero.brand} image={img(/scène|scene/i)} palette={hero.palette} /></section>}
        <div className="my-16 rounded-[2rem] border border-line bg-card p-8 text-center">
          <h2 className="font-display text-3xl font-semibold">{T("Prêt à créer le vôtre ?", "Ready to create yours?")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-2">{T("1 projet inclus par abonnement. Choisissez un forfait : votre projet se crée juste après la confirmation du paiement.", "1 project included per subscription. Choose a plan: your project is created right after the payment is confirmed.")}</p>
          <Link href="/studio?nouveau=1" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-signal px-6 font-semibold text-signal-ink">{T("Voir les forfaits", "See the plans")} <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
      </main>
    </div>
  );
}
