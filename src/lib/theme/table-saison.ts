/**
 * TABLE SAISON — thème restaurant de la famille Services (issue #175, consigne de Thomas du 23 octobre 2026).
 *
 * Bistrot français chaleureux : fond ivoire, boutons et pied de page bordeaux, sections olive, serif élégante pour les
 * titres (Playfair Display), sans-serif discrète pour le texte (DM Sans). Sections propres au thème : theme-base/sections
 * /ts-*.liquid, feuille theme-base/assets/table-saison.css, scripts table-saison.js et table-saison-core.js (calcul des
 * réservations partagé avec le service réel du studio, src/lib/restaurant/booking.ts).
 *
 * Appliqué à un autre restaurant (`finish`), le thème reprend les contenus du client (nom, accroche, photos, coordonnées,
 * prestations) et ajoute ses pages de restaurant : celles qui attendent des informations du client (carte, plats, prix,
 * réservation tant que le service réel n'est pas activé…) restent en brouillon, visibles dans le studio seulement.
 * Aucun plat, prix, photo, coordonnée ni mention de la démonstration TABLE SAISON n'est copié chez un client.
 */
import type { CatalogTheme, Kit, Row } from "./theme-catalog";
import type { StorePage, TemplateJson, ThemeSpec, SectionInstance } from "./spec";
import type { Lang } from "../i18n";
import { pick } from "../i18n";

type Blocks = { type: string; settings: Record<string, unknown> }[];

/** Pages propres au thème (adresse, titre, gabarit) ; la démonstration et un client partagent la même structure. */
export const TS_PAGES = [
  { handle: "la-carte", handleEn: "menu", fr: "La carte", en: "Menu", suffix: "ts-carte" },
  { handle: "au-fil-des-saisons", handleEn: "through-the-seasons", fr: "Au fil des saisons", en: "Through the seasons", suffix: "ts-saisons" },
  { handle: "grandes-tablees", handleEn: "large-tables", fr: "Vos grandes tablées", en: "Large tables", suffix: "ts-groupes" },
  { handle: "reserver", handleEn: "book-a-table", fr: "Réserver une table", en: "Book a table", suffix: "ts-reserver" },
  { handle: "le-lieu", handleEn: "the-place", fr: "Le lieu", en: "The place", suffix: "ts-lieu" },
  { handle: "galerie", handleEn: "gallery", fr: "Galerie", en: "Gallery", suffix: "ts-galerie" },
  { handle: "contact", handleEn: "contact", fr: "Contact", en: "Contact", suffix: "ts-contact" },
  { handle: "faq", handleEn: "faq", fr: "Questions fréquentes", en: "Frequently asked questions", suffix: "ts-faq" },
  { handle: "retrouver-ma-reservation", handleEn: "find-my-booking", fr: "Retrouver ma réservation", en: "Find my booking", suffix: "ts-retrouver" },
  { handle: "ma-reservation", handleEn: "my-booking", fr: "Ma réservation", en: "My booking", suffix: "ts-ma-reservation" },
  { handle: "modifier-ma-reservation", handleEn: "change-my-booking", fr: "Modifier ma réservation", en: "Change my booking", suffix: "ts-modifier" },
  { handle: "demande-de-groupe-recue", handleEn: "group-request-received", fr: "Demande de groupe reçue", en: "Group request received", suffix: "ts-groupe-recue" },
  { handle: "mentions-legales", handleEn: "legal-notice", fr: "Mentions légales", en: "Legal notice", suffix: "ts-legal-mentions" },
  { handle: "confidentialite", handleEn: "privacy", fr: "Confidentialité", en: "Privacy", suffix: "ts-legal-confidentialite" },
  { handle: "conditions-de-reservation", handleEn: "booking-terms", fr: "Conditions de réservation", en: "Booking terms", suffix: "ts-legal-conditions" },
  { handle: "cookies", handleEn: "cookies", fr: "Cookies", en: "Cookies", suffix: "ts-legal-cookies" },
] as const;
export type TsPageHandle = (typeof TS_PAGES)[number]["handle"];
/** Adresse d'une page du thème dans la langue du site (adresses anglaises pour un site en anglais). */
export const tsHandle = (h: TsPageHandle, lang: Lang = "fr") => (lang === "en" ? TS_PAGES.find((p) => p.handle === h)!.handleEn : h);
export const tsUrl = (h: TsPageHandle, lang: Lang = "fr") => `/pages/${tsHandle(h, lang)}`;

/** Gabarit à partir de lignes [type, réglages, blocs, options] (identifiants lisibles, stables). */
export function tsTemplate(rows: Row[]): TemplateJson {
  const out: TemplateJson = { sections: {}, order: [] };
  const count: Record<string, number> = {};
  for (const [type, settings, blocks, opts] of rows) {
    count[type] = (count[type] ?? 0) + 1;
    const sid = `${type}-${count[type]}`;
    const s: SectionInstance = { type, settings };
    if (blocks?.length) {
      s.blocks = {};
      s.block_order = [];
      blocks.forEach((b, i) => { const bid = `${b.type}-${i + 1}`; s.blocks![bid] = { type: b.type, settings: b.settings }; s.block_order!.push(bid); });
    }
    if (opts?.disabled) s.disabled = true;
    out.sections[sid] = s;
    out.order.push(sid);
  }
  return out;
}

const html = (s: string) => (s && !/^\s*</.test(s) ? `<p>${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>` : s);
const real = (s?: string | null) => !!s && !/\[(?:À|A) compléter|\[To complete/i.test(s);

/** Réglages du restaurant posés dans l'en-tête (règles de réservation par défaut, mode démonstration). */
export function restaurantSettings(lang: Lang, o: { address?: string; bookingLabel: string; bookingLink: string; bookbar: boolean; cookiesLink: string }): Record<string, unknown> {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  return {
    logo_subtitle: t("Cuisine de saison", "Seasonal cooking"), color_wine: "#6E1F2D", color_olive: "#3C3F28", color_ivory: "#F6F0E5", address: o.address ?? "",
    booking_label: o.bookingLabel, booking_link: o.bookingLink, show_bookbar: o.bookbar, booking_mode: "demo", service_url: "", site_url: "", notify_email: "",
    timezone: "Europe/Paris", open_days: "0,1,2,3,4,5,6", closures: "", lunch_label: t("Déjeuner", "Lunch"), lunch_slots: "12:00, 12:30, 13:00", dinner_label: t("Dîner", "Dinner"), dinner_slots: "19:00, 19:30, 20:00, 20:30",
    capacity: 24, min_party: 1, max_party: 8, horizon_days: 90, lead_minutes: 60,
    page_reserve: tsUrl("reserver", lang), page_manage: tsUrl("ma-reservation", lang), page_modify: tsUrl("modifier-ma-reservation", lang), page_lookup: tsUrl("retrouver-ma-reservation", lang), page_group_sent: tsUrl("demande-de-groupe-recue", lang),
    show_cookies: true, cookies_link: o.cookiesLink,
  };
}

/** Accueil d'un site de restaurant (services) composé avec les contenus du client. */
function servicesHome(k: Kit): (Row | Row[])[] {
  const t = k.t;
  const lang = k.t("fr", "en") as Lang;
  const photos = [k.im.scene1, k.im.scene2, k.im.scene3, k.im.detail1, k.im.detail2, k.im.lifestyle2].filter((f): f is string => !!f);
  return [
    k.lib("ts-hero", 1, { layout: "home", eyebrow: k.hero.eyebrow, heading: k.hero.heading, text: html(k.hero.text), image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.banner ?? "", button_label: k.hero.cta || t("Réserver une table", "Book a table"), button_link: "", button2_label: "", height: 460, height_mobile: 340 }),
    k.R.servicesList(1, "cards", { withImages: true }),
    k.lib("ts-photos", 1, { columns: "1fr 1fr 1fr", ratio: "1.2", bleed: false }, { hide: photos.length < 3, blocks: photos.slice(0, 3).map((f) => ({ type: "photo", settings: { image_asset: f, image_position: "50% 50%", alt: "" } })) }),
    // Carte par rubriques et moments du jour : ils attendent les plats et les horaires du restaurant (posés masqués).
    k.lib("ts-teaser", 2, { eyebrow: t("La carte", "Menu"), heading: "", text: "", button_label: t("Découvrir la carte", "See the menu"), button_link: tsUrl("la-carte", lang), ornament: true }, { hide: true }),
    k.lib("ts-moments", 1, {}, { hide: true }),
    k.R.practical(2),
    k.faqSec(1, 5, "lines"),
    k.lib("ts-banner", 1, { heading: t("À votre table ?", "Join us at the table?"), text: "", image_asset: k.im.hero ?? k.im.banner ?? k.im.lifestyle ?? "", button_label: "", align: "center", overlay: 50, height: 210, height_mobile: 280 }, { hide: !(k.im.hero ?? k.im.banner ?? k.im.lifestyle) }),
    k.R.contactForm(1, t("Une question, une demande ?", "A question, a request?")),
  ];
}

/** Accueil « boutique » de repli (thème réservé aux services : composition de secours si un projet produit le choisit). */
function shopHome(k: Kit): (Row | Row[])[] {
  return [
    k.lib("ts-hero", 1, { layout: "home", eyebrow: k.hero.eyebrow, heading: k.hero.heading, text: html(k.hero.text), image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.packshot ?? "", button_label: k.hero.cta, button_link: "", button2_label: "", height: 460, height_mobile: 340 }),
    k.feat(1, "plain", 3),
    k.lib("ts-split", 1, { heading: k.t("En situation", "In its setting"), text: "", image_asset: k.im.scene1 ?? k.im.lifestyle2 ?? "", image_side: "left", columns: "1fr 1fr", background: "ivory", ornament: "left", mobile: "image", link_label: "", link_style: "link", min_height: 300, boxed: false, image_position: "50% 50%" }, { hide: !(k.im.scene1 ?? k.im.lifestyle2) }),
    k.story(2),
    k.faqSec(1, 4, "lines"),
    k.lib("ts-banner", 1, { heading: k.hero.heading, text: "", image_asset: k.im.hero ?? k.im.banner ?? "", button_label: k.hero.cta, align: "center", overlay: 50, height: 220, height_mobile: 280 }, { hide: !(k.im.hero ?? k.im.banner) }),
    k.newsletter(1),
  ];
}

type FinishCtx = { kit: Kit; lang: Lang; services: boolean; shopName: string; address: string; phone: string; email: string; hours: string; contactUrl: string; bookingLabel: string; bookingLink: string; legalUrl: string };

/**
 * Pages du restaurant pour un CLIENT (jamais les contenus de la démonstration) : structure du thème, textes neutres et
 * informations du client. Sans contenu à montrer (plats, prix, photos) ou sans service réel, la page reste en brouillon.
 */
function clientPages(ctx: FinishCtx): { pages: StorePage[]; templates: Record<string, TemplateJson> } {
  const { lang, kit: k } = ctx;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const todo = t("[À renseigner]", "[To complete]");
  const im = k.im;
  const photos = [im.scene1, im.scene2, im.scene3, im.detail1, im.detail2, im.lifestyle, im.lifestyle2, im.hero].filter((f): f is string => !!f);
  const page = (h: TsPageHandle, draft: boolean): StorePage => { const p = TS_PAGES.find((x) => x.handle === h)!; return { handle: tsHandle(h, lang), title: t(p.fr, p.en), template_suffix: p.suffix, body_html: "", ...(draft ? { status: "draft" as const } : {}) }; };
  const legalItems = (titles: [string, string][]): Blocks => titles.map(([fr, en]) => ({ type: "item", settings: { title: t(fr, en), value: todo, text: t("<p>Contenu à compléter avant publication.</p>", "<p>Content to complete before publishing.</p>") } }));
  const legalTabs = (current: number, heading: string): Row => ["ts-legal", { heading, current, tab1_label: t("Mentions légales", "Legal notice"), tab1_link: ctx.legalUrl, tab2_label: t("Confidentialité", "Privacy"), tab2_link: tsUrl("confidentialite", lang), tab3_label: t("Conditions de réservation", "Booking terms"), tab3_link: tsUrl("conditions-de-reservation", lang), tab4_label: "Cookies", tab4_link: tsUrl("cookies", lang) }, legalItems(current === 2 ? [["Données collectées", "Data collected"], ["Durée de conservation", "Retention period"], ["Vos droits", "Your rights"]] : current === 3 ? [["Réservation", "Booking"], ["Retard et absence", "Late arrival and no-show"], ["Annulation", "Cancellation"]] : [["Cookies nécessaires", "Necessary cookies"], ["Mesure d'audience", "Audience measurement"], ["Vos choix", "Your choices"]])];
  const templates: Record<string, TemplateJson> = {
    "page.ts-carte": tsTemplate([
      ["ts-hero", { layout: "page", heading: t("La carte", "Menu"), show_rule: true, image_asset: im.detail1 ?? im.hero ?? "", height: 400, height_mobile: 240 }],
      ["ts-menu", { show_tabs: true, note: "", cta_label: ctx.bookingLabel, cta_link: ctx.bookingLink }, ["Entrées|Starters", "Plats|Mains", "Desserts|Desserts", "Boissons|Drinks"].map((x) => ({ type: "category", settings: { title: t(x.split("|")[0], x.split("|")[1]), anchor: "", image_asset: "", image_side: "right" } })), { disabled: true }],
    ]),
    "page.ts-saisons": tsTemplate([
      ["ts-hero", { layout: "page", heading: t("Au fil\ndes saisons", "Through\nthe seasons"), show_rule: true, image_asset: im.hero ?? im.lifestyle ?? "", height: 460, height_mobile: 300 }],
      ["ts-dishes", { style: "plain", heading: t("Notre sélection du moment", "Our current selection") }, [], { disabled: true }],
      ["ts-quote", { quote: k.hero.heading, button_label: t("Découvrir la carte", "See the menu"), button_link: tsUrl("la-carte", lang), button2_label: ctx.bookingLabel, button2_link: ctx.bookingLink }],
      ["ts-photos", { columns: "1fr", ratio: "2.3", bleed: true }, photos.slice(0, 1).map((f) => ({ type: "photo", settings: { image_asset: f, alt: "" } }))],
    ]),
    "page.ts-groupes": tsTemplate([
      ["ts-hero", { layout: "page", heading: t("Vos grandes\ntablées", "Your large\ntables"), show_rule: true, image_asset: im.lifestyle ?? im.hero ?? "", height: 460, height_mobile: 300 }],
      ["ts-cards", {}, [{ type: "card", settings: { heading: t("Repas de groupe", "Group meals"), text: "", image_asset: photos[0] ?? "" } }, { type: "card", settings: { heading: t("Événement privé", "Private event"), text: "", image_asset: photos[1] ?? "" } }], { disabled: photos.length < 2 }],
      ["ts-request", { text: html(t("Nous revenons vers vous rapidement pour étudier votre demande.", "We will get back to you quickly about your request.")), image_asset: photos[2] ?? photos[0] ?? "", conditions_text: html(todo) }],
    ]),
    "page.ts-reserver": tsTemplate([["ts-booking", { image_step1: im.lifestyle ?? im.hero ?? "", image_step2: im.detail1 ?? im.hero ?? "", image_step3: im.lifestyle2 ?? im.hero ?? "", image_unavailable: im.detail2 ?? im.hero ?? "", image_confirm: im.hero ?? im.lifestyle ?? "", aside_step1: im.scene1 ?? "", aside_step3: im.scene2 ?? "", aside_confirm: im.scene3 ?? "" }]]),
    "page.ts-lieu": tsTemplate([
      ["ts-hero", { layout: "page", heading: t("Le lieu", "The place"), image_asset: im.lifestyle ?? im.hero ?? "", button_label: ctx.bookingLabel, button_link: ctx.bookingLink, height: 560, height_mobile: 360 }],
      ["ts-photos", { columns: "1fr 1fr", ratio: "1.35" }, photos.slice(0, 2).map((f) => ({ type: "photo", settings: { image_asset: f, alt: "" } })), { disabled: photos.length < 2 }],
      ["ts-panel", { heading: t("L'art de recevoir", "The art of hosting"), text: "" }, [], { disabled: true }],
      ["ts-ingredients", { eyebrow: t("Des produits de saison", "Seasonal produce"), heading: "", text: "", link_label: "" }, photos.slice(0, 4).map((f) => ({ type: "photo", settings: { image_asset: f, alt: "" } })), { disabled: true }],
    ]),
    "page.ts-galerie": tsTemplate([
      ["ts-intro", { heading: t("En images", "In pictures"), text: "" }],
      ["ts-gallery", {}, photos.map((f, i) => ({ type: "photo", settings: { image_asset: f, alt: "", category: "lieu", span: [5, 7, 6, 6, 4, 4, 4, 6][i] ?? 4 } })), { disabled: photos.length < 3 }],
    ]),
    "page.ts-contact": tsTemplate([
      ["ts-intro", { heading: t("Nous rendre visite", "Visit us"), text: "" }],
      ["ts-photos", { columns: "1fr", ratio: "2.2", bleed: true }, (im.hero ?? im.lifestyle) ? [{ type: "photo", settings: { image_asset: im.hero ?? im.lifestyle!, alt: "" } }] : []],
      ["ts-contact", { address: ctx.address, phone: ctx.phone, email: ctx.email, hours: ctx.hours, todo_label: todo, hours_todo: t("[À confirmer]", "[To confirm]") }],
    ]),
    "page.ts-faq": tsTemplate([["ts-intro", { heading: t("Questions fréquentes", "Frequently asked questions"), text: "" }], ["ts-faq", { layout: "page" }, [], { disabled: true }]]),
    "page.ts-retrouver": tsTemplate([["ts-manage", { view: "lookup", eyebrow: t("Votre réservation", "Your booking"), heading: t("Retrouver\nma réservation", "Find\nmy booking"), image_asset: im.scene1 ?? im.lifestyle ?? "" }]]),
    "page.ts-ma-reservation": tsTemplate([["ts-manage", { view: "detail", heading: t("Ma réservation", "My booking"), image_asset: im.scene2 ?? im.lifestyle ?? "" }]]),
    "page.ts-modifier": tsTemplate([["ts-manage", { view: "modify", heading: t("Modifier ma réservation", "Change my booking"), back_link: tsUrl("ma-reservation", lang), image_asset: im.scene3 ?? im.lifestyle ?? "" }]]),
    "page.ts-groupe-recue": tsTemplate([["ts-hero", { layout: "fade", eyebrow: t("Demande de groupe", "Group request"), heading: t("Votre demande\na bien été reçue", "Your request\nhas been received"), image_asset: im.lifestyle ?? im.hero ?? "", button_label: t("Découvrir la carte", "See the menu"), button_link: tsUrl("la-carte", lang), button2_label: t("Retour à l'accueil", "Back to home"), button2_link: "/", height: 560, height_mobile: 300 }]]),
    "page.ts-legal-confidentialite": tsTemplate([legalTabs(2, t("Confidentialité", "Privacy"))]),
    "page.ts-legal-conditions": tsTemplate([legalTabs(3, t("Conditions de réservation", "Booking terms"))]),
    "page.ts-legal-cookies": tsTemplate([legalTabs(4, "Cookies")]),
  };
  const pages: StorePage[] = [
    page("la-carte", true), page("au-fil-des-saisons", true), page("grandes-tablees", true),
    // Réservation en ligne : brouillon tant que le restaurant n'a pas activé le service réel (jamais de fausse réservation publiée).
    page("reserver", true), page("ma-reservation", true), page("retrouver-ma-reservation", true), page("modifier-ma-reservation", true), page("demande-de-groupe-recue", true),
    page("le-lieu", photos.length < 2), page("galerie", photos.length < 3),
    page("confidentialite", true), page("conditions-de-reservation", true), page("cookies", true),
  ];
  return { pages, templates };
}

/** Finition commune (démonstration et clients) : en-tête, pied, réglages du restaurant, pages et page introuvable. */
export function finishTableSaison(spec: ThemeSpec, ctx: FinishCtx) {
  const lang = ctx.lang;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const header = spec.groups.header;
  const headerId = header.order.find((id) => header.sections[id]?.type === "header");
  if (headerId) Object.assign(header.sections[headerId].settings, { layout: "logo-left", show_search: false, show_cart: false, sticky: true, transparent_on_home: false, mobile_menu: "drawer", cta_label: ctx.bookingLabel, cta_link: ctx.bookingLink, cta_icon: "arrow", phone: "" });
  if (!header.order.some((id) => header.sections[id]?.type === "ts-restaurant")) {
    header.sections["ts-restaurant"] = { type: "ts-restaurant", settings: restaurantSettings(ctx.lang, { address: ctx.address, bookingLabel: ctx.bookingLabel, bookingLink: ctx.bookingLink, bookbar: true, cookiesLink: ctx.services ? tsUrl("cookies", lang) : "" }) };
    header.order.unshift("ts-restaurant");
  }
  const footer = spec.groups.footer;
  const footerId = footer.order.find((id) => footer.sections[id]?.type === "footer");
  if (footerId) Object.assign(footer.sections[footerId].settings, { style: "brand-left", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-3" });
  if (!footer.order.some((id) => footer.sections[id]?.type === "ts-footnote")) {
    footer.sections["ts-footnote"] = { type: "ts-footnote", settings: { note: "", link1_label: t("Mentions légales", "Legal notice"), link1: ctx.legalUrl, link2_label: t("Politique de confidentialité", "Privacy policy"), link2: ctx.services ? tsUrl("confidentialite", lang) : "/policies/privacy-policy", link3_label: "Cookies", link3: ctx.services ? tsUrl("cookies", lang) : "" } };
    footer.order.push("ts-footnote");
  }
  spec.templates["404"] = tsTemplate([["ts-404", { image_asset: "", heading: t("Cette page\nn'est pas\nà la carte", "This page\nis not\non the menu"), text: t("<p>La page que vous recherchez semble s'être mise en appétit ailleurs.</p>", "<p>The page you are looking for seems to have gone for a bite elsewhere.</p>"), button_label: t("Retour à l'accueil", "Back to home"), button_link: "/", button2_label: t("Découvrir la carte", "See the menu"), button2_link: ctx.services ? tsUrl("la-carte", lang) : "/" }]]);
  if (!ctx.services) return;
  const { pages, templates } = clientPages(ctx);
  Object.assign(spec.templates, templates);
  const have = new Set(spec.store.pages.map((p) => p.handle));
  // Pages du client (contact, FAQ, mentions…) conservées : seules les pages manquantes du restaurant sont ajoutées.
  for (const p of pages) if (!have.has(p.handle)) spec.store.pages.push(p);
}

export const TABLE_SAISON_THEME: CatalogTheme = {
  id: "table-saison",
  name: "Table Saison",
  tagline: "Bistrot de saison, table qui rassemble",
  description: "Site de restaurant de la famille Services : grande ouverture photographique, philosophie, plats en cartes, carte olive par rubriques, lieu, produits de saison, déjeuner et dîner, grandes tablées, questions et appel à réserver ; réservation en trois étapes avec créneau indisponible, confirmation, gestion, modification et annulation. Ivoire, bordeaux et olive, serif élégante et sans-serif discrète.",
  bestFor: ["restaurant", "bistrot", "brasserie", "table de saison", "réservation de table"],
  en: { tagline: "Seasonal bistro, a table that brings people together", description: "Restaurant website from the Services family: large photographic opening, philosophy, dishes as cards, olive menu band by course, the place, seasonal produce, lunch and dinner, large tables, questions and a call to book; three-step table booking with an unavailable slot, confirmation, management, change and cancellation. Ivory, burgundy and olive, an elegant serif and a quiet sans-serif.", bestFor: ["restaurant", "bistro", "brasserie", "seasonal cooking", "table booking"] },
  fonts: { heading: "playfair_display_n4", body: "dm_sans_n4" },
  previewFonts: { heading: "Playfair Display", body: "DM Sans" },
  motion: "subtle",
  photoMood: "gourmand",
  kinds: ["services"],
  look: { headerLayout: "logo-left", shape: "bar", icons: "plain", menu: "drawer", footer: "brand-left", ann: "static", card: "boxed", button: "solid", radius: { button: 4, card: 6 }, headingCase: "none", tracking: 0, headingScale: 100, glow: 0, shine: false, dark: false, gallery: "stack", pageWidth: 1320, spacing: 100, ds: "bistro", density: "balanced", buttonUppercase: false },
  settings: { editorial_profile: "none", conversion_profile: "none", motion_intensity: "subtle" },
  headerSettings: { layout: "logo-left", show_search: false, mobile_menu: "drawer" },
  mainProduct: { gallery_layout: "stack", sticky_bar: false, color_scheme: "scheme-1" },
  palette: (k) => {
    const ivory = k.light("#F6F0E5");
    const olive = "#3C3F28";
    const wine = k.night(0.2, 0.55);
    return [k.scheme(ivory, "#2A2421", k.onLight(ivory)), k.scheme(olive, "#F6F0E5", k.onDark(olive), 0.06), k.scheme(wine, "#F6F0E5", k.onDark(wine), 0.06), k.filled(k.p.accent)];
  },
  home: shopHome,
  services: servicesHome,
  product: (k) => [k.faqSec(1, 4, "lines")],
  finish: finishTableSaison,
};
