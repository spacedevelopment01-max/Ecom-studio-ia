/**
 * Les travaux payés, mesurés (économies du 22 novembre 2026) : le prix probable de la carte vient des coûts réellement
 * dépensés par les derniers travaux du même genre (plafond inchangé), et l'administration lit le coût par travail
 * accepté (payé, gardé, jeté). Aucun appel d'IA : les reçus sont écrits à la main.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("les travaux payés", async () => {
  const T = await import("@/lib/syna-agent/travaux");
  const { run, id } = await import("@/lib/db");
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");

  /** Une tâche finie de l'outil, avec son plafond et ce qu'elle a réellement coûté. */
  const travail = (u: { id: string }, pid: string, cid: string, tool: string, cap: number, cost: number, at = Date.now()) => {
    const jid = `job-${id()}`;
    run("INSERT INTO jobs(id,user_id,project_id,type,payload,status,run_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", jid, u.id, pid, "syna.brand", JSON.stringify({ capMicro: cap }), "done", at, at, at);
    T.noterTravail(tool, [jid], { userId: u.id, projectId: pid, conversationId: cid });
    run("UPDATE travaux_payes SET created_at=? WHERE job_id=?", at, jid);
    run("INSERT INTO ai_calls(id,created_at,user_id,project_id,job_id,task,provider,requested_model,unit,cost,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)", `c-${jid}`, at, u.id, pid, jid, "strategy", "anthropic", "claude-opus-5-5", "tokens", cost, "ok");
    return jid;
  };

  it("carte juste : trop peu de mesures, l'estimation reste ; dès trois travaux finis, le probable vient de ce qu'ils ont coûté, le plafond ne bouge pas", async () => {
    const u = await account(), pid = project(u), cid = threadFor(u, pid);
    const tool = `essai.outil.${id()}`;
    const est = { maxMicro: 16_690_000, probableMicro: 8_000_000, label: "la marque" };
    // Le devis porte aussi la borne des reprises du Studio (deux plafonds, 23 novembre 2026), jamais montrée au client.
    expect(T.prixJuste(tool, est)).toEqual({ ...est, studioMaxMicro: 2 * est.maxMicro });
    travail(u, pid, cid, tool, 10_000_000, 2_000_000);
    travail(u, pid, cid, tool, 10_000_000, 3_000_000);
    expect(T.prixJuste(tool, est).probableMicro).toBe(8_000_000); // deux mesures : pas assez
    travail(u, pid, cid, tool, 10_000_000, 4_000_000);
    const juste = T.prixJuste(tool, est);
    expect(juste.maxMicro).toBe(16_690_000);
    // Médiane des parts réellement dépensées (20 %, 30 %, 40 %) : 30 % du plafond.
    expect(juste.probableMicro).toBe(Math.round(16_690_000 * 0.3));
    expect(juste.mesure).toBe(3);
    // Une action gratuite reste gratuite.
    expect(T.prixJuste(tool, { maxMicro: 0, label: "rien" })).toEqual({ maxMicro: 0, label: "rien" });
  });

  it("une tâche pas finie n'est jamais une mesure", async () => {
    const u = await account(), pid = project(u), cid = threadFor(u, pid);
    const tool = `essai.outil.${id()}`;
    for (let i = 0; i < 3; i++) { const j = travail(u, pid, cid, tool, 10_000_000, 1_000_000); run("UPDATE jobs SET status='failed' WHERE id=?", j); }
    expect(T.partMesuree(tool)).toBeNull();
  });

  it("coût par travail accepté : le dernier avant la validation est gardé, ceux d'avant jetés, ceux d'après en attente", async () => {
    const u = await account(), pid = project(u), cid = threadFor(u, pid);
    const t0 = Date.now() - 10_000;
    travail(u, pid, cid, "angles.propose", 5_000_000, 1_000_000, t0);
    travail(u, pid, cid, "angles.propose", 5_000_000, 1_500_000, t0 + 1000);
    // Le client valide son angle : le verrou est posé.
    const { one } = await import("@/lib/db");
    const st = JSON.parse(one<{ state_json: string | null }>("SELECT state_json FROM agent_conversations WHERE id=?", cid)?.state_json ?? "{}");
    run("UPDATE agent_conversations SET state_json=? WHERE id=?", JSON.stringify({ ...st, verrous: { angle: { pose: t0 + 2000, preuve: "ok", ouvert: null, historique: [] } } }), cid);
    travail(u, pid, cid, "angles.propose", 5_000_000, 700_000, t0 + 3000);
    const l = T.coutParTravail(t0 - 1).lignes.find((x) => x.tool === "angles.propose")!;
    expect(l.travail).toBe("Les trois angles");
    expect(l.travaux).toBe(3);
    expect(l.payeMicro).toBe(3_200_000);
    expect(l.gardeMicro).toBe(1_500_000);
    expect(l.jeteMicro).toBe(1_000_000);
    expect(l.attenteMicro).toBe(700_000);
    expect(l.capMicro).toBe(15_000_000);
  });

  it("dans la boucle : un travail payant lancé est noté, et la carte prend le prix mesuré", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const src = fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8");
    expect(src).toContain("if (t.estimate && res.ok && res.jobs?.length) { try { noterTravail(t.name, res.jobs,");
    expect(src).toContain("try { est = prixJuste(t.name, await t.estimate(tctx, parsed.data)); }");
    expect(src).toContain("const est = prixJuste(name!, await t.estimate(toolContext(user, r), {} as never));");
  });
});

describe("le coût de SINA étape par étape, et l'alerte quand un travail coûte le double", async () => {
  const T = await import("@/lib/syna-agent/travaux");
  const { coutParEtape } = await import("@/lib/ai/memoire");
  const { run, id } = await import("@/lib/db");
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  it("par étape : réflexions, jetons lus en mémoire et payés plein tarif, coût moyen ; la trace porte l'étape", async () => {
    const u = await account(), at = Date.now();
    for (const [st, cost] of [["syna:etape-0", 40_000], ["syna:etape-0", 60_000], ["syna:etape-1", 90_000]] as const)
      run("INSERT INTO ai_calls(id,created_at,user_id,task,step,provider,requested_model,unit,input_tokens,cache_read_tokens,cache_write_tokens,output_tokens,cost,status,prompt_key) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", `e-${id()}`, at, u.id, "agent_conversation", st, "anthropic", "claude-opus-5-5", "tokens", 1000, 5000, 0, 500, cost, "ok", "syna-agent-2");
    const e = coutParEtape(at - 1);
    expect(e.find((x) => x.etape === "0")).toMatchObject({ reflexions: 2, plein: 2000, lu: 10000, parReflexionMicro: 50_000 });
    expect(e.find((x) => x.etape === "1")).toMatchObject({ reflexions: 1, parReflexionMicro: 90_000 });
    const fs = await import("node:fs");
    expect(fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8")).toContain("step: `syna:etape-${currentStep(journeyOf(r.conversation_id))}`");
  });
  it("alerte : le coût moyen de la semaine a doublé par rapport aux 30 jours d'avant", async () => {
    const u = await account(), pid = project(u) as string, cid = threadFor(u, pid), tool = `essai.alerte.${id()}`;
    const t = (cost: number, joursAvant: number) => {
      const at = Date.now() - joursAvant * 86400_000, jid = `job-${id()}`;
      run("INSERT INTO jobs(id,user_id,project_id,type,payload,status,run_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", jid, u.id, pid, "syna.brand", "{}", "done", at, at, at);
      T.noterTravail(tool, [jid], { userId: u.id, projectId: pid, conversationId: cid });
      run("UPDATE travaux_payes SET created_at=? WHERE job_id=?", at, jid);
      run("INSERT INTO ai_calls(id,created_at,user_id,project_id,job_id,task,provider,requested_model,unit,cost,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)", `c-${jid}`, at, u.id, pid, jid, "strategy", "anthropic", "m", "tokens", cost, "ok");
    };
    t(1_000_000, 20); t(1_000_000, 15); t(2_500_000, 2);
    expect(T.coutParTravail(Date.now() - 40 * 86400_000).lignes.find((l) => l.tool === tool)!.alerte).toBe(true);
  });
});
