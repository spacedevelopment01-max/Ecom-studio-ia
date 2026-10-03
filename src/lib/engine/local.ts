/**
 * Moteur local : outils déterministes utilisés lorsque aucun fournisseur
 * d'IA n'est configuré (ou en secours). Ils produisent une base de travail
 * honnête — sans inventer — et sont signalés « moteur local » dans le studio.
 */
import { hsl, hslToHex, mix, withLightness, contrast } from "../color";
import { CANVAS_FONTS } from "../media/fonts";
import type { LogoSpec } from "../media/logo";
import type { VideoSpec } from "../media/video";
import type { Brand, Fact, ProductProfile, SectorId, Strategy } from "../project-types";
import { DIRECTIONS, type DirectionId } from "../theme/directions";
import type { ThemeOp } from "../theme/ops";
import type { ThemeSpec } from "../theme/spec";
import { containerOf } from "../theme/spec";
import { canvasFamily } from "../media/fonts";

const SECTOR_WORDS: [SectorId, RegExp][] = [
  ["beaute", /sérum|serum|crème|creme|soin|visage|peau|cosm|parfum|maquill|shampo|lotion|baume|huile/i],
  ["bijoux", /bijou|bague|collier|bracelet|boucle|montre|pendentif|or |argent/i],
  ["mode", /t-?shirt|robe|pantalon|veste|sac|chaussure|basket|casquette|écharpe|vêtement|sweat|jean/i],
  ["hightech", /drone|caméra|camera|projecteur|gps|écouteur|casque|chargeur|câble|enceinte|bluetooth|usb|smart|clavier|souris|batterie|led/i],
  ["sport", /gourde|yoga|fitness|sport|randonn|vélo|running|musculation|isotherme|camping/i],
  ["alimentation", /café|thé|chocolat|miel|épice|confiture|huile d'olive|vin|bière|biscuit|sauce|infusion/i],
  ["enfants", /bébé|enfant|jouet|doudou|biberon|poussette|naissance/i],
  ["animaux", /chien|\bchats?\b|animal|croquette|laisse|litière|collier pour/i],
  ["maison", /bougie|tasse|mug|vase|coussin|oreiller|couette|linge de lit|lampe|déco|plaid|vaisselle|assiette|cuisine|carafe/i],
  ["artisanat", /carnet|papeterie|céramique|fait main|artisan|tissage|bois tourné|poterie/i],
];

/** Secteur probable : le mot-clé cité en premier l'emporte (« bougie parfumée » → maison). */
export function guessSector(text: string): SectorId | null {
  let best: { s: SectorId; at: number; len: number } | null = null;
  for (const [s, re] of SECTOR_WORDS) {
    const m = re.exec(text);
    if (m && (!best || m.index < best.at || (m.index === best.at && m[0].length > best.len))) best = { s, at: m.index, len: m[0].length };
  }
  return best?.s ?? null;
}

export const SECTOR_DIRECTION: Record<SectorId, DirectionId> = {
  beaute: "atelier",
  mode: "flux",
  bijoux: "joaillerie",
  maison: "terroir",
  hightech: "nocturne",
  sport: "elan",
  alimentation: "gourmand",
  enfants: "pop",
  animaux: "pop",
  artisanat: "galerie",
};

/** Faits extraits d'une description libre (formes simples « clé : valeur »). */
export function factsFromDescription(desc: string): Fact[] {
  const facts: Fact[] = [];
  const labels: [RegExp, string, string][] = [
    [/(contenance|volume|capacité)\s*[:=]\s*([^\n;]+)/i, "capacity", "Contenance"],
    [/(composition|ingrédients?|matières?|matériaux?)\s*[:=]\s*([^\n;]+)/i, "materials", "Composition"],
    [/(dimensions?|taille|format)\s*[:=]\s*([^\n;]+)/i, "dimensions", "Dimensions"],
    [/(poids)\s*[:=]\s*([^\n;]+)/i, "weight", "Poids"],
    [/(utilisation|usage|mode d'emploi)\s*[:=]\s*([^\n;]+)/i, "usage", "Utilisation"],
    [/(origine|fabrication|fabriqué)\s*[:=]\s*([^\n;]+)/i, "origin", "Origine"],
    [/(livraison)\s*[:=]\s*([^\n;]+)/i, "shipping", "Livraison"],
    [/(retours?)\s*[:=]\s*([^\n;]+)/i, "returns", "Retours"],
    [/(entretien)\s*[:=]\s*([^\n;]+)/i, "care", "Entretien"],
  ];
  for (const [re, key, label] of labels) {
    const m = desc.match(re);
    if (m) facts.push({ key, label, value: m[2].trim(), status: "confirmed", source: "description" });
  }
  // Volumes et mesures explicites.
  const vol = desc.match(/\b(\d+(?:[.,]\d+)?)\s?(ml|cl|l|g|kg|cm|mm)\b/i);
  if (vol && !facts.some((f) => f.key === "capacity" || f.key === "dimensions")) facts.push({ key: "capacity", label: "Contenance / mesure", value: `${vol[1]} ${vol[2]}`, status: "confirmed", source: "description" });
  return facts;
}

export function localAnalysis(input: { name?: string; brand?: string; description?: string; price?: number | null; colors: { hex: string; name: string; share: number }[]; link?: { title: string; description: string; product: any } | null; photos: number }): ProductProfile {
  const desc = [input.description, input.link?.product?.description, input.link?.description].filter(Boolean).join("\n");
  const name = input.name || input.link?.product?.name || "";
  const sector = guessSector(`${name} ${desc} ${input.link?.title ?? ""}`);
  const facts: Fact[] = factsFromDescription(desc);
  if (input.link?.product?.description && !facts.length) facts.push({ key: "description", label: "Description de la source", value: input.link.product.description.slice(0, 400), status: "confirmed", source: "link" });
  for (const k of [["shipping", "Délais et frais de livraison"], ["returns", "Conditions de retour"]] as const) {
    if (!facts.some((f) => f.key === k[0])) facts.push({ key: k[0], label: k[1], value: "", status: "unknown", source: "ai" });
  }
  const price = input.price ?? input.link?.product?.price ?? null;
  const colorLine = [...new Set(input.colors.slice(0, 4).map((c) => c.name))].slice(0, 3).join(", ");
  const questions = [
    ...(price === null ? [{ id: "price", question: "Quel est le prix de vente (TTC) ?", why: "Indispensable pour vendre ; il n'est pas déductible d'une photo.", required: true, factKey: "price" }] : []),
    ...(!name ? [{ id: "name", question: "Quel est le nom du produit ?", why: "Il apparaît partout : fiche, publicités, publications.", required: true, factKey: "name" }] : []),
    { id: "shipping", question: "Quels sont vos délais et frais de livraison ?", why: "Affichés dans la FAQ et la page Livraison ; rien ne sera inventé.", required: false, factKey: "shipping" },
    { id: "returns", question: "Quelles sont vos conditions de retour ?", why: "Obligatoire pour la page Livraison et retours.", required: false, factKey: "returns" },
  ];
  return {
    name,
    nameStatus: input.name ? "provided" : name ? "detected" : "unknown",
    category: "",
    sector,
    summary: desc ? desc.split(/\n|\. /)[0].slice(0, 220) : input.photos ? `Produit présenté en photo${colorLine ? `, dominantes ${colorLine}` : ""}.` : "",
    facts,
    visual: { colors: input.colors, description: input.photos && colorLine ? `Teintes dominantes observées : ${colorLine}.` : "" },
    price: { amount: price, currency: input.link?.product?.currency ?? "EUR", status: price === null ? "unknown" : "confirmed" },
    variants: input.link?.product?.variants?.length > 1 ? [{ name: "Option", values: input.link!.product.variants.map((v: any) => v.title) }] : [],
    questions,
    claimsToAvoid: [],
    sources: [],
    analyzedBy: "local",
  };
}

/** Palette de marque dérivée des couleurs mesurées du produit. */
export function paletteFromColors(colors: { hex: string; share: number }[]) {
  const vivid = [...colors].sort((a, b) => hsl(b.hex)[1] * (0.4 + b.share) - hsl(a.hex)[1] * (0.4 + a.share))[0]?.hex ?? "#6B5B4B";
  const [h, s] = hsl(vivid);
  const primary = hslToHex(h, Math.min(0.62, Math.max(0.25, s)), 0.36);
  const secondary = hslToHex(h, Math.min(0.35, s * 0.6), 0.84);
  const accent = hslToHex((h + 28) % 360, Math.min(0.55, Math.max(0.3, s)), 0.58);
  const light = hslToHex(h, 0.25, 0.96);
  const dark = hslToHex(h, 0.22, 0.1);
  return { primary, secondary, accent, light, dark };
}

/** Noms proposés par le moteur local : évocateurs, sans promesse, à valider par le marchand. */
const NAME_WORDS: Record<string, string[]> = {
  beaute: ["Aube", "Sève", "Lumen", "Nacre", "Brume", "Velours", "Iris", "Opaline"],
  mode: ["Faubourg", "Ligne", "Trame", "Allure", "Écru", "Sillon", "Atelier Nord", "Lin"],
  bijoux: ["Éclat", "Orée", "Fil d'Or", "Constellation", "Perle", "Aurore", "Facette", "Lueur"],
  maison: ["Sillage", "Ardoise", "Braise", "Lueur", "Foyer", "Argile", "Terre d'Ombre", "Nuance"],
  hightech: ["Pixel", "Onde", "Vecteur", "Nova", "Circuit", "Prisme", "Signal", "Orbite"],
  sport: ["Cap", "Élan", "Altitude", "Sentier", "Horizon", "Relief", "Boussole", "Crête"],
  alimentation: ["Récolte", "Terroir", "Fournil", "Verger", "Saveur", "Garrigue", "Moisson", "Cueillette"],
  enfants: ["Petit Pas", "Câlin", "Nuage", "Grelot", "Pirouette", "Doudou", "Ritournelle", "Comptine"],
  animaux: ["Patte", "Museau", "Gamelle", "Truffe", "Compagnon", "Pelage", "Balade", "Moustache"],
  artisanat: ["Papier", "Encre", "Établi", "Copeau", "Plume", "Fusain", "Canevas", "Atelier"],
};
const NAME_FORMS = (w: string) => [w, `Maison ${w}`, `${w} & Co`, ...(w.includes(" ") ? [] : [`Atelier ${w}`]), ...(/[\s'sx]/.test(w) ? [] : [`Les ${w}s`])];
const TAGLINES: Record<string, string> = {
  beaute: "Le soin, simplement.",
  mode: "Des pièces pensées pour vous.",
  bijoux: "Des détails qui comptent.",
  maison: "Des objets à vivre.",
  hightech: "La technologie, sans détour.",
  sport: "Fait pour bouger.",
  alimentation: "Le goût des bonnes choses.",
  enfants: "Grandir en douceur.",
  animaux: "Pour nos compagnons.",
  artisanat: "Fait avec soin.",
};

function proposeNames(sector: string, seed: string): string[] {
  const words = NAME_WORDS[sector] ?? NAME_WORDS.maison;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out: string[] = [];
  for (let i = 0; out.length < 5 && i < 40; i++) {
    const w = words[(h + i * 3) % words.length];
    const forms = NAME_FORMS(w).filter((f) => f.length <= 18 && !f.startsWith("Atelier Atelier"));
    const f = forms[(h >>> (i % 8)) % forms.length];
    if (f && !out.includes(f)) out.push(f);
  }
  return out;
}

export function localBrand(p: ProductProfile, providedBrand?: string): { brand: Brand; strategy: Strategy; logoSpec: Omit<LogoSpec, "color"> } {
  const sector = (p.sector ?? "maison") as SectorId;
  const direction = SECTOR_DIRECTION[sector];
  const d = DIRECTIONS.find((x) => x.id === direction)!;
  const proposals = proposeNames(sector, p.visual.colors.map((c) => c.hex).join("") + (p.name ?? ""));
  const name = providedBrand?.trim() || proposals[0] || NAME_WORDS.maison[0];
  const palette = paletteFromColors(p.visual.colors.length ? p.visual.colors : [{ hex: "#7A6552", share: 1 }]);
  const logoFamily = canvasFamily(d.fonts.heading, "Cormorant");
  return {
    brand: {
      name,
      nameStatus: providedBrand ? "provided" : "proposed",
      alternatives: providedBrand ? [] : proposals.slice(1),
      tagline: TAGLINES[sector] ?? "",
      positioning: "[À définir avec vous : pour qui, pour quel usage, avec quelle différence]",
      audience: "[À préciser]",
      personality: [],
      tone: { voice: "Clair, précis et chaleureux", do: ["Parler concret", "Citer les caractéristiques vérifiées"], dont: ["Promettre sans preuve", "Superlatifs vides"] },
      palette,
      fonts: d.fonts,
      logo: { concept: `Logotype typographique en ${logoFamily}`, status: "proposed" },
      story: "",
      values: [],
      direction,
      validated: [],
      generatedBy: "local",
    },
    strategy: { audience: [], angles: [{ title: "Le produit en détail", idea: "Montrer les détails réels de l'objet." }, { title: "Usage", idea: "Le produit dans son contexte." }], pillars: ["Produit", "Usage", "Coulisses"], keyMessages: [], generatedBy: "local" },
    logoSpec: {
      name,
      family: CANVAS_FONTS[logoFamily] ? logoFamily : "Cormorant",
      weight: d.id === "brut" || d.id === "elan" || d.id === "pop" ? 800 : 500,
      case: d.id === "terroir" || d.id === "pop" ? "title" : "upper",
      tracking: d.id === "atelier" || d.id === "galerie" ? 0.18 : 0.04,
      layout: name.length > 12 && name.includes(" ") ? "stacked" : "wordmark",
      emblem: d.id === "elan" ? "line" : "none",
    },
  };
}

export function localVideoPlan(p: ProductProfile, brand: Brand, format: VideoSpec["format"], imageCount: number, url?: string): VideoSpec {
  const facts = p.facts.filter((f) => f.status !== "unknown" && f.value && f.value.length < 60).slice(0, 3);
  const scenes: VideoSpec["scenes"] = [
    { kind: "title", duration: 2.4, text: brand.tagline || p.name || brand.name, sub: brand.tagline ? `${p.name} — ${brand.name}` : brand.name, bg: "brand" },
    { kind: "reveal", duration: 3, headline: p.name || brand.name, motion: "rise" },
  ];
  if (facts.length >= 2) scenes.push({ kind: "callouts", duration: 3.4, items: facts.map((f) => f.value), heading: "En détail" });
  if (imageCount > 0) scenes.push({ kind: "detail", duration: 2.4, image: 0 });
  if (imageCount > 1) scenes.push({ kind: "scene", duration: 2.2, image: 1 });
  scenes.push({ kind: "end", duration: 3, headline: p.name || brand.name, cta: "Découvrir", url });
  return { format, scenes, transition: "panel", music: "calm", captions: true };
}

/**
 * Commandes simples comprises sans IA (mode local) : annuler, couleur du
 * bouton, texte entre guillemets dans l'élément désigné, ajout ou
 * suppression de sections courantes, changement de direction.
 */
export function localThemeCommand(spec: ThemeSpec, message: string, selection: { template: string; section: string; block?: string; kind?: string } | null): { ops: ThemeOp[]; reply: string; revert: boolean; direction?: DirectionId } {
  const m = message.toLowerCase();
  if (/(reviens|revenir|annule|version précédente|undo)/.test(m)) return { ops: [], reply: "Je reviens à la version précédente.", revert: true };
  const quoted = message.match(/[«"“]\s*([^»"”]+?)\s*[»"”]/)?.[1];
  const hex = message.match(/#[0-9a-fA-F]{6}\b/)?.[0];
  const named: Record<string, string> = { noir: "#111111", blanc: "#FFFFFF", rouge: "#B42318", bleu: "#1D4ED8", vert: "#1F7A4D", or: "#B8913A", doré: "#B8913A", beige: "#E8DCC8", rose: "#E7A5B5", orange: "#E07A2E", gris: "#6B6B6B" };
  const colorWord = Object.keys(named).find((k) => new RegExp(`\\b${k}\\b`).test(m));
  const color = hex ?? (colorWord ? named[colorWord] : undefined);
  const ops: ThemeOp[] = [];
  const dir = DIRECTIONS.find((d) => m.includes(d.name.toLowerCase()) || m.includes(d.id));
  if (dir && /(style|direction|thème|passe)/.test(m)) return { ops: [], reply: `J'applique la direction ${dir.name} en conservant vos textes et images.`, revert: false, direction: dir.id };
  if (color && /(bouton|accent|cta)/.test(m)) {
    ops.push({ op: "set_scheme_color", scheme: "scheme-1", key: "accent", value: color });
    ops.push({ op: "set_scheme_color", scheme: "scheme-2", key: "accent", value: color });
    return { ops, reply: `Couleur des boutons : ${color}.`, revert: false };
  }
  if (color && /(fond|arrière)/.test(m)) {
    ops.push({ op: "set_scheme_color", scheme: "scheme-1", key: "background", value: color });
    return { ops, reply: `Fond principal : ${color}.`, revert: false };
  }
  if (selection && quoted) {
    const c = containerOf(spec, selection.template);
    const s = c?.sections[selection.section];
    const target = selection.block ? s?.blocks?.[selection.block] : s;
    const key = target ? ["heading", "title", "text", "question", "label", "button_label", "heading_line1"].find((k) => k in target.settings) : undefined;
    if (key) {
      const wantsButton = (/bouton/.test(m) || selection.kind === "Bouton") && target && "button_label" in target.settings;
      ops.push({ op: "set_setting", template: selection.template, section: selection.section, block: selection.block, key: wantsButton ? "button_label" : key, value: quoted });
      return { ops, reply: `Texte remplacé par « ${quoted} ».`, revert: false };
    }
  }
  // Fiche produit qui convertit : blocs ajoutés au produit, uniquement avec les informations données.
  const pdp = productPageCommand(spec, message, m);
  if (pdp) return pdp;
  const adds: [RegExp, string][] = [
    [/faq|questions/, "faq"],
    [/vidéo|video/, "video-showcase"],
    [/défil|scroll|animation/, "scroll-story"],
    [/newsletter|e-mail|inscription/, "newsletter"],
    [/bandeau|marquee/, "marquee"],
    [/caractéristique|spécification/, "specs-list"],
    [/galerie|mosaïque/, "gallery-mosaic"],
  ];
  if (/ajoute|ajouter|insère/.test(m)) {
    const hit = adds.find(([re]) => re.test(m));
    if (hit) {
      ops.push({ op: "add_section", template: selection?.template ?? "index", type: hit[1], position: selection ? { after: selection.section } : undefined });
      return { ops, reply: "Section ajoutée avec un contenu de départ à personnaliser.", revert: false };
    }
  }
  if (selection && /(supprime|retire|enlève)/.test(m)) {
    ops.push({ op: "remove_section", template: selection.template, section: selection.section });
    return { ops, reply: "Section supprimée.", revert: false };
  }
  if (selection && /(monte|plus haut|remonte)/.test(m)) {
    const c = containerOf(spec, selection.template);
    const i = c?.order.indexOf(selection.section) ?? 0;
    ops.push({ op: "move_section", template: selection.template, section: selection.section, position: { index: Math.max(0, i - 1) } });
    return { ops, reply: "Section remontée.", revert: false };
  }
  if (selection && /(descends|plus bas|descend)/.test(m)) {
    const c = containerOf(spec, selection.template);
    const i = c?.order.indexOf(selection.section) ?? 0;
    ops.push({ op: "move_section", template: selection.template, section: selection.section, position: { index: i + 1 } });
    return { ops, reply: "Section descendue.", revert: false };
  }
  return {
    ops: [],
    revert: false,
    reply: "Le moteur local comprend des commandes simples : couleur des boutons, texte entre guillemets sur l'élément désigné, ajouter une FAQ, des lots, la livraison estimée (avec vos délais), des pastilles (entre guillemets), une section avis, un abonnement, le prix dans le bouton ; supprimer, monter, revenir en arrière, changer de direction. Les retouches libres nécessitent l'IA, à activer dans l'administration.",
  };
}

/** Commandes simples pour la fiche produit (lots, livraison, pastilles, avis, abonnement…). */
function productPageCommand(spec: ThemeSpec, message: string, m: string): { ops: ThemeOp[]; reply: string; revert: boolean } | null {
  if (!/ajoute|ajouter|insère|mets|active/.test(m)) return null;
  const tpl = spec.templates.product;
  const mainId = tpl?.order.find((id) => tpl.sections[id]?.type === "main-product");
  if (!tpl || !mainId) return null;
  const main = tpl.sections[mainId];
  const blockOf = (type: string) => Object.entries(main.blocks ?? {}).find(([, b]) => b.type === type)?.[0];
  const buy = blockOf("buy_buttons");
  const after = (type: string) => ({ after: blockOf(type) ?? buy });
  const add = (type: string, settings: Record<string, string | number | boolean>, pos: { after?: string }, reply: string) => ({ ops: [{ op: "add_block", template: "product", section: mainId, type, settings, position: pos } as ThemeOp], reply, revert: false });
  const quotes = [...message.matchAll(/[«"“]\s*([^»"”]+?)\s*[»"”]/g)].map((x) => x[1]).slice(0, 4);
  if (/\blots?\b|packs?\b|compose ton panier|quantités? dégressi/.test(m)) {
    return add("bundles", { layout: /ligne/.test(m) ? "rows" : "cards", heading: "Compose ton panier", qty1: 1, label1: "1 article", qty2: 2, label2: "2 articles", qty3: 3, label3: "3 articles", default_tier: "1" }, after("price"), "Lots ajoutés (1, 2 et 3 articles, sans remise). Indiquez vos remises dans l'éditeur Shopify et créez-les aussi dans Shopify › Réductions pour qu'elles s'appliquent au paiement.");
  }
  if (/livraison estimée|délais? de livraison|date de livraison/.test(m)) {
    const nums = (m.match(/(\d+)\s*(?:à|-|et)\s*(\d+)\s*jours?/) ?? m.match(/(\d+)\s*jours?/))?.slice(1).filter(Boolean).map(Number);
    if (!nums?.length) return { ops: [], revert: false, reply: "Indiquez vos délais réels, par exemple : « ajoute la livraison estimée 2 à 4 jours ». Je n'invente pas de délai." };
    const [min, max] = nums.length > 1 ? nums : [0, nums[0]];
    return add("delivery", { min_days: Math.min(min, max), max_days: Math.max(min, max), business_days: !/calendaire/.test(m), label: "Livraison estimée" }, { after: buy }, `Livraison estimée ajoutée : ${min ? `${min} à ` : "sous "}${max} jours ${/calendaire/.test(m) ? "" : "ouvrés"}.`.trim());
  }
  if (/pastilles?|badges?/.test(m)) {
    if (!quotes.length) return { ops: [], revert: false, reply: "Donnez les pastilles entre guillemets, par exemple : ajoute des pastilles « Fabriqué en France » « Vegan ». Seulement des engagements vérifiés." };
    return add("badges", Object.fromEntries(quotes.map((q, i) => [`badge${i + 1}`, q])), { after: blockOf("title") }, `Pastilles ajoutées : ${quotes.join(", ")}.`);
  }
  if (/abonnement/.test(m)) return add("subscription", {}, after("price"), "Bloc abonnement ajouté : il s'affichera avec les plans de votre application d'abonnement Shopify.");
  if (/autres? (saveurs?|modèles?|couleurs?|parfums?)|variantes? en cartes/.test(m)) {
    const col = spec.store.collections?.[0]?.handle ?? "all";
    return add("siblings", { collection: col, heading: /saveur/.test(m) ? "Choisissez votre saveur" : "Choisissez votre modèle" }, after("title"), "Cartes des autres modèles ajoutées (collection « " + col + " »).");
  }
  if (/prix dans le bouton/.test(m) && buy) return { ops: [{ op: "set_setting", template: "product", section: mainId, block: buy, key: "price_in_button", value: true }], reply: "Le prix s'affiche désormais dans le bouton d'ajout.", revert: false };
  if (/\bavis\b/.test(m) && !tpl.order.some((id) => tpl.sections[id]?.type === "product-reviews")) {
    return { ops: [{ op: "add_section", template: "product", type: "product-reviews", position: { after: mainId } }], reply: "Section avis ajoutée : ajoutez-y le bloc de votre application d'avis (seuls de vrais avis s'afficheront).", revert: false };
  }
  if (/situations?|vous reconnaissez/.test(m)) {
    return { ops: [{ op: "add_section", template: "index", type: "situations" }], reply: "Section « Vous vous reconnaissez ? » ajoutée avec trois cartes à rédiger.", revert: false };
  }
  return null;
}

export { mix, withLightness, contrast };
