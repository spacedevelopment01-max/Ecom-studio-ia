/**
 * Image & Search Engine V2 (phase 5A) — compréhension des catégories de PRODUITS.
 *
 * Distinct du registre métier (services, `brain/trade.ts`) mais de même forme et compatible avec le Project Brain :
 * quelques catégories canoniques (alias FR/EN), un repli par secteur, puis un repli générique construit à partir du
 * libellé saisi. Pas de catalogue géant : une catégorie inconnue fonctionne toujours.
 *
 * Ce module dit OÙ et COMMENT un produit de cette famille se photographie (environnements, scènes d'usage, lumière),
 * ce qui est hors sujet, et quelles directions artistiques lui conviennent. Il ne dit rien du produit précis : son
 * identité réelle vient de `productIdentity` (faits confirmés, analyse des photos), jamais d'une supposition.
 */
import type { Project } from "../projects";
import type { SectorId } from "../project-types";
import type { ArtDirectionId } from "./types";

export type CategorySource = "core" | "sector" | "generic";

export type ProductCategoryProfile = {
  id: string;
  labels: { fr: string; en: string };
  source: CategorySource;
  /** Lieux crédibles d'usage ou de présentation (anglais : vocabulaire des banques d'images et des modèles). */
  environments: string[];
  /** Scènes d'usage (sans le produit précis : les banques d'images n'ont pas le vôtre). */
  usage: string[];
  /** Univers du produit pour les photos libres : matière, lieu, geste — jamais le produit lui-même. */
  universeQueries: string[];
  /** Concepts hors sujet pour cette famille. */
  negative: string[];
  /** Directions artistiques adaptées, de la plus naturelle à la plus forte. */
  directions: ArtDirectionId[];
  /** Points de fidélité les plus fragiles pour cette famille (contrôle produit). */
  fidelityRisks: string[];
};

type CoreCategory = Omit<ProductCategoryProfile, "source" | "labels"> & {
  fr: string;
  en: string;
  match: RegExp;
  /** Alias sur le texte AVEC accents, quand l'accent distingue le mot (« thé » ≠ l'article anglais « the »). */
  matchAccented?: RegExp;
  sectors: SectorId[];
};

const COMMON_NEGATIVE = ["competitor brand logo", "unrelated product", "cartoon illustration", "watermark"];

const CORE: CoreCategory[] = [
  {
    id: "cosmetics",
    fr: "cosmétique",
    en: "cosmetics / skincare",
    match: /cosmet|serum|creme|cream|soin (du|de la) (visage|peau)|skincare|lotion|baume|balm|huile (visage|corps)|face oil|mascara|rouge a levres|lipstick|maquillage|makeup|parfum|perfume|fragrance|shampo|savon|soap/,
    sectors: ["beaute"],
    environments: ["bathroom shelf in natural light", "vanity table", "spa-like washbasin", "minimal stone surface"],
    usage: ["hands applying cream", "morning skincare routine", "texture swatch on skin"],
    universeQueries: ["skincare routine natural light bathroom", "botanical ingredients close up", "spa towel stone washbasin"],
    negative: ["medical syringe", "hospital", "before after skin", "heavy glitter"],
    directions: ["premium_photo", "minimal_studio", "natural_lifestyle", "editorial"],
    fidelityRisks: ["label text", "cap and pump shape", "liquid colour", "bottle proportions"],
  },
  {
    id: "beauty_tools",
    fr: "accessoire beauté",
    en: "beauty tool",
    match: /brosse|brush|peigne|\bcombs?\b|seche[- ]cheveux|hair ?dryer|lisseur|straightener|gua ?sha|rouleau de jade|jade roller|miroir|mirror/,
    sectors: ["beaute"],
    environments: ["dressing table", "bright bathroom"],
    usage: ["hair styling at home", "self care moment"],
    universeQueries: ["self care routine bathroom mirror", "hair styling at home natural light"],
    negative: ["salon advertisement poster"],
    directions: ["natural_lifestyle", "minimal_studio", "premium_photo"],
    fidelityRisks: ["bristles and handle shape", "colour", "cable and buttons"],
  },
  {
    id: "tech",
    fr: "high-tech",
    en: "consumer electronics",
    match: /high[- ]?tech|electroni|gadget|casque|headphone|ecouteur|earbud|enceinte|speaker|chargeur|charger|batterie externe|power ?bank|clavier|keyboard|souris|mouse|camera|drone|montre connectee|smartwatch|tablette|tablet|smartphone|telephone|cable usb|usb|bluetooth|\bled\b/,
    sectors: ["hightech"],
    environments: ["clean modern desk", "dark studio with controlled rim light", "contemporary living room", "urban commute"],
    usage: ["person using the device at a desk", "device on the go", "close-up of ports and buttons"],
    universeQueries: ["modern minimal desk setup", "creative workspace night city light", "commute headphones city"],
    negative: ["circuit board cliché", "hologram", "matrix code", "neon glow overload"],
    directions: ["tech_universe", "minimal_studio", "product_demo", "premium_ad"],
    fidelityRisks: ["ports and buttons", "screen content", "logo position", "finish (matte or glossy)"],
  },
  {
    id: "home_decor",
    fr: "décoration",
    en: "home decor",
    match: /deco|vase|bougie|candle|coussin|cushion|plaid|throw|tapis|rug|cadre|frame|luminaire|lamp|lampe|miroir mural|wall art|affiche|poster|plante artificielle/,
    sectors: ["maison"],
    environments: ["sunlit living room", "scandinavian interior", "bedroom with linen", "architectural interior with clean lines"],
    usage: ["styled shelf", "cosy evening at home"],
    universeQueries: ["sunlit living room interior design", "scandinavian bedroom linen morning", "architectural interior soft light"],
    negative: ["messy room", "construction site", "empty white room"],
    directions: ["architectural", "warm_universe", "natural_lifestyle", "editorial"],
    fidelityRisks: ["material texture", "colour", "proportions in the room"],
  },
  {
    id: "kitchen",
    fr: "cuisine",
    en: "kitchenware",
    match: /cuisine|kitchen|poele|\bpans?\b|casserole|\bpots?\b|couteau|knife|planche a decouper|cutting board|ustensile|utensil|\bmugs?\b|tasse|\bcups?\b|assiette|\bplates?\b|\bbols?\b|\bbowls?\b|cafetiere|coffee maker|theiere|teapot|blender|robot/,
    sectors: ["maison", "alimentation"],
    environments: ["home kitchen worktop in daylight", "wooden table set for a meal", "open kitchen"],
    usage: ["cooking a family meal", "morning coffee", "serving food at the table"],
    universeQueries: ["home cooking kitchen daylight", "family dinner table wooden", "morning coffee kitchen counter"],
    negative: ["industrial restaurant kitchen", "fast food", "dirty dishes"],
    directions: ["warm_universe", "natural_lifestyle", "product_demo", "editorial"],
    fidelityRisks: ["handle and lid shape", "material finish", "size against hands"],
  },
  {
    id: "food",
    fr: "alimentation",
    en: "food & drink",
    matchAccented: /(^|[^a-zà-ÿ])thés?(?![a-zà-ÿ])/,
    match: /\btea\b|\bcafe\b|coffee|chocolat|chocolate|epice|spice|miel|honey|confiture|jam|biscuit|cookie|\bvins?\b|wine|biere|beer|jus|juice|huile d'olive|olive oil|sauce|snack|granola|infusion/,
    sectors: ["alimentation"],
    environments: ["rustic table in natural light", "kitchen counter", "picnic outdoors", "café table"],
    usage: ["pouring", "tasting", "breakfast table", "sharing with friends"],
    universeQueries: ["breakfast table natural light", "tea ceremony cup steam", "farm ingredients harvest"],
    negative: ["fast food", "plastic packaging pile", "rotten"],
    directions: ["warm_universe", "editorial", "natural_lifestyle", "premium_photo"],
    fidelityRisks: ["packaging label", "product colour", "portion realism"],
  },
  {
    id: "fashion",
    fr: "mode",
    en: "fashion",
    match: /vetement|clothing|cardigan|knitwear|robe|dress|t-?shirt|chemise|shirt|pull|sweater|sweat|hoodie|veste|jacket|manteau|coat|pantalon|trousers|jean|jupe|skirt|chaussure|shoe|basket|sneaker|botte|boot|mode|fashion/,
    sectors: ["mode"],
    environments: ["city street", "minimal studio backdrop", "natural outdoor light", "concept store"],
    usage: ["person wearing the garment", "outfit detail", "walking in the city"],
    universeQueries: ["street style city walk", "fashion editorial natural light", "minimal concept store interior"],
    negative: ["runway crowd", "mannequin", "shopping mall cliché"],
    directions: ["editorial", "natural_lifestyle", "minimal_studio", "premium_ad"],
    fidelityRisks: ["cut and fit", "fabric colour and pattern", "logo and labels", "stitching details"],
  },
  {
    id: "accessories",
    fr: "accessoires",
    en: "accessories",
    match: /sac|bag|portefeuille|wallet|ceinture|belt|lunettes|sunglasses|chapeau|\bhats?\b|casquette|cap\b|echarpe|scarf|bijou|jewel|collier|necklace|bague|\brings?\b|bracelet|boucle d'oreille|earring|montre|watch/,
    sectors: ["mode", "bijoux"],
    environments: ["marble or wood surface with soft light", "worn in the city", "travel moment"],
    usage: ["accessory worn in daily life", "detail on hand or wrist"],
    universeQueries: ["minimal flat lay leather texture", "city travel lifestyle detail", "soft light wrist detail"],
    negative: ["counterfeit luxury logos", "pawn shop"],
    directions: ["premium_photo", "editorial", "minimal_studio", "natural_lifestyle"],
    fidelityRisks: ["metal colour", "stone and engraving", "hardware shape", "logo"],
  },
  {
    id: "sport",
    fr: "sport",
    en: "sports & outdoors",
    match: /sport|fitness|yoga|tapis de yoga|yoga mat|haltere|dumbbell|velo|bike|cycling|running|course a pied|randonnee|hiking|camping|tente|tent|gourde|water bottle|raquette|racket|ballon|\bballs?\b/,
    sectors: ["sport"],
    environments: ["outdoor trail", "home workout corner", "gym with natural light", "mountain landscape"],
    usage: ["training session", "outdoor adventure", "post-workout recovery"],
    universeQueries: ["trail running morning mountain", "home workout natural light", "outdoor hiking adventure"],
    negative: ["bodybuilding competition", "injury", "stadium crowd"],
    directions: ["natural_lifestyle", "product_demo", "editorial", "premium_ad"],
    fidelityRisks: ["shape and size", "colourway", "logo"],
  },
  {
    id: "pets",
    fr: "animaux",
    en: "pet supplies",
    match: /chien|\bdogs?\b|\bchats?\b|\bcats?\b|chaton|chiot|puppy|kitten|animal|\bpets?\b|croquette|litiere|litter|laisse|leash|collier pour|griffoir|scratch|aquarium|oiseau/,
    sectors: ["animaux"],
    environments: ["cosy living room", "garden", "park walk"],
    usage: ["pet playing", "owner caring for the pet", "pet resting"],
    universeQueries: ["dog walk park morning", "cat resting cosy living room", "pet owner playing at home"],
    negative: ["stray animal", "veterinary surgery", "wild animal"],
    directions: ["warm_universe", "natural_lifestyle", "product_demo"],
    fidelityRisks: ["size relative to the animal", "colour", "materials"],
  },
  {
    id: "toys",
    fr: "jouets",
    en: "toys & kids",
    match: /jouet|toy|jeu de societe|board game|puzzle|peluche|plush|poupee|doll|lego|construction|bebe|baby|enfant|kid|eveil/,
    sectors: ["enfants"],
    environments: ["bright playroom", "family living room floor", "kindergarten-like table"],
    usage: ["child playing", "family game time"],
    universeQueries: ["family playing together living room", "bright playroom natural light", "child hands building blocks"],
    negative: ["scary", "dangerous small parts close to mouth", "messy chaos"],
    directions: ["warm_universe", "natural_lifestyle", "graphic"],
    fidelityRisks: ["colours", "number of pieces shown", "safety markings"],
  },
  {
    id: "tools",
    fr: "outillage",
    en: "tools & DIY",
    match: /outil|tool|perceuse|drill|visseuse|screwdriver|scie\b|\bsaw\b|marteau|hammer|cle (a|plate)|wrench|niveau laser|laser level|etabli|workbench|bricolage|diy|jardinage|garden tool|secateur/,
    sectors: ["maison", "artisanat"],
    environments: ["workshop bench", "renovation in progress", "garden shed"],
    usage: ["hands using the tool on a real task", "close-up of the work result"],
    universeQueries: ["workshop bench tools natural light", "home renovation hands at work", "garden shed tools"],
    negative: ["injury", "industrial factory line"],
    directions: ["product_demo", "natural_lifestyle", "tech_universe"],
    fidelityRisks: ["body colour", "battery and chuck shape", "logo"],
  },
  {
    id: "wellness",
    fr: "bien-être",
    en: "wellness",
    match: /bien[- ]etre|wellness|massage|relaxation|meditation|aromath|diffuseur|diffuser|huile essentielle|essential oil|oreiller|pillow|sommeil|sleep|bouillotte|complement|supplement|tisane/,
    sectors: ["beaute", "maison"],
    environments: ["calm bedroom at dawn", "yoga corner", "bath with candles"],
    usage: ["relaxing evening ritual", "breathing and meditation", "restful sleep"],
    universeQueries: ["calm bedroom morning light", "meditation corner natural light", "relaxing bath ritual"],
    negative: ["medical claims", "pills pile", "hospital"],
    directions: ["warm_universe", "natural_lifestyle", "minimal_studio"],
    fidelityRisks: ["shape and fabric", "colour", "label"],
  },
  {
    id: "stationery",
    fr: "papeterie & artisanat",
    en: "stationery & crafts",
    match: /papeterie|stationery|carnet|notebook|stylo|\bpens?\b|agenda|planner|\bcartes?\b|\bcards?\b|ceramique|ceramic|poterie|pottery|bougie artisanale|fait main|handmade|tricot|knit|couture|sewing/,
    sectors: ["artisanat"],
    environments: ["wooden desk with daylight", "maker workshop", "cosy café table"],
    usage: ["writing by hand", "maker at work", "gift wrapping"],
    universeQueries: ["handwriting notebook wooden desk", "maker workshop hands crafting", "gift wrapping natural light"],
    negative: ["office supply store aisle"],
    directions: ["warm_universe", "editorial", "natural_lifestyle"],
    fidelityRisks: ["paper and cover texture", "colour", "printed pattern"],
  },
  {
    id: "digital",
    fr: "produit numérique",
    en: "digital product",
    match: /logiciel|software|saas|application|app\b|ebook|e-book|formation en ligne|online course|template|modele numerique|plugin|abonnement en ligne|digital/,
    sectors: ["artisanat", "hightech"],
    environments: ["clean desk with laptop", "focused work session", "editorial graphic layout"],
    usage: ["person working on a laptop", "team collaboration", "learning online"],
    universeQueries: ["focused work laptop clean desk", "team collaboration bright office", "online learning at home"],
    negative: ["matrix code", "hacker hoodie", "fake dashboard numbers"],
    directions: ["graphic", "editorial", "tech_universe"],
    fidelityRisks: ["interface screenshots must be real", "no invented figures on screens"],
  },
];

/** Repli par secteur : quand le libellé ne correspond à aucune catégorie canonique. */
const SECTOR_FALLBACK: Partial<Record<SectorId, string>> = {
  beaute: "cosmetics",
  mode: "fashion",
  bijoux: "accessories",
  maison: "home_decor",
  hightech: "tech",
  sport: "sport",
  alimentation: "food",
  enfants: "toys",
  animaux: "pets",
  artisanat: "stationery",
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const fromCore = (c: CoreCategory, source: CategorySource, label?: string): ProductCategoryProfile => ({
  id: c.id,
  labels: { fr: label || c.fr, en: c.en },
  source,
  environments: c.environments,
  usage: c.usage,
  universeQueries: c.universeQueries,
  negative: [...c.negative, ...COMMON_NEGATIVE],
  directions: c.directions,
  fidelityRisks: c.fidelityRisks,
});

/**
 * Catégorie d'un produit (déterministe, sans IA). La catégorie saisie et le nom priment sur le résumé (« crème » dans
 * un résumé de bougie ne fait pas une bougie un cosmétique). Ne renvoie jamais « rien » : secteur, puis générique.
 */
export function resolveProductCategory(input: { category?: string | null; name?: string | null; summary?: string | null; sector?: SectorId | null }): ProductCategoryProfile {
  for (const text of [input.category, input.name, input.summary]) {
    if (!text?.trim()) continue;
    const t = norm(text);
    const raw = text.toLowerCase();
    const at = (c: CoreCategory) => {
      const a = t.search(c.match);
      const b = c.matchAccented ? raw.search(c.matchAccented) : -1;
      return a < 0 ? b : b < 0 ? a : Math.min(a, b);
    };
    const hits = CORE.map((c) => ({ c, at: at(c) })).filter((h) => h.at >= 0).sort((a, b) => a.at - b.at);
    if (hits.length) return fromCore(hits[0].c, "core");
  }
  const label = (input.category || input.name || "").trim().slice(0, 80);
  const fb = input.sector ? SECTOR_FALLBACK[input.sector] : undefined;
  if (fb) return fromCore(CORE.find((c) => c.id === fb)!, "sector", label || undefined);
  // Générique : le libellé du client garde la précision ; scènes sûres (usage réel, lumière naturelle).
  return {
    id: "generic",
    labels: { fr: label, en: label },
    source: "generic",
    environments: ["clean neutral surface in natural light", "real home interior"],
    usage: label ? [`person using ${label} in daily life`] : ["person using the product in daily life"],
    universeQueries: label ? [`${label} in daily life natural light`] : [],
    negative: COMMON_NEGATIVE,
    directions: ["minimal_studio", "natural_lifestyle", "product_demo"],
    fidelityRisks: ["shape", "colour", "logo and label"],
  };
}

export const coreCategoryIds = () => CORE.map((c) => c.id);

/** Identité RÉELLE d'un produit : seulement ce qui est confirmé ou vu sur ses photos ; le reste ne s'invente pas. */
export type ProductIdentity = {
  name: string;
  category: ProductCategoryProfile;
  shape: string | null;
  colors: string[];
  materials: string[];
  /** Dimensions connues (fait confirmé), sinon null. */
  dimensions: string | null;
  /** Caractéristiques confirmées par le client. */
  features: string[];
  labelText: string[];
  hasLogo: boolean;
  /** Ce qui ne doit JAMAIS être inventé ni modifié sur l'image. */
  neverInvent: string[];
  /** Photo de référence du produit disponible (détourage valide) : condition de toute image du produit. */
  hasReference: boolean;
};

export function productIdentity(p: Pick<Project, "product" | "catalog">, opts: { hasReference?: boolean } = {}): ProductIdentity {
  const pr = p.product;
  const confirmed = pr.facts.filter((f) => f.status === "confirmed");
  const dim = confirmed.find((f) => /dimension|taille|size|format|contenance|volume|capacit|poids|weight/i.test(`${f.key} ${f.label}`));
  const unknown = pr.facts.filter((f) => f.status === "unknown").map((f) => f.label);
  return {
    name: pr.name,
    category: resolveProductCategory(pr),
    shape: pr.visual?.shape ?? null,
    colors: (pr.visual?.colors ?? []).filter((c) => c.share >= 0.08).map((c) => c.name || c.hex),
    materials: pr.visual?.materials ?? [],
    dimensions: dim ? dim.value : null,
    features: confirmed.filter((f) => f !== dim).map((f) => `${f.label} : ${f.value}`).slice(0, 10),
    labelText: pr.visual?.labelText ?? [],
    hasLogo: !!pr.visual?.hasLogo,
    neverInvent: [
      "shape",
      "colour",
      "logo",
      "label and packaging text",
      "proportions",
      "components",
      ...unknown.map((u) => `${u} (inconnu)`),
      ...pr.claimsToAvoid.slice(0, 6),
    ],
    hasReference: !!opts.hasReference,
  };
}
