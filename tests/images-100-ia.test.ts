import {campaignCopy,campaignVerdict} from "./publication-fixtures";
/**
 * Images finales 100 % IA (règle du propriétaire) : chaque parcours d'image finale passe par un modèle d'images ;
 * sans IA, rien n'est composé à la place (ni gabarit, ni photo de banque). Outils simulés : aucun appel réel.
 */
import { describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
let aiOn = false;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
vi.mock("@/lib/ai/access", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/access")>()), aiActiveFor: () => aiOn }));
vi.mock("@/lib/ai/llm", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/llm")>()), llmConfigured: () => false }));
vi.mock("@/lib/engine/cutouts", async (orig) => ({ ...(await orig<typeof import("@/lib/engine/cutouts")>()), ensureCutouts: async () => [] }));

describe("Images finales 100 % IA", async () => {
  const { createUser } = await import("@/lib/auth");
  const { id, now, one, run } = await import("@/lib/db");
  const { JobContext } = await import("@/lib/jobs");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { grantProjectPlan } = await import("./communication-choice-fixture");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const route = await import("@/app/api/projects/[id]/images/route");
  const artRoute = await import("@/app/api/projects/[id]/images/art-direction/route");
  const { runImageSetV2, imageSetPlan } = await import("@/lib/image-v2/set");
  const { imageV2Kind } = await import("@/lib/image-v2/ai-only");
  const { realSocialDeps } = await import("@/lib/social-v2/deps");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const u = await createUser(`img100-${Date.now()}@test.fr`, "motdepasse-test", "I");
  const seed = (k: "cosmetic" | "artisan") => {
    const pid = seedImageFixture(u.id, k);
    grantProjectPlan(pid, "dominer");
    return pid;
  };
  const job = (projectId: string) => {
    const jid = id();
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, projectId, "images.generate", "test", "{}", "running", now(), now(), now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };
  const post = (pid: string, b: unknown) => fr(() => route.POST(new Request(`http://localhost:3000/api/projects/${pid}/images`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }), { params: Promise.resolve({ id: pid }) } as any));
  const lastJob = (pid: string) => one<{ type: string; payload: string }>("SELECT type, payload FROM jobs WHERE project_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1", pid)!;

  it("onglet Images : plus d'image « gratuite » du studio ; sans IA, refus expliqué (aucun gabarit)", async () => {
    const pid = seed("cosmetic");
    sessionUser = { ...u, role: "client" };
    aiOn = true;
    const free = await post(pid, { mode: "single", visual: "free", kind: "packshot" });
    expect(free.status).toBe(410);
    aiOn = false;
    const off = await post(pid, { mode: "single", kind: "scene" });
    expect(off.status).toBe(402);
    expect((await off.json()).error).toMatch(/aucune image n'est créée à la place par un gabarit/i);
  });

  it("onglet Images : chaque type part vers l'IA (image produit, scène, bannière : génération seule ; visuels avec texte : publication IA)", async () => {
    const pid = seed("cosmetic");
    sessionUser = { ...u, role: "client" };
    aiOn = true;
    for (const [kind, type, v2] of [["packshot", "image.v2", "packshot"], ["scene", "image.v2", "lifestyle"], ["banner", "image.v2", "banner"], ["ambiance", "image.v2", "ambiance"], ["promo", "image.ai_post", null]] as const) {
      const r = await post(pid, { mode: "single", kind, headline: kind });
      expect(r.status, kind).toBe(200);
      const j = lastJob(pid);
      expect(j.type, kind).toBe(type);
      const req = JSON.parse(j.payload).request;
      if (v2) expect(req).toMatchObject({ kind: v2, noStock: true, allowGenerate: true });
    }
    await post(pid, { mode: "set" });
    expect(lastJob(pid).type).toBe("images.generate");
    expect(imageV2Kind(true, "scene")).toBe("trade_photo");
  });

  it("jeu d'images : chaque image demandée à l'IA (génération seule) ; sans IA, rien n'est créé et la raison est dite", async () => {
    const pid = seed("cosmetic");
    const asks: any[] = [];
    const fake = (async (_c: unknown, _p: string, req: any) => (asks.push(req), { outcomes: [], notes: [], stoppedByCostCap: false })) as any;
    aiOn = false;
    await expect(fr(() => runImageSetV2(job(pid), pid, fake))).rejects.toThrow(/aucun gabarit ni photo de banque/);
    expect(asks).toHaveLength(0);
    aiOn = true;
    await expect(fr(() => runImageSetV2(job(pid), pid, fake))).rejects.toThrow(/image/);
    expect(asks.map((a) => a.kind)).toEqual(imageSetPlan(false).map((x) => x.kind));
    expect(asks.every((a) => a.noStock === true && a.allowGenerate === true)).toBe(true);
    asks.length = 0;
    const svc = seed("artisan");
    await expect(fr(() => runImageSetV2(job(svc), svc, fake))).rejects.toThrow(/image/);
    expect(asks.map((a) => a.kind)).toEqual(["trade_photo", "trade_photo", "banner"]);
    expect(asks.every((a) => a.noStock === true)).toBe(true);
  });

  it("publications : sans dépense acceptée, aucun visuel de gabarit (plus de secours silencieux)", async () => {
    const p = loadProject(seed("cosmetic"));
    const d = realSocialDeps(null, p, false);
    const brief = { id: "x", network: "instagram", format: "feed", title: "Titre", caption: "", pillar: null, objective: null, headline: "Titre", scheduled_at: null };
    for (const fn of [d.image, d.ad, d.aiPost!]) {
      const r = await fr(() => fn.call(d, p, brief, { allowPaid: false, maxCostEur: 0 }));
      expect(r.assetId).toBeNull();
      expect(r.note).toMatch(/aucun gabarit/);
    }
  });

  it("direction artistique du projet : lue par l'API, ajustée par le client, versionnée", async () => {
    const pid = seed("cosmetic");
    sessionUser = { ...u, role: "client" };
    const ctx = { params: Promise.resolve({ id: pid }) } as any;
    const g = await (await fr(() => artRoute.GET(new Request(`http://localhost:3000/api/projects/${pid}/images/art-direction`), ctx))).json();
    expect(g.artDirection.universe).toBeTruthy();
    const v = g.artDirection.version;
    const r = await fr(() => artRoute.PATCH(new Request(`http://localhost:3000/api/projects/${pid}/images/art-direction`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ light: "lumière rasante du soir", avoid: ["fond rose"] }) }), ctx));
    const b = await r.json();
    expect(b.artDirection.light).toBe("lumière rasante du soir");
    expect(b.artDirection.avoid).toContain("fond rose");
    expect(b.artDirection.version).toBe(v + 1);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM memory WHERE project_id = ? AND key = 'image.art_direction' AND status != 'rejected'", pid)!.n).toBe(1);
  });
});

describe("Consigne de publication : seuls les textes permis par le rôle de l'image", async () => {
  const { aiPostPrompt, aiPostTexts } = await import("@/lib/social-v2/ai-post");
  const { buildGenerationBrief } = await import("@/lib/image-v2/art-direction");
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  it("publication : pas de bouton ni de ligne d'angle vide ; publicité : bouton ; image produit : aucun logo", async () => {
    const u = await createUser(`img100b-${Date.now()}@test.fr`, "motdepasse-test", "I");
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    await runWithLang({ ui: "fr", content: "fr" }, async () => {
      const post = { id: "x", network: "instagram", format: "image", title: "Un rituel simple", headline: "Un rituel simple", caption: "", pillar: null, objective: "educate", scheduled_at: null } as any;
      const t = aiPostTexts(p, post);
      const asPost = aiPostPrompt(p, post, { aspect: "4:5", hasReference: true, hasLogo: true, texts: t, brief: buildGenerationBrief(p, { purpose: "post", subject: "x", aspect: "4:5", texts: { hook: t.headline, secondary: t.subline, cta: t.cta } }) });
      expect(asPost).toContain("social media post");
      expect(asPost).not.toContain("call-to-action");
      expect(t.cta).toBe("");
      expect(asPost).not.toMatch(/Post angle:\s+—/);
      const asAd = aiPostPrompt(p, post, { aspect: "4:5", hasReference: true, hasLogo: true, texts: t, brief: buildGenerationBrief(p, { purpose: "ad", subject: "x", aspect: "4:5", texts: { hook: t.headline, secondary: t.subline, cta: "Découvrir" } }) });
      expect(asAd).toContain("social media advertisement");
      expect(asAd).not.toContain("call-to-action"); // organic copy did not ask for a CTA
      expect(buildGenerationBrief(p, { purpose: "product_main", subject: "x", aspect: "1:1" }).logo).toBe("aucun logo dans l'image");
      // Produit entier exigé à chaque génération (bracelet tronqué constaté sur une publicité ARVEN).
      expect(buildGenerationBrief(p, { purpose: "ad", subject: "x", aspect: "1:1" }).fidelity).toMatch(/cadrage cohérent.*détail demandé/);
      expect(asAd).toMatch(/détail demandé/);
    });
  });
});

describe("Deux étapes : photo par Qwen, texte et logo par ChatGPT Images", async () => {
  const { designPostWithAi } = await import("@/lib/social-v2/ai-post");
  const { usagePrimary } = await import("@/lib/ai/media-routing");
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const sharp = (await import("sharp")).default;
  const png = (c = "#886644") => sharp({ create: { width: 1080, height: 1350, channels: 3, background: c } }).png().toBuffer();
  const post = { id: "two-steps", network: "instagram", format: "image", title: "Le temps", caption: "", pillar: null, objective: "convert", headline: "Le temps, bien porté", scheduled_at: null } as any;

  it("texte et logo : ChatGPT Images par défaut", () => expect(usagePrimary("text_layout").provider).toBe("openai"));

  it("photo sans texte puis mise en page ; texte raté : seule la mise en page est refaite (photo payée gardée) ; produit raté : photo refaite", async () => {
    const u = await createUser(`two-${Date.now()}@test.fr`, "motdepasse-test", "T");
    const pid = seedImageFixture(u.id, "cosmetic");
    const ref = await saveAsset({ projectId: pid, userId: u.id, data: await png(), name: "ref.png", mime: "image/png", role: "cutout", folderKey: "images.cutouts", origin: "generated", status: "approved", meta: {} });
    const p = loadProject(pid);
    const run = async (verdicts: { text: boolean; product: boolean }[]) => {
      const log = { scenes: [] as string[], layouts: [] as { prompt: string; photo: Buffer }[] };
      let n = 0;
      const op=String(Math.random());
      const deps = {
        copy:campaignCopy, operationId:op,
        generate: async (prompt: string) => (log.scenes.push(prompt), png("#223344")),
        layout: async (photo: Buffer, prompt: string) => (log.layouts.push({ prompt, photo }), png("#445566")),
        layoutMaxMicro: () => 50_000,
        review: async (_i: Buffer, _r: Buffer | null, texts: string[]) => {
          const v = texts.length?verdicts[Math.min(n++, verdicts.length - 1)]:{text:true,product:true};
          return { ...campaignVerdict(), transcribed: v.text ? texts : ["Le tmps"], person: false, anatomyOk: true, productFaithful: v.product, textsExact: v.text, legible: true, score: 9.2, issues: v.text ? [] : ["faute"], fix: "" };
        },
        spentMicro: () => 0,
        maxMicro: () => 50_000,
      };
      const r = await runWithLang({ ui: "fr", content: "fr" }, () => designPostWithAi(p, post, { aspect: "4:5", maxCostEur: 1, reference: ref.id, as: "ad" }, deps as any));
      return { r, log };
    };
    const a = await run([{ text: false, product: true }, { text: true, product: true }]);
    expect(a.r.assetId).toBeTruthy();
    expect(a.log.scenes).toHaveLength(1); // photo gardée
    expect(a.log.layouts).toHaveLength(2); // mise en page refaite
    expect(a.log.scenes[0]).toMatch(/PHOTOGRAPH ONLY/);
    expect(a.log.scenes[0]).not.toContain("Le temps, bien porté");
    expect(a.log.layouts[0].prompt).toContain('headline: "Le temps, bien porté"');
    expect(a.log.layouts[0].prompt).toMatch(/keep it EXACTLY as it is/);
    const b = await run([{ text: true, product: false }, { text: true, product: true }]);
    expect(b.r.assetId).toBeTruthy();
    expect(b.log.scenes).toHaveLength(1); // scene checked faithful: layout alone damaged it
  });
});
