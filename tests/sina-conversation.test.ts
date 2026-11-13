/**
 * SINA — la conversation (carte des spécialistes, lot 3) : l'aiguilleuse (notice des seuls outils de l'étape), les
 * moments qui comptent (modèle plus fort) et la relectrice (une réécriture au plus). Tout est éteint par défaut
 * (réglage « sina.conversation »). Aucun appel d'IA : le modèle et la relectrice sont simulés.
 */
import { afterEach, describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — la conversation : aiguilleuse, moments qui comptent, relectrice", async () => {
  const { all, json } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { setJsonSetting, setSetting } = await import("@/lib/settings");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { allTools, getTool, toolCatalog, toolVisible } = await import("@/lib/syna-agent/registry");
  const { submitMessage, runAgent, modelFor } = await import("@/lib/syna-agent/loop");
  const { addMessage, getRun } = await import("@/lib/syna-agent/store");
  const C = await import("@/lib/syna-agent/conversation");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const scope = { inJourney: true, legacyMockups: false };
  const assistantMessages = (cid: string) => all<any>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='assistant' ORDER BY seq", cid).map((m) => json<any>(m.content_json, {}));

  afterEach(() => setSetting("sina.conversation", null));

  it("réglage : tout est éteint par défaut, chaque aide s'allume à part, une valeur illisible vaut « éteint »", () => {
    expect(C.conversationSettings()).toEqual({ aiguillage: false, momentsForts: false, relecture: false });
    setJsonSetting("sina.conversation", { aiguillage: true, relecture: "oui" });
    expect(C.conversationSettings()).toEqual({ aiguillage: true, momentsForts: false, relecture: false });
    setSetting("sina.conversation", "pas du json");
    expect(C.conversationSettings()).toEqual({ aiguillage: false, momentsForts: false, relecture: false });
  });

  it("l'aiguilleuse : la notice complète des outils de l'étape, une ligne pour les autres, rien de retiré", () => {
    const full = toolCatalog(true, scope), routed = C.routedCatalog(true, scope, 1);
    // Étape 1 : les identités en entier ; le montage du thème en une ligne, avec « payant ».
    expect(routed).toMatch(/### identity\.propose — module marque/);
    expect(routed).toMatch(/### identity\.choose — module marque/);
    expect(routed).not.toMatch(/### custom\.build/);
    expect(routed).toMatch(/^- custom\.build — site, payant : /m);
    expect(routed).toMatch(/### tools\.open — module outils/);
    expect(routed).toMatch(/demande d'abord sa notice avec tools\.open/);
    // Chaque outil visible est soit en notice complète, soit dans la liste : aucun ne disparaît.
    for (const t of allTools().filter((x) => toolVisible(x.name, { ...scope, routed: true }))) expect(routed.includes(`### ${t.name} — `) || routed.includes(`\n- ${t.name} — `), t.name).toBe(true);
    // Bien plus court que le catalogue entier (c'est le but : il part à chaque message).
    expect(routed.length).toBeLessThan(full.length / 3);
    // Sans aiguillage, tools.open n'est ni proposé ni exécutable ; les étapes non construites ne sont pas aiguillées.
    expect(full).not.toMatch(/tools\.open/);
    expect(toolVisible("tools.open", scope)).toBe(false);
    expect(toolVisible("tools.open", { ...scope, routed: true })).toBe(true);
    expect(C.routedStep(6)).toBe(true);
    expect(C.routedStep(9)).toBe(false);
    expect(C.routedStep(null)).toBe(false);
    // Étape 6 : le thème sur mesure en entier, les identités en une ligne.
    const six = C.routedCatalog(true, scope, 6);
    expect(six).toMatch(/### custom\.build — module site/);
    expect(six).toMatch(/^- identity\.propose — marque, payant : /m);
    expect(C.toolInFocus("start.state", 6)).toBe(true);
  });

  it("tools.open rend la notice exacte d'un outil hors de l'étape ; un nom inconnu est une erreur de SINA, jamais montrée", async () => {
    const t = getTool("tools.open")!;
    const ok = await fr(() => t.run({} as any, t.args.parse({ names: ["custom.build", "rien.du.tout"] })));
    expect(ok.ok).toBe(true);
    expect(ok.summary).toMatch(/Notice de custom\.build \(inconnu : rien\.du\.tout\)/);
    expect((ok.data as any).notices[0]).toMatch(/^### custom\.build — module site .*\n[\s\S]*Arguments : \{/);
    const ko = await fr(() => t.run({} as any, t.args.parse({ names: ["rien.du.tout"] })));
    expect(ko).toMatchObject({ ok: false, internal: true });
  });

  it("les moments qui comptent : résultat d'une création, échec, client mécontent ; un échange ordinaire n'en est pas un", () => {
    const user = (text: string) => ({ role: "user", content: { text } }), sina = { role: "assistant", content: { message: "Je lance." } };
    const tool = (name: string, ok = true, extra: object = {}) => ({ role: "tool", content: { tool: name, ok, ...extra } });
    expect(C.keyMoment([user("Bonjour, je vends du thé.")])).toBeNull();
    expect(C.keyMoment([user("Oui vas-y"), sina, tool("jobs.wait")])).toBe("resultat");
    expect(C.keyMoment([user("Oui vas-y"), sina, tool("jobs.wait", false)])).toBe("echec");
    expect(C.keyMoment([user("Change le prix"), sina, tool("catalogue.update", false)])).toBe("echec");
    // Une erreur d'argument de SINA elle-même se corrige seule : pas un moment qui compte.
    expect(C.keyMoment([user("Change le prix"), sina, tool("catalogue.update", false, { internal: true })])).toBeNull();
    expect(C.keyMoment([user("Change le prix"), sina, tool("catalogue.update")])).toBeNull();
    // Les mots du propriétaire devant de mauvais noms (12 novembre 2026).
    expect(C.keyMoment([user("Tintamarre c'est nul comme nom d'ailleurs")])).toBe("mecontent");
    expect(C.keyMoment([user("ça représente rien et c'est moche")])).toBe("mecontent");
    expect(C.keyMoment([user("Je n'aime pas ce logo")])).toBe("mecontent");
    expect(C.keyMoment([user("Annule, je veux un remboursement")])).toBe("mecontent");
    // Pas de faux positifs sur des mots qui en contiennent d'autres.
    expect(C.keyMoment([user("Je vends des pulls annulaires et des canulars")])).toBeNull();
    // Un résultat arrivé depuis passe avant l'humeur du message.
    expect(C.keyMoment([user("c'est nul"), sina, tool("jobs.wait")])).toBe("resultat");
  });

  it("modèle : le petit modèle laisse la place à un plus fort seulement à un moment qui compte, et seulement si demandé", () => {
    expect(modelFor(1)).toMatchObject({ model: "claude-haiku-5-5" });
    expect(modelFor(1, { keyMoment: "resultat" })).toMatchObject({ model: "claude-sonnet-5-5", effort: "medium" });
    expect(modelFor(4, { keyMoment: "mecontent" })).toMatchObject({ model: "claude-sonnet-5-5", effort: "medium" });
    expect(modelFor(1, { keyMoment: null })).toMatchObject({ model: "claude-haiku-5-5" });
    // L'étape 6 garde son réglage (décision du propriétaire du 10 novembre 2026).
    expect(modelFor(6, { keyMoment: "resultat", judge: true })).toMatchObject({ model: "claude-sonnet-5-5", effort: "high" });
  });

  it("la relectrice : sa demande porte le moment, les mots du client, les résultats et le brouillon ; ses remarques ne sortent pas", () => {
    expect(C.shouldReview(null, { message: "Voici tes trois identités, regarde-les tranquillement.", actions: [] })).toBe(false);
    expect(C.shouldReview("resultat", { message: "Ok.", actions: [] })).toBe(false);
    expect(C.shouldReview("resultat", { message: "Voici tes trois identités, regarde-les tranquillement.", actions: [] })).toBe(true);
    const prompt = C.replyReviewPrompt({ moment: "echec", stepLabel: "Identités de marque", client: "Alors ?", facts: "[résultat jobs.wait #4] ÉCHEC — coutReel 0,4 %", draft: { message: "Tout est prêt, rien n'a été débité.", question: { text: "On continue ?", choices: ["Oui", "Non"] }, actions: [{ tool: "identity.propose" }] }, wording: "écrire montre, jamais chronographe", quote: "au plus 3 %" });
    expect(prompt).toMatch(/MOMENT : quelque chose a échoué .* Étape du parcours : Identités de marque\./);
    expect(prompt).toMatch(/DERNIER MESSAGE DU CLIENT :\nAlors \?/);
    expect(prompt).toMatch(/seule source de vérité\) :\n\[résultat jobs\.wait #4\] ÉCHEC/);
    expect(prompt).toMatch(/PRIX DONNÉ PAR LE STUDIO :\nau plus 3 %/);
    expect(prompt).toMatch(/VOCABULAIRE DU CLIENT .* jamais chronographe/);
    expect(prompt).toMatch(/BROUILLON DE SINA :\nmessage : Tout est prêt, rien n'a été débité\.\nquestion : On continue \?\nboutons : Oui \| Non\nactions lancées avec ce message : identity\.propose/);
    expect(C.REPLY_REVIEW_SYSTEM).toMatch(/Tu ne la réécris pas/);
    expect(C.REPLY_REVIEW_SYSTEM).toMatch(/LE CLIENT N'ENTEND QUE SINA/);
    const note = C.reviewNote({ message: "Tout est prêt.", actions: [] }, ["Dis le coût réel : 0,4 %."]);
    expect(note).toMatch(/elle n'est PAS partie : réécris-la/);
    expect(note).toMatch(/- Dis le coût réel : 0,4 %\./);
    expect(note).toMatch(/ne parle jamais de cette relecture au client/);
  });

  /** Un fil à l'étape 0 où le client se plaint : la réflexion est simulée, la relectrice aussi. */
  async function unhappy(deps: { review?: (call: any) => Promise<unknown> }, reply: (n: number, call: any) => any) {
    const user = await account();
    const cid = threadFor(user, null);
    addMessage(cid, "assistant", { message: "Voici une première idée.", actions: [], question: null, done: true, step: 0 }, null);
    const r = submitMessage(user, cid, { requestId: `req-${Math.random()}`, text: "C'est nul, ça ne me ressemble pas du tout." });
    const calls: any[] = [];
    await fr(() => runAgent(r.id, r.job_id!, { reason: async (call) => { calls.push(call); return reply(calls.length, call); }, ...deps }));
    return { cid, calls, run: getRun(r.id)! };
  }
  const draft = { message: "Mon équipe a tout refait et rien n'a été débité, tout est parfait maintenant.", actions: [], question: null, done: true };
  const fixed = { message: "Tu as raison, ça ne te ressemble pas. Dis-moi ce qui te gêne le plus et je reprends à partir de là.", actions: [], question: null, done: true };

  it("par défaut : ni aiguillage, ni modèle plus fort, ni relecture (rien ne change)", async () => {
    let reviews = 0;
    const { cid, calls } = await unhappy({ review: async () => { reviews++; return { verdict: "reprendre", issues: ["À refaire entièrement."] }; } }, () => draft);
    expect(calls).toHaveLength(1);
    expect(reviews).toBe(0);
    expect(String(calls[0].reference)).toMatch(/^# Outils disponibles \(registre commun\)/);
    expect(calls[0].routing.prefer).toMatchObject({ model: "claude-haiku-5-5" });
    expect(assistantMessages(cid).pop()).toMatchObject({ message: draft.message });
    expect(assistantMessages(cid).pop().relu).toBeUndefined();
  });

  it("aiguillage allumé : SINA reçoit la notice des outils de l'étape et la liste des autres", async () => {
    setJsonSetting("sina.conversation", { aiguillage: true });
    const { calls } = await unhappy({}, () => fixed);
    expect(String(calls[0].reference)).toMatch(/^# Outils du Studio \(ceux de l'étape en entier, les autres en liste\)/);
    expect(String(calls[0].reference)).toMatch(/### start\.answer — module parcours/);
    // Fil sans projet, étape 0 : exactement le catalogue aiguillé de cette étape (les outils qui demandent un projet attendent).
    expect(String(calls[0].reference)).toBe(`# Outils du Studio (ceux de l'étape en entier, les autres en liste)\n\n${C.routedCatalog(false, scope, 0)}`);
    expect(String(calls[0].reference)).toMatch(/### tools\.open — module outils/);
  });

  it("aiguillage : un outil hors de l'étape appelé avec de mauvais arguments reçoit sa notice (SINA se corrige seule)", async () => {
    setJsonSetting("sina.conversation", { aiguillage: true });
    const user = await account();
    const cid = threadFor(user, null);
    const r = submitMessage(user, cid, { requestId: `req-${Math.random()}`, text: "Note que je préfère le vert." });
    let n = 0;
    await fr(() => runAgent(r.id, r.job_id!, { reason: async () => (++n === 1 ? { message: "", actions: [{ tool: "memory.note", args: { pasLeBonChamp: 1 }, why: "noter" }], question: null, done: false } : { message: "C'est noté.", actions: [], question: null, done: true }) }));
    const tools = all<any>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='tool' ORDER BY seq", cid).map((m) => json<any>(m.content_json, {}));
    expect(tools[0]).toMatchObject({ tool: "memory.note", ok: false, internal: true });
    expect(tools[0].summary).toMatch(/Arguments invalides : [\s\S]*Notice de l'outil :\n### memory\.note — module mémoire/);
  });

  it("moment qui compte + modèle plus fort allumé : le client mécontent est lu par le modèle plus fort", async () => {
    setJsonSetting("sina.conversation", { momentsForts: true });
    const { calls } = await unhappy({}, () => fixed);
    expect(calls[0].routing.prefer).toMatchObject({ model: "claude-sonnet-5-5", effort: "medium" });
  });

  it("relecture allumée : un brouillon refusé est réécrit UNE fois avec les remarques, qui ne partent jamais chez le client", async () => {
    setJsonSetting("sina.conversation", { relecture: true });
    const reviews: any[] = [];
    const { cid, calls, run } = await unhappy({ review: async (call) => { reviews.push(call); return { verdict: "reprendre", issues: ["« Mon équipe » : le client n'entend que SINA.", "« rien n'a été débité » : aucun chiffre du Studio ne le dit."] }; } }, (n) => (n === 1 ? draft : fixed));
    expect(reviews).toHaveLength(1);
    expect(reviews[0].task).toBe("quality_control");
    expect(String(reviews[0].system)).toBe(C.REPLY_REVIEW_SYSTEM);
    expect(String(reviews[0].prompt)).toMatch(/MOMENT : le client est mécontent/);
    expect(String(reviews[0].prompt)).toMatch(/DERNIER MESSAGE DU CLIENT :\nC'est nul, ça ne me ressemble pas du tout\./);
    expect(String(reviews[0].prompt)).toMatch(/message : Mon équipe a tout refait/);
    // Une seule réécriture, avec les remarques dans son contexte ; la relectrice ne relit pas une seconde fois.
    expect(calls).toHaveLength(2);
    expect(String(calls[1].context)).toMatch(/# Relecture de ta réponse \(elle n'est PAS partie : réécris-la\)[\s\S]*« Mon équipe » : le client n'entend que SINA\./);
    expect(calls[1].usageKey).not.toBe(calls[0].usageKey);
    const sent = assistantMessages(cid).pop();
    expect(sent).toMatchObject({ message: fixed.message, relu: "repris" });
    expect(JSON.stringify(assistantMessages(cid))).not.toMatch(/Mon équipe|n'entend que SINA/);
    expect(run.status).toBe("done");
  });

  it("relecture : un brouillon accepté part tel quel ; une relecture en panne ne bloque jamais la réponse", async () => {
    setJsonSetting("sina.conversation", { relecture: true });
    const a = await unhappy({ review: async () => ({ verdict: "ok", issues: [] }) }, () => fixed);
    expect(a.calls).toHaveLength(1);
    expect(assistantMessages(a.cid).pop()).toMatchObject({ message: fixed.message, relu: "ok" });
    const b = await unhappy({ review: async () => { throw new Error("modèle indisponible"); } }, () => fixed);
    expect(b.calls).toHaveLength(1);
    expect(assistantMessages(b.cid).pop()).toMatchObject({ message: fixed.message });
    expect(assistantMessages(b.cid).pop().relu).toBeUndefined();
    expect(b.run.status).toBe("done");
    // Un échange ordinaire n'est pas relu (la relecture coûte : seulement aux moments qui comptent).
    let reviews = 0;
    const user = await account();
    const cid = threadFor(user, null);
    const r = submitMessage(user, cid, { requestId: `req-${Math.random()}`, text: "Bonjour, je veux créer ma boutique de thé." });
    await fr(() => runAgent(r.id, r.job_id!, { reason: async () => ({ message: "Avec plaisir, on commence par une question simple pour bien te connaître.", actions: [], question: { text: "Tu vends des produits ou des services ?" }, done: false }), review: async () => { reviews++; return { verdict: "ok" }; } }));
    expect(reviews).toBe(0);
  });
});
