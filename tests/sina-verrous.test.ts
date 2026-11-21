/**
 * LES ÉTAPES VERROUILLÉES (le socle, 21 novembre 2026) : une partie validée par le client est figée ; le Studio pose le
 * verrou lui-même après une validation confirmée par le parcours relu ; un outil qui la referait est refusé avant de
 * s'exécuter ; SINA ne la rouvre que si le client vient de le demander par écrit (ses mots gardés). Aucun appel d'IA.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — les étapes verrouillées", async () => {
  const { all, json } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { submitMessage, runAgent } = await import("@/lib/syna-agent/loop");
  const { addMessage } = await import("@/lib/syna-agent/store");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const J = await import("@/lib/syna-agent/journey");
  const V = await import("@/lib/syna-agent/verrous");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const toolMessages = (cid: string) => all<any>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='tool' ORDER BY seq", cid).map((m) => json<any>(m.content_json, {}));

  /** Un projet dont l'angle a été choisi par le client (étape 4 validée). */
  const angleChoisi = async () => {
    const user = await account(), projectId = project(user, "services") as string, cid = threadFor(user, projectId);
    J.updateJourney(cid, (j) => { for (const n of [0, 1, 2, 3]) J.setStep(j, n, "done"); j.angles = { list: [{ id: "a1", title: "Le dimanche sans fuite" } as never], recommendedId: "a1", recommendation: "", sourceCount: 0, at: 1 } as never; j.angleChoice = { id: "a1", at: 1 }; J.setStep(j, 4, "done"); });
    return { user, projectId, cid };
  };

  it("le verrou n'est posé qu'après une validation réussie ET confirmée par le parcours relu", async () => {
    const cid2 = threadFor(await account(), null);
    // Un outil de validation qui échoue, ou un parcours qui ne confirme pas : rien n'est verrouillé.
    expect(V.apresValidation(cid2, "angles.choose", { ok: true, summary: "Angle choisi." })).toBeNull();
    const { cid } = await angleChoisi();
    expect(V.apresValidation(cid, "angles.choose", { ok: false, summary: "non" })).toBeNull();
    expect(V.apresValidation(cid, "site.create", { ok: true, summary: "lancé" })).toBeNull();
    expect(V.apresValidation(cid, "angles.choose", { ok: true, summary: "Angle choisi par le client." })).toBe("angle");
    expect(V.registreOf(cid).angle).toMatchObject({ preuve: "Angle choisi par le client.", ouvert: null });
  });

  it("une partie verrouillée : l'outil qui la referait est refusé ; les retouches que le client demande en cliquant restent permises", async () => {
    const { cid } = await angleChoisi();
    V.apresValidation(cid, "angles.choose", { ok: true, summary: "ok" });
    expect(V.refusVerrou(cid, "angles.propose")).toMatchObject({ ok: false, internal: true, summary: expect.stringMatching(/son angle est validée par le client et verrouillée/) });
    expect(V.refusVerrou(cid, "angles.choose")?.hint).toMatch(/etape\.rouvrir/);
    expect(V.refusVerrou(cid, "site.create")).toBeNull();
    // Le site validé : refaire le site est refusé, changer un élément désigné ne l'est pas.
    for (const t of ["custom.edit", "custom.structure", "custom.photo", "custom.menu", "custom.undo"]) expect(V.REFONT[t]).toBeUndefined();
    // Chaque outil nommé dans le registre existe vraiment (aucune garde qui ne garde rien).
    for (const t of [...Object.keys(V.REFONT), ...Object.keys(V.VALIDATION)]) expect(getTool(t), t).toBeTruthy();
  });

  it("SINA ne rouvre qu'avec les mots que le client vient d'écrire ; rouvrir l'identité rouvre sa marque ; la validation suivante reverrouille", async () => {
    const { user, projectId, cid } = await angleChoisi();
    J.updateJourney(cid, (j) => { j.identityChoice = { key: "A", mix: {}, at: 1 }; });
    V.apresValidation(cid, "identity.choose", { ok: true, summary: "ok" });
    V.apresValidation(cid, "brand.kit_validate", { ok: true, summary: "ok" });
    addMessage(cid, "user", { text: "Ça me va très bien comme ça." }, null);
    expect(V.rouvrir(cid, "identite", "je veux une autre identité")).toMatchObject({ ok: false });
    expect(V.ferme(V.registreOf(cid), "identite")).toBe(true);
    addMessage(cid, "assistant", { message: "D'accord." }, null);
    addMessage(cid, "user", { text: "En fait je veux une autre identité, plus chaleureuse." }, null);
    expect(V.rouvrir(cid, "identite", "je veux une autre identité")).toEqual({ ok: true, parties: ["identite", "marque"] });
    expect(V.registreOf(cid).identite!.ouvert).toMatchObject({ mots: "je veux une autre identité" });
    expect(V.refusVerrou(cid, "identity.propose")).toBeNull();
    // Il valide de nouveau : la partie se referme, l'historique garde ses mots.
    V.apresValidation(cid, "identity.choose", { ok: true, summary: "ok" });
    const v = V.registreOf(cid).identite!;
    expect(v.ouvert).toBeNull();
    expect(v.historique.some((h) => h.mots === "je veux une autre identité")).toBe(true);
    void user; void projectId;
  });

  it("dans la vraie boucle de SINA : refus d'abord (rien ne s'exécute), puis rouvert à sa demande écrite", async () => {
    const { user, cid } = await angleChoisi();
    V.apresValidation(cid, "angles.choose", { ok: true, summary: "ok" });
    const r1 = submitMessage(user, cid, { requestId: `req-${Math.random()}`, text: "Tu peux me redire mon angle ?" });
    let n = 0;
    await fr(() => runAgent(r1.id, r1.job_id!, { reason: async () => (++n === 1 ? { message: "", actions: [{ tool: "angles.propose", args: {}, why: "refaire" }], question: null, done: false } : { message: "Ton angle reste « Le dimanche sans fuite ».", actions: [], question: null, done: true }) }));
    expect(toolMessages(cid).at(-1)).toMatchObject({ tool: "angles.propose", ok: false, internal: true, summary: expect.stringMatching(/verrouillée/) });
    // Ni tâche d'angles, ni carte d'accord : rien n'est lancé ni proposé au paiement.
    expect(all<{ type: string }>("SELECT type FROM jobs").filter((x) => /angle/i.test(x.type))).toEqual([]);
    expect(all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='event'", cid).map((x) => x.content_json).join(" ")).not.toMatch(/confirm|decision/i);
    // Le client demande lui-même le changement : SINA rouvre avec ses mots, puis l'outil n'est plus refusé par le verrou.
    const r2 = submitMessage(user, cid, { requestId: `req-${Math.random()}`, text: "Je veux changer d'angle, propose-m'en d'autres." });
    let m = 0;
    await fr(() => runAgent(r2.id, r2.job_id!, { reason: async () => (++m === 1 ? { message: "", actions: [{ tool: "etape.rouvrir", args: { partie: "angle", mots: "Je veux changer d'angle" }, why: "il le demande" }, { tool: "angles.propose", args: {}, why: "refaire" }], question: null, done: false } : { message: "Je regarde.", actions: [], question: null, done: true }) }));
    const after = toolMessages(cid).slice(1);
    expect(after[0]).toMatchObject({ tool: "etape.rouvrir", ok: true });
    // angles.propose n'est plus refusé par le verrou : il passe à la suite normale (devis et carte d'accord du client).
    expect(after.filter((x) => x.tool === "angles.propose" && /verrouillée/.test(String(x.summary)))).toEqual([]);
    expect(V.registreOf(cid).angle!.ouvert).toMatchObject({ mots: "Je veux changer d'angle" });
  });
});
