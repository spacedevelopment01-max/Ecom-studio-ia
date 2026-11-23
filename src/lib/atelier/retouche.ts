/**
 * LES GESTES SIMPLES SUR UNE IMAGE, CÔTÉ SERVEUR (rapport 10, point 5) : changer le fond, retirer un objet (retouche de
 * la photo par l'outil choisi, une seule chose change), version story ou carrée (le cadre agrandi autour de la photo
 * intacte), et le lot « tout mon catalogue ». Une seule façon de faire : la retouche passe par le devis et l'accord de
 * la retouche native (`image-v2/native-edit-approval.ts`), le même que partout dans le Studio.
 *
 * Après la création, le contrôle gratuit du produit (`suivi/studio-photo.ts`) compare le produit au détourage
 * d'origine : un produit changé est marqué « produit modifié », l'image reste à valider et ne part pas vers la boutique.
 * Chaque création est inscrite dans « Mes créations ».
 */
import sharp from "sharp";
import { assetData, getAsset, saveAsset } from "../library";
import { all } from "../db";
import { L } from "../i18n-server";
import { UserFacingError, type JobContext } from "../jobs";
import { bflExpand, openaiScene } from "../ai/media-providers";
import { margesPour } from "../ai/bfl";
import { pngSansPerte } from "../media/signature-ia";
import { consigneGeste } from "./gestes";
import { inscrireCreation } from "./journal";
import type { GesteId } from "./outils";

export type GesteRetouche = Extract<GesteId, "fond" | "retirer" | "story" | "carre" | "lot">;
export const GESTES_RETOUCHE: GesteRetouche[] = ["fond", "retirer", "story", "carre", "lot"];
export const estCadre = (g: string | undefined): g is "story" | "carre" => g === "story" || g === "carre";

/** Taille OpenAI du format visé (story : 1024 × 1536 ; carré : 1024 × 1024). */
export const tailleCadre = (cible: "9:16" | "1:1") => (cible === "9:16" ? { w: 1024, h: 1536, size: "1024x1536" as const } : { w: 1024, h: 1024, size: "1024x1024" as const });

/**
 * La toile et son masque pour agrandir le cadre : la photo entière posée au centre du format visé (réduite pour tenir),
 * opaque là où est la photo (à garder), transparente autour (à peindre).
 */
export async function toileAgrandie(image: Buffer, cible: "9:16" | "1:1"): Promise<{ composite: Buffer; masque: Buffer; place: { left: number; top: number; w: number; h: number } }> {
  const m = await sharp(image).metadata();
  const marges = margesPour(m.width ?? 1024, m.height ?? 1024, cible);
  const t = tailleCadre(cible);
  const k = t.w / marges.width;
  const w = Math.max(1, Math.round((m.width ?? 1024) * k)), h = Math.max(1, Math.round((m.height ?? 1024) * k));
  const left = Math.round(marges.left * k), top = Math.round(marges.top * k);
  const photo = await sharp(image).resize(w, h, { fit: "fill" }).png().toBuffer();
  const vide = { create: { width: t.w, height: t.h, channels: 4 as const, background: { r: 0, g: 0, b: 0, alpha: 0 } } };
  const composite = await sharp(vide).composite([{ input: photo, left, top }]).png().toBuffer();
  const plein = await sharp({ create: { width: w, height: h, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer();
  const masque = await sharp(vide).composite([{ input: plein, left, top }]).png().toBuffer();
  return { composite, masque, place: { left, top, w, h } };
}

const coutDeLaTache = (jobId: string) => all<{ c: number }>("SELECT COALESCE(SUM(cost),0) c FROM ai_calls WHERE job_id = ?", jobId)[0]?.c ?? 0;

/** Agrandit le cadre d'une photo du projet (outil de la route acceptée : OpenAI par masque, ou Flux Agrandir). */
export async function agrandirCadre(ctx: JobContext, projectId: string, assetId: string, geste: "story" | "carre", route: { provider: string; model: string }): Promise<{ assetId: string; sourceAssetId: string }> {
  const src = getAsset(assetId);
  if (!src || src.project_id !== projectId || src.deleted_at || !/^image\//.test(src.mime)) throw new UserFacingError(L("Photo introuvable dans ce projet.", "Photo not found in this project."));
  const cible = geste === "story" ? "9:16" : "1:1";
  const data = assetData(src);
  ctx.progress(0.2, L("J'agrandis le cadre autour de ta photo…", "Extending the frame around your photo…"));
  const base = { userId: ctx.job.user_id, projectId, jobId: ctx.job.id, usageKey: `atelier-cadre:${ctx.job.id}` };
  const prompt = consigneGeste(geste, "");
  let out: Buffer;
  if (route.provider === "bfl") out = await bflExpand(base, { image: data, cible, prompt });
  else {
    const t = tailleCadre(cible);
    const toile = await toileAgrandie(data, cible);
    out = await openaiScene(base, { composite: toile.composite, productMask: toile.masque, prompt, size: t.size, usage: "ad_visual" });
  }
  return enregistrer(ctx, projectId, src, out, { geste, route, nom: geste === "story" ? "story" : "carre" });
}

/** Range l'image créée (versions liées à la photo d'origine), contrôle le produit, l'inscrit dans « Mes créations ». */
export async function enregistrer(ctx: JobContext, projectId: string, src: NonNullable<ReturnType<typeof getAsset>>, out: Buffer, o: { geste: GesteRetouche; route: { provider: string; model: string }; nom: string; mode?: string }) {
  const { fideliteLocale } = await import("../image-v2/deps");
  const fidelite = await fideliteLocale(assetData(src), out).catch(() => null);
  const modifie = fidelite ? !fidelite.fidele : false;
  // Image d'OpenAI déjà en PNG : gardée telle quelle, avec sa signature « fait par l'IA » (rien n'est composé).
  const png = await pngSansPerte(out);
  const a = await saveAsset({
    projectId, userId: ctx.job.user_id, data: png, name: `${(src.name || "photo").replace(/\.[a-z0-9]+$/i, "")}-${o.nom}.png`, mime: "image/png",
    role: src.role ?? "lifestyle", folderKey: "images.ads", origin: "generated", sourceAssetId: src.id, versionOf: src.version_of ?? src.id,
    status: "review",
    meta: { aiGenerated: true, atelier: { geste: o.geste, outil: `${o.route.provider}:${o.route.model}`, produitModifie: modifie, ecarts: fidelite?.ecarts ?? [] } },
  });
  inscrireCreation({ projectId, userId: ctx.job.user_id, assetId: a.id, sourceAssetId: src.id, geste: o.geste, mode: o.mode ?? "moi", kind: "image", provider: o.route.provider, model: o.route.model, costMicro: coutDeLaTache(ctx.job.id), status: modifie ? "produit_modifie" : "ok" });
  ctx.progress(1, modifie ? L("Image créée, mais ton produit a changé : je la garde à part, elle ne part pas vers ta boutique.", "Image created, but your product changed: I'm keeping it aside, it won't go to your shop.") : L("Image prête.", "Image ready."));
  return { assetId: a.id, sourceAssetId: src.id };
}

/** Inscrit une retouche faite par la retouche native (fond, retirer, lot) dans « Mes créations », avec son contrôle. */
export async function apresRetouche(ctx: JobContext, projectId: string, r: { assetId: string; sourceAssetId: string }, o: { geste: GesteRetouche; route: { provider: string; model: string }; mode?: string }) {
  const src = getAsset(r.sourceAssetId), made = getAsset(r.assetId);
  if (!src || !made) return;
  const { fideliteLocale } = await import("../image-v2/deps");
  const fidelite = o.geste === "retirer" ? null : await fideliteLocale(assetData(src), assetData(made)).catch(() => null);
  const modifie = fidelite ? !fidelite.fidele : false;
  const { run, json } = await import("../db");
  const meta = { ...json<Record<string, unknown>>(made.meta, {}), aiGenerated: true, atelier: { geste: o.geste, outil: `${o.route.provider}:${o.route.model}`, produitModifie: modifie, ecarts: fidelite?.ecarts ?? [] } };
  run("UPDATE assets SET meta = ?, status = ? WHERE id = ?", JSON.stringify(meta), "review", made.id);
  inscrireCreation({ projectId, userId: ctx.job.user_id, assetId: made.id, sourceAssetId: src.id, geste: o.geste, mode: o.mode ?? "moi", kind: "image", provider: o.route.provider, model: o.route.model, costMicro: coutDeLaTache(ctx.job.id), status: modifie ? "produit_modifie" : "ok" });
}
