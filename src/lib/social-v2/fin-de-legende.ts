/**
 * La fin d'une légende et ses mots-dièse (décision du 22 novembre 2026, au nom de la règle du propriétaire « aucun ordre
 * donné au lecteur ») : une légende ne finit jamais sur un ordre (« Commande maintenant », « Clique », « Découvre »,
 * « Enregistrez ce conseil ») ; elle finit sur une question, une invitation qui porte le désir ou un fait utile. Et elle
 * porte de 0 à 3 mots-dièse.
 *
 * Une seule règle, contrôlée ici par le code, partout où une légende est enregistrée (plan des publications de SINA,
 * moteur des publications, calendrier) : un ordre en fin de légende est retiré par le Studio, à sa charge, sans nouvel
 * appel payant ; une liste de mots-dièse trop longue est ramenée à 3. Module pur (aucune base, aucun appel).
 */

/** Au plus 3 mots-dièse par légende, sur tous les réseaux (0 est permis). */
export const MOTS_DIESE_MAX = 3;

/** Les mots-dièse ramenés à 3 au plus, dans leur ordre (les premiers sont les plus précis). */
export const bornerMotsDiese = <T>(tags: readonly T[]): T[] => tags.slice(0, MOTS_DIESE_MAX);

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Impératifs français au tutoiement sans double sens (jamais un nom courant en tête de phrase). */
const FR_TU = new Set([
  "clique", "decouvre", "appelle", "ecris", "viens", "profite", "abonne", "fonce", "rejoins", "achete", "prends", "essaie", "essaye",
  "raconte", "tague", "identifie", "contacte", "teste", "craque", "fais", "imagine", "regarde", "choisis", "inscris", "telecharge",
  "dis", "envoie", "enregistre", "commente", "mets", "ose", "trouve", "lis", "suis",
]);
/** Impératifs qui sont aussi des noms (« Commande passée », « Partage d'expérience », « Visite du chantier ») : ordre seulement suivis d'un mot qui le montre. */
const FR_TU_DOUBLE = new Set(["commande", "reserve", "partage", "demande", "visite", "vote", "pose", "garde", "passe", "note", "donne", "like", "retrouve", "offre", "laisse", "cours"]);
const FR_SUITE = /^(ta|ton|tes|votre|vos|le|la|les|l|un|une|des|ce|cette|ces|maintenant|vite|des|ici|sur|nous|moi|toi|vous|lui|leur|y|en|aujourd'hui|sans|avant|tout|toutes?|tous|a|au|aux)$/;
/** Infinitifs d'appel (« Réserver une table », « Demander un devis ») : un ordre quand la phrase est courte. */
const FR_INF = new Set([
  "commander", "cliquer", "decouvrir", "reserver", "appeler", "ecrire", "enregistrer", "partager", "envoyer", "commenter", "venir", "profiter",
  "demander", "prendre", "essayer", "rejoindre", "acheter", "contacter", "visiter", "voir", "tester", "craquer", "laisser", "poser", "voter",
  "suivre", "telecharger", "offrir", "choisir", "sabonner", "sinscrire", "noter", "garder", "retrouver",
]);
/** Ce qui finit en -ez sans être un verbe à l'impératif. */
const EZ_PAS_VERBE = new Set(["chez", "assez", "nez", "rez"]);
/** Impératifs anglais en tête de phrase. */
const EN = new Set([
  "order", "click", "discover", "shop", "book", "call", "save", "share", "tell", "send", "tag", "comment", "follow", "visit", "try", "grab",
  "get", "join", "contact", "ask", "request", "see", "check", "take", "treat", "come", "buy", "subscribe", "sign", "download", "swipe", "tap",
  "dm", "pick", "find", "explore", "hurry", "don't", "dont", "let", "learn", "read", "drop", "give",
]);

const lettres = (s: string) => s.replace(/^[^\p{L}]+/u, "");
const mots = (s: string) => lettres(s).split(/\s+/).filter(Boolean);

/** Cette phrase donne-t-elle un ordre au lecteur ? Une vraie question (« ? ») n'est jamais un ordre. */
export function estUnOrdre(phrase: string): boolean {
  const t = phrase.trim();
  if (!t || /\?\s*["»”)]*\s*$/.test(t)) return false;
  const w = mots(t);
  if (!w.length) return false;
  const [tete, ...pronom] = fold(w[0]).replace(/[.,;:!…»"”)]+$/, "").split(/[-’']/);
  const suite = fold(w[1] ?? "").replace(/^[^\p{L}]+|[^\p{L}']+$/gu, "").replace(/['’].*$/, "");
  const pronomColle = pronom.length > 0 && /^(moi|toi|nous|vous|le|la|les|lui|leur|en|y)$/.test(pronom[0] ?? "");
  // Vouvoiement : « Commandez », « Venez », « Dites-nous », « Abonnez-vous ».
  if (/^\p{L}{3,}ez$/u.test(tete) && !EZ_PAS_VERBE.has(tete)) return true;
  if (tete === "dites" || tete === "faites" || tete === "soyez") return true;
  if (FR_TU.has(tete)) return true;
  if (FR_TU_DOUBLE.has(tete) && (pronomColle || !w[1] || FR_SUITE.test(suite))) return true;
  if (FR_INF.has(tete) && w.length <= 5) return true;
  if (/^s$/.test(tete) && FR_INF.has(`s${pronom.join("")}`) && w.length <= 5) return true;
  if (EN.has(tete) && !pronom.length) return true;
  return false;
}

/** Une ligne faite seulement de mots-dièse (rangée à part, la fin de légende est la phrase d'avant). */
const LIGNE_MOTS_DIESE = /^(\s*#[\p{L}\p{N}_]+[\s,.]*)+$/u;
const phrases = (ligne: string) => ligne.split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean);

/** La phrase qui donne un ordre à la fin de la légende, ou null. */
export function ordreEnFin(caption: string): string | null {
  const lignes = String(caption ?? "").split(/\n/).map((l) => l.trim()).filter((l) => l && !LIGNE_MOTS_DIESE.test(l));
  const derniere = lignes[lignes.length - 1];
  if (!derniere) return null;
  const ps = phrases(derniere);
  const fin = ps[ps.length - 1];
  return fin && estUnOrdre(fin) ? fin : null;
}

/**
 * Retire l'ordre de la fin de la légende (corrigé par le Studio, sans nouvel appel) : les phrases d'ordre en dernière
 * position sont retirées, jusqu'à trouver une phrase qui n'en est pas un. Les mots-dièse rangés à la fin restent. Une
 * légende qui n'est qu'un ordre n'est jamais vidée : elle reste signalée par `ordreEnFin`, pour être refaite.
 */
export function sansOrdreEnFin(caption: string): { caption: string; retire: string[] } {
  const retire: string[] = [];
  const lignes = String(caption ?? "").replace(/\r/g, "").split(/\n/);
  const queue: string[] = [];
  while (lignes.length && (!lignes[lignes.length - 1].trim() || LIGNE_MOTS_DIESE.test(lignes[lignes.length - 1]))) queue.unshift(lignes.pop()!);
  for (let tour = 0; tour < 6 && lignes.length; tour++) {
    while (lignes.length && !lignes[lignes.length - 1].trim()) lignes.pop();
    const derniere = lignes[lignes.length - 1];
    if (derniere == null) break;
    const ps = phrases(derniere);
    const fin = ps[ps.length - 1];
    if (!fin || !estUnOrdre(fin)) break;
    // Jamais la légende entière : une légende qui n'est qu'un ordre est signalée (`ordreEnFin`) et refaite, pas vidée.
    if (ps.length === 1 && !lignes.slice(0, -1).some((l) => l.trim())) break;
    retire.push(fin);
    ps.pop();
    if (ps.length) lignes[lignes.length - 1] = ps.join(" ");
    else lignes.pop();
  }
  if (!retire.length) return { caption: String(caption ?? ""), retire };
  while (lignes.length && !lignes[lignes.length - 1].trim()) lignes.pop();
  const garde = queue.filter((l) => l.trim());
  return { caption: [lignes.join("\n").trim(), ...garde].filter(Boolean).join("\n\n"), retire };
}

/** La consigne, dite pareil à tous les rédacteurs (SINA, moteur des publications, calendrier). */
export const CONSIGNE_FIN_DE_LEGENDE = `La légende ne finit jamais sur un ordre au lecteur (jamais « Commande maintenant », « Clique », « Découvre », « Enregistre ce conseil », « Partage », « Réserve ») : elle finit sur une vraie question, une invitation qui porte le désir (« Le coffret t'attend à l'atelier jusqu'à samedi ») ou un fait utile (jour, lieu, prix fourni par le client). De 0 à ${MOTS_DIESE_MAX} mots-dièse précis, jamais plus.`;
