/**
 * Détourages du produit, avec discernement :
 *  1. tri des photos avant détourage (fond mesuré localement ; classement visuel par l'IA quand elle est disponible) :
 *     seuls les packshots sont détourés ; les photos en situation rejoignent les photos « en situation » du client ;
 *     les visuels avec texte restent dans les fichiers sans servir de source ;
 *  2. contrôle de chaque détourage (règles locales, puis contrôle visuel par l'IA) ;
 *  3. un détourage refusé est gardé (statut « rejected », raisons) pour être montré et ne pas être refait,
 *     mais il n'est jamais utilisé : `validCutouts` est la seule source des images, vidéos et de la boutique.
 */
import sharp from "sharp";
import { all, json, now, one, run } from "../db";
import { assetData, folderByKey, saveAsset, type Asset } from "../library";
import type { Project } from "../projects";
import { cutoutProduct, CutoutUnavailable, extractPalette, type Cutout } from "../media/cutout";
import { checkCutoutLocal, cutoutPreviews, measureBackground, type BgStats } from "../media/cutout-quality";
import { aiCutoutCheck, aiPhotoTriage } from "../ai/tasks";
import { llmConfigured } from "../ai/llm";
import { JobCancelled, JobPaused, type JobContext } from "../jobs";
import { C, L } from "../i18n-server";
import type { CutoutQuality, PhotoKind } from "../cutout-reasons";

export type PhotoTriage = { kind: PhotoKind; by: "ai" | "local"; best?: boolean; plain?: boolean; uniform?: number; smooth?: number; at: number };

/** Au plus autant de détourages par projet (chacun est contrôlé). */
const MAX_CUTOUTS = 6;
/** Un détourage impossible (machine trop juste) n'est pas retenté avant ce délai, sauf demande explicite. */
const RETRY_AFTER_MS = 30 * 60_000;
/** Note minimale du contrôle visuel. */
const MIN_AI_SCORE = 7;

const meta = (a: Asset) => json<Record<string, any>>(a.meta, {});
const setMeta = (a: Asset, patch: Record<string, unknown>) => run("UPDATE assets SET meta = ? WHERE id = ?", JSON.stringify({ ...meta(a), ...patch }), a.id);
const reload = (id: string) => one<Asset>("SELECT * FROM assets WHERE id = ?", id)!;
const isStop = (e: unknown) => e instanceof JobCancelled || e instanceof JobPaused;
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || C("produit", "product");

function originalsOf(projectId: string): Asset[] {
  return all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'original' AND kind = 'image' AND deleted_at IS NULL ORDER BY created_at", projectId);
}

/** Photos triées devenues photos en situation (elles peuvent encore servir de dernière candidate au détourage). */
function convertedOf(projectId: string): Asset[] {
  return all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'lifestyle' AND kind = 'image' AND deleted_at IS NULL AND json_extract(meta, '$.triage.kind') IS NOT NULL ORDER BY created_at", projectId);
}

/** Détourage (quel que soit son statut) déjà fait pour une photo. */
function cutoutFor(projectId: string, sourceId: string): Asset | undefined {
  return one<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'cutout' AND source_asset_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId, sourceId);
}

/**
 * Détourages utilisables, du meilleur au moins bon : validés par vous, puis issus de la meilleure photo produit,
 * puis par note du contrôle. Les détourages refusés (contrôle ou « Ne pas utiliser ») n'en font jamais partie.
 */
export function validCutouts(projectId: string): Asset[] {
  const list = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'cutout' AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at", projectId);
  const rank = (a: Asset) => {
    const m = meta(a);
    return (a.status === "approved" ? 0 : 100) + (m.best ? 0 : 10) + (m.fallback ? 5 : 0) - (Number(m.quality?.score) || 0) / 10;
  };
  return list.sort((x, y) => rank(x) - rank(y));
}

/** Détoure les photos qui s'y prêtent, contrôle chaque détourage et renvoie les détourages utilisables. */
export async function ensureCutouts(ctx: JobContext | null, project: Project, opts: { force?: string[] } = {}): Promise<Asset[]> {
  // Services : les photos montrent un lieu, une équipe, des réalisations — rien à détourer.
  if (project.business === "services") return [];
  const base = { userId: project.userId, projectId: project.id, jobId: ctx?.job.id ?? null };
  await triagePhotos(ctx, project, base);
  await recheckLegacy(ctx, project, base);
  const forced = new Set(opts.force ?? []);
  const kind = (a: Asset) => (meta(a).triage as PhotoTriage | undefined)?.kind;
  // Packshots (et photos dont le détourage est demandé explicitement), la meilleure d'abord.
  const plan = [...originalsOf(project.id), ...convertedOf(project.id)]
    .filter((o) => forced.has(o.id) || (o.role === "original" && kind(o) === "packshot"))
    .sort((x, y) => Number(!!meta(y).triage?.best) - Number(!!meta(x).triage?.best));
  for (const [i, o] of plan.entries()) {
    if (validCutouts(project.id).length >= MAX_CUTOUTS) break;
    ctx?.progress(0.08 + (i / Math.max(1, plan.length)) * 0.27, L(`Détourage et contrôle de la photo ${i + 1}/${plan.length}`, `Cutting out and checking photo ${i + 1}/${plan.length}`));
    await makeCutout(project, base, o, { force: forced.has(o.id), fallback: kind(o) !== "packshot" });
  }
  // Aucun packshot exploitable : la meilleure candidate est détourée, mais gardée seulement si le contrôle visuel
  // la valide (sans IA, rien ne permet de vérifier que l'objet isolé est le produit : pas de détourage).
  if (!validCutouts(project.id).length && llmConfigured()) {
    const candidate = [...originalsOf(project.id), ...convertedOf(project.id)]
      .filter((o) => kind(o) !== "text" && !cutoutFor(project.id, o.id))
      .sort((x, y) => candidateScore(y) - candidateScore(x))[0];
    if (candidate) {
      ctx?.progress(0.3, L("Détourage de la meilleure photo disponible", "Cutting out the best available photo"));
      await makeCutout(project, base, candidate, { force: false, fallback: kind(candidate) !== "packshot" });
    }
  }
  return validCutouts(project.id);
}

/** Intérêt d'une photo comme dernière candidate : choisie par l'IA, puis fond le plus simple. */
function candidateScore(a: Asset): number {
  const t = meta(a).triage as PhotoTriage | undefined;
  if (!t) return 0;
  return (t.best ? 10 : 0) + (t.kind === "packshot" ? 5 : t.kind === "situation" ? 1 : 0) + (t.plain ? 2 : 0) + (t.uniform ?? 0) + (t.smooth ?? 0);
}

type Base = { userId: string; projectId: string; jobId: string | null };

/** Tri des photos pas encore triées : une seule requête d'IA pour toutes, sinon mesure locale du fond. */
async function triagePhotos(ctx: JobContext | null, project: Project, base: Base) {
  const pending = originalsOf(project.id).filter((o) => !meta(o).triage);
  if (!pending.length) return;
  ctx?.progress(0.04, L("Tri des photos du produit", "Sorting the product photos"));
  const local: (BgStats | null)[] = [];
  for (const o of pending) local.push(await measureBackground(assetData(o)).catch(() => null));
  let ai: { kind: PhotoKind | null; best: boolean }[] | null = null;
  const sent = pending.slice(0, 12);
  if (llmConfigured()) {
    try {
      const thumbs = await Promise.all(sent.map((o) => sharp(assetData(o), { failOn: "none" }).rotate().flatten({ background: "#ffffff" }).resize(640, 640, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer()));
      const r = await aiPhotoTriage({ ...base, usageKey: base.jobId ? `${base.jobId}:triage:${sent[0].id}` : undefined }, thumbs);
      ai = sent.map((_, i) => ({ kind: r.photos.find((x) => x.index === i + 1)?.kind ?? null, best: r.best === i + 1 }));
    } catch (e) {
      if (isStop(e)) throw e;
      console.warn("[cutouts] tri des photos par l'IA indisponible, tri local :", (e as Error).message);
    }
  }
  const scenes = folderByKey(project.id, "images.scenes");
  for (const [i, o] of pending.entries()) {
    const bg = local[i];
    const fromAi = ai?.[i]?.kind ?? null;
    const triage: PhotoTriage = {
      kind: fromAi ?? (bg?.plain ? "packshot" : "busy"),
      by: fromAi ? "ai" : "local",
      ...(ai?.[i]?.best ? { best: true } : {}),
      ...(bg ? { plain: bg.plain, uniform: bg.uniform, smooth: bg.smooth } : {}),
      at: now(),
    };
    setMeta(o, { triage });
    if (triage.kind === "situation") {
      // Photo en situation : elle rejoint les photos « en situation » du client (ouverture de la boutique, galerie, vidéos).
      const origin = o.origin === "upload" ? "upload" : "site";
      run("UPDATE assets SET role = 'lifestyle', origin = ?, folder_id = COALESCE(?, folder_id), meta = ? WHERE id = ?", origin, scenes, JSON.stringify({ ...meta(reload(o.id)), originBefore: o.origin }), o.id);
    }
  }
}

/** Détourages faits avant le contrôle : contrôlés à leur tour (aucun n'est utilisé sans contrôle). */
async function recheckLegacy(ctx: JobContext | null, project: Project, base: Base) {
  const legacy = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'cutout' AND deleted_at IS NULL AND status != 'rejected' AND json_extract(meta, '$.quality') IS NULL", project.id);
  for (const c of legacy) {
    const m = meta(c);
    const src = c.source_asset_id ? one<Asset>("SELECT * FROM assets WHERE id = ?", c.source_asset_id) : undefined;
    if (!src || !m.bbox || !m.source) {
      setQuality(c, { verdict: "rejected", reasons: ["not_packshot"], score: 0, by: "local", checkedAt: now() });
      continue;
    }
    ctx?.progress(0.06, L("Contrôle des détourages existants", "Checking existing cutouts"));
    const cut = { png: assetData(c), bbox: m.bbox, sourceW: m.source.w, sourceH: m.source.h };
    const fallback = (meta(src).triage as PhotoTriage | undefined)?.kind !== "packshot";
    setQuality(c, await judge(base, cut, assetData(src), fallback, `legacy:${c.id}`));
  }
}

function setQuality(c: Asset, quality: CutoutQuality) {
  run("UPDATE assets SET status = ?, meta = ? WHERE id = ?", quality.verdict === "ok" ? (c.status === "rejected" ? "ready" : c.status) : "rejected", JSON.stringify({ ...meta(c), quality }), c.id);
}

/**
 * Verdict d'un détourage : règles locales d'abord ; puis contrôle visuel par l'IA quand elle est disponible.
 * Une photo qui n'est pas un packshot (dernière candidate) n'est validée que par le contrôle visuel : sans IA,
 * rien ne permet de vérifier que l'objet isolé est bien le produit, le détourage est donc refusé.
 */
async function judge(base: Base, cut: Pick<Cutout, "png" | "bbox" | "sourceW" | "sourceH">, original: Buffer, fallback: boolean, key: string): Promise<CutoutQuality> {
  const local = await checkCutoutLocal(cut, original);
  const at = now();
  if (!local.ok) return { verdict: "rejected", reasons: local.reasons, score: local.score, by: "local", checkedAt: at };
  if (llmConfigured()) {
    try {
      const prev = await cutoutPreviews(cut.png);
      const orig = await sharp(original, { failOn: "none" }).rotate().flatten({ background: "#ffffff" }).resize(768, 768, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer();
      const r = await aiCutoutCheck({ ...base, usageKey: base.jobId ? `${base.jobId}:cutout-check:${key}` : undefined }, { original: orig, white: prev.white, dark: prev.dark });
      const score = Math.max(0, Math.min(10, r.score));
      // Verdict et note font foi : une remarque mineure listée avec un « ok » bien noté ne fait pas perdre le détourage.
      const ok = r.verdict === "ok" && score >= MIN_AI_SCORE;
      return { verdict: ok ? "ok" : "rejected", reasons: ok ? [] : r.problems.length ? [...r.problems] : ["product_cut"], score, by: "ai", ...(r.note ? { note: r.note } : {}), checkedAt: at };
    } catch (e) {
      if (isStop(e)) throw e;
      console.warn("[cutouts] contrôle visuel indisponible :", (e as Error).message);
    }
  }
  if (fallback) return { verdict: "rejected", reasons: ["not_packshot"], score: local.score, by: "local", checkedAt: at };
  return { verdict: "ok", reasons: [], score: local.score, by: "local", checkedAt: at };
}

/** Détoure une photo, contrôle le résultat et l'enregistre (validé ou refusé). */
async function makeCutout(project: Project, base: Base, o: Asset, opts: { force: boolean; fallback: boolean }) {
  if (cutoutFor(project.id, o.id)) return;
  const err = meta(o).cutoutError as { at: number } | undefined;
  if (!opts.force && err && now() - err.at < RETRY_AFTER_MS) return;
  const original = assetData(o);
  let cut: Cutout;
  try {
    cut = await cutoutProduct(original);
  } catch (e) {
    if (isStop(e)) throw e;
    // Pas de détourage plutôt qu'un mauvais détourage : la photo est notée, le reste de la création continue.
    setMeta(o, { cutoutError: { at: now(), message: (e as Error).message.slice(0, 300), unavailable: e instanceof CutoutUnavailable } });
    return;
  }
  const quality = await judge(base, cut, original, opts.fallback, o.id);
  const t = meta(o).triage as PhotoTriage | undefined;
  const n = all("SELECT id FROM assets WHERE project_id = ? AND role = 'cutout'", project.id).length + 1;
  const methodLabel =
    cut.method === "model" ? L(`Détourage local (modèle embarqué ${cut.model ?? ""})`.replace(" )", ")"), `Local cutout (built-in ${cut.model ?? ""} model)`) : cut.method === "existing" ? L("Photo déjà détourée (transparence d'origine)", "Photo already cut out (original transparency)") : L("Détourage local (fond uni)", "Local cutout (plain background)");
  await saveAsset({
    projectId: project.id,
    userId: project.userId,
    data: cut.png,
    name: `${slug(project.product.name || project.name)}-${C("detoure", "cutout")}-${n}.png`,
    mime: "image/png",
    role: "cutout",
    folderKey: "product.cutouts",
    origin: "generated",
    sourceAssetId: o.id,
    status: quality.verdict === "ok" ? "ready" : "rejected",
    meta: { method: methodLabel, model: cut.model ?? null, bbox: cut.bbox, source: { w: cut.sourceW, h: cut.sourceH }, colors: quality.verdict === "ok" ? await extractPalette(cut.png) : [], quality, ...(t?.best ? { best: true } : {}), ...(opts.fallback ? { fallback: true } : {}) },
  });
  if (err) setMeta(reload(o.id), { cutoutError: null });
}

/** Refaire le détourage d'une photo : l'ancien part à la corbeille (restaurable), le nouveau est contrôlé. */
export async function redoCutout(ctx: JobContext | null, project: Project, sourceId: string) {
  const old = cutoutFor(project.id, sourceId);
  if (old) run("UPDATE assets SET deleted_at = ? WHERE id = ?", now(), old.id);
  const src = one<Asset>("SELECT * FROM assets WHERE id = ? AND project_id = ?", sourceId, project.id);
  if (src) setMeta(src, { cutoutError: null });
  return ensureCutouts(ctx, project, { force: [sourceId] });
}

/** « Ne pas utiliser » : le détourage reste visible mais n'est plus jamais utilisé. */
export function setAsideCutout(c: Asset) {
  setQuality(c, { verdict: "user", reasons: ["user"], score: Number(meta(c).quality?.score) || 0, by: meta(c).quality?.by ?? "local", checkedAt: now() });
}

export type CutoutSummary = { cut: number; rejected: number; life: number; text: number; other: number; busy: number; failed: number };

/** Bilan du tri et des détourages d'un projet (note d'étape). */
export function cutoutSummary(projectId: string): CutoutSummary {
  const cut = validCutouts(projectId).length;
  const rejected = one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id = ? AND role = 'cutout' AND deleted_at IS NULL AND status = 'rejected'", projectId)!.n;
  const life = one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id = ? AND role = 'lifestyle' AND deleted_at IS NULL AND json_extract(meta, '$.triage.kind') = 'situation'", projectId)!.n;
  const originals = originalsOf(projectId);
  const k = (kind: PhotoKind) => originals.filter((o) => meta(o).triage?.kind === kind).length;
  const busy = originals.filter((o) => meta(o).triage?.kind === "busy" && !cutoutFor(projectId, o.id)).length;
  const failed = [...originals, ...convertedOf(projectId)].filter((o) => meta(o).cutoutError && !cutoutFor(projectId, o.id)).length;
  return { cut, rejected, life, text: k("text"), other: k("other"), busy, failed };
}

/** Photos à montrer à l'analyse du produit : packshots et photos en situation du client (jamais les visuels avec texte). */
export function analysisPhotos(projectId: string, limit = 6): Asset[] {
  const originals = originalsOf(projectId).filter((o) => !["text", "other"].includes(meta(o).triage?.kind));
  const life = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'lifestyle' AND kind = 'image' AND origin != 'generated' AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at LIMIT ?", projectId, limit);
  return [...originals.slice(0, 4), ...life].slice(0, limit);
}
