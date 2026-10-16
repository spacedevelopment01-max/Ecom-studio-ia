/**
 * Audit de l'onglet Images : images finales 100 % IA (jamais une photo libre en secours d'une image demandée à l'IA),
 * IA d'images indisponible dite clairement (raison, aucun bouton payant qui échouerait), modèle du studio
 * (Qwen-Image 3.0 Pro) remplacé → signalé à l'administration, consignes au modèle d'images en français avec le
 * produit entier exigé. Aucun appel payant : clés et fournisseurs simulés.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

let keys: Record<string, string | null> = {};
let sessionUser: any = null;
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
vi.mock("@/lib/plan-gates", async (orig) => ({ ...(await orig<any>()), requireCreationPlan: () => "vendre" }));

describe("onglet Images — audit", async () => {
  const { createUser } = await import("@/lib/auth");
  const { one, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { setJsonSetting } = await import("@/lib/settings");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const v2 = await import("@/app/api/projects/[id]/images/v2/route");
  const images = await import("@/app/api/projects/[id]/images/route");
  const { mediaRoutingOverview } = await import("@/lib/ai/media-routing-admin");
  const { loadProject } = await import("@/lib/projects");
  const { buildBrief, generationPrompt } = await import("@/lib/image-v2/brief");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const u = await createUser(`onglet-images-${Date.now()}@test.fr`, "motdepasse-test", "I");
  run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
  const pid = seedImageFixture(u.id, "cosmetic");
  grantProjectPlan(pid, "vendre");
  const ctx = { params: Promise.resolve({ id: pid }) } as any;
  const postV2 = (b: unknown) => fr(() => v2.POST(new Request(`http://localhost:3000/api/projects/${pid}/images/v2`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }), ctx));
  const payloadOf = async (res: Response) => JSON.parse(one<{ payload: string }>("SELECT payload FROM jobs WHERE id = ?", (await res.json()).jobId)!.payload);

  beforeEach(() => {
    sessionUser = { ...u, role: "client" };
    keys = {};
    for (const k of ["ai.routes", "ai.media.backup", "ai.media.mode", "ai.media.models", "ai.media.usage"]) setJsonSetting(k, {});
  });

  it("une image demandée à l'IA n'est jamais remplacée par une photo libre (même sans « noStock »)", async () => {
    const r = await postV2({ action: "generate", request: { kind: "ambiance", topic: "table en bois", aspect: "4:5", count: 1, allowGenerate: true } });
    expect(r.status).toBe(200);
    expect((await payloadOf(r)).request).toMatchObject({ allowGenerate: true, noStock: true });
    // Demande par défaut (aucun indicateur) : génération seule, elle aussi.
    const d = await postV2({ action: "generate", request: { kind: "ambiance" } });
    expect((await payloadOf(d)).request).toMatchObject({ allowGenerate: true, noStock: true });
    // « Chercher des photos libres » (recherche seule, gratuite) : toujours possible, jamais de génération.
    const s = await postV2({ action: "generate", request: { kind: "ambiance", allowGenerate: false } });
    const sp = (await payloadOf(s)).request;
    expect(sp.allowGenerate).toBe(false);
    expect(sp.noStock).toBeUndefined();
  });

  it("IA d'images indisponible : « ai » faux et raison dite (aucun bouton payant voué à l'échec)", async () => {
    const res = await fr(() => images.GET(new Request(`http://localhost:3000/api/projects/${pid}/images`), ctx));
    const body = await res.json();
    expect(body.ai).toBe(false);
    expect(body.reason).toMatch(/Alibaba|Qwen/);
    expect(body.quote.ai_image).toBeGreaterThan(0);
    // Clé Alibaba active : Qwen-Image 3.0 Pro utilisable, l'IA d'images est disponible.
    keys = { alibaba: "sk-alibaba-test-123456", anthropic: "sk-ant-test-1234567890abcdef" };
    const ok = await (await fr(() => images.GET(new Request(`http://localhost:3000/api/projects/${pid}/images`), ctx))).json();
    expect(ok.ai).toBe(true);
    expect(ok.reason).toBeNull();
  });

  it("administration : Qwen-Image 3.0 Pro inutilisable et remplacé par un autre modèle → signalé", async () => {
    keys = { openai: "sk-openai-test-123456" };
    const img = (await fr(() => mediaRoutingOverview())).find((k) => k.kind === "image")!;
    expect(img.studioDefault).toMatchObject({ key: "alibaba:qwen-image-3.0-pro", usable: false, replacedBy: "openai:gpt-image-1" });
    expect(img.studioDefault!.reasons.join(" ")).toMatch(/clé/);
    keys = { openai: "sk-openai-test-123456", alibaba: "sk-alibaba-test-123456" };
    const okImg = (await fr(() => mediaRoutingOverview())).find((k) => k.kind === "image")!;
    expect(okImg.primary).toBe("alibaba:qwen-image-3.0-pro");
    expect(okImg.studioDefault).toMatchObject({ usable: true, replacedBy: null });
    // Choix fait par l'administration : prioritaire, aucun avertissement.
    keys = { openai: "sk-openai-test-123456" };
    setJsonSetting("ai.routes", { image_generation: { provider: "openai", model: "gpt-image-1" } });
    const own = (await fr(() => mediaRoutingOverview())).find((k) => k.kind === "image")!;
    expect(own.studioDefault!.replacedBy).toBeNull();
  });

  it("consigne au modèle d'images : en français, concrète, produit entier exigé, aucun texte voulu", () => {
    const p = loadProject(pid);
    const b = buildBrief(p, { kind: "usage_scene", support: "site", aspect: "4:5", references: ["ref"] });
    const prompt = generationPrompt(b);
    expect(prompt).toMatch(/^Photographie, style /);
    expect(prompt).toMatch(/Lumière : .+ Prise de vue : /);
    expect(prompt).toContain("Le produit ENTIER est dans le cadre, aucune partie coupée");
    expect(prompt).toContain("aucun texte, aucune lettre, aucun logo");
    expect(prompt).not.toMatch(/Never show|Lighting:|Camera:|Correction for this attempt/);
    // Aucun texte demandé entre guillemets dans une image de la banque.
    expect(prompt).not.toMatch(/«[^»]+»/);
  });

  it("vocabulaire du client appliqué à la consigne du modèle d'images (ex. « montre », jamais « chronographe »)", async () => {
    const { addWordingRule } = await import("@/lib/client-wording");
    const { runImageEngineV2 } = await import("@/lib/image-v2/engine");
    const { mockDeps, review } = await import("./image-v2-mock");
    const q = seedImageFixture(u.id, "artisan");
    addWordingRule(q, { avoid: "chronographe", use: "montre" });
    const { deps, log } = mockDeps({ providers: [], reviewFor: () => review(9) });
    await fr(() => runImageEngineV2(null, q, { kind: "trade_photo", aspect: "16:9", topic: "un chronographe posé sur l'établi", allowGenerate: true, noStock: true }, deps));
    expect(log.prompts.length).toBeGreaterThan(0);
    for (const x of log.prompts) {
      expect(x).not.toMatch(/chronographe/i);
      expect(x).toContain("montre posé sur l'établi");
    }
  });

  it("écran : plus de « forfait Découverte », IA indisponible expliquée, tâche sans image ou bloquée signalée", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/components/studio/tab-images.tsx"), "utf8");
    expect(src).not.toMatch(/forfait Découverte|Discovery plan/);
    // Découverte est un compte sans abonnement, pas un forfait (même règle dans le choix du visuel).
    expect(fs.readFileSync(path.join(process.cwd(), "src/components/studio/visual-choice.tsx"), "utf8")).not.toMatch(/forfait Découverte|Discovery plan/);
    expect(src).not.toMatch(/EngineNotice/);
    expect(src).toContain("data-image-ai-notice");
    expect(src).toMatch(/job\.status === "blocked"\) toast\("bad"/);
    expect(src).toMatch(/!outcomes\.some\(\(o\) => o\.assetId\)\) toast\("bad", noneMessage\)/);
    // Le bouton payant reste désactivé tant que l'IA d'images n'est pas utilisable.
    expect(src).toMatch(/disabled=\{busy \|\| !ai \|\| !price\}/);
  });
});
