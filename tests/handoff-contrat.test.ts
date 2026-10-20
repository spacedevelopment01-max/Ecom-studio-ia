/**
 * Raccordement au contrat du parcours amont (Codex, PR #138, artefact `project.ready_for_theme`) : recommandation de
 * thème lue sans être recalculée, catégorie du projet, placement explicite des médias du contrat dans les emplacements
 * du thème (rien d'inventé, « non placé » listé), rédaction du contrat reprise quand elle est prête.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => {
  const root = process.env.DATA_DIR; if (!root) throw new Error("Tests isolés obligatoires");
  const dir = process.getBuiltinModule("fs").mkdtempSync(`${root}/handoff-`), shared = globalThis as { __ecomDb?: { close(): void } }, previousDb = shared.__ecomDb; delete shared.__ecomDb; vi.stubEnv("DATA_DIR", dir); return { dir, previousDb };
});
afterAll(() => { const shared = globalThis as { __ecomDb?: { close(): void } }; if (shared.__ecomDb !== session.previousDb) shared.__ecomDb?.close(); if (session.previousDb) shared.__ecomDb = session.previousDb; else delete shared.__ecomDb; vi.unstubAllEnvs(); });
vi.mock("@/lib/ai/llm", async (original) => ({ ...await original<object>(), llmConfigured: () => false }));
import sharp from "sharp";
import { createUser } from "@/lib/auth";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { loadProject, remember, saveBrand } from "@/lib/projects";
import { saveAsset } from "@/lib/library";
import { composeShop } from "@/lib/engine/shop";
import { themeRecommendation, READY_CONTRACT_KEY } from "@/lib/theme/theme-recommendation";
import { projectStoreKind } from "@/lib/theme/project-kind";
import { runWithLang } from "@/lib/i18n-server";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const png = (w: number, h: number, color: string) => sharp({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer();

describe("Contrat amont → thème", async () => {
  const user = await createUser("handoff@example.invalid", "isolated-test-only", "Handoff");
  const pid = seedHoldout(user.id, 0, "Handoff");
  const p0 = loadProject(pid);
  saveBrand(pid, { ...p0.brand!, direction: "vitrine" });
  const asset = async (name: string, w: number, h: number, role = "scene") => saveAsset({ projectId: pid, userId: user.id, data: await png(w, h, "#888888"), mime: "image/png", name, origin: "upload", role, status: "approved", meta: {} });
  const hero = await asset("ouverture.png", 1600, 900), pack = await asset("packshot.png", 1000, 1000, "packshot"), detail = await asset("detail.png", 1000, 1000), scene = await asset("scene.png", 1600, 900), story = await asset("story.png", 900, 1600);
  const contract = {
    schemaVersion: 1, kind: "project_ready_for_theme", projectId: pid, revision: 3, provenance: "simulation", builtAt: Date.now(),
    recommendation: { recommendedId: "fraise", alternatives: [{ id: "onde", reasons: ["Même catégorie"] }, { id: "rive", reasons: ["Hors catégorie"] }], reasons: ["Produit phare, vente directe"], status: "proposal", catalogue: [{ id: "fraise", status: "available", reason: "" }] },
    mediaPolicy: { images: 10, videos: 1, source: "ai", heroVideoRequired: true },
    media: [
      { key: "home.hero", pageKey: "home", sectionKey: "hero", purpose: "ouverture", kind: "image", aspect: "16:9", assetId: hero.id, required: true },
      { key: "product.pack", pageKey: "product", sectionKey: "gallery", purpose: "packshot", kind: "image", aspect: "1:1", assetId: pack.id, required: true },
      { key: "product.detail", pageKey: "product", sectionKey: "gallery", purpose: "detail", kind: "image", aspect: "1:1", assetId: detail.id, required: false },
      { key: "home.scene", pageKey: "home", sectionKey: "feature", purpose: "scene", kind: "image", aspect: "16:9", assetId: scene.id, required: false },
      { key: "home.story", pageKey: "home", sectionKey: "stories", purpose: "story", kind: "image", aspect: "9:16", assetId: story.id, required: false },
      { key: "home.video", pageKey: "home", sectionKey: "hero", purpose: "ouverture", kind: "video", aspect: "16:9", required: true },
      { key: "absent", pageKey: "home", sectionKey: "x", purpose: "scene", kind: "image", aspect: "16:9", assetId: "inexistant", required: false },
    ],
    copy: null, copyReadiness: { status: "review_required", provisionalFields: [], documentKeys: [] },
  };
  remember(pid, { kind: "artifact", key: READY_CONTRACT_KEY, value: JSON.stringify(contract), source: "import" });

  it("recommandation : lue depuis le contrat, filtrée par la catégorie du projet, motifs et alternatives conservés", () => {
    const p = loadProject(pid);
    const r = themeRecommendation(p, "fr");
    expect(r.source).toBe("preparation");
    expect(r.contract).toMatchObject({ revision: 3, provenance: "simulation", status: "proposal" });
    expect(r.category.kind).toBe("specialty");
    expect(r.category.source).toBe("preparation");
    expect(r.recommended).toBe("fraise");
    expect(r.alternatives.map((a) => a.id)).toEqual(["onde"]); // « rive » (prestations) exclu de la catégorie
    expect(r.eligible).toEqual(["fraise", "onde", "sillon"]); // catalogue actif seulement : jamais l'ancien catalogue en repli
    expect(r.eligible).not.toContain("rive");
    expect(r.excluded.find((x) => x.id === "orbe")?.reason).toMatch(/e-commerce/);
    expect(projectStoreKind(p)).toMatchObject({ kind: "specialty", source: "preparation" });
  });

  it("alias de la livraison Codex (PR #140) : recommendedReferenceId / alternativesReferenceIds et catégorie specialized | ecommerce | services sont lus tels quels", () => {
    const pid2 = seedHoldout(user.id, 0, "Alias");
    remember(pid2, { kind: "artifact", key: READY_CONTRACT_KEY, value: JSON.stringify({ revision: 1, provenance: "simulation", category: "ecommerce", recommendation: { recommendedReferenceId: "orbe", alternativesReferenceIds: ["fraise", "vitrine"], status: "proposal" } }), source: "import" });
    const r = themeRecommendation(loadProject(pid2), "fr");
    expect(r.category).toMatchObject({ kind: "catalog", source: "preparation" });
    expect(r.recommended).toBe("orbe");
    expect(r.alternatives).toEqual([]); // fraise : boutique spécialisée, hors catégorie ; vitrine : retiré du catalogue
    expect(r.warnings.some((w) => /vitrine/.test(w))).toBe(true);
  });

  it("intégration bornée : référence Atelier Rive et catégorie confirmée du contrat amont reconnues",()=>{
    const pid2=seedHoldout(user.id,1,"Intégration services");
    remember(pid2,{kind:"artifact",key:READY_CONTRACT_KEY,value:JSON.stringify({revision:2,provenance:"simulation",recommendation:{recommendedReferenceId:"atelier-rive",alternativesReferenceIds:[],projectCategory:{category:"services"}},handoff:{category:{category:"services"}}}),source:"import"});
    const r=themeRecommendation(loadProject(pid2),"fr");expect(r.category.kind).toBe("services");expect(r.recommended).toBe("rive");expect(r.warnings).toEqual([]);
  });

  it("placement des médias : chaque média du contrat va à un emplacement explicite, l'asset inconnu est « non placé », la vidéo absente laisse l'emplacement vide", async () => {
    const { spec } = await fr(() => composeShop(pid, "fraise", null, false));
    const h = spec.meta?.handoff as { placed: { slot: string; key: string }[]; unplaced: { key: string }[]; empty: string[]; copy: string; revision: number };
    expect(h.revision).toBe(3);
    expect(h.copy).toBe("project"); // rédaction du contrat non prête : textes du projet
    const slotOf = (key: string) => h.placed.find((x) => x.key === key)?.slot;
    expect(slotOf("home.hero")).toBe("lifestyle");
    expect(slotOf("product.pack")).toBe("packshot");
    expect(slotOf("product.detail")).toBe("detail1");
    expect(slotOf("home.scene")).toBe("scene1");
    expect(slotOf("home.story")).toBe("portrait"); // image verticale : ouverture sur téléphone (produit entier), avant les scènes
    expect(h.unplaced.map((x) => x.key)).toEqual(["absent"]);
    expect(h.empty).toContain("video");
    // Les fichiers du thème référencent bien ces assets, et les sections les emploient.
    const files = Object.entries(spec.files);
    for (const a of [hero, pack, detail, scene, story]) expect(files.some(([, id]) => id === a.id), a.name).toBe(true);
    const json = JSON.stringify(spec.templates);
    const packFile = files.find(([, id]) => id === pack.id)![0];
    expect(json).toContain(packFile);
    expect(spec.direction).toBe("fraise");
    expect(spec.settings.conversion_profile).toBe("pop");
  });
});
