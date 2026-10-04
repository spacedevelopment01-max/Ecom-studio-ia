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
import { availableSectionTypes, containerOf, sectionSchema } from "../theme/spec";
import { canvasFamily } from "../media/fonts";
import { C, L } from "../i18n-server";

const SECTOR_WORDS: [SectorId, RegExp][] = [
  // Mots français puis anglais : la description peut être rédigée dans l'une ou l'autre langue.
  ["beaute", /sérum|serum|crème|creme|soin|visage|peau|cosm|parfum|maquill|shampo|lotion|baume|huile|skin ?care|\bskin\b|\bface\b|moisturi[sz]|\bcream\b|beauty|make-?up|perfume|fragrance|\bbalm\b/i],
  ["bijoux", /bijou|bague|collier|bracelet|boucle|montre|pendentif|or |argent|jewel|\brings?\b|necklace|earring|\bwatch(es)?\b|pendant|\bgold\b|\bsilver\b/i],
  ["mode", /t-?shirt|robe|pantalon|veste|sac|chaussure|basket|casquette|écharpe|vêtement|sweat|jean|\bdress(es)?\b|trousers|\bpants\b|jacket|\bbags?\b|\bshoes?\b|sneaker|\bcaps?\b|scarf|clothing|apparel|hoodie/i],
  ["hightech", /drone|caméra|camera|projecteur|gps|écouteur|casque|chargeur|câble|enceinte|bluetooth|usb|smart|clavier|souris|batterie|led|projector|earbud|headphone|charger|\bcables?\b|speaker|keyboard|\bmouse\b|battery|gadget/i],
  ["sport", /gourde|yoga|fitness|sport|randonn|vélo|running|musculation|isotherme|camping|water bottle|hiking|\bbikes?\b|bicycle|cycling|workout|\bgym\b|insulated|outdoor/i],
  ["alimentation", /café|thé|chocolat|miel|épice|confiture|huile d'olive|vin|bière|biscuit|sauce|infusion|coffee|\bteas?\b|chocolate|honey|\bspices?\b|\bjam\b|olive oil|\bwine\b|\bbeer\b|cookie|snack/i],
  ["enfants", /bébé|enfant|jouet|doudou|biberon|poussette|naissance|\bbaby\b|\bkids?\b|child|\btoys?\b|stroller|pacifier|newborn/i],
  ["animaux", /chien|\bchats?\b|animal|croquette|laisse|litière|collier pour|\bdogs?\b|\bcats?\b|\bpets?\b|kibble|leash|\blitter\b|\bcollar\b/i],
  ["maison", /bougie|tasse|mug|vase|coussin|oreiller|couette|linge de lit|lampe|déco|plaid|vaisselle|assiette|cuisine|carafe|candle|\bcups?\b|cushion|pillow|duvet|bedding|\blamps?\b|decor|\bthrow\b|tableware|\bplates?\b|kitchen/i],
  ["artisanat", /carnet|papeterie|céramique|fait main|artisan|tissage|bois tourné|poterie|notebook|stationery|ceramic|hand-?made|handcrafted|weaving|pottery/i],
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
  // Intitulés compris en français et en anglais ; le libellé du fait suit la langue des contenus.
  const labels: [RegExp, string, string, string][] = [
    [/(contenance|volume|capacité|capacity)\s*[:=]\s*([^\n;]+)/i, "capacity", "Contenance", "Capacity"],
    [/(composition|ingrédients?|ingredients?|matières?|matériaux?|materials?)\s*[:=]\s*([^\n;]+)/i, "materials", "Composition", "Composition"],
    [/(dimensions?|taille|format|size)\s*[:=]\s*([^\n;]+)/i, "dimensions", "Dimensions", "Dimensions"],
    [/(poids|weight)\s*[:=]\s*([^\n;]+)/i, "weight", "Poids", "Weight"],
    [/(utilisation|usage|mode d'emploi|how to use|directions)\s*[:=]\s*([^\n;]+)/i, "usage", "Utilisation", "How to use"],
    [/(origine|fabrication|fabriqué|origin|made in)\s*[:=]\s*([^\n;]+)/i, "origin", "Origine", "Origin"],
    [/(livraison|shipping|delivery)\s*[:=]\s*([^\n;]+)/i, "shipping", "Livraison", "Shipping"],
    [/(retours?|returns?)\s*[:=]\s*([^\n;]+)/i, "returns", "Retours", "Returns"],
    [/(entretien|care)\s*[:=]\s*([^\n;]+)/i, "care", "Entretien", "Care"],
  ];
  for (const [re, key, fr, en] of labels) {
    const m = desc.match(re);
    if (m) facts.push({ key, label: C(fr, en), value: m[2].trim(), status: "confirmed", source: "description" });
  }
  // Volumes et mesures explicites.
  const vol = desc.match(/\b(\d+(?:[.,]\d+)?)\s?(ml|cl|l|g|kg|cm|mm|oz|fl ?oz|lb)\b/i);
  if (vol && !facts.some((f) => f.key === "capacity" || f.key === "dimensions")) facts.push({ key: "capacity", label: C("Contenance / mesure", "Capacity / size"), value: `${vol[1]} ${vol[2]}`, status: "confirmed", source: "description" });
  return facts;
}

export function localAnalysis(input: { name?: string; brand?: string; description?: string; price?: number | null; colors: { hex: string; name: string; share: number }[]; link?: { title: string; description: string; product: any } | null; photos: number }): ProductProfile {
  const desc = [input.description, input.link?.product?.description, input.link?.description].filter(Boolean).join("\n");
  const name = input.name || input.link?.product?.name || "";
  const sector = guessSector(`${name} ${desc} ${input.link?.title ?? ""}`);
  const facts: Fact[] = factsFromDescription(desc);
  if (input.link?.product?.description && !facts.length) facts.push({ key: "description", label: C("Description de la source", "Source description"), value: input.link.product.description.slice(0, 400), status: "confirmed", source: "link" });
  for (const k of [["shipping", C("Délais et frais de livraison", "Shipping times and costs")], ["returns", C("Conditions de retour", "Return policy")]] as const) {
    if (!facts.some((f) => f.key === k[0])) facts.push({ key: k[0], label: k[1], value: "", status: "unknown", source: "ai" });
  }
  const price = input.price ?? input.link?.product?.price ?? null;
  const colorLine = [...new Set(input.colors.slice(0, 4).map((c) => c.name))].slice(0, 3).join(", ");
  const questions = [
    ...(price === null ? [{ id: "price", question: L("Quel est le prix de vente (TTC) ?", "What is the retail price (including tax)?"), why: L("Indispensable pour vendre ; il n'est pas déductible d'une photo.", "Essential for selling; it can't be inferred from a photo."), required: true, factKey: "price" }] : []),
    ...(!name ? [{ id: "name", question: L("Quel est le nom du produit ?", "What is the product name?"), why: L("Il apparaît partout : fiche, publicités, publications.", "It appears everywhere: product page, ads, posts."), required: true, factKey: "name" }] : []),
    { id: "shipping", question: L("Quels sont vos délais et frais de livraison ?", "What are your shipping times and costs?"), why: L("Affichés dans la FAQ et la page Livraison ; rien ne sera inventé.", "Shown in the FAQ and on the Shipping page; nothing will be made up."), required: false, factKey: "shipping" },
    { id: "returns", question: L("Quelles sont vos conditions de retour ?", "What is your return policy?"), why: L("Obligatoire pour la page Livraison et retours.", "Required for the Shipping and returns page."), required: false, factKey: "returns" },
  ];
  return {
    name,
    nameStatus: input.name ? "provided" : name ? "detected" : "unknown",
    category: "",
    sector,
    summary: desc ? desc.split(/\n|\. /)[0].slice(0, 220) : input.photos ? C(`Produit présenté en photo${colorLine ? `, dominantes ${colorLine}` : ""}.`, `Product shown in photos${colorLine ? `, mainly ${colorLine}` : ""}.`) : "",
    facts,
    visual: { colors: input.colors, description: input.photos && colorLine ? C(`Teintes dominantes observées : ${colorLine}.`, `Main colors observed: ${colorLine}.`) : "" },
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
const NAME_WORDS_FR: Record<string, string[]> = {
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
const NAME_FORMS_FR = (w: string) => [w, `Maison ${w}`, `${w} & Co`, ...(w.includes(" ") ? [] : [`Atelier ${w}`]), ...(/[\s'sx]/.test(w) ? [] : [`Les ${w}s`])];
const TAGLINES_FR: Record<string, string> = {
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

const NAME_WORDS_EN: Record<string, string[]> = {
  beaute: ["Dawn", "Sap", "Lumen", "Pearl", "Mist", "Velvet", "Iris", "Opal"],
  mode: ["Thread", "Line", "Weave", "Poise", "Ecru", "Furrow", "North Loom", "Linen"],
  bijoux: ["Gleam", "Halo", "Gold Thread", "Constellation", "Pearl", "Aurora", "Facet", "Glow"],
  maison: ["Hearth", "Slate", "Ember", "Glow", "Nook", "Clay", "Umber", "Shade"],
  hightech: ["Pixel", "Wave", "Vector", "Nova", "Circuit", "Prism", "Signal", "Orbit"],
  sport: ["Summit", "Stride", "Altitude", "Trail", "Horizon", "Ridge", "Compass", "Crest"],
  alimentation: ["Harvest", "Orchard", "Bakehouse", "Grove", "Savor", "Pantry", "Gather", "Meadow"],
  enfants: ["Little Steps", "Cuddle", "Cloud", "Jingle", "Pirouette", "Snuggle", "Lullaby", "Rhyme"],
  animaux: ["Paw", "Snout", "Bowl", "Whisker", "Companion", "Fur", "Stroll", "Tail"],
  artisanat: ["Paper", "Ink", "Workbench", "Shaving", "Quill", "Charcoal", "Canvas", "Workshop"],
};
const NAME_FORMS_EN = (w: string) => [w, `${w} & Co`, ...(w.includes(" ") ? [] : [`${w} Studio`, `The ${w} Co`]), `${w} House`];
const TAGLINES_EN: Record<string, string> = {
  beaute: "Skincare, simplified.",
  mode: "Pieces designed for you.",
  bijoux: "The details that matter.",
  maison: "Objects to live with.",
  hightech: "Tech, without the fuss.",
  sport: "Made to move.",
  alimentation: "A taste for good things.",
  enfants: "Growing up gently.",
  animaux: "For our companions.",
  artisanat: "Made with care.",
};

function proposeNames(sector: string, seed: string): string[] {
  const NAME_WORDS = C(NAME_WORDS_FR, NAME_WORDS_EN);
  const NAME_FORMS = C(NAME_FORMS_FR, NAME_FORMS_EN);
  const words = NAME_WORDS[sector] ?? NAME_WORDS.maison;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out: string[] = [];
  for (let i = 0; out.length < 5 && i < 40; i++) {
    const w = words[(h + i * 3) % words.length];
    const forms = NAME_FORMS(w).filter((f) => f.length <= 18 && !f.startsWith("Atelier Atelier") && f !== "Workshop Studio");
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
  const name = providedBrand?.trim() || proposals[0] || C(NAME_WORDS_FR, NAME_WORDS_EN).maison[0];
  const palette = paletteFromColors(p.visual.colors.length ? p.visual.colors : [{ hex: "#7A6552", share: 1 }]);
  const logoFamily = canvasFamily(d.fonts.heading, "Cormorant");
  return {
    brand: {
      name,
      nameStatus: providedBrand ? "provided" : "proposed",
      alternatives: providedBrand ? [] : proposals.slice(1),
      tagline: C(TAGLINES_FR, TAGLINES_EN)[sector] ?? "",
      positioning: C("[À définir avec vous : pour qui, pour quel usage, avec quelle différence]", "[To define with you: who it's for, what it's used for, what sets it apart]"),
      audience: C("[À préciser]", "[To complete: target audience]"),
      personality: [],
      tone: C(
        { voice: "Clair, précis et chaleureux", do: ["Parler concret", "Citer les caractéristiques vérifiées"], dont: ["Promettre sans preuve", "Superlatifs vides"] },
        { voice: "Clear, precise and warm", do: ["Keep it concrete", "Cite verified features"], dont: ["Promises without proof", "Empty superlatives"] },
      ),
      palette,
      fonts: d.fonts,
      logo: { concept: C(`Logotype typographique en ${logoFamily}`, `Typographic wordmark in ${logoFamily}`), status: "proposed" },
      story: "",
      values: [],
      direction,
      validated: [],
      generatedBy: "local",
    },
    strategy: {
      audience: [],
      angles: C(
        [{ title: "Le produit en détail", idea: "Montrer les détails réels de l'objet." }, { title: "Usage", idea: "Le produit dans son contexte." }],
        [{ title: "The product up close", idea: "Show the object's real details." }, { title: "In use", idea: "The product in its everyday context." }],
      ),
      pillars: C(["Produit", "Usage", "Coulisses"], ["Product", "In use", "Behind the scenes"]),
      keyMessages: [],
      generatedBy: "local",
    },
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

/**
 * Découpage sans IA : une structure différente selon le produit (secteur, photos disponibles),
 * pour que deux boutiques n'aient jamais la même vidéo. Seules les informations confirmées sont montrées.
 */
export function localVideoPlan(p: ProductProfile, brand: Brand, format: VideoSpec["format"], imageRoles: string[], url?: string): VideoSpec {
  const facts = p.facts.filter((f) => f.status !== "unknown" && f.value && f.value.length < 60).slice(0, 3).map((f) => f.value.replace(/\.$/, ""));
  const name = p.name || brand.name;
  const line = brand.tagline || name;
  const life = imageRoles.indexOf("lifestyle");
  const life2 = imageRoles.indexOf("lifestyle", life + 1);
  const detail = imageRoles.indexOf("detail");
  const scene = imageRoles.indexOf("scene");
  const other = (exclude: number[]) => [life2, detail, scene].find((i) => i >= 0 && !exclude.includes(i)) ?? -1;
  // Variation stable par produit : deux produits d'un même secteur n'ont pas le même montage.
  const seed = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const pick = <T,>(xs: T[]) => xs[seed % xs.length];
  const end: VideoSpec["scenes"][number] = { kind: "end", duration: 3, headline: name, cta: C("Découvrir", "Discover"), url };
  const factScene = (): VideoSpec["scenes"] => facts.length >= 2 ? [pick<VideoSpec["scenes"][number]>([{ kind: "callouts", duration: 3.4, items: facts, heading: C("En détail", "In detail") }, { kind: "words", duration: Math.min(5.4, 1.8 * facts.length), items: facts }])] : [];
  const scenes: VideoSpec["scenes"] = [];
  let transition: VideoSpec["transition"] = "panel";
  let music: VideoSpec["music"] = "calm";
  const sector = p.sector ?? "";

  if (sector === "hightech" || sector === "sport") {
    // Énergique : le produit en action, puis sous le projecteur, détails, fin.
    transition = "push";
    music = "pulse";
    if (life >= 0) scenes.push({ kind: "hook", duration: 2.6, image: life, headline: line, tag: brand.name });
    else scenes.push({ kind: "words", duration: 2.2, items: [line] });
    scenes.push({ kind: "spotlight", duration: 3, headline: name });
    scenes.push(...factScene());
    const o = other([life]);
    if (o >= 0) scenes.push({ kind: "detail", duration: 2.2, image: o });
  } else if (sector === "mode" || sector === "bijoux" || sector === "beaute") {
    // Éditorial : phrase forte, photo plein cadre, écran partagé, détail.
    transition = pick<VideoSpec["transition"]>(["push", "fade"]);
    music = "pulse";
    scenes.push({ kind: "words", duration: 2, items: [line] });
    if (life >= 0) scenes.push({ kind: "hook", duration: 2.6, image: life, headline: name });
    else scenes.push({ kind: "reveal", duration: 2.8, headline: name, motion: "zoom" });
    const o = other([life]);
    if (o >= 0) scenes.push({ kind: "split", duration: 3, image: o, headline: facts[0] ?? name });
    else scenes.push(...factScene());
  } else if (sector === "animaux" || sector === "enfants" || sector === "maison") {
    // Chaleureux : la vie de tous les jours d'abord, le produit ensuite, ce qu'il apporte.
    transition = pick<VideoSpec["transition"]>(["fade", "panel"]);
    music = "calm";
    if (life >= 0) scenes.push({ kind: "hook", duration: 2.8, image: life, headline: line, tag: brand.name });
    else scenes.push({ kind: "title", duration: 2.4, text: line, sub: name, bg: "brand" });
    const o = other([life]);
    if (o >= 0 && life >= 0) scenes.push({ kind: "split", duration: 3, image: o === life2 ? o : life, headline: name });
    else scenes.push({ kind: "reveal", duration: 2.8, headline: name, motion: pick(["rise", "zoom", "slide"] as const) });
    scenes.push(...factScene());
    if (o >= 0 && o !== life2) scenes.push({ kind: "detail", duration: 2.2, image: o });
  } else {
    // Classique (alimentation, artisanat…) : titre, révélation, détails, photos.
    transition = pick<VideoSpec["transition"]>(["panel", "fade"]);
    scenes.push({ kind: "title", duration: 2.4, text: line, sub: brand.tagline ? name : undefined, bg: pick(["brand", "dark"] as const) });
    scenes.push({ kind: "reveal", duration: 3, headline: name, motion: pick(["rise", "zoom", "slide"] as const) });
    scenes.push(...factScene());
    if (life >= 0) scenes.push({ kind: "hook", duration: 2.6, image: life, headline: facts[0] ?? line });
    const o = other([life]);
    if (o >= 0) scenes.push({ kind: "scene", duration: 2.2, image: o });
  }
  scenes.push(end);
  return { format, scenes, transition, music, captions: true };
}

/**
 * Commandes simples comprises sans IA (mode local) : annuler, couleur du
 * bouton, texte entre guillemets dans l'élément désigné, ajout ou
 * suppression de sections courantes, changement de direction.
 * Les demandes sont comprises en français comme en anglais, quelle que soit la langue :
 * la réponse suit la langue de l'interface (L), les textes ajoutés au thème celle des contenus (C).
 */
export function localThemeCommand(spec: ThemeSpec, message: string, selection: { template: string; section: string; block?: string; kind?: string } | null): { ops: ThemeOp[]; reply: string; revert: boolean; direction?: DirectionId } {
  const m = message.toLowerCase();
  if (/(reviens|revenir|annule|version précédente|\bundo\b|go back|revert|previous version|roll ?back)/.test(m)) return { ops: [], reply: L("Je reviens à la version précédente.", "Going back to the previous version."), revert: true };
  const quoted = message.match(/[«"“]\s*([^»"”]+?)\s*[»"”]/)?.[1];
  const hex = message.match(/#[0-9a-fA-F]{6}\b/)?.[0];
  // Couleurs nommées : l'anglais d'abord (« or » est aussi une conjonction anglaise), puis le français.
  const namedEn: Record<string, string> = { black: "#111111", white: "#FFFFFF", red: "#B42318", blue: "#1D4ED8", green: "#1F7A4D", gold: "#B8913A", golden: "#B8913A", beige: "#E8DCC8", pink: "#E7A5B5", orange: "#E07A2E", gray: "#6B6B6B", grey: "#6B6B6B" };
  const namedFr: Record<string, string> = { noir: "#111111", blanc: "#FFFFFF", rouge: "#B42318", bleu: "#1D4ED8", vert: "#1F7A4D", or: "#B8913A", doré: "#B8913A", beige: "#E8DCC8", rose: "#E7A5B5", orange: "#E07A2E", gris: "#6B6B6B" };
  const findColor = (named: Record<string, string>) => {
    const k = Object.keys(named).find((w) => new RegExp(`\\b${w}\\b`).test(m));
    return k ? named[k] : undefined;
  };
  const color = hex ?? findColor(namedEn) ?? findColor(namedFr);
  const ops: ThemeOp[] = [];
  const dir = DIRECTIONS.find((d) => m.includes(d.name.toLowerCase()) || m.includes(d.id));
  if (dir && /(style|direction|thème|theme|passe|switch|apply)/.test(m)) return { ops: [], reply: L(`J'applique la direction ${dir.name} en conservant vos textes et images.`, `Applying the ${dir.name} direction while keeping your copy and images.`), revert: false, direction: dir.id };
  if (color && /(bouton|button|accent|cta)/.test(m)) {
    ops.push({ op: "set_scheme_color", scheme: "scheme-1", key: "accent", value: color });
    ops.push({ op: "set_scheme_color", scheme: "scheme-2", key: "accent", value: color });
    return { ops, reply: L(`Couleur des boutons : ${color}.`, `Button color: ${color}.`), revert: false };
  }
  if (color && /(fond|arrière|background)/.test(m)) {
    ops.push({ op: "set_scheme_color", scheme: "scheme-1", key: "background", value: color });
    return { ops, reply: L(`Fond principal : ${color}.`, `Main background: ${color}.`), revert: false };
  }
  if (selection && quoted) {
    const c = containerOf(spec, selection.template);
    const s = c?.sections[selection.section];
    const target = selection.block ? s?.blocks?.[selection.block] : s;
    const key = target ? ["heading", "title", "text", "question", "label", "button_label", "heading_line1"].find((k) => k in target.settings) : undefined;
    if (key) {
      const wantsButton = (/bouton|button/.test(m) || selection.kind === "Bouton" || selection.kind === "Button") && target && "button_label" in target.settings;
      ops.push({ op: "set_setting", template: selection.template, section: selection.section, block: selection.block, key: wantsButton ? "button_label" : key, value: quoted });
      return { ops, reply: L(`Texte remplacé par « ${quoted} ».`, `Text replaced with "${quoted}".`), revert: false };
    }
  }
  // Fiche produit qui convertit : blocs ajoutés au produit, uniquement avec les informations données.
  const pdp = productPageCommand(spec, message, m);
  if (pdp) return pdp;
  // Types candidats : ceux du thème du studio, puis leurs équivalents dans les thèmes importés (Dawn et dérivés).
  const adds: [RegExp, string[]][] = [
    [/faq|questions/, ["faq", "collapsible-content"]],
    [/vidéo|video/, ["video-showcase", "video"]],
    [/défil|scroll|animation/, ["scroll-story", "multirow", "image-with-text"]],
    [/newsletter|e-?mail|inscription|sign-?up/, ["newsletter", "email-signup"]],
    [/bandeau|marquee|banner|ticker/, ["marquee", "scrolling-text", "announcement-bar"]],
    [/caractéristique|spécification|specification|\bspecs\b|\bfeatures?\b/, ["specs-list", "multicolumn"]],
    [/galerie|mosaïque|gallery|mosaic/, ["gallery-mosaic", "collage", "multicolumn"]],
    [/image avec (du )?texte|image et texte|image with text|image and text/, ["image-with-text"]],
    [/texte|paragraphe|\btext\b|paragraph/, ["rich-text"]],
  ];
  if (/ajoute|ajouter|insère|\badd\b|insert/.test(m)) {
    const hit = adds.find(([re]) => re.test(m));
    if (hit) {
      const available = new Set(availableSectionTypes(spec));
      const type = hit[1].find((t) => available.has(t));
      if (!type) return { ops: [], reply: L("Votre thème ne propose pas de section de ce genre. Ouvrez « + Section » pour voir celles qu'il contient.", "Your theme doesn't offer a section like this. Open \"+ Section\" to see the ones it includes."), revert: false };
      ops.push({ op: "add_section", template: selection?.template ?? "index", type, position: selection ? { after: selection.section } : undefined });
      return { ops, reply: L("Section ajoutée avec un contenu de départ à personnaliser.", "Section added with starter content for you to customize."), revert: false };
    }
  }
  // « Masque / affiche la section … » : section de la page désignée par son nom.
  if (/(masque|cache|affiche|réaffiche|montre|\bhide\b|\bshow\b|unhide)/.test(m)) {
    const page = selection?.template ?? "index";
    const c = containerOf(spec, page);
    const found = selection ? { id: selection.section } : c?.order.map((id) => ({ id, name: (sectionSchema(spec, c.sections[id]?.type ?? "")?.name ?? "").toLowerCase() })).find((x) => x.name && m.includes(x.name));
    if (found && c?.sections[found.id]) {
      const hide = /(masque|cache|\bhide\b)/.test(m);
      ops.push({ op: "toggle_section", template: page, section: found.id, disabled: hide });
      return { ops, reply: hide ? L("Section masquée (elle reste dans la page, réaffichable).", "Section hidden (it stays on the page and can be shown again).") : L("Section réaffichée.", "Section shown again."), revert: false };
    }
  }
  if (selection && /(supprime|retire|enlève|remove|delete)/.test(m)) {
    ops.push({ op: "remove_section", template: selection.template, section: selection.section });
    return { ops, reply: L("Section supprimée.", "Section removed."), revert: false };
  }
  if (selection && /(monte|plus haut|remonte|move (it |this )?up|higher)/.test(m)) {
    const c = containerOf(spec, selection.template);
    const i = c?.order.indexOf(selection.section) ?? 0;
    ops.push({ op: "move_section", template: selection.template, section: selection.section, position: { index: Math.max(0, i - 1) } });
    return { ops, reply: L("Section remontée.", "Section moved up."), revert: false };
  }
  if (selection && /(descends|plus bas|descend|move (it |this )?down|lower)/.test(m)) {
    const c = containerOf(spec, selection.template);
    const i = c?.order.indexOf(selection.section) ?? 0;
    ops.push({ op: "move_section", template: selection.template, section: selection.section, position: { index: i + 1 } });
    return { ops, reply: L("Section descendue.", "Section moved down."), revert: false };
  }
  return {
    ops: [],
    revert: false,
    reply: L(
      "Le moteur local comprend des commandes simples : couleur des boutons, texte entre guillemets sur l'élément désigné, ajouter une FAQ, des lots, la livraison estimée (avec vos délais), des pastilles (entre guillemets), une section avis, un abonnement, le prix dans le bouton ; supprimer, monter, revenir en arrière, changer de direction. Les retouches libres nécessitent l'IA, à activer dans l'administration.",
      "The local engine understands simple commands: button color, text in quotes on the selected element, adding an FAQ, bundles, estimated delivery (with your shipping times), badges (in quotes), a reviews section, a subscription, the price in the button; removing, moving up, going back, changing direction. Free-form edits require AI, which can be enabled in the admin area.",
    ),
  };
}

/** Commandes simples pour la fiche produit (lots, livraison, pastilles, avis, abonnement…). */
function productPageCommand(spec: ThemeSpec, message: string, m: string): { ops: ThemeOp[]; reply: string; revert: boolean } | null {
  if (!/ajoute|ajouter|insère|mets|active|\badd\b|insert|\bput\b|enable|turn on|price (in|on) the button/.test(m)) return null;
  const tpl = spec.templates.product;
  const mainId = tpl?.order.find((id) => tpl.sections[id]?.type === "main-product");
  if (!tpl || !mainId) return null;
  const main = tpl.sections[mainId];
  const blockOf = (type: string) => Object.entries(main.blocks ?? {}).find(([, b]) => b.type === type)?.[0];
  const buy = blockOf("buy_buttons");
  const after = (type: string) => ({ after: blockOf(type) ?? buy });
  const add = (type: string, settings: Record<string, string | number | boolean>, pos: { after?: string }, reply: string) => ({ ops: [{ op: "add_block", template: "product", section: mainId, type, settings, position: pos } as ThemeOp], reply, revert: false });
  const quotes = [...message.matchAll(/[«"“]\s*([^»"”]+?)\s*[»"”]/g)].map((x) => x[1]).slice(0, 4);
  if (/\blots?\b|packs?\b|compose ton panier|quantités? dégressi|\bbundles?\b|multi-?buy|quantity (break|discount)s?|volume discounts?/.test(m)) {
    return add(
      "bundles",
      { layout: /ligne|\brows?\b/.test(m) ? "rows" : "cards", heading: C("Compose ton panier", "Build your bundle"), qty1: 1, label1: C("1 article", "1 item"), qty2: 2, label2: C("2 articles", "2 items"), qty3: 3, label3: C("3 articles", "3 items"), default_tier: "1" },
      after("price"),
      L(
        "Lots ajoutés (1, 2 et 3 articles, sans remise). Indiquez vos remises dans l'éditeur Shopify et créez-les aussi dans Shopify › Réductions pour qu'elles s'appliquent au paiement.",
        "Bundles added (1, 2 and 3 items, no discount). Set your discounts in the Shopify editor and also create them in Shopify › Discounts so they apply at checkout.",
      ),
    );
  }
  if (/livraison estimée|délais? de livraison|date de livraison|estimated delivery|delivery (time|date|estimate)s?|shipping times?/.test(m)) {
    const nums = (m.match(/(\d+)\s*(?:à|-|–|et|to|and)\s*(\d+)\s*(?:jours?|days?)/) ?? m.match(/(\d+)\s*(?:jours?|days?)/))?.slice(1).filter(Boolean).map(Number);
    if (!nums?.length) return { ops: [], revert: false, reply: L("Indiquez vos délais réels, par exemple : « ajoute la livraison estimée 2 à 4 jours ». Je n'invente pas de délai.", "Tell me your real shipping times, for example: \"add estimated delivery 2 to 4 days\". I won't make up a delivery time.") };
    const [min, max] = nums.length > 1 ? nums : [0, nums[0]];
    const calendar = /calendaire|calendar/.test(m);
    return add(
      "delivery",
      { min_days: Math.min(min, max), max_days: Math.max(min, max), business_days: !calendar, label: C("Livraison estimée", "Estimated delivery") },
      { after: buy },
      L(`Livraison estimée ajoutée : ${min ? `${min} à ` : "sous "}${max} jours ${calendar ? "" : "ouvrés"}.`.trim(), `Estimated delivery added: ${min ? `${min} to ` : "within "}${max} ${calendar ? "" : "business "}days.`),
    );
  }
  if (/pastilles?|badges?/.test(m)) {
    if (!quotes.length) return { ops: [], revert: false, reply: L("Donnez les pastilles entre guillemets, par exemple : ajoute des pastilles « Fabriqué en France » « Vegan ». Seulement des engagements vérifiés.", "Give the badges in quotes, for example: add badges \"Made in France\" \"Vegan\". Verified commitments only.") };
    return add("badges", Object.fromEntries(quotes.map((q, i) => [`badge${i + 1}`, q])), { after: blockOf("title") }, L(`Pastilles ajoutées : ${quotes.join(", ")}.`, `Badges added: ${quotes.join(", ")}.`));
  }
  if (/abonnement|subscription|subscribe/.test(m)) return add("subscription", {}, after("price"), L("Bloc abonnement ajouté : il s'affichera avec les plans de votre application d'abonnement Shopify.", "Subscription block added: it will display with the plans from your Shopify subscription app."));
  if (/autres? (saveurs?|modèles?|couleurs?|parfums?)|variantes? en cartes|other (flavou?rs?|models?|styles?|colou?rs?|scents?)|variants? as cards/.test(m)) {
    const col = spec.store.collections?.[0]?.handle ?? "all";
    const flavor = /saveur|flavou?r/.test(m);
    return add(
      "siblings",
      { collection: col, heading: flavor ? C("Choisissez votre saveur", "Choose your flavor") : C("Choisissez votre modèle", "Choose your style") },
      after("title"),
      L("Cartes des autres modèles ajoutées (collection « " + col + " »).", `Cards for the other models added ("${col}" collection).`),
    );
  }
  if (/prix dans le bouton|price (in|on) the button/.test(m) && buy) return { ops: [{ op: "set_setting", template: "product", section: mainId, block: buy, key: "price_in_button", value: true }], reply: L("Le prix s'affiche désormais dans le bouton d'ajout.", "The price now shows in the add-to-cart button."), revert: false };
  if (/\bavis\b|\breviews?\b/.test(m) && !tpl.order.some((id) => tpl.sections[id]?.type === "product-reviews")) {
    return { ops: [{ op: "add_section", template: "product", type: "product-reviews", position: { after: mainId } }], reply: L("Section avis ajoutée : ajoutez-y le bloc de votre application d'avis (seuls de vrais avis s'afficheront).", "Reviews section added: add your reviews app block to it (only real reviews will be shown)."), revert: false };
  }
  if (/situations?|vous reconnaissez|sound familiar/.test(m)) {
    return { ops: [{ op: "add_section", template: "index", type: "situations" }], reply: L("Section « Vous vous reconnaissez ? » ajoutée avec trois cartes à rédiger.", "\"Sound familiar?\" section added with three cards to write."), revert: false };
  }
  return null;
}

export { mix, withLightness, contrast };
