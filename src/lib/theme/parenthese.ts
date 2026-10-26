/**
 * PARENTHÈSE — thème cabinet de sophrologie de la famille Services (mission du 24 octobre 2026, PR documentaire #179).
 *
 * Identité éditoriale calme et lumineuse : ivoire chaud, sauge, vert forêt, abricot ; titres Playfair Display, textes
 * DM Sans (polices libres SIL OFL). Sections propres au thème : theme-base/sections/pa-*.liquid, feuille
 * theme-base/assets/parenthese.css, scripts parenthese.js et parenthese-core.js (calcul des rendez-vous partagé avec le
 * service réel du studio, src/lib/cabinet/booking.ts).
 *
 * Source unique des séances et des ateliers : les blocs de la section « Réglages du cabinet » (pa-cabinet, groupe
 * d'en-tête). Tarifs, durées, dates, lieux et places affichés ailleurs sont relus dans cette source par le site ; la
 * composition du studio les écrit aussi dans chaque section pour un affichage sans script.
 *
 * Appliqué à un vrai client (`finish`), le thème reprend SES contenus (nom, accroche, photos, coordonnées, prestations
 * avec leurs tarifs et durées s'il les a donnés) : aucun nom, tarif, atelier, article ni texte de la démonstration
 * n'est copié. Les pages qui attendent ses informations restent en brouillon.
 */
import type { CatalogTheme, Kit, Row } from "./theme-catalog";
import type { StorePage, TemplateJson, ThemeSpec, SectionInstance } from "./spec";
import type { Lang } from "../i18n";
import { pick } from "../i18n";

type Blocks = { type: string; settings: Record<string, unknown> }[];

/** Pages propres au thème (adresse française et anglaise, titre, gabarit). */
export const PA_PAGES = [
  { handle: "seances", handleEn: "individual-sessions", fr: "Les séances individuelles", en: "Individual sessions", suffix: "pa-seances" },
  { handle: "premiere-seance", handleEn: "first-session", fr: "Votre première séance", en: "Your first session", suffix: "pa-premiere" },
  { handle: "seance-en-visio", handleEn: "video-session", fr: "Séance en visioconférence", en: "Video session", suffix: "pa-visio" },
  { handle: "ateliers", handleEn: "workshops", fr: "Les ateliers collectifs", en: "Group workshops", suffix: "pa-ateliers" },
  { handle: "atelier-une-pause-dans-la-semaine", handleEn: "workshop-a-pause-in-the-week", fr: "Une pause dans la semaine", en: "A pause in the week", suffix: "pa-atelier-pause" },
  { handle: "atelier-decouvrir-la-relaxation", handleEn: "workshop-discovering-relaxation", fr: "Découvrir la relaxation", en: "Discovering relaxation", suffix: "pa-atelier-relaxation" },
  { handle: "atelier-un-moment-pour-ralentir", handleEn: "workshop-a-moment-to-slow-down", fr: "Un moment pour ralentir", en: "A moment to slow down", suffix: "pa-atelier-ralentir" },
  { handle: "entreprises", handleEn: "organisations", fr: "Ateliers pour les structures et entreprises", en: "Workshops for organisations", suffix: "pa-entreprises" },
  { handle: "prendre-rendez-vous", handleEn: "book-an-appointment", fr: "Prendre rendez-vous", en: "Book an appointment", suffix: "pa-rdv" },
  { handle: "mon-approche", handleEn: "my-approach", fr: "Mon approche", en: "My approach", suffix: "pa-approche" },
  { handle: "le-cabinet", handleEn: "the-practice", fr: "Le cabinet", en: "The practice", suffix: "pa-cabinet" },
  { handle: "conseils", handleEn: "journal", fr: "Le journal des petites pauses", en: "The journal of small pauses", suffix: "pa-journal" },
  { handle: "conseils-faire-une-place-a-la-pause", handleEn: "journal-making-room-for-a-pause", fr: "Faire une place à la pause dans sa journée", en: "Making room for a pause in your day", suffix: "pa-article-pause" },
  { handle: "conseils-des-rituels-douceur-pour-le-matin", handleEn: "journal-gentle-morning-rituals", fr: "Des rituels douceur pour le matin", en: "Gentle morning rituals", suffix: "pa-article-matin" },
  { handle: "conseils-se-reconnecter-a-ses-sensations", handleEn: "journal-reconnecting-with-your-senses", fr: "Se reconnecter à ses sensations", en: "Reconnecting with your senses", suffix: "pa-article-sensations" },
  { handle: "conseils-un-lieu-pense-pour-votre-bien-etre", handleEn: "journal-a-place-designed-for-you", fr: "Un lieu pensé pour votre bien-être", en: "A place designed for your well-being", suffix: "pa-article-lieu" },
  { handle: "conseils-cultiver-la-gratitude-au-quotidien", handleEn: "journal-everyday-gratitude", fr: "Cultiver la gratitude au quotidien", en: "Everyday gratitude", suffix: "pa-article-gratitude" },
  { handle: "conseils-creer-un-espace-calme-chez-soi", handleEn: "journal-a-calm-corner-at-home", fr: "Créer un espace calme chez soi", en: "A calm corner at home", suffix: "pa-article-espace" },
  { handle: "conseils-les-saisons-au-cabinet", handleEn: "journal-seasons-at-the-practice", fr: "Les saisons au cabinet", en: "Seasons at the practice", suffix: "pa-article-saisons" },
  { handle: "conseils-mieux-respirer-au-quotidien", handleEn: "journal-breathing-better-every-day", fr: "Mieux respirer au quotidien", en: "Breathing better every day", suffix: "pa-article-respirer" },
  { handle: "conseils-apprivoiser-ses-emotions", handleEn: "journal-gently-taming-emotions", fr: "Apprivoiser ses émotions avec douceur", en: "Gently taming your emotions", suffix: "pa-article-emotions" },
  { handle: "conseils-rituel-cinq-minutes-pour-soi", handleEn: "journal-five-minutes-for-yourself", fr: "Rituel bien-être : 5 minutes pour soi", en: "Well-being ritual: five minutes for yourself", suffix: "pa-article-rituel" },
  { handle: "contact", handleEn: "contact", fr: "Contact", en: "Contact", suffix: "pa-contact" },
  { handle: "faq", handleEn: "faq", fr: "Questions fréquentes", en: "Frequently asked questions", suffix: "pa-faq" },
  { handle: "retrouver-mon-rendez-vous", handleEn: "find-my-appointment", fr: "Retrouver mon rendez-vous", en: "Find my appointment", suffix: "pa-retrouver" },
  { handle: "mon-rendez-vous", handleEn: "my-appointment", fr: "Mon rendez-vous", en: "My appointment", suffix: "pa-gerer" },
  { handle: "mentions-legales", handleEn: "legal-notice", fr: "Mentions légales", en: "Legal notice", suffix: "pa-legal-mentions" },
  { handle: "confidentialite", handleEn: "privacy", fr: "Confidentialité", en: "Privacy", suffix: "pa-legal-confidentialite" },
  { handle: "conditions-de-reservation", handleEn: "booking-terms", fr: "Conditions de réservation", en: "Booking terms", suffix: "pa-legal-conditions" },
  { handle: "cookies", handleEn: "cookies", fr: "Cookies", en: "Cookies", suffix: "pa-legal-cookies" },
] as const;
export type PaPageHandle = (typeof PA_PAGES)[number]["handle"];
export const paHandle = (h: PaPageHandle, lang: Lang = "fr") => (lang === "en" ? PA_PAGES.find((p) => p.handle === h)!.handleEn : h);
export const paUrl = (h: PaPageHandle, lang: Lang = "fr") => `/pages/${paHandle(h, lang)}`;

/** Gabarit à partir de lignes [type, réglages, blocs, options] (identifiants lisibles, stables). */
export function paTemplate(rows: Row[]): TemplateJson {
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

/** « 60 € » → 60 ; sinon null (jamais un tarif deviné). */
export function paPrice(text?: string | null): number | null {
  const m = /(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur)/i.exec(text ?? "") ?? /^\s*(\d+(?:[.,]\d{1,2})?)\s*$/.exec(text ?? "");
  return m ? Number(m[1].replace(",", ".")) : null;
}
/** « 60 min », « 1 h 15 », « 1h30 » → minutes ; sinon null. */
export function paDuration(text?: string | null): number | null {
  const s = (text ?? "").toLowerCase();
  const hm = /(\d{1,2})\s*h(?:eures?)?\s*(\d{1,2})?/.exec(s);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2] ?? 0);
  const m = /(\d{1,3})\s*(?:min|mn)/.exec(s);
  return m ? Number(m[1]) : null;
}

export type SeanceDef = { id: string; name: string; short: string; duration: number | null; price: number | null; modes: string; page?: string; image?: string };
export type AtelierDef = { id: string; title: string; short: string; tags: string; theme: string; date: string; time: string; duration: number | null; price: number | null; capacity: number | null; booked: number; place: string; page?: string; image?: string };

/** Blocs « Séance » et « Atelier » de la section de réglages (source unique). Nombres absents laissés vides. */
export function cabinetBlocks(seances: SeanceDef[], ateliers: AtelierDef[]): Blocks {
  const n = (k: string, v: number | null) => (v != null ? { [k]: v } : {});
  return [
    ...seances.map((s) => ({ type: "seance", settings: { seance_id: s.id, name: s.name, short: s.short, ...n("duration", s.duration), ...n("price", s.price), modes: s.modes, page: s.page ?? "", image_asset: s.image ?? "" } })),
    ...ateliers.map((a) => ({ type: "atelier", settings: { atelier_id: a.id, title: a.title, short: a.short, tags: a.tags, theme: a.theme, date: a.date, time: a.time, ...n("duration", a.duration), ...n("price", a.price), ...n("capacity", a.capacity), ...n("booked_demo", a.booked), place: a.place, page: a.page ?? "", image_asset: a.image ?? "" } })),
  ];
}

/** Réglages du cabinet posés dans l'en-tête (mode démonstration ; horaires vides chez un client). */
export function cabinetSettings(lang: Lang, o: { address?: string; tagline?: string; bookingLabel: string; bookingLink: string; cookiesLink: string; demoNote?: string; hours?: Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", string>> }): Record<string, unknown> {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const h = o.hours ?? {};
  return {
    // Signature sous le nom : celle du cabinet seulement (jamais celle de la démonstration chez un client).
    logo_tagline: o.tagline ?? "", color_forest: "#2F4A3B", color_sage: "#DCDFCD", color_apricot: "#F2C9A9", color_ivory: "#F8F3EB",
    address: o.address ?? "", booking_label: o.bookingLabel, booking_link: o.bookingLink, show_bookbar: true,
    demo_note: o.demoNote ?? t("Tarifs et disponibilités de démonstration.", "Demonstration prices and availability."),
    booking_mode: "demo", service_url: "", site_url: "", notify_email: "",
    timezone: "Europe/Paris", hours_mon: h.mon ?? "", hours_tue: h.tue ?? "", hours_wed: h.wed ?? "", hours_thu: h.thu ?? "", hours_fri: h.fri ?? "", hours_sat: h.sat ?? "", hours_sun: h.sun ?? "",
    closures: "", slot_step: 60, horizon_days: 90, lead_minutes: 720, cancel_hours: 24, cancel_terms: "",
    page_book: paUrl("prendre-rendez-vous", lang), page_manage: paUrl("mon-rendez-vous", lang), page_lookup: paUrl("retrouver-mon-rendez-vous", lang), page_ateliers: paUrl("ateliers", lang), page_contact: paUrl("contact", lang), page_terms: paUrl("conditions-de-reservation", lang),
    show_cookies: true, cookies_link: o.cookiesLink,
  };
}

/** Pied de page de la planche 02 (coordonnées du projet, « [À renseigner] » sinon ; aucun réseau social inventé). */
export function footerSettings(lang: Lang, o: { address: string; email: string; phone: string; note: string; tagline?: string }): Record<string, unknown> {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  return {
    style: "light", tagline: o.tagline ?? "", menu: "footer", address: o.address, email: o.email, phone: o.phone, note: o.note,
    instagram: "", linkedin: "", facebook: "",
    link1_label: t("Mentions légales", "Legal notice"), link1: paUrl("mentions-legales", lang), link2_label: t("Politique de confidentialité", "Privacy policy"), link2: paUrl("confidentialite", lang),
    link3_label: t("Conditions de réservation", "Booking terms"), link3: paUrl("conditions-de-reservation", lang), link4_label: "Cookies", link4: paUrl("cookies", lang),
  };
}

/** Accueil d'un CLIENT (services) : ouverture plein cadre avec SES textes et SA photo, prestations, questions, contact. */
function servicesHome(k: Kit): (Row | Row[])[] {
  const t = k.t;
  const lang = k.t("fr", "en") as Lang;
  return [
    k.lib("pa-hero", 1, { layout: "home", heading: k.hero.heading, text: html(k.hero.text), image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.banner ?? "", button_label: k.hero.cta || t("Prendre rendez-vous", "Book an appointment"), button_link: paUrl("prendre-rendez-vous", lang), button2_label: "", side_words: "", height: 520, height_mobile: 440, curve: true }),
    k.R.servicesList(1, "cards", { withImages: true }),
    k.R.practical(2),
    k.faqSec(1, 5, "lines"),
    k.lib("pa-cta", 1, { layout: "sage", heading: t("Et si vous vous offriez un temps pour vous ?", "What if you gave yourself some time?"), text: "", button_label: t("Prendre rendez-vous", "Book an appointment"), button_link: paUrl("prendre-rendez-vous", lang), button_style: "white" }),
    k.R.contactForm(1, t("Une question ?", "A question?")),
  ];
}

/** Accueil « boutique » de repli (thème réservé aux services : composition de secours si un projet produit le choisit). */
function shopHome(k: Kit): (Row | Row[])[] {
  return [
    k.lib("pa-hero", 1, { layout: "home", heading: k.hero.heading, text: html(k.hero.text), image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.packshot ?? "", button_label: k.hero.cta, button_link: "", button2_label: "", side_words: "", height: 520, height_mobile: 440 }),
    k.featured(1),
    k.iwt(1, "image-left", k.im.scene1 ?? k.im.detail1, "up"),
    k.faqSec(1, 4, "lines"),
    k.lib("pa-cta", 1, { layout: "sage", heading: k.hero.heading, text: "", button_label: k.hero.cta, button_link: "", button_style: "white" }),
    k.newsletter(1),
  ];
}

export type FinishCtx = { kit: Kit; lang: Lang; services: boolean; shopName: string; address: string; phone: string; email: string; hours: string; contactUrl: string; bookingLabel: string; bookingLink: string; legalUrl: string; offers?: { key?: string; name: string; description: string; price?: string; duration?: string }[] };

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

/**
 * Séances d'un CLIENT : ses noms, descriptions, tarifs et durées s'il les a donnés ; rien d'inventé. Modalité « au
 * cabinet » seulement : la visioconférence s'ajoute dans les réglages quand le client la propose vraiment.
 */
export function clientSeances(offers: FinishCtx["offers"]): SeanceDef[] {
  const seen = new Set<string>();
  return (offers ?? []).filter((o) => o.name.trim()).slice(0, 12).map((o) => {
    let id = slug(o.key || o.name) || "seance";
    while (seen.has(id)) id += "-2";
    seen.add(id);
    return { id, name: o.name.trim(), short: o.description.trim().slice(0, 140), duration: paDuration(o.duration), price: paPrice(o.price), modes: "cabinet" };
  });
}

/**
 * Pages d'un CLIENT (jamais les contenus de la démonstration) : structure du thème, textes neutres et informations du
 * client. Sans contenu à montrer ou sans service réel activé, la page reste en brouillon.
 */
function clientPages(ctx: FinishCtx, seances: SeanceDef[]): { pages: StorePage[]; templates: Record<string, TemplateJson> } {
  const { lang, kit: k } = ctx;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const todo = t("[À renseigner]", "[To complete]");
  const im = k.im;
  const page = (h: PaPageHandle, draft: boolean): StorePage => { const p = PA_PAGES.find((x) => x.handle === h)!; return { handle: paHandle(h, lang), title: t(p.fr, p.en), template_suffix: p.suffix, body_html: "", ...(draft ? { status: "draft" as const } : {}) }; };
  const BOOK = paUrl("prendre-rendez-vous", lang);
  const hero = (heading: string, image: string | undefined, extra: Record<string, unknown> = {}): Row => ["pa-hero", { layout: "page", heading, text: "", image_asset: image ?? "", fade: 58, height: 420, height_mobile: 300, ...extra }];
  const legal = (current: number, heading: string): Row[] => [
    hero(t("Transparence et confiance", "Transparency and trust"), im.hero ?? im.lifestyle, { eyebrow: t("Informations légales", "Legal information"), heading_level: "h1" }),
    ["pa-legal", { current, heading, notice_title: t("Contenu à compléter avant publication.", "Content to complete before publishing."), body: html(todo), tab1_link: paUrl("mentions-legales", lang), tab2_link: paUrl("confidentialite", lang), tab3_link: paUrl("conditions-de-reservation", lang), tab4_link: paUrl("cookies", lang), tab1_label: t("Mentions légales", "Legal notice"), tab2_label: t("Confidentialité", "Privacy"), tab3_label: t("Conditions de réservation", "Booking terms"), tab4_label: "Cookies" }],
  ];
  const templates: Record<string, TemplateJson> = {
    "page.pa-seances": paTemplate([
      hero(t("Les séances\nindividuelles", "Individual\nsessions"), im.lifestyle ?? im.hero, { button_label: ctx.bookingLabel, button_link: BOOK }),
      ["pa-cards", { layout: "pricing", heading: t("Les séances", "Sessions"), text: "" }, seances.map((s) => ({ type: "card", settings: { title: s.name, text: s.short, seance_id: s.id, price: "", price_note: "", duration: "", button_label: t("Prendre rendez-vous", "Book an appointment"), button_link: BOOK, book_kind: `seance:${s.id}` } }))],
    ]),
    "page.pa-rdv": paTemplate([["pa-booking", { image_step1_asset: im.lifestyle ?? im.hero ?? "", image_step2_asset: im.scene1 ?? im.hero ?? "", image_done_asset: im.scene2 ?? im.lifestyle ?? "", image_done_visio_asset: "", image_done_side_asset: im.scene3 ?? im.hero ?? "" }, seances.map((s) => ({ type: "choice", settings: { kind: "seance", seance_id: s.id, title: s.name, text: s.short, image_asset: "", duration: "", price: "" } }))]]),
    "page.pa-contact": paTemplate([["pa-contact", { eyebrow: t("Contact", "Contact"), heading: t("Échangeons sur\nvotre demande", "Let's talk about\nyour request"), text: "", image_asset: im.lifestyle ?? im.hero ?? "", address: ctx.address, hours: ctx.hours, phone: ctx.phone, todo_label: todo, hours_todo: t("[À confirmer]", "[To confirm]") }]]),
    "page.pa-retrouver": paTemplate([["pa-lookup", { heading: t("Retrouver mon\nrendez-vous", "Find my\nappointment"), image_asset: im.scene1 ?? im.lifestyle ?? "" }]]),
    "page.pa-gerer": paTemplate([["pa-manage", { image_asset: im.scene2 ?? im.lifestyle ?? "" }]]),
    "page.pa-legal-mentions": paTemplate(legal(1, t("Mentions légales", "Legal notice"))),
    "page.pa-legal-confidentialite": paTemplate(legal(2, t("Confidentialité", "Privacy"))),
    "page.pa-legal-conditions": paTemplate(legal(3, t("Conditions de réservation", "Booking terms"))),
    "page.pa-legal-cookies": paTemplate(legal(4, "Cookies")),
  };
  const complete = seances.length > 0 && seances.every((s) => s.price != null && s.duration != null);
  const pages: StorePage[] = [
    page("seances", !complete),
    // Prise de rendez-vous en ligne : brouillon tant que le cabinet n'a pas réglé ses horaires et activé le service réel.
    page("prendre-rendez-vous", true), page("retrouver-mon-rendez-vous", true), page("mon-rendez-vous", true),
    page("mentions-legales", true), page("confidentialite", true), page("conditions-de-reservation", true), page("cookies", true),
  ];
  return { pages, templates };
}

/** Finition commune (démonstration et clients) : en-tête, réglages du cabinet, pied de la planche 02, page introuvable, pages. */
export function finishParenthese(spec: ThemeSpec, ctx: FinishCtx) {
  const lang = ctx.lang;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const header = spec.groups.header;
  const headerId = header.order.find((id) => header.sections[id]?.type === "header");
  if (headerId) Object.assign(header.sections[headerId].settings, { layout: "logo-left", show_search: false, show_cart: false, sticky: true, transparent_on_home: false, mobile_menu: "drawer", cta_label: ctx.bookingLabel, cta_link: ctx.bookingLink, cta_icon: "arrow", phone: "" });
  const seances = ctx.services ? clientSeances(ctx.offers) : [];
  if (!header.order.some((id) => header.sections[id]?.type === "pa-cabinet")) {
    const blocks = cabinetBlocks(seances, []);
    header.sections["pa-cabinet"] = { type: "pa-cabinet", settings: cabinetSettings(lang, { address: ctx.address, bookingLabel: ctx.bookingLabel, bookingLink: ctx.bookingLink, cookiesLink: ctx.services ? paUrl("cookies", lang) : "" }), blocks: Object.fromEntries(blocks.map((b, i) => [`${b.type}-${i + 1}`, b])), block_order: blocks.map((b, i) => `${b.type}-${i + 1}`) };
    header.order.unshift("pa-cabinet");
  }
  const footer = spec.groups.footer;
  // Le pied de la planche 02 remplace le pied commun (gardé, désactivé : rien n'est supprimé du projet).
  for (const id of footer.order) if (footer.sections[id]?.type === "footer") footer.sections[id].disabled = true;
  if (!footer.order.some((id) => footer.sections[id]?.type === "pa-footer")) {
    footer.sections["pa-footer"] = { type: "pa-footer", settings: footerSettings(lang, { address: ctx.address, email: ctx.email, phone: ctx.phone, note: t("Tous droits réservés.", "All rights reserved.") }) };
    footer.order.push("pa-footer");
  }
  spec.templates["404"] = paTemplate([["pa-hero", { layout: "center", eyebrow: "404", heading: t("Accordons-nous\nune petite pause", "Let's take\na little pause"), text: html(t("Cette page n'est pas disponible, mais votre moment de bien-être vous attend toujours ailleurs sur le site.", "This page is not available, but your moment of well-being is still waiting elsewhere on the site.")), image_asset: ctx.kit.im.hero ?? ctx.kit.im.lifestyle ?? "", button_label: t("Retour à l'accueil", "Back to home"), button_link: "/", button2_label: ctx.services ? t("Prendre rendez-vous", "Book an appointment") : "", button2_link: ctx.bookingLink, button2_style: "line", height: 640, height_mobile: 520 }]]);
  if (!ctx.services) return;
  const { pages, templates } = clientPages(ctx, seances);
  Object.assign(spec.templates, templates);
  const have = new Set(spec.store.pages.map((p) => p.handle));
  // Pages du client (contact, FAQ, mentions…) conservées : seules les pages manquantes du cabinet sont ajoutées.
  for (const p of pages) if (!have.has(p.handle)) spec.store.pages.push(p);
}

export const PARENTHESE_THEME: CatalogTheme = {
  id: "parenthese",
  name: "Parenthèse",
  tagline: "Cabinet de sophrologie, calme et lumineux",
  description: "Site de cabinet de bien-être de la famille Services : grande ouverture photographique, besoins, présentation de la pratique, séance individuelle et atelier, cabinet, premier rendez-vous, approche, conseils, questions ; séances au cabinet ou en visioconférence, ateliers collectifs à places limitées, entreprises, journal ; réservation en quatre étapes, retrouver, modifier et annuler un rendez-vous. Ivoire chaud, sauge, vert forêt et abricot, titres Playfair Display.",
  bestFor: ["sophrologue", "cabinet de bien-être", "relaxation", "ateliers collectifs", "accompagnement individuel", "prise de rendez-vous"],
  en: { tagline: "Sophrology practice, calm and bright", description: "Well-being practice website from the Services family: large photographic opening, needs, presentation of the practice, individual session and workshop, the practice, first appointment, approach, tips, questions; sessions at the practice or by video call, group workshops with limited places, organisations, journal; four-step booking, find, change and cancel an appointment. Warm ivory, sage, forest green and apricot, Playfair Display headings.", bestFor: ["sophrologist", "well-being practice", "relaxation", "group workshops", "individual support", "appointment booking"] },
  fonts: { heading: "playfair_display_n4", body: "dm_sans_n4" },
  previewFonts: { heading: "Playfair Display", body: "DM Sans" },
  motion: "subtle",
  photoMood: "atelier",
  kinds: ["services"],
  look: { headerLayout: "logo-left", shape: "bar", icons: "plain", menu: "drawer", footer: "columns", ann: "static", card: "overlay", button: "solid", radius: { button: 999, card: 10 }, headingCase: "none", tracking: 0, headingScale: 100, glow: 0, shine: false, dark: false, gallery: "stack", pageWidth: 1320, spacing: 100, ds: "maison", density: "balanced", buttonUppercase: false },
  settings: { editorial_profile: "none", conversion_profile: "none", motion_intensity: "subtle" },
  headerSettings: { layout: "logo-left", show_search: false, mobile_menu: "drawer" },
  mainProduct: { gallery_layout: "stack", sticky_bar: false, color_scheme: "scheme-1" },
  palette: (k) => {
    const ivory = k.light("#F8F3EB");
    const forest = "#2F4A3B";
    const sage = "#DCDFCD";
    return [k.scheme(ivory, "#26261F", k.onLight(ivory)), k.scheme(sage, "#26261F", k.onLight(sage), 0.06), k.scheme(forest, "#F8F3EB", k.onDark(forest), 0.06), k.filled(k.p.accent)];
  },
  home: shopHome,
  services: servicesHome,
  product: (k) => [k.faqSec(1, 4, "lines")],
  finish: finishParenthese,
};
