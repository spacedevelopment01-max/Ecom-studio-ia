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

  it("avec l'IA d'images : une photo publicitaire par concept générée depuis la photo du client, la mise en situation garde la photo entière", async () => {
    const pid = seedImageFixture(u.id, "hightech");
    const photos: string[] = [];
    for (const f of ["casque-1", "casque-2"]) photos.push((await saveAsset({ projectId: pid, userId: u.id, data: fs.readFileSync(`scripts/demo-products/inputs/pixabay/${f}.jpg`), name: `${f}.jpg`, mime: "image/jpeg", role: "original", folderKey: "images.originals", origin: "upload", meta: { triage: { kind: "busy", plain: false } }, status: "ready" })).id);
    const p = loadProject(pid);
    const seen: any[] = [];
    const { deps } = mockAdDeps({ userId: u.id, projectId: pid, canReview: false });
    deps.canGenerate = true;
    // Produit recadré dans la photo du client (ici : la photo elle-même, l'IA de vision étant simulée).
    const asked: string[] = [];
    deps.productReference = async (id) => (asked.push(id), `ref-${id}`);
    const image = deps.image;
    deps.image = async (req) => (seen.push(req), image(req));
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 3, platforms: ["meta_feed"] }, deps));
    const generated = r.concepts.filter((c) => c.direction!.id !== "lifestyle");
    expect(generated.length).toBeGreaterThan(0);
    // Référence = la vraie photo du produit (jamais une photo d'univers sans le produit).
    expect(seen.length).toBeGreaterThan(0);
    expect(asked).toEqual([photos[0]]);
    for (const req of seen) expect(req.references).toEqual([`ref-${photos[0]}`]);
    const life = r.concepts.find((c) => c.direction!.id === "lifestyle");
    if (life) {
      const o = r.outcomes.find((x) => x.conceptId === life.id && x.assetId)!;
      expect(photos).toContain(getAsset(o.assetId!)!.source_asset_id);
    }
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

describe("consigne de la photo publicitaire (produit réel en référence)", () => {
  it("reproduit le produit, garde la zone de texte, sans texte ni personne", async () => {
    const { productScenePrompt } = await import("@/lib/ai/media-providers");
    const p = productScenePrompt({ prompt: "casque sur une pierre", aspect: "2:3", textZone: "à gauche du cadre" });
    expect(p).toContain("le reproduire exactement");
    // Produit entier exigé (règle du propriétaire : ex. bracelet complet d'une montre).
    expect(p).toContain("Le produit ENTIER est dans le cadre");
    expect(p).toContain("(surface unie) à gauche du cadre");
    expect(p).toContain("Scène sans aucune présence humaine");
    // Aucune mention d'un texte à ajouter (essai réel : elle faisait écrire un faux texte).
    expect(p).not.toMatch(/titre|texte ajouté/);
    expect(p).toContain("Format 4:5");
    // Photo du client portée par une personne : seul le produit est repris.
    expect(p).toContain("ne reprendre que le produit lui-même");
    expect(p).toContain("Ne jamais écrire sur le produit un nom de marque");
  });
});

describe("contrôle de fidélité du produit (photos générées)", () => {
  it("juge ce que la référence montre, sans refuser un détail caché ou non décrit", async () => {
    const { REVIEW_SYSTEM } = await import("@/lib/image-v2/quality");
    const { AD_REVIEW_SYSTEM } = await import("@/lib/ads-v2/quality");
    expect(REVIEW_SYSTEM).toContain("ce que la référence MONTRE");
    expect(REVIEW_SYSTEM).toContain("autre couleur, autre forme");
    expect(AD_REVIEW_SYSTEM).toContain("Le produit réel est celui des photos du client");
  });
});

describe("coût et sévérité des photos publicitaires", () => {
  it("publicités en qualité « medium » par défaut, seuils du contrôle baissés d'un cran", async () => {
    const { imageQuality, openaiImageMax } = await import("@/lib/ai/media-providers");
    const { POLICIES } = await import("@/lib/quality/policies");
    expect(imageQuality("ad_visual", "high")).toBe("medium");
    expect(imageQuality("logo", "high")).toBe("high");
    expect(POLICIES.image_v2.final).toBe(7);
    expect(POLICIES.image_v2.criteriaFloors?.fidelity).toBe(7);
    expect(POLICIES.ad_v2.final).toBe(7);
    expect(typeof openaiImageMax).toBe("function");
  });
});

describe("création correcte mais perfectible", () => {
  it("essais épuisés sans défaut grave (note ≥ 6) : gardée « à améliorer », jamais jetée", async () => {
    const { createUser } = await import("@/lib/auth");
    const { runWithLang } = await import("@/lib/i18n-server");
    const { runAdEngineV2 } = await import("@/lib/ads-v2/engine");
    const { getAsset } = await import("@/lib/library");
    const { seedImageFixture } = await import("./image-v2-fixtures");
    const { mockAdDeps, adReview } = await import("./ads-v2-mock");
    const u = await createUser(`garde-${Date.now()}@test.fr`, "motdepasse-test", "G");
    const pid = seedImageFixture(u.id, "hightech");
    const { deps } = mockAdDeps({ userId: u.id, projectId: pid, review: () => adReview(6.3, { generic: true, issues: ["accroche banale"], fix: { target: "hook", instruction: "accroche plus précise" } }) });
    const r = await runWithLang({ ui: "fr", content: "fr" }, () => runAdEngineV2(null, pid, { count: 1, platforms: ["meta_story"] }, deps));
    expect(r.outcomes[0].verdict).toBe("PROVISIONAL");
    expect(getAsset(r.outcomes[0].assetId!)!.status).toBe("review");
  }, 240_000);
});

describe("une seule image payante par création", () => {
  it("le contrôle demande un autre visuel : la photo générée (payée) n'est pas remplacée par une autre photo payée", async () => {
    const { createUser } = await import("@/lib/auth");
    const { runWithLang } = await import("@/lib/i18n-server");
    const { runAdEngineV2 } = await import("@/lib/ads-v2/engine");
    const { saveAsset } = await import("@/lib/library");
    const { seedImageFixture } = await import("./image-v2-fixtures");
    const { mockAdDeps, adReview } = await import("./ads-v2-mock");
    const u = await createUser(`unepaye-${Date.now()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "saas");
    const { deps } = mockAdDeps({ userId: u.id, projectId: pid, review: () => adReview(6.3, { issues: ["image banale"], fix: { target: "visual", instruction: "image plus forte" } }) });
    let paid = 0;
    deps.image = async () => {
      paid++;
      const a = await saveAsset({ projectId: pid, userId: u.id, data: fs.readFileSync("scripts/demo-products/inputs/pixabay/cafe-1.jpg"), name: "gen.jpg", mime: "image/jpeg", role: "scene", origin: "generated", status: "review" });
      return { assetId: a.id, data: fs.readFileSync("scripts/demo-products/inputs/pixabay/cafe-1.jpg") };
    };
    await runWithLang({ ui: "fr", content: "fr" }, () => runAdEngineV2(null, pid, { count: 1, platforms: ["meta_story"] }, deps));
    expect(paid).toBe(1);
  }, 240_000);
});

describe("nombre d'images et formats choisis par le client", () => {
  it("2 images au format 4:5 : 2 publications, 2 photos payées ; les autres formats reprennent la même photo", async () => {
    const { createUser } = await import("@/lib/auth");
    const { runWithLang } = await import("@/lib/i18n-server");
    const { runAdEngineV2 } = await import("@/lib/ads-v2/engine");
    const { saveAsset } = await import("@/lib/library");
    const { seedImageFixture } = await import("./image-v2-fixtures");
    const { mockAdDeps } = await import("./ads-v2-mock");
    const { CREATION_AI_ADS } = await import("@/lib/engine/pipeline");
    const u = await createUser(`formats-${Date.now()}@test.fr`, "motdepasse-test", "F");
    const pid = seedImageFixture(u.id, "saas");
    const { deps } = mockAdDeps({ userId: u.id, projectId: pid });
    deps.canGenerate = true;
    let paid = 0;
    const asks: any[] = [];
    deps.image = async (req) => {
      paid++;
      asks.push(req);
      const data = fs.readFileSync("scripts/demo-products/inputs/pixabay/cafe-1.jpg");
      const a = await saveAsset({ projectId: pid, userId: u.id, data, name: "gen.jpg", mime: "image/jpeg", role: "scene", origin: "generated", status: "review" });
      return { assetId: a.id, data };
    };
    const fr = (fn: () => Promise<any>) => runWithLang({ ui: "fr", content: "fr" }, fn);
    const r = await fr(() => runAdEngineV2(null, pid, { count: 2, platforms: ["meta_feed"], aspects: ["4:5"] }, deps));
    expect(r.outcomes.map((o: any) => o.aspect)).toEqual(["4:5", "4:5"]);
    expect(paid).toBe(2);
    // Publicité générée par l'IA : jamais de photo de banque (Pixabay) demandée.
    expect(asks.every((q) => q.noStock === true)).toBe(true);
    // Tous les formats d'une campagne : une seule photo payée par publication.
    paid = 0;
    const r2 = await fr(() => runAdEngineV2(null, pid, { count: 1, platforms: ["meta_feed", "meta_story"], objective: "autre" }, deps));
    expect(new Set(r2.outcomes.map((o: any) => o.aspect)).size).toBe(3);
    expect(paid).toBe(1);
    expect(CREATION_AI_ADS).toBe(5);
  }, 240_000);
});
