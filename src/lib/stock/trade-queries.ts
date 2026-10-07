/**
 * Recherches de photos libres par métier, sans IA : chaque métier courant a des scènes concrètes en anglais (là où les
 * banques d'images sont les mieux décrites) et les mots qui doivent figurer dans la description d'une photo pour
 * qu'elle soit retenue. Un mur, une texture ou un bâtiment sans le geste du métier n'y figurent pas.
 */
import { GLOBAL_NEGATIVES, resolveTrade } from "../brain/trade";

type Trade = { re: RegExp; queries: string[]; must: string[] };

const TRADES: Trade[] = [
  { re: /platr|plaquist|placo|staff|enduit|stuc/, queries: ["plasterer plastering wall", "drywall plasterboard installation"], must: ["plaster", "plasterer", "plastering", "drywall", "plasterboard", "trowel", "stucco", "putty", "spackle"] },
  { re: /peint|peinture/, queries: ["painter paint roller wall", "house painter painting room"], must: ["painter", "paint roller", "paintbrush", "paint brush", "painting wall", "wall painting", "paint can", "roller", "decorator"] },
  { re: /carrel|faience|mosaiq/, queries: ["tiler laying floor tiles", "bathroom wall tiling"], must: ["tile", "tiles", "tiling", "tiler", "ceramic", "grout", "mosaic"] },
  { re: /plomb|sanitair|chauffagist/, queries: ["plumber fixing pipes", "plumbing repair wrench"], must: ["plumber", "plumbing", "pipe", "pipes", "faucet", "tap", "wrench", "boiler", "sink"] },
  { re: /electri/, queries: ["electrician wiring electrical panel", "electrical installation work"], must: ["electrician", "electrical", "electricity", "wiring", "wire", "cable", "socket", "fuse", "switchboard"] },
  { re: /cuisinist/, queries: ["fitted kitchen installation", "kitchen cabinets fitting"], must: ["kitchen", "cabinet", "worktop"] },
  { re: /menuis|ebenist|charpent|agenceu/, queries: ["carpenter woodworking workshop", "carpentry wood tools"], must: ["carpenter", "carpentry", "woodwork", "woodworking", "joinery", "timber", "wood", "lumber", "saw"] },
  { re: /macon|maconn|beton/, queries: ["bricklayer laying bricks mortar", "masonry construction work"], must: ["bricklayer", "bricklaying", "mortar", "masonry", "mason", "concrete", "cement"] },
  { re: /couvr|toitur|zingu/, queries: ["roofer working on roof", "roof tiles repair"], must: ["roof", "roofer", "roofing", "shingle", "gutter"] },
  { re: /isol/, queries: ["home insulation installation", "attic insulation work"], must: ["insulation", "insulating", "insulate", "mineral wool"] },
  { re: /parquet|solier|revetement de sol|revetements de sol/, queries: ["wood floor installation", "laying laminate flooring"], must: ["floor", "flooring", "parquet", "laminate", "floorboard"] },
  { re: /climatis|pompe a chaleur|frigor/, queries: ["air conditioning installation", "heat pump outdoor unit"], must: ["air conditioning", "air conditioner", "conditioner", "heat pump", "hvac", "ventilation"] },
  { re: /facad|ravalement/, queries: ["facade renovation scaffolding", "house exterior painting"], must: ["facade", "scaffolding", "exterior", "render"] },
  { re: /paysag|jardin|elagu|espaces? verts/, queries: ["landscaping garden work", "gardener trimming hedge"], must: ["garden", "gardening", "gardener", "landscaping", "lawn", "hedge", "pruning", "plants"] },
  { re: /piscin/, queries: ["swimming pool maintenance", "pool cleaning"], must: ["pool", "swimming"] },
  { re: /nettoy|menage|propret/, queries: ["professional cleaning service", "house cleaning mop"], must: ["cleaning", "cleaner", "clean", "mop", "vacuum", "housework"] },
  { re: /demenag/, queries: ["moving boxes removal", "moving truck boxes"], must: ["moving", "boxes", "removal", "cardboard", "relocation"] },
  { re: /serrur/, queries: ["locksmith door lock", "door lock repair key"], must: ["lock", "locksmith", "key", "keys", "padlock"] },
  { re: /vitrer|vitrier|miroit/, queries: ["glazier window installation", "window glass fitting"], must: ["glass", "glazier", "window", "windows", "glazing"] },
  { re: /garag|mecani|carross|automobil/, queries: ["car mechanic repair garage", "auto repair workshop"], must: ["mechanic", "garage", "car", "engine", "repair", "auto", "vehicle"] },
  { re: /coiff/, queries: ["hair salon hairdresser", "hairdresser cutting hair"], must: ["hair", "hairdresser", "salon", "haircut", "hairstyle"] },
  { re: /barbi|barber/, queries: ["barber shop haircut", "barber shaving beard"], must: ["barber", "beard", "haircut", "shaving"] },
  { re: /esthet|beaute|manucur|ongl/, queries: ["beauty salon treatment", "manicure nails salon"], must: ["beauty", "spa", "manicure", "nails", "cosmetic", "skincare", "salon"] },
  { re: /massag|kine|osteo/, queries: ["massage therapy room", "physiotherapy treatment"], must: ["massage", "therapy", "spa", "physiotherapy", "wellness"] },
  { re: /photograph/, queries: ["photographer camera studio", "photo shoot camera"], must: ["camera", "photographer", "photography", "photo", "lens"] },
  { re: /boulang|patiss/, queries: ["artisan bakery bread", "pastry baking kitchen"], must: ["bread", "bakery", "pastry", "baking", "croissant", "cake"] },
  { re: /traiteur|restaura|cuisine du monde/, queries: ["catering food buffet", "chef plating dish"], must: ["food", "catering", "dish", "buffet", "chef", "meal", "cuisine"] },
  { re: /informati|ordinateur|depannage pc/, queries: ["computer repair technician", "laptop repair desk"], must: ["computer", "laptop", "technology", "repair", "keyboard"] },
  { re: /coach|sport|fitness/, queries: ["fitness training gym", "personal trainer workout"], must: ["fitness", "gym", "workout", "training", "exercise", "sport"] },
  { re: /architect|decorat|amenagement interieur/, queries: ["interior design living room", "architect plans desk"], must: ["interior", "design", "architecture", "architect", "blueprint", "furniture"] },
  { re: /renov|travaux|batiment|multiservice|bricol/, queries: ["home renovation work tools", "house renovation construction"], must: ["renovation", "construction", "tools", "repair", "diy", "builder"] },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Table historique (secours) : métiers absents du registre canonique, et mots que la description d'une photo doit citer. */
function legacyTradeStock(text: string): { queries: string[]; must: string[] } | null {
  const t = norm(text);
  const hits = TRADES.map((x) => ({ x, at: t.search(x.re) })).filter((h) => h.at >= 0).sort((a, b) => a.at - b.at).map((h) => h.x);
  if (!hits.length) return null;
  // Une requête de chaque métier reconnu d'abord, puis les suivantes.
  const queries = [...hits.map((h) => h.queries[0]), ...hits.flatMap((h) => h.queries.slice(1))];
  return { queries: [...new Set(queries)], must: [...new Set(hits.flatMap((h) => h.must))] };
}

/**
 * Métiers reconnus dans un texte (plusieurs possibles : « plâtrier peintre »), dans l'ordre du texte.
 * Le registre métier canonique (Project Brain) fournit les recherches ACTION + MÉTIER + LIEU et les concepts hors
 * sujet ; la table historique reste le secours des métiers absents du registre et la source des mots « must ».
 */
export function tradeStock(text: string): { queries: string[]; must: string[]; negative: string[] } | null {
  const legacy = legacyTradeStock(text);
  const t = resolveTrade(text);
  if (t.source === "core" || t.source === "combo") {
    // Mots que la description d'une photo doit citer : ceux de la table historique, sinon le nom anglais du métier.
    const must = legacy?.must.length ? legacy.must : [...new Set(t.labels.en.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && w !== "interior"))];
    return { queries: t.search.queries, must, negative: t.search.negative };
  }
  return legacy ? { ...legacy, negative: GLOBAL_NEGATIVES } : null;
}

/** La description de la photo (mots-clés de la banque, titre) cite-t-elle le métier ? */
export function tagsMatch(alt: string, must: string[]): boolean {
  if (!must.length) return true;
  const a = ` ${norm(alt).replace(/[^a-z0-9]+/g, " ")} `;
  return must.some((m) => a.includes(` ${norm(m)} `) || a.includes(` ${norm(m)}s `));
}

/**
 * Ordre d'essai des photos trouvées : celles dont la description cite le métier d'abord. Sans contrôle visuel (pas
 * d'IA), seules celles-là sont gardées — mieux vaut aucune photo qu'un mur nu pour un plâtrier. Les photos dont la
 * description ne parle que d'un concept hors sujet (mur de briques, texture, pièce vide…) passent en dernier ;
 * citer le métier les rachète (« plasterer on a brick wall » reste pertinente).
 */
export function rankStock<T extends { alt: string }>(found: T[], must: string[], visualCheck: boolean, negative: string[] = GLOBAL_NEGATIVES): T[] {
  const off = (p: T) => negative.some((n) => ` ${norm(p.alt).replace(/[^a-z0-9]+/g, " ")} `.includes(` ${norm(n)} `));
  const onTrade = (p: T) => must.length > 0 && tagsMatch(p.alt, must);
  if (!must.length) return [...found.filter((p) => !off(p)), ...found.filter(off)];
  const good = found.filter(onTrade);
  if (!visualCheck) return good;
  const rest = found.filter((p) => !good.includes(p));
  return [...good, ...rest.filter((p) => !off(p)), ...rest.filter(off)];
}
