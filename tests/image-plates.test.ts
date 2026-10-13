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

  it("sans contrôle visuel (forfait Découverte) : le produit n'est jamais collé sur une photo libre", async () => {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const cutId = await seedCutout(u.id, p.id);
    const prov = mockProvider("pixabay", () => [candidate("deco3", "empty stone surface blurred background", { source: "pixabay" })]);
    const { deps, log } = mockDeps({ providers: [prov], reference: cut, canReview: false, canGenerate: false });
    const r = await fr(() => runImageEngineV2(null, p.id, { kind: "lifestyle", support: "ad", aspect: "4:5", references: [cutId] }, deps));
    expect(log.reviews).toEqual([]);
    expect(log.generations).toEqual([]);
    expect(log.downloads).not.toContain("deco3");
    expect(r.outcomes[0].verdict).not.toBe("FINAL");
    expect(r.outcomes[0].assetId).toBeNull();
  });

  it("produit posé : les restes presque transparents du détourage n'impriment aucun rectangle sur le décor", async () => {
    const { compositeProduct } = await import("@/lib/image-v2/deps");
    // Détourage avec une bande voilée (alpha 20) sur toute sa largeur, comme certains détourages réels.
    const w = 400, h = 300, raw = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const body = x > 150 && x < 250 && y > 60 && y < 220;
      raw[i] = raw[i + 1] = raw[i + 2] = body ? 60 : 255;
      raw[i + 3] = body ? 255 : y > 240 ? 20 : 0;
    }
    const cutout = await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    const plate = await sharp({ create: { width: 1600, height: 900, channels: 3, background: { r: 200, g: 180, b: 150 } } }).jpeg().toBuffer();
    const out = await compositeProduct(plate, cutout, "16:9", "none");
    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    // Dans la bande voilée du détourage, loin du produit et au-dessus de son ombre : couleur du décor intacte.
    const at = (x: number, y: number) => { const i = (y * info.width + x) * info.channels; return Math.abs(data[i] - 200) + Math.abs(data[i + 1] - 180) + Math.abs(data[i + 2] - 150); };
    const maxDiff = Math.max(at(450, 690), at(1150, 690), at(500, 700), at(1100, 700));
    expect(maxDiff).toBeLessThan(8);
  });
});

