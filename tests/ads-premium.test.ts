import { grantProjectPlan } from "./communication-choice-fixture";
/**
 * Publicités au niveau agence (outils simulés : aucun appel réel, aucune dépense) : direction artistique propre au
 * projet, compositions différentes d'une création à l'autre, chacune RECOMPOSÉE par format (1:1, 4:5, 9:16, 1,91:1),
 * produit réel mis en scène (photo de référence) ou posé, ligne secondaire de faits confirmés, logo sur tous les
 * formats, textes lisibles et dans les marges, recomposition à un autre format dans l'éditeur.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Publicités premium — direction artistique et formats", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { composeAd, buildAdDocument, relayoutDoc } = await import("@/lib/ads-v2/compose");
  const { adArt, layoutForConcept, textZoneFor, AD_LAYOUTS, toAdLayout } = await import("@/lib/ads-v2/art");
  const { runAdEngineV2, sublineFor } = await import("@/lib/ads-v2/engine");
  const { formatsFor } = await import("@/lib/ads-v2/platforms");
  const { adInsight } = await import("@/lib/ads-v2/insight");
  const { claimIssues, claimCodes } = await import("@/lib/ads-v2/claims");
  const { brandTypo, palette } = await import("@/lib/engine/images");
  const { IMAGE_FIXTURES, seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { mockImage } = await import("./image-v2-mock");
  const { mockAdDeps } = await import("./ads-v2-mock");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const u = await createUser(`adsp-${Date.now()}@test.fr`, "motdepasse-test", "P");
  const fresh = (k: (typeof IMAGE_FIXTURES)[number]) => {const pid=seedImageFixture(u.id,k);grantProjectPlan(pid,"dominer");return loadProject(pid);};
  const F = [
    { platform: "meta_feed", aspect: "1:1", width: 1080, height: 1080, label: "1:1", safe: { top: 0.06, bottom: 0.08, side: 0.06 } },
    { platform: "meta_feed", aspect: "4:5", width: 1080, height: 1350, label: "4:5", safe: { top: 0.06, bottom: 0.08, side: 0.06 } },
    { platform: "meta_story", aspect: "9:16", width: 1080, height: 1920, label: "9:16", safe: { top: 0.14, bottom: 0.2, side: 0.06 } },
    { platform: "google_display", aspect: "1.91:1", width: 1200, height: 628, label: "1.91:1", safe: { top: 0.05, bottom: 0.05, side: 0.05 } },
  ] as const;

  it("direction artistique propre au projet : rotation de compositions différentes, anciennes mises en page reconnues", () => {
    const p = fresh("cosmetic");
    const art = adArt(p, brandTypo(p));
    expect(art.cycle.length).toBeGreaterThanOrEqual(4);
    const three = [0, 1, 2].map((k) => layoutForConcept(art, k));
    expect(new Set(three).size).toBe(3); // trois créations, trois compositions
    expect(art.headingWeight).toBeGreaterThanOrEqual(500);
    expect(toAdLayout("hero_center")).toBe("poster");
    expect(toAdLayout("split")).toBe("panel");
    expect(textZoneFor("editorial", 1920, 1080)).toBe("left");
    expect(textZoneFor("poster", 1080, 1350)).toBe("top");
    expect(textZoneFor("panel", 1080, 1080)).toBe("none");
  });

  it("chaque composition est refaite pour chaque format : textes lisibles, dans les marges, sans chevauchement, logo présent (story comprise)", async () => {
    const p = fresh("cosmetic");
    const photo = await mockImage(3, 1600, 1600);
    const logo = await sharp({ create: { width: 400, height: 120, channels: 4, background: { r: 30, g: 30, b: 30, alpha: 1 } } }).png().toBuffer();
    const cut = await sharp({ create: { width: 300, height: 600, channels: 4, background: { r: 199, g: 123, b: 48, alpha: 1 } } }).png().toBuffer();
    const art = adArt(p, brandTypo(p));
    for (const layout of AD_LAYOUTS) {
      const sizes = new Set<string>();
      for (const f of F) {
        const r = await fr(() => composeAd({ format: f as never, layout, palette: palette(p), typo: brandTypo(p), art, brand: "Sérum Éclat", headline: "Le rituel qui change tout.", subline: "Sérum visage • Texture légère", cta: "Découvrir", background: layout === "typographic" ? null : photo, product: layout === "typographic" ? cut : null, logo }));
        const m = await sharp(r.jpg).metadata();
        expect([m.width, m.height], `${layout} ${f.aspect}`).toEqual([f.width, f.height]);
        expect(r.metrics.textContrast, `${layout} ${f.aspect}`).toBeGreaterThanOrEqual(4.5);
        expect(r.metrics.safeOverflow, `${layout} ${f.aspect}`).toBe(false);
        expect(r.metrics.textOverlap, `${layout} ${f.aspect}`).toBe(false);
        expect(r.metrics.minFontPx, `${layout} ${f.aspect}`).toBeGreaterThanOrEqual(22);
        expect(r.metrics.headlineLines, `${layout} ${f.aspect}`).toBeLessThanOrEqual(4);
        const roles = r.doc.layers.map((l) => l.role);
        expect(roles, `${layout} ${f.aspect}`).toEqual(expect.arrayContaining(["title", "subtitle", "cta", "logo"]));
        // Pas un recadrage : la colonne de texte change de forme avec le format.
        const t = r.doc.layers.find((l) => l.role === "title")!;
        sizes.add(`${Math.round(t.w / f.width * 100)}-${Math.round(t.y / f.height * 100)}`);
        // L'aplat « band » ne se pose plus sur une photo (il en masquait le sujet) : composition éditoriale.
        expect(r.doc.meta.recipe?.layout).toBe(layout === "band" ? "editorial" : layout);
      }
      expect(sizes.size, layout).toBeGreaterThan(1);
    }
  });

  it("produit réel : d'abord une mise en scène avec la photo de référence ; le détourage n'est pas reposé par-dessus", async () => {
    const p = fresh("cosmetic");
    const cutId = await seedCutout(u.id, p.id);
    const cut = await sharp({ create: { width: 300, height: 600, channels: 4, background: { r: 199, g: 123, b: 48, alpha: 1 } } }).png().toBuffer();
    const { deps, log } = mockAdDeps({ userId: u.id, projectId: p.id, cutout: { id: cutId, data: cut } });
    const asked: any[] = [];
    const image = deps.image;
    deps.image = async (req) => (asked.push(req), image(req));
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 3, platforms: ["meta_feed", "meta_story"] }, deps));
    expect(r.outcomes.length).toBe(9);
    expect(asked.every((x) => x.kind === "lifestyle" && x.references?.[0] === cutId && x.textZone)).toBe(true);
    expect(log.images.every((x) => x.kind !== "product_image" && x.kind !== "packshot")).toBe(true);
    // Trois créations, trois compositions différentes.
    expect(new Set(r.concepts.map((c) => c.visual.layout)).size).toBe(3);
  });

  it("sans mise en scène possible (aucune génération) : jamais de décor d'univers sous le produit, affiche « produit héros »", async () => {
    const p = fresh("cosmetic");
    const cutId = await seedCutout(u.id, p.id);
    const cut = await sharp({ create: { width: 300, height: 600, channels: 4, background: { r: 199, g: 123, b: 48, alpha: 1 } } }).png().toBuffer();
    const { deps } = mockAdDeps({ userId: u.id, projectId: p.id, cutout: { id: cutId, data: cut } });
    const image = deps.image;
    const kinds: string[] = [];
    deps.image = async (req) => (kinds.push(String(req.kind)), req.kind === "lifestyle" ? null : image(req));
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 2, platforms: ["meta_feed"] }, deps));
    expect(kinds).toContain("lifestyle");
    expect(kinds).not.toContain("ambiance");
    expect(r.outcomes.length).toBeGreaterThan(0);
    const { all } = await import("@/lib/db");
    const layouts = all<{ l: string }>("SELECT json_extract(meta, '$.adV2.layout') l FROM assets WHERE project_id = ? AND role = 'ad'", p.id).map((x) => x.l);
    expect(layouts.length).toBeGreaterThan(0);
    expect(layouts.every((l) => /^tpl:(light-stage|sunlit-stone|color-room)$/.test(l))).toBe(true);
  });

  it("textes en français : les usages d'une famille de produits ne reprennent jamais le vocabulaire anglais des banques d'images", async () => {
    const i = await fr(() => adInsight(fresh("cosmetic")));
    expect(i.usage.length).toBeGreaterThan(0);
    expect(i.usage.join(" ")).not.toMatch(/\b(hands|applying|morning|swatch|skincare)\b/i);
  });

  it("ligne secondaire : faits confirmés (prestations réelles) ; une promesse non confirmée y est refusée", () => {
    const p = fresh("artisan");
    const i = adInsight(p);
    const line = sublineFor(i, { hook: "Des murs nets.", primary: "x", headline: "", description: "", cta: "Demander un devis", hookB: null });
    expect(line).toBeTruthy();
    expect(line).toMatch(/•|[A-Za-zÀ-ÿ]/);
    const bad = claimIssues([{ id: "a", copy: { hook: "Des murs nets.", primary: "Des murs nets.", headline: "Plâtrerie", description: "Atelier", cta: "Demander un devis", hookB: null, sub: "Le meilleur artisan de la ville" } }], p, i, { hookWords: 10, primaryFirstLine: 125, headline: 40, description: 30 });
    expect(claimCodes(bad.get("a")!)).toContain("unverified_claim");
  });

  it("services : formats carré, portrait et paysage 1,91:1 (Google) ; composition panneau ou cadre possible", async () => {
    const p = fresh("artisan");
    expect(formatsFor(["google_display"]).map((f) => f.aspect)).toEqual(["1:1", "1.91:1"]);
    const { deps } = mockAdDeps({ userId: u.id, projectId: p.id });
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 3 }, deps));
    expect(r.outcomes.some((o) => o.aspect === "1.91:1")).toBe(true);
    expect(r.concepts.every((c) => c.visual.kind === "trade_photo")).toBe(true);
  });

  it("éditeur : un autre format RECOMPOSE la création (textes du client gardés) ; un calque ajouté à la main → adaptation géométrique", async () => {
    const p = fresh("cosmetic");
    const photo = await mockImage(9, 1600, 1600);
    const art = adArt(p, brandTypo(p));
    const { doc } = await fr(() => buildAdDocument({ format: F[1] as never, layout: "editorial", palette: palette(p), typo: brandTypo(p), art, brand: "Sérum Éclat", headline: "Le rituel qui change tout.", subline: "Sérum visage", cta: "Découvrir", background: photo, product: null, ids: { background: "photo-1" } }));
    const edited = { ...doc, layers: doc.layers.map((l) => (l.id === "title" && l.kind === "text" ? { ...l, text: "Mon titre à moi." } : l)) };
    const next = await fr(() => relayoutDoc(edited, F[3] as never, (id) => (id === "photo-1" ? photo : null)));
    expect(next).not.toBeNull();
    expect([next!.width, next!.height]).toEqual([1200, 628]);
    const t = next!.layers.find((l) => l.id === "title");
    expect(t && t.kind === "text" && t.text).toBe("Mon titre à moi.");
    expect(next!.meta.recipe?.layout).toBe("editorial");
    const withExtra = { ...doc, layers: [...doc.layers, { ...doc.layers.find((l) => l.id === "title")!, id: "mon-calque" }] };
    expect(await fr(() => relayoutDoc(withExtra as never, F[3] as never, () => photo))).toBeNull();
  });
});
