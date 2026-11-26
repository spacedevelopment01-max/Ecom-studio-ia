/**
 * Une équipe de noms coupée ne fait plus tomber la marque (essai réel de Nadia, 23 novembre 2026 : l'équipe « langue »
 * du second tour a réfléchi puis écrit jusqu'à sa limite de 16 000 jetons, réponse coupée et illisible, toute la
 * création est tombée après 1,58 € dépensés). Ce qui est vérifié ici, sans aucun appel payant (fournisseurs simulés) :
 *  - une réponse coupée ou mal fermée lève une erreur reconnaissable, jamais l'erreur brute du lecteur JSON ;
 *  - pour chaque appel de la chaîne de la marque, la limite de sortie couvre la réflexion prévue plus la réponse attendue ;
 *  - une équipe coupée est reprise une fois, plus courte et à la charge du Studio, puis la création continue sans elle ;
 *  - le devis de la recherche sur le web : borne aux limites réellement envoyées, prix probable mesuré.
 */
import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (["anthropic", "openai", "google"].includes(p) ? "cle-de-test-1234567890abcdef" : null) }));

const { createUser } = await import("@/lib/auth");
const { run } = await import("@/lib/db");
const billing = await import("@/lib/billing");
const { setSetting, setJsonSetting } = await import("@/lib/settings");
const { runForUser } = await import("@/lib/ai/access");

async function client() {
  const u = await createUser(`coupee${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "C");
  run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
  billing.getSubscription(u.id);
  run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
  billing.alignPeriod(u.id, Date.now());
  billing.syncAllowance(u.id);
  return u;
}

describe("une réponse coupée ou illisible se reconnaît (fournisseur simulé)", async () => {
  const { llmJson, textDeps, ReponseInexploitable, reponseInexploitable } = await import("@/lib/ai/llm");
  let reply: { text: string; stop: string } = { text: "{}", stop: "end_turn" };
  const sends: number[] = [];
  const fake = { count: async () => 2000, send: async (r: { maxOutput: number }) => (sends.push(r.maxOutput), { ...reply, model: "gpt-5.6-terra", usage: { input: 1000, cachedInput: 0, output: 900 } }) };
  const original = { ...textDeps.adapters };
  beforeEach(() => {
    sends.length = 0;
    textDeps.adapters = { openai: fake, google: fake } as any;
    setSetting("ai.prices.checkedAt", String(Date.now()));
    setJsonSetting("ai.prices", { "openai:gpt-5.6-terra": { unit: "tokens", inputPerM: 2, outputPerM: 12 } });
    setJsonSetting("ai.textModels", { "openai:gpt-5.6-terra": { confirmedAt: Date.now() } });
  });
  afterEach(() => { textDeps.adapters = original as any; setJsonSetting("ai.prices", {}); setJsonSetting("ai.textModels", {}); });
  const Noms = z.object({ names: z.array(z.object({ name: z.string(), detail: z.string() })) });
  const ask = (uid: string, extra: Record<string, unknown> = {}) => runForUser(uid, () => llmJson({ task: "strategy", userId: uid, system: "Trouve des noms.", prompt: "Des noms.", maxTokens: 8000, usageKey: `k-${Math.random()}`, routing: { difficulty: "standard", prefer: { provider: "openai", model: "gpt-5.6-terra", effort: "medium" } }, ...extra } as any, Noms));
  const coupe = '{"names": [{"name": "Grand Bain", "detail": "le bassin des gr';

  it("coupée (sansRelanceCoupee) : ReponseInexploitable, coupée, sans nouvel appel", async () => {
    const u = await client();
    reply = { text: coupe, stop: "max_tokens" };
    const e = await ask(u.id, { sansRelanceCoupee: true, maxOutputTokens: 8000 }).catch((x) => x);
    expect(e).toBeInstanceOf(ReponseInexploitable);
    expect(e.coupee).toBe(true);
    expect(reponseInexploitable(e)).toBe(true);
    expect(sends).toHaveLength(1);
  });

  it("coupée à la limite la plus haute : plus jamais « Unterminated string in JSON », une erreur reconnaissable", async () => {
    const u = await client();
    reply = { text: coupe, stop: "max_tokens" };
    const e = await ask(u.id, { maxOutputTokens: 8000 }).catch((x) => x);
    expect(e).toBeInstanceOf(ReponseInexploitable);
    expect(String(e.message)).not.toMatch(/Unterminated/);
  });

  it("mal fermée sans être coupée : ReponseInexploitable, non coupée", async () => {
    const u = await client();
    reply = { text: coupe, stop: "end_turn" };
    const e = await ask(u.id, { maxOutputTokens: 8000 }).catch((x) => x);
    expect(e).toBeInstanceOf(ReponseInexploitable);
    expect(reponseInexploitable(e)).toBe(true);
  });

  it("une panne d'un autre genre n'est pas une réponse inexploitable (elle n'est jamais prise pour une équipe coupée)", () => {
    expect(reponseInexploitable(new Error("plafond atteint"))).toBe(false);
    expect(reponseInexploitable(new SyntaxError("Unterminated string in JSON at position 7007"))).toBe(true);
  });
});

describe("chaque appel de la chaîne de la marque tient dans sa limite de sortie", async () => {
  const C = await import("@/lib/syna-agent/brand-chain");
  const P = await import("@/lib/syna-agent/brand-prompts");
  const { TEXT_MODELS } = await import("@/lib/ai/text-models");
  /** Jetons d'un nom rendu par une équipe : nom (40 signes), détail et deuxième lecture (TEAM_TEXT_MAX chacun), idée, JSON. */
  const parNom = Math.ceil(40 / 3.5) + 2 * Math.ceil(P.TEAM_TEXT_MAX / 3.5) + 23;

  it("limite ≥ réflexion prévue + réponse attendue, avec au moins 10 % de marge, et dans les limites du modèle", () => {
    const s = C.chainSettings();
    for (const [id, c] of Object.entries(C.BRAND_CALLS)) {
      expect(c.max, `${id} : réflexion ${c.reflexion} + réponse ${c.reponse} > limite ${c.max}`).toBeGreaterThanOrEqual(Math.ceil((c.reflexion + c.reponse) * 1.1));
      expect(c.max, `${id} : la limite couvre au moins la sortie habituelle`).toBeGreaterThanOrEqual(c.output);
      const model = s[c.tier].model, limite = (TEXT_MODELS as any[]).find((m) => m.model === model)?.limits.maxOutput ?? 64_000;
      expect(c.max + 6000, `${id} : au-delà de la limite du modèle ${model}`).toBeLessThanOrEqual(limite);
    }
  });

  it("équipes de noms : le nombre de noms demandé tient dans la réponse prévue, à chaque tour et à la reprise", () => {
    expect(C.BRAND_CALLS.team.reponse).toBeGreaterThanOrEqual(P.TEAM_ASK.premier.max * parNom);
    expect(C.BRAND_CALLS.team.reponse).toBeGreaterThanOrEqual(P.TEAM_ASK.second.max * parNom);
    expect(C.BRAND_CALLS.teamShort.reponse).toBeGreaterThanOrEqual(P.TEAM_ASK.reprise.max * parNom);
    // La réflexion mesurée chez Nadia (environ 14 000 jetons) plus 40 noms tiennent dans la limite, ce qui n'était pas le cas à 16 000.
    expect(C.BRAND_CALLS.team.reflexion).toBeGreaterThanOrEqual(14_000);
    expect(C.BRAND_CALLS.team.max).toBeGreaterThan(16_000);
    expect(P.teamSystem("produits", undefined, P.TEAM_ASK.premier)).toMatch(/Entre 30 et 40 noms, jamais plus/);
    expect(P.teamSystem("produits", undefined, P.TEAM_ASK.premier)).not.toMatch(/Entre 40 et 70/);
    expect(P.teamSystem("produits", undefined, P.TEAM_ASK.reprise)).toMatch(/Entre 15 et 20 noms[\s\S]*Réflexion brève/);
    expect(C.BRAND_CALLS.teamShort.effort).toBe("low");
  });

  it("la limite envoyée est celle du tableau ; une équipe coupée n'est pas redemandée telle quelle avec plus de place", () => {
    const src = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    expect(src).toContain("maxTokens: CALLS[c.kind].max,");
    expect(src).toContain("...(EQUIPES.has(c.kind) ? { maxOutputTokens: CALLS[c.kind].max, sansRelanceCoupee: true } : { maxOutputTokens: CALLS[c.kind].max + 6000 }),");
    expect(src).toContain("maxTokens: CALLS.look.max,");
  });
});

describe("la reprise d'une équipe coupée (equipeDeNoms)", async () => {
  const C = await import("@/lib/syna-agent/brand-chain");
  const P = await import("@/lib/syna-agent/brand-prompts");
  const { ReponseInexploitable } = await import("@/lib/ai/llm");
  const { CostCapReached } = await import("@/lib/ai/trace");
  const path = P.teamPathsFor("produits", 4)[0];
  const scene = (coupe: (id: string) => boolean | "plafond") => {
    const log: { id: string; kind: string; system: string; studio: boolean }[] = [], steps: string[] = [];
    const ctx = { step: async <T,>(k: string, fn: () => Promise<T>) => { const v = await fn(); steps.push(k); return v; } };
    const ai = { ask: async (id: string, c: any) => {
      log.push({ id, kind: c.kind, system: c.system, studio: billing.chargeDuStudio() });
      const x = coupe(id);
      if (x === "plafond") throw new CostCapReached(1, 1, 1);
      if (x) throw new ReponseInexploitable("coupée", true);
      return c.schema.parse({ names: ["Un", "Deux", "Trois", "Quatre", "Cinq"].map((name) => ({ name })) });
    } };
    return { log, steps, run: (notes: string[]) => C.equipeDeNoms({ ctx: ctx as any, ai: ai as any, kind: "produits", path, step: "brand:team:langue:1:2", id: "team-langue-2", prompt: "x", ask: P.TEAM_ASK.second, notes }) };
  };

  it("coupée une fois : une seule reprise, plus courte, à la charge du Studio", async () => {
    const s = scene((id) => id === "team-langue-2"), notes: string[] = [];
    expect((await s.run(notes))?.length).toBe(5);
    expect(s.log.map((l) => `${l.id}/${l.kind}/${l.studio}`)).toEqual(["team-langue-2/team/false", "team-langue-2-court/teamShort/true"]);
    expect(s.steps).toEqual(["brand:team:langue:1:2:court"]);
    expect(notes).toEqual([]);
  });

  it("coupée deux fois : on continue sans elle, et c'est noté ; jamais une troisième demande", async () => {
    const s = scene(() => true), notes: string[] = [];
    expect(await s.run(notes)).toBeNull();
    expect(s.log).toHaveLength(2);
    expect(notes[0]).toMatch(/sans réponse lisible, même plus courte : la création continue avec les noms des autres équipes/);
  });

  it("le plafond atteint n'est pas une réponse coupée : il remonte, sans reprise", async () => {
    const s = scene(() => "plafond");
    await expect(s.run([])).rejects.toBeInstanceOf(CostCapReached);
    expect(s.log).toHaveLength(1);
  });
});

describe("le devis de la recherche sur le web (une seule fonction pour tous les devis)", async () => {
  const ws = await import("@/lib/ai/web-search");
  const C = await import("@/lib/syna-agent/brand-chain");
  const A = await import("@/lib/syna-agent/angles-chain");
  const { all } = await import("@/lib/db");
  const prefer = { provider: "anthropic", model: "claude-sonnet-5-5" };
  beforeEach(() => {
    setSetting("ai.prices.checkedAt", String(Date.now()));
    setJsonSetting("ai.prices", { "anthropic:web_search": { unit: "call", perCall: 0.01 } });
    run("DELETE FROM ai_calls WHERE prompt_key = 'preparation.research.web'");
  });
  afterEach(() => { setJsonSetting("ai.prices", {}); run("DELETE FROM ai_calls WHERE prompt_key = 'preparation.research.web'"); });

  it("le prix probable vient de la mesure écrite (Nadia, 0,12 €), plus de la moitié de la borne", () => {
    const q = ws.webSearchQuote(prefer);
    expect(q.maxMicro).toBeGreaterThan(1_000_000);
    expect(q.probableMicro).toBe(ws.WEB_SEARCH_MESURE.micro);
    expect(q.probableMicro).toBeLessThan(q.maxMicro / 5);
    expect(ws.WEB_SEARCH_MESURE.source).toMatch(/Nadia, 23 novembre 2026/);
  });

  it("assez de recherches réelles dans le journal des appels : leur médiane devient le prix probable", () => {
    const now = Date.now();
    [90_000, 110_000, 130_000, 150_000, 400_000].forEach((cost, i) => run("INSERT INTO ai_calls (id, created_at, user_id, task, provider, requested_model, unit, cost, status, prompt_key) VALUES (?,?,?,?,?,?,?,?,?,?)", `ws-${now}-${i}`, now + i, "u", "strategy", "anthropic", "claude-sonnet-5-5", "tokens", cost, "ok", "preparation.research.web"));
    expect(ws.webSearchProbableMicro(prefer)).toBe(130_000);
    // Une recherche en erreur ou au coût estimé ne compte pas.
    expect(all("SELECT 1 FROM ai_calls WHERE prompt_key = 'preparation.research.web'")).toHaveLength(5);
  });

  it("la borne suit le nombre de recherches réellement permis : 5 pour la marque (une famille de pages chacune), moins que 8", () => {
    const huit = ws.webSearchQuoteMicro(prefer)!, cinq = ws.webSearchQuoteMicro(prefer, { maxSearches: C.BRAND_SEARCHES })!;
    expect(C.BRAND_SEARCHES).toBe(5);
    expect(cinq).toBeLessThan(huit);
    expect(cinq).toBe(ws.webSearchMaxMicro("anthropic", "claude-sonnet-5-5", 4000, 5));
  });

  it("marque et angles : le probable n'est plus la moitié de la borne, partout", () => {
    const s = C.chainSettings(), web = ws.webSearchQuote(s.craft, { maxSearches: C.BRAND_SEARCHES });
    const sans = C.chainQuote({ routes: 3, images: false, settings: s });
    setJsonSetting("ai.prices", {});
    const zero = C.chainQuote({ routes: 3, images: false, settings: s });
    // Quatre recherches au probable (trois pour l'étude, une pour vérifier les noms), chacune à son prix mesuré ; au plafond,
    // une cinquième : la recherche des noms refaite autrement quand la première ne rend aucune page (26 novembre 2026).
    expect(sans.probableMicro! - zero.probableMicro!).toBeLessThanOrEqual(4 * web.probableMicro + 4);
    expect(sans.maxMicro - zero.maxMicro).toBeLessThanOrEqual(5 * web.maxMicro + 5);
    expect(fs.readFileSync("src/lib/syna-agent/angles-chain.ts", "utf8")).toContain("const search = webSearchQuote(s.craft);");
    expect(fs.readFileSync("src/lib/syna-agent/angles-chain.ts", "utf8")).not.toMatch(/search \/ 2/);
    expect(A.anglesQuote({ listen: true }).probableMicro).toBeGreaterThan(0);
  });

  it("la vraie recherche : 5 recherches au plus envoyées ; après un arrêt en route, seulement celles qui restent", async () => {
    const u = await client();
    const bodies: any[] = [];
    const msg = (stop: string, searches: number) => ({
      model: "claude-sonnet-5-5", stop_reason: stop,
      content: [{ type: "web_search_tool_result", content: [{ url: "https://avis.exemple.fr/page" }] }, { type: "text", text: stop === "end_turn" ? JSON.stringify({ sources: [{ url: "https://avis.exemple.fr/page", title: "Avis", category: "customers", excerpt: "« Une phrase exacte d'un client, assez longue pour être gardée par le Studio. »" }] }) : "" }],
      usage: { input_tokens: 5000, output_tokens: 800, server_tool_use: { web_search_requests: searches } },
    });
    const original = { ...ws.webSearchDeps };
    let tours: [string, number][] = [];
    ws.webSearchDeps.anthropicCount = async () => 800;
    ws.webSearchDeps.anthropicSend = async (body: any) => { bodies.push(body); const [stop, n] = tours.shift()!; return msg(stop, n); };
    try {
      tours = [["pause_turn", 3], ["end_turn", 2]];
      const r = await runForUser(u.id, () => ws.webResearch({ userId: u.id, projectId: null, usageKey: `w-${Math.random()}`, prefer, maxSearches: 5 }, "infusions"));
      expect(bodies.map((b) => b.tools[0].max_uses)).toEqual([5, 2]);
      expect(r.searches).toBe(5);
      // Toutes les recherches faites dès le premier tour : pas de reprise, la recherche s'arrête là.
      bodies.length = 0; tours = [["pause_turn", 5]];
      await runForUser(u.id, () => ws.webResearch({ userId: u.id, projectId: null, usageKey: `w-${Math.random()}`, prefer, maxSearches: 5 }, "infusions"));
      expect(bodies).toHaveLength(1);
    } finally { Object.assign(ws.webSearchDeps, original); }
  });
});
