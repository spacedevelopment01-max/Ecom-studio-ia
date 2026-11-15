/**
 * La documentaliste du thème sur mesure (carte des spécialistes de SINA, lot 8, 13 novembre 2026 ; demande du
 * propriétaire : « sina et ou son sous agent qui fait les thèmes doit connaître enormenment de référence afin de ne
 * jamais faire de doublon dans les conception sur mesure que ce soit pour du service ou du produit »).
 *
 * Sans IA, sans coût. Elle lit la bibliothèque de références relevée par le Studio
 * (`docs/sina-savoir/references/cartes.json` : 1 072 cartes d'identité de sites) et les cahiers de métier par secteur,
 * et prépare pour le concepteur du thème :
 *  - le secteur ou le métier reconnu dans ce que vend le client (ses mots, ses fiches) ;
 *  - ce que font les vrais sites de ce secteur (nombre de sections, ouvertures, sections les plus vues) ;
 *  - des références proches (même secteur) et des références lointaines (autres secteurs), SANS leur nom ni leur
 *    adresse : on retient des principes, jamais une allure ;
 *  - les sections propres à ce secteur, tirées du cahier, sans le nom des marques qui les montrent.
 * Sans bibliothèque lisible ou sans secteur reconnu, elle rend ce qu'elle a (ou rien) : la conception n'est jamais
 * bloquée.
 */
import fs from "node:fs";
import path from "node:path";
import { brandKnowledgeDir, withoutSources } from "../brand-knowledge";
import { shuffled } from "./design";

export type RefCard = {
  cle: string; source: "themes" | "marques" | "services"; groupe: string; incertain?: boolean;
  ouverture?: { tel?: string | null; ordi?: string | null; hauteur?: number | null; boutons?: number | null } | null;
  polices?: { titres?: string | null; texte?: string | null; capitales?: boolean; italique?: boolean } | null;
  couleurs?: { nomFond?: string | null; sombre?: boolean; nomBouton?: string | null } | null;
  formes?: { bouton?: string | null; boutonPlein?: boolean } | null;
  gestes?: string[]; sections?: string[]; nb?: number | null; mots?: number | null;
};

export type Sector = { key: string; label: string; business: "products" | "services"; groups: string[]; words: string; book: string; heading: number };

const P1 = "theme-sections-par-secteur-1.md", P2 = "theme-sections-par-secteur-2.md";
const S1 = "theme-services-commerces-et-soins.md", S2 = "theme-services-conseil-loisirs-et-accueil.md";
/** Secteurs (boutiques) et métiers (services) : les groupes de la bibliothèque, les mots qui les font reconnaître, leur cahier. */
export const SECTORS: Sector[] = [
  { key: "the-cafe", label: "Thé, café, infusions", business: "products", groups: ["the-cafe"], words: "thés?|infusions?|tisanes?|rooibos|matcha|cafés?|torréfact\\p{L}*|expressos?|espressos?", book: P1, heading: 2 },
  { key: "boissons", label: "Boissons sans alcool", business: "products", groups: ["boissons"], words: "boissons?|sodas?|limonades?|jus|kombucha|sirops?|smoothies?", book: P1, heading: 1 },
  { key: "alcool", label: "Vin, bière, spiritueux", business: "products", groups: ["alcool"], words: "vins?|bières?|spiritueux|whiskys?|gins?|rhums?|champagnes?|cidres?|caves?", book: P2, heading: 18 },
  { key: "complements", label: "Compléments alimentaires et nutrition sportive", business: "products", groups: ["complements"], words: "compléments? alimentaires?|protéines?|vitamines?|gummies|nutrition|collagène|probiotiques?", book: P1, heading: 4 },
  { key: "cosmetiques", label: "Cosmétiques, soins, maquillage, cheveux", business: "products", groups: ["cosmetiques"], words: "cosmétiques?|crèmes?|sérums?|maquillage|shampo+ings?|savons?|soins? (?:du|de la|des|pour)|baumes?|huiles? (?:visage|corps|cheveux)", book: P1, heading: 5 },
  { key: "parfum-bougies", label: "Parfum, bougies, senteurs", business: "products", groups: ["parfum-bougies"], words: "parfums?|bougies?|senteurs?|encens|diffuseurs?", book: P1, heading: 6 },
  { key: "bijoux-montres", label: "Bijoux, montres, lunettes", business: "products", groups: ["bijoux-montres"], words: "bijoux|bagues?|colliers?|bracelets?|boucles? d'oreilles?|montres?|lunettes?|joaill\\p{L}*", book: P1, heading: 9 },
  { key: "chaussures-sacs", label: "Chaussures, sacs, maroquinerie", business: "products", groups: ["chaussures-sacs"], words: "chaussures?|baskets?|sneakers?|sacs?|maroquinerie|ceintures?|portefeuilles?|cuir", book: P1, heading: 8 },
  { key: "mode", label: "Mode, lingerie, maillots", business: "products", groups: ["mode"], words: "vêtements?|mode|prêt-à-porter|robes?|t-shirts?|tee-shirts?|sweats?|hoodies?|pantalons?|jeans?|vestes?|chemises?|jupes?|lingerie|maillots?|streetwear", book: P1, heading: 7 },
  { key: "mobilier", label: "Mobilier, literie, luminaires", business: "products", groups: ["mobilier"], words: "meubles?|mobilier|fauteuils?|canapés?|chaises?|tables?|literie|matelas|luminaires?|lampes?", book: P2, heading: 11 },
  { key: "deco-table", label: "Décoration, linge de maison, arts de la table", business: "products", groups: ["deco-table"], words: "décoration|déco|linge de maison|vaisselle|arts de la table|céramiques?|coussins?|tapis|vases?|plaids?", book: P2, heading: 10 },
  { key: "tech", label: "Électronique, audio, objets connectés, petit électroménager", business: "products", groups: ["tech"], words: "électronique|casques?|écouteurs?|enceintes?|connectée?s?|électroménager|machines? à|projecteurs?|chargeurs?|batteries?", book: P2, heading: 12 },
  { key: "animaux", label: "Animaux de compagnie", business: "products", groups: ["animaux"], words: "chiens?|chats?|animaux|croquettes?|harnais|laisses?|litières?", book: P2, heading: 14 },
  { key: "enfants", label: "Bébés, enfants, jouets", business: "products", groups: ["enfants"], words: "bébés?|enfants?|jouets?|puériculture|doudous?|peluches?", book: P2, heading: 15 },
  { key: "plantes-jardin", label: "Plantes, jardin, bricolage", business: "products", groups: ["plantes-jardin"], words: "plantes?|jardins?|jardinage|graines?|semences?|fleurs?|bricolage|outils?|potagers?", book: P2, heading: 17 },
  { key: "papeterie-cadeaux", label: "Papeterie, cadeaux, objets personnalisés, artisanat", business: "products", groups: ["papeterie-cadeaux"], words: "papeterie|carnets?|cadeaux?|personnalisée?s?|affiches?|faire-part|stylos?", book: P2, heading: 16 },
  { key: "epicerie", label: "Épicerie fine, chocolat, confiserie, sauces, miel", business: "products", groups: ["epicerie"], words: "épicerie|chocolats?|miels?|confitures?|biscuits?|sauces?|huiles? d'olive|épices?|confiseries?|bonbons?|pâtes à tartiner", book: P1, heading: 3 },
  { key: "sport", label: "Sport, plein air, vélo, voyage", business: "products", groups: ["sport"], words: "sport|yoga|pilates|vélos?|randonnée|plein air|fitness|running|camping|musculation", book: P2, heading: 13 },
  { key: "restaurant", label: "Restaurant, café, traiteur, boulangerie-pâtisserie", business: "services", groups: ["restaurant", "food", "catering"], words: "restaurants?|bistrots?|brasseries?|traiteurs?|boulangeries?|pâtisseries?|pizzerias?|crêperies?|salons? de thé", book: S1, heading: 1 },
  { key: "beaute", label: "Coiffure, barbier, institut de beauté, spa", business: "services", groups: ["beauty", "wellness"], words: "coiffure|coiffeurs?|coiffeuses?|barbiers?|instituts?|esthétique|esthéticiennes?|spas?|onglerie|massages?", book: S1, heading: 2 },
  { key: "sante", label: "Cabinets de santé et de bien-être", business: "services", groups: ["medical", "dental", "health", "wellness"], words: "cabinets?|médecins?|dentistes?|kinés?|kinésithérapeutes?|ostéopathes?|sophrolog\\p{L}*|psycholog\\p{L}*|naturopath\\p{L}*|thérapeutes?|hypnos\\p{L}*", book: S1, heading: 3 },
  { key: "batiment", label: "Artisans du bâtiment", business: "services", groups: ["construction", "landscaping", "interior-design", "architecture"], words: "électriciens?|plombiers?|peintres?|plâtriers?|plâtrerie|maçons?|rénovation|chauffagistes?|paysagistes?|menuisiers?|couvreurs?|carreleurs?|artisans?|chantiers?", book: S1, heading: 4 },
  { key: "immobilier", label: "Agence immobilière", business: "services", groups: ["real-estate"], words: "immobili\\p{L}*|agences? immobilières?|locations?|biens? à vendre", book: S1, heading: 5 },
  { key: "coaching", label: "Sport et coaching", business: "services", groups: ["fitness", "sports", "coaching"], words: "coachs?|coaching|salles? de sport|yoga|pilates|fitness|cours collectifs?|préparateurs? physiques?", book: S2, heading: 6 },
  { key: "image", label: "Photographe, vidéaste, mariage, événement", business: "services", groups: ["photography", "wedding"], words: "photographes?|vidéastes?|mariages?|événements?|événementiel|wedding", book: S2, heading: 7 },
  { key: "conseil", label: "Avocat, expert-comptable, consultant, formateur", business: "services", groups: ["legal", "accounting", "consulting", "business", "professional-services", "education"], words: "avocats?|comptables?|expert-comptable|consultants?|consultantes?|formateurs?|formatrices?|formations?|conseils?|notaires?", book: S2, heading: 8 },
  { key: "garage", label: "Garage, carrosserie, contrôle technique", business: "services", groups: ["professional-services"], words: "garages?|garagistes?|carrosseries?|contrôle technique|mécaniciens?|mécanique", book: S2, heading: 9 },
  { key: "accueil", label: "Hôtel, gîte, chambre d'hôtes", business: "services", groups: ["hotel", "hospitality", "travel"], words: "hôtels?|gîtes?|chambres? d'hôtes|campings?|locations? de vacances|séjours?", book: S2, heading: 10 },
  { key: "domicile", label: "Fleuriste, services à domicile, déménageur", business: "services", groups: ["pet", "professional-services"], words: "fleuristes?|ménage|déménage\\p{L}*|à domicile|garde d'enfants|aide à domicile|toiletteurs?|toilettage", book: S2, heading: 11 },
];

/** Secteur reconnu dans ce que vend le client (ses mots, ses fiches) : celui qui a le plus de mots trouvés. Sans IA. */
export function sectorOf(text: string, business: "products" | "services"): Sector | null {
  const t = ` ${text.toLowerCase()} `;
  let best: Sector | null = null, score = 0;
  for (const s of SECTORS) {
    if (s.business !== business) continue;
    const hits = new Set([...t.matchAll(new RegExp(`(?<!\\p{L})(?:${s.words})(?!\\p{L})`, "gu"))].map((m) => m[0])).size;
    if (hits > score) { best = s; score = hits; }
  }
  return best;
}

export const referencesFile = () => path.join(brandKnowledgeDir(), "references", "cartes.json");
let cache: { file: string; at: number; cards: RefCard[] } | null = null;
/** Cartes exploitables de la bibliothèque (relevé sûr, ordre des sections connu). Bibliothèque illisible : aucune carte. */
export function referenceCards(): RefCard[] {
  const file = referencesFile();
  try {
    const at = fs.statSync(file).mtimeMs;
    if (cache && cache.file === file && cache.at === at) return cache.cards;
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as RefCard[];
    const cards = (Array.isArray(raw) ? raw : []).filter((c) => c && !c.incertain && Array.isArray(c.sections) && c.sections.length >= 3 && typeof c.groupe === "string");
    cache = { file, at, cards };
    return cards;
  } catch { return []; }
}

const median = (v: number[]) => { const a = [...v].sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : 0; };
const top = (list: string[], n: number, of: number) => {
  const c = new Map<string, number>();
  for (const x of list) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${Math.round((100 * v) / Math.max(1, of))} %)`);
};

/** Ce que font les vrais sites d'un secteur : nombre de sections, ouvertures, sections les plus vues. */
export function sectorFacts(cards: RefCard[]): string {
  if (cards.length < 4) return "";
  const nb = cards.map((c) => c.sections!.length), sorted = [...nb].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
  const openings = top(cards.map((c) => c.ouverture?.tel ?? "").filter(Boolean), 3, cards.length);
  const roles = top(cards.flatMap((c) => [...new Set(c.sections!.filter((r) => r !== "ouverture" && r !== "autre"))]), 7, cards.length);
  const words = median(cards.map((c) => c.mots ?? 0).filter((x) => x > 0));
  return `${cards.length} sites relevés. Accueil : ${median(nb)} sections le plus souvent (entre ${q(0.25)} et ${q(0.75)})${words ? `, ${words} mots` : ""}. Ouvertures sur téléphone : ${openings.join(", ") || "non relevées"}. Ce qu'on y trouve le plus : ${roles.join(", ")}.`;
}

/** Une référence en une ligne, sans nom ni adresse du site. */
export function referenceLine(c: RefCard, label: string): string {
  const o = c.ouverture ?? {}, p = c.polices ?? {}, k = c.couleurs ?? {}, f = c.formes ?? {};
  const opening = o.tel || o.ordi || "non relevée";
  const titles = p.titres ? `titres ${p.titres}${p.capitales ? " en capitales" : ""}${p.italique ? " en italique" : ""}` : "titres non relevés";
  const colours = `fond ${k.nomFond ?? "non relevé"}${k.sombre ? " (site sombre)" : ""}${k.nomBouton ? `, bouton ${k.nomBouton}${f.boutonPlein === false ? " au trait" : ""}${f.bouton ? ` ${f.bouton}` : ""}` : ""}`;
  const gestures = (c.gestes ?? []).slice(0, 5).join(", ") || "aucun geste relevé";
  return `- ${label} · ouverture : ${opening}${o.hauteur ? ` (${String(o.hauteur).replace(".", ",")} écran)` : ""} · ${titles} · ${colours} · gestes : ${gestures} · accueil (${c.sections!.length}) : ${c.sections!.join(" → ")}`;
}

export function pickReferences(o: { sector: Sector | null; business: "products" | "services"; seed?: string; near?: number; far?: number }): { near: RefCard[]; far: RefCard[]; pool: RefCard[] } {
  const source = o.business === "services" ? "services" : "marques";
  const all = referenceCards().filter((c) => c.source === source);
  const groups = new Set(o.sector?.groups ?? []);
  const pool = all.filter((c) => groups.has(c.groupe));
  const near = shuffled(pool, o.seed ? `${o.seed}:proches` : undefined).slice(0, o.near ?? 6);
  // Lointaines : d'autres secteurs, avec une vraie signature (au moins deux gestes relevés), une par secteur.
  const seen = new Set<string>(), far: RefCard[] = [];
  for (const c of shuffled(all.filter((x) => !groups.has(x.groupe) && (x.gestes?.length ?? 0) >= 2), o.seed ? `${o.seed}:lointaines` : undefined)) {
    if (seen.has(c.groupe)) continue;
    seen.add(c.groupe); far.push(c);
    if (far.length >= (o.far ?? 3)) break;
  }
  return { near, far, pool };
}

/** Sections propres au secteur, tirées du cahier de métier, sans le nom des marques ni leurs adresses. */
export function sectorNotes(s: Sector, max = 3600): string {
  let md: string;
  try { md = withoutSources(fs.readFileSync(path.join(brandKnowledgeDir(), s.book), "utf8")); } catch { return ""; }
  const start = md.search(new RegExp(`^## ${s.heading}\\. `, "m"));
  if (start < 0) return "";
  const rest = md.slice(start), end = rest.slice(4).search(/^## /m);
  const block = (end < 0 ? rest : rest.slice(0, end + 4))
    .replace(/^## [^\n]*\n+/, "")                  // le titre du cahier : le secteur est déjà dit
    .replace(/ ?Vu : [^\n]*/g, "")                 // jamais le nom d'une autre marque devant le concepteur
    .replace(/\s*\((?:vue?s?) chez [^)]*\)/g, "")
    .replace(/\s*\((?:[\w-]+\.)+[a-z]{2,}[^)]*\)/g, "") // ni une adresse de site
    .replace(/\s*\[[A-Z]\d*\]/g, "")                // repères de sources du cahier
    .replace(/\n{3,}/g, "\n\n").trim();
  return block.length > max ? `${block.slice(0, max).replace(/\n[^\n]*$/, "")}\n…` : block;
}

export type ReferencesBrief = { sector: string | null; near: number; far: number; text: string };
/**
 * Le dossier de références donné au concepteur. `text` est vide quand la bibliothèque est illisible et qu'aucun
 * secteur n'est reconnu : la conception se fait alors comme avant.
 */
export function referencesBrief(o: { offer: string; business: "products" | "services"; seed?: string }): ReferencesBrief {
  const sector = sectorOf(o.offer, o.business);
  const { near, far, pool } = pickReferences({ sector, business: o.business, seed: o.seed });
  const facts = sectorFacts(pool), notes = sector ? sectorNotes(sector) : "";
  if (!near.length && !far.length && !notes) return { sector: sector?.label ?? null, near: 0, far: 0, text: "" };
  const kind = o.business === "services" ? "métier" : "secteur";
  const text = [
    "G. LE DOSSIER DE LA DOCUMENTALISTE (relevé par le Studio sur de vrais sites, sans leur nom : on retient des principes, JAMAIS une allure ; aucun texte, aucune image, aucun enchaînement exact n'est repris).",
    sector ? `${kind === "métier" ? "Métier" : "Secteur"} reconnu : ${sector.label}.` : `Aucun ${kind} reconnu dans ce que vend le client : références générales seulement.`,
    facts ? `CE QUE FONT LES VRAIS SITES DE CE ${kind.toUpperCase()} : ${facts}` : "",
    near.length ? `RÉFÉRENCES PROCHES (même ${kind}) :\n${near.map((c, i) => referenceLine(c, `proche ${i + 1}`)).join("\n")}` : "",
    far.length ? `RÉFÉRENCES LOINTAINES (autres ${kind}s, pour ne pas ressembler à tes voisins) :\n${far.map((c, i) => referenceLine(c, `lointaine ${i + 1}`)).join("\n")}` : "",
    notes ? `SECTIONS PROPRES À CE ${kind.toUpperCase()} (ce que montrent les meilleurs ; n'en retiens que ce que CETTE marque peut remplir avec de VRAIES données, et cherche dans la bibliothèque la section qui s'en approche) :\n${notes}` : "",
    "COMMENT T'EN SERVIR : pars de plusieurs références, jamais d'une seule ; ne reprends l'ordre exact d'aucune ; ce que font tous les voisins est un point de départ, pas un but. Dans concept, dis en une phrase d'où tu pars et en quoi ce site s'en écarte.",
  ].filter(Boolean).join("\n");
  return { sector: sector?.label ?? null, near: near.length, far: far.length, text };
}
