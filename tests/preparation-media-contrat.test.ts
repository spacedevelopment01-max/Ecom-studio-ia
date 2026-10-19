/** Contrat de quantités/provenance : fichiers synthétiques, aucun appel fournisseur. */
import { describe, it, expect } from "vitest";
import { finalMediaIssues, slotIssues } from "@/lib/preparation/media-policy";
import { assertPixabayFileUrl } from "@/lib/preparation/pixabay";
import type { Asset } from "@/lib/library";
import { fixture, syntheticAsset } from "./preparation-fixtures";
import { validatedBrand } from "./preparation-mission-fixtures";
import { sitePlan } from "@/lib/preparation/plan";
import { loadProject } from "@/lib/projects";
import type { VisualSlot } from "@/lib/preparation/types";
import { json, run } from "@/lib/db";

const slot: VisualSlot = { key: "final:image:1", pageKey: "product:main", sectionKey: "detail", purpose: "Vue du produit", required: true, kind: "image", source: "ai", aspect: "1:1", alignment: { status: "accepted", reason: "Contrôle injecté de test" } };
const asset: Asset = { id: "a", project_id: "p", user_id: "u", folder_id: null, name: "image-test.png", kind: "image", role: "scene", mime: "image/png", size: 1000, width: 1024, height: 1024, duration: null, storage_key: "test", thumb_key: null, origin: "generated", meta: JSON.stringify({ gate: { verdict: "FINAL" }, imageV2: { origin: "edited" } }), source_asset_id: null, version_of: null, version: 1, status: "review", starred: 0, deleted_at: null, created_at: 1 };
const p = { id: "p", business: "products" as const };
it("un résultat non relu par le client n'est pas pour autant un lot complet", () => {
  expect(slotIssues(p, slot, asset)).toEqual([]);
  expect(finalMediaIssues(p, [{ ...slot, assetId: asset.id, reviewed: false }])).toContain("Lot incomplet : 10 images et 1 vidéo(s) finales requises.");
});
it.each(["stock", "original", "rejected", "provisional", "portrait", "small", "foreign", "deleted", "wrong-kind", "alignment"])("un fichier ne remplit pas le contrat produit : %s", defect => {
  const a = structuredClone(asset), s = structuredClone(slot);
  if (defect === "stock") { a.origin = "import"; a.meta = JSON.stringify({ gate: { verdict: "FINAL" }, stock: { source: "pixabay", id: "1" } }); }
  if (defect === "original") { a.origin = "upload"; a.role = "original"; }
  if (defect === "rejected") a.status = "rejected";
  if (defect === "provisional") a.meta = JSON.stringify({ gate: { verdict: "PROVISIONAL" } });
  if (defect === "portrait") a.height = 1600;
  if (defect === "small") { a.width = 500; a.height = 500; }
  if (defect === "foreign") a.project_id = "autre";
  if (defect === "deleted") a.deleted_at = 1;
  if (defect === "wrong-kind") a.kind = "video";
  if (defect === "alignment") s.alignment = undefined;
  expect(slotIssues(p, s, a).length).toBeGreaterThan(0);
});
it("stock service : source, identifiant, auteur, page et licence conservés ; autre banque refusée", () => {
  const s = { ...slot, source: "pixabay" as const, aspect: "16:9" as const };
  const a = { ...asset, origin: "import", width: 1300, height: 900, meta: JSON.stringify({ gate: { verdict: "FINAL" }, stock: { source: "pixabay", id: "42", author: "Auteur test", page: "https://pixabay.com/photos/test-42/", license: "Pixabay Content License" } }) };
  expect(slotIssues({ id: "p", business: "services" }, s, a)).toEqual([]);
  const other = { ...a, meta: a.meta.replace('"pixabay"', '"pexels"') };
  expect(slotIssues({ id: "p", business: "services" }, s, other)).toContain("Média Pixabay téléchargé avec provenance et licence requis.");
});
it("vidéo hero : durée, dimensions, fichier et poster requis", () => {
  const video = { ...asset, kind: "video", duration: 5, width: 1280, height: 720, origin: "import", meta: JSON.stringify({ gate: { verdict: "FINAL" }, stock: { source: "pixabay", id: "9", page: "https://pixabay.com/videos/9/", license: "Pixabay Content License" } }) };
  const s = { ...slot, kind: "video" as const, source: "pixabay" as const, pageKey: "home", sectionKey: "hero" };
  expect(slotIssues(p, s, video)).toContain("Vidéo illisible ou poster manquant.");
  expect(slotIssues(p, { ...s, posterId: "poster" }, video)).toEqual([]);
});
it.each(["http://cdn.pixabay.com/test.jpg", "https://pixabay.com.evil.test/test.jpg", "https://user:pass@pixabay.com/test.jpg", "https://127.0.0.1/file"])("téléchargement refusé avant réseau : %s", url => {
  expect(() => assertPixabayFileUrl(url)).toThrow();
});
it("liens de fichiers issus du CDN officiel permis, sans hotlink permanent dans le contrat", () => {
  expect(() => assertPixabayFileUrl("https://cdn.pixabay.com/photo/test.jpg")).not.toThrow();
});
it.each(["products", "services"] as const)("un même fichier répété ne compte pas dix fois — %s", async business => {
  const f = await fixture(business); validatedBrand(f.pid, f.input);
  const project = loadProject(f.pid), plan = sitePlan(project);
  const aid = await syntheticAsset(f.pid, "scene");
  const slots = plan.slots.map(s => ({ ...s, assetId: aid, reviewed: true, alignment: { status: "accepted" as const, reason: "Injection de test" }, ...(s.kind === "video" ? { posterId: "poster" } : {}) }));
  const issues = finalMediaIssues(project, slots);
  expect(issues.some(s => s.includes("Doublon"))).toBe(true);
  expect(issues.some(s => s.includes("Type de fichier"))).toBe(true);
});
it("les originaux haute qualité ne sont pas proposés comme créations finales distinctes", () => {
  expect(slotIssues(p, slot, { ...asset, role: "image-original" })).toContain("Un original ou essai ne compte pas parmi les médias finaux.");
});
