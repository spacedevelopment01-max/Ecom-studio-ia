/**
 * Phase 5A — Image & Search Engine V2 (fournisseurs simulés : aucun appel réel, aucune dépense).
 * Une image simulée ne prouve pas la qualité visuelle : ces tests vérifient les DÉCISIONS du moteur.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Phase 5A — Image & Search Engine V2", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, id, json, now, one, run } = await import("@/lib/db");
  const { loadProject, remember } = await import("@/lib/projects");
  const { JobContext } = await import("@/lib/jobs");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { getAsset } = await import("@/lib/library");
  const { isAutoUsable } = await import("@/lib/quality/usable");
  const { resolveProductCategory, productIdentity } = await import("@/lib/image-v2/categories");
  const { buildBrief, briefHash, generationPrompt } = await import("@/lib/image-v2/brief");
  const { visualIntent, stagesFor } = await import("@/lib/image-v2/intent");
  const { scoreCandidate, searchCandidates, shortlist } = await import("@/lib/image-v2/search");
  const { FORMATS, defaultAspect, fitsFormat, frameTo, nearestAspect } = await import("@/lib/image-v2/formats");
  const { gateImage, localImageCheck, dHash, hamming } = await import("@/lib/image-v2/quality");
  const { openverseLicense, licenseUsable, STOCK_PROVIDERS, creditLine, PIXABAY_LICENSE } = await import("@/lib/image-v2/sources");
  const { runImageEngineV2, targetedCorrection } = await import("@/lib/image-v2/engine");
  const { reusableFor } = await import("@/lib/image-v2/assets");
  const { compositeProduct, realImageDeps } = await import("@/lib/image-v2/deps");
  const { brainSnapshot } = await import("@/lib/brain/snapshot");
  const { brainItems } = await import("@/lib/brain/views");
  const { CostCapReached, assertUnderCostCap, recordCall } = await import("@/lib/ai/trace");
  const { ACTION_STEPS, STEP_DELIVERABLES } = await import("@/lib/orchestrator/execute");
  const { intentsFromAction } = await import("@/lib/orchestrator/intent");
  const { buildPlan } = await import("@/lib/orchestrator/planner");
  const { POLICIES } = await import("@/lib/quality/policies");
  const { decide } = await import("@/lib/quality/gate");
  const { IMAGE_FIXTURES, seedImageFixture, seedCutout, fixtureRequests } = await import("./image-v2-fixtures");
  const { candidate, mockDeps, mockImage, mockProvider, review } = await import("./image-v2-mock");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const u = await createUser(`img2-${Date.now()}@test.fr`, "motdepasse-test", "I");
  const fresh = (kind: (typeof IMAGE_FIXTURES)[number]) => loadProject(seedImageFixture(u.id, kind));
  const job = (projectId: string) => {
    const jid = id();
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, projectId, "image.v2", "test", "{}", "running", now(), now(), now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };

  // ------------------------------------------------------------------ compréhension

  it("métier compris (A — Sébastien Blanc) : requêtes MÉTIER + ACTION + LIEU, jamais « wall » seul", () => {
    const p = fresh("artisan");
    const b = buildBrief(p, { kind: "trade_photo", support: "site" });
    expect(b.understanding).toMatchObject({ source: "trade", confidence: "high" });
    expect(b.queries.length).toBeGreaterThanOrEqual(2);
    for (const q of b.queries) {
      expect(q.split(" ").length).toBeGreaterThanOrEqual(3);
      expect(q).not.toMatch(/^wall$/i);
    }
    expect(b.queries.join(" ")).toMatch(/plaster|drywall/);
    expect(b.queries.join(" ")).toMatch(/paint/);
    expect(b.must).toEqual(expect.arrayContaining(["plaster"]));
    expect(b.negative).toEqual(expect.arrayContaining(["bare wall", "brick wall", "stone wall"]));
    expect(b.artDirection).toBe("documentary_trade");
  });

  it("catégorie produit comprise ; repli intelligent pour une catégorie inconnue", () => {
    expect(resolveProductCategory({ category: "Sérum visage" }).id).toBe("cosmetics");
    expect(resolveProductCategory({ category: "Casque audio sans fil" }).id).toBe("tech");
    expect(resolveProductCategory({ category: "Thé vert bio" }).id).toBe("food");
    expect(resolveProductCategory({ category: "Bougie parfumée" }).id).toBe("home_decor");
    expect(resolveProductCategory({ category: "Laisse pour chien" }).id).toBe("pets");
    expect(resolveProductCategory({ category: "Logiciel SaaS" }).id).toBe("digital");
    // « the » anglais n'est pas du thé ; « cardigan » n'est pas une carte ; « earring » n'est pas une bague.
    expect(resolveProductCategory({ category: "The best widget" }).id).not.toBe("food");
    expect(resolveProductCategory({ category: "Cardigan en laine" }).id).toBe("fashion");
    const sector = resolveProductCategory({ category: "Objet mystère", sector: "sport" });
    expect(sector).toMatchObject({ id: "sport", source: "sector", labels: { fr: "Objet mystère" } });
    const generic = resolveProductCategory({ category: "Objet mystère" });
    expect(generic.source).toBe("generic");
    expect(generic.universeQueries[0]).toMatch(/Objet mystère/);
  });

  it("identité produit : seulement le confirmé et le vu ; ce qui ne s'invente pas est listé", () => {
    const p = fresh("cosmetic");
    const id2 = productIdentity(p, { hasReference: true });
    expect(id2.dimensions).toBe("30 ml");
    expect(id2.labelText).toEqual(["ÉCLAT", "30 ml"]);
    expect(id2.neverInvent).toEqual(expect.arrayContaining(["shape", "logo", "label and packaging text", "Livraison (inconnu)", "anti-âge prouvé"]));
    expect(id2.features.join(" ")).not.toMatch(/gel fluide/); // déduit, pas confirmé
  });

  it("intention visuelle locale ; une demande simple ne déclenche pas toute la chaîne", () => {
    expect(visualIntent("détourer la photo du flacon", "products").kind).toBe("cutout");
    expect(stagesFor("cutout")).toEqual(["cutout"]);
    expect(stagesFor("variation")).toEqual(["frame"]);
    expect(visualIntent("une bannière pour le site", "products")).toMatchObject({ kind: "banner", support: "banner" });
    expect(visualIntent("une publicité Instagram", "products").kind).toBe("ad_image");
    expect(visualIntent("une publication Instagram", "services")).toMatchObject({ kind: "social_image", support: "social" });
    expect(visualIntent("packshot fond blanc", "services").kind).toBe("trade_photo");
    expect(stagesFor("product_image")).not.toContain("search");
    expect(visualIntent("des images", "services")).toMatchObject({ kind: "trade_photo", confident: false });
  });

  it("direction artistique adaptée au projet, jamais uniforme ; refus du client respecté", async () => {
    const dirs = new Set(IMAGE_FIXTURES.map((k) => buildBrief(fresh(k), { kind: k === "artisan" || k === "restaurant" ? "trade_photo" : "lifestyle" }).artDirection));
    expect(dirs.size).toBeGreaterThanOrEqual(3);
    expect(buildBrief(fresh("cosmetic"), { kind: "packshot" }).artDirection).toBe("premium_photo");
    expect(buildBrief(fresh("hightech"), { kind: "ambiance" }).artDirection).toBe("tech_universe");
    const p = fresh("artisan");
    remember(p.id, { kind: "rejection", key: "image:documentary_trade", value: "reportage métier", source: "user", scope: "image" });
    const { rejectedDirections } = await import("@/lib/image-v2/direction");
    const rej = rejectedDirections(brainSnapshot(p).memory);
    expect(rej).toEqual(["documentary_trade"]);
    expect(buildBrief(p, { kind: "trade_photo" }, { rejectedDirections: rej }).artDirection).not.toBe("documentary_trade");
  });

  // ------------------------------------------------------------------ recherche et classement

  it("classement : mur nu et texture écartés ; le geste du métier retenu (le mot « wall » n'est pas interdit)", () => {
    const b = buildBrief(fresh("artisan"), { kind: "trade_photo" });
    const wall = scoreCandidate(candidate("1", "white wall, empty room"), b);
    const brick = scoreCandidate(candidate("2", "brick wall texture background"), b);
    const stone = scoreCandidate(candidate("3", "old stone wall"), b);
    const good = scoreCandidate(candidate("4", "plasterer smoothing plaster on an interior wall with a trowel"), b);
    const canvas = scoreCandidate(candidate("5", "art painting on canvas"), b);
    for (const off of [wall, brick, stone, canvas]) expect(off.offTopicLikely, off.alt).toBe(true);
    expect(good.offTopicLikely).toBe(false);
    expect(good.metadataMatch).toBe(true);
    expect(good.relevance).toBeGreaterThan(Math.max(wall.relevance, brick.relevance, stone.relevance) + 3);
    expect(shortlist([good, wall, brick, stone, canvas], true).map((c) => c.id)).toEqual(["4"]);
  });

  it("recherche multisource : plusieurs formulations, doublons retirés, licence non vérifiée exclue, arrêt quand c'est assez", async () => {
    const b = buildBrief(fresh("artisan"), { kind: "trade_photo" });
    const calls: string[] = [];
    const same = candidate("x1", "plasterer applying plaster", { author: "Ana", url: "https://img.test/same.jpg" });
    const p1 = mockProvider("pexels", () => [same, candidate("x2", "painter rolling paint on interior wall", { author: "Bo" })], calls);
    const p2 = mockProvider("pixabay", () => [{ ...same, source: "pixabay", id: "y1", url: "https://other.test/y1.jpg" }, candidate("y2", "drywall installer fixing plasterboard", { source: "pixabay", license: openverseLicense({ license: "by-nc" }) })], calls);
    const { ranked, stats } = await searchCandidates(b, [p1, p2]);
    expect(stats.queries.length).toBeGreaterThanOrEqual(2);
    expect(ranked.filter((c) => c.alt === "plasterer applying plaster")).toHaveLength(1);
    expect(ranked.find((c) => c.id === "y2")).toBeUndefined(); // licence non vérifiée
    expect(stats.requests).toBeLessThanOrEqual(b.queries.length * 2);
  });

  it("registre des banques : capacités, licence, attribution, restrictions, limites déclarées", () => {
    for (const p of STOCK_PROVIDERS) {
      expect(p.capabilities.languages.length).toBeGreaterThan(0);
      expect(p.capabilities.negativeTerms).toBe(false); // exclusions appliquées au classement et au contrôle
      expect(p.metadata.length).toBeGreaterThan(0);
      expect(p.rateLimit).toBeTruthy();
    }
    expect(licenseUsable(openverseLicense({ license: "cc0" }))).toBe(true);
    expect(licenseUsable(openverseLicense({ license: "by-nc-sa" }))).toBe(false);
    expect(PIXABAY_LICENSE.restrictions.join(" ")).toMatch(/droit à l'image/);
    expect(creditLine({ source: "openverse", author: "X", license: openverseLicense({ license: "by" }) })).toMatch(/NON vérifiée/);
    expect(creditLine({ source: "pexels", author: "Ana", license: STOCK_PROVIDERS[0].license({}) })).toMatch(/libre de droits.*Ana.*pas une photo de vos réalisations/);
  });

  // ------------------------------------------------------------------ formats

  it("formats : cadrage pensé dès le brief, recadrage refusé quand il couperait trop", async () => {
    expect(defaultAspect("banner", "banner")).toBe("3:1");
    expect(defaultAspect("social", "social_image")).toBe("4:5");
    expect(nearestAspect(1080, 1920)).toBe("9:16");
    expect(fitsFormat(1000, 1000, "4:1").ok).toBe(false);
    expect(fitsFormat(3000, 1000, "3:1").ok).toBe(true);
    expect(fitsFormat(600, 338, "16:9").ok).toBe(false); // trop petite
    const square = await mockImage(1, 1200, 1200);
    expect(await frameTo(square, "4:1")).toBeNull();
    const wide = await frameTo(await mockImage(2, 2400, 1600), "16:9");
    expect((await sharp(wide!).metadata()).width).toBe(FORMATS["16:9"].width);
    const b = buildBrief(fresh("saas"), { kind: "banner", support: "banner" });
    expect(b.format.aspect).toBe("3:1");
    expect(generationPrompt(b)).toMatch(/Format 3:1, left area kept calm for text/);
  });

  // ------------------------------------------------------------------ barrière de qualité

  it("barrière V2 : hors sujet jamais FINAL même très belle ; esthétique faible jamais FINAL ; panne jamais validée", async () => {
    const b = buildBrief(fresh("artisan"), { kind: "trade_photo" });
    const local = await localImageCheck(await mockImage(3, 1920, 1080), b);
    expect(local.ok).toBe(true);
    const off = gateImage({ brief: b, origin: "generated", local, review: review(9.6, { offTopic: true }), attempt: 0 });
    expect(off).toMatchObject({ verdict: "REJECTED", fatal: true });
    const dull = gateImage({ brief: b, origin: "generated", local, review: review(8, {}, { aesthetics: 6 }), attempt: 2 });
    expect(dull.verdict).not.toBe("FINAL");
    expect(gateImage({ brief: b, origin: "generated", local, review: null, reviewError: "délai", attempt: 0 }).verdict).not.toBe("FINAL");
    expect(gateImage({ brief: b, origin: "generated", local, review: null, attempt: 0 }).verdict).not.toBe("FINAL");
    // Banque sans contrôle visuel : description qui cite le métier → PROVISOIRE au mieux, jamais FINAL.
    expect(gateImage({ brief: b, origin: "stock", local, review: null, metadataMatch: true, attempt: 0 })).toMatchObject({ verdict: "PROVISIONAL" });
    expect(gateImage({ brief: b, origin: "stock", local, review: review(8.6), attempt: 0 }).verdict).toBe("FINAL");
    for (const d of ["image_v2", "stock_v2"] as const) expect(decide(d, { checker: "ai", score: 9.5, error: "x" }).verdict).not.toBe("FINAL");
    expect(POLICIES.image_v2.fatal).toEqual(expect.arrayContaining(["off_topic", "product_altered", "wrong_product"]));
  });

  it("produit transformé : défaut fatal, transformation abandonnée (aucune reprise)", async () => {
    const p = fresh("cosmetic");
    const b = buildBrief(p, { kind: "packshot", references: ["ref"] });
    expect(b.productFidelity).toBe(true);
    const local = await localImageCheck(await mockImage(4, 1080, 1080), b);
    const d = gateImage({ brief: b, origin: "generated", local, review: review(9, { productAltered: true, fix: { target: "product", instruction: "étiquette redessinée" } }), attempt: 0 });
    expect(d).toMatchObject({ verdict: "REJECTED", fatal: true });
    expect(targetedCorrection(d, review(9, { productAltered: true }), b).action).toBe("abandon");
  });

  it("reprises ciblées : correction précise, jamais deux fois la même consigne, au plus maxRetries", async () => {
    const b = buildBrief(fresh("restaurant"), { kind: "trade_photo" });
    const r = review(7, { issues: ["lumière plate"], fix: { target: "lighting", instruction: "lumière latérale chaude" } });
    const local = await localImageCheck(await mockImage(5, 1920, 1080), b);
    const d = gateImage({ brief: b, origin: "generated", local, review: r, attempt: 0 });
    expect(d.verdict).toBe("RETRY");
    const plan = targetedCorrection(d, r, b);
    expect(plan).toMatchObject({ action: "regenerate" });
    expect(plan.instruction).toMatch(/éclairage.*lumière latérale chaude/);
    expect(targetedCorrection(gateImage({ brief: b, origin: "generated", local, review: review(8, { offTopic: true }), attempt: 0 }), review(8, { offTopic: true }), b).action).toBe("change_direction");
  });

  // ------------------------------------------------------------------ moteur complet (simulé)

  it("A — Sébastien Blanc : murs nus jamais téléchargés ni contrôlés ; photo du métier retenue, licence conservée", async () => {
    const p = fresh("artisan");
    const prov = mockProvider("pexels", () => [candidate("mur", "white wall empty room"), candidate("brique", "brick wall texture"), candidate("bon", "plasterer applying finishing plaster to interior wall"), candidate("bon2", "painter rolling paint on living room wall")]);
    const { deps, log } = mockDeps({ providers: [prov] });
    const r = await fr(() => runImageEngineV2(job(p.id), p.id, { kind: "trade_photo", support: "site", aspect: "16:9", allowGenerate: false }, deps));
    expect(r.outcomes[0]).toMatchObject({ verdict: "FINAL", origin: "stock" });
    expect(log.downloads).not.toContain("mur");
    expect(log.downloads).not.toContain("brique");
    expect(r.stats.controls).toBeLessThanOrEqual(4);
    const a = getAsset(r.outcomes[0].assetId!)!;
    const m = json<any>(a.meta, {});
    expect(m.imageV2.license).toMatchObject({ name: "Licence Pexels", verifiedBy: "platform_terms" });
    expect(m.stock).toMatchObject({ source: "pexels", id: "bon" });
    expect(m.recipe).toMatch(/pas une photo de vos réalisations/);
    expect(m.gate.verdict).toBe("FINAL");
    expect(isAutoUsable(a)).toBe(true);
    expect(a.role).toBe("lifestyle");
  });

  it("hors sujet au contrôle : refus retenu, jamais retéléchargé ni recontrôlé au passage suivant", async () => {
    const p = fresh("artisan");
    const prov = mockProvider("pexels", () => [candidate("faux", "plasterer at work"), candidate("vrai", "plasterer smoothing a ceiling")]);
    const { deps, log } = mockDeps({ providers: [prov], reviewFor: (k) => (k === "faux" ? review(8, { offTopic: true }) : review(8.6)) });
    const req = { kind: "trade_photo" as const, aspect: "16:9" as const, allowGenerate: false };
    const r1 = await fr(() => runImageEngineV2(null, p.id, req, deps));
    expect(r1.outcomes[0].verdict).toBe("FINAL");
    expect(log.downloads).toEqual(["faux", "vrai"]);
    // Image retirée : nouveau passage — « faux » n'est ni retéléchargé ni recontrôlé.
    run("UPDATE assets SET deleted_at = ? WHERE id = ?", now(), r1.outcomes[0].assetId);
    log.downloads.length = 0;
    await fr(() => runImageEngineV2(null, p.id, req, deps));
    expect(log.downloads).not.toContain("faux");
  });

  it("forfait sans IA : photo du métier gardée sur sa description seulement → PROVISOIRE, jamais FINAL", async () => {
    const p = fresh("artisan");
    const { deps } = mockDeps({ providers: [mockProvider("pexels", () => [candidate("ok", "plasterer applying plaster with trowel")])], canReview: false, canGenerate: false });
    const r = await fr(() => runImageEngineV2(null, p.id, { kind: "trade_photo", aspect: "16:9" }, deps));
    expect(r.outcomes[0]).toMatchObject({ verdict: "PROVISIONAL", origin: "stock" });
    expect(json<any>(getAsset(r.outcomes[0].assetId!)!.meta, {}).gate.provisional).toMatchObject({ use: "auto", label: "needs_improvement" });
  });

  it("fallback capable : aucune banque → génération ; génération impossible → refus clair ; catégorie inconnue → brief générique", async () => {
    const p = fresh("restaurant");
    const { deps, log } = mockDeps({ providers: [] });
    const r = await fr(() => runImageEngineV2(null, p.id, { kind: "trade_photo", aspect: "16:9" }, deps));
    expect(r.outcomes[0]).toMatchObject({ verdict: "FINAL", origin: "generated" });
    expect(log.generations).toHaveLength(1);
    const { deps: d2 } = mockDeps({ providers: [], canGenerate: false });
    const r2 = await fr(() => runImageEngineV2(null, p.id, { kind: "ambiance", aspect: "4:5", topic: "autre" }, d2));
    expect(r2.outcomes[0].verdict).toBe("REJECTED");
    expect(r2.outcomes[0].reason).toMatch(/génération non disponible/);
    const odd = loadProject(seedImageFixture(u.id, "saas"));
    run("UPDATE projects SET product_json = json_set(product_json, '$.category', 'Objet mystère', '$.sector', NULL) WHERE id = ?", odd.id);
    expect(buildBrief(loadProject(odd.id), { kind: "ambiance" }).understanding).toMatchObject({ source: "generic", confidence: "low" });
  });

  it("B/C — fidélité produit : sans référence aucune image du produit ; avec référence, pixels du produit inchangés", async () => {
    const p = fresh("hightech");
    const { deps, log } = mockDeps({});
    const none = await fr(() => runImageEngineV2(null, p.id, { kind: "product_image", aspect: "1:1" }, deps));
    expect(none.outcomes[0].verdict).toBe("REJECTED");
    expect(none.outcomes[0].reason).toMatch(/aucune image du produit sans photo de référence/);
    expect(log.generations).toHaveLength(0);
    // Composition : le produit réel est posé tel quel (pixel central identique au détourage).
    const cut = await sharp({ create: { width: 200, height: 300, channels: 4, background: { r: 30, g: 31, b: 34, alpha: 1 } } }).png().toBuffer();
    const out = await compositeProduct(await mockImage(9, 1080, 1080), cut, "1:1");
    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const cx = Math.round(info.width / 2);
    const cy = Math.round(info.height * 0.86 - (info.height * 0.62) / 2);
    const i = (cy * info.width + cx) * info.channels;
    expect(Math.abs(data[i] - 30)).toBeLessThanOrEqual(4);
    expect(Math.abs(data[i + 2] - 34)).toBeLessThanOrEqual(4);
  });

  it("B — produit transformé par la génération : refusé, jamais réutilisé, aucune nouvelle tentative", async () => {
    const p = fresh("cosmetic");
    const ref = await seedCutout(u.id, p.id);
    const { deps, log } = mockDeps({ reference: Buffer.from("x"), reviewFor: () => review(9, { productAltered: true, fix: { target: "product", instruction: "pipette redessinée" } }) });
    const r = await fr(() => runImageEngineV2(null, p.id, { kind: "packshot", aspect: "1:1", references: [ref] }, deps));
    expect(r.outcomes[0].verdict).toBe("REJECTED");
    expect(r.outcomes[0].reason).toMatch(/transformation est abandonnée/);
    expect(log.generations).toHaveLength(1);
    const trial = all<any>("SELECT * FROM assets WHERE project_id = ? AND json_extract(meta, '$.imageV2') IS NOT NULL", p.id);
    expect(trial).toHaveLength(1);
    expect(trial[0].status).toBe("rejected");
    expect(isAutoUsable(trial[0])).toBe(false);
    expect(json<any>(trial[0].meta, {}).imageV2.productRef).toBe(ref);
  });

  it("reprise ciblée réelle : deuxième consigne différente et corrigée, puis FINAL", async () => {
    const p = fresh("restaurant");
    const { deps, log } = mockDeps({ providers: [], reviewFor: (_k, _b, n) => (n === 1 ? review(7, { issues: ["lumière plate"], fix: { target: "lighting", instruction: "lumière chaude de fin d'après-midi" } }) : review(8.6)) });
    const r = await fr(() => runImageEngineV2(null, p.id, { kind: "trade_photo", aspect: "16:9" }, deps));
    expect(r.outcomes[0]).toMatchObject({ verdict: "FINAL", attempts: 2 });
    expect(r.stats.retries).toBe(1);
    expect(log.prompts[0]).not.toEqual(log.prompts[1]);
    expect(log.prompts[1]).toMatch(/Correction for this attempt: corriger l'éclairage — lumière chaude/);
    const a = getAsset(r.outcomes[0].assetId!)!;
    expect(json<any>(a.meta, {}).imageV2.corrections[0]).toMatch(/éclairage/);
  });

  it("scène hors sujet générée : une seule nouvelle direction artistique, choisie localement", async () => {
    const p = fresh("restaurant");
    const first = buildBrief(p, { kind: "trade_photo", aspect: "16:9" }).artDirection;
    let n = 0;
    const { deps } = mockDeps({ providers: [], reviewFor: () => (++n === 1 ? review(8, { offTopic: true, fix: { target: "direction", instruction: "montrer la cuisine" } }) : review(8.7)) });
    const r = await fr(() => runImageEngineV2(null, p.id, { kind: "trade_photo", aspect: "16:9" }, deps));
    expect(r.stats.directionChanges).toBe(1);
    expect(r.outcomes[0].verdict).toBe("FINAL");
    expect(r.outcomes[0].artDirection).not.toBe(first);
  });

  it("diversité : une série de 3 = angles, lumières et intentions différents ; un quasi-doublon est refusé", async () => {
    const p = fresh("saas");
    const briefs = [0, 1, 2].map((i) => buildBrief(p, { kind: "site_image", variant: i }));
    expect(new Set(briefs.map((b) => b.variant!.angle)).size).toBe(3);
    expect(new Set(briefs.map((b) => b.variant!.light)).size).toBe(3);
    expect(new Set(briefs.map((b) => briefHash(b))).size).toBe(3);
    expect(new Set(briefs.map((b) => b.artDirection)).size).toBe(1); // identité cohérente
    const same = await mockImage(7, 1920, 1080);
    const h = await dHash(same);
    expect(hamming(h, await dHash(await sharp(same).resize(1600, 900).jpeg({ quality: 70 }).toBuffer()))).toBeLessThanOrEqual(6);
    const dup = await localImageCheck(same, briefs[0], [h]);
    expect(dup.codes).toContain("duplicate");
    // Moteur : même image renvoyée deux fois par la banque (deux identifiants) → une seule gardée dans la série.
    const img = await mockImage(8, 2400, 1600);
    const prov = mockProvider("pexels", () => [candidate("d1", "team working laptop clean desk office"), candidate("d2", "focused work laptop clean desk"), candidate("d3", "online learning laptop home")]);
    const { deps } = mockDeps({ providers: [prov], images: { d1: img, d2: img }, canGenerate: false });
    const r = await fr(() => runImageEngineV2(null, p.id, { kind: "site_image", aspect: "16:9", count: 2 }, deps));
    const ids = r.outcomes.map((o) => o.assetId).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    const hashes = ids.map((x) => json<any>(getAsset(x!)!.meta, {}).imageV2.phash);
    expect(hamming(hashes[0], hashes[1] ?? "0".repeat(16))).toBeGreaterThan(6);
  });

  it("idempotence et réutilisation : même brief → image FINAL réutilisée, aucun nouvel appel ; jamais une image refusée", async () => {
    const p = fresh("artisan");
    const prov = mockProvider("pexels", () => [candidate("r1", "plasterer applying plaster")]);
    const { deps, log } = mockDeps({ providers: [prov] });
    const req = { kind: "trade_photo" as const, aspect: "16:9" as const, allowGenerate: false };
    const r1 = await fr(() => runImageEngineV2(null, p.id, req, deps));
    const before = log.reviews.length;
    const r2 = await fr(() => runImageEngineV2(null, p.id, req, deps));
    expect(r2.outcomes[0]).toMatchObject({ origin: "reused", assetId: r1.outcomes[0].assetId });
    expect(log.reviews.length).toBe(before);
    expect(r2.stats.reused).toBe(1);
    // L'image refusée par le client ne revient jamais automatiquement.
    run("UPDATE assets SET status = 'rejected' WHERE id = ?", r1.outcomes[0].assetId);
    expect(reusableFor(p.id, r1.outcomes[0].briefHash)).toBeNull();
  });

  it("coût tracé et plafond réel : l'appel au-delà du plafond ne part pas ; le coût de la tâche est rapporté", async () => {
    const p = fresh("restaurant");
    const ctx = job(p.id);
    const { deps } = mockDeps({
      providers: [],
      generate: async (b) => {
        // Comme un vrai fournisseur : contrôle du plafond AVANT l'appel, puis coût enregistré.
        assertUnderCostCap(400_000);
        recordCall({ userId: u.id, projectId: p.id, jobId: ctx.job.id, task: "image_generation", provider: "mock", requestedModel: "m", unit: "image", costMicro: 400_000, status: "ok" });
        return mockImage(42, b.format.width, b.format.height);
      },
      // Correction différente à chaque essai (une consigne identique ne serait jamais relancée).
      reviewFor: (_k, _b, n) => review(7, { issues: [`lumière ${n}`], fix: { target: "lighting", instruction: `plus chaude, essai ${n}` } }),
    });
    const r = await fr(() => runImageEngineV2(ctx, p.id, { kind: "trade_photo", aspect: "16:9", maxCostEur: 1 }, deps));
    expect(r.stoppedByCostCap).toBe(true);
    expect(r.costMicro).toBeLessThanOrEqual(1_000_000);
    expect(r.costMicro).toBe(800_000);
    expect(r.notes.join(" ")).toMatch(/plafond/);
    expect(new CostCapReached(1, 1, 1).name).toBe("CostCapReached");
  });

  it("les cinq scénarios A–E tournent avec des fournisseurs simulés (aucun traitement propre à un scénario)", async () => {
    for (const k of IMAGE_FIXTURES) {
      const p = fresh(k);
      const ref = k === "cosmetic" || k === "hightech" ? await seedCutout(u.id, p.id) : null;
      const prov = mockProvider("pexels", (q) => [candidate(`${k}-${q.length}-a`, `${q} professional photo`), candidate(`${k}-${q.length}-b`, `${q} at work`)]);
      const { deps } = mockDeps({ providers: [prov], reference: ref ? Buffer.from("ref") : null });
      for (const req of fixtureRequests(k, ref)) {
        const r = await fr(() => runImageEngineV2(null, p.id, req, deps));
        expect(r.outcomes.length, `${k} ${req.kind}`).toBe(req.count ?? 1);
        for (const o of r.outcomes) expect(["FINAL", "PROVISIONAL"], `${k} ${req.kind} : ${o.reason}`).toContain(o.verdict);
      }
    }
    const src = (await import("node:fs")).readFileSync(new URL("../src/lib/image-v2/engine.ts", import.meta.url), "utf8") + (await import("node:fs")).readFileSync(new URL("../src/lib/image-v2/brief.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/S[ée]bastien|Blanc\b|Lison|Nuvia|Onde Pro/);
  });

  // ------------------------------------------------------------------ intégrations

  it("Project Brain : famille du produit dans l'instantané et le contexte image ; rien pour un service", () => {
    const serum = fresh("cosmetic");
    expect(brainSnapshot(serum).category?.id).toBe("cosmetics");
    expect(brainItems(brainSnapshot(serum)).find((i) => i.id === "product.category")?.scopes).toContain("image");
    const sb = fresh("artisan");
    expect(brainSnapshot(sb).category).toBeNull();
    expect(brainItems(brainSnapshot(sb)).find((i) => i.id === "product.category")).toBeUndefined();
  });

  it("Router V2 : sans IA active aucun parcours payant ; image du produit sans référence → aucun parcours", () => {
    const p = fresh("hightech");
    const off = realImageDeps(p, { jobId: null, aiActive: false });
    expect(off.canReview).toBe(false);
    expect(off.canGenerate).toBe(false);
    expect(off.path(buildBrief(p, { kind: "ambiance" }))).toBe("none");
    const on = realImageDeps(p, { jobId: null, aiActive: true });
    expect(on.path(buildBrief(p, { kind: "product_image" }))).toBe("none");
  });

  it("Planner et orchestrateur : action image.v2, livrables V2 suivis par les étapes", () => {
    expect(ACTION_STEPS["image.v2"]).toEqual(["image_generate"]);
    expect(intentsFromAction("image.v2")).toEqual(["GENERATE_IMAGE"]);
    expect(STEP_DELIVERABLES.image_generate).toContain("image_v2");
    expect(STEP_DELIVERABLES.stock_search).toContain("stock_v2");
    const plan = buildPlan({ projectId: "p", userId: u.id, requestKey: "img2", intents: ["FIND_STOCK_IMAGE", "GENERATE_IMAGE"], state: { analyzed: true, brandReady: true, logoLocked: false, copyFinal: false, genericTrade: false } });
    const kinds = plan.steps.map((s: any) => s.kind);
    expect(kinds.indexOf("stock_search")).toBeLessThan(kinds.indexOf("image_generate"));
  });

  it("aucun secret, aucune consigne de génération stockée avec l'image ; le diagnostic garde la trace des essais", async () => {
    const p = fresh("restaurant");
    const { deps } = mockDeps({ providers: [] });
    const r = await fr(() => runImageEngineV2(null, p.id, { kind: "trade_photo", aspect: "16:9" }, deps));
    const a = getAsset(r.outcomes[0].assetId!)!;
    expect(a.meta).not.toMatch(/Correction for this attempt|Never show|sk-/);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM quality_checks WHERE project_id = ? AND deliverable = 'image_v2'", p.id)!.n).toBeGreaterThan(0);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM image_candidates WHERE project_id = ?", p.id)!.n).toBeGreaterThan(0);
  });
});
