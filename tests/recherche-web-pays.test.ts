/**
 * Le pays du client donné à l'outil de recherche web (27 novembre 2026) — aucun appel réel ni payant :
 *  - la demande envoyée à l'outil porte `user_location: { type: "approximate", country }`, chez OpenAI comme chez Claude ;
 *  - rien d'autre ne change : sans pays, la demande est celle d'avant, octet pour octet ; avec, seul ce champ s'ajoute ;
 *  - le pays vient de la fiche (où il vend ou travaille, puis ses coordonnées), la France par défaut.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-websearch-pays-"));
});

vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (p === "openai" || p === "anthropic" ? "cle-de-test-1234567890abcdef" : null) }));

describe("recherche web : le pays du client", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { createUser } = await import("@/lib/auth");
  const { run } = await import("@/lib/db");
  const billing = await import("@/lib/billing");
  const { setSetting, setJsonSetting } = await import("@/lib/settings");
  const { runForUser } = await import("@/lib/ai/access");
  const ws = await import("@/lib/ai/web-search");
  const { paysDuProjet, paysNomme } = await import("@/lib/syna-agent/pays-du-projet");

  const original = { ...ws.webSearchDeps };
  const excerpt = "Phrase exacte de la page, assez longue pour être une observation utile au positionnement de la marque.";
  let envoyes: any[] = [], comptes: any[] = [];

  beforeEach(() => {
    envoyes = []; comptes = [];
    setSetting("ai.prices.checkedAt", String(Date.now()));
    ws.webSearchDeps.count = async (b: any) => (comptes.push(b), 600);
    ws.webSearchDeps.send = async (b: any) => (envoyes.push(b), { status: "completed", model: "gpt-5.6-terra", usage: { input_tokens: 3000, output_tokens: 200, input_tokens_details: { cached_tokens: 0 } }, output: [
      { type: "web_search_call", status: "completed", action: { type: "search", query: "q", sources: [{ type: "url", url: "https://marque-a.fr/sac" }] } },
      { type: "message", content: [{ type: "output_text", annotations: [], text: JSON.stringify({ sources: [{ url: "https://marque-a.fr/sac", title: "A", category: "customers", excerpt }] }) }] },
    ] });
    ws.webSearchDeps.anthropicCount = async (b: any) => (comptes.push(b), 700);
    ws.webSearchDeps.anthropicSend = async (b: any) => (envoyes.push(b), { model: b.model, stop_reason: "end_turn", usage: { input_tokens: 9000, output_tokens: 500, server_tool_use: { web_search_requests: 1 } }, content: [
      { type: "web_search_tool_result", content: [{ type: "web_search_result", url: "https://marque-a.fr/sac", title: "A" }] },
      { type: "text", text: JSON.stringify({ sources: [{ url: "https://marque-a.fr/sac", title: "A", category: "customers", excerpt }] }), citations: [] },
    ] });
  });
  afterEach(() => {
    Object.assign(ws.webSearchDeps, original);
    setJsonSetting("ai.routes", {});
    setJsonSetting("ai.prices", {});
    setJsonSetting("ai.textModels", {});
  });

  async function client() {
    const u = await createUser(`pays${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "P");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    billing.getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
    billing.alignPeriod(u.id, Date.now());
    billing.syncAllowance(u.id);
    return u;
  }
  const chercher = (uid: string, pays?: string) => runForUser(uid, () => ws.webResearch({ userId: uid, projectId: null, usageKey: `k-${Math.random()}`, maxSearches: 3, consigne: ws.consigneUneFamille("customers"), ...(pays ? { pays } : {}) }, "Fiche du client : savon artisanal"));

  for (const fournisseur of ["openai", "anthropic"] as const) {
    it(`${fournisseur} : la demande porte le pays, et rien d'autre ne change`, async () => {
      if (fournisseur === "openai") {
        setJsonSetting("ai.prices", { "openai:gpt-5.6-terra": { unit: "tokens", inputPerM: 2, outputPerM: 12 }, "openai:web_search": { unit: "call", perCall: 0.01 } });
        setJsonSetting("ai.textModels", { "openai:gpt-5.6-terra": { confirmedAt: Date.now() } });
        setJsonSetting("ai.routes", { strategy: { provider: "openai", model: "gpt-5.6-terra", effort: "medium" } });
      } else {
        setJsonSetting("ai.prices", { "anthropic:claude-opus-5-5": { unit: "tokens", inputPerM: 4, outputPerM: 20 }, "anthropic:web_search": { unit: "call", perCall: 0.01 } });
        setJsonSetting("ai.routes", { strategy: { provider: "anthropic", model: "claude-opus-5-5", effort: "high" } });
      }
      const u = await client();
      await chercher(u.id);
      await chercher(u.id, "BE");
      expect(envoyes).toHaveLength(2);
      const [sans, avec] = envoyes;
      expect(sans.tools[0]).not.toHaveProperty("user_location");
      expect(avec.tools[0].user_location).toEqual({ type: "approximate", country: "BE" });
      // Le comptage des jetons voit la même demande que l'envoi.
      expect(comptes[1].tools[0].user_location).toEqual({ type: "approximate", country: "BE" });
      // Tout le reste à l'identique : requête, consigne, nombre de recherches, domaines bloqués.
      const { user_location: _, ...outil } = avec.tools[0];
      expect({ ...avec, tools: [outil] }).toEqual(sans);
      if (fournisseur === "anthropic") expect(outil.blocked_domains).toEqual(sans.tools[0].blocked_domains);
      expect(fournisseur === "openai" ? avec.max_tool_calls : outil.max_uses).toBe(3);
    });
  }

  it("un code illisible n'ajoute rien", () => {
    expect(ws.lieuDeRecherche("fr")).toEqual({ user_location: { type: "approximate", country: "FR" } });
    expect(ws.lieuDeRecherche("")).toEqual({});
    expect(ws.lieuDeRecherche("France")).toEqual({});
    expect(ws.lieuDeRecherche(undefined)).toEqual({});
  });

  it("le pays vient de la fiche, la France par défaut", () => {
    const fiche = (start: Record<string, { status: string; value: string }>) => ({ start } as any);
    expect(paysDuProjet(fiche({}))).toBe("FR");
    expect(paysDuProjet(fiche({ market: { status: "answered", value: "En ligne, je livre partout" } }))).toBe("FR");
    expect(paysDuProjet(fiche({ market: { status: "answered", value: "Je vends en Belgique, sur les marchés de Liège" } }))).toBe("BE");
    expect(paysDuProjet(fiche({ market: { status: "answered", value: "Au Québec seulement" } }))).toBe("CA");
    expect(paysDuProjet(fiche({ market: { status: "answered", value: "En ligne" }, contact: { status: "answered", value: "12 rue du Lac, 1003 Lausanne, Suisse" } }))).toBe("CH");
    // Prudent : la France nommée, ou plusieurs autres pays, gardent la France.
    expect(paysDuProjet(fiche({ market: { status: "answered", value: "En France et en Belgique" } }))).toBe("FR");
    expect(paysNomme("Belgique, Suisse et Luxembourg")).toBe("FR");
    expect(paysNomme("Île-de-France")).toBe("FR");
    // Une réponse remise à plus tard ne compte pas.
    expect(paysDuProjet(fiche({ market: { status: "later", value: "Belgique" } }))).toBe("FR");
  });

  it("l'étude de la marque et l'écoute des angles passent le pays de la fiche à l'outil", () => {
    const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), "src/lib/syna-agent", f), "utf8");
    for (const f of ["brand-chain.ts", "angles-chain.ts"]) {
      const s = lire(f);
      expect(s).toMatch(/realAi\(ctx, \{ userId: p\.userId, projectId: p\.id, pays: paysDuProjet\(j\) \}/);
      expect(s).toMatch(/webResearch\(\{[^\n]*\.\.\.\(who\.pays \? \{ pays: who\.pays \} : \{\}\)/);
    }
  });
});
