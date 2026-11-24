/**
 * DEUX PLAFONDS PAR TÂCHE (23 novembre 2026). Règle du propriétaire (LE-STUDIO-DE-A-A-Z, partie 13) : « une erreur de SINA
 * est toujours corrigée sans rien compter ; un changement de goût du client passe par son budget du mois ». Le plafond du
 * client (le « au plus » de sa carte) ne couvre que ce qu'il paie ; la borne du Studio couvre les reprises à sa charge ; la
 * tâche s'arrête toujours à la somme des deux. Et les planches incomplètes se lisent sur leur contenu (planches d'avant
 * la correction, sans drapeau : essai réel de Nadia). Tout est simulé : aucun appel, aucune clé.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { route } from "./sina-routes-fixtures";

describe("deux plafonds : le client et le Studio", async () => {
  const billing = await import("@/lib/billing");
  const { one, run, id } = await import("@/lib/db");
  const { withTrace, CostCapReached, depensesDeLaTache } = await import("@/lib/ai/trace");
  const { borneDuStudio, borneDuStudioDe } = await import("@/lib/ai/borne-du-studio");
  const { jobSpentMicro } = await import("@/lib/syna-agent/budget");
  const { assertAiAllowed, aiActiveFor } = await import("@/lib/ai/access");
  const { account } = await import("./conversation209-fixtures");

  const CARTE = 1_380_000; // « refaire 3 logos » : 1,38 € au plus
  const ESSAI = CARTE / 3; // un logo dessiné et relu
  const meta = { task: "image_generation", provider: "openai", model: "gpt-image-2.6-flare" };
  const used = (u: string) => one<{ monthly_used: number }>("SELECT monthly_used FROM wallets WHERE user_id=?", u)!.monthly_used;
  /** Un essai payé : réservé puis réglé à son coût. */
  const essai = (u: string, studio: boolean, cout = ESSAI) => {
    const rid = studio ? billing.aLaChargeDuStudio(() => billing.reserve(u, cout, meta)) : billing.reserve(u, cout, meta);
    billing.settle(rid, cout, null, studio ? "logo refait" : "logo");
  };
  /** La tâche telle que le moteur la lance : ses deux plafonds lus dans sa charge. */
  const tache = <T,>(payload: Record<string, unknown>, fn: (jobId: string) => Promise<T>) => {
    const jobId = `job-${id()}`;
    return withTrace({ jobId, costCapMicro: (payload.costCapMicro ?? payload.capMicro) as number, studioCapMicro: borneDuStudioDe(payload) }, () => fn(jobId));
  };

  it("la carte « refaire 3 logos » à 1,38 € : trois essais par logo sur les trois identités, seule la part du client comptée, arrêt à la borne du Studio", async () => {
    const u = await account();
    const avant = used(u.id);
    await tache({ capMicro: CARTE, studioCapMicro: borneDuStudio(CARTE) }, async (jobId) => {
      for (const _identite of ["A", "B", "C"]) {
        essai(u.id, false); // premier essai : compté au client
        essai(u.id, true); essai(u.id, true); // deux reprises : à la charge du Studio
      }
      const d = depensesDeLaTache(jobId);
      expect(d.client).toBe(CARTE);
      expect(d.studio).toBe(2 * CARTE);
      expect(jobSpentMicro(jobId)).toBe(CARTE);
      // Une reprise de plus : la borne du Studio est atteinte, rien ne part.
      expect(() => essai(u.id, true)).toThrow(CostCapReached);
      try { essai(u.id, true); } catch (e) { expect((e as InstanceType<typeof CostCapReached>).studio).toBe(true); expect((e as Error).message).not.toMatch(/€/); }
    });
    expect(used(u.id) - avant).toBe(CARTE);
    expect(one<{ s: number }>("SELECT -SUM(amount) s FROM ledger WHERE user_id=? AND type='studio'", u.id)!.s).toBe(2 * CARTE);
  });

  it("une reprise du Studio passe même quand le budget du mois du client est épuisé, sans le toucher", async () => {
    const u = await account();
    const pid = one<{ id: string }>("SELECT project_id id FROM subscriptions WHERE user_id=?", u.id)?.id ?? null;
    run("UPDATE wallets SET monthly_used = monthly_allowance, topup_balance = 0 WHERE user_id = ?", u.id);
    const avant = used(u.id);
    await tache({ capMicro: CARTE }, async () => {
      expect(() => billing.reserve(u.id, ESSAI, meta)).toThrow(); // le client, lui, ne peut plus dépenser
      expect(() => assertAiAllowed(u.id, pid)).toThrow();
      billing.aLaChargeDuStudio(() => { assertAiAllowed(u.id, pid); expect(aiActiveFor(u.id, pid)).toBe(true); });
      essai(u.id, true);
    });
    expect(used(u.id)).toBe(avant);
  });

  it("une dépense du client ne peut pas utiliser la borne du Studio", async () => {
    const u = await account();
    await tache({ capMicro: CARTE }, async (jobId) => {
      for (let i = 0; i < 3; i++) essai(u.id, false);
      // La carte est pleine ; la borne du Studio est intacte, mais le client n'y a pas droit.
      expect(depensesDeLaTache(jobId).studio).toBe(0);
      let err: unknown;
      try { essai(u.id, false, 1000); } catch (e) { err = e; }
      expect(err).toBeInstanceOf(CostCapReached);
      expect((err as InstanceType<typeof CostCapReached>).studio).toBe(false);
      expect((err as InstanceType<typeof CostCapReached>).capMicro).toBe(CARTE);
    });
  });

  it("la somme des deux plafonds arrête tout", async () => {
    const u = await account();
    await tache({ capMicro: CARTE }, async (jobId) => {
      // Une reprise du Studio facturée au-delà de ce qu'elle avait réservé (dépassement du fournisseur) : la part du
      // Studio dépasse sa borne.
      const rid = billing.aLaChargeDuStudio(() => billing.reserve(u.id, ESSAI, meta));
      billing.settle(rid, 3 * CARTE, null, "dépassement");
      expect(depensesDeLaTache(jobId).studio).toBeGreaterThan(borneDuStudio(CARTE));
      // Une dépense du client tient dans sa carte (rien de compté pour lui encore) mais pas dans la somme : bloquée.
      let err: unknown;
      try { essai(u.id, false); } catch (e) { err = e; }
      expect(err).toBeInstanceOf(CostCapReached);
      expect((err as InstanceType<typeof CostCapReached>).capMicro).toBe(CARTE + borneDuStudio(CARTE));
    });
  });

  it("une ancienne tâche, enregistrée avec un seul plafond, marche encore : sa borne du Studio se calcule sur ce plafond", async () => {
    expect(borneDuStudioDe({ capMicro: CARTE })).toBe(2 * CARTE);
    expect(borneDuStudioDe({ costCapMicro: CARTE })).toBe(2 * CARTE);
    expect(borneDuStudioDe({ capMicro: CARTE, studio: true })).toBe(3 * CARTE); // une planche à finir : tout est à la charge du Studio
    expect(borneDuStudioDe({ capMicro: CARTE, studioCapMicro: 123 })).toBe(123);
    expect(borneDuStudioDe({})).toBeUndefined();
    expect(borneDuStudioDe({ costCapMicro: 0 })).toBe(0);
    // Le moteur commun lit la borne de chaque tâche.
    expect(fs.readFileSync("worker/index.ts", "utf8")).toContain("studioCapMicro: borneDuStudioDe(ctx.payload)");
    const u = await account();
    await tache({ capMicro: CARTE }, async () => {
      for (let i = 0; i < 3; i++) { essai(u.id, false); essai(u.id, true); essai(u.id, true); }
    });
    // Une portée qui n'a que le plafond du client (aucune borne écrite) : la même borne, deux fois le plafond.
    await withTrace({ jobId: `job-${id()}`, costCapMicro: CARTE }, async () => {
      for (let i = 0; i < 6; i++) essai(u.id, true);
      expect(() => essai(u.id, true)).toThrow(CostCapReached);
    });
  });
});

describe("planches d'avant la correction : incomplètes d'après leur contenu", async () => {
  const J = await import("@/lib/syna-agent/journey");
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { finirPlanchesGardees, deuxPlafonds } = await import("@/lib/syna-agent/tools/identity");
  const C = await import("@/lib/syna-agent/brand-chain");
  const { borneDuStudio } = await import("@/lib/ai/borne-du-studio");
  const { run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();

  /** Trois planches sans logo (grande scène et haut du site gardés), sans drapeau « gardée de côté ». */
  async function nadia() {
    const user = await account();
    const pid = project(user) as string;
    const cid = threadFor(user, pid);
    J.updateJourney(cid, (x) => {
      x.identities = { list: (["A", "B", "C"] as const).map((k) => { const r = route(k) as any; return { ...r, board: { ...r.board, images: { hero: { id: `hero-${k}` }, site: { id: `site-${k}` } } } }; }), issues: [], comparison: "", at: 1, round: 1 } as any;
    });
    return { user, pid, cid, ctx: { user, conversationId: cid, runId: `nadia-${id()}`, projectId: pid, attachment: () => null } as any };
  }
  const { id } = await import("@/lib/db");

  it("ni montrées, ni proposées par SINA, ni choisissables ; les finir est à la charge du Studio, avec ses deux montants", async () => {
    const t = await nadia();
    const j = J.journeyOf(t.cid);
    expect(j.identities!.incompletes).toBeUndefined();
    expect(J.planchesIncompletes(j)).toEqual(["A", "B", "C"].map((key) => ({ key, manque: ["logo"] })));
    expect(J.planchesMontrees(j)).toEqual([]);
    // L'écran : aucune carte choisissable.
    expect(fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8")).toContain("list: planchesMontrees(j).map(cardOf)");
    // Le contexte de SINA : elle ne propose pas de choisir, elle propose de finir, à sa charge.
    const contexte = J.journeyContext({ ...j, steps: { ...j.steps, 0: { status: "done" } as any, 1: { status: "doing" } as any } } as any);
    expect(contexte).toMatch(/AUCUNE planche n'est montrée/);
    expect(contexte).not.toMatch(/demande laquelle il préfère/);
    expect(contexte).toMatch(/À ma charge : 0 % de ton budget/);
    // identity.choose les refuse.
    const choix = await fr(() => getTool("identity.choose")!.run(t.ctx, getTool("identity.choose")!.args.parse({ key: "A" })));
    expect(choix).toMatchObject({ ok: false });
    // Les finir (faire leur logo, par la méthode des graphistes, une planche à la fois) : une reprise de SINA, à la charge
    // du Studio, avec ses deux montants (le prix de la recherche et la borne des reprises du Studio).
    const est: any = await fr(() => getTool("logo.pistes")!.estimate!(t.ctx, getTool("logo.pistes")!.args.parse({ planche: "A" }) as never));
    expect(est.studio).toBe(true);
    const { devisDeLaRecherche } = await import("@/lib/syna-agent/logo-graphistes");
    const d = devisDeLaRecherche();
    expect(est).toMatchObject({ maxMicro: d.maxMicro, studioMaxMicro: d.studioMaxMicro });
    void C; void borneDuStudio; void deuxPlafonds; void finirPlanchesGardees;
    // La carte du client dit « 0 % ».
    const { confirmationText } = await import("@/lib/syna-agent/loop");
    expect(await fr(() => confirmationText(getTool("logo.pistes")!, { planche: "A" }, t.ctx, t.user.id, t.pid, est))).toMatch(/À ma charge : 0 % de ton budget/);
  });
});
