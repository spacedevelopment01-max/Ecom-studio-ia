/**
 * Project Brain 2C — contenu des scopes explicites sur les fixtures, et traces :
 *  - Sébastien Blanc : logo, image, stock, SEO contiennent l'utile et pas le reste ; coordonnées hors site jamais transmises ;
 *  - Sérum Éclat (produit riche) : faits, prix, variantes, allégations par scope ;
 *  - aucune information critique perdue (aucun critique retiré, aucun plafond atteint) ;
 *  - trace : appel texte → brain_scope / brain_hash / brain_version ; génération d'image écrite depuis le Brain → idem ;
 *  - stable / volatil : créations récentes jamais dans le stable, seulement dans le volatil des scopes qui en ont besoin.
 */
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
    messages = { stream: (p: any) => this.stream(p), countTokens: async (p: any) => ({ input_tokens: Math.ceil(JSON.stringify(p).length / 3) }) };
    beta = { messages: { stream: (p: any) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (p === "google" ? "cle-google-de-test-1234567890" : "sk-ant-test-1234567890abcdef") }));

let fetchImpl: () => Promise<Response> = async () => new Response("{}");
beforeEach(() => {
  sent.length = 0;
  vi.stubGlobal("fetch", async () => fetchImpl());
});
afterEach(() => vi.unstubAllGlobals());

describe("Project Brain 2C — contextes ciblés et traces", async () => {
  const { createUser } = await import("@/lib/auth");
  const { id, now, one, run } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { brainContext, brainView, brainMetaOf } = await import("@/lib/brain/facade");
  const { BRAIN_VERSION } = await import("@/lib/brain");
  const { ENGINE_SCOPES, measureEngines } = await import("@/lib/brain/measure");
  const { seedSebastienBlanc, seedSerumEclat, SB_ADDRESS, SB_EMAIL, SB_PHONE } = await import("./brain-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const u = await createUser(`contextes2c${Date.now()}@test.fr`, "motdepasse-test", "C");
  getSubscription(u.id);
  run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
  syncAllowance(u.id);
  const sbId = fr(() => seedSebastienBlanc(u.id));
  const serumId = fr(() => seedSerumEclat(u.id));
  const sb = () => loadProject(sbId);
  const serum = () => loadProject(serumId);
  const view = (p: ReturnType<typeof sb>, s: Parameters<typeof brainView>[1]) => fr(() => brainView(p, s));

  it("Sébastien Blanc — LOGO : nom, plâtrier peintre, gestes, positionnement, palette, typos, refus de logo ; rien du social", () => {
    const v = view(sb(), "logo");
    for (const need of ["Sébastien Blanc", "Plâtrier peintre", "gestes : plastering", "Positionnement", "Palette", "Typographies", "REFUS du client — Pistes de logo de type badge / emblème", "Objets du métier pour un symbole : trowel"]) expect(v.stable, need).toContain(need);
    for (const no of ["Ligne éditoriale", "Messages clés", "Règles des services", "mur vide", SB_PHONE, "Recherches de photos"]) expect(v.stable, no).not.toContain(no);
  });

  it("Sébastien Blanc — IMAGE : métier, gestes, scènes utiles et hors sujet, refus d'image, palette et direction ; pas de stratégie SEO", () => {
    const v = view(sb(), "image");
    for (const need of ["Plâtrier peintre", "gestes : plastering", "Scènes pertinentes : craftsman applying plaster", "Hors sujet à écarter : brick wall", "REFUS du client — Visuels « mur vide sans chantier »", "Palette", "Direction artistique"]) expect(v.stable, need).toContain(need);
    for (const no of ["Règles des services", "Cible :", "Messages clés", "Pistes de logo", SB_PHONE, "Recherches de photos"]) expect(v.stable, no).not.toContain(no);
  });

  it("Sébastien Blanc — STOCK : profession, gestes, recherches, négatifs, prestations, zone ; aucune histoire de marque ni palette", () => {
    const v = view(sb(), "stock");
    for (const need of ["Plâtrier peintre", "gestes : plastering", "Recherches de photos (action + métier + lieu) : plasterer applying skim coat", "Hors sujet à écarter", "Prestations (saisies par le client) : Plâtrerie et plaques de plâtre", "Zone d'intervention : Mâcon et 30 km autour", "mur vide sans chantier"]) expect(v.stable, need).toContain(need);
    for (const no of ["Palette", "Histoire", "Ton :", "Typographies", "Pistes de logo", SB_PHONE]) expect(v.stable, no).not.toContain(no);
  });

  it("Sébastien Blanc — SEO : activité, prestations, zone, faits confirmés, inconnues, allégations interdites ; pas de palette ni de logo", () => {
    const v = view(sb(), "seo");
    for (const need of ["Activité : Sébastien Blanc", "Prestations (saisies par le client)", "Zone d'intervention : Mâcon et 30 km autour", "Fait CONFIRMÉ — Zone : Mâcon et alentours", "INCONNU — Années d'expérience", "Allégations interdites : artisan certifié RGE", "Ne jamais inventer"]) expect(v.stable, need).toContain(need);
    for (const no of ["Palette", "Typographies", "Logo actuel", "Pistes de logo", "Direction artistique", "mur vide"]) expect(v.stable, no).not.toContain(no);
  });

  it("coordonnées : site, textes et leur relecture seulement ; publications, publicités et vidéo reçoivent le mode de contact sans coordonnées", () => {
    const p = sb();
    for (const s of ["theme", "shop_copy", "qc"] as const) expect(view(p, s).stable, s).toContain(SB_PHONE);
    for (const s of ["logo", "image", "stock", "seo", "blog", "social", "advertising", "video", "brand"] as const) for (const c of [SB_PHONE, SB_EMAIL, SB_ADDRESS]) expect(view(p, s).stable, `${s} : ${c}`).not.toContain(c);
    for (const s of ["social", "advertising", "video"] as const) expect(view(p, s).stable, s).toContain("Appel à l'action — mode de contact principal : demande de devis");
  });

  it("Sérum Éclat — faits, prix, variantes, allégations, preuves manquantes là où les textes en ont besoin ; texte du flacon pour l'image", () => {
    const p = serum();
    for (const s of ["shop_copy", "theme", "advertising", "qc"] as const)
      for (const need of ["Contenance : 30 ml", "INCONNU — Livraison", "Prix confirmé : 34.90 EUR", "Allégations interdites : anti-âge prouvé", "Arguments SANS PREUVE", "Fabriqué en France"]) expect(view(p, s).stable, `${s} : ${need}`).toContain(need);
    // Le prix protège aussi les textes des publications, vidéos et articles (jamais inventé).
    for (const s of ["social", "video", "blog", "seo"] as const) expect(view(p, s).stable, s).toContain("Prix confirmé : 34.90 EUR");
    const img = view(p, "image").stable;
    for (const need of ["Texte lisible sur le produit : ÉCLAT | 30 ml", "Aspect du produit : flacon compte-gouttes", "Allégations interdites : anti-âge prouvé"]) expect(img, need).toContain(need);
    for (const no of ["Prix confirmé", "Objections", "Plateforme de marque"]) expect(img, no).not.toContain(no);
    expect(view(p, "logo").stable).toContain("REFUS du client — Pistes de logo de type symbole dessiné");
    expect(view(p, "qc").stable).toContain("Préférence — ton : Pas de jargon scientifique");
  });

  it("produit : la catégorie « sérum visage » passe encore par le repli GÉNÉRIQUE du registre des métiers (limitation connue, visible)", () => {
    const v = view(serum(), "image");
    expect(v.stable).toMatch(/Métier compris \(déduit, à confirmer\) : .*\[generic\]/);
  });

  it("aucune information critique perdue : aucun élément critique retiré, aucun plafond atteint (deux fixtures, tous les moteurs)", () => {
    for (const p of [sb(), serum()])
      for (const m of fr(() => measureEngines(p))) {
        expect(m.criticalDropped, `${p.name} ${m.engine}`).toEqual([]);
        expect(m.hardCeilingReached, `${p.name} ${m.engine}`).toBe(false);
      }
    expect(ENGINE_SCOPES).toHaveLength(12);
  });

  it("trace d'un appel texte : brain_scope, brain_hash, brain_version du scope explicite", async () => {
    const p = sb();
    const ctx = fr(() => brainContext(p, "blog"));
    const v = view(p, "blog");
    const { llmText } = await import("@/lib/ai/llm");
    await fr(() => llmText({ task: "blog_writing", userId: u.id, projectId: p.id, system: "SYS", context: `${ctx}\nConsignes propres à l'article`, prompt: "P" }));
    expect(one<any>("SELECT brain_scope, brain_hash, brain_version FROM ai_calls WHERE project_id = ? ORDER BY created_at DESC LIMIT 1", p.id)).toEqual({ brain_scope: "blog", brain_hash: v.hash, brain_version: BRAIN_VERSION });
    expect(BRAIN_VERSION).toBe("2.3.0");
  });

  it("trace d'une génération d'image écrite depuis le Brain (réussite et échec) ; sans consigne du Brain : aucune trace Brain", async () => {
    const p = serum();
    const v = view(p, "image");
    const brain = { scope: v.label, hash: v.hash, version: v.brainVersion };
    const { geminiPlate } = await import("@/lib/ai/media-providers");
    // Décor vide demandé au modèle choisi pour « Images produit » (ici Gemini, réglé dans l'administration).
    (await import("@/lib/settings")).setJsonSetting("ai.media.usage", { product_image: { primary: "google:gemini-2.5-flash-image" } });
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    fetchImpl = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: png } }] } }] }), { status: 200 });
    await fr(() => geminiPlate({ userId: u.id, projectId: p.id, usageKey: `img-ok-${Date.now()}`, brain }, { prompt: "set", aspect: "1:1" }));
    const ok = one<any>("SELECT status, brain_scope, brain_hash, brain_version FROM ai_calls WHERE project_id = ? AND task = 'image_generation' ORDER BY created_at DESC, rowid DESC LIMIT 1", p.id);
    expect(ok).toEqual({ status: "ok", brain_scope: "image", brain_hash: v.hash, brain_version: BRAIN_VERSION });
    fetchImpl = async () => new Response("panne", { status: 500 });
    await expect(fr(() => geminiPlate({ userId: u.id, projectId: p.id, usageKey: `img-ko-${Date.now()}`, brain }, { prompt: "set", aspect: "1:1" }))).rejects.toThrow();
    const ko = one<any>("SELECT status, brain_scope FROM ai_calls WHERE project_id = ? AND task = 'image_generation' ORDER BY created_at DESC, rowid DESC LIMIT 1", p.id);
    expect(ko).toEqual({ status: "error", brain_scope: "image" });
    fetchImpl = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: png } }] } }] }), { status: 200 });
    await fr(() => geminiPlate({ userId: u.id, projectId: p.id, usageKey: `img-studio-${Date.now()}` }, { prompt: "set", aspect: "1:1" }));
    expect(one<any>("SELECT brain_scope FROM ai_calls WHERE project_id = ? AND task = 'image_generation' ORDER BY created_at DESC, rowid DESC LIMIT 1", p.id)).toEqual({ brain_scope: null });
    fetchImpl = async () => new Response("{}");
  });

  it("stable / volatil : une création récente n'entre jamais dans le stable ; volatil seulement pour image, theme, social", () => {
    const pid = sbId;
    run("INSERT INTO assets (id, project_id, user_id, name, kind, role, mime, size, storage_key, origin, meta, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", id(), pid, u.id, "chantier-recent-2c.jpg", "image", "lifestyle", "image/png", 1, "k", "generated", "{}", "review", now());
    const p = sb();
    for (const s of ["logo", "image", "stock", "theme", "shop_copy", "seo", "blog", "social", "advertising", "video", "qc", "brand"] as const) {
      const ctx = fr(() => brainContext(p, s));
      expect(ctx, s).not.toContain("chantier-recent-2c");
      const meta = brainMetaOf(ctx, pid)!;
      expect(meta.scope).toBe(s);
      if (["image", "theme", "social"].includes(s)) expect(meta.volatile, s).toContain("chantier-recent-2c.jpg");
      else expect(meta.volatile, s).toBe("");
    }
  });
});
