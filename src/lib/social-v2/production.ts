/**
 * NIVEAU 2 — PRODUCTION (progressive, par lots) : médias des publications choisies. Ordre de préférence :
 *  1. bibliothèque : un média validé, du bon type, le moins utilisé (gratuit, aucune image repayée) ;
 *  2. moteurs V2 sans dépense : Image V2 en recherche seule, Video V2 en montage local, rendu local à la marque ;
 *  3. génération payante (Image V2, Advertising V2, plans Video V2) SEULEMENT si le client l'a autorisée, dans
 *     le plafond du lot, après estimation (un appel qui dépasserait le budget n'est jamais envoyé).
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

function pick(r: Row, opts: { allowPaid: boolean; ai?: boolean; bg?: boolean }, pools: { image: Asset[]; video: Asset[] }): { method: ProduceMethod; paid: boolean } {
  // Visuel demandé « entièrement par l'IA » (premières publications d'un projet, ou choix du client) : image créée
  // par l'IA d'images avec le vrai produit en référence, même si la bibliothèque a déjà des photos.
  if (opts.ai && opts.allowPaid && !needsVideo(r)) return { method: "ai_post", paid: true };
  // « Image de fond par l'IA, le studio fait le reste » choisi par le client : photo créée par l'IA (avec le vrai
  // produit), mise en page du studio — même si la bibliothèque a déjà des photos.
  if (opts.bg && opts.allowPaid && !needsVideo(r)) return { method: "image_v2", paid: true };
  if (needsVideo(r)) return pools.video.length ? { method: "library", paid: false } : { method: "video_v2", paid: opts.allowPaid };
  if (r.objective === "convert" || r.objective === "sell") return { method: opts.allowPaid && !pools.image.length ? "ads_v2" : "local", paid: opts.allowPaid && !pools.image.length };
  // Image : une affiche par publication, sur LA photo cherchée pour elle (Pixabay d'abord, gratuite ; « local »),
  // sinon une photo validée de la bibliothèque. L'IA d'images n'est utilisée que si elle est permise et acceptée.
  // Bibliothèque déjà fournie : aucune dépense (affiche gratuite sur une photo libre ou une photo validée).
  if (pools.image.length) return { method: "local", paid: false };
  return opts.allowPaid ? { method: "image_v2", paid: true } : { method: "local", paid: false };
}

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
  if (opts.allowPaid && !deps.aiActive) notes.push("IA non disponible pour ce compte : production locale et bibliothèque seulement (0 €)");
  return { posts: lines.length, free: lines.filter((l) => !l.paid).length, paid: lines.filter((l) => l.paid).length, estimateMicro: lines.reduce((s, l) => s + l.estimateMicro, 0), lines, notes };
}

export type ProductionResult = { produced: number; skipped: number; failed: number; spentMicro: number; stoppedByCap: boolean; notes: string[]; byMethod: Record<string, number> };

/**
 * Production d'un lot. `approvedEstimateMicro` : estimation vue et acceptée par le client — une production
 * payante n'est lancée que si elle a été acceptée et seulement dans le plafond `maxCostEur`.
 */
/**
 * Photos de fond déjà prises pour les affiches d'un calendrier (de la moins à la plus utilisée) : quand le client a
 * choisi un nombre d'images différentes, les publications suivantes les reprennent (autre texte, autre mise en page).
 */
function planBackgrounds(planId: string | null): { asset: Asset; uses: number }[] {
  if (!planId) return [];
  const rows = all<{ bg: string; uses: number }>(
    `SELECT json_extract(a.meta, '$.poster.backgroundAssetId') bg, COUNT(*) uses FROM assets a
      WHERE a.project_id = (SELECT project_id FROM posts WHERE plan_id = ? LIMIT 1) AND a.role = 'social' AND a.deleted_at IS NULL AND json_extract(a.meta, '$.poster.backgroundAssetId') IS NOT NULL
        AND json_extract(a.meta, '$.post') IN (SELECT id FROM posts WHERE plan_id = ?)
      GROUP BY bg ORDER BY uses ASC`,
    planId,
    planId,
  );
  return rows.map((r) => ({ asset: getAsset(r.bg)!, uses: r.uses })).filter((x) => x.asset && !x.asset.deleted_at);
}

export async function produceBatch(p: Project, ids: string[], deps: SocialDeps, o: { allowPaid: boolean; maxCostEur: number; approvedEstimateMicro?: number | null; batchSize?: number; /** Nombre d'images différentes voulu pour les publications du calendrier (vide : une par publication). */ distinctImages?: number | null; /** Les N premières publications en image : visuel entièrement créé par l'IA (payant, dans le plafond). */ aiImages?: number | null; /** Image de fond par l'IA, mise en page du studio (payant, dans le plafond). */ aiBackground?: boolean; /** Remplacer le visuel déjà posé (l'ancien reste dans la bibliothèque). */ replace?: boolean; /** Image de la banque choisie par le client comme fond des publications en image (gratuit). */ background?: Asset | null }): Promise<ProductionResult> {
  const cap = Math.round(o.maxCostEur * EUR);
  const allowPaid = o.allowPaid && deps.aiActive && o.approvedEstimateMicro != null && o.approvedEstimateMicro <= cap;
  const notes: string[] = [];
  if (o.allowPaid && !allowPaid) notes.push(deps.aiActive ? "estimation non acceptée ou au-delà du plafond : production gratuite seulement" : "IA non disponible : production gratuite seulement");
  const rows = selectRows(p.id, ids).filter((r) => PRODUCIBLE.has(r.status) && (o.replace || r.media === "[]")).slice(0, o.batchSize ?? 30);
  const pools = { image: libraryPool(p.id, "image"), video: libraryPool(p.id, "video") };
  const used = new Map<string, number>();
  const aiIds = aiImageIds(rows, o.aiImages);
  const res: ProductionResult = { produced: 0, skipped: 0, failed: 0, spentMicro: 0, stoppedByCap: false, notes, byMethod: {} };
  for (const r of rows) {
    let m = pick(r, { allowPaid: allowPaid && (!o.aiImages || aiIds.has(r.id)), ai: aiIds.has(r.id), bg: o.aiBackground }, pools);
    let out: MediaResult | null = null;
    // Nombre d'images différentes atteint pour ce calendrier : on reprend l'une d'elles (gratuit), sans nouvelle photo.
    const bgs = o.distinctImages && !needsVideo(r) ? planBackgrounds(r.plan_id) : [];
    const reuse = o.distinctImages && bgs.length >= o.distinctImages ? bgs.slice(0, o.distinctImages).sort((a, b) => a.uses - b.uses)[0].asset : null;
    if (reuse && !aiIds.has(r.id) && !(o.aiBackground && allowPaid)) m = { method: "local", paid: false };
    try {
      if (o.background && !needsVideo(r) && !aiIds.has(r.id) && !(o.aiBackground && allowPaid)) {
        // Une image choisie par le client dans sa banque : affiche à la marque posée dessus (gratuit).
        out = await deps.local(p, r, { background: o.background });
      } else if (reuse && !aiIds.has(r.id) && !(o.aiBackground && allowPaid)) {
        out = await deps.local(p, r, { background: reuse });
      } else if (m.method === "library") {
        const pool = needsVideo(r) ? pools.video : pools.image;
        const a = [...pool].sort((x, y) => (used.get(x.id) ?? 0) - (used.get(y.id) ?? 0))[0];
        out = a ? { assetId: a.id, costMicro: 0, by: "library" } : null;
      } else {
        const kind = m.method === "video_v2" ? "video" : m.method === "ads_v2" ? "ad" : m.method === "ai_post" ? "ai_post" : "image";
        const est = m.paid ? deps.estimate(kind) : 0;
        if (m.paid && res.spentMicro + est > cap) {
          res.stoppedByCap = true;
          notes.push(`plafond atteint (${(cap / EUR).toFixed(2)} €) : production payante arrêtée, rendu local pour la suite`);
          out = await deps.local(p, r);
        } else {
          const opts = { allowPaid: m.paid, maxCostEur: Math.max(0, (cap - res.spentMicro) / EUR) };
          out = m.method === "video_v2" ? await deps.video(p, r, opts) : m.method === "ads_v2" ? await deps.ad(p, r, opts) : m.method === "image_v2" ? await deps.image(p, r, opts) : m.method === "ai_post" ? await (deps.aiPost ?? deps.image)(p, r, opts) : await deps.local(p, r);
          // Rien d'exploitable du moteur : rendu local (vidéo : la publication attend une vidéo). Ce qui a été payé
          // pour l'essai refusé reste compté (jamais une dépense cachée).
          if (!out?.assetId && m.method !== "video_v2") {
            const paidForNothing = out?.costMicro ?? 0;
            if (out?.note) notes.push(out.note);
            // Visuel tout par l'IA refusé après ses essais : version du studio, de préférence sur une scène créée par
            // l'IA d'images (le vrai produit, sans texte dessiné) si le plafond le permet ; sinon rendu local.
            const left = cap - res.spentMicro - paidForNothing;
            if (m.method === "ai_post" && deps.aiPost && m.paid && left >= deps.estimate("image")) {
              const again = await deps.image(p, r, { allowPaid: true, maxCostEur: left / EUR }).catch((e) => {
                if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
                return null;
              });
              if (again?.assetId) out = { ...again, costMicro: again.costMicro + paidForNothing };
              else {
                out = await deps.local(p, r);
                if (out) out = { ...out, costMicro: (out.costMicro ?? 0) + paidForNothing + (again?.costMicro ?? 0) };
              }
            } else {
              out = await deps.local(p, r);
              if (out) out = { ...out, costMicro: (out.costMicro ?? 0) + paidForNothing };
            }
          }
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
    run("UPDATE posts SET media = ?, production = ?, status = CASE WHEN status IN ('planned','draft','failed') THEN 'review' ELSE status END, updated_at = ? WHERE id = ? AND (media = '[]' OR ?)", JSON.stringify([out.assetId]), JSON.stringify({ by: out.by, costMicro: out.costMicro, at: now() }), now(), r.id, o.replace ? 1 : 0);
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
