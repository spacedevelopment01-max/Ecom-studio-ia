/**
 * Le client qui garde son propre logo (24 novembre 2026, défaut accepté pour correction) : la proposition de marque ne
 * lance AUCUNE recherche de logo par la méthode des graphistes, ni finalisation, ni relecture de logo, et leurs sommes ne
 * figurent pas dans le devis. Sa proposition passe par la chaîne entière, qui pose son logo tel quel. Rien ne change pour
 * un client qui ne garde pas son logo. Aucun appel d'IA : seules les tâches mises en file sont regardées.
 */
import { describe, expect, it } from "vitest";
import { journey } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

describe("logo gardé par le client : aucune recherche de logo", async () => {
  const { all, one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const J = await import("@/lib/syna-agent/journey");
  const C = await import("@/lib/syna-agent/brand-chain");
  const { accordGraphistes } = await import("@/lib/syna-agent/tools/identity");
  const { LOGO_GRAPHISTES_JOB } = await import("@/lib/syna-agent/logo-graphistes-tache");
  const { devisDeLaRecherche, devisDesFinalisations } = await import("@/lib/syna-agent/logo-graphistes");
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  const ctxOf = (user: any, cid: string) => ({ user, conversationId: cid, runId: `test-${Math.random()}`, projectId: null as string | null, attachment: () => null }) as any;
  const call = async (name: string, ctx: any, args: unknown) => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };
  const estimate = async (ctx: any) => fr(() => getTool("identity.propose")!.estimate!(ctx, {} as never));

  /** Fil avec l'étape 0 validée, puis ce que le client garde. */
  async function thread(keep: ("logo" | "nom")[], name?: string) {
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    const start = journey().start;
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: start.offer!.value }] });
    await call("start.answer", ctx, { answers: [{ field: "existing", value: "Rien, je pars de zéro." }] });
    await call("start.answer", ctx, { answers: [
      { field: "audience", value: start.audience!.value }, { field: "image", value: start.image!.value }, { field: "setup", value: "6 produits" },
      { field: "market", value: "En ligne, France." }, { field: "price", value: start.price!.value }, { field: "difference", value: start.difference!.value },
      { field: "taste", status: "none" }, { field: "photos", value: "Pas de photos pour l'instant." }, { field: "language", value: "Français seulement" },
      { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    expect((await (await import("./faits-fixtures")).avecLesFaitsDemandes(ctx, () => call("start.confirm", ctx, {}))).ok).toBe(true);
    J.updateJourney(cid, (x) => { x.keep = keep; x.mode = "refonte"; if (name) x.keptValues = { name }; });
    ctx.projectId = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id;
    return { user, cid, ctx, pid: ctx.projectId as string };
  }
  const jobsOf = (pid: string, type: string) => all<{ payload: string }>("SELECT payload FROM jobs WHERE project_id=? AND type=?", pid, type);

  it("il garde son nom ET son logo : la proposition ne met en file aucune recherche de logo ; la chaîne entière pose son logo tel quel", async () => {
    const t = await thread(["logo", "nom"], "Maison Lune");
    const r = await call("identity.propose", t.ctx, {});
    expect(r.ok).toBe(true);
    expect(jobsOf(t.pid, LOGO_GRAPHISTES_JOB)).toEqual([]);
    const brand = jobsOf(t.pid, C.SINA_BRAND_JOB);
    expect(brand).toHaveLength(1);
    const payload = JSON.parse(brand[0].payload);
    // La chaîne entière, comme avant la méthode : ni arrêt après les noms, ni logos finis à poser.
    expect(payload.jusquAuxNoms).toBeUndefined();
    expect(payload.logosGraphistes).toBeUndefined();
    expect(payload.capMicro).toBe(C.chainQuote({ routes: payload.count, fresh: true }).maxMicro);
    // Aucun accord de la méthode des graphistes n'est noté pour lui.
    expect(J.journeyOf(t.cid).accordGraphistes).toBeUndefined();
    expect(r.summary).not.toMatch(/pistes de ton logo|esquisses/);
  });

  it("il garde son logo mais pas son nom : toujours aucune recherche de logo ; la chaîne cherche les noms, chaque identité a le sien", async () => {
    const t = await thread(["logo"]);
    const r = await call("identity.propose", t.ctx, {});
    expect(r.ok).toBe(true);
    expect(jobsOf(t.pid, LOGO_GRAPHISTES_JOB)).toEqual([]);
    const payload = JSON.parse(jobsOf(t.pid, C.SINA_BRAND_JOB)[0].payload);
    expect(payload.jusquAuxNoms).toBeUndefined();
    expect(payload.names).toBeUndefined();
    expect(J.journeyOf(t.cid).accordGraphistes).toBeUndefined();
  });

  it("le devis de sa carte : la chaîne et la fin de la marque, sans recherche ni finalisations de logo", async () => {
    for (const keep of [["logo", "nom"], ["logo"]] as ("logo" | "nom")[][]) {
      const t = await thread(keep, keep.includes("nom") ? "Maison Lune" : undefined);
      const count = C.routeCountOfProject(t.pid), est = await estimate(t.ctx);
      const q = C.chainQuote({ routes: count, fresh: true }), f = C.finishQuote();
      expect(est.maxMicro).toBe(q.maxMicro + f.maxMicro);
      expect(est.probableMicro).toBe(q.probableMicro! + f.probableMicro!);
      // L'accord des graphistes compte la recherche et les finalisations ; celui du client qui garde son logo, jamais.
      // (Depuis la planche de marque du 24 novembre 2026, accord écrit du propriétaire, l'accord des graphistes compte les
      // planches de marque à la place des images des planches proposées : la comparaison se fait morceau par morceau.)
      const g = accordGraphistes(count);
      expect(g.rechercheMicro).toBe(devisDeLaRecherche().maxMicro);
      expect(g.finalisationsMicro).toBe(devisDesFinalisations(count).maxMicro);
      expect(g.maxMicro - g.rechercheMicro - g.finalisationsMicro).toBeGreaterThan(0);
      expect(est.maxMicro).toBe(C.chainQuote({ routes: count, fresh: true }).maxMicro + f.maxMicro);
    }
  });

  it("sans logo gardé, rien ne change : les noms d'abord (méthode des graphistes) ; avec son nom seul gardé, la recherche de son logo part tout de suite", async () => {
    const t = await thread([]);
    const count = C.routeCountOfProject(t.pid), g = accordGraphistes(count);
    expect((await estimate(t.ctx)).maxMicro).toBe(g.maxMicro + C.finishQuote().maxMicro);
    expect((await call("identity.propose", t.ctx, {})).ok).toBe(true);
    expect(JSON.parse(jobsOf(t.pid, C.SINA_BRAND_JOB)[0].payload)).toMatchObject({ jusquAuxNoms: true, count, capMicro: g.nomsMicro });
    expect(J.journeyOf(t.cid).accordGraphistes).toMatchObject({ count, rechercheMicro: g.rechercheMicro, finalisationsMicro: g.finalisationsMicro });

    const n = await thread(["nom"], "Maison Lune");
    expect((await estimate(n.ctx)).maxMicro).toBe(accordGraphistes(C.routeCountOfProject(n.pid)).maxMicro + C.finishQuote().maxMicro);
    const r = await call("identity.propose", n.ctx, {});
    expect(r.ok).toBe(true);
    expect(r.summary).toMatch(/Tu gardes ton nom « Maison Lune » : je cherche d'abord les pistes de ton logo/);
    const logo = jobsOf(n.pid, LOGO_GRAPHISTES_JOB);
    expect(logo).toHaveLength(1);
    expect(JSON.parse(logo[0].payload)).toMatchObject({ phase: "recherche", nom: "Maison Lune" });
    expect(jobsOf(n.pid, C.SINA_BRAND_JOB)).toEqual([]);
  });
});
