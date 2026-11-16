/**
 * SINA — la marque finie de l'identité choisie (lot 2, 15 novembre 2026). Les images se créent en deux temps : chaque
 * planche proposée reçoit son logo, sa grande scène et la maquette du haut de son site sur téléphone ; l'objet, les signes et les trois publications ne sont créés que
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
  const { assetData, getAsset, saveAsset } = await import("@/lib/library");
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
    /** Consigne de la maquette du site rendue par la direction artistique (par défaut : une vraie consigne ; « » = aucune). */
    site?: string;
    /** Création du symbole seul, tiré du logo (par défaut : un signe sombre sur un fond blanc net). */
    symbol?: (id: string, call: any) => Promise<Buffer>;
    /** Relecture du symbole seul (par défaut : gardé). */
    symbolLook?: (id: string, call: any) => { ok: boolean; why?: string };
  };
  type Log = { ids: string[]; prompts: Record<string, string>; refs: Record<string, { logo: boolean; scene: boolean; aspect: string }>; systems: Record<string, string>; labels: Record<string, string[]> };
  const isSymbol = (id: string) => id.startsWith("symbol-"), isSymbolCheck = (id: string) => id.startsWith("symbolcheck");
  /** Les appels du symbole seul dans un journal (sa création, puis sa relecture). */
  const symbolCalls = (log: Log) => log.ids.filter((i) => i.startsWith("symbol"));
  /** Les symboles créés par SINA et gardés pour ce projet (du plus ancien au plus récent). */
  const keptSymbols = (pid: string) => all<{ id: string; role: string; name: string; source_asset_id: string | null; engine: string | null }>("SELECT id, role, name, source_asset_id, json_extract(meta,'$.engine') engine FROM assets WHERE project_id=? AND deleted_at IS NULL AND json_extract(meta,'$.engine')='syna-brand-symbol' ORDER BY created_at, rowid", pid);
  const NOT_KEPT = (why: string) => `Je n'ai pas gardé le symbole tiré de ton logo (${why}) : ton favicon ne change pas pour l'instant. Je peux le refaire, je t'annonce son prix avant.`;
  /** La consigne de maquette que rend la directrice artistique simulée. */
  const SITE_BRIEF = "Maquette du haut de l'accueil sur téléphone : la carafe en grande photo pleine, le titre en bas sur la nappe claire, le logo en haut à gauche.";
  /** Les textes attendus de la maquette du site, tels que le relecteur les reçoit dans sa consigne. */
  const siteWords = (c: any): string[] => [...(/slot "site" : [^\n]*Textes attendus : ([^\n]*)/.exec(c.prompt)?.[1] ?? "").matchAll(/« (.+?) »/g)].map((m) => m[1]);
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
        if (c.kind === "imagery") return { look: "Lumière de fin d'après-midi, rasante, sur une table claire.", logo: s.logoIdea ?? "Un logo net tiré de l'idée de la marque.", signs: "Les signes de la marque brodés sur un tablier.", hero: "Une carafe pleine de morceaux de fruits.", object: "Le sachet posé sur la table.", site: s.site ?? SITE_BRIEF, posts: ["Une scène.", "Un gros plan.", "Un aplat."] };
        throw new Error(`appel inattendu : ${id}`);
      })();
      return c.schema.parse(c.prepare ? c.prepare(raw) : raw);
    },
    draw: async (id: string, c: any) => {
      log.ids.push(id); log.prompts[id] = c.prompt; log.refs[id] = { logo: !!c.logo, scene: !!c.scene, aspect: c.aspect };
      // Le symbole seul a son propre scénario : il sort par défaut comme un logo, sur un fond blanc net.
      if (isSymbol(id)) return s.symbol ? s.symbol(id, c) : whiteLogo();
      return s.draw ? s.draw(id, c) : isLogo(id) ? whiteLogo() : square("#3366CC");
    },
    look: async (id: string, c: any) => {
      log.ids.push(id); log.prompts[id] = c.prompt; log.systems[id] = c.system ?? ""; log.labels[id] = (c.images ?? []).map((i: any) => i.label);
      // La relecture du symbole seul répond avec son propre schéma ({ ok, why }) : gardé par défaut.
      if (isSymbolCheck(id)) return c.schema.parse(s.symbolLook ? s.symbolLook(id, c) : { ok: true, why: "" });
      const name = /Marque : « (.+?) »/.exec(c.prompt)?.[1] ?? "";
      // La maquette du site est lue avec tous ses mots attendus (le nom, le titre, le bouton) : un mot manquant la ferait relire.
      return c.schema.parse(s.look ? s.look(id, c) : { images: c.images.map((i: any) => ({ slot: i.label, ok: true, read: i.label === "site" ? siteWords(c) : [name], why: "" })) });
    },
  });

  /** Exécute une tâche de marque déjà mise en file par un outil de SINA (IA simulée), puis la marque comme finie. */
  async function runJob(jobId: string, s: Script = {}) {
    const log: Log = { ids: [], prompts: {}, refs: {}, systems: {}, labels: {} };
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
  const FIRST = ":logo+hero+site", REST = ":object+signs+post0+post1+post2";

  // ---------------------------------------------------------------- le premier temps : la proposition

  it("proposition : le logo, la grande scène et la maquette du site de chaque planche, rien d'autre, aucune illustratrice ; un seul devis pour toute l'étape", async () => {
    const t = await thread();
    t.ctx.projectId = t.pid;
    // Le devis montré au client : les planches PLUS la fin de la marque de l'identité qu'il choisira.
    const est = await estimate("identity.propose", t.ctx, {});
    expect(est.label).toBe("3 identités de marque");
    expect(est.maxMicro).toBe(C.chainQuote({ routes: 3 }).maxMicro + C.finishQuote().maxMicro);
    expect(est.probableMicro).toBe(C.chainQuote({ routes: 3 }).probableMicro! + C.finishQuote().probableMicro!);
    expect(I.brandImagesOn()).toBe(true);
    expect(I.PROPOSAL_SLOTS).toEqual(["logo", "hero", "site"]);
    expect(I.CREATED_SLOTS).toEqual([...I.IMAGE_SLOTS]); // la maquette du site est de nouveau une image créée
    expect(I.FINISH_SLOTS).toEqual(["object", "signs", "post0", "post1", "post2"]);
    // Les images du premier temps sont comptées dans le devis de la chaîne ; pas celles de la fin.
    expect(C.chainQuote({ routes: 3 }).maxMicro).toBe(C.chainQuote({ routes: 3, images: true }).maxMicro);

    const { jobId, log } = await proposed(t);
    // La part de l'accord qui couvre la fin de marque est notée ; la tâche des planches garde son propre plafond.
    expect(J.journeyOf(t.cid).brandFinish).toEqual({ prepaidMicro: C.finishQuote().maxMicro });
    expect(payloadOf(jobId)).toMatchObject({ count: 3, capMicro: C.chainQuote({ routes: 3 }).maxMicro });
    expect(payloadOf(jobId).finish).toBeUndefined();
    // Après la relecture des textes : pour chaque planche, la direction artistique, le logo, la grande scène, la
    // maquette du haut du site, puis UNE relecture.
    expect(log.ids.slice(log.ids.indexOf("review-1") + 1)).toEqual(["A", "B", "C"].flatMap((k) => [`imagery-1-${k}${FIRST}`, `image-1-${k}-logo${FIRST}`, `image-1-${k}-hero${FIRST}`, `image-1-${k}-site${FIRST}`, `imagecheck-1-${k}${FIRST}`]));
    // La maquette : en portrait, avec le logo et la grande scène de SA planche en références ; le logo et la scène,
    // eux, naissent sans modèle.
    for (const k of ["A", "B", "C"]) {
      // Chaque logo repart de zéro : aucune image jointe (demande du propriétaire du 16 novembre 2026 : « ne joins pas
      // d'autre logo, fais comme s'il repartait de base »), seulement le métier, les couleurs, la typographie et la
      // direction artistique de l'identité.
      expect(log.refs[`image-1-${k}-logo${FIRST}`]).toEqual({ logo: false, scene: false, aspect: "1:1" });
      // Demande du propriétaire du 16 novembre 2026 : le premier logo est créé avec les seules consignes de base ; le
      // deuxième reçoit le premier avec « je veux un logo complètement différent de celui-là » ; le troisième, les deux premiers.
      if (k === "A") expect(log.prompts[`image-1-${k}-logo${FIRST}`]).not.toMatch(/L'image jointe/);
      if (k === "B") expect(log.prompts[`image-1-${k}-logo${FIRST}`]).toMatch(/L'image jointe montre le logo déjà fait pour ce client\. Je veux un logo complètement différent de celui-là\.$/);
      if (k === "C") expect(log.prompts[`image-1-${k}-logo${FIRST}`]).toMatch(/L'image jointe montre les 2 logos déjà faits pour ce client\. Je veux un logo complètement différent de ceux-là\.$/);
      expect(log.prompts[`image-1-${k}-logo${FIRST}`]).toMatch(/Direction artistique de la marque : /);
      expect(log.prompts[`image-1-${k}-logo${FIRST}`]).toMatch(/Typographie de la marque : un caractère /);
      expect(log.refs[`image-1-${k}-hero${FIRST}`]).toEqual({ logo: false, scene: false, aspect: "16:9" });
      expect(log.refs[`image-1-${k}-site${FIRST}`]).toEqual({ logo: true, scene: true, aspect: "9:16" });
    }
    {
      // Ses mots : le titre et le bouton de la planche, lettre pour lettre ; le nom est porté par le logo fourni ; les
      // entrées du menu et le paragraphe du site n'y sont ni exigés ni attendus.
      const a = J.journeyOf(t.cid).identities!.list[0], site = a.board!.site;
      expect(site.menu.length).toBeGreaterThan(0);
      expect(I.slotTexts(a as any).site).toEqual([a.name, site.headline, site.button]);
      const prompt = log.prompts[`image-1-A-site${FIRST}`];
      expect(prompt).toMatch(/^Direction artistique : Lumière de fin d'après-midi/);
      expect(prompt).toContain(SITE_BRIEF);
      expect(prompt).toContain(`Textes à écrire dans l'image, lettre pour lettre, accents et ponctuation compris : ${[site.headline, site.button].map((w) => `« ${w} »`).join(" ; ")}. Aucun autre texte`);
      expect(prompt).not.toContain(site.text);
      // Les entrées du menu du client sont les SEULS mots permis sur des tuiles ou des pastilles : rien d'inventé.
      expect(prompt).toContain(`elles ne portent QUE ces mots, écrits tels quels : ${site.menu.map((m) => `« ${m} »`).join(", ")}. N'invente aucune prestation, aucune catégorie, aucune offre.`);
      expect(prompt).toMatch(/Le logo de l'en-tête est GRAND et net \(au moins un tiers de la largeur de l'écran\)/);
      expect(prompt).toMatch(/Le logo fourni en image de référence est reproduit tel quel/);
      expect(prompt).not.toContain(I.NO_INVENTED_MARK);
      // L'image montre UN téléphone entier, vu de face, sur un fond uni doux (le Studio ne pose plus de cadre autour) ;
      // le titre y est très grand.
      expect(prompt).toMatch(/Maquette de présentation d'un site, au niveau des plus beaux sites primés de 2026 : UN téléphone récent, entier, vu bien de face, posé sur un fond uni très doux, avec une ombre légère ; son écran montre le haut de la page d'accueil décrit ci-dessus/);
      expect(prompt).toMatch(/Le titre est TRÈS grand et occupe une vraie place sur l'écran ; un seul bouton ; très peu de mots\./);
      expect(prompt).toMatch(/Rien autour du téléphone : ni main, ni table, ni décor\./);
      expect(prompt).not.toMatch(/Montre seulement l'écran du téléphone|ni téléphone, ni cadre/);
      expect(prompt).toMatch(/Aucune personne, aucun visage, aucune main/);
      // La relecture attend ces mêmes mots, juge la beauté de la maquette et sait que les petits mots d'interface sont normaux.
      const check = log.prompts[`imagecheck-1-A${FIRST}`];
      expect(check).toContain(`slot "site" : la maquette du haut de la page d'accueil, dans un téléphone entier vu de face : elle doit être BELLE et donner envie`);
      expect(check).toMatch(/un titre TRÈS grand au caractère affirmé, une photo de campagne au sujet très grand/);
      expect(check).toMatch(/un titre petit ou timide, une photo d'ambiance banale, une mise en page pauvre, vide ou confuse, un logo flou sont des défauts \(defect « autre »\)/);
      expect(check).toContain(`Les petits mots d'interface (l'heure, une ligne sous le titre, une entrée secondaire) sont normaux. Textes attendus : ${[a.name, site.headline, site.button].map((w) => `« ${w} »`).join(" ; ")}.`);
      expect(check).not.toContain(site.text);
      // La directrice artistique reçoit le titre, la ligne dessous, le bouton, le menu et la manière d'ouvrir choisie pour cette identité.
      expect(site.layout!.opening!.length).toBeGreaterThan(20);
      expect(log.prompts[`imagery-1-A${FIRST}`]).toContain(`Site (haut de l'accueil) : titre « ${site.headline} » ; ligne dessous « ${site.text} » ; bouton « ${site.button} » ; entrées du menu : ${site.menu.join(" · ")} ; manière d'ouvrir choisie pour cette identité : ${site.layout!.opening}`);
    }
    expect(log.ids.filter((i) => i.startsWith("art"))).toEqual([]); // ni « art-… » ni « artcheck-… »
    expect(log.ids.filter((i) => /-(object|signs|post\d)/.test(i))).toEqual([]);
    const j = J.journeyOf(t.cid);
    expect(j.steps[1].status).toBe("review");
    for (const x of j.identities!.list) {
      expect(Object.keys(x.board!.images!).sort()).toEqual(["hero", "logo", "logoIdea", "look", "mark", "markDark", "site"]);
      expect(getAsset(x.board!.images!.site!.id)).toMatchObject({ name: `planche-${x.key}-site.png`, role: "brand-board", status: "ready" });
      expect(x.board!.hero).toBeUndefined(); // aucune scène dessinée en code
    }
    expect(F.missingSlots(j)).toEqual([]); // rien à finir tant qu'aucune identité n'est choisie
    // La consigne générale de SINA décrit cette seule façon de faire, sans les anciens outils du logo et de la charte.
    const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
    expect(SYNA_SYSTEM).toMatch(/Sa marque est alors finie pour l'identité choisie \(brand\.finish : son logo adopté, l'objet qui le porte, ses signes, trois publications, sa charte\), il la regarde, demande ses changements \(brand\.finish avec redo\), puis la valide \(brand\.kit_validate\)\. Un seul logo : celui créé pour sa marque/);
    expect(SYNA_SYSTEM).not.toMatch(/logo\.propose|logo\.choose|\bbrand\.kit\b(?!_validate)/);
    // SINA voit ce qu'elle présente : le logo, la grande scène et la maquette du site de chaque planche.
    expect((await journeyImages(j)).map((x) => x.label)).toEqual(j.identities!.list.flatMap((x) => [`Identité ${x.key} « ${x.name} » — le logo, montré au client sur sa planche`, `Identité ${x.key} « ${x.name} » — la grande scène, montré au client sur sa planche`, `Identité ${x.key} « ${x.name} » — la maquette du haut de son site, sur téléphone, montré au client sur sa planche`]));
    expect(J.journeyContext(j)).toMatch(/Tu VOIS le logo, la grande scène et la maquette du haut du site de chaque planche \(images jointes à ta réponse\) : regarde-les avant d'en parler, et dis franchement si l'une d'elles n'est pas belle\.[\s\S]*la maquette du haut de son site sur téléphone[\s\S]*l'objet qui porte le logo, les signes en photo et trois publications sont créés pour l'identité qu'il choisit, dès son choix \(déjà compris dans son accord\)/);
    // À l'écran : trois planches avec leur logo en image ; aucune publication ni objet dessiné en code à la place
    // d'une image, et une note dit que le reste est créé pour l'identité choisie.
    const html = await screen(t);
    // La maquette créée est montrée dans le cadre du téléphone ; plus aucune page de site dessinée par le Studio.
    expect(count(html, 'data-screen="maquette"')).toBe(3);
    expect(count(html, "<figure data-phone")).toBe(3);
    expect(html).not.toContain('data-screen="site"');
    expect(html).not.toContain("bb-ps-");
    expect(count(html, "Le haut de ton site, sur téléphone")).toBe(3);
    {
      const shown = (await fr(() => threadView(t.user, t.cid))).journey.identities!.list as any[];
      for (const x of shown) {
        expect(x.board.images.site.url).toMatch(/^\/api\/files\/[\w-]+$/);
        expect(html).toMatch(new RegExp(`data-screen="maquette"><img[^>]*src="${x.board.images.site.url}"`));
      }
    }
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
    // telle quelle (aucun nouvel appel « imagery »), et aucun logo n'est redessiné. Après l'adoption du logo : le
    // symbole seul, tiré de lui, puis SA relecture.
    expect(log.ids).toEqual([...I.FINISH_SLOTS.map((sl) => `image-1-A-${sl}${REST}`), `imagecheck-1-A${REST}`, "symbol-1", "symbolcheck-1"]);
    expect(log.prompts[`image-1-A-post0${REST}`]).toMatch(/^Direction artistique : Lumière de fin d'après-midi/);
    expect(log.prompts[`image-1-A-object${REST}`]).toContain("Le sachet posé sur la table.");
    // L'objet et les signes portent le logo de la planche, joint à la relecture pour comparer.
    expect(log.refs[`image-1-A-object${REST}`]).toEqual({ logo: true, scene: false, aspect: "1:1" });
    expect(log.refs[`image-1-A-signs${REST}`]).toEqual({ logo: true, scene: false, aspect: "1:1" });
    // Chaque publication est signée : elle reçoit le logo, posé en petit (retour du propriétaire du 16 novembre 2026 :
    // « j'ai pas compris l'angle marketing des images », devant trois publications sans nom de marque).
    expect(log.refs[`image-1-A-post1${REST}`]).toEqual({ logo: true, scene: false, aspect: "4:5" });
    expect(log.prompts[`image-1-A-post1${REST}`]).toContain("Le logo est posé en PETIT dans un coin calme de l'image, entier, net et lisible, sans gêner le texte. Sur une zone foncée de l'image, il est dans sa version claire (ses parties foncées en clair) : jamais un logo foncé sur du foncé.");
    const BP = await import("@/lib/syna-agent/brand-prompts");
    expect(BP.directionSystem("produits")).toMatch(/Chaque publication est lue par quelqu'un qui ne connaît PAS la marque : elle se comprend seule\. La PREMIÈRE dit l'offre en clair/);
    expect(BP.imagerySystem("produits")).toMatch(/La PREMIÈRE publication montre clairement ce qui est vendu/);
    expect(BP.reviewSystem("produits")).toMatch(/des publications qu'une personne qui ne connaît pas la marque ne comprendrait pas seule/);
    expect(log.ids.some((i) => i.includes("-site"))).toBe(false); // la maquette de la planche est gardée, jamais repayée
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
    expect(board.site).toBeTruthy();
    expect(f.images!.site).toEqual(board.site);
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
    // Le symbole seul : demandé en carré avec le logo de la marque en seule référence, sur la consigne du Studio.
    expect(log.refs["symbol-1"]).toEqual({ logo: true, scene: false, aspect: "1:1" });
    expect(log.prompts["symbol-1"]).toBe(F.symbolPrompt(G.chosenRoute(j)!));
    {
      const asked = F.symbolPrompt(route("A"));
      // Le signe du logo, tel quel, sans le nom ni aucun texte ; à défaut de signe, sa lettre la plus reconnaissable.
      expect(asked).toMatch(/^Voici le logo de la marque « Bain de Minuit » \(image de référence\)\. Crée son SYMBOLE SEUL/);
      expect(asked).toMatch(/reprends EXACTEMENT le signe du logo \(le même dessin, les mêmes traits, les mêmes couleurs\), sans le nom ni aucun autre texte\./);
      expect(asked).toMatch(/Si le logo n'a pas de signe à côté du nom, prends sa lettre la plus reconnaissable, dessinée exactement comme dans le logo/);
      expect(asked).toMatch(/lisible en tout petit \(16 pixels\)/);
      // Sur un fond blanc uni, seul : ni cadre, ni rond, ni ombre, ni maquette.
      expect(asked).toMatch(/Un seul symbole, centré, à plat, sur un fond BLANC uni jusqu'aux bords, avec de l'air autour\. Ni cadre, ni rond autour, ni ombre, ni maquette\./);
      expect(asked.split("\n")).toHaveLength(4);
      // Aucun exemple tiré d'une autre marque dans la consigne : seul le nom de celle-ci y figure.
      expect(F.symbolPrompt({ ...route("A"), name: "Tout Autre Nom" }).replace("Tout Autre Nom", "Bain de Minuit")).toBe(asked);
    }
    // Sa relecture compare le symbole au logo : deux images, le symbole d'abord, avec le schéma { ok, why }.
    expect(log.labels["symbolcheck-1"]).toEqual(["symbole", "logo"]);
    expect(log.prompts["symbolcheck-1"]).toBe("Marque : « Bain de Minuit ». Image 1 : le symbole proposé. Image 2 : le logo de la marque.");
    expect(log.systems["symbolcheck-1"]).toMatch(/ok = true seulement si : c'est bien le signe du logo \(ou une lettre du nom dessinée comme dans le logo\), reconnaissable au premier regard, dans ses couleurs ; il est seul, sans le nom entier ni autre texte ; il resterait lisible en tout petit\./);
    // Gardé : un fichier « symbole seul » rattaché au logo de la marque, et la marque pointe sur lui.
    expect(keptSymbols(t.pid)).toEqual([{ id: brand.logo.markAssetId, role: "logo-mark", name: "symbole.png", source_asset_id: brand.logo.assetId, engine: "syna-brand-symbol" }]);
    const symbol = getAsset(brand.logo.markAssetId!)!;
    expect(symbol).toMatchObject({ role: "logo-mark", mime: "image/png", origin: "generated", source_asset_id: brand.logo.assetId });
    expect(getAsset(brand.logo.assetId!)).toMatchObject({ role: "logo", project_id: t.pid }); // le logo principal de la marque, pas le fichier de planche
    expect(symbol.source_asset_id).not.toBe(board.logo!.id);
    expect((f as any).symbolFor).toBe(brand.logo.assetId);
    // Son fond blanc est retiré (pas de carré autour) : les coins sont transparents.
    {
      const { data, info } = await sharp(assetData(symbol)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(info.channels).toBe(4);
      expect(data[3]).toBe(0);
      expect(data[data.length - 1]).toBe(0);
    }
    // La charte est prête, à valider ; le repère du logo est fait.
    expect(j.steps[2].status).toBe("done");
    expect(j.steps[3].status).toBe("review");
    const keys = j.brandKit!.items.map((x) => x.key);
    for (const k of ["logo", "symbole", "favicon-32", "favicon-512", "avatar"]) expect(keys).toContain(k);
    // La charte montre CE symbole (« Symbole seul »), et ne dit pas qu'il manque.
    expect(j.brandKit!.items.find((x) => x.key === "symbole")).toMatchObject({ assetId: symbol.id, label: "Symbole seul" });
    expect(j.brandKit!.notes.join("\n")).not.toMatch(/Pas de symbole séparé/);
    // Le favicon de 32 px part du symbole : une image de 32 px rattachée au logo, jamais une initiale dessinée par le Studio.
    {
      const fav = getAsset(j.brandKit!.items.find((x) => x.key === "favicon-32")!.assetId)!;
      expect(fav).toMatchObject({ role: "favicon-32", source_asset_id: brand.logo.assetId });
      const meta = await sharp(assetData(fav)).metadata();
      expect([meta.width, meta.height]).toEqual([32, 32]);
      expect(j.brandKit!.notes.join("\n")).not.toMatch(/il reprend l'initiale de la marque/);
    }
    expect(j.brandKit!.bookId).toBeTruthy();
    expect(getAsset(j.brandKit!.boardId!)!.name).toBe("planche-identite.png"); // la planche de la charte, rendue par le Studio

    // Dans le fil : « Ta marque », finie, avec ses images en adresses internes du Studio.
    const view = await fr(() => threadView(t.user, t.cid));
    const final = view.journey.identities!.final as any;
    expect(final.finished).toBe(true);
    expect(final.finishIssues).toEqual([]);
    expect(final.name).toBe("Bain de Minuit");
    for (const k of ["logo", "hero", "site", "object", "signs"]) expect(final.board.images[k].url).toMatch(/^\/api\/files\/[\w-]+$/);
    expect(final.board.images.posts.map((q: any) => q.url)).toEqual([expect.stringMatching(/^\/api\/files\//), expect.stringMatching(/^\/api\/files\//), expect.stringMatching(/^\/api\/files\//)]);
    expect(view.journey.brandKit!.validated).toBe(false);
    // À l'écran : « Ta marque », avec ses trois publications en vraies images ; plus de note « créés pour l'identité… ».
    const html = await screen(t);
    expect(html).toContain(">Ta marque<");
    expect(html).not.toContain(">Ton identité<");
    expect(count(html, 'data-post="image"')).toBe(3);
    expect(html).not.toContain("data-board-later");
    expect(html).not.toContain("data-brand-finish-issues");
    for (const k of ["logo", "hero", "site", "object", "signs"]) expect(html).toContain(final.board.images[k].url);
    // Sa maquette reste dans le cadre du téléphone ; aucune page de site dessinée par le Studio.
    expect(html).toMatch(new RegExp(`data-screen="maquette"><img[^>]*src="${final.board.images.site.url}"`));
    expect(html).not.toContain('data-screen="site"');
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

    // Une relance de la tâche de fin ne recrée et ne repaie aucune image, ni le symbole.
    const again = await runJob(job.id);
    expect(again.log.ids).toEqual([]);
    expect(J.journeyOf(t.cid).brandFinish!.images).toEqual(f.images);
    expect((J.journeyOf(t.cid).brandFinish as any).symbolFor).toBe(brand.logo.assetId);
    expect(loadProject(t.pid).brand!.logo.markAssetId).toBe(symbol.id);
    expect(keptSymbols(t.pid)).toHaveLength(1);

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
    // (La maquette du site appartient à la proposition : elle ne se refait que si le client la demande.)
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
    // Identité mélangée : la direction artistique est réécrite pour elle (un appel « imagery »), puis les sept images
    // de sa marque (la maquette du site appartient à la proposition : elle ne se refait que si le client la demande).
    const all8 = ":logo+hero+object+signs+post0+post1+post2";
    // Puis le symbole seul, tiré du logo créé pour l'identité mélangée, et sa relecture.
    expect(log.ids).toEqual([`imagery-1-A${all8}`, ...["logo", "hero", "object", "signs", "post0", "post1", "post2"].map((sl) => `image-1-A-${sl}${all8}`), `imagecheck-1-A${all8}`, "symbol-1", "symbolcheck-1"]);
    expect(log.prompts[`imagery-1-A${all8}`]).toContain(`couleur de marque ${route("B").palette.primary}`);
    const done = J.journeyOf(t.cid);
    {
      const logo = loadProject(t.pid).brand!.logo;
      expect(keptSymbols(t.pid)).toEqual([{ id: logo.markAssetId, role: "logo-mark", name: "symbole.png", source_asset_id: logo.assetId, engine: "syna-brand-symbol" }]);
      expect((done.brandFinish as any).symbolFor).toBe(logo.assetId);
      expect(done.brandFinish!.issues).toEqual([]);
    }
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
    const logoBefore = loadProject(t.pid).brand!.logo.assetId, symbolBefore = loadProject(t.pid).brand!.logo.markAssetId;
    expect(keptSymbols(t.pid).map((x) => x.id)).toEqual([symbolBefore]);
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
    // Un autre logo : son symbole est tiré du NOUVEAU logo (un appel de création, un de relecture).
    expect(log.ids).toEqual([`imagery-1-A${part}`, `image-1-A-logo${part}`, `image-1-A-object${part}`, `image-1-A-signs${part}`, `imagecheck-1-A${part}`, "symbol-1", "symbolcheck-1"]);
    expect(log.refs["symbol-1"]).toEqual({ logo: true, scene: false, aspect: "1:1" });
    expect(log.prompts[`imagery-1-A${part}`]).toMatch(/# Ce que le client demande pour cette nouvelle proposition \(ses mots\)\nPlus rond, avec une lune\./);
    // Rien des autres logos n'est transmis, ni en image ni en mots : chaque logo repart de zéro.
    expect(log.prompts[`imagery-1-A${part}`]).not.toMatch(/Logos déjà prévus|AUTRES propositions|logos DÉJÀ/);
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
    expect(now.site).toEqual(was.site);
    // Le logo de la marque change avec lui ; la charte est refaite avec le nouveau.
    expect(j.brandFinish!.logoFrom).toBe(now.logo!.id);
    expect(j.logoChoice!.assetId).not.toBe(before.logoChoice!.assetId);
    expect(j.logos!.round).toBe(before.logos!.round + 1);
    expect(loadProject(t.pid).brand!.logo.assetId).not.toBe(logoBefore);
    expect(loadProject(t.pid).brand!.logo.status).toBe("validated");
    // Le symbole suit le logo : un nouveau fichier, rattaché au nouveau logo ; la charte montre celui-là.
    const logoNow = loadProject(t.pid).brand!.logo;
    expect(logoNow.markAssetId).not.toBe(symbolBefore);
    expect(keptSymbols(t.pid).map((x) => [x.id, x.source_asset_id])).toEqual([[symbolBefore, logoBefore], [logoNow.markAssetId, logoNow.assetId]]);
    expect((j.brandFinish as any).symbolFor).toBe(logoNow.assetId);
    expect(j.brandKit!.items.find((x) => x.key === "symbole")!.assetId).toBe(logoNow.markAssetId);
    expect(j.brandFinish!.issues).toEqual([]);
    expect(j.brandKit!.at).toBeGreaterThanOrEqual(j.logoChoice!.at);
    expect(j.steps[2].status).toBe("done");
    expect(j.steps[3].status).toBe("review");

    // Refaire une seule publication : aucune direction réécrite sans ses mots, le logo de la marque ne change pas.
    const one1 = await call("brand.finish", t.ctx, { redo: ["post1"] });
    const second = await runJob(one1.jobs![0], { draw: async () => square("#AA5500") });
    // Une AUTRE tâche, le même logo : le symbole déjà gardé n'est ni recréé ni relu (aucun appel « symbol… »).
    expect(second.log.ids).toEqual(["image-1-A-post1:post1", "imagecheck-1-A:post1"]);
    const after = J.journeyOf(t.cid);
    expect(loadProject(t.pid).brand!.logo.markAssetId).toBe(logoNow.markAssetId);
    expect((after.brandFinish as any).symbolFor).toBe(logoNow.assetId);
    expect(keptSymbols(t.pid)).toHaveLength(2);
    expect(after.brandFinish!.images!.posts![1]!.id).not.toBe(now.posts![1]!.id);
    expect(after.brandFinish!.images!.posts![0]).toEqual(now.posts![0]);
    expect(after.brandFinish!.images!.logo).toEqual(now.logo);
    expect(after.logoChoice).toEqual(j.logoChoice);
    // La maquette du haut du site est une image de la marque comme les autres : elle se refait seule, à son prix, avec
    // le logo et la grande scène GARDÉS en références, en portrait ; rien d'autre ne bouge.
    expect(getTool("brand.finish")!.kind).toBe("generate");
    expect(getTool("brand.finish")!.args.safeParse({ redo: ["site"] }).success).toBe(true);
    expect(getTool("brand.finish")!.args.safeParse({ redo: ["affiche"] }).success).toBe(false);
    expect(F.finishSlots(after, ["site"])).toEqual(["site"]);
    const siteEst = await estimate("brand.finish", t.ctx, { redo: ["site"] });
    expect(siteEst.maxMicro).toBe(C.finishQuote(["site"]).maxMicro);
    expect(siteEst.maxMicro).toBeGreaterThan(0);
    expect(siteEst.label).toBe("1 image de ta marque à refaire");
    const siteJob = await call("brand.finish", t.ctx, { redo: ["site"] });
    expect(payloadOf(siteJob.jobs![0])).toMatchObject({ finish: true, slots: ["site"], capMicro: siteEst.maxMicro });
    const third = await runJob(siteJob.jobs![0], { draw: async () => square("#5511AA") });
    expect(third.log.ids).toEqual(["image-1-A-site:site", "imagecheck-1-A:site"]);
    expect(third.log.refs["image-1-A-site:site"]).toEqual({ logo: true, scene: true, aspect: "9:16" });
    const last = J.journeyOf(t.cid).brandFinish!.images!;
    expect(last.site!.id).not.toBe(after.brandFinish!.images!.site!.id);
    expect({ ...last, site: undefined, markDark: undefined }).toEqual({ ...after.brandFinish!.images!, site: undefined, markDark: undefined });
    expect(J.journeyOf(t.cid).logoChoice).toEqual(j.logoChoice);
    expect(keptSymbols(t.pid)).toHaveLength(2);
    // Avant le choix d'une identité, rien à finir.
    const fresh = await thread();
    expect(await call("brand.finish", fresh.ctx, {})).toMatchObject({ ok: false, summary: "L'identité doit être choisie avant de finir la marque." });
  });

  it("logo absent de la planche puis refusé à la relecture : le nom dessiné sert de logo, et c'est dit", async () => {
    const t = await thread();
    // À la proposition, le logo de A sort sur fond noir : refusé par le contrôle gratuit, la planche n'en a pas.
    const first = await proposed(t, { draw: async (id) => (id.startsWith("image-1-A-logo") ? square("#050505") : isLogo(id) ? whiteLogo() : square("#3366CC")) });
    expect(J.journeyOf(t.cid).identities!.list[0].board!.images!.logo).toBeUndefined();
    // Sans logo gardé, la maquette du site ne reçoit que la grande scène : le nom y est écrit seul, sans logo inventé.
    expect(first.log.refs[`image-1-A-site${FIRST}`]).toEqual({ logo: false, scene: true, aspect: "9:16" });
    expect(first.log.refs[`image-1-B-site${FIRST}`]).toEqual({ logo: true, scene: true, aspect: "9:16" });
    expect(first.log.prompts[`image-1-A-site${FIRST}`]).toContain(I.NO_INVENTED_MARK);
    expect(first.log.prompts[`image-1-A-site${FIRST}`]).toMatch(/Textes à écrire dans l'image, lettre pour lettre, accents et ponctuation compris : « Bain de Minuit » ; /);
    expect(first.log.prompts[`image-1-A-site${FIRST}`]).not.toMatch(/Le logo fourni en image de référence/);
    expect(J.journeyOf(t.cid).identities!.list[0].board!.images!.site).toBeTruthy();
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
    expect(log.ids.filter((i) => i.startsWith("image-1-A-logo"))).toHaveLength(3); // refusé, puis repris deux fois avant d'être dit
    // Le nom dessiné de secours n'est pas un logo dont on tire un symbole : aucune création, aucune relecture, rien de gardé.
    expect(symbolCalls(log)).toEqual([]);
    expect(keptSymbols(t.pid)).toEqual([]);
    expect((J.journeyOf(t.cid).brandFinish as any).symbolFor).toBeUndefined();
    expect(J.journeyOf(t.cid).brandFinish!.issues!.join("\n")).not.toMatch(/symbole/);
    const j = J.journeyOf(t.cid), f = j.brandFinish!;
    expect(f.images!.logo).toBeUndefined();
    expect(f.images!.mark).toBeUndefined();
    expect(f.logoFrom).toBeNull();
    // Dit au client, sans « Identité A : » (c'est SA marque) et sans dessin promis à la place d'une image.
    const said = f.issues!.join("\n");
    // Le texte attendu qui manque est dit en premier (un mot mal écrit, c'est le nom qui manque).
    expect(said).toMatch(/Je n'ai pas gardé le logo \(le texte « Bain de Minuit » n'y est pas écrit exactement\) ; tu vois ton nom dessiné à la place\./);
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

  it("symbole refusé (relecture, fond non blanc, création en échec) : rien n'est gardé et c'est dit ; la relance de la tâche ne repaie rien", async () => {
    const t = await thread();
    await proposed(t);
    const chosen = await call("identity.choose", t.ctx, { key: "A" });
    // 1. Refusé à la relecture : le défaut du relecteur est dit, sans son point final.
    const { log, out } = await runJob(chosen.jobs![0], { symbolLook: () => ({ ok: false, why: "On y lit encore le nom entier." }) });
    expect(symbolCalls(log)).toEqual(["symbol-1", "symbolcheck-1"]);
    let j = J.journeyOf(t.cid);
    const logo = loadProject(t.pid).brand!.logo;
    expect(keptSymbols(t.pid)).toEqual([]);
    expect(all("SELECT id FROM assets WHERE project_id=? AND name='symbole.png'", t.pid)).toEqual([]);
    expect((j.brandFinish as any).symbolFor).toMatch(/^refus:/); // refusé : pas de nouvel essai tout seul pour ce logo
    expect(j.brandFinish!.issues).toEqual([NOT_KEPT("On y lit encore le nom entier")]);
    expect(out.issues).toEqual(j.brandFinish!.issues);
    // La marque ne pointe sur aucun symbole de SINA ; le reste de la marque est fini et la charte est prête.
    expect(logo.markAssetId ? String(one<{ e: string | null }>("SELECT json_extract(meta,'$.engine') e FROM assets WHERE id=?", logo.markAssetId)?.e ?? "") : "").not.toBe("syna-brand-symbol");
    expect(out).toMatchObject({ finished: true, kit: true, created: I.FINISH_SLOTS });
    expect(j.steps[3].status).toBe("review");
    expect(j.brandKit!.items.map((x) => x.key)).toEqual(expect.arrayContaining(["logo", "favicon-32", "favicon-512", "avatar"]));
    // Dit au client dans le fil, et SINA le sait.
    expect((await fr(() => threadView(t.user, t.cid))).journey.identities!.final).toMatchObject({ finished: true, finishIssues: j.brandFinish!.issues });
    expect(J.journeyContext(j)).toContain("Je n'ai pas gardé le symbole tiré de ton logo (On y lit encore le nom entier)");
    // La relance de la MÊME tâche ne refait aucun appel (ni création, ni relecture), et le refus reste dit.
    const again = await runJob(chosen.jobs![0]);
    expect(again.log.ids).toEqual([]);
    expect(J.journeyOf(t.cid).brandFinish!.issues).toEqual([NOT_KEPT("On y lit encore le nom entier")]);
    expect(keptSymbols(t.pid)).toEqual([]);

    // 2. Une relecture qui refuse sans dire pourquoi : une raison simple est donnée à sa place.
    const t2 = await thread();
    await proposed(t2);
    const chosen2 = await call("identity.choose", t2.ctx, { key: "A" });
    const mute = await runJob(chosen2.jobs![0], { symbolLook: () => ({ ok: false, why: "" }) });
    expect(symbolCalls(mute.log)).toEqual(["symbol-1", "symbolcheck-1"]);
    expect(J.journeyOf(t2.cid).brandFinish!.issues).toEqual([NOT_KEPT("il ne reprend pas le logo")]);
    expect(keptSymbols(t2.pid)).toEqual([]);

    // 3. Sur un fond qui n'est pas blanc : refusé par le contrôle gratuit, SANS appel de relecture.
    const t3 = await thread();
    await proposed(t3);
    const chosen3 = await call("identity.choose", t3.ctx, { key: "A" });
    const dark = await runJob(chosen3.jobs![0], { symbol: async () => square("#050505"), symbolLook: () => { throw new Error("la relecture du symbole ne doit pas être appelée"); } });
    expect(symbolCalls(dark.log)).toEqual(["symbol-1"]);
    expect(J.journeyOf(t3.cid).brandFinish!.issues).toEqual([NOT_KEPT("il n'est pas sur un fond blanc net")]);
    expect(keptSymbols(t3.pid)).toEqual([]);
    expect((J.journeyOf(t3.cid).brandFinish as any).symbolFor).toMatch(/^refus:/); // refusé : pas de nouvel essai tout seul pour ce logo
    expect(dark.out).toMatchObject({ finished: true, kit: true });

    // 4. La création échoue (erreur du fournisseur) : jamais relancée seule, rien de gardé, dit simplement ; la marque est finie quand même.
    const t4 = await thread();
    await proposed(t4);
    const chosen4 = await call("identity.choose", t4.ctx, { key: "A" });
    const failed = await runJob(chosen4.jobs![0], { symbol: async () => { throw new Error("le fournisseur d'images ne répond pas"); } });
    expect(symbolCalls(failed.log)).toEqual(["symbol-1"]);
    expect(J.journeyOf(t4.cid).brandFinish!.issues).toEqual(["Je n'ai pas pu tirer le symbole de ton logo : ton favicon ne change pas pour l'instant."]);
    expect(failed.out.notes.join("\n")).toMatch(/symbole non créé : le fournisseur d'images ne répond pas/);
    expect(keptSymbols(t4.pid)).toEqual([]);
    expect((J.journeyOf(t4.cid).brandFinish as any).symbolFor).toBeUndefined();
    expect(failed.out).toMatchObject({ finished: true, kit: true, created: I.FINISH_SLOTS });
    expect(J.journeyOf(t4.cid).steps[3].status).toBe("review");
  });

  it("le client garde son logo : aucun logo créé ni adopté, son logo est posé tel quel, son symbole seul est tiré de lui et la charte est faite avec lui", async () => {
    const t = await thread();
    const mine = await saveAsset({ projectId: t.pid, userId: t.user.id, data: await whiteLogo("#0B3D2E"), name: "mon-logo.png", mime: "image/png", role: "logo", origin: "upload" });
    J.updateJourney(t.cid, (x) => { x.keep = ["logo"]; x.mode = "refonte"; });
    expect((await I.clientLogoOf(t.pid))!.id).toBe(mine.id);
    const first = await proposed(t);
    // À la proposition : la grande scène et la maquette du site, qui porte SON logo ; son logo est la marque de chaque planche.
    expect(first.log.ids.filter((i) => i.startsWith("image-"))).toEqual(["A", "B", "C"].flatMap((k) => [`image-1-${k}-hero:hero+site`, `image-1-${k}-site:hero+site`]));
    for (const k of ["A", "B", "C"]) expect(first.log.refs[`image-1-${k}-site:hero+site`]).toEqual({ logo: true, scene: true, aspect: "9:16" });
    expect(first.log.prompts["image-1-A-site:hero+site"]).toMatch(/Le logo fourni en image de référence est reproduit tel quel/);
    for (const x of J.journeyOf(t.cid).identities!.list) {
      expect(x.board!.images!.site).toBeTruthy();
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

    const sent: { logo?: Buffer; seen?: Buffer[] } = {};
    const { log, out } = await runJob(chosen.jobs![0], {
      symbol: async (_id, c) => { sent.logo = c.logo; return whiteLogo("#0B3D2E"); },
      symbolLook: (_id, c) => { sent.seen = c.images.map((i: any) => i.data); return { ok: true, why: "" }; },
    });
    // Son logo n'est pas redessiné, mais son symbole seul en est tiré (création, puis relecture).
    expect(log.ids).toEqual([...I.FINISH_SLOTS.map((sl) => `image-1-A-${sl}${REST}`), `imagecheck-1-A${REST}`, "symbol-1", "symbolcheck-1"]);
    expect(log.ids.some((i) => i.includes("-logo") || i.startsWith("imagery"))).toBe(false);
    // La référence envoyée est SON logo (posé sur du blanc), et la relecture le reçoit pour comparer.
    expect(log.refs["symbol-1"]).toEqual({ logo: true, scene: false, aspect: "1:1" });
    expect(sent.logo!.equals(await I.onWhite(assetData(getAsset(mine.id)!)))).toBe(true);
    expect(sent.seen).toHaveLength(2);
    expect(sent.seen![1].equals(sent.logo!)).toBe(true);
    expect(log.prompts["symbol-1"]).toBe(F.symbolPrompt(G.chosenRoute(J.journeyOf(t.cid))!));
    // Son logo est donné en référence pour l'objet et les signes.
    expect(log.refs[`image-1-A-object${REST}`].logo).toBe(true);
    expect(log.refs[`image-1-A-signs${REST}`].logo).toBe(true);
    // Cinq images créées pour sa marque (après la scène et la maquette de la planche), aucune version détourée d'un logo créé (son logo est déjà la marque).
    const fresh = all<{ name: string }>("SELECT name FROM assets WHERE project_id=? AND role='brand-board' AND name LIKE 'planche-A-%' ORDER BY created_at", t.pid).map((x) => x.name);
    expect(fresh).toEqual(["hero", "site", ...I.FINISH_SLOTS].map((sl) => `planche-A-${sl}.png`));
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
    expect(j.brandKit!.items.map((x) => x.key)).toEqual(expect.arrayContaining(["symbole", "favicon-32", "favicon-512", "avatar"]));
    // Son symbole : rattaché à SON logo, noté sur la marque, montré dans la charte.
    {
      const logo = loadProject(t.pid).brand!.logo;
      expect(keptSymbols(t.pid)).toEqual([{ id: logo.markAssetId, role: "logo-mark", name: "symbole.png", source_asset_id: mine.id, engine: "syna-brand-symbol" }]);
      expect((j.brandFinish as any).symbolFor).toBe(mine.id);
      expect(j.brandKit!.items.find((x) => x.key === "symbole")!.assetId).toBe(logo.markAssetId);
      expect(getAsset(mine.id)!.deleted_at ?? null).toBeNull(); // son logo, lui, n'est ni remplacé ni retiré
    }
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
    expect(F.missingSlots(j)).toEqual(I.FINISH_SLOTS); // le logo, la scène et la maquette de la planche B sont déjà là
    expect(finishEstimate(j).maxMicro).toBe(C.finishQuote().maxMicro);
    expect((await fr(() => threadView(t.user, t.cid))).journey.identities!.final).toMatchObject({ finished: false, name: "Lâche le Morceau" });
  });

  // ---------------------------------------------------------------- la maquette du haut du site

  it("maquette du site : gardée avec tous ses mots, même avec un texte en trop ; refusée à la relecture (laide, ou son titre manque), elle n'est pas montrée et c'est dit", async () => {
    const t = await thread();
    const paragraph = (key: "A" | "B" | "C") => route(key).board.site.text;
    const EXTRA = "Un paragraphe que personne n'a demandé.";
    const { log } = await proposed(t, {
      look: (id, c) => {
        const name = /Marque : « (.+?) »/.exec(c.prompt)?.[1] ?? "";
        // Seconde lecture (seulement recopier) de la maquette de C : le titre n'y est toujours pas.
        if (id.startsWith("imagereread")) return { images: c.images.map((i: any) => ({ slot: i.label, read: [route("C").name, route("C").board.site.button] })) };
        return { images: c.images.map((i: any) => {
          if (i.label !== "site") return { slot: i.label, ok: true, read: [name], why: "" };
          // A : tous ses mots, plus l'heure du téléphone et un paragraphe en trop. B : mise en page pauvre. C : acceptée,
          // mais son titre n'est pas lu (le nom et le bouton seulement).
          if (/-A:/.test(id)) return { slot: "site", ok: true, read: ["9:41", ...siteWords(c), EXTRA], why: "" };
          if (/-B:/.test(id)) return { slot: "site", ok: false, defect: "autre", read: siteWords(c), why: "La mise en page est vide et banale." };
          return { slot: "site", ok: true, read: siteWords(c).filter((w) => w !== route("C").board.site.headline), why: "" };
        }) };
      },
    });
    const j = J.journeyOf(t.cid), [a, b, c] = j.identities!.list;
    // Le relecteur a bien reçu le nom, le titre et le bouton (jamais le menu ni le paragraphe du site).
    for (const x of [a, b, c]) {
      const check = log.prompts[`imagecheck-1-${x.key}${FIRST}`];
      expect(check).toContain(`Textes attendus : ${[x.name, x.board!.site.headline, x.board!.site.button].map((w) => `« ${w} »`).join(" ; ")}.`);
      expect(check).not.toContain(paragraph(x.key as "A"));
    }
    expect(c.board!.site.headline).toBe(route("C").board.site.headline);
    // A : gardée SANS seconde lecture, ses textes en trop ne sont pas un défaut. B : refusée par le jugement. C : il lui
    // manque son titre, une seconde lecture tranche : le titre n'y est pas, l'image n'est pas gardée.
    expect(log.ids.filter((i) => i.startsWith("imagereread") && !/:r\d$/.test(i))).toEqual([`imagereread-1-C${FIRST}`]);
    expect(log.prompts[`imagereread-1-C${FIRST}`]).toMatch(/Voici 1 image\(s\), dans l'ordre\.\nImage 1 — slot "site"\./);
    expect(a.board!.images!.site).toBeTruthy();
    expect(b.board!.images!.site).toBeUndefined();
    expect(c.board!.images!.site).toBeUndefined();
    // Le reste de la planche ne souffre pas du refus de la maquette.
    for (const x of [b, c]) { expect(x.board!.images!.logo).toBeTruthy(); expect(x.board!.images!.hero).toBeTruthy(); }
    // C'est dit au client, avec la raison, et jamais remplacé par une page dessinée.
    expect(j.identities!.issues).toContain("Identité B : je n'ai pas gardé la maquette de ton site (La mise en page est vide et banale) ; je ne la montre pas.");
    expect(j.identities!.issues).toContain(`Identité C : je n'ai pas gardé la maquette de ton site (le texte « ${c.board!.site.headline.slice(0, 60)} » n'y est pas écrit exactement) ; je ne la montre pas.`);
    expect(j.identities!.issues.some((l) => l.startsWith("Identité A"))).toBe(false);
    expect(j.identities!.issues.join("\n")).not.toMatch(/un texte non demandé/);
    expect(J.journeyContext(j)).toMatch(/Points que le contrôle du Studio n'a pas pu valider \(dis-les honnêtement au client, en mots simples\) : [\s\S]*Identité B : je n'ai pas gardé la maquette de ton site/);
    // Dans la bibliothèque : la maquette de A est prête, celles de B et de C sont marquées refusées avec leur raison.
    const status = (key: string) => one<{ status: string; why: string | null }>("SELECT status, json_extract(meta,'$.synaBoard.review.why') why FROM assets WHERE project_id=? AND name=?", t.pid, `planche-${key}-site.png`);
    expect(status("A")).toMatchObject({ status: "ready" });
    expect(status("B")).toEqual({ status: "rejected", why: "La mise en page est vide et banale." });
    expect(status("C")).toMatchObject({ status: "rejected", why: expect.stringContaining("n'y est pas écrit exactement") });
    // Une maquette gardée n'est jamais refaite ; une maquette refusée est reprise, deux fois au plus.
    for (const k of ["A", "B", "C"]) { const n = log.ids.filter((i) => i.startsWith(`image-1-${k}-site`)).length; expect(n === 1 || n === 3, `${k} : ${n}`).toBe(true); }
    // SINA ne regarde que la maquette gardée.
    const seen = (await journeyImages(j)).map((x) => x.label ?? "");
    expect(seen.filter((l) => /la maquette du haut de son site/.test(l))).toEqual([`Identité A « ${a.name} » — la maquette du haut de son site, sur téléphone, montré au client sur sa planche`]);
    // À l'écran : une seule maquette, celle de A ; les planches B et C n'ont ni maquette ni page dessinée à la place.
    const html = await screen(t), shown = (await fr(() => threadView(t.user, t.cid))).journey.identities!.list as any[];
    expect(count(html, 'data-screen="maquette"')).toBe(1);
    expect(count(html, "<figure data-phone")).toBe(1);
    expect(html).not.toContain('data-screen="site"');
    expect(html).toContain(shown[0].board.images.site.url);
    expect(shown[1].board.images.site).toBeUndefined();
    expect(shown[2].board.images.site).toBeUndefined();
    expect(count(html, "<figure data-logo")).toBe(3);
  });

  it("maquette du site, seconde lecture : un titre mal lu la première fois puis retrouvé la garde, même avec de petits mots en trop ; un titre écrit avec une faute la refuse", async () => {
    const t = await thread();
    const { log } = await proposed(t, {
      look: (id, c) => {
        const name = /Marque : « (.+?) »/.exec(c.prompt)?.[1] ?? "";
        const key = /-([ABC]):/.exec(id)![1] as "A" | "B" | "C", r = route(key), site = r.board.site;
        // Seconde lecture (seulement recopier) : A porte bien tous ses mots, avec l'heure et une entrée du menu en plus ;
        // le titre de B est écrit avec une faute.
        if (id.startsWith("imagereread")) return { images: c.images.map((i: any) => ({ slot: i.label, read: key === "B" ? [r.name, site.headline.replace("pétille", "petille"), site.button] : ["9:41", r.name, site.headline, site.button, site.menu[0]] })) };
        return { images: c.images.map((i: any) => {
          if (i.label !== "site") return { slot: i.label, ok: true, read: [name], why: "" };
          // A et B : acceptées, mais le titre n'est pas dans la première lecture. C : tous ses mots, rien de plus.
          return { slot: "site", ok: true, read: key === "C" ? siteWords(c) : siteWords(c).filter((w) => w !== site.headline), why: "" };
        }) };
      },
    });
    const j = J.journeyOf(t.cid), [a, b, c] = j.identities!.list;
    expect(route("B").board.site.headline).toContain("pétille");
    // Une seconde lecture pour A et pour B (un texte attendu manquait) ; aucune pour C.
    expect(log.ids.filter((i) => i.startsWith("imagereread") && !/:r\d$/.test(i))).toEqual([`imagereread-1-A${FIRST}`, `imagereread-1-B${FIRST}`]);
    for (const k of ["A", "B"]) expect(log.prompts[`imagereread-1-${k}${FIRST}`]).toMatch(/Voici 1 image\(s\), dans l'ordre\.\nImage 1 — slot "site"\./);
    // A : gardée, son titre y est bien, et ses petits mots en trop ne comptent pas. B : son titre n'y est pas écrit
    // exactement (un accent manque), refusée, et c'est dit. C : gardée.
    expect(a.board!.images!.site).toBeTruthy();
    expect(b.board!.images!.site).toBeUndefined();
    expect(c.board!.images!.site).toBeTruthy();
    expect(j.identities!.issues.filter((l) => !l.startsWith("Identité B"))).toEqual([]);
    expect(j.identities!.issues).toHaveLength(1);
    expect(j.identities!.issues[0]).toMatch(/^Identité B : je n'ai pas gardé la maquette de ton site \(.+\) ; je ne la montre pas\.$/);
    for (const x of [a, b, c]) { expect(x.board!.images!.logo).toBeTruthy(); expect(x.board!.images!.hero).toBeTruthy(); }
    const status = (key: string) => one<{ status: string }>("SELECT status FROM assets WHERE project_id=? AND name=?", t.pid, `planche-${key}-site.png`)!.status;
    expect([status("A"), status("B"), status("C")]).toEqual(["ready", "rejected", "ready"]);
    // Une maquette gardée n'est jamais refaite ; une maquette refusée est reprise, deux fois au plus.
    for (const k of ["A", "B", "C"]) { const n = log.ids.filter((i) => i.startsWith(`image-1-${k}-site`)).length; expect(n === 1 || n === 3, `${k} : ${n}`).toBe(true); }
  });

  it("maquette du site : la direction artistique doit rendre sa consigne (essai réel du 15 novembre 2026 : rendue vide, la maquette n'était pas créée et rien n'était dit)", () => {
    const base = { look: "x", logo: "x", signs: "", hero: "x", object: "x", posts: ["a", "b", "c"] };
    expect(I.ImagerySchema.safeParse({ ...base, site: "" }).success).toBe(false);
    expect(I.ImagerySchema.safeParse(base).success).toBe(false);
    expect(I.ImagerySchema.safeParse({ ...base, site: "La maquette du haut de l'accueil." }).success).toBe(true);
  });

  it("planche rendue sans navigateur : la maquette est montrée telle quelle, sans cadre de téléphone du Studio, quand images.site existe ; sinon rien (jamais une page dessinée par le Studio)", async () => {
    const t = await thread();
    await proposed(t);
    // Les planches telles que le fil les reçoit ; on y pose ensuite trois cas : une maquette, aucune, une adresse étrangère.
    const view = structuredClone((await fr(() => threadView(t.user, t.cid))).journey.identities) as any;
    const html = (ids: unknown) => fr(() => renderToStaticMarkup(createElement(BrandBoards, { ids: ids as any, busy: false, onChoose: () => {} })).replace(/<style>[\s\S]*?<\/style>/g, ""));
    const [a, b, c] = view.list;
    a.board.images.site = { id: "maquette-a", w: 1024, h: 1536, url: "/api/files/maquette-a" };
    delete b.board.images.site;
    c.board.images.site = { id: "x", w: 10, h: 10, url: "https://ailleurs.example/x.png" };
    const out = await html(view);
    expect(count(out, 'data-screen="maquette"')).toBe(1);
    expect(count(out, "<figure data-phone")).toBe(1);
    expect(out).not.toContain('data-screen="site"');
    expect(out).not.toContain("bb-ps-");
    // Le téléphone est DANS l'image : le Studio ne dessine plus de cadre de téléphone autour de la maquette.
    expect(count(out, '<div class="bb-mock" data-screen="maquette">')).toBe(1);
    expect(/<figure data-phone[^>]*>[\s\S]*?<\/figure>/.exec(out)![0]).not.toContain("bb-phone");
    // L'image de la maquette, entière (largeur et hauteur du portrait), avec le titre du site comme texte de remplacement.
    const img = /data-screen="maquette"><img[^>]*>/.exec(out)![0];
    expect(img).toContain('src="/api/files/maquette-a"');
    expect(img).toContain('width="1024"');
    expect(img).toContain('height="1536"');
    expect(img).toContain(`alt="${String(a.board.site.headline).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;")}"`);
    expect(count(out, "Le haut de ton site, sur téléphone")).toBe(1);
    // Une adresse qui ne vient pas du Studio n'est jamais montrée.
    expect(out).not.toContain("ailleurs.example");
    // Sans aucune maquette : aucun téléphone, et les logos et les scènes restent.
    for (const x of view.list) delete x.board.images.site;
    const none = await html(view);
    expect(none).not.toContain("data-screen=");
    expect(none).not.toContain("<figure data-phone");
    expect(count(none, "<figure data-logo")).toBe(3);
    for (const x of view.list) expect(none).toContain(x.board.images.hero.url);
  });
});
