/**
 * Phase 6A — Advertising Engine V2 (outils simulés : aucun appel réel, aucune dépense).
 * Une création simulée ne prouve pas la qualité réelle : ces tests vérifient les DÉCISIONS du moteur.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Phase 6A — Advertising Engine V2", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, id, json, now, one, run } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { JobContext } = await import("@/lib/jobs");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { getAsset } = await import("@/lib/library");
  const { isAutoUsable } = await import("@/lib/quality/usable");
  const { decide } = await import("@/lib/quality/gate");
  const { adInsight } = await import("@/lib/ads-v2/insight");
  const { planAngles, angleCandidates } = await import("@/lib/ads-v2/angles");
  const { localCopy, ctaFor } = await import("@/lib/ads-v2/copy");
  const { claimIssues, claimCodes } = await import("@/lib/ads-v2/claims");
  const { composeAd } = await import("@/lib/ads-v2/compose");
  const { gateAd, localAdChecks } = await import("@/lib/ads-v2/quality");
  const { formatsFor, strictestText, defaultPlatforms, PLATFORM_SPECS } = await import("@/lib/ads-v2/platforms");
  const { runAdEngineV2, visualFor } = await import("@/lib/ads-v2/engine");
  const { realAdDeps } = await import("@/lib/ads-v2/deps");
  const { CostCapReached, assertUnderCostCap } = await import("@/lib/ai/trace");
  const { ACTION_STEPS, STEP_DELIVERABLES } = await import("@/lib/orchestrator/execute");
  const { intentsFromAction } = await import("@/lib/orchestrator/intent");
  const { brandTypo, palette } = await import("@/lib/engine/images");
  const { IMAGE_FIXTURES, seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { mockImage } = await import("./image-v2-mock");
  const { adReview, cleanCopies, mockAdDeps } = await import("./ads-v2-mock");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const u = await createUser(`ads2-${Date.now()}@test.fr`, "motdepasse-test", "A");
  const fresh = (k: (typeof IMAGE_FIXTURES)[number]) => loadProject(seedImageFixture(u.id, k));
  const limits = strictestText(["meta_feed", "meta_story"]);
  const job = (projectId: string) => {
    const jid = id();
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, projectId, "ads.v2", "test", "{}", "running", now(), now(), now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };

  // ------------------------------------------------------------------ analyse et angles

  it("analyse produit / audience : seulement le confirmé ; objection sans réponse et preuve manquante exclues", () => {
    const i = adInsight(fresh("cosmetic"));
    expect(i.facts.map((f) => f.value)).toContain("30 ml");
    expect(i.facts.map((f) => f.value)).not.toContain("gel fluide"); // déduit, pas confirmé
    expect(i.objections).toEqual([]); // « Est-ce que ça pique ? » n'a pas de réponse
    expect(i.proofs).toEqual(["Fabriqué en France"]);
    expect(i.premium).toBe(true);
    expect(i.offer).toBeNull();
    expect(i.gaps.join(" ")).toMatch(/objection/);
    const s = adInsight(fresh("artisan"));
    expect(s.business).toBe("services");
    expect(s.services.length).toBeGreaterThan(0);
  });

  it("angles réellement différents : jamais deux fois le même type ni la même matière ; moins d'angles plutôt qu'inventer", () => {
    for (const k of IMAGE_FIXTURES) {
      const i = adInsight(fresh(k));
      const { angles } = planAngles(i, 4);
      expect(new Set(angles.map((a) => a.type)).size, k).toBe(angles.length);
      expect(new Set(angles.map((a) => a.material.toLowerCase())).size, k).toBe(angles.length);
    }
    const empty = loadProject(seedImageFixture(u.id, "saas"));
    run("UPDATE projects SET product_json = json_set(product_json, '$.facts', json('[]'), '$.category', 'Objet', '$.sector', NULL), strategy_json = '{}' WHERE id = ?", empty.id);
    const r = planAngles(adInsight(loadProject(empty.id)), 6);
    expect(r.missing).toBeGreaterThan(0);
    expect(angleCandidates(adInsight(fresh("artisan"))).some((a) => a.type === "gift")).toBe(false); // pas d'idée cadeau pour un service
  });

  // ------------------------------------------------------------------ textes et affirmations

  it("textes locaux : naturels, dans les limites des plateformes, aucune affirmation non confirmée", () => {
    for (const k of IMAGE_FIXTURES) {
      const p = fresh(k);
      const i = adInsight(p);
      const { angles } = planAngles(i, 3);
      const copies = angles.map((a) => ({ id: a.id, copy: fr(() => localCopy(i, a, "fr", limits)) as never }));
      return Promise.all(copies.map((c) => c.copy)).then((resolved) => {
        const list = angles.map((a, n) => ({ id: a.id, copy: resolved[n] as any }));
        const issues = claimIssues(list, p, i, limits);
        for (const a of angles) expect(issues.get(a.id), `${k} ${a.type}`).toEqual([]);
        for (const c of list) {
          expect(c.copy.hook.split(/\s+/).length).toBeLessThanOrEqual(limits.hookWords);
          expect(c.copy.headline.length).toBeLessThanOrEqual(limits.headline);
        }
      });
    }
  });

  it("contrôle des affirmations : superlatif, santé, fausse urgence, promotion non configurée, faux avis, attribut personnel", () => {
    const p = fresh("cosmetic");
    const i = adInsight(p);
    const base = { hook: "Le détail", primary: "Le détail.", headline: "Titre", description: "Marque", cta: "Découvrir", hookB: null };
    const check = (patch: object, offer: string | null = null) => claimIssues([{ id: "x", copy: { ...base, ...patch } }], p, { ...i, offer }, limits).get("x")!.map((c) => c.code);
    expect(check({ hook: "Le meilleur sérum du marché" })).toContain("unverified_claim");
    expect(check({ primary: "Il guérit les taches." })).toContain("forbidden_claim");
    expect(check({ primary: "Stock limité, dernière chance." })).toContain("fake_urgency");
    expect(check({ headline: "-20 % ce week-end" })).toContain("invented_offer");
    expect(check({ headline: "-20 % ce week-end" }, "-20 % ce week-end")).not.toContain("invented_offer");
    expect(check({ primary: "Plus de 500 avis 5 étoiles." })).toContain("fake_social_proof");
    expect(check({ hook: "Votre acné disparaît" })).toContain("forbidden_claim");
    expect(check({ primary: "Anti-âge prouvé." })).toEqual(expect.arrayContaining(["avoided_claim"]));
    expect(claimCodes([{ code: "forbidden_claim", field: "", term: "", fix: "" }])).toEqual(["forbidden_claim"]);
    expect(ctaFor({ ...i, business: "services", contactMode: "quote" } as never, { type: "proof" } as never, "fr")).toBe("Demander un devis");
  });

  it("rédaction IA : une reprise ciblée avec les défauts exacts ; ce qui reste fautif repasse à la version locale", async () => {
    const p = fresh("cosmetic");
    const bad = (prompt: string) => ({ ads: cleanCopies(prompt).ads.map((a, k) => (k === 0 ? { ...a, hook: "Le meilleur sérum au monde" } : a)) });
    const { deps, log } = mockAdDeps({ userId: u.id, projectId: p.id, write: (pr) => bad(pr) });
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 3, platforms: ["meta_feed"] }, deps));
    expect(log.copyCalls).toHaveLength(2);
    expect(log.copyCalls[1]).toMatch(/CORRECTIONS EXIGÉES[\s\S]*superlatif/);
    expect(r.concepts[0].copyBy).toBe("local");
    expect(r.concepts[0].copy.hook).not.toMatch(/meilleur/);
    expect(r.concepts.slice(1).every((c) => c.copyBy === "ai")).toBe(true);
    for (const c of r.concepts) expect(c.claims).toEqual([]);
  });

  // ------------------------------------------------------------------ composition et barrière

  it("composition : formats exacts, zones de sécurité respectées, contraste et taille lisibles, produit non recouvert", async () => {
    const p = fresh("cosmetic");
    const cut = await sharp({ create: { width: 300, height: 600, channels: 4, background: { r: 199, g: 123, b: 48, alpha: 1 } } }).png().toBuffer();
    for (const f of formatsFor(["meta_feed", "meta_story", "google_display", "pinterest"])) {
      for (const layout of ["hero_left", "full_bleed", "hero_center", "split", "typographic"] as const) {
        const { jpg, metrics } = await fr(() => composeAd({ format: f, layout, palette: palette(p), typo: brandTypo(p), brand: "Sérum Éclat", headline: "Un teint lumineux en deux gestes", cta: "Découvrir", background: null, product: layout === "full_bleed" ? null : cut }));
        const m = await sharp(jpg).metadata();
        expect([m.width, m.height], `${f.label} ${layout}`).toEqual([f.width, f.height]);
        expect(metrics.textContrast, `${f.label} ${layout}`).toBeGreaterThanOrEqual(4.5);
        expect(metrics.safeOverflow, `${f.label} ${layout}`).toBe(false);
        expect(metrics.minFontPx, `${f.label} ${layout}`).toBeGreaterThanOrEqual(20);
      }
    }
    const bg = await mockImage(3, 1080, 1350);
    const { metrics } = await fr(() => composeAd({ format: formatsFor(["meta_feed"])[0], layout: "hero_left", palette: palette(p), typo: brandTypo(p), brand: "Sérum Éclat", headline: "Le flacon tient dans la main", cta: "Découvrir", background: bg, product: cut }));
    expect(metrics.productOverlap).toBe(false);
    // Titre sur deux lignes avec photo, dans chaque format : jamais de texte sous le bouton (défaut vu en 9:16).
    for (const f of formatsFor(["meta_feed", "meta_story", "google_display", "pinterest"]))
      for (const layout of ["hero_left", "split", "hero_center", "full_bleed"] as const) {
        const photo = await mockImage(7, f.width, f.height);
        const r = await fr(() => composeAd({ format: f, layout, palette: palette(p), typo: brandTypo(p), brand: "Sérum Éclat", headline: "Le bouchon se visse d'un geste", cta: "Découvrir", background: photo, product: cut }));
        expect(r.metrics.textOverlap, `${f.label} ${layout}`).toBe(false);
      }
  });

  it("barrière publicitaire : sans relecture jamais FINAL ; panne jamais validée ; affirmation interdite fatale ; illisible → reprise", () => {
    const okLocal = { codes: [], issues: [] };
    expect(gateAd({ local: okLocal, review: null, attempt: 0 })).toMatchObject({ verdict: "PROVISIONAL", provisional: { use: "manual" } });
    expect(gateAd({ local: okLocal, review: null, reviewError: "délai", attempt: 0 }).verdict).not.toBe("FINAL");
    expect(gateAd({ local: { codes: ["forbidden_claim"], issues: ["santé"] }, review: null, attempt: 0 })).toMatchObject({ verdict: "REJECTED", fatal: true });
    expect(gateAd({ local: { codes: ["illegible"], issues: ["contraste"] }, review: null, attempt: 0 })).toMatchObject({ verdict: "RETRY", action: "regenerate" });
    expect(gateAd({ local: okLocal, review: adReview(8.6), attempt: 0 }).verdict).toBe("FINAL");
    expect(gateAd({ local: okLocal, review: adReview(8.6, {}, { hook: 6 }), attempt: 2 }).verdict).not.toBe("FINAL"); // accroche faible
    expect(gateAd({ local: okLocal, review: adReview(9, { generic: true }), attempt: 2 }).verdict).not.toBe("FINAL"); // affiche générique
    expect(gateAd({ local: okLocal, review: adReview(9, { productAltered: true }), attempt: 0 })).toMatchObject({ verdict: "REJECTED", fatal: true });
    const m = { minFontPx: 30, textContrast: 7, textShare: 0.6, safeOverflow: true, productOverlap: true, headlineLines: 2 };
    expect(localAdChecks(m, [], "meta_story").codes).toEqual(expect.arrayContaining(["safe_zone", "product_overlap", "too_much_text"]));
    for (const p of Object.values(PLATFORM_SPECS)) expect(p.formats.length).toBeGreaterThan(0);
    expect(decide("ad_v2", { checker: "ai", score: 9.5, error: "x" }).verdict).not.toBe("FINAL");
  });

  // ------------------------------------------------------------------ moteur complet (simulé)

  it("B — cosmétique : créations par format, produit réel posé tel quel, images Image V2 réutilisées entre formats, une relecture par concept", async () => {
    const p = fresh("cosmetic");
    const cutId = await seedCutout(u.id, p.id);
    const cut = await sharp({ create: { width: 300, height: 600, channels: 4, background: { r: 199, g: 123, b: 48, alpha: 1 } } }).png().toBuffer();
    const { deps, log } = mockAdDeps({ userId: u.id, projectId: p.id, cutout: { id: cutId, data: cut } });
    const r = await fr(() => runAdEngineV2(job(p.id), p.id, { count: 3, platforms: ["meta_feed", "meta_story"] }, deps));
    expect(r.concepts).toHaveLength(3);
    expect(r.outcomes).toHaveLength(3 * 3); // 4:5, 1:1, 9:16
    expect(r.outcomes.every((o) => o.verdict === "FINAL")).toBe(true);
    expect(log.reviews).toBe(3); // format principal seulement
    expect(log.copyCalls).toHaveLength(1);
    // Jamais une image du produit regénérée : l'image V2 sert de décor, le produit réel est composé.
    expect(log.images.every((x) => x.kind !== "product_image" && x.kind !== "packshot")).toBe(true);
    expect(log.images.length).toBeLessThanOrEqual(3 * 2); // une image par orientation et par concept
    const a = getAsset(r.outcomes[0].assetId!)!;
    expect(a.role).toBe("ad");
    const m = json<any>(a.meta, {});
    expect(m.adV2).toMatchObject({ platform: "meta_feed", aspect: "4:5" });
    expect(m.adV2.copy.hook).toBeTruthy();
    expect(a.source_asset_id).toBe(m.adV2.imageAssetId);
    expect(r.strategy.budget.daily).toBeTruthy();
  });

  it("A — artisan (service) : photo du métier en plein cadre, bouton selon le mode de contact, aucune idée cadeau", async () => {
    const p = fresh("artisan");
    const { deps, log } = mockAdDeps({ userId: u.id, projectId: p.id });
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 3 }, deps));
    expect(r.concepts.length).toBeGreaterThan(0);
    expect(r.concepts.every((c) => c.visual.kind === "trade_photo")).toBe(true);
    expect(r.concepts.every((c) => c.angle.type !== "gift")).toBe(true);
    expect(log.images.every((x) => x.kind === "trade_photo")).toBe(true);
    expect(r.outcomes.some((o) => o.platform === "google_display")).toBe(true);
  });

  it("réutilisation : même campagne → créations validées réutilisées, aucune relecture ni image repayée ; une création refusée ne revient pas", async () => {
    const p = fresh("saas");
    const { deps, log } = mockAdDeps({ userId: u.id, projectId: p.id });
    const r1 = await fr(() => runAdEngineV2(null, p.id, { count: 2, platforms: ["linkedin"] }, deps));
    const reviews = log.reviews;
    const images = log.images.length;
    const r2 = await fr(() => runAdEngineV2(null, p.id, { count: 2, platforms: ["linkedin"] }, deps));
    expect(r2.outcomes.every((o) => o.reused)).toBe(true);
    expect(r2.stats.reused).toBe(r1.outcomes.length);
    expect(log.reviews).toBe(reviews);
    expect(log.images.length).toBe(images);
    run("UPDATE assets SET status = 'rejected' WHERE id = ?", r1.outcomes[0].assetId);
    const r3 = await fr(() => runAdEngineV2(null, p.id, { count: 2, platforms: ["linkedin"] }, deps));
    expect(r3.outcomes[0].reused).toBe(false);
    expect(isAutoUsable(getAsset(r1.outcomes[0].assetId!)!)).toBe(false);
  });

  it("reprises ciblées : mise en page (gratuite) puis visuel (autre image) ; jamais deux fois la même création", async () => {
    const p = fresh("hightech");
    let n = 0;
    const { deps, log } = mockAdDeps({
      userId: u.id,
      projectId: p.id,
      review: () => (++n === 1 ? adReview(7, { issues: ["hiérarchie confuse"], fix: { target: "layout", instruction: "texte à gauche" } }) : n === 2 ? adReview(7, { issues: ["image banale"], fix: { target: "visual", instruction: "image plus forte" } }) : adReview(8.7)),
    });
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 1, platforms: ["google_display"] }, deps));
    expect(r.outcomes[0]).toMatchObject({ verdict: "FINAL", attempts: 3 });
    expect(r.stats.layoutChanges).toBe(1);
    expect(log.images.filter((x) => x.variant === 1)).toHaveLength(1);
    const trials = all<any>("SELECT status FROM assets WHERE project_id = ? AND role = 'ad'", p.id);
    expect(trials.length).toBeGreaterThanOrEqual(3);
  });

  it("forfait sans IA : textes et créations locaux, PROVISOIRES (choix manuel), jamais FINAL", async () => {
    const p = fresh("restaurant");
    const { deps, log } = mockAdDeps({ userId: u.id, projectId: p.id, canWrite: false, canReview: false });
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 2, platforms: ["meta_feed"] }, deps));
    expect(log.copyCalls).toHaveLength(0);
    expect(r.outcomes.every((o) => o.verdict === "PROVISIONAL")).toBe(true);
    expect(r.concepts.every((c) => c.copyBy === "local")).toBe(true);
  });

  it("sans image disponible : création typographique de marque (jamais une image inventée)", async () => {
    const p = fresh("saas");
    const { deps } = mockAdDeps({ userId: u.id, projectId: p.id, noImage: true });
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 1, platforms: ["meta_feed"] }, deps));
    expect(r.outcomes[0].imageAssetId).toBeNull();
    expect(r.outcomes[0].verdict).toBe("FINAL");
  });

  it("plafond réel : l'appel au-delà du plafond ne part pas ; arrêt propre", async () => {
    const p = fresh("cosmetic");
    const { deps } = mockAdDeps({
      userId: u.id,
      projectId: p.id,
      write: () => {
        assertUnderCostCap(5_000_000);
        return { ads: [] };
      },
    });
    const r = await fr(() => runAdEngineV2(job(p.id), p.id, { count: 2, maxCostEur: 1 }, deps));
    expect(r.stoppedByCostCap).toBe(true);
    expect(r.outcomes).toHaveLength(0);
    expect(new CostCapReached(1, 1, 1).name).toBe("CostCapReached");
  });

  it("les cinq scénarios tournent sans traitement propre à un scénario ; visuel adapté à l'angle", async () => {
    for (const k of IMAGE_FIXTURES) {
      const p = fresh(k);
      const { deps } = mockAdDeps({ userId: u.id, projectId: p.id });
      const r = await fr(() => runAdEngineV2(null, p.id, { count: 2 }, deps));
      expect(r.outcomes.length, k).toBeGreaterThan(0);
      expect(new Set(r.concepts.map((c) => c.angle.type)).size, k).toBe(r.concepts.length);
    }
    const fs = await import("node:fs");
    const src = ["engine.ts", "angles.ts", "copy.ts", "insight.ts"].map((f) => fs.readFileSync(new URL(`../src/lib/ads-v2/${f}`, import.meta.url), "utf8")).join("\n");
    expect(src).not.toMatch(/S[ée]bastien|Lison|Nuvia|Onde Pro|Sérum Éclat/);
    const i = adInsight(fresh("cosmetic"));
    expect(visualFor({ type: "detail" } as never, i, true)).toMatchObject({ layout: "hero_center", productOnTop: true });
    expect(visualFor({ type: "detail" } as never, i, false)).toMatchObject({ layout: "typographic", productOnTop: false });
  });

  // ------------------------------------------------------------------ intégrations

  it("Planner, intention et Router : action ads.v2, livrable ad_v2 suivi ; sans IA active aucune rédaction payante", () => {
    expect(ACTION_STEPS["ads.v2"]).toEqual(["ad"]);
    expect(intentsFromAction("ads.v2")).toEqual(["CREATE_AD"]);
    expect(STEP_DELIVERABLES.ad).toContain("ad_v2");
    const off = realAdDeps(null, fresh("cosmetic"), false);
    expect(off.canWrite).toBe(false);
    expect(off.canReview).toBe(false);
    expect(defaultPlatforms("services")).toContain("google_display");
  });

  it("aucun secret ni consigne IA stockés avec la création ; verdicts et trace de la barrière enregistrés", async () => {
    const p = fresh("cosmetic");
    const { deps } = mockAdDeps({ userId: u.id, projectId: p.id });
    const r = await fr(() => runAdEngineV2(null, p.id, { count: 1, platforms: ["meta_feed"] }, deps));
    const a = getAsset(r.outcomes[0].assetId!)!;
    expect(a.meta).not.toMatch(/Rôle : concepteur|CORRECTIONS EXIGÉES|sk-/);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM quality_checks WHERE project_id = ? AND deliverable = 'ad_v2'", p.id)!.n).toBeGreaterThan(0);
  });
});
