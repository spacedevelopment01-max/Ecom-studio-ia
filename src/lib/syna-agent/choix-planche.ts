/**
 * Les boutons des anciens messages qui choisissent une planche (23 novembre 2026) : un bouton « Je prends X » d'une planche
 * incomplète est grisé à l'écran, avec la phrase de SINA dessous, et redevient actif dès que la planche est complète.
 * Sans rien du serveur : lu par l'écran du fil sur la liste des planches incomplètes (`planchesIncompletes`, la seule
 * lecture). `identity.choose` refuse de toute façon ce choix (seconde sécurité).
 */
export type PlancheNommee = { key: string; name: string };

/** Sans accents, en minuscules, apostrophes ramenées à une seule. */
const plat = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/[’`]/g, "'").toLowerCase().trim();
const echappe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Un mot entier (les lettres accentuées comptent comme des lettres). */
const motEntier = (texte: string, mot: string) => !!mot && new RegExp(`(?<![\\p{L}\\p{N}])${echappe(mot)}(?![\\p{L}\\p{N}])`, "u").test(texte);
/** Un bouton qui choisit : « je prends », « je choisis », « je garde », « on part sur », « I'll take »… */
const CHOISIT = /(?<![\p{L}])(je (prends|choisis|garde|retiens|veux|prefere|valide|opte pour|pars sur)|j'(opte|aime|adopte)|on (prend|choisit|garde|part sur|valide)|choisir|prendre|garder|i('ll| will)? (take|choose|pick|want|keep|go with)|take|choose|pick|go with|let's go with)(?![\p{L}])/u;

/**
 * La planche que ce bouton choisit, parmi `planches` (celles qu'on surveille : les incomplètes), ou null. Un bouton
 * choisit une planche quand il la nomme (son nom, ou « identité B », « planche B ») avec un mot de choix, ou quand il ne
 * dit que son nom. « Pourquoi Sillage ? » ne choisit rien.
 */
export function plancheDuBouton(choix: string, planches: readonly PlancheNommee[]): string | null {
  const texte = plat(choix), seul = texte.replace(/[\s.!?…«»"']+/g, " ").trim();
  const choisit = CHOISIT.test(texte);
  for (const p of planches) {
    const nom = plat(p.name), cle = p.key.toLowerCase();
    const parCle = new RegExp(`(?<![\\p{L}])(identite|planche|proposition|identity|board|option)\\s+${echappe(cle)}(?![\\p{L}\\p{N}])`, "u").test(texte);
    if (seul === nom || seul === cle) return p.key;
    if (choisit && (motEntier(texte, nom) || parCle)) return p.key;
  }
  return null;
}

/** La phrase dite sous un bouton grisé (les deux langues, tutoiement). */
export const PHRASE_PLANCHE_INCOMPLETE = {
  fr: "Cette planche n'est pas encore complète : je la finis à ma charge, puis tu pourras la choisir.",
  en: "This board isn't complete yet: I'll finish it at my expense, then you can choose it.",
} as const;
