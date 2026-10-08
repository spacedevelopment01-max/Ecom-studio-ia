/**
 * Contenus du site (Theme Engine V2) : rassemblés depuis le Project Brain, les faits vérifiés du SEO Engine V2
 * (`verifiedFacts`), les textes de la boutique (`ShopCopy`, locale ou IA déjà enregistrée) et la bibliothèque.
 * Aucune information inventée : chiffres, horaires, prix, avis, garanties, labels n'apparaissent que s'ils sont
 * confirmés ; ce qui manque est marqué « [À compléter : …] » et listé dans `todo` (plan du site, studio, rapport).
 */
import type { Project } from "../projects";
import type { ShopCopy } from "../theme/copy";
import type { ImageSlots } from "../theme/directions";
import { verifiedFacts } from "../seo-v2/facts";
import { mainCity } from "../seo-v2/keywords";
import { pick, type Lang } from "../i18n";
import type { WebsiteIntent } from "./intent";

export type Fact = { label: string; value: string; link?: string; icon?: string };
export type Offer = { title: string; text: string; meta: string; image?: string; icon?: string };

export type SiteContent = {
  name: string;
  lang: Lang;
  category: string;
  city: string | null;
  hero: { eyebrow: string; heading: string; em: string; text: string };
  /** Informations confirmées (jamais de valeur inventée). */
  facts: Fact[];
  contact: { phone: string | null; email: string | null; address: string | null; hours: string | null; area: string | null; bookingUrl: string | null };
  offers: Offer[];
  steps: { title: string; text: string }[];
  faq: { q: string; a: string; real: boolean }[];
  specs: Fact[];
  summary: string;
  descriptionHtml: string;
  /** Valeurs des déclinaisons (contenance, taille…) : jamais mises en avant comme un fait unique du produit. */
  variantValues: string[];
  audience: string;
  images: ImageSlots;
  /** Galerie (produit) : fichiers d'images dans l'ordre. */
  gallery: string[];
  todo: string[];
};

export const TODO = /\[(À|A) compléter|\[To complete/i;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const para = (s: string) => (s ? (/^\s*</.test(s) ? s : `<p>${esc(s)}</p>`) : "");
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** Titre principal : fin du titre (complément introduit par « à », « pour », « sans »…) mise en valeur. */
export function splitHeading(text: string): { heading: string; em: string } {
  const t = clean(text);
  const m = t.match(/^(.{12,}?)\s+((?:à|a|pour|sans|avec|en|for|without|with|in)\s+[^,]{3,40})$/i);
  return m ? { heading: m[1], em: m[2] } : { heading: t, em: "" };
}

/** « Plâtrerie et plaques de plâtre », « Enduits et lissage », « Peinture intérieure » → « Plâtrerie, enduits et peinture intérieure ». */
export function servicesHeading(names: string[], lang: Lang): string {
  const heads = names.map((n) => clean(n).split(/\s+(?:et|and|&)\s+|,/i)[0]).filter(Boolean).slice(0, 3);
  if (!heads.length) return "";
  const parts = heads.map((h, i) => (i ? h.charAt(0).toLowerCase() + h.slice(1) : h));
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} ${pick(lang, "et", "and")} ${parts[parts.length - 1]}`;
}

export function siteContent(p: Project, intent: WebsiteIntent, copy: ShopCopy, images: ImageSlots, gallery: string[]): SiteContent {
  const lang = intent.lang;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const vf = verifiedFacts(p);
  const b = p.brand!;
  const name = b.name || p.name;
  const category = clean(p.product.category) || clean(vf.category);
  const area = clean(vf.area) || null;
  const city = mainCity(area);
  const todo: string[] = [];
  const c = vf.contact;
  const contact = { phone: c.phone || null, email: c.email || null, address: c.address || null, hours: c.hours || null, area, bookingUrl: c.bookingUrl || null };
  const positioning = b.positioning && !/\[(À|A) (définir|compléter)/i.test(b.positioning) ? clean(b.positioning) : "";
  const summary = clean(p.product.summary);
  const audience = clean((b as { audience?: string }).audience) || clean(vf.audience);
  const facts: Fact[] = [];
  const services = vf.services ?? [];

  // ------------------------------------------------------------ ouverture
  let hero: SiteContent["hero"];
  if (intent.site === "services_trade" || intent.site === "local_service") {
    const heading = servicesHeading(services.map((s) => s.name), lang) || category || name;
    hero = {
      eyebrow: [category, area].filter(Boolean).join(" · "),
      heading,
      em: city ? t(`à ${city}.`, `in ${city}.`) : "",
      text: [area ? t(`${name} intervient ${/^(à|a|dans|sur|en)\s/i.test(area) ? area : `à ${area}`}.`, `${name} works in ${area}.`) : "", intent.conversion === "quote" ? t("Devis sur demande.", "Quotes on request.") : ""].filter(Boolean).join(" "),
    };
  } else if (intent.site === "restaurant") {
    hero = { eyebrow: [category, area].filter(Boolean).join(" · "), heading: name, em: "", text: positioning || summary };
  } else {
    const s = splitHeading(positioning || clean(b.tagline) || summary || name);
    hero = { eyebrow: category, heading: s.heading, em: s.em, text: summary && summary !== positioning ? summary : "" };
  }

  // ------------------------------------------------------------ faits confirmés
  if (intent.site.startsWith("shop") || intent.site === "saas") {
    if (vf.price && intent.site !== "saas") facts.push({ label: t("Prix", "Price"), value: vf.price });
    for (const f of vf.facts) if (f.value && !TODO.test(f.value)) facts.push({ label: f.label, value: f.value });
    for (const a of vf.answers ?? []) if (a.a && !TODO.test(a.a) && a.a.length <= 32 && /origin/i.test(a.q)) facts.push({ label: t("Origine", "Origin"), value: a.a });
    if (intent.site === "saas" && audience) facts.push({ label: t("Pour", "For"), value: audience });
  }
  const specs: Fact[] = intent.site.startsWith("shop") ? facts.filter((f) => f.label !== t("Prix", "Price")) : [];
  if (intent.site.startsWith("shop") && category) specs.unshift({ label: t("Type", "Type"), value: category });

  // ------------------------------------------------------------ offres
  let offers: Offer[] = [];
  if (services.length) {
    offers = services.map((s) => ({ title: s.name, text: s.description ? para(s.description) : "", meta: clean(s.price) }));
    if (intent.site === "restaurant") offers = offers.map((o) => ({ ...o, text: o.text || para(t("[À compléter : plats, prix et allergènes]", "[To complete: dishes, prices and allergens]")) }));
  } else {
    offers = copy.features.items.filter((f) => f.text && !TODO.test(f.text) && !TODO.test(f.title)).map((f) => ({ title: f.title, text: para(f.text), meta: "", icon: f.icon || undefined }));
  }

  // ------------------------------------------------------------ étapes (déroulé réel d'une prise de contact)
  const steps = intent.site === "services_trade" || intent.site === "local_service" ? copy.story.steps.filter((s) => !TODO.test(s.title)).map((s) => ({ title: s.title, text: TODO.test(s.text) ? "" : s.text })) : [];

  // ------------------------------------------------------------ questions
  let faq: SiteContent["faq"];
  if (intent.site === "saas") {
    faq = [
      [t(`Peut-on essayer ${name} ?`, `Can I try ${name}?`), t("[À compléter : essai, démonstration]", "[To complete: trial, demo]")],
      [t("Quelles données peut-on connecter ?", "Which data can I connect?"), t("[À compléter : sources de données et intégrations]", "[To complete: data sources and integrations]")],
      [t("Où sont hébergées les données ?", "Where is the data hosted?"), t("[À compléter : hébergement et sécurité]", "[To complete: hosting and security]")],
      [t(`Combien coûte ${name} ?`, `How much does ${name} cost?`), t("[À compléter : tarifs confirmés]", "[To complete: confirmed pricing]")],
    ].map(([q, a]) => ({ q, a: para(a), real: false }));
  } else if (intent.site === "restaurant") {
    faq = [
      [t("Faut-il réserver ?", "Do I need to book?"), contact.bookingUrl ? t("Vous pouvez réserver en ligne.", "You can book online.") : t("[À compléter : réservation]", "[To complete: booking]")],
      [t("Quels sont vos horaires ?", "What are your opening hours?"), contact.hours ?? t("[À compléter : horaires]", "[To complete: opening hours]")],
      [t("Proposez-vous des plats végétariens ?", "Do you offer vegetarian dishes?"), t("[À compléter]", "[To complete]")],
      [t("Peut-on privatiser la salle ?", "Can the room be booked privately?"), t("[À compléter]", "[To complete]")],
    ].map(([q, a]) => ({ q, a: para(a), real: !TODO.test(a) }));
  } else {
    faq = copy.faq.items.map((f) => ({ q: f.q, a: para(f.a), real: !TODO.test(f.a) && f.a.trim().length > 3 }));
  }

  // ------------------------------------------------------------ à compléter
  if (intent.site === "services_trade" || intent.site === "local_service" || intent.site === "restaurant") {
    if (!contact.phone) todo.push(t("téléphone", "phone"));
    if (!contact.address) todo.push(t("adresse", "address"));
    if (!contact.hours) todo.push(t("horaires", "opening hours"));
    if (!images.lifestyle && !images.scene1) todo.push(t("photos réelles (chantiers, salle, équipe)", "real photos (work, venue, team)"));
  }
  if (intent.site === "restaurant") todo.push(t("carte (plats, prix, allergènes)", "menu (dishes, prices, allergens)"));
  if (intent.site === "saas") todo.push(t("fonctionnalités confirmées", "confirmed features"), t("tarifs", "pricing"));
  if (intent.site.startsWith("shop") && !vf.price) todo.push(t("prix", "price"));
  if (intent.site.startsWith("shop") && !vf.shipping) todo.push(t("conditions de livraison", "shipping terms"));
  if (faq.length && !faq.some((f) => f.real)) todo.push(t("réponses aux questions fréquentes", "FAQ answers"));

  return {
    name,
    lang,
    category: cap(category),
    city,
    hero,
    facts,
    contact,
    offers,
    steps,
    faq,
    specs,
    summary,
    // Description de la fiche produit reconstruite à partir des faits CONFIRMÉS seulement (la description V1 peut
    // contenir des faits déduits d'une photo, jamais affirmés sur le site V2). La liste n'y figure que si la section
    // « Caractéristiques » (2 faits ou plus) n'est pas affichée.
    variantValues: p.product.variants.flatMap((v) => v.values.map((x) => clean(x).toLowerCase())),
    descriptionHtml: para(summary || clean(copy.product.short)) + (specs.length === 1 ? `<ul>${specs.map((f) => `<li><strong>${esc(f.label)}</strong>${t(" : ", ": ")}${esc(f.value)}</li>`).join("")}</ul>` : ""),
    audience,
    images,
    gallery,
    todo,
  };
}
