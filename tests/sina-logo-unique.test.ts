/**
 * SINA — logo unique (décision du propriétaire du 12 novembre 2026) : UN logo dessiné pour l'identité choisie sur sa
 * planche, à partir de l'idée de la marque et du nom dessiné ; contrôlé avant d'être montré ; le nom dessiné en code
 * de la planche sert de secours (le client finit toujours avec un logo). Aucun appel d'IA : moteur simulé.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { journey, series } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — étape 2 : le logo unique", async () => {
  const { one, run, json } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { JobContext } = await import("@/lib/jobs");
  const { getAsset, assetData } = await import("@/lib/library");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { threadView } = await import("@/lib/syna-agent/loop");
  const { logoToolDeps } = await import("@/lib/syna-agent/tools/logo");
  const G = await import("@/lib/syna-agent/logos");
  const J = await import("@/lib/syna-agent/journey");
  const { artFixture } = await import("./logo-v2-fixtures");
  const { mockAi } = await import("./logo-v2-mock");
  const { ART_CRITERIA } = await import("@/lib/logo-v2/types");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const ctxOf = (user: any, cid: string) => ({ user, conversationId: cid, runId: `run-${Date.now()}`, projectId: null as string | null, attachment: () => null }) as any;
  const call = async (name: string, ctx: any, args: unknown) => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  /** Fil avec trois identités en planches (comme après la chaîne) et l'identité B choisie par le client. */
  async function chosenThread(key: "A" | "B" | "C" = "B") {
    const user = await account();
    const cid = threadFor(user, null), ctx = ctxOf(user, cid);
    const s = journey().start;
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: s.offer!.value }] });
    await call("start.answer", ctx, { answers: [{ field: "existing", value: "Rien, je pars de zéro." }] });
    await call("start.answer", ctx, { answers: [
      { field: "audience", value: s.audience!.value }, { field: "image", value: s.image!.value }, { field: "setup", value: "6 produits" }, { field: "market", value: "En ligne, France." },
      { field: "price", value: s.price!.value }, { field: "difference", value: s.difference!.value }, { field: "taste", status: "none" }, { field: "photos", value: "Pas de photos pour l'instant." },
      { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    expect((await call("start.confirm", ctx, {})).ok).toBe(true);
    J.updateJourney(cid, (x) => { x.identities = { list: series(3), issues: [], comparison: "", at: Date.now(), round: 1 }; J.setStep(x, 1, "review"); });
    const chosen = await call("identity.choose", ctx, { key });
    expect(chosen.ok).toBe(true);
    expect(chosen.summary).toMatch(/Prochaine étape : ton logo\./);
    return { user, cid, ctx, pid: one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string };
  }

  let n = 0;
  const jobCtx = (user: any, pid: string, payload: Record<string, unknown>) => {
    const jid = `job-sina-logo-${Date.now()}-${n++}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, user.id, pid, "syna.logos", "logo", JSON.stringify(payload), "running", Date.now(), Date.now(), Date.now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };
  const artReview = (score: number, exp: any) => ({ criteria: Object.fromEntries(ART_CRITERIA.map((k) => [k, score])) as any, textRead: exp.name, nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, issues: [], needsSimplifiedMark: true, genericConcept: false, fix: { target: "none", instruction: "" } });
  const fakeEngine = (log: { calls: string[]; prompts: string[] }, score = 8.6) => () => ({
    ...mockAi(log),
    artworkRoute: () => ({ provider: "openai", model: "gpt-image-1" }),
    async reviewArtwork(_b: Buffer, t: any, _brief: any, exp: any) { log.calls.push(`review:${t.name}`); return artReview(score, exp); },
  }) as any;
  async function draw(t: { user: any; pid: string; cid: string }, o: { score?: number; fail?: boolean; guidance?: string } = {}) {
    const log = { calls: [] as string[], prompts: [] as string[] }, prompts: string[] = [];
    G.logoDeps.ai = fakeEngine(log, o.score);
    G.logoDeps.draw = async (prompt, tid) => { prompts.push(prompt); log.calls.push(`art:${tid}`); if (o.fail) throw new Error("dessin indisponible"); return artFixture(0); };
    try { return { out: await fr(() => G.runSinaLogosJob(jobCtx(t.user, t.pid, { projectId: t.pid, conversationId: t.cid, capMicro: 900_000, ...(o.guidance ? { guidance: o.guidance } : {}) }))), log, prompts }; }
    finally { G.logoDeps.ai = undefined; G.logoDeps.draw = undefined; }
  }

  it("le contexte et le devis parlent d'UN logo pour une identité choisie sur sa planche", async () => {
    const { cid, ctx } = await chosenThread();
    const j = J.journeyOf(cid);
    expect(G.chosenRoute(j)?.name).toBe("Lâche le Morceau");
    expect(J.journeyContext(j)).toMatch(/Étape 2 \(logo\) : rien n'est encore dessiné.*UN logo dessiné pour SON identité, à partir de l'idée de sa marque et du nom dessiné de sa planche/);
    logoToolDeps.maxMicro = () => 300_000;
    try {
      expect(await getTool("logo.propose")!.estimate!(ctx, {})).toEqual({ maxMicro: 300_000, label: "ton logo" });
      const r = await call("logo.propose", ctx, {});
      expect(r.ok).toBe(true);
      expect(r.summary).toMatch(/Dessin de ton logo lancé/);
      expect(r.data).toMatchObject({ logos: 1, plafondMicro: 300_000 });
      expect(one<any>("SELECT label FROM jobs WHERE id=?", r.jobs![0]).label).toBe("Ton logo (SINA)");
    } finally { logoToolDeps.maxMicro = undefined; }
  });

  it("logo validé : un seul dessin, demandé à partir de l'idée de la marque et du nom dessiné, puis choisi", async () => {
    const t = await chosenThread();
    const { out, log, prompts } = await draw(t, { guidance: "Plus rond." });
    expect(log.calls.filter((c) => c.startsWith("art:"))).toHaveLength(1); // une seule image payée
    expect(prompts).toHaveLength(1);
    const pr = prompts[0];
    expect(pr).toMatch(/Crée le logo de la marque « Lâche le Morceau »/);
    expect(pr).toMatch(/L'idée de la marque : Mieux vaut décevoir avant l'achat qu'après\./);
    expect(pr).toMatch(/D'où vient le nom : on lâche les morceaux dans l'eau ; lâcher le morceau : tout avouer\./);
    expect(pr).toMatch(/Le nom est déjà dessiné sur la planche que le client a choisie : sur 3 lignes \(« LÂCHE LE \/ MOR \/ CEAU »\), en capitales/);
    expect(pr).toMatch(/Pars de ce dessin/);
    expect(pr).toMatch(/Le seul texte du logo est le nom « Lâche le Morceau », écrit exactement, lettre par lettre/);
    expect(pr).toMatch(/Souhaits du client, avec ses mots : Plus rond\./);
    expect(pr).not.toMatch(/carte blanche totale|Direction artistique de cette proposition/); // plus trois directions imposées
    expect(out.logos).toHaveLength(1);
    expect(out.logos[0]).toMatchObject({ source: "A", name: "Ton logo", verdict: "FINAL", choosable: true });
    const j = J.journeyOf(t.cid);
    expect(j.steps[2].status).toBe("review");
    expect(J.journeyContext(j)).toMatch(/A « Ton logo » : validé par le contrôle[\s\S]*regarde le logo avant d'en parler[\s\S]*S'il n'aime pas le logo, propose d'en dessiner un autre/);
    const view = await fr(() => threadView(t.user, t.cid));
    expect(view.journey.logos!.list).toHaveLength(1);
    expect(view.journey.logos!.list[0].href).toBeTruthy();
    const chosen = await call("logo.choose", t.ctx, { source: "A" });
    expect(chosen.ok).toBe(true);
    expect(J.journeyOf(t.cid).steps[2].status).toBe("done");
    expect(loadProject(t.pid).brand!.logo).toMatchObject({ status: "validated" });
  });

  it("logo non validé : il est montré comme tel, et le nom dessiné de la planche est proposé en secours", async () => {
    const t = await chosenThread();
    const { out } = await draw(t, { score: 4 });
    expect(out.logos.map((x) => `${x.source} ${x.kind ?? "dessin"} ${x.verdict === "FINAL"}`)).toEqual(["A dessin false", "B planche false"]);
    const spare = out.logos[1];
    expect(spare).toMatchObject({ name: "Le nom dessiné de ta planche", verdict: "PROVISIONAL", choosable: true });
    const asset = getAsset(spare.assetId!)!;
    const meta = json<any>(asset.meta as any, {});
    expect(meta).toMatchObject({ engine: "logo-v2", planche: true, gate: { verdict: "PROVISIONAL" }, artwork: { expected: { name: "Lâche le Morceau" }, provider: "studio" } });
    const img = await sharp(assetData(asset)).metadata();
    expect(img.format).toBe("png");
    expect(img.width).toBe(1600);
    expect(img.hasAlpha).toBe(true);
    expect(J.journeyContext(J.journeyOf(t.cid))).toMatch(/A « Ton logo » : NON validé par le contrôle[\s\S]*B « Le nom dessiné de ta planche » : le nom dessiné de sa planche, fait par le Studio, exact à la lettre \(secours\)/);
    // Le client finit toujours avec un logo : le secours se choisit et devient le logo de la marque.
    const chosen = await call("logo.choose", t.ctx, { source: "B" });
    expect(chosen.ok).toBe(true);
    expect(chosen.summary).not.toMatch(/non validé par le contrôle/);
    expect(loadProject(t.pid).brand!.logo).toMatchObject({ status: "validated" });
    expect(J.journeyOf(t.cid).steps[2].status).toBe("done");
  });

  it("dessin en panne : le secours de la planche est proposé seul, et c'est dit", async () => {
    const t = await chosenThread("A");
    const { out } = await draw(t, { fail: true });
    expect(out.logos).toHaveLength(1);
    expect(out.logos[0]).toMatchObject({ source: "A", kind: "planche", choosable: true });
    expect(J.journeyOf(t.cid).steps[2].status).toBe("review");
    expect((await call("logo.choose", t.ctx, { source: "A" })).ok).toBe(true);
  });

  it("un autre logo sur demande, avant le choix : nouvelle proposition, payante et annoncée", async () => {
    const t = await chosenThread();
    await draw(t);
    // La première tâche est finie (dans ce test, sa ligne reste « en cours » : on la termine à la main).
    run("UPDATE jobs SET status='done' WHERE project_id=? AND type='syna.logos'", t.pid);
    logoToolDeps.maxMicro = () => 300_000;
    try {
      const again = await call("logo.propose", t.ctx, {});
      expect(again.ok).toBe(true);
      expect(again.jobs).toHaveLength(1);
      expect(await getTool("logo.propose")!.estimate!(t.ctx, {})).toMatchObject({ maxMicro: 300_000, label: "ton logo" });
      // Une seule série à la fois : jamais deux dessins payés en parallèle.
      expect((await call("logo.propose", t.ctx, {})).ok).toBe(false);
    } finally { logoToolDeps.maxMicro = undefined; }
    const { out } = await draw(t);
    expect(J.journeyOf(t.cid).logos!.round).toBe(2);
    expect(out.logos[0].verdict).toBe("FINAL");
  });
});
