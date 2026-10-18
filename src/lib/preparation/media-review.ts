import { lintClaims } from "../ai/tasks";
import { placementHash } from "./media-context";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { llmJson } from "../ai/llm";
import { brainContext } from "../brain/facade";
import { assetData, getAsset, saveAsset, type Asset } from "../library";
import { tmpDir } from "../storage";
import { execTool } from "../exec-tool";
import { apiEvidence } from "./evidence";
import type { Project } from "../projects";
import type { JobContext } from "../jobs";
import type { Contents, VisualSlot } from "./types";
const schema = z.object({ pertinent: z.boolean(), textSupported: z.boolean(), exactProduct: z.boolean(), personVisible: z.boolean(), externalBrand: z.boolean(), watermark: z.boolean(), artifact: z.boolean(), heroSuitable: z.boolean(), diverseFromPrior: z.boolean(), reason: z.string().min(1).max(1500), caption: z.string().min(1).max(500), alt: z.string().min(1).max(500) });
/** Trois images d'une vraie vidéo : un mot-clé ou une seule vignette ne prouvent pas les gestes montrés. */
export async function mediaFrames(a: Asset): Promise<Buffer[]> {
  if (a.kind === "image") return [assetData(a)];
  const dir = tmpDir("preparation-video");
  try {
    fs.writeFileSync(path.join(dir, "clip.mp4"), assetData(a));
    const frames: Buffer[] = [];
    for (const [i, fraction] of [.1, .5, .85].entries()) {
      const target = path.join(dir, `frame-${i}.jpg`);
      await execTool("ffmpeg", ["-y", "-v", "error", "-ss", String(Math.max(.05, (a.duration ?? 4) * fraction)), "-i", path.join(dir, "clip.mp4"), "-frames:v", "1", "-vf", "scale=1280:-2", target]);
      frames.push(fs.readFileSync(target));
    }
    return frames;
  } finally { fs.rmSync(dir, { force: true, recursive: true }); }
}
export async function reviewPlacement(p: Project, ctx: JobContext, c: Contents, slot: VisualSlot, a: Asset): Promise<VisualSlot> {
  const frames = await mediaFrames(a);
  const key = `${ctx.job.id}:alignment:${slot.key}:${a.id}`;
  const { stateOf } = await import("./store");
  const originalIds = stateOf(p.id)?.stages.brief?.data.input.photoIds ?? [];
  const images = frames.map((data, i) => ({ data, label: `Résultat réel, vue ${i + 1}` }));
  if (slot.source === "ai") for (const id of originalIds.slice(0, 6)) { const ref = getAsset(id); if (ref?.project_id === p.id) images.push({ data: assetData(ref), label: "Référence originale du produit : vérifier fidélité, aucune face inventée" }); }
  const previous = c.slots.filter(s => s.assetId && s.assetId !== a.id && s.kind === "image").slice(-3);
  for (const old of previous) { const prior = getAsset(old.assetId!); if (prior) images.push({ data: assetData(prior), label: "Scène déjà retenue : rejeter quasi-doublon de composition" }); }
  const result = await ctx.step(`alignment:${slot.key}:${a.id}`, () => llmJson({ task: "quality_control", userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey: key, promptKey: "preparation.media-alignment", routing: { difficulty: "complex" }, context: brainContext(p, "qc"), images,
    system: "Contrôle visuel exigeant : sujet, gestes du métier, produit fidèle aux références, cadre, netteté, artefacts, marques externes, filigranes, humain non autorisé, diversité réelle. Vérifie le TEXTE ADJACENT face au résultat. Un décor ne prouve aucun bénéfice, matière, origine ou résultat commercial. Stock = illustration déclarée, jamais les locaux, personnes ou réalisations réels, jamais le modèle exact. Hero vidéo : composition avec zone de texte lisible, responsive et poster possible. Rédige légende et alt uniquement d'après ce qui est visible. Un doute sur une caractéristique réelle = refus, demander le complément. Réponds strictement au schéma.",
    prompt: JSON.stringify({ slot, adjacent: c.editorial?.filter(b => b.pageKey === slot.pageKey && b.sectionKey === slot.sectionKey), facts: p.product.facts.filter(f => f.status === "confirmed"), peopleAllowed: slot.peopleConsent === "this_slot", business: p.business }), maxTokens: 2000,
  }, schema));
  const accepted = !lintClaims({ caption: result.caption, alt: result.alt }, p).length && result.pertinent && result.textSupported && result.diverseFromPrior && !result.externalBrand && !result.watermark && !result.artifact && (!result.personVisible || slot.peopleConsent === "this_slot") && (slot.source !== "ai" || result.exactProduct) && (slot.sectionKey !== "hero" || result.heroSuitable);
  let posterId = slot.posterId;
  if (accepted && a.kind === "video" && !posterId) posterId = (await saveAsset({ projectId: p.id, userId: p.userId, data: frames[1], name: `${slot.key.replaceAll(":", "-")}-poster.jpg`, mime: "image/jpeg", origin: "generated", role: "video-poster", folderKey: "videos.shop", sourceAssetId: a.id, meta: { derived: true }, status: "approved" })).id;
  return { ...slot, assetId: a.id, posterId, caption: result.caption, alt: result.alt, reviewed: false, alignment: { status: accepted ? "accepted" : "rejected", reason: result.reason, contextHash: placementHash(p, c, slot), execution: apiEvidence(p.id, key, true) } };
}
