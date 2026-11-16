/**
 * SINA — étape des angles (lot 3, 16 novembre 2026) : trois stratèges séparées, un juge à part, un lecteur qui ne sait
 * rien ; trois angles montrés (un sûr, un d'émotion, un audacieux), le client en choisit un. Aucun appel d'IA : les
 * spécialistes et la recherche sont simulés.
 */
import fs from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { series } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — étape des angles : trois stratèges, un juge, trois angles", async () => {
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { claimNext, completeJob, JobContext } = await import("@/lib/jobs");
  const { activeStrategy } = await import("@/lib/marketing-strategy");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { threadView } = await import("@/lib/syna-agent/loop");
  const J = await import("@/lib/syna-agent/journey");
  const C = await import("@/lib/syna-agent/angles-chain");
  const P = await import("@/lib/syna-agent/angles-prompts");
  const K = await import("@/lib/syna-agent/angles-knowledge");
  const B = await import("@/lib/syna-agent/brand-chain");
  const { anglesDoubtHint } = await import("@/lib/syna-agent/tools/angles");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const tool = (name: string) => getTool(name)!;
  const ctxFor = (ctx: any) => { ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null; return ctx; };
  const call = async (name: string, ctx: any, args: unknown) => fr(() => tool(name).run(ctxFor(ctx), tool(name).args.parse(args)));
  const estimate = async (ctx: any, args: unknown = {}) => fr(() => tool("angles.propose").estimate!(ctxFor(ctx), args as never));
  afterEach(() => { C.anglesChainDeps.ai = undefined; B.brandPageDeps.read = undefined; });

  const PAGE = "https://avis.example/tasses";
  const QUOTES = [
    "Ma tasse du matin, personne n'a le droit d'y toucher", "J'en ai assez des mugs qui se ressemblent tous", "Je cherchais un cadeau qui ne finisse pas au fond d'un placard",
    "L'anse est trop petite, je me brûle les doigts", "Je bois mon café debout, alors la tasse compte", "On voit tout de suite que c'est fait à la main",
    "J'ai peur que ça casse au premier lavage", "C'est le seul objet que j'ai emporté au bureau", "Je voulais quelque chose qui dure plus qu'une saison",
  ];
  const study = (n = QUOTES.length) => ({ quotes: QUOTES.slice(0, n).map((text) => ({ text, url: PAGE })), quoteCount: n, sources: 12, competitors: ["Terre & Feu", "Maison Argile"], mould: "Tous parlent d'authenticité et de savoir-faire.", substitutes: ["Acheter un mug en grande surface"], notFound: [] });

  /** Fil à l'étape des angles : fiche de départ confirmée, marque choisie et validée (étapes 1 à 3), étude de la marque gardée. */
  async function atAngles(quotes = QUOTES.length) {
    const user = await account();
    const cid = threadFor(user, null), ctx: any = { user, conversationId: cid, runId: `run-${Date.now()}-${Math.random()}`, projectId: null, attachment: () => null };
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: "Des tasses en grès tournées à la main dans mon atelier, émaillées une par une." }] });
    await call("start.answer", ctx, { answers: [
      { field: "existing", value: "Rien, je pars de zéro." }, { field: "audience", value: "Des adultes qui aiment les beaux objets du quotidien." }, { field: "image", value: "Simple, chaleureux." },
      { field: "setup", value: "5 produits" }, { field: "market", value: "En ligne, France." }, { field: "price", value: "32 € la tasse" }, { field: "difference", value: "Chaque tasse est tournée à la main ; l'anse laisse passer trois doigts." },
      { field: "taste", status: "none" }, { field: "photos", value: "Pas de photos pour l'instant." }, { field: "language", value: "Français seulement" }, { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    expect((await call("start.confirm", ctx, {})).ok).toBe(true);
    J.updateJourney(cid, (x) => {
      x.identities = { list: series(3), issues: [], comparison: "", at: Date.now(), round: 1, study: study(quotes) };
      x.identityChoice = { key: "A", mix: {}, at: Date.now() };
      for (const n of [1, 2, 3]) J.setStep(x, n, "done");
      J.setStep(x, 4, "todo");
    });
    return { user, cid, ctx, pid: one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string };
  }

  // ---------------------------------------------------------------- spécialistes simulés

  const OFFSET: Record<string, number> = { sur: 0, emotion: 1, audacieux: 2 };
  /** Par défaut, les trois stratèges visent des types de clients différents (c1 à c4, décalés d'une entrée à l'autre). */
  const draft = (role: string, n: number, over: Record<string, unknown> = {}) => ({
    segment: `c${((n - 1 + (OFFSET[role] ?? 0)) % 4) + 1}`, showcase: "L'anse où passent trois doigts.",
    title: `Angle ${role} ${n}`, person: `Une personne précise (${role} ${n}) qui boit son café avant de partir.`, moment: "Le matin, dans sa cuisine, avant le bruit.",
    before: "Elle prend le premier mug venu.", after: "Elle a sa tasse à elle, qu'elle reconnaît les yeux fermés.", emotion: "le plaisir d'un objet à soi",
    promise: "Une tasse tournée à la main, faite pour ta main.", hook: `Accroche ${role} ${n} : ta tasse, pas une autre.`,
    site: { title: `Titre du site ${role} ${n}`, text: "Chaque tasse est tournée à la main dans l'atelier.", button: "Trouver ma tasse" },
    post: { title: `Publication ${role} ${n}`, text: "Des tasses en grès tournées à la main. Celle-ci attend son café." },
    show: "Des mains autour d'une tasse, la vapeur, le bord de l'évier.", arguments: ["Chaque tasse est tournée à la main"], objections: [{ objection: "Et si elle casse ?", answer: "Le grès est épais." }],
    quotes: [0, 99], toConfirm: ["Passe-t-elle au lave-vaisselle ?"], why: "Tes acheteurs parlent de LEUR tasse.", tone: "simple et chaleureux", ...over,
  });
  type Script = {
    drafts?: (role: string, n: number) => Record<string, unknown>;
    note?: (id: string) => number;
    judge?: (ids: string[]) => any;
    reader?: (prompt: string, second: boolean) => any;
    clarify?: (prompt: string) => any;
    web?: () => any[];
    fail?: string[];
  };
  const fakeAi = (log: { ids: string[]; prompts: Record<string, string>; systems: Record<string, string> }, s: Script = {}) => () => ({
    research: async (id: string) => { log.ids.push(`web:${id}`); return s.web ? s.web() : []; },
    ask: async (id: string, c: any) => {
      log.ids.push(id); log.prompts[id] = c.prompt; log.systems[id] = c.system;
      if (s.fail?.some((f) => id.startsWith(f))) throw new Error("coupure");
      const raw: any = (() => {
        if (c.kind === "listen") return { quotes: [{ text: "Je veux une tasse qui tienne chaud longtemps", url: PAGE }, { text: "Parole inventée par le modèle", url: PAGE }], competitors: [], mould: "", substitutes: [], facts: [], notFound: [] };
        if (c.kind === "segments") return { segments: [1, 2, 3, 4].map((k) => ({ id: `c${k}`, name: `Type de client ${k}`, who: `Situation ${k}.`, wants: `Envie ${k}.`, needs: `Besoin ${k}.`, showcase: "Tournée à la main.", quotes: [k, 99], proven: k < 4 })) };
        if (c.kind === "strategist" || c.kind === "rework") {
          const role = id.split("-").pop()!, count = c.kind === "rework" ? C.REWORKED : C.CANDIDATES, from = c.kind === "rework" ? C.CANDIDATES : 0;
          return { angles: Array.from({ length: count }, (_, i) => draft(role, from + i + 1, s.drafts?.(role, from + i + 1) ?? {})) };
        }
        if (c.kind === "judge" || c.kind === "recheck") {
          const ids = (JSON.parse(c.prompt).propositions as { id: string }[]).map((x) => x.id);
          return s.judge ? s.judge(ids) : { angles: ids.map((x) => ({ id: x, note: s.note ? s.note(x) : x.endsWith("-1") ? 9 : x.endsWith("-2") ? 8 : 6, why: `Avis sur ${x}.`, fixes: [] })), selection: { sur: "sur-1", emotion: "emotion-1", audacieux: "audacieux-1", recommande: "emotion", pourquoi: "C'est celui qui te ressemble le plus aujourd'hui." }, overall: "Série solide." };
        }
        if (c.kind === "reader") return s.reader ? s.reader(c.prompt, id.endsWith("-2")) : { texts: [] };
        if (c.kind === "clarify") return s.clarify ? s.clarify(c.prompt) : { texts: [] };
        throw new Error(`appel inattendu : ${id}`);
      })();
      return c.schema.parse(raw);
    },
  });
  const newLog = () => ({ ids: [] as string[], prompts: {} as Record<string, string>, systems: {} as Record<string, string> });

  /** Lance l'outil (comme après l'accord du client), puis exécute la tâche de fond avec les spécialistes simulés. */
  async function create(t: Awaited<ReturnType<typeof atAngles>>, s: Script = {}, args: unknown = {}) {
    const log = newLog();
    C.anglesChainDeps.ai = fakeAi(log, s) as never;
    const started = await call("angles.propose", t.ctx, args);
    expect(started.ok, started.summary).toBe(true);
    expect(started.jobs).toHaveLength(1);
    const job = claimNext([C.SINA_ANGLES_JOB])!;
    expect(job.id).toBe(started.jobs![0]);
    const result = await fr(() => C.runSinaAnglesJob(new JobContext(job)));
    completeJob(job.id, result);
    return { log, result, angles: J.journeyOf(t.cid).angles! };
  }

  // ---------------------------------------------------------------- le parcours

  it("refusé tant que la marque n'est pas validée ; payant avec un seul accord, puis lecture gratuite", async () => {
    const t = await atAngles();
    J.updateJourney(t.cid, (x) => J.setStep(x, 3, "review"));
    expect((await call("angles.propose", t.ctx, {})).summary).toMatch(/marque doit être validée/);
    J.updateJourney(t.cid, (x) => J.setStep(x, 3, "done"));
    const quote = await estimate(t.ctx);
    expect(quote.maxMicro).toBeGreaterThan(0);
    expect(quote.probableMicro!).toBeLessThan(quote.maxMicro);
    // L'écoute du web n'est comptée comme probable que s'il manque des paroles d'acheteurs.
    expect(C.anglesQuote({ listen: true }).probableMicro!).toBeGreaterThan(C.anglesQuote().probableMicro!);
    expect(C.anglesQuote({ listen: true }).maxMicro).toBe(C.anglesQuote().maxMicro);
    await create(t);
    expect((await estimate(t.ctx)).maxMicro).toBe(0);
    expect((await estimate(t.ctx, { redo: "Je veux des angles plus drôles." })).maxMicro).toBeGreaterThan(0);
  });

  it("trois stratèges séparées, un juge à part, trois angles montrés avec celui que SINA recommande ; le reste en réserve", async () => {
    const t = await atAngles();
    expect((await call("memory.note", t.ctx, { kind: "fact", key: "paiement", value: "Par carte le soir, ou par virement." })).ok).toBe(true);
    const { log, result, angles } = await create(t);
    // L'étude de la marque suffit : aucune recherche repayée. Trois stratèges, un juge, un lecteur ; ni reprise ni réécriture.
    expect(log.ids[0]).toBe("segments-1");
    expect([...log.ids].sort()).toEqual(["judge-1", "reader-1", "segments-1", "strategist-1-audacieux", "strategist-1-emotion", "strategist-1-sur"]);
    // Les types de clients sont dressés AVANT les stratèges, avec la définition du propriétaire ; chaque stratège les reçoit.
    // Celle qui dresse les types de clients, les stratèges et le juge reçoivent la leçon.
    for (const id of ["segments-1", "strategist-1-sur", "strategist-1-emotion", "strategist-1-audacieux", "judge-1"]) expect(log.systems[id]).toMatch(/# Ta leçon sur les angles marketing[\s\S]*Ce qu'est un vrai type de client/);
    expect(log.systems["reader-1"]).not.toMatch(/Ta leçon sur les angles/);
    expect(log.systems["segments-1"]).toMatch(/UN TYPE DE CLIENT différent, avec ses envies et ses besoins à lui, qui cherche le même produit/);
    expect(log.prompts["strategist-1-sur"]).toMatch(/# Les types de clients[\s\S]*- c1 : Type de client 1\. Situation 1\. Envie : Envie 1\. Besoin : Besoin 1\./);
    expect(log.prompts["strategist-1-sur"]).toMatch(/- c4 : .*type de client supposé/);
    expect(log.systems["strategist-1-sur"]).toMatch(/jamais deux propositions pour le même/);
    // Chacune a son entrée, et ne voit pas les propositions des autres.
    expect(log.systems["strategist-1-sur"]).toMatch(/l'angle SÛR[\s\S]*le métier et les faits du client/);
    expect(log.systems["strategist-1-emotion"]).toMatch(/l'angle d'ÉMOTION[\s\S]*paroles réelles des acheteurs/);
    expect(log.systems["strategist-1-audacieux"]).toMatch(/l'angle AUDACIEUX[\s\S]*ce que personne n'ose dire/);
    for (const role of P.ANGLE_ROLES) {
      expect(log.prompts[`strategist-1-${role}`]).toBe(log.prompts["strategist-1-sur"]);
      expect(log.prompts[`strategist-1-${role}`]).not.toMatch(/Accroche (sur|emotion|audacieux)/);
    }
    // Le dossier : les faits du client, sa marque choisie, les paroles réelles de l'étude, les concurrents.
    const file = log.prompts["strategist-1-sur"];
    expect(file).toMatch(/# Les faits du client[\s\S]*l'anse laisse passer trois doigts/);
    expect(file).toContain(`Nom : ${series(3)[0].name}`);
    // Ce que SINA a noté dans la mémoire du projet fait partie des faits : jamais redemandé dans « à confirmer ».
    expect(file).toContain("paiement : Par carte le soir, ou par virement.");
    expect(file).toContain(`0. « ${QUOTES[0]} »`);
    expect(file).toMatch(/Concurrents : Terre & Feu ; Maison Argile/);
    // Le juge voit les neuf propositions, avec leur entrée.
    const judged = JSON.parse(log.prompts["judge-1"]);
    expect(judged.propositions.map((x: any) => x.id)).toEqual(["sur-1", "sur-2", "sur-3", "emotion-1", "emotion-2", "emotion-3", "audacieux-1", "audacieux-2", "audacieux-3"]);
    expect(judged.propositions[3].entree).toBe("emotion");
    // Trois montrés, identifiés par leur entrée ; les autres angles notés 8 restent en réserve ; ceux sous 8 sont écartés.
    expect(angles.shown).toEqual([{ id: "sur", role: "sur" }, { id: "emotion", role: "emotion" }, { id: "audacieux", role: "audacieux" }]);
    expect(angles.reserve).toEqual(["reserve-sur-2", "reserve-emotion-2", "reserve-audacieux-2"]);
    expect(angles.list.map((a) => a.id)).toEqual(["sur", "emotion", "audacieux", "reserve-sur-2", "reserve-emotion-2", "reserve-audacieux-2"]);
    expect(angles.recommendedId).toBe("emotion");
    expect(angles.recommendation).toMatch(/te ressemble/);
    expect(angles.judged).toBe("juges");
    expect(angles.issues).toEqual([]);
    const emotion = angles.list[1];
    // Trois angles, trois types de clients différents, montrés avec leur envie et leur besoin.
    expect(angles.list.slice(0, 3).map((a) => a.client!.name)).toEqual(["Type de client 1", "Type de client 2", "Type de client 3"]);
    expect(emotion.client).toEqual({ name: "Type de client 2", who: "Situation 2.", wants: "Envie 2.", needs: "Besoin 2." });
    expect(emotion.showcase).toBe("L'anse où passent trois doigts.");
    expect(emotion).toMatchObject({ role: "emotion", title: "Angle emotion 1", message: "Accroche emotion 1 : ta tasse, pas une autre.", note: 9, proofsToConfirm: ["Passe-t-elle au lave-vaisselle ?"] });
    expect(emotion.site!.button).toBe("Trouver ma tasse");
    // Une parole citée qui n'existe pas (numéro 99) est retirée ; celle qui existe garde sa page.
    expect(emotion.quotes).toEqual([{ text: QUOTES[0], url: PAGE }]);
    expect(emotion.sources).toEqual([{ title: "avis.example", url: PAGE }]);
    expect(result).toMatchObject({ recommande: "emotion", ecrits: 9, reserve: 3, reprises: [] });
    expect(J.journeyOf(t.cid).steps[4].status).toBe("review");
    // SINA relit ses angles gratuitement ; le fil montre trois cartes, jamais la réserve.
    const read = await call("angles.propose", t.ctx, {});
    expect(read).toMatchObject({ ok: true });
    expect(read.jobs).toBeUndefined();
    expect((read.data as any).angles.map((a: any) => a.id)).toEqual(["sur", "emotion", "audacieux"]);
    expect(read.hint).toMatch(/3 autre\(s\) angle\(s\) gardé\(s\) restent en réserve/);
    const view: any = await fr(() => threadView(t.user, t.cid));
    expect(view.journey.angles.list.map((a: any) => a.id)).toEqual(["sur", "emotion", "audacieux"]);
    expect(view.journey.angles).toMatchObject({ recommendedId: "emotion", quoteCount: QUOTES.length, chosen: null });
    // La consigne de l'étape : SINA présente, recommande, et ne choisit jamais à la place du client.
    const said = J.anglesStepContext(J.journeyOf(t.cid)).join("\n");
    expect(said).toMatch(/Celui que tu recommandes : emotion/);
    expect(said).toMatch(/Ne choisis jamais à sa place/);
  });

  it("le client choisit UN angle : il devient l'angle actif du projet ; il peut changer d'avis", async () => {
    const t = await atAngles();
    await create(t);
    expect((await call("angles.choose", t.ctx, { angleId: "reserve-sur-2" })).summary).toMatch(/Angle inconnu/);
    const chosen = await call("angles.choose", t.ctx, { angleId: "emotion" });
    expect(chosen.ok, chosen.summary).toBe(true);
    expect(chosen.hint).toMatch(/informations à confirmer : Passe-t-elle au lave-vaisselle/);
    const j = J.journeyOf(t.cid);
    expect(j.angleChoice).toMatchObject({ id: "emotion", ids: ["emotion"] });
    expect(j.steps[4].status).toBe("done");
    expect(j.steps[5].status).toBe("todo");
    const active = activeStrategy(t.pid)!;
    expect(active.angleId).toBe("emotion");
    expect(active.angle).toMatchObject({ title: "Angle emotion 1", promise: "Une tasse tournée à la main, faite pour ta main.", messages: ["Accroche emotion 1 : ta tasse, pas une autre."], limits: ["Passe-t-elle au lave-vaisselle ?"] });
    expect(active.angle.examples).toMatchObject({ hero: "Titre du site emotion 1", cta: "Trouver ma tasse" });
    expect(active.angle.sources[0]).toMatchObject({ value: QUOTES[0], ref: PAGE });
    // Il change d'avis : l'autre angle devient l'angle actif, sans limite par forfait.
    t.ctx.runId = `run-autre-${Date.now()}`;
    expect((await call("angles.choose", t.ctx, { angleId: "audacieux" })).ok).toBe(true);
    expect(activeStrategy(t.pid)!.angleId).toBe("audacieux");
    expect(((await fr(() => threadView(t.user, t.cid))) as any).journey.angles.chosen).toBe("audacieux");
  });

  // ---------------------------------------------------------------- le juge, la reprise, le doute

  it("une entrée sans angle à 8 est reprise UNE fois par sa stratège, puis rejugée ; la reprise réussie est montrée", async () => {
    const t = await atAngles();
    const { log, angles, result } = await create(t, { note: (id) => (id.startsWith("audacieux") ? (id.endsWith("-4") ? 8 : 5) : id.endsWith("-1") ? 9 : 6), drafts: (role, n) => (role === "audacieux" && n > 3 ? { segment: n === 4 ? "c4" : "c3" } : {}) });
    expect(log.ids.filter((x) => x.startsWith("rework"))).toEqual(["rework-1-audacieux"]);
    expect(log.ids).toContain("recheck-1");
    // La stratège reçoit les remarques du juge et les angles retenus des autres entrées.
    expect(log.prompts["rework-1-audacieux"]).toMatch(/refusées par le juge[\s\S]*« Angle audacieux 1 »[\s\S]*5 sur 10/);
    expect(log.prompts["rework-1-audacieux"]).toMatch(/Angles déjà retenus pour les autres entrées[\s\S]*Angle sur 1[\s\S]*Angle emotion 1/);
    expect(log.prompts["rework-1-audacieux"]).toMatch(/# Types de clients déjà pris \(n'en vise aucun\)\nc1, c2\n\n# Types de clients encore libres[^\n]*\nc3, c4/);
    expect(log.systems["rework-1-audacieux"]).toMatch(/Tu ne reformules pas une proposition refusée/);
    // Le juge ne relit que la reprise.
    expect(JSON.parse(log.prompts["recheck-1"]).propositions.map((x: any) => x.id)).toEqual(["audacieux-4", "audacieux-5"]);
    expect(angles.list[2]).toMatchObject({ id: "audacieux", title: "Angle audacieux 4", note: 8 });
    expect(angles.list[2].doubt).toBeUndefined();
    expect(result.reprises).toEqual(["audacieux"]);
  });

  it("trois angles = trois types de clients différents : le Studio le garantit, même quand le juge choisit deux angles pour le même client", async () => {
    const t = await atAngles();
    // Les trois meilleures propositions (notées 9) visent toutes le type de client c1 ; les secondes (8) visent c2, c3 et c4.
    const { angles, result } = await create(t, { drafts: (role, n) => ({ segment: n === 1 ? "c1" : `c${((n - 1 + OFFSET[role]) % 3) + 2}` }) });
    const shown = angles.list.slice(0, 3);
    expect(new Set(shown.map((a) => a.client!.name)).size).toBe(3);
    // Un seul des trois garde sa proposition à 9 ; les deux autres entrées prennent leur meilleure proposition pour un autre client.
    expect(shown.map((a) => a.note).sort()).toEqual([8, 8, 9]);
    expect(shown.every((a) => !a.doubt)).toBe(true);
    expect(result.reprises).toEqual([]);
    expect(angles.issues).toEqual([]);
    // Une proposition qui ne vise aucun type de client de la liste est plafonnée : elle n'est jamais gardée telle quelle.
    const stray = C.candidatesOf("sur", [C.AngleDraftSchema.parse(draft("sur", 1, { segment: "zz" })), C.AngleDraftSchema.parse(draft("sur", 2, { segment: "c2" })), C.AngleDraftSchema.parse(draft("sur", 3, { segment: "c2", hook: "Autre accroche." }))], { facts: "", quotes: 9, segments: ["c1", "c2"] });
    expect(stray.map((c) => c.issues.join())).toEqual(["ne vise aucun type de client de la liste", "", "vise le même type de client qu'une autre proposition de la même stratège"]);
    // Le choix sans IA : jamais deux fois le même client, même si la somme des notes baisse.
    const notes = new Map(stray.map((c) => [c.id, { note: 9 }]));
    expect(C.pickThree([...stray, ...C.candidatesOf("emotion", [C.AngleDraftSchema.parse(draft("emotion", 1, { segment: "c2", hook: "E." }))], { facts: "", quotes: 9 }), ...C.candidatesOf("audacieux", [C.AngleDraftSchema.parse(draft("audacieux", 1, { segment: "c9", hook: "A." }))], { facts: "", quotes: 9 })], new Map([...notes, ["emotion-1", { note: 9 }], ["audacieux-1", { note: 9 }]])).get("sur")!.id).toBe("sur-1");
  });

  it("un angle qui reste sous 8 après la reprise est montré avec le doute de SINA, et n'est jamais recommandé", async () => {
    const t = await atAngles();
    const { angles } = await create(t, { judge: (ids) => ({ angles: ids.map((x) => ({ id: x, note: x.startsWith("emotion") ? 6 : 9, why: x.startsWith("emotion") ? "On ne voit personne." : "Solide.", fixes: x.startsWith("emotion") ? ["Montre une personne."] : [] })), selection: { sur: "sur-1", emotion: "emotion-1", audacieux: "audacieux-1", recommande: "emotion", pourquoi: "Parce que." }, overall: "" }) });
    const emotion = angles.list.find((a) => a.id === "emotion")!;
    expect(emotion.doubt).toBe("On ne voit personne.");
    expect(emotion.note).toBe(6);
    expect(angles.recommendedId).toBe("sur");
    expect(angles.recommendation).toBe("");
    expect(anglesDoubtHint(angles)).toMatch(/Tu doutes de cet angle[\s\S]*sans jamais parler de juge[\s\S]*On ne voit personne/);
    expect(J.anglesStepContext(J.journeyOf(t.cid)).join("\n")).toMatch(/TON DOUTE : On ne voit personne/);
  });

  it("contrôle du Studio : un chiffre ou une garantie que le client n'a pas dits plafonne la note à 5, quoi qu'en dise le juge", async () => {
    const t = await atAngles();
    const { log, angles } = await create(t, {
      drafts: (role, n) => (role === "sur" && n <= 3 ? { hook: `Garantie à vie, tasse ${n}.`, site: { title: `Titre du site sur ${n}`, text: "Livrée en 2 jours.", button: "Trouver ma tasse" } } : {}),
      note: (id) => (id.endsWith("-1") || id.endsWith("-4") ? 9 : 6),
    });
    // Le juge est prévenu de ce que le Studio a relevé.
    expect(JSON.parse(log.prompts["judge-1"]).propositions[0].controleDuStudio[0]).toMatch(/affirme sans que le client l'ait dit : .*2 jours/);
    // Noté 9 par le juge, mais plafonné : l'entrée est reprise, et la reprise honnête est montrée.
    expect(log.ids).toContain("rework-1-sur");
    expect(log.prompts["rework-1-sur"]).toMatch(/Retire ce que le client n'a pas dit/);
    expect(angles.list[0]).toMatchObject({ id: "sur", title: "Angle sur 4" });
    // Un chiffre donné par le client (son prix) et une information rangée « à confirmer » ne sont pas des fautes.
    expect(C.draftIssues(C.AngleDraftSchema.parse(draft("sur", 1, { hook: "32 € la tasse, et elle te suit partout." })), "Prix : 32 € la tasse")).toEqual([]);
    expect(C.draftIssues(C.AngleDraftSchema.parse(draft("sur", 1, { hook: "Garantie 2 ans." })), "")).toHaveLength(1);
    // Une heure de la journée fait partie de la scène : ce n'est pas une promesse.
    expect(C.draftIssues(C.AngleDraftSchema.parse(draft("sur", 1, { hook: "7 h. La cuisine est encore sombre." })), "")).toEqual([]);
  });

  it("le juge en panne ne bloque pas l'étape : les angles sont montrés, et SINA dit qu'elle n'a pas pu les relire", async () => {
    const t = await atAngles();
    const { angles } = await create(t, { fail: ["judge"] });
    expect(angles.judged).toBe("non_juges");
    expect(angles.shown).toHaveLength(3);
    expect(angles.issues!.join(" ")).toMatch(/pas pu relire ces angles aussi sévèrement/);
    expect(anglesDoubtHint(angles)).toMatch(/À dire honnêtement au client/);
  });

  // ---------------------------------------------------------------- écouter les acheteurs, lire comme quelqu'un qui ne sait rien

  it("trop peu de paroles d'acheteurs : SINA retourne les écouter, et ne garde que celles qu'elle relit sur leur page", async () => {
    const t = await atAngles(2);
    B.brandPageDeps.read = async () => "Avis clients. Je veux une tasse qui tienne chaud longtemps. Merci.";
    const { log, angles } = await create(t, { web: () => [{ url: PAGE, title: "Avis sur les tasses", category: "customers", excerpt: "« Je veux une tasse qui tienne chaud longtemps »" }] });
    expect(log.ids.slice(0, 2)).toEqual(["web:paroles", "listen"]);
    // La parole inventée par le modèle n'est pas dans la page : elle n'est pas gardée.
    expect(log.prompts["strategist-1-sur"]).toContain("2. « Je veux une tasse qui tienne chaud longtemps »");
    expect(log.prompts["strategist-1-sur"]).not.toContain("Parole inventée");
    expect(angles.quoteCount).toBe(3);
    // Toujours moins de huit : c'est dit au client.
    expect(angles.issues!.join(" ")).toMatch(/que 3 paroles réelles d'acheteurs/);
  });

  it("clair d'abord : une phrase que le lecteur ne comprend pas est réécrite puis relue ; une réécriture qui invente est écartée", async () => {
    const t = await atAngles();
    const { log, angles } = await create(t, {
      reader: (_p, second) => (second ? { texts: [{ id: "e-hook", understood: "Une tasse rien qu'à moi.", clear: true, why: "" }] } : { texts: [{ id: "e-hook", understood: "je ne comprends pas", clear: false, why: "« pas une autre » : autre quoi ?" }, { id: "s-btn", understood: "?", clear: false, why: "Trouver quoi ?" }] }),
      clarify: () => ({ texts: [{ id: "e-hook", text: "Ta tasse du matin, celle que personne ne te prend." }, { id: "s-btn", text: "Garantie 10 ans" }] }),
    });
    expect(log.ids.filter((x) => /reader|clarify/.test(x))).toEqual(["reader-1", "clarify-1", "reader-1-2"]);
    expect(log.prompts["reader-1"].split("\n")).toHaveLength(12);
    expect(log.prompts["clarify-1"]).toMatch(/id e-hook \| angle « Angle emotion 1 » \| l'accroche : « Accroche emotion 1[\s\S]*ce qui bloque : « pas une autre » : autre quoi \?/);
    // Seule la réécriture gardée est relue.
    expect(log.prompts["reader-1-2"]).toMatch(/^- id e-hook .*celle que personne ne te prend/);
    expect(log.prompts["reader-1-2"]).not.toMatch(/s-btn/);
    expect(angles.list[1].message).toBe("Ta tasse du matin, celle que personne ne te prend.");
    // La réécriture qui affirme une garantie est écartée : le bouton d'origine reste, et c'est dit.
    expect(angles.list[0].site!.button).toBe("Trouver ma tasse");
    expect(angles.issues!.join(" ")).toMatch(/Angle « Angle sur 1 » : le bouton du site \(« Trouver ma tasse »\) peut ne pas être comprise/);
  });

  it("nouvelle proposition avec les mots du client : payante, les angles déjà montrés ne sont pas refaits, l'ancien choix tombe", async () => {
    const t = await atAngles();
    await create(t);
    expect((await call("angles.choose", t.ctx, { angleId: "sur" })).ok).toBe(true);
    expect((await call("angles.propose", t.ctx, {})).jobs).toBeUndefined();
    t.ctx.runId = `run-redo-${Date.now()}`;
    const { log, angles } = await create(t, {}, { redo: "Je veux des angles plus drôles." });
    expect(log.prompts["strategist-2-sur"]).toMatch(/# Ce que le client demande pour cette nouvelle proposition \(ses mots\)\nJe veux des angles plus drôles\./);
    expect(log.prompts["strategist-2-sur"]).toMatch(/# Angles déjà montrés au client[\s\S]*- Angle sur 1 : « Accroche sur 1/);
    expect(angles.round).toBe(2);
    expect(J.journeyOf(t.cid).angleChoice).toBeUndefined();
    expect(J.journeyOf(t.cid).steps[4].status).toBe("review");
    // L'angle actif du projet reste celui d'avant jusqu'au nouveau choix.
    expect(activeStrategy(t.pid)!.angleId).toBe("sur");
  });

  // ---------------------------------------------------------------- les consignes

  it("consignes : aucune trace des projets d'essai, les règles du propriétaire y sont, SINA demande d'abord ce que le client seul sait", () => {
    const sent = [P.SEGMENTS_SYSTEM, P.strategistSystem("sur", 3), P.strategistSystem("emotion", 3), P.strategistSystem("audacieux", 3), P.reworkSystem("sur", 2), P.JUDGE_SYSTEM, P.CLARIFY_SYSTEM].join("\n");
    expect(sent).not.toMatch(/pulpe|infusion|tisane|\bthé\b|confiture|toilett|arven|sonore|paysagiste|fraise|sachet/i);
    expect(sent).toMatch(/CLAIR D'ABORD, BEAU ENSUITE/);
    expect(P.JUDGE_SYSTEM).toMatch(/TROIS TYPES DE CLIENTS DIFFÉRENTS, sans exception/);
    // La leçon du propriétaire (cahier des angles) : lue par le code, sans ses sources, sans trace des projets d'essai.
    const lesson = K.anglesLesson();
    expect(lesson).toMatch(/^## 1\. Ce qu'est un angle/);
    expect(lesson).toMatch(/un type de\s+client différent/);
    expect(lesson).toMatch(/jamais par une crainte ou une qualité que tous les\s+clients partagent/);
    expect(lesson).toMatch(/L'épreuve de l'échange/);
    expect(lesson).not.toMatch(/https?:\/\/|## Sources/);
    expect(lesson).not.toMatch(/pulpe|infusion|tisane|\bthé\b|confiture|toilett|arven|bécane|vasco|braise/i);
    expect(K.withAnglesLesson("Consigne.")).toMatch(/^Consigne\.\n\n# Ta leçon sur les angles marketing[\s\S]*## 7\. Les fautes à ne pas faire/);
    expect(sent).toMatch(/Aucun ordre donné au lecteur/);
    expect(sent).toMatch(/Jamais de personne dont le client n'a pas fourni la photo/);
    expect(P.JUDGE_SYSTEM).toMatch(/8 = tu la montrerais telle quelle/);
    expect(P.JUDGE_SYSTEM).toMatch(/Un concurrent du même métier pourrait-il la signer/);
    const before = J.anglesStepContext(J.emptyJourney()).join("\n");
    expect(before).toMatch(/AVANT de lancer, vérifie que tu sais ce que LUI SEUL peut savoir/);
    expect(before).toMatch(/ne redemande JAMAIS ce que tu sais/);
    expect(before).toMatch(/un seul accord pour toute l'étape/);
    // Une seule façon de faire : l'outil de SINA ne passe plus par l'ancien moteur de préparation.
    const src = fs.readFileSync("src/lib/syna-agent/tools/angles.ts", "utf8") + fs.readFileSync("src/lib/syna-agent/angles.ts", "utf8") + fs.readFileSync("src/lib/syna-agent/angles-chain.ts", "utf8");
    expect(src).not.toMatch(/preparation\//);
    expect(fs.readFileSync("worker/handlers.ts", "utf8")).toMatch(/"syna\.angles"/);
  });
});
