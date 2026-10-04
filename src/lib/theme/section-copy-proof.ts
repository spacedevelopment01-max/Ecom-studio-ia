/**
 * Rédaction des sections du groupe « proof » (voir section-content.ts) : avant / après, professionnels,
 * avis (immersifs, premium, application), logos, réassurance, livraison, chiffres clés, arguments de
 * confiance, applications, séparateurs et Liquid personnalisé.
 *
 * - Ajout réel : textes tirés du projet (marque, produit, faits confirmés) ou neutres ; tout ce qui
 *   demande une vérité du marchand (avis, professionnels, partenaires, chiffres, délais, conditions)
 *   reste en espace réservé court.
 * - Aperçu de la bibliothèque (`ctx.sample`) : exemples réalistes adaptés au secteur du produit,
 *   chacun marqué « Exemple ».
 */
import { SECTORS } from "../project-types";
import type { ContentContext, CopyFn } from "./section-content";
import { exampleTag, todo, tr } from "./section-content";
import type { SectionSchema, ThemeSpec } from "./spec";

type Block = { type: string; settings?: Record<string, unknown> };
type Base = { settings: Record<string, unknown>; blocks?: Block[] };
type PreviewSection = { type: string; settings: Record<string, unknown>; blocks: Block[] };

// ---------------------------------------------------------------- outils

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const p = (s: string) => `<p>${esc(s)}</p>`;
/** Valeur exploitable du projet (les espaces réservés « [À définir…] » de l'atelier ne le sont pas). */
const clean = (s?: string | null) => {
  const v = String(s ?? "").trim();
  return !v || /^\[|\[(À|A) (compléter|définir|préciser)|\[To (complete|define)/i.test(v) ? "" : v;
};
/** « Exemple » accolé à un contenu d'exemple (auteur, logo, chiffre…). */
const ex = (ctx: ContentContext, s: string) => `${s} · ${exampleTag(ctx)}`;

/** Réglages de section : on n'écrit que dans un champ vide ou resté à sa valeur par défaut. */
function writer(schema: SectionSchema, base: Base) {
  const out: Record<string, unknown> = { ...base.settings };
  const def = (id: string) => schema.settings.find((s) => s.id === id);
  const put = (id: string, v: unknown) => {
    const d = def(id);
    if (!d || v === undefined) return;
    const cur = out[id];
    if (cur === undefined || cur === "" || cur === null || cur === (d as { default?: unknown }).default) out[id] = v;
  };
  return { out, put };
}

/** Blocs du préréglage (ou reçus) réécrits un à un ; les médias déjà posés sont conservés. */
function rewriteBlocks(base: Base, type: string, items: Record<string, unknown>[]): Block[] {
  const src = base.blocks?.filter((b) => b.type === type) ?? [];
  return items.map((s, i) => ({ type, settings: { ...(src[i]?.settings ?? {}), ...s } }));
}

type Sector = (typeof SECTORS)[number]["id"] | "other";
function sectorOf(ctx: ContentContext): Sector {
  const s = SECTORS.find((x) => x.label === ctx.product.sector || x.labelEn === ctx.product.sector);
  return s ? s.id : "other";
}

const productName = (ctx: ContentContext) => clean(ctx.product.name) || ctx.shopName;
const tagline = (ctx: ContentContext) => clean(ctx.brand?.tagline);

// ---------------------------------------------------------------- exemples par secteur (aperçu)

type Kit = { reviews: [string, string][]; pros: [string, string][]; partners: string[] };
const KITS: Record<Sector, Kit> = {
  mode: {
    reviews: [["Très agréable à porter, la taille est juste. Je le remets chaque semaine.", "Really comfortable to wear and true to size. I wear it every week."], ["Les finitions sont soignées, encore plus belles qu'en photo.", "Beautifully finished, even better than in the photos."], ["Offert pour un anniversaire : succès total, et un emballage impeccable.", "Gave it as a birthday present: a total hit, and flawless packaging."]],
    pros: [["Styliste", "Stylist"], ["Conseillère en image", "Image consultant"], ["Créatrice textile", "Textile designer"]],
    partners: ["Maison Nord", "Atelier Lumen", "Revue Saison", "Studio Ondine", "Le Vestiaire"],
  },
  beaute: {
    reviews: [["Une texture agréable, adoptée dès la première semaine.", "A lovely texture, part of my routine from week one."], ["Le flacon est superbe et l'application très simple.", "Gorgeous bottle, and so easy to apply."], ["Ma routine du soir ne se fait plus sans.", "My evening routine isn't complete without it."]],
    pros: [["Maquilleuse professionnelle", "Professional make-up artist"], ["Esthéticienne", "Beauty therapist"], ["Formatrice en soins", "Skincare trainer"]],
    partners: ["Maison Iris", "Atelier Peau", "Revue Éclat", "Studio Rosée", "Le Cabinet"],
  },
  bijoux: {
    reviews: [["Encore plus délicat en vrai, je ne le quitte plus.", "Even more delicate in real life, I never take it off."], ["Un écrin soigné, parfait pour offrir.", "Lovely box, perfect as a gift."], ["Il se porte au quotidien comme pour les grandes occasions.", "Works every day as well as for special occasions."]],
    pros: [["Joaillière", "Jeweller"], ["Gemmologue", "Gemologist"], ["Styliste", "Stylist"]],
    partners: ["Maison Orée", "Atelier Carat", "Revue Éclat", "Galerie Nacre", "Le Comptoir"],
  },
  maison: {
    reviews: [["Il a tout de suite trouvé sa place à la maison.", "It found its place at home straight away."], ["Belle qualité de fabrication, on sent le soin apporté.", "Well made, you can tell care went into it."], ["Livré vite et très bien protégé.", "Delivered quickly and very well packed."]],
    pros: [["Architecte d'intérieur", "Interior architect"], ["Décoratrice", "Interior decorator"], ["Designer produit", "Product designer"]],
    partners: ["Maison Nord", "Atelier Lin", "Revue Habiter", "Studio Ondine", "Le Comptoir"],
  },
  hightech: {
    reviews: [["Prise en main immédiate, même pour un débutant.", "Easy to pick up, even for a beginner."], ["Compact, bien pensé, il me suit partout.", "Compact and well designed, it goes everywhere with me."], ["Exactement ce que j'attendais, sans fioritures.", "Exactly what I expected, no frills."]],
    pros: [["Photographe", "Photographer"], ["Vidéaste", "Videographer"], ["Journaliste tech", "Tech journalist"]],
    partners: ["Nord Labs", "Pixel Revue", "Studio Ondine", "Atelier Volt", "Le Comptoir Tech"],
  },
  sport: {
    reviews: [["Je l'emporte à chaque sortie, il ne m'a jamais déçu.", "I take it on every outing and it has never let me down."], ["Léger dans le sac, solide sur le terrain.", "Light in the bag, sturdy out there."], ["Bien pensé par des gens qui pratiquent, ça se sent.", "Clearly designed by people who actually train."]],
    pros: [["Coach sportif", "Personal trainer"], ["Préparatrice physique", "Strength coach"], ["Guide de montagne", "Mountain guide"]],
    partners: ["Club Nord", "Atelier Cime", "Revue Plein Air", "Studio Élan", "Le Refuge"],
  },
  alimentation: {
    reviews: [["Un vrai goût, ni trop sucré ni fade : on en recommande.", "Real flavour, not too sweet, not bland: we keep reordering."], ["Parfait bien frais l'après-midi.", "Perfect ice-cold in the afternoon."], ["Toute la famille l'a adopté.", "The whole family loves it."]],
    pros: [["Cheffe", "Chef"], ["Barista", "Barista"], ["Épicier fin", "Fine grocer"]],
    partners: ["Épicerie Nord", "Maison Saveur", "Revue Gourmande", "Le Comptoir", "Café Lumen"],
  },
  enfants: {
    reviews: [["Adopté dès le premier jour par notre fils.", "Our son loved it from day one."], ["Pratique et bien pensé pour les parents.", "Practical and well thought out for parents."], ["Un cadeau de naissance très apprécié.", "A much-loved baby shower gift."]],
    pros: [["Auxiliaire de puériculture", "Childcare assistant"], ["Éducatrice de jeunes enfants", "Early years educator"], ["Psychomotricienne", "Psychomotor therapist"]],
    partners: ["Maison Bambin", "Atelier Doux", "Revue Parents", "Studio Ondine", "Le Nid"],
  },
  animaux: {
    reviews: [["Simple à utiliser, et vraiment pratique au quotidien avec deux chats.", "Easy to use and genuinely handy day to day with two cats."], ["Bien conçu, on voit qu'il a été pensé par des propriétaires d'animaux.", "Well designed, clearly made by pet owners."], ["Je l'ai offert à ma sœur, elle s'en sert chaque semaine.", "I gave one to my sister, she uses it every week."]],
    pros: [["Toiletteuse", "Pet groomer"], ["Éducateur canin", "Dog trainer"], ["Auxiliaire vétérinaire", "Veterinary assistant"]],
    partners: ["Maison Pelage", "Atelier Moustache", "Revue Compagnon", "Studio Ondine", "Le Panier"],
  },
  artisanat: {
    reviews: [["Un bel objet, fait avec soin.", "A beautiful object, made with care."], ["Le papier est agréable et l'emballage soigné.", "Lovely paper and careful packaging."], ["Parfait pour offrir à quelqu'un qui aime écrire.", "Perfect for anyone who loves to write."]],
    pros: [["Illustratrice", "Illustrator"], ["Relieur", "Bookbinder"], ["Calligraphe", "Calligrapher"]],
    partners: ["Papeterie Nord", "Atelier Plume", "Revue Carnet", "Studio Ondine", "Le Comptoir"],
  },
  other: {
    reviews: [["Exactement ce que je cherchais, et très bien emballé.", "Exactly what I was looking for, and beautifully packed."], ["Bien pensé, agréable au quotidien.", "Well thought out and pleasant to use every day."], ["Je l'ai déjà recommandé autour de moi.", "I've already recommended it to friends."]],
    pros: [["Designer produit", "Product designer"], ["Consultante", "Consultant"], ["Journaliste", "Journalist"]],
    partners: ["Maison Nord", "Atelier Lumen", "Revue Saison", "Studio Ondine", "Le Comptoir"],
  },
};
const kit = (ctx: ContentContext) => KITS[sectorOf(ctx)];

const CUSTOMERS: [string, string, string][] = [["Camille R.", "Lyon", "Lyon"], ["Thomas L.", "Nantes", "Nantes"], ["Inès B.", "Bordeaux", "Bordeaux"]];
const EXPERTS = ["Claire Moreau", "Julien Lefèvre", "Sophie Martin"];

/** Avis d'exemple (aperçu) : citation, auteur marqué « Exemple », ville, note. */
function sampleReviews(ctx: ContentContext) {
  return kit(ctx).reviews.map(([fr, en], i) => ({
    quote: tr(ctx, fr, en),
    author: ex(ctx, CUSTOMERS[i][0]),
    detail: tr(ctx, CUSTOMERS[i][1], CUSTOMERS[i][2]),
    rating: i === 1 ? "4" : "5",
  }));
}

// ---------------------------------------------------------------- rédactions

export const COPY: Record<string, CopyFn> = {
  "before-after": (ctx, base, schema) => {
    const { out, put } = writer(schema, base);
    const name = productName(ctx);
    put("eyebrow", tr(ctx, "Glissez pour comparer", "Drag to compare"));
    put("heading", tr(ctx, `${name},`, `${name},`));
    put("heading_accent", tr(ctx, "du studio à la vraie vie.", "from studio to real life."));
    put("text", p(clean(ctx.product.summary) || tr(ctx, "Le même produit, vu sous deux angles : faites glisser le curseur.", "The same product from two angles: drag the slider.")));
    put("label_before", tr(ctx, "En studio", "In the studio"));
    put("label_after", tr(ctx, "En situation", "In context"));
    put("ratio", "16 / 9");
    return { settings: out, blocks: base.blocks };
  },

  "expert-endorsements": (ctx, base, schema) => {
    const { out, put } = writer(schema, base);
    const name = productName(ctx);
    put("eyebrow", tr(ctx, "L'avis des professionnels", "What professionals say"));
    put("heading", tr(ctx, "Ils en parlent", "They talk about it"));
    put("heading_accent", tr(ctx, "en connaissance de cause.", "and they know their craft."));
    put("text", p(tr(ctx, `Le regard de professionnels sur ${name}, cité avec leur accord.`, `Professionals share their view of ${name}, quoted with their consent.`)));
    if (ctx.sample) {
      put("disclosure", ex(ctx, tr(ctx, "Recommandations recueillies sans contrepartie", "Recommendations given without compensation")));
      const pros = kit(ctx).pros;
      const quotes: [string, string][] = [
        [`Je conseille ${name} à celles et ceux qui me demandent une valeur sûre : un choix simple et réfléchi.`, `I recommend ${name} to anyone asking me for a safe choice: simple and well considered.`],
        ["Ce que je regarde d'abord, ce sont les détails. Ici, ils ont été pensés.", "The first thing I look at is the details. Here, they have been thought through."],
        ["Un produit que j'utilise moi-même et dont je parle volontiers.", "A product I use myself and happily talk about."],
      ];
      const blocks = rewriteBlocks(base, "expert", pros.map(([fr, en], i) => ({
        name: ex(ctx, EXPERTS[i]),
        profession: tr(ctx, fr, en),
        quote: tr(ctx, quotes[i][0], quotes[i][1]),
        proof_label: tr(ctx, "Voir la source", "See the source"),
      })));
      return { settings: out, blocks, samples: true };
    }
    put("disclosure", todo(ctx, "cadre de ces recommandations", "context of these recommendations"));
    const blocks = rewriteBlocks(base, "expert", [0, 1, 2].map(() => ({
      name: todo(ctx, "nom", "name"),
      profession: todo(ctx, "profession", "profession"),
      quote: todo(ctx, "citation validée par le professionnel", "quote approved by the professional"),
      proof_label: tr(ctx, "Voir la source", "See the source"),
    })));
    return { settings: out, blocks };
  },

  "immersive-reviews": (ctx, base, schema) => {
    const { out, put } = writer(schema, base);
    const name = productName(ctx);
    put("heading", tr(ctx, "Ce qu'en disent nos clients", "What our customers say"));
    put("subheading", tr(ctx, `Leurs mots sur ${name}, partagés avec leur accord.`, `Their words about ${name}, shared with their consent.`));
    if (ctx.sample) {
      const blocks = rewriteBlocks(base, "review", sampleReviews(ctx));
      return { settings: out, blocks, samples: true };
    }
    const blocks = rewriteBlocks(base, "review", [0, 1, 2].map(() => ({ quote: todo(ctx, "avis client", "customer review"), author: todo(ctx, "prénom", "first name") })));
    return { settings: out, blocks };
  },

  testimonials: (ctx, base, schema) => {
    const { out, put } = writer(schema, base);
    put("eyebrow", tr(ctx, "Avis clients", "Customer reviews"));
    put("heading", tr(ctx, "Ils en parlent mieux que nous", "In their own words"));
    if (ctx.sample) return { settings: out, blocks: sampleReviews(ctx).map((s) => ({ type: "review", settings: s })), samples: true };
    const blocks = [0, 1, 2].map(() => ({ type: "review", settings: { quote: todo(ctx, "avis client", "customer review"), author: todo(ctx, "prénom", "first name") } }));
    return { settings: out, blocks };
  },

  "product-reviews": (ctx, base, schema) => {
    const { out, put } = writer(schema, base);
    put("heading", tr(ctx, "Avis clients", "Customer reviews"));
    return { settings: out, blocks: base.blocks };
  },

  "logo-list": (ctx, base, schema) => {
    const { out, put } = writer(schema, base);
    put("eyebrow", tr(ctx, "Ils nous accompagnent", "In good company"));
    put("heading", tr(ctx, "Partenaires et revendeurs", "Partners and stockists"));
    if (ctx.sample) {
      const blocks = rewriteBlocks(base, "logo", kit(ctx).partners.map((n) => ({ name: ex(ctx, n) })));
      return { settings: out, blocks, samples: true };
    }
    return { settings: out, blocks: base.blocks };
  },

  reassurance: (ctx, base, schema) => {
    const { out, put } = writer(schema, base);
    put("eyebrow", tr(ctx, "Commandez l'esprit tranquille", "Order with peace of mind"));
    put("heading", tr(ctx, "Nos engagements,", "Our commitments,"));
    put("heading_accent", tr(ctx, "noir sur blanc.", "in black and white."));
    put("text", p(tr(ctx, `Tout ce qu'il faut savoir avant de commander chez ${ctx.shopName}.`, `Everything you need to know before ordering from ${ctx.shopName}.`)));
    const titles: [string, string, string][] = [["lock", "Paiement sécurisé", "Secure payment"], ["truck", "Livraison", "Delivery"], ["return", "Retours", "Returns"], ["chat", "Service client", "Customer care"]];
    const samples: [string, string][] = [
      ["Carte bancaire, PayPal et Apple Pay, via une connexion chiffrée.", "Card, PayPal and Apple Pay, over an encrypted connection."],
      ["Expédiée sous 24 h, livrée en 2 à 4 jours ouvrés.", "Shipped within 24 h, delivered in 2 to 4 working days."],
      ["30 jours pour changer d'avis, retour simple.", "30 days to change your mind, easy returns."],
      ["Une équipe à votre écoute du lundi au vendredi, 9 h – 18 h.", "A team on hand Monday to Friday, 9 am – 6 pm."],
    ];
    const todos: [string, string][] = [["moyens de paiement", "payment methods"], ["délais et tarifs", "lead times and rates"], ["durée de retour", "return period"], ["horaires et contact", "hours and contact"]];
    const blocks = rewriteBlocks(base, "card", titles.map(([icon, fr, en], i) => ({
      icon,
      title: tr(ctx, fr, en),
      text: ctx.sample ? p(ex(ctx, tr(ctx, samples[i][0], samples[i][1]))) : p(todo(ctx, todos[i][0], todos[i][1])),
    })));
    return { settings: out, blocks, samples: ctx.sample };
  },

  "shipping-journey": (ctx, base, schema) => {
    const { out, put } = writer(schema, base);
    put("eyebrow", tr(ctx, "Livraison", "Delivery"));
    put("heading", tr(ctx, "De la commande à chez vous", "From checkout to your door"));
    put("link_label", tr(ctx, "Politique de livraison", "Shipping policy"));
    const steps: { icon: string; title: [string, string]; text: [string, string]; delay?: [string, string]; sample: [string, string] }[] = [
      { icon: "cart", title: ["Commande", "Order"], text: ["Vous validez votre commande et recevez aussitôt une confirmation par e-mail.", "You place your order and get an email confirmation right away."], delay: ["Jour J", "Day 0"], sample: ["Jour J", "Day 0"] },
      { icon: "package", title: ["Préparation", "Packing"], text: ["Votre commande est préparée et emballée avec soin.", "Your order is carefully packed."], sample: ["Sous 24 h", "Within 24 h"] },
      { icon: "truck", title: ["Expédition", "Dispatch"], text: ["Votre colis est remis au transporteur.", "Your parcel is handed to the carrier."], sample: ["1 à 2 jours", "1 to 2 days"] },
      { icon: "home", title: ["Livraison", "Delivery"], text: ["Votre colis arrive à l'adresse choisie.", "Your parcel arrives at the address you chose."], sample: ["2 à 4 jours ouvrés", "2 to 4 working days"] },
    ];
    const blocks = rewriteBlocks(base, "step", steps.map((s) => ({
      icon: s.icon,
      title: tr(ctx, ...s.title),
      text: p(tr(ctx, ...s.text)),
      delay: ctx.sample ? tr(ctx, ...s.sample) : s.delay ? tr(ctx, ...s.delay) : todo(ctx, "délai", "lead time"),
    })));
    put("note", ctx.sample
      ? p(ex(ctx, tr(ctx, "Délais indicatifs en jours ouvrés pour la France métropolitaine, suivi du colis par e-mail.", "Indicative lead times in working days for mainland France, parcel tracking by email.")))
      : p(todo(ctx, "délais, transporteurs et pays livrés", "lead times, carriers and countries")));
    return { settings: out, blocks, samples: ctx.sample };
  },

  stats: (ctx, base, schema) => {
    const { out, put } = writer(schema, base);
    const name = productName(ctx);
    put("eyebrow", tr(ctx, "En chiffres", "In numbers"));
    put("heading", tr(ctx, `${name},`, `${name},`));
    put("heading_accent", tr(ctx, "l'essentiel en un coup d'œil.", "at a glance."));
    // Vrais chiffres du projet : faits confirmés chiffrés, nombre de déclinaisons.
    const real: { value: string; label: string }[] = [];
    for (const f of ctx.product.facts) if (/\d/.test(f.value) && f.value.length <= 16) real.push({ value: f.value.replace(/\.$/, ""), label: f.label });
    for (const v of ctx.product.variants) if (v.values.length > 1) real.push({ value: String(v.values.length), label: tr(ctx, `${v.name.toLowerCase()} au choix`, `${v.name.toLowerCase()} to choose from`) });
    const samples: { value: string; label: string }[] = [
      { value: tr(ctx, "4,8/5", "4.8/5"), label: ex(ctx, tr(ctx, "Note moyenne des clients", "Average customer rating")) },
      { value: "98 %", label: ex(ctx, tr(ctx, "Clients qui le recommandent", "Customers who recommend it")) },
      { value: "24 h", label: ex(ctx, tr(ctx, "Pour expédier votre commande", "To ship your order")) },
    ];
    const items = real.slice(0, 3);
    if (ctx.sample) {
      for (const s of samples) if (items.length < 3) items.push(s);
      put("source", ex(ctx, tr(ctx, "Source : enquête clients, 2026", "Source: customer survey, 2026")));
    } else {
      while (items.length < 3) items.push({ value: todo(ctx, "chiffre", "figure"), label: todo(ctx, "ce qu'il mesure", "what it measures") });
      put("source", todo(ctx, "source des chiffres", "source of the figures"));
    }
    return { settings: out, blocks: rewriteBlocks(base, "stat", items), samples: ctx.sample };
  },

  "trust-bar": (ctx, base, schema) => {
    const { out } = writer(schema, base);
    const items: { icon: string; title: [string, string]; text: [string, string]; todo?: [string, string] }[] = [
      { icon: "shield", title: ["Paiement sécurisé", "Secure payment"], text: ["Carte bancaire, PayPal, Apple Pay", "Card, PayPal, Apple Pay"], todo: ["moyens de paiement", "payment methods"] },
      { icon: "truck", title: ["Livraison", "Delivery"], text: ["En 2 à 4 jours ouvrés", "In 2 to 4 working days"], todo: ["délai", "lead time"] },
      { icon: "return", title: ["Retours", "Returns"], text: ["30 jours pour changer d'avis", "30 days to change your mind"], todo: ["durée", "period"] },
      { icon: "chat", title: ["Service client", "Customer care"], text: ["Réponse sous 24 h", "Reply within 24 h"], todo: ["contact", "contact"] },
    ];
    const blocks = rewriteBlocks(base, "item", items.map((it) => ({
      icon: it.icon,
      title: tr(ctx, ...it.title),
      text: ctx.sample ? ex(ctx, tr(ctx, ...it.text)) : todo(ctx, it.todo![0], it.todo![1]),
    })));
    return { settings: out, blocks, samples: ctx.sample };
  },

  "creative-divider": (ctx, base, schema) => {
    const { out, put } = writer(schema, base);
    put("text", tagline(ctx) || tr(ctx, `Découvrez ${productName(ctx)}`, `Discover ${productName(ctx)}`));
    return { settings: out, blocks: base.blocks };
  },

  "custom-liquid": (ctx, base, schema) => {
    const { out, put } = writer(schema, base);
    if (!ctx.sample) return { settings: out, blocks: base.blocks };
    // Exemple de code (aperçu seulement) : un encart qui utilise des variables Liquid de la boutique.
    const demo = `<div class="es-custom__demo">
  <span class="es-custom__demo-tag">${esc(tr(ctx, "Exemple de code personnalisé", "Custom code example"))}</span>
  <p class="es-custom__demo-title">${esc(ctx.shopName)}${tagline(ctx) ? ` — ${esc(tagline(ctx))}` : ""}</p>
  <p class="es-custom__demo-text">${esc(tr(ctx, "Collez ici le code d'un widget, d'une application ou votre propre HTML : il prend place dans la page, aux couleurs de votre thème.", "Paste a widget's or an app's code, or your own HTML, here: it sits in the page, in your theme's colours."))}</p>
  <code class="es-custom__demo-code">&lt;div class="widget" data-shop="${esc(ctx.shopName)}"&gt;…&lt;/div&gt;</code>
</div>`;
    put("custom_liquid", demo);
    return { settings: out, blocks: base.blocks, samples: true };
  },
};

// ---------------------------------------------------------------- aperçu de la bibliothèque

/**
 * Sections qui s'affichent en « mode éditeur » dans l'aperçu : emplacements d'application,
 * présentés comme dans l'éditeur Shopify (aperçu de l'emplacement, jamais de faux avis).
 */
export const PREVIEW_DESIGN_MODE = new Set(["product-reviews", "apps"]);

/**
 * Sections voisines factices pour l'aperçu des séparateurs (rendus seuls, ils ne montrent qu'une bande) :
 * la section du dessus prend la couleur « au-dessus », celle du dessous la couleur de la forme.
 */
export function previewNeighbors(type: string, settings: Record<string, unknown>, schema: SectionSchema, ctx: ContentContext, spec: ThemeSpec): { before: PreviewSection; after: PreviewSection; settings: Record<string, unknown> } | null {
  if (type !== "creative-divider" && type !== "wave-divider") return null;
  const dflt = (id: string) => String(settings[id] ?? (schema.settings.find((s) => s.id === id) as { default?: unknown } | undefined)?.default ?? "");
  const from = dflt("from_scheme") || "scheme-1";
  let to = dflt("color_scheme") || "scheme-3";
  // Deux couleurs trop proches (thème sombre…) : la forme prend le schéma le plus contrasté, pour qu'on la voie.
  const schemes = (spec.settings.color_schemes ?? {}) as Record<string, { settings?: Record<string, string> }>;
  const lum = (id: string) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(schemes[id]?.settings?.background ?? "");
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  };
  const lf = lum(from);
  if (lf !== null && Math.abs((lum(to) ?? lf) - lf) < 0.2) {
    const best = Object.keys(schemes).filter((id) => id !== from).sort((a, b) => Math.abs((lum(b) ?? lf) - lf) - Math.abs((lum(a) ?? lf) - lf))[0];
    if (best) to = best;
  }
  const name = productName(ctx);
  const band = (scheme: string, eyebrow: string, heading: string, text: string, pad: [number, number]): PreviewSection => ({
    type: "rich-text",
    settings: { color_scheme: scheme, align: "center", style: "plain", padding_top: pad[0], padding_bottom: pad[1] },
    blocks: [
      { type: "eyebrow", settings: { text: eyebrow } },
      { type: "heading", settings: { text: heading, size: "h3" } },
      { type: "text", settings: { text: p(text) } },
    ],
  });
  return {
    settings: { ...settings, from_scheme: from, color_scheme: to },
    before: band(from, tr(ctx, "Section précédente", "Previous section"), tagline(ctx) || ctx.shopName, tr(ctx, "Le séparateur fait la transition entre cette section…", "The divider bridges this section…"), [72, 64]),
    after: band(to, tr(ctx, "Section suivante", "Next section"), tr(ctx, `Découvrez ${name}`, `Discover ${name}`), tr(ctx, "…et celle-ci, en reprenant leurs couleurs.", "…and this one, using their colours."), [40, 80]),
  };
}
