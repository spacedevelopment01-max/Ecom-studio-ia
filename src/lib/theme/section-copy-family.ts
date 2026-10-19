/**
 * Rédaction des sections de bibliothèque par famille (fs-*, issue #141) à partir du projet : nom, marque, produit,
 * faits confirmés, collections, prestations, coordonnées. Rien n'est repris d'une démonstration (FRAISE, ONDE, ORBE,
 * Atelier Rive) et rien n'est inventé sur un vrai site : ce qu'on ne connaît pas reste « [À compléter : …] ».
 * Dans l'aperçu de la galerie (ctx.sample), des contenus d'exemple montrent la mise en page ; chacun porte la mention
 * « Exemple » et le studio affiche le bandeau « Contenus d'exemple » (jamais enregistrés ni exportés).
 */
import type { CopyFn, ContentContext } from "./section-content";
import { exampleTag, todo, tr } from "./section-content";

type Blocks = { type: string; settings?: Record<string, unknown> }[];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const html = (s: string) => (s.trim() ? `<p>${esc(s.trim())}</p>` : "");
const real = (s: string | undefined | null): s is string => !!s && !!s.trim() && !s.includes("[");
const fill = (settings: Record<string, unknown>, values: Record<string, unknown>) => {
  const out = { ...settings };
  for (const [k, v] of Object.entries(values)) if (out[k] === undefined || out[k] === "" || out[k] === null) out[k] = v;
  return out;
};
const has = (b?: Blocks) => !!b?.some((x) => Object.values(x.settings ?? {}).some((v) => typeof v === "string" && v.trim()));
/** Libellé d'exemple (aperçu seulement). */
const ex = (ctx: ContentContext, fr: string, en: string) => `${tr(ctx, fr, en)} · ${exampleTag(ctx)}`;
const productLink = (ctx: ContentContext) => (ctx.product.handle ? `/products/${ctx.product.handle}` : "/collections/all");
const name = (ctx: ContentContext) => ctx.product.name || ctx.shopName;
const services = (ctx: ContentContext) => (ctx.services?.services ?? []).filter((s) => real(s.name));
const contactLink = (ctx: ContentContext) => (real(ctx.services?.bookingUrl) ? ctx.services.bookingUrl : "/pages/contact");
/** Images du projet pour les exemples d'aperçu (une différente par élément, aucune image de démonstration étrangère). */
const pool = (ctx: ContentContext) => [...new Set([...(ctx.mediaFiles ?? []), ...(ctx.galleryFiles ?? [])])].filter((f) => /\.(webp|jpe?g|png|avif)$/i.test(f) && !/logo|favicon/i.test(f));
const pic = (ctx: ContentContext, i: number) => { const p = pool(ctx); return p.length ? p[i % p.length] : ""; };
const fact = (ctx: ContentContext, re: RegExp) => ctx.product.facts.find((f) => re.test(f.label.toLowerCase()))?.value ?? "";

/** Produit : la section, ses textes et ses éléments (réels, sinon un seul élément à compléter, sinon l'exemple). */
const make = (head: (ctx: ContentContext) => Record<string, unknown>, blocks: (ctx: ContentContext) => { real: Blocks; sample: Blocks; todo: Blocks }): CopyFn => (ctx, base) => {
  const b = blocks(ctx);
  const own = has(base.blocks) ? base.blocks! : b.real.length ? b.real : ctx.sample ? b.sample : b.todo;
  return { settings: fill(base.settings, head(ctx)), blocks: own, samples: ctx.sample && !has(base.blocks) && !b.real.length && b.sample.length > 0 };
};

const video = make(
  (ctx) => ({ eyebrow: tr(ctx, "En vidéo", "On video"), heading: tr(ctx, `${name(ctx)} en mouvement`, `${name(ctx)} in motion`), text: html(ctx.product.summary), media_role: tr(ctx, "Vidéo de démonstration du produit", "Product demo video"), caption: "" }),
  (ctx) => ({ real: [], todo: [], sample: [["0:04", "Ouverture", "Opening"], ["0:12", "Utilisation", "In use"], ["0:24", "Le résultat", "The result"]].map(([time, fr, en]) => ({ type: "point", settings: { time, title: ex(ctx, fr, en), text: "" } })) }),
);

const results = make(
  (ctx) => ({ eyebrow: tr(ctx, "Résultats", "Results"), heading: tr(ctx, "Ce qui est mesuré", "What is measured"), text: "", method: ctx.sample ? html(tr(ctx, "Exemple : méthode, nombre de personnes et date de la mesure.", "Example: method, number of people and date of the measurement.")) : html(todo(ctx, "méthode, source et date de chaque mesure", "method, source and date of each measure")) }),
  (ctx) => ({
    real: [],
    todo: [{ type: "measure", settings: { value: todo(ctx, "valeur mesurée", "measured value"), unit: "", label: todo(ctx, "ce qui est mesuré", "what is measured"), source: "" } }],
    sample: [["92", "%", "des personnes interrogées", "of people surveyed"], ["4", "sem.", "d'utilisation", "of use"], ["3", "×", "par jour", "a day"]].map(([value, unit, fr, en]) => ({ type: "measure", settings: { value, unit, label: tr(ctx, fr, en), source: exampleTag(ctx) } })),
  }),
);

const press = make(
  (ctx) => ({ eyebrow: tr(ctx, "Ils en parlent", "In the press"), heading: tr(ctx, "Revue de presse", "Press"), note: ctx.sample ? "" : "" }),
  (ctx) => ({
    real: [],
    todo: [{ type: "mention", settings: { outlet: todo(ctx, "nom du média", "outlet name"), quote: todo(ctx, "citation exacte et datée", "exact, dated quote"), date_text: "" } }],
    sample: ["Magazine", "Journal", "Podcast"].map((o, i) => ({ type: "mention", settings: { outlet: ex(ctx, o, o), quote: tr(ctx, ["Une citation courte et exacte, avec sa date.", "Le passage de l'article qui parle du produit.", "Ce qui a été dit, mot pour mot."][i], ["A short, exact quote with its date.", "The passage of the article about the product.", "What was said, word for word."][i]), date_text: "" } })),
  }),
);

const making = make(
  (ctx) => ({ eyebrow: tr(ctx, "Savoir-faire", "Craft"), heading: tr(ctx, `Comment naît ${name(ctx)}`, `How ${name(ctx)} is made`), text: real(ctx.brand?.story) ? html(ctx.brand!.story) : "", media_role: tr(ctx, "Photo de fabrication ou d'atelier", "Making or workshop photo") }),
  (ctx) => ({
    real: [],
    todo: [{ type: "step", settings: { tag: "", title: todo(ctx, "une étape réelle de fabrication", "a real making step"), text: "" } }],
    sample: [["Sélection", "Selection"], ["Fabrication", "Making"], ["Contrôle", "Quality check"], ["Expédition", "Shipping"]].map(([fr, en]) => ({ type: "step", settings: { tag: exampleTag(ctx), title: tr(ctx, fr, en), text: html(tr(ctx, "Ce qui se passe à cette étape, en une ou deux phrases.", "What happens at this step, in one or two sentences.")) } })),
  }),
);

const products: CopyFn = (ctx, base) => {
  const own = ctx.products.filter((p) => real(p.handle));
  const list = (own.length ? own : ctx.product.handle ? [{ title: ctx.product.name, handle: ctx.product.handle }] : []).slice(0, 4);
  return {
    settings: fill(base.settings, { eyebrow: ctx.business === "products" && ctx.products.length <= 1 ? tr(ctx, "À associer", "Goes well with") : tr(ctx, "La sélection", "The selection"), heading: tr(ctx, "Nos produits", "Our products"), ...(list.length ? {} : { source: "newest" }) }),
    blocks: has(base.blocks) ? base.blocks : list.map((p) => ({ type: "product", settings: { product: p.handle, note: "" } })),
    samples: false,
  };
};

const ICONS = ["truck", "return", "chat", "shield", "leaf", "clock"];
const commitments = make(
  (ctx) => ({ eyebrow: tr(ctx, "Nos engagements", "Our commitments"), heading: tr(ctx, `Ce que ${ctx.shopName} garantit`, `What ${ctx.shopName} guarantees`) }),
  (ctx) => ({
    real: (ctx.brand?.values ?? []).filter((v) => real(v.title)).slice(0, 4).map((v, i) => ({ type: "item", settings: { icon: ICONS[(i + 3) % ICONS.length], title: v.title, text: real(v.text) ? html(v.text) : "", proof_label: "", proof_link: "" } })),
    todo: (ctx.business === "services" ? [["clock", "délai d'intervention", "response time"], ["shield", "garantie et assurance", "guarantee and insurance"], ["chat", "suivi du chantier", "project follow-up"]] : [["truck", "délai et frais de livraison", "delivery time and cost"], ["return", "conditions de retour", "return conditions"], ["chat", "assistance", "support"]]).map(([icon, fr, en]) => ({ type: "item", settings: { icon, title: todo(ctx, fr, en), text: "", proof_label: "", proof_link: "" } })),
    sample: (ctx.business === "services" ? [["clock", "Intervention rapide", "Quick response"], ["shield", "Travail garanti", "Guaranteed work"], ["chat", "Un interlocuteur unique", "One contact person"]] : [["truck", "Livraison suivie", "Tracked delivery"], ["return", "Retours simples", "Easy returns"], ["chat", "Une équipe qui répond", "A team that answers"]]).map(([icon, fr, en]) => ({ type: "item", settings: { icon, title: tr(ctx, fr, en), text: html(ex(ctx, "Condition précise et vérifiable", "Precise, verifiable condition")), proof_label: "", proof_link: "" } })),
  }),
);

const collections = make(
  (ctx) => ({ eyebrow: tr(ctx, "Collections", "Collections"), heading: tr(ctx, "Explorer la boutique", "Explore the store") }),
  (ctx) => ({
    real: ctx.collections.slice(0, 6).map((c) => ({ type: "collection", settings: { collection: c.handle, title: c.title, text: "", link: `/collections/${c.handle}` } })),
    todo: [{ type: "collection", settings: { title: todo(ctx, "nom d'une collection", "a collection name"), text: "", link: "/collections/all" } }],
    sample: [["Nouveautés", "New in"], ["Essentiels", "Essentials"], ["Pièces rares", "Rare pieces"], ["Cadeaux", "Gifts"]].map(([fr, en], i) => ({ type: "collection", settings: { title: ex(ctx, fr, en), text: "", link: "/collections/all", image_asset: pic(ctx, i) } })),
  }),
);

const POS = [[28, 62], [58, 38], [78, 70], [44, 82]];
const lookbook = make(
  (ctx) => ({ eyebrow: tr(ctx, "Ambiance", "Lookbook"), heading: tr(ctx, "Chez vous", "At home"), media_role: tr(ctx, "Photo d'ambiance où les produits sont visibles", "Lifestyle photo showing the products"), link_label: tr(ctx, "Voir le produit", "View product") }),
  (ctx) => ({
    real: (ctx.products.some((p) => real(p.handle)) ? ctx.products.filter((p) => real(p.handle)) : ctx.product.handle ? [{ title: ctx.product.name, handle: ctx.product.handle }] : []).slice(0, 3).map((p, i) => ({ type: "marker", settings: { product: p.handle, title: p.title, price_text: "", link: `/products/${p.handle}`, x: POS[i][0], y: POS[i][1] } })),
    todo: [{ type: "marker", settings: { title: todo(ctx, "produit visible sur la photo", "product shown in the photo"), x: 50, y: 50 } }],
    sample: [0, 1, 2].map((i) => ({ type: "marker", settings: { title: ex(ctx, `Produit ${i + 1}`, `Product ${i + 1}`), price_text: "", link: "/collections/all", x: POS[i][0], y: POS[i][1] } })),
  }),
);

const dimensions = make(
  (ctx) => ({ eyebrow: tr(ctx, "Dimensions", "Dimensions"), heading: tr(ctx, "Les bonnes mesures", "The right size"), note: ctx.sample ? ex(ctx, "Mesures indicatives", "Indicative measurements") : real(fact(ctx, /hauteur|height|largeur|width|dimension/)) ? "" : todo(ctx, "dimensions exactes de chaque format", "exact dimensions of each size"), media_role: tr(ctx, "Photo du produit de face", "Front photo of the product") }),
  (ctx) => {
    const h = fact(ctx, /hauteur|height/), w = fact(ctx, /largeur|width/), dp = fact(ctx, /profondeur|depth|diamètre|diameter/);
    return {
      real: h || w || dp ? [{ type: "size", settings: { title: name(ctx), height: h, width: w, depth: dp, weight_text: fact(ctx, /poids|weight/), note: "" } }] : [],
      todo: [{ type: "size", settings: { title: name(ctx), height: "", width: "", depth: "", weight_text: "", note: "" } }],
      sample: [["Petit", "Small", "32", "18", "18"], ["Moyen", "Medium", "48", "26", "26"], ["Grand", "Large", "64", "34", "34"]].map(([fr, en, height, width, depth]) => ({ type: "size", settings: { title: ex(ctx, fr, en), height, width, depth, weight_text: "", note: "" } })),
    };
  },
);

const care = make(
  (ctx) => ({ eyebrow: tr(ctx, "Entretien", "Care"), heading: tr(ctx, `Prendre soin de ${name(ctx)}`, `Caring for ${name(ctx)}`) }),
  (ctx) => ({
    real: [],
    todo: [{ type: "tip", settings: { icon: "check", title: todo(ctx, "un conseil d'entretien réel", "a real care tip"), text: "" } }, { type: "avoid", settings: { title: todo(ctx, "un geste à éviter", "something to avoid"), text: "" } }],
    sample: [
      { type: "tip", settings: { icon: "drop", title: ex(ctx, "Nettoyer avec un chiffon doux", "Clean with a soft cloth"), text: "" } },
      { type: "tip", settings: { icon: "sun", title: ex(ctx, "Tenir à l'abri du soleil direct", "Keep out of direct sunlight"), text: "" } },
      { type: "tip", settings: { icon: "tool", title: ex(ctx, "Resserrer les fixations une fois par an", "Tighten fittings once a year"), text: "" } },
      { type: "avoid", settings: { title: ex(ctx, "Produits abrasifs", "Abrasive cleaners"), text: "" } },
      { type: "avoid", settings: { title: ex(ctx, "Eau stagnante", "Standing water"), text: "" } },
    ],
  }),
);

const campaign: CopyFn = (ctx, base) => ({
  settings: fill(base.settings, ctx.sample
    ? { label: ex(ctx, "Campagne", "Campaign"), offer_title: tr(ctx, "Le titre de votre campagne", "Your campaign title"), offer_text: html(tr(ctx, "Ce que la campagne met en avant, en une phrase.", "What the campaign features, in one sentence.")), period_text: ex(ctx, "Période de la campagne", "Campaign period"), conditions: ex(ctx, "Conditions écrites de l'offre", "Written offer terms"), cta_label: tr(ctx, "Découvrir", "Discover"), cta_link: "/collections/all", media_role: tr(ctx, "Visuel de campagne", "Campaign visual") }
    : { label: "", offer_title: todo(ctx, "nom de la campagne", "campaign name"), offer_text: "", period_text: todo(ctx, "dates de la campagne", "campaign dates"), conditions: todo(ctx, "conditions de l'offre", "offer terms"), cta_label: tr(ctx, "Découvrir", "Discover"), cta_link: "/collections/all", media_role: tr(ctx, "Visuel de campagne", "Campaign visual") }),
  blocks: base.blocks,
  samples: ctx.sample,
});

const reviews = make(
  (ctx) => ({ eyebrow: tr(ctx, "Avis", "Reviews"), heading: ctx.business === "services" ? tr(ctx, "Ils nous ont fait confiance", "They trusted us") : tr(ctx, "Ce qu'en disent nos clients", "What customers say"), text: ctx.sample ? "" : html(todo(ctx, "vos avis clients réels, ou connectez une application d'avis", "your real customer reviews, or connect a reviews app")), rating_text: "" }),
  (ctx) => ({
    real: [],
    todo: [],
    sample: [0, 1, 2].map((i) => ({ type: "review", settings: { rating: 0, title: "", quote: html(tr(ctx, ["Un avis réel, court et précis, sur ce qui a plu.", "Ce que le client a remarqué en premier.", "Le détail qui a fait la différence."][i], ["A real, short and precise review of what they liked.", "What the customer noticed first.", "The detail that made the difference."][i])), author: ex(ctx, "Prénom", "First name"), detail: "", date_text: "" } })),
  }),
);

const journal = make(
  (ctx) => ({ eyebrow: tr(ctx, "Journal", "Journal"), heading: ctx.business === "services" ? tr(ctx, "Actualités et conseils", "News and advice") : tr(ctx, "Le journal", "The journal"), link_label: tr(ctx, "Lire", "Read") }),
  (ctx) => ({
    real: [],
    todo: [],
    sample: [["Coulisses", "Behind the scenes"], ["Conseils", "Advice"], ["Nouveautés", "New"]].map(([fr, en], i) => ({ type: "article", settings: { image_asset: pic(ctx, i + 1), title: ex(ctx, `Titre d'article : ${fr.toLowerCase()}`, `Article title: ${en.toLowerCase()}`), text: html(tr(ctx, "Deux lignes de résumé pour donner envie de lire.", "Two lines of summary to make people want to read.")), tag: tr(ctx, fr, en), date_text: "", link: "#" } })),
  }),
);

const stores: CopyFn = (ctx, base) => {
  const s = ctx.services;
  const channels: Blocks = [
    ...(real(s?.email) ? [{ type: "channel", settings: { icon: "mail", title: tr(ctx, "Par courriel", "By email"), text: html(s.email), delay_text: "", link_label: tr(ctx, "Nous écrire", "Write to us"), link: `mailto:${s.email}` } }] : []),
    ...(real(s?.phone) ? [{ type: "channel", settings: { icon: "phone", title: tr(ctx, "Par téléphone", "By phone"), text: html(s.phone), delay_text: real(s.hours) ? s.hours : "", link_label: tr(ctx, "Appeler", "Call"), link: `tel:${s.phone.replace(/\s/g, "")}` } }] : []),
  ];
  const store: Blocks = real(s?.address) ? [{ type: "store", settings: { title: ctx.shopName, address: s.address, hours: real(s.hours) ? s.hours : "", phone: real(s.phone) ? s.phone : "", link_label: tr(ctx, "Itinéraire", "Directions"), link: `https://www.openstreetmap.org/search?query=${encodeURIComponent(s.address)}` } }] : [];
  const layout = String(base.settings.layout ?? "stores");
  const own = layout === "channels" ? channels : store;
  const sample: Blocks = layout === "channels"
    ? [["mail", "Par courriel", "By email"], ["phone", "Par téléphone", "By phone"], ["chat", "Par messagerie", "By chat"]].map(([icon, fr, en]) => ({ type: "channel", settings: { icon, title: tr(ctx, fr, en), text: "", delay_text: ex(ctx, "Délai de réponse", "Response time"), link_label: "", link: "" } }))
    : [["Boutique du centre", "City store"], ["Atelier", "Workshop"]].map(([fr, en]) => ({ type: "store", settings: { title: ex(ctx, fr, en), address: tr(ctx, "Adresse", "Address"), hours: tr(ctx, "Horaires", "Opening hours"), phone: "", link_label: "", link: "" } }));
  const todoB: Blocks = layout === "channels" ? [{ type: "channel", settings: { icon: "mail", title: todo(ctx, "canal de contact", "contact channel"), text: "", delay_text: "", link_label: "", link: "" } }] : [{ type: "store", settings: { title: todo(ctx, "nom du point de vente", "store name"), address: "", hours: "", phone: "", link_label: "", link: "" } }];
  return {
    settings: fill(base.settings, { eyebrow: tr(ctx, "Nous trouver", "Find us"), heading: layout === "channels" ? tr(ctx, "Une question ? Écrivez-nous", "A question? Get in touch") : tr(ctx, "Nos adresses", "Our stores") }),
    blocks: has(base.blocks) ? base.blocks : own.length ? own : ctx.sample ? sample : todoB,
    samples: ctx.sample && !own.length && !has(base.blocks),
  };
};

const service: CopyFn = (ctx, base) => {
  const sv = services(ctx)[0];
  const sample = ctx.sample && !sv;
  const item = (type: string, fr: string, en: string) => ({ type, settings: { text: sample ? ex(ctx, fr, en) : todo(ctx, fr.toLowerCase(), en.toLowerCase()) } });
  return {
    settings: fill(base.settings, {
      eyebrow: tr(ctx, "Prestation", "Service"),
      heading: sv?.name ?? (sample ? ex(ctx, "Nom de la prestation", "Service name") : todo(ctx, "nom de la prestation", "service name")),
      text: real(sv?.description) ? html(sv!.description) : "",
      price_text: real(sv?.price) ? sv!.price : "", duration_text: real(sv?.duration) ? sv!.duration : "",
      cta_label: tr(ctx, "Demander un devis", "Request a quote"), cta_link: contactLink(ctx),
      media_role: tr(ctx, "Photo de la prestation réalisée", "Photo of the completed service"),
    }),
    blocks: has(base.blocks) ? base.blocks : [item("included", "Ce qui est compris", "What is included"), item("included", "Le déplacement et la mise en place", "Travel and setup"), item("deliverable", "Ce qui vous est remis à la fin", "What you receive at the end"), item("excluded", "Ce qui n'est pas compris", "What is not included")],
    samples: sample,
  };
};

const needs = make(
  (ctx) => ({ eyebrow: tr(ctx, "Votre situation", "Your situation"), heading: tr(ctx, "Nous intervenons quand…", "We step in when…") }),
  (ctx) => ({
    real: services(ctx).slice(0, 6).map((s, i) => ({ type: "need", settings: { icon: ["check", "tool", "clock", "shield", "pin", "chat"][i], tag: "", title: s.name, text: real(s.description) ? html(s.description) : "", link_label: "", link: "" } })),
    todo: [{ type: "need", settings: { icon: "check", title: todo(ctx, "une situation de vos clients", "a customer situation"), text: "" } }],
    sample: [["tool", "Quelque chose ne fonctionne plus", "Something stopped working"], ["clock", "Vous manquez de temps", "You're short on time"], ["shield", "Vous voulez un travail garanti", "You want guaranteed work"]].map(([icon, fr, en]) => ({ type: "need", settings: { icon, tag: exampleTag(ctx), title: tr(ctx, fr, en), text: html(tr(ctx, "Ce que nous faisons dans ce cas.", "What we do in this case.")), link_label: "", link: "" } })),
  }),
);

const caseStudy = make(
  (ctx) => ({ eyebrow: tr(ctx, "Étude de cas", "Case study"), heading: ctx.sample ? ex(ctx, "Un projet réalisé", "A completed project") : todo(ctx, "titre du projet", "project title"), client_type: "", location: "", year: "", media_role: tr(ctx, "Photo du projet réalisé", "Photo of the completed project") }),
  (ctx) => ({
    real: [],
    todo: [["request", "la demande du client", "the client's request"], ["constraints", "les contraintes", "the constraints"], ["answer", "votre réponse", "your answer"], ["result", "le résultat constaté", "the observed result"]].map(([kind, fr, en]) => ({ type: "part", settings: { kind, title: "", text: html(todo(ctx, fr, en)) } })),
    sample: [["request", "Ce que le client voulait obtenir.", "What the client wanted."], ["constraints", "Délais, budget, accès : ce qui compliquait.", "Deadlines, budget, access: what made it hard."], ["answer", "Ce que vous avez proposé et fait.", "What you proposed and did."], ["result", "Ce qui a changé, constaté avec le client.", "What changed, confirmed with the client."]].map(([kind, fr, en]) => ({ type: "part", settings: { kind, title: "", text: html(ex(ctx, fr, en)) } })),
  }),
);

const credentials = make(
  (ctx) => ({ eyebrow: tr(ctx, "Garanties", "Credentials"), heading: tr(ctx, "Certifications et assurances", "Certifications and insurance"), note: ctx.sample ? "" : todo(ctx, "seules des mentions justifiables, avec leur justificatif", "only provable mentions, with their proof") }),
  (ctx) => ({
    real: [],
    todo: [{ type: "credential", settings: { kind: "insurance", title: todo(ctx, "assurance ou certification réelle", "real insurance or certification"), issuer: "", reference: "", validity: "", doc_link: "" } }],
    sample: [["insurance", "Assurance professionnelle", "Professional insurance"], ["certification", "Qualification professionnelle", "Professional qualification"], ["training", "Formation suivie", "Completed training"]].map(([kind, fr, en]) => ({ type: "credential", settings: { kind, title: ex(ctx, fr, en), issuer: tr(ctx, "Organisme", "Issuer"), reference: "", validity: "", doc_link: "" } })),
  }),
);

const equipment = make(
  (ctx) => ({ eyebrow: tr(ctx, "Nos moyens", "Our means"), heading: tr(ctx, "Le matériel que nous utilisons", "The equipment we use"), media_role: tr(ctx, "Photo du matériel ou des locaux", "Photo of the equipment or premises") }),
  (ctx) => ({
    real: [],
    todo: [{ type: "item", settings: { tag: "", title: todo(ctx, "un outil, véhicule ou local réel", "a real tool, vehicle or premises"), text: "" } }],
    sample: [["Outillage professionnel", "Professional tools"], ["Véhicule équipé", "Equipped vehicle"], ["Atelier", "Workshop"]].map(([fr, en], i) => ({ type: "item", settings: { image_asset: pic(ctx, i + 2), tag: exampleTag(ctx), title: tr(ctx, fr, en), text: html(tr(ctx, "À quoi il sert pour vos clients.", "What it does for your customers.")) } })),
  }),
);

const references = make(
  (ctx) => ({ eyebrow: tr(ctx, "Références", "References"), heading: tr(ctx, "Ils travaillent avec nous", "They work with us") }),
  (ctx) => ({
    real: [],
    todo: [{ type: "reference", settings: { title: todo(ctx, "nom d'un client ou partenaire réel", "a real client or partner name"), role: "client", text: "" } }],
    sample: ["client", "partner", "client", "prescriber", "supplier", "client"].map((role, i) => ({ type: "reference", settings: { title: ex(ctx, `Référence ${i + 1}`, `Reference ${i + 1}`), role, text: "" } })),
  }),
);

export const FAMILY_COPY: Record<string, CopyFn> = {
  "fs-video": video, "fs-results": results, "fs-press": press, "fs-making": making, "fs-products": products, "fs-commitments": commitments,
  "fs-collections": collections, "fs-lookbook": lookbook, "fs-dimensions": dimensions, "fs-care": care, "fs-campaign": campaign, "fs-reviews": reviews,
  "fs-journal": journal, "fs-stores": stores, "fs-service": service, "fs-needs": needs, "fs-case": caseStudy, "fs-credentials": credentials,
  "fs-equipment": equipment, "fs-references": references,
};
