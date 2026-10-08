import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { one } from "@/lib/db";
import { L } from "@/lib/i18n-server";
import { aiActiveFor } from "@/lib/ai/access";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { pickLang, runContentEngineV2 } from "@/lib/seo-v2/engine";
import { sitePages } from "@/lib/seo-v2/pages";
import { researchKeywords } from "@/lib/seo-v2/keywords";
import { seoStrategy } from "@/lib/seo-v2/strategy";
import { gateStrategy } from "@/lib/seo-v2/quality";
import { blogTopicsV2 } from "@/lib/seo-v2/blog";
import { cmsTargets } from "@/lib/seo-v2/cms";
import { latestContent, listContents } from "@/lib/seo-v2/store";
import { technicalAudit } from "@/lib/seo-v2/tech";
import { CONTENT_TYPES, LANGS } from "@/lib/seo-v2/types";

export const runtime = "nodejs";

/**
 * Stratégie SEO (gratuite, recalculée), contenus V2 du projet, sujets d'articles, plateformes et audit technique
 * local. Les mots-clés sont des HYPOTHÈSES sémantiques (aucun volume ni classement) : `dataNote` le dit.
 */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const lang = pickLang(new URL(req.url).searchParams.get("lang"));
  const pages = sitePages(p);
  const research = researchKeywords(p, lang, pages);
  const strategy = seoStrategy(p, lang, { pages, research });
  const contents = listContents(p.id);
  const docs = contents.map((c) => latestContent(p.id, c.docKey)?.doc).filter((d): d is NonNullable<typeof d> => !!d);
  return ok({
    lang,
    strategy,
    strategyGate: { verdict: gateStrategy(strategy, research.provider).verdict },
    cannibalization: research.cannibalization,
    opportunities: research.opportunities,
    pages,
    contents,
    topics: blogTopicsV2(p, strategy),
    cms: cmsTargets(p),
    audit: technicalAudit(p.id, docs, pages),
    ai: aiActiveFor(p.userId),
  });
});

/**
 * Rédaction d'un contenu. Sans IA (forfait Découverte, IA coupée) : rédaction locale immédiate, 0 €. Avec IA :
 * tâche de fond (rédaction contrôlée, relecture, barrière, plafond de coût).
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(
    req,
    z.object({
      type: z.enum(CONTENT_TYPES),
      pageKey: z.string().max(120).nullable().optional(),
      lang: z.enum(LANGS).optional(),
      request: z.string().max(600).nullable().optional(),
      keyword: z.string().max(200).nullable().optional(),
      force: z.boolean().optional(),
      maxCostEur: z.number().min(0).max(5).optional(),
    }),
  );
  const request = {
    type: b.type,
    pageKey: b.pageKey ?? null,
    lang: b.lang,
    request: b.request ?? null,
    keyword: b.keyword ? { term: b.keyword.toLowerCase(), intent: "informational" as const, source: "semantic_hypothesis" as const, metrics: null, basis: "choisi par le client" } : null,
    force: !!b.force,
    maxCostEur: b.maxCostEur,
  };
  if (!aiActiveFor(p.userId)) {
    const r = await runContentEngineV2(null, p.id, request);
    return ok({ docKey: r.docKey, verdict: r.verdict, by: r.by, skipped: r.skipped, notes: r.notes, issues: r.issues });
  }
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'content.v2' AND status IN ('queued','running','paused')", p.id)) throw new HttpError(409, L("Une rédaction est déjà en cours.", "Writing is already in progress."));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "content.v2", label: L("Rédaction SEO", "SEO writing"), payload: { projectId: p.id, request } });
  return ok({ jobId: job.id });
});
