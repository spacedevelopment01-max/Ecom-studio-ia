/**
 * Registre métier canonique du Project Brain (phase 2.0, lecture seule : il n'est encore branché sur aucun moteur).
 *
 * Organisation compacte et composable, sans liste géante :
 *  1. métiers canoniques (CORE) : quelques dizaines de métiers fréquents, chacun avec ses alias (expression FR/EN) ;
 *  2. combinaisons déclarées (« plâtrier peintre » = plâtrier + peintre) ;
 *  3. repli par secteur (SECTOR_FALLBACK) quand aucun métier canonique ne correspond ;
 *  4. repli générique : le libellé saisi par le client, avec les concepts négatifs communs.
 * Un métier inconnu fonctionne donc toujours ; aucune entrée n'est nécessaire avant que le studio le comprenne.
 *
 * Les requêtes de photos suivent ACTION + MÉTIER + ENVIRONNEMENT (jamais un mot seul comme « mur » ou « texture »).
 * Les concepts négatifs servent au tri, au contrôle qualité et aux exclusions des sources qui les acceptent :
 * ils ne sont pas collés tels quels dans chaque requête.
 */
import type { SymbolKind } from "../media/logo";
import { SECTORS, type SectorId } from "../project-types";

export type TradeSource = "core" | "combo" | "sector" | "generic";

export type TradeProfile = {
  /** Identifiant canonique (« plasterer_painter ») ; « a+b » pour une composition non déclarée ; « sector:<id> » ou « generic ». */
  id: string;
  labels: { fr: string; en: string };
  sector: SectorId | null;
  /** D'où vient la compréhension : métier canonique, combinaison, repli secteur, repli générique. */
  source: TradeSource;
  /** Métiers canoniques reconnus, dans l'ordre du texte. */
  parts: string[];
  /** Gestes du métier (anglais, vocabulaire des banques d'images et des modèles). */
  actions: string[];
  visuals: { positive: string[]; negative: string[] };
  /** Requêtes de photos libres : ACTION + MÉTIER + ENVIRONNEMENT. */
  search: { queries: string[]; negative: string[] };
  icons: { keywords: string[]; avoid: string[] };
  symbol: SymbolKind | null;
};

type CoreTrade = {
  id: string;
  fr: string;
  en: string;
  sector: SectorId;
  /** Alias FR/EN, sur un texte en minuscules sans accents. */
  match: RegExp;
  /**
   * Alias sur le texte AVEC accents, quand l'accent distingue le métier d'un autre mot (« maçon » ≠ la ville de
   * « Mâcon » : sans accents, les deux s'écrivent « macon »). Remplace alors `match`.
   */
  matchAccented?: RegExp;
  actions: string[];
  positive: string[];
  negative?: string[];
  queries: string[];
  icons: string[];
  iconAvoid?: string[];
  symbol: SymbolKind | null;
};

/** Concepts hors sujet pour tout métier : décor seul, matière seule, objet isolé, photo de banque générique. */
export const GLOBAL_NEGATIVES = ["empty room", "bare wall", "wall texture", "background texture", "isolated object", "generic handshake", "office stock photo"];

const CORE: CoreTrade[] = [
  {
    id: "plasterer",
    fr: "plâtrier",
    en: "plasterer",
    sector: "batiment",
    match: /pl[a]tr|plaquist|placo|staff|enduit|stuc|plasterer|drywall/,
    actions: ["plastering", "skim coating", "drywall installation", "jointing", "sanding"],
    positive: ["craftsman applying plaster", "drywall installation in a room under renovation", "smooth wall finishing", "interior renovation site"],
    negative: ["brick wall", "stone wall", "exterior facade", "construction crane"],
    queries: ["plasterer applying skim coat to interior wall", "drywall installer fixing plasterboard ceiling", "plasterer smoothing plaster with trowel"],
    icons: ["trowel", "ruler", "paint", "brush"],
    iconAvoid: ["wall", "bricks"],
    symbol: "brush",
  },
  {
    id: "painter",
    fr: "peintre en bâtiment",
    en: "interior painter",
    sector: "batiment",
    match: /peintre|peinture|painter|decorat/,
    actions: ["painting", "wall preparation", "filling", "masking", "finishing"],
    positive: ["painter rolling paint on an interior wall", "decorator preparing a wall before painting", "freshly painted living room", "clean renovation work"],
    negative: ["art painting", "canvas painting", "isolated paint can", "graffiti", "brick wall"],
    queries: ["painter painting interior wall with roller", "decorator preparing wall before painting", "house painter painting living room ceiling"],
    icons: ["paint", "brush", "roller"],
    iconAvoid: ["palette", "wall", "bricks"],
    symbol: "brush",
  },
  {
    id: "mason",
    fr: "maçon",
    en: "mason",
    sector: "batiment",
    match: /\bmason|bricklay/,
    matchAccented: /maçon|\bmason|bricklay/,
    actions: ["bricklaying", "concrete work", "foundation work"],
    positive: ["mason laying bricks on a building site", "builder pouring concrete"],
    queries: ["mason laying bricks on building site", "builder pouring concrete foundation"],
    icons: ["bricks", "trowel", "building"],
    symbol: "house",
  },
  {
    id: "electrician",
    fr: "électricien",
    en: "electrician",
    sector: "batiment",
    match: /electric/,
    actions: ["wiring", "electrical panel installation", "lighting installation"],
    positive: ["electrician working on an electrical panel", "electrician installing lighting in a home"],
    negative: ["lightning storm", "power lines landscape"],
    queries: ["electrician wiring electrical panel in home", "electrician installing ceiling light"],
    icons: ["bolt", "plug", "bulb"],
    symbol: "bolt",
  },
  {
    id: "plumber",
    fr: "plombier",
    en: "plumber",
    sector: "batiment",
    match: /plomb|chauffagist|sanitaire|plumb/,
    actions: ["pipe fitting", "boiler repair", "bathroom installation"],
    positive: ["plumber repairing pipes under a sink", "heating engineer servicing a boiler"],
    negative: ["water drop macro", "swimming pool"],
    queries: ["plumber repairing pipes under kitchen sink", "heating engineer servicing boiler"],
    icons: ["droplet", "tool", "pipe"],
    symbol: "drop",
  },
  {
    id: "carpenter",
    fr: "menuisier",
    en: "carpenter",
    sector: "batiment",
    match: /menuis|charpent|ebenist|carpent|joiner|woodwork/,
    actions: ["woodworking", "joinery", "furniture making", "installing doors"],
    positive: ["carpenter working wood in a workshop", "joiner installing a wooden door"],
    negative: ["forest", "log pile"],
    queries: ["carpenter working wood in workshop", "joiner installing wooden door in home"],
    icons: ["hammer", "saw", "ruler"],
    symbol: "wrench",
  },
  {
    id: "tiler",
    fr: "carreleur",
    en: "tiler",
    sector: "batiment",
    match: /carrel|tiler|tiling/,
    actions: ["tiling", "grouting", "floor laying"],
    positive: ["tiler laying floor tiles", "craftsman grouting bathroom tiles"],
    negative: ["tile pattern texture"],
    queries: ["tiler laying floor tiles in bathroom", "craftsman grouting wall tiles"],
    icons: ["layout-grid", "ruler"],
    symbol: "house",
  },
  {
    id: "roofer",
    fr: "couvreur",
    en: "roofer",
    sector: "batiment",
    match: /couvr|toitur|zingu|roofer|roofing/,
    actions: ["roofing", "tile replacement", "gutter repair"],
    positive: ["roofer working on a tiled roof"],
    queries: ["roofer repairing tiled roof", "roofer installing roof tiles"],
    icons: ["home", "ladder"],
    symbol: "house",
  },
  {
    id: "gardener",
    fr: "paysagiste",
    en: "landscape gardener",
    sector: "batiment",
    match: /paysag|jardin|elagu|gardener|landscap/,
    actions: ["garden design", "hedge trimming", "lawn care", "planting"],
    positive: ["landscape gardener trimming a hedge", "gardener planting in a garden"],
    queries: ["landscape gardener trimming hedge", "gardener planting flowers in garden"],
    icons: ["plant", "leaf", "tree"],
    symbol: "leaf",
  },
  {
    id: "hairdresser",
    fr: "coiffeur",
    en: "hairdresser",
    sector: "bienetre",
    match: /coiff|barbier|hairdress|barber|hair salon/,
    actions: ["haircut", "hair colouring", "styling"],
    positive: ["hairdresser cutting a client's hair in a salon"],
    negative: ["wig on mannequin"],
    queries: ["hairdresser cutting client hair in salon", "barber trimming beard"],
    icons: ["scissors", "comb"],
    symbol: "scissors",
  },
  {
    id: "beautician",
    fr: "esthéticienne",
    en: "beautician",
    sector: "bienetre",
    match: /esthetic|institut|beautician|nail|ongl|manucur|massage|spa\b/,
    actions: ["facial treatment", "massage", "manicure"],
    positive: ["beautician giving a facial treatment", "therapist giving a massage"],
    queries: ["beautician giving facial treatment in spa", "therapist giving relaxing massage"],
    icons: ["sparkles", "flower"],
    symbol: "drop",
  },
  {
    id: "physiotherapist",
    fr: "kinésithérapeute",
    en: "physiotherapist",
    sector: "sante",
    match: /kine|physio|osteo/,
    actions: ["physiotherapy session", "rehabilitation exercises", "manual therapy"],
    positive: ["physiotherapist treating a patient's shoulder"],
    negative: ["hospital corridor", "pills"],
    queries: ["physiotherapist treating patient shoulder", "patient doing rehabilitation exercise with therapist"],
    icons: ["stretching", "heartbeat"],
    symbol: "wave",
  },
  {
    id: "coach",
    fr: "coach sportif",
    en: "personal trainer",
    sector: "coaching",
    match: /coach|personal trainer|preparat.*physique|fitness/,
    actions: ["personal training", "workout coaching"],
    positive: ["personal trainer coaching a client"],
    queries: ["personal trainer coaching client workout", "fitness coach training client outdoors"],
    icons: ["barbell", "run"],
    symbol: "bolt",
  },
  {
    id: "photographer",
    fr: "photographe",
    en: "photographer",
    sector: "evenementiel",
    match: /photograph/,
    actions: ["photo shoot", "event photography", "portrait session"],
    positive: ["photographer shooting a portrait session"],
    queries: ["photographer shooting portrait session", "event photographer at wedding"],
    icons: ["camera", "aperture"],
    symbol: "orbit",
  },
  {
    id: "caterer",
    fr: "traiteur",
    en: "caterer",
    sector: "restauration",
    match: /traiteur|restaura|cuisinier|chef cuisinier|caterer|catering/,
    actions: ["cooking", "plating", "catering service"],
    positive: ["chef plating dishes in a kitchen", "caterer serving a buffet"],
    queries: ["chef plating dishes in professional kitchen", "caterer serving buffet at event"],
    icons: ["chef-hat", "tools-kitchen"],
    symbol: "cup",
  },
  {
    id: "accountant",
    fr: "expert-comptable",
    en: "accountant",
    sector: "conseil",
    match: /compta|accountant|fiscal|avocat|juris|notair|lawyer/,
    actions: ["client meeting", "advisory", "document review"],
    positive: ["advisor meeting a client in an office"],
    queries: ["advisor meeting client in office", "accountant reviewing documents with client"],
    icons: ["calculator", "briefcase"],
    symbol: "key",
  },
  {
    id: "realtor",
    fr: "agent immobilier",
    en: "real estate agent",
    sector: "immobilier",
    match: /immobili|real estate|realtor/,
    actions: ["property visit", "handing over keys"],
    positive: ["real estate agent showing a home to buyers"],
    queries: ["real estate agent showing house to couple", "agent handing keys to new homeowners"],
    icons: ["home", "key"],
    symbol: "key",
  },
  {
    id: "mechanic",
    fr: "mécanicien",
    en: "car mechanic",
    sector: "domicile",
    match: /garag|mecani|carross|mechanic|auto repair|body shop/,
    actions: ["car repair", "bodywork", "car painting"],
    positive: ["mechanic repairing a car engine in a garage"],
    queries: ["mechanic repairing car engine in garage", "body shop technician painting car"],
    icons: ["car", "tool"],
    symbol: "car",
  },
  {
    id: "cleaner",
    fr: "agent d'entretien",
    en: "cleaning service",
    sector: "domicile",
    match: /menage|nettoyage|cleaning|cleaner/,
    actions: ["home cleaning", "office cleaning"],
    positive: ["cleaner cleaning a bright living room"],
    queries: ["professional cleaner cleaning living room", "cleaning service team in office"],
    icons: ["spray", "bucket"],
    symbol: "spark",
  },
];

/** Combinaisons fréquentes déclarées une fois (identifiant et libellés propres). */
const COMBOS: { parts: string[]; id: string; fr: string; en: string }[] = [{ parts: ["plasterer", "painter"], id: "plasterer_painter", fr: "plâtrier peintre", en: "plasterer / interior painter" }];

/** Repli par secteur : concepts sûrs quand aucun métier canonique ne correspond. */
const SECTOR_FALLBACK: Partial<Record<SectorId, { actions: string[]; positive: string[]; queries: string[]; icons: string[]; symbol: SymbolKind | null }>> = {
  batiment: { actions: ["renovation work", "installation", "repair"], positive: ["craftsman working on an interior renovation"], queries: ["craftsman working on interior renovation", "tradesman repairing home interior"], icons: ["tool", "home"], symbol: "house" },
  bienetre: { actions: ["treatment", "care session"], positive: ["professional giving a treatment to a client"], queries: ["professional giving wellness treatment to client"], icons: ["sparkles"], symbol: "drop" },
  sante: { actions: ["consultation", "care session"], positive: ["practitioner with a patient"], queries: ["practitioner consulting patient in practice"], icons: ["heartbeat"], symbol: "wave" },
  coaching: { actions: ["coaching session"], positive: ["coach with a client"], queries: ["coach working with client"], icons: ["run"], symbol: "bolt" },
  conseil: { actions: ["client meeting", "advisory"], positive: ["advisor meeting a client"], queries: ["advisor meeting client in office"], icons: ["briefcase"], symbol: "key" },
  restauration: { actions: ["cooking", "service"], positive: ["chef cooking in a kitchen"], queries: ["chef cooking in professional kitchen"], icons: ["chef-hat"], symbol: "cup" },
  immobilier: { actions: ["property visit"], positive: ["agent showing a home"], queries: ["real estate agent showing home"], icons: ["home"], symbol: "key" },
  formation: { actions: ["teaching", "workshop"], positive: ["trainer teaching a small group"], queries: ["trainer teaching small group workshop"], icons: ["school"], symbol: "spark" },
  evenementiel: { actions: ["event service"], positive: ["professional working at an event"], queries: ["professional working at private event"], icons: ["confetti"], symbol: "spark" },
  domicile: { actions: ["home service"], positive: ["professional helping at home"], queries: ["professional providing home service"], icons: ["home"], symbol: "house" },
  agence: { actions: ["client workshop", "design work"], positive: ["team working with a client"], queries: ["agency team working with client"], icons: ["device-laptop"], symbol: "orbit" },
};

export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const uniq = <T,>(a: T[]) => [...new Set(a)];

/** Métiers canoniques présents dans le texte, dans l'ordre d'apparition. */
function coreMatches(text: string): CoreTrade[] {
  const t = norm(text);
  const raw = text.toLowerCase();
  return CORE.map((c) => ({ c, i: c.matchAccented ? raw.search(c.matchAccented) : t.search(c.match) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.c);
}

/**
 * Comprend le métier à partir du texte (catégorie, nom de l'activité, prestations) et du secteur déjà détecté.
 * Déterministe, sans IA. Ne renvoie jamais « rien » : repli secteur puis repli générique.
 */
export function resolveTrade(text: string, sector?: SectorId | null): TradeProfile {
  const found = coreMatches(text);
  if (found.length) {
    const ids = found.map((c) => c.id);
    const combo = COMBOS.find((k) => k.parts.length === ids.length && k.parts.every((p) => ids.includes(p)));
    // Requêtes alternées (une par métier d'abord), comme les recherches actuelles par métier.
    const queries: string[] = [];
    for (let i = 0; i < Math.max(...found.map((c) => c.queries.length)); i++) for (const c of found) if (c.queries[i]) queries.push(c.queries[i]);
    const negatives = uniq([...found.flatMap((c) => c.negative ?? []), ...GLOBAL_NEGATIVES]);
    return {
      id: combo?.id ?? ids.join("+"),
      labels: combo ? { fr: combo.fr, en: combo.en } : { fr: found.map((c) => c.fr).join(" · "), en: found.map((c) => c.en).join(" / ") },
      sector: found[0].sector ?? sector ?? null,
      source: combo ? "combo" : "core",
      parts: ids,
      actions: uniq(found.flatMap((c) => c.actions)),
      visuals: { positive: uniq(found.flatMap((c) => c.positive)), negative: negatives },
      search: { queries: uniq(queries), negative: negatives },
      icons: { keywords: uniq(found.flatMap((c) => c.icons)), avoid: uniq(found.flatMap((c) => c.iconAvoid ?? [])) },
      symbol: found[0].symbol,
    };
  }
  const label = text.trim().split(/[,.;\n]/)[0]?.trim().slice(0, 80) ?? "";
  const fb = sector ? SECTOR_FALLBACK[sector] : undefined;
  if (fb) {
    const s = SECTORS.find((x) => x.id === sector)!;
    return {
      id: `sector:${sector}`,
      labels: { fr: label || s.label, en: s.labelEn },
      sector: sector!,
      source: "sector",
      parts: [],
      actions: fb.actions,
      visuals: { positive: fb.positive, negative: GLOBAL_NEGATIVES },
      // Le libellé du client garde la précision du métier ; le secteur apporte un environnement sûr.
      search: { queries: uniq([...(label ? [`${label} professional at work`] : []), ...fb.queries]), negative: GLOBAL_NEGATIVES },
      icons: { keywords: fb.icons, avoid: [] },
      symbol: fb.symbol,
    };
  }
  return {
    id: "generic",
    labels: { fr: label, en: label },
    sector: sector ?? null,
    source: "generic",
    parts: [],
    actions: [],
    visuals: { positive: label ? [`${label} professional at work`] : [], negative: GLOBAL_NEGATIVES },
    search: { queries: label ? [`${label} professional at work`, `${label} working with a client`] : [], negative: GLOBAL_NEGATIVES },
    icons: { keywords: [], avoid: [] },
    symbol: null,
  };
}

/** Texte métier d'un projet : catégorie, nom de l'activité et prestations (même base que les tables actuelles). */
export function tradeText(p: { product: { category?: string; name?: string; summary?: string }; services?: { services?: { name: string }[] } }): string {
  return [p.product.category, p.product.name, p.product.summary, ...(p.services?.services ?? []).map((s) => s.name)].filter(Boolean).join(" · ");
}

export const coreTradeIds = () => CORE.map((c) => c.id);
