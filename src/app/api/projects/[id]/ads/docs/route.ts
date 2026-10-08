import { handle, ok } from "@/lib/http";
import { all } from "@/lib/db";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

export const runtime = "nodejs";

/** Créations éditables du projet (dernière version de chaque lignée). */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const rows = all<{ doc_key: string; version: number; source: string; rendered_asset_id: string | null; created_at: number; aspect: string; platform: string | null }>(
    `SELECT d.doc_key, d.version, d.source, d.rendered_asset_id, d.created_at, json_extract(d.doc_json, '$.format.aspect') aspect, json_extract(d.doc_json, '$.format.platform') platform
       FROM ad_documents d JOIN (SELECT doc_key, MAX(version) v FROM ad_documents WHERE project_id = ? GROUP BY doc_key) m ON m.doc_key = d.doc_key AND m.v = d.version
      WHERE d.project_id = ? ORDER BY d.created_at DESC LIMIT 100`,
    p.id,
    p.id,
  );
  return ok({ docs: rows.map((r) => ({ docKey: r.doc_key, version: r.version, source: r.source, aspect: r.aspect, platform: r.platform, url: r.rendered_asset_id ? `/api/files/${r.rendered_asset_id}` : null, at: r.created_at })) });
});
