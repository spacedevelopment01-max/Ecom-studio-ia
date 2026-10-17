/**
 * Visuels des publications planifiées en nombre (« Planifier plusieurs publications » › Visuels) :
 *  - « none » : textes seulement (comportement d'origine) ;
 *  - « free » : AUCUN appel IA payant. Image et carrousel : une image de la banque du projet — photos envoyées par le
 *    client, images déjà créées par l'IA pour ce projet et validées, et, pour une entreprise de services, photos libres
 *    de droits (Pixabay…) signalées « photo libre » (choix du propriétaire). Jamais un gabarit ni une image
 *    inventée ; jamais la même image deux publications de suite. Vidéo : montage local du moteur vidéo (sans IA),
 *    en tâche de fond. Banque vide ou trop petite : la publication garde son texte et un message clair ;
 *  - « ai » : chaque visuel créé par les moteurs existants (publication IA, vidéo V2), après un devis en % du budget
 *    IA du mois (coût probable : un essai par visuel, sans marge ajoutée) et un clic de confirmation.
 * Le message d'attente d'une publication (« visualNote ») est rangé dans son brief et affiché sur le calendrier.
 */
import { all, json, now, run } from "../db";
import { addUsage, removeUsages, type Asset } from "../library";
import type { Project } from "../projects";
import { isAutoUsable } from "../quality/usable";
import { balance } from "../billing";
import { L } from "../i18n-server";
import { estimateMicro, estimateTaskMicro } from "../ai/estimate";
import { aiPostMaxMicro } from "../ai/media-providers";
import { afterEdit } from "./approval";
import { planOfProject } from "../plan-gates";
import { PLANS } from "../plans";
import { verifiedFacts } from "../seo-v2/facts";
import { socialStrategy } from "./strategy";
import { planSlots, publishingDates, type PlanRequest } from "./planner";

export type PlanVisuals = "none" | "free" | "ai";

const VIDEO = new Set(["video", "reel", "short"]);
/** Formats qui reçoivent une image (le format « texte » reste sans visuel). */
export const needsImage = (format: string) => !VIDEO.has(format) && format !== "text";
export const needsVideoFormat = (format: string) => VIDEO.has(format);
const EDITABLE = ["planned", "draft", "review", "approved", "failed"];

// ------------------------------------------------------------------ messages d'attente

export type VisualNoteCode = "bank_empty" | "bank_short" | "video_failed" | "ai_failed";

/** Message montré au client sur une publication sans visuel (langue de l'interface). */
export function visualNoteText(code: string | null | undefined, detail?: string | null): string | null {
  switch (code) {
    case "bank_empty":
      return L("Aucun visuel : votre banque d'images est vide. Ajoutez des photos à votre banque d'images, ou choisissez les visuels par l'IA.", "No visual: your image bank is empty. Add photos to your image bank, or choose AI visuals.");
    case "bank_short":
      return L("Aucun visuel : pas assez de photos différentes dans votre banque (la même image ne revient pas deux fois de suite). Ajoutez des photos à votre banque d'images, ou choisissez les visuels par l'IA.", "No visual: not enough different photos in your bank (the same image never comes twice in a row). Add photos to your image bank, or choose AI visuals.");
    case "video_failed":
      return L(`Vidéo non créée${detail ? ` : ${detail}` : ""}. Ajoutez des photos ou des vidéos à votre banque, ou choisissez les visuels par l'IA.`, `Video not created${detail ? `: ${detail}` : ""}. Add photos or videos to your bank, or choose AI visuals.`);
    case "ai_failed":
      return L(`Visuel IA non obtenu${detail ? ` : ${detail}` : ""}. Rien n'a été mis à la place : relancez ce visuel ou choisissez une photo.`, `AI visual not obtained${detail ? `: ${detail}` : ""}. Nothing was put instead: retry this visual or pick a photo.`);
    default:
      return null;
  }
}

/** Enregistre (ou efface, `null`) le message d'attente du visuel d'une publication. */
export function setVisualNote(postId: string, code: VisualNoteCode | null, detail?: string | null) {
  if (code) run("UPDATE posts SET brief = json_set(COALESCE(brief, '{}'), '$.visualNote', json(?)) WHERE id = ?", JSON.stringify({ code, detail: detail ? detail.slice(0, 200) : null, at: now() }), postId);
  else run("UPDATE posts SET brief = json_remove(COALESCE(brief, '{}'), '$.visualNote') WHERE id = ?", postId);
}

export function visualNoteOf(brief: string | null | undefined): string | null {
  const n = json<{ visualNote?: { code?: string; detail?: string | null } }>(brief ?? "{}", {}).visualNote;
  return n ? visualNoteText(n.code, n.detail) : null;
}

// ------------------------------------------------------------------ banque gratuite

/** Image finale déjà créée par l'IA pour ce projet (publication IA validée). */
const aiFinal = (a: Asset) => {
  const m = json<{ aiPost?: unknown; finalImage?: unknown }>(a.meta, {});
  return a.origin === "generated" && (!!m.aiPost || !!m.finalImage);
};
const isStock = (a: Pick<Asset, "meta">) => !!json<{ stock?: unknown }>(a.meta, {}).stock;

/**
 * Images de la banque du projet utilisables gratuitement pour une publication, de la moins à la plus utilisée :
 * photos envoyées par le client, images IA finales du projet et, pour un projet de services, photos libres de droits.
 * Jamais un logo, un détourage, une affiche du studio, une publicité ni une image refusée.
 */
export function freeImagePool(p: Project): Asset[] {
  const rows = all<Asset & { uses: number }>(
    `SELECT a.*, (SELECT COUNT(*) FROM posts x WHERE x.project_id = a.project_id AND x.media LIKE '%' || a.id || '%' AND x.status != 'cancelled') uses
       FROM assets a WHERE a.project_id = ? AND a.kind = 'image' AND a.deleted_at IS NULL AND a.status != 'rejected'
        AND COALESCE(a.role, '') NOT LIKE 'logo%' AND COALESCE(a.role, '') NOT IN ('cutout','subtitles','video-poster','screenshot','favicon','ad','brand-board')
      ORDER BY uses ASC, a.created_at ASC LIMIT 400`,
    p.id,
  );
  return rows.filter(isAutoUsable).filter((a) => a.origin === "upload" || aiFinal(a) || (p.business === "services" && isStock(a)));
}

export type FreeVisualsResult = {
  /** Publications qui ont reçu une image de la banque. */
  images: number;
  /** Dont photos libres de droits (projet de services), signalées au client. */
  stock: number;
  /** Publications en image restées sans visuel (banque vide ou insuffisante). */
  waiting: number;
  /** Publications vidéo à monter (montage local, tâche de fond). */
  videoIds: string[];
  /** Message général pour le client (banque vide ou trop petite), sinon null. */
  message: string | null;
};

/**
 * Pose une image de la banque sur chaque publication en image (ordre du calendrier) : la moins utilisée, jamais la
 * même que la publication précédente. Gratuit, immédiat. Les vidéos sont renvoyées pour un montage en tâche de fond.
 * `replace` : remplace l'image déjà posée par une AUTRE image (jamais retirée sans rien à la place).
 */
export function attachFreeVisuals(p: Project, ids: string[], o: { replace?: boolean } = {}): FreeVisualsResult {
  const res: FreeVisualsResult = { images: 0, stock: 0, waiting: 0, videoIds: [], message: null };
  if (!ids.length) return res;
  const rows = all<{ id: string; format: string; media: string; status: string; user_edited: number }>(`SELECT id, format, media, status, user_edited FROM posts WHERE project_id = ? AND id IN (${ids.map(() => "?").join(",")}) ORDER BY scheduled_at`, p.id, ...ids).filter((r) => EDITABLE.includes(r.status));
  const pool = freeImagePool(p);
  const used = new Map(pool.map((a) => [a.id, (a as Asset & { uses: number }).uses ?? 0]));
  let prev: string | null = null;
  for (const r of rows) {
    if (needsVideoFormat(r.format)) {
      if (r.media === "[]") res.videoIds.push(r.id);
      continue;
    }
    if (!needsImage(r.format)) continue;
    const current = json<string[]>(r.media, [])[0] ?? null;
    if (current && !o.replace) {
      prev = current;
      continue;
    }
    const pick = pool.filter((a) => a.id !== prev && a.id !== current).sort((a, b) => (used.get(a.id) ?? 0) - (used.get(b.id) ?? 0))[0];
    if (!pick) {
      // Rien d'autre à poser : l'image actuelle reste (remplacement), sinon la publication garde son texte et le dit.
      if (!current) {
        setVisualNote(r.id, pool.length ? "bank_short" : "bank_empty");
        res.waiting++;
      }
      prev = current;
      continue;
    }
    run("UPDATE posts SET media = ?, production = ?, status = CASE WHEN status IN ('planned','draft','failed') THEN 'review' ELSE status END, updated_at = ? WHERE id = ?", JSON.stringify([pick.id]), JSON.stringify({ by: "bank", costMicro: 0, at: now() }), now(), r.id);
    if (current) removeUsages("post", r.id);
    addUsage(pick.id, "post", r.id, L("Publication", "Post"));
    afterEdit(r.id);
    run("UPDATE posts SET user_edited = ? WHERE id = ?", r.user_edited, r.id);
    setVisualNote(r.id, null);
    used.set(pick.id, (used.get(pick.id) ?? 0) + 1);
    prev = pick.id;
    res.images++;
    if (isStock(pick)) res.stock++;
  }
  if (res.waiting) res.message = pool.length ? visualNoteText("bank_short") : visualNoteText("bank_empty");
  return res;
}

// ------------------------------------------------------------------ devis IA (en % du budget du mois)

/** Marge de sécurité des estimations du studio (estimate.ts) : retirée pour montrer le coût PROBABLE. */
const ESTIMATE_SAFETY = 1.2;
/** Marge du plafond d'une image (media-providers : MEDIA_MAX_FACTOR × FX_SAFETY), retirée de même. */
const IMAGE_MAX_MARGIN = 1.25 * 1.05;

/**
 * Coût PROBABLE d'un visuel IA (micro-euros) : un seul essai, sans marge de sécurité. Image : l'image de la
 * publication IA, son accroche et son contrôle visuel ; vidéo : un plan filmé par l'IA, son découpage et ses contrôles.
 */
export function probableUnitMicro(kind: "image" | "video"): number {
  if (kind === "video") return Math.round(estimateMicro("video-clip") / ESTIMATE_SAFETY);
  const img = aiPostMaxMicro();
  const one = img != null ? img / IMAGE_MAX_MARGIN : estimateMicro("image") / ESTIMATE_SAFETY;
  const copy = estimateMicro("blog") / 10 / ESTIMATE_SAFETY;
  const qc = estimateTaskMicro("quality_control", { input: 4000, output: 600 }) / ESTIMATE_SAFETY;
  return Math.round(one + copy + qc);
}

/** Part du budget IA du mois (même base que la jauge « Reste … % » : capacité du mois) ; montant jamais montré. */
export function budgetShare(p: Project, micro: number): { pct: number; leftPct: number; enough: boolean } {
  const b = balance(p.userId, p.id);
  const pct = b.capacity > 0 ? (micro / b.capacity) * 100 : micro > 0 ? 999 : 0;
  const leftPct = b.capacity > 0 ? Math.max(0, (b.available / b.capacity) * 100) : 0;
  return { pct: Math.min(999, Math.round(pct * 10) / 10), leftPct: Math.round(leftPct), enough: micro <= b.available };
}

export type VisualQuote = {
  images: number;
  videos: number;
  /** Coût probable, en % du budget IA du mois. */
  pct: number;
  /** Reste du budget IA du mois, en %. */
  leftPct: number;
  enough: boolean;
  /** Nombre de publications avec visuel que le budget restant permet (proposition quand il ne suffit pas). */
  affordable: number;
  /** Coût probable (micro-euros) : usage interne du serveur, jamais affiché. */
  probableMicro: number;
};

export function quoteVisuals(p: Project, counts: { images: number; videos: number }, unit: (k: "image" | "video") => number = probableUnitMicro): VisualQuote {
  const ui = unit("image");
  const uv = unit("video");
  const probableMicro = counts.images * ui + counts.videos * uv;
  const share = budgetShare(p, probableMicro);
  const b = balance(p.userId, p.id);
  const avg = counts.images + counts.videos ? probableMicro / (counts.images + counts.videos) : 0;
  const affordable = avg > 0 ? Math.max(0, Math.floor(b.available / avg)) : counts.images + counts.videos;
  return { images: counts.images, videos: counts.videos, pct: share.pct, leftPct: share.leftPct, enough: share.enough, affordable, probableMicro };
}

/**
 * Nombre de visuels (images, vidéos) qu'un calendrier demandera, SANS rien créer : même grille que `createPlanV2`
 * (dates, créneaux, réseaux, formats, limite du forfait).
 */
export function previewVisualCounts(p: Project, req: PlanRequest): { images: number; videos: number; posts: number } {
  const forfait = planOfProject(p.id);
  const r = forfait && req.perDay > PLANS[forfait].postsPerDay ? { ...req, perDay: PLANS[forfait].postsPerDay } : req;
  const lang = r.lang ?? "fr";
  const strategy = socialStrategy(p, { lang, platforms: r.platforms.map((x) => x.platform), startDate: r.startDate, days: publishingDates(r).length, perDay: r.perDay, facts: verifiedFacts(p) });
  const { slots } = planSlots(r, strategy);
  return { images: slots.filter((s) => needsImage(s.format)).length, videos: slots.filter((s) => needsVideoFormat(s.format)).length, posts: slots.length };
}
