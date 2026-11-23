/**
 * Essai réel de Nadia (version 891914dc, 23 novembre 2026), deux ratés :
 *  1. la carte disait « À ma charge : 0 % de ton budget », et son budget engagé est passé de 17,04 % à 17,97 % ;
 *  2. SINA avait annoncé deux planches, n'en a présenté qu'une ; Nadia a dû demander la seconde.
 * Aucun appel d'IA : SINA est simulée, les comptes sont ceux du Studio (réservations, règlements, grand livre).
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { route } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

describe("tâche à la charge du Studio : jamais au budget du client ; chaque planche finie présentée d'elle-même", async () => {
  const { all, id, json, one, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { submitMessage, runAgent } = await import("@/lib/syna-agent/loop");
  const { getRun, addMessage } = await import("@/lib/syna-agent/store");
  const { accountKeyFor } = await import("@/lib/project-billing");
  const { trackJob, budgetState } = await import("@/lib/syna-agent/budget");
  const J = await import("@/lib/syna-agent/journey");
  const { SINA_BRAND_JOB } = await import("@/lib/syna-agent/brand-chain");
  const { saveAsset } = await import("@/lib/library");
  const billing = await import("@/lib/billing");
  const { withTrace, selonLaCharge, chargeDuStudio, recordCall, depensesDeLaTache } = await import("@/lib/ai/trace");
  const { rendreLaChargeDuStudio } = await import("@/lib/ai/rattrapage-charge-du-studio");
  const P = await import("@/lib/syna-agent/planches-a-presenter");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  /** Une image de planche relue (« ready », avec sa note et les mots de la relecture). */
  async function image(user: string, pid: string, key: string, slot: string, score: number, words: string) {
    const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#AA6633" } }).png().toBuffer();
    const a = await saveAsset({ projectId: pid, userId: user, data: png, name: `planche-${key}-${slot}.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "ready", meta: { synaBoard: { key, slot, round: 1, review: { status: "ready", score, words } } } });
    return { id: a.id, w: 32, h: 32 };
  }

  /** Un fil de Nadia : trois planches montrées, dont les deux premières viennent d'être finies par une tâche. */
  async function fil(label: string) {
    const user = await account();
    const pid = project(user);
    const cid = threadFor(user as never, pid);
    const list: ReturnType<typeof route>[] = [];
    for (const k of ["A", "B", "C"] as const) {
      const x = route(k);
      list.push({ ...x, board: { ...x.board!, images: { logo: await image(user.id, pid, k, "logo", 9, `Logo ${k} net, lisible de loin`), hero: await image(user.id, pid, k, "hero", 8, "Scène calme"), site: await image(user.id, pid, k, "site", 8, "Haut du site lisible") } } });
    }
    J.updateJourney(cid, (x) => { x.steps[0] = { status: "done" }; x.steps[1] = { status: "review" }; x.identities = { list: list as never, issues: [], comparison: "", at: Date.now(), round: 1 }; });
    const r = submitMessage(user as never, cid, { requestId: `${label}-${Math.random()}`, text: "Oui, finis-les." });
    return { user, pid, cid, r, names: list.map((x) => x.name) };
  }

  /** Une tâche de la marque déjà finie, attendue par la demande `runId`. */
  function tacheFinie(t: Awaited<ReturnType<typeof fil>>, payload: Record<string, unknown>) {
    const jid = id();
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at, finished_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", jid, t.user.id, t.pid, SINA_BRAND_JOB, "marque", JSON.stringify({ projectId: t.pid, conversationId: t.cid, capMicro: 765_584, count: 3, ...payload }), "done", Date.now(), Date.now(), Date.now(), Date.now());
    trackJob(t.cid, t.r.id, jid, "native");
    return jid;
  }
  const attendre = (t: Awaited<ReturnType<typeof fil>>, jobs: string[]) => run("UPDATE syna_runs SET status='waiting_jobs', waiting_jobs=? WHERE id=?", JSON.stringify(jobs), t.r.id);
  const messagesDe = (cid: string, role: string) => all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role=? ORDER BY seq", cid, role).map((m) => json<any>(m.content_json, {}));

  it("deux planches finies dans la même tâche : présentées toutes les deux, sans nouvelle question ; la réponse est à la charge du Studio", async () => {
    const t = await fil("meme-tache");
    const jid = tacheFinie(t, { imagesOnly: true, images: true, redo: ["A", "B"], slots: ["logo"], studio: true });
    attendre(t, [jid]);
    const vu: { studio: boolean; note: boolean }[] = [];
    // SINA ne nomme que la première planche, même quand le contrôle lui demande de réécrire (le pire cas).
    const reason = async (call: any) => { vu.push({ studio: chargeDuStudio(), note: /ne présente pas/.test(call.context ?? "") }); return { message: `Je te présente « ${t.names[0]} » : son logo est net.`, actions: [], done: true }; };
    await fr(() => runAgent(t.r.id, getRun(t.r.id)!.job_id!, { reason }));
    // Le Studio a noté ce qui est à présenter, et l'a dit à SINA.
    const attente = messagesDe(t.cid, "tool").find((m) => m.tool === "jobs.wait")!;
    expect(attente.aPresenter.map((x: any) => x.key)).toEqual(["A", "B"]);
    expect(attente.hint).toContain(`B « ${t.names[1]} »`);
    expect(attente.hint).toContain("Ce travail était à ta charge");
    // Le contrôle a fait réécrire le message, à la charge du Studio ; la réponse entière l'est aussi.
    expect(vu.length).toBeGreaterThanOrEqual(2);
    expect(vu.some((v) => v.note)).toBe(true);
    expect(vu.every((v) => v.studio)).toBe(true);
    // Les deux planches sont présentées dans le même message, avec la note et les mots de la relecture ; la troisième,
    // qui n'a pas été refaite, n'est pas représentée.
    const dits = messagesDe(t.cid, "assistant");
    expect(dits).toHaveLength(1);
    expect(dits[0].message).toContain(t.names[0]);
    expect(dits[0].message).toContain(`Ta planche « ${t.names[1]} » est prête elle aussi, juste au-dessus. Ce que j'en pense : son logo : 9 sur 10, « Logo B net, lisible de loin ».`);
    expect(dits[0].message).not.toContain(t.names[2]);
    expect(messagesDe(t.cid, "user")).toHaveLength(1);
    // Une seule fois : plus rien n'est à présenter ensuite.
    expect(P.planchesAPresenter(t.cid, t.r.id)).toEqual([]);
  });

  it("deux tâches proches attendues ensemble : chaque planche est présentée ; SINA qui les nomme n'est pas reprise", async () => {
    const t = await fil("deux-taches");
    const a = tacheFinie(t, { imagesOnly: true, images: true, redo: ["A"], slots: ["logo"], studio: true });
    const c = tacheFinie(t, { imagesOnly: true, images: true, redo: ["C"], slots: ["hero"] });
    attendre(t, [a, c]);
    const vu: boolean[] = [];
    const reason = async () => { vu.push(chargeDuStudio()); return { message: `Voilà « ${t.names[0]} » et « ${t.names[2]} », finies toutes les deux.`, actions: [], done: true }; };
    await fr(() => runAgent(t.r.id, getRun(t.r.id)!.job_id!, { reason }));
    // Une seule réflexion (aucune réécriture) ; une des deux tâches est comptée au client : la réponse aussi.
    expect(vu).toEqual([false]);
    const dits = messagesDe(t.cid, "assistant");
    expect(dits[0].message).toBe(`Voilà « ${t.names[0]} » et « ${t.names[2]} », finies toutes les deux.`);
    expect(P.planchesAPresenter(t.cid, t.r.id)).toEqual([]);
  });

  it("une planche incomplète n'est jamais présentée, même finie par la tâche", async () => {
    const t = await fil("incomplete");
    J.updateJourney(t.cid, (x) => { delete (x.identities!.list[1].board!.images as any).logo; });
    const jid = tacheFinie(t, { imagesOnly: true, images: true, redo: ["A", "B"], slots: ["logo"], studio: true });
    expect(P.planchesFiniesPar([one<any>("SELECT * FROM jobs WHERE id=?", jid)], J.journeyOf(t.cid)).map((x) => x.key)).toEqual(["A"]);
    expect(P.presentationDuStudio([{ key: "B", name: t.names[1], images: ["logo"] }], J.journeyOf(t.cid))).toBe("");
  });

  it("le coût d'une tâche dit à SINA est la part du client : une tâche à la charge du Studio ne coûte rien au client", async () => {
    const t = await fil("cout");
    const jid = tacheFinie(t, { imagesOnly: true, images: true, redo: ["A"], slots: ["logo"], studio: true });
    await withTrace({ jobId: jid, projectId: t.pid }, () => selonLaCharge({ studio: true }, async () => { const rid = billing.reserve(t.user.id, 500_000, { task: "image_generation", provider: "openai", model: "gpt-image-2.6-flare" }); billing.settle(rid, 450_000, null, "logo"); }));
    attendre(t, [jid]);
    await fr(() => runAgent(t.r.id, getRun(t.r.id)!.job_id!, { reason: async () => ({ message: `Je te présente « ${t.names[0]} ».`, actions: [], done: true }) }));
    const attente = messagesDe(t.cid, "tool").find((m) => m.tool === "jobs.wait")!;
    expect(attente.data[0]).toMatchObject({ coutReelMicro: 0, aMaCharge: true });
    expect(depensesDeLaTache(jid)).toMatchObject({ client: 0, studio: 450_000 });
  });

  it("rattrapage par le code : le budget engagé de Nadia revient de 17,97 % à 17,04 %, et une seconde exécution ne change rien", async () => {
    const t = await fil("rattrapage");
    const base = billing.aiPctBaseMicro(accountKeyFor(t.user.id, t.pid));
    expect(base).toBeGreaterThan(0);
    const meta = (task: string) => ({ task, provider: "anthropic", model: "claude-opus-5-5", projectId: t.pid });
    // Avant la carte : 17,04 % engagés dans ce fil par les réponses de SINA, comptées au client (elles le sont).
    const avantCarte = id();
    trackJob(t.cid, t.r.id, avantCarte, "agent");
    await withTrace({ jobId: avantCarte, projectId: t.pid }, async () => { const rid = billing.reserve(t.user.id, Math.round(0.1704 * base) + 10, meta("agent_conversation")); billing.settle(rid, Math.round(0.1704 * base), null, "réponses"); });
    const engage = () => budgetState(t.user.id, t.pid, t.cid).spentPct!;
    const portefeuille = () => one<{ monthly_used: number; topup_balance: number; reserved: number }>("SELECT monthly_used, topup_balance, reserved FROM wallets WHERE user_id=?", accountKeyFor(t.user.id, t.pid))!;
    expect(engage()).toBeCloseTo(17.04, 2);
    const avant = portefeuille();
    // La version 891914dc : une tâche « À ma charge » dont des dépenses sont parties sur son compte (idée en mots simples,
    // logo, relecture), puis la réponse de SINA qui la présente (étape 3 de la demande).
    const tache = tacheFinie(t, { imagesOnly: true, images: true, redo: ["A", "B"], slots: ["logo"], studio: true });
    const fuite = Math.round(0.0093 * base), parts = [Math.round(fuite * 0.2), Math.round(fuite * 0.35), Math.round(fuite * 0.1)];
    const presentation = fuite - parts.reduce((s, x) => s + x, 0);
    await withTrace({ jobId: tache, projectId: t.pid }, async () => { for (const [i, m] of parts.entries()) { const rid = billing.reserve(t.user.id, m + 5, { ...meta(["strategy", "image_generation", "quality_control"][i]), studio: false }); billing.settle(rid, m, null, "fuite"); } });
    const agent = id();
    trackJob(t.cid, t.r.id, agent, "agent");
    addMessage(t.cid, "tool", { key: "jobs:3", tool: "jobs.wait", ok: true, data: [{ job: tache, type: SINA_BRAND_JOB, status: "done" }] }, t.r.id);
    await withTrace({ jobId: agent, projectId: t.pid }, async () => {
      const rid = billing.reserve(t.user.id, presentation + 5, meta("agent_conversation"));
      const u = billing.recordUsage({ userId: t.user.id, projectId: t.pid, jobId: agent, task: "agent_conversation", provider: "anthropic", model: "claude-opus-5-5", unit: "tokens", inputUnits: 1, outputUnits: 1, costMicro: presentation, estimated: false, idempotencyKey: `syna:${t.r.id}:3` }, { reservationId: rid });
      recordCall({ userId: t.user.id, projectId: t.pid, jobId: agent, task: "agent_conversation", provider: "anthropic", requestedModel: "claude-opus-5-5", unit: "tokens", usageKey: `syna:${t.r.id}:3`, usageEventId: u.eventId, costMicro: presentation, status: "ok" });
      // La réponse d'avant, dans la même demande (étape 2) : comptée au client, elle le reste.
      const r2 = billing.reserve(t.user.id, 1005, meta("agent_conversation"));
      const u2 = billing.recordUsage({ userId: t.user.id, projectId: t.pid, jobId: agent, task: "agent_conversation", provider: "anthropic", model: "claude-opus-5-5", unit: "tokens", inputUnits: 1, outputUnits: 1, costMicro: 1000, estimated: false, idempotencyKey: `syna:${t.r.id}:2` }, { reservationId: r2 });
      recordCall({ userId: t.user.id, projectId: t.pid, jobId: agent, task: "agent_conversation", provider: "anthropic", requestedModel: "claude-opus-5-5", unit: "tokens", usageKey: `syna:${t.r.id}:2`, usageEventId: u2.eventId, costMicro: 1000, status: "ok" });
    });
    const sansLaReponseDavant = () => engage() - (1000 / base) * 100;
    expect(sansLaReponseDavant()).toBeCloseTo(17.97, 2);
    expect(portefeuille().monthly_used - avant.monthly_used).toBe(fuite + 1000);

    // La correction, sur le projet de Nadia.
    const r1 = rendreLaChargeDuStudio({ projectId: t.pid });
    expect(r1).toMatchObject({ taches: 1, depenses: 4, renduMicro: fuite });
    // Chaque ligne dit ce qu'elle rend : la réponse de SINA porte le nom de sa vraie tâche (essai de Nadia : deux lignes
    // affichaient « réponse de SINA qui présente le résultat » alors que l'une rendait les dessins et leurs relectures).
    const lignesDeLaReponse = r1.lignes.filter((l) => l.quoi.startsWith("réponse de SINA"));
    expect(lignesDeLaReponse.length).toBeGreaterThan(0);
    for (const l of lignesDeLaReponse) expect(l.quoi).toMatch(/^réponse de SINA qui présente le résultat : \S/);
    expect(sansLaReponseDavant()).toBeCloseTo(17.04, 2);
    expect(portefeuille().monthly_used - avant.monthly_used).toBe(1000);
    expect(depensesDeLaTache(tache)).toMatchObject({ client: 0 });
    // Une trace dans le grand livre : rendu au client, inscrit à la charge du Studio.
    const compte = accountKeyFor(t.user.id, t.pid);
    expect(one<{ s: number }>("SELECT SUM(amount) s FROM ledger WHERE user_id=? AND type='refund' AND note LIKE '%rattrapage%'", compte)!.s).toBe(fuite);
    expect(one<{ s: number }>("SELECT SUM(amount) s FROM ledger WHERE user_id=? AND type='studio' AND note LIKE '%rattrapage%'", compte)!.s).toBe(-fuite);
    // Relancée (sur le projet ou sur toute la base) : rien ne bouge.
    const apres = portefeuille(), ledger = one<{ n: number }>("SELECT COUNT(*) n FROM ledger")!.n;
    expect(rendreLaChargeDuStudio({ projectId: t.pid })).toMatchObject({ depenses: 0, renduMicro: 0 });
    expect(rendreLaChargeDuStudio().lignes.filter((l) => l.projet === t.pid)).toEqual([]);
    expect(portefeuille()).toEqual(apres);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM ledger")!.n).toBe(ledger);
    expect(sansLaReponseDavant()).toBeCloseTo(17.04, 2);
    // La commande existe, sur un projet ou sur toute la base.
    expect(fs.readFileSync("scripts/rendre-charge-du-studio.ts", "utf8")).toMatch(/--projet[\s\S]*--tout/);
  });
});
