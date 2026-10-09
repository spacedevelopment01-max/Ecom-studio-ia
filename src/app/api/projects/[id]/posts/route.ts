import { z } from "zod";
import { all, id, now, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { getAsset, addUsage } from "@/lib/library";
import { postView } from "@/lib/posts";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";
import { contentHash } from "@/lib/social-v2/approval";


export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const u = new URL(req.url).searchParams;
  const from = Number(u.get("from") ?? 0);
  const to = Number(u.get("to") ?? 8.64e15);
  const rows = all<any>("SELECT p.*, c.name AS connection_name FROM posts p LEFT JOIN connections c ON c.id = p.connection_id WHERE p.project_id = ? AND (p.scheduled_at IS NULL OR (p.scheduled_at >= ? AND p.scheduled_at < ?)) ORDER BY COALESCE(p.scheduled_at, p.created_at) ASC LIMIT 600", p.id, from, to);
  return ok({ posts: rows.map(postView) });
});

/** Publication créée à la main ou depuis une campagne (texte, médias de la bibliothèque, date) : publication Social V2. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ network: z.enum(["instagram", "facebook", "tiktok", "youtube", "pinterest"]), format: z.enum(["image", "carousel", "video", "reel", "story", "short", "pin", "text"]), title: z.string().max(200).default(""), caption: z.string().max(5000).default(""), hashtags: z.string().max(500).default(""), media: z.array(z.string()).max(10).default([]), scheduledAt: z.number().nullable().optional(), connectionId: z.string().nullable().optional(), link: z.string().max(500).optional(), campaignId: z.string().optional() }));
  for (const m of b.media) if (getAsset(m)?.project_id !== p.id) throw new HttpError(400, L("Média étranger au projet.", "Media does not belong to this project."));
  const pid = id();
  // Publication Social V2 : à relire (statut « review »), approbation par version (empreinte), barrière avant toute
  // programmation ; écrite par le client (jamais réécrite automatiquement).
  const media = JSON.stringify(b.media);
  const hash = contentHash({ network: b.network, format: b.format, title: b.title, caption: b.caption, hashtags: b.hashtags, link: b.link ?? null, media });
  run(
    "INSERT INTO posts (id, project_id, connection_id, network, format, status, scheduled_at, timezone, title, caption, hashtags, link, media, campaign_id, publish_key, created_at, updated_at, engine, content_hash, user_edited) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    pid, p.id, b.connectionId ?? null, b.network, b.format, "review", b.scheduledAt ?? null, p.settings.timezone, b.title, b.caption, b.hashtags, b.link ?? null, media, b.campaignId ?? null, `manual:${pid}`, now(), now(), "v2", hash, 1,
  );
  for (const m of b.media) addUsage(m, "post", pid, L("Publication", "Post"));
  return ok({ id: pid });
});
