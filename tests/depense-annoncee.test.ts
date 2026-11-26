/**
 * LA DÉPENSE ANNONCÉE (26 novembre 2026). Ses mots : « Il faut arrêter de montrer des plafond aussi haut ça va faire peur
 * aux clients ». La carte n'annonce plus que le coût probable ; le plafond reste en coulisses. En échange, SINA ne dépasse
 * jamais en silence : avant un appel qui ferait dépasser le double de ce qui a été annoncé, la tâche s'arrête, SINA le dit
 * en une phrase et demande s'il veut continuer ; oui, elle reprend là où elle s'est arrêtée. Tout est simulé : aucun appel.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("la dépense annoncée : le coût probable seul, et l'arrêt à deux fois ce coût", async () => {
  const billing = await import("@/lib/billing");
  const { all, id, json, one, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { withTrace, CostCapReached, DepassementDeLAnnonce, arretParLAnnonce, arreteeParLAnnonce, depensesDeLaTache, SEUIL_DE_L_ANNONCE } = await import("@/lib/ai/trace");
  const jobs = await import("@/lib/jobs");
  const { account, project } = await import("./conversation209-fixtures");
  const { confirmationText, budgetInsuffisant, annonceDuDevis, runAgent, decidePending, submitMessage } = await import("@/lib/syna-agent/loop");
  const { phraseDuDepassement, TRAVAIL_CONTINUER } = await import("@/lib/syna-agent/depense-annoncee");
  const { coutProbableTu, budgetPctOf } = await import("@/lib/ai/budget-pct");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getRun } = await import("@/lib/syna-agent/store");
  const { trackJob } = await import("@/lib/syna-agent/budget");
  const { SINA_BRAND_JOB } = await import("@/lib/syna-agent/brand-chain");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const meta = { task: "image_generation", provider: "openai", model: "gpt-image-2.6-flare" };
  /** Un appel payé : réservé à son maximum, puis réglé à son coût réel. */
  const appel = (u: string, max: number, cout = max) => { const rid = billing.reserve(u, max, meta); billing.settle(rid, cout, null, "image"); };
  const SANS_PIRE_CAS = /au plus|at most|jusqu'à|up to|plafond|fourchette|pire|maximum/i;

  it("la carte n'annonce que le coût probable : « environ 18 % de ton budget IA du mois », jamais « au plus »", async () => {
    const u = await account(), pid = project(u) as string;
    const t: any = { name: "essai.payant", description: "Essai.", estimate: () => ({ maxMicro: 2_000_000, label: "x" }) };
    const avec = await fr(() => confirmationText(t, {}, {} as never, u.id, pid, { label: "tes trois identités", probableMicro: 1_000_000, maxMicro: 3_000_000 }));
    expect(avec).toContain(`Coût probable : ${await fr(() => coutProbableTu(u.id, 1_000_000, pid))}.`);
    expect(avec).toMatch(/Coût probable : environ [\d,]+ % de ton budget IA du mois\./);
    expect(avec).not.toMatch(SANS_PIRE_CAS);
    expect(avec).toContain("Si ça devait coûter bien plus, je m'arrête avant et je te demande.");
    // Sans coût probable donné par l'outil : le seul chiffre connu, annoncé comme probable, jamais comme « au plus ».
    const sans = await fr(() => confirmationText(t, {}, {} as never, u.id, pid, { label: "x", maxMicro: 2_000_000 }));
    expect(sans).toContain(`Coût probable : ${await fr(() => coutProbableTu(u.id, 2_000_000, pid))}.`);
    expect(sans).not.toMatch(SANS_PIRE_CAS);
    expect(annonceDuDevis({ maxMicro: 2_000_000 })).toBe(2_000_000);
    expect(annonceDuDevis({ maxMicro: 2_000_000, probableMicro: 3_000_000 })).toBe(2_000_000);
    expect(annonceDuDevis({ maxMicro: 2_000_000, probableMicro: 700_000 })).toBe(700_000);
    // Une petite dépense : « moins de 0,1 % », jamais « environ < 0,1 % ».
    expect(await fr(() => coutProbableTu(u.id, 1, pid))).toMatch(/^moins de 0,1 % de ton budget IA du mois$/);
  });

  it("le budget qui manque est dit sans pire cas : ce qui reste, et le coût probable s'il dépasse ce reste", async () => {
    const u = await account();
    run("UPDATE wallets SET monthly_allowance = 43000000, monthly_used = 37000000, topup_balance = 0, reserved = 0, reserved_topup = 0 WHERE user_id = ?", u.id);
    const juste = await fr(() => budgetInsuffisant(u.id, null, 16_180_000, 5_000_000));
    expect(juste).toMatch(/^Pas lancé, rien n'est payé : il ne reste que .*% de ton budget IA pour ce mois, pas assez pour mener ce travail jusqu'au bout\./);
    expect(juste).not.toMatch(/peut coûter|jusqu'à|il coûte/);
    const trop = await fr(() => budgetInsuffisant(u.id, null, 16_180_000, 8_000_000));
    expect(trop).toContain("(il coûte environ");
    expect(trop).not.toMatch(/peut coûter|jusqu'à/);
    expect(trop).not.toMatch(/€/);
  });

  it("avant l'appel qui ferait dépasser deux fois le coût annoncé, la tâche s'arrête ; rien d'autre ne part", async () => {
    expect(SEUIL_DE_L_ANNONCE).toBe(2);
    const u = await account(), jobId = `job-${id()}`;
    await withTrace({ jobId, costCapMicro: 10_000_000, annonceMicro: 1_000_000 }, async () => {
      // Le premier appel part toujours, même plus cher que l'annonce entière (rien n'est encore dépensé).
      appel(u.id, 1_100_000, 600_000);
      appel(u.id, 700_000, 600_000); // 0,6 + 0,7 ≤ 2
      appel(u.id, 700_000, 700_000); // 1,2 + 0,7 ≤ 2
      expect(depensesDeLaTache(jobId).client).toBe(1_900_000);
      let err: unknown;
      try { appel(u.id, 200_000); } catch (e) { err = e; }
      expect(err).toBeInstanceOf(DepassementDeLAnnonce);
      expect(err).toBeInstanceOf(CostCapReached); // les chaînes s'arrêtent comme à un plafond
      expect((err as InstanceType<typeof DepassementDeLAnnonce>).annonceMicro).toBe(1_000_000);
      expect((err as Error).message).not.toMatch(/€/);
      // Rien n'a été réservé pour l'appel refusé, et plus rien ne part, même une reprise à la charge du Studio.
      expect(depensesDeLaTache(jobId).client).toBe(1_900_000);
      expect(() => billing.aLaChargeDuStudio(() => billing.reserve(u.id, 10_000, meta))).toThrow(DepassementDeLAnnonce);
      expect(arreteeParLAnnonce(jobId)).toBeTruthy();
    });
    expect(arretParLAnnonce(jobId)).toBeInstanceOf(DepassementDeLAnnonce);
    expect(arretParLAnnonce(jobId)).toBeNull();
    // Sans dépense annoncée (ancienne tâche, essai), rien ne change : seul le plafond compte.
    const autre = `job-${id()}`;
    await withTrace({ jobId: autre, costCapMicro: 10_000_000 }, async () => { for (let i = 0; i < 5; i++) appel(u.id, 900_000); });
    expect(depensesDeLaTache(autre).client).toBe(4_500_000);
  });

  it("la dépense annoncée voyage avec la tâche payante ; une étape arrêtée n'est jamais gardée comme point de reprise", async () => {
    const u = await account(), pid = project(u) as string;
    const j = jobs.avecLaDepenseAnnoncee(1_000_000, () => jobs.enqueue({ userId: u.id, projectId: pid, type: SINA_BRAND_JOB, payload: { projectId: pid, capMicro: 3_000_000 } }));
    expect(jobs.annonceDe(json(j.payload, {}))).toBe(1_000_000);
    const gratuite = jobs.avecLaDepenseAnnoncee(1_000_000, () => jobs.enqueue({ userId: u.id, projectId: pid, type: "syna.agent", payload: { runId: "x" } }));
    expect(jobs.annonceDe(json(gratuite.payload, {}))).toBeUndefined();
    const sans = jobs.enqueue({ userId: u.id, projectId: pid, type: SINA_BRAND_JOB, payload: { projectId: pid, capMicro: 3_000_000 } });
    expect(jobs.annonceDe(json(sans.payload, {}))).toBeUndefined();
    // L'exécution, comme le worker : la première étape finie est gardée ; la seconde, arrêtée en route par une chaîne qui
    // avale l'arrêt (comme à un plafond), ne l'est pas.
    const ctx = new jobs.JobContext(jobs.getJob(j.id)!);
    await withTrace({ jobId: j.id, costCapMicro: 3_000_000, annonceMicro: 1_000_000 }, async () => {
      await ctx.step("premiere", async () => { appel(u.id, 1_500_000, 1_500_000); return "faite"; });
      await expect(ctx.step("seconde", async () => { try { appel(u.id, 900_000); } catch (e) { if (!(e instanceof CostCapReached)) throw e; } return "incomplete"; })).rejects.toBeInstanceOf(DepassementDeLAnnonce);
    });
    expect(Object.keys(jobs.getJob(j.id)!.checkpoint ? json<Record<string, unknown>>(jobs.getJob(j.id)!.checkpoint!, {}) : {})).toEqual(["premiere"]);
    expect(arretParLAnnonce(j.id)).toBeInstanceOf(DepassementDeLAnnonce);
    // Le worker la met en attente de l'accord du client ; « oui » la relance, avec l'annonce relevée.
    jobs.mettreEnAttenteDAccord(j.id, { depenseMicro: depensesDeLaTache(j.id).client, annonceMicro: 1_000_000 });
    const enAttente = jobs.getJob(j.id)!;
    expect(enAttente.status).toBe("paused");
    expect(jobs.attenteDAccordDe(enAttente)).toMatchObject({ depenseMicro: 1_500_000, annonceMicro: 1_000_000 });
    expect(jobs.leverLAttenteDAccord(j.id)).toBe(true);
    const p = json<Record<string, unknown>>(jobs.getJob(j.id)!.payload, {});
    expect(p.attenteAccord).toBeUndefined();
    expect(p.annonceMicro).toBe(2_500_000); // ce qui est déjà dépensé, plus l'annonce d'origine
    expect(p.annonceDOrigineMicro).toBe(1_000_000);
    jobs.resumeJob(j.id);
    expect(jobs.getJob(j.id)!.status).toBe("queued");
    // « Reprendre » dans le suivi des tâches est aussi ce oui.
    jobs.mettreEnAttenteDAccord(j.id, { depenseMicro: 5_200_000, annonceMicro: 2_500_000 });
    jobs.resumeJob(j.id);
    expect(json<Record<string, unknown>>(jobs.getJob(j.id)!.payload, {}).annonceMicro).toBe(6_200_000);
    expect(jobs.getJob(j.id)!.status).toBe("queued");
  });

  it("le worker met en attente la tâche arrêtée, sans la finir ni la faire échouer", () => {
    const src = fs.readFileSync("worker/index.ts", "utf8");
    expect(src).toContain("annonceMicro: annonceDe(ctx.payload)");
    const i = src.indexOf("if (attendreLAccord(job.id)) return;"), c = src.indexOf("completeJob(job.id, result)");
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(c);
    expect(src).toContain("} else if (attendreLAccord(job.id)) {");
  });

  it("SINA le dit en une phrase, tutoyée, sans mot technique, et demande ; oui : la tâche reprend ; non : elle est arrêtée", async () => {
    const user = await account(), pid = project(user) as string, cid = threadFor(user as never, pid);
    const r = submitMessage(user as never, cid, { requestId: `annonce-${Math.random()}`, text: "Vas-y, crée ma marque." });
    const jid = jobs.avecLaDepenseAnnoncee(1_000_000, () => jobs.enqueue({ userId: user.id, projectId: pid, type: SINA_BRAND_JOB, payload: { projectId: pid, capMicro: 3_000_000 } })).id;
    trackJob(cid, r.id, jid, "native");
    run("UPDATE syna_runs SET status='waiting_jobs', waiting_jobs=? WHERE id=?", JSON.stringify([jid]), r.id);
    jobs.mettreEnAttenteDAccord(jid, { depenseMicro: 1_900_000, annonceMicro: 1_000_000 });
    const sansModele = { reason: async () => { throw new Error("aucune réflexion payante attendue"); } };
    await fr(() => runAgent(r.id, getRun(r.id)!.job_id!, sansModele as never));
    const run1 = getRun(r.id)!;
    expect(run1.status).toBe("waiting_confirmation");
    const pending = json<any>(run1.pending_json!, {});
    expect(pending.tool).toBe(TRAVAIL_CONTINUER);
    expect(pending.args).toEqual({ job: jid });
    expect(pending.preview).not.toMatch(SANS_PIRE_CAS);
    const dits = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='assistant' ORDER BY seq", cid).map((m) => json<any>(m.content_json, {}));
    const phrase = dits.at(-1)!.message as string;
    expect(phrase).toBe(await fr(() => phraseDuDepassement(user.id, pid, { depenseMicro: 1_900_000, annonceMicro: 1_000_000 })));
    expect(phrase.split(/(?<=[.!?])\s/).length).toBe(1); // une seule phrase
    expect(phrase).toMatch(/\btu\b|\bte\b|\bt'/);
    expect(phrase).not.toMatch(/\b(vous|votre|vos)\b/i);
    expect(phrase).not.toMatch(/€|plafond|réserv|tâche|appel|annonceMicro|job/i);
    expect(phrase).toMatch(/environ [\d,]+ % de ton budget IA du mois/);
    expect(phrase).toMatch(/tu veux que je continue \?$/);
    expect(budgetPctOf(user.id, 1_900_000, pid)).not.toBeNull();
    // Oui : la tâche reprend là où elle s'est arrêtée, avec l'annonce relevée ; SINA attend sa fin.
    decidePending(user as never, cid, { pendingId: pending.id, approve: true });
    await fr(() => runAgent(r.id, getRun(r.id)!.job_id!, sansModele as never));
    const j = jobs.getJob(jid)!;
    expect(j.status).toBe("queued");
    expect(json<any>(j.payload, {}).annonceMicro).toBe(2_900_000);
    expect(getRun(r.id)!.status).toBe("waiting_jobs");
    expect(json<string[]>(getRun(r.id)!.waiting_jobs, [])).toEqual([jid]);
    // Elle s'arrête de nouveau ; cette fois il dit non : la tâche est arrêtée, rien de plus n'est dépensé.
    jobs.mettreEnAttenteDAccord(jid, { depenseMicro: 6_000_000, annonceMicro: 2_900_000 });
    await fr(() => runAgent(r.id, getRun(r.id)!.job_id!, sansModele as never));
    const p2 = json<any>(getRun(r.id)!.pending_json!, {});
    expect(p2.tool).toBe(TRAVAIL_CONTINUER);
    decidePending(user as never, cid, { pendingId: p2.id, approve: false });
    await fr(() => runAgent(r.id, getRun(r.id)!.job_id!, { reason: async () => ({ message: "D'accord, j'arrête là : ce qui est fait est gardé.", actions: [], done: true }) } as never));
    expect(jobs.getJob(jid)!.status).toBe("cancelled");
    const outils = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='tool' ORDER BY seq", cid).map((m) => json<any>(m.content_json, {}));
    expect(outils.some((m) => m.tool === TRAVAIL_CONTINUER && /arrêter là/.test(m.summary))).toBe(true);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM syna_messages WHERE conversation_id=? AND role='assistant'", cid)!.n).toBeGreaterThanOrEqual(3);
  });

  it("le contexte de SINA ne lui donne plus de plafond, de « au plus » ni de pire cas", () => {
    const loop = fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8"), prompt = fs.readFileSync("src/lib/syna-agent/prompt.ts", "utf8"), journey = fs.readFileSync("src/lib/syna-agent/journey.ts", "utf8");
    expect(loop).not.toContain("; au plus ${");
    expect(loop).not.toContain("au plus ${budgetPctTu");
    expect(loop).not.toContain("ce travail peut coûter jusqu'à ${");
    expect(prompt).not.toContain("le coût probable et le plafond");
    expect(journey).not.toContain("coût probable et plafond");
    expect(fs.readFileSync("src/lib/syna-agent/tools/gallery.ts", "utf8")).not.toContain("au plus ${budgetPctTu");
    expect(fs.readFileSync("src/lib/syna-agent/tools/atelier.ts", "utf8")).not.toContain("et « au plus » quand il est donné");
  });
});
