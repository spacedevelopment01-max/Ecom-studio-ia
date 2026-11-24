/**
 * LE GARDE-FOU DE DÉPENSE DES ESSAIS RÉELS (24 novembre 2026, accepté par le propriétaire ; premier essai visé : 1 €).
 *
 * Actif SEULEMENT dans le studio privé d'essai (scripts/syna-recette/lancer-agent.mts), qui pose deux variables :
 *  - `STUDIO_ESSAI_PLAFOND_EUROS` : le plafond de l'essai, en euros (« 1 » ou « 1,50 ») ;
 *  - `STUDIO_ESSAI_DEBUT` : le début de l'essai (millisecondes depuis 1970, ou date ISO).
 * Sans `STUDIO_ESSAI_PLAFOND_EUROS`, rien ne change dans le Studio. Avec un plafond mais sans début lisible, tout appel
 * payant est refusé (réglage incomplet : jamais d'essai sans borne). Rien n'est lu ni écrit dans les réglages
 * d'Administration.
 *
 * Une seule somme pour tout l'essai : tout ce qui est engagé depuis son début, appels payés par le client et reprises à
 * la charge du Studio (`aLaChargeDuStudio`), textes, images, recherches sur le web (à leur tarif), comptée comme le
 * plafond des tâches (`sommeEngageeSql`), lue dans la base : le site et le worker voient la même somme.
 *
 * Un seul endroit de contrôle : la réservation du maximum de l'appel (`reserve`, billing.ts), par où passe tout appel
 * payant avant de partir, dans la même transaction que le portefeuille (deux appels en parallèle ne passent pas sous le
 * même reste). Déjà engagé + maximum de l'appel > plafond : l'appel est refusé avant de partir, rien n'est dépensé. Un
 * appel sans maximum connu est refusé.
 */
import { one } from "../db";
import { L } from "../i18n-server";
import { CostCapReached, sommeEngageeSql } from "./trace";

const EUR = 1_000_000;

export type ReglageDeLEssai = { plafondMicro: number; debut: number };

/** Le réglage de l'essai posé par le studio privé d'essai ; null : pas d'essai, le Studio est inchangé. */
export function reglageDeLEssai(env: Record<string, string | undefined> = process.env): ReglageDeLEssai | null {
  const brut = env.STUDIO_ESSAI_PLAFOND_EUROS?.trim();
  if (!brut) return null;
  const euros = Number(brut.replace(",", "."));
  // Un plafond illisible ne laisse rien passer (0) : jamais un essai sans borne.
  const plafondMicro = Number.isFinite(euros) && euros > 0 ? Math.floor(euros * EUR) : 0;
  const d = env.STUDIO_ESSAI_DEBUT?.trim() ?? "";
  const debut = /^\d+$/.test(d) ? Number(d) : d ? Date.parse(d) : NaN;
  return { plafondMicro, debut };
}

/** Ce que l'essai a déjà engagé (micro-euros), lu dans la base. */
export function depensesDeLEssai(debut: number): number {
  return one<{ total: number }>(`SELECT ${sommeEngageeSql("created_at>=?")} AS total`, debut, debut, debut)?.total ?? 0;
}

/** Plafond de l'essai atteint : l'appel n'est pas parti, rien n'est dépensé, la tâche s'arrête sans relance. */
export class PlafondDeLEssaiAtteint extends CostCapReached {
  constructor(spentMicro: number, estimateMicro: number, capMicro: number, public raison: "plafond" | "maximum_inconnu" | "reglage_incomplet" = "plafond") {
    super(spentMicro, estimateMicro, capMicro, false);
    this.name = "PlafondDeLEssaiAtteint";
    this.message = raison === "maximum_inconnu"
      ? L("plafond de l'essai : cet appel n'a pas de coût maximal connu, il n'a pas été envoyé (rien n'est dépensé). La création s'arrête ici et ne sera pas relancée.", "trial cap: this call has no known maximum cost, it was not sent (nothing spent). The task stops here and will not be retried.")
      : raison === "reglage_incomplet"
        ? L("plafond de l'essai : le début de l'essai n'est pas lisible, aucun appel payant ne part (rien n'est dépensé). La création s'arrête ici et ne sera pas relancée.", "trial cap: the trial start is unreadable, no paid call is sent (nothing spent). The task stops here and will not be retried.")
        : L("plafond de dépense de l'essai atteint : l'appel suivant n'a pas été envoyé, rien de plus n'est dépensé. La création s'arrête ici et ne sera pas relancée.", "trial spending cap reached: the next call was not sent, nothing more is spent. The task stops here and will not be retried.");
  }
}

/** Les tâches de fond dont un appel a été refusé par le plafond de l'essai (dans ce processus, celui qui les exécute). */
const tachesArretees = new Map<string, PlafondDeLEssaiAtteint>();

/**
 * LE CONTRÔLE (appelé par `reserve`, dans sa transaction) : déjà engagé + maximum de l'appel ≤ plafond, sinon refus.
 * Sans réglage d'essai : ne fait rien.
 */
export function assertSousLePlafondDeLEssai(maxMicro: number, jobId?: string | null): void {
  const r = reglageDeLEssai();
  if (!r) return;
  const refus = (e: PlafondDeLEssaiAtteint): never => { if (jobId) tachesArretees.set(jobId, e); throw e; };
  if (!Number.isFinite(r.debut)) refus(new PlafondDeLEssaiAtteint(0, maxMicro, r.plafondMicro, "reglage_incomplet"));
  if (!Number.isFinite(maxMicro) || maxMicro <= 0) refus(new PlafondDeLEssaiAtteint(0, maxMicro, r.plafondMicro, "maximum_inconnu"));
  const deja = depensesDeLEssai(r.debut);
  if (deja + Math.ceil(maxMicro) > r.plafondMicro) refus(new PlafondDeLEssaiAtteint(deja, Math.ceil(maxMicro), r.plafondMicro));
}

/**
 * Le worker, à la fin d'une tâche : si un de ses appels a été refusé par le plafond de l'essai, la tâche s'arrête
 * (échec définitif, jamais relancée), même si sa chaîne a continué sans cet appel. Lu une fois, puis oublié.
 */
export function arretParLEssai(jobId: string): PlafondDeLEssaiAtteint | null {
  const e = tachesArretees.get(jobId) ?? null;
  tachesArretees.delete(jobId);
  return e;
}
