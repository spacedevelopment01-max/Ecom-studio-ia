/**
 * TROIS RATÉS DES LOGOS DANS L'ESSAI RÉEL DE NADIA (23 novembre 2026, version 02570ae1), rejoués sans aucune dépense :
 *  1. À « Le logo de Halo ne me plaît pas trop, tu peux m'en faire un autre ? », SINA a demandé « Qu'est-ce qui te gêne
 *     dans le logo de Halo : les lettres, le bleu, l'ellipse orange au-dessus, ou l'ensemble ? ». Le contrôle gratuit
 *     des messages la fait réécrire, à la charge du Studio : elle en refait un, avec la carte d'accord.
 *  2. Pénombre (C) lancé avant Halo (B) : les logos d'une série partent dans l'ordre des identités.
 *  3. Sa consigne pour la carte B + C parlait du style du logo : elle est retirée par le Studio, sans IA.
 * Les réponses de SINA sont écrites par l'essai (SINA simulée) ; aucun appel à l'IA.
 */
import { describe, expect, it } from "vitest";
import { route } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

const PHRASE_DE_NADIA = "Le logo de Halo ne me plaît pas trop, tu peux m'en faire un autre ?";
const QUESTION_DE_SINA = "Qu'est-ce qui te gêne dans le logo de Halo : les lettres, le bleu, l'ellipse orange au-dessus, ou l'ensemble ?";

describe("1. jamais une question au client sur le contenu de son logo (contrôle gratuit)", async () => {
  const { questionSurLeLogo, defautsDuMessage } = await import("@/lib/syna-agent/controle-message");
  const m = (message: string, question?: { text: string; choices?: string[] }) => ({ message, question: question ?? null, actions: [] });
  const regle = { etape: 1, payant: () => true, lance: false };

  it("la question de SINA dans l'essai réel est réécrite, mot pour mot, en message comme en question à boutons", () => {
    expect(questionSurLeLogo(m(QUESTION_DE_SINA))).toBe(true);
    expect(questionSurLeLogo(m("D'accord, je comprends.", { text: QUESTION_DE_SINA }))).toBe(true);
    expect(questionSurLeLogo(m("Je regarde le logo de Halo avec toi.", { text: "Qu'est-ce qui te gêne ?", choices: ["Les lettres", "Le bleu", "L'ellipse orange", "L'ensemble"] }))).toBe(true);
    const d = defautsDuMessage(m(QUESTION_DE_SINA), regle);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatch(/On ne demande jamais au client ce qu'il veut ou non dans son logo/);
    expect(d[0]).toMatch(/dis simplement que tu en refais un et présente la carte d'accord/);
  });

  it("toutes les tournures d'une question sur le contenu du logo", () => {
    for (const q of [
      "Tu préfères quelle couleur pour le logo ?", "Tu voudrais des lettres plus fines dans ton logo ?", "Le logo de Halo : c'est le bleu qui te dérange ?",
      "Qu'est-ce qui ne te plaît pas dans ce logo ?", "Tu veux garder la forme du logo ?", "Quel style de logo tu imagines ?", "Tu aimerais un logo plus moderne ?",
      "Pour ton nouveau logo, qu'est-ce que tu veux dans le dessin ?", "Ce qui te gêne, c'est le symbole du logo ?", "Tu veux un fond blanc pour le logo ?",
      "What don't you like in the logo?", "Which colour would you like for the logo?",
    ]) expect(questionSurLeLogo(m(q)), q).toBe(true);
  });

  it("les questions permises passent : refaire oui ou non, choisir entre des planches, une question sans logo", () => {
    for (const [message, q] of [
      ["Je t'en refais un autre.", "Tu veux que je le refasse ?"],
      ["", "Tu veux que je refasse le logo de Halo ?"],
      ["Voici tes trois planches, chacune avec son logo.", "Tu préfères Sillage, Halo ou Pénombre ?"],
      ["Le logo de Pénombre a eu 8 sur 10 à la relecture.", "Laquelle des trois planches choisis-tu ?"],
      ["Je refais le logo de Halo : la carte te montre le prix.", ""],
      ["", "Tu veux le bleu ou le vert pour ton site ?"],
    ] as const) expect(questionSurLeLogo(m(message, q ? { text: q } : undefined)), `${message} | ${q}`).toBe(false);
  });

  it("la consigne de SINA le dit : quand il demande un autre logo, elle en refait un et présente la carte", async () => {
    const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
    expect(SYNA_SYSTEM).toContain("Quand il demande un autre logo, tu dis simplement que tu en refais un, puis tu présentes la carte d'accord");
    expect(SYNA_SYSTEM).toContain("jamais de question sur ce logo (ni les lettres, ni la couleur, ni la forme, ni le style, ni ce qui lui plaît ou lui déplaît)");
    expect(SYNA_SYSTEM).not.toContain("s'il en veut un autre, tu le refais avec ses mots");
  });
});

describe("essai dans la conversation : Nadia demande un autre logo pour Halo", async () => {
  const J = await import("@/lib/syna-agent/journey");
  const { account, project } = await import("./conversation209-fixtures");
  const { openThread } = await import("@/lib/syna-agent/thread");
  const { runAgent, submitMessage, threadView } = await import("@/lib/syna-agent/loop");
  const { getRun } = await import("@/lib/syna-agent/store");
  const { chargeDuStudio } = await import("@/lib/billing");
  const { all, json } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();

  /** Les trois planches de Nadia : Sillage et Halo avec leur logo, Pénombre sans le sien (comme dans l'essai réel). */
  async function nadia(penombreSansLogo = true) {
    const user = await account(), pid = project(user) as string, cid = (await fr(() => openThread(user, pid))).conversationId;
    const noms = { A: "Sillage", B: "Halo", C: "Pénombre" } as const;
    J.updateJourney(cid, (x) => {
      x.steps[0] = { status: "done" };
      x.identities = { list: (["A", "B", "C"] as const).map((k) => { const r = route(k) as any; const logo = k !== "C" || !penombreSansLogo; return { ...r, name: noms[k], board: { ...r.board, images: { ...(logo ? { logo: { id: `logo-${k}` } } : {}), hero: { id: `hero-${k}` }, site: { id: `site-${k}` } } } }; }), issues: [], comparison: "", at: 1, round: 1 } as any;
    });
    return { user, pid, cid };
  }
  const assistants = (cid: string) => all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='assistant'", cid).map((m) => json<any>(m.content_json, {}));
  const outils = (cid: string) => all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='tool'", cid).map((m) => json<any>(m.content_json, {}));

  it("sa question sur le logo est réécrite à la charge du Studio ; elle dit qu'elle en refait un et la carte d'accord s'ouvre", async () => {
    const t = await nadia(false);
    const r = submitMessage(t.user, t.cid, { requestId: `req-${Math.random()}`, text: PHRASE_DE_NADIA });
    const appels: { note: string; studio: boolean }[] = [];
    await fr(() => runAgent(r.id, r.job_id!, { reason: async (call) => {
      const note = /# Ton message n'est pas parti : réécris-le[\s\S]*/.exec(call.context ?? "")?.[0] ?? "";
      appels.push({ note, studio: chargeDuStudio() });
      // 1re réponse : celle de l'essai réel. 2e (après le contrôle) : elle en refait un, avec la carte.
      return appels.length === 1
        ? { message: QUESTION_DE_SINA, actions: [], question: null, done: false }
        : { message: "Je t'en refais un autre pour Halo. La carte te montre le prix.", actions: [{ tool: "identity.images", args: { keys: ["B"], images: ["logo"] } }], question: null, done: false };
    } }));
    expect(appels).toHaveLength(2);
    expect(appels[0]).toEqual({ note: "", studio: false });
    expect(appels[1].note).toMatch(/On ne demande jamais au client ce qu'il veut ou non dans son logo/);
    // La réécriture est une reprise du Studio, jamais comptée au client.
    expect(appels[1].studio).toBe(true);
    const dits = assistants(t.cid).map((c) => c.message);
    expect(dits).not.toContain(QUESTION_DE_SINA);
    expect(dits.at(-1)).toBe("Je t'en refais un autre pour Halo. La carte te montre le prix.");
    expect(getRun(r.id)!.status).toBe("waiting_confirmation");
    const v = await fr(() => threadView(t.user, t.cid));
    expect(v.run!.pending).toMatchObject({ tool: "identity.images", reason: "cost", args: { keys: ["B"], images: ["logo"] } });
  });

  it("2. Nadia demande Halo et Pénombre, SINA donne [C, B] dans un seul appel : la carte part avec B puis C", async () => {
    const t = await nadia(false);
    const r = submitMessage(t.user, t.cid, { requestId: `req-${Math.random()}`, text: "Refais-moi les logos de Halo et de Pénombre." });
    await fr(() => runAgent(r.id, r.job_id!, { reason: async () => ({ message: "Je refais les deux. La carte te montre le prix.", actions: [{ tool: "identity.images", args: { keys: ["C", "B"], images: ["logo"] } }], question: null, done: false }) }));
    const v = await fr(() => threadView(t.user, t.cid));
    expect(v.run!.pending).toMatchObject({ tool: "identity.images", args: { keys: ["C", "B"] } });
    // L'accord lance une seule tâche, dans l'ordre des identités.
    const { getTool } = await import("@/lib/syna-agent/registry");
    const { toolContext } = await import("@/lib/syna-agent/loop");
    const res = await fr(() => getTool("identity.images")!.run(toolContext(t.user, getRun(r.id)!), { keys: ["C", "B"], images: ["logo"] } as never));
    expect(res.ok).toBe(true);
    const { getJob } = await import("@/lib/jobs");
    expect(JSON.parse(getJob(res.jobs![0])!.payload).redo).toEqual(["B", "C"]);
  });

  it("2. deux appels séparés dans la même réponse ([C] puis [B]) : réunis en un seul, B puis C", async () => {
    const t = await nadia(false);
    const r = submitMessage(t.user, t.cid, { requestId: `req-${Math.random()}`, text: "Refais-moi les logos de Halo et de Pénombre." });
    await fr(() => runAgent(r.id, r.job_id!, { reason: async () => ({ message: "Je refais les deux. La carte te montre le prix.", actions: [{ tool: "identity.images", args: { keys: ["C"], images: ["logo"], guidance: "Le client a dit : « Refais-moi les logos de Halo et de Pénombre. »" } }, { tool: "identity.images", args: { keys: ["B"], images: ["logo"] } }], question: null, done: false }) }));
    const v = await fr(() => threadView(t.user, t.cid));
    expect(v.run!.pending).toMatchObject({ tool: "identity.images", args: { keys: ["B", "C"], images: ["logo"] } });
    expect(assistants(t.cid).at(-1)!.actions).toHaveLength(1);
  });

  it("2. l'essai réel : Pénombre à finir lancé seul alors que Nadia demande aussi Halo ; la carte ne s'ouvre pas, SINA les réunit, Halo d'abord", async () => {
    const t = await nadia(true);
    const r = submitMessage(t.user, t.cid, { requestId: `req-${Math.random()}`, text: PHRASE_DE_NADIA });
    let n = 0;
    const contextes: string[] = [];
    await fr(() => runAgent(r.id, r.job_id!, { reason: async (call) => {
      contextes.push(call.context ?? "");
      n++;
      // 1re réponse : comme dans l'essai, elle finit d'abord Pénombre seule. 2e : elle a lu le refus du Studio.
      return n === 1
        ? { message: "Je finis d'abord le logo de Pénombre, à ma charge.", actions: [{ tool: "identity.images", args: { keys: ["C"], images: ["logo"] } }], question: null, done: false }
        : { message: "Je refais le logo de Halo et je finis celui de Pénombre. La carte te montre le prix.", actions: [{ tool: "identity.images", args: { keys: ["B", "C"], images: ["logo"] } }], question: null, done: false };
    } }));
    // Le Studio a refusé la carte de Pénombre seule, avant toute dépense, et dit pourquoi à SINA (jamais au client).
    const refus = outils(t.cid).find((c) => /ordre de la série des logos/.test(c.summary ?? ""));
    expect(refus).toBeTruthy();
    expect(refus.internal).toBe(true);
    expect(refus.summary).toMatch(/« Halo » \(B\) : le client vient de demander aussi un autre logo pour elle/);
    expect(refus.summary).toMatch(/keys = B, C et images = logo/);
    expect(n).toBe(2);
    expect(contextes[0]).toMatch(/S'il demande aussi un autre logo d'une planche, ne lance pas d'abord celles à finir/);
    const v = await fr(() => threadView(t.user, t.cid));
    expect(v.run!.pending).toMatchObject({ tool: "identity.images", args: { keys: ["B", "C"], images: ["logo"] } });
  });

  it("2. Halo n'a plus de logo et Pénombre est demandé seul : Halo passe avant ; prévenue une fois, la même demande repart telle quelle", async () => {
    const t = await nadia(false);
    J.updateJourney(t.cid, (x) => { delete x.identities!.list[1].board!.images!.logo; });
    const r = submitMessage(t.user, t.cid, { requestId: `req-${Math.random()}`, text: "Refais le logo de Pénombre." });
    let n = 0;
    await fr(() => runAgent(r.id, r.job_id!, { reason: async () => { n++; return { message: "Je refais celui de Pénombre. La carte te montre le prix.", actions: [{ tool: "identity.images", args: { keys: ["C"], images: ["logo"] } }], question: null, done: false }; } }));
    const refus = outils(t.cid).filter((c) => /ordre de la série des logos/.test(c.summary ?? ""));
    expect(refus).toHaveLength(1);
    expect(refus[0].summary).toMatch(/« Halo » \(B\) : son logo manque encore/);
    // Elle maintient son appel : il part tel quel (aucune boucle, aucune impasse).
    expect(n).toBe(2);
    const v = await fr(() => threadView(t.user, t.cid));
    expect(v.run!.pending).toMatchObject({ tool: "identity.images", args: { keys: ["C"] } });
  });
});

describe("2. l'ordre, sans IA", async () => {
  const O = await import("@/lib/syna-agent/ordre-des-logos");
  const D = await import("@/lib/syna-agent/devants");
  it("les clés reçues sont remises dans l'ordre des identités", () => {
    expect(O.dansLOrdre(["C", "B"])).toEqual(["B", "C"]);
    expect(O.dansLOrdre(["D", "A", "C", "A"])).toEqual(["A", "C", "D"]);
  });
  it("les planches à finir : les logos manquants partent ensemble, dans l'ordre, avant le reste", () => {
    expect(D.groupesAFinir([{ key: "A", name: "Sillage", manque: ["logo"] }, { key: "B", name: "Halo", manque: ["logo", "hero"] }, { key: "C", name: "Pénombre", manque: ["logo"] }]))
      .toEqual([{ keys: ["A", "B", "C"], images: ["logo"] }, { keys: ["B"], images: ["hero"] }]);
    expect(D.groupesAFinir([{ key: "A", name: "Sillage", manque: ["hero"] }, { key: "B", name: "Halo", manque: ["hero"] }, { key: "C", name: "Pénombre", manque: ["logo"] }]))
      .toEqual([{ keys: ["A", "B"], images: ["hero"] }, { keys: ["C"], images: ["logo"] }]);
  });
});

describe("3. jamais de consigne de style pour un logo (retirée par le Studio, sans IA)", async () => {
  const K = await import("@/lib/syna-agent/consigne-du-logo");
  const CONSIGNE = "Le client a dit : « Le logo de Halo ne me plaît pas trop, tu peux m'en faire un autre ? » Refaire les logos de Halo et de Pénombre : logo dessiné sur un fond blanc parfaitement uni ; pas de lettres bleues arrondies avec une ellipse orange.";
  it("logo seul : seuls les mots cités du client restent (pour le relecteur) ; le reste est retiré et dit à SINA", () => {
    const c = K.consigneSansStyleDuLogo(CONSIGNE, ["logo"]);
    expect(c.guidance).toBe("Le client a dit : « Le logo de Halo ne me plaît pas trop, tu peux m'en faire un autre ? »");
    expect(c.retire).toMatch(/fond blanc parfaitement uni/);
    expect(c.retire).toMatch(/lettres bleues arrondies avec une ellipse orange/);
    expect(K.noteConsigneRetiree(c.retire!)).toMatch(/tu n'écris jamais de consigne de style pour un logo/);
    // Sans mots du client : plus rien.
    expect(K.consigneSansStyleDuLogo("Un logo sur fond blanc, sans flamme.", ["logo"])).toEqual({ retire: "Un logo sur fond blanc, sans flamme." });
  });
  it("logo avec la grande scène : ce qui parle du logo est retiré, le reste reste pour la photo ; sans logo, rien ne change", () => {
    const c = K.consigneSansStyleDuLogo("Une scène plus lumineuse, le soir. Le logo en lettres rondes sur fond blanc.", ["logo", "hero"]);
    expect(c.guidance).toBe("Une scène plus lumineuse, le soir.");
    expect(c.retire).toBe("Le logo en lettres rondes sur fond blanc.");
    expect(K.consigneSansStyleDuLogo("Une scène plus lumineuse.", ["hero"])).toEqual({ guidance: "Une scène plus lumineuse.", retire: null });
  });
  it("l'outil qui refait le logo met dans la tâche la consigne sans style, et le dit à SINA seule", async () => {
    const J = await import("@/lib/syna-agent/journey");
    const { account, project } = await import("./conversation209-fixtures");
    const { threadFor } = await import("@/lib/syna-agent/thread");
    const { getTool } = await import("@/lib/syna-agent/registry");
    const { getJob } = await import("@/lib/jobs");
    const { runWithLang } = await import("@/lib/i18n-server");
    const user = await account(), pid = project(user) as string, cid = threadFor(user, pid);
    J.updateJourney(cid, (x) => { x.identities = { list: (["A", "B", "C"] as const).map((k) => { const r = route(k) as any; return { ...r, board: { ...r.board, images: { logo: { id: `logo-${k}` }, hero: { id: `h-${k}` }, site: { id: `s-${k}` } } } }; }), issues: [], comparison: "", at: 1, round: 1 } as any; });
    const ctx = { user, conversationId: cid, runId: `run-${Math.random()}`, projectId: pid, attachment: () => null } as any;
    const res = await runWithLang({ ui: "fr", content: "fr" }, async () => getTool("identity.images")!.run(ctx, { keys: ["C", "B"], images: ["logo"], guidance: CONSIGNE } as never));
    expect(res.ok).toBe(true);
    const payload = JSON.parse(getJob(res.jobs![0])!.payload);
    expect(payload.redo).toEqual(["B", "C"]);
    expect(payload.guidance).toBe("Le client a dit : « Le logo de Halo ne me plaît pas trop, tu peux m'en faire un autre ? »");
    expect(JSON.stringify(payload)).not.toMatch(/fond blanc|lettres bleues|ellipse/);
    expect(res.hint).toMatch(/Ta consigne pour le logo a été retirée sans être transmise/);
    expect(res.summary).not.toMatch(/consigne/);
  });
});
