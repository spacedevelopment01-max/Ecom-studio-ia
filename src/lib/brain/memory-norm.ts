/**
 * Normalisation déterministe de la mémoire (Project Brain 2B), sans IA.
 *
 * But : « pas de badge », « éviter badge », « badge refusé », « n'aime pas les badges » → UNE seule entrée.
 * Prudence : la polarité (« pas de », « sans », « éviter »…) n'est lue que sur les entrées explicitement classées
 * préférence / refus / correction, et seulement quand la phrase COMMENCE par la négation (ou finit par « refusé »,
 * « à éviter »…) et vise un concept court. « Peinture sans solvant » n'est donc jamais lu comme un refus de
 * « peinture » : en cas de doute, on garde le texte exact normalisé (pas d'invention).
 */
import { norm } from "./trade";

export type Polarity = "neg" | "pos";
export type NormalizedMemory = { normKey: string; concept: string | null; polarity: Polarity | null };

/** Synonymes courants → concept canonique (petite liste extensible). */
const SYNONYMS: [RegExp, string][] = [
  [/^(badges?|ecussons?|emblemes?|blasons?|macarons?)$/, "badge"],
  [/^(murs? vides?|murs? nus?|empty walls?|bare walls?|blank walls?)$/, "mur vide"],
  [/^(murs? de briques?|briques?|brick walls?|bricks?)$/, "mur de briques"],
  [/^(degrades?|gradients?)$/, "dégradé"],
  [/^(clip ?arts?|cliparts?|pictogrammes? generiques?|icones? generiques?|generic icons?)$/, "pictogramme générique"],
  [/^(maisons?|toits?|houses?|roofs?)$/, "maison"],
  [/^(pots? de peinture( isoles?)?|paint cans?)$/, "pot de peinture"],
];

// Textes déjà nettoyés (minuscules, sans accents ; apostrophes remplacées par des espaces).
const ART = "(?:les |le |la |l |des |du |de la |de |d )?";
const NEG_START = new RegExp(`^(?:je ne veux pas ${ART}|je n aime pas ${ART}|n aime pas ${ART}|pas ${ART}|plus ${ART}|eviter ${ART}|evitez ${ART}|sans ${ART}|jamais ${ART}|refus(?:e|er)? ${ART}|no |avoid |don t (?:use |like )?|never )(.+)$`);
const NEG_END = /^(.+?)\s+(?:refuses?|refusees?|a eviter|interdits?|interdites?|non merci|no thanks)$/;
const POS_START = new RegExp(`^(?:je prefere ${ART}|preferer ${ART}|plutot ${ART}|prefer )(.+)$`);

const singular = (w: string) => (w.length > 3 && /[sx]$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w);
const clean = (s: string) => norm(s).replace(/[«»"“”'’.,;:!?()\[\]]/g, " ").replace(/\s+/g, " ").trim();

/** Concept canonique d'un groupe de mots court (≤ 4 mots), sinon null (trop long : pas une préférence de concept). */
function canonical(words: string): string | null {
  // « photos de mur vide », « images avec badge » : le support visé compte moins que le concept.
  const t = clean(words).replace(/^(?:photos?|images?|visuels?|scenes?|logos?) (?:de |d |avec |en )?/, "");
  if (!t || t.split(" ").length > 4) return null;
  for (const [re, c] of SYNONYMS) if (re.test(t)) return c;
  return t.split(" ").map(singular).join(" ");
}

/**
 * Clé normalisée d'une entrée de mémoire.
 *  - décision : « decision:<clé> » (une décision = une clé structurée ; une nouvelle valeur la remplace) ;
 *  - préférence / refus / correction : « <scope>:<neg|pos>:<concept> » quand la structure est sûre,
 *    sinon « <kind>:<scope>:exact:<texte normalisé> » ;
 *  - autres (objectif…) : texte exact normalisé.
 */
export function normalizeMemory(kind: string, scope: string, key: string, value: string): NormalizedMemory {
  if (kind === "decision") return { normKey: `decision:${clean(key) || key}`, concept: null, polarity: null };
  if (kind === "preference" || kind === "rejection" || kind === "correction") {
    const t = clean(value);
    const neg = NEG_START.exec(t)?.[1] ?? NEG_END.exec(t)?.[1];
    const pos = !neg ? POS_START.exec(t)?.[1] : undefined;
    const concept = neg ? canonical(neg) : pos ? canonical(pos) : null;
    // Un refus explicite sans négation dans la phrase (« badges ») vise le concept lui-même.
    const bare = !concept && kind === "rejection" ? canonical(t) : null;
    if (concept || bare) {
      const polarity: Polarity = neg || bare ? "neg" : "pos";
      return { normKey: `${scope}:${polarity}:${concept ?? bare}`, concept: concept ?? bare, polarity };
    }
  }
  return { normKey: `${kind}:${scope}:exact:${clean(value)}`, concept: null, polarity: null };
}

/** Clé opposée (même concept, polarité inverse) : une préférence contraire remplace l'ancienne. */
export const oppositeKey = (n: NormalizedMemory) => (n.concept && n.polarity ? n.normKey.replace(`:${n.polarity}:`, `:${n.polarity === "neg" ? "pos" : "neg"}:`) : null);
