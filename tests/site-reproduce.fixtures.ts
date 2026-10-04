/**
 * Sites existants écrits à la main (résultat attendu de la lecture d'un site) pour tester la reproduction :
 * une boutique faite sur Webflow et un site vitrine de services fait sur mesure.
 */
import type { SiteImport } from "@/lib/engine/site-types";

const S = "https://www.atelier-lumen.example";

/** Boutique de luminaires (Webflow) : 3 produits, témoignages réels, FAQ. */
export const shopSite: SiteImport = {
  url: S,
  finalUrl: `${S}/`,
  fetchedAt: 1_760_000_000_000,
  platform: "webflow",
  platformEvidence: ['<meta name="generator" content="Webflow">'],
  decision: "reproduce",
  business: "products",
  name: "Atelier Lumen",
  tagline: "Luminaires en céramique tournés à la main à Nantes.",
  language: "fr",
  logo: { src: `${S}/images/logo.svg`, kind: "img" },
  favicon: `${S}/favicon.png`,
  palette: { primary: "#B4532A", secondary: "#F3E9DD", accent: "#2F5D50", light: "#FBF7F2", dark: "#2B211C" },
  colorsFound: ["#B4532A", "#F3E9DD", "#2F5D50", "#FBF7F2", "#2B211C"],
  fonts: { heading: "Cormorant Garamond", body: "Work Sans", all: ["Cormorant Garamond", "Work Sans"] },
  nav: [
    { label: "Accueil", url: `${S}/` },
    { label: "Luminaires", url: `${S}/boutique` },
    { label: "L'atelier", url: `${S}/l-atelier` },
    { label: "Questions", url: `${S}/faq` },
    { label: "Contact", url: `${S}/contact` },
  ],
  footerNav: [
    { label: "Mentions légales", url: `${S}/mentions-legales` },
    { label: "Contact", url: `${S}/contact` },
    { label: "Instagram", url: "https://instagram.com/atelierlumen" },
  ],
  pages: [
    {
      url: `${S}/`,
      path: "/",
      title: "Atelier Lumen — Luminaires en céramique",
      type: "home",
      blocks: [
        { kind: "hero", heading: "La lumière, façonnée à la main", text: "Chaque suspension est tournée, émaillée et cuite dans notre atelier nantais.", image: `${S}/images/hero.jpg`, button: { label: "Voir les luminaires", url: `${S}/boutique` } },
        { kind: "heading", level: 2, text: "Nos pièces du moment" },
        { kind: "products", handles: ["suspension-dune", "lampe-galet", "applique-lune"] },
        { kind: "image-text", heading: "Un atelier, deux mains", text: "Depuis 2016, Claire tourne chaque abat-jour sur son tour de potier.\n\nLes émaux sont préparés sur place.", image: `${S}/images/atelier.jpg`, imageSide: "left", button: { label: "Découvrir l'atelier", url: "/l-atelier" } },
        { kind: "features", heading: "Pourquoi la céramique", items: [
          { title: "Lumière douce", text: "La porcelaine fine laisse passer une lueur chaude." },
          { title: "Pièces uniques", text: "Aucune suspension n'est tout à fait identique." },
          { title: "Fabriqué à Nantes", text: "Terre, émail et montage électrique en France." },
        ] },
        { kind: "testimonials", heading: "Ils en parlent", items: [{ quote: "Une suspension magnifique, emballée avec un soin incroyable.", author: "Julie, Rennes" }] },
        { kind: "gallery", heading: "Chez vous", images: [`${S}/images/scene-1.jpg`, `${S}/images/scene-2.jpg`, `${S}/images/detail.jpg`] },
        { kind: "cta", heading: "Une pièce sur mesure ?", text: "Écrivez-nous, nous répondons sous 48 h.", button: { label: "Nous écrire", url: `${S}/contact` } },
      ],
    },
    {
      url: `${S}/l-atelier`,
      path: "/l-atelier",
      title: "L'atelier",
      type: "about",
      blocks: [
        { kind: "heading", level: 1, text: "L'atelier" },
        { kind: "text", text: "Installé sur l'île de Nantes, l'atelier occupe une ancienne forge." },
        { kind: "image", src: `${S}/images/atelier.jpg`, alt: "L'atelier" },
      ],
    },
    {
      url: `${S}/faq`,
      path: "/faq",
      title: "Questions fréquentes",
      type: "faq",
      blocks: [
        { kind: "faq", heading: "Questions fréquentes", items: [
          { q: "Quels sont les délais ?", a: "Les pièces en stock partent sous 3 jours ouvrés." },
          { q: "Puis-je choisir l'émail ?", a: "Oui, pour les commandes sur mesure." },
        ] },
      ],
    },
    { url: `${S}/contact`, path: "/contact", title: "Contact", type: "contact", blocks: [{ kind: "contact", heading: "Nous écrire", text: "Une question sur une pièce ? Écrivez-nous." }] },
    { url: `${S}/mentions-legales`, path: "/mentions-legales", title: "Mentions légales", type: "legal", blocks: [{ kind: "heading", level: 1, text: "Mentions légales" }, { kind: "text", text: "Atelier Lumen, EI — SIRET 000 000 000 00000." }] },
    { url: `${S}/boutique`, path: "/boutique", title: "Luminaires", type: "collection", blocks: [] },
  ],
  products: [
    { handle: "suspension-dune", title: "Suspension Dune", description: "<p>Porcelaine émaillée sable, Ø 28 cm.</p><script>alert(1)</script>", price: 18900, currency: "EUR", images: [`${S}/images/p-dune.jpg`], variants: [{ title: "Sable", price: 18900, options: ["Sable"] }, { title: "Ardoise", price: 19900, options: ["Ardoise"] }], url: `${S}/product/suspension-dune`, category: "Suspensions" },
    { handle: "lampe-galet", title: "Lampe Galet", description: "Lampe à poser, grès brut.", price: 12500, compareAtPrice: 14500, currency: "EUR", images: [`${S}/images/p-galet.jpg`], url: `${S}/product/lampe-galet`, category: "Lampes" },
    { handle: "applique-lune", title: "Applique Lune", description: "Applique murale en porcelaine.", price: 9900, currency: "EUR", images: [`${S}/images/p-lune.jpg`], url: `${S}/product/applique-lune`, category: "Appliques" },
  ],
  contact: { phone: "02 40 00 00 00", email: "bonjour@atelier-lumen.example", address: "3 quai de la Fosse, 44000 Nantes", socials: { instagram: "https://instagram.com/atelierlumen" } },
  warnings: [],
};

const P = "https://plomberie-martin.example";

/** Artisan plombier (site fait main) : services, sans avis sur le site. */
export const servicesSite: SiteImport = {
  url: P,
  finalUrl: `${P}/`,
  fetchedAt: 1_760_000_000_000,
  platform: "custom",
  platformEvidence: [],
  decision: "reproduce",
  business: "services",
  name: "Plomberie Martin",
  tagline: "Dépannage et rénovation de salles de bains à Lyon.",
  language: "fr",
  logo: { src: `${P}/img/logo.png`, kind: "img" },
  palette: { primary: "#1F5FA8", secondary: "#E8F0F8", accent: "#F2A007", light: "#FFFFFF", dark: "#14202E" },
  colorsFound: ["#1F5FA8", "#E8F0F8", "#F2A007", "#FFFFFF", "#14202E"],
  fonts: { heading: "Poppins", body: "Open Sans", all: ["Poppins", "Open Sans"] },
  nav: [
    { label: "Accueil", url: "/" },
    { label: "Nos services", url: "/services.html" },
    { label: "Réalisations", url: "/realisations.html" },
    { label: "Contact", url: "/contact.html" },
  ],
  footerNav: [{ label: "Mentions légales", url: "/mentions.html" }],
  pages: [
    {
      url: `${P}/`,
      path: "/",
      title: "Plomberie Martin — Plombier à Lyon",
      type: "home",
      blocks: [
        { kind: "hero", heading: "Votre plombier à Lyon depuis 1998", text: "Dépannage rapide, installation et rénovation de salles de bains.", image: `${P}/img/hero.jpg`, button: { label: "Demander un devis", url: "/contact.html" } },
        { kind: "features", heading: "Nos services", items: [
          { title: "Dépannage", text: "Fuites, débouchage, chauffe-eau.", image: `${P}/img/s1.jpg` },
          { title: "Salle de bains", text: "Rénovation complète clé en main.", image: `${P}/img/s2.jpg` },
          { title: "Chauffage", text: "Entretien et remplacement de chaudières.", image: `${P}/img/s3.jpg` },
        ] },
        { kind: "image-text", heading: "Une entreprise familiale", text: "Jean et Paul Martin interviennent eux-mêmes sur chaque chantier.", image: `${P}/img/equipe.jpg`, imageSide: "right" },
        { kind: "faq", heading: "Questions fréquentes", items: [{ q: "Intervenez-vous le week-end ?", a: "Oui, pour les urgences." }] },
        { kind: "cta", heading: "Un projet ? Parlons-en", button: { label: "Nous appeler", url: "tel:+33478000000" } },
      ],
    },
    {
      url: `${P}/services.html`,
      path: "/services.html",
      title: "Nos services",
      type: "services",
      blocks: [
        { kind: "heading", level: 1, text: "Nos services" },
        { kind: "text", text: "Nous intervenons dans tout le Grand Lyon." },
        { kind: "features", items: [{ title: "Dépannage", text: "Sous 2 h en semaine." }, { title: "Rénovation", text: "Devis gratuit." }] },
      ],
    },
    { url: `${P}/realisations.html`, path: "/realisations.html", title: "Réalisations", type: "other", blocks: [{ kind: "gallery", heading: "Nos chantiers", images: [`${P}/img/r1.jpg`, `${P}/img/r2.jpg`] }] },
    { url: `${P}/contact.html`, path: "/contact.html", title: "Contact", type: "contact", blocks: [{ kind: "contact", heading: "Contactez-nous", text: "Du lundi au samedi." }] },
    { url: `${P}/mentions.html`, path: "/mentions.html", title: "Mentions légales", type: "legal", blocks: [] },
  ],
  products: [],
  contact: { phone: "04 78 00 00 00", email: "contact@plomberie-martin.example", address: "8 rue Garibaldi, 69006 Lyon", hours: "Lun–Sam 8 h – 19 h", socials: {} },
  warnings: [],
};

/** Correspondance image du site → fichier du thème (comme après l'import des images dans la bibliothèque). */
export function fakeAssets(site: SiteImport): Record<string, { file: string; assetId: string }> {
  const out: Record<string, { file: string; assetId: string }> = {};
  const srcs = new Set<string>();
  for (const p of site.pages)
    for (const b of p.blocks) {
      if (b.kind === "hero" && b.image) srcs.add(b.image);
      if (b.kind === "image") srcs.add(b.src);
      if (b.kind === "image-text") srcs.add(b.image);
      if (b.kind === "features") for (const it of b.items) if (it.image) srcs.add(it.image);
      if (b.kind === "gallery") for (const i of b.images) srcs.add(i);
    }
  for (const p of site.products) for (const i of p.images) srcs.add(i);
  let n = 0;
  for (const s of srcs) out[s] = { file: `es-site-${++n}-abc${n}.jpg`, assetId: `asset-${n}` };
  return out;
}
