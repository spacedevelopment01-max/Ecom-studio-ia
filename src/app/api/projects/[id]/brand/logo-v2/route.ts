import { directionSeries, seriesRights, currentSeries } from "@/lib/logo-v2/direction-series";
import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { cancelJob, enqueue } from "@/lib/jobs";
import { all, json, one } from "@/lib/db";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";
import { recordLogoRouteRejection } from "@/lib/brain/rejections";
import { loadProject } from "@/lib/projects";
import { aiActiveFor } from "@/lib/ai/access";
import { LOGO_STYLES } from "@/lib/logo-v2/types";
import { artworkChoosable } from "@/lib/logo-v2/choose";
import { isLocked } from "@/lib/brain/brand-locks";
import { logoRedrawQuote, logoSeriesQuote } from "@/lib/logo-v2/quote";
import { logoJobStalled, readLive } from "@/lib/logo-v2/live";

/**
 * Dernière tâche de logo du projet (en cours, terminée ou ÉCHOUÉE) et avancement direction par direction : une
 * tâche qui échoue reste visible avec son erreur, jamais une barre qui disparaît.
 */
const LOGO_JOBS = "('brand.logo.v2','brand.logo.v2.choose','brand.logo.v2.redraw','brand.logo')";

function progressView(projectId: string) {
  const job = one<{ id: string; type: string; status: string; progress: number; message: string; error: string | null; created_at: number; updated_at: number; locked_until: number | null }>(
    "SELECT id, type, status, progress, message, error, created_at, updated_at, locked_until FROM jobs WHERE project_id = ? AND type IN ('brand.logo.v2','brand.logo.v2.redraw') ORDER BY created_at DESC, rowid DESC LIMIT 1",
    projectId,
  );
  const live = readLive(projectId);
  return { job: job ? { ...job, error: job.error ? job.error.slice(0, 600) : null, stalled: logoJobStalled(job) } : null, live: live && (!job || live.jobId === job.id) ? live : null };
}

export const runtime = "nodejs";

/**
 * Logo V2 : propositions de la dernière série (seulement celles qui ont passé la barrière), territoires, diagnostic.
 * Les essais écartés ne sont pas dans la galerie : seulement leur nombre et leurs raisons (diagnostic).
 */
function view(projectId: string) {
  const run = json<any>(one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'logo_v2_run'", projectId)?.value, null);
  const p = loadProject(projectId);
  // Slogan : écrit dans un logo seulement s'il est validé ; sinon c'est une proposition (jamais une info du client).
  const tagline = p.brand?.tagline?.trim() ? { text: p.brand.tagline.trim(), validated: isLocked(p.brand, "tagline") } : null;
  const series = directionSeries(projectId), rights = seriesRights(projectId);
  if (!run) return { series, rights, run: null, proposals: [], studio: [], discarded: [], applied: p.brand?.logo.proposalId ?? null, tagline, styles: LOGO_STYLES, ...progressView(projectId) };
  const rows = all<{ id: string; role: string; meta: string }>("SELECT id, role, meta FROM assets WHERE project_id = ? AND role IN ('logo-v2','logo-v2-studio','logo-v2-trial') AND json_extract(meta, '$.run') = ? AND deleted_at IS NULL ORDER BY created_at", projectId, run.runId);
  const originals = new Map(all<{ id: string; source_asset_id: string }>("SELECT id, source_asset_id FROM assets WHERE project_id = ? AND role = 'logo-v2-original' AND deleted_at IS NULL", projectId).map((o) => [o.source_asset_id, o.id] as const));
  const item = (r: { id: string; meta: string }) => {
    const m = json<any>(r.meta, {});
    const seriesManaged = series.some(s => s.requestKeys.includes(m.run));
    const t = m.territory ?? {};
    const art = m.artwork ?? null;
    return {
      id: r.id,
      seriesManaged,
      url: `/api/files/${r.id}`,
      territory: { name: t.name, concept: t.concept, why: t.whyItFits, markType: t.markType, composition: t.composition, typography: t.typography?.style, distinctive: t.distinctive, source: t.source, style: t.style ?? null, descriptor: t.descriptor ?? null },
      // Logo complet de l'IA d'images : original conservé (avant réécriture du nom), défauts relevés, choix possible.
      artwork: art ? { textCorrected: !!art.textCorrected, originalUrl: originals.has(r.id) ? `/api/files/${originals.get(r.id)}` : null, provider: art.provider ?? null, costMicro: typeof art.costMicro === "number" ? art.costMicro : null, fix: art.fix?.instruction ?? null, issues: art.issues ?? [], choosable: artworkChoosable(m), previous: m.previous ?? null } : null,
      font: m.spec?.family,
      score: typeof m.gate?.score === "number" ? Math.round(m.gate.score * 10) / 10 : null,
      verdict: m.gate?.verdict ?? null,
      reason: m.gate?.reason ?? "",
      attempts: m.gate?.attempts ?? 1,
      change: m.change ?? null,
    };
  };
  return {
    series, rights,
    run: { id: run.runId, at: run.at, ai: run.ai, art: run.art ?? null, style: run.style ?? "auto", stoppedByCostCap: !!run.stoppedByCostCap, best: run.best ?? null, territories: run.territories, rejected: run.rejected ?? [], failures: run.failures ?? [], notes: (run.notes ?? []).slice(0, 12) },
    ...progressView(projectId),
    tagline,
    styles: LOGO_STYLES,
    proposals: rows.filter((r) => r.role === "logo-v2").map(item).filter(r => !r.seriesManaged),
    // Versions du studio (contrôle local, sans relecture IA) : proposées à part, jamais présentées comme finales.
    studio: rows.filter((r) => r.role === "logo-v2-studio").map(item),
    // Proposition appliquée actuellement (création complète ou choix du client).
    applied: p.brand?.logo.engine === "v2" ? (p.brand?.logo.proposalId ?? null) : null,
    // Essais écartés par le contrôle : un logo complet garde son image ORIGINALE (toujours montrée, avec ses défauts) ;
    // un logo construit écarté reste au diagnostic sans image.
    discarded: rows.filter((r) => r.role === "logo-v2-trial").map((r) => { const it = item(r); return it.artwork ? it : { ...it, url: undefined }; }),
  };
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(view(p.id));
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ action: z.enum(["generate", "choose", "reject", "redraw", "quote", "stop"]), assetId: z.string().max(40).optional(), style: z.enum([...LOGO_STYLES, "auto"]).optional(), feedback: z.string().max(400).optional(), renew: z.boolean().optional() }));
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  // « Arrêter » : la création de logo en cours (ou bloquée, studio arrêté) est annulée ; l'onglet est libéré. Les images
  // déjà reçues restent enregistrées ; aucune dépense ne continue (le worker s'arrête à son prochain point d'avancement).
  if (b.action === "stop") {
    for (const j of all<{ id: string }>(`SELECT id FROM jobs WHERE project_id = ? AND type IN ${LOGO_JOBS} AND status IN ('queued','running','paused','blocked')`, p.id)) cancelJob(j.id);
    return ok(view(p.id));
  }
  if (one(`SELECT 1 FROM jobs WHERE project_id = ? AND type IN ${LOGO_JOBS} AND status IN ('queued','running','paused')`, p.id)) throw new HttpError(409, L("Une création de logo est déjà en cours : attendez qu'elle se termine, ou cliquez sur « Arrêter » sous la barre d'avancement.", "A logo task is already running: wait for it to finish, or click \"Stop\" under the progress bar."));
  if (b.action === "reject") {
    // Direction écartée par le client : refus mémorisé (le type de logo ne sera plus proposé).
    const meta = json<any>(one<{ meta: string }>("SELECT meta FROM assets WHERE id = ? AND project_id = ? AND role IN ('logo-v2','logo-v2-studio')", b.assetId ?? "", p.id)?.meta, null);
    if (!meta) throw new HttpError(404, L("Proposition introuvable.", "Proposal not found."));
    const mt = meta.territory?.markType;
    recordLogoRouteRejection(p.id, { name: meta.territory?.name, composition: mt === "emblem" ? "emblem" : mt === "wordmark" ? "wordmark" : undefined, markKind: mt === "monogram" || mt === "lettermark" ? "monogram" : mt === "symbol_wordmark" || mt === "abstract_mark" ? "ai-symbol" : undefined });
    return ok(view(p.id));
  }
  if (b.action === "quote") {
    // Devis AVANT tout appel payant : montant maximal de la série (ou d'une nouvelle version), qui sert aussi de plafond.
    const q = b.assetId ? logoRedrawQuote() : logoSeriesQuote();
    const ai = aiActiveFor(p.userId, p.id);
    const eur = (m: number | null | undefined) => (m == null ? null : Math.round((m / 1e6) * 100) / 100);
    return ok({ ai, quote: q ? { ...q, maxEur: eur(q.maxMicro), probableEur: eur(q.probableMicro), relayEur: eur(q.relayMicro) } : null });
  }
  if (b.action === "redraw") {
    // Nouvelle version d'un logo complet : une image payée, seulement à la demande du client (coût confirmé dans l'interface).
    const meta = json<any>(one<{ meta: string }>("SELECT meta FROM assets WHERE id = ? AND project_id = ? AND role IN ('logo-v2','logo-v2-trial') AND deleted_at IS NULL", b.assetId ?? "", p.id)?.meta, null);
    if (meta && directionSeries(p.id).some(s => s.requestKeys.includes(meta.run))) throw new HttpError(409, "Reprenez la série incomplète ou renouvelez une série complète, sans dessin isolé.");
    if (!meta?.artwork) throw new HttpError(404, L("Logo complet introuvable.", "Full logo not found."));
    if (!aiActiveFor(p.userId, p.id)) throw new HttpError(403, L("Une nouvelle version dessinée par l'IA demande un forfait avec IA.", "A new AI-drawn version needs a plan with AI."));
    if (!logoRedrawQuote()) throw new HttpError(409, "Modèle logo requis indisponible ou plafond inconnu : nouvelle version en attente, aucun appel lancé.");
    const job = enqueue({ userId: user.id, projectId: p.id, type: "brand.logo.v2.redraw", maxAttempts: 1, label: L("Logo : nouvelle version", "Logo: new version"), payload: { projectId: p.id, assetId: b.assetId, feedback: b.feedback ?? "", ...(logoRedrawQuote() ? { costCapMicro: logoRedrawQuote()!.maxMicro } : {}) } });
    return ok({ jobId: job.id, ...view(p.id) });
  }
  if (b.action === "choose") {
    const row = b.assetId ? one<{ role: string; meta: string }>("SELECT role, meta FROM assets WHERE id = ? AND project_id = ? AND role IN ('logo-v2','logo-v2-studio','logo-v2-trial') AND deleted_at IS NULL", b.assetId, p.id) : null;
    if (!row || (row.role === "logo-v2-trial" && !artworkChoosable(json<any>(row.meta, {})))) throw new HttpError(404, L("Proposition introuvable.", "Proposal not found."));
    const job = enqueue({ userId: user.id, projectId: p.id, type: "brand.logo.v2.choose", label: L("Logo choisi : déclinaisons et charte", "Chosen logo: variations and guidelines"), payload: { projectId: p.id, assetId: b.assetId } });
    return ok({ jobId: job.id, ...view(p.id) });
  }
  const rights = seriesRights(p.id);
  if ((!rights.partial || b.renew) && rights.used && !rights.canRenew) throw new HttpError(403, "Le droit de nouvelle série de votre forfait est utilisé. Vos directions sont conservées.");
  if (rights.partial && !b.renew && (!b.feedback || b.feedback.trim().length < 8)) throw new HttpError(409, "Précisez la correction avant la reprise des directions manquantes.");
  const previous = currentSeries(p.id);
  const job = enqueue({ userId: user.id, projectId: p.id, type: "brand.logo.v2", idempotencyKey: `direction-series:${p.id}:${previous?.id ?? "initial"}:${previous?.attempts ?? 0}:${!!b.renew}`, maxAttempts: 1, label: L("Logo : directions créatives", "Logo: creative directions"), payload: { projectId: p.id, style: b.style ?? "auto", expectedSeriesId: previous?.id ?? null, renew: b.renew ?? (!!rights.used && !rights.partial), correction: b.feedback, costCapMicro: logoSeriesQuote().maxMicro } });
  return ok({ jobId: job.id, ...view(p.id) });
});
