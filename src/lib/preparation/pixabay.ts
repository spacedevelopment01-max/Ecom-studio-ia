/** Collecte dédiée à la mission : réutilise les connecteurs existants, Pixabay exclusivement. */
import { createHash } from "node:crypto";
import sharp from "sharp";
import { all, json, run } from "../db";
import { activeProviderKey } from "../ai/config";
import { searchSource, searchStockVideos, emptyVideoReport } from "../stock/photos";
import { safeFetch } from "../engine/import-link";
import { saveAsset, getAsset } from "../library";
import { hashDistance, visualHash, SAME_LOGO_BITS } from "../logo-v2/identity";
import { reviewPlacement } from "./media-review";
import type { JobContext } from "../jobs";
import type { Project } from "../projects";
import type { Contents, VisualSlot } from "./types";
const LICENSE = { name: "Pixabay Content License", url: "https://pixabay.com/service/license-summary/", checkedAt: "2026-10-18", usage: "Illustration intégrée aux pages du projet ; ni vente ni redistribution autonome comme banque de médias ; vérifier droits des marques, biens et personnes identifiables.", standaloneRedistribution: false };
export function assertPixabayFileUrl(raw: string) {
  const u = new URL(raw);
  if (u.protocol !== "https:" || u.username || u.password || !(u.hostname === "pixabay.com" || u.hostname.endsWith(".pixabay.com"))) throw new Error("URL de téléchargement hors domaines Pixabay autorisés.");
}
export async function collectPixabaySlot(p: Project, ctx: JobContext, c: Contents, slot: VisualSlot) {
  if (!activeProviderKey("pixabay")) throw new Error("Accès Pixabay absent ou désactivé : collecte en attente, médias et affectations conservés.");
  if (process.env.STOCK_OFFLINE === "1") throw new Error("Pixabay hors ligne : aucune collecte réelle effectuée.");
  const rows = all<{ id: string; meta: string }>("SELECT id,meta FROM assets WHERE project_id=? AND deleted_at IS NULL", p.id);
  const taken = new Set(rows.map(r => json<any>(r.meta, {}).stock).filter(Boolean).map(s => `${s.source}:${s.id}`));
  const hashes = rows.map(r => json<any>(r.meta, {}).preparation?.contentHash).filter(Boolean);
  const visualHashes = rows.map(r => json<any>(r.meta, {}).preparation?.visualHash).filter(Boolean);
  const queries = (slot.queries ?? []).filter(Boolean).slice(0, 3);
  if (!queries.length) throw new Error("Requêtes liées au storyboard absentes : complétez le plan éditorial.");
  const kind = slot.kind ?? "image";
  const candidates = kind === "video"
    ? await searchStockVideos(queries, "landscape", "fr", taken, 8, emptyVideoReport(), { sourceOnly: "pixabay" })
    : (await Promise.all(queries.map(q => searchSource("pixabay", q, slot.aspect === "9:16" ? "portrait" : "landscape", "fr")))).flat();
  const seen = new Set<string>();
  let tried = 0;
  for (const item of candidates) {
    const remote = `${item.source}:${item.id}`;
    if (taken.has(remote) || seen.has(remote)) continue;
    seen.add(remote);
    if (++tried > 3) break;
    assertPixabayFileUrl(item.url);
    const downloaded = await ctx.step(`pixabay:download:${slot.key}:${item.id}`, async () => {
      const r = await safeFetch(item.url, { maxBytes: kind === "video" ? 80_000_000 : 25_000_000, accept: kind === "video" ? "video/mp4" : "image/*" });
      assertPixabayFileUrl(r.url);
      if (r.status !== 200 || !(kind === "video" ? /^video\// : /^image\//).test(r.type)) throw new Error("Téléchargement Pixabay invalide ou inaccessible.");
      return r.body.toString("base64");
    });
    const original = Buffer.from(downloaded, "base64"), contentHash = createHash("sha256").update(original).digest("hex");
    if (hashes.includes(contentHash)) continue;
    const phash = kind === "image" ? await visualHash(original) : null;
    if (phash && visualHashes.some(h => hashDistance(phash, h) <= SAME_LOGO_BITS)) continue;
    const saved = await ctx.step(`pixabay:save:${slot.key}:${item.id}`, async () => {
      // Aucun recadrage destructif : cadrage adapté au composant par contain, pas produit déformé.
      const data = kind === "image" ? await sharp(original).rotate().resize(2400, 2400, { fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer() : original;
      const asset = await saveAsset({ projectId: p.id, userId: p.userId, data, name: `pixabay-${item.id}-${kind}.${kind === "video" ? "mp4" : "webp"}`, mime: kind === "video" ? "video/mp4" : "image/webp", origin: "import", role: kind === "video" ? "clip" : "scene", folderKey: kind === "video" ? "videos.shop" : "images.scenes", status: "review",
        meta: { stock: { source: "pixabay", id: item.id, page: item.page, author: item.author, license: LICENSE.name, licenseDetails: LICENSE, intendedUsage: `${slot.pageKey}/${slot.sectionKey}`, notClientWork: true }, preparation: { contentHash, visualHash: phash, slot: slot.key }, gate: { verdict: "PROVISIONAL" } } });
      return asset.id;
    });
    const a = getAsset(saved)!;
    if (!a.width || !a.height || (kind === "video" && !a.duration)) { run("UPDATE assets SET status='rejected' WHERE id=? AND project_id=?", a.id, p.id); continue; }
    const reviewed = await reviewPlacement(p, ctx, c, slot, a);
    run("UPDATE assets SET status=?,meta=json_set(meta,'$.gate',json(?)) WHERE id=? AND project_id=?", reviewed.alignment?.status === "accepted" ? "review" : "rejected", JSON.stringify({ verdict: reviewed.alignment?.status === "accepted" ? "FINAL" : "REJECTED", checker: "ai", reason: reviewed.alignment?.reason }), a.id, p.id);
    if (reviewed.alignment?.status === "accepted") return reviewed;
    // Une autre candidate est un essai de pertinence annoncé et borné, jamais une relance d'erreur API incertaine.
  }
  throw new Error(`Collecte partielle : aucun média Pixabay suffisamment pertinent pour ${slot.key} après ${Math.min(tried, 3)} candidats. Aucun remplissage hors sujet.`);
}
