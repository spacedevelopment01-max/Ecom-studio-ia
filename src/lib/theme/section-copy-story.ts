/**
 * Rédaction des sections du groupe « story » (voir section-content.ts) : à propos, texte animé, promesse,
 * onglets de contenu, FAQ, blog en vedette, page légale, texte enrichi, bénéfices animés, histoire animée,
 * texte en courbe, jour / nuit, bandeau défilant.
 *
 * Principe : textes tirés du projet (marque, produit, faits confirmés, prix, variantes, collections) ;
 * formulations neutres quand une donnée manque ; espaces réservés courts pour ce qui exige une vérité du
 * marchand (livraison, retours, entretien, histoire datée, mentions légales) ; en aperçu (`sample`), exemples
 * réalistes marqués « Exemple ».
 */
import type { ContentContext, CopyFn } from "./section-content";
import { exampleTag, todo, tr } from "./section-content";
import type { SectionSchema } from "./spec";

type Block = { type: string; settings?: Record<string, unknown> };
type Settings = Record<string, unknown>;

/* ---------- Outils ---------- */

/** Texte resté en espace réservé (préréglage du thème, page générée ou fiche marque incomplète). */
const PLACEHOLDER = /\[(?:À compléter|À définir|À préciser|To complete|To define|To be (?:defined|completed|specified))/i;
const isPh = (v: unknown) => typeof v === "string" && PLACEHOLDER.test(v);
/** Valeur réelle du projet (vide si absente ou restée en espace réservé). */
const real = (v: unknown): string => (typeof v === "string" && v.trim() && !isPh(v) ? v.trim() : "");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const noDot = (s: string) => s.trim().replace(/[\s.!…]+$/u, "");
const dot = (s: string) => (/[.!?…]$/u.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const lowerFirst = (s: string) => (s ? s.charAt(0).toLocaleLowerCase() + s.slice(1) : s);
const p = (...lines: string[]) => lines.filter(Boolean).map((l) => `<p>${l}</p>`).join("");

/** Défaut du schéma pour un réglage (ou un réglage de bloc). */
function schemaDefault(schema: SectionSchema, id: string, blockType?: string): unknown {
  const list = blockType ? schema.blocks.find((b) => b.type === blockType)?.settings ?? [] : schema.settings;
  return (list as { id?: string; default?: unknown }[]).find((s) => s.id === id)?.default;
}

/** Écrit un texte seulement si le champ est vide, resté au défaut du schéma ou en espace réservé. */
function writer(schema: SectionSchema, out: Settings, blockType?: string) {
  return (id: string, val: unknown) => {
    if (val === undefined || val === null) return;
    const cur = out[id];
    if (cur === undefined || cur === "" || isPh(cur) || cur === schemaDefault(schema, id, blockType)) out[id] = val;
  };
}

/** Bloc dont les textes viennent encore du thème (aucun texte réel saisi). */
const isPresetBlock = (b: Block, schema: SectionSchema, ids: string[], i = -1) => {
  const preset = i >= 0 ? ((schema.presets?.[0] as { blocks?: Block[] } | undefined)?.blocks ?? []).filter((x) => !x.type.startsWith("@"))[i] : undefined;
  return ids.every((id) => {
    const v = b.settings?.[id];
    return v === undefined || v === "" || isPh(v) || v === schemaDefault(schema, id, b.type) || (preset?.type === b.type && v === preset.settings?.[id]);
  });
};

/** Repère « Exemple » discret, ajouté aux contenus d'exemple de l'aperçu. */
const exTail = (ctx: ContentContext) => ` <em>(${exampleTag(ctx)})</em>`;
const exLabel = (ctx: ContentContext, s: string) => `${s} · ${exampleTag(ctx)}`;

function money(ctx: ContentContext): string {
  const n = ctx.product.price;
  if (n === null || !Number.isFinite(n)) return "";
  const amount = (n / 100).toLocaleString(ctx.lang === "en" ? "en-GB" : "fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, " ");
  const cur = ctx.product.currency || "EUR";
  const sym = cur === "EUR" ? "€" : cur === "USD" ? "$" : cur === "GBP" ? "£" : cur;
  return ctx.lang === "en" ? `${sym}${amount}` : `${amount} ${sym}`;
}

/** Secteur du produit (identifiant stable, quelle que soit la langue du libellé). */
type Sector = "beaute" | "mode" | "bijoux" | "maison" | "hightech" | "sport" | "alimentation" | "enfants" | "animaux" | "artisanat" | "other";
function sector(ctx: ContentContext): Sector {
  const s = ctx.product.sector.toLowerCase();
  const map: [RegExp, Sector][] = [
    [/beaut/, "beaute"], [/mode|fashion/, "mode"], [/bijou|jewel/, "bijoux"], [/maison|home/, "maison"], [/high-tech|tech/, "hightech"],
    [/sport/, "sport"], [/aliment|food/, "alimentation"], [/enfant|kid|baby/, "enfants"], [/animau|pet/, "animaux"], [/artisan|craft/, "artisanat"],
  ];
  return map.find(([re]) => re.test(s))?.[1] ?? "other";
}

/** Faits du projet, lisibles : « Dimensions : 20 × 15 cm ». */
function facts(ctx: ContentContext) {
  const f = ctx.product.facts.map((x) => ({ label: noDot(x.label), value: noDot(x.value) })).filter((x) => x.label && x.value);
  const v = ctx.product.variants.filter((x) => x.name && x.values?.length).map((x) => ({ label: x.name, value: x.values.join(", ") }));
  return { facts: f, variants: v };
}

/** Données du projet prêtes à rédiger. */
function info(ctx: ContentContext) {
  const brand = real(ctx.brand?.name) || ctx.shopName;
  const name = real(ctx.product.name) || brand;
  const summary = real(ctx.product.summary);
  const tagline = real(ctx.brand?.tagline);
  const story = real(ctx.brand?.story);
  const price = money(ctx);
  const { facts: fs, variants } = facts(ctx);
  const values = (ctx.brand?.values ?? []).filter((v) => real(v.title));
  const collection = ctx.collections[0]?.title ?? "";
  return { brand, name, summary, tagline, story, price, facts: fs, variants, values, collection, sector: sector(ctx) };
}

/** Exemples réalistes par secteur (aperçu seulement), et libellés d'onglets adaptés. */
function sectorText(ctx: ContentContext, s: Sector) {
  const T: Record<Sector, { use: [string, string]; care: [string, string]; words: [string, string] }> = {
    beaute: { use: ["Appliquez matin et soir sur une peau propre, en massant délicatement.", "Apply morning and evening to clean skin, massaging gently."], care: ["Conservez à l'abri de la chaleur et de la lumière, bien refermé.", "Store away from heat and light, tightly closed."], words: ["votre peau, vos rituels, chaque jour", "your skin, your rituals, every day"] },
    mode: { use: ["Choisissez votre taille habituelle ; la coupe se porte aussi bien seule que sous une veste.", "Pick your usual size; it works on its own or under a jacket."], care: ["Lavage à 30 °C sur l'envers, séchage à plat, repassage doux.", "Wash inside out at 30 °C, dry flat, iron on low."], words: ["votre style, chaque occasion, vous", "your style, every occasion, you"] },
    bijoux: { use: ["Se porte au quotidien ; à retirer avant la douche, la piscine ou le sport.", "Made for every day; take it off before showering, swimming or sport."], care: ["Nettoyez avec un chiffon doux et sec ; rangez à l'abri de l'humidité.", "Clean with a soft dry cloth; store away from moisture."], words: ["chaque jour, vos grandes occasions, durer", "every day, big occasions, lasting"] },
    maison: { use: ["Prêt à l'emploi dès réception : installez-le simplement là où vous en avez besoin.", "Ready to use on arrival: simply place it where you need it."], care: ["Dépoussiérez avec un chiffon doux et suivez les indications de l'étiquette.", "Dust with a soft cloth and follow the care label."], words: ["votre intérieur, votre confort, chaque jour", "your home, your comfort, every day"] },
    hightech: { use: ["Chargez-le entièrement avant la première utilisation, puis suivez le guide de démarrage.", "Fully charge it before first use, then follow the quick-start guide."], care: ["Rangez-le au sec et rechargez-le uniquement avec le câble fourni.", "Store it dry and charge only with the supplied cable."], words: ["vos idées, vos aventures, aller plus loin", "your ideas, your adventures, going further"] },
    sport: { use: ["Échauffez-vous avant chaque séance et adaptez l'intensité à votre niveau.", "Warm up before each session and adapt the intensity to your level."], care: ["Rincez à l'eau claire après usage et laissez sécher à l'air libre.", "Rinse with clean water after use and let it air-dry."], words: ["l'effort, le plein air, vos défis", "the effort, the outdoors, your goals"] },
    alimentation: { use: ["À déguster bien frais, idéalement entre 4 et 6 °C.", "Best enjoyed well chilled, ideally between 4 and 6 °C."], care: ["À conserver dans un endroit frais et sec ; après ouverture, à consommer rapidement.", "Store in a cool, dry place; once opened, enjoy promptly."], words: ["vos pauses, le partage, chaque envie", "your breaks, sharing, every craving"] },
    enfants: { use: ["Toujours sous la surveillance d'un adulte, en respectant l'âge indiqué.", "Always under adult supervision, following the age guidance."], care: ["Nettoyez avec un linge humide et vérifiez régulièrement son état.", "Wipe with a damp cloth and check its condition regularly."], words: ["les petits, les parents, grandir", "little ones, parents, growing up"] },
    animaux: { use: ["Quelques gestes suffisent : passez-le doucement, dans un seul sens.", "A few strokes are enough: glide it gently, in one direction."], care: ["Rincez à l'eau tiède, laissez sécher à l'air libre.", "Rinse in lukewarm water and let it air-dry."], words: ["votre compagnon, votre intérieur, chaque jour", "your companion, your home, every day"] },
    artisanat: { use: ["Prenez le temps de le découvrir : chaque pièce se prête à vos propres projets.", "Take time to explore it: each piece lends itself to your own projects."], care: ["Conservez-le à l'abri de l'humidité et de la lumière directe.", "Keep it away from moisture and direct sunlight."], words: ["vos idées, vos projets, créer", "your ideas, your projects, making"] },
    other: { use: ["Prêt à l'emploi dès réception : suivez simplement la notice fournie.", "Ready to use on arrival: just follow the included instructions."], care: ["Suivez les indications de la notice pour le garder longtemps.", "Follow the instructions to keep it for years."], words: ["votre quotidien, vos envies, vous", "your everyday, your wishes, you"] },
  };
  const t = T[s];
  const food = s === "alimentation";
  return {
    use: tr(ctx, ...t.use),
    care: tr(ctx, ...t.care),
    words: tr(ctx, ...t.words),
    useTab: food ? tr(ctx, "Dégustation", "Enjoying it") : tr(ctx, "Utilisation", "How to use"),
    careTab: food ? tr(ctx, "Conservation", "Storage") : tr(ctx, "Entretien", "Care"),
    useQ: food ? tr(ctx, "Comment le déguster ?", "How is it best enjoyed?") : tr(ctx, "Comment l'utiliser ?", "How do I use it?"),
    careQ: food ? tr(ctx, "Comment le conserver ?", "How should I store it?") : tr(ctx, "Comment l'entretenir ?", "How do I look after it?"),
  };
}

const SHIP = (ctx: ContentContext) => tr(ctx, "Commandes expédiées sous 24 à 48 h ouvrées, livrées en 2 à 4 jours ouvrés en France métropolitaine.", "Orders ship within 1–2 business days and arrive in 2–4 business days.");
const RETURNS = (ctx: ContentContext) => tr(ctx, "Vous disposez de 30 jours après réception pour retourner un article non utilisé, dans son emballage d'origine.", "You have 30 days from delivery to return an unused item in its original packaging.");

/** Prépare les blocs : textes du thème remplacés, textes du marchand conservés. */
function fillBlocks(blocks: Block[] | undefined, schema: SectionSchema, ids: string[], make: (i: number, b: Block) => Settings | null, count?: number): Block[] {
  const list = (blocks ?? []).map((b) => ({ type: b.type, settings: { ...(b.settings ?? {}) } }));
  const type = schema.blocks[0]?.type ?? "block";
  if (count !== undefined) while (list.length < count) list.push({ type, settings: {} });
  const out: Block[] = [];
  list.forEach((b, i) => {
    if (!isPresetBlock(b, schema, ids, i)) return void out.push(b);
    const s = make(i, b);
    if (s === null) return;
    out.push({ type: b.type, settings: { ...b.settings, ...s } });
  });
  return out;
}

/* ---------- Sections ---------- */

const about: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const out: Settings = { ...base.settings };
  const put = writer(schema, out);
  put("eyebrow", tr(ctx, "Notre histoire", "Our story"));
  if (d.tagline) {
    put("heading", noDot(d.tagline));
    if (out.heading === noDot(d.tagline)) put("heading_accent", "");
  } else {
    put("heading", tr(ctx, `${d.brand},`, `${d.brand},`));
    put("heading_accent", tr(ctx, "en quelques mots.", "in a few words."));
  }
  put("lead", p(d.story ? esc(d.story) : d.summary
    ? tr(ctx, `Chez ${esc(d.brand)}, tout part d'un produit. ${esc(dot(d.summary))}`, `At ${esc(d.brand)}, it all starts with one product. ${esc(dot(d.summary))}`)
    : tr(ctx, `${esc(d.brand)} réunit des produits choisis avec soin, présentés simplement.`, `${esc(d.brand)} brings together carefully chosen products, presented simply.`)));
  put("why_title", tr(ctx, "Pourquoi nous existons", "Why we exist"));
  const factLine = d.facts.length ? tr(ctx, ` Chaque caractéristique est indiquée telle qu'elle est — ${esc(d.facts.map((f) => `${f.label.toLocaleLowerCase()} : ${f.value}`).join(", "))}.`, ` Every detail is stated as it is — ${esc(d.facts.map((f) => `${f.label.toLocaleLowerCase()}: ${f.value}`).join(", "))}.`) : "";
  put("why_text", p(tr(ctx, `Pour proposer un produit que l'on a envie de choisir et de garder, présenté avec précision et sans promesses superflues.${factLine}`, `To offer a product you want to choose and keep, presented precisely and without empty promises.${factLine}`)));
  put("commit_title", tr(ctx, "Notre engagement", "Our commitment"));
  put("commit_text", ctx.sample
    ? p(tr(ctx, "Répondre à chaque message sous 24 h ouvrées et préparer chaque commande avec soin, comme si elle nous était destinée.", "Reply to every message within one business day and pack every order with care, as if it were our own.") + exTail(ctx))
    : p(todo(ctx, "un engagement que vous tenez", "a commitment you keep")));
  put("signature", tr(ctx, `L'équipe ${d.brand}`, `The ${d.brand} team`));
  put("values_title", tr(ctx, "Ce qui nous guide", "What guides us"));
  put("button_label", tr(ctx, "Découvrir la boutique", "Visit the shop"));
  const vals = d.values.length >= 2
    ? d.values.map((v) => ({ title: real(v.title), text: p(esc(real(v.text))) }))
    : [
        { title: tr(ctx, "Le sens du détail", "An eye for detail"), text: p(tr(ctx, "Chaque produit est présenté tel qu'il est, photos et caractéristiques à l'appui.", "Every product is shown as it is, with photos and specifications.")) },
        { title: tr(ctx, "Un choix resserré", "A focused selection"), text: p(d.collection ? tr(ctx, `Une sélection pensée autour de « ${esc(d.collection)} », sans superflu.`, `A selection built around “${esc(d.collection)}”, nothing superfluous.`) : tr(ctx, "Peu de produits, mais choisis avec attention.", "Few products, each chosen with care.")) },
        { title: tr(ctx, "Une vraie écoute", "Real listening"), text: p(tr(ctx, "Une question avant de commander ? Écrivez-nous, nous vous répondons.", "A question before ordering? Write to us and we'll answer.")) },
      ];
  const icons = ["heart", "leaf", "hand", "star"];
  const blocks = fillBlocks(base.blocks, schema, ["title", "text"], (i) => {
    const v = vals[i];
    return v ? { icon: icons[i % icons.length], title: v.title, text: v.text } : null;
  });
  return { settings: out, blocks, samples: ctx.sample };
};

const animatedText: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const st = sectorText(ctx, d.sector);
  const out: Settings = { ...base.settings };
  const put = writer(schema, out);
  put("eyebrow", d.brand);
  put("text_start", tr(ctx, "Pensé pour", "Made for"));
  put("words", st.words);
  put("caption", p(esc(d.summary ? dot(d.summary) : d.tagline ? dot(d.tagline) : tr(ctx, `Découvrez ${d.name}.`, `Discover ${d.name}.`))));
  put("button_label", tr(ctx, `Découvrir ${d.brand}`, `Discover ${d.brand}`));
  return { settings: out, blocks: base.blocks };
};

const brandPromise: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const out: Settings = { ...base.settings };
  const put = writer(schema, out);
  put("eyebrow", tr(ctx, `La promesse ${d.brand}`, `The ${d.brand} promise`));
  if (d.tagline) {
    put("heading", `${d.brand},`);
    put("heading_accent", lowerFirst(dot(d.tagline)));
  } else {
    put("heading", tr(ctx, "Une promesse simple,", "A simple promise,"));
    put("heading_accent", tr(ctx, "tenue jusqu'au bout.", "kept all the way."));
  }
  put("text", p(d.summary
    ? tr(ctx, `${esc(dot(d.summary))} Nous le présentons avec des informations claires, pour que vous choisissiez en toute confiance.`, `${esc(dot(d.summary))} We present it with clear information, so you can choose with confidence.`)
    : tr(ctx, `Nous présentons ${esc(d.name)} avec des informations claires, pour que vous choisissiez en toute confiance.`, `We present ${esc(d.name)} with clear information, so you can choose with confidence.`)));
  put("badge_text", d.brand.length <= 14 ? tr(ctx, `${d.brand} · Notre promesse`, `${d.brand} · Our promise`) : d.brand);
  put("signature", tr(ctx, `L'équipe ${d.brand}`, `The ${d.brand} team`));
  put("button_label", tr(ctx, "Découvrir la boutique", "Visit the shop"));
  const second = d.facts.length
    ? { icon: "check", title: tr(ctx, "Des caractéristiques confirmées", "Confirmed specifications"), text: p(esc(d.facts.map((f) => `${f.label} : ${f.value}`).join(" · "))) }
    : d.variants.length
      ? { icon: "heart", title: tr(ctx, "À votre goût", "Your choice"), text: p(esc(tr(ctx, `Disponible en ${d.variants[0].value}.`, `Available in ${d.variants[0].value}.`))) }
      : d.price
        ? { icon: "check", title: tr(ctx, "Un prix clair", "A clear price"), text: p(esc(tr(ctx, `${d.price}, affiché avant toute commande.`, `${d.price}, shown before you order.`))) }
        : { icon: "check", title: tr(ctx, "Des informations claires", "Clear information"), text: p(tr(ctx, "Tout ce qu'il faut savoir, réuni sur la fiche produit.", "Everything you need to know, on the product page.")) };
  const items = [
    { icon: "sparkle", title: tr(ctx, "Un produit présenté avec soin", "A carefully presented product"), text: p(tr(ctx, "Description, photos et détails : tout pour bien choisir, sereinement.", "Description, photos and details: all you need to choose with peace of mind.")) },
    second,
    ctx.sample
      ? { icon: "package", title: exLabel(ctx, tr(ctx, "Expédition sous 48 h", "Ships within 48 h")), text: p(SHIP(ctx)) }
      : { icon: "package", title: tr(ctx, "Livraison", "Delivery"), text: p(todo(ctx, "délais et tarifs", "times and rates")) },
    ctx.sample
      ? { icon: "smile", title: exLabel(ctx, tr(ctx, "Retours sous 30 jours", "30-day returns")), text: p(RETURNS(ctx)) }
      : { icon: "smile", title: tr(ctx, "Retours", "Returns"), text: p(todo(ctx, "conditions de retour", "return policy")) },
  ];
  const blocks = fillBlocks(base.blocks, schema, ["title", "text"], (i) => items[i] ?? null);
  return { settings: out, blocks, samples: ctx.sample };
};

const contentTabs: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const st = sectorText(ctx, d.sector);
  const out: Settings = { ...base.settings };
  const put = writer(schema, out);
  put("eyebrow", tr(ctx, "En détail", "In detail"));
  put("heading", tr(ctx, `${d.name}, en détail`, `${d.name}, in detail`));
  const specs = [...d.facts, ...d.variants];
  if (d.price) specs.push({ label: tr(ctx, "Prix", "Price"), value: d.price });
  const product = (d.summary ? p(esc(dot(d.summary))) : p(tr(ctx, `Découvrez ${esc(d.name)} en détail.`, `Discover ${esc(d.name)} in detail.`)))
    + (specs.length ? `<ul>${specs.map((f) => `<li><strong>${esc(f.label)}</strong> : ${esc(f.value)}</li>`).join("")}</ul>` : "");
  const tabs = [
    { title: tr(ctx, "Le produit", "The product"), icon: "sparkle", heading: d.name, content: product },
    { title: st.useTab, icon: "hand", heading: "", content: ctx.sample ? p(esc(st.use) + exTail(ctx)) : p(todo(ctx, "conseils d'utilisation", "how to use")) },
    { title: st.careTab, icon: "drop", heading: "", content: ctx.sample ? p(esc(st.care) + exTail(ctx)) : p(todo(ctx, d.sector === "alimentation" ? "conservation" : "consignes d'entretien", d.sector === "alimentation" ? "storage" : "care instructions")) },
    { title: tr(ctx, "Livraison", "Delivery"), icon: "truck", heading: tr(ctx, "Livraison et retours", "Delivery & returns"), content: ctx.sample ? p(SHIP(ctx), RETURNS(ctx) + exTail(ctx)) : p(todo(ctx, "délais, tarifs et pays livrés", "times, rates and countries")) },
  ];
  const blocks = fillBlocks(base.blocks, schema, ["content"], (i, b) => {
    const t = tabs[i];
    if (!t) return null;
    return { title: t.title, icon: b.settings?.icon && b.settings.icon !== "none" ? b.settings.icon : t.icon, ...(t.heading ? { heading: t.heading } : {}), content: t.content };
  });
  return { settings: out, blocks, samples: ctx.sample };
};

const faq: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const st = sectorText(ctx, d.sector);
  const out: Settings = { ...base.settings };
  const put = writer(schema, out);
  put("eyebrow", tr(ctx, "Besoin d'aide ?", "Need help?"));
  put("heading", tr(ctx, "Questions fréquentes", "Frequently asked questions"));
  put("text", p(tr(ctx, `Tout ce qu'il faut savoir sur ${esc(d.name)} avant de commander.`, `Everything to know about ${esc(d.name)} before you order.`)));
  put("contact_text", tr(ctx, "Une autre question ?", "Another question?"));
  put("button_label", tr(ctx, "Nous écrire", "Contact us"));
  put("search_placeholder", tr(ctx, "Rechercher une question…", "Search a question…"));
  const specs = [...d.facts, ...d.variants];
  const qa: { q: string; a: string }[] = [
    {
      q: tr(ctx, `${d.name} : de quoi s'agit-il ?`, `${d.name}: what is it?`),
      a: (d.summary ? p(esc(dot(d.summary))) : p(tr(ctx, `${esc(d.name)} est présenté en détail sur sa fiche produit.`, `${esc(d.name)} is described in detail on its product page.`)))
        + (specs.length ? `<ul>${specs.map((f) => `<li><strong>${esc(f.label)}</strong> : ${esc(f.value)}</li>`).join("")}</ul>` : ""),
    },
  ];
  if (d.variants.length) qa.push({ q: tr(ctx, `Quels sont les choix disponibles ?`, `Which options are available?`), a: p(esc(d.variants.map((v) => tr(ctx, `${v.label} : ${v.value}.`, `${v.label}: ${v.value}.`)).join(" "))) });
  else if (d.price) qa.push({ q: tr(ctx, "Quel est son prix ?", "How much does it cost?"), a: p(esc(tr(ctx, `${d.name} : ${d.price}.`, `${d.name}: ${d.price}.`))) });
  qa.push({ q: st.useQ, a: ctx.sample ? p(esc(st.use) + exTail(ctx)) : p(todo(ctx, "mode d'emploi", "how to use")) });
  qa.push({ q: st.careQ, a: ctx.sample ? p(esc(st.care) + exTail(ctx)) : p(todo(ctx, d.sector === "alimentation" ? "conservation" : "entretien", d.sector === "alimentation" ? "storage" : "care")) });
  qa.push({ q: tr(ctx, "Quels sont les délais de livraison ?", "How long does delivery take?"), a: ctx.sample ? p(SHIP(ctx) + exTail(ctx)) : p(todo(ctx, "délais de livraison", "delivery times")) });
  qa.push({ q: tr(ctx, "Puis-je retourner ma commande ?", "Can I return my order?"), a: ctx.sample ? p(tr(ctx, "Oui. ", "Yes. ") + RETURNS(ctx) + exTail(ctx)) : p(todo(ctx, "conditions de retour", "return policy")) });
  const blocks = fillBlocks(base.blocks, schema, ["question", "answer"], (i) => (qa[i] ? { question: qa[i].q, answer: qa[i].a } : null), qa.length);
  return { settings: out, blocks, samples: ctx.sample };
};

const featuredBlog: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const out: Settings = { ...base.settings };
  const put = writer(schema, out);
  put("eyebrow", tr(ctx, `Le journal ${d.brand}`, `The ${d.brand} journal`));
  put("heading", tr(ctx, "Conseils, coulisses et inspirations", "Tips, stories and inspiration"));
  // L'aperçu montre des articles d'exemple (le studio n'a pas accès au blog de la boutique).
  return { settings: out, blocks: base.blocks, samples: ctx.sample };
};

const legalPage: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const out: Settings = { ...base.settings };
  const put = writer(schema, out);
  put("eyebrow", tr(ctx, "Informations légales", "Legal information"));
  put("heading", tr(ctx, "Conditions générales de vente", "Terms and conditions of sale"));
  const today = new Date().toLocaleDateString(ctx.lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" });
  put("updated", ctx.sample ? today : todo(ctx, "date", "date"));
  if (ctx.sample) put("intro", p(tr(ctx, `Les présentes conditions encadrent les commandes passées sur la boutique ${esc(d.brand)}.`, `These terms govern orders placed on the ${esc(d.brand)} store.`) + exTail(ctx)));
  const shop = esc(d.brand);
  const parts = [
    { t: tr(ctx, "Article 1 — Objet", "Section 1 — Purpose"), x: tr(ctx, `Les présentes conditions régissent la vente des produits proposés par ${shop}, dont « ${esc(d.name)} », à tout client passant commande sur la boutique.`, `These terms govern the sale of products offered by ${shop}, including ${esc(d.name)}, to any customer ordering from the store.`) },
    { t: tr(ctx, "Article 2 — Commandes", "Section 2 — Orders"), x: tr(ctx, "La commande est ferme dès la validation du paiement. Un e-mail de confirmation récapitule les articles, le prix et l'adresse de livraison.", "An order is confirmed once payment is accepted. A confirmation email summarises the items, price and delivery address.") },
    { t: tr(ctx, "Article 3 — Prix et paiement", "Section 3 — Prices and payment"), x: tr(ctx, `Les prix sont indiqués en euros, toutes taxes comprises${d.price ? ` (${esc(d.name)} : ${d.price})` : ""}. Le paiement s'effectue par carte bancaire au moment de la commande.`, `Prices are shown in euros, taxes included${d.price ? ` (${esc(d.name)}: ${d.price})` : ""}. Payment is made by card when ordering.`) },
    { t: tr(ctx, "Article 4 — Livraison", "Section 4 — Delivery"), x: SHIP(ctx) },
    { t: tr(ctx, "Article 5 — Rétractation et retours", "Section 5 — Withdrawal and returns"), x: tr(ctx, "Vous disposez de 14 jours après réception pour exercer votre droit de rétractation, sans avoir à le justifier. Les frais de retour restent à votre charge.", "You have 14 days from delivery to withdraw from the purchase without giving a reason. Return costs are at your expense.") },
  ];
  const blocks = fillBlocks(base.blocks, schema, ["title", "text"], (i) => {
    const pt = parts[i];
    if (!pt) return null;
    return { title: pt.t, text: ctx.sample ? p(esc(pt.x) + exTail(ctx)) : p(todo(ctx, "texte validé", "approved text")) };
  });
  return { settings: out, blocks, samples: ctx.sample };
};

const richText: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const out: Settings = { ...base.settings };
  const blocks = (base.blocks ?? []).map((b) => {
    const s = { ...(b.settings ?? {}) };
    const put = writer(schema, s, b.type);
    if (b.type === "eyebrow") put("text", d.brand);
    if (b.type === "heading") put("text", d.tagline || tr(ctx, `${d.name}, en toute simplicité.`, `${d.name}, simply.`));
    if (b.type === "text") put("text", p(d.summary
      ? tr(ctx, `${esc(dot(d.summary))} À découvrir en détail dans notre boutique.`, `${esc(dot(d.summary))} Discover it in detail in our shop.`)
      : tr(ctx, `Découvrez ${esc(d.name)}, présenté en détail dans notre boutique.`, `Discover ${esc(d.name)}, presented in detail in our shop.`)));
    if (b.type === "signature") put("text", tr(ctx, `— L'équipe ${d.brand}`, `— The ${d.brand} team`));
    if (b.type === "button") put("label", tr(ctx, "Découvrir la boutique", "Visit the shop"));
    return { type: b.type, settings: s };
  });
  return { settings: out, blocks };
};

const animatedBenefits: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const out: Settings = { ...base.settings };
  const put = writer(schema, out);
  put("eyebrow", tr(ctx, "Pourquoi l'adopter", "Why you'll love it"));
  put("heading", tr(ctx, "Ce qui fait la différence,", "What makes the difference,"));
  put("heading_accent", tr(ctx, "en détail.", "in detail."));
  const items: { icon: string; title: string; text: string; value?: string; value_label?: string }[] = [];
  if (d.summary) items.push({ icon: "sparkle", title: tr(ctx, "L'essentiel", "The essentials"), text: p(esc(dot(d.summary))) });
  for (const f of d.facts) items.push({ icon: "check", title: f.label, text: p(esc(dot(f.value))) });
  for (const v of d.variants) items.push({ icon: "heart", title: tr(ctx, "À votre goût", "Your choice"), text: p(esc(tr(ctx, `${v.label} au choix : ${v.value}.`, `${v.label} options: ${v.value}.`))) });
  if (d.price) items.push({ icon: "award", title: tr(ctx, "Un prix clair", "A clear price"), text: p(esc(tr(ctx, `${d.price}, affiché avant toute commande.`, `${d.price}, shown before you order.`))) });
  items.push({ icon: "star", title: tr(ctx, "Dans le détail", "Up close"), text: p(tr(ctx, "Les photos de la fiche produit le montrent sous plusieurs angles.", "The product photos show it from several angles.")) });
  if (items.length < 3) items.push({ icon: "smile", title: tr(ctx, "Une question ?", "A question?"), text: p(tr(ctx, "Écrivez-nous : nous vous aidons à choisir.", "Write to us and we'll help you choose.")) });
  if (ctx.sample && items[0]) {
    items[0] = { ...items[0], value: tr(ctx, "4,8/5", "4.8/5"), value_label: exLabel(ctx, tr(ctx, "note moyenne", "average rating")) };
    put("source", exLabel(ctx, tr(ctx, "Note moyenne des avis clients", "Average customer rating")));
  }
  const blocks = fillBlocks(base.blocks, schema, ["title", "text"], (i) => {
    const it = items[i];
    return it ? { icon: it.icon, title: it.title, text: it.text, ...(it.value ? { value: it.value, value_label: it.value_label } : {}) } : null;
  }, Math.min(4, Math.max(3, items.length)));
  return { settings: out, blocks, samples: ctx.sample };
};

const animatedStory: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const out: Settings = { ...base.settings };
  const put = writer(schema, out);
  put("eyebrow", tr(ctx, "Notre histoire", "Our story"));
  put("heading", tr(ctx, `L'histoire de ${d.brand},`, `The ${d.brand} story,`));
  put("heading_accent", tr(ctx, "chapitre par chapitre.", "chapter by chapter."));
  const year = new Date().getFullYear() - 2;
  const chapters = [
    {
      kicker: ctx.sample ? exLabel(ctx, String(year)) : todo(ctx, "année", "year"),
      title: tr(ctx, "Le point de départ", "Where it began"),
      text: d.story ? p(esc(d.story)) : ctx.sample
        ? p(tr(ctx, "Tout est parti d'une envie simple : proposer le produit que nous aurions aimé trouver nous-mêmes.", "It all began with a simple wish: to offer the product we would have loved to find ourselves.") + exTail(ctx))
        : p(todo(ctx, "comment tout a commencé", "how it all began")),
    },
    {
      kicker: tr(ctx, "Le produit", "The product"),
      title: d.name,
      text: p(d.summary ? esc(dot(d.summary)) : tr(ctx, `${esc(d.name)}, présenté en détail dans notre boutique.`, `${esc(d.name)}, presented in detail in our shop.`)),
    },
    {
      kicker: d.brand,
      title: tr(ctx, "Aujourd'hui", "Today"),
      text: p(tr(ctx, `${esc(d.brand)} le propose aujourd'hui sur sa boutique en ligne.${d.tagline ? ` ${esc(dot(d.tagline))}` : ""}`, `${esc(d.brand)} now offers it in its online shop.${d.tagline ? ` ${esc(dot(d.tagline))}` : ""}`)),
    },
  ];
  const blocks = fillBlocks(base.blocks, schema, ["title", "text"], (i) => chapters[i] ?? null);
  return { settings: out, blocks, samples: ctx.sample };
};

const curvedMarquee: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const out: Settings = { ...base.settings };
  writer(schema, out)("text", d.tagline ? noDot(d.tagline) : d.brand);
  return { settings: out, blocks: base.blocks };
};

const dayNight: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const out: Settings = { ...base.settings };
  const put = writer(schema, out);
  put("eyebrow", d.brand);
  put("heading", tr(ctx, "Le matin comme le soir", "Morning to night"));
  put("day_title", tr(ctx, "En journée", "By day"));
  put("day_text", p(tr(ctx, "À la lumière du jour, chaque détail se découvre.", "In daylight, every detail comes through.")));
  put("night_title", tr(ctx, "Le soir venu", "Come evening"));
  put("night_text", p(tr(ctx, "Le soir, une autre ambiance : la même attention aux détails, sous un nouveau jour.", "At night, a different mood: the same attention to detail, in a new light.")));
  put("button_label", tr(ctx, "Découvrir la boutique", "Visit the shop"));
  // Aperçu figé (capture, vignette) : la scène s'affiche entière plutôt que sur une piste de défilement.
  if (ctx.sample) out.scroll_switch = false;
  return { settings: out, blocks: base.blocks };
};

const marquee: CopyFn = (ctx, base, schema) => {
  const d = info(ctx);
  const out: Settings = { ...base.settings };
  const items = [d.tagline && noDot(d.tagline), d.name, ...d.facts.map((f) => (f.label.length <= 12 ? `${f.label} ${f.value}` : f.value)), ...d.variants.flatMap((v) => v.value.split(", ")).slice(0, 2), d.collection, d.brand]
    .filter((x): x is string => !!x && x.length <= 48)
    .filter((x, i, a) => a.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i)
    .slice(0, 5);
  writer(schema, out)("items", items.join("\n"));
  return { settings: out, blocks: base.blocks };
};

export const COPY: Record<string, CopyFn> = {
  about,
  "animated-text": animatedText,
  "brand-promise": brandPromise,
  "content-tabs": contentTabs,
  faq,
  "featured-blog": featuredBlog,
  "legal-page": legalPage,
  "rich-text": richText,
  "animated-benefits": animatedBenefits,
  "animated-story": animatedStory,
  "curved-marquee": curvedMarquee,
  "day-night": dayNight,
  marquee,
};
