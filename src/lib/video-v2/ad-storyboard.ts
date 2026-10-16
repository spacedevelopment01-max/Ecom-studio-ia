/**
 * STORYBOARD (publicité en scènes) d'une publicité vidéo (guide créatif, règles 1, 4 et 11) : chaque plan a un RÔLE (accroche, besoin,
 * étape de la prestation, détail, résultat, appel à l'action) et apporte une information différente.
 *
 *  - SERVICES : une étape ou un bénéfice de la prestation par plan, cherché sur Pixabay avec SES mots-clés
 *    (plâtrier peintre : protection de la pièce → préparation des surfaces → application → finition → pièce terminée),
 *    jamais cinq vidéos générales « bâtiment ». Les vidéos du client passent avant.
 *  - PRODUITS : jamais de produit de substitution ; des plans construits à partir de la référence stable du produit
 *    (découverte de la silhouette, trois quarts, gros plan d'un détail, mise en situation, plan final avec la marque).
 *    Seuls la caméra et la lumière bougent (choix du propriétaire : aucune animation « bizarre »).
 *
 * Les titres viennent de ce que le client a écrit (nom, signature, traits de sa description) : rien d'inventé.
 */
import type { Project } from "../projects";
import { C } from "../i18n-server";
import { tradeStock } from "../stock/trade-queries";
import { descriptionTraits } from "../ads-v2/poster";

export type StoryRole = "hook" | "need" | "step" | "detail" | "use" | "result" | "proof" | "cta";

export type StoryShot = {
  role: StoryRole;
  /** Ce que le plan montre, en clair (affiché dans l'aperçu de validation). */
  intent: string;
  /** Titre court à l'écran (vide : aucun texte sur ce plan). */
  title: string;
  /** SERVICES : recherches Pixabay de CETTE étape (mots-clés courts) et mots que la description doit citer. */
  stock?: { queries: string[]; must: string[]; need?: string[][] };
  /** PRODUITS : cadrage et décor de l'image de départ (en anglais pour l'IA d'images), puis mouvement caméra/lumière. */
  still?: string;
  motion?: string;
};

export type Storyboard = { route: "services" | "products"; shots: StoryShot[]; notes: string[] };

/**
 * `need` : sans contrôle visuel par l'IA, la description du plan (mots-clés de la banque) doit citer, en MOTS ENTIERS,
 * au moins un terme de CHAQUE groupe (l'étape ET le métier) — « tape » seul ramenait une cassette audio, « roller » du
 * brouillard (« fog roller »).
 */
type Step = { role: StoryRole; fr: string; en: string; queries: string[]; must: string[]; need?: string[][] };
// Métier (mots entiers) ET support (mur, pièce, chantier) : écarte peinture d'art, cassettes, textures et brouillard.
const PAINT = ["painter", "painters", "paint roller", "roller", "decorator", "renovation", "renovate", "plaster", "plasterer", "drywall", "house painter"];
const SURFACE = ["wall", "walls", "ceiling", "room", "interior", "house", "apartment", "renovation", "construction"];

/** Étapes réelles des métiers courants (mots-clés de la banque de vidéos, en anglais). */
const TRADE_STEPS: { re: RegExp; steps: Step[] }[] = [
  {
    re: /peint|platr|placo|enduit|decorat/,
    steps: [
      { role: "need", fr: "Préparation et protection de la pièce", en: "Room preparation and protection", queries: ["painter masking tape", "paint roller tray", "painter renovation room"], must: ["painter", "paint roller", "renovation"], need: [PAINT, SURFACE] },
      { role: "step", fr: "Préparation des surfaces", en: "Surface preparation", queries: ["sanding wall", "plastering wall trowel", "painter renovation wall"], must: ["plaster", "sanding", "painter"], need: [PAINT, SURFACE] },
      { role: "step", fr: "Application de la peinture", en: "Applying the paint", queries: ["paint roller wall", "painting wall roller"], must: ["paint roller", "painting", "painter"], need: [PAINT, SURFACE] },
      { role: "detail", fr: "Le geste et la finition", en: "The craft and the finish", queries: ["painter wall detail", "paint brush wall"], must: ["painter", "brush"], need: [PAINT, SURFACE] },
      // Résultat : un intérieur fini venant du MÊME métier (sans regard visuel, un « intérieur » seul ramenait un lustre).
      { role: "result", fr: "La pièce terminée", en: "The finished room", queries: ["painter renovation interior", "renovated room interior", "modern living room interior"], must: ["interior", "renovation", "painter"], need: [PAINT, ["interior", "room", "apartment", "house", "hallway", "corridor"]] },
    ],
  },
  {
    re: /plomb|sanitair|chauffag/,
    steps: [
      { role: "need", fr: "Le diagnostic", en: "The diagnosis", queries: ["plumber inspecting pipes", "leaking pipe"], must: ["plumber", "pipe", "leak"] },
      { role: "step", fr: "L'intervention", en: "The repair", queries: ["plumber wrench pipe", "plumbing repair"], must: ["wrench", "plumbing", "pipe"] },
      { role: "detail", fr: "Le détail du raccord", en: "The fitting detail", queries: ["faucet installation", "tap water"], must: ["faucet", "tap", "water"] },
      { role: "result", fr: "Une installation propre", en: "A clean installation", queries: ["modern bathroom interior", "kitchen sink water"], must: ["bathroom", "sink", "kitchen"] },
    ],
  },
  {
    re: /electri/,
    steps: [
      { role: "need", fr: "Le tableau électrique", en: "The electrical panel", queries: ["electrical panel", "fuse box"], must: ["electrical", "panel", "fuse", "switchboard"] },
      { role: "step", fr: "Le câblage", en: "The wiring", queries: ["electrician wiring", "electrical wires"], must: ["wiring", "wire", "cable", "electrician"] },
      { role: "detail", fr: "Prises et interrupteurs", en: "Sockets and switches", queries: ["light switch", "power socket"], must: ["switch", "socket", "outlet"] },
      { role: "result", fr: "La lumière en place", en: "Lighting installed", queries: ["modern lighting interior", "lamp light room"], must: ["light", "lighting", "lamp"] },
    ],
  },
  {
    re: /paysag|jardin|elagu|espaces? verts/,
    steps: [
      { role: "need", fr: "Le jardin à reprendre", en: "The garden to restore", queries: ["garden overgrown", "garden lawn"], must: ["garden", "lawn", "yard"] },
      { role: "step", fr: "La taille et l'entretien", en: "Pruning and care", queries: ["hedge trimming", "pruning shears"], must: ["hedge", "prune", "pruning", "trimming", "shears"] },
      { role: "step", fr: "Les plantations", en: "Planting", queries: ["planting flowers garden", "gardener planting"], must: ["planting", "plant", "gardener", "soil"] },
      { role: "result", fr: "Le jardin terminé", en: "The finished garden", queries: ["beautiful garden", "landscaped garden"], must: ["garden", "landscape", "landscaped"] },
    ],
  },
  {
    re: /fleur|florist/,
    steps: [
      { role: "need", fr: "Les fleurs du jour", en: "Today's flowers", queries: ["flower shop", "fresh flowers market"], must: ["flower", "flowers", "florist"] },
      { role: "step", fr: "La composition", en: "Arranging", queries: ["florist arranging bouquet", "flower arrangement"], must: ["arrang", "bouquet", "florist"] },
      { role: "detail", fr: "Le détail des fleurs", en: "Flower details", queries: ["roses close up", "peony flower"], must: ["rose", "peony", "flower", "petal"] },
      { role: "result", fr: "Le bouquet terminé", en: "The finished bouquet", queries: ["flower bouquet", "bouquet table"], must: ["bouquet", "flowers"] },
    ],
  },
  {
    re: /menuis|ebenist|charpent/,
    steps: [
      { role: "need", fr: "Le bois choisi", en: "Choosing the wood", queries: ["wood planks", "timber workshop"], must: ["wood", "timber", "plank"] },
      { role: "step", fr: "La découpe", en: "Cutting", queries: ["carpenter saw wood", "woodworking saw"], must: ["saw", "carpenter", "woodworking"] },
      { role: "detail", fr: "L'ajustage à la main", en: "Hand fitting", queries: ["wood chisel", "sanding wood"], must: ["chisel", "sanding", "wood"] },
      { role: "result", fr: "L'ouvrage posé", en: "The finished work", queries: ["wooden furniture interior", "wooden stairs"], must: ["wooden", "furniture", "wood"] },
    ],
  },
  {
    re: /nettoy|menage|proprete/,
    steps: [
      { role: "need", fr: "Avant le passage", en: "Before cleaning", queries: ["cleaning supplies", "dusty table"], must: ["cleaning", "dust", "supplies"] },
      { role: "step", fr: "Le nettoyage", en: "Cleaning", queries: ["cleaning window", "mopping floor"], must: ["cleaning", "mop", "window", "wipe"] },
      { role: "result", fr: "Un lieu impeccable", en: "A spotless place", queries: ["clean bright interior", "clean kitchen"], must: ["clean", "interior", "kitchen"] },
    ],
  },
];

/** Étapes générales d'une prestation (métier non reconnu) : besoin → geste → détail → résultat. */
function genericSteps(p: Project): Step[] {
  const trade = tradeStock(`${p.product.category ?? ""} ${(p.services?.services ?? []).map((s) => s.name).join(" ")}`);
  const q = trade?.queries ?? [p.product.category ?? ""];
  const m = trade?.must ?? [];
  return [
    { role: "need", fr: "Le besoin du client", en: "The client's need", queries: q.slice(0, 1), must: m },
    { role: "step", fr: "Le savoir-faire", en: "The craft", queries: q.slice(1, 2).concat(q.slice(0, 1)), must: m },
    { role: "detail", fr: "Le détail qui compte", en: "The detail that matters", queries: q.slice(0, 2), must: m },
    { role: "result", fr: "Le résultat", en: "The result", queries: q.slice(-1), must: m },
  ];
}

const fold = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
/** Texte montrable à l'écran : jamais un « [À compléter : …] » ni un texte vide. */
export const usable = (t?: string | null): t is string => !!t?.trim() && !/\[/.test(t);

/** Étapes de la prestation, dans l'ordre réel du travail (le service choisi d'abord, sinon tout le métier). */
export function serviceSteps(p: Project, serviceName?: string | null): Step[] {
  const text = fold(`${serviceName ?? ""} ${p.product.category ?? ""} ${(p.services?.services ?? []).map((s) => s.name).join(" ")}`);
  return TRADE_STEPS.find((t) => t.re.test(text))?.steps ?? genericSteps(p);
}

/** Plans d'un produit selon sa famille (montre, bijou, cosmétique, vêtement, objet…), toujours le VRAI produit. */
type ProductShot = { role: StoryRole; fr: string; en: string; still: string; motion: string };
const PRODUCT_SHOTS: { re: RegExp; shots: ProductShot[] }[] = [
  {
    re: /montre|horlog|watch/,
    shots: [
      { role: "hook", fr: "La silhouette dans une lumière maîtrisée", en: "The silhouette in controlled light", still: "the whole watch emerging from darkness on a dark stone surface, a single controlled light rim tracing its silhouette", motion: "very slow push-in, the light rim slowly sweeps across the case" },
      { role: "detail", fr: "Gros plan sur le cadran", en: "Close-up on the dial", still: "extreme close-up of the dial of the same watch, sharp details, shallow depth of field", motion: "slow lateral glide across the dial, a soft reflection travels over the glass" },
      { role: "detail", fr: "Le détail du bracelet", en: "The strap detail", still: "close-up of the strap and buckle of the same watch, stitching and texture visible, warm side light", motion: "slow tilt along the strap, the light warms gently" },
      { role: "use", fr: "Mise en situation", en: "In context", still: "the same watch resting on a refined wooden desk next to a leather notebook, morning light through a window", motion: "slow dolly-in, sunlight shifts slightly" },
      { role: "cta", fr: "Plan final avec la marque", en: "Final shot with the brand", still: "the whole watch centred on a calm dark background with generous empty space above and below", motion: "almost still, slow pull-out, a soft glow rises behind the watch" },
    ],
  },
  {
    re: /bijou|bague|collier|bracelet|boucle/,
    shots: [
      { role: "hook", fr: "Le bijou révélé par la lumière", en: "Revealed by light", still: "the jewel on a dark velvet surface, a single beam of light revealing it", motion: "slow push-in, light glints travel across the metal" },
      { role: "detail", fr: "Le détail de la pierre et du métal", en: "Stone and metal detail", still: "macro close-up of the same jewel, facets and polish visible", motion: "slow orbit of a few degrees, sparkles move with the light" },
      { role: "use", fr: "Mise en situation", en: "In context", still: "the same jewel placed in an open jewellery box on a marble table, soft daylight", motion: "slow dolly-in" },
      { role: "cta", fr: "Plan final avec la marque", en: "Final shot with the brand", still: "the jewel centred on a calm background with empty space above and below", motion: "slow pull-out, soft glow" },
    ],
  },
  {
    re: /cosmet|serum|creme|parfum|soin|savon|shampo/,
    shots: [
      { role: "hook", fr: "Le flacon dans sa lumière", en: "The bottle in its light", still: "the product on a wet stone surface, soft backlight through the bottle", motion: "slow push-in, light ripples gently on the surface behind" },
      { role: "detail", fr: "La matière et l'étiquette", en: "Texture and label", still: "close-up of the same product, label and cap sharp, a drop of its texture beside it", motion: "slow lateral glide" },
      { role: "use", fr: "Le rituel", en: "The ritual", still: "the same product on a bathroom shelf with a folded towel and plants, morning light", motion: "slow dolly-in, sunlight shifts" },
      { role: "cta", fr: "Plan final avec la marque", en: "Final shot with the brand", still: "the product centred on a calm background with empty space above and below", motion: "slow pull-out, soft glow" },
    ],
  },
];
const GENERIC_PRODUCT_SHOTS: ProductShot[] = [
  { role: "hook", fr: "Découverte du produit", en: "Product reveal", still: "the whole product on a refined surface, a controlled light reveals its shape", motion: "slow push-in, the light sweeps across the product" },
  { role: "detail", fr: "Vue de trois quarts", en: "Three-quarter view", still: "three-quarter view of the same product, studio light, shallow depth of field", motion: "slow orbit of a few degrees around the product" },
  { role: "detail", fr: "Gros plan sur un détail", en: "Close-up on a detail", still: "close-up of a characteristic detail of the same product (material, finish)", motion: "slow lateral glide, light travels over the surface" },
  { role: "use", fr: "Mise en situation", en: "In context", still: "the same product in a realistic setting of its everyday use, natural light", motion: "slow dolly-in" },
  { role: "cta", fr: "Plan final avec la marque", en: "Final shot with the brand", still: "the whole product centred on a calm background with empty space above and below", motion: "slow pull-out, soft glow behind the product" },
];

/** Choisit `n` éléments en gardant le premier (accroche) et le dernier (fin), répartis dans l'ordre. */
function pick<T>(list: T[], n: number): T[] {
  if (n >= list.length) return Array.from({ length: n }, (_, k) => list[Math.min(k, list.length - 1)]);
  if (n <= 1) return [list[0]];
  return Array.from({ length: n }, (_, k) => list[Math.round((k * (list.length - 1)) / (n - 1))]);
}

/**
 * Storyboard de `n` plans. Services : une étape de la prestation par plan. Produits : des cadrages différents de la
 * même référence. Les titres : accroche = signature ou nom, puis l'étape ou un trait écrit par le client.
 */
export function buildStoryboard(p: Project, n: number, o: { serviceName?: string | null; productName?: string | null } = {}): Storyboard {
  const notes: string[] = [];
  if (p.business === "services") {
    const steps = pick(serviceSteps(p, o.serviceName), n);
    const shots = steps.map((s, k): StoryShot => ({
      role: s.role,
      intent: C(s.fr, s.en),
      title: k === 0 && usable(p.brand?.tagline) ? p.brand!.tagline.slice(0, 40) : C(s.fr, s.en).slice(0, 40),
      stock: { queries: s.queries, must: s.must, ...(s.need ? { need: s.need } : {}) },
    }));
    notes.push(C("Plans d'illustration libres de droits (Pixabay) : ils ne sont pas présentés comme des réalisations du client.", "Royalty-free illustration shots (Pixabay): never presented as the client's own work."));
    return { route: "services", shots, notes };
  }
  const name = o.productName ?? p.product.name ?? "";
  const family = PRODUCT_SHOTS.find((f) => f.re.test(fold(`${p.product.category ?? ""} ${name}`)))?.shots ?? GENERIC_PRODUCT_SHOTS;
  const traits = descriptionTraits(p);
  const shots = pick(family, n).map((s, k, all): StoryShot => ({
    role: s.role,
    intent: C(s.fr, s.en),
    // Accroche : la signature (ou le nom) ; plans de détail : un trait écrit par le client ; le reste sans texte.
    title: k === 0 ? (usable(p.brand?.tagline) ? p.brand!.tagline : name).slice(0, 40) : s.role === "detail" && traits.length ? traits[(k - 1) % traits.length] : k === all.length - 1 ? name.slice(0, 40) : "",
    still: s.still,
    motion: s.motion,
  }));
  return { route: "products", shots, notes };
}
