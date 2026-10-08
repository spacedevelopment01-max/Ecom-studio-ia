import { handle, ok } from "@/lib/http";
import { all, json } from "@/lib/db";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import type { AdDocument } from "@/lib/ad-doc/types";

export const runtime = "nodejs";

/** Créations éditables du projet (dernière version de chaque lignée), avec leur titre et « modifiée par vous ». */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const rows = all<{ doc_key: string; version: number; source: string; rendered_asset_id: string | null; created_at: number; doc_json: string; edited: number }>(
    `SELECT d.doc_key, d.version, d.source, d.rendered_asset_id, d.created_at, d.doc_json,
            (SELECT COUNT(*) FROM ad_documents u WHERE u.project_id = d.project_id AND u.doc_key = d.doc_key AND u.source <> 'engine') edited
       FROM ad_documents d JOIN (SELECT doc_key, MAX(version) v FROM ad_documents WHERE project_id = ? GROUP BY doc_key) m ON m.doc_key = d.doc_key AND m.v = d.version
      WHERE d.project_id = ? ORDER BY d.created_at DESC LIMIT 100`,
    p.id,
    p.id,
  );
  return ok({
    docs: rows.map((r) => {
      const doc = json<Partial<AdDocument>>(r.doc_json, {});
      const title = (doc.layers ?? []).find((l) => l.role === "title" && "text" in l) as { text?: string } | undefined;
      return {
        docKey: r.doc_key,
        version: r.version,
        source: r.source,
        edited: r.edited > 0,
        aspect: doc.format?.aspect ?? null,
        platform: doc.format?.platform ?? null,
        width: doc.width ?? null,
        height: doc.height ?? null,
        title: title?.text ?? "",
        url: r.rendered_asset_id ? `/api/files/${r.rendered_asset_id}` : null,
        at: r.created_at,
      };
    }),
  });
});
