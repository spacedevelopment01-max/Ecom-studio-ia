import { placementHash } from "./media-context";
import type { Contents } from "./types";
import { hamming, NEAR_DUPLICATE } from "../image-v2/quality";
import { createHash } from "node:crypto";
import { assetData, getAsset, type Asset } from "../library";
import { json } from "../db";
import type { Project } from "../projects";
import type { VisualSlot } from "./types";
import { inspectSiteMediaLineage } from "../project-handoff/media-pool";
export const expectedMedia = (business: Project["business"]) => ({ images: 10, videos: business === "products" ? 1 : 2 });
/** Ne compte ni originaux, ni brouillons, ni échecs, même si l'utilisateur a coché « vérifié ». */
export function slotIssues(p: Pick<Project, "id" | "business">, slot: VisualSlot, a: Asset | null | undefined): string[] {
  const issues: string[] = [];
  if (!a || a.project_id !== p.id || a.deleted_at || a.status === "rejected") return ["Média absent, étranger ou refusé."];
  const meta = json<any>(a.meta, {}), kind = slot.kind ?? "image";
  const lineage = inspectSiteMediaLineage(a, p.id, getAsset);
  if (lineage.issue) issues.push(lineage.issue);
  if (a.kind !== kind) issues.push("Type de fichier incompatible avec cet emplacement.");
  if (meta.gate?.verdict !== "FINAL" || meta.gate?.fatal) issues.push("Contrôle final accepté requis.");
  if (a.origin === "upload" || /original|trial|essai/i.test(a.role ?? "")) issues.push("Un original ou essai ne compte pas parmi les médias finaux.");
  if (slot.source === "ai" && (a.origin !== "generated" || meta.stock || meta.imageV2?.origin === "stock")) issues.push("Création IA du produit requise ; aucune photo de stock.");
  if (slot.source === "pixabay" && (meta.stock?.source !== "pixabay" || !meta.stock.id || !meta.stock.page || !meta.stock.license)) issues.push("Média Pixabay téléchargé avec provenance et licence requis.");
  if (kind === "image" && slot.source === "ai" && slot.aspect) {
    const [w, h] = slot.aspect.split(":").map(Number);
    if (!a.width || !a.height || Math.abs((a.width / a.height) / (w / h) - 1) > .025) issues.push(`Format final ${slot.aspect} non respecté.`);
    if (p.business === "products" && Math.min(a.width ?? 0, a.height ?? 0) < 720) issues.push("Résolution utile insuffisante (720 px minimum sur le petit côté).");
  }
  if (kind === "video" && (!a.duration || !a.width || !a.height || !slot.posterId)) issues.push("Vidéo illisible ou poster manquant.");
  if (!slot.alignment || slot.alignment.status !== "accepted") issues.push("Cohérence texte-image non vérifiée pour cet emplacement.");
  return issues;
}
export function finalMediaIssues(p: Pick<Project, "id" | "business"> & Partial<Pick<Project, "brand" | "product" | "services">>, slots: VisualSlot[], content?: Contents): string[] {
  const out: string[] = [], expected = expectedMedia(p.business);
  if (slots.filter(s => s.kind === "image").length !== expected.images || slots.filter(s => s.kind === "video").length !== expected.videos) out.push(`Lot incomplet : ${expected.images} images et ${expected.videos} vidéo(s) finales requises.`);
  if (p.business === "products") for (const [aspect, count] of [["1:1", 4], ["16:9", 4], ["9:16", 2]] as const) if (slots.filter(s => s.kind === "image" && s.aspect === aspect && s.source === "ai").length !== count) out.push(`Répartition produit incorrecte : ${count} compositions IA ${aspect}.`);
  const fingerprints: string[] = [];
  const ids = new Set<string>(), contents = new Set<string>(), remoteIds = new Set<string>();
  for (const slot of slots) {
    if (!slot.assetId || !slot.reviewed) { out.push(`Média à créer ou valider : ${slot.key}.`); continue; }
    if (content && slot.alignment?.contextHash !== placementHash(p as Project, content, slot)) out.push(`Cohérence à revérifier après changement de texte, identité ou affectation : ${slot.key}.`);
    const a = getAsset(slot.assetId);
    out.push(...slotIssues(p, slot, a).map(x => `${slot.key} : ${x}`));
    if (!a) continue;
    const hash = createHash("sha256").update(assetData(a)).digest("hex"), meta = json<any>(a.meta, {});
    if (a.kind === "image" && meta.imageV2?.phash) {
      if (fingerprints.some(h => hamming(h, meta.imageV2.phash) <= NEAR_DUPLICATE)) out.push(`Composition quasi identique : ${slot.key}.`);
      fingerprints.push(meta.imageV2.phash);
    }
    if (a.kind === "video" && slot.posterId) {
      const poster = getAsset(slot.posterId);
      if (!poster || poster.project_id !== p.id || poster.kind !== "image" || poster.deleted_at || poster.status === "rejected" || poster.source_asset_id !== a.id) out.push(`Poster absent ou non associé à la vidéo : ${slot.key}.`);
    }
    const remote = meta.stock ? `${a.kind}:${meta.stock.source}:${meta.stock.id}` : null;
    if (ids.has(a.id) || contents.has(hash) || (remote && remoteIds.has(remote))) out.push(`Doublon dans les médias finaux : ${slot.key}.`);
    ids.add(a.id); contents.add(hash); if (remote) remoteIds.add(remote);
  }
  if (!slots.some(s => s.kind === "video" && s.pageKey === "home" && s.sectionKey === "hero")) out.push("Vidéo hero manquante.");
  return [...new Set(out)];
}
