/**
 * Trace des appels aux fournisseurs (observabilité) : une ligne `ai_calls` par appel réellement envoyé, reprises
 * comprises. Le contexte (tâche de fond, étape, candidat, tentative) suit le code asynchrone sans changer les
 * signatures : `ctx.step()` ouvre l'étape, `withCandidate()` précise le candidat évalué.
 *
 * Ce qui n'est JAMAIS enregistré : texte du prompt, images, clés, jetons d'accès. Seuls la clé du prompt système
 * et son empreinte le sont.
 */
import { redact } from "../redact";
import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";
import { id, now, one, run } from "../db";
import { borneDuStudio, tacheDuStudio } from "./borne-du-studio";

export type TraceScope = {
  /** Demande persistante de l'agent commun ; impossible de la remplacer dans une sous-portée. */
  agentBoundId?: string;
  /** Récupération des acquis uniquement : aucune nouvelle réservation fournisseur. */
  recoveryOnly?: boolean;
  /**
   * Relance d'une tâche coupée en plein appel payant, accordée par le client sur sa carte de prix (numéro de la
   * relance) : un appel au résultat incertain se renvoie une fois, sous une clé à lui (billing.cleDeRelance).
   */
  relance?: number;
  jobId?: string | null;
  projectId?: string | null;
  step?: string;
  candidateId?: string;
  attempt?: number;
  /** Orchestration (phase 3A) : intention(s) de la demande, plan et étape en cours, routage choisi pour l'étape. */
  intent?: string;
  planId?: string;
  stepId?: string;
  routing?: { reason: string; fallback: boolean; escalation: boolean };
  /**
   * Plafond du CLIENT pour la tâche (micro-euros) : celui de sa carte d'accord, jamais montré (26 novembre 2026). Il ne couvre que ce qu'il paie ;
   * aucune dépense comptée au client ne part au-delà (benchmark --max-cost).
   */
  costCapMicro?: number;
  /**
   * Borne du STUDIO pour la tâche (micro-euros) : ce que les reprises à sa charge peuvent coûter au plus (deux plafonds,
   * 23 novembre 2026). Sans elle, elle se calcule sur le plafond du client (`borneDuStudio`).
   */
  studioCapMicro?: number;
  /**
   * La dépense ANNONCÉE au client pour la tâche (micro-euros) : le coût probable de sa carte d'accord, le seul chiffre
   * qu'il voit (26 novembre 2026). Avant chaque appel compté au client, si la tâche allait dépasser le double de ce
   * chiffre, elle s'arrête et le Studio lui demande s'il veut continuer (`DepassementDeLAnnonce`).
   */
  annonceMicro?: number;
  /** Historique de qualité de l'étape du plan en cours (reprise) : transmis au Router V2. */
  history?: { attempt?: number; lastScore?: number | null; lastVerdict?: "FINAL" | "RETRY" | "PROVISIONAL" | "REJECTED"; lastProvider?: string; lastModel?: string; failure?: "quality" | "provider_error" | "parse" | "refusal" };
};
const store = new AsyncLocalStorage<TraceScope>();

export function currentTrace(): TraceScope {
  return store.getStore() ?? {};
}

/** Exécute `fn` dans un contexte de trace (fusionné avec le contexte courant ; les étapes s'imbriquent en « a/b »). */
export function withTrace<T>(scope: TraceScope, fn: () => Promise<T>): Promise<T> {
  const cur = currentTrace();
  if(cur.agentBoundId&&scope.agentBoundId&&cur.agentBoundId!==scope.agentBoundId)throw new Error('agent_request_scope_conflict');
  const step = scope.step ? (cur.step ? `${cur.step}/${scope.step}` : scope.step) : cur.step;
  const costCapMicro=cur.costCapMicro==null?scope.costCapMicro:scope.costCapMicro==null?cur.costCapMicro:Math.min(cur.costCapMicro,scope.costCapMicro);
  const studioCapMicro=cur.studioCapMicro==null?scope.studioCapMicro:scope.studioCapMicro==null?cur.studioCapMicro:Math.min(cur.studioCapMicro,scope.studioCapMicro);
  return store.run({ ...cur, ...scope, agentBoundId:cur.agentBoundId??scope.agentBoundId,costCapMicro,studioCapMicro,recoveryOnly: cur.recoveryOnly || scope.recoveryOnly, step }, fn);
}

/** Candidat évalué (piste de logo, image…) et sa tentative : les appels faits dans `fn` lui sont rattachés. */
export function withCandidate<T>(candidateId: string, attempt: number, fn: () => Promise<T>): Promise<T> {
  return store.run({ ...currentTrace(), candidateId, attempt }, fn);
}

/**
 * RÈGLE DU PROPRIÉTAIRE (LE-STUDIO-DE-A-A-Z, partie 13 : « une erreur de SINA est toujours corrigée sans rien compter ;
 * un changement de goût du client passe par son budget du mois ») : ce que le Studio refait pour sa propre qualité est à
 * sa charge. Une reprise du Studio (`aLaChargeDuStudio`) ne prend rien sur le budget du client, et ne regarde que la
 * borne du Studio de la tâche, jamais le plafond du client (deux plafonds, 23 novembre 2026).
 */
const studioScope = new AsyncLocalStorage<boolean>();
export const aLaChargeDuStudio = <T>(fn: () => T): T => studioScope.run(true, fn);
export const chargeDuStudio = (): boolean => studioScope.getStore() === true;
/**
 * Exécute une tâche de fond selon sa charge : une tâche à la charge du Studio (`tacheDuStudio`) l'est en ENTIER, à la
 * source, pour toutes ses dépenses (texte, images, relectures, idée en mots simples, recherche), quel que soit le chemin
 * de l'appel ; jamais une dépense sur le budget du client (essai réel de Nadia, 23 novembre 2026). Les autres tâches
 * restent comptées au client, sauf leurs reprises (`aLaChargeDuStudio`).
 */
export const selonLaCharge = <T>(payload: unknown, fn: () => T): T => (tacheDuStudio(payload) ? aLaChargeDuStudio(fn) : fn());

/** Plafond atteint : l'appel n'est pas envoyé (rien n'est payé). `studio` : c'est la borne des reprises du Studio. */
export class CostCapReached extends Error {
  readonly permanent = true;
  constructor(public spentMicro: number, public estimateMicro: number, public capMicro: number, public studio = false) {
    // Message vu par le client (tâche) : jamais de montant en euros ; les chiffres restent dans les champs (journal, admin).
    // Essai réel du 19 novembre 2026 : SINA a lu ce message comme « ton budget d'IA est épuisé » et l'a dit au client.
    super(studio
      ? "borne des reprises du Studio atteinte : la reprise suivante n'a pas été envoyée. Ces reprises sont à la charge du Studio : rien n'est compté au client, et son budget d'IA n'est pas touché."
      : "plafond de dépense atteint : l'appel suivant n'a pas été envoyé (rien de plus n'est décompté). C'est le plafond de CETTE création, fixé à l'avance par le Studio : le budget d'IA du client n'est pas épuisé.");
    this.name = "CostCapReached";
  }
}

/**
 * LA DÉPENSE ANNONCÉE (26 novembre 2026, ses mots : « Il faut arrêter de montrer des plafond aussi haut ça va faire peur
 * aux clients »). La carte n'annonce plus que le coût probable ; le plafond reste en coulisses (la réservation de chaque
 * appel). En échange, SINA ne dépasse jamais en silence : si la part du client, déjà engagée, plus le maximum de l'appel
 * suivant dépassait le double de ce qui a été annoncé, l'appel ne part pas, la tâche s'arrête et attend l'accord du client
 * (le worker la met en attente, `mettreEnAttenteDAccord`). Le premier appel d'une tâche part toujours (rien n'est encore
 * dépensé) ; une fois arrêtée, plus aucun appel de la tâche ne part, même à la charge du Studio, jusqu'à son accord.
 */
export const SEUIL_DE_L_ANNONCE = 2;

/** La tâche allait dépasser le double de la dépense annoncée : l'appel n'est pas envoyé, rien de plus n'est payé. */
export class DepassementDeLAnnonce extends CostCapReached {
  constructor(spentMicro: number, estimateMicro: number, public annonceMicro: number) {
    super(spentMicro, estimateMicro, Math.floor(annonceMicro * SEUIL_DE_L_ANNONCE));
    this.name = "DepassementDeLAnnonce";
    this.message = "pause avant l'appel suivant : la tâche allait dépasser le double de la dépense annoncée au client. L'appel n'a pas été envoyé (rien de plus n'est décompté) ; la tâche attend son accord pour continuer.";
  }
}

/** Les tâches arrêtées par la dépense annoncée (dans ce processus, celui qui les exécute), jusqu'à leur mise en attente. */
const tachesArreteesParLAnnonce = new Map<string, DepassementDeLAnnonce>();
/** La tâche est-elle arrêtée par la dépense annoncée ? (sans l'oublier : les points de reprise ne s'enregistrent plus) */
export const arreteeParLAnnonce = (jobId: string): DepassementDeLAnnonce | null => tachesArreteesParLAnnonce.get(jobId) ?? null;
/** Le worker, à la fin d'une tâche : l'arrêt par la dépense annoncée, lu une fois puis oublié. */
export function arretParLAnnonce(jobId: string): DepassementDeLAnnonce | null {
  const e = tachesArreteesParLAnnonce.get(jobId) ?? null;
  tachesArreteesParLAnnonce.delete(jobId);
  return e;
}

/** Le contrôle de la dépense annoncée, pour une dépense comptée au client (sans annonce ni tâche : rien ne change). */
export function assertSousLeDoubleDeLAnnonce(dejaClientMicro: number, estimateMicro: number, annonceMicro: number | undefined, jobId: string | null | undefined): void {
  if (!jobId || !(annonceMicro != null && Number.isFinite(annonceMicro) && annonceMicro > 0)) return;
  if (!(dejaClientMicro > 0)) return;
  if (dejaClientMicro + estimateMicro <= Math.floor(annonceMicro * SEUIL_DE_L_ANNONCE)) return;
  const e = new DepassementDeLAnnonce(dejaClientMicro, estimateMicro, annonceMicro);
  tachesArreteesParLAnnonce.set(jobId, e);
  throw e;
}

/**
 * Ce qu'une tâche a engagé (micro-euros) : en tout, et la part à la charge du Studio (réservations marquées « studio »,
 * réglées ou non) ; le reste est la part du client. Les règlements liés à usage_events ne sont comptés qu'une fois. Les
 * coûts incertains et les appels encore réservés sont des engagements, même sans trace finale ai_calls. Les anciennes
 * réservations sans lien restent retenues : on ne suppose pas gratuitement leur rapprochement avec une ancienne trace.
 */
/**
 * La somme engagée, en une seule façon de compter (réservations encore tenues à leur maximum, réglées à leur coût réel,
 * facturations, traces sans facture) : pour une tâche (`job_id=?`) ou pour tout ce qui part depuis un instant
 * (`created_at>=?`, le garde-fou des essais réels, `plafond-essai.ts`). `filtre` porte un seul « ? ».
 */
export const sommeEngageeSql = (filtre: "job_id=?" | "created_at>=?") => `
    COALESCE((SELECT SUM(CASE WHEN status='held' THEN amount ELSE COALESCE(actual,amount) END)
      FROM ai_reservations WHERE ${filtre} AND status IN ('held','settled','uncertain','reconciled') AND usage_event_id IS NULL),0)
    + COALESCE((SELECT SUM(billed) FROM usage_events WHERE ${filtre}),0)
    + COALESCE((SELECT SUM(cost) FROM ai_calls WHERE ${filtre} AND usage_event_id IS NULL AND billing_dedup=0 AND status='ok'),0)`;

export function depensesDeLaTache(jobId: string): { total: number; studio: number; client: number } {
  const r = one<{ total: number; studio: number }>(`SELECT ${sommeEngageeSql("job_id=?")} AS total,
    COALESCE((SELECT SUM(CASE WHEN status='held' THEN amount ELSE COALESCE(actual,amount) END)
      FROM ai_reservations WHERE job_id=? AND studio=1 AND status IN ('held','settled','uncertain','reconciled') AND usage_event_id IS NULL),0)
    + COALESCE((SELECT SUM(billed) FROM usage_events WHERE job_id=? AND id IN (SELECT usage_event_id FROM ai_reservations WHERE job_id=? AND studio=1 AND usage_event_id IS NOT NULL)),0) AS studio`,
    jobId, jobId, jobId, jobId, jobId, jobId);
  const total = r?.total ?? 0, studio = Math.min(total, r?.studio ?? 0);
  return { total, studio, client: total - studio };
}

/**
 * Garde-fou de dépense RÉEL, avec DEUX plafonds (23 novembre 2026) : avant chaque appel payant, ce que la tâche a déjà
 * engagé plus l'estimation de l'appel.
 *  - Une dépense comptée au client ne regarde que le plafond du client (celui de sa carte, gardé en coulisses depuis le
 *    26 novembre 2026 : il ne voit que le coût probable), sur sa seule part, et le double de la dépense annoncée.
 *  - Une reprise à la charge du Studio (`studio`) ne regarde que la borne du Studio, sur la seule part du Studio.
 *  - La tâche s'arrête toujours à la somme des deux : aucune dépense sans fin possible.
 * Sans borne du Studio donnée (ancienne tâche, portée sans devis), elle se calcule sur le plafond du client
 * (`borneDuStudio`). Au-delà, exception : l'appel ne part pas.
 */
export function assertUnderCostCap(estimateMicro: number, studio: boolean = chargeDuStudio()) {
  const t = currentTrace();
  // Une tâche arrêtée par la dépense annoncée n'envoie plus rien, jusqu'à l'accord du client.
  const arretee = t.jobId ? arreteeParLAnnonce(t.jobId) : null;
  if (arretee) throw arretee;
  const cap = t.costCapMicro;
  const borne = t.studioCapMicro ?? (cap != null ? borneDuStudio(cap) : undefined);
  const annonce = t.annonceMicro != null && t.annonceMicro > 0 ? t.annonceMicro : undefined;
  if (cap == null && borne == null && annonce == null) return;
  const d = t.jobId ? depensesDeLaTache(t.jobId) : { total: 0, studio: 0, client: 0 };
  if (!studio) assertSousLeDoubleDeLAnnonce(d.client, estimateMicro, annonce, t.jobId);
  if (studio) { if (borne != null && d.studio + estimateMicro > borne) throw new CostCapReached(d.studio, estimateMicro, borne, true); }
  else if (cap != null && d.client + estimateMicro > cap) throw new CostCapReached(d.client, estimateMicro, cap);
  if (cap != null && borne != null && d.total + estimateMicro > cap + borne) throw new CostCapReached(d.total, estimateMicro, cap + borne, studio);
}

/** Empreinte courte d'un texte (version de fait d'un prompt système), sans le conserver. */
export const shortHash = (text: string) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);

/** Masque les secrets connus dans un texte destiné aux journaux (clés API, jetons, paramètres « key= »). */
export { redact };

export type CallRow = {
  /** Détails de mesure (part écrite pour une heure, différé servi ou raté, image…), gardés en JSON. */
  details?: Record<string, unknown> | null;
  userId: string;
  projectId?: string | null;
  jobId?: string | null;
  task: string;
  provider: string;
  requestedModel: string;
  servedModel?: string | null;
  unit: "tokens" | "image" | "video_second" | "request";
  inputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  outputTokens?: number;
  quantity?: number;
  latencyMs?: number | null;
  httpAttempts?: number | null;
  stopReason?: string | null;
  effort?: string | null;
  costMicro?: number;
  estimated?: boolean;
  usageKey?: string | null;
  usageEventId?: string | null;
  billingDedup?: boolean;
  status: "ok" | "error" | "refused" | "timeout";
  errorKind?: string | null;
  promptKey?: string | null;
  promptHash?: string | null;
  callTry?: number;
  qualityCheckId?: string | null;
  /** Project Brain : portée (ex. « legacy:images »), empreinte du contexte stable et version du Brain. */
  brainScope?: string | null;
  brainHash?: string | null;
  brainVersion?: string | null;
  /** Router V2 : raison synthétique du choix, repli de fournisseur, escalade de niveau (sinon ceux de l'étape). */
  routingReason?: string | null;
  fallback?: boolean;
  escalation?: boolean;
  /** Compétences (skills) transmises dans la référence de l'appel, séparées par des virgules. */
  skills?: string | null;
};

/**
 * Enregistre un appel. Ne lève jamais d'erreur : une trace manquante ne doit pas faire échouer une génération
 * déjà payée. Étape, candidat et tentative viennent du contexte courant.
 */
export function recordCall(c: CallRow): string | null {
  const t = currentTrace();
  const rid = id();
  try {
    run(
      `INSERT INTO ai_calls (id, created_at, user_id, project_id, job_id, task, step, candidate_id, attempt, call_try, provider, requested_model, served_model, unit, input_tokens, cache_read_tokens, cache_write_tokens, output_tokens, quantity, latency_ms, http_attempts, stop_reason, effort, cost, estimated, usage_key, usage_event_id, billing_dedup, status, error_kind, prompt_key, prompt_hash, quality_check_id, brain_scope, brain_hash, brain_version, intent, plan_id, step_id, routing_reason, routing_fallback, routing_escalation, skills, details)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      rid,
      now(),
      c.userId,
      c.projectId ?? t.projectId ?? null,
      c.jobId ?? t.jobId ?? null,
      c.task,
      t.step ?? null,
      t.candidateId ?? null,
      t.attempt ?? 0,
      c.callTry ?? 0,
      c.provider,
      c.requestedModel,
      c.servedModel ?? null,
      c.unit,
      Math.round(c.inputTokens ?? 0),
      Math.round(c.cacheReadTokens ?? 0),
      Math.round(c.cacheWriteTokens ?? 0),
      Math.round(c.outputTokens ?? 0),
      c.quantity ?? 0,
      c.latencyMs ?? null,
      c.httpAttempts ?? null,
      c.stopReason ?? null,
      c.effort ?? null,
      Math.round(c.costMicro ?? 0),
      c.estimated ? 1 : 0,
      c.usageKey ?? null,
      c.usageEventId ?? null,
      c.billingDedup ? 1 : 0,
      c.status,
      c.errorKind ? redact(c.errorKind).slice(0, 300) : null,
      c.promptKey ?? null,
      c.promptHash ?? null,
      c.qualityCheckId ?? null,
      c.brainScope ?? null,
      c.brainHash ?? null,
      c.brainVersion ?? null,
      t.intent ?? null,
      t.planId ?? null,
      t.stepId ?? null,
      (c.routingReason ?? t.routing?.reason ?? null)?.slice(0, 200) ?? null,
      (c.fallback ?? t.routing?.fallback) ? 1 : 0,
      (c.escalation ?? t.routing?.escalation) ? 1 : 0,
      c.skills ?? null,
      c.details && Object.keys(c.details).length ? JSON.stringify(c.details) : null,
    );
    return rid;
  } catch (e) {
    console.warn("[trace] appel non enregistré :", redact((e as Error).message));
    return null;
  }
}

/** Compétences (skills) annoncées dans le bloc de référence d'un appel (`<skills names="a,b">`), pour la trace. */
export function skillsOfReference(reference?: string | null): string | null {
  if (!reference) return null;
  const names = [...reference.matchAll(/<skills names="([^"]+)"/g)].flatMap((m) => m[1].split(",")).map((x) => x.trim()).filter(Boolean);
  return names.length ? [...new Set(names)].join(",").slice(0, 500) : null;
}
