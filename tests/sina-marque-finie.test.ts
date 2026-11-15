/**
 * SINA — la marque finie de l'identité choisie (lot 2, 15 novembre 2026). Les images se créent en deux temps : chaque
 * planche proposée reçoit son logo et sa grande scène ; l'objet, les signes et les trois publications ne sont créés que
 * pour l'identité que le client choisit, avec son logo adopté et sa charte. Un seul accord du client pour toute
 * l'étape ; « un autre logo » repasse par brand.finish. Aucun appel d'IA : les spécialistes sont simulés.
 */
import { describe, expect, it } from "vitest";
import { journey, route } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — la marque finie de l'identité choisie", async () => {
  const { all, one, run } = await import("@/lib/db");
  const { JobContext } = await import("@/lib/jobs");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { getAsset, saveAsset } = await import("@/lib/library");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { threadView } = await import("@/lib/syna-agent/loop");
  const { journeyImages } = await import("@/lib/syna-agent/attachments");
  const { finishEstimate } = await import("@/lib/syna-agent/tools/identity");
  const J = await import("@/lib/syna-agent/journey");
  const C = await import("@/lib/syna-agent/brand-chain");
  const F = await import("@/lib/syna-agent/brand-finish");
  const I = await import("@/lib/syna-agent/brand-images");
  const G = await import("@/lib/syna-agent/logos");
  const sharp = (await import("sharp")).default;
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { BrandBoards } = await import("@/components/studio/brand-boards");
  /** L'écran des planches tel que le client le voit dans le fil (rendu sans navigateur). */
  const screen = async (t: { user: any; cid: string }) => renderToStaticMarkup(createElement(BrandBoards, { ids: (await fr(() => threadView(t.user, t.cid))).journey.identities as any, busy: false, onChoose: () => {} })).replace(/<style>[\s\S]*?<\/style>/g, "");
  const count = (html: string, mark: string) => html.split(mark).length - 1;
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  type Route = ReturnType<typeof route>;
  type Thread = { user: any; cid: string; ctx: any; pid: string };

  let n = 0;
  const call = async (name: string, ctx: any, args: unknown) => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };
  const estimate = async (name: string, ctx: any, args: unknown) => fr(() => getTool(name)!.estimate!(ctx, getTool(name)!.args.parse(args) as never));

  /** Fil avec l'étape 0 validée (fiche de départ d'exemple), au forfait à trois identités. */
  async function thread(): Promise<Thread> {
    const user = await account();
    const cid = threadFor(user, null);
    const ctx = { user, conversationId: cid, runId: `marque-finie-${Date.now()}-${n++}`, projectId: null as string | null, attachment: () => null } as any;
    const start = journey().start;
    await call("start.answer", ctx, { answers: [{ field: "business", value: "products" }, { field: "offer", value: start.offer!.value }] });
    await call("start.answer", ctx, { answers: [{ field: "existing", value: "Rien, je pars de zéro." }] });
    await call("start.answer", ctx, { answers: [
      { field: "audience", value: start.audience!.value }, { field: "image", value: start.image!.value }, { field: "setup", value: "6 produits" },
      { field: "market", value: "En ligne, France." }, { field: "price", value: start.price!.value }, { field: "difference", value: start.difference!.value },
      { field: "taste", status: "none" }, { field: "photos", value: "Pas de photos pour l'instant." }, { field: "language", value: "Français seulement" },
      { field: "contact", status: "later" }, { field: "platform", value: "shopify" },
    ] });
    expect((await call("start.confirm", ctx, {})).ok).toBe(true);
    const pid = one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string;
    run("UPDATE subscriptions SET plan='vendre' WHERE project_id=?", pid);
    return { user, cid, ctx, pid };
  }

  // ---------------------------------------------------------------- spécialistes simulés

  const REAL = ["J'ai respecté le dosage, goût très fade.", "on sens rien on boit de l'eau quoi!!!", "Quand je lis sans sucre je cherche ce qu'on me cache", "mon soda de 16h c'est mon seul plaisir", "pas trace de gout pêche même avec 2 sachets", "l'eau ça n'a aucun goût", "je veux arrêter le coca sans être punie", "j'oublie de boire toute la journée", "c'est joli dans la carafe au moins", "trop cher pour de l'eau parfumée", "j'aime voir les vrais morceaux", "le lendemain c'était bien meilleur"];
  const PAGE = "https://avis.example/infusions-froides";
  C.brandPageDeps.read = async (url: string) => (url.startsWith("https://avis.example") ? REAL.map((q) => `<p>« ${q} »</p>`).join("") : null);
  const BY_GROUND: Record<string, "A" | "B" | "C" | "D"> = { sombre: "A", degrade: "B", blanc: "C", uni: "D" };
  const draftOf = (x: Route, name = x.name) => {
    const { idea, nameCheck: _n, signs, wordmark, ...rest } = x.board;
    const { confessionSupport: _c, ...ideaRest } = idea;
    const { symbol: _s, ...mark } = wordmark;
    return {
      name, nameWhy: x.nameWhy, nameAnchor: x.nameAnchor, nameExpression: x.nameExpression, slogan: x.slogan, sloganTone: "", promise: x.promise, territory: x.territory,
      ground: x.ground, ...(x.gradient ? { gradient: x.gradient } : {}), palette: x.palette, paletteFamily: "", fonts: x.fonts, fontStyle: "", tone: x.tone, why: x.why,
      board: { ...rest, idea: ideaRest, signs: signs.map(({ symbol: _p, ...s }) => ({ ...s, symbolSvg: "" })), wordmark: { ...mark, symbolSvg: "" } },
    };
  };
  const pick = (key: "A" | "B" | "C", name = route(key).name, reserve = false) => ({ idea: `i${"ABC".indexOf(key) + 1}`, name, detail: route(key).nameAnchor, second: route(key).nameExpression, why: route(key).nameWhy, trials: "Passe les épreuves.", risks: [], tone: "franc", ground: route(key).ground, hue: "teinte", type: "caractère", reserve });
  const square = (color: string, w = 240, h = 240) => sharp({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer();
  /** Un logo d'essai : un dessin sombre sur un fond blanc net (le contrôle gratuit du fond refuse tout autre fond). */
  const whiteLogo = async (color = "#15122B") => sharp({ create: { width: 400, height: 400, channels: 3, background: "#FFFFFF" } }).composite([{ input: await square(color, 220, 120), left: 90, top: 140 }]).png().toBuffer();
  const isLogo = (id: string) => /-logo(:|$)/.test(id);

  type Script = {
    /** Création d'une image (par défaut : un logo sur fond blanc, sinon un carré de couleur). */
    draw?: (id: string, call: any) => Promise<Buffer>;
    /** Relecture des images (par défaut : tout est accepté, le nom est lu tel quel). */
    look?: (id: string, call: any) => any;
    /** Idée de logo rendue par la direction artistique (pour reconnaître une direction réécrite). */
    logoIdea?: string;
  };
  type Log = { ids: string[]; prompts: Record<string, string>; refs: Record<string, { logo: boolean; aspect: string }> };
  const fakeAi = (log: Log, s: Script = {}) => () => ({
    research: async (id: string) => { log.ids.push(`web:${id}`); return id === "paroles" ? [{ url: PAGE, title: "Avis", category: "customers", excerpt: REAL.map((q) => `« ${q} »`).join(" ") }] : id.startsWith("verify") ? [{ url: "https://annuaire.example/boissons", title: "Marques", category: "competitors", excerpt: "Annuaire des marques de boissons." }] : []; },
    ask: async (id: string, c: any) => {
      log.ids.push(id); log.prompts[id] = c.prompt;
      const raw: any = (() => {
        if (c.kind === "study") return { quotes: REAL.map((text) => ({ text, url: PAGE })), competitors: [], mould: "Des noms de fruits.", substitutes: [], facts: [], notFound: [] };
        if (c.kind === "strategy") return { job: "Un moment à soi.", confessions: [{ text: "Je cherche ce qu'on me cache.", quotes: [0, 1, 2] }], ideas: ["A", "B", "C", "A", "B", "C"].map((k, i) => ({ id: `i${i + 1}`, belief: i < 3 ? route(k as "A").board.idea.belief : `Idée de réserve ${i}`, confession: 0, enemy: route(k as "A").board.idea.enemy, proof: route(k as "A").board.idea.proof, cost: route(k as "A").board.idea.cost, opposite: "les marques pressées", onlyUs: "nos morceaux se voient", tone: "franc", strong: true })) };
        if (c.kind === "team") return { names: ({ "team-langue": ["Bain de Minuit", "Lâche le Morceau", "La Main Lourde", "Sans Rancune", "Grand Large"], "team-univers": ["Nage Libre", "L'Eau Est Bonne", "Grand Bain", "Plongeon", "Marée Haute"] }[id] ?? ["Un", "Deux", "Trois", "Quatre", "Cinq"]).map((name) => ({ name, detail: "détail", second: "lecture", idea: "" })) };
        if (c.kind === "judge") return { kept: [...c.prompt.matchAll(/^- (.+?) \| détail réel/gm)].slice(0, 12).map((m: RegExpMatchArray) => ({ name: m[1], seen: "Une image nette.", why: "On le porterait avec fierté." })), almost: [] };
        if (c.kind === "shortlist") return { routes: [pick("A"), pick("B"), pick("C"), pick("B", "Nage Libre", true)] };
        if (c.kind === "verify") return { checks: [] };
        if (c.kind === "direction") { const ground = /Fond de page : (\w+)/.exec(c.prompt)?.[1] ?? "blanc"; const base = route(BY_GROUND[ground]); return draftOf(base, /^Nom : (.+?)$/m.exec(c.prompt)?.[1] ?? base.name); }
        if (c.kind === "review") return { routes: [], series: "" };
        if (c.kind === "imagery") return { look: "Lumière de fin d'après-midi, rasante, sur une table claire.", logo: s.logoIdea ?? "Un logo net tiré de l'idée de la marque.", signs: "Les signes de la marque brodés sur un tablier.", hero: "Une carafe pleine de morceaux de fruits.", object: "Le sachet posé sur la table.", site: "", posts: ["Une scène.", "Un gros plan.", "Un aplat."] };
        throw new Error(`appel inattendu : ${id}`);
      })();
      return c.schema.parse(c.prepare ? c.prepare(raw) : raw);
    },
    draw: async (id: string, c: any) => { log.ids.push(id); log.prompts[id] = c.prompt; log.refs[id] = { logo: !!c.logo, aspect: c.aspect }; return s.draw ? s.draw(id, c) : isLogo(id) ? whiteLogo() : square("#3366CC"); },
    look: async (id: string, c: any) => {
      log.ids.push(id); log.prompts[id] = c.prompt;
      const name = /Marque : « (.+?) »/.exec(c.prompt)?.[1] ?? "";
      return c.schema.parse(s.look ? s.look(id, c) : { images: c.images.map((i: any) => ({ slot: i.label, ok: true, read: [name], why: "" })) });
    },
  });

  /** Exécute une tâche de marque déjà mise en file par un outil de SINA (IA simulée), puis la marque comme finie. */
  async function runJob(jobId: string, s: Script = {}) {
    const log: Log = { ids: [], prompts: {}, refs: {} };
    run("UPDATE jobs SET status='running' WHERE id=?", jobId);
    C.brandChainDeps.ai = fakeAi(log, s) as any;
    try { return { out: (await fr(() => C.runSinaBrandJob(new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jobId))))) as any, log }; }
    finally { C.brandChainDeps.ai = undefined; run("UPDATE jobs SET status='done' WHERE id=?", jobId); }
  }
  const payloadOf = (jobId: string) => JSON.parse(one<any>("SELECT payload FROM jobs WHERE id=?", jobId).payload);
  /** Le client donne son accord une fois (identity.propose), puis les planches arrivent. */
  async function proposed(t: Thread, s: Script = {}) {
    const r = await call("identity.propose", t.ctx, {});
    expect(r.ok).toBe(true);
    return { jobId: r.jobs![0] as string, ...(await runJob(r.jobs![0], s)) };
  }
  const FIRST = ":logo+hero", REST = ":object+signs+post0+post1+post2";

  // ---------------------------------------------------------------- le premier temps : la proposition

  it("proposition : seulement le logo et la grande scène de chaque planche, aucune illustratrice ; un seul devis pour toute l'étape", async () => {
    const t = await thread();
    t.ctx.projectId = t.pid;
    // Le devis montré au client : les planches PLUS la fin de la marque de l'identité qu'il choisira.
    const est = await estimate("identity.propose", t.ctx, {});
    expect(est.label).toBe("3 identités de marque");
    expect(est.maxMicro).toBe(C.chainQuote({ routes: 3 }).maxMicro + C.finishQuote().maxMicro);
    expect(est.probableMicro).toBe(C.chainQuote({ routes: 3 }).probableMicro! + C.finishQuote().probableMicro!);
    expect(I.brandImagesOn()).toBe(true);
    expect(I.PROPOSAL_SLOTS).toEqual(["logo", "hero"]);
    expect(I.FINISH_SLOTS).toEqual(["object", "signs", "post0", "post1", "post2"]);
    // Les images du premier temps sont comptées dans le devis de la chaîne ; pas celles de la fin.
    expect(C.chainQuote({ routes: 3 }).maxMicro).toBe(C.chainQuote({ routes: 3, images: true }).maxMicro);

    const { jobId, log } = await proposed(t);
    // La part de l'accord qui couvre la fin de marque est notée ; la tâche des planches garde son propre plafond.
    expect(J.journeyOf(t.cid).brandFinish).toEqual({ prepaidMicro: C.finishQuote().maxMicro });
    expect(payloadOf(jobId)).toMatchObject({ count: 3, capMicro: C.chainQuote({ routes: 3 }).maxMicro });
    expect(payloadOf(jobId).finish).toBeUndefined();
    // Après la relecture des textes : pour chaque planche, la direction artistique, le logo, la grande scène, UNE relecture.
    expect(log.ids.slice(log.ids.indexOf("review-1") + 1)).toEqual(["A", "B", "C"].flatMap((k) => [`imagery-1-${k}${FIRST}`, `image-1-${k}-logo${FIRST}`, `image-1-${k}-hero${FIRST}`, `imagecheck-1-${k}${FIRST}`]));
    expect(log.ids.filter((i) => i.startsWith("art"))).toEqual([]); // ni « art-… » ni « artcheck-… »
    expect(log.ids.filter((i) => /-(object|signs|post\d)/.test(i))).toEqual([]);
    const j = J.journeyOf(t.cid);
    expect(j.steps[1].status).toBe("review");
    for (const x of j.identities!.list) {
      expect(Object.keys(x.board!.images!).sort()).toEqual(["hero", "logo", "logoIdea", "look", "mark", "markDark"]);
      expect(x.board!.hero).toBeUndefined(); // aucune scène dessinée en code
    }
    expect(F.missingSlots(j)).toEqual([]); // rien à finir tant qu'aucune identité n'est choisie
    // La consigne générale de SINA décrit cette seule façon de faire, sans les anciens outils du logo et de la charte.
    const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
    expect(SYNA_SYSTEM).toMatch(/Sa marque est alors finie pour l'identité choisie \(brand\.finish : son logo adopté, l'objet qui le porte, ses signes, trois publications, sa charte\), il la regarde, demande ses changements \(brand\.finish avec redo\), puis la valide \(brand\.kit_validate\)\. Un seul logo : celui créé pour sa marque/);
    expect(SYNA_SYSTEM).not.toMatch(/logo\.propose|logo\.choose|\bbrand\.kit\b(?!_validate)/);
    // SINA voit ce qu'elle présente : le logo et la grande scène de chaque planche.
    expect((await journeyImages(j)).map((x) => x.label)).toEqual(j.identities!.list.flatMap((x) => [`Identité ${x.key} « ${x.name} » — le logo, montré au client sur sa planche`, `Identité ${x.key} « ${x.name} » — la grande scène, montré au client sur sa planche`]));
    expect(J.journeyContext(j)).toMatch(/Tu VOIS le logo et la grande scène de chaque planche[\s\S]*l'objet qui porte le logo, les signes en photo et trois publications sont créés pour l'identité qu'il choisit, dès son choix \(déjà compris dans son accord\)/);
    // À l'écran : trois planches avec leur logo en image ; aucune publication ni objet dessiné en code à la place
    // d'une image, et une note dit que le reste est créé pour l'identité choisie.
    const html = await screen(t);
    expect(count(html, "data-board-later")).toBe(3);
    expect(html).toContain("sont créés pour l&#x27;identité que tu choisis, dès ton choix.");
    expect(count(html, "<figure data-logo")).toBe(3);
    expect(html).not.toContain('data-post="image"');
    expect(html).not.toContain("Ta marque");
  });

  // ---------------------------------------------------------------- le second temps : la marque finie

  it("identité choisie telle quelle : la fin de marque part sans carte, crée l'objet, les signes et trois publications, adopte le logo et prépare la charte ; puis le client valide", async () => {
    const t = await thread();
    const first = await proposed(t);
    const before = J.journeyOf(t.cid);
    const board = before.identities!.list[0].board!.images!;
    expect(F.finishSlots({ ...before, identityChoice: { key: "A", mix: {}, at: 1 } })).toEqual(I.FINISH_SLOTS);

    // Le choix : gratuit ; la fin de marque est déjà comprise dans l'accord, elle part tout de suite.
    const chosen = await call("identity.choose", t.ctx, { key: "A" });
    expect(chosen.ok).toBe(true);
    expect(chosen.jobs).toHaveLength(1);
    expect(chosen.hint).toBeUndefined();
    expect(chosen.summary).toMatch(/Identité A enregistrée comme marque du projet : « Bain de Minuit »[\s\S]*Je finis maintenant ta marque \(ton logo, l'objet qui le porte, les signes, trois publications, ta charte\) : quelques minutes, déjà compris dans ton accord\./);
    expect(chosen.summary).not.toMatch(/Prochaine étape : ton logo/);
    const job = one<any>("SELECT * FROM jobs WHERE id=?", chosen.jobs![0]);
    expect(job.type).toBe(C.SINA_BRAND_JOB);
    expect(payloadOf(job.id)).toMatchObject({ finish: true, projectId: t.pid, conversationId: t.cid });
    expect(payloadOf(job.id).slots).toBeUndefined(); // ce qui manque, pas une reprise
    let j = J.journeyOf(t.cid);
    expect(j.steps[1].status).toBe("done");
    expect(j.steps[2].status).toBe("doing");
    expect(j.brandFinish!.prepaidMicro).toBe(0); // l'accord est consommé : il ne couvre pas une seconde fin
    expect(F.missingSlots(j)).toEqual(I.FINISH_SLOTS);
    // Tant que la marque n'est pas finie : rien n'est annoncé comme fini, et SINA sait qu'il reste à la finir.
    expect((await fr(() => threadView(t.user, t.cid))).journey.identities!.final).toMatchObject({ finished: false, finishIssues: [] });
    expect(J.journeyContext(j)).toMatch(/La marque — l'identité est choisie, il reste à la finir : appelle brand\.finish \(sans argument\)/);
    // Une seule création de marque à la fois.
    expect((await call("brand.finish", t.ctx, {})).summary).toMatch(/déjà en cours de création/);

    const { out, log } = await runJob(job.id);
    // Exactement les cinq images manquantes, puis UNE relecture ; la direction artistique du premier temps ressert
    // telle quelle (aucun nouvel appel « imagery »), et aucun logo n'est redessiné.
    expect(log.ids).toEqual([...I.FINISH_SLOTS.map((sl) => `image-1-A-${sl}${REST}`), `imagecheck-1-A${REST}`]);
    expect(log.prompts[`image-1-A-post0${REST}`]).toMatch(/^Direction artistique : Lumière de fin d'après-midi/);
    expect(log.prompts[`image-1-A-object${REST}`]).toContain("Le sachet posé sur la table.");
    // L'objet et les signes portent le logo de la planche, joint à la relecture pour comparer.
    expect(log.refs[`image-1-A-object${REST}`]).toEqual({ logo: true, aspect: "1:1" });
    expect(log.refs[`image-1-A-signs${REST}`]).toEqual({ logo: true, aspect: "1:1" });
    expect(log.refs[`image-1-A-post1${REST}`]).toEqual({ logo: false, aspect: "4:5" });
    expect(log.prompts[`imagecheck-1-A${REST}`]).toMatch(/La dernière image jointe \(6\) est seulement le logo de la marque, pour comparer : ne la juge pas\./);
    expect(out).toMatchObject({ finished: true, name: "Bain de Minuit", created: I.FINISH_SLOTS, issues: [], kit: true });

    j = J.journeyOf(t.cid);
    const f = j.brandFinish!;
    expect(f.prepaidMicro).toBe(0);
    expect(f.at).toBeGreaterThan(0);
    expect(f.issues).toEqual([]);
    expect(f.logoFrom).toBe(board.logo!.id);
    // Les images de la marque : celles de la planche (gardées telles quelles) plus les cinq nouvelles.
    expect(f.images!.logo).toEqual(board.logo);
    expect(f.images!.hero).toEqual(board.hero);
    expect(f.images!.mark).toEqual(board.mark);
    expect(f.images!.object).toBeTruthy();
    expect(f.images!.signs).toBeTruthy();
    expect(f.images!.posts!.every(Boolean)).toBe(true);
    expect(f.images!.posts).toHaveLength(3);
    expect(F.missingSlots(j)).toEqual([]);
    expect(G.chosenRoute(j)!.board.images).toEqual(f.images); // l'identité retenue porte les images de la marque finie
    // La planche proposée, elle, ne bouge pas.
    expect(j.identities!.list[0].board!.images).toEqual(board);
    expect(j.identities!.chainJobId).toBe(first.jobId);
    // Le logo de la planche est adopté comme logo de la marque : une nouvelle image au fond retiré, validée.
    expect(j.logos!.list).toHaveLength(1);
    expect(j.logos!.list[0]).toMatchObject({ source: "A", name: "Ton logo", kind: "image", choosable: true });
    expect(j.logoChoice).toMatchObject({ source: "A", assetId: j.logos!.list[0].assetId });
    const adopted = getAsset(j.logos!.list[0].assetId!)!;
    expect(adopted.id).not.toBe(board.logo!.id);
    expect(adopted.role).toBe("logo-v2-studio");
    const brand = loadProject(t.pid).brand!;
    expect(brand.name).toBe("Bain de Minuit");
    expect(brand.logo).toMatchObject({ status: "validated" });
    expect(brand.logo.assetId).toBeTruthy();
    expect(brand.validated).toEqual(expect.arrayContaining(["identity", "name", "palette", "fonts", "tagline"]));
    // La charte est prête, à valider ; le repère du logo est fait.
    expect(j.steps[2].status).toBe("done");
    expect(j.steps[3].status).toBe("review");
    const keys = j.brandKit!.items.map((x) => x.key);
    for (const k of ["logo", "favicon-32", "favicon-512", "avatar"]) expect(keys).toContain(k);
    expect(j.brandKit!.bookId).toBeTruthy();
    expect(getAsset(j.brandKit!.boardId!)!.name).toBe("planche-identite.png"); // la planche de la charte, rendue par le Studio

    // Dans le fil : « Ta marque », finie, avec ses images en adresses internes du Studio.
    const view = await fr(() => threadView(t.user, t.cid));
    const final = view.journey.identities!.final as any;
    expect(final.finished).toBe(true);
    expect(final.finishIssues).toEqual([]);
    expect(final.name).toBe("Bain de Minuit");
    for (const k of ["logo", "hero", "object", "signs"]) expect(final.board.images[k].url).toMatch(/^\/api\/files\/[\w-]+$/);
    expect(final.board.images.posts.map((q: any) => q.url)).toEqual([expect.stringMatching(/^\/api\/files\//), expect.stringMatching(/^\/api\/files\//), expect.stringMatching(/^\/api\/files\//)]);
    expect(view.journey.brandKit!.validated).toBe(false);
    // À l'écran : « Ta marque », avec ses trois publications en vraies images ; plus de note « créés pour l'identité… ».
    const html = await screen(t);
    expect(html).toContain(">Ta marque<");
    expect(html).not.toContain(">Ton identité<");
    expect(count(html, 'data-post="image"')).toBe(3);
    expect(html).not.toContain("data-board-later");
    expect(html).not.toContain("data-brand-finish-issues");
    for (const k of ["logo", "hero", "object", "signs"]) expect(html).toContain(final.board.images[k].url);
    // SINA regarde la marque finie avant d'en parler, puis demande la validation.
    const seen = (await journeyImages(j)).map((x) => x.label);
    expect(seen.slice(0, 7)).toEqual(["son logo", "la grande scène", "l'objet qui porte le logo", "les signes de la marque", "publication 1", "publication 2", "publication 3"].map((w) => `Marque du client — ${w}, montré au client`));
    const context = J.journeyContext(j);
    expect(context).toMatch(/La marque — sa marque complète est affichée dans le fil : le logo, la grande scène, l'objet qui porte le logo, les signes, la publication 1, la publication 2, la publication 3 ; sa charte : /);
    expect(context).toMatch(/Tu VOIS ces images \(jointes à ta réponse\) : regarde-les avant d'en parler/);
    expect(context).toMatch(/un AUTRE logo ou une image à refaire → brand\.finish avec redo et guidance = ses mots/);
    expect(context).toMatch(/appelle brand\.kit_validate\. Ne valide jamais à sa place\./);
    expect(context).not.toMatch(/logo\.propose|logo\.choose|\bbrand\.kit\b(?!_validate)/);
    // Plus rien à payer pour finir : brand.finish sans argument est gratuit, une image à refaire a son prix.
    expect(finishEstimate(j)).toEqual({ maxMicro: 0, slots: [] });
    expect(finishEstimate(j, { redo: ["post1"] }).maxMicro).toBe(C.finishQuote(["post1"]).maxMicro);

    // Une relance de la tâche de fin ne recrée et ne repaie aucune image.
    const again = await runJob(job.id);
    expect(again.log.ids).toEqual([]);
    expect(J.journeyOf(t.cid).brandFinish!.images).toEqual(f.images);

    // Le client valide sa marque : le repère 3 est fait, les angles s'ouvrent.
    const ok = await call("brand.kit_validate", t.ctx, {});
    expect(ok.ok).toBe(true);
    expect(ok.summary).toBe("Ta marque est validée. Prochaine étape : les angles.");
    j = J.journeyOf(t.cid);
    expect(j.steps[3].status).toBe("done");
    expect(j.steps[4].status).toBe("todo");
    expect(J.currentStep(j)).toBe(4);
    expect((await fr(() => threadView(t.user, t.cid))).journey.brandKit!.validated).toBe(true);
    // Une fois validée : plus de fin de marque « en douce » ; refaire une image reste possible sur demande.
    expect(await call("brand.finish", t.ctx, {})).toMatchObject({ ok: false, summary: "La marque est déjà validée." });
    expect((await journeyImages(j)).some((x) => /^Marque du client/.test(x.label ?? ""))).toBe(false);
  });

  it("choix avec mélange (le nom de A, les couleurs de B) : les images de planche ne sont plus vraies ; la fin a un prix, annoncé par brand.finish", async () => {
    const t = await thread();
    await proposed(t);
    const chosen = await call("identity.choose", t.ctx, { key: "A", mix: { palette: "B" } });
    expect(chosen.ok).toBe(true);
    expect(chosen.summary).toMatch(/Identité A \(avec palette de B\) enregistrée[\s\S]*Reste à finir ta marque : appelle brand\.finish\./);
    // Pas de tâche lancée sans accord : SINA est renvoyée vers brand.finish, qui montre le prix.
    expect(chosen.jobs).toBeUndefined();
    expect(chosen.hint).toMatch(/Appelle maintenant brand\.finish \(sans argument\)/);
    const j = J.journeyOf(t.cid);
    expect(j.steps[1].status).toBe("done");
    expect(j.steps[2].status).toBe("todo");
    // Le logo et la scène de la planche portaient les couleurs de A : il faut tout créer pour l'identité mélangée.
    expect(G.chosenRoute(j)!.board.images).toBeUndefined();
    expect(G.chosenRoute(j)!.palette).toEqual(route("B").palette);
    expect(F.missingSlots(j)).toEqual(["logo", "hero", "object", "signs", "post0", "post1", "post2"]);
    const est = finishEstimate(j);
    expect(est.slots).toEqual(["logo", "hero", "object", "signs", "post0", "post1", "post2"]);
    expect(est.maxMicro).toBeGreaterThan(0);
    // Ce qui était déjà couvert par son accord (l'objet, les signes, les publications) n'est pas compté deux fois.
    expect(est.maxMicro).toBe(C.finishQuote(est.slots).maxMicro - C.finishQuote().maxMicro);
    expect(await estimate("brand.finish", t.ctx, {})).toMatchObject({ maxMicro: est.maxMicro, label: "ta marque complète" });
    expect(J.journeyContext(j)).toMatch(/il reste à la finir : appelle brand\.finish \(sans argument\)[\s\S]*sinon le Studio montre le prix avant/);

    const r = await call("brand.finish", t.ctx, {});
    expect(r.ok).toBe(true);
    expect(r.summary).toMatch(/^Je finis ta marque \(quelques minutes\)/);
    expect(payloadOf(r.jobs![0])).toMatchObject({ finish: true, capMicro: C.finishQuote(est.slots).maxMicro });
    const { log } = await runJob(r.jobs![0]);
    // Identité mélangée : la direction artistique est réécrite pour elle (un appel « imagery »), puis les sept images.
    const all7 = ":logo+hero+object+signs+post0+post1+post2";
    expect(log.ids).toEqual([`imagery-1-A${all7}`, ...["logo", "hero", "object", "signs", "post0", "post1", "post2"].map((sl) => `image-1-A-${sl}${all7}`), `imagecheck-1-A${all7}`]);
    expect(log.prompts[`imagery-1-A${all7}`]).toContain(`couleur de marque ${route("B").palette.primary}`);
    const done = J.journeyOf(t.cid);
    expect(done.brandFinish!.images!.logo).toBeTruthy();
    expect(done.brandFinish!.images!.logo!.id).not.toBe(done.identities!.list[0].board!.images!.logo!.id);
    expect(done.steps[2].status).toBe("done");
    expect(done.steps[3].status).toBe("review");
    expect(loadProject(t.pid).brand!.palette).toEqual(route("B").palette);
    expect((await fr(() => threadView(t.user, t.cid))).journey.identities!.final).toMatchObject({ finished: true, name: "Bain de Minuit" });
  });

  it("brand.finish avec redo « logo » et les mots du client : un autre logo, l'objet et les signes refaits avec lui ; les publications ne bougent pas", async () => {
    const t = await thread();
    await proposed(t);
    const chosen = await call("identity.choose", t.ctx, { key: "A" });
    await runJob(chosen.jobs![0]);
    const before = J.journeyOf(t.cid), was = before.brandFinish!.images!;
    const logoBefore = loadProject(t.pid).brand!.logo.assetId;
    // Un nouveau logo entraîne ce qui le porte (jamais deux logos différents sur la marque).
    expect(F.finishSlots(before, ["logo"])).toEqual(["logo", "object", "signs"]);
    expect(F.finishSlots(before, ["post1"])).toEqual(["post1"]);
    const args = { redo: ["logo"], guidance: "Plus rond, avec une lune." };
    const est = await estimate("brand.finish", t.ctx, args);
    expect(est.maxMicro).toBe(C.finishQuote(["logo", "object", "signs"]).maxMicro);
    expect(est.maxMicro).toBeGreaterThan(0);
    expect(est.label).toBe("3 images de ta marque à refaire");

    const r = await call("brand.finish", t.ctx, args);
    expect(r.ok).toBe(true);
    expect(r.summary).toBe("Je refais ce que tu m'as demandé (quelques minutes) ; le reste de ta marque ne bouge pas.");
    expect(payloadOf(r.jobs![0])).toMatchObject({ finish: true, slots: ["logo", "object", "signs"], guidance: "Plus rond, avec une lune.", capMicro: est.maxMicro });
    const { log, out } = await runJob(r.jobs![0], { logoIdea: "Une lune ronde qui porte le nom.", draw: async (id) => (isLogo(id) ? whiteLogo("#7A1F5A") : square("#224466")) });
    const part = ":logo+object+signs";
    // Le client demande un changement avec ses mots : la direction artistique est réécrite, et l'ancien logo est donné
    // comme ce dont le nouveau doit nettement différer.
    expect(log.ids).toEqual([`imagery-1-A${part}`, `image-1-A-logo${part}`, `image-1-A-object${part}`, `image-1-A-signs${part}`, `imagecheck-1-A${part}`]);
    expect(log.prompts[`imagery-1-A${part}`]).toMatch(/# Ce que le client demande pour cette nouvelle proposition \(ses mots\)\nPlus rond, avec une lune\./);
    expect(log.prompts[`imagery-1-A${part}`]).toMatch(/# Logos déjà prévus pour les AUTRES propositions de cette série\n1\. Un logo net tiré de l'idée de la marque\.[\s\S]*conception NETTEMENT différente/);
    expect(log.refs[`image-1-A-logo${part}`].logo).toBe(false);
    expect(log.refs[`image-1-A-object${part}`].logo).toBe(true);
    expect(out.created).toEqual(["logo", "object", "signs"]);

    const j = J.journeyOf(t.cid), now = j.brandFinish!.images!;
    expect(now.logo!.id).not.toBe(was.logo!.id);
    expect(now.object!.id).not.toBe(was.object!.id);
    expect(now.signs!.id).not.toBe(was.signs!.id);
    expect(now.mark!.id).not.toBe(was.mark!.id);
    expect(now.logoIdea).toBe("Une lune ronde qui porte le nom.");
    // Ce qu'il garde ne bouge pas.
    expect(now.posts).toEqual(was.posts);
    expect(now.hero).toEqual(was.hero);
    // Le logo de la marque change avec lui ; la charte est refaite avec le nouveau.
    expect(j.brandFinish!.logoFrom).toBe(now.logo!.id);
    expect(j.logoChoice!.assetId).not.toBe(before.logoChoice!.assetId);
    expect(j.logos!.round).toBe(before.logos!.round + 1);
    expect(loadProject(t.pid).brand!.logo.assetId).not.toBe(logoBefore);
    expect(loadProject(t.pid).brand!.logo.status).toBe("validated");
    expect(j.brandKit!.at).toBeGreaterThanOrEqual(j.logoChoice!.at);
    expect(j.steps[2].status).toBe("done");
    expect(j.steps[3].status).toBe("review");

    // Refaire une seule publication : aucune direction réécrite sans ses mots, le logo de la marque ne change pas.
    const one1 = await call("brand.finish", t.ctx, { redo: ["post1"] });
    const second = await runJob(one1.jobs![0], { draw: async () => square("#AA5500") });
    expect(second.log.ids).toEqual(["image-1-A-post1:post1", "imagecheck-1-A:post1"]);
    const after = J.journeyOf(t.cid);
    expect(after.brandFinish!.images!.posts![1]!.id).not.toBe(now.posts![1]!.id);
    expect(after.brandFinish!.images!.posts![0]).toEqual(now.posts![0]);
    expect(after.brandFinish!.images!.logo).toEqual(now.logo);
    expect(after.logoChoice).toEqual(j.logoChoice);
    // L'outil : avant le choix d'une identité, rien à finir ; le haut du site n'est jamais une image à refaire.
    expect(getTool("brand.finish")!.kind).toBe("generate");
    expect(getTool("brand.finish")!.args.safeParse({ redo: ["site"] }).success).toBe(false);
    const fresh = await thread();
    expect(await call("brand.finish", fresh.ctx, {})).toMatchObject({ ok: false, summary: "L'identité doit être choisie avant de finir la marque." });
  });

  it("logo absent de la planche puis refusé à la relecture : le nom dessiné sert de logo, et c'est dit", async () => {
    const t = await thread();
    // À la proposition, le logo de A sort sur fond noir : refusé par le contrôle gratuit, la planche n'en a pas.
    await proposed(t, { draw: async (id) => (id.startsWith("image-1-A-logo") ? square("#050505") : isLogo(id) ? whiteLogo() : square("#3366CC")) });
    expect(J.journeyOf(t.cid).identities!.list[0].board!.images!.logo).toBeUndefined();
    const chosen = await call("identity.choose", t.ctx, { key: "A" });
    // Il manque aussi le logo : la fin n'est plus couverte en entier, elle passe par brand.finish et son prix.
    expect(chosen.jobs).toBeUndefined();
    expect(chosen.hint).toMatch(/brand\.finish/);
    const j0 = J.journeyOf(t.cid);
    expect(F.missingSlots(j0)).toEqual(["logo", "object", "signs", "post0", "post1", "post2"]);
    expect(finishEstimate(j0).maxMicro).toBe(C.finishQuote(F.missingSlots(j0)).maxMicro - C.finishQuote().maxMicro);
    const r = await call("brand.finish", t.ctx, {});
    expect(r.ok).toBe(true);
    // Le nouveau logo est refusé par la relecture (une faute dans le nom).
    const { log, out } = await runJob(r.jobs![0], { look: (_id, c) => ({ images: c.images.map((i: any) => (i.label === "logo" ? { slot: "logo", ok: false, defect: "texte", read: ["Bain de Minut"], why: "Le nom est mal écrit." } : { slot: i.label, ok: true, read: [], why: "" })) }) });
    expect(log.ids.filter((i) => i.startsWith("image-1-A-logo"))).toHaveLength(1); // jamais relancé seul
    const j = J.journeyOf(t.cid), f = j.brandFinish!;
    expect(f.images!.logo).toBeUndefined();
    expect(f.images!.mark).toBeUndefined();
    expect(f.logoFrom).toBeNull();
    // Dit au client, sans « Identité A : » (c'est SA marque) et sans dessin promis à la place d'une image.
    const said = f.issues!.join("\n");
    expect(said).toMatch(/Je n'ai pas gardé le logo \(un texte non demandé y apparaît : « Bain de Minut »\) ; tu vois ton nom dessiné à la place\./);
    expect(said).toMatch(/Je n'ai pas de logo qui passe ma relecture : ton nom dessiné, exact à la lettre, sert de logo en attendant\. Je peux t'en créer un autre, je t'annonce son prix avant\./);
    expect(said).not.toMatch(/Identité A|mon dessin|forme simple de la planche/);
    expect(out.issues).toEqual(f.issues);
    // Le client finit quand même avec un logo : son nom dessiné par le Studio, adopté et validé, et sa charte.
    expect(j.logos!.list).toHaveLength(1);
    expect(j.logos!.list[0]).toMatchObject({ source: "A", name: "Ton nom dessiné", kind: "planche", choosable: true });
    expect(getAsset(j.logoChoice!.assetId)).toBeTruthy();
    expect(loadProject(t.pid).brand!.logo).toMatchObject({ status: "validated", assetId: expect.any(String) });
    expect(j.steps[2].status).toBe("done");
    expect(j.steps[3].status).toBe("review");
    expect(j.brandKit).toBeTruthy();
    // SINA le dit honnêtement, et le fil aussi.
    expect(J.journeyContext(j)).toMatch(/À dire honnêtement au client, en mots simples \(une image ratée est dite ratée\) : [\s\S]*ton nom dessiné, exact à la lettre, sert de logo en attendant/);
    expect((await fr(() => threadView(t.user, t.cid))).journey.identities!.final).toMatchObject({ finished: true, finishIssues: f.issues });
    // Le logo manque toujours : brand.finish peut le recréer, à son prix (l'objet et les signes avec lui).
    expect(F.missingSlots(j)).toContain("logo");
    expect(finishEstimate(j).maxMicro).toBeGreaterThan(0);
  });

  it("le client garde son logo : aucun logo créé ni adopté, son logo est posé tel quel et la charte est faite avec lui", async () => {
    const t = await thread();
    const mine = await saveAsset({ projectId: t.pid, userId: t.user.id, data: await whiteLogo("#0B3D2E"), name: "mon-logo.png", mime: "image/png", role: "logo", origin: "upload" });
    J.updateJourney(t.cid, (x) => { x.keep = ["logo"]; x.mode = "refonte"; });
    expect((await I.clientLogoOf(t.pid))!.id).toBe(mine.id);
    const first = await proposed(t);
    // À la proposition : seulement la grande scène ; son logo est la marque de chaque planche.
    expect(first.log.ids.filter((i) => i.startsWith("image-"))).toEqual(["A", "B", "C"].map((k) => `image-1-${k}-hero:hero`));
    for (const x of J.journeyOf(t.cid).identities!.list) {
      expect(x.board!.images!.logo).toBeUndefined();
      expect(x.board!.images!.mark!.id).toBe(mine.id);
      expect(x.board!.images!.hero).toBeTruthy();
    }
    const chosen = await call("identity.choose", t.ctx, { key: "A" });
    expect(chosen.ok).toBe(true);
    expect(chosen.jobs).toHaveLength(1); // rien d'autre à créer que ce que son accord couvre déjà
    expect(chosen.data).toMatchObject({ etapeSuivante: 3 });
    let j = J.journeyOf(t.cid);
    expect(j.steps[2].status).toBe("skipped");
    expect(F.missingSlots(j)).toEqual(I.FINISH_SLOTS); // son logo n'est jamais « à créer »
    expect(F.finishSlots(j, ["logo", "post0"])).toEqual(["post0"]);
    expect(loadProject(t.pid).brand!.logo.assetId).toBe(mine.id);
    // Un autre logo ne se demande pas : il garde le sien.
    expect(await call("brand.finish", t.ctx, { redo: ["logo"] })).toMatchObject({ ok: false, summary: "Tu gardes ton logo : je ne le redessine pas." });

    const { log, out } = await runJob(chosen.jobs![0]);
    expect(log.ids).toEqual([...I.FINISH_SLOTS.map((sl) => `image-1-A-${sl}${REST}`), `imagecheck-1-A${REST}`]);
    expect(log.ids.some((i) => i.includes("-logo") || i.startsWith("imagery"))).toBe(false);
    // Son logo est donné en référence pour l'objet et les signes.
    expect(log.refs[`image-1-A-object${REST}`].logo).toBe(true);
    expect(log.refs[`image-1-A-signs${REST}`].logo).toBe(true);
    // Cinq images créées pour sa marque, aucune version détourée d'un logo créé (son logo est déjà la marque).
    const fresh = all<{ name: string }>("SELECT name FROM assets WHERE project_id=? AND role='brand-board' AND name LIKE 'planche-A-%' ORDER BY created_at", t.pid).map((x) => x.name);
    expect(fresh).toEqual(["hero", ...I.FINISH_SLOTS].map((sl) => `planche-A-${sl}.png`));
    expect(out).toMatchObject({ finished: true, kit: true, issues: [] });
    j = J.journeyOf(t.cid);
    expect(j.steps[2].status).toBe("skipped");
    expect(j.steps[3].status).toBe("review");
    expect(j.logos).toBeUndefined();
    expect(j.logoChoice).toBeUndefined();
    expect(j.brandFinish!.logoFrom).toBeNull();
    expect(j.brandFinish!.images!.logo).toBeUndefined();
    expect(j.brandFinish!.images!.mark!.id).toBe(mine.id);
    expect(j.brandFinish!.images!.object).toBeTruthy();
    // Aucun logo du Studio rangé pour ce projet ; le logo de la marque reste le sien, et la charte part de lui.
    expect(all("SELECT id FROM assets WHERE project_id=? AND role='logo-v2-studio'", t.pid)).toEqual([]);
    expect(loadProject(t.pid).brand!.logo.assetId).toBe(mine.id);
    expect(j.brandKit!.items.find((x) => x.key === "logo")!.assetId).toBe(mine.id);
    expect(j.brandKit!.items.map((x) => x.key)).toEqual(expect.arrayContaining(["favicon-32", "favicon-512", "avatar"]));
    // La planche de la charte est la planche d'identité rendue par le Studio, jamais une image de publication
    // (les deux portent le même rôle de fichier ; faute trouvée en écrivant ce test, corrigée dans brand-kit.ts).
    expect(String(one<{ meta: string | null }>("SELECT meta FROM assets WHERE id=?", j.brandKit!.boardId!)?.meta ?? "")).not.toMatch(/synaBoard/);
    expect(J.journeyContext(j)).toMatch(/Il garde son logo : il n'a pas été redessiné, il est posé tel quel\./);
    // Il valide : la suite s'ouvre.
    expect((await call("brand.kit_validate", t.ctx, {})).ok).toBe(true);
    expect(J.journeyOf(t.cid).steps[3].status).toBe("done");
    expect(J.currentStep(J.journeyOf(t.cid))).toBe(4);
  });

  it("changer d'identité après la fin : les images, le logo et la charte de l'ancienne ne valent plus ; la nouvelle fin a son prix", async () => {
    const t = await thread();
    await proposed(t);
    const first = await call("identity.choose", t.ctx, { key: "A" });
    await runJob(first.jobs![0]);
    expect(J.journeyOf(t.cid).brandFinish!.at).toBeGreaterThan(0);
    const other = await call("identity.choose", t.ctx, { key: "B" });
    expect(other.ok).toBe(true);
    // L'accord donné pour les identités a déjà servi pour A : la fin de B n'est pas lancée sans son accord.
    expect(other.jobs).toBeUndefined();
    expect(other.hint).toMatch(/brand\.finish/);
    const j = J.journeyOf(t.cid);
    expect(j.brandFinish).toEqual({ prepaidMicro: 0 });
    expect(j.logos).toBeUndefined();
    expect(j.logoChoice).toBeUndefined();
    expect(j.brandKit).toBeUndefined();
    expect(j.steps[2].status).toBe("todo");
    expect(j.steps[3].status).toBe("todo");
    expect(G.chosenRoute(j)!.name).toBe("Lâche le Morceau");
    expect(F.missingSlots(j)).toEqual(I.FINISH_SLOTS); // le logo et la scène de la planche B sont déjà là
    expect(finishEstimate(j).maxMicro).toBe(C.finishQuote().maxMicro);
    expect((await fr(() => threadView(t.user, t.cid))).journey.identities!.final).toMatchObject({ finished: false, name: "Lâche le Morceau" });
  });
});
