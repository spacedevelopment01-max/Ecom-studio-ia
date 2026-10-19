/** Isolated native orchestration proof. Never imported by the application. ALL provider responses are injected. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const dir = process.env.DATA_DIR;
if (!dir || !path.isAbsolute(dir) || !path.basename(dir).startsWith("ecs-parcours-test-"))
  throw Error("Refus : DATA_DIR absolu ecs-parcours-test-* isolé obligatoire.");
fs.mkdirSync(dir, { recursive: true });
// Must precede every application import. No API, Pixabay or external resource may be requested.
globalThis.fetch = async () => { throw Error("RÉSEAU INTERDIT — fournisseurs et Pixabay simulés isolés."); };
const { all, one, run, now } = await import("../../src/lib/db");
const { createUser } = await import("../../src/lib/auth");
const { getSubscription, alignPeriod, syncAllowance, creditTopup } = await import("../../src/lib/billing");
const { accountKeyFor } = await import("../../src/lib/project-billing");
const { setSetting, setJsonSetting } = await import("../../src/lib/settings");
const { MEDIA_MODELS } = await import("../../src/lib/ai/media-models");
const { REQUIRED_LOGO_MODEL, REQUIRED_LOGO_PROVIDER } = await import("../../src/lib/ai/logo-policy");
const { PROOF_CASES } = await import("./cases");
type PrivateCase = { slug: string; uid: string; token: string; pid?: string; input: (typeof PROOF_CASES)[number]["input"]; mobile: boolean };
const privatePath = path.join(dir, "private.json");
const command = process.argv[2];
const xml = (s: string) => s.replace(/[<>&]/g, " ");
const syntheticPng = (width: number, height: number, label: string, number = 0) => sharp(Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${["#28504a", "#483d68", "#614024", "#1c4669"][number % 4]}"/><rect x="12%" y="24%" width="76%" height="38%" fill="#dfd8c5"/><text x="50%" y="16%" text-anchor="middle" font-size="${width / 31}" fill="white">SIMULATION — AUCUN FOURNISSEUR</text><text x="50%" y="42%" text-anchor="middle" font-size="${width / 35}" fill="#172927">${xml(label)}</text><text x="50%" y="55%" text-anchor="middle" font-size="${width / 35}" fill="#172927">Composition synthétique ${number + 1}</text><text x="50%" y="78%" text-anchor="middle" font-size="${width / 34}" fill="white">QUALITÉ CRÉATIVE NON VALIDÉE</text></svg>`,
)).png().toBuffer();

if (command === "seed") {
  if (fs.existsSync(privatePath) || one<{ n: number }>("SELECT COUNT(*) n FROM projects")!.n) throw Error("Dossier non vierge : refus d’écraser ou de précompléter un projet.");
  const cases: PrivateCase[] = [];
  for (const item of PROOF_CASES) {
    const u = await createUser(`parcours-${crypto.randomUUID()}@example.test`, crypto.randomBytes(32).toString("hex"), "Compte fictif de vérification");
    run("UPDATE users SET role='client' WHERE id=?", u.id);
    getSubscription(u.id);
    run("UPDATE subscriptions SET status='active',plan='dominer',billing='monthly',owner_user_id=? WHERE user_id=?", u.id, u.id);
    alignPeriod(u.id, now()); syncAllowance(u.id);
    const token = crypto.randomBytes(32).toString("base64url");
    run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", crypto.createHash("sha256").update(token).digest("hex"), u.id, now() + 86_400_000, now());
    cases.push({ ...item, uid: u.id, token });
  }
  for (const provider of ["openai", "anthropic"]) setSetting(`provider.${provider}.apiKey`, "synthetic-never-contact-provider", true);
  const media = MEDIA_MODELS.find(m => m.provider === "openai" && m.kind === "image" && m.caps.textInImage && (m.caps.references ?? 0) >= 3);
  if (!media) throw Error("Catalogue de route simulée absent.");
  const route = `${media.provider}:${media.model}`;
  const logoRoute = `${REQUIRED_LOGO_PROVIDER}:${REQUIRED_LOGO_MODEL}`;
  setJsonSetting("ai.media.usage", Object.fromEntries(["social_image", "ad_visual", "text_layout"].map(usage => [usage, { primary: route }])));
  // The required logo policy is preserved. Its native quote needs a bounded per-image price;
  // this synthetic price is TEST DATA, never a verified supplier price or production configuration.
  setJsonSetting("ai.media.models", { [route]: { enabled: true, confirmedAt: now() }, [logoRoute]: { enabled: true, confirmedAt: now() } });
  setJsonSetting("ai.prices", { [route]: { unit: "image", perImage: .08 }, [logoRoute]: { unit: "image", perImage: .08 } }); setSetting("ai.prices.checkedAt", String(now()));
  await sharp(await syntheticPng(1200, 900, "PHOTO FOURNIE À LA CRÉATION — FICTIVE")).toFile(path.join(dir, "photo-test.png"));
  const { execTool } = await import("../../src/lib/exec-tool");
  for (let n = 0; n < 2; n++) await execTool("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `testsrc2=size=1280x720:rate=${5 + n}`, "-t", "3", "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(dir, `video-test-${n}.mp4`)]);
  fs.writeFileSync(privatePath, JSON.stringify(cases), { mode: 0o600 });
  const projectCountAfterSeed = one<{ n: number }>("SELECT COUNT(*) n FROM projects")!.n;
  if (projectCountAfterSeed !== 0) throw Error("Le seed a créé un projet par effet indirect : preuve refusée.");
  fs.writeFileSync(path.join(dir, "seed-public.json"), JSON.stringify({ simulation: true, seedScope: "accounts, subscriptions, fake keys, session cookies and test files only", projectCountAfterSeed, realPayments: 0, providerCalls: 0, cases: cases.map(c => ({ slug: c.slug, business: c.input.business, mobile: c.mobile })) }, null, 2));
  console.log("Quatre comptes fictifs, zéro projet. Les quatre projets seront créés dans le navigateur. Aucun appel externe.");
} else if (command === "fund") {
  const cases: PrivateCase[] = JSON.parse(fs.readFileSync(privatePath, "utf8")), c = cases.find(c => c.slug === process.argv[3]);
  if (!c) throw Error("Cas de test inconnu.");
  const p = one<{ id: string }>("SELECT id FROM projects WHERE user_id=?", c.uid);
  if (!p) throw Error("Créer d’abord le projet dans l’interface.");
  creditTopup(accountKeyFor(c.uid, p.id), 500, `synthetic-parcours-proof:${c.slug}`);
  console.log("Recharge entièrement fictive dans la base isolée, budget natif limité à 50 % HT ; aucun achat.");
} else if (command === "check-copy") {
  const { injectedContents } = await import("./content");
  const { analyzeLocally } = await import("../../src/lib/preparation/brief");
  const { localBrand } = await import("../../src/lib/engine/local");
  const { loadProject } = await import("../../src/lib/projects");
  const template = one<{ id: string }>("SELECT id FROM projects LIMIT 1");
  if (!template) throw Error("Lecture d’un projet fictif existant requise ; aucun projet ne sera créé pour ce contrôle.");
  const results = PROOF_CASES.map(c => {
    const p = structuredClone(loadProject(template.id)), brief = analyzeLocally(c.input);
    p.id = `in-memory:${c.slug}`; p.name = c.input.offerName; p.product = brief.profile;
    p.business = c.input.business; p.services = brief.services;
    const identity = localBrand(p.product, c.input.brandName, p);
    p.brand = { ...identity.brand, audience: c.input.target }; p.strategy = identity.strategy;
    const contents = injectedContents(p);
    return { case: c.slug, pages: contents.documents.map(d => ({ key: d.doc.page.key, blocks: d.doc.blocks.length, characters: d.doc.blocks.map(b => "text" in b ? b.text : "").join(" ").length })), nativeChecksPassed: true };
  });
  console.log(JSON.stringify({ simulation: true, projectsCreated: 0, persistedVersions: 0, results }, null, 2));
} else if (command === "check-artwork") {
  const { injectedArtwork } = await import("./artwork");
  const { cleanArtwork } = await import("../../src/lib/logo-v2/artwork");
  const { visualHash, hashDistance, SAME_LOGO_BITS, isPlaceholderShape } = await import("../../src/lib/logo-v2/identity");
  const results = [];
  for (const c of PROOF_CASES) {
    const hashes: string[] = []; const distances: number[] = [];
    for (const series of [1, 2]) for (const direction of [1, 2, 3]) {
      const png = await injectedArtwork(c.input.brandName, `t${direction}`, series);
      if (!png.equals(await injectedArtwork(c.input.brandName, `t${direction}`, series))) throw Error("Une même clé de fixture produit des octets différents.");
      const cleaned = await cleanArtwork(png);
      if (await isPlaceholderShape(cleaned)) throw Error("Dessin injecté réduit à un remplissage simple.");
      const hash = await visualHash(cleaned);
      for (const prior of hashes) { const distance = hashDistance(prior, hash); distances.push(distance); if (distance <= SAME_LOGO_BITS) throw Error(`Dessin injecté quasi identique (${distance} bits) : ${c.slug}, série ${series}, direction ${direction}`); }
      hashes.push(hash);
    }
    results.push({ case: c.slug, drawings: hashes.length, sameKeySameBytes: true, nativeCleanApplied: true, nativeDuplicateThreshold: SAME_LOGO_BITS, minimumDistance: Math.min(...distances), allPairsDistinct: true });
  }
  console.log(JSON.stringify({ simulation: true, realProviderCalls: 0, persistedAssets: 0, results }, null, 2));
} else if (command === "worker") {
  const { claimNext, JobContext, completeJob, failJob } = await import("../../src/lib/jobs");
  const { runPreparation, stateOf } = await import("../../src/lib/preparation/engine");
  const { simulatedDependencies } = await import("../../tests/preparation-fixtures");
  const { directionIdentity } = await import("../../tests/preparation-mission-fixtures");
  const { localTerritories } = await import("../../src/lib/logo-v2/territories");
  const { ART_CRITERIA } = await import("../../src/lib/logo-v2/types");
  const { realLogoV2Ai } = await import("../../src/lib/logo-v2/ai");
  const { runLogoEngineV2 } = await import("../../src/lib/logo-v2/engine");
  const { currentSeries } = await import("../../src/lib/logo-v2/direction-series");
  const { mediaRouteFor } = await import("../../src/lib/ai/media-providers");
  const { chooseLogoV2 } = await import("../../src/lib/logo-v2/choose");
  const { loadProject } = await import("../../src/lib/projects");
  const { saveAsset, getAsset, assetData } = await import("../../src/lib/library");
  const { bindEditorial, recommendationCatalogue } = await import("../../src/lib/preparation/editorial");
  const { REFERENCE_THEME_IDS } = await import("../../src/lib/project-handoff/categories");
  const { saveContentVersion } = await import("../../src/lib/seo-v2/store");
  const { injectedContents } = await import("./content");
  const { injectedArtwork } = await import("./artwork");
  const { placementHash } = await import("../../src/lib/preparation/media-context");
  const { runForUser } = await import("../../src/lib/ai/access");
  const { runWithLang } = await import("../../src/lib/i18n-server");
  const { realInitialDeps, runInitialCreatives } = await import("../../src/lib/social-v2/initial");
  const { tryStartInitialFromConsent } = await import("../../src/lib/social-v2/initial-authorization");
  const { makeInitialPlan, injectedInitial } = await import("../../tests/initial-fixtures");
  const { designPostWithAi } = await import("../../src/lib/social-v2/ai-post");
  const { campaignConcept, campaignVerdict } = await import("../../tests/publication-fixtures");
  const { FORMATS } = await import("../../src/lib/image-v2/formats");
  const failures = new Set<string>();
  async function logo(ctx: InstanceType<typeof JobContext>) {
    const p = loadProject(ctx.job.project_id!);
    const ai = { ...realLogoV2Ai(ctx, { userId: p.userId, projectId: p.id }),
      territories: async (brief: Parameters<ReturnType<typeof realLogoV2Ai>["territories"]>[0]) => localTerritories(brief).slice(0, 3).map((t, i) => ({ ...t, source: "ai" as const, identity: directionIdentity(i) })),
      artworkRoute: () => { const r = mediaRouteFor("logo"); return r ? { provider: r.provider, model: r.model } : { unavailable: "Route simulée absente" }; },
      drawArtwork: async (territory: { id: string }) => injectedArtwork(p.brand!.name, territory.id, currentSeries(p.id)!.ordinal),
      reviewArtwork: async (_b: Buffer, _t: unknown, _brief: unknown, expected: { name: string; descriptor: string | null; tagline: string | null }): Promise<import("../../src/lib/logo-v2/types").ArtworkReview> => ({ criteria: Object.fromEntries(ART_CRITERIA.map(k => [k, 9])) as import("../../src/lib/logo-v2/types").ArtworkReview["criteria"], textRead: [expected.name, expected.descriptor, expected.tagline].filter(Boolean).join(" "), nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, person: false, issues: [], needsSimplifiedMark: false, genericConcept: false, fix: { target: "none" as const, instruction: "" } }),
    };
    const result = await runLogoEngineV2(ctx, p.id, { ai, completeSeries: true, capMicro: ctx.payload.costCapMicro ?? ctx.payload.capMicro, renew: ctx.payload.renew, expectedSeriesId: ctx.payload.expectedSeriesId, correction: ctx.payload.feedback ?? ctx.payload.correction });
    return { result, ids: currentSeries(p.id)?.directions.map(d => d.logoId) ?? [] };
  }
  const preparation: typeof simulatedDependencies = { ...simulatedDependencies,
    inspect: async (p, brief) => {
      if (!brief.input.photoIds.length) throw Error("Photo de création non transmise à l’analyse de test.");
      const observations: string[] = [];
      for (const aid of brief.input.photoIds) {
        const asset = getAsset(aid); if (!asset || asset.project_id !== p.id) throw Error("Photo étrangère au projet.");
        const image = await sharp(assetData(asset)).metadata();
        observations.push(`Photo de test réellement lue : ${image.width} × ${image.height}. Compréhension métier injectée, aucune analyse visuelle réelle d’un fournisseur.`);
      }
      return { ...brief, provenance: "simulation", observations };
    },
    logos: async (_p, ctx) => (await logo(ctx)).ids,
    contents: async (p, ctx) => {
      const c = injectedContents(p);
      for (const document of c.documents) {
        saveContentVersion(p.id, document.docKey, document.doc, { verdict: "FINAL", note: "Réponse et verdict de test injectés, aucun fournisseur réel" });
      }
      const catalogue = recommendationCatalogue(p), eligible = catalogue.filter(x => x.status === "in_progress");
      const referenceIds = REFERENCE_THEME_IDS.filter(ref => eligible.some(x => x.referenceId === ref));
      const bound = bindEditorial(c, { copy: c.copy, missing: [],
        recommendation: { recommendedReferenceId: referenceIds[0] ?? null, alternativesReferenceIds: referenceIds.slice(1), reasons: ["Recommandation de test injectée parmi les quatre références actives. Raccordement au moteur encore en attente, aucun ancien thème de remplacement."] },
        slots: c.slots.map((s, i) => ({ key: s.key, pageKey: s.pageKey, sectionKey: s.sectionKey, scene: `Scène distincte de test ${i + 1} : ${s.purpose}`, queries: ["activité fictive", "usage test"], caption: "Média synthétique à contrôler", alt: `Illustration de test : ${s.purpose}`, rationale: "Liaison de test avec le texte de cette section" })),
        blocks: c.pages.flatMap(pg => pg.sections.map((section, i) => ({ pageKey: pg.key, sectionKey: section.key, objective: section.purpose, message: "Information du brief fictif", docKey: c.documents.find(d => d.doc.page.key === pg.key)!.docKey, blockIds: [...(i === 0 ? [`${pg.key}-title`] : []), `${pg.key}-${section.key}`], mediaSlotKeys: c.slots.filter(s => s.pageKey === pg.key && s.sectionKey === section.key).map(s => s.key), rationale: "Affectation explicite : aucun texte coupé ni bloc perdu" }))),
      }, catalogue);
      const simulatedCopy = JSON.parse(JSON.stringify(bound.copy).replace(/\[(?:[ÀA] compl[eé]ter|To complete|Por completar)[^\]]*\]/gi, "Information non déclarée dans ce test fictif"));
      return { ...bound, copy: simulatedCopy, execution: { provider: "simulation", model: "injected", usageKey: `proof:${ctx.job.id}`, at: now(), vision: false }, provenance: "simulation" as const };
    },
    image: async (p, _ctx, slot) => {
      const c = stateOf(p.id)!.stages.content!.data;
      const i = c.slots.findIndex(s => s.key === slot.key);
      const stock = slot.source === "pixabay" ? { source: "pixabay", id: `SIMULATION-${p.id}-${i}`, author: "Fictif", page: "https://pixabay.com/", license: "SIMULATION : aucun fichier Pixabay réellement collecté" } : undefined;
      const base = { projectId: p.id, userId: p.userId, origin: slot.source === "pixabay" ? "import" as const : "generated" as const, status: "approved" as const, meta: { simulation: true, stock, gate: { verdict: "FINAL", fatal: false, checker: "simulation" } } };
      let a, posterId: string | undefined;
      if (slot.kind === "video") {
        a = await saveAsset({ ...base, data: fs.readFileSync(path.join(dir!, `video-test-${i % 2}.mp4`)), name: `simulation-${i}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.shop" });
        posterId = (await saveAsset({ ...base, origin: "generated", data: await syntheticPng(1280, 720, "POSTER VIDÉO FICTIVE", i), name: `poster-${i}.png`, mime: "image/png", role: "video-poster", sourceAssetId: a.id })).id;
      } else {
        const [w, h] = slot.aspect === "1:1" ? [1080, 1080] : slot.aspect === "9:16" ? [900, 1600] : [1600, 900];
        a = await saveAsset({ ...base, data: await syntheticPng(w, h, `SITE — ${slot.key}`, i), name: `simulation-site-${i}.png`, mime: "image/png", role: "scene", folderKey: "images.scenes" });
      }
      const receipt = { ...slot, assetId: a.id, posterId, reviewed: false, alignment: { status: "accepted", reason: "Verdict d’alignement injecté pour le test seulement", contextHash: placementHash(p, c, slot) } };
      run("UPDATE assets SET meta=json_set(meta,'$.preparation.reviewedSlot',json(?)) WHERE id=?", JSON.stringify(receipt), a.id);
      return a.id;
    },
  };
  for (;;) {
    const j = claimNext(["project.prepare", "brand.logo.v2", "brand.logo.v2.choose", "social.initial"]);
    if (!j) { await new Promise(resolve => setTimeout(resolve, 200)); continue; }
    const ctx = new JobContext(j);
    try {
      const output = await runWithLang({ ui: "fr", content: "fr" }, () => runForUser(j.user_id, async () => {
        if (j.type === "project.prepare") {
          if (ctx.payload.correction?.includes("[TEST_ECHEC_FOURNISSEUR]")) throw Error("ÉCHEC FOURNISSEUR SIMULÉ : données et versions conservées.");
          return runPreparation(ctx, preparation);
        }
        if (j.type === "brand.logo.v2") return (await logo(ctx)).result;
        if (j.type === "brand.logo.v2.choose") { const result = await chooseLogoV2(ctx, j.project_id!, ctx.payload.assetId); tryStartInitialFromConsent(j.project_id!); return result; }
        const deps = realInitialDeps(), injected = injectedInitial(); let render = 0;
        deps.plan = async () => makeInitialPlan(); deps.reviewPlan = injected.deps.reviewPlan; deps.repairPlan = injected.deps.repairPlan; deps.reviewVisual = injected.deps.reviewVisual;
        deps.render = async (p, post, aspect, cap, _ctx, attemptLimit) => {
          // Observable progression is needed for a meaningful no-reload UI assertion, including mobile.
          await new Promise(resolve => setTimeout(resolve, 700));
          if (p.business === "services" && ++render === 4 && !failures.has(p.id)) { failures.add(p.id); throw Error("INTERRUPTION SIMULÉE après trois créations acceptées : les acquis sont conservés."); }
          const reference = p.business === "products" ? stateOf(p.id)!.stages.brief!.data.input.photoIds[0] : null;
          return designPostWithAi(p, post, { as: post.entryPoint === "ads-campaign" ? "ad" : "post", aspect, reference, maxCostEur: cap / 1e6, maxAttempts: attemptLimit }, {
            copy: async (_p, _post, f) => ({ ...f, cta: "", scene: "Composition injectée, pas une IA réellement exécutée", concept: { ...campaignConcept(), ctaStyle: "none" } }),
            generate: async (prompt, requestedAspect, suppliedPhoto, key, suppliedLogo) => {
              if (requestedAspect !== aspect) throw Error("Format perdu avant l’adaptateur de génération.");
              if (p.business === "products" && !suppliedPhoto) throw Error("Photo produit perdue avant l’adaptateur de génération.");
              if (!suppliedLogo) throw Error("Logo actif absent à l’entrée de génération.");
              const activeLogo = p.brand?.logo.assetId ? getAsset(p.brand.logo.assetId) : null;
              if (!activeLogo || !suppliedLogo.equals(assetData(activeLogo))) throw Error("Les octets du logo actif ne sont pas transmis à l’adaptateur.");
              if (p.business === "products" && reference) {
                const original = getAsset(reference);
                if (!original || original.project_id !== p.id || !suppliedPhoto!.equals(assetData(original))) throw Error("Les octets de la photo produit ont été remplacés ou mélangés avec un autre projet.");
              }
              const photo = suppliedPhoto ? await sharp(suppliedPhoto).metadata() : null, logo = await sharp(suppliedLogo).metadata();
              const receipt = { simulation: true, providerInvoked: false, projectId: p.id, business: p.business, purpose: post.entryPoint === "ads-campaign" ? "ad" : "organic", aspect, usageKey: key, promptHash: crypto.createHash("sha256").update(prompt).digest("hex"), brandNameInPrompt: prompt.includes(p.brand!.name), originalPhotoBytesMatch: p.business === "products", activeLogoBytesMatch: true, sourcePhoto: photo ? { assetId: reference, width: photo.width, height: photo.height } : null, activeLogo: { assetId: activeLogo.id, width: logo.width, height: logo.height } };
              fs.appendFileSync(path.join(dir!, "injected-input-receipts.jsonl"), JSON.stringify(receipt) + "\n");
              const f = FORMATS[aspect]; return syntheticPng(f.width, f.height, `${post.entryPoint === "ads-campaign" ? "PUBLICITÉ" : "ORGANIQUE"} — ${post.title}`, render);
            },
            review: async (_b, _r, texts) => ({ ...campaignVerdict(), person: false, anatomyOk: true, productFaithful: true, textsExact: true, legible: true, score: 9.2, transcribed: texts, issues: [], fix: "" }), maxMicro: () => 0, spentMicro: () => 0,
          });
        };
        return runInitialCreatives(ctx, deps);
      }, "normal", j.project_id));
      completeJob(j.id, output); console.log(`SIMULATION : ${j.type} terminé ; aucun fournisseur appelé.`);
    } catch (error) {
      failJob(j, error, { permanent: true });
      if (j.type === "project.prepare") {
        const { commitState } = await import("../../src/lib/preparation/store"), s = stateOf(j.project_id!);
        if (s?.pending?.jobId === j.id) commitState(j.project_id!, s.revision, n => { delete n.pending; n.error = { step: ctx.payload.step, message: (error as Error).message, at: now() }; });
      }
      console.log(`SIMULATION : ${j.type} refusé : ${(error as Error).message}`);
    }
  }
} else if (command === "evidence") {
  const { stateOf, readyContract } = await import("../../src/lib/preparation/engine");
  const { initialCreativesView } = await import("../../src/lib/social-v2/initial");
  const { directionSeries } = await import("../../src/lib/logo-v2/direction-series");
  const { loadProject } = await import("../../src/lib/projects");
  const { finalMediaIssues } = await import("../../src/lib/preparation/media-policy");
  const cases: PrivateCase[] = JSON.parse(fs.readFileSync(privatePath, "utf8"));
  const projects = cases.map(c => {
    const row = one<{ id: string }>("SELECT id FROM projects WHERE user_id=?", c.uid); if (!row) throw Error(`Projet non créé : ${c.slug}`);
    const p = loadProject(row.id), s = stateOf(row.id), ready = readyContract(row.id);
    return { case: c.slug, business: p.business, simulation: true, stages: s?.stages, ready, series: directionSeries(row.id), initial: initialCreativesView(row.id), realMediaPolicyIssuesEvenInSimulation: s?.stages.media && s?.stages.content ? finalMediaIssues(p, s.stages.media.data.slots, s.stages.content.data) : ["Étapes incomplètes"], posts: all("SELECT id,title,caption,format,status,scheduled_at,connection_id,media FROM posts WHERE project_id=?", row.id), jobs: all("SELECT type,status,max_attempts,error FROM jobs WHERE project_id=?", row.id), roles: all("SELECT role,COUNT(*) count FROM assets WHERE project_id=? AND deleted_at IS NULL GROUP BY role", row.id) };
  });
  const evidence = { simulation: true, originalProjectCount: 0, projectsCreatedThroughUi: projects.length, actualProviderCalls: one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n, actualProviderCostMicro: 0, themes: one<{ n: number }>("SELECT COUNT(*) n FROM theme_versions")!.n, socialConnections: one<{ n: number }>("SELECT COUNT(*) n FROM connections")?.n ?? 0, projects };
  fs.writeFileSync(path.join(dir, "persistence-evidence.json"), JSON.stringify(evidence, null, 2));
  console.log("Preuve expurgée sauvegardée : quatre parcours créés via UI, aucun fournisseur ni thème.");
} else throw Error("seed | fund <cas> | check-copy | check-artwork | worker | evidence");
