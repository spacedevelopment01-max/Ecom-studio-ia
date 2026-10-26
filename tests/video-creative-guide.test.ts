import {videoByteFixture} from "./video-byte-fixture";
import { grantProjectPlan } from "./communication-choice-fixture";
/**
 * Guide créatif vidéo branché sur le moteur réellement utilisé (vidéo en scènes) : règles chargées et modifiables,
 * fiche créative adaptée à l'offre, storyboard par étapes (services) ou par cadrages du vrai produit, règle absolue des
 * marques, tailles de texte en pixels, carte de fin, voix et sous-titres, mémoire créative du projet, contrôle du
 * fichier final mesuré sur une vraie vidéo.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("Guide créatif vidéo", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { run } = await import("@/lib/db");
  const { saveAsset } = await import("@/lib/library");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { DEFAULT_VIDEO_GUIDE, VIDEO_GUIDE_SETTING, loadVideoGuide, px, contrastRatio } = await import("@/lib/video-v2/creative-guide");
  const { setJsonSetting, setSetting } = await import("@/lib/settings");
  const { buildCreativeBrief, familyOf } = await import("@/lib/video-v2/creative-brief");
  const { buildStoryboard, serviceSteps } = await import("@/lib/video-v2/ad-storyboard");
  const { thirdPartyBrands, stockMentionsBrand, brandIssuesInTexts } = await import("@/lib/video-v2/brand-guard");
  const { loadCreativeMemory, rememberPreference } = await import("@/lib/video-v2/creative-memory");
  const { runThreeScenes, localScenePlan } = await import("@/lib/video-v2/three-scenes");
  const { subtitleChunks, wordBudget } = await import("@/lib/video-v2/voice");
  const { finalCheck } = await import("@/lib/video-v2/final-check");

  const user = async () => (await createUser(`gc-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "G")).id;
  async function painter() {
    const p = loadProject(seedImageFixture(await user(), "restaurant"));
    run("UPDATE projects SET product_json = json_set(product_json, '$.category', 'Plâtrier peintre'), business_json = ? WHERE id = ?", JSON.stringify({ services: [{ name: "Peinture intérieure" }], area: "Lyon", contactMode: "quote" }), p.id);
    // Final factual context first, then the fictitious client's explicit communication choice.
    grantProjectPlan(p.id,"dominer");
    return loadProject(p.id);
  }
  async function watch() {
    const p = loadProject(seedImageFixture(await user(), "hightech"));grantProjectPlan(p.id,"dominer");
    run("UPDATE projects SET product_json = json_set(json_set(json_set(product_json, '$.name', 'Chronographe acier et cuir'), '$.category', 'Montres'), '$.summary', 'Montre : boîtier en acier poli, lunette graduée, guichet de date'), brand_json = json_set(brand_json, '$.name', 'ARVEN', '$.tagline', 'Le temps, bien porté.') WHERE id = ?", p.id);
    return loadProject(p.id);
  }

  it("règles chargées par le moteur, modifiables sans code et persistantes (réglage du propriétaire)", () => {
    expect(loadVideoGuide().text.hook).toEqual({ min: 90, max: 130 });
    setJsonSetting(VIDEO_GUIDE_SETTING, { text: { hook: { min: 100, max: 140 } } });
    expect(loadVideoGuide().text.hook).toEqual({ min: 100, max: 140 });
    expect(loadVideoGuide().text.subtitle).toEqual(DEFAULT_VIDEO_GUIDE.text.subtitle);
    setSetting(VIDEO_GUIDE_SETTING, null);
    expect(loadVideoGuide().text.hook.min).toBe(90);
    // Tailles en pixels : 1080 × 1920 = valeurs du guide ; 1080 × 1080 garde la même lisibilité.
    expect(px({ min: 90, max: 130 }, 1920, 0, 1080)).toBe(90);
    expect(px({ min: 48, max: 64 }, 1080, 1, 1080)).toBe(64);
    expect(contrastRatio("#FFFFFF", "#000000")).toBe(21);
  });

  it("fiche créative adaptée à l'offre : montre premium ≠ artisan ; couleurs de la charte lisibles ; action selon l'objectif", async () => {
    const w = await watch();
    const a = await painter();
    expect(familyOf(w)).toBe("premium");
    expect(familyOf(a)).toBe("artisan");
    const bw = buildCreativeBrief(w, { durationS: 15, width: 1080, height: 1920, platform: "reels" });
    const ba = buildCreativeBrief(a, { durationS: 15, width: 1080, height: 1920, platform: "reels" });
    expect(bw.concept).not.toBe(ba.concept);
    expect(bw.colors.source).toBe("charter");
    expect(contrastRatio(bw.colors.text, bw.colors.bg)).toBeGreaterThanOrEqual(4.5);
    expect(bw.sizes.hook).toBeGreaterThanOrEqual(90);
    expect(bw.sizes.hook).toBeLessThanOrEqual(130);
    expect(bw.sizes.subtitle).toBeGreaterThanOrEqual(44);
    expect(bw.sizes.cta).toBeGreaterThanOrEqual(48);
    expect(bw.goal).toBe("buy");
    expect(ba.goal).toBe("quote");
    expect(ba.cta).toBe("Demander un devis");
    expect(bw.transition.kind).toBe("fade");
    expect(ba.transition.kind).toBe("cut");
  });

  it("services : une ÉTAPE de la prestation par plan (plâtrier peintre), jamais cinq vidéos générales du métier", async () => {
    const a = await painter();
    const steps = serviceSteps(a);
    expect(steps.map((s) => s.fr)).toEqual(["Préparation et protection de la pièce", "Préparation des surfaces", "Application de la peinture", "Le geste et la finition", "La pièce terminée"]);
    const sb = buildStoryboard(a, 5);
    expect(sb.route).toBe("services");
    expect(new Set(sb.shots.map((s) => s.stock!.queries[0])).size).toBe(5);
    expect(sb.notes.join(" ")).toContain("ne sont pas présentés comme des réalisations du client");
  });

  it("produits : cadrages différents du VRAI produit (silhouette, cadran, bracelet, situation, final), titres sans rien d'inventé", async () => {
    const w = await watch();
    const sb = buildStoryboard(w, 5);
    expect(sb.shots.map((s) => s.role)).toEqual(["hook", "detail", "detail", "use", "cta"]);
    expect(sb.shots[1].still).toContain("dial");
    expect(sb.shots[2].still).toContain("strap");
    expect(sb.shots[0].title).toBe("Le temps, bien porté.");
    expect(sb.shots[1].title).toBe("Boîtier en acier poli");
    const plan = localScenePlan(w, null, { as: "ad", scenes: 3 });
    expect(plan.scenes.every((s) => !/étanche|waterproof|automatique|garantie/i.test(`${s.title} ${s.voice ?? ""}`))).toBe(true);
    expect(plan.scenes[0].voice).toContain("Le temps, bien porté.");
  });

  it("règle absolue des marques : marques tierces repérées dans les textes et les plans de banque, jamais la marque du projet", () => {
    expect(thirdPartyBrands("Une montre comme une Rolex, au poignet")).toEqual(["rolex"]);
    expect(thirdPartyBrands("ARVEN, le temps bien porté", ["ARVEN"])).toEqual([]);
    expect(stockMentionsBrand("painter, paint roller, Dulux, wall")).toBe(true);
    expect(stockMentionsBrand("painter, paint roller, wall")).toBe(false);
    expect(brandIssuesInTexts({ "voice-1": "Plus fiable qu'un iPhone", cta: "Commander" }, ["ARVEN"])).toEqual([{ field: "voice-1", brand: "iphone" }]);
  });

  it("moteur réel (services) : recherches Pixabay de chaque étape transmises, marque tierce retirée, tailles du guide, carte de fin 2,5–4 s, mémoire créative", async () => {
    const a = await painter();
    const steps: unknown[] = [];
    let rendered: any = null;
    const r = await runThreeScenes(
      null,
      a.id,
      { as: "ad", scenes: 3, totalS: 15, aspect: "9:16" },
      {
        writePlan: async () => ({ scenes: [{ still: "a painter preparing the room", motion: "slow push-in", title: "Protégé comme chez Leroy Merlin", voice: "On protège tout." }, { still: "sanding the walls carefully", motion: "slow glide", title: "Murs préparés" }, { still: "painting with a roller", motion: "slow tilt", title: "Peinture" }], line: "Le travail bien fait", cta: "Demander un devis" }),
        keyframe: async () => Buffer.from(""),
        clip: async () => Buffer.from(""),
        stock: async (p: any, k: number, _t: string, _a: string, _s: number, _e: Set<string>, _key: string, step?: unknown) => {
          steps.push(step);
          const asset = await saveAsset({ projectId: p.id, userId: p.userId, data: videoByteFixture(), name: `c${k}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "import", status: "ready", meta: { stock: { source: "pixabay", id: 100 + k, page: `https://pixabay.com/videos/id-${100 + k}/`, license: "Pixabay Content License" } } });
          return { assetId: asset.id, durationS: 8 };
        },
        spentMicro: () => 0,
        render: async (_p: unknown, _k: string, doc: unknown) => ((rendered = doc), "video-1"),
      },
    );
    // Une étape de la prestation par plan.
    // Une étape de la prestation par plan (3 plans : protection de la pièce, application, pièce terminée).
    expect((steps as { queries: string[] }[]).map((s) => s.queries[0])).toEqual(["painter masking tape", "paint roller wall", "painter renovation interior"]);
    // « Leroy Merlin » retiré du titre (marque tierce) ; noté pour l'aperçu.
    expect(rendered.clips[0].overlays).toHaveLength(0);
    expect(r.notes.join(" ")).toContain("leroy merlin");
    // Tailles du guide : accroche 90–130 px, titres de scène 64–88 px (1080 × 1920).
    const t2 = rendered.clips[1].overlays[0];
    expect(t2.font.size).toBeGreaterThanOrEqual(64);
    expect(t2.font.size).toBeLessThanOrEqual(88);
    expect(t2.anim?.in).toBeDefined();
    const end = rendered.clips.at(-1);
    expect(rendered.meta.ending.holdS).toBeGreaterThanOrEqual(2.5);
    expect(rendered.meta.ending.holdS).toBeLessThanOrEqual(4);
    expect(end.overlays.find((l: any) => l.kind === "button").font.size).toBeGreaterThanOrEqual(48);
    expect(r.brief?.family).toBe("artisan");
    // Mémoire créative : concept utilisé et provenance des plans, relus à la vidéo suivante (autre concept).
    const mem = loadCreativeMemory(a.id);
    expect(mem.directionsUsed).toContain(r.brief!.concept);
    expect(mem.media.map((m) => m.ref)).toContain("https://pixabay.com/videos/id-100/");
    expect(buildCreativeBrief(a, { durationS: 15, width: 1080, height: 1920, platform: "reels" }).concept).not.toBe(r.brief!.concept);
    rememberPreference(a.id, "family", "premium");
    expect(buildCreativeBrief(a, { durationS: 15, width: 1080, height: 1920, platform: "reels" }).family).toBe("premium");
  });

  it("une étape sans plan bloque la livraison : aucun titre déplacé ni vidéo incomplète", async () => {
    const a = await painter();
    let rendered: any = null;
    await expect(runThreeScenes(null, a.id, { as: "ad", scenes: 3, totalS: 15, aspect: "9:16" }, {
      keyframe: async () => Buffer.from(""),
      clip: async () => Buffer.from(""),
      stock: async (p: any, k: number) => (k === 1 ? null : { assetId: (await saveAsset({ projectId: p.id, userId: p.userId, data: videoByteFixture(), name: `c${k}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "import", status: "ready", meta: {} })).id, durationS: 8 }),
      spentMicro: () => 0,
      render: async (_p: unknown, _k: string, doc: unknown) => ((rendered = doc), "v"),
    })).rejects.toThrow(/Scène 2/);
    expect(rendered).toBeNull();
  });

  it("sans contrôle visuel : contenus conservés et vérification explicitement requise", async () => {
    const a = await painter();
    let rendered: any = null;
    const r = await runThreeScenes(null, a.id, { as: "ad", scenes: 3, totalS: 15, aspect: "9:16" }, {
      visualCheck: false,
      keyframe: async () => Buffer.from(""),
      clip: async () => Buffer.from(""),
      stock: async (p: any, k: number) => ({ assetId: (await saveAsset({ projectId: p.id, userId: p.userId, data: videoByteFixture(), name: `v${k}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "import", status: "ready", meta: {} })).id, durationS: 8 }),
      spentMicro: () => 0,
      render: async (_p: unknown, _k: string, doc: unknown) => ((rendered = doc), "v"),
    });
    expect(rendered.clips[1].overlays.length).toBeGreaterThan(0);
    expect(rendered.clips[2].overlays.length).toBeGreaterThan(0);
    expect(r.notes.join(" ")).toContain("contrôle visuel indisponible");
  });

  it("voix et sous-titres : 55–75 mots pour 30 s au prorata ; sous-titres découpés par groupes de sens, deux lignes au plus", () => {
    expect(wordBudget(30)).toEqual({ min: 55, max: 75 });
    expect(wordBudget(15)).toEqual({ min: 28, max: 38 });
    const chunks = subtitleChunks("On protège vos sols et vos meubles, on prépare chaque mur avec soin, puis on applique deux couches de peinture.", 32);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 64)).toBe(true);
  });

  it("contrôle du fichier final mesuré sur une vraie vidéo : scènes identiques et texte trop petit repérés, rien de déclaré bon sans contrôle", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fc-"));
    const file = path.join(dir, "v.mp4");
    // 2 « scènes » identiques (même couleur) + carte de fin, 1080 × 1920, 7 s.
    execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=#202020:s=1080x1920:d=7", "-pix_fmt", "yuv420p", file]);
    const text = (size: number) => ({ id: "t", name: "t", role: "title", kind: "text", x: 80, y: 200, w: 920, h: 300, rotation: 0, opacity: 1, visible: true, locked: false, anchor: { h: "left", v: "top" }, text: "Titre", font: { family: "Jost", weight: 700, size, italic: false }, color: "#FFFFFF", align: "center", lineHeight: 1.1, letterSpacing: 0 });
    const doc: any = {
      width: 1080, height: 1920, clips: [
        { id: "scene-1", durationS: 2, source: { kind: "video", assetId: "a" }, overlays: [text(30)] },
        { id: "scene-2", durationS: 2, source: { kind: "video", assetId: "b" }, overlays: [] },
        { id: "end-card", durationS: 3, source: { kind: "doc", doc: { layers: [{ kind: "button", role: "cta", font: { family: "Jost", size: 52 } }, { kind: "image", role: "logo" }] } }, overlays: [] },
      ],
      subtitles: { style: { maxChars: 32, enabled: true }, cues: [] }, audio: { voice: [], music: null, duckingDb: -10 },
    };
    const items = await finalCheck(doc, { file, durationS: 7, width: 1080, height: 1920, audio: { lufs: null, truePeakDb: null, durationS: 7, silent: true } }, { texts: { cta: "Commander" }, allowed: ["ARVEN"] });
    const by = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(by.scenes.status).toBe("issue");
    expect(by.text_size.status).toBe("issue");
    expect(by.contrast.status).toBe("ok");
    expect(by.cta.status).toBe("ok");
    expect(by.logo.status).toBe("ok");
    expect(by.product.status).toBe("unchecked");
    expect(by.spelling.status).toBe("unchecked");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
