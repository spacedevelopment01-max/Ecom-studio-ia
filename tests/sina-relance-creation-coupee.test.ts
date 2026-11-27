/**
 * Essai réel du 19 novembre 2026 (Bécane) : le serveur d'essai a redémarré en plein appel payant de la conception. La
 * création s'est arrêtée (règle du propriétaire : un appel au résultat incertain n'est jamais relancé tout seul) ; le
 * client a demandé de relancer, et la nouvelle création a tout repayé, y compris le premier passage de la conception
 * déjà payé (1,18 €) et gardé par le Studio. Désormais, « relancer » fait repartir la même création : ce qui est payé
 * est repris tel quel, seul l'appel coupé est renvoyé, une fois, avec l'accord du client sur la carte. Sans IA.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("relancer une création de site coupée, sans repayer ce qui est fait", async () => {
  const { cleDeRelance } = await import("@/lib/billing");
  const { withTrace } = await import("@/lib/ai/trace");
  const { id, now, run } = await import("@/lib/db");
  const S = await import("@/lib/syna-agent/custom-theme/site-job");

  const incertain = { status: "uncertain" as const, result: null, provider_receipt: null };

  it("l'appel coupé se renvoie sous sa clé de relance, seulement avec l'accord du client, et jamais un appel payé ou récupérable", async () => {
    // Sans relance accordée : jamais (la règle du propriétaire tient).
    expect(cleDeRelance(incertain, "job1:design:1")).toBeNull();
    await withTrace({ relance: 1 }, async () => {
      expect(cleDeRelance(incertain, "job1:design:1")).toBe("job1:design:1~relance1");
      // Déjà payé, avec sa réponse : repris tel quel, jamais renvoyé.
      expect(cleDeRelance({ ...incertain, status: "settled", result: "{}" } as never, "job1:design:0")).toBeNull();
      // Un reçu du fournisseur : récupéré en lecture seule, jamais renvoyé.
      expect(cleDeRelance({ ...incertain, provider_receipt: "{}" }, "k")).toBeNull();
      expect(cleDeRelance(undefined, "k")).toBeNull();
      expect(cleDeRelance(incertain, undefined)).toBeNull();
    });
    await withTrace({ relance: 2 }, async () => expect(cleDeRelance(incertain, "k")).toBe("k~relance2"));
  });

  it("le texte, la recherche et les images passent tous par la clé de relance ; la tâche la reçoit de son accord", () => {
    expect(fs.readFileSync("src/lib/ai/llm.ts", "utf8")).toContain("const relance = cleDeRelance(previous, operation.usageKey);");
    expect(fs.readFileSync("src/lib/ai/web-search.ts", "utf8")).toContain("const relance = cleDeRelance(previous, operation.usageKey);");
    expect(fs.readFileSync("src/lib/ai/media-providers.ts", "utf8")).toContain("const relance = cleDeRelance(previous, ctx.usageKey);");
    expect(fs.readFileSync("worker/index.ts", "utf8")).toContain("relance: relanceOf(ctx.payload),");
  });

  it("la création coupée se retrouve (la dernière du projet, en échec, de moins de sept jours), et ce qu'elle a déjà payé se compte", () => {
    const projet = `p-${id()}`, user = `u-${id()}`, t = now();
    expect(S.creationCoupee(projet)).toBeNull();
    const job = id();
    run("INSERT INTO jobs (id, user_id, project_id, type, payload, status, run_at, created_at, updated_at, finished_at, error) VALUES (?,?,?,?,?,?,?,?,?,?,?)", job, user, projet, S.SINA_SITE_JOB, JSON.stringify({ projectId: projet, consigne: "Joyeux et franc", capMicro: 10_000_000 }), "failed", t, t, t, t, "Interrompue pendant un appel IA payant (le traitement s'est arrêté avant l'arrivée du résultat).");
    expect(S.creationCoupee(projet)).toMatchObject({ id: job, payload: { consigne: "Joyeux et franc" } });
    // Payé avec sa réponse (repris) : compté ; incertain (à renvoyer) : pas compté.
    run("INSERT INTO ai_reservations (id, user_id, amount, status, job_id, project_id, actual, created_at, result) VALUES (?,?,?,?,?,?,?,?,?)", id(), user, 1_750_000, "settled", job, projet, 1_180_000, t, "{}");
    run("INSERT INTO ai_reservations (id, user_id, amount, status, job_id, project_id, actual, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), user, 1_800_000, "uncertain", job, projet, 1_800_000, t);
    expect(S.acquisMicro(job)).toBe(1_180_000);
    // Une création plus récente qui a réussi : plus rien à relancer.
    run("INSERT INTO jobs (id, user_id, project_id, type, payload, status, run_at, created_at, updated_at, finished_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), user, projet, S.SINA_SITE_JOB, "{}", "done", t, t + 1, t + 1, t + 1);
    expect(S.creationCoupee(projet)).toBeNull();
    // Refusée pour une autre raison (pas une coupure) : elle se refait, jamais relancée à l'identique.
    const refusee = `p-${id()}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, payload, status, run_at, created_at, updated_at, finished_at, error) VALUES (?,?,?,?,?,?,?,?,?,?,?)", id(), user, refusee, S.SINA_SITE_JOB, "{}", "failed", t, t, t, t, "Conception refusée par le contrôle du Studio");
    expect(S.creationCoupee(refusee)).toBeNull();
    // Trop ancienne : elle se refait.
    const vieux = `p-${id()}`, ancien = t - (S.RELANCE_JOURS + 1) * 86_400_000;
    run("INSERT INTO jobs (id, user_id, project_id, type, payload, status, run_at, created_at, updated_at, finished_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), user, vieux, S.SINA_SITE_JOB, "{}", "failed", ancien, ancien, ancien, ancien);
    run("UPDATE jobs SET error = 'Interrompue' WHERE project_id = ?", vieux);
    expect(S.creationCoupee(vieux)).toBeNull();
  });

  it("textes du client alignés (26 novembre 2026) : la création coupée se reconnaît par son code, plus par son texte", async () => {
    const { failJob, getJob, CODE_DEJA_LANCEE, CODE_TACHE_COUPEE, ErreurAuDetailDuStudio, UserFacingError } = await import("@/lib/jobs");
    const { operationPending } = await import("@/lib/billing");
    const user = `u-${id()}`, t = now();
    const echoue = (projet: string, err: unknown) => {
      const job = id();
      run("INSERT INTO jobs (id, user_id, project_id, type, payload, status, run_at, created_at, updated_at, attempts, max_attempts) VALUES (?,?,?,?,?,?,?,?,?,?,?)", job, user, projet, S.SINA_SITE_JOB, JSON.stringify({ projectId: projet, consigne: "Chaleureux", capMicro: 10_000_000 }), "running", t, t, t, 1, 3);
      failJob(getJob(job)!, err, { permanent: true });
      return job;
    };
    // L'étape déjà lancée, avec sa nouvelle phrase (tutoyée, sans « déjà été envoyée ») : reconnue par son code.
    let deja: unknown; try { operationPending(); } catch (e) { deja = e; }
    expect((deja as Error).message).not.toMatch(/déjà été envoyée|already been sent|incertain|uncertain/);
    const p1 = `p-${id()}`, j1 = echoue(p1, deja);
    expect(JSON.parse(getJob(j1)!.checkpoint).failureCode).toBe(CODE_DEJA_LANCEE);
    expect(S.creationCoupee(p1)).toMatchObject({ id: j1, payload: { consigne: "Chaleureux" } });
    // La tâche coupée en route : le client lit la phrase de SINA, le code fait la reprise.
    const p2 = `p-${id()}`, j2 = echoue(p2, new ErreurAuDetailDuStudio("détail pour le Studio", "J'ai gardé tout ce qui est fait.", CODE_TACHE_COUPEE));
    expect(getJob(j2)!.message).toBe("J'ai gardé tout ce qui est fait.");
    expect(S.creationCoupee(p2)).toMatchObject({ id: j2 });
    // Un autre refus, même si son texte contient « incertain » : il se refait, jamais relancé à l'identique.
    const p3 = `p-${id()}`;
    echoue(p3, new UserFacingError("Résultat incertain du contrôle des faits", "COPY_FACTS_REJECTED"));
    expect(S.creationCoupee(p3)).toBeNull();
  });

  it("le prix de la relance : ce qui reste, jamais moins d'un cinquième du prix probable ; le plafond garde la marge", () => {
    const full = { probableMicro: 6_000_000, maxMicro: 9_000_000, label: "site" };
    const q = S.relanceQuote(full, 1_180_000);
    expect(q.probableMicro).toBe(4_820_000);
    expect(q.maxMicro).toBe(Math.max(Math.round(4_820_000 * S.MARGE_PLAFOND_SITE), 9_000_000 - 1_180_000));
    expect(q.label).toMatch(/repris sans être repayé/);
    expect(S.relanceQuote(full, 8_000_000).probableMicro).toBe(1_200_000);
  });

  it("site.create avec relancer fait repartir la même tâche (sa consigne d'alors, plafond = déjà engagé + ce qui reste), et SINA le sait", () => {
    const src = fs.readFileSync("src/lib/syna-agent/custom-theme/site-job.ts", "utf8");
    expect(src).toContain("const payload: SitePayload = { ...c.payload, conversationId: ctx.conversationId, runId: ctx.runId, relance: (c.payload.relance ?? 0) + 1, capMicro: jobSpentMicro(c.id) + q.maxMicro };");
    expect(src).toContain("retryJob(c.id);");
    expect(S.siteCreateTool.args.safeParse({ relancer: true }).success).toBe(true);
    expect(S.siteCreateTool.description).toMatch(/relancer:true quand la création de son site s'est arrêtée en route/);
    expect(fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8")).toContain("site.create avec relancer:true");
  });
});
