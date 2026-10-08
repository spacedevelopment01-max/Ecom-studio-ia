import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { L } from "@/lib/i18n-server";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { AdDocumentSchema, docImages, duplicateDoc, exportDoc, foreignAssets, latestDoc, listVersions, restoreVersion, saveAndRender, versionDoc } from "@/lib/ad-doc/store";
import { docMetrics } from "@/lib/ad-doc/server";
import { reflow } from "@/lib/ad-doc/reflow";
import { localAdEdit } from "@/lib/ad-doc/local-edit";
import { PLATFORM_SPECS } from "@/lib/ads-v2/platforms";
import type { AdDocument } from "@/lib/ad-doc/types";
import type { Platform } from "@/lib/ads-v2/types";
import { lintClaims } from "@/lib/ai/tasks";
import { adPolicyIssues } from "@/lib/engine/ad-craft";
import type { Project } from "@/lib/projects";

export const runtime = "nodejs";

type DocCtx = Ctx<{ id: string; docKey: string }>;

/** Signalements (jamais bloquants pour le client) : lisibilité, zones de sécurité, produit recouvert, affirmations. */
async function review(p: Project, doc: AdDocument) {
  const m = docMetrics(doc, await docImages(p.id, doc));
  const texts = doc.layers.filter((l) => (l.kind === "text" || l.kind === "button") && l.visible).map((l) => ({ id: l.id, text: (l as { text: string }).text }));
  const claims = texts.flatMap((t) => lintClaims({ text: t.text }, p).map((c) => ({ layerId: t.id, code: "unverified_claim", message: `« ${c.term} » (${c.label}) n'est pas confirmé` })));
  const policy = texts.flatMap((t) => adPolicyIssues([{ primary: t.text, headline: "" }], p).map((x) => ({ layerId: t.id, code: "policy", message: x.replace(/^(Annonce|Ad) 1\s*:\s*/, "") })));
  return { metrics: { minFontPx: m.minFontPx, textContrast: m.textContrast, textShare: m.textShare }, problems: [...m.problems, ...claims, ...policy] };
}

async function view(p: Project, docKey: string) {
  const cur = latestDoc(p.id, docKey);
  if (!cur) throw new HttpError(404, L("Création introuvable.", "Creative not found."));
  return { docKey, doc: cur.doc, version: cur.version, versions: listVersions(p.id, docKey), ...(await review(p, cur.doc)) };
}

export const GET = handle(async (req: Request, ctx: DocCtx) => {
  const { project: p } = await projectFromCtx(ctx as Ctx);
  const { docKey } = await ctx.params;
  const url = new URL(req.url);
  const format = url.searchParams.get("export");
  if (format) {
    // Export fidèle : même moteur de rendu que l'aperçu de l'éditeur. Aucun appel d'IA.
    if (!["png", "jpeg", "json"].includes(format)) throw new HttpError(400, L("Format d'export inconnu.", "Unknown export format."));
    const v = url.searchParams.get("version");
    const doc = v ? versionDoc(p.id, docKey, Number(v)) : latestDoc(p.id, docKey)?.doc;
    if (!doc) throw new HttpError(404, L("Création introuvable.", "Creative not found."));
    const out = await exportDoc(p.id, doc, format as "png" | "jpeg" | "json");
    return new Response(new Uint8Array(out.data), { headers: { "Content-Type": out.mime, "Content-Disposition": `attachment; filename="publicite-${doc.format.aspect.replace(":", "x")}.${out.ext}"` } });
  }
  return ok(await view(p, docKey));
});

export const POST = handle(async (req: Request, ctx: DocCtx) => {
  const { user, project: p } = await projectFromCtx(ctx as Ctx);
  const { docKey } = await ctx.params;
  const b = await body(
    req,
    z.object({
      action: z.enum(["save", "restore", "duplicate", "reflow", "edit"]),
      doc: AdDocumentSchema.optional(),
      version: z.number().int().min(1).optional(),
      note: z.string().max(200).optional(),
      platform: z.string().max(40).optional(),
      aspect: z.string().max(10).optional(),
      instruction: z.string().max(400).optional(),
    }),
  );
  if (!latestDoc(p.id, docKey)) throw new HttpError(404, L("Création introuvable.", "Creative not found."));
  if (b.action === "save") {
    if (!b.doc) throw new HttpError(400, L("Document manquant.", "Missing document."));
    const doc = { ...(b.doc as AdDocument), meta: { ...b.doc.meta, source: b.doc.meta.source === "engine" ? "user" : b.doc.meta.source } } as AdDocument;
    if (foreignAssets(p.id, doc).length) throw new HttpError(400, L("Une image ne vient pas de la bibliothèque de ce projet.", "An image does not come from this project's library."));
    await saveAndRender(p.id, user.id, docKey, doc, b.note ?? "modification manuelle");
    return ok(await view(p, docKey));
  }
  if (b.action === "restore") {
    if (!b.version) throw new HttpError(400, L("Version manquante.", "Missing version."));
    restoreVersion(p.id, docKey, b.version);
    const cur = latestDoc(p.id, docKey)!;
    await saveAndRender(p.id, user.id, docKey, cur.doc, `rendu de la restauration de la version ${b.version}`);
    return ok(await view(p, docKey));
  }
  if (b.action === "duplicate") {
    const d = duplicateDoc(p.id, docKey);
    return ok(await view(p, d.docKey));
  }
  if (b.action === "reflow") {
    // Autre format : nouvelle création (lignée dupliquée) ; textes, couleurs, images et calques ajoutés conservés.
    const platform = (b.platform ?? latestDoc(p.id, docKey)!.doc.format.platform ?? "meta_feed") as Platform;
    const spec = PLATFORM_SPECS[platform];
    const f = spec?.formats.find((x) => x.aspect === b.aspect) ?? (b.aspect === "16:9" ? { aspect: "16:9", width: 1920, height: 1080 } : b.aspect === "9:16" ? { aspect: "9:16", width: 1080, height: 1920 } : b.aspect === "4:5" ? { aspect: "4:5", width: 1080, height: 1350 } : b.aspect === "3:1" ? { aspect: "3:1", width: 2400, height: 800 } : b.aspect === "1:1" ? { aspect: "1:1", width: 1080, height: 1080 } : null);
    if (!f || !spec) throw new HttpError(400, L("Format inconnu.", "Unknown format."));
    const d = duplicateDoc(p.id, docKey);
    const src = latestDoc(p.id, d.docKey)!.doc;
    const next = reflow(src, { width: f.width, height: f.height, aspect: f.aspect, platform, safe: { top: Math.round(f.height * spec.safe.top), bottom: Math.round(f.height * spec.safe.bottom), side: Math.round(f.width * spec.safe.side) } });
    await saveAndRender(p.id, user.id, d.docKey, { ...next, meta: { ...next.meta, source: "user" } }, `adaptation au format ${f.aspect}`);
    return ok(await view(p, d.docKey));
  }
  // Retouche en langage naturel : locale et gratuite si possible ; sinon, demande payante ANNONCÉE (rien n'est lancé).
  if (!b.instruction?.trim()) throw new HttpError(400, L("Demande manquante.", "Missing request."));
  const cur = latestDoc(p.id, docKey)!;
  const r = localAdEdit(cur.doc, b.instruction);
  if (!r.local) return ok({ ...(await view(p, docKey)), edit: { local: false, reason: r.reason, paid: r.paid } });
  await saveAndRender(p.id, user.id, docKey, r.doc, `retouche locale : ${r.summary}`);
  return ok({ ...(await view(p, docKey)), edit: { local: true, summary: r.summary } });
});
