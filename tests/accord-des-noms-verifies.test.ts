/**
 * L'accord du Studio pour la tâche des noms (méthode des graphistes : `runSinaBrandJob` avec `jusquAuxNoms`) compte TOUS
 * ses appels jusqu'aux noms vérifiés : les recherches et l'étude, les deux tours d'idées, les équipes et leur reprise
 * courte, le juge, le second tour et son juge, puis la recherche sur le web des noms gardés et leur vérification. Il ne
 * compte jamais sur ce que les appels précédents n'ont pas dépensé (décision du 26 novembre 2026 : l'accord ne donnait que
 * 8,66 € à la tâche, sans la vérification, pour 9,85 € de maxima). Aucun appel payant : les clés sont factices, les
 * réservations simulées.
 */
import { describe, expect, it } from "vitest";

// Des clés factices : le devis du Studio ne compte une recherche sur le web qu'avec une clé (aucun appel n'est fait).
process.env.ANTHROPIC_API_KEY ||= "cle-factice-du-test";
process.env.OPENAI_API_KEY ||= "cle-factice-du-test";

describe("l'accord du Studio pour la tâche des noms", async () => {
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();
  await (await import("../scripts/syna-recette/tarifs-verifies")).appliquerTarifsVerifies();
  const C = await import("@/lib/syna-agent/brand-chain");
  const I = await import("@/lib/syna-agent/tools/identity");
  const { callCostBoundMicro } = await import("@/lib/ai/llm");
  const { webSearchQuote } = await import("@/lib/ai/web-search");
  const billing = await import("@/lib/billing");
  const { withTrace, CostCapReached } = await import("@/lib/ai/trace");
  const { run } = await import("@/lib/db");
  const { account } = await import("./conversation209-fixtures");

  const s = C.chainSettings();
  /** La borne d'un appel, recalculée ici sans la fonction du devis (même formule que la réservation). */
  const borne = (id: keyof typeof C.BRAND_CALLS) => {
    const c: { tier: "strong" | "craft"; effort?: string; input: number; max: number } = C.BRAND_CALLS[id], m = { ...s[c.tier], ...(c.effort ? { effort: c.effort } : {}) };
    const b = callCostBoundMicro(m.provider, m.model, c.input * 1.5, c.max, m.effort);
    expect(b, `borne de ${id}`).not.toBeNull();
    return b!;
  };
  const web = webSearchQuote(s.craft, { maxSearches: C.BRAND_SEARCHES }).maxMicro;
  /** Tous les appels possibles de la tâche des noms, jusqu'aux noms vérifiés, chacun à son maximum. */
  const tousLesAppels = (fresh = true): number[] => [
    ...(fresh ? [web, web, web, borne("study"), borne("strategy"), borne("strategy")] : []),
    ...(fresh ? Array.from({ length: s.teams }, () => [borne("team"), borne("teamShort")]).flat() : []),
    borne("judge"),
    ...Array.from({ length: s.teams }, () => [borne("team"), borne("teamShort")]).flat(),
    borne("judge"),
    // La vérification des noms gardés : sa recherche sur le web, refaite une fois autrement si elle ne rend aucune page,
    // puis son appel.
    web, web, borne("verify"),
  ];
  const somme = (v: number[]) => v.reduce((t, x) => t + x, 0);

  it("le maximum de l'accord vaut au moins la somme des maxima de tous les appels de la tâche des noms, vérification comprise", () => {
    expect(web).toBeGreaterThan(0);
    for (const count of [2, 3, 4]) {
      const g = I.accordGraphistes(count);
      expect(g.nomsMicro).toBeGreaterThanOrEqual(Math.ceil(somme(tousLesAppels())));
      // Le « au plus » de la carte couvre chaque morceau réservé, la tâche des noms entière comprise.
      expect(g.nomsMicro + g.rechercheMicro + g.finalisationsMicro + g.planchesMicro).toBeLessThanOrEqual(g.maxMicro);
    }
    // Atelier repris (ni étude, ni idées, ni premier tour des équipes) : la vérification reste comptée.
    expect(I.accordGraphistes(3, false).nomsMicro).toBeGreaterThanOrEqual(Math.ceil(somme(tousLesAppels(false))));
    // Une seule source : le devis des noms vérifiés porte la recherche des noms gardés et leur vérification.
    const d = C.devisDesNomsVerifies();
    expect(d.lignes.map((l) => l.id)).toEqual(expect.arrayContaining(["strategy:2", "team:2", "teamShort:2", "judge:2", "recherche:verify", "verify"]));
    expect(I.accordGraphistes(3).nomsMicro).toBe(d.maxMicro);
  });

  it("le devis compte la recherche des noms gardés refaite autrement (au plafond seulement : le probable ne bouge pas)", () => {
    const d = C.devisDesNomsVerifies();
    const bis = d.lignes.find((l) => l.id === "recherche:verify:2");
    expect(bis).toMatchObject({ appel: "web", fois: 1, toujours: false, maxMicro: web });
    // Sans elle, le plafond serait plus bas d'une recherche, et le probable le même.
    const sans = d.lignes.filter((l) => l.id !== "recherche:verify:2");
    expect(d.maxMicro).toBe(Math.ceil(sans.reduce((t, l) => t + l.maxMicro, 0) + web));
    expect(d.probableMicro).toBe(Math.ceil(sans.filter((l) => l.toujours).reduce((t, l) => t + l.probableMicro, 0)));
    // Atelier repris : elle reste comptée.
    expect(C.devisDesNomsVerifies({ fresh: false }).lignes.map((l) => l.id)).toContain("recherche:verify:2");
  });

  it("le plafond de la tâche (costCapMicro) n'est jamais inférieur à ce qu'il faut pour aller jusqu'aux noms vérifiés, même si chaque appel dépense son maximum", async () => {
    const u = await account();
    const cap = I.accordGraphistes(3).nomsMicro;
    const tache = (nom: string) => {
      const jid = `job-noms-verifies-${nom}-${Date.now()}`;
      run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, null, C.SINA_BRAND_JOB, "noms", JSON.stringify({ capMicro: cap }), "running", Date.now(), Date.now(), Date.now());
      return jid;
    };
    // Le pire : chaque appel réserve son maximum et le dépense en entier. Rien ne reste pour la vérification que ce que
    // l'accord lui a compté.
    const auPire = (jobId: string, plafond: number) => withTrace({ jobId, costCapMicro: plafond }, async () => {
      for (const m of tousLesAppels()) { const rid = billing.reserve(u.id, m, { task: "strategy", provider: "anthropic", model: "simule", jobId }); billing.settle(rid, m, null, "strategy"); }
    });
    await expect(auPire(tache("accord"), cap)).resolves.toBeUndefined();
    // L'ancien plafond (sans la vérification des noms gardés) s'arrêtait avant elle.
    await expect(auPire(tache("ancien"), cap - web - borne("verify"))).rejects.toBeInstanceOf(CostCapReached);
  });
});
