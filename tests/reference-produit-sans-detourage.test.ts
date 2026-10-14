/**
 * Détourage refusé (cas réel : la gourde Cime, « le bas touche le bord ») : les images du produit ne sont plus
 * bloquées, la photo d'origine sert de référence si c'est un packshot propre. Une photo où le produit est porté
 * (personne, décor) n'est jamais prise comme référence.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Référence du produit sans détourage validé", async () => {
  const { createUser } = await import("@/lib/auth");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const { saveAsset } = await import("@/lib/library");
  const { run } = await import("@/lib/db");
  const { productReferences } = await import("@/lib/image-v2/engine");
  const jpg = () => sharp({ create: { width: 600, height: 750, channels: 3, background: "#d8d8d8" } }).jpeg().toBuffer();

  const setup = async () => {
    const u = await createUser(`ref${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.fr`, "motdepasse-test", "R");
    const pid = await seedThemeScenario(u.id, "cosmetic");
    run("UPDATE assets SET deleted_at = ? WHERE project_id = ? AND kind = 'image'", Date.now(), pid);
    return { u, pid };
  };

  it("détourage refusé + packshot propre : la photo d'origine devient la référence", async () => {
    const { u, pid } = await setup();
    await saveAsset({ projectId: pid, userId: u.id, data: await jpg(), name: "detour.png", mime: "image/png", role: "cutout", folderKey: "images.cutouts", origin: "generated", status: "rejected", meta: {} });
    const orig = await saveAsset({ projectId: pid, userId: u.id, data: await jpg(), name: "gourde.jpg", mime: "image/jpeg", role: "original", folderKey: "product", origin: "upload", meta: { triage: { plain: 1, kind: "packshot" } } });
    expect(productReferences(pid)).toEqual([orig.id]);
  });

  it("photo d'origine en situation (produit porté) : aucune référence, rien n'est recopié", async () => {
    const { u, pid } = await setup();
    await saveAsset({ projectId: pid, userId: u.id, data: await jpg(), name: "porte.jpg", mime: "image/jpeg", role: "original", folderKey: "product", origin: "upload", meta: { triage: { plain: 0, kind: "situation" } } });
    expect(productReferences(pid)).toEqual([]);
  });

  it("produit porté : le produit recadré par le module publicités sert de référence", async () => {
    const { u, pid } = await setup();
    await saveAsset({ projectId: pid, userId: u.id, data: await jpg(), name: "porte.jpg", mime: "image/jpeg", role: "lifestyle", folderKey: "product", origin: "upload", meta: { triage: { plain: 0, kind: "situation" } } });
    const ref = await saveAsset({ projectId: pid, userId: u.id, data: await jpg(), name: "reference-produit.jpg", mime: "image/jpeg", role: "product-ref", folderKey: "images", origin: "generated", status: "ready", meta: {} });
    expect(productReferences(pid)).toEqual([ref.id]);
  });

  it("détourage validé : il reste la référence prioritaire", async () => {
    const { u, pid } = await setup();
    await saveAsset({ projectId: pid, userId: u.id, data: await jpg(), name: "gourde.jpg", mime: "image/jpeg", role: "original", folderKey: "product", origin: "upload", meta: { triage: { plain: 1, kind: "packshot" } } });
    const cut = await saveAsset({ projectId: pid, userId: u.id, data: await jpg(), name: "detour.png", mime: "image/png", role: "cutout", folderKey: "images.cutouts", origin: "generated", status: "approved", meta: { best: true } });
    expect(productReferences(pid)).toEqual([cut.id]);
  });
});
