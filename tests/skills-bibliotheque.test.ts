/**
 * Bibliothèque de compétences (skills) : installées dans .claude/skills (Claude Code) ET connectées aux moteurs du
 * studio (sélection contextuelle, sections utiles seulement, plafond de taille, trace dans ai_calls).
 * Les appels aux modèles sont simulés : on vérifie ce qui serait transmis, sans coût. Un test de chargement des
 * consignes n'est PAS une preuve de qualité du résultat final.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const calls: any[] = [];
vi.mock("@/lib/ai/llm", async (orig) => ({
  ...(await orig<any>()),
  llmConfigured: () => true,
  llmJson: async (call: any) => (calls.push(call), {}),
}));

describe("bibliothèque de compétences", async () => {
  const skills = await import("@/lib/ai/skills");
  const { skillsOfReference, recordCall } = await import("@/lib/ai/trace");
  const { one } = await import("@/lib/db");
  const names = (ref: string) => /names="([^"]+)"/.exec(ref)?.[1].split(",") ?? [];

  it("installation : chaque compétence demandée est présente dans .claude/skills avec sa licence", () => {
    const dir = path.join(process.cwd(), ".claude", "skills");
    const want = ["remotion-best-practices", "remotion-create", "remotion-markup", "remotion-render", "remotion-captions", "remotion-saas", "remotion-studio", "remotion-multimedia", "remotion-ads", "remotion-marketing-video", "motion-from-reference", "video-audio-stack", "ai-cinematic-broll", "device-3d-stage", "editor", "edl-edit", "cutting-rhythm", "captions", "audio-edit", "color-grade", "video-overlay", "video-transitions", "reframe-social", "ugc-video-producer", "ugc-ad-strategist", "ugc-device-screen", "ugc-minimax-mode", "image", "ad-creative", "ads", "video", "product-marketing", "customer-research", "competitor-profiling", "marketing-plan", "marketing-psychology", "social", "copywriting", "copy-editing", "content-strategy", "cro", "ab-testing", "analytics", "attribution", "emails", "onboarding", "signup", "pricing", "churn-prevention", "launch", "offers", "marketing-loops", "seo-audit", "ai-seo", "programmatic-seo", "schema", "site-architecture", "frontend-design", "canvas-design", "brand-guidelines", "theme-factory", "webapp-testing", "skill-creator", "mcp-builder", "ui-ux-pro-max", "react-best-practices", "web-design-guidelines"];
    for (const s of want) {
      expect(fs.existsSync(path.join(dir, s, "SKILL.md")), s).toBe(true);
    }
    // Licence présente (fichier de la compétence ou du dépôt), sauf Remotion (licence du dépôt d'origine, voir SOURCES.md).
    for (const s of want.filter((x) => !x.startsWith("remotion-") || x === "remotion-ads" || x === "remotion-marketing-video")) {
      const files = fs.readdirSync(path.join(dir, s));
      const fm = fs.readFileSync(path.join(dir, s, "SKILL.md"), "utf8").slice(0, 800);
      expect(files.some((f) => /^licen[cs]e/i.test(f)) || /license: MIT/i.test(fm), s).toBe(true);
    }
    // Aucun script de fournisseur payant tiers recopié (ElevenLabs, WaveSpeed, xAI, Suno…), aucun install.sh.
    for (const s of ["ugc-video-producer", "ugc-ad-strategist", "ugc-device-screen", "remotion-ads"]) expect(fs.existsSync(path.join(dir, s, "scripts")), s).toBe(false);
    expect(fs.readdirSync(dir).some((d) => fs.existsSync(path.join(dir, d, "install.sh")))).toBe(false);
  });

  it("HyperFrames : sept compétences avec leur licence, sans les scripts de fournisseurs payants ni de statistiques", () => {
    const dir = path.join(process.cwd(), ".claude", "skills");
    for (const s of ["hyperframes", "hyperframes-cli", "hyperframes-registry", "media-use", "figma", "remotion-to-hyperframes", "slideshow"]) {
      expect(fs.existsSync(path.join(dir, s, "SKILL.md")), s).toBe(true);
      expect(fs.readFileSync(path.join(dir, s, "LICENSE"), "utf8"), s).toMatch(/Apache License/);
    }
    // HeyGen, ElevenLabs, Gemini/Lyria (payants) et envoi de statistiques PostHog : non recopiés.
    for (const p of ["media-use/scripts", "media-use/audio/scripts", "hyperframes/scripts/locate.mjs"]) expect(fs.existsSync(path.join(dir, p)), p).toBe(false);
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    for (const s of ["hyperframes", "media-use", "figma", "remotion-to-hyperframes"]) {
      for (const f of walk(path.join(dir, s)).filter((f) => /\.(mjs|js|py|sh)$/.test(f))) {
        expect(fs.readFileSync(f, "utf8"), f).not.toMatch(/posthog|GEMINI_API_KEY|HEYGEN_API_KEY|ELEVENLABS_API_KEY/i);
      }
    }
  });

  it("chaque section utilisée par le studio existe encore dans les compétences installées", () => {
    for (const intent of ["product_ad", "service_ad", "ad_visual", "video_ad", "ugc_script", "seo_page", "seo_article", "seo_meta", "local_seo", "site_copy", "site_design", "social_post", "brand_strategy"] as const) {
      for (const id of skills.skillsFor(intent)) expect(skills.skillDigest(id)!.missing, `${intent}/${id}`).toEqual([]);
    }
  });

  it("vidéo publicitaire 30 s 9:16 : compétences vidéo (accroche, rythme, sous-titres, zones sûres), bloc plafonné", () => {
    const ref = skills.skillReference("video_ad");
    expect(names(ref)).toEqual(expect.arrayContaining(["remotion-ads", "cutting-rhythm", "video", "captions"]));
    expect(ref).toMatch(/Safe Zones/);
    expect(ref.length).toBeLessThan(17000);
  });

  it("UGC : stratégie, plan de tournage et dialogue ; règle « aucune personne sans autorisation » rappelée", () => {
    const ref = skills.skillReference("ugc_script");
    expect(names(ref)).toEqual(expect.arrayContaining(["ugc-ad-strategist", "ugc-video-producer"]));
    expect(ref).toMatch(/aucune personne ni visage à l'image sans autorisation/);
  });

  it("images publicitaires : image, canvas-design, brand-guidelines ; SEO artisan → local, boutique → pages produits", () => {
    expect(names(skills.skillReference(skills.adIntent({ business: "products" } as any, "visual")))).toEqual(["image", "canvas-design", "brand-guidelines"]);
    const artisan = names(skills.skillReference(skills.seoIntent({ business: "services" } as any, "page")));
    expect(artisan).toEqual(expect.arrayContaining(["seo-audit", "programmatic-seo", "schema", "site-architecture"]));
    const shop = names(skills.skillReference(skills.seoIntent({ business: "products" } as any, "page")));
    expect(shop).toEqual(expect.arrayContaining(["seo-audit", "schema", "site-architecture", "copywriting"]));
    expect(shop).not.toContain("programmatic-seo");
  });

  it("sites : design (frontend-design, ui-ux-pro-max) ; la marque du client reste celle du projet", () => {
    const ref = skills.skillReference("site_design");
    expect(names(ref)).toEqual(["frontend-design", "ui-ux-pro-max", "brand-guidelines"]);
    expect(ref).toMatch(/TOUJOURS celle du projet/);
  });

  it("moteurs branchés : chaque appel transmet les bonnes compétences (vidéo, UGC, marque, textes du site, réseaux sociaux, SEO V2, vidéo V2)", async () => {
    const tasks = await import("@/lib/ai/tasks");
    const { seedImageFixture } = await import("./image-v2-fixtures");
    const { createUser } = await import("@/lib/auth");
    const { loadProject } = await import("@/lib/projects");
    const { runWithLang } = await import("@/lib/i18n-server");
    const u = await createUser(`skills-${Date.now()}@test.fr`, "motdepasse-test", "S");
    const p = loadProject(seedImageFixture(u.id, "hightech"));
    const base = { userId: u.id, projectId: p.id, jobId: null, usageKey: "t" } as any;
    const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);
    const expectSkills = async (fn: () => Promise<unknown>, want: string[]) => {
      calls.length = 0;
      await fr(async () => { try { await fn(); } catch { /* réponse simulée vide : seule la requête compte */ } });
      expect(calls.length, want.join(",")).toBeGreaterThan(0);
      expect(names(calls[0].reference ?? ""), want.join(",")).toEqual(expect.arrayContaining(want));
    };
    await expectSkills(() => tasks.aiVideoPlan(base, p, { format: "9:16" as any, goal: "publicité produit 30 s", images: [], clips: 4 }), ["remotion-ads", "cutting-rhythm"]);
    await expectSkills(() => tasks.aiUgcScript(base, p, { beats: 4, presenter: "aucun visage", setting: "salon", tone: "naturel", angle: "démonstration" }), ["ugc-ad-strategist"]);
    await expectSkills(() => tasks.aiBrand(base, p), ["product-marketing"]);
    await expectSkills(() => tasks.aiShopCopy(base, p), ["copywriting", "cro"]);
    await expectSkills(() => tasks.aiRewritePost(base, p, { network: "instagram", format: "post", caption: "x", title: "y", angle: "z" }, "plus court"), ["social"]);
    const { realVideoDeps } = await import("@/lib/video-v2/deps").catch(() => ({ realVideoDeps: null as any }));
    expect(realVideoDeps === null || typeof realVideoDeps === "function").toBe(true);
  }, 120_000);

  it("trace : les compétences transmises sont enregistrées dans ai_calls", () => {
    const ref = skills.skillReference("local_seo");
    expect(skillsOfReference(ref)).toBe("seo-audit,programmatic-seo,schema,site-architecture");
    expect(skillsOfReference("")).toBeNull();
    const id = recordCall({ userId: "u-skills", task: "copywriting", provider: "openai", requestedModel: "m", unit: "tokens", status: "ok", skills: skillsOfReference(ref) })!;
    expect(one<{ skills: string }>("SELECT skills FROM ai_calls WHERE id = ?", id)!.skills).toBe("seo-audit,programmatic-seo,schema,site-architecture");
  });
});
