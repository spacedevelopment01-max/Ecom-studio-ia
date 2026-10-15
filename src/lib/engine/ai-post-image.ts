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
import { designPostWithAi, realAiPostDeps, type AiPostDeps } from "../social-v2/ai-post";
import { aiPostEstimate, type PostBrief } from "../social-v2/deps";
import { serviceItems } from "./service-media";

export type AiPostImageRequest = { kind?: string; format?: string; headline?: string; subline?: string; cta?: string; serviceIndex?: number; photoId?: string };

/** Format de l'onglet Images → proportions acceptées par la publication IA. */
export const AI_POST_ASPECT: Record<string, "1:1" | "4:5" | "9:16" | "16:9"> = { square: "1:1", packshot: "1:1", portrait: "4:5", product: "4:5", pin: "4:5", story: "9:16", landscape: "16:9", banner: "16:9" };

/** Devis d'une publication par l'IA (micro-euros) : deux essais au plus (image + contrôle) et l'accroche. */
export const aiPostQuoteMicro = (): number => aiPostEstimate();

const SELL = new Set(["booking", "promo", "ad", "service"]);

/** Fiche de la publication à partir du formulaire (rien d'inventé : titre du client, sinon prestation ou produit). */
export function aiPostBrief(p: Project, req: AiPostImageRequest, id: string): PostBrief {
  const items = p.business === "services" ? serviceItems(p) : [];
  const s = req.kind === "service" && items.length ? items[Math.max(0, Math.min(items.length - 1, req.serviceIndex ?? 0))] : undefined;
  const title = (req.headline?.trim() || s?.name || p.brand?.tagline || p.product.name || p.name || "").slice(0, 120);
  return { id, network: "instagram", format: "image", title, caption: "", pillar: req.kind ?? null, objective: SELL.has(req.kind ?? "") ? "convert" : null, headline: req.headline?.trim() || title, scheduled_at: null };
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
  const reference = await referenceFor(p, req.photoId);
  if (p.business !== "services" && !reference) throw new UserFacingError(L("Importez d'abord une photo du produit : l'IA part de votre vrai produit, elle ne l'invente pas.", "Upload a product photo first: the AI starts from your real product, it never invents it."));
  ctx.progress(0.15, L("Publication conçue par l'IA (scène, mise en page, textes)", "Post designed by AI (scene, layout, texts)"));
  const base = deps ?? realAiPostDeps({ userId: p.userId, projectId: p.id, jobId: ctx.job.id });
  const r = await ctx.step("ai-post", () =>
    designPostWithAi(p, aiPostBrief(p, req, ctx.job.id), { aspect: AI_POST_ASPECT[req.format ?? "portrait"] ?? "4:5", maxCostEur: aiPostQuoteMicro() / 1e6, reference }, withClientTexts(base, req)),
  );
  if (!r.assetId) {
    const spent = (r.costMicro / 1e6).toFixed(2).replace(".", ",");
    throw new UserFacingError(`${r.note ?? C("publication IA non produite", "AI post not produced")} — ${L(`${spent} € utilisés ; les essais refusés restent dans Fichiers. Essayez « Image par l'IA, le studio fait le reste ».`, `€${spent} used; rejected attempts stay in Files. Try "AI image, the studio does the rest".`)}`);
  }
  return { assetId: r.assetId, costMicro: r.costMicro };
}
