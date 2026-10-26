/**
 * Bibliothèque des MODÈLES DE PAGES (forfaits Développer et Dominer).
 *
 *  - THÈME : identité du site (couleurs, polices, en-tête, pied de page) — inchangé par les modèles.
 *  - MODÈLE : structure préconçue de sections pour un objectif précis (ce fichier).
 *  - PAGE : instance concrète créée depuis un modèle, avec ses propres contenus ; elle ne dépend plus du modèle.
 *
 * Les sections sont celles du thème (même rendu dans l'aperçu, l'export Shopify et les CMS) et sont remplies sans IA
 * avec les médias et les informations du projet (withProjectMedia). Rien d'inventé : une information absente reste
 * « [À compléter : …] » ou la section est masquée. Aucune personne n'est ajoutée : seules les images du projet servent.
 */
import { pick, type Lang } from "../i18n";
import type { Project } from "../projects";
import type { ActivityCategory, ServiceProfile } from "../project-types";
import { cloneSpec, storeProducts, themeLang, type SectionInstance, type TemplateJson, type ThemeSpec } from "./spec";
import { applyOps } from "./ops";
import { projectKind } from "./project-kind";
import { familyTypes, isStructuralType, type FamilyId } from "./section-families";
import { isOwnSectionOf } from "./theme-own-sections";
import { resolveLibraryType } from "./family-gallery";
import { sectionIncompatibility } from "./section-compat";
import { mediaPools, withProjectMedia } from "./section-defaults";
import { contentContext } from "./section-content";

export type ModelCategory = "product" | "service" | "craft" | "local" | "portfolio" | "about" | "contact" | "booking";
export type PageModelId =
  | "produit-essentiel"
  | "produit-demonstration"
  | "produit-detaille"
  | "prestation-rendez-vous"
  | "artisan-devis"
  | "commerce-presentation"
  | "realisations-portfolio"
  | "a-propos"
  | "contact"
  | "rendez-vous-reserver";

/** Destination d'un bouton principal (null : pas de destination réelle, le bouton n'est pas publié). */
export type Cta = { label: string; url: string } | null;
export type BookingTarget = { kind: "external" | "internal"; url: string } | null;

type Row = {
  type: string;
  settings?: Record<string, unknown>;
  /** Transforme les blocs remplis (ex. ne garder que la prestation liée). */
  blocks?: (filled: { type: string; settings?: Record<string, unknown> }[] | undefined) => { type: string; settings?: Record<string, unknown> }[] | undefined;
  /** Section posée masquée : elle attend une information du client (vidéo, comparatif…). */
  disabled?: boolean;
};

export type BuildContext = {
  lang: Lang;
  /** Produit présenté (mises en page produit). */
  product?: { handle: string; title: string; url: string };
  /** Prestation présentée (profil de services). */
  service?: ServiceProfile["services"][number];
  services: ServiceProfile;
  booking: BookingTarget;
  contactUrl: string | null;
  hasVideo: boolean;
};

export type PageModel = {
  id: PageModelId;
  kind: "page" | "product";
  category: ModelCategory;
  name: { fr: string; en: string };
  description: { fr: string; en: string };
  usage: { fr: string; en: string };
  /** Activités pour lesquelles le modèle est proposé en premier. */
  suggestedFor: ActivityCategory[];
  rows: (c: BuildContext) => Row[];
};

const t = (c: BuildContext, fr: string, en: string) => pick(c.lang, fr, en);
const todo = (c: BuildContext, fr: string, en: string) => pick(c.lang, `[À compléter : ${fr}]`, `[To complete: ${en}]`);

/** Bouton « Prendre rendez-vous » : uniquement vers un calendrier réel (interne ou lien HTTPS), sinon vers le contact. */
export function bookingCta(c: BuildContext): Cta {
  if (c.booking) return { label: t(c, "Prendre rendez-vous", "Book an appointment"), url: c.booking.url };
  if (c.contactUrl) return { label: t(c, "Nous contacter", "Contact us"), url: c.contactUrl };
  return null;
}
const quoteCta = (c: BuildContext): Cta => (c.contactUrl ? { label: t(c, "Demander un devis", "Request a quote"), url: c.contactUrl } : null);
const contactCta = (c: BuildContext): Cta => (c.contactUrl ? { label: t(c, "Nous contacter", "Contact us"), url: c.contactUrl } : null);
const buyCta = (c: BuildContext): Cta => (c.product ? { label: t(c, "Acheter maintenant", "Buy now"), url: c.product.url } : null);
const button = (cta: Cta, label = "button_label", link = "button_link") => (cta ? { [label]: cta.label, [link]: cta.url } : { [label]: "", [link]: "" });

/** Prix d'une prestation : fixe, « à partir de », sur devis, ou rien — selon ce que le client a saisi. */
const servicePrice = (s?: { price?: string }) => (s?.price ?? "").trim();

export const PAGE_MODELS: PageModel[] = [
  {
    id: "produit-essentiel",
    kind: "product",
    category: "product",
    name: { fr: "Produit — Essentiel", en: "Product — Essential" },
    description: { fr: "Galerie, prix, variantes, bouton d'achat, avantages et informations pratiques.", en: "Gallery, price, variants, buy button, benefits and practical information." },
    usage: { fr: "Un produit simple qui se comprend d'un coup d'œil.", en: "A simple product understood at a glance." },
    suggestedFor: ["products", "mixed"],
    rows: (c) => [
      { type: "features-grid", settings: { heading: t(c, "Pourquoi le choisir", "Why choose it") } },
      { type: "reassurance", settings: { heading: t(c, "Informations pratiques", "Practical information") } },
    ],
  },
  {
    id: "produit-demonstration",
    kind: "product",
    category: "product",
    name: { fr: "Produit — Démonstration", en: "Product — Demonstration" },
    description: { fr: "Démonstration vidéo, fonctionnement pas à pas, bénéfices, caractéristiques, questions et achat.", en: "Video demo, step-by-step how it works, benefits, specs, questions and purchase." },
    usage: { fr: "Un produit qui gagne à être montré en action.", en: "A product that shines when shown in action." },
    suggestedFor: ["products", "mixed"],
    rows: (c) => [
      { type: "video-showcase", settings: { heading: t(c, "Voyez-le en action", "See it in action") }, disabled: !c.hasVideo },
      { type: "how-to", settings: { heading: t(c, "Comment ça marche", "How it works"), ...button(buyCta(c)) } },
      { type: "v2-benefits" },
      { type: "specs-list", settings: { heading: t(c, "Caractéristiques", "Specifications") } },
      { type: "faq", settings: { heading: t(c, "Questions fréquentes", "Frequently asked questions") } },
      { type: "cta-banner", settings: { heading: c.product?.title ?? "", ...button(buyCta(c)) } },
    ],
  },
  {
    id: "produit-detaille",
    kind: "product",
    category: "product",
    name: { fr: "Produit — Présentation détaillée", en: "Product — Detailed presentation" },
    description: { fr: "Présentation longue, usages, bénéfices détaillés, caractéristiques, comparatif (si renseigné), questions, rappels d'achat.", en: "Long presentation, uses, detailed benefits, specs, comparison (if filled in), questions, purchase reminders." },
    usage: { fr: "Un produit technique ou haut de gamme qui demande des explications.", en: "A technical or premium product that needs explaining." },
    suggestedFor: ["products"],
    rows: (c) => [
      { type: "alternating-content", settings: { heading: t(c, "En détail", "In detail") } },
      { type: "situations", settings: { heading: t(c, "Pour quels usages", "What it's for") } },
      { type: "features-grid", settings: { heading: t(c, "Les bénéfices", "The benefits") } },
      { type: "cta-banner", settings: { heading: c.product?.title ?? "", ...button(buyCta(c)) } },
      { type: "specs-list", settings: { heading: t(c, "Caractéristiques", "Specifications") } },
      // Comparatif masqué tant que le client ne l'a pas rempli (aucune comparaison inventée).
      { type: "comparison-table", settings: { heading: t(c, "Comparatif", "Comparison") }, disabled: true },
      { type: "faq", settings: { heading: t(c, "Questions fréquentes", "Frequently asked questions") } },
      { type: "cta-banner", settings: { heading: t(c, "Prêt à commander ?", "Ready to order?"), ...button(buyCta(c)) } },
    ],
  },
  {
    id: "prestation-rendez-vous",
    kind: "page",
    category: "service",
    name: { fr: "Prestation — Rendez-vous", en: "Service — Appointment" },
    description: { fr: "Présentation du service, bénéfices, déroulement, durée et prix facultatifs, galerie, infos pratiques et bouton vers le calendrier.", en: "Service presentation, benefits, how it goes, optional duration and price, gallery, practical info and a button to the calendar." },
    usage: { fr: "Une prestation sur rendez-vous (soin, séance, consultation, cours…). Pas de panier.", en: "A service by appointment (treatment, session, consultation, lesson…). No cart." },
    suggestedFor: ["booking", "mixed", "local"],
    rows: (c) => [
      { type: "hero-split", settings: { heading: c.service?.name ?? t(c, "Notre prestation", "Our service"), text: c.service?.description ? `<p>${esc(c.service.description)}</p>` : `<p>${todo(c, "description de la prestation", "service description")}</p>`, ...button(bookingCta(c)), button2_label: "", button2_link: "" } },
      { type: "features-grid", settings: { heading: t(c, "Ce que vous y gagnez", "What you get") } },
      { type: "timeline", settings: { heading: t(c, "Comment se déroule le rendez-vous", "How the appointment goes") } },
      {
        type: "services-list",
        settings: { heading: t(c, "Durée et tarif", "Duration and price"), ...button(bookingCta(c)) },
        blocks: (b) => (c.service ? [{ type: "service", settings: { title: c.service.name, text: c.service.description ?? "", price: servicePrice(c.service), duration: c.service.duration ?? "" } }] : b),
      },
      { type: "gallery-mosaic", settings: { heading: t(c, "En images", "In pictures") } },
      { type: "practical-info", settings: { heading: t(c, "Informations pratiques", "Practical information"), ...button(bookingCta(c)) } },
    ],
  },
  {
    id: "artisan-devis",
    kind: "page",
    category: "craft",
    name: { fr: "Artisan — Savoir-faire et devis", en: "Craftsperson — Know-how and quote" },
    description: { fr: "Votre métier, vos prestations, vos réalisations, votre méthode, votre zone d'intervention et la demande de devis.", en: "Your trade, services, past work, method, service area and quote request." },
    usage: { fr: "Artisan ou professionnel qui travaille sur devis.", en: "A tradesperson or professional working on quotes." },
    suggestedFor: ["quote", "local"],
    rows: (c) => [
      { type: "hero-split", settings: { heading: t(c, "Notre savoir-faire", "Our craft"), ...button(quoteCta(c)), button2_label: "", button2_link: "" } },
      { type: "services-list", settings: { heading: t(c, "Nos prestations", "Our services"), ...button(quoteCta(c)) } },
      { type: "portfolio", settings: { heading: t(c, "Nos réalisations", "Our work") } },
      { type: "timeline", settings: { heading: t(c, "Notre méthode", "Our method") } },
      { type: "practical-info", settings: { heading: t(c, "Zone d'intervention", "Service area") } },
      { type: "contact-form", settings: { heading: t(c, "Demander un devis", "Request a quote") } },
    ],
  },
  {
    id: "commerce-presentation",
    kind: "page",
    category: "local",
    name: { fr: "Commerce — Présentation", en: "Local business — Presentation" },
    description: { fr: "Votre commerce, photos, services, horaires, adresse, accès et contact.", en: "Your business, photos, services, opening hours, address, access and contact." },
    usage: { fr: "Commerce ou entreprise de proximité qui reçoit ses clients.", en: "A local shop or business that welcomes customers." },
    suggestedFor: ["local", "mixed"],
    rows: (c) => [
      { type: "hero-split", settings: { heading: t(c, "Bienvenue", "Welcome"), ...button(contactCta(c)), button2_label: "", button2_link: "" } },
      { type: "gallery-mosaic", settings: { heading: t(c, "Le lieu", "The place") } },
      { type: "services-list", settings: { heading: t(c, "Nos services", "Our services"), button_label: "", button_link: "" } },
      { type: "practical-info", settings: { heading: t(c, "Horaires et accès", "Opening hours and access") } },
      { type: "contact-form", settings: { heading: t(c, "Nous écrire", "Write to us") } },
    ],
  },
  {
    id: "realisations-portfolio",
    kind: "page",
    category: "portfolio",
    name: { fr: "Réalisations — Portfolio", en: "Work — Portfolio" },
    description: { fr: "Galerie de vos réalisations, présentation de chaque projet et contact.", en: "Gallery of your work, a presentation of each project and contact." },
    usage: { fr: "Montrer ce que vous avez déjà réalisé.", en: "Show what you've already done." },
    suggestedFor: ["quote", "booking", "local", "mixed"],
    rows: (c) => [
      { type: "rich-text", settings: {} },
      { type: "portfolio", settings: { heading: t(c, "Nos réalisations", "Our work") } },
      { type: "gallery-mosaic", settings: { heading: t(c, "En images", "In pictures") } },
      { type: "cta-banner", settings: { heading: t(c, "Un projet en tête ?", "Have a project in mind?"), ...button(c.contactUrl ? quoteCta(c) : bookingCta(c)) } },
    ],
  },
  {
    id: "a-propos",
    kind: "page",
    category: "about",
    name: { fr: "À propos — L'entreprise", en: "About — The company" },
    description: { fr: "Votre histoire, vos valeurs et votre savoir-faire, à partir de ce que vous avez fourni.", en: "Your story, values and know-how, from what you provided." },
    usage: { fr: "Présenter qui vous êtes et pourquoi vous faire confiance.", en: "Introduce who you are and why to trust you." },
    suggestedFor: ["products", "booking", "quote", "local", "mixed"],
    rows: (c) => [
      { type: "about", settings: {} },
      { type: "timeline", settings: { heading: t(c, "Notre histoire", "Our story") } },
      { type: "image-with-text", settings: { heading: t(c, "Notre savoir-faire", "Our know-how"), button_label: "", button_link: "" } },
      { type: "cta-banner", settings: { heading: t(c, "Parlons de votre projet", "Let's talk about your project"), ...button(contactCta(c)) } },
    ],
  },
  {
    id: "contact",
    kind: "page",
    category: "contact",
    name: { fr: "Contact — Informations pratiques", en: "Contact — Practical information" },
    description: { fr: "Coordonnées, horaires, adresse, formulaire et accès.", en: "Contact details, opening hours, address, form and access." },
    usage: { fr: "La page où l'on vous joint.", en: "The page where people reach you." },
    suggestedFor: ["products", "booking", "quote", "local", "mixed"],
    rows: (c) => [
      { type: "contact-form", settings: { heading: t(c, "Nous contacter", "Contact us") } },
      { type: "practical-info", settings: { heading: t(c, "Nous trouver", "Find us"), button_label: "", button_link: "" } },
    ],
  },
  {
    id: "rendez-vous-reserver",
    kind: "page",
    category: "booking",
    name: { fr: "Rendez-vous — Réserver", en: "Appointment — Book" },
    description: { fr: "Présentation courte, modalités pratiques et accès au calendrier configuré.", en: "Short intro, practical terms and access to the configured calendar." },
    usage: { fr: "La page de réservation de vos clients.", en: "Your customers' booking page." },
    suggestedFor: ["booking", "local", "mixed"],
    rows: (c) =>
      c.booking?.kind === "external"
        ? [
            { type: "booking", settings: { heading: t(c, "Prendre rendez-vous", "Book an appointment"), booking_url: c.booking.url, display: "button", button_label: t(c, "Choisir un créneau", "Pick a slot") } },
            { type: "practical-info", settings: { heading: t(c, "Modalités pratiques", "Practical terms"), button_label: "", button_link: "" } },
          ]
        : [
            // Calendrier de réservation du thème : demande envoyée au professionnel, aucun faux créneau.
            { type: "rich-text", settings: {} },
            { type: "booking-calendar", settings: { heading: t(c, "Choisissez votre créneau", "Choose your slot") } },
            { type: "practical-info", settings: { heading: t(c, "Modalités pratiques", "Practical terms"), button_label: "", button_link: "" } },
          ],
  },
];

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

export const modelById = (id: string) => PAGE_MODELS.find((m) => m.id === id) ?? null;

// ---------------------------------------------------------------- activité du projet

/**
 * Catégorie d'activité : celle confirmée par le client, sinon déduite du projet (type d'entreprise, modes de contact,
 * adresse, catalogue). Jamais définitive : le client la corrige dans « Pages ».
 */
export function activityOf(p: Pick<Project, "business" | "services" | "settings">): { value: ActivityCategory; confirmed: boolean } {
  if (p.settings.activity) return { value: p.settings.activity, confirmed: true };
  const modes = new Set([...(p.services.contactModes ?? []), p.services.contactMode].filter(Boolean));
  const sellsOnline = p.business === "products";
  const hasServices = (p.services.services ?? []).length > 0;
  if (sellsOnline && hasServices) return { value: "mixed", confirmed: false };
  if (sellsOnline) return { value: "products", confirmed: false };
  if (modes.has("booking") || p.services.bookingUrl) return { value: "booking", confirmed: false };
  if (modes.has("quote")) return { value: "quote", confirmed: false };
  if ((p.services.address ?? "").trim() || (p.services.hours ?? "").trim()) return { value: "local", confirmed: false };
  return { value: "quote", confirmed: false };
}

export const ACTIVITY_LABEL: Record<ActivityCategory, { fr: string; en: string }> = {
  products: { fr: "Vente de produits", en: "Selling products" },
  booking: { fr: "Prestations avec réservation", en: "Services by appointment" },
  quote: { fr: "Artisan ou professionnel sur devis", en: "Tradesperson or professional on quotes" },
  local: { fr: "Commerce ou entreprise de proximité", en: "Local shop or business" },
  mixed: { fr: "Activité mixte (produits et prestations)", en: "Mixed (products and services)" },
};

/** Modèles proposés en premier pour l'activité (tous restent disponibles). */
export function suggestedModels(activity: ActivityCategory): PageModelId[] {
  return PAGE_MODELS.filter((m) => m.suggestedFor.includes(activity)).map((m) => m.id);
}

// ---------------------------------------------------------------- destinations réelles

const hasSection = (tpl: TemplateJson | undefined, types: string[]) => !!tpl && tpl.order.some((id) => types.includes(tpl.sections[id]?.type ?? "") && !tpl.sections[id]?.disabled);
const pageTemplate = (spec: ThemeSpec, suffix: string) => spec.templates[suffix ? `page.${suffix}` : "page"];

/** Calendrier réel : lien HTTPS du client, sinon une page du site qui contient un calendrier de réservation. */
export function bookingTarget(spec: ThemeSpec, services: ServiceProfile): BookingTarget {
  const url = (services.bookingUrl ?? "").trim();
  if (/^https:\/\/[^\s]+\.[^\s]+/i.test(url)) return { kind: "external", url };
  const page = spec.store.pages.find((p) => p.status !== "draft" && hasSection(pageTemplate(spec, p.template_suffix), ["booking-calendar", "booking"]));
  return page ? { kind: "internal", url: `/pages/${page.handle}` } : null;
}

/** Page de contact réelle (formulaire), s'il y en a une. */
export function contactUrl(spec: ThemeSpec): string | null {
  const page = spec.store.pages.find((p) => p.status !== "draft" && hasSection(pageTemplate(spec, p.template_suffix), ["contact-form", "v2-cta"]) && /contact/i.test(`${p.handle} ${p.template_suffix}`));
  const any = page ?? spec.store.pages.find((p) => p.status !== "draft" && hasSection(pageTemplate(spec, p.template_suffix), ["contact-form"]));
  return any ? `/pages/${any.handle}` : null;
}

export function buildContext(spec: ThemeSpec, project: Pick<Project, "services">, o: { productHandle?: string; service?: string } = {}): BuildContext {
  const lang = themeLang(spec);
  const prod = o.productHandle ? storeProducts(spec).find((p) => p.handle === o.productHandle) : undefined;
  return {
    lang,
    product: prod ? { handle: prod.handle, title: prod.title, url: `/products/${prod.handle}` } : undefined,
    service: o.service ? project.services.services.find((s) => s.name === o.service) : undefined,
    services: project.services,
    booking: bookingTarget(spec, project.services),
    contactUrl: contactUrl(spec),
    hasVideo: Object.keys(spec.files).some((f) => /^es-video-|^es-reel-/.test(f) && f.endsWith(".mp4")),
  };
}

/**
 * Construit la structure d'un modèle pour ce projet, sans IA : sections du thème actif, remplies avec les médias et
 * les informations du projet. Mise en page produit : la section Produit (prix, variantes, achat) est reprise de la
 * fiche produit commune, reliée au catalogue réel.
 */
/**
 * Équivalent, dans la bibliothèque de la famille du projet (issue #141), d'une section ancienne d'un modèle de page :
 * mêmes titres, textes et boutons, section de la famille et réglages de sa disposition. null : rien d'équivalent.
 */
const MODEL_REMAP: Record<FamilyId, Record<string, string | string[] | null>> = {
  specialty: { reassurance: ["specialty.guarantees~shield", "specialty.guarantees~grid"], "video-showcase": "specialty.video~wide", "how-to": ["specialty.howto~cards", "specialty.howto~journey"], "v2-benefits": "specialty.benefits~grid", "specs-list": ["specialty.specs~side", "specialty.specs~tabs"], "alternating-content": ["specialty.situations~alternate", "specialty.story~image-left"], situations: ["specialty.situations~mosaic", "specialty.story~image-left"], "hero-split": ["specialty.hero~image-right", "specialty.story~image-left"], "v2-hero": ["specialty.hero~stacked", "specialty.story~statement"], "gallery-mosaic": ["specialty.situations~mosaic", "specialty.story~image-left"], portfolio: ["specialty.situations~grid", "specialty.story~image-left"], "services-list": null, "practical-info": null, booking: null, "booking-calendar": null },
  catalog: { reassurance: "catalog.commitments~grid", "video-showcase": null, "how-to": "catalog.care~list", "v2-benefits": "catalog.commitments~grid", "specs-list": "catalog.dimensions~table", "alternating-content": "catalog.uses~side", situations: "catalog.lookbook~split", "hero-split": "catalog.hero~journal", "v2-hero": "catalog.hero~journal", "gallery-mosaic": "catalog.uses~pair", timeline: "catalog.atelier~timeline", about: "catalog.heritage~statement", portfolio: "catalog.uses~index", "services-list": null, "practical-info": null, booking: null, "booking-calendar": null },
  services: { reassurance: "services.commitments~grid", "features-grid": "services.commitments~grid", "v2-benefits": "services.commitments~grid", "video-showcase": null, "hero-split": "services.hero~journal", "v2-hero": "services.hero~journal", "gallery-mosaic": "services.portfolio~grid", "image-with-text": "services.history~statement", "alternating-content": "services.needs~scene", situations: "services.needs~cards", "specs-list": "services.detail~columns", "comparison-table": null, "cta-banner": "services.contact~band" },
};
function familyRow(row: Row, family: FamilyId, spec: ThemeSpec): Row | null {
  // Équivalent choisi selon l'usage du projet (préférence de style, pas une restriction : toute la bibliothèque reste
  // ajoutable ensuite depuis la galerie).
  if (familyTypes(family).has(row.type) || isStructuralType(row.type) || isOwnSectionOf(spec.direction, row.type)) return row;
  const ids = MODEL_REMAP[family][row.type];
  if (ids === null) return null;
  // Première disposition que le thème installé sait rendre ; thème ancien sans équivalent : la section d'origine reste.
  for (const id of ids === undefined ? [] : Array.isArray(ids) ? ids : [ids]) {
    const lib = resolveLibraryType(`fam:${id}`);
    if (!sectionIncompatibility(spec, lib.type, null)) return { ...row, type: lib.type, settings: { ...(row.settings ?? {}), ...lib.settings }, blocks: undefined };
  }
  return row;
}

export function buildModelTemplate(spec: ThemeSpec, project: Project, model: PageModel, c: BuildContext): TemplateJson {
  const key = model.kind === "product" ? "product.__modele" : "page.__modele";
  let work = cloneSpec(spec);
  work.templates[key] = { sections: {}, order: [] };
  if (model.kind === "product") {
    const base = spec.templates.product;
    const mainId = base?.order.find((id) => base.sections[id]?.type === "main-product");
    const main: SectionInstance = mainId ? JSON.parse(JSON.stringify(base.sections[mainId])) : { type: "main-product", settings: {} };
    delete main.disabled;
    work.templates[key] = { sections: { main: main }, order: ["main"] };
  }
  const ctx = contentContext(project, work, false);
  // Sans photo du client : ouverture typographique, galeries masquées (à remplir par le client), jamais d'image inventée.
  const pools = mediaPools(work);
  const noPhotos = !pools.photos.length && !pools.cutout.length;
  const rows = model.rows(c).flatMap((row): Row[] => {
    if (!noPhotos) return [row];
    if (row.type === "hero-split") {
      const st = row.settings ?? {};
      return [{ type: "v2-hero", settings: { layout: "type", texture: "paper", heading: st.heading, text: st.text, button_label: st.button_label, button_link: st.button_link, button2_label: "", button2_link: "", eyebrow: "" } }];
    }
    if (row.type === "image-with-text") return [];
    if (["gallery-mosaic", "portfolio"].includes(row.type)) return [{ ...row, disabled: true }];
    return [row];
  });
  const family = projectKind(project);
  for (const raw of rows) {
    // Bibliothèque de la famille du projet (issue #141) : une section ancienne du modèle prend son équivalent.
    const row = familyRow(raw, family, work);
    if (!row) continue;
    const filled = withProjectMedia(work, row.type, {}, undefined, ctx);
    const settings = { ...filled.settings, ...(row.settings ?? {}) };
    const blocks = row.blocks ? row.blocks(filled.blocks) : filled.blocks;
    const before = new Set(work.templates[key].order);
    const r = applyOps(work, [{ op: "add_section", template: key, type: row.type, settings: settings as any, blocks: blocks as any } as any], { targeted: new Set() });
    if (!r.applied.length) continue;
    work = r.spec;
    const sid = work.templates[key].order.find((id) => !before.has(id));
    if (sid && row.disabled) work.templates[key].sections[sid].disabled = true;
  }
  return work.templates[key];
}

/**
 * Aperçu d'un modèle sur le site du projet, sans rien enregistrer : la page (ou la mise en page produit) est composée
 * dans une copie du thème actif et rendue par le moteur d'aperçu réel (mêmes sections que l'export).
 */
export function previewModelSpec(spec: ThemeSpec, project: Project, model: PageModel, o: { productHandle?: string; service?: string } = {}): { spec: ThemeSpec; path: string } {
  const work = cloneSpec(spec);
  if (model.kind === "product") {
    const handle = o.productHandle && storeProducts(work).some((p) => p.handle === o.productHandle) ? o.productHandle : storeProducts(work)[0].handle;
    const c = buildContext(work, project, { productHandle: handle });
    work.templates["product.apercu_modele"] = buildModelTemplate(work, project, model, c);
    for (const p of [work.store.product, ...(work.store.products ?? [])]) if (p.handle === handle) p.template_suffix = "apercu_modele";
    return { spec: work, path: `/products/${handle}` };
  }
  const c = buildContext(work, project, { service: o.service });
  work.templates["page.apercu_modele"] = buildModelTemplate(work, project, model, c);
  work.store.pages = [...work.store.pages.filter((p) => p.handle !== "apercu-modele"), { handle: "apercu-modele", title: pick(c.lang, model.name.fr, model.name.en), template_suffix: "apercu_modele", body_html: "" }];
  return { spec: work, path: "/pages/apercu-modele" };
}
