/**
 * « L'AVANT ET L'APRÈS » (rapport 10, partie 2) : jamais d'« après » inventé. Aucun modèle vidéo, aucun appel payant :
 * deux VRAIES photos du client (déposées ou reprises de son site), montées par le Studio, l'avant puis l'après avec un
 * volet qui glisse, la musique composée par le Studio et son logo à la fin. Gratuit.
 */
import crypto from "node:crypto";
import { getAsset } from "../library";
import { loadProject, type Project } from "../projects";
import { C, L } from "../i18n-server";
import { UserFacingError, type JobContext } from "../jobs";
import { buildSceneDoc, sceneTiming, type SceneAspect, type ScenePlan } from "../video-v2/three-scenes";
import type { VideoDocument } from "../video-v2/types";
import { inscrireCreation } from "./journal";

export const AVANT_APRES_S = 8;

/** Une photo fournie par le client lui-même (jamais une image créée). */
export function vraiePhoto(projectId: string, assetId: string): boolean {
  const a = getAsset(assetId);
  return !!a && a.project_id === projectId && !a.deleted_at && a.kind === "image" && ["upload", "site", "link"].includes(a.origin);
}

/** Le document vidéo : deux plans fixes (les vraies photos), volet entre les deux, titres « Avant » et « Après ». */
export function docAvantApres(p: Project, avant: string, apres: string, aspect: SceneAspect): VideoDocument {
  const timing = sceneTiming(2, AVANT_APRES_S);
  const plan: ScenePlan = { scenes: [{ still: "avant", motion: "static", title: C("Avant", "Before") }, { still: "après", motion: "static", title: C("Après", "After") }], line: "", cta: "" };
  const doc = buildSceneDoc(p, [{ assetId: avant, durationS: timing.showS, generated: false }, { assetId: apres, durationS: timing.showS, generated: false }], plan, aspect, "post", timing, true);
  doc.clips = doc.clips.map((c, k) => ({ ...c, source: { kind: "image", assetId: k === 0 ? avant : apres, motion: "static", crop: null }, transitionIn: k === 0 ? { kind: "cut", durationS: 0 } : { kind: "wipe", durationS: 0.6 }, generated: false }));
  return doc;
}

export async function runAvantApres(ctx: JobContext): Promise<{ videoAssetId: string; docKey: string }> {
  const { projectId, avant, apres, aspect } = ctx.payload as { projectId: string; avant: string; apres: string; aspect: SceneAspect };
  if (!vraiePhoto(projectId, avant) || !vraiePhoto(projectId, apres) || avant === apres) throw new UserFacingError(L("Il me faut deux de tes vraies photos, différentes : l'avant et l'après.", "I need two of your real photos, different ones: before and after."));
  const p = loadProject(projectId);
  const { renderVideoFile, saveRendered, saveVideoVersion } = await import("../video-v2/store");
  const doc = docAvantApres(p, avant, apres, aspect ?? "9:16");
  const docKey = `atelier-avant-apres:${crypto.createHash("sha256").update(`${avant}:${apres}:${aspect}`).digest("hex").slice(0, 16)}`;
  ctx.progress(0.3, L("Je monte tes deux photos…", "Putting your two photos together…"));
  const ex = await renderVideoFile(projectId, doc, { onProgress: (x) => ctx.progress(0.3 + x * 0.6, L(`Montage ${Math.round(x * 100)} %`, `Editing ${Math.round(x * 100)}%`)) });
  const saved = await saveRendered(projectId, ctx.job.user_id, docKey, doc, ex, { atelier: { geste: "avant-apres", avant, apres }, gate: { verdict: "PROVISIONAL", fatal: false, checked: false, reason: L("Montage de deux vraies photos, à valider", "Edit of two real photos, to approve"), provisional: { use: "manual", label: "needs_improvement" } } });
  saveVideoVersion(projectId, docKey, doc, { note: C("Avant et après (deux vraies photos)", "Before and after (two real photos)"), renderedAssetId: saved.videoId });
  inscrireCreation({ projectId, userId: ctx.job.user_id, assetId: saved.videoId, sourceAssetId: avant, geste: "avant-apres", mode: "moi", kind: "video", provider: "studio", model: "montage", costMicro: 0 });
  ctx.progress(1, L("Ton avant-après est prêt.", "Your before-and-after is ready."));
  return { videoAssetId: saved.videoId, docKey };
}
