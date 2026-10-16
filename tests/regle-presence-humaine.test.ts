/**
 * Règle de présence humaine (règle du propriétaire) : si le client n'a fourni aucune image contenant une personne,
 * le studio n'introduit pas de personne dans ses images ni ses vidéos sans autorisation explicite ; une personne
 * ajoutée sans autorisation fait REFUSER le média. Outils simulés : aucun appel réel, aucune dépense.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("règle de présence humaine", async () => {
  const { createUser } = await import("@/lib/auth");
  const { run } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { getAsset, saveAsset } = await import("@/lib/library");
  const { isAutoUsable } = await import("@/lib/quality/usable");
  const { POLICIES, POLICY_VERSION } = await import("@/lib/quality/policies");
  const { peopleAllowed, peopleAllowedFor, NO_PEOPLE_EN, NO_PEOPLE_FR, mentionsPerson, peopleFreeQueries } = await import("@/lib/people-policy");
  const { buildBrief, generationPrompt } = await import("@/lib/image-v2/brief");
  const { scoreCandidate, shortlist } = await import("@/lib/image-v2/search");
  const { gateImage, localImageCheck } = await import("@/lib/image-v2/quality");
  const { reviewPrompt } = await import("@/lib/image-v2/deps");
  const { runImageEngineV2 } = await import("@/lib/image-v2/engine");
  const { rankStock, tradeStock } = await import("@/lib/stock/trade-queries");
  const { gateAd } = await import("@/lib/ads-v2/quality");
  const { videoIntent } = await import("@/lib/video-v2/intent");
  const { videoStrategy } = await import("@/lib/video-v2/strategy");
  const { localScript } = await import("@/lib/video-v2/script");
  const { buildStoryboard } = await import("@/lib/video-v2/storyboard");
  const { gateShot, gateVideo } = await import("@/lib/video-v2/quality");
  const { adInsight } = await import("@/lib/ads-v2/insight");
  const { finalImagePrompt, photoLine, photoLineInput, scenePromptFromLine } = await import("@/lib/engine/photo-line");
  const { ambiancePrompts } = await import("@/lib/engine/service-media");
  const { clipDecision } = await import("@/lib/engine/videos");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { candidate, mockDeps, mockImage, mockProvider, review } = await import("./image-v2-mock");
  const { adReview } = await import("./ads-v2-mock");
  const { goodShot, videoReview } = await import("./video-v2-mock");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const u = await createUser(`humain-${Date.now()}@test.fr`, "motdepasse-test", "H");
  const fresh = (k: Parameters<typeof seedImageFixture>[1]) => loadProject(seedImageFixture(u.id, k));
  const allow = (projectId: string) => {
    run("UPDATE projects SET settings_json = json_set(COALESCE(settings_json, '{}'), '$.peopleAllowed', json('true')) WHERE id = ?", projectId);
    return loadProject(projectId);
  };
  /** Mots qui demandent une personne dans une consigne (hors clause « no people »). */
  const ASKS_PERSON = /person at work|show the human|person using|person wearing|person working|\bat work\b|craftsman|plasterer|painter rolling|artisan|équipe|personnage/i;
  const withoutClause = (s: string) => s.replace(NO_PEOPLE_EN, "").replace(NO_PEOPLE_FR, "");
  const inv0 = { cutout: null, logo: null, photos: [], videos: [], screens: [] };

  // ------------------------------------------------------------------ autorisation

  it("autorisation : refusée par défaut ; accord explicite du projet ; ou photo du client marquée avec une personne", async () => {
    const p = fresh("artisan");
    expect(peopleAllowed(p.id)).toBe(false);
    expect(peopleAllowedFor(p)).toBe(false);
    expect(peopleAllowed(null)).toBe(false);
    // Une image générée par le studio avec le repère ne compte pas : seule une image du client autorise.
    const jpg = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#ddd" } }).jpeg().toBuffer();
    await saveAsset({ projectId: p.id, userId: u.id, data: jpg, name: "gen.jpg", mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "generated", meta: { hasPerson: true } });
    expect(peopleAllowed(p.id)).toBe(false);
    await saveAsset({ projectId: p.id, userId: u.id, data: jpg, name: "equipe.jpg", mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "upload", meta: { hasPerson: true } });
    expect(peopleAllowed(p.id)).toBe(true);
    const q = fresh("cosmetic");
    expect(peopleAllowed(q.id)).toBe(false);
    expect(peopleAllowedFor(allow(q.id))).toBe(true);
    expect(peopleAllowed(q.id)).toBe(true);
  });

  // ------------------------------------------------------------------ consignes (Image V2)

  it("Image V2, métier : sans autorisation, aucune personne demandée et la clause « no people » dans la consigne", () => {
    const p = fresh("artisan");
    for (const v of [0, 1, 2, 3]) {
      const b = buildBrief(p, { kind: "trade_photo", support: "site", variant: v });
      expect(b.people).toBe(false);
      const prompt = generationPrompt(b);
      expect(prompt).toContain(NO_PEOPLE_FR);
      expect(withoutClause(prompt)).not.toMatch(ASKS_PERSON);
      expect(b.variant!.angle).not.toMatch(/person/);
      expect(b.variant!.intent).not.toMatch(/human/);
      for (const q of b.queries) expect(mentionsPerson(q), q).toBe(false);
      expect(b.queries.length).toBeGreaterThanOrEqual(2);
      expect(reviewPrompt(b)).toMatch(/People are NOT allowed/);
    }
  });

  it("Image V2, produit et univers : « person using / wearing » remplacé par le produit dans son décor", () => {
    const tech = fresh("hightech");
    for (const kind of ["lifestyle", "usage_scene", "ambiance", "site_image"] as const) {
      const b = buildBrief(tech, { kind, variant: 0 });
      expect(b.people).toBe(false);
      expect(generationPrompt(b)).toMatch(/Scène sans aucune présence humaine|aucune personne\. Aucun objet supplémentaire/);
      expect(withoutClause(generationPrompt(b))).not.toMatch(ASKS_PERSON);
      for (const q of b.queries) expect(mentionsPerson(q), q).toBe(false);
    }
  });

  it("Image V2 : comportement inchangé quand le client autorise les personnes", () => {
    const p = allow(fresh("artisan").id);
    const b = buildBrief(p, { kind: "trade_photo", support: "site", variant: 3 });
    expect(b.people).toBe(true);
    expect(b.subject).toMatch(/at work/);
    expect(b.variant!.angle).toMatch(/personne au travail/);
    expect(generationPrompt(b)).not.toContain(NO_PEOPLE_FR);
    // Même brief sans l'autorisation (option explicite) : empreinte différente, aucune réutilisation croisée.
    const nb = buildBrief(p, { kind: "trade_photo", support: "site", variant: 3 }, { peopleAllowed: false });
    expect(nb.people).toBe(false);
    expect(nb.subject).not.toMatch(/at work/);
  });

  it("consignes V1 : ligne photographique et ambiances de services portent la clause ; inchangées si autorisé", () => {
    const line = photoLine(photoLineInput({ product: { sector: "maison" }, brand: null }));
    const off = scenePromptFromLine(line, { lifestyle: "on a living-room sofa", people: false });
    expect(off.prompt).not.toMatch(/people may appear/);
    expect(finalImagePrompt(off, line, { lifestyle: true, people: false })).toContain(NO_PEOPLE_EN);
    const on = scenePromptFromLine(line, { lifestyle: "on a living-room sofa" });
    expect(on.prompt).toMatch(/people may appear/);
    expect(finalImagePrompt(on, line, { lifestyle: true })).not.toContain(NO_PEOPLE_EN);
    const artisan = fresh("artisan");
    for (const x of ambiancePrompts(artisan)) {
      expect(x).toContain(NO_PEOPLE_EN);
      expect(x).not.toMatch(/nobody looking at the camera/);
    }
    for (const x of ambiancePrompts(allow(artisan.id))) expect(x).not.toContain(NO_PEOPLE_EN);
  });

  // ------------------------------------------------------------------ recherche de photos

  it("banques d'images : sans autorisation, les photos décrites avec une personne sont écartées", () => {
    const p = fresh("artisan");
    const b = buildBrief(p, { kind: "trade_photo" });
    const person = scoreCandidate(candidate("pers", "plasterer smoothing plaster on an interior wall with a trowel"), b);
    const scene = scoreCandidate(candidate("scene", "freshly plastered interior wall, trowel and plaster bucket on the floor"), b);
    expect(person.offTopicLikely).toBe(true);
    expect(person.metadataMatch).toBe(false);
    expect(person.reasons.join(" ")).toMatch(/personne/);
    expect(scene.offTopicLikely).toBe(false);
    expect(scene.relevance).toBeGreaterThan(person.relevance);
    expect(shortlist([person, scene], true).map((c) => c.id)).toEqual(["scene"]);
    expect(shortlist([person, scene], false).map((c) => c.id)).toEqual(["scene"]);
    // Autorisé : la photo de l'artisan au travail reste la meilleure (bonus du geste humain conservé).
    const ok = buildBrief(allow(p.id), { kind: "trade_photo" });
    expect(scoreCandidate(candidate("pers", "plasterer smoothing plaster on an interior wall with a trowel"), ok).offTopicLikely).toBe(false);
  });

  it("photos et vidéos libres (ancien parcours) : rankStock exclut les personnes sans autorisation ; requêtes nettoyées", () => {
    const { must } = tradeStock("Plâtrier peintre")!;
    const person = { id: "p", alt: "plasterer, worker, trowel, wall" };
    const tools = { id: "t", alt: "trowel, plaster, bucket, renovation" };
    expect(rankStock([person, tools], must, true, undefined, { people: false }).map((x) => x.id)).toEqual(["t"]);
    expect(rankStock([person, tools], must, false, undefined, { people: false }).map((x) => x.id)).toEqual(["t"]);
    expect(rankStock([person, tools], must, true).map((x) => x.id)).toEqual(["p", "t"]); // inchangé si autorisé
    expect(peopleFreeQueries(["plasterer plastering wall", "painter"])).toEqual(["plastering wall"]);
  });

  // ------------------------------------------------------------------ barrière de qualité

  it("politiques : unauthorized_person est fatal pour toutes les images et vidéos (version des politiques changée)", () => {
    expect(POLICY_VERSION).toBe("2026-10-p11h");
    for (const d of ["image_product", "image_lifestyle", "image_ambiance", "image_v2", "stock_photo", "stock_v2", "stock_video", "video_clip", "ugc_clip", "ad_v2", "video_v2", "video_shot_v2"] as const) expect(POLICIES[d].fatal, d).toContain("unauthorized_person");
  });

  it("Image V2 : personne visible sans autorisation → REFUSÉ (fatal) ; autorisée → FINAL", async () => {
    const p = fresh("restaurant");
    const b = buildBrief(p, { kind: "trade_photo", aspect: "16:9" });
    const local = await localImageCheck(await mockImage(3, 1920, 1080), b);
    const d = gateImage({ brief: b, origin: "generated", local, review: review(9, { personVisible: true }), attempt: 0 });
    expect(d).toMatchObject({ verdict: "REJECTED", fatal: true });
    expect(d.fatalCodes).toContain("unauthorized_person");
    expect(gateImage({ brief: b, origin: "stock", local, review: review(9, { personVisible: true }), attempt: 0 }).fatalCodes).toContain("unauthorized_person");
    const ok = buildBrief(allow(p.id), { kind: "trade_photo", aspect: "16:9" });
    expect(gateImage({ brief: ok, origin: "generated", local, review: review(9, { personVisible: true }), attempt: 0 }).verdict).toBe("FINAL");
  });

  it("Image V2, moteur : photo de banque avec une personne jamais téléchargée ; image générée avec une personne refusée, jamais utilisée", async () => {
    const p = fresh("artisan");
    const prov = mockProvider("pexels", () => [candidate("pers", "plasterer applying plaster with a trowel"), candidate("outils", "freshly plastered wall, trowel and plaster bucket")]);
    // Le contrôle visuel voit une personne sur la photo « outils » (description muette) : refusée elle aussi.
    const { deps, log } = mockDeps({ providers: [prov], canGenerate: false, reviewFor: (k) => (k === "outils" ? review(9, { personVisible: true }) : review(9)) });
    const r = await fr(() => runImageEngineV2(null, p.id, { kind: "trade_photo", aspect: "16:9", allowGenerate: false }, deps));
    expect(log.downloads).not.toContain("pers");
    expect(r.outcomes[0].verdict).toBe("REJECTED");
    expect(r.outcomes[0].assetId).toBeNull();

    const q = fresh("restaurant");
    const g = mockDeps({ providers: [], reviewFor: () => review(9, { personVisible: true }) });
    const r2 = await fr(() => runImageEngineV2(null, q.id, { kind: "trade_photo", aspect: "16:9" }, g.deps));
    expect(r2.outcomes[0]).toMatchObject({ verdict: "REJECTED", assetId: null });
    expect(r2.outcomes[0].codes).toContain("unauthorized_person");
    expect(g.log.prompts[0]).toContain(NO_PEOPLE_FR);
    const { all } = await import("@/lib/db");
    const saved = all<any>("SELECT * FROM assets WHERE project_id = ? AND json_extract(meta, '$.imageV2') IS NOT NULL", q.id);
    expect(saved.length).toBeGreaterThan(0);
    for (const a of saved) {
      expect(a.status).toBe("rejected");
      expect(isAutoUsable(getAsset(a.id)!)).toBe(false);
    }
  });

  it("publicité : personne visible sans autorisation → création REFUSÉE ; autorisée → FINAL", () => {
    const ok = { codes: [], issues: [] };
    expect(gateAd({ local: ok, review: adReview(8.8, { personVisible: true }), attempt: 0, peopleAllowed: false })).toMatchObject({ verdict: "REJECTED", fatal: true });
    expect(gateAd({ local: ok, review: adReview(8.8, { personVisible: true }), attempt: 0 }).fatalCodes).toContain("unauthorized_person");
    expect(gateAd({ local: ok, review: adReview(8.8, { personVisible: true }), attempt: 0, peopleAllowed: true }).verdict).toBe("FINAL");
    expect(gateAd({ local: ok, review: adReview(8.8), attempt: 0, peopleAllowed: false }).verdict).toBe("FINAL");
  });

  it("ancien moteur vidéo : plan IA avec une personne non autorisée → refusé", () => {
    const d = clipDecision({ scores: [9, 9], bad: 0, wrong: false, issues: ["personne visible"], expected: 3, person: true });
    expect(d).toMatchObject({ verdict: "REJECTED", fatal: true });
    expect(d.fatalCodes).toContain("unauthorized_person");
    expect(clipDecision({ scores: [9, 9, 9], bad: 0, wrong: false, issues: [], expected: 3 }).verdict).toBe("FINAL");
  });

  // ------------------------------------------------------------------ vidéo V2

  it("Vidéo V2 : sans autorisation, pas d'UGC ni de personnage ; le plan de services ne demande ni artisan ni équipe", async () => {
    await fr(() => {
      const cosmetic = fresh("cosmetic");
      const ugc = videoIntent(cosmetic, { text: "Une vidéo UGC face caméra avec un avatar" });
      expect(ugc.kind).not.toBe("ugc");
      expect(ugc.people).toBe(false);
      expect(ugc.reasons.join(" ")).toMatch(/aucune personne autorisée/);
      const i = adInsight(cosmetic);
      const st = videoStrategy(cosmetic, ugc);
      const sb = buildStoryboard(i, st, ugc, localScript(i, st, ugc), inv0);
      expect(sb.some((s) => s.character)).toBe(false);

      const artisan = fresh("artisan");
      for (const text of ["vidéo de métier de 35 secondes pour le site", "présentation de l'entreprise pour YouTube, 2 minutes", "publicité instagram"]) {
        const intent = videoIntent(artisan, { text });
        const ai = adInsight(artisan);
        const ast = videoStrategy(artisan, intent);
        const asb = buildStoryboard(ai, ast, intent, localScript(ai, ast, intent), inv0);
        expect(asb.some((s) => s.character)).toBe(false);
        for (const s of asb) expect(`${s.subject} ${s.action} ${s.environment}`, text).not.toMatch(/l'équipe ou l'artisan|équipe au travail|geste clé|présente son travail/);
      }
    });
  });

  it("Vidéo V2 : comportement inchangé quand le client autorise les personnes (UGC, personnage)", async () => {
    await fr(() => {
      const cosmetic = allow(fresh("cosmetic").id);
      const ugc = videoIntent(cosmetic, { text: "Une vidéo UGC face caméra" });
      expect(ugc).toMatchObject({ kind: "ugc", people: true });
      const i = adInsight(cosmetic);
      const st = videoStrategy(cosmetic, ugc);
      expect(buildStoryboard(i, st, ugc, localScript(i, st, ugc), inv0).some((s) => s.character)).toBe(true);
      const artisan = allow(fresh("artisan").id);
      const intent = videoIntent(artisan, { text: "vidéo de métier de 35 secondes pour le site" });
      const ai = adInsight(artisan);
      const ast = videoStrategy(artisan, intent);
      expect(buildStoryboard(ai, ast, intent, localScript(ai, ast, intent), inv0).map((s) => s.subject).join(" ")).toMatch(/l'équipe ou l'artisan|geste clé/);
    });
  });

  it("Vidéo V2 : plan ou vidéo avec une personne non autorisée → REFUSÉ ; autorisé → accepté", () => {
    const shot = gateShot({ review: goodShot({ personVisible: true }), expectsProduct: false, expectsCharacter: false, attempt: 0, peopleAllowed: false });
    expect(shot).toMatchObject({ verdict: "REJECTED", fatal: true });
    expect(shot.fatalCodes).toContain("unauthorized_person");
    expect(gateShot({ review: goodShot({ personVisible: true }), expectsProduct: false, expectsCharacter: false, attempt: 0, peopleAllowed: true }).verdict).toBe("FINAL");
    const local = { codes: [], issues: [], measures: {} };
    const vid = gateVideo({ local, review: { ...videoReview(8.8), personVisible: true }, attempt: 0, peopleAllowed: false });
    expect(vid).toMatchObject({ verdict: "REJECTED", fatal: true });
    expect(gateVideo({ local, review: { ...videoReview(8.8), personVisible: true }, attempt: 0, peopleAllowed: true }).verdict).toBe("FINAL");
  });
});

describe("Accord du client pour des personnes : réglable dans le studio", () => {
  it("le réglage du projet est accepté par l'API et proposé dans l'onglet Images", async () => {
    const fs = await import("node:fs");
    expect(fs.readFileSync("src/app/api/projects/[id]/route.ts", "utf8")).toMatch(/peopleAllowed: z\.boolean\(\)\.optional\(\)/);
    const tab = fs.readFileSync("src/components/studio/tab-images.tsx", "utf8");
    expect(tab).toMatch(/<PeopleConsent \/>/);
    expect(tab).toMatch(/settings: \{ peopleAllowed: v \}/);
  });
});
