import {campaignConcept,campaignVerdict} from "./publication-fixtures";
/**
 * Onglet Images : « Faire un visuel » en trois façons.
 *  - Gratuit (mise en page du studio) : jamais d'IA, même en secours.
 *  - Image par l'IA, le studio fait le reste : la photo libre est sautée, l'image vient de l'IA (prix annoncé avant).
 *  - Tout par l'IA, de A à Z : la publication entière par le moteur des Publications, textes du client écrits tels quels.
 * Sans IA active (Découverte, budget épuisé), les choix payants sont refusés par le serveur.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
// IA du projet active ou non (forfait, budget, fournisseur) : pilotée par le test.
let aiOn = false;
vi.mock("@/lib/ai/access", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/access")>()), aiActiveFor: () => aiOn }));
let fetchCalls = 0;
beforeEach(() => {
  fetchCalls = 0;
  vi.stubGlobal("fetch", async () => (fetchCalls++, new Response("{}", { status: 404 })));
});
afterEach(() => vi.unstubAllGlobals());

describe("Faire un visuel (onglet Images)", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { getJob, UserFacingError } = await import("@/lib/jobs");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const images = await import("@/app/api/projects/[id]/images/route");
  const { generateAiPostImage, withClientTexts, aiPostBrief, AI_POST_ASPECT } = await import("@/lib/engine/ai-post-image");
  const { generateServiceSingleImage } = await import("@/lib/engine/service-media");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const png = () => sharp({ create: { width: 1080, height: 1350, channels: 3, background: "#335544" } }).png().toBuffer();
  const ctxOf = (id: string) => ({ job: { id, project_id: null }, payload: {}, progress: () => {}, step: async (_k: string, fn: () => Promise<unknown>) => fn() }) as any;
  const post = (pid: string, body: Record<string, unknown>) => fr(() => images.POST(new Request(`http://localhost:3000/api/projects/${pid}/images`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: pid }) } as any));
  const user = async () => {
    const u = await createUser(`fv-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    sessionUser = { ...u, role: "client" };
    return u;
  };
  function fakeDeps(cost = 200_000) {
    const calls = { prompts: [] as string[], aspects: [] as string[], refs: [] as (Buffer | null)[], spent: 0 };
    return {
      calls,
      deps: {
        copy: async () => ({ headline: "Accroche de l'IA", subline: "Ligne de l'IA", cta: "Bouton IA", scene: "bright renovated bathroom, morning light",concept:campaignConcept() }),
        generate: async (prompt: string, aspect: string, ref: Buffer | null) => (calls.prompts.push(prompt), calls.aspects.push(aspect), calls.refs.push(ref), (calls.spent += cost), sharp({create:{width:aspect==="16:9"?1920:1080,height:aspect==="1:1"?1080:aspect==="9:16"?1920:aspect==="16:9"?1080:1350,channels:3,background:"#335544"}}).png().toBuffer()),
        review: async (_i: Buffer, _r: Buffer | null, texts: string[]) => ({ ...campaignVerdict(), transcribed: texts, person: false, anatomyOk: true, productFaithful: true, textsExact: true, legible: true, score: 9.2, issues: [], fix: "" }),
        spentMicro: () => calls.spent,
        maxMicro: () => cost,
      },
    };
  }

  it("tout par l'IA (services) : textes du client écrits mot pour mot, scène de l'IA gardée, format respecté, visuel rangé", async () => {
    const u = await user();
    const pid = await seedThemeScenario(u.id, "artisan");
    const f = fakeDeps();
    const r = await fr(() => generateAiPostImage(ctxOf("job-fv-1"), pid, { kind: "service", format: "story", headline: "Votre salle de bain refaite", cta: "Demander un devis" }, f.deps as any));
    expect(r.assetId).toBeTruthy();
    expect(f.calls.aspects[0]).toBe("9:16");
    expect(f.calls.prompts[0]).toContain('"Votre salle de bain refaite"');
    expect(f.calls.prompts[0]).toContain('"Demander un devis"');
    expect(f.calls.prompts[0]).not.toContain("Accroche de l'IA");
    expect(f.calls.prompts[0]).toContain("bright renovated bathroom");
    // Service sans image choisie : aucune référence imposée ; aucune personne demandée sans accord.
    expect(f.calls.refs[0]).toBeNull();
    expect(f.calls.prompts[0]).toContain("No people");
  });

  it("tout par l'IA : « une de mes images » choisie sert de référence ; produit sans photo refusé (rien d'inventé)", async () => {
    const u = await user();
    const pid = await seedThemeScenario(u.id, "artisan");
    const mine = await saveAsset({ projectId: pid, userId: u.id, data: await png(), name: "chantier.png", mime: "image/png", role: "lifestyle", folderKey: "images.scenes", origin: "upload", status: "approved", meta: {} });
    const f = fakeDeps();
    await fr(() => generateAiPostImage(ctxOf("job-fv-2"), pid, { kind: "info", format: "square", photoId: mine.id }, f.deps as any));
    expect(f.calls.refs[0]).toBeInstanceOf(Buffer);
    expect(f.calls.aspects[0]).toBe("1:1");
    const prod = seedImageFixture(u.id, "cosmetic");
    await expect(fr(() => generateAiPostImage(ctxOf("job-fv-3"), prod, { kind: "scene", format: "portrait" }, fakeDeps().deps as any))).rejects.toBeInstanceOf(UserFacingError);
  });

  it("textes du client prioritaires, ceux de l'IA gardés pour ce qui est laissé vide ; fiche sans rien d'inventé", async () => {
    const f = fakeDeps();
    const d = withClientTexts(f.deps as any, { headline: "Mon titre" });
    const c = await d.copy!({} as any, {} as any, { headline: "x", subline: "y", cta: "z", brand: "b" }, "k", false);
    expect(c).toMatchObject({ headline: "Mon titre", subline: "Ligne de l'IA", cta: "Bouton IA", scene: "bright renovated bathroom, morning light",concept:campaignConcept() });
    expect(withClientTexts(f.deps as any, {})).toBe(f.deps);
    const u = await user();
    const p = loadProject(await seedThemeScenario(u.id, "artisan"));
    const b = aiPostBrief(p, { kind: "service", serviceIndex: 0 }, "id1");
    expect(b.title).toBe(p.services.services[0].name);
    expect(b.objective).toBe("convert");
    expect(AI_POST_ASPECT.landscape).toBe("16:9");
  });

  it("image par l'IA : la photo libre est sautée (aucune recherche) et sans IA d'images, message clair", async () => {
    const u = await user();
    const pid = await seedThemeScenario(u.id, "artisan");
    await expect(fr(() => generateServiceSingleImage(ctxOf("job-fv-4"), pid, { kind: "service", format: "portrait", aiImage: true }))).rejects.toThrow(/IA d'images n'est pas disponible/);
    expect(fetchCalls).toBe(0);
  });

  it("API (images 100 % IA) : plus de visuel gratuit du studio ; sans IA, refus ; sinon publication entière par l'IA ; devis lisible avant", async () => {
    const u = await user();
    const pid = await seedThemeScenario(u.id, "artisan");
    grantProjectPlan(pid, "vendre");
    // IA inactive (budget épuisé, fournisseur coupé…) : tout est refusé, rien n'est composé à la place.
    aiOn = false;
    expect((await post(pid, { mode: "single", visual: "ai_post", kind: "service" })).status).toBe(402);
    expect((await post(pid, { mode: "single", visual: "ai_image", kind: "service" })).status).toBe(402);
    expect((await post(pid, { mode: "single", kind: "service", format: "portrait" })).status).toBe(402);
    expect((await post(pid, { mode: "single", visual: "free", kind: "service", format: "portrait", background: "image", useAi: true })).status).toBe(410);
    const q = await (await fr(() => images.GET(new Request(`http://localhost:3000/api/projects/${pid}/images`), { params: Promise.resolve({ id: pid }) } as any))).json();
    expect(q.ai).toBe(false);
    expect(typeof q.quote.ai_image).toBe("number");
    expect(typeof q.quote.ai_post).toBe("number");

    aiOn = true;
    const a = await post(pid, { mode: "single", visual: "ai_post", kind: "service", format: "story", headline: "Titre" });
    expect(a.status).toBe(200);
    const ja = getJob((await a.json()).jobId)!;
    expect(ja.type).toBe("image.ai_post");
    expect(JSON.parse(ja.payload).request).toMatchObject({ kind: "service", format: "story", headline: "Titre" });
    const i = await post(pid, { mode: "single", visual: "ai_image", kind: "service", format: "portrait", headline: "Autre" });
    // Visuel de prestation avec texte : publication entière par l'IA (plus de texte du studio posé sur une image).
    const ji = getJob((await i.json()).jobId)!;
    expect(ji.type).toBe("image.ai_post");
    expect(JSON.parse(ji.payload).request).toMatchObject({ kind: "service", headline: "Autre" });
    aiOn = false;
  }, 60_000);

});
