/**
 * PHASE — Électricité : thème de la famille Services (artisan électricien), reproduit d'après les dix planches de
 * Thomas du 25 octobre 2026 (`docs/theme-briefs/phase/`, PR documentaire #188) : 18 pages ordinateur et téléphone.
 *
 * Bleu nuit #141B30, jaune électrique #F2F55C, blanc et gris clairs ; grands titres Inter Tight très gras (police libre
 * SIL OFL intégrée au thème), textes Inter, petites notes à chasse fixe Space Mono ; traits de circuits dessinés en SVG,
 * pictogrammes au trait du kit (snippet ph-icon). Sections propres au thème : theme-base/sections/ph-*.liquid, feuilles
 * phase-fonts.css et phase.css, script phase.js (chargés par l'en-tête du thème).
 *
 * Formulaires (contact, demande de devis, préparation d'un dépannage) : en démonstration, rien n'est envoyé
 * (« démonstration — demande non envoyée ») et la confirmation reprend les valeurs saisies ; en production, l'envoi
 * passe par le formulaire de contact de la plateforme (aucun succès fabriqué si l'envoi échoue).
 *
 * Appliqué à un vrai client (`finish`), le thème reprend SES contenus (nom, accroche, photos, coordonnées) : aucun
 * texte, projet, conseil ni photo de la démonstration n'est copié ; coordonnées inconnues « À renseigner ».
 */
import type { CatalogTheme, Kit, Row } from "./theme-catalog";
import type { StorePage, TemplateJson, ThemeSpec, SectionInstance } from "./spec";
import type { Lang } from "../i18n";
import { pick } from "../i18n";

/** Disposition du pied de page au téléphone, propre à chaque planche (06 à 10). */
export type PhFootMobile = "cols" | "grid" | "pair" | "split" | "stack";
export type PhPageLook = { footer_mobile: PhFootMobile; footer_line?: boolean };
export const LOOK_06: PhPageLook = { footer_mobile: "cols" };
export const LOOK_07: PhPageLook = { footer_mobile: "grid" };
export const LOOK_08: PhPageLook = { footer_mobile: "pair" };
export const LOOK_09: PhPageLook = { footer_mobile: "split" };
export const LOOK_10: PhPageLook = { footer_mobile: "stack" };

/** Pages propres au thème (adresse française et anglaise, titre, gabarit, dessin de la planche téléphone). */
export const PH_PAGES = [
  { handle: "prestations", handleEn: "services", fr: "Prestations", en: "Services", suffix: "ph-prestations", look: LOOK_06 },
  { handle: "installation-et-renovation", handleEn: "installation-and-renovation", fr: "Installation et rénovation", en: "Installation and renovation", suffix: "ph-installation", look: LOOK_07 },
  { handle: "tableau-et-securite", handleEn: "consumer-unit-and-safety", fr: "Tableau et sécurité", en: "Consumer unit and safety", suffix: "ph-tableau", look: LOOK_07 },
  { handle: "eclairage", handleEn: "lighting", fr: "Éclairage", en: "Lighting", suffix: "ph-eclairage", look: LOOK_07 },
  { handle: "depannage", handleEn: "troubleshooting", fr: "Dépannage", en: "Troubleshooting", suffix: "ph-depannage", look: LOOK_07 },
  { handle: "realisations", handleEn: "projects", fr: "Réalisations", en: "Projects", suffix: "ph-realisations", look: LOOK_08 },
  { handle: "l-entreprise", handleEn: "the-company", fr: "L'entreprise", en: "The company", suffix: "ph-entreprise", look: LOOK_08 },
  { handle: "faq", handleEn: "faq", fr: "Questions fréquentes", en: "Frequently asked questions", suffix: "ph-faq", look: LOOK_08 },
  { handle: "conseils", handleEn: "advice", fr: "Conseils", en: "Advice", suffix: "ph-conseils", look: LOOK_09 },
  { handle: "contact", handleEn: "contact", fr: "Contact", en: "Contact", suffix: "ph-contact", look: LOOK_09 },
  { handle: "demande-de-devis", handleEn: "request-a-quote", fr: "Demande de devis", en: "Request a quote", suffix: "ph-devis", look: LOOK_09 },
  { handle: "demande-envoyee", handleEn: "request-sent", fr: "Demande enregistrée", en: "Request recorded", suffix: "ph-confirmation", look: LOOK_10 },
  { handle: "mentions-legales", handleEn: "legal-notice", fr: "Mentions légales", en: "Legal notice", suffix: "ph-mentions", look: LOOK_10 },
  { handle: "donnees-et-cookies", handleEn: "data-and-cookies", fr: "Confidentialité et cookies", en: "Privacy and cookies", suffix: "ph-donnees", look: LOOK_10 },
] as const;
export type PhPageHandle = (typeof PH_PAGES)[number]["handle"];
export const phHandle = (h: PhPageHandle, lang: Lang = "fr") => (lang === "en" ? PH_PAGES.find((p) => p.handle === h)!.handleEn : h);
export const phUrl = (h: PhPageHandle, lang: Lang = "fr") => `/pages/${phHandle(h, lang)}`;

/** Gabarit à partir de lignes [type, réglages, blocs, options] (identifiants lisibles, stables). */
export function phTemplate(rows: Row[]): TemplateJson {
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

/** Ligne « Réglages de la page » (disposition du pied au téléphone, propre à la planche). */
export const pageRow = (look: PhPageLook): Row => ["ph-page", { ...look }];

/** Réglages de l'en-tête : navigation, bouton d'appel, couleurs, mode des formulaires et préférences de cookies. */
export function headerSettings(lang: Lang, o: { demo: boolean; ctaLink: string; quotePage: string; confirmPage: string; cookiesLink: string; logo?: string }): Record<string, unknown> {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  return {
    logo_asset: o.logo ?? "", wordmark: "", tagline: "", menu: "main-menu", nav_label: t("Navigation principale", "Main navigation"),
    cta_label: t("Demander un devis", "Request a quote"), cta_link: o.ctaLink,
    menu_open_label: t("Ouvrir le menu", "Open the menu"), menu_close_label: t("Fermer le menu", "Close the menu"), menu_label: "Menu", submenu_label: t("Afficher les pages de « [t] »", "Show the pages of “[t]”"),
    color_navy: "#141B30", color_yellow: "#F2F55C", color_ink: "#141B30", color_text: "#4A5263", color_line: "#E3E7EE", color_soft: "#F3F6F9",
    form_mode: o.demo ? "demo" : "platform", quote_page: o.quotePage, confirm_page: o.confirmPage,
    demo_note: t("Démonstration — demande non envoyée.", "Demonstration — request not sent."),
    sending_label: t("Envoi en cours…", "Sending…"), error_title: t("Vérifiez les champs signalés :", "Please check the highlighted fields:"),
    fail_label: t("L'envoi n'a pas abouti. Votre saisie est conservée : réessayez dans un instant ou contactez-nous directement.", "Sending failed. What you typed is kept: try again in a moment or contact us directly."),
    blocked_label: t("L'envoi en ligne n'est pas encore branché sur ce site. Votre saisie est conservée ; contactez-nous directement.", "Online sending is not connected on this site yet. What you typed is kept; please contact us directly."),
    required_label: t("Ce champ est obligatoire.", "This field is required."), email_label: t("Veuillez saisir une adresse e-mail valide.", "Please enter a valid email address."),
    phone_label: t("Veuillez saisir un numéro de téléphone valide.", "Please enter a valid phone number."), postcode_label: t("Veuillez saisir un code postal à 5 chiffres.", "Please enter a 5-digit postcode."),
    consent_label: t("Votre accord est nécessaire pour traiter la demande.", "Your consent is needed to process the request."), choice_label: t("Choisissez une option.", "Please choose an option."),
    file_format_label: t("Format non pris en charge.", "Format not supported."), file_size_label: t("Fichier trop lourd (10 Mo au plus).", "File too large (10 MB maximum)."), file_count_label: t("5 fichiers au plus.", "5 files maximum."),
    file_remove_label: t("Retirer", "Remove"), file_accepted: t("Formats acceptés : JPG, PNG, PDF (max. 10 Mo).", "Accepted formats: JPG, PNG, PDF (max. 10 MB)."),
    show_cookies: true, cookies_link: o.cookiesLink, cookies_title: t("Vos préférences de cookies", "Your cookie preferences"),
    cookies_text: t("Les cookies nécessaires font fonctionner le site. La mesure d'audience et les contenus externes sont facultatifs et restent désactivés sans votre accord.", "Necessary cookies make the site work. Audience measurement and external content are optional and stay off without your consent."),
    cookies_more: t("En savoir plus", "Learn more"), cookies_accept: t("Tout accepter", "Accept all"), cookies_refuse: t("Tout refuser", "Refuse all"), cookies_custom: t("Personnaliser", "Customise"),
    cookies_saved: t("Vos préférences sont enregistrées.", "Your preferences are saved."),
  };
}

/** Réglages du pied de page (une seule source ; la disposition téléphone est choisie page par page). */
export function footerSettings(lang: Lang, o: { logo?: string; coords: string; area: string; left?: string; brand?: string }): Record<string, unknown> {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  return {
    logo_asset: o.logo ?? "", wordmark: "", menu: "footer", menu_legal: "legal", coords_title: o.coords, coords_text: o.area, coords_link: "",
    bottom_left: o.left ?? "", brand: o.brand ?? "", rights: t("Tous droits réservés", "All rights reserved"), nav_label: t("Pied de page", "Footer"),
  };
}

const html = (s: string) => (s && !/^\s*</.test(s) ? `<p>${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>` : s);

/** Accueil d'un CLIENT (services) : SES textes et SA photo, ses prestations, sa méthode, questions et appel (rien de PHASE). */
function servicesHome(k: Kit): (Row | Row[])[] {
  const t = k.t;
  const lang = k.t("fr", "en") as Lang;
  return [
    k.lib("ph-hero", 1, { layout: "home", eyebrow: k.hero.eyebrow, heading: k.hero.heading, text: html(k.hero.text), image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.banner ?? "", button_label: k.hero.cta || t("Parlons de votre projet", "Let's talk about your project"), button_link: phUrl("demande-de-devis", lang), button2_label: t("Voir les prestations", "See our services"), button2_link: phUrl("prestations", lang), note: "", caption: "" }),
    k.R.servicesList(1, "cards", { withImages: true }),
    k.faqSec(1, 5, "lines"),
    k.lib("ph-cta", 1, { layout: "band", eyebrow: t("Votre projet", "Your project"), heading: t("Parlons de votre projet.", "Let's talk about your project."), button_label: t("Demander un devis", "Request a quote"), button_link: phUrl("demande-de-devis", lang), note: "" }),
  ];
}

/** Accueil « boutique » de repli (thème réservé aux services : composition de secours si un projet produit le choisit). */
function shopHome(k: Kit): (Row | Row[])[] {
  return [
    k.lib("ph-hero", 1, { layout: "home", eyebrow: k.hero.eyebrow, heading: k.hero.heading, text: html(k.hero.text), image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.packshot ?? "", button_label: k.hero.cta, button_link: "/collections/all", button2_label: "", note: "", caption: "" }),
    k.featured(1),
    k.faqSec(1, 4, "lines"),
    k.newsletter(1),
  ];
}

export type FinishCtx = { kit: Kit; lang: Lang; services: boolean; shopName: string; address: string; phone: string; email: string; hours: string; contactUrl: string; bookingLabel: string; bookingLink: string; legalUrl: string };

/** Pages d'un CLIENT : structure du thème et ses informations ; pages à compléter laissées en brouillon. */
function clientPages(ctx: FinishCtx): { pages: StorePage[]; templates: Record<string, TemplateJson> } {
  const { lang, kit: k } = ctx;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const todo = t("À renseigner", "To be completed");
  const page = (h: PhPageHandle, draft: boolean): StorePage => { const p = PH_PAGES.find((x) => x.handle === h)!; return { handle: phHandle(h, lang), title: t(p.fr, p.en), template_suffix: p.suffix, body_html: "", ...(draft ? { status: "draft" as const } : {}) }; };
  const look = (h: PhPageHandle) => pageRow(PH_PAGES.find((x) => x.handle === h)!.look);
  const photo = k.im.lifestyle ?? k.im.hero ?? "";
  const templates: Record<string, TemplateJson> = {
    "page.ph-contact": phTemplate([
      ["ph-contact", { eyebrow: t("Contact", "Contact"), heading: t("Parlons de\n[y]votre projet.[/y]", "Let's talk about\n[y]your project.[/y]"), text: "", note: "", image_asset: photo, phone: ctx.phone || todo, email: ctx.email || todo, area: ctx.address || todo, hours: ctx.hours || todo }],
      look("contact"),
    ]),
    "page.ph-devis": phTemplate([["ph-quote", { eyebrow: t("Demande de devis", "Quote request"), heading: t("Votre projet\n[y]commence ici.[/y]", "Your project\n[y]starts here.[/y]"), text: "", note: "", image_asset: photo }], look("demande-de-devis")]),
    "page.ph-confirmation": phTemplate([["ph-confirm", { image_asset: photo }], look("demande-envoyee")]),
    "page.ph-mentions": phTemplate([["ph-legal", { heading: t("Mentions [y]légales[/y]", "Legal [y]notice[/y]"), image_asset: photo }, ["editor", "status", "siret", "seat", "publisher", "host"].map((id) => ({ type: "row", settings: { row_id: id, value: todo } }))], look("mentions-legales")]),
    "page.ph-donnees": phTemplate([["ph-privacy", { image_asset: photo }], look("donnees-et-cookies")]),
  };
  const pages: StorePage[] = [page("contact", false), page("demande-de-devis", false), page("demande-envoyee", false), page("mentions-legales", true), page("donnees-et-cookies", true)];
  return { pages, templates };
}

/**
 * Finition commune (démonstration et clients) : en-tête et pied PHASE (ceux de base restent, désactivés), réglages de
 * page de l'accueil et page introuvable. Les pages propres au thème sont posées par la démonstration ; chez un client,
 * seules les pages utiles (contact, devis, confirmation, mentions, données) sont ajoutées, sans contenu de démonstration.
 */
export function finishPhase(spec: ThemeSpec, ctx: FinishCtx) {
  const lang = ctx.lang;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const quote = ctx.services ? phUrl("demande-de-devis", lang) : ctx.contactUrl;
  const header = spec.groups.header;
  for (const id of header.order) if (header.sections[id]?.type === "header" || header.sections[id]?.type === "announcement-bar") header.sections[id].disabled = true;
  if (!header.order.some((id) => header.sections[id]?.type === "ph-header")) {
    header.sections["ph-header"] = { type: "ph-header", settings: headerSettings(lang, { demo: false, ctaLink: quote, quotePage: quote, confirmPage: ctx.services ? phUrl("demande-envoyee", lang) : "", cookiesLink: ctx.services ? phUrl("donnees-et-cookies", lang) : "" }) };
    header.order.push("ph-header");
  }
  const footer = spec.groups.footer;
  for (const id of footer.order) if (footer.sections[id]?.type === "footer") footer.sections[id].disabled = true;
  if (!footer.order.some((id) => footer.sections[id]?.type === "ph-footer")) {
    footer.sections["ph-footer"] = { type: "ph-footer", settings: footerSettings(lang, { coords: ctx.phone || ctx.email ? [ctx.phone, ctx.email].filter(Boolean).join(" · ") : t("Coordonnées à renseigner", "Contact details to be completed"), area: ctx.address || t("Votre ville et sa région", "Your town and its area"), brand: ctx.shopName }) };
    footer.order.push("ph-footer");
  }
  const mark = (key: string, look: PhPageLook) => {
    const tpl = spec.templates[key];
    if (!tpl || tpl.order.some((id) => tpl.sections[id]?.type === "ph-page")) return;
    tpl.sections["ph-page"] = { type: "ph-page", settings: { ...look } };
    tpl.order.push("ph-page");
  };
  mark("index", LOOK_06);
  spec.templates["404"] = phTemplate([
    ["ph-hero", { layout: "notfound", eyebrow: t("Erreur 404", "Error 404"), heading: t("On a perdu le contact.", "We lost the connection."), text: html(t("Cette page n'est pas disponible.", "This page is not available.")), text2: html(t("Le lien que vous avez suivi est peut-être incorrect ou la page a été déplacée.", "The link you followed may be wrong or the page may have moved.")), note: "", crumb: t("404", "404"), button_label: t("Retour à l'accueil", "Back to home"), button_link: "/", button2_label: ctx.services ? t("Voir les prestations", "See our services") : "", button2_link: ctx.services ? phUrl("prestations", lang) : "", image_asset: ctx.kit.im.hero ?? ctx.kit.im.lifestyle ?? "" }],
    pageRow(LOOK_10),
  ]);
  if (!ctx.services) return;
  const { pages, templates } = clientPages(ctx);
  Object.assign(spec.templates, templates);
  const have = new Set(spec.store.pages.map((p) => p.handle));
  for (const p of pages) if (!have.has(p.handle)) spec.store.pages.push(p);
}

export const PHASE_THEME: CatalogTheme = {
  id: "phase",
  name: "Phase",
  tagline: "Électricien : bleu nuit, jaune électrique et traits de circuits",
  description: "Site d'artisan électricien de la famille Services : ouverture bleu nuit au titre sur deux couleurs, repères des prestations, cartes photo, méthode en étapes, réalisations illustratives filtrables, appel jaune « sous tension » ; pages prestations, installation, tableau, éclairage et dépannage, réalisations et projet, entreprise, questions par catégories, conseils et article, contact et demande de devis en deux étapes (photos jointes), confirmation, mentions, données et cookies, page introuvable. Bleu nuit, jaune électrique, gris clairs ; titres très gras, notes à chasse fixe et traits de circuits.",
  bestFor: ["électricien", "artisan du bâtiment", "installation électrique", "rénovation", "dépannage", "demande de devis"],
  en: { tagline: "Electrician: midnight blue, electric yellow and circuit lines", description: "Electrician website from the Services family: midnight-blue opening with a two-colour headline, service markers, photo cards, step-by-step method, filterable illustrative projects, yellow “switched on” call to action; services, installation, consumer unit, lighting and troubleshooting pages, projects and project page, company, questions by category, advice and article, contact and two-step quote request (attached photos), confirmation, legal notice, data and cookies, page not found. Midnight blue, electric yellow, light greys; extra-bold headings, monospaced notes and circuit lines.", bestFor: ["electrician", "building trades", "electrical installation", "renovation", "troubleshooting", "quote request"] },
  fonts: { heading: "inter_n7", body: "inter_n4" },
  previewFonts: { heading: "Inter", body: "Inter" },
  motion: "subtle",
  photoMood: "atelier",
  kinds: ["services"],
  look: { headerLayout: "logo-left", shape: "bar", icons: "plain", menu: "drawer", footer: "columns", ann: "static", card: "boxed", button: "solid", radius: { button: 0, card: 0 }, headingCase: "none", tracking: -1, headingScale: 100, glow: 0, shine: false, dark: false, gallery: "grid", pageWidth: 1440, spacing: 100, ds: "maison", density: "balanced", buttonUppercase: false },
  settings: { editorial_profile: "none", conversion_profile: "none", motion_intensity: "subtle", type_accent_font: "space_mono_n4" },
  headerSettings: { layout: "logo-left", show_search: false, mobile_menu: "drawer" },
  mainProduct: { gallery_layout: "grid", sticky_bar: false, color_scheme: "scheme-1" },
  palette: (k) => {
    const white = k.light("#FFFFFF");
    return [k.scheme(white, "#141B30", k.onLight(white)), k.scheme("#141B30", "#FFFFFF", k.onDark("#141B30"), 0.06), k.filled("#F2F55C"), k.scheme("#F4F6F9", "#141B30", k.onLight("#F4F6F9"))];
  },
  home: shopHome,
  services: servicesHome,
  product: (k) => [k.faqSec(1, 4, "lines")],
  finish: finishPhase as CatalogTheme["finish"],
};
