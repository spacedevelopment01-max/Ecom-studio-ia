/**
 * LE GARDE-FOU DE DÉPENSE DES ESSAIS RÉELS (24 novembre 2026, accepté par le propriétaire ; premier essai : 1 €).
 * Une seule somme pour tout l'essai (client et reprises du Studio, textes, images, recherches), contrôlée à la
 * réservation du maximum de chaque appel payant, avant qu'il parte. Actif seulement avec le réglage que pose le studio
 * privé d'essai (STUDIO_ESSAI_PLAFOND_EUROS, STUDIO_ESSAI_DEBUT). Tout est simulé : aucun appel, aucune clé réelle.
 */
import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (p === "openai" || p === "anthropic" ? "cle-de-test-1234567890abcdef" : null) }));

process.env.STUDIO_SYNA_AGENT = "1";

describe("garde-fou de dépense des essais réels", async () => {
  const { all, one, run } = await import("@/lib/db");
  const billing = await import("@/lib/billing");
  const { setSetting, setJsonSetting } = await import("@/lib/settings");
  const { runForUser } = await import("@/lib/ai/access");
  const { withTrace, CostCapReached } = await import("@/lib/ai/trace");
  const ws = await import("@/lib/ai/web-search");
  const E = await import("@/lib/ai/plafond-essai");
  const { account, project } = await import("./conversation209-fixtures");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const EUR = 1_000_000;
  const meta = { task: "image_generation", provider: "openai", model: "gpt-image-2.6-flare" };
  const sends: string[] = [];
  const original = { ...ws.webSearchDeps };
  const reponse = { status: "completed", model: "gpt-5.6-terra", usage: { input_tokens: 30000, output_tokens: 2000, input_tokens_details: { cached_tokens: 0 } }, output: [{ type: "message", content: [{ type: "output_text", annotations: [], text: JSON.stringify({ sources: [] }) }] }] };
  /** Les réglages d'Administration, tels qu'enregistrés (clé, valeur, date). */
  const reglages = () => JSON.stringify(all("SELECT key, value, secret, updated_at FROM settings ORDER BY key"));
  /** Allume l'essai, comme le studio privé d'essai (début : maintenant). */
  const essai = (euros: string) => { process.env.STUDIO_ESSAI_PLAFOND_EUROS = euros; process.env.STUDIO_ESSAI_DEBUT = String(Date.now()); };
  const search = (uid: string) => runForUser(uid, () => ws.openaiWebResearch({ userId: uid, projectId: null, usageKey: `k-${Math.random()}` }, "bougies parfumées"));

  beforeEach(() => {
    sends.length = 0;
    ws.webSearchDeps.count = async () => 600;
    ws.webSearchDeps.send = async () => (sends.push("send"), reponse);
    setSetting("ai.prices.checkedAt", String(Date.now()));
    setJsonSetting("ai.prices", { "openai:gpt-5.6-terra": { unit: "tokens", inputPerM: 2, outputPerM: 12 }, "openai:web_search": { unit: "call", perCall: 0.01 } });
    setJsonSetting("ai.textModels", { "openai:gpt-5.6-terra": { confirmedAt: Date.now() } });
    setJsonSetting("ai.routes", { strategy: { provider: "openai", model: "gpt-5.6-terra", effort: "medium" } });
  });
  afterEach(() => {
    Object.assign(ws.webSearchDeps, original);
    delete process.env.STUDIO_ESSAI_PLAFOND_EUROS;
    delete process.env.STUDIO_ESSAI_DEBUT;
  });

  it("sans réglage, aucun appel n'est jamais refusé et rien ne change", async () => {
    expect(E.reglageDeLEssai()).toBeNull();
    const u = await account();
    // Bien au-delà d'un euro : passe, comme avant.
    for (let i = 0; i < 3; i++) billing.settle(billing.reserve(u.id, 2 * EUR, meta), 2 * EUR, null, "image");
    await search(u.id);
    expect(sends).toEqual(["send"]);
    expect(() => E.assertSousLePlafondDeLEssai(Number.NaN, "job-sans-essai")).not.toThrow();
    expect(E.arretParLEssai("job-sans-essai")).toBeNull();
    // Un maximum inconnu reste refusé comme avant (le refus d'avant, pas celui de l'essai).
    let err: unknown;
    try { billing.reserve(u.id, Number.NaN, meta); } catch (e) { err = e; }
    expect(err).not.toBeInstanceOf(E.PlafondDeLEssaiAtteint);
  });

  it("le réglage se lit en euros (virgule permise) ; un plafond illisible ne laisse rien passer", () => {
    expect(E.reglageDeLEssai({ STUDIO_ESSAI_PLAFOND_EUROS: "1", STUDIO_ESSAI_DEBUT: "1764000000000" })).toEqual({ plafondMicro: EUR, debut: 1764000000000 });
    expect(E.reglageDeLEssai({ STUDIO_ESSAI_PLAFOND_EUROS: "1,50", STUDIO_ESSAI_DEBUT: "2026-11-24T10:00:00Z" })).toEqual({ plafondMicro: 1_500_000, debut: Date.parse("2026-11-24T10:00:00Z") });
    expect(E.reglageDeLEssai({ STUDIO_ESSAI_PLAFOND_EUROS: "un euro", STUDIO_ESSAI_DEBUT: "1" })!.plafondMicro).toBe(0);
    expect(E.reglageDeLEssai({ STUDIO_ESSAI_PLAFOND_EUROS: "" })).toBeNull();
  });

  it("avec un plafond, un appel dont le maximum ferait dépasser est refusé avant de partir : le fournisseur simulé n'est pas appelé", async () => {
    const u = await account();
    essai("0,30"); // le maximum d'une recherche (8 recherches, contenu compris) dépasse 0,30 €
    expect(ws.webSearchMaxMicro("openai", "gpt-5.6-terra", 600)).toBeGreaterThan(300_000);
    const avant = reglages();
    await expect(search(u.id)).rejects.toBeInstanceOf(E.PlafondDeLEssaiAtteint);
    expect(sends).toEqual([]);
    // Rien n'est réservé ni dépensé.
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM ai_reservations WHERE user_id=?", u.id)!.n).toBe(0);
    expect(E.depensesDeLEssai(Number(process.env.STUDIO_ESSAI_DEBUT))).toBe(0);
    expect(reglages()).toBe(avant);
  });

  it("un appel sous le plafond passe, et c'est son coût réel qui est ajouté à la somme", async () => {
    const u = await account();
    essai("1");
    const debut = Number(process.env.STUDIO_ESSAI_DEBUT);
    const max = ws.webSearchMaxMicro("openai", "gpt-5.6-terra", 600);
    await search(u.id);
    expect(sends).toEqual(["send"]);
    const r = one<{ amount: number; actual: number; status: string }>("SELECT amount, actual, status FROM ai_reservations WHERE user_id=?", u.id)!;
    expect(r.status).toBe("settled");
    expect(r.amount).toBe(max);
    expect(r.actual).toBeLessThan(max);
    // Le coût réel (jetons + recherches à 0,01 $ l'une, leur tarif), compté une fois.
    expect(E.depensesDeLEssai(debut)).toBe(r.actual);
    // Les recherches suivantes passent tant que le réel déjà compté plus le maximum tient dans 1 € ; la suivante ne part plus.
    while (E.depensesDeLEssai(debut) + max <= EUR) await search(u.id);
    const parties = sends.length;
    expect(parties).toBeGreaterThan(1);
    await expect(search(u.id)).rejects.toBeInstanceOf(E.PlafondDeLEssaiAtteint);
    expect(sends).toHaveLength(parties);
    expect(E.depensesDeLEssai(debut)).toBeLessThanOrEqual(EUR);
  });

  it("une reprise à la charge du Studio est comptée dans la même somme", async () => {
    const u = await account();
    essai("1");
    const debut = Number(process.env.STUDIO_ESSAI_DEBUT);
    billing.settle(billing.reserve(u.id, 400_000, meta), 400_000, null, "logo");
    billing.settle(billing.aLaChargeDuStudio(() => billing.reserve(u.id, 400_000, meta)), 300_000, null, "logo refait");
    expect(E.depensesDeLEssai(debut)).toBe(700_000);
    // Une reprise de plus à la charge du Studio : sa propre borne n'est pas en jeu ici, mais la somme de l'essai, si.
    let err: unknown;
    try { billing.aLaChargeDuStudio(() => billing.reserve(u.id, 400_000, meta)); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(E.PlafondDeLEssaiAtteint);
    expect((err as InstanceType<typeof E.PlafondDeLEssaiAtteint>).spentMicro).toBe(700_000);
    // Et une dépense du client aussi.
    expect(() => billing.reserve(u.id, 400_000, meta)).toThrow(E.PlafondDeLEssaiAtteint);
    // Ce qui tient encore passe.
    billing.settle(billing.aLaChargeDuStudio(() => billing.reserve(u.id, 300_000, meta)), 300_000, null, "logo refait");
    expect(E.depensesDeLEssai(debut)).toBe(EUR);
    // Une réservation encore tenue compte à son maximum : un appel en parallèle ne passe pas sous le même reste.
    essai("1");
    billing.reserve(u.id, 600_000, meta);
    expect(() => billing.reserve(u.id, 600_000, meta)).toThrow(E.PlafondDeLEssaiAtteint);
  });

  it("un appel sans maximum connu est refusé en mode essai", async () => {
    const u = await account();
    essai("1");
    for (const max of [Number.NaN, 0, -5, Number.POSITIVE_INFINITY]) {
      let err: unknown;
      try { billing.reserve(u.id, max, meta); } catch (e) { err = e; }
      expect(err).toBeInstanceOf(E.PlafondDeLEssaiAtteint);
      expect((err as InstanceType<typeof E.PlafondDeLEssaiAtteint>).raison).toBe("maximum_inconnu");
    }
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM ai_reservations WHERE user_id=?", u.id)!.n).toBe(0);
    // Un plafond sans début lisible : aucun appel payant ne part.
    process.env.STUDIO_ESSAI_DEBUT = "";
    expect(() => billing.reserve(u.id, 1000, meta)).toThrow(E.PlafondDeLEssaiAtteint);
  });

  it("la tâche de fond s'arrête sans relancer l'appel : échec définitif, jamais remise en file", async () => {
    const u = await account();
    const pid = project(u);
    essai("0,10");
    const { enqueue, claimNext, failJob, getJob } = await import("@/lib/jobs");
    const job = enqueue({ userId: u.id, projectId: pid, type: "essai.plafond", label: "Essai", payload: {} });
    const pris = claimNext(["essai.plafond"])!;
    expect(pris.id).toBe(job.id);
    // La chaîne attrape le refus (comme un plafond de tâche) et continue sans l'appel : le worker arrête quand même la tâche.
    await withTrace({ jobId: job.id }, async () => {
      try { billing.reserve(u.id, 200_000, meta); } catch (e) { expect(e).toBeInstanceOf(CostCapReached); }
    });
    const arret = E.arretParLEssai(job.id)!;
    expect(arret).toBeInstanceOf(E.PlafondDeLEssaiAtteint);
    expect(arret.permanent).toBe(true);
    expect(arret.message).toMatch(/plafond de dépense de l'essai atteint/);
    expect(arret.message).toMatch(/ne sera pas relancée/);
    expect(arret.message).not.toMatch(/€/);
    expect(E.arretParLEssai(job.id)).toBeNull(); // lu une fois
    failJob(pris, arret);
    const fin = getJob(job.id)!;
    expect(fin.status).toBe("failed");
    expect(fin.message).toMatch(/plafond de dépense de l'essai/);
    // Le worker lit l'arrêt de l'essai avant d'écrire le résultat d'une tâche.
    const worker = fs.readFileSync("worker/index.ts", "utf8");
    expect(worker.indexOf("arretParLEssai(job.id)")).toBeGreaterThan(-1);
    expect(worker.indexOf("arretParLEssai(job.id)")).toBeLessThan(worker.indexOf("completeJob(job.id, result)"));
  });

  it("SINA s'arrête proprement : elle dit que le plafond de l'essai est atteint, sans carte de budget, sans rien relancer", async () => {
    const u = await account();
    const pid = project(u);
    const { threadFor } = await import("@/lib/syna-agent/thread");
    const { submitMessage, runAgent, MESSAGE_PLAFOND_ESSAI } = await import("@/lib/syna-agent/loop");
    const { getRun } = await import("@/lib/syna-agent/store");
    const cid = threadFor(u, pid);
    essai("1");
    const avant = reglages();
    const r = submitMessage(u, cid, { requestId: `essai-${Math.random()}`, text: "Bonjour" });
    let appels = 0;
    const out = await fr(() => runAgent(r.id, r.job_id!, { reason: async () => { appels++; throw new E.PlafondDeLEssaiAtteint(900_000, 300_000, EUR); } }));
    expect(out).toMatchObject({ stopped: "plafond_essai" });
    expect(appels).toBe(1); // jamais relancé
    const fin = getRun(r.id)!;
    expect(fin.status).toBe("done");
    expect(fin.pending_json ?? null).toBeNull(); // pas de carte « augmente ton budget »
    const messages = all<{ role: string; content_json: string }>("SELECT role, content_json FROM syna_messages WHERE run_id=? ORDER BY rowid", r.id);
    const dernier = JSON.parse(messages.filter((m) => m.role === "assistant").at(-1)!.content_json);
    expect(dernier.message).toBe(await fr(() => MESSAGE_PLAFOND_ESSAI()));
    expect(dernier.message).toMatch(/plafond de dépense fixé pour cet essai est atteint/);
    expect(dernier.message).not.toMatch(/€|budget/);
    // Aucune nouvelle demande en file pour ce fil (seule celle qui vient de tourner, lancée ici sans worker).
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE type='syna.agent' AND status IN ('queued','running') AND payload LIKE ? AND id<>?", `%${r.id}%`, r.job_id)!.n).toBe(0);
    expect(reglages()).toBe(avant);
  });

  it("aucun réglage d'Administration n'est écrit, que l'appel passe ou soit refusé", async () => {
    const u = await account();
    const avant = reglages();
    essai("1");
    await search(u.id);
    billing.settle(billing.aLaChargeDuStudio(() => billing.reserve(u.id, 100_000, meta)), 100_000, null, "reprise");
    expect(() => billing.reserve(u.id, 5 * EUR, meta)).toThrow(E.PlafondDeLEssaiAtteint);
    expect(() => billing.reserve(u.id, Number.NaN, meta)).toThrow(E.PlafondDeLEssaiAtteint);
    expect(reglages()).toBe(avant);
    // Le code du garde-fou ne touche jamais aux réglages.
    const source = fs.readFileSync("src/lib/ai/plafond-essai.ts", "utf8");
    expect(source).not.toMatch(/setSetting|setJsonSetting|getJsonSetting|FROM settings|INTO settings|UPDATE settings/);
  });
});
