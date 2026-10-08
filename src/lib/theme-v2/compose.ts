/**
 * Page Planner et composition des sections (Theme Engine V2).
 * - Pages RÉELLEMENT utiles au type de site (boutique, artisan, restaurant, SaaS) ; une page dont les données
 *   indispensables manquent est marquée incomplète (et retirée du menu quand elle serait vide).
 * - Sections choisies selon le contenu disponible : jamais de section vide pour remplir une page.
 * - Variantes selon le langage visuel (ouverture, listes, étapes, appel final, rythme des fonds) : deux sites
 *   de types différents n'ont ni la même structure, ni la même grammaire.
 */
import { pick, type Lang } from "../i18n";
import type { BlockInstance, MenuLink, SectionInstance, StorePage, TemplateJson } from "../theme/spec";
import type { ArtDirection, HeroLayout } from "./art-direction";
import type { WebsiteIntent } from "./intent";
import { TODO, para, type Fact, type SiteContent } from "./content";

export type PagePlan = { key: string; title: string; handle: string; url: string; template: string; inNav: boolean; required: string[]; missing: string[]; complete: boolean };

type Sec = [type: string, settings: Record<string, unknown>, blocks?: { type: string; settings: Record<string, unknown> }[]];

class Ids {
  private n = new Map<string, number>();
  next(type: string) {
    const k = type.replace(/[^a-z0-9]/gi, "_");
    const v = (this.n.get(k) ?? 0) + 1;
    this.n.set(k, v);
    return `${k}_${v}`;
  }
}

export function template(ids: Ids, secs: (Sec | null | false | undefined)[]): TemplateJson {
  const out: TemplateJson = { sections: {}, order: [] };
  for (const s of secs) {
    if (!s) continue;
    const [type, settings, blocks] = s;
    const sid = ids.next(type);
    // Copie : une même section (ex. l'appel final) peut figurer sur plusieurs pages sans partager ses réglages.
    const inst: SectionInstance = { type, settings: structuredClone(settings) };
    if (blocks?.length) {
      const b: Record<string, BlockInstance> = {};
      const order: string[] = [];
      for (const bl of blocks) {
        const bid = ids.next(bl.type);
        b[bid] = { type: bl.type, settings: structuredClone(bl.settings) };
        order.push(bid);
      }
      inst.blocks = b;
      inst.block_order = order;
    }
    out.sections[sid] = inst;
    out.order.push(sid);
  }
  return out;
}

const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
const factBlocks = (facts: Fact[], type = "fact") => facts.map((f) => ({ type, settings: { label: f.label, value: f.value, ...(f.link ? { link: f.link } : {}), ...(type === "fact" && f.icon ? { icon: f.icon } : {}) } }));

export type Composition = {
  templates: Record<string, TemplateJson>;
  pages: StorePage[];
  plan: PagePlan[];
  menus: Record<string, { title: string; links: MenuLink[] }>;
  header: Record<string, unknown>;
  footer: Record<string, unknown>;
  footerBlocks: { type: string; settings: Record<string, unknown> }[];
  secondary: string;
  hero: HeroLayout;
};

export function compose(intent: WebsiteIntent, art: ArtDirection, c: SiteContent, productHandle: string | null, productTemplate: TemplateJson | null): Composition {
  const lang: Lang = c.lang;
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const ids = new Ids();
  const L = art.language;
  const im = c.images;
  const shop = intent.site === "shop_mono" || intent.site === "shop_multi";
  const services = intent.site === "services_trade" || intent.site === "local_service";

  // ------------------------------------------------------------ plan des pages
  const H = {
    contact: t("contact", "contact"),
    services: t("prestations", "services"),
    menu: t("la-carte", "menu"),
    features: t("fonctionnalites", "features"),
    pricing: t("tarifs", "pricing"),
    faq: t("questions", "faq"),
    about: t("a-propos", "about"),
    legal: t("mentions-legales", "legal-notice"),
    shipping: t("livraison-et-retours", "shipping-and-returns"),
  };
  const plan: PagePlan[] = [];
  const page = (key: string, title: string, handle: string, tplKey: string, inNav: boolean, required: string[], missing: string[]) =>
    plan.push({ key, title, handle, url: `/pages/${handle}`, template: tplKey, inNav, required, missing, complete: missing.length === 0 });
  const realFaq = c.faq.filter((f) => f.real);
  if (services) {
    page("services", t("Prestations", "Services"), H.services, "page.v2-services", true, [t("liste des prestations", "list of services")], c.offers.length ? [] : [t("prestations", "services")]);
  }
  if (intent.site === "restaurant") page("menu", t("La carte", "Menu"), H.menu, "page.v2-menu", true, [t("plats et prix", "dishes and prices")], [t("plats, prix et allergènes", "dishes, prices and allergens")]);
  if (intent.site === "saas") {
    page("features", t("Fonctionnalités", "Features"), H.features, "page.v2-features", true, [t("fonctionnalités confirmées", "confirmed features")], c.offers.length >= 3 ? [] : [t("fonctionnalités confirmées", "confirmed features")]);
    // Tarifs non confirmés : page prévue, hors du menu (aucun prix inventé).
    page("pricing", t("Tarifs", "Pricing"), H.pricing, "page.v2-pricing", false, [t("tarifs confirmés", "confirmed pricing")], [t("tarifs confirmés", "confirmed pricing")]);
  }
  page("faq", t("Questions", "FAQ"), H.faq, "page.v2-faq", realFaq.length >= 2 || intent.site === "saas" || shop, [t("réponses vérifiées", "verified answers")], realFaq.length ? [] : [t("réponses aux questions", "answers to the questions")]);
  if (shop) page("shipping", t("Livraison et retours", "Shipping and returns"), H.shipping, "page", false, [t("conditions de livraison et de retour", "shipping and returns terms")], [t("conditions de livraison et de retour", "shipping and returns terms")]);
  page("contact", intent.site === "saas" ? t("Démonstration", "Demo") : intent.site === "restaurant" ? t("Infos pratiques", "Visit us") : t("Contact", "Contact"), H.contact, "page.v2-contact", true, [t("coordonnées", "contact details")], [!c.contact.phone && !c.contact.email ? t("téléphone ou e-mail", "phone or email") : "", intent.site === "restaurant" && !c.contact.hours ? t("horaires", "opening hours") : ""].filter(Boolean));
  page("legal", t("Mentions légales", "Legal notice"), H.legal, "page", false, [t("éditeur, hébergeur, SIRET", "publisher, host, company number")], [t("éditeur, hébergeur, SIRET", "publisher, host, company number")]);

  const url = (key: string) => plan.find((p) => p.key === key)?.url ?? "/";
  const productUrl = productHandle ? `/products/${productHandle}` : "/";

  // ------------------------------------------------------------ appels à l'action (parcours)
  const phoneCta = c.contact.phone ? { label: t(`Appeler le ${c.contact.phone}`, `Call ${c.contact.phone}`), link: tel(c.contact.phone) } : null;
  const primary =
    intent.conversion === "quote" ? { label: t("Demander un devis", "Request a quote"), link: url("contact") }
    : intent.conversion === "book" ? { label: t("Réserver", "Book"), link: c.contact.bookingUrl ?? url("contact") }
    : intent.conversion === "call" ? (c.contact.phone ? { label: t("Appeler", "Call"), link: tel(c.contact.phone) } : { label: t("Nous contacter", "Contact us"), link: url("contact") })
    : intent.conversion === "demo" ? { label: t("Demander une démo", "Request a demo"), link: url("contact") }
    : intent.conversion === "buy" ? { label: t("Acheter", "Buy now"), link: productUrl }
    : { label: t("Nous contacter", "Contact us"), link: url("contact") };
  const secondary =
    services ? phoneCta ?? { label: t("Nos prestations", "Our services"), link: url("services") }
    : intent.site === "restaurant" ? { label: t("Voir la carte", "See the menu"), link: url("menu") }
    : intent.site === "saas" ? { label: t("Fonctionnalités", "Features"), link: url("features") }
    : { label: t("Questions fréquentes", "FAQ"), link: url("faq") };

  // ------------------------------------------------------------ ouverture
  const heroLayout: HeroLayout = (() => {
    for (const l of art.hero.layouts) {
      if (l === "stage" && im.cutout) return l;
      if (l === "split" && (im.lifestyle || im.scene1 || im.hero)) return l;
      if (l === "frame" && (im.packshot || im.scene1)) return l;
      if (l === "board" || l === "type") return l;
    }
    return "type";
  })();
  const heroImage = heroLayout === "stage" ? im.cutout : heroLayout === "split" ? im.lifestyle ?? im.scene1 ?? im.hero : heroLayout === "frame" ? im.packshot ?? im.scene1 : undefined;
  const contactFacts: Fact[] = [
    c.contact.phone ? { label: t("Téléphone", "Phone"), value: c.contact.phone, link: tel(c.contact.phone), icon: "phone" } : null,
    c.contact.area ? { label: intent.site === "restaurant" ? t("Quartier", "Area") : t("Zone d'intervention", "Service area"), value: c.contact.area, icon: "globe" } : null,
    c.contact.hours ? { label: t("Horaires", "Hours"), value: c.contact.hours, icon: "clock" } : null,
    c.contact.address ? { label: t("Adresse", "Address"), value: c.contact.address, icon: "globe" } : null,
    c.contact.email ? { label: t("E-mail", "Email"), value: c.contact.email, link: `mailto:${c.contact.email}`, icon: "mail" } : null,
  ].filter(Boolean) as Fact[];
  const heroBlocks = heroLayout === "board"
    ? [...c.offers.slice(0, 5).map((o) => ({ type: "item", settings: { label: o.title, value: o.meta } })), ...factBlocks(contactFacts.slice(0, 2))]
    : heroLayout === "type" ? factBlocks(contactFacts.slice(0, 4)) : factBlocks(c.facts.slice(0, 4));
  const hero: Sec = [
    "v2-hero",
    {
      layout: heroLayout,
      eyebrow: c.hero.eyebrow,
      heading: c.hero.heading,
      heading_em: c.hero.em,
      text: para(c.hero.text),
      button_label: primary.label,
      button_link: primary.link,
      button2_label: secondary.label,
      button2_link: secondary.link,
      image_asset: heroImage ?? "",
      image_alt: c.name,
      card_title: heroLayout === "board" ? t("Au menu", "On the menu") : heroLayout === "type" ? t("Coordonnées", "Contact details") : "",
      texture: art.hero.texture,
      color_scheme: "scheme-1",
      padding_top: heroLayout === "frame" ? 88 : 64,
      padding_bottom: heroLayout === "frame" ? 64 : 96,
    },
    heroBlocks,
  ];

  // ------------------------------------------------------------ sections disponibles (seulement avec du contenu)
  const offersHeading = services ? t("Prestations", "Services") : intent.site === "restaurant" ? t("Au menu", "On the menu") : intent.site === "saas" ? t("Ce que fait", "What it does") + ` ${c.name}` : t("Les atouts", "Highlights");
  const offerLayout = L === "craft" ? "rows" : L === "bistro" ? "menu" : L === "product" ? "bento" : "cards";
  const factLabels = new Set(c.facts.map((f) => f.label.toLowerCase()));
  const offerItems = c.offers.filter((o) => !factLabels.has(o.title.toLowerCase()));
  const offers: Sec | null = offerItems.length >= 2 ? [
    "v2-index",
    { layout: offerLayout, eyebrow: services ? c.category : "", heading: offersHeading, intro: "", note: intent.site === "restaurant" ? t("[À compléter : carte du jour, prix et allergènes]", "[To complete: today's menu, prices and allergens]") : "", color_scheme: "scheme-1", padding_top: 104, padding_bottom: 104 },
    offerItems.map((o) => ({ type: "item", settings: { title: o.title, text: o.text, meta: o.meta, icon: o.icon ?? "none", image_asset: o.image ?? "", link_label: services && L === "craft" ? t("Devis", "Quote") : "", link: services ? url("contact") : "" } })),
  ] : null;
  const steps: Sec | null = c.steps.length >= 2 ? [
    "v2-steps",
    { layout: L === "craft" ? "line" : L === "maison" ? "stack" : "cards", eyebrow: t("Méthode", "Process"), heading: t("Comment ça se passe", "How it works"), color_scheme: "scheme-2", padding_top: 104, padding_bottom: 104 },
    c.steps.map((s) => ({ type: "step", settings: { title: s.title, text: para(s.text) } })),
  ] : null;
  const splitImage = shop ? im.detail1 ?? im.scene2 ?? im.packshot : intent.site === "saas" ? im.scene1 : im.lifestyle2 ?? im.scene2;
  // Le résumé n'est jamais répété : s'il est déjà le texte de l'ouverture, le titre de la section devient neutre.
  const inHero = !!c.summary && (c.hero.text.includes(c.summary) || c.hero.heading.includes(c.summary));
  const split: Sec | null = (() => {
    if (intent.site === "restaurant") return c.summary ? ["v2-split", { layout: "media-left", fit: "v2-cover", eyebrow: t("La maison", "The house"), heading: inHero ? t(`Bienvenue ${/^chez\s/i.test(c.name) ? c.name.replace(/^chez/i, "chez") : `chez ${c.name}`}`, `Welcome to ${c.name}`) : c.summary, text: "", image_asset: im.lifestyle2 ?? "", color_scheme: "scheme-2", padding_top: 120, padding_bottom: 120 }] : null;
    if (intent.site === "saas") {
      const ticks = [c.audience && t(`Pensé pour : ${c.audience}`, `Built for: ${c.audience}`)].filter(Boolean) as string[];
      return c.summary ? ["v2-split", { layout: "media-right", fit: "v2-cover", eyebrow: t("Le produit", "The product"), heading: inHero ? t(`${c.name} en un coup d'œil`, `${c.name} at a glance`) : c.summary, text: "", image_asset: splitImage ?? "", image_alt: c.name, color_scheme: "scheme-2", padding_top: 112, padding_bottom: 112 }, ticks.map((x) => ({ type: "point", settings: { text: x } }))] : null;
    }
    // Boutique : « En détail » — image de détail et faits CONFIRMÉS (le texte de l'ouverture n'est jamais répété).
    const ticks = c.facts.filter((f) => f.label !== t("Prix", "Price")).map((f) => `${f.label} : ${f.value}`);
    if (shop && splitImage && ticks.length) return ["v2-split", { layout: L === "precision" ? "overlap" : "media-left", fit: "v2-cover", eyebrow: c.category, heading: t("En détail", "Up close"), text: "", image_asset: splitImage, image_alt: c.name, button_label: t("Voir le produit", "View the product"), button_link: productUrl, color_scheme: "scheme-2", padding_top: 112, padding_bottom: 112 }, ticks.map((x) => ({ type: "point", settings: { text: x } }))];
    return null;
  })();
  const used = new Set([heroImage, splitImage].filter(Boolean));
  // Bannières exclues : ce sont des créations publicitaires avec du texte incrusté, pas des photos.
  const mediaFiles = [im.packshot, im.detail1, im.scene1, im.scene2, im.detail2, im.scene3].filter((f): f is string => !!f && !used.has(f)).filter((f, i, a) => a.indexOf(f) === i);
  const media: Sec | null = shop && mediaFiles.length >= 3 ? [
    "v2-media",
    { layout: L === "precision" ? "bento" : "rail", eyebrow: "", heading: t("En images", "In pictures"), color_scheme: "scheme-1", padding_top: 104, padding_bottom: 104 },
    mediaFiles.slice(0, 5).map((f) => ({ type: "image", settings: { image_asset: f, caption: "" } })),
  ] : null;
  const specs: Sec | null = c.specs.length >= 2 ? [
    "v2-specs",
    { eyebrow: t("Fiche", "Details"), heading: t("Caractéristiques", "Specifications"), image_asset: L === "precision" ? im.packshot ?? "" : "", note: t("Seules les caractéristiques confirmées sont affichées.", "Only confirmed specifications are shown."), color_scheme: "scheme-1", padding_top: 104, padding_bottom: 104 },
    c.specs.map((s) => ({ type: "spec", settings: { label: s.label, value: s.value } })),
  ] : null;
  const facts: Sec | null = services || intent.site === "restaurant" ? [
    "v2-facts",
    {
      layout: L === "craft" ? "ledger" : L === "bistro" ? "grid" : "strip",
      eyebrow: intent.site === "restaurant" ? t("Nous trouver", "Find us") : t("En pratique", "Practical"),
      heading: intent.site === "restaurant" ? t("Infos pratiques", "Practical info") : t("Intervention et contact", "Area and contact"),
      text: "",
      color_scheme: "scheme-2",
      padding_top: 96,
      padding_bottom: 96,
    },
    factBlocks([
      ...contactFacts,
      ...(intent.site === "restaurant" && !c.contact.hours ? [{ label: t("Horaires", "Hours"), value: t("[À compléter : horaires]", "[To complete: opening hours]"), icon: "clock" }] : []),
      ...(intent.site === "restaurant" && !c.contact.phone ? [{ label: t("Réservation", "Booking"), value: t("[À compléter : téléphone ou lien de réservation]", "[To complete: phone or booking link]"), icon: "phone" }] : []),
      ...(intent.site === "restaurant" && !c.contact.address ? [{ label: t("Adresse", "Address"), value: t("[À compléter : adresse]", "[To complete: address]"), icon: "globe" }] : []),
    ]),
  ] : null;
  const faqHome: Sec | null = realFaq.length >= 2 ? [
    "v2-faq",
    { layout: L === "craft" || L === "precision" ? "side" : "center", eyebrow: "", heading: t("Questions fréquentes", "Frequently asked questions"), text: "", color_scheme: "scheme-1", padding_top: 104, padding_bottom: 104 },
    realFaq.slice(0, 6).map((f) => ({ type: "question", settings: { question: f.q, answer: f.a } })),
  ] : null;
  const ctaHeading = services ? (c.city ? t(`Un projet à ${c.city} ?`, `A project in ${c.city}?`) : t("Un projet ?", "A project?"))
    : intent.site === "restaurant" ? (/^chez\s/i.test(c.name) ? t(`À table ${c.name.charAt(0).toLowerCase()}${c.name.slice(1)}`, `Join us at ${c.name}`) : t(`À table chez ${c.name}`, `Join us at ${c.name}`))
    : intent.site === "saas" ? t(`Voir ${c.name} en action`, `See ${c.name} in action`)
    : c.name;
  const ctaText = services ? t("Décrivez votre projet : la réponse se fait sur devis.", "Describe your project: we reply with a quote.") : intent.site === "saas" ? t("Une démonstration sur vos propres questions.", "A demo built around your own questions.") : shop && c.facts.length >= 2 ? c.facts.slice(0, 3).map((f) => f.value).join(" · ") : ""; // une valeur seule (« stabilisée ») ne veut rien dire hors contexte
  const cta: Sec = [
    "v2-cta",
    {
      layout: L === "craft" ? "band" : L === "bistro" ? "split" : L === "precision" ? "band" : "card",
      eyebrow: shop ? c.category : "",
      heading: ctaHeading,
      text: para(ctaText),
      button_label: primary.label,
      button_link: primary.link,
      button2_label: shop ? "" : secondary.link.startsWith("tel:") ? secondary.label : "",
      button2_link: shop ? "" : secondary.link.startsWith("tel:") ? secondary.link : "",
      color_scheme: L === "precision" ? "scheme-4" : L === "maison" || L === "product" ? "scheme-1" : "scheme-3",
      padding_top: 112,
      padding_bottom: 112,
    },
    factBlocks(services || intent.site === "restaurant" ? contactFacts.filter((f) => f.link).slice(0, 2) : []),
  ];

  // ------------------------------------------------------------ accueil selon le type de site (ordre = parcours)
  let home: (Sec | null)[];
  switch (intent.site) {
    case "services_trade":
    case "local_service":
      home = [hero, offers, steps, facts, faqHome, cta];
      break;
    case "restaurant":
      // L'ardoise de l'ouverture liste déjà les formules : la liste n'est répétée que si elle apporte un détail confirmé.
      home = [hero, heroLayout === "board" && !c.offers.some((o) => o.text && !TODO.test(o.text)) ? null : offers, split, facts, faqHome, cta];
      break;
    case "saas":
      home = [hero, split, offers, faqHome, cta];
      break;
    default:
      home = L === "precision" ? [hero, media, split, offers, faqHome, cta] : [hero, split, media, offers, faqHome, cta];
  }
  // Rythme : fonds alternés (principal / surface) entre l'ouverture et l'appel final, jamais deux fois le même d'affilée.
  const present = home.filter(Boolean) as Sec[];
  let alt = false;
  for (const s of present.slice(1, -1)) {
    s[1].color_scheme = alt ? "scheme-2" : "scheme-1";
    alt = !alt;
  }

  // ------------------------------------------------------------ pages intérieures
  const pageHead = (eyebrow: string, heading: string, text = ""): Sec => ["v2-hero", { layout: "type", eyebrow, heading, heading_em: "", text: para(text), button_label: "", button2_label: "", texture: art.hero.texture === "plaster" ? "plaster" : "none", color_scheme: "scheme-1", padding_top: 56, padding_bottom: 48 }];
  const templates: Record<string, TemplateJson> = { index: template(ids, present) };
  const faqAll: Sec | null = c.faq.length ? ["v2-faq", { layout: "side", heading: t("Questions fréquentes", "Frequently asked questions"), text: c.faq.some((f) => !f.real) ? para(t("Les réponses « [À compléter] » attendent une information de votre part.", "Answers marked \"[To complete]\" are waiting for your information.")) : "", color_scheme: "scheme-1", padding_top: 64, padding_bottom: 104 }, c.faq.map((f) => ({ type: "question", settings: { question: f.q, answer: f.a } }))] : null;
  templates["page.v2-faq"] = template(ids, [pageHead(c.name, t("Questions fréquentes", "Frequently asked questions")), faqAll, cta]);
  templates["page.v2-contact"] = template(ids, [
    pageHead(c.category, plan.find((p) => p.key === "contact")!.title, intent.site === "saas" ? t("Laissez vos coordonnées : nous revenons vers vous pour organiser une démonstration.", "Leave your details: we will get back to you to arrange a demo.") : ""),
    ["contact-form", { eyebrow: "", heading: intent.site === "saas" ? t("Demander une démo", "Request a demo") : services ? t("Demander un devis", "Request a quote") : t("Écrivez-nous", "Write to us"), text: para(services ? t("Décrivez votre projet (pièces, surfaces, délais souhaités).", "Describe your project (rooms, surfaces, preferred timing).") : ""), email: c.contact.email ?? "", hours: c.contact.hours ?? "", response: "", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 64 }],
    contactFacts.length ? ["v2-facts", { layout: "grid", heading: t("Coordonnées", "Contact details"), color_scheme: "scheme-2", padding_top: 80, padding_bottom: 96 }, factBlocks(contactFacts)] : null,
  ]);
  if (services) templates["page.v2-services"] = template(ids, [pageHead(c.category, t("Prestations", "Services"), c.contact.area ? t(`Intervention : ${c.contact.area}.`, `Area: ${c.contact.area}.`) : ""), offers ? ["v2-index", { ...offers[1], layout: L === "craft" ? "cards" : offerLayout, heading: "", eyebrow: "" }, offers[2]] : null, steps, cta]);
  if (intent.site === "restaurant") templates["page.v2-menu"] = template(ids, [pageHead(c.name, t("La carte", "Menu")), offers ? ["v2-index", { ...offers[1], heading: "", eyebrow: "" }, offers[2]] : null, facts, cta]);
  if (intent.site === "saas") {
    templates["page.v2-features"] = template(ids, [pageHead(c.name, t("Fonctionnalités", "Features"), c.summary), split, c.offers.length >= 2 ? offers : ["v2-faq", { layout: "center", heading: t("À compléter", "To complete"), text: para(t("Les fonctionnalités confirmées de votre logiciel apparaîtront ici. Aucune fonctionnalité n'est inventée.", "Your software's confirmed features will appear here. No feature is made up.")), color_scheme: "scheme-1", padding_top: 48, padding_bottom: 96 }, [{ type: "question", settings: { question: t("Quelles fonctionnalités présenter ?", "Which features should be shown?"), answer: para(t("[À compléter : fonctionnalités confirmées]", "[To complete: confirmed features]")) } }]], cta]);
    templates["page.v2-pricing"] = template(ids, [pageHead(c.name, t("Tarifs", "Pricing"), t("[À compléter : tarifs confirmés — aucun prix n'est affiché tant qu'il n'est pas confirmé]", "[To complete: confirmed pricing — no price is shown until confirmed]")), cta]);
  }
  // Fiche produit : bloc d'achat existant (galerie, variantes, prix, panier, barre d'achat collante) + caractéristiques et
  // questions confirmées ; la section d'avis n'est ajoutée qu'avec de vrais avis (aucun ici).
  if (productTemplate) {
    const main = productTemplate.order.map((k) => productTemplate.sections[k]).find((s) => s.type === "main-product");
    if (main) {
      main.settings = { ...main.settings, sticky_bar: true, gallery_layout: L === "maison" ? "stack" : (main.settings.gallery_layout ?? "stack") };
      // Bloc d'achat recomposé à partir des faits confirmés : pas de note sans vrais avis, pas d'accroche répétée par la
      // description, points forts = valeurs confirmées courtes, caractéristiques détaillées dans la section dédiée
      // (le volet « Caractéristiques » V1 peut contenir des faits déduits d'une photo).
      const blocks = { ...(main.blocks ?? {}) };
      const highlights = c.specs.filter((f) => f.label !== t("Type", "Type") && f.value.length <= 28 && !c.variantValues.includes(f.value.toLowerCase())).slice(0, 3).map((f) => f.value);
      const order = (main.block_order ?? Object.keys(blocks)).filter((k) => {
        const b = blocks[k];
        if (!b) return false;
        if (b.type === "rating" || b.type === "text") return false;
        if (b.type === "highlights") {
          if (!highlights.length) return false;
          b.settings = { ...b.settings, items: highlights.join("\n") };
        }
        if (b.type === "collapsible" && /caract|spec/i.test(String(b.settings.heading ?? ""))) return false;
        return true;
      });
      main.blocks = Object.fromEntries(order.map((k) => [k, blocks[k]]));
      main.block_order = order;
    }
    const extra = template(ids, [specs ? ["v2-specs", { ...specs[1], image_asset: "" }, specs[2]] : null, realFaq.length ? ["v2-faq", { layout: "side", heading: t("Questions fréquentes", "Frequently asked questions"), color_scheme: "scheme-2", padding_top: 96, padding_bottom: 96 }, realFaq.map((f) => ({ type: "question", settings: { question: f.q, answer: f.a } }))] : null, offers]);
    const kept = productTemplate.order.filter((k) => productTemplate.sections[k].type === "main-product" || productTemplate.sections[k].type === "product-recommendations");
    templates.product = { sections: { ...Object.fromEntries(kept.map((k) => [k, productTemplate.sections[k]])), ...extra.sections }, order: [...kept.filter((k) => productTemplate.sections[k].type === "main-product"), ...extra.order, ...kept.filter((k) => productTemplate.sections[k].type === "product-recommendations")] };
  }

  const pages: StorePage[] = plan.map((p) => ({
    handle: p.handle,
    title: p.title,
    template_suffix: p.template.startsWith("page.") ? p.template.slice(5) : "",
    body_html: p.template === "page" ? para(p.key === "legal" ? t("[À compléter : éditeur du site, hébergeur, numéro SIRET, directeur de la publication]", "[To complete: site publisher, host, company number, publication director]") : t("[À compléter : délais et frais de livraison, conditions de retour — rien n'est affiché tant que ce n'est pas confirmé]", "[To complete: delivery times and costs, returns policy — nothing is shown until confirmed]")) : "",
  }));

  // ------------------------------------------------------------ navigation
  const nav: MenuLink[] = [
    ...(shop ? [{ title: intent.site === "shop_multi" ? t("Boutique", "Shop") : c.name, url: intent.site === "shop_multi" ? "/collections/all" : productUrl }] : []),
    ...plan.filter((p) => p.inNav && p.key !== "contact").map((p) => ({ title: p.title, url: p.url })),
    { title: plan.find((p) => p.key === "contact")!.title, url: url("contact") },
  ];
  // Pied de page : la colonne « Le site » reprend déjà le menu principal ; « Informations » ne garde que le reste.
  const footerLinks: MenuLink[] = plan.filter((p) => p.key === "legal" || p.key === "shipping" || (!p.inNav && p.key !== "contact")).map((p) => ({ title: p.title, url: p.url }));
  const menus = { "main-menu": { title: t("Menu principal", "Main menu"), links: nav }, footer: { title: t("Informations", "Information"), links: footerLinks } };

  const header = {
    ...art.header,
    menu: "main-menu",
    mega_menu: "none",
    transparent_on_home: false,
    desktop_icons: false,
    cta_label: shop ? "" : primary.label,
    cta_link: shop ? "" : primary.link,
    cta_icon: intent.conversion === "call" ? "phone" : intent.conversion === "quote" ? "mail" : intent.conversion === "demo" ? "arrow" : "clock",
    phone: services || intent.site === "restaurant" ? c.contact.phone ?? "" : "",
    color_scheme: "scheme-1",
  };
  const footerBlocks = [
    { type: "text", settings: { heading: c.name, text: para(art.positioning && !TODO.test(art.positioning) ? art.positioning : c.category) } },
    { type: "links", settings: { heading: t("Le site", "Site"), menu: "main-menu" } },
    { type: "links", settings: { heading: t("Informations", "Information"), menu: "footer" } },
    ...(services || intent.site === "restaurant") && contactFacts.length ? [{ type: "contact", settings: { heading: t("Nous trouver", "Find us"), address: c.contact.address ?? c.contact.area ?? "", phone: c.contact.phone ?? "", email: c.contact.email ?? "", hours: c.contact.hours ?? "" } }] : [],
    ...(shop ? [{ type: "newsletter", settings: { heading: t("Lettre d'information", "Newsletter"), text: "" } }] : []),
  ];
  const footer = { style: art.footer.style, tagline: art.positioning && !TODO.test(art.positioning) ? art.positioning : c.category, show_wordmark: false, show_policies: shop, show_payment: shop, color_scheme: art.footer.scheme };
  return { templates, pages, plan, menus, header, footer, footerBlocks, secondary: services ? url("services") : intent.site === "restaurant" ? url("menu") : intent.site === "saas" ? url("features") : productUrl, hero: heroLayout };
}
