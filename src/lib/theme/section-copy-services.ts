/**
 * Rédaction des sections « Services » (prestations, tarifs, rendez-vous, infos pratiques, équipe,
 * réalisations) et adaptation des sections génériques pour un site d'entreprise de services
 * (ouverture, FAQ, à propos, confiance, avis, chiffres, étapes, appel final, contact) — voir section-content.ts.
 *
 * - Ajout réel : prestations, prix, durées, horaires, zone, adresse et coordonnées viennent du projet
 *   (ctx.services) ; le reste (avis, équipe, réalisations, diplômes, chiffres) en espace réservé court.
 * - Aperçu de la bibliothèque (`ctx.sample`) : exemples réalistes, chacun marqué « Exemple ».
 * - Jamais de vocabulaire de vente en ligne (panier, commande, livraison) pour un service.
 */
import type { ServiceItem } from "../project-types";
import type { ContentContext, CopyFn } from "./section-content";
import { exampleTag, todo, tr } from "./section-content";
import type { SectionSchema } from "./spec";

type Settings = Record<string, unknown>;
type Block = { type: string; settings?: Settings };
type Base = { settings: Settings; blocks?: Block[] };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const p = (s: string) => (s ? `<p>${esc(s)}</p>` : "");
const real = (s?: string | null) => {
  const v = (s ?? "").trim();
  return v && !/^\[/.test(v) && !/\[(À|A) (compléter|définir|préciser)|\[To (complete|define)/i.test(v) ? v : "";
};
const ex = (ctx: ContentContext, s: string) => `${s} · ${exampleTag(ctx)}`;

/** Écrit un réglage seulement s'il est vide ou resté à sa valeur par défaut. */
function writer(schema: SectionSchema, base: Base) {
  const out: Settings = { ...base.settings };
  const set = (id: string, v: unknown) => {
    const d = schema.settings.find((s) => s.id === id);
    if (!d || v === undefined) return;
    const cur = out[id];
    if (cur === undefined || cur === "" || cur === null || cur === d.default) out[id] = v;
  };
  return { out, set };
}
/** Blocs réécrits (médias déjà posés conservés). */
function blocks(base: Base, type: string, items: Settings[]): Block[] {
  const src = base.blocks?.filter((b) => b.type === type) ?? [];
  return items.map((s, i) => ({ type, settings: { ...(src[i]?.settings ?? {}), ...s } }));
}

/* ---------- Données du projet de services ---------- */

const isServices = (ctx: ContentContext) => ctx.business === "services";
function info(ctx: ContentContext) {
  const sv = ctx.services;
  const services = (sv?.services ?? []).filter((s) => real(s.name));
  const mode = sv?.contactMode ?? "form";
  const bookingUrl = /^https?:\/\//i.test(sv?.bookingUrl ?? "") ? sv!.bookingUrl.trim() : "";
  const contactUrl = "/pages/contact";
  const servicesUrl = `/pages/${tr(ctx, "prestations", "services")}`;
  const cta =
    mode === "booking" ? tr(ctx, "Prendre rendez-vous", "Book an appointment") : mode === "quote" ? tr(ctx, "Demander un devis", "Request a quote") : mode === "call" ? tr(ctx, "Nous appeler", "Call us") : tr(ctx, "Nous contacter", "Contact us");
  const embeddable = /calendly\.com|cal\.com|tidycal\.com|zcal\.co|calendar\.google\.com|youcanbook\.me/i.test(bookingUrl);
  return {
    services,
    mode,
    bookingUrl,
    cta,
    ctaUrl: mode === "booking" && bookingUrl && !embeddable ? bookingUrl : contactUrl,
    contactUrl,
    servicesUrl,
    phone: real(sv?.phone),
    email: real(sv?.email),
    hours: real(sv?.hours),
    area: real(sv?.area),
    address: real(sv?.address),
    name: real(ctx.brand?.name) || ctx.shopName,
    activity: real(ctx.product.name),
    summary: real(ctx.product.summary),
    tagline: real(ctx.brand?.tagline),
  };
}

/** Prestations d'exemple (aperçu de la bibliothèque, projet sans prestations saisies). */
function sampleServices(ctx: ContentContext): ServiceItem[] {
  return [
    { name: tr(ctx, "Première consultation", "First consultation"), description: tr(ctx, "Un temps d'échange pour comprendre votre besoin et vous proposer la bonne prestation.", "Time to understand what you need and suggest the right service."), price: tr(ctx, "45 €", "€45"), duration: "45 min" },
    { name: tr(ctx, "Séance complète", "Full session"), description: tr(ctx, "La prestation de référence, adaptée à votre situation.", "Our core service, tailored to you."), price: tr(ctx, "70 €", "€70"), duration: tr(ctx, "1 h", "1 hr") },
    { name: tr(ctx, "Suivi sur mesure", "Tailored follow-up"), description: tr(ctx, "Un accompagnement régulier, au rythme qui vous convient.", "Regular support, at a pace that suits you."), price: tr(ctx, "Sur devis", "On quote"), duration: "" },
  ];
}
function serviceList(ctx: ContentContext) {
  const d = info(ctx);
  if (d.services.length) return { list: d.services, sample: false };
  return ctx.sample ? { list: sampleServices(ctx).map((s) => ({ ...s, name: ex(ctx, s.name) })), sample: true } : { list: [] as ServiceItem[], sample: false };
}

const steps = (ctx: ContentContext) => {
  const { mode } = info(ctx);
  if (mode === "quote")
    return [
      [tr(ctx, "Décrivez votre projet", "Describe your project"), tr(ctx, "Quelques lignes suffisent : le besoin, le lieu, vos contraintes.", "A few lines are enough: what you need, where, any constraints.")],
      [tr(ctx, "Recevez votre devis", "Get your quote"), tr(ctx, "Une proposition détaillée, établie d'après votre demande.", "A detailed proposal based on your request.")],
      [tr(ctx, "Nous réalisons", "We get it done"), tr(ctx, "Le travail est réalisé selon ce qui a été convenu ensemble.", "The work is carried out as agreed together.")],
    ];
  if (mode === "booking")
    return [
      [tr(ctx, "Réservez votre créneau", "Book your slot"), tr(ctx, "Indiquez la prestation et le moment qui vous conviennent.", "Choose the service and the time that suit you.")],
      [tr(ctx, "Faisons connaissance", "Let's get to know each other"), tr(ctx, "Nous prenons le temps de comprendre votre besoin avant de commencer.", "We take the time to understand what you need before we start.")],
      [tr(ctx, "Votre rendez-vous", "Your appointment"), tr(ctx, "La prestation choisie, réalisée avec soin.", "The service you chose, carried out with care.")],
    ];
  return [
    [mode === "call" ? tr(ctx, "Appelez-nous", "Give us a call") : tr(ctx, "Écrivez-nous", "Write to us"), tr(ctx, "Expliquez-nous simplement ce dont vous avez besoin.", "Simply tell us what you need.")],
    [tr(ctx, "Nous convenons ensemble", "We agree on the details"), tr(ctx, "La prestation, le moment et les conditions, en toute clarté.", "The service, the timing and the terms, clearly set out.")],
    [tr(ctx, "Nous nous occupons de tout", "We take care of it"), tr(ctx, "Vous profitez du résultat.", "You enjoy the result.")],
  ];
};

/* ---------- Nouvelles sections « Services » ---------- */

const ICONS = ["sparkle", "hand", "heart", "shield", "leaf", "star", "check", "bolt"];

const servicesList: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const { out, set } = writer(schema, base);
  const { list, sample } = serviceList(ctx);
  set("button_label", d.cta);
  set("button_link", d.ctaUrl);
  set("highlight_label", "");
  if (!list.length) return { settings: out, blocks: base.blocks };
  return {
    settings: out,
    blocks: blocks(base, "service", list.slice(0, 12).map((s, i) => ({ title: s.name, text: p(s.description), price: s.price ?? "", duration: s.duration ?? "", icon: ICONS[i % ICONS.length], highlight: false }))),
    samples: sample,
  };
};

const pricing: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const { out, set } = writer(schema, base);
  set("button_label", d.cta);
  set("button_link", d.ctaUrl);
  const priced = d.services.filter((s) => real(s.price));
  if (priced.length >= 2) return { settings: out, blocks: blocks(base, "plan", priced.slice(0, 4).map((s) => ({ name: s.name, description: s.description.slice(0, 110), price: s.price, period: s.duration ? `· ${s.duration}` : "", features: "", featured: false }))) };
  if (!ctx.sample) return { settings: out, blocks: base.blocks };
  const plans = [
    [tr(ctx, "Essentiel", "Essential"), tr(ctx, "Pour découvrir", "To get started"), tr(ctx, "45 €", "€45"), tr(ctx, "/ séance", "/ session"), tr(ctx, "Une séance\nBilan personnalisé", "One session\nPersonal assessment"), false],
    [tr(ctx, "Suivi", "Follow-up"), tr(ctx, "Le plus complet", "The most complete"), tr(ctx, "190 €", "€190"), tr(ctx, "/ 5 séances", "/ 5 sessions"), tr(ctx, "Cinq séances\nBilan personnalisé\nConseils entre les séances", "Five sessions\nPersonal assessment\nAdvice between sessions"), true],
    [tr(ctx, "Sur mesure", "Tailored"), tr(ctx, "Pour les besoins particuliers", "For specific needs"), "", "", tr(ctx, "Programme adapté\nHoraires aménagés", "Custom programme\nFlexible hours"), false],
  ] as const;
  return { settings: out, blocks: blocks(base, "plan", plans.map(([name, description, price, period, features, featured]) => ({ name: ex(ctx, name), description, price, period, features, featured, badge: tr(ctx, "Recommandée", "Recommended") }))), samples: true };
};

const booking: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const { out, set } = writer(schema, base);
  const { list } = serviceList(ctx);
  if (d.mode === "quote") {
    set("eyebrow", tr(ctx, "Devis", "Quote"));
    set("heading", tr(ctx, "Demander un devis", "Request a quote"));
    set("text", p(tr(ctx, "Décrivez votre projet : nous revenons vers vous avec une proposition détaillée.", "Describe your project and we will come back to you with a detailed proposal.")));
    set("button_label", tr(ctx, "Envoyer ma demande", "Send my request"));
    set("ask_date", false);
  }
  if (d.mode === "booking" && d.bookingUrl) set("booking_url", d.bookingUrl);
  set("services", list.map((s) => s.name).join("\n"));
  set("phone", d.phone);
  set("email", d.email);
  return { settings: out, blocks: base.blocks?.length ? base.blocks : steps(ctx).map(([title, text]) => ({ type: "step", settings: { title, text } })) };
};

const practicalInfo: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const { out, set } = writer(schema, base);
  let samples = false;
  if (d.hours) set("hours", d.hours);
  else if (ctx.sample) {
    set("hours", tr(ctx, "Lundi – vendredi : 9 h – 19 h\nSamedi : 9 h – 13 h\nDimanche : fermé", "Monday – Friday: 9am – 7pm\nSaturday: 9am – 1pm\nSunday: closed"));
    set("hours_note", exampleTag(ctx));
    samples = true;
  }
  if (d.address) {
    set("address", d.address);
    set("map", "google");
  } else if (ctx.sample) {
    set("address", ex(ctx, tr(ctx, "8 place des Halles, 69002 Lyon", "8 Market Square, Bath BA1 1AA")));
    samples = true;
  }
  set("area", d.area);
  set("phone", d.phone || (ctx.sample ? ex(ctx, tr(ctx, "04 00 00 00 00", "01234 000000")) : ""));
  set("email", d.email);
  if (isServices(ctx)) {
    set("button_label", d.cta);
    set("button_link", d.ctaUrl);
  }
  return { settings: out, blocks: base.blocks, samples: samples || (!d.phone && ctx.sample) };
};

const team: CopyFn = (ctx, base, schema) => {
  const { out } = writer(schema, base);
  if (!ctx.sample) return { settings: out, blocks: base.blocks };
  const people = [
    [tr(ctx, "Camille Martin", "Camille Martin"), tr(ctx, "Fondatrice", "Founder"), tr(ctx, "Accueille chaque nouveau client et coordonne l'équipe.", "Welcomes every new client and leads the team.")],
    [tr(ctx, "Julien Moreau", "Julien Moreau"), tr(ctx, "Praticien", "Practitioner"), tr(ctx, "Prend en charge les prestations sur mesure.", "Looks after tailored services.")],
    [tr(ctx, "Inès Robert", "Inès Robert"), tr(ctx, "Accueil et rendez-vous", "Front desk and bookings"), tr(ctx, "Répond à vos questions et organise votre venue.", "Answers your questions and arranges your visit.")],
  ];
  return { settings: out, blocks: blocks(base, "member", people.map(([name, role, bio]) => ({ name: ex(ctx, name), role, bio: p(bio) }))), samples: true };
};

const portfolio: CopyFn = (ctx, base, schema) => {
  const { out } = writer(schema, base);
  if (!ctx.sample) return { settings: out, blocks: base.blocks };
  const items = [
    [tr(ctx, "Rénovation d'une cuisine", "Kitchen renovation"), tr(ctx, "Lyon 3e · trois semaines", "Three weeks"), tr(ctx, "Rénovation", "Renovation")],
    [tr(ctx, "Aménagement d'un bureau", "Office fit-out"), tr(ctx, "Villeurbanne · dix jours", "Ten days"), tr(ctx, "Aménagement", "Fit-out")],
    [tr(ctx, "Salle de bains", "Bathroom"), tr(ctx, "Caluire · deux semaines", "Two weeks"), tr(ctx, "Rénovation", "Renovation")],
  ];
  return { settings: out, blocks: blocks(base, "project", items.map(([title, caption, tag]) => ({ title: ex(ctx, title), caption, tag }))), samples: true };
};

export const COPY: Record<string, CopyFn> = {
  "services-list": servicesList,
  pricing,
  booking,
  "practical-info": practicalInfo,
  team,
  portfolio,
};

/* ---------- Sections génériques, site de services ---------- */

/** Ouvertures : activité, signature et appel à l'action du mode de contact (jamais « Acheter »). */
const hero: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const { out, set } = writer(schema, base);
  const heading = d.tagline || d.activity || d.name;
  set("eyebrow", d.activity && d.activity !== heading ? d.activity : d.area);
  set("heading", heading);
  if (schema.settings.some((s) => s.id === "heading_line1")) {
    const words = heading.split(/\s+/);
    const cut = Math.max(1, Math.ceil(words.length / 2));
    set("heading_line1", words.slice(0, cut).join(" "));
    set("heading_line2", words.slice(cut).join(" "));
  }
  set("text", p(d.summary || todo(ctx, "votre activité en une phrase", "your business in one sentence")));
  set("button_label", d.cta);
  set("button_link", d.ctaUrl);
  set("button2_label", tr(ctx, "Nos prestations", "Our services"));
  set("button2_link", d.servicesUrl);
  return { settings: out, blocks: base.blocks };
};

const faq: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const { out, set } = writer(schema, base);
  set("heading", tr(ctx, "Questions fréquentes", "Frequently asked questions"));
  set("button_label", d.cta);
  set("button_link", d.ctaUrl);
  const priced = d.services.some((s) => real(s.price));
  const items: [string, string][] = [
    [d.mode === "quote" ? tr(ctx, "Comment obtenir un devis ?", "How do I get a quote?") : d.mode === "booking" ? tr(ctx, "Comment prendre rendez-vous ?", "How do I book?") : tr(ctx, "Comment vous joindre ?", "How can I reach you?"),
      d.mode === "booking" && d.bookingUrl ? tr(ctx, "Directement en ligne, depuis la page Rendez-vous.", "Online, from the booking page.") : d.phone ? tr(ctx, `Par téléphone au ${d.phone}, ou via la page Contact.`, `By phone on ${d.phone}, or from the contact page.`) : tr(ctx, "Via le formulaire de la page Contact.", "With the form on the contact page.")],
    [tr(ctx, "Où intervenez-vous ?", "Where do you work?"), d.area || d.address || todo(ctx, "zone d'intervention ou adresse", "service area or address")],
    [tr(ctx, "Quels sont vos horaires ?", "What are your opening hours?"), d.hours ? d.hours.replace(/\n+/g, " · ") : todo(ctx, "vos horaires", "your opening hours")],
    [tr(ctx, "Quels sont vos tarifs ?", "What are your prices?"), priced ? tr(ctx, "Le tarif de chaque prestation est indiqué sur la page Prestations.", "Each service's price is listed on the services page.") : todo(ctx, "vos tarifs ou leur mode de calcul", "your prices or how they are set")],
  ];
  return { settings: out, blocks: blocks(base, "question", items.map(([question, answer]) => ({ question, answer: p(answer) }))) };
};

const about: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const { out, set } = writer(schema, base);
  set("lead", p(d.summary || todo(ctx, "qui vous êtes et ce que vous faites", "who you are and what you do")));
  set("button_label", tr(ctx, "Découvrir nos prestations", "Discover our services"));
  set("button_link", d.servicesUrl);
  return { settings: out, blocks: base.blocks };
};

/** Confiance / réassurance : uniquement des informations réelles (zone, horaires, contact), sinon espaces réservés. */
const trustItems = (ctx: ContentContext) => {
  const d = info(ctx);
  return [
    { icon: "globe", title: d.area ? tr(ctx, "Zone d'intervention", "Service area") : tr(ctx, "Adresse", "Address"), text: d.area || d.address.replace(/\n+/g, ", ") || todo(ctx, "zone ou adresse", "area or address") },
    { icon: "clock", title: tr(ctx, "Horaires", "Opening hours"), text: d.hours.replace(/\n+/g, " · ") || todo(ctx, "horaires", "hours") },
    { icon: "chat", title: d.cta, text: d.phone || d.email || tr(ctx, "Depuis la page Contact", "From the contact page") },
  ];
};
const trustBar: CopyFn = (ctx, base, schema) => {
  const { out } = writer(schema, base);
  return { settings: out, blocks: blocks(base, "item", trustItems(ctx)) };
};
const reassurance: CopyFn = (ctx, base, schema) => {
  const { out, set } = writer(schema, base);
  set("eyebrow", tr(ctx, "En pratique", "In practice"));
  set("heading", tr(ctx, "Simple,", "Simple,"));
  set("heading_accent", tr(ctx, "de la prise de contact au résultat.", "from first contact to result."));
  return { settings: out, blocks: blocks(base, "card", trustItems(ctx).map((x) => ({ icon: x.icon === "globe" ? "globe" : x.icon, title: x.title, text: p(x.text) }))) };
};

const testimonials: CopyFn = (ctx, base, schema) => {
  const { out, set } = writer(schema, base);
  set("heading", tr(ctx, "Ils nous ont fait confiance", "What our clients say"));
  if (ctx.sample) {
    const r = [
      [tr(ctx, "Accueil chaleureux et explications claires : je recommande sans hésiter.", "A warm welcome and clear explanations: I recommend them without hesitation."), "Claire"],
      [tr(ctx, "Ponctuels, à l'écoute et un résultat à la hauteur.", "On time, attentive, and the result lived up to it."), "Marc"],
      [tr(ctx, "Prise de rendez-vous facile, prestation soignée.", "Easy to book, careful work."), "Sofia"],
    ];
    return { settings: out, blocks: blocks(base, "review", r.map(([quote, author]) => ({ quote, author: `${author} · ${exampleTag(ctx)}`, detail: "", rating: "5" }))), samples: true };
  }
  return { settings: out, blocks: blocks(base, "review", [0, 1, 2].map(() => ({ quote: todo(ctx, "avis réel d'un client, avec son accord", "a real client review, with their consent"), author: todo(ctx, "prénom", "first name"), detail: todo(ctx, "prestation", "service"), rating: "0" }))) };
};

/** Chiffres clés : seulement des valeurs réelles du projet (nombre de prestations, durée), sinon espaces réservés. */
const stats: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const { out, set } = writer(schema, base);
  set("heading", tr(ctx, "En quelques chiffres", "At a glance"));
  const items: Settings[] = [];
  if (d.services.length >= 2) items.push({ value: String(d.services.length), label: tr(ctx, "prestations proposées", "services offered") });
  while (items.length < 3) items.push(ctx.sample ? { value: ["12", "4,9/5", "2009"][items.length], label: ex(ctx, [tr(ctx, "ans d'expérience", "years of experience"), tr(ctx, "note moyenne", "average rating"), tr(ctx, "année de création", "year founded")][items.length]) } : { value: todo(ctx, "chiffre vérifié", "verified figure"), label: todo(ctx, "ce qu'il mesure", "what it measures") });
  return { settings: out, blocks: blocks(base, "stat", items), samples: ctx.sample };
};

/** Étapes (frise, mode d'emploi, étapes au défilement) : le déroulement d'une prestation. */
const stepsFn = (blockType: string, extra: (i: number) => Settings = () => ({})): CopyFn => (ctx, base, schema) => {
  const d = info(ctx);
  const { out, set } = writer(schema, base);
  set("eyebrow", tr(ctx, "Notre méthode", "Our approach"));
  set("heading", tr(ctx, "Comment ça se passe", "How it works"));
  set("heading_accent", "");
  set("button_label", d.cta);
  set("button_link", d.ctaUrl);
  return { settings: out, blocks: blocks(base, blockType, steps(ctx).map(([title, text], i) => ({ title, text: p(text), ...extra(i) }))) };
};

const ctaBanner: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const { out, set } = writer(schema, base);
  set("heading", d.mode === "quote" ? tr(ctx, "Un projet ? Parlons-en.", "Got a project? Let's talk.") : d.mode === "booking" ? tr(ctx, "Prêt à prendre rendez-vous ?", "Ready to book?") : tr(ctx, "Parlons de votre besoin", "Let's talk about what you need"));
  set("text", p(d.phone ? tr(ctx, `Ou appelez-nous au ${d.phone}.`, `Or call us on ${d.phone}.`) : ""));
  set("button_label", d.cta);
  set("button_link", d.ctaUrl);
  return { settings: out, blocks: base.blocks };
};

const contactForm: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const { out, set } = writer(schema, base);
  set("heading", d.mode === "quote" ? tr(ctx, "Décrivez votre projet", "Tell us about your project") : tr(ctx, "Écrivez-nous", "Write to us"));
  set("text", p(tr(ctx, "Un besoin, une question : laissez-nous un message, nous vous répondons.", "A need or a question: leave us a message and we will reply.")));
  set("email", d.email);
  set("hours", d.hours.replace(/\n+/g, " · "));
  return { settings: out, blocks: base.blocks };
};

/** Rédactions qui remplacent celles des boutiques de produits quand le projet est une entreprise de services. */
export const SERVICE_COPY: Record<string, CopyFn> = {
  hero,
  "hero-split": hero,
  "hero-fullbleed": hero,
  "hero-editorial": hero,
  faq,
  about,
  "trust-bar": trustBar,
  reassurance,
  testimonials,
  stats,
  timeline: stepsFn("step"),
  "how-to": stepsFn("step", () => ({ duration: "", tip: "" })),
  "scroll-steps": stepsFn("step"),
  "cta-banner": ctaBanner,
  "contact-form": contactForm,
};
