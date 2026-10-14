/**
 * Moteur publicitaire V3 (outils simulés : aucun appel réel, aucune dépense) : une direction artistique par
 * publicité — concepts différents, prise de vue transmise à l'image, mise en page de la bibliothèque qui garde la
 * photo entière, photo du client différente par concept, pictogrammes au trait, diversité vérifiée sur les rendus.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Publicités V3 : direction artistique par publicité", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { saveAsset, getAsset } = await import("@/lib/library");
  const { runAdEngineV2 } = await import("@/lib/ads-v2/engine");
  const { planDirections, templateFor } = await import("@/lib/ads-v2/direction");
  const { templateById } = await import("@/lib/ads-v2/library");
  const { featureIcon } = await import("@/lib/ads-v2/feature-icons");
  const { latestDoc } = await import("@/lib/ad-doc/store");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { mockAdDeps } = await import("./ads-v2-mock");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const u = await createUser(`pubv3-${Date.now()}@test.fr`, "motdepasse-test", "V");

  it("chaque angle reçoit un concept différent ; chaque concept une mise en page différente qui garde la photo entière", () => {
    const angles = (["detail", "demonstration", "origin_craft", "proof", "offer", "gift"] as const).map((type, k) => ({ id: `a${k}`, type, material: "x", why: "", lever: "" }));
    const dirs = planDirections(angles as any, "products", true);
    expect(new Set(dirs.map((d) => d.id)).size).toBe(6);
    const taken = new Set<string>();
    const layouts = dirs.map((d) => templateFor(d, taken, true));
    expect(new Set(layouts).size).toBe(6);
    for (const l of layouts) {
      const t = templateById(l.slice(4))!;
      expect(t, l).toBeTruthy();
      expect(t.family, l).toBe("photo");
      expect(t.coversSubject, l).toBeFalsy();
    }
    // Sans atouts confirmés : aucun concept ni mise en page « rangée / carte d'atouts ».
    const bare = planDirections(angles.slice(0, 3) as any, "products", false);
    expect(bare.some((d) => d.needsFeatures)).toBe(false);
  });

  it("pictogramme au trait trouvé pour un atout, neutre sinon (jamais d'atout inventé)", () => {
    expect(featureIcon("Supra-auriculaire")?.name).toBe("ear");
    expect(featureIcon("Saponifié à froid")?.name).toBe("bubble");
    expect(featureIcon("zzz")?.name).toBeTruthy();
  });

  it("casque montré seulement sur les photos du client : 3 publicités, 3 concepts, 3 mises en page, 3 photos différentes", async () => {
    const pid = seedImageFixture(u.id, "hightech");
    const photos: string[] = [];
    for (const f of ["casque-1", "casque-2", "casque-3"]) photos.push((await saveAsset({ projectId: pid, userId: u.id, data: fs.readFileSync(`scripts/demo-products/inputs/pixabay/${f}.jpg`), name: `${f}.jpg`, mime: "image/jpeg", role: "original", folderKey: "images.originals", origin: "upload", meta: { triage: { kind: "busy", plain: false } }, status: "ready" })).id);
    const p = loadProject(pid);
    const { deps, log } = mockAdDeps({ userId: u.id, projectId: pid, canReview: false });
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 3, platforms: ["meta_feed"] }, deps));
    expect(r.concepts.length).toBe(3);
    expect(new Set(r.concepts.map((c) => c.direction!.id)).size).toBe(3);
    // Aucune image demandée : les photos du client portent les publicités (rien de payé, rien d'inventé).
    expect(log.images.length).toBe(0);
    const main = r.outcomes.filter((o) => o.aspect === "1:1" || o.aspect === r.outcomes[0].aspect);
    const used = new Set<string>();
    const sources = new Set<string>();
    for (const c of r.concepts) {
      const o = r.outcomes.find((x) => x.conceptId === c.id && x.assetId)!;
      const meta = JSON.parse(getAsset(o.assetId!)!.meta as any);
      expect(meta.adV2.layout).toMatch(/^tpl:/);
      used.add(meta.adV2.layout);
      sources.add(getAsset(o.assetId!)!.source_asset_id!);
    }
    expect(used.size).toBe(3);
    expect([...sources].every((s) => photos.includes(s))).toBe(true);
    expect(sources.size).toBe(3);
    expect(r.diversity).toEqual([]);
    expect(main.length).toBeGreaterThan(0);
  }, 240_000);

  it("prise de vue du concept transmise au moteur d'images (cadrage, lumière, zone de texte)", async () => {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const seen: any[] = [];
    const { deps } = mockAdDeps({ userId: u.id, projectId: p.id, canReview: false });
    const image = deps.image;
    deps.image = async (req) => (seen.push(req), image(req));
    await fr(() => runAdEngineV2(null, p.id, { count: 2, platforms: ["meta_feed"] }, deps));
    expect(seen.length).toBeGreaterThan(0);
    for (const req of seen) {
      expect(req.shot?.composition, JSON.stringify(req)).toBeTruthy();
      expect(req.shot?.lighting).toBeTruthy();
    }
    expect(new Set(seen.map((x) => x.shot.composition)).size).toBeGreaterThan(1);
  }, 240_000);
});

describe("titre d'affiche", () => {
  it("majuscule initiale ajoutée (« partout avec vous »), rien d'autre changé", async () => {
    const { noPlaceholders } = await import("@/lib/ads-v2/compose");
    expect(noPlaceholders({ headline: "partout avec vous", brand: "Sonore" } as any).headline).toBe("Partout avec vous");
    expect(noPlaceholders({ headline: "-20 % sur le casque", brand: "Sonore" } as any).headline).toBe("-20 % sur le casque");
  });
});
