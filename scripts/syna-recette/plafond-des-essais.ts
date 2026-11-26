/**
 * LE PLAFOND DES ESSAIS DU PROPRIÉTAIRE (26 novembre 2026). Ses mots : « Il faut arrêter de montrer des plafond aussi haut
 * ça va faire peur aux clients ». Un essai n'exige plus un plafond égal à la somme des maxima de tous ses appels : le
 * plafond donné (PLAFOND_ESSAI_EUR) peut être proche du probable, par exemple deux fois le probable, arrondi.
 *
 *  - Sous la somme des maxima, le script part quand même et le dit.
 *  - Le garde-fou de l'essai (src/lib/ai/plafond-essai.ts) refuse, avant qu'il parte, tout appel dont le pire cas
 *    dépasserait ce qui reste : l'essai s'arrête proprement, rien de plus n'est dépensé.
 *  - Le script garde alors tous ses fichiers, dit ce qui est fait, ce qu'il faudrait au plus pour finir et comment
 *    reprendre (par les points de reprise de chaque essai).
 * Ce sont des chiffres pour le propriétaire, en euros, jamais montrés à un client.
 */
import { euros } from "./client-de-l-essai";

/** Le plafond conseillé d'un essai : deux fois le probable, arrondi au demi-euro du dessus. */
export const plafondConseilleMicro = (probableMicro: number): number => Math.max(500_000, Math.ceil((2 * Math.max(0, probableMicro)) / 500_000) * 500_000);

/** Le plafond donné, en micro-euros ; null s'il est absent ou illisible (rien ne part alors). */
export function plafondLu(plafondEuros: string | undefined | null): number | null {
  const v = Number(String(plafondEuros ?? "").trim().replace(",", "."));
  return Number.isFinite(v) && v > 0 ? Math.floor(v * 1_000_000) : null;
}

/** Ce que le script dit avant de partir quand le plafond est sous la somme des maxima ; null sinon. Jamais un refus. */
export function avisDuPlafond(plafondMicro: number, d: { plafondMinimalMicro: number; probableMicro?: number }): string | null {
  if (plafondMicro >= d.plafondMinimalMicro) return null;
  return `Le plafond ${euros(plafondMicro)} est sous la somme des maxima ${euros(d.plafondMinimalMicro)}${d.probableMicro != null ? ` (probable ${euros(d.probableMicro)})` : ""} : l'essai part quand même. Il s'arrête proprement avant tout appel dont le pire cas dépasserait ce qui reste, garde ses fichiers et dit ce qu'il faudrait pour finir.`;
}

/**
 * Après un arrêt, les appels déjà partis en même temps que l'appel refusé finissent et se règlent à leur coût réel avant
 * que le compte rendu soit écrit (sinon il les compterait à leur pire cas, encore réservé). Attend au plus `maxMs`.
 */
export async function attendreLesAppelsEnCours(enCours: () => number, maxMs = 10 * 60_000, pasMs = 500): Promise<boolean> {
  const t0 = Date.now();
  while (enCours() > 0) {
    if (Date.now() - t0 > maxMs) return false;
    await new Promise((r) => setTimeout(r, pasMs));
  }
  return true;
}

/**
 * Les lignes du compte rendu d'un essai arrêté par son plafond : ce qui est fait (fichiers gardés), ce qu'il faudrait au
 * plus pour finir (la somme des maxima moins ce qui est déjà dépensé, au pire), et comment reprendre.
 */
export function lignesDeLArret(o: { depenseMicro: number; plafondMicro: number; plafondMinimalMicro: number; fait: string[]; reprendre: string }): string[] {
  const reste = Math.max(0, o.plafondMinimalMicro - o.depenseMicro);
  return [
    `Arrêt propre : l'appel suivant aurait pu, au pire, dépasser ce qui restait du plafond (${euros(o.depenseMicro)} dépensés sur ${euros(o.plafondMicro)}) ; il n'est pas parti, rien de plus n'est dépensé.`,
    "Ce qui est fait (fichiers gardés dans ce dossier) :",
    ...(o.fait.length ? o.fait.map((f) => `- ${f}`) : ["- rien encore"]),
    `Pour finir : au plus ${euros(reste)} de plus, au pire (somme des maxima qui restent) ; ${o.reprendre}`,
  ];
}
