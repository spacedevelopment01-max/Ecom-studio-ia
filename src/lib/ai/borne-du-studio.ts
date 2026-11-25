/**
 * DEUX PLAFONDS PAR TÂCHE (23 novembre 2026, décision du chef d'orchestre ; règle du propriétaire, LE-STUDIO-DE-A-A-Z,
 * partie 13 : « une erreur de SINA est toujours corrigée sans rien compter ; un changement de goût du client passe par son
 * budget du mois »).
 *
 *  - Le plafond du CLIENT : le « au plus » de sa carte d'accord. Il ne couvre que ce qu'il paie : un premier essai de
 *    chaque image ou texte, avec sa relecture.
 *  - La borne du STUDIO : ce que les reprises à sa charge peuvent coûter au plus. Chaque création refusée par son relecteur
 *    est refaite deux fois au plus (`REPRISES_MAX`, la règle de toutes les chaînes) et une reprise ne coûte jamais plus
 *    qu'un premier essai avec sa relecture : la borne vaut donc deux fois le plafond du client. Une tâche entièrement à
 *    la charge du Studio (une planche gardée de côté à finir) y ajoute son premier essai : trois fois.
 *
 * Un devis qui sait ce qui se reprend (les images et leurs relectures, pas les appels faits une seule fois) donne ce coût
 * d'un essai (`repriseMicro`) ; la borne est alors exacte, et enregistrée dans la tâche (`studioCapMicro`).
 * Les anciennes tâches, enregistrées avec un seul plafond, reçoivent une borne calculée sur ce plafond (deux fois).
 */
import { REPRISES_MAX } from "../syna-agent/reprises";

/**
 * La borne du Studio d'une tâche dont le plafond du client est `capMicro`. `repriseMicro` : ce qu'UN essai de ce qui peut
 * être repris coûte au plus (les images et leurs relectures, sans les appels faits une seule fois, comme l'idée en mots
 * simples) ; sans lui, tout le plafond. Une tâche entièrement à la charge du Studio y ajoute son premier passage entier.
 */
export function borneDuStudio(capMicro: number, toutALaCharge = false, repriseMicro?: number,
  /**
   * Combien de reprises au plus (par défaut `REPRISES_MAX`, la règle de toutes les chaînes). Les logos de la méthode des
   * graphistes : 1 pour un logo fini (refait UNE fois) ; la recherche : `REMPLACEMENTS_MAX` tours de remplacement des
   * esquisses écartées, jusqu'à 12 correctes (25 novembre 2026).
   */
  reprises: number = REPRISES_MAX): number {
  if (!Number.isFinite(capMicro) || capMicro <= 0) return 0;
  const unEssai = repriseMicro != null && Number.isFinite(repriseMicro) && repriseMicro >= 0 ? Math.min(repriseMicro, capMicro) : capMicro;
  const n = Number.isFinite(reprises) && reprises >= 0 ? Math.floor(reprises) : REPRISES_MAX;
  return Math.ceil(n * unEssai + (toutALaCharge ? capMicro : 0));
}

/**
 * Coût PROBABLE à la charge du Studio, pour l'administration : une reprise par image en moyenne (hypothèse, non mesurée),
 * plus le premier passage quand toute la tâche est à sa charge.
 */
export function probableDuStudio(probableMicro: number, toutALaCharge = false, repriseProbableMicro?: number): number {
  const p = Number.isFinite(probableMicro) && probableMicro > 0 ? probableMicro : 0;
  const r = repriseProbableMicro != null && Number.isFinite(repriseProbableMicro) && repriseProbableMicro >= 0 ? Math.min(repriseProbableMicro, p || repriseProbableMicro) : p;
  return Math.ceil(r + (toutALaCharge ? p : 0));
}

/** Le plafond du client enregistré dans une tâche (`costCapMicro`, ou `capMicro` pour les chaînes de SINA), sinon aucun. */
export function plafondDuClientDe(payload: unknown): number | undefined {
  const p = payload as { costCapMicro?: unknown; capMicro?: unknown } | null;
  const c = p?.costCapMicro ?? p?.capMicro;
  return typeof c === "number" && Number.isFinite(c) && c >= 0 ? c : undefined;
}

/**
 * La borne du Studio d'une tâche : celle que son devis a enregistrée (`studioCapMicro`), sinon (anciennes tâches,
 * enregistrées avec un seul plafond) calculée sur son plafond ; aucune sans plafond.
 */
export function borneDuStudioDe(payload: unknown): number | undefined {
  const s = (payload as { studioCapMicro?: unknown } | null)?.studioCapMicro;
  if (typeof s === "number" && Number.isFinite(s) && s >= 0) return Math.ceil(s);
  const cap = plafondDuClientDe(payload);
  return cap == null ? undefined : borneDuStudio(cap, (payload as { studio?: unknown } | null)?.studio === true);
}

/**
 * Une tâche entièrement à la charge du Studio (`studio: true` dans sa demande : finir une planche gardée de côté, refaire
 * le logo qui manque à la marque finie). Essai réel de Nadia (23 novembre 2026) : la carte disait « À ma charge : 0 % de
 * ton budget », et son budget engagé a bougé. Toute dépense d'une telle tâche, quel que soit l'appel qui la fait, est à la
 * charge du Studio : la tâche entière s'exécute dans `aLaChargeDuStudio` (`selonLaCharge`, src/lib/ai/trace.ts).
 */
export function tacheDuStudio(payload: unknown): boolean {
  return (payload as { studio?: unknown } | null)?.studio === true;
}
