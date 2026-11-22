/**
 * LE COMPTEUR DE L'ATELIER DANS LA JAUGE DU MOIS (rapport 10, point 1).
 *
 * Chaque geste affiche son prix AVANT de lancer, en pourcentage du budget d'IA du mois (jamais en euros), chaîne
 * entière comptée : la création, la relecture par le juge quand il relit (le modèle le plus fort, une image à la fois ;
 * les retouches simples n'ont que le contrôle local, gratuit), et une reprise
 * probable (une vidéo sur deux est refusée à la relecture selon les praticiens, rapport du 21 novembre ; une image sur
 * quatre, mon avis). Le nombre affiché est donc prudent ; ce qui est vraiment décompté ensuite, c'est le coût réel.
 * Un essai raté par l'outil n'est jamais compté au client (`rendreAuClient`, billing.ts) : c'est dit sous le prix.
 *
 * Un plafond de vidéos par forfait (forfaits validés : 0, 3 et 6 vidéos par mois) : la vidéo est ce qui épuise le
 * budget ; elle ne peut pas le vider le premier jour.
 *
 * Module pur : le coût typique d'un outil et la base du budget sont passés par l'appelant.
 */
import { formatPct, pctOfBudget } from "../budget-pct";
import type { PlanId } from "../plans";

/** Relecture d'une image par le juge (mesure du Studio du 21 novembre 2026 : environ 0,03 €). */
export const RELECTURE_IMAGE_MICRO = 30_000;
/** Images d'une vidéo relues par le juge (le contrôle image par image local, lui, est gratuit). */
export const IMAGES_RELUES_PAR_VIDEO = 3;
/** Part des créations qui demandent une reprise (vidéo : une sur deux ; image : une sur quatre). */
export const REPRISE_PROBABLE = { image: 0.25, video: 0.5 } as const;

export type Chaine = { creationMicro: number; relectureMicro: number; repriseMicro: number; totalMicro: number };

/**
 * Le coût probable de toute la chaîne d'un geste : `unitMicro` est le coût typique d'UNE création par l'outil (une
 * image, ou une vidéo de la durée demandée), `nombre` le nombre de créations (le lot « tout mon catalogue »).
 */
export function chaineGeste(o: { kind: "image" | "video"; unitMicro: number; nombre?: number; /** Le juge relit (scène, vidéo) ; sinon seul le contrôle local gratuit. */ relu?: boolean }): Chaine {
  const n = Math.max(1, Math.round(o.nombre ?? 1));
  const relu = o.relu === false ? 0 : o.kind === "video" ? IMAGES_RELUES_PAR_VIDEO * RELECTURE_IMAGE_MICRO : RELECTURE_IMAGE_MICRO;
  const creationMicro = Math.round(o.unitMicro * n);
  const relectureMicro = relu * n;
  const repriseMicro = Math.round((o.unitMicro + relu) * REPRISE_PROBABLE[o.kind] * n);
  return { creationMicro, relectureMicro, repriseMicro, totalMicro: creationMicro + relectureMicro + repriseMicro };
}

/** « environ 3 % de ton budget du mois » (fr, tutoiement) ; « about 3% of your monthly budget » (en). */
export function prixTexte(micro: number, baseMicro: number | null | undefined, lang: "fr" | "en"): string {
  const pct = pctOfBudget(micro, baseMicro);
  if (pct == null) return lang === "fr" ? "pris sur ton budget du mois" : "taken from your monthly budget";
  const v = formatPct(pct, lang);
  const approx = v.startsWith("<") ? (lang === "fr" ? "moins de " : "less than ") : lang === "fr" ? "environ " : "about ";
  const bare = v.replace(/^<\s*/, "");
  return lang === "fr" ? `${approx}${bare} de ton budget du mois` : `${approx}${bare} of your monthly budget`;
}

/** La phrase du bouton : « Vidéo de 8 secondes : environ 3 % de ton budget du mois ». */
export function prixBouton(label: string, micro: number, baseMicro: number | null | undefined, lang: "fr" | "en"): string {
  return `${label} : ${prixTexte(micro, baseMicro, lang)}`;
}

/** Ce qui est dit sous chaque prix (le Studio garde à sa charge l'essai raté par l'outil). */
export const SOUS_LE_PRIX: readonly [string, string] = [
  "Création, relecture et une reprise probable comptées. Un essai raté par l'outil ne t'est jamais compté.",
  "Creation, review and a likely retry included. A try the tool gets wrong is never charged to you.",
];

/** Vidéos de l'atelier par mois et par forfait (forfaits validés par le propriétaire : 0, 3 et 6). */
export const VIDEOS_ATELIER_PAR_MOIS: Record<PlanId, number> = { creer: 0, vendre: 3, dominer: 6 };

export type PlafondVideos = { inclus: number; faites: number; restantes: number };

export function plafondVideos(plan: PlanId | null, faites: number): PlafondVideos {
  const inclus = plan ? VIDEOS_ATELIER_PAR_MOIS[plan] : 0;
  return { inclus, faites, restantes: Math.max(0, inclus - faites) };
}

/** La phrase claire quand le plafond est atteint (ou que le forfait n'a pas de vidéo). Null : une vidéo reste. */
export function plafondTexte(p: PlafondVideos, lang: "fr" | "en"): string | null {
  if (p.restantes > 0) return null;
  if (p.inclus === 0) return lang === "fr" ? "Ton forfait ne comprend pas de vidéo. Les images restent ouvertes." : "Your plan doesn't include videos. Images stay open.";
  return lang === "fr"
    ? `Tu as fait tes ${p.inclus} vidéos du mois. Elles reviennent au début du mois prochain.`
    : `You've made your ${p.inclus} videos this month. They come back at the start of next month.`;
}
