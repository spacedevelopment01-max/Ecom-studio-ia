/**
 * LA PHRASE SOUS LE NOM (24 novembre 2026 au soir). Sur la planche de recherche, la plupart des esquisses portent une
 * petite phrase sous le nom. Le propriétaire, mot pour mot : « Non ça donne des idées de slogan, le seul truc c'est que si
 * le client veux le slogan de la 5 et le logo 1, sina doit pouvoir le faire ». La demande de recherche ne change pas.
 *
 *  - Le relecteur des esquisses relève la phrase mot pour mot (ou « aucune ») et dit si elle est bien orthographiée ; le
 *    code refuse en plus les fautes évidentes (`fautesEvidentes`). Une phrase douteuse n'est jamais proposée telle quelle.
 *  - Le client combine librement : le logo 1 avec la phrase de la 5, le logo 1 sans phrase, ou le logo 1 avec sa phrase à
 *    lui (reprise mot pour mot). Sans choix de sa part, la règle d'avant reste (une ligne seulement si elle dit le vrai
 *    métier, sinon aucune).
 *
 * PLUSIEURS LIGNES (25 novembre 2026, essai réel d'Écume : quatre esquisses portaient « SAVONNERIE ARTISANALE », puis
 * « SAVONS · SHAMPOINGS · BAUMES », et le relecteur n'avait relevé que la première). Le texte sous le nom est relevé en
 * entier, ligne par ligne, dans l'ordre : `lignes` (présent seulement à partir de deux lignes) ; `texte` les réunit avec
 * « / » pour les montrer et les dire. Le client prend toutes les lignes d'une esquisse, une seule (`de` et `lignes`), ou
 * écrit la sienne, avec « / » entre ses lignes. Une seule ligne : rien ne change (`texte` seul).
 *
 * Sans rien du serveur : lu par la carte des esquisses (client) comme par les outils et la finalisation (serveur).
 */

/**
 * La phrase d'une esquisse : son texte relevé mot pour mot, et si elle peut être proposée telle quelle (`ok`). `lignes` :
 * ses lignes, dans l'ordre, quand il y en a plusieurs (`texte` les réunit avec « / »).
 */
export type PhraseDeLEsquisse = { texte: string; ok: boolean; raisons?: string[]; lignes?: string[] };

/** Le choix du client pour un logo : la phrase d'une esquisse (`de`), aucune phrase, ou la sienne, mot pour mot. */
export type PhraseChoisie = { de: number; texte: string; lignes?: string[] } | { aucune: true } | { sienne: true; texte: string; lignes?: string[] };
/** Ce que la finalisation et la relecture doivent tenir : une phrase exacte (ses lignes, dans l'ordre), ou aucune (absent : la règle d'avant). */
export type PhraseVoulue = { texte: string; lignes?: string[] } | { aucune: true };
export const phraseVoulue = (c: PhraseChoisie | undefined): PhraseVoulue | undefined => (!c ? undefined : "aucune" in c ? { aucune: true } : { texte: c.texte, ...(c.lignes && c.lignes.length > 1 ? { lignes: [...c.lignes] } : {}) });

/** Une ligne sous le nom : au plus 120 caractères. */
export const PHRASE_MAX = 120;
/** Au plus quatre lignes sous le nom. */
export const LIGNES_MAX = 4;
/** Le séparateur des lignes quand elles sont dites sur une seule ligne. */
export const SEPARATEUR_DES_LIGNES = " / ";

/**
 * Les lignes d'un texte, dans l'ordre : coupé à chaque retour à la ligne et à chaque « / » qui touche une espace (« A / B »,
 * « A/ B ») ; un « / » collé des deux côtés reste dans la ligne (« 7j/7 »). Chaque ligne est nettoyée (espaces, guillemets
 * autour) ; les lignes vides et « aucune » sont retirées.
 */
export function lignesDuTexte(t: string): string[] {
  return t.normalize("NFC").split(/\s*[\r\n]+\s*|\s+\/\s*|\s*\/\s+/u).map(nettoyer).filter((l) => l && !AUCUNE.test(l));
}
const AUCUNE = /^(aucune|aucun|none|néant|rien|vide)\.?$/iu;
const nettoyer = (l: string) => l.normalize("NFC").replace(/\s+/g, " ").trim().replace(/^[«"“]\s*/u, "").replace(/\s*[»"”]$/u, "").trim();
/** Les lignes d'une phrase (une seule quand `lignes` est absent). */
export const lignesDe = (p: { texte: string; lignes?: string[] }): string[] => (p.lignes && p.lignes.length ? p.lignes : [p.texte]);
/** Une phrase faite de ses lignes : `texte` seul pour une ligne ; `texte` (réuni avec « / ») et `lignes` à partir de deux. */
export const deLignes = (lignes: readonly string[]): { texte: string; lignes?: string[] } => (lignes.length > 1 ? { texte: lignes.join(SEPARATEUR_DES_LIGNES), lignes: [...lignes] } : { texte: lignes[0] ?? "" });

const LETTRE_LATINE = /\p{Script=Latin}/u;
const PONCTUATION_PERMISE = new Set([..." '’-–,.;:!?&«»\"·/+()…%€"]);
const VOYELLES = /[aeiouyàâäéèêëîïôöùûüÿœæ]/iu;
const SIX_CONSONNES = /[bcdfghjklmnpqrstvwxzç]{6,}/iu;
/** Des mots-outils sans ambiguïté, pour voir un mélange de français et d'anglais. */
const MOTS_FR = new Set(["le", "la", "les", "des", "du", "et", "au", "aux", "une", "pour", "avec", "sans", "dans", "sur", "par", "votre", "vos", "ton", "tes", "nos", "notre", "chez", "depuis", "fait", "est"]);
const MOTS_EN = new Set(["the", "and", "of", "with", "for", "your", "our", "by", "made", "since", "from", "handmade", "best", "quality", "love", "life", "home", "is"]);

/**
 * Le contrôle GRATUIT de la phrase, par le code. Le dépôt n'a aucun dictionnaire et aucun service n'est ajouté : il ne
 * refuse que les fautes évidentes (caractères étranges, lettre répétée trois fois, ponctuation doublée, chiffre au milieu
 * d'un mot, majuscule au milieu d'un mot, mot sans voyelle, suite de six consonnes, mélange de français et d'anglais,
 * phrase trop longue). Un mot mal orthographié mais plausible, un accent oublié ou un accord faux ne se voient pas ici :
 * c'est le relecteur qui les juge (`phraseBienEcrite`). Une liste vide : rien d'évident.
 */
export function fautesEvidentes(phrase: string): string[] {
  const t = phrase.normalize("NFC").trim(), f: string[] = [];
  if (!t) return f;
  if (t.length > PHRASE_MAX) f.push("trop longue pour tenir sous un nom");
  const etranges = [...new Set([...t].filter((c) => !(LETTRE_LATINE.test(c) || /\p{N}/u.test(c) || /\p{M}/u.test(c) || PONCTUATION_PERMISE.has(c))))];
  if (etranges.length) f.push(`des caractères étranges (${etranges.join(" ")})`);
  if (/(\p{L})\1\1/iu.test(t)) f.push("une lettre répétée trois fois");
  if (/,,|;;|::|!!|\?\?|(?<!\.)\.\.(?!\.)|\s[,.]/u.test(t)) f.push("une ponctuation doublée ou mal placée");
  const mots = t.split(/[\s'’\-–,.;:!?«»"·/+()…]+/u).filter(Boolean);
  for (const m of mots) {
    const lettres = m.replace(/[^\p{L}]/gu, "");
    if (/\p{L}\p{N}|\p{N}\p{L}{4,}/u.test(m)) f.push(`un chiffre au milieu d'un mot (« ${m} »)`);
    else if (lettres.length >= 2 && lettres !== lettres.toUpperCase() && /\p{Lu}/u.test(lettres.slice(1))) f.push(`une majuscule au milieu d'un mot (« ${m} »)`);
    else if (lettres.length >= 4 && !VOYELLES.test(lettres) && !(lettres === lettres.toUpperCase() && lettres.length <= 5)) f.push(`un mot sans voyelle (« ${m} »)`);
    else if (SIX_CONSONNES.test(lettres)) f.push(`une suite de consonnes impossible (« ${m} »)`);
  }
  const bas = mots.map((m) => m.toLocaleLowerCase("fr"));
  if (bas.some((m) => MOTS_FR.has(m)) && bas.some((m) => MOTS_EN.has(m))) f.push("un mélange de français et d'anglais");
  return [...new Set(f)];
}

/**
 * Les fautes évidentes de chaque ligne (« ligne 2 : … » à partir de deux lignes), plus le mélange de français et
 * d'anglais d'une ligne à l'autre et trop de lignes. Une liste vide : rien d'évident.
 */
export function fautesDesLignes(lignes: readonly string[]): string[] {
  if (lignes.length <= 1) return fautesEvidentes(lignes[0] ?? "");
  const f = lignes.flatMap((l, i) => fautesEvidentes(l).map((x) => `ligne ${i + 1} : ${x}`));
  if (lignes.length > LIGNES_MAX) f.push(`trop de lignes (${lignes.length}, ${LIGNES_MAX} au plus)`);
  const tout = fautesEvidentes(lignes.join(" ")).filter((x) => x === "un mélange de français et d'anglais");
  if (tout.length && !f.some((x) => x.endsWith(tout[0]))) f.push(tout[0]);
  return [...new Set(f)];
}

/**
 * Le texte relevé par le relecteur sous le nom (« aucune », vide ou absent : pas de phrase), jugé par lui, puis par le
 * code ligne par ligne. Une liste : ses lignes, dans l'ordre ; une chaîne (réponse d'avant) : coupée à chaque retour à la
 * ligne ou « / » entre deux lignes. Une seule ligne douteuse rend toute la phrase non proposable telle quelle.
 */
export function phraseDeLEsquisse(lue: string | readonly string[] | undefined, bienEcrite: boolean | undefined): PhraseDeLEsquisse | undefined {
  const lignes = (typeof lue === "string" ? [lue] : [...(lue ?? [])]).flatMap((x) => (typeof x === "string" ? lignesDuTexte(x) : []));
  if (!lignes.length) return undefined;
  const raisons = [...(bienEcrite === true ? [] : ["le relecteur n'est pas sûr de son orthographe"]), ...fautesDesLignes(lignes)];
  return { ...deLignes(lignes), ...(raisons.length ? { ok: false, raisons } : { ok: true }) };
}

const plate = (t: string) => t.normalize("NFC").replace(/[’ʼ]/g, "'").replace(/[“”«»"]/g, "").replace(/\s+/g, " ").trim().replace(/[.\s]+$/u, "").toLocaleLowerCase("fr");
/**
 * La phrase lue dans le logo est-elle la phrase voulue, lettre pour lettre ? Accents, lettres et ponctuation intérieure
 * compris ; seuls la casse (une ligne en capitales), les espaces, la forme des apostrophes et des guillemets et un point
 * final sont laissés de côté, comme pour le nom.
 */
export const phraseExacte = (lue: string, voulue: string) => plate(lue) === plate(voulue);

/**
 * Les lignes lues dans le logo comparées aux lignes voulues, lettre pour lettre : `manquantes` (une ligne voulue qui n'y
 * est pas), `malEcrites` (lue à sa place, mais autrement), `enTrop` (une ligne qui n'était pas voulue), `desordre` (toutes
 * là, mais pas dans l'ordre). Le relecteur sépare les lignes par « / » ou un retour à la ligne ; s'il les a réunies sans
 * séparateur, le texte entier est comparé. Tout vide et `desordre` faux : les lignes sont exactes.
 */
export function comparerLesLignes(lue: string, voulues: readonly string[]): { manquantes: string[]; malEcrites: { lue: string; voulue: string }[]; enTrop: string[]; desordre: boolean } {
  const lues = lignesDuTexte(lue);
  const r = { manquantes: [] as string[], malEcrites: [] as { lue: string; voulue: string }[], enTrop: [] as string[], desordre: false };
  if (lues.length === voulues.length && lues.every((l, i) => phraseExacte(l, voulues[i]))) return r;
  if (lues.length && phraseExacte(lues.join(" "), voulues.join(" "))) return r;
  const prises = new Set<number>();
  const trouvees = voulues.map((v) => { const k = lues.findIndex((l, j) => !prises.has(j) && phraseExacte(l, v)); if (k >= 0) prises.add(k); return k; });
  const restantes = lues.map((l, j) => ({ l, j })).filter(({ j }) => !prises.has(j));
  voulues.forEach((v, i) => {
    if (trouvees[i] >= 0) return;
    const l = restantes.shift();
    if (l) r.malEcrites.push({ lue: l.l, voulue: v }); else r.manquantes.push(v);
  });
  r.enTrop.push(...restantes.map(({ l }) => l));
  const ordre = trouvees.filter((k) => k >= 0);
  r.desordre = ordre.some((k, i) => i > 0 && k < ordre[i - 1]);
  return r;
}
