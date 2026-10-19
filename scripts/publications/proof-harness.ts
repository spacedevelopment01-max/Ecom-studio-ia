/** Isolated UI/queue/storage proof ONLY. No real provider, network disabled in the worker. Never imported by production. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const dir = process.env.DATA_DIR;
if (
  !dir ||
  !path.isAbsolute(dir) ||
  !path.basename(dir).startsWith("ecs-publication-test-")
)
  throw new Error(
    "Refus : DATA_DIR temporaire ecs-publication-test-* obligatoire.",
  );
fs.mkdirSync(dir, { recursive: true });
const { loadProject, saveBrand, saveProduct, saveServices, saveStrategy } =
  await import("../../src/lib/projects");
const { createUser } = await import("../../src/lib/auth");
const { emptyProduct, emptyServiceProfile } =
  await import("../../src/lib/project-types");
const { localBrand } = await import("../../src/lib/engine/local");
const { seedImageFixture } = await import("../../tests/image-v2-fixtures");
const { campaignCopy, campaignVerdict } =
  await import("../../tests/publication-fixtures");
const { grantProjectPlan } =
  await import("../../src/lib/project-subscriptions");
const { getSubscription, syncAllowance } =
  await import("../../src/lib/billing");
const { all, run, now } = await import("../../src/lib/db");
const { saveAsset, assetMeta, getAsset, assetData } =
  await import("../../src/lib/library");
const { FORMATS } = await import("../../src/lib/image-v2/formats");
const { MEDIA_MODELS } = await import("../../src/lib/ai/media-models");
const { setSetting, setJsonSetting } = await import("../../src/lib/settings");
const { claimNext, JobContext, completeJob, failJob } =
  await import("../../src/lib/jobs");
const { generateAiPostImage } =
  await import("../../src/lib/engine/ai-post-image");
const { runWithLang } = await import("../../src/lib/i18n-server");
const { aiPostProbableMicro } = await import("../../src/lib/ai/estimate");
const { aiPostEstimate } = await import("../../src/lib/social-v2/deps");
const { usagePrimary } = await import("../../src/lib/ai/media-routing");
const png = (w: number, h: number, title: string) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#264e5b"/><rect x="10%" y="18%" width="80%" height="60%" rx="30" fill="#9ebcb1"/><text x="50%" y="35%" fill="#18272f" text-anchor="middle" font-size="${Math.round(w / 25)}">SIMULATION — PAS UNE CRÉATION IA</text><text x="50%" y="47%" text-anchor="middle" font-size="${Math.round(w / 22)}">${title.replace(/[<&>]/g, "")}</text><text x="50%" y="65%" text-anchor="middle" font-size="${Math.round(w / 28)}">Preuve du parcours et des dimensions uniquement</text></svg>`,
    ),
  )
    .png()
    .toBuffer();
const command = process.argv[2];
if (command === "seed") {
  if (fs.existsSync(path.join(dir, "private.json")))
    throw new Error("Jeu déjà initialisé");
  const cases = [];
  for (const kind of ["hightech", "artisan"] as const) {
    const u = await createUser(
      `publication-${crypto.randomUUID()}@test.invalid`,
      crypto.randomBytes(24).toString("hex"),
      "Preuve isolée",
    );
    const pid = seedImageFixture(u.id, kind);
    // Replace every seeded identifying field before any screenshot or public evidence is produced.
    const product = {
      ...emptyProduct(),
      name: kind === "hightech" ? "Casque de test" : "Finitions de test",
      nameStatus: "provided" as const,
      category: kind === "hightech" ? "Casque audio" : "Finitions intérieures",
      sector:
        kind === "hightech" ? ("hightech" as const) : ("batiment" as const),
      facts:[{key:"material-test",label:"Matière de test",value:"Structure synthétique documentée",status:"confirmed" as const,source:"user" as const},{key:"usage-test",label:"Usage de test",value:"Démonstration de préparation",status:"confirmed" as const,source:"user" as const}],
      summary:
        "Données entièrement synthétiques pour vérifier le parcours. Aucune promesse commerciale réelle.",
    };
    const services = {
      ...emptyServiceProfile(),
      area: "Zone fictive de test",
      services:
        kind === "artisan"
          ? [
              "Préparation des supports",
              "Finitions peintes",
              "Conseil couleur",
            ].map((name) => ({
              name,
              description:
                "Prestation fictive, illustration générée non présentée comme réalisation réelle.",
            }))
          : [],
    };
    run("DELETE FROM memory WHERE project_id=?", pid);
    run("UPDATE projects SET sources_json='[]' WHERE id=?", pid);
    const local = localBrand(
      product,
      kind === "hightech" ? "Test Audio" : "Test Finitions",
      {
        business: kind === "artisan" ? "services" : "products",
        services,
      } as any,
    );
    saveProduct(pid, product);
    saveServices(pid, services);
    saveBrand(pid, { ...local.brand, nameStatus: "validated" });
    saveStrategy(pid, local.strategy);

    grantProjectPlan(pid, "dominer");
    getSubscription(u.id);
    run(
      "UPDATE subscriptions SET status='active',plan='dominer' WHERE user_id=?",
      u.id,
    );
    syncAllowance(u.id);
    await saveAsset({
      projectId: pid,
      userId: u.id,
      data: await png(1080, 1350, "Référence de test"),
      name: "reference-synthetique.png",
      mime: "image/png",
      role: "original",
      folderKey: "product.originals",
      origin: "upload",
      status: "approved",
      meta: {
        simulation: true,
        triage: { kind: "packshot", productVisible: true },
      },
    });
    const logo = await saveAsset({
      projectId: pid,
      userId: u.id,
      data: await png(1024, 1024, "Logo de test"),
      name: "logo-synthetique.png",
      mime: "image/png",
      role: "logo",
      folderKey: "brand.logos",
      origin: "upload",
      status: "approved",
      meta: { simulation: true },
    });
    const project = loadProject(pid),
      brand = project.brand!;
    saveBrand(pid, {
      ...brand,
      nameStatus: "validated",
      logo: { ...brand.logo, assetId: logo.id },
      artIdentity: {
        directionId: "test-direction",
        seriesId: "test-series",
        signature: "Identité synthétique de preuve",
        palette: brand.palette,
        colorRoles: {
          primary: "Couleur de marque",
          secondary: "Appui",
          accent: "Action",
          light: "Respiration",
          dark: "Ancrage",
        },
        fonts: brand.fonts ?? { heading: "inter", body: "inter" },
        tone: {
          voice: "Clair et concret",
          do: ["Messages factuels"],
          dont: ["Promesses inventées"],
        },
        mood: "Propre au projet",
        graphicLanguage: "Contrastes et espaces calmes",
        rules: ["Logo fidèle", "Aucun humain sans autorisation"],
        sampleText: "Message de test",
      },
    });
    const token = crypto.randomBytes(32).toString("base64url");
    run(
      "INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)",
      crypto.createHash("sha256").update(token).digest("hex"),
      u.id,
      now() + 86400000,
      now(),
    );
    cases.push({
      pid,
      uid: u.id,
      token,
      business: kind === "artisan" ? "service" : "produit",
    });
  }
  // Synthetic configuration exists only in this guarded test database. No credential is real.
  setSetting(
    "provider.anthropic.apiKey",
    "synthetic-never-contact-provider",
    true,
  );
  setSetting(
    "provider.openai.apiKey",
    "synthetic-never-contact-provider",
    true,
  );
  const m = MEDIA_MODELS.find(
    (m) =>
      m.provider === "openai" &&
      m.kind === "image" &&
      m.caps.textInImage &&
      (m.caps.references ?? 0) >= 3,
  )!;
  setJsonSetting("ai.media.usage", {
    social_image: { primary: `${m.provider}:${m.model}` },
  });
  setJsonSetting("ai.media.models", {
    [`${m.provider}:${m.model}`]: { enabled: true, confirmedAt: now() },
  });
  setJsonSetting("ai.prices", {
    [`${m.provider}:${m.model}`]: { unit: "image", perImage: 0.08 },
  });
  setSetting("ai.prices.checkedAt", String(now()));
  fs.writeFileSync(path.join(dir, "private.json"), JSON.stringify(cases), {
    mode: 0o600,
  });
  console.log(
    "Deux projets synthétiques, forfaits et routes simulés ; aucune clé réelle.",
  );
} else if (command === "worker") {
  globalThis.fetch = async () => {
    throw new Error("Réseau interdit — harnais de preuve simulée");
  };
  if (!fs.existsSync(path.join(dir, "private.json")))
    throw new Error("Seed de test requis");
  for (;;) {
    const j = claimNext(["image.ai_post","social.v2.produce","ads.v2"]);
    if (!j) {
      await new Promise((r) => setTimeout(r, 250));
      continue;
    }
    try {
      const payload = JSON.parse(j.payload);
      const ctx = new JobContext(j);
      let pageLabel="";
      const deps:import("../../src/lib/social-v2/ai-post").AiPostDeps = {
          copy:async(p,post,...rest)=>{pageLabel=post.series?`Page ${post.series.index} / ${post.series.total}`:"Contenu simulé";return campaignCopy(p,post,rest[0]);},
          operationId: payload.request?.sourceAssetId ? j.id : undefined,
          generate: async (_pr, aspect) => {
            const f = FORMATS[aspect];
            return png(
              f.width,
              f.height,
              payload.request?.sourceAssetId
                ? "Retouche simulée"
                : `${pageLabel} — simulation`,
            );
          },
          review: async (_i, _r, texts) => ({
            ...campaignVerdict(),
            transcribed: texts,
            person: false,
            anatomyOk: true,
            productFaithful: true,
            textsExact: true,
            legible: true,
            score: 9.2,
            issues: [],
            fix: "",
          }),
          maxMicro: () => 0,
          spentMicro: () => 0,
        };
      const out = await runWithLang({ui:"fr",content:"fr"},async()=>{
        if(j.type==="ads.v2"){
          const {runAdEngineV2}=await import('../../src/lib/ads-v2/engine');const {designPostWithAi}=await import('../../src/lib/social-v2/ai-post');
          const p=loadProject(payload.projectId);
          return runAdEngineV2(ctx,p.id,payload.request,{canWrite:false,canReview:false,canGenerate:false,writeCopy:async()=>{throw Error("Fournisseur réel interdit");},review:async()=>{throw Error("Fournisseur réel interdit");},image:async()=>null,cutout:()=>null,logo:()=>null,
            finalAd:async i=>{const ref=p.business==="products"?all<{id:string}>("SELECT id FROM assets WHERE project_id=? AND role='original' AND deleted_at IS NULL",p.id)[0]?.id:null;
              const r=await designPostWithAi(p,{id:`campaign-${i.conceptId}`,entryPoint:"ads-campaign",network:i.platform??"meta_feed",format:"image",title:i.hook,headline:i.hook,caption:"",pillar:i.angle,objective:"convert",scheduled_at:null,request:i.subject,advertising:JSON.parse(i.campaignContext??"{}")},{aspect:i.aspect,reference:ref??null,maxCostEur:i.maxCostEur,as:"ad"},deps);return {assetId:r.assetId,costMicro:r.costMicro,reason:r.note};}
          });
        }
        if(j.type==="social.v2.produce"){
          const {produceBatch}=await import('../../src/lib/social-v2/production');
          const {realSocialDeps}=await import('../../src/lib/social-v2/deps');
          const {designPostWithAi}=await import('../../src/lib/social-v2/ai-post');
          const p=loadProject(payload.projectId);
          return produceBatch(p,payload.ids,{...realSocialDeps(ctx,p,true),estimate:()=>0,probable:()=>0,aiPost:async(pp,post,o)=>designPostWithAi(pp,post,{aspect:"4:5",reference:null,maxCostEur:o.maxCostEur},deps)},payload);
        }
        return generateAiPostImage(ctx,payload.projectId,payload.request,deps);
      });
      completeJob(j.id, out);
    } catch (e) {
      failJob(j, e, { permanent: true });
      console.error(String(e));
    }
  }
} else if (command === "evidence") {
  const assets = all<{
    id: string;
    meta: string;
    status: string;
    width: number;
    height: number;
  }>(
    "SELECT id,meta,status,width,height FROM assets WHERE json_extract(meta,'$.aiPost') IS NOT NULL",
  );
  const evidence = {
    simulation: true,
    aiCalls: all("SELECT id FROM ai_calls").length,
    actualProviderCostMicro: 0,
    themes: all("SELECT id FROM theme_versions").length,
    posts:all("SELECT id,format,title,caption,media,brief,status FROM posts"),
    assets: assets.map((a) => ({
      id: a.id,
      status: a.status,
      role: getAsset(a.id)?.role,
      folder: all<{system_key:string}>("SELECT system_key FROM folders WHERE id=?",getAsset(a.id)?.folder_id??"")[0]?.system_key??null,
      width: a.width,
      height: a.height,
      quality: JSON.parse(a.meta).finalImage?.quality,
      mode: JSON.parse(a.meta).finalImage?.mode,
      source: getAsset(a.id)?.source_asset_id,
      brief: JSON.parse(a.meta).finalImage?.brief,
      contract: JSON.parse(a.meta).finalImage?.contract,
      effectivePrompt: (() => {
        const id = JSON.parse(a.meta).finalImage?.nativeAssetId;
        return id ? assetMeta(getAsset(id)!).effectivePrompt : null;
      })(),
      models: JSON.parse(a.meta).finalImage?.models,
    })),
  };
  fs.writeFileSync(
    path.join(dir, "public-evidence.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.log("Preuve expurgée écrite");
} else throw new Error("seed | worker | evidence requis");
