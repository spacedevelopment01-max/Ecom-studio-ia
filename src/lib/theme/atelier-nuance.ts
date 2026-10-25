/**
 * ATELIER NUANCE — thème salon de coiffure de la famille Services (issue #177, consigne de Thomas du 23 octobre 2026).
 *
 * Salon premium chaleureux : ivoire, beige pierre et travertin, brun chocolat pour les aplats et le pied, pêche et
 * terracotta pour les boutons ; grande serif élégante (Cormorant) et serif de lecture (Lora). Sections propres au thème :
 * theme-base/sections/an-*.liquid, feuille theme-base/assets/atelier-nuance.css, scripts atelier-nuance.js et
 * atelier-nuance-core.js (calcul des rendez-vous partagé avec le service réel du studio, src/lib/salon/booking.ts).
 *
 * Source unique des prestations et de l'équipe : les blocs de la section « Réglages du salon » (an-salon, groupe
 * d'en-tête). Les prix et durées affichés ailleurs (accueil, prestations, fiches, réservation) sont relus dans cette
 * source par le site ; la composition du studio les écrit aussi dans chaque section pour un affichage sans script.
 *
 * Appliqué à un autre salon (`finish`), le thème reprend les contenus du client (nom, accroche, photos, coordonnées,
 * prestations avec leurs prix et durées s'il les a donnés) : aucun prix, photo, nom d'équipe ni texte de la
 * démonstration ATELIER NUANCE n'est copié. Les pages qui attendent ses informations restent en brouillon.
 */
import type { CatalogTheme, Kit, Row } from "./theme-catalog";
import type { StorePage, TemplateJson, ThemeSpec, SectionInstance } from "./spec";
import type { Lang } from "../i18n";
import { pick } from "../i18n";

type Blocks = { type: string; settings: Record<string, unknown> }[];

/** Prestations de la démonstration (planche 05, prioritaire) : identifiant = adresse de la fiche. */
export const AN_SERVICE_IDS = ["coupe-brushing", "brushing", "coloration-coiffage", "balayage-coiffage", "soin-coiffage"] as const;

/** Pages propres au thème (adresse française et anglaise, titre, gabarit). */
export const AN_PAGES = [
  { handle: "le-salon", handleEn: "the-salon", fr: "Le salon", en: "The salon", suffix: "an-salon" },
  { handle: "prestations", handleEn: "services", fr: "Prestations & tarifs", en: "Services & prices", suffix: "an-prestations" },
  { handle: "coupe-brushing", handleEn: "haircut-blow-dry", fr: "Coupe & brushing", en: "Haircut & blow-dry", suffix: "an-fiche-coupe-brushing" },
  { handle: "brushing", handleEn: "blow-dry", fr: "Brushing", en: "Blow-dry", suffix: "an-fiche-brushing" },
  { handle: "coloration-coiffage", handleEn: "colour-styling", fr: "Coloration & coiffage", en: "Colour & styling", suffix: "an-fiche-coloration-coiffage" },
  { handle: "balayage-coiffage", handleEn: "balayage-styling", fr: "Balayage & coiffage", en: "Balayage & styling", suffix: "an-fiche-balayage-coiffage" },
  { handle: "soin-coiffage", handleEn: "treatment-styling", fr: "Soin & coiffage", en: "Treatment & styling", suffix: "an-fiche-soin-coiffage" },
  { handle: "prendre-rendez-vous", handleEn: "book-an-appointment", fr: "Prendre rendez-vous", en: "Book an appointment", suffix: "an-rdv" },
  { handle: "inspirations", handleEn: "inspirations", fr: "Inspirations", en: "Inspirations", suffix: "an-inspirations" },
  { handle: "journal", handleEn: "journal", fr: "Le journal", en: "The journal", suffix: "an-journal" },
  { handle: "journal-preparer-votre-visite", handleEn: "journal-preparing-your-visit", fr: "Préparer votre prochaine visite", en: "Preparing your next visit", suffix: "an-article-visite" },
  { handle: "journal-outils-du-quotidien", handleEn: "journal-everyday-tools", fr: "Les outils du quotidien", en: "Everyday tools", suffix: "an-article-outils" },
  { handle: "journal-nuances-de-la-saison", handleEn: "journal-shades-of-the-season", fr: "Les nuances de la saison", en: "Shades of the season", suffix: "an-article-nuances" },
  { handle: "journal-rituel-soin-en-salon", handleEn: "journal-in-salon-care-ritual", fr: "Le rituel soin en salon", en: "The in-salon care ritual", suffix: "an-article-rituel" },
  { handle: "journal-art-des-details", handleEn: "journal-the-art-of-details", fr: "L'art des détails", en: "The art of details", suffix: "an-article-details" },
  { handle: "contact", handleEn: "contact", fr: "Contact", en: "Contact", suffix: "an-contact" },
  { handle: "faq", handleEn: "faq", fr: "Questions fréquentes", en: "Frequently asked questions", suffix: "an-faq" },
  { handle: "retrouver-mon-rendez-vous", handleEn: "find-my-appointment", fr: "Retrouver mon rendez-vous", en: "Find my appointment", suffix: "an-retrouver" },
  { handle: "mon-espace", handleEn: "my-account", fr: "Mon espace", en: "My account", suffix: "an-espace" },
  { handle: "deplacer-mon-rendez-vous", handleEn: "move-my-appointment", fr: "Déplacer mon rendez-vous", en: "Move my appointment", suffix: "an-deplacer" },
  { handle: "informations-legales", handleEn: "legal-information", fr: "Informations légales", en: "Legal information", suffix: "an-legal-mentions" },
  { handle: "confidentialite", handleEn: "privacy", fr: "Confidentialité", en: "Privacy", suffix: "an-legal-confidentialite" },
  { handle: "conditions-de-reservation", handleEn: "booking-terms", fr: "Conditions de réservation", en: "Booking terms", suffix: "an-legal-conditions" },
  { handle: "cookies", handleEn: "cookies", fr: "Cookies", en: "Cookies", suffix: "an-legal-cookies" },
] as const;
export type AnPageHandle = (typeof AN_PAGES)[number]["handle"];
/** Adresse d'une page du thème dans la langue du site (adresses anglaises pour un site en anglais). */
export const anHandle = (h: AnPageHandle, lang: Lang = "fr") => (lang === "en" ? AN_PAGES.find((p) => p.handle === h)!.handleEn : h);
export const anUrl = (h: AnPageHandle, lang: Lang = "fr") => `/pages/${anHandle(h, lang)}`;

/** Gabarit à partir de lignes [type, réglages, blocs, options] (identifiants lisibles, stables). */
export function anTemplate(rows: Row[]): TemplateJson {
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

/** « 45 € », « à partir de 120 € » → { price, from } ; sinon null (jamais un prix deviné). */
export function parsePrice(text?: string | null): { price: number; from: boolean } | null {
  const m = /(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur)/i.exec(text ?? "") ?? /^\s*(\d+(?:[.,]\d{1,2})?)\s*$/.exec(text ?? "");
  if (!m) return null;
  return { price: Number(m[1].replace(",", ".")), from: /partir|from|dès/i.test(text ?? "") };
}
/** « 45 min », « 1 h 45 », « 1h30 », « 2 h » → minutes ; sinon null. */
export function parseDuration(text?: string | null): number | null {
  const s = (text ?? "").toLowerCase();
  const hm = /(\d{1,2})\s*h(?:eures?)?\s*(\d{1,2})?/.exec(s);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2] ?? 0);
  const m = /(\d{1,3})\s*(?:min|mn)/.exec(s);
  return m ? Number(m[1]) : null;
}

type ServiceDef = { id: string; name: string; category: string; short: string; duration: number | null; price: number | null; from: boolean; page?: string };
type StaffDef = { id: string; name: string; initial: string; title: string; skills: string; days: string };

/** Blocs « Prestation » et « Membre de l'équipe » de la section de réglages (source unique). */
export function salonBlocks(services: ServiceDef[], staff: StaffDef[]): Blocks {
  return [
    // Nombres absents laissés vides (jamais une durée ou un prix par défaut) : l'éditeur Shopify n'accepte pas "" pour un nombre.
    ...services.map((s) => ({ type: "service", settings: { service_id: s.id, name: s.name, category: s.category, short: s.short, ...(s.duration != null ? { duration: s.duration } : {}), ...(s.price != null ? { price: s.price } : {}), price_from: s.from, page: s.page ?? "" } })),
    ...staff.map((p) => ({ type: "member", settings: { member_id: p.id, name: p.name, initial: p.initial, title: p.title, skills: p.skills, days: p.days, hours: "" } })),
  ];
}

/** Réglages du salon posés dans l'en-tête (mode démonstration ; horaires et équipe vides chez un client). */
export function salonSettings(lang: Lang, o: { address?: string; bookingLabel: string; bookingLink: string; bookbar: boolean; cookiesLink: string; hours?: Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", string>> }): Record<string, unknown> {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const h = o.hours ?? {};
  return {
    color_choco: "#2E211C", color_peach: "#F2C3A7", color_terra: "#A45B40", color_ivory: "#F8F3ED", address: o.address ?? "",
    booking_label: o.bookingLabel, booking_link: o.bookingLink, show_bookbar: o.bookbar, demo_note: t("Tarifs et disponibilités de démonstration.", "Demonstration prices and availability."),
    booking_mode: "demo", service_url: "", site_url: "", notify_email: "",
    timezone: "Europe/Paris", hours_mon: h.mon ?? "", hours_tue: h.tue ?? "", hours_wed: h.wed ?? "", hours_thu: h.thu ?? "", hours_fri: h.fri ?? "", hours_sat: h.sat ?? "", hours_sun: h.sun ?? "",
    closures: "", slot_step: 30, horizon_days: 90, lead_minutes: 120, cancel_hours: 0, cancel_terms: "",
    page_book: anUrl("prendre-rendez-vous", lang), page_account: anUrl("mon-espace", lang), page_move: anUrl("deplacer-mon-rendez-vous", lang), page_lookup: anUrl("retrouver-mon-rendez-vous", lang), page_services: anUrl("prestations", lang), page_contact: anUrl("contact", lang), page_terms: anUrl("conditions-de-reservation", lang),
    show_cookies: true, cookies_link: o.cookiesLink,
  };
}

/** Accueil d'un site de salon (services) composé avec les contenus du client. */
function servicesHome(k: Kit): (Row | Row[])[] {
  const t = k.t;
  const lang = k.t("fr", "en") as Lang;
  const photos = [k.im.scene1, k.im.scene2, k.im.scene3, k.im.detail1, k.im.detail2, k.im.lifestyle2].filter((f): f is string => !!f);
  return [
    k.lib("an-hero", 1, { layout: "home", eyebrow: "", heading: k.hero.heading, text: html(k.hero.text), image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.banner ?? "", button_label: k.hero.cta || t("Prendre rendez-vous", "Book an appointment"), button_link: anUrl("prendre-rendez-vous", lang), button2_label: t("Voir les prestations", "See our services"), button2_link: anUrl("prestations", lang), height: 470, height_mobile: 420 }),
    k.R.servicesList(1, "cards", { withImages: true }),
    k.lib("an-details", 1, { eyebrow: "", heading: t("Le salon en images", "The salon in pictures") }, { hide: photos.length < 3, blocks: photos.slice(0, 5).map((f) => ({ type: "photo", settings: { image_asset: f, image_position: "50% 50%", alt: "" } })) }),
    k.R.practical(2),
    k.faqSec(1, 5, "lines"),
    k.lib("an-cta", 1, { heading: t("Prête pour un moment rien qu'à vous ?", "Ready for a moment just for you?"), text: "", button_label: t("Prendre rendez-vous", "Book an appointment"), button_link: anUrl("prendre-rendez-vous", lang) }),
    k.R.contactForm(1, t("Une question, une envie particulière ?", "A question, a particular wish?")),
  ];
}

/** Accueil « boutique » de repli (thème réservé aux services : composition de secours si un projet produit le choisit). */
function shopHome(k: Kit): (Row | Row[])[] {
  return [
    k.lib("an-hero", 1, { layout: "home", eyebrow: "", heading: k.hero.heading, text: html(k.hero.text), image_asset: k.im.lifestyle ?? k.im.hero ?? k.im.packshot ?? "", button_label: k.hero.cta, button_link: "", button2_label: "", height: 470, height_mobile: 420 }),
    k.feat(1, "plain", 3),
    k.story(2),
    k.faqSec(1, 4, "lines"),
    k.lib("an-cta", 1, { heading: k.hero.heading, text: "", button_label: k.hero.cta, button_link: "" }),
    k.newsletter(1),
  ];
}

export type FinishCtx = { kit: Kit; lang: Lang; services: boolean; shopName: string; address: string; phone: string; email: string; hours: string; contactUrl: string; bookingLabel: string; bookingLink: string; legalUrl: string; offers?: { key?: string; name: string; description: string; price?: string; duration?: string }[] };

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
const CATEGORY_RE: [RegExp, string][] = [[/couleur|colou?r|balayage|m[eè]ches|blond|reflet|highlight/i, "couleur"], [/soin|treatment|rituel|masque|care/i, "soin"], [/brushing|blow|coiffage|chignon|styl|mise en (forme|plis)/i, "coiffage"]];
const categoryOf = (name: string) => CATEGORY_RE.find(([re]) => re.test(name))?.[1] ?? "coupe";

/** Prestations d'un CLIENT : ses noms, descriptions, prix et durées s'il les a donnés ; rien d'inventé. */
export function clientServices(offers: FinishCtx["offers"]): ServiceDef[] {
  const seen = new Set<string>();
  return (offers ?? []).filter((o) => o.name.trim()).slice(0, 24).map((o) => {
    let id = slug(o.key || o.name) || "prestation";
    while (seen.has(id)) id += "-2";
    seen.add(id);
    const p = parsePrice(o.price);
    return { id, name: o.name.trim(), category: categoryOf(o.name), short: o.description.trim().slice(0, 140), duration: parseDuration(o.duration), price: p?.price ?? null, from: p?.from ?? false };
  });
}

/**
 * Pages du salon pour un CLIENT (jamais les contenus de la démonstration) : structure du thème, textes neutres et
 * informations du client. Sans contenu à montrer ou sans service réel activé, la page reste en brouillon.
 */
function clientPages(ctx: FinishCtx, services: ServiceDef[]): { pages: StorePage[]; templates: Record<string, TemplateJson> } {
  const { lang, kit: k } = ctx;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const todo = t("[À renseigner]", "[To complete]");
  const im = k.im;
  const photos = [im.scene1, im.scene2, im.scene3, im.detail1, im.detail2, im.lifestyle, im.lifestyle2, im.hero].filter((f): f is string => !!f);
  const page = (h: AnPageHandle, draft: boolean): StorePage => { const p = AN_PAGES.find((x) => x.handle === h)!; return { handle: anHandle(h, lang), title: t(p.fr, p.en), template_suffix: p.suffix, body_html: "", ...(draft ? { status: "draft" as const } : {}) }; };
  const BOOK = anUrl("prendre-rendez-vous", lang);
  const complete = services.length > 0 && services.every((s) => s.price != null && s.duration != null);
  const legal = (current: number, heading: string): Row => ["an-legal", { heading, current, notice_title: t("Contenu à compléter avant publication", "Content to complete before publishing"), notice_text: t("<p>Les mentions légales, la politique de confidentialité, les conditions de réservation et la politique relative aux cookies sont à renseigner avant la mise en ligne du site.</p>", "<p>The legal notice, privacy policy, booking terms and cookie policy must be completed before the website goes live.</p>"), image_asset: im.hero ?? im.lifestyle ?? "", tab1_label: t("Mentions légales", "Legal notice"), tab1_link: anUrl("informations-legales", lang), tab2_label: t("Confidentialité", "Privacy"), tab2_link: anUrl("confidentialite", lang), tab3_label: t("Conditions de réservation", "Booking terms"), tab3_link: anUrl("conditions-de-reservation", lang), tab4_label: "Cookies", tab4_link: anUrl("cookies", lang), body: html(todo) }];
  const templates: Record<string, TemplateJson> = {
    "page.an-salon": anTemplate([
      ["an-hero", { layout: "page", eyebrow: ctx.shopName, heading: t("Bienvenue", "Welcome"), text: "", image_asset: im.lifestyle ?? im.hero ?? "", button_label: ctx.bookingLabel, button_link: BOOK, height: 400, height_mobile: 340 }],
      ["an-intro", { heading: "", text: "" }, photos.slice(0, 3).map((f) => ({ type: "card", settings: { image_asset: f, heading: "", text: "" } })), { disabled: true }],
      ["an-team", { style: "dark", eyebrow: "", heading: t("Notre équipe", "Our team"), text: "" }, [], { disabled: true }],
    ]),
    "page.an-prestations": anTemplate([
      ["an-hero", { layout: "page", heading: t("Prestations\n& tarifs", "Services\n& prices"), text: "", image_asset: im.hero ?? im.lifestyle ?? "", height: 380, height_mobile: 300 }],
      ["an-services", { show_filters: true, button_label: t("Réserver", "Book"), book_link: BOOK, note: "" }, services.map((s) => ({ type: "service", settings: { service_id: s.id, category: s.category, name: s.name, text: s.short, image_asset: "", price: "", duration: "", link: "" } }))],
    ]),
    "page.an-rdv": anTemplate([["an-booking", { image_step1: im.lifestyle ?? im.hero ?? "", image_summary: im.scene1 ?? im.hero ?? "", image_confirm: im.scene2 ?? im.lifestyle ?? "", image_address: im.hero ?? "", image_conflict: im.scene3 ?? im.hero ?? "" }]]),
    "page.an-inspirations": anTemplate([
      ["an-hero", { layout: "page", heading: t("Inspirations", "Inspirations"), text: "", image_asset: im.detail1 ?? im.hero ?? "", height: 360, height_mobile: 280 }],
      ["an-inspirations", { show_filters: true }, [], { disabled: true }],
    ]),
    "page.an-journal": anTemplate([
      ["an-hero", { layout: "page", eyebrow: t("Le journal", "The journal"), heading: "", text: "", image_asset: im.detail2 ?? im.hero ?? "", height: 360, height_mobile: 280 }],
      ["an-journal", {}, [], { disabled: true }],
    ]),
    "page.an-contact": anTemplate([
      ["an-hero", { layout: "page", eyebrow: t("Contact", "Contact"), heading: t("Venez nous\nrencontrer", "Come and\nmeet us"), text: "", image_asset: im.lifestyle ?? im.hero ?? "", button_label: ctx.bookingLabel, button_link: BOOK, height: 380, height_mobile: 320 }],
      ["an-contact", { address: ctx.address, phone: ctx.phone, email: ctx.email, hours: ctx.hours, todo_label: todo, hours_todo: t("[À confirmer]", "[To confirm]") }],
      ["an-map", { heading: t("Nous trouver", "Find us"), text: "", address: ctx.address, latitude: "", longitude: "" }],
    ]),
    "page.an-faq": anTemplate([["an-hero", { layout: "page", heading: t("Questions\nfréquentes", "Frequently asked\nquestions"), text: "", image_asset: im.hero ?? im.lifestyle ?? "", height: 300, height_mobile: 260 }], ["an-faq", { layout: "page" }, [], { disabled: true }]]),
    "page.an-retrouver": anTemplate([["an-lookup", { heading: t("Retrouver\nmon rendez-vous", "Find\nmy appointment"), image_asset: im.scene1 ?? im.lifestyle ?? "" }]]),
    "page.an-espace": anTemplate([["an-account", { heading: t("Mes rendez-vous", "My appointments"), image_asset: im.scene2 ?? im.lifestyle ?? "" }]]),
    "page.an-deplacer": anTemplate([["an-move", { heading: t("Déplacer mon rendez-vous", "Move my appointment"), image_asset: im.scene3 ?? im.lifestyle ?? "" }]]),
    "page.an-legal-mentions": anTemplate([legal(1, t("Informations légales", "Legal information"))]),
    "page.an-legal-confidentialite": anTemplate([legal(2, t("Confidentialité", "Privacy"))]),
    "page.an-legal-conditions": anTemplate([legal(3, t("Conditions de réservation", "Booking terms"))]),
    "page.an-legal-cookies": anTemplate([legal(4, "Cookies")]),
  };
  const pages: StorePage[] = [
    page("le-salon", true), page("prestations", !complete),
    // Prise de rendez-vous en ligne : brouillon tant que le salon n'a pas réglé ses horaires, son équipe et activé le
    // service réel (jamais de faux rendez-vous publié).
    page("prendre-rendez-vous", true), page("retrouver-mon-rendez-vous", true), page("mon-espace", true), page("deplacer-mon-rendez-vous", true),
    page("inspirations", true), page("journal", true),
    page("informations-legales", true), page("confidentialite", true), page("conditions-de-reservation", true), page("cookies", true),
  ];
  return { pages, templates };
}

const money = (price: number, from: boolean, lang: Lang) => {
  const n = Math.round(price * 100) / 100;
  const v = n % 1 ? n.toFixed(2).replace(".", lang === "en" ? "." : ",") : String(n);
  const out = lang === "en" ? `€${v}` : `${v} €`;
  return from ? (lang === "en" ? `From ${out}` : `À partir de ${out}`) : out;
};
const minutes = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`);

/**
 * Accueil d'un CLIENT au rythme de la planche 04 : catégories (celles de ses prestations, ses photos), présentation du
 * salon et étapes posées masquées (textes à écrire par le salon), prestations phares avec ses prix et durées.
 */
function clientHome(spec: ThemeSpec, ctx: FinishCtx, services: ServiceDef[]) {
  const index = spec.templates.index;
  if (!index || index.order.some((id) => ["an-categories", "an-featured"].includes(index.sections[id]?.type ?? ""))) return;
  const { lang, kit: k } = ctx;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const PRESTA = anUrl("prestations", lang);
  const block = (type: string, settings: Record<string, unknown>) => ({ type, settings });
  const section = (type: string, settings: Record<string, unknown>, blocks: Blocks, disabled = false): SectionInstance => ({ type, settings, ...(blocks.length ? { blocks: Object.fromEntries(blocks.map((b, i) => [`${b.type}-${i + 1}`, b])), block_order: blocks.map((b, i) => `${b.type}-${i + 1}`) } : {}), ...(disabled ? { disabled: true } : {}) });
  const CATS: [string, string, string, string | undefined][] = [["coupe", t("Coupe & coiffage", "Cut & styling"), "coupe", k.im.scene1], ["couleur", t("Couleur & lumière", "Colour & light"), "couleur", k.im.scene2], ["soin", t("Soin & rituel", "Care & ritual"), "soin", k.im.scene3]];
  const present = new Set(services.map((s) => (s.category === "coiffage" ? "coupe" : s.category)));
  const cats = CATS.filter(([key, , , img]) => present.has(key) && img);
  const priced = services.filter((s) => s.price != null && s.duration != null).slice(0, 3);
  const rows: [string, SectionInstance][] = [
    ["an-categories-1", section("an-categories", {}, cats.map(([key, heading, , img]) => block("category", { image_asset: img, image_position: "50% 50%", heading, text: "", link_label: t("Découvrir", "Discover"), link: `${PRESTA}#${key}` })), cats.length < 2)],
    ["an-split-1", section("an-split", { eyebrow: t("Le salon", "The salon"), heading: ctx.shopName, text: "", button_label: t("Découvrir le salon", "Discover the salon"), button_link: anUrl("le-salon", lang), image_asset: k.im.lifestyle ?? k.im.hero ?? "", image_position: "50% 50%", background: "blush", min_height: 356 }, [], true)],
    ["an-featured-1", section("an-featured", { eyebrow: t("Nos prestations phares", "Our signature services"), note: "" }, priced.map((s) => block("service", { service_id: s.id, name: s.name, price: money(s.price!, s.from, lang), duration: minutes(s.duration!), link: `${PRESTA}#${s.category === "coiffage" ? "coupe" : s.category}` })), priced.length === 0)],
    ["an-steps-1", section("an-steps", { style: "band", heading: t("Votre rendez-vous, simplement.", "Your appointment, simply."), button_label: ctx.bookingLabel, button_link: ctx.bookingLink }, [
      block("step", { title: t("Choisissez\nvotre prestation", "Choose\nyour service"), text: "" }),
      block("step", { title: t("Sélectionnez\nun créneau", "Pick\na time slot"), text: "" }),
      block("step", { title: t("Recevez la confirmation", "Get your confirmation"), text: "" }),
    ], true)],
  ];
  const at = index.order.findIndex((id) => index.sections[id]?.type === "an-hero") + 1;
  for (const [id, s] of rows) index.sections[id] = s;
  index.order.splice(at, 0, ...rows.map(([id]) => id));
}

/** Finition commune (démonstration et clients) : en-tête, pied, réglages du salon, pages et page introuvable. */
export function finishAtelierNuance(spec: ThemeSpec, ctx: FinishCtx) {
  const lang = ctx.lang;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const header = spec.groups.header;
  const headerId = header.order.find((id) => header.sections[id]?.type === "header");
  if (headerId) Object.assign(header.sections[headerId].settings, { layout: "logo-left", show_search: false, show_cart: false, sticky: true, transparent_on_home: true, mobile_menu: "drawer", cta_label: ctx.bookingLabel, cta_link: ctx.bookingLink, cta_icon: "arrow", phone: "" });
  const services = ctx.services ? clientServices(ctx.offers) : [];
  if (!header.order.some((id) => header.sections[id]?.type === "an-salon")) {
    const blocks = salonBlocks(services, []);
    header.sections["an-salon"] = { type: "an-salon", settings: salonSettings(lang, { address: ctx.address, bookingLabel: ctx.bookingLabel, bookingLink: ctx.bookingLink, bookbar: true, cookiesLink: ctx.services ? anUrl("cookies", lang) : "" }), blocks: Object.fromEntries(blocks.map((b, i) => [`${b.type}-${i + 1}`, b])), block_order: blocks.map((b, i) => `${b.type}-${i + 1}`) };
    header.order.unshift("an-salon");
  }
  const footer = spec.groups.footer;
  const footerId = footer.order.find((id) => footer.sections[id]?.type === "footer");
  if (footerId) Object.assign(footer.sections[footerId].settings, { style: "brand-left", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-3" });
  if (!footer.order.some((id) => footer.sections[id]?.type === "an-footnote")) {
    footer.sections["an-footnote"] = { type: "an-footnote", settings: { note: "", link1_label: t("Mentions légales", "Legal notice"), link1: ctx.services ? anUrl("informations-legales", lang) : ctx.legalUrl, link2_label: t("Politique de confidentialité", "Privacy policy"), link2: ctx.services ? anUrl("confidentialite", lang) : "/policies/privacy-policy", link3_label: "", link3: "" } };
    footer.order.push("an-footnote");
  }
  spec.templates["404"] = anTemplate([["an-state", { state: "not_found", image_asset: ctx.kit.im.hero ?? ctx.kit.im.lifestyle ?? "", heading: t("Page introuvable", "Page not found"), text: t("<p>La page que vous recherchez n'existe pas ou a été déplacée.</p>", "<p>The page you are looking for does not exist or has moved.</p>"), button_label: t("Retour à l'accueil", "Back to home"), button_link: "/", button2_label: ctx.services ? t("Voir les prestations", "See our services") : "", button2_link: ctx.services ? anUrl("prestations", lang) : "" }]]);
  if (!ctx.services) return;
  clientHome(spec, ctx, services);
  const { pages, templates } = clientPages(ctx, services);
  Object.assign(spec.templates, templates);
  const have = new Set(spec.store.pages.map((p) => p.handle));
  // Pages du client (contact, FAQ, mentions…) conservées : seules les pages manquantes du salon sont ajoutées.
  for (const p of pages) if (!have.has(p.handle)) spec.store.pages.push(p);
}

export const ATELIER_NUANCE_THEME: CatalogTheme = {
  id: "atelier-nuance",
  name: "Atelier Nuance",
  tagline: "Salon de coiffure premium, chaleureux et apaisant",
  description: "Site de salon de coiffure de la famille Services : grande ouverture photographique, catégories coupe, couleur et soin, le salon, prestations phares, parcours en trois temps, détails du lieu, équipe à initiales, questions, prestations et tarifs filtrables avec fiches détaillées, inspirations, journal, contact ; prise de rendez-vous en cinq étapes (prestation, professionnel, créneau, coordonnées, confirmation), espace client, déplacement et annulation. Ivoire, travertin, chocolat et pêche, grande serif élégante.",
  bestFor: ["salon de coiffure", "coiffeur", "coloriste", "barbier", "institut", "prise de rendez-vous"],
  en: { tagline: "Premium hair salon, warm and calming", description: "Hair salon website from the Services family: large photographic opening, cut, colour and care categories, the salon, featured services, a three-step journey, details of the place, team with initials, questions, filterable services and prices with detailed pages, inspirations, journal, contact; five-step appointment booking (service, professional, time slot, details, confirmation), client area, moving and cancelling. Ivory, travertine, chocolate and peach, an elegant large serif.", bestFor: ["hair salon", "hairdresser", "colourist", "barber", "beauty salon", "appointment booking"] },
  fonts: { heading: "cormorant_n5", body: "lora_n4" },
  previewFonts: { heading: "Cormorant", body: "Lora" },
  motion: "subtle",
  photoMood: "atelier",
  kinds: ["services"],
  look: { headerLayout: "logo-left", shape: "bar", icons: "plain", menu: "drawer", footer: "brand-left", ann: "static", card: "boxed", button: "solid", radius: { button: 999, card: 4 }, headingCase: "none", tracking: 0, headingScale: 100, glow: 0, shine: false, dark: false, gallery: "stack", pageWidth: 1320, spacing: 100, ds: "maison", density: "balanced", buttonUppercase: false },
  settings: { editorial_profile: "none", conversion_profile: "none", motion_intensity: "subtle" },
  headerSettings: { layout: "logo-left", show_search: false, mobile_menu: "drawer" },
  mainProduct: { gallery_layout: "stack", sticky_bar: false, color_scheme: "scheme-1" },
  palette: (k) => {
    const ivory = k.light("#F8F3ED");
    const choco = "#2E211C";
    const peach = "#F2C3A7";
    return [k.scheme(ivory, "#2A201B", k.onLight(ivory)), k.scheme(peach, "#2A201B", k.onLight(peach), 0.06), k.scheme(choco, "#F8F3ED", k.onDark(choco), 0.06), k.filled(k.p.accent)];
  },
  home: shopHome,
  services: servicesHome,
  product: (k) => [k.faqSec(1, 4, "lines")],
  finish: finishAtelierNuance,
};
