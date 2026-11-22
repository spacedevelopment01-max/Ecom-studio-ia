/**
 * La mise en mémoire chez le fournisseur (économies du 22 novembre 2026, sans baisser la qualité) : ce qui ne change pas
 * passe en tête avec un point de mémoire, le fil de SINA est repris d'un pas à l'autre, la fenêtre du fil ne glisse plus
 * à chaque message, la lecture en mémoire est comptée au vrai prix, et la part vraiment reprise se lit dans
 * l'administration. Aucun appel d'IA.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("mise en mémoire chez le fournisseur", async () => {
  const { headBlocks, cacheReadRatio, CACHE_WRITE_RATIO } = await import("@/lib/ai/llm");
  const { filEnBlocs, FIL_TITRE, submitMessage, runAgent } = await import("@/lib/syna-agent/loop");
  const { addMessage, filDeConversation, getRun } = await import("@/lib/syna-agent/store");
  const { memoireReprise, gagneSurAppel, travailDe } = await import("@/lib/ai/memoire");
  const { run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const points = (b: { cache_control?: unknown }[]) => b.filter((x) => x.cache_control).length;

  it("SINA : les notices des outils en tête avec un point, puis le fil (point sur le dernier message), puis le contexte qui change, sans point", () => {
    const b = headBlocks({ task: "agent_conversation", reference: "NOTICES", history: ["# Fil\n[client #1] Bonjour", "[SINA #2] Salut"], context: "ÉTAT" });
    expect(b.map((x) => x.text)).toEqual(["NOTICES", "# Fil\n[client #1] Bonjour", "[SINA #2] Salut", "ÉTAT"]);
    expect(b.map((x) => !!x.cache_control)).toEqual([true, false, true, false]);
    // Avec la consigne générale (toujours en mémoire), trois points : sous la limite de quatre du fournisseur.
    expect(points(b) + 1).toBeLessThanOrEqual(4);
  });

  it("une tâche ordinaire : la référence (cahiers, la même pour tous les clients) passe devant le contexte du projet, chacun avec son point", () => {
    const b = headBlocks({ task: "strategy" as never, reference: "CAHIER", context: "PROJET" });
    expect(b.map((x) => x.text)).toEqual(["CAHIER", "PROJET"]);
    expect(points(b)).toBe(2);
  });

  it("d'un pas à l'autre d'une demande, les blocs du fil déjà envoyés restent identiques au caractère près (ils sont repris)", () => {
    const m = (seq: number, role: string, content: unknown) => ({ id: String(seq), seq, role, runId: null, content, createdAt: 0 }) as never;
    const pas1 = [m(1, "user", { text: "Je vends des bijoux." }), m(2, "assistant", { message: "Super.", actions: [{ tool: "start.answer", args: { a: 1 } }] }), m(3, "tool", { tool: "start.answer", ok: true, summary: "Noté.", data: { x: "y".repeat(500) } })];
    const pas2 = [...pas1, m(4, "assistant", { message: "Et ensuite ?", actions: [] }), m(5, "tool", { tool: "start.state", ok: true, summary: "Lu." })];
    const a = filEnBlocs(pas1), b = filEnBlocs(pas2);
    expect(a[0].startsWith(FIL_TITRE)).toBe(true);
    expect(b.slice(0, a.length)).toEqual(a);
    expect(b).toHaveLength(5);
    // Le résultat d'outil de la demande en cours reste lu en entier (rien n'est retiré à SINA).
    expect(a[2]).toContain("y".repeat(500));
  });

  it("la fenêtre du fil ne glisse plus à chaque message : son début ne bouge que tous les 40 messages, jamais moins de 120 messages", async () => {
    const user = await account();
    const cid = threadFor(user, null);
    for (let i = 0; i < 130; i++) addMessage(cid, i % 2 ? "assistant" : "user", i % 2 ? { message: `r${i}`, actions: [] } : { text: `m${i}` }, null);
    const f1 = filDeConversation(cid);
    expect(f1.length).toBeGreaterThanOrEqual(120);
    addMessage(cid, "user", { text: "encore" }, null);
    const f2 = filDeConversation(cid);
    expect(f2[0].seq).toBe(f1[0].seq);
    expect(f2.length).toBe(f1.length + 1);
    for (let i = 0; i < 45; i++) addMessage(cid, "user", { text: `plus ${i}` }, null);
    const f3 = filDeConversation(cid);
    expect(f3[0].seq).toBeGreaterThan(f1[0].seq);
    expect(f3.length).toBeGreaterThanOrEqual(120);
  });

  it("dans la vraie boucle : le fil arrive en blocs, la demande ne porte plus que la consigne du pas, et le pas 2 reprend tous les blocs du pas 1", async () => {
    const user = await account();
    const cid = threadFor(user, null);
    const r = submitMessage(user, cid, { requestId: `mem-${Math.random()}`, text: "Je fais des bougies parfumées." });
    const calls: { history: string[]; prompt: string }[] = [];
    await fr(() => runAgent(r.id, r.job_id!, { reason: async (c) => {
      calls.push({ history: c.history ?? [], prompt: c.prompt });
      return calls.length === 1
        ? { message: "", actions: [{ tool: "start.state", args: {} }], done: false }
        : { message: "Des bougies, j'adore. Pour qui les fais-tu ?", actions: [], done: true };
    } }));
    expect(calls).toHaveLength(2);
    expect(calls[0].history[0]).toContain(FIL_TITRE);
    expect(calls[0].history.join("\n")).toContain("Je fais des bougies parfumées.");
    expect(calls[0].prompt).toMatch(/^Étape 1 de cette demande\. Réponds avec l'objet JSON/);
    expect(calls[1].history.slice(0, calls[0].history.length)).toEqual(calls[0].history);
    expect(calls[1].history.length).toBeGreaterThan(calls[0].history.length);
    expect(getRun(r.id)!.status).not.toBe("failed");
  });

  it("la lecture en mémoire est comptée au vrai prix du fournisseur : 0,05 pour Opus 5.5 et Sonnet 5.5 (avant : 0,1 partout, le double)", () => {
    expect(cacheReadRatio("claude-opus-5-5")).toBe(0.05);
    expect(cacheReadRatio("claude-sonnet-5-5")).toBe(0.05);
    expect(cacheReadRatio("claude-fable-5-2")).toBe(0.025);
    expect(cacheReadRatio("claude-haiku-4-5")).toBe(0.1);
    // Servi et demandé différents : le plus cher des deux (jamais sous-compté).
    expect(cacheReadRatio("claude-opus-5-5", "claude-haiku-4-5")).toBe(0.1);
    expect(CACHE_WRITE_RATIO).toBe(1.25);
  });

  it("l'administration lit la part vraiment reprise par travail et ce que la mémoire a fait gagner, d'après les reçus", async () => {
    const user = await account();
    const now = Date.now();
    const ins = (id: string, key: string, inp: number, cr: number, cw: number) => run(
      "INSERT INTO ai_calls(id,created_at,user_id,task,provider,requested_model,served_model,unit,input_tokens,cache_read_tokens,cache_write_tokens,output_tokens,cost,status,prompt_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id, now, user.id, "agent_conversation", "anthropic", "claude-opus-5-5", "claude-opus-5-5", "tokens", inp, cr, cw, 100, 1, "ok", key);
    ins(`mem-a-${now}`, "syna-agent-2", 2000, 0, 8000);
    ins(`mem-b-${now}`, "syna-agent-2", 2000, 8000, 0);
    const m = memoireReprise(now - 1000);
    const conv = m.lignes.find((l) => l.travail === travailDe("agent_conversation", "syna-agent-2"))!;
    expect(conv.travail).toBe("La conversation de SINA");
    expect(conv.appels).toBe(2);
    expect(conv.partReprise).toBe(0.4); // 8 000 repris sur 20 000 jetons d'entrée
    expect(conv.partEcrite).toBe(0.4);
    // Gagné : 8 000 lus à 0,05 au lieu de 1 (0,95 × 8 000), moins 8 000 écrits à 1,25 (0,25 × 8 000), au prix d'entrée.
    const row = { task: "agent_conversation", prompt_key: "syna-agent-2", provider: "anthropic", requested_model: "claude-opus-5-5", served_model: "claude-opus-5-5", input_tokens: 0, cache_read_tokens: 8000, cache_write_tokens: 8000, routing_reason: null };
    expect(gagneSurAppel(row)).toBeGreaterThan(0);
    expect(gagneSurAppel({ ...row, cache_read_tokens: 0 })).toBeLessThan(0); // une écriture jamais reprise coûte
    expect(conv.gagneMicro).toBe(gagneSurAppel(row));
    expect(Math.abs(gagneSurAppel({ ...row, routing_reason: "x · différé (moitié prix)" }) - gagneSurAppel(row) / 2)).toBeLessThanOrEqual(1);
    // Le différé se voit aussi : les appels servis ainsi sont comptés par travail.
    expect(conv.differes).toBe(0);
    run("INSERT INTO ai_calls(id,created_at,user_id,task,provider,requested_model,served_model,unit,input_tokens,cache_read_tokens,cache_write_tokens,output_tokens,cost,status,prompt_key,routing_reason) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      `mem-c-${now}`, now, user.id, "strategy", "anthropic", "claude-opus-5-5", "claude-opus-5-5", "tokens", 100, 0, 0, 10, 1, "ok", "syna-angles-strat-1", "choisi · différé (moitié prix)");
    expect(memoireReprise(now - 1000).lignes.find((l) => l.travail === "Les trois angles")!.differes).toBe(1);
  });
});

describe("à chaque étape, seulement les notices des outils de l'étape", async () => {
  const C = await import("@/lib/syna-agent/conversation");
  const { allTools, toolVisible } = await import("@/lib/syna-agent/registry");
  const scope = { inJourney: true, legacyMockups: false, routed: true } as never;
  const moments = [{}, { services: true }, { site: true }, { site: true, choisi: true }];

  it("moins de 20 notices complètes à chaque étape et à chaque moment de l'étape (outils de toujours compris)", () => {
    for (let step = 0; step <= 13; step++) for (const m of moments) {
      const n = allTools().filter((t) => toolVisible(t.name, scope) && C.toolInFocus(t.name, step, m)).length;
      expect(n, `étape ${step} ${JSON.stringify(m)}`).toBeLessThan(20);
    }
  });

  it("rien n'est retiré à SINA : chaque outil visible est en notice complète ou nommé en une ligne (tools.open)", () => {
    for (const [step, m] of [[5, {}], [5, { services: true }], [6, {}], [6, { site: true }], [7, { site: true, choisi: true }]] as const) {
      const cat = C.routedCatalog(true, scope, step, m);
      for (const t of allTools().filter((x) => toolVisible(x.name, scope))) expect(cat.includes(`### ${t.name} — `) || cat.includes(`\n- ${t.name} — `), `${step} ${t.name}`).toBe(true);
    }
  });

  it("le bon moment de l'étape : produits ou services à l'étape 5, avant ou après la création du site à l'étape 6", () => {
    expect(C.momentDeLEtape({ start: { business: { value: "services" } } })).toEqual({ site: false, choisi: false, services: true });
    expect(C.momentDeLEtape({ site: { at: 1 }, customChosenAt: 2 })).toEqual({ site: true, choisi: true, services: false });
    expect(C.toolInFocus("bookings.configure", 5, { services: true })).toBe(true);
    expect(C.toolInFocus("bookings.configure", 5, {})).toBe(false);
    expect(C.toolInFocus("catalogue.create", 5, {})).toBe(true);
    expect(C.toolInFocus("site.create", 6, {})).toBe(true);
    expect(C.toolInFocus("custom.edit", 6, {})).toBe(false);
    expect(C.toolInFocus("custom.edit", 6, { site: true })).toBe(true);
    expect(C.toolInFocus("gallery.create", 6, { site: true })).toBe(true);
    // La photo qu'un client envoie se pose sur son produit, avant comme après la création du site.
    expect(C.toolInFocus("catalogue.photos", 6, {})).toBe(true);
    expect(C.toolInFocus("catalogue.photos", 6, { site: true })).toBe(true);
  });
});
