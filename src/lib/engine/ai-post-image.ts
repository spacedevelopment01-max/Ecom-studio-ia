/**
 * Onglet Images, choix « Tout par l'IA, de A à Z » : la publication entière (scène, mise en page, titre, bouton) est
 * conçue par l'IA, avec le même moteur que les Publications (designPostWithAi : produit réel en référence, textes
 * relus lettre par lettre, aucune personne sans accord). Les textes saisis par le client sont écrits tels quels.
 * Coût maximal annoncé avant (aiPostEstimate) et plafond de la tâche identique.
 */
import { UserFacingError, type JobContext } from "../jobs";
import { getAsset } from "../library";
import { loadProject, type Project } from "../projects";
import { C, L } from "../i18n-server";
import { budgetPctText, retryNotice } from "../ai/budget-pct";
import { designPostWithAi, realAiPostDeps, type AiPostDeps } from "../social-v2/ai-post";
import { aiPostEstimate, type PostBrief } from "../social-v2/deps";
import { serviceItems } from "./service-media";
import { resolveSubject, type CreativeSubject } from "../creative-subject";

export type AiPostImageRequest = {
  kind?: string;
  format?: string;
  headline?: string;
  subline?: string;
  cta?: string;
  serviceIndex?: number;
  photoId?: string;
  /** Produit ou service choisi par le client (création guidée). */
  subject?: CreativeSubject;
  /** Demande libre du client (création guidée). */
  request?: string;
  /** Publicité (onglet Publicités) plutôt que publication. */
  as?: "post" | "ad";
};

/** Format de l'onglet Images → proportions acceptées par la publication IA. */
export const AI_POST_ASPECT: Record<string, "1:1" | "4:5" | "9:16" | "16:9"> = { square: "1:1", packshot: "1:1", portrait: "4:5", product: "4:5", pin: "4:5", story: "9:16", landscape: "16:9", banner: "16:9" };

/** PLAFOND d'une publication par l'IA (micro-euros) : trois essais au plus (image + contrôle) et l'accroche. Jamais montré comme prix : le devis est le coût probable (`aiPostProbableMicro`). */
export const aiPostCapMicro = (): number => aiPostEstimate();

const SELL = new Set(["booking", "promo", "ad", "service"]);

/** Fiche de la publication à partir du formulaire (rien d'inventé : titre du client, sinon prestation ou produit). */
export function aiPostBrief(p: Project, req: AiPostImageRequest, id: string): PostBrief {
  const items = p.business === "services" ? serviceItems(p) : [];
  const s = req.kind === "service" && items.length ? items[Math.max(0, Math.min(items.length - 1, req.serviceIndex ?? 0))] : undefined;
  const title = (req.headline?.trim() || s?.name || p.brand?.tagline || p.product.name || p.name || "").slice(0, 120);
  const subject = req.subject ? resolveSubject(p, req.subject) : null;
  const t = req.headline?.trim() ? title : (subject?.name ?? title).slice(0, 120);
  return { id, network: req.as === "ad" ? "meta" : "instagram", format: "image", title: t, caption: "", pillar: req.kind ?? null, objective: req.as === "ad" || SELL.has(req.kind ?? "") ? "convert" : null, headline: req.headline?.trim() || t, scheduled_at: null, subject: req.subject ?? null, request: req.request?.trim() || null };
}

/** Textes saisis par le client prioritaires sur ceux proposés par l'IA (écrits mot pour mot dans la publication). */
export function withClientTexts(deps: AiPostDeps, req: AiPostImageRequest): AiPostDeps {
  const head = req.headline?.trim();
  const sub = req.subline?.trim();
  const cta = req.cta?.trim();
  if (!head && !sub && !cta) return deps;
  return {
    ...deps,
    async copy(p, post, fallback, key, people) {
      const c = deps.copy ? await deps.copy(p, post, fallback, key, people).catch(() => null) : null;
      return { headline: head || c?.headline || fallback.headline, subline: sub || c?.subline || fallback.subline, cta: cta || c?.cta || fallback.cta, scene: c?.scene ?? "" };
    },
  };
}

/** Référence : l'image choisie par le client, sinon (produit) la photo du produit ; un service peut s'en passer. */
async function referenceFor(p: Project, photoId?: string): Promise<string | null> {
  if (photoId) {
    const a = getAsset(photoId);
    if (a && a.project_id === p.id && a.kind === "image" && !a.deleted_at) return a.id;
  }
  if (p.business === "services") return null;
  const { productReferences } = await import("../image-v2/engine");
  return productReferences(p.id)[0] ?? null;
}

export async function generateAiPostImage(ctx: JobContext, projectId: string, req: AiPostImageRequest, deps?: AiPostDeps) {
  const p = loadProject(projectId);
  const subject = req.subject ? resolveSubject(p, req.subject) : null;
  // Sujet choisi : sa photo (produit) ; service : aucune référence produit (la scène montre le métier, sans personne).
  const reference = subject ? (subject.kind === "service" ? await referenceFor({ ...p, business: "services" }, req.photoId) : subject.referenceAssetId) : await referenceFor(p, req.photoId);
  if (p.business !== "services" && subject?.kind !== "service" && !reference) throw new UserFacingError(L("Importez d'abord une photo du produit : l'IA part de votre vrai produit, elle ne l'invente pas.", "Upload a product photo first: the AI starts from your real product, it never invents it."));
  ctx.progress(0.15, L("Publication conçue par l'IA (scène, mise en page, textes)", "Post designed by AI (scene, layout, texts)"));
  const base = deps ?? realAiPostDeps({ userId: p.userId, projectId: p.id, jobId: ctx.job.id });
  const r = await ctx.step("ai-post", () =>
    designPostWithAi(p, aiPostBrief(p, req, ctx.job.id), { aspect: AI_POST_ASPECT[req.format ?? "portrait"] ?? (req.format && /^\d/.test(req.format) ? (req.format as "4:5") : "4:5"), maxCostEur: aiPostCapMicro() / 1e6, reference, subject, as: req.as ?? (req.cta?.trim() ? "ad" : undefined) }, withClientTexts(base, req)),
  );
  if (!r.assetId && req.as === "ad") {
    // Publicité refusée après 3 essais (fautes dans les textes…) : version du studio (scène par l'IA d'images, textes
    // et logo posés en calques, modifiables), dans le reste du budget déjà accepté.
    ctx.progress(0.7, L("Version du studio (textes posés en calques)", "Studio version (texts laid as layers)"));
    const left = Math.max(0, aiPostCapMicro() - r.costMicro) / 1e6;
    const { runAdEngineV2 } = await import("../ads-v2/engine");
    const aspect = AI_POST_ASPECT[req.format ?? ""] ?? (req.format as "4:5") ?? "4:5";
    const platform = aspect === "9:16" ? "meta_story" : aspect === "16:9" ? "linkedin" : "meta_feed";
    const ad = await ctx.step("ad-studio", () => runAdEngineV2(ctx, p.id, { count: 1, platforms: [platform], aspects: [aspect], maxCostEur: left }));
    const out = ad.outcomes.find((o) => o.assetId);
    if (out?.assetId) return { assetId: out.assetId, costMicro: r.costMicro + ad.costMicro, fallback: "studio" };
  }
  if (!r.assetId) {
    const spent = budgetPctText(p.userId, r.costMicro, p.id);
    throw new UserFacingError(`${r.note ?? C("publication IA non produite", "AI post not produced")} — ${L(`${spent} utilisé ; les essais refusés restent dans Fichiers. Essayez « Image par l'IA, le studio fait le reste ».`, `${spent} used; rejected attempts stay in Files. Try "AI image, the studio does the rest".`)}`);
  }
  // Reprise payée : annoncée au client (message de la tâche), en % du budget IA.
  const notice = retryNotice(p.userId, p.id, r.attempts ?? 1, r.costMicro);
  return { assetId: r.assetId, costMicro: r.costMicro, ...(notice ? { notice } : {}) };
}
