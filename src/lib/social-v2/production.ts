/**
 * NIVEAU 2 — PRODUCTION (progressive, par lots) : médias des publications choisies. Ordre de préférence :
 *  1. bibliothèque : un média validé, du bon type, le moins utilisé (gratuit, aucune image repayée) ;
 *  2. moteurs V2 sans dépense : Image V2 en recherche seule, Video V2 en montage local, rendu local à la marque ;
 *  3. génération payante (Image V2, Advertising V2, plans Video V2) SEULEMENT si le client l'a autorisée, dans
 *     le plafond du lot, après estimation (un appel qui dépasserait le budget n'est jamais envoyé).
 * Une publication modifiée par le client garde ses médias (jamais remplacés sans sa demande).
 */
import { all, json, now, run } from "../db";
import { addUsage, type Asset } from "../library";
import type { Project } from "../projects";
import { isAutoUsable } from "../quality/usable";
import { EUR } from "../billing";
import { afterEdit } from "./approval";
import type { MediaResult, PostBrief, SocialDeps } from "./deps";

export type ProduceMethod = "library" | "local" | "image_v2" | "ads_v2" | "video_v2" | "none";
export type EstimateLine = { postId: string; method: ProduceMethod; paid: boolean; estimateMicro: number };
export type ProductionEstimate = { posts: number; free: number; paid: number; estimateMicro: number; lines: EstimateLine[]; notes: string[] };

type Row = PostBrief & { project_id: string; media: string; status: string; user_edited: number; brief: string; engine: string };

const VIDEO_FORMATS = new Set(["video", "reel", "short"]);
const needsVideo = (r: Row) => VIDEO_FORMATS.has(r.format);
const PRODUCIBLE = new Set(["planned", "draft", "review", "approved", "failed"]);

/** Médias validés de la bibliothèque, du moins au plus utilisé (diversité, aucune image repayée). */
function libraryPool(projectId: string, kind: "image" | "video"): Asset[] {
  const rows = all<Asset & { uses: number }>(
    `SELECT a.*, (SELECT COUNT(*) FROM posts p WHERE p.project_id = a.project_id AND p.media LIKE '%' || a.id || '%' AND p.status != 'cancelled') uses
       FROM assets a WHERE a.project_id = ? AND a.kind = ? AND a.deleted_at IS NULL AND a.status != 'rejected'
        AND COALESCE(a.role, '') NOT IN ('logo','cutout','subtitles','video-poster','screenshot','favicon')
      ORDER BY uses ASC, a.created_at DESC LIMIT 60`,
    projectId,
    kind,
  );
  return rows.filter(isAutoUsable).filter((a) => a.uses < 3);
}

function pick(r: Row, opts: { allowPaid: boolean }, pools: { image: Asset[]; video: Asset[] }): { method: ProduceMethod; paid: boolean } {
  if (needsVideo(r)) return pools.video.length ? { method: "library", paid: false } : { method: "video_v2", paid: opts.allowPaid };
  if (r.objective === "convert" || r.objective === "sell") return { method: opts.allowPaid ? "ads_v2" : pools.image.length ? "library" : "local", paid: opts.allowPaid };
  if (pools.image.length) return { method: "library", paid: false };
  return opts.allowPaid ? { method: "image_v2", paid: true } : { method: "local", paid: false };
}

const selectRows = (projectId: string, ids: string[]) =>
  ids.length ? all<Row>(`SELECT * FROM posts WHERE project_id = ? AND id IN (${ids.map(() => "?").join(",")}) ORDER BY scheduled_at`, projectId, ...ids).map((r) => ({ ...r, headline: json<{ headline?: string }>(r.brief, {}).headline ?? r.title })) : [];

/** Estimation AVANT tout envoi : nombre de contenus, part gratuite, part payante et coût estimé. */
export function estimateProduction(p: Project, ids: string[], deps: Pick<SocialDeps, "estimate" | "aiActive">, opts: { allowPaid: boolean }): ProductionEstimate {
  const rows = selectRows(p.id, ids).filter((r) => PRODUCIBLE.has(r.status) && r.media === "[]");
  const pools = { image: libraryPool(p.id, "image"), video: libraryPool(p.id, "video") };
  const allowPaid = opts.allowPaid && deps.aiActive;
  const lines = rows.map((r) => {
    const m = pick(r, { allowPaid }, pools);
    const est = m.paid ? deps.estimate(m.method === "video_v2" ? "video" : m.method === "ads_v2" ? "ad" : "image") : 0;
    return { postId: r.id, method: m.method, paid: m.paid, estimateMicro: est };
  });
  const notes: string[] = [];
  if (opts.allowPaid && !deps.aiActive) notes.push("IA non disponible pour ce compte : production locale et bibliothèque seulement (0 €)");
  return { posts: lines.length, free: lines.filter((l) => !l.paid).length, paid: lines.filter((l) => l.paid).length, estimateMicro: lines.reduce((s, l) => s + l.estimateMicro, 0), lines, notes };
}

export type ProductionResult = { produced: number; skipped: number; failed: number; spentMicro: number; stoppedByCap: boolean; notes: string[]; byMethod: Record<string, number> };

/**
 * Production d'un lot. `approvedEstimateMicro` : estimation vue et acceptée par le client — une production
 * payante n'est lancée que si elle a été acceptée et seulement dans le plafond `maxCostEur`.
 */
export async function produceBatch(p: Project, ids: string[], deps: SocialDeps, o: { allowPaid: boolean; maxCostEur: number; approvedEstimateMicro?: number | null; batchSize?: number }): Promise<ProductionResult> {
  const cap = Math.round(o.maxCostEur * EUR);
  const allowPaid = o.allowPaid && deps.aiActive && o.approvedEstimateMicro != null && o.approvedEstimateMicro <= cap;
  const notes: string[] = [];
  if (o.allowPaid && !allowPaid) notes.push(deps.aiActive ? "estimation non acceptée ou au-delà du plafond : production gratuite seulement" : "IA non disponible : production gratuite seulement");
  const rows = selectRows(p.id, ids).filter((r) => PRODUCIBLE.has(r.status) && r.media === "[]").slice(0, o.batchSize ?? 30);
  const pools = { image: libraryPool(p.id, "image"), video: libraryPool(p.id, "video") };
  const used = new Map<string, number>();
  const res: ProductionResult = { produced: 0, skipped: 0, failed: 0, spentMicro: 0, stoppedByCap: false, notes, byMethod: {} };
  for (const r of rows) {
    const m = pick(r, { allowPaid }, pools);
    let out: MediaResult | null = null;
    try {
      if (m.method === "library") {
        const pool = needsVideo(r) ? pools.video : pools.image;
        const a = [...pool].sort((x, y) => (used.get(x.id) ?? 0) - (used.get(y.id) ?? 0))[0];
        out = a ? { assetId: a.id, costMicro: 0, by: "library" } : null;
      } else {
        const kind = m.method === "video_v2" ? "video" : m.method === "ads_v2" ? "ad" : "image";
        const est = m.paid ? deps.estimate(kind) : 0;
        if (m.paid && res.spentMicro + est > cap) {
          res.stoppedByCap = true;
          notes.push(`plafond atteint (${(cap / EUR).toFixed(2)} €) : production payante arrêtée, rendu local pour la suite`);
          out = await deps.local(p, r);
        } else {
          const opts = { allowPaid: m.paid, maxCostEur: Math.max(0, (cap - res.spentMicro) / EUR) };
          out = m.method === "video_v2" ? await deps.video(p, r, opts) : m.method === "ads_v2" ? await deps.ad(p, r, opts) : m.method === "image_v2" ? await deps.image(p, r, opts) : await deps.local(p, r);
          // Rien d'exploitable du moteur : rendu local (vidéo : la publication attend une vidéo).
          if (!out?.assetId && m.method !== "video_v2") out = await deps.local(p, r);
        }
      }
    } catch (e) {
      notes.push(`publication ${r.id.slice(0, 6)} : ${(e as Error).message.slice(0, 120)}`);
      res.failed++;
      continue;
    }
    res.spentMicro += out?.costMicro ?? 0;
    if (!out?.assetId) {
      res.skipped++;
      if (out?.note) notes.push(out.note);
      continue;
    }
    used.set(out.assetId, (used.get(out.assetId) ?? 0) + 1);
    run("UPDATE posts SET media = ?, production = ?, status = CASE WHEN status IN ('planned','draft','failed') THEN 'review' ELSE status END, updated_at = ? WHERE id = ? AND media = '[]'", JSON.stringify([out.assetId]), JSON.stringify({ by: out.by, costMicro: out.costMicro, at: now() }), now(), r.id);
    addUsage(out.assetId, "post", r.id, "Publication (Social V2)");
    // L'empreinte change (nouveau média) : une approbation antérieure ne couvre plus cette version.
    afterEdit(r.id);
    run("UPDATE posts SET user_edited = ? WHERE id = ?", r.user_edited, r.id);
    res.produced++;
    res.byMethod[out.by] = (res.byMethod[out.by] ?? 0) + 1;
  }
  return res;
}

export const postsOfPlan = (planId: string) => all<{ id: string }>("SELECT id FROM posts WHERE plan_id = ? ORDER BY scheduled_at", planId).map((r) => r.id);
export const nextPosts = (projectId: string, n: number) => all<{ id: string }>("SELECT id FROM posts WHERE project_id = ? AND engine = 'v2' AND status IN ('planned','review','approved') AND scheduled_at >= ? ORDER BY scheduled_at LIMIT ?", projectId, now(), n).map((r) => r.id);
