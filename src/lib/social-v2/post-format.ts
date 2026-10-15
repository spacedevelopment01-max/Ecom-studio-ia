/**
 * Dupliquer une publication dans un autre format (9:16, 4:5, 1:1, 16:9) — gratuit, sans IA, l'originale intacte :
 *  - affiche à calques du studio : recomposée pour le format (même moteur que « Autres formats » des publicités),
 *    textes, couleurs et modifications du client conservés ;
 *  - visuel fait par l'IA (textes dans l'image) : l'image entière sur un fond tiré d'elle-même ;
 *  - photo seule : même traitement (rien n'est coupé).
 * La copie est une nouvelle publication « à relire », avec le même texte et la même date prévue.
 */
import { json, one, run } from "../db";
import { addUsage, assetData, assetMeta, getAsset, saveAsset } from "../library";
import type { Project } from "../projects";
import { duplicatePostV2 } from "./engine";
import { extendToAspect, IMAGE_SIZES, isAiImage, reformatAiImage, type ImageAspect } from "../media/ai-image-variants";

/** Affiche à calques recomposée au format voulu : nouvelle lignée, rendu enregistré ; renvoie l'image rendue. */
export async function reflowPoster(projectId: string, userId: string, docKey: string, aspect: ImageAspect): Promise<string | null> {
  const { duplicateDoc, latestDoc, saveAndRender } = await import("../ad-doc/store");
  const { reflow } = await import("../ad-doc/reflow");
  const { relayoutDoc } = await import("../ads-v2/compose");
  const { PLATFORM_SPECS } = await import("../ads-v2/platforms");
  if (!latestDoc(projectId, docKey)) return null;
  const d = duplicateDoc(projectId, docKey);
  const src = latestDoc(projectId, d.docKey)!.doc;
  const platform = (src.format.platform ?? "meta_feed") as keyof typeof PLATFORM_SPECS;
  const spec = PLATFORM_SPECS[platform] ?? PLATFORM_SPECS.meta_feed;
  const { w, h } = IMAGE_SIZES[aspect];
  const load = (id: string) => {
    const a = getAsset(id);
    return a && a.project_id === projectId && !a.deleted_at ? assetData(a) : null;
  };
  const recomposed = await relayoutDoc(src, { platform, aspect: aspect as never, width: w, height: h, label: aspect, safe: spec.safe }, load).catch(() => null);
  const next = recomposed ?? reflow(src, { width: w, height: h, aspect, platform, safe: { top: Math.round(h * spec.safe.top), bottom: Math.round(h * spec.safe.bottom), side: Math.round(w * spec.safe.side) } });
  const v = await saveAndRender(projectId, userId, d.docKey, { ...next, meta: { ...next.meta, source: "user" } }, `adaptation au format ${aspect}`);
  return v.renderedAssetId;
}

/** Visuel au format voulu à partir du premier média de la publication (affiche, visuel IA ou photo). */
export async function mediaInFormat(p: Project, assetId: string, aspect: ImageAspect): Promise<string | null> {
  const a = getAsset(assetId);
  if (!a || a.project_id !== p.id || a.deleted_at || a.kind !== "image") return null;
  const meta = assetMeta<Record<string, any>>(a);
  if (meta.poster?.docKey) {
    const id = await reflowPoster(p.id, p.userId, meta.poster.docKey, aspect).catch(() => null);
    if (id) return id;
  }
  if (isAiImage(meta)) return (await reformatAiImage(p.id, a.id, aspect))?.id ?? null;
  const copy = await saveAsset({ projectId: p.id, userId: p.userId, data: await extendToAspect(assetData(a), aspect), name: `${a.name.replace(/\.[a-z0-9]+$/i, "")}-${aspect.replace(":", "x")}.png`, mime: "image/png", role: a.role ?? "social", folderKey: "content.calendar", origin: "generated", status: "ready", sourceAssetId: a.id, meta: { aspect, reformat: { from: a.id, method: "studio" } } });
  return copy.id;
}

export async function duplicatePostInFormat(p: Project, postId: string, aspect: ImageAspect): Promise<{ id: string; assetId: string | null }> {
  const r = one<{ project_id: string; media: string | null }>("SELECT project_id, media FROM posts WHERE id = ?", postId);
  if (!r || r.project_id !== p.id) throw new Error("publication introuvable");
  const first = json<string[]>(r.media, [])[0] ?? null;
  const assetId = first ? await mediaInFormat(p, first, aspect) : null;
  const nid = duplicatePostV2(p, postId);
  if (assetId) {
    // Le type de publication du réseau (image, story…) reste celui de l'originale : seul le visuel change de format.
    run("UPDATE posts SET media = ? WHERE id = ?", JSON.stringify([assetId]), nid);
    addUsage(assetId, "post", nid, "Publication");
  }
  return { id: nid, assetId };
}
