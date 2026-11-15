/**
 * Recherche web OpenAI pour la recherche marketing — aucun appel réel ni payant :
 *  - disponible seulement avec clé, modèle confirmé ET tarif de l'outil (openai:web_search, à l'appel) ;
 *  - comptage puis coût maximal réservé AVANT l'envoi, réglé au coût réel (jetons + recherches) ;
 *  - seuls les liens renvoyés par l'outil sont gardés, places de marché (AliExpress…) exclues ;
 *  - refus du fournisseur : réservation rendue ; reprise avec la même clé : aucun second envoi ;
 *  - page lisible : lue par le Studio ; page illisible : extrait rapporté, marqué comme tel.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-websearch-"));
});

vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (p === "openai" || p === "anthropic" ? "cle-de-test-1234567890abcdef" : null) }));

describe("recherche web OpenAI (outil web_search)", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, run } = await import("@/lib/db");
  const billing = await import("@/lib/billing");
  const { setSetting, setJsonSetting } = await import("@/lib/settings");
  const { runForUser } = await import("@/lib/ai/access");
  const { ProviderHttpError } = await import("@/lib/ai/text-providers");
  const ws = await import("@/lib/ai/web-search");
  const { researchProject } = await import("@/lib/preparation/research");

  const calls: string[] = [];
  const sources = (urls: string[]) => ({ type: "web_search_call", status: "completed", action: { type: "search", query: "q", sources: urls.map((url) => ({ type: "url", url })) } });
  const excerpt = (w: string) => `${w} — phrase exacte de la page, assez longue pour être une observation utile au positionnement.`;
  let reply: any;
  const original = { ...ws.webSearchDeps };

  beforeEach(() => {
    calls.length = 0;
    reply = {
      status: "completed",
      model: "gpt-5.6-terra",
      usage: { input_tokens: 30000, output_tokens: 2000, input_tokens_details: { cached_tokens: 0 } },
      output: [
        sources(["https://marque-a.fr/sac", "https://marque-b.fr/sacs?utm_source=x", "https://fr.aliexpress.com/item/1.html"]),
        sources(["https://forum.exemple.fr/avis-sacs"]),
        { type: "message", content: [{ type: "output_text", annotations: [{ type: "url_citation", url: "https://guide.exemple.fr/secteur" }], text: JSON.stringify({ sources: [
          { url: "https://marque-a.fr/sac", title: "Marque A", category: "competitors", excerpt: excerpt("A") },
          { url: "https://marque-b.fr/sacs", title: "Marque B", category: "competitors", excerpt: excerpt("B") },
          { url: "https://fr.aliexpress.com/item/1.html", title: "Annonce", category: "offer", excerpt: excerpt("X") },
          { url: "https://forum.exemple.fr/avis-sacs", title: "Avis", category: "customers", excerpt: excerpt("C") },
          { url: "https://guide.exemple.fr/secteur", title: "Guide", category: "sector", excerpt: excerpt("S") },
          { url: "https://invente.exemple.fr/page", title: "Inventé", category: "offer", excerpt: excerpt("I") },
        ] }) }] },
      ],
    };
    ws.webSearchDeps.count = async () => (calls.push("count"), 600);
    ws.webSearchDeps.send = async (body: any) => (calls.push("send"), expect(body.tools[0].type).toBe("web_search"), expect(body.max_tool_calls).toBe(ws.MAX_SEARCHES), reply);
    setSetting("ai.prices.checkedAt", String(Date.now()));
    setJsonSetting("ai.prices", { "openai:gpt-5.6-terra": { unit: "tokens", inputPerM: 2, outputPerM: 12 }, "openai:web_search": { unit: "call", perCall: 0.01 } });
    setJsonSetting("ai.textModels", { "openai:gpt-5.6-terra": { confirmedAt: Date.now() } });
    setJsonSetting("ai.routes", { strategy: { provider: "openai", model: "gpt-5.6-terra", effort: "medium" } });
  });
  afterEach(() => {
    Object.assign(ws.webSearchDeps, original);
    setJsonSetting("ai.routes", {});
    setJsonSetting("ai.prices", {});
    setJsonSetting("ai.textModels", {});
  });

  async function client() {
    const u = await createUser(`web${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "W");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    billing.getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
    billing.alignPeriod(u.id, Date.now());
    billing.syncAllowance(u.id);
    return u;
  }
  const search = (uid: string, key = `k-${Math.random()}`) => runForUser(uid, () => ws.openaiWebResearch({ userId: uid, projectId: null, usageKey: key }, "sac à dos"));

  it("indisponible sans tarif de l'outil : aucune recherche web, aucun appel", async () => {
    setJsonSetting("ai.prices", { "openai:gpt-5.6-terra": { unit: "tokens", inputPerM: 2, outputPerM: 12 } });
    expect(ws.webSearchRoute()).toBeNull();
    expect(ws.webSearchQuoteMicro()).toBeNull();
    const u = await client();
    await expect(search(u.id)).rejects.toThrow(/web_search/);
    expect(calls).toEqual([]);
  });

  it("réserve le maximum avant l'envoi, facture jetons + recherches, garde seulement les liens renvoyés hors places de marché", async () => {
    const u = await client();
    const r = await search(u.id);
    expect(calls).toEqual(["count", "send"]);
    expect(r.searches).toBe(2);
    expect(r.findings.map((f) => f.url)).toEqual(["https://marque-a.fr/sac", "https://marque-b.fr/sacs", "https://forum.exemple.fr/avis-sacs", "https://guide.exemple.fr/secteur"]);
    expect(r.rejected).toEqual(expect.arrayContaining([{ url: "https://fr.aliexpress.com/item/1.html", reason: "place de marché exclue" }, { url: "https://invente.exemple.fr/page", reason: "lien non renvoyé par la recherche" }]));
    const [res] = all<{ status: string; amount: number; actual: number }>("SELECT status, amount, actual FROM ai_reservations WHERE user_id = ?", u.id);
    expect(res.status).toBe("settled");
    expect(res.amount).toBe(ws.webSearchMaxMicro("openai", "gpt-5.6-terra", 600));
    const usd = (30000 * 2 + 2000 * 12) / 1e6 + 2 * 0.01;
    const { usdToEur } = await import("@/lib/ai/config");
    expect(res.actual).toBe(Math.round(usd * usdToEur() * 1e6));
    expect(res.actual).toBeLessThan(res.amount);
    const [c] = all<{ quantity: number; prompt_key: string; status: string }>("SELECT quantity, prompt_key, status FROM ai_calls WHERE user_id = ?", u.id);
    expect(c).toMatchObject({ quantity: 2, prompt_key: "preparation.research.web", status: "ok" });
  });

  it("refus net du fournisseur : réservation rendue, rien facturé", async () => {
    ws.webSearchDeps.send = async () => { calls.push("send"); throw new ProviderHttpError(400, "outil refusé"); };
    const u = await client();
    await expect(search(u.id)).rejects.toThrow(/refusée par le fournisseur/);
    const [res] = all<{ status: string }>("SELECT status FROM ai_reservations WHERE user_id = ?", u.id);
    expect(res.status).toBe("released");
  });

  it("reprise avec la même clé : résultat acquis relu, aucun second envoi", async () => {
    const u = await client();
    const a = await search(u.id, "meme-cle");
    const b = await search(u.id, "meme-cle");
    expect(b).toEqual(a);
    expect(calls.filter((c) => c === "send")).toHaveLength(1);
  });

  it("modèle voulu par l'appelant (la marque de SINA cherche avec un modèle moins coûteux) : pris s'il a clé et tarifs, sinon la route habituelle", async () => {
    setJsonSetting("ai.routes", { strategy: { provider: "anthropic", model: "claude-opus-5-5", effort: "high" } });
    setJsonSetting("ai.prices", { "anthropic:claude-opus-5-5": { unit: "tokens", inputPerM: 4, outputPerM: 20 }, "anthropic:claude-sonnet-5-5": { unit: "tokens", inputPerM: 2, outputPerM: 10 }, "anthropic:web_search": { unit: "call", perCall: 0.01 } });
    const craft = { provider: "anthropic", model: "claude-sonnet-5-5" };
    expect(ws.webSearchRoute()).toMatchObject({ model: "claude-opus-5-5" });
    expect(ws.webSearchRoute(craft)).toMatchObject({ provider: "anthropic", model: "claude-sonnet-5-5" });
    expect(ws.webSearchQuoteMicro(craft)!).toBeLessThan(ws.webSearchQuoteMicro()!);
    // Modèle sans tarif, ou fournisseur sans recherche web : la route habituelle, jamais un appel non chiffré.
    expect(ws.webSearchRoute({ provider: "anthropic", model: "modele-sans-tarif" })).toMatchObject({ model: "claude-opus-5-5" });
    expect(ws.webSearchRoute({ provider: "google", model: "gemini" })).toMatchObject({ model: "claude-opus-5-5" });
    let sent: any = null;
    ws.webSearchDeps.anthropicCount = async () => 700;
    ws.webSearchDeps.anthropicSend = async (params: any) => { sent = params; return { model: params.model, stop_reason: "end_turn", usage: { input_tokens: 9000, output_tokens: 500, server_tool_use: { web_search_requests: 1 } }, content: [{ type: "web_search_tool_result", content: [{ type: "web_search_result", url: "https://marque-a.fr/sac", title: "A" }] }, { type: "text", text: JSON.stringify({ sources: [{ url: "https://marque-a.fr/sac", title: "A", category: "competitors", excerpt: excerpt("A") }] }), citations: [] }] }; };
    const u = await client();
    await runForUser(u.id, () => ws.webResearch({ userId: u.id, projectId: null, usageKey: `k-${Math.random()}`, prefer: craft }, "sac à dos"));
    expect(sent.model).toBe("claude-sonnet-5-5");
    const [res] = all<{ amount: number; provider: string }>("SELECT amount, provider FROM ai_reservations WHERE user_id = ?", u.id);
    expect(res.amount).toBe(ws.webSearchMaxMicro("anthropic", "claude-sonnet-5-5", 700));
  });

  it("Claude (Anthropic) : même réservation, recherches facturées, places de marché bloquées dès la recherche, liens vérifiés", async () => {
    setJsonSetting("ai.routes", { strategy: { provider: "anthropic", model: "claude-opus-5-5", effort: "high" } });
    setJsonSetting("ai.prices", { "anthropic:claude-opus-5-5": { unit: "tokens", inputPerM: 4, outputPerM: 20 }, "anthropic:web_search": { unit: "call", perCall: 0.01 } });
    let sent: any = null;
    ws.webSearchDeps.anthropicCount = async () => (calls.push("count"), 700);
    ws.webSearchDeps.anthropicSend = async (params: any) => {
      calls.push("send"); sent = params;
      return { model: "claude-opus-5-5", stop_reason: "end_turn", usage: { input_tokens: 25000, output_tokens: 1500, cache_read_input_tokens: 0, server_tool_use: { web_search_requests: 3 } },
        content: [
          { type: "server_tool_use", name: "web_search", input: { query: "sac" } },
          { type: "web_search_tool_result", content: [{ type: "web_search_result", url: "https://marque-a.fr/sac", title: "A" }, { type: "web_search_result", url: "https://forum.exemple.fr/avis", title: "Avis" }] },
          { type: "text", text: JSON.stringify({ sources: [
            { url: "https://marque-a.fr/sac", title: "A", category: "competitors", excerpt: excerpt("A") },
            { url: "https://forum.exemple.fr/avis", title: "Avis", category: "customers", excerpt: excerpt("C") },
            { url: "https://invente.exemple.fr", title: "X", category: "offer", excerpt: excerpt("X") },
          ] }), citations: [] },
        ] };
    };
    const u = await client();
    const r = await search(u.id);
    expect(calls).toEqual(["count", "send"]);
    expect(sent.tools[0]).toMatchObject({ type: "web_search_20260209", name: "web_search", max_uses: ws.MAX_SEARCHES });
    expect(sent.tools[0].blocked_domains).toContain("aliexpress.com");
    expect(r.searches).toBe(3);
    expect(r.findings.map((f) => f.url)).toEqual(["https://marque-a.fr/sac", "https://forum.exemple.fr/avis"]);
    const [res] = all<{ status: string; amount: number; actual: number; provider: string }>("SELECT status, amount, actual, provider FROM ai_reservations WHERE user_id = ?", u.id);
    expect(res).toMatchObject({ status: "settled", provider: "anthropic" });
    expect(res.amount).toBe(ws.webSearchMaxMicro("anthropic", "claude-opus-5-5", 700));
    const { usdToEur } = await import("@/lib/ai/config");
    expect(res.actual).toBe(Math.round(((25000 * 4 + 1500 * 20) / 1e6 + 3 * 0.01) * usdToEur() * 1e6));
  });

  it("recherche native : page lisible lue par le Studio, sinon extrait rapporté marqué ; lien du client sur une place de marché écarté", async () => {
    const p: any = { id: "p", business: "products" };
    const brief: any = { input: { offerUrl: "https://fr.aliexpress.com/item/9.html", referenceUrls: [], target: "étudiants" }, profile: { name: "Sac", category: "bagagerie", summary: "" }, services: { area: "" } };
    const findings = [
      { url: "https://marque-a.fr/sac", title: "A", category: "competitors" as const, excerpt: excerpt("A") },
      { url: "https://forum.exemple.fr/avis", title: "Avis", category: "customers" as const, excerpt: excerpt("C") },
    ];
    const read = async (url: string) => {
      if (url.includes("marque-a")) return { url, title: "Page A", text: "Texte réellement lu sur la page de la marque A, avec ses caractéristiques." } as any;
      throw new Error("bloqué");
    };
    const r = await researchProject(p, brief, read as any, undefined, async () => findings);
    const by = (u: string) => r.sources.find((s) => s.url.includes(u))!;
    expect(by("aliexpress")).toMatchObject({ status: "unavailable", error: expect.stringMatching(/Place de marché/) });
    expect(by("marque-a")).toMatchObject({ status: "consulted", via: "page", title: "Page A" });
    expect(by("forum")).toMatchObject({ status: "consulted", via: "openai_web_search", excerpt: excerpt("C") });
    expect(r.coverage!.limits.join(" ")).toMatch(/recherche web OpenAI/);
  });
});
