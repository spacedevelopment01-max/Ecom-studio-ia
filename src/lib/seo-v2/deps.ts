/**
 * Outils du moteur SEO V2 : rédaction (IA), relecture éditoriale (IA), réécriture ciblée d'un passage (IA).
 * Router V2 : métadonnées et réécritures courtes = difficulté « simple » (modèle économique) ; rédaction d'une page
 * ou d'un article = « complex » (modèle fort) ; relecture = « standard ».
 * Chaque outil renvoie son coût RÉEL (mesuré dans le journal des appels) ; l'estimation sert à refuser AVANT
 * l'envoi un appel qui dépasserait le plafond de la tâche. Injectables : les tests utilisent des outils simulés.
 */
import { z } from "zod";
import { llmConfigured, llmJson } from "../ai/llm";
import { brainView } from "../ai/context";
import { priceFor, routeFor, usdToEur, type TaskId } from "../ai/config";
import { EUR } from "../billing";
import { one } from "../db";
import { getJsonSetting } from "../settings";
import type { JobContext } from "../jobs";
import type { Project } from "../projects";
import { AiDraftSchema, type AiDraft } from "./write";
import { EditorialReviewSchema, REVIEW_SYSTEM } from "./quality";
import type { ContentType, EditorialReview } from "./types";

export type CallKind = "write_page" | "write_article" | "write_meta" | "review" | "rewrite";
export type Paid<T> = { value: T; costMicro: number };

export type SeoV2Deps = {
  /** IA de rédaction disponible pour ce compte (forfait, IA active, fournisseur configuré). */
  canWrite: boolean;
  /** Relecture IA disponible : sans elle, un contenu reste au mieux PROVISOIRE. */
  canReview: boolean;
  write: (system: string, prompt: string, key: string, kind: CallKind) => Promise<Paid<AiDraft>>;
  review: (prompt: string, key: string) => Promise<Paid<EditorialReview>>;
  /** Réécriture d'un passage : renvoie seulement les blocs demandés (même identifiants). */
  rewrite: (system: string, prompt: string, key: string) => Promise<Paid<RewriteOut>>;
  /** Estimation prudente d'un appel (micro-euros), vérifiée avant l'envoi. */
  estimate: (kind: CallKind) => number;
};

export const RewriteSchema = z.object({ blocks: z.array(z.object({ id: z.string(), text: z.string().optional(), items: z.array(z.string()).optional(), q: z.string().optional(), a: z.string().optional() })).catch([]), note: z.string().catch("") });
export type RewriteOut = z.infer<typeof RewriteSchema>;

export const KIND_ROUTE: Record<CallKind, { task: TaskId; difficulty: "simple" | "standard" | "complex"; input: number; output: number }> = {
  write_page: { task: "copywriting", difficulty: "complex", input: 9000, output: 2500 },
  write_article: { task: "blog_writing", difficulty: "complex", input: 9000, output: 4000 },
  write_meta: { task: "copywriting", difficulty: "simple", input: 4000, output: 400 },
  review: { task: "quality_control", difficulty: "standard", input: 7000, output: 900 },
  rewrite: { task: "copywriting", difficulty: "simple", input: 5000, output: 1200 },
};

export const writeKind = (type: ContentType): CallKind => (type === "blog_article" ? "write_article" : type === "metadata" ? "write_meta" : "write_page");

export function estimateCall(kind: CallKind): number {
  const k = KIND_ROUTE[kind];
  const r = routeFor(k.task);
  const p = priceFor(r.provider, r.model);
  if (!p || p.unit !== "tokens") return 0;
  const usd = (k.input * p.inputPerM + k.output * p.outputPerM) / 1e6;
  return Math.round(usd * 1.2 * usdToEur() * getJsonSetting<number>("billing.markup", 1) * EUR);
}

const measured = (key: string) => one<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE usage_key = ?", key)?.c ?? 0;

export function realSeoDeps(ctx: JobContext | null, p: Project, aiActive: boolean): SeoV2Deps {
  const base = { userId: p.userId, projectId: p.id, jobId: ctx?.job.id ?? null };
  const ai = aiActive && llmConfigured();
  return {
    canWrite: ai,
    canReview: ai,
    async write(system, prompt, key, kind) {
      const k = KIND_ROUTE[kind];
      const value = await llmJson({ task: k.task, ...base, usageKey: key, promptKey: `seo-v2-${kind}`, routing: { difficulty: k.difficulty }, system, context: brainView(p, "seo").stable, prompt, maxTokens: kind === "write_article" ? 6000 : 3500 }, AiDraftSchema);
      return { value: value as AiDraft, costMicro: measured(key) };
    },
    async review(prompt, key) {
      const k = KIND_ROUTE.review;
      const value = await llmJson({ task: k.task, ...base, usageKey: key, promptKey: "seo-v2-review", routing: { difficulty: k.difficulty }, system: REVIEW_SYSTEM, context: brainView(p, "qc").stable, prompt, maxTokens: 1500 }, EditorialReviewSchema);
      return { value: value as EditorialReview, costMicro: measured(key) };
    },
    async rewrite(system, prompt, key) {
      const k = KIND_ROUTE.rewrite;
      const value = await llmJson({ task: k.task, ...base, usageKey: key, promptKey: "seo-v2-rewrite", routing: { difficulty: k.difficulty }, system, context: brainView(p, "seo").stable, prompt, maxTokens: 2000 }, RewriteSchema);
      return { value: value as RewriteOut, costMicro: measured(key) };
    },
    estimate: estimateCall,
  };
}

/** Outils sans IA (forfait Découverte, IA coupée) : tout reste local et gratuit. */
export const localOnlyDeps = (): SeoV2Deps => ({
  canWrite: false,
  canReview: false,
  write: async () => {
    throw new Error("IA indisponible");
  },
  review: async () => {
    throw new Error("IA indisponible");
  },
  rewrite: async () => {
    throw new Error("IA indisponible");
  },
  estimate: () => 0,
});
