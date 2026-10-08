import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { L } from "@/lib/i18n-server";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import type { Project } from "@/lib/projects";
import { editContentV2, saveUserEdit } from "@/lib/seo-v2/engine";
import { verifiedFacts } from "@/lib/seo-v2/facts";
import { sitePages } from "@/lib/seo-v2/pages";
import { localContentChecks } from "@/lib/seo-v2/quality";
import { suggestLinks } from "@/lib/seo-v2/links";
import { auditDocs } from "@/lib/seo-v2/tech";
import { cmsTargets, exportBundle } from "@/lib/seo-v2/cms";
import { ContentDocSchema, normalizeIds, plainText, toHtml, toMarkdown, wordCount } from "@/lib/seo-v2/doc";
import { applyContentOps, ContentOpSchema } from "@/lib/seo-v2/ops";
import { contentVersionDoc, latestContent, listContentVersions, restoreContentVersion } from "@/lib/seo-v2/store";
import type { ContentDoc } from "@/lib/seo-v2/types";

export const runtime = "nodejs";
type DocCtx = Ctx<{ id: string; docKey: string }>;

/** Indicateurs SEO gratuits (jamais bloquants pour le client). */
function indicators(p: Project, doc: ContentDoc) {
  const pages = sitePages(p);
  const c = localContentChecks(doc, p, verifiedFacts(p), { pages });
  return { codes: c.codes, issues: c.issues, measures: { ...c.measures, words: wordCount(plainText(doc)) }, links: suggestLinks(doc, pages), audit: auditDocs([doc], pages) };
}

function view(p: Project, docKey: string) {
  const cur = latestContent(p.id, docKey);
  if (!cur) throw new HttpError(404, L("Contenu introuvable.", "Content not found."));
  return { docKey, doc: cur.doc, version: cur.version, versions: listContentVersions(p.id, docKey), html: toHtml(cur.doc), indicators: indicators(p, cur.doc), cms: cmsTargets(p) };
}

export const GET = handle(async (req: Request, ctx: DocCtx) => {
  const { project: p } = await projectFromCtx(ctx as Ctx);
  const { docKey } = await ctx.params;
  const url = new URL(req.url);
  const format = url.searchParams.get("export");
  if (format) {
    const v = url.searchParams.get("version");
    const doc = v ? contentVersionDoc(p.id, docKey, Number(v)) : latestContent(p.id, docKey)?.doc;
    if (!doc) throw new HttpError(404, L("Contenu introuvable.", "Content not found."));
    const name = doc.meta.slug || "contenu";
    if (format === "html") return new Response(toHtml(doc), { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.html"` } });
    if (format === "md") return new Response(toMarkdown(doc), { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.md"` } });
    if (format === "json") return new Response(JSON.stringify({ doc, files: exportBundle(doc) }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.json"` } });
    throw new HttpError(400, L("Format d'export inconnu.", "Unknown export format."));
  }
  return ok(view(p, docKey));
});

/** Enregistrement d'une modification manuelle : aucune IA ; une nouvelle version, rien n'est perdu. */
export const PUT = handle(async (req: Request, ctx: DocCtx) => {
  const { project: p } = await projectFromCtx(ctx as Ctx);
  const { docKey } = await ctx.params;
  if (!latestContent(p.id, docKey)) throw new HttpError(404, L("Contenu introuvable.", "Content not found."));
  const b = await body(req, z.object({ doc: ContentDocSchema, note: z.string().max(200).optional() }));
  saveUserEdit(p.id, docKey, normalizeIds(b.doc as ContentDoc), b.note ?? "modification du client");
  return ok(view(p, docKey));
});

/**
 * « ops » : opérations d'édition (gratuites). « edit » : retouche en conversation (locale si possible, sinon IA
 * limitée aux blocs visés). « restore » : restaure une version (copie, rien n'est perdu).
 */
export const POST = handle(async (req: Request, ctx: DocCtx) => {
  const { project: p } = await projectFromCtx(ctx as Ctx);
  const { docKey } = await ctx.params;
  const b = await body(
    req,
    z.discriminatedUnion("action", [
      z.object({ action: z.literal("ops"), ops: z.array(ContentOpSchema).min(1).max(50) }),
      z.object({ action: z.literal("edit"), request: z.string().min(2).max(600), selected: z.array(z.string().max(40)).max(50).optional() }),
      z.object({ action: z.literal("restore"), version: z.number().int().min(1) }),
    ]),
  );
  if (b.action === "restore") {
    restoreContentVersion(p.id, docKey, b.version);
    return ok(view(p, docKey));
  }
  const cur = latestContent(p.id, docKey);
  if (!cur) throw new HttpError(404, L("Contenu introuvable.", "Content not found."));
  if (b.action === "ops") {
    let next: ContentDoc;
    try {
      next = applyContentOps(cur.doc, b.ops);
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    saveUserEdit(p.id, docKey, next, "modification du client");
    return ok(view(p, docKey));
  }
  const r = await editContentV2(null, p.id, docKey, b.request, { selected: b.selected });
  return ok({ ...view(p, docKey), edit: { applied: r.applied, by: r.by, summary: r.summary, needsAi: !!r.needsAi, issues: r.issues } });
});
