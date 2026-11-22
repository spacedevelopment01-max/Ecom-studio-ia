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

  it("fil très long : le début qui n'est plus relu est remplacé par un résumé à rubrique fixe, avec les mots du client", async () => {
    const { DEBUT_COUPE } = await import("@/lib/syna-agent/loop");
    const { messagesDuClientAvant } = await import("@/lib/syna-agent/store");
    const user = await account();
    const cid = threadFor(user, null);
    for (let i = 0; i < 170; i++) addMessage(cid, i % 2 ? "assistant" : "user", i % 2 ? { message: `r${i}`, actions: [] } : { text: `mot du client ${i}` }, null);
    const fil = filDeConversation(cid), avant = messagesDuClientAvant(cid, fil[0].seq);
    expect(avant.length).toBeGreaterThan(0);
    const blocs = filEnBlocs(fil, avant);
    expect(blocs[0].startsWith(DEBUT_COUPE)).toBe(true);
    expect(blocs[0]).toContain("mot du client 0");
    // Le résumé ne bouge pas d'un message à l'autre (il reste repris de mémoire).
    addMessage(cid, "user", { text: "encore" }, null);
    expect(filEnBlocs(filDeConversation(cid), messagesDuClientAvant(cid, filDeConversation(cid)[0].seq))[0]).toBe(blocs[0]);
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

describe("ses mots corrigés, contrôlés par le code", async () => {
  const { defautsDuMessage } = await import("@/lib/syna-agent/controle-message");
  const regle = (motsCorriges: { avoid: string; use: string }[]) => ({ etape: 3, payant: () => false, lance: false, motsCorriges });
  it("un message qui emploie un mot qu'il a corrigé ne part pas ; le bon mot, même s'il contient l'ancien, passe", () => {
    expect(defautsDuMessage({ message: "Ta boutique est prête.", actions: [] }, regle([{ avoid: "boutique", use: "atelier" }]))).toEqual(["Le client a corrigé ce mot une fois pour toutes : jamais « boutique », toujours « atelier ». Ton message l'emploie encore."]);
    expect(defautsDuMessage({ message: "Ton atelier est prêt.", actions: [] }, regle([{ avoid: "boutique", use: "atelier" }]))).toEqual([]);
    expect(defautsDuMessage({ message: "Ta boutique en ligne est prête.", actions: [] }, regle([{ avoid: "boutique", use: "boutique en ligne" }]))).toEqual([]);
    expect(defautsDuMessage({ message: "Tes boutiques.", actions: [] }, regle([{ avoid: "boutique", use: "atelier" }]))).toEqual([]);
  });
});

describe("mémoire d'une heure et fil qui ne fait que s'allonger (22 novembre 2026)", async () => {
  const L = await import("@/lib/ai/llm");
  const { filEnBlocs, debutEntier, ALLEGEMENT } = await import("@/lib/syna-agent/loop");
  it("une heure pour la conversation de SINA et les tâches en différé ; 5 minutes ailleurs ; l'écriture d'une heure comptée à 2 fois", () => {
    expect(L.pointDeMemoire({ memoireLongue: true })).toEqual({ type: "ephemeral", ttl: "1h" });
    expect(L.pointDeMemoire({})).toEqual({ type: "ephemeral" });
    const b = L.headBlocks({ task: "agent_conversation", reference: "N", history: ["F"], context: "E", memoireLongue: true });
    expect(b.filter((x) => x.cache_control).every((x) => x.cache_control!.ttl === "1h")).toBe(true);
    expect(L.CACHE_WRITE_1H_RATIO).toBe(2);
    const fs = require("node:fs") as typeof import("node:fs");
    expect(fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8")).toContain("    memoireLongue: true,\n    system: SYNA_SYSTEM");
    expect(fs.readFileSync("src/lib/ai/llm.ts", "utf8")).toContain("const avecMemoire = (call: LlmCall): LlmCall => (call.memoireLongue == null && (call.deferred ?? differeActif()) ? { ...call, memoireLongue: true } : call);");
  });
  it("un message déjà envoyé ne change plus quand le client écrit de nouveau ; l'allègement ne vient que tous les 40 messages", () => {
    const m = (seq: number, role: string, content: unknown) => ({ id: String(seq), seq, role, runId: null, content, createdAt: 0 }) as never;
    const demande1 = [m(1, "user", { text: "Bonjour" }), m(2, "tool", { tool: "start.state", ok: true, summary: "Lu.", data: { x: "y".repeat(2000) } }), m(3, "assistant", { message: "Salut", actions: [] })];
    const avant = filEnBlocs(demande1);
    const apres = filEnBlocs([...demande1, m(4, "user", { text: "Je vends des bijoux." })]);
    expect(apres.slice(0, avant.length)).toEqual(avant);
    expect(apres[1]).toContain("y".repeat(2000)); // pas raccourci au message suivant
    expect(debutEntier([{ seq: 39 }])).toBe(0);
    expect(debutEntier([{ seq: 125 }])).toBe(80);
    expect(ALLEGEMENT).toBe(40);
  });

  it("relecture des images : la planche des 50 logos passe en tête, gardée en mémoire, avant les images qui changent", async () => {
    const sharp = (await import("sharp")).default;
    const { buildContent } = await import("@/lib/ai/llm");
    const png = (c: string) => sharp({ create: { width: 64, height: 64, channels: 3, background: c } }).png().toBuffer();
    const planche = await png("#ffffff"), logo = await png("#112233");
    const content: any[] = await buildContent({ task: "quality_control", system: "S", prompt: "Voici 1 image(s).", images: [{ data: logo, label: "logo" }], imagesFixes: [{ data: planche, label: "logos aimés" }] } as any);
    const images = content.map((b, i) => [b, i] as const).filter(([b]) => b.type === "image");
    // La planche d'abord, avec son point de mémoire ; l'image jugée ensuite, sans.
    expect(images).toHaveLength(2);
    expect(images[0][0].cache_control).toEqual({ type: "ephemeral" });
    expect(images[1][0].cache_control).toBeUndefined();
    expect(content[images[0][1] - 1].text).toMatch(/jointe à part — logos aimés \(hors numérotation\)/);
    expect(content[images[1][1] - 1].text).toBe("Image 1 — logo :");
    // Mêmes octets d'un appel à l'autre : la mémoire est reprise pour tous les clients.
    const again: any[] = await buildContent({ task: "quality_control", system: "S", prompt: "autre", images: [{ data: planche, label: "hero" }], imagesFixes: [{ data: planche, label: "logos aimés" }] } as any);
    expect(again.find((b) => b.type === "image").source.data).toBe(images[0][0].source.data);
    // La relecture des images de la planche lui donne la planche des logos aimés à part, jamais parmi les images jugées.
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(src).toContain(`fixes: [{ data: aimes, label: "logos aimés" }]`);
    expect(src).not.toContain(`seen.push({ data: aimes`);
  });

  it("conversation de SINA : les images de ce qu'elle a créé passent entre les notices et le fil, gardées en mémoire ; les photos jointes restent après", async () => {
    const sharp = (await import("sharp")).default;
    const { buildContent } = await import("@/lib/ai/llm");
    const png = (c: string) => sharp({ create: { width: 64, height: 64, channels: 3, background: c } }).png().toBuffer();
    const content: any[] = await buildContent({ task: "agent_conversation", system: "S", memoireLongue: true, reference: "NOTICES ET CONSIGNE DE L'ÉTAPE", history: ["# Fil\n[client #1] Bonjour", "[SINA #2] Salut"], context: "ÉTAT", prompt: "Étape 1.", imagesEnMemoire: [{ data: await png("#123456"), label: "Logo A" }, { data: await png("#654321"), label: "Planche A" }], images: [{ data: await png("#abcdef"), label: "photo du client" }] } as any);
    const ou = (pred: (b: any) => boolean) => content.findIndex(pred);
    const notices = ou((b) => b.text === "NOTICES ET CONSIGNE DE L'ÉTAPE"), fil = ou((b) => b.text?.startsWith("# Fil")), etat = ou((b) => b.text === "ÉTAT");
    const images = content.map((b, i) => [b, i] as const).filter(([b]) => b.type === "image");
    expect(images).toHaveLength(3);
    // Les deux images du parcours : après les notices, avant le fil ; un seul point de mémoire, sur la dernière.
    expect(images[0][1]).toBeGreaterThan(notices);
    expect(images[1][1]).toBeLessThan(fil);
    expect(images[0][0].cache_control).toBeUndefined();
    expect(images[1][0].cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
    // La photo jointe par le client : après l'état, sans point de mémoire.
    expect(images[2][1]).toBeGreaterThan(etat);
    expect(images[2][0].cache_control).toBeUndefined();
    // Au plus quatre points de mémoire dans le message (la consigne générale en a un de son côté).
    expect(content.filter((b) => b.cache_control).length).toBeLessThanOrEqual(3);
  });
});

