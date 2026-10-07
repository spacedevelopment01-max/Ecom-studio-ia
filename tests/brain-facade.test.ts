/**
 * Project Brain 2.1 — projectContext devient une façade du Brain :
 *  - mapping legacy (brand → brand, shop → theme, images → image, video → video, social → social, all → all) ;
 *  - contexte stable sans créations récentes ; créations récentes dans le slot VOLATIL, après le point de cache ;
 *  - ordre des blocs envoyés au modèle ; portée, empreinte et version du Brain enregistrées dans ai_calls ;
 *  - compatibilité : les informations nécessaires restent présentes (service et produit) ;
 *  - plus de doublons « marque.* » dans le contexte (la mémoire, elle, est conservée).
 */
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent: any[] = [];
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(public opts: any) {}
    private stream(params: any) {
      sent.push(params);
      const p = Promise.resolve({ model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: "ok" }], usage: { input_tokens: 10, output_tokens: 5 } });
      return { finalMessage: () => p };
    }
    messages = { stream: (p: any) => this.stream(p) };
    beta = { messages: { stream: (p: any) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: () => "sk-ant-test-1234567890abcdef" }));

beforeEach(() => {
  sent.length = 0;
  vi.stubGlobal("fetch", async () => new Response("{}"));
});
afterEach(() => vi.unstubAllGlobals());

describe("Project Brain 2.1 — façade projectContext", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, db, id, now, one, run } = await import("@/lib/db");
  const { localBrand } = await import("@/lib/engine/local");
  const { serviceProduct, serviceProfile, product: baseProduct } = await import("./fixtures");
  const { projectContext } = await import("@/lib/ai/context");
  const { legacyView, brainMetaOf, LEGACY_SCOPES } = await import("@/lib/brain/facade");
  const { BRAIN_VERSION } = await import("@/lib/brain");
  const { loadProject } = await import("@/lib/projects");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const u = await createUser(`facade${Date.now()}@test.fr`, "motdepasse-test", "F");
  getSubscription(u.id);
  run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
  syncAllowance(u.id);

  const insert = (business: "services" | "products", product: any, services: any, strategyPatch?: (s: any) => any) => {
    const { brand, strategy } = localBrand(product, product.name, { business, services } as any);
    const pid = id();
    run(
      "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      pid, u.id, product.name, "ready", "shopify", JSON.stringify(product), JSON.stringify(brand), JSON.stringify(strategyPatch ? strategyPatch(strategy) : strategy), JSON.stringify({ language: "fr" }), "[]", business, JSON.stringify(services ?? {}), now(), now(),
    );
    return pid;
  };
  const service = () =>
    insert(
      "services",
      {
        ...serviceProduct,
        name: "Sébastien Blanc",
        category: "Plâtrier peintre",
        sector: "batiment",
        summary: "Plâtrerie, plaques de plâtre, enduits, lissage, peinture intérieure, rénovation intérieure.",
        facts: [
          { key: "zone", label: "Zone", value: "Mâcon et alentours", status: "confirmed", source: "user" },
          { key: "experience", label: "Années d'expérience", value: "", status: "unknown", source: "ai" },
        ],
      },
      { ...serviceProfile, services: [{ name: "Plâtrerie et plaques de plâtre" }, { name: "Enduits et lissage" }, { name: "Peinture intérieure", price: "sur devis" }], area: "Mâcon", phone: "06 11 22 33 44", contactMode: "quote", bookingUrl: "" },
    );
  // Fixture e-commerce riche : faits confirmés et inconnus, prix, variantes, texte lisible, allégations interdites,
  // réponse du client, plateforme de marque (argument sans preuve, objections).
  const richProduct = () =>
    insert(
      "products",
      {
        ...baseProduct,
        name: "Sérum Éclat",
        category: "Sérum visage",
        summary: "Sérum à la vitamine C pour un teint lumineux.",
        price: { amount: 3490, currency: "EUR", status: "confirmed" },
        variants: [{ name: "Contenance", values: ["15 ml", "30 ml"] }],
        claimsToAvoid: ["anti-âge prouvé"],
        visual: { ...baseProduct.visual, labelText: ["ÉCLAT", "30 ml"] },
        questions: [{ id: "q1", question: "Quelle est l'origine des ingrédients ?", why: "fiche", required: false, factKey: "origine", answer: "Fabriqué en France" }],
      },
      null,
      (s) => ({ ...s, keyMessages: ["Un teint lumineux en 2 gestes"], platform: { persona: "Femme active", problem: "Teint terne", alternatives: "Sérums de grande surface", difference: "Formule courte", proofs: [{ claim: "Résultats visibles en 7 jours", proof: "", status: "missing" }], objections: [{ objection: "Est-ce que ça pique ?", answer: "" }] } }),
    );
  const asset = (pid: string, name: string, role = "lifestyle") => run("INSERT INTO assets (id, project_id, user_id, name, kind, role, mime, size, storage_key, origin, meta, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", id(), pid, u.id, name, "image", role, "image/png", 1, "k", "generated", "{}", "review", now());

  it("mapping legacy : chaque ancien scope est servi par le Brain, sous un nom traçable", () => {
    const pid = service();
    const p = loadProject(pid);
    expect(Object.fromEntries(Object.entries(LEGACY_SCOPES).map(([k, v]) => [k, v.scope]))).toEqual({ all: "all", brand: "brand", shop: "theme", images: "image", video: "video", social: "social" });
    for (const s of ["brand", "shop", "images", "video", "social"] as const) {
      const ctx = projectContext(p, s);
      expect(ctx.startsWith(`<contexte_projet scope="legacy:${s}">`)).toBe(true);
      expect(ctx).toBe(legacyView(p, s).stable);
    }
    expect(projectContext(p)).toMatch(/^<contexte_projet scope="all">/);
  });

  it("créations récentes : jamais dans le contexte stable ; dans le volatil des seuls scopes qui en ont besoin, du bon projet", () => {
    const pid = service();
    asset(pid, "chantier-salon-recent.jpg");
    const p = loadProject(pid);
    for (const s of ["brand", "shop", "images", "video", "social", "all"] as const) {
      const ctx = projectContext(p, s);
      expect(ctx).not.toContain("chantier-salon-recent");
      const meta = brainMetaOf(ctx, pid)!;
      expect(meta).toBeTruthy();
      if (["shop", "images", "social", "all"].includes(s)) expect(meta.volatile).toContain("chantier-salon-recent.jpg");
      else expect(meta.volatile).toBe("");
      // Jamais le volatil d'un projet pour un autre projet.
      expect(brainMetaOf(ctx, "autre-projet")!.volatile).toBe("");
    }
  });

  it("stabilité : une nouvelle création change le volatil, pas le contexte stable ni l'empreinte ; un logo validé les change", () => {
    const pid = service();
    const before = legacyView(loadProject(pid), "images");
    asset(pid, "nouvelle-photo.jpg");
    const after = legacyView(loadProject(pid), "images");
    expect(after.stable).toBe(before.stable);
    expect(after.hash).toBe(before.hash);
    expect(after.volatile).not.toBe(before.volatile);
    // Décision centrale : logo validé (pointeur + verrou).
    const logo = id();
    run("INSERT INTO assets (id, project_id, user_id, name, kind, role, mime, size, storage_key, origin, meta, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", logo, pid, u.id, "logo.png", "image", "logo", "image/png", 1, "k", "generated", "{}", "review", now());
    const brand = JSON.parse(String(db().prepare("SELECT brand_json FROM projects WHERE id = ?").pluck().get(pid)));
    run("UPDATE projects SET brand_json = ? WHERE id = ?", JSON.stringify({ ...brand, validated: [...brand.validated, "logo"], logo: { ...brand.logo, assetId: logo, status: "validated", concept: "Truelle" } }), pid);
    for (const s of ["brand", "shop", "images", "social", "all"] as const) {
      const v0 = s === "images" ? after : null;
      const v1 = legacyView(loadProject(pid), s);
      if (v0) expect(v1.hash).not.toBe(v0.hash);
      expect(v1.stable).toMatch(/Logo actuel : VALIDÉ par le client/);
    }
  });

  it("ordre des blocs : système, contexte stable, référence, POINT DE CACHE, volatil, images, demande ; trace Brain enregistrée", async () => {
    const pid = service();
    asset(pid, "photo-volatile.jpg");
    const p = loadProject(pid);
    const ctx = projectContext(p, "images");
    const view = legacyView(p, "images");
    const { llmText } = await import("@/lib/ai/llm");
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#ffffff" } }).png().toBuffer();
    await fr(() => llmText({ task: "art_direction", userId: u.id, projectId: pid, system: "SYS", context: ctx, reference: "REFERENCE-STABLE", images: [{ data: png, label: "photo" }], prompt: "DEMANDE" }));
    const params = sent.at(-1);
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
    const blocks = params.messages[0].content;
    expect(blocks[0]).toMatchObject({ type: "text", text: ctx });
    expect(blocks[0].cache_control).toBeUndefined();
    expect(blocks[1]).toMatchObject({ type: "text", text: "REFERENCE-STABLE", cache_control: { type: "ephemeral" } });
    expect(blocks[2].type).toBe("text");
    expect(blocks[2].text).toContain("photo-volatile.jpg");
    expect(blocks[2].cache_control).toBeUndefined();
    expect(blocks[3]).toMatchObject({ type: "text", text: "Image 1 — photo :" });
    expect(blocks[4].type).toBe("image");
    expect(blocks.at(-1)).toMatchObject({ type: "text", text: "DEMANDE" });
    // Deux points de cache seulement (système + dernier bloc stable) ; le volatil est après.
    expect(blocks.filter((b: any) => b.cache_control).length).toBe(1);
    const row = one<any>("SELECT brain_scope, brain_hash, brain_version FROM ai_calls WHERE project_id = ? ORDER BY created_at DESC LIMIT 1", pid);
    expect(row).toEqual({ brain_scope: "legacy:images", brain_hash: view.hash, brain_version: BRAIN_VERSION });
  });

  it("sans référence : le point de cache est sur le contexte ; volatil et trace explicites possibles ; appel hors Brain sans trace", async () => {
    const pid = service();
    const p = loadProject(pid);
    const ctx = projectContext(p, "brand");
    const { llmText } = await import("@/lib/ai/llm");
    await fr(() => llmText({ task: "strategy", userId: u.id, projectId: pid, system: "SYS", context: ctx, volatile: "VOLATIL-EXPLICITE", brain: { scope: "logo", hash: "h-explicite", version: "x" }, prompt: "P" }));
    const blocks = sent.at(-1).messages[0].content;
    expect(blocks[0]).toMatchObject({ text: ctx, cache_control: { type: "ephemeral" } });
    expect(blocks[1]).toMatchObject({ text: "VOLATIL-EXPLICITE" });
    expect(blocks[1].cache_control).toBeUndefined();
    expect(one<any>("SELECT brain_scope, brain_hash, brain_version FROM ai_calls WHERE project_id = ? ORDER BY created_at DESC LIMIT 1", pid)).toEqual({ brain_scope: "logo", brain_hash: "h-explicite", brain_version: "x" });
    await fr(() => llmText({ task: "classification", userId: u.id, projectId: pid, system: "SYS", prompt: "sans contexte" }));
    expect(one<any>("SELECT brain_scope, brain_hash FROM ai_calls WHERE project_id = ? ORDER BY created_at DESC LIMIT 1", pid)).toEqual({ brain_scope: null, brain_hash: null });
    // Le contexte complété après coup (ex. vidéo + consignes de réalisation) reste reconnu.
    expect(brainMetaOf(`${projectContext(p, "video")}\nConsignes de réalisation…`, pid)?.scope).toBe("legacy:video");
  });

  it("compatibilité — service (Sébastien Blanc) : les informations nécessaires restent présentes dans chaque scope legacy", () => {
    const p = loadProject(service());
    for (const s of ["brand", "shop", "images", "video", "social", "all"] as const) {
      const ctx = projectContext(p, s);
      for (const need of ["Sébastien Blanc", "Plâtrier peintre", "Mâcon et alentours", "INCONNU — Années d'expérience", "Plâtrerie et plaques de plâtre", "Enduits et lissage", "tarif : sur devis", "Palette", "Ton :", "Règles des services", "Ne jamais inventer"])
        expect(ctx, `${s} : ${need}`).toContain(need);
    }
    // Coordonnées : site, réseaux sociaux et vue complète seulement.
    expect(projectContext(p, "shop")).toContain("06 11 22 33 44");
    expect(projectContext(p, "social")).toContain("06 11 22 33 44");
    expect(projectContext(p, "images")).not.toContain("06 11 22 33 44");
  });

  it("compatibilité — produit riche : nom, catégorie, faits, inconnues, prix, variantes, marque, stratégie, règles d'allégations", () => {
    const p = loadProject(richProduct());
    for (const s of ["brand", "shop", "images", "video", "social", "all"] as const) {
      const ctx = projectContext(p, s);
      for (const need of ["Sérum Éclat", "Sérum visage", "Contenance : 30 ml", "INCONNU — Livraison", "Prix confirmé : 34.90 EUR", "Variantes : Contenance (15 ml, 30 ml)", "Allégations interdites : anti-âge prouvé", "Arguments SANS PREUVE", "Résultats visibles en 7 jours", "Messages clés : Un teint lumineux en 2 gestes", "Fabriqué en France", "Texte lisible sur le produit : ÉCLAT | 30 ml", "Palette"])
        expect(ctx, `${s} : ${need}`).toContain(need);
    }
    for (const s of ["shop", "social", "all"] as const) expect(projectContext(p, s)).toMatch(/Objections et réponses \(FAQ, fiche\) : Est-ce que ça pique \? → \[À compléter/);
    expect(projectContext(p, "shop")).toMatch(/Plateforme de marque — persona : Femme active · problème : Teint terne · alternatives/);
  });

  it("doublons « marque.* » retirés du contexte, lignes de mémoire conservées ; autres décisions toujours transmises", () => {
    const pid = service();
    const ins = (kind: string, key: string, value: string, scope = "brand") => run("INSERT INTO memory (id, project_id, kind, key, value, status, source, scope, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), pid, kind, key, value, "confirmed", "user", scope, now(), now());
    ins("decision", "marque.palette", '{"primary":"#123456","secondary":"#ABCDEF"}');
    ins("decision", "marque.tone", '{"voice":"chaleureux"}');
    ins("decision", "theme.hero", "Accueil avec photo de chantier", "shop");
    const p = loadProject(pid);
    for (const s of ["brand", "shop", "images", "social", "all"] as const) {
      const ctx = projectContext(p, s);
      expect(ctx).not.toContain("marque.palette");
      expect(ctx).not.toContain('{"primary"');
      expect(ctx).not.toContain("marque.tone");
    }
    expect(projectContext(p, "shop")).toContain("Décision — theme.hero : Accueil avec photo de chantier");
    expect(all("SELECT key FROM memory WHERE project_id = ? AND key LIKE 'marque.%'", pid)).toHaveLength(2);
  });

  it("aucun secret : réglages, connexions et jetons ne sont jamais lus par la façade", () => {
    const pid = service();
    const p = loadProject(pid);
    const everything = (["brand", "shop", "images", "video", "social", "all"] as const).map((s) => projectContext(p, s) + brainMetaOf(projectContext(p, s), pid)!.volatile).join("\n");
    for (const s of ["access_token", "apiKey", "APP_SECRET", "sk-ant-test"]) expect(everything).not.toContain(s);
  });
});
