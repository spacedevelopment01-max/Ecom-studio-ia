/**
 * NIVEAU 2 — PRODUCTION (progressive, par lots) : médias des publications choisies.
 *  - IMAGES (règle du propriétaire, guide du moteur d'images) : toute image de publication est CRÉÉE par l'IA
 *    (« ai_post » : composition, décor, lumière, textes exacts, logo du projet en référence, contrôle). Jamais un
 *    gabarit, une affiche montée par le studio ni une photo de banque avec un texte posé. IA indisponible, estimation
 *    non acceptée, budget atteint ou essais refusés : la publication ATTEND son visuel et c'est dit (« none » + note),
 *    jamais de bascule silencieuse. Une image finale déjà créée par l'IA pour le projet peut être reprise (bibliothèque).
 *  - VIDÉOS : bibliothèque, puis Video V2 (règles du moteur vidéo inchangées).
 *  Génération payante SEULEMENT si le client l'a autorisée, dans le plafond du lot, après estimation.
 * Une publication modifiée par le client garde ses médias (jamais remplacés sans sa demande).
 */
import { all, json, now, run } from "../db";
import { addUsage, getAsset, type Asset } from "../library";
import type { Project } from "../projects";
import { isAutoUsable } from "../quality/usable";
import { EUR } from "../billing";
import { afterEdit } from "./approval";
import { JobCancelled, JobPaused } from "../jobs";
import type { MediaResult, PostBrief, SocialDeps } from "./deps";
import { setVisualNote } from "./plan-visuals";

export type ProduceMethod = "library" | "local" | "image_v2" | "ads_v2" | "video_v2" | "ai_post" | "none";
export type EstimateLine = { postId: string; method: ProduceMethod; paid: boolean; estimateMicro: number };
export type ProductionEstimate = { posts: number; free: number; paid: number; estimateMicro: number; lines: EstimateLine[]; notes: string[] };

type Row = PostBrief & { project_id: string; plan_id: string | null; media: string; status: string; user_edited: number; brief: string; engine: string };

const VIDEO_FORMATS = new Set(["video", "reel", "short"]);
const needsVideo = (r: Row) => VIDEO_FORMATS.has(r.format);
const PRODUCIBLE = new Set(["planned", "draft", "review", "approved", "failed"]);

/** Médias validés de la bibliothèque, du moins au plus utilisé (diversité, aucune image repayée). */
function libraryPool(projectId: string, kind: "image" | "video"): Asset[] {
  const rows = all<Asset & { uses: number }>(
    `SELECT a.*, (SELECT COUNT(*) FROM posts p WHERE p.project_id = a.project_id AND p.media LIKE '%' || a.id || '%' AND p.status != 'cancelled') uses
       FROM assets a WHERE a.project_id = ? AND a.kind = ? AND a.deleted_at IS NULL AND a.status != 'rejected'
        AND COALESCE(a.role, '') NOT IN ('logo','cutout','subtitles','video-poster','screenshot','favicon','ad')
        -- Visuels publicitaires (Publicités) : jamais repris pour une publication organique.
        AND NOT (a.kind = 'video' AND (COALESCE(json_extract(a.meta, '$.videoV2.intent'), '') IN ('video_ad','ugc') OR COALESCE(json_extract(a.meta, '$.kind'), '') = 'ugc'))
        -- Banque du thème (images libres de droits, vidéos du site) : jamais reprise dans une publication.
        AND json_extract(a.meta, '$.bank') IS NULL AND NOT (a.kind = 'image' AND json_extract(a.meta, '$.stock') IS NOT NULL)
      ORDER BY uses ASC, a.created_at DESC LIMIT 60`,
    projectId,
    kind,
  );
  return rows.filter(isAutoUsable).filter((a) => a.uses < 3);
}

/** Image finale déjà créée par l'IA pour ce projet (publication IA validée) : seule image reprenable telle quelle. */
const aiFinal = (a: Asset) => {
  const m = json<{ aiPost?: unknown; finalImage?: unknown }>(a.meta, {});
  return a.origin === "generated" && (!!m.aiPost || !!m.finalImage);
};

function pick(r: Row, opts: { allowPaid: boolean; ai?: boolean; bg?: boolean }, pools: { image: Asset[]; video: Asset[] }): { method: ProduceMethod; paid: boolean } {
  if (needsVideo(r)) return pools.video.length ? { method: "library", paid: false } : { method: "video_v2", paid: opts.allowPaid };
  // Image : toujours créée par l'IA (publication complète) ; sinon une image IA déjà validée du projet ; sinon rien.
  if (opts.allowPaid) return { method: "ai_post", paid: true };
  if (pools.image.some(aiFinal)) return { method: "library", paid: false };
  return { method: "none", paid: false };
}

/** Pourquoi une publication attend son visuel (affiché au client, jamais remplacé par un gabarit). */
const WAITING_AI = "visuel en attente : les images des publications sont créées par l'IA (IA indisponible, estimation non acceptée ou budget atteint) — aucun gabarit à la place";

const selectRows = (projectId: string, ids: string[]) =>
  ids.length
    ? all<Row>(`SELECT * FROM posts WHERE project_id = ? AND id IN (${ids.map(() => "?").join(",")}) ORDER BY scheduled_at`, projectId, ...ids).map((r) => {
        const b = json<{ headline?: string; subject?: PostBrief["subject"]; request?: string }>(r.brief, {});
        return { ...r, headline: b.headline ?? r.title, subject: b.subject ?? null, request: b.request ?? null };
      })
    : [];

/** Les `n` premières publications en image (dans l'ordre du calendrier) : celles dont le visuel est fait par l'IA. */
export function aiImageIds(rows: { id: string; format: string }[], n: number | null | undefined): Set<string> {
  return new Set(n ? rows.filter((r) => !VIDEO_FORMATS.has(r.format)).slice(0, n).map((r) => r.id) : []);
}

/** Estimation AVANT tout envoi : nombre de contenus, part gratuite, part payante et coût estimé. */
export function estimateProduction(p: Project, ids: string[], deps: Pick<SocialDeps, "estimate" | "aiActive">, opts: { allowPaid: boolean; aiImages?: number | null; aiBackground?: boolean; replace?: boolean }): ProductionEstimate {
  const rows = selectRows(p.id, ids).filter((r) => PRODUCIBLE.has(r.status) && (opts.replace || r.media === "[]"));
  const pools = { image: libraryPool(p.id, "image"), video: libraryPool(p.id, "video") };
  const allowPaid = opts.allowPaid && deps.aiActive;
  const aiIds = aiImageIds(rows, opts.aiImages);
  const lines = rows.map((r) => {
    // Visuels IA demandés pour N publications : seules celles-là sont payantes, les autres restent gratuites.
    const m = pick(r, { allowPaid: allowPaid && (!opts.aiImages || aiIds.has(r.id)), ai: aiIds.has(r.id), bg: opts.aiBackground }, pools);
    const est = m.paid ? deps.estimate(m.method === "video_v2" ? "video" : m.method === "ads_v2" ? "ad" : m.method === "ai_post" ? "ai_post" : "image") : 0;
    return { postId: r.id, method: m.method, paid: m.paid, estimateMicro: est };
  });
  const notes: string[] = [];
  if (!deps.aiActive) notes.push("IA non disponible pour ce compte : aucune image de publication ne peut être créée (elles sont toutes faites par l'IA) ; seules les images IA déjà validées du projet peuvent être reprises");
  return { posts: lines.length, free: lines.filter((l) => !l.paid).length, paid: lines.filter((l) => l.paid).length, estimateMicro: lines.reduce((s, l) => s + l.estimateMicro, 0), lines, notes };
}

export type ProductionResult = { produced: number; skipped: number; failed: number; spentMicro: number; stoppedByCap: boolean; notes: string[]; byMethod: Record<string, number> };

/**
 * Production d'un lot. `approvedEstimateMicro` : estimation vue et acceptée par le client — une production
 * payante n'est lancée que si elle a été acceptée et seulement dans le plafond `maxCostEur`.
 */
export async function produceBatch(p: Project, ids: string[], deps: SocialDeps, o: { allowPaid: boolean; maxCostEur: number; approvedEstimateMicro?: number | null; batchSize?: number; /** Nombre d'images différentes voulu pour les publications du calendrier (vide : une par publication). */ distinctImages?: number | null; /** Les N premières publications en image : visuel entièrement créé par l'IA (payant, dans le plafond). */ aiImages?: number | null; /** Image de fond par l'IA, mise en page du studio (payant, dans le plafond). */ aiBackground?: boolean; /** Remplacer le visuel déjà posé (l'ancien reste dans la bibliothèque). */ replace?: boolean; /** Image de la banque choisie par le client comme fond des publications en image (gratuit). */ background?: Asset | null; /** Suivi visible : une publication à la fois (tâche de fond). */ progress?: (done: number, total: number) => void; /** Message d'attente posé sur chaque publication restée sans visuel (calendrier). */ markWaiting?: boolean }): Promise<ProductionResult> {
  const cap = Math.round(o.maxCostEur * EUR);
  const allowPaid = o.allowPaid && deps.aiActive && o.approvedEstimateMicro != null && o.approvedEstimateMicro <= cap;
  const notes: string[] = [];
  if (o.allowPaid && !allowPaid) notes.push(deps.aiActive ? "estimation non acceptée ou au-delà du plafond : les images attendent leur création par l'IA" : "IA non disponible : les images attendent leur création par l'IA (vidéos de la bibliothèque seulement)");
  const rows = selectRows(p.id, ids).filter((r) => PRODUCIBLE.has(r.status) && (o.replace || r.media === "[]")).slice(0, o.batchSize ?? 30);
  const pools = { image: libraryPool(p.id, "image"), video: libraryPool(p.id, "video") };
  const used = new Map<string, number>();
  const aiIds = aiImageIds(rows, o.aiImages);
  const res: ProductionResult = { produced: 0, skipped: 0, failed: 0, spentMicro: 0, stoppedByCap: false, notes, byMethod: {} };
  let done = 0;
  const mark = (pid: string, video: boolean, detail: string | null) => o.markWaiting && setVisualNote(pid, allowPaid ? "ai_failed" : video ? "video_failed" : "bank_empty", detail);
  for (const r of rows) {
    o.progress?.(done++, rows.length);
    const m = pick(r, { allowPaid: allowPaid && (!o.aiImages || aiIds.has(r.id)), ai: aiIds.has(r.id), bg: o.aiBackground }, pools);
    let out: MediaResult | null = null;
    try {
      if (m.method === "none") {
        out = { assetId: null, costMicro: 0, by: "local", note: `publication ${r.id.slice(0, 6)} : ${WAITING_AI}` };
      } else if (m.method === "library") {
        const pool = needsVideo(r) ? pools.video : pools.image.filter(aiFinal);
        const a = [...pool].sort((x, y) => (used.get(x.id) ?? 0) - (used.get(y.id) ?? 0))[0];
        out = a ? { assetId: a.id, costMicro: 0, by: "library" } : null;
      } else {
        const kind = m.method === "video_v2" ? "video" : m.method === "ads_v2" ? "ad" : m.method === "ai_post" ? "ai_post" : "image";
        const est = m.paid ? deps.estimate(kind) : 0;
        if (m.paid && res.spentMicro + est > cap) {
          res.stoppedByCap = true;
          notes.push(`plafond atteint (${(cap / EUR).toFixed(2)} €) : production arrêtée, les publications suivantes attendent leur visuel IA (aucun gabarit à la place)`);
          out = null;
        } else {
          const opts = { allowPaid: m.paid, maxCostEur: Math.max(0, (cap - res.spentMicro) / EUR) };
          // Image : publication entièrement créée par l'IA (jamais une affiche montée par le studio).
          out = m.method === "video_v2" ? await deps.video(p, r, opts) : deps.aiPost ? await deps.aiPost(p, r, opts) : null;
          // Rien d'exploitable : visuel IA refusé après ses essais (ou blocage). Ce qui a été payé reste compté ; la
          // publication attend son visuel, dit clairement — aucun gabarit ni rendu local à la place.
          if (!out?.assetId && m.method !== "video_v2") {
            notes.push(`publication ${r.id.slice(0, 6)} : visuel IA non validé par le contrôle, à refaire (aucun gabarit à la place)`);
          }
        }
      }
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      notes.push(`publication ${r.id.slice(0, 6)} : ${(e as Error).message.slice(0, 120)}`);
      mark(r.id, needsVideo(r), (e as Error).message.slice(0, 160));
      res.failed++;
      continue;
    }
    res.spentMicro += out?.costMicro ?? 0;
    if (!out?.assetId) {
      res.skipped++;
      if (out?.note) notes.push(out.note);
      mark(r.id, needsVideo(r), res.stoppedByCap ? "plafond de dépense atteint" : out?.note?.slice(0, 160) ?? null);
      continue;
    }
    if (o.markWaiting) setVisualNote(r.id, null);
    used.set(out.assetId, (used.get(out.assetId) ?? 0) + 1);
    run("UPDATE posts SET media = ?, production = ?, status = CASE WHEN status IN ('planned','draft','failed') THEN 'review' ELSE status END, updated_at = ? WHERE id = ? AND (media = '[]' OR ?)", JSON.stringify([out.assetId]), JSON.stringify({ by: out.by, costMicro: out.costMicro, at: now() }), now(), r.id, o.replace ? 1 : 0);
    addUsage(out.assetId, "post", r.id, "Publication (Social V2)");
    // L'empreinte change (nouveau média) : une approbation antérieure ne couvre plus cette version.
    afterEdit(r.id);
    run("UPDATE posts SET user_edited = ? WHERE id = ?", r.user_edited, r.id);
    res.produced++;
    res.byMethod[out.by] = (res.byMethod[out.by] ?? 0) + 1;
  }
  o.progress?.(rows.length, rows.length);
  return res;
}

export const postsOfPlan = (planId: string) => all<{ id: string }>("SELECT id FROM posts WHERE plan_id = ? ORDER BY scheduled_at", planId).map((r) => r.id);
export const nextPosts = (projectId: string, n: number) => all<{ id: string }>("SELECT id FROM posts WHERE project_id = ? AND engine = 'v2' AND status IN ('planned','review','approved') AND scheduled_at >= ? ORDER BY scheduled_at LIMIT ?", projectId, now(), n).map((r) => r.id);
