/**
 * Images du produit réel : décor vide libre de droits (Pixabay d'abord) + produit réel posé par le studio, avant toute
 * génération ; jamais de retouche par masque (second produit redessiné). Outils simulés : aucun appel réel.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Décors libres de droits pour les images du produit", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { getAsset } = await import("@/lib/library");
  const { runImageEngineV2 } = await import("@/lib/image-v2/engine");
  const { buildBrief } = await import("@/lib/image-v2/brief");
  const { plateQueries, scorePlate } = await import("@/lib/image-v2/plates");
  const { stagesFor } = await import("@/lib/image-v2/intent");
  const { STOCK_PROVIDERS } = await import("@/lib/image-v2/sources");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { candidate, mockDeps, mockProvider, review } = await import("./image-v2-mock");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const u = await createUser(`plates-${Date.now()}@test.fr`, "motdepasse-test", "P");
  const cut = await sharp({ create: { width: 300, height: 600, channels: 4, background: { r: 199, g: 123, b: 48, alpha: 1 } } }).png().toBuffer();

  it("Pixabay est la première banque interrogée ; les images du produit passent par un décor libre avant la génération", () => {
    expect(STOCK_PROVIDERS[0].id).toBe("pixabay");
    for (const k of ["lifestyle", "ad_image", "product_image", "usage_scene"] as const) {
      const st = stagesFor(k);
      expect(st.indexOf("plate"), k).toBeGreaterThan(-1);
      expect(st.indexOf("plate"), k).toBeLessThan(st.indexOf("generate"));
    }
  });

  it("choix gratuit du décor : surface libre retenue, personne ou autre objet au premier plan écartés", () => {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const brief = buildBrief(p, { kind: "lifestyle", support: "ad", aspect: "1:1", references: ["x"] });
    expect(plateQueries(p, brief).every((q) => /empty|podium|background/.test(q))).toBe(true);
    const good = scorePlate(candidate("a", "empty wooden table blurred background bokeh"), brief);
    const person = scorePlate(candidate("b", "woman sitting at a wooden table"), brief);
    const rival = scorePlate(candidate("c", "perfume bottle on marble table"), brief);
    expect(good.metadataMatch).toBe(true);
    expect(good.relevance).toBeGreaterThan(rival.relevance);
    expect(person.offTopicLikely).toBe(true);
    expect(rival.metadataMatch).toBe(false);
  });

  it("décor libre + produit réel : image retenue sans aucune génération, crédit et mention honnête gardés", async () => {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const cutId = await seedCutout(u.id, p.id);
    const prov = mockProvider("pixabay", () => [candidate("deco1", "empty marble table surface background", { source: "pixabay" }), candidate("gens", "woman applying cream", { source: "pixabay" })]);
    const { deps, log } = mockDeps({ providers: [prov], reference: cut, reviewFor: () => review(8.6) });
    const r = await fr(() => runImageEngineV2(null, p.id, { kind: "lifestyle", support: "ad", aspect: "1:1", references: [cutId], textZone: "left" }, deps));
    expect(r.outcomes[0].verdict).toBe("FINAL");
    expect(r.outcomes[0].origin).toBe("stock");
    expect(log.generations).toEqual([]);
    expect(log.downloads).toEqual(["deco1"]);
    const a = getAsset(r.outcomes[0].assetId!)!;
    const meta = JSON.parse(a.meta as any);
    expect(meta.stock.source).toBe("pixabay");
    expect(meta.recipe).toMatch(/produit réel posé par le studio/);
    expect(meta.imageV2.productRef).toBe(cutId);
  });

  it("décor refusé à la relecture (produit mal intégré) : génération d'un décor vide en dernier recours, jamais deux fois le même décor", async () => {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const cutId = await seedCutout(u.id, p.id);
    const prov = mockProvider("pixabay", () => [candidate("deco2", "empty wooden tabletop background", { source: "pixabay" })]);
    const { deps, log } = mockDeps({ providers: [prov], reference: cut, reviewFor: (k) => (k === "deco2" ? review(4, { issues: ["produit qui flotte"] }, { aesthetics: 3 }) : review(8.7)) });
    const r = await fr(() => runImageEngineV2(null, p.id, { kind: "lifestyle", support: "ad", aspect: "1:1", references: [cutId] }, deps));
    expect(log.generations.length).toBeGreaterThan(0);
    expect(r.outcomes[0].origin).toBe("generated");
    // Même demande à nouveau : le décor refusé n'est ni retéléchargé ni relu.
    const before = log.downloads.length;
    await fr(() => runImageEngineV2(null, p.id, { kind: "lifestyle", support: "ad", aspect: "1:1", references: [cutId] }, deps));
    expect(log.downloads.slice(before)).not.toContain("deco2");
  });

  it("sans IA (forfait Découverte) : décor libre bien décrit + produit réel, gratuit, jamais validé comme définitif", async () => {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const cutId = await seedCutout(u.id, p.id);
    const prov = mockProvider("pixabay", () => [candidate("deco3", "empty stone surface blurred background", { source: "pixabay" })]);
    const { deps, log } = mockDeps({ providers: [prov], reference: cut, canReview: false, canGenerate: false });
    const r = await fr(() => runImageEngineV2(null, p.id, { kind: "lifestyle", support: "ad", aspect: "4:5", references: [cutId] }, deps));
    expect(log.reviews).toEqual([]);
    expect(log.generations).toEqual([]);
    expect(r.outcomes[0].verdict).not.toBe("FINAL");
  });
});
