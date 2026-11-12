/**
 * SINA — chaîne de création de la marque (décisions du propriétaire du 12 novembre 2026) : étude du marché avec des
 * paroles réelles vérifiées, idées, équipes de noms séparées, routes composées, noms vérifiés, planches, directeur de
 * création qui relit aussi la reprise. Aucun appel d'IA : les spécialistes et la recherche sont simulés.
 */
import { describe, expect, it } from "vitest";
import { journey, route, series } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — chaîne de création de la marque", async () => {
  const { all, one, run } = await import("@/lib/db");
  const { JobContext } = await import("@/lib/jobs");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const J = await import("@/lib/syna-agent/journey");
  const C = await import("@/lib/syna-agent/brand-chain");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  type Route = ReturnType<typeof route>;

  const ctxOf = (user: any, cid: string) => ({ user, conversationId: cid, runId: "test", projectId: null as string | null, attachment: () => null }) as any;
  const call = async (name: string, ctx: any, args: unknown) => {
    ctx.projectId = one<{ project_id: string | null }>("SELECT project_id FROM agent_conversations WHERE id=?", ctx.conversationId)?.project_id ?? null;
    return fr(() => getTool(name)!.run(ctx, getTool(name)!.args.parse(args)));
  };

  /** Fil avec l'étape 0 validée : la fiche de départ du projet d'exemple (infusions de fruits). */
  async function thread() {
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
    expect((await call("start.confirm", ctx, {})).ok).toBe(true);
    return { user, cid, ctx, pid: one<any>("SELECT project_id FROM agent_conversations WHERE id=?", cid).project_id as string };
  }

  let n = 0;
  const jobCtx = (user: any, pid: string, payload: Record<string, unknown>) => {
    const jid = `job-sina-marque-${Date.now()}-${n++}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, user.id, pid, C.SINA_BRAND_JOB, "marque", JSON.stringify(payload), "running", Date.now(), Date.now(), Date.now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };
  const reload = (ctx: InstanceType<typeof JobContext>) => new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", ctx.job.id));

  // ---------------------------------------------------------------- spécialistes simulés

  const REAL = ["J'ai respecté le dosage, goût très fade.", "on sens rien on boit de l'eau quoi!!!", "Quand je lis sans sucre je cherche ce qu'on me cache", "mon soda de 16h c'est mon seul plaisir", "pas trace de gout pêche même avec 2 sachets", "l'eau ça n'a aucun goût", "je veux arrêter le coca sans être punie", "j'oublie de boire toute la journée", "c'est joli dans la carafe au moins", "trop cher pour de l'eau parfumée", "j'aime voir les vrais morceaux", "le lendemain c'était bien meilleur"];
  const PAGE = "https://avis.example/infusions-froides", RIVAL = "https://marques.example/fruits-givres", USAGE = "https://blog.example/infusion-a-froid";
  const pages = (id: string) => id === "paroles" ? [{ url: PAGE, title: "Avis sur les infusions froides", category: "customers" as const, excerpt: REAL.map((q) => `« ${q} »`).join(" ") }]
    : id === "concurrents" ? [{ url: RIVAL, title: "Fruits Givrés", category: "competitors" as const, excerpt: "Fruits Givrés : infusions glacées, pastels, promesse de fraîcheur." }]
      : id === "usages" ? [{ url: USAGE, title: "Infuser à froid", category: "sector" as const, excerpt: "Une infusion à froid de vrac demande au moins une heure au frais." }] : [];

  const BY_GROUND: Record<string, "A" | "B" | "C" | "D"> = { sombre: "A", degrade: "B", blanc: "C", uni: "D" };
  const GOOD_SVG = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="currentColor"/></svg>';
  const BAD_SVG = '<svg viewBox="0 0 100 100"><script>alert(1)</script><circle cx="50" cy="50" r="40" fill="currentColor"/></svg>';
  const draftOf = (x: Route, name = x.name, over: Record<string, unknown> = {}) => {
    const { idea, nameCheck: _n, signs, wordmark, ...rest } = x.board;
    const { confessionSupport: _c, ...ideaRest } = idea;
    const { symbol: _s, ...mark } = wordmark;
    return {
      name, nameWhy: x.nameWhy, nameAnchor: x.nameAnchor, nameExpression: x.nameExpression, slogan: x.slogan, sloganTone: "", promise: x.promise, territory: x.territory,
      ground: x.ground, ...(x.gradient ? { gradient: x.gradient } : {}), palette: x.palette, paletteFamily: "", fonts: x.fonts, fontStyle: "", tone: x.tone, why: x.why,
      board: { ...rest, idea: ideaRest, signs: signs.map(({ symbol: _p, ...s }, i) => ({ ...s, symbolSvg: i === 0 ? GOOD_SVG : i === 1 ? BAD_SVG : "" })), wordmark: { ...mark, symbolSvg: "" }, ...over },
    };
  };
  const pick = (key: "A" | "B" | "C" | "D", name = route(key).name, reserve = false) => ({ idea: `i${"ABCD".indexOf(key) + 1}`, name, detail: route(key).nameAnchor, second: route(key).nameExpression, why: route(key).nameWhy, trials: "Passe les quatre épreuves.", risks: [], tone: "franc", ground: route(key).ground, hue: "teinte", type: "caractère", reserve });

  type Script = {
    web?: (id: string) => any[] | Promise<any[]>;
    shortlist?: (prompt: string) => any[];
    taken?: { name: string; url: string }[];
    review?: (prompt: string) => any;
    fix?: (key: string) => Record<string, unknown>;
    /** Reprise qui change ce qu'elle n'a pas le droit de changer (nom, fond). */
    fixTop?: (key: string) => Record<string, unknown>;
    /** Idées rendues par la stratégie (par défaut : sept idées fortes sur huit). */
    strong?: (id: string, n: number) => boolean;
    recheck?: any;
    /** Dessins rendus par l'illustratrice (par défaut : une scène valide, un dessin interdit, des mots à la main). */
    art?: (id: string) => any;
    /** Création d'une image (par défaut : un petit carré de couleur ; une erreur simule un appel en échec). */
    draw?: (id: string, call: any) => Promise<Buffer>;
    /** Relecture des images (par défaut : tout est accepté, le nom est lu tel quel). */
    look?: (id: string, call: any) => any;
  };
  const sharpLib = (await import("sharp")).default;
  const square = (color: string, w = 96, h = 96) => sharpLib({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer();
  const DRAWN = {
    hero: '<svg viewBox="0 0 320 250"><rect width="320" height="250" fill="#0A0F3D"/><circle cx="240" cy="60" r="30" fill="#FFE98A"/></svg>',
    // Du texte dans un dessin : refusé en entier par le contrôle du Studio.
    object: '<svg viewBox="0 0 190 130"><text x="0" y="10">Bio</text></svg>', site: "",
    signs: [{ index: 0, svg: '<svg viewBox="0 0 100 70"><circle cx="50" cy="35" r="20" fill="#FFE44D"/></svg>', ground: "dark" }, { index: 1, svg: '<svg viewBox="0 0 100 70"><circle cx="50" cy="35" r="20" fill="#FFE44D"/></svg>', ground: "dark" }, { index: 2, svg: "", sample: "Voilà, c'est dit.", hand: true, ground: "light" }],
    posts: [{ index: 0, svg: '<svg viewBox="0 0 100 92"><circle cx="70" cy="24" r="14" fill="#FFE98A"/></svg>', ground: "dark" }],
  };
  const fakeAi = (log: { ids: string[]; prompts: Record<string, string>; systems: Record<string, string> }, s: Script = {}) => () => ({
    research: async (id: string, _query: string) => { log.ids.push(`web:${id}`); return s.web ? s.web(id) : id.startsWith("verify") ? [{ url: "https://annuaire.example/boissons", title: "Marques de boissons", category: "competitors", excerpt: "Annuaire des marques de boissons aux fruits." }] : pages(id); },
    ask: async (id: string, c: any) => {
      log.ids.push(id); log.prompts[id] = c.prompt; log.systems[id] = c.system;
      const raw: any = (() => {
        if (c.kind === "study") return { quotes: [...REAL.map((text) => ({ text, url: PAGE })), { text: "Cette boisson a changé ma vie, je la recommande à tous.", url: PAGE }, { text: REAL[0], url: "https://inconnu.example/page" }], competitors: [{ name: "Fruits Givrés", url: RIVAL, codes: "pastels, fraîcheur" }], mould: "Des noms de fruits et de fraîcheur, des pastels.", substitutes: ["le soda de l'après-midi"], facts: [{ text: "Une infusion à froid demande au moins une heure au frais.", url: USAGE }, { text: "Fait sans page.", url: "https://inconnu.example/fait" }], notFound: [] };
        if (c.kind === "strategy") return { job: "Le soda était un moment à soi.", confessions: [{ text: "Quand je lis « sans sucre », je cherche ce qu'on me cache.", quotes: [0, 1, 2, 4, 5, 9, 11] }, { text: "Mon soda, c'est mon seul petit plaisir.", quotes: [] }], ideas: ["A", "B", "C", "D", "A", "B", "C", "D"].map((k, i) => ({ id: `i${i + 1}`, belief: i < 4 ? route(k as "A").board.idea.belief : `Idée de réserve ${i}`, confession: k === "D" ? 1 : 0, enemy: route(k as "A").board.idea.enemy, proof: route(k as "A").board.idea.proof, cost: route(k as "A").board.idea.cost, opposite: "les marques pressées", onlyUs: "nos morceaux se voient", tone: "franc", strong: s.strong ? s.strong(id, i) : i !== 7 })) };
        if (c.kind === "team") {
          const mine: Record<string, string[]> = { "team-langue": ["Bain de Minuit", "Lâche le Morceau", "La Main Lourde", "La Mèche Courte", "Sans Rancune"], "team-mots": ["Trempette", "Fruits Givrés", "Thé 2000", "Lâche le Morceau", "Frisquet"], "team-univers": ["Nage Libre", "L'Eau Est Bonne", "Grand Bain", "Plongeon", "Marée Haute"], "team-verite": ["Minute Papillon", "À Tremper", "Sans Bulles", "Patience", "Morceaux Choisis"] };
          return { names: (mine[id] ?? ["Un", "Deux", "Trois", "Quatre", "Cinq"]).map((name) => ({ name, detail: "détail", second: "lecture", idea: "" })) };
        }
        if (c.kind === "shortlist") return { routes: s.shortlist ? s.shortlist(c.prompt) : [...(c.prompt.match(/Compose (\d)/)?.[1] === "2" ? [pick("A"), pick("B")] : c.prompt.match(/Compose (\d)/)?.[1] === "4" ? [pick("A"), pick("B"), pick("C"), pick("D")] : [pick("A"), pick("B"), pick("C")]), pick("B", "Nage Libre", true), pick("C", "La Main Lourde", true)] };
        if (c.kind === "verify") return { checks: [...(s.taken ?? []).map((t) => ({ name: t.name, taken: true, url: t.url, note: "Une marque de boissons porte ce nom." })), { name: "Bain de Minuit", taken: true, url: "https://jamais-lue.example", note: "inventé" }] };
        if (c.kind === "direction" || c.kind === "fix") {
          const ground = /Fond de page : (\w+)/.exec(c.prompt)?.[1] ?? /"ground":"(\w+)"/.exec(c.prompt)?.[1] ?? "blanc";
          const name = /^Nom : (.+?)(?: \(nom gardé|$)/m.exec(c.prompt)?.[1] ?? /"name":"([^"]+)"/.exec(c.prompt)?.[1];
          const base = route(BY_GROUND[ground]);
          return { ...draftOf(base, name ?? base.name, c.kind === "fix" && s.fix ? s.fix(base.key) : {}), ...(c.kind === "fix" && s.fixTop ? s.fixTop(base.key) : {}) };
        }
        if (c.kind === "review") return s.review ? s.review(c.prompt) : { routes: [{ key: "A", score: 8, verdict: "garder", fixes: [] }, { key: "B", score: 6, verdict: "reprendre", fixes: ["« Si c'est fade, remets-en. » est un ordre donné au lecteur : réécris cette phrase."] }, { key: "C", score: 8, verdict: "garder", fixes: [] }], series: "" };
        if (c.kind === "recheck") return s.recheck ?? { routes: [{ key: "B", better: true, remaining: [], score: 8 }] };
        if (c.kind === "art") return s.art ? s.art(id) : DRAWN;
        if (c.kind === "imagery") return { look: "Lumière de fin d'après-midi, rasante, sur une table claire.", logo: "Un logo net tiré du nom composé.", hero: "Photographie d'une carafe pleine de morceaux de fruits.", object: "Le sachet posé sur la table.", site: "Le haut de la page d'accueil.", posts: ["Une scène.", "Un gros plan.", "Un aplat."] };
        throw new Error(`appel inattendu : ${id}`);
      })();
      return c.schema.parse(c.prepare ? c.prepare(raw) : raw);
    },
    draw: async (id: string, c: any) => { log.ids.push(id); log.prompts[id] = c.prompt; (log as any).refs = { ...((log as any).refs ?? {}), [id]: { logo: !!c.logo, scene: !!c.scene, aspect: c.aspect } }; return s.draw ? s.draw(id, c) : square("#3366CC"); },
    look: async (id: string, c: any) => {
      log.ids.push(id); log.prompts[id] = c.prompt; log.systems[id] = c.system;
      const name = /Marque : « (.+?) »/.exec(c.prompt)?.[1] ?? "";
      return c.schema.parse(s.look ? s.look(id, c) : { images: c.images.map((i: any) => ({ slot: i.label, ok: true, read: [name], why: "" })) });
    },
  });
  const newLog = () => ({ ids: [] as string[], prompts: {} as Record<string, string>, systems: {} as Record<string, string> });
  async function chain(t: { user: any; pid: string; cid: string }, payload: Record<string, unknown>, s: Script = {}, ctx?: InstanceType<typeof JobContext>) {
    const log = newLog();
    const job = ctx ?? jobCtx(t.user, t.pid, { projectId: t.pid, conversationId: t.cid, capMicro: 9_000_000, count: 3, ...payload });
    C.brandChainDeps.ai = fakeAi(log, s) as any;
    try { return { out: await fr(() => C.runSinaBrandJob(job)), log, job }; } finally { C.brandChainDeps.ai = undefined; }
  }
  // Relecture des pages citées : simulée (aucun accès au réseau) ; par défaut la page d'avis contient bien ses paroles.
  const PAGES: Record<string, string | null> = {};
  C.brandPageDeps.read = async (url: string) => (url in PAGES ? PAGES[url] : url.startsWith("https://avis.example") || url.startsWith("https://a.example") ? REAL.map((q) => `<p>« ${q} »</p>`).join("") + " J&rsquo;ai respecté le dosage, goût très fade." : null);
  {
  }
  const FIXED_LINE = { lines: ["Ça ne pétille pas. Voilà, c'est dit.", "Trop fade ? La dose est à toi."] };

  // ---------------------------------------------------------------- les temps de la chaîne

  it("chaîne complète : les sept temps dans l'ordre, les équipes séparées, la reprise relue", async () => {
    const t = await thread();
    const { log, job } = await chain(t, {}, { fix: () => FIXED_LINE });
    expect(log.ids).toEqual(["web:paroles", "web:concurrents", "web:usages", "study", "strategy", "team-langue", "team-mots", "team-univers", "team-verite", "shortlist", "web:verify-1", "verify-1", "direction-1-A", "direction-1-B", "direction-1-C", "review-1", "fix-1-B", "recheck-1", "art-1-A", "art-1-B", "art-1-C"]);
    // L'illustratrice dessine après la relecture : la scène est posée, le dessin interdit est retiré (et c'est noté),
    // le signe « lettrage » ne reçoit jamais de dessin, les mots à la main arrivent sur leur signe.
    const drawn = J.journeyOf(t.cid).identities!.list;
    for (const x of drawn) {
      expect(x.board!.hero?.box).toEqual([0, 0, 320, 250]);
      expect(x.board!.object.art).toBeUndefined();
      expect(x.board!.posts[0]).toMatchObject({ ground: "dark" });
      expect(x.board!.posts[0].art).toBeTruthy();
      for (const g of x.board!.signs.filter((y) => y.kind === "lettrage")) expect(g.art).toBeUndefined();
      expect(x.board!.signs[2]).toMatchObject({ sample: "Voilà, c'est dit.", hand: true });
    }
    expect(log.systems["art-1-A"]).toMatch(/Balises permises/);
    expect(log.prompts["art-1-A"]).toMatch(/Palette : dark #/);
    // La relecture ne reçoit jamais les dessins (trop lourds, inutiles à la lecture des textes).
    expect(log.prompts["review-1"]).not.toMatch(/"nodes"/);
    // Chaque équipe suit UN chemin et ne voit pas les noms des autres.
    expect(log.systems["team-mots"]).toMatch(/sur UN seul chemin : mots forts/);
    expect(log.systems["team-langue"]).toMatch(/sur UN seul chemin : expressions de la langue/);
    expect(log.prompts["team-mots"]).not.toMatch(/Bain de Minuit/);
    // Les noms du propriétaire servent de mesure, sans formule imposée.
    expect(log.systems.shortlist).toMatch(/La Mèche Courte/);
    expect(log.systems.shortlist).toMatch(/PAS une formule/);
    // La réserve de noms : ni nom d'exemple, ni nom d'un concurrent, ni nom mal formé, ni doublon.
    const pool = log.prompts.shortlist.split("# Noms trouvés par les équipes")[1];
    expect(pool).toMatch(/- Bain de Minuit/);
    expect(pool).not.toMatch(/- La Mèche Courte|- Fruits Givrés \||- Thé 2000/);
    expect(pool.match(/- Lâche le Morceau/g)).toHaveLength(1);
    // Le directeur de création relit la reprise : avant, corrections, après.
    expect(log.prompts["recheck-1"]).toMatch(/## Avant[\s\S]*## Corrections demandées[\s\S]*ordre donné au lecteur[\s\S]*## Après la reprise[\s\S]*La dose est à toi/);

    const j = J.journeyOf(t.cid);
    expect(j.steps[1].status).toBe("review");
    expect(j.identities!.list.map((x) => `${x.key} ${x.name} ${x.ground}`)).toEqual(["A Bain de Minuit sombre", "B Lâche le Morceau degrade", "C L'Eau Est Bonne blanc"]);
    expect(j.identities!.chainJobId).toBe(job.job.id);
    expect(j.identities!.issues).toEqual([]);
    const b = j.identities!.list[1].board!;
    expect(b.lines).toEqual(FIXED_LINE.lines); // la reprise jugée meilleure est gardée
    expect(b.idea.confessionSupport).toBe(7); // paroles réelles qui appuient l'aveu
    expect(b.toProve[0]).toMatch(/INPI/);
    expect(b.signs[0].symbol?.shapes.length).toBeGreaterThan(0); // pictogramme nettoyé
    expect(b.signs[1].symbol).toBeUndefined(); // pictogramme avec script : retiré
    expect(JSON.stringify(j.identities)).not.toMatch(/<script|<svg/);
    // Le nom dessiné garde sa mise en lignes (lettres exactes).
    expect(b.wordmark.lines).toEqual(["LÂCHE LE", "MOR", "CEAU"]);
    // L'étude montrée au client : seulement les paroles retrouvées mot pour mot dans la page citée.
    expect(j.identities!.study).toMatchObject({ quoteCount: 12, sources: 3, competitors: ["Fruits Givrés"] });
    expect(JSON.stringify(j.identities!.study)).not.toMatch(/changé ma vie|inconnu\.example/);
    const study = reload(job).checkpoint["brand:study"];
    expect(study.dropped).toBe(2);
    expect(study.facts.map((f: any) => f.url)).toEqual([USAGE]);
  });

  it("une relance de la tâche ne refait et ne repaie rien", async () => {
    const t = await thread();
    const first = await chain(t, {}, { fix: () => FIXED_LINE });
    const before = JSON.stringify(J.journeyOf(t.cid).identities!.list);
    const again = await chain(t, {}, {}, reload(first.job));
    expect(again.log.ids).toEqual([]);
    const j = J.journeyOf(t.cid);
    expect(JSON.stringify(j.identities!.list)).toBe(before);
    expect(j.identities!.round).toBe(1);
  });

  it("nombre d'identités selon le forfait : 2 routes, ou 4 avec un quatrième fond", async () => {
    const two = await thread();
    const a = await chain(two, { count: 2 }, { review: () => ({ routes: [], series: "" }) });
    expect(a.log.prompts.shortlist).toMatch(/Compose 2 route\(s\) pour les clés A, B/);
    expect(a.log.systems.shortlist).toMatch(/Deux fonds de page différents/);
    expect(J.journeyOf(two.cid).identities!.list.map((x) => x.key)).toEqual(["A", "B"]);
    expect(a.log.ids.filter((i) => i.startsWith("direction"))).toHaveLength(2);
    expect(a.log.ids).not.toContain("recheck-1"); // rien à reprendre : pas de seconde relecture payée

    const four = await thread();
    const b = await chain(four, { count: 4 }, { review: () => ({ routes: [], series: "" }) });
    expect(b.log.systems.shortlist).toMatch(/Quatre fonds de page différents/);
    const list = J.journeyOf(four.cid).identities!.list;
    expect(list.map((x) => `${x.key} ${x.ground}`)).toEqual(["A sombre", "B degrade", "C blanc", "D uni"]);
    expect(J.journeyOf(four.cid).identities!.issues).toEqual([]);
    // Un aveu sans parole réelle est présenté comme une hypothèse.
    expect(list[3].board!.idea.confessionSupport).toBe(0);
    expect(list[3].board!.toProve.join(" ")).toMatch(/hypothèse/);
  });

  it("un nom déjà porté par une marque du secteur est écarté : une réserve libre prend sa place", async () => {
    const t = await thread();
    const page = "https://annuaire.example/boissons";
    const { log } = await chain(t, {}, { taken: [{ name: "Lâche le Morceau", url: page }], review: () => ({ routes: [], series: "" }) });
    const list = J.journeyOf(t.cid).identities!.list;
    expect(list.map((x) => x.name)).toEqual(["Bain de Minuit", "Nage Libre", "L'Eau Est Bonne"]);
    expect(list[1].ground).toBe("degrade"); // la réserve garde le fond prévu pour la série
    expect(list[1].board!.wordmark.lines).toBeUndefined(); // l'ancienne mise en lignes ne vaut plus pour ce nom
    // « Pris » sur une page que la recherche n'a jamais trouvée : ignoré (rien n'est affirmé sans page).
    expect(list[0].name).toBe("Bain de Minuit");
    expect(log.prompts["direction-1-B"]).toMatch(/^Nom : Nage Libre$/m);
    expect(J.journeyOf(t.cid).identities!.issues.join(" ")).not.toMatch(/déjà porté/);
  });

  it("une reprise jugée moins bonne n'est pas gardée, et ce qui n'est pas réglé est dit au client", async () => {
    const t = await thread();
    await chain(t, {}, { fix: () => ({ lines: ["Une infusion d'exception.", "Le goût authentique."] }), recheck: { routes: [{ key: "B", better: false, remaining: ["tout est plus plat"], score: 4 }] } });
    const j = J.journeyOf(t.cid);
    expect(j.identities!.list[1].board!.lines).toEqual(route("B").board.lines); // première version gardée
    expect(j.identities!.issues.join(" ")).toMatch(/Identité B : « Si c'est fade, remets-en\. » est un ordre donné au lecteur/);

    const u = await thread();
    await chain(u, {}, { fix: () => FIXED_LINE, recheck: { routes: [{ key: "B", better: true, remaining: ["La signature reste proche de celle d'un concurrent."], score: 7 }] } });
    expect(J.journeyOf(u.cid).identities!.issues).toEqual(["Identité B : La signature reste proche de celle d'un concurrent."]);
  });

  it("nom refusé par le directeur de création : une réserve déjà vérifiée prend sa place, avec une planche neuve", async () => {
    const refuse = { routes: [{ key: "A", score: 8, verdict: "garder", fixes: [] }, { key: "B", score: 7, verdict: "garder", fixes: [] }, { key: "C", score: 4, verdict: "reprendre", replaceName: true, nameDoubt: "Il se lit « sans eau », le contraire de ce que la marque montre.", fixes: [] }], series: "" };
    const t = await thread();
    const { log } = await chain(t, {}, { review: () => refuse, recheck: { routes: [{ key: "C", better: true, remaining: ["Le bouton du site reste plat.", "b", "c", "d"], score: 7 }] } });
    expect(log.ids.slice(-6)).toEqual(["review-1", "replace-1-C", "recheck-1", "art-1-A", "art-1-B", "art-1-C"]);
    expect(log.ids.some((i) => i.startsWith("fix"))).toBe(false); // un nom refusé ne se « corrige » pas
    expect(log.prompts["replace-1-C"]).toMatch(/^Nom : Nage Libre$/m);
    expect(log.prompts["replace-1-C"]).toMatch(/^Fond de page : blanc$/m); // la réserve garde le fond prévu pour la série
    expect(log.prompts["replace-1-C"]).toMatch(/A « Bain de Minuit »[\s\S]*police de titres déjà prise/);
    expect(log.prompts["recheck-1"]).toMatch(/Nom « L'Eau Est Bonne » refusé : Il se lit « sans eau », le contraire de ce que la marque montre\. Nouvelle route avec le nom de réserve « Nage Libre »\./);
    const j = J.journeyOf(t.cid);
    expect(j.identities!.list.map((x) => `${x.key} ${x.name} ${x.ground}`)).toEqual(["A Bain de Minuit sombre", "B Lâche le Morceau degrade", "C Nage Libre blanc"]);
    expect(j.identities!.list[2].board!.nameCheck).toBe("rien_trouve"); // vérifié avec les autres noms
    // Ce qui reste : trois points au plus par identité.
    expect(j.identities!.issues).toEqual(["Identité C : Le bouton du site reste plat.", "Identité C : b", "Identité C : c"]);

    // La nouvelle route jugée moins bonne : l'ancienne reste, et le doute sur son nom est dit au client.
    const u = await thread();
    await chain(u, {}, { review: () => refuse, recheck: { routes: [{ key: "C", better: false, remaining: [], score: 4 }] } });
    const k = J.journeyOf(u.cid);
    expect(k.identities!.list[2].name).toBe("L'Eau Est Bonne");
    expect(k.identities!.issues.join(" ")).toMatch(/Identité C : Nom « L'Eau Est Bonne » refusé : Il se lit « sans eau »/);

    // Plus aucune réserve libre : le nom reste, et le doute est dit.
    const v = await thread();
    await chain(v, {}, { shortlist: () => [pick("A"), pick("B"), pick("C")], review: () => refuse });
    const m = J.journeyOf(v.cid);
    expect(m.identities!.list[2].name).toBe("L'Eau Est Bonne");
    expect(m.identities!.issues.join(" ")).toMatch(/Identité C : je trouve le nom « L'Eau Est Bonne » fragile \(Il se lit « sans eau », le contraire de ce que la marque montre\), et je n'avais plus de nom de réserve/);
  });

  it("une reprise qui change le nom ou le fond de la série est écartée : la première version reste, et c'est dit", async () => {
    // Essai réel du 12 novembre 2026 : la reprise avait rebaptisé une route dans ses textes seulement.
    const t = await thread();
    const { log, out } = await chain(t, {}, { fixTop: () => ({ name: "Morceaux Choisis" }) });
    expect(log.ids).toContain("fix-1-B");
    expect(log.ids).not.toContain("recheck-1"); // rien de valable à relire
    expect(log.prompts["fix-1-B"]).toMatch(/# Ce qui ne change pas\nLe nom « Lâche le Morceau » \(déjà jugé et vérifié\) et le fond de page « degrade » \(fixé pour la série\) restent tels quels\./);
    expect(log.prompts["fix-1-B"]).toMatch(/# Les autres routes de la série[\s\S]*A « Bain de Minuit »[\s\S]*C « L'Eau Est Bonne »/);
    const j = J.journeyOf(t.cid);
    expect(j.identities!.list[1]).toMatchObject({ name: "Lâche le Morceau", ground: "degrade" });
    expect(j.identities!.list[1].board!.lines).toEqual(route("B").board.lines);
    expect(JSON.stringify(j.identities!.list)).not.toMatch(/Morceaux Choisis/);
    expect(j.identities!.issues.join(" ")).toMatch(/Identité B : « Si c'est fade, remets-en\. » est un ordre donné au lecteur/);
    expect(out.notes.join(" ")).toMatch(/reprise de B écartée : elle changeait le nom/);
    const u = await thread();
    const second = await chain(u, {}, { fixTop: () => ({ ground: "sombre", palette: route("A").palette }) });
    expect(J.journeyOf(u.cid).identities!.list[1].ground).toBe("degrade");
    expect(second.out.notes.join(" ")).toMatch(/reprise de B écartée : elle changeait le fond de page/);
  });

  it("trop peu d'idées fortes : la stratège en cherche d'autres, une fois, sans reformuler les idées écartées", async () => {
    const t = await thread();
    // Premier tour : une seule idée passe les deux épreuves (comme dans l'essai réel) ; second tour : toutes passent.
    const { log } = await chain(t, {}, { strong: (id, n) => (id === "strategy" ? n === 0 : true), review: () => ({ routes: [], series: "" }) });
    expect(log.ids.slice(4, 6)).toEqual(["strategy", "strategy-2"]);
    expect(log.prompts["strategy-2"]).toMatch(/# Idées déjà trouvées \(ne les reprends pas, ne les reformule pas\)[\s\S]*\(forte\)[\s\S]*\(écartée : elle ne passe pas les deux épreuves\)[\s\S]*Cherche huit AUTRES idées/);
    // Les équipes de noms ne reçoivent que les idées fortes des deux tours (1 + 8).
    expect(log.prompts["team-langue"].split("# Idées de marque")[1].split("# Le moule")[0].match(/^Idée /gm)).toHaveLength(9);
    expect(J.journeyOf(t.cid).identities!.list).toHaveLength(3);
    // Assez d'idées fortes dès le premier tour : pas de second appel.
    const u = await thread();
    expect((await chain(u, {}, { review: () => ({ routes: [], series: "" }) })).log.ids).not.toContain("strategy-2");
  });

  it("le contrôle gratuit du Studio nourrit la reprise : un chiffre que le client n'a pas donné est corrigé", async () => {
    const t = await thread();
    const withNumber = (prompt: string) => (/Fond de page : sombre/.test(prompt) ? { lines: ["Prête en 4 h au frais.", "La nuit porte fruit."] } : {});
    const log = newLog();
    const job = jobCtx(t.user, t.pid, { projectId: t.pid, conversationId: t.cid, capMicro: 9_000_000, count: 3 });
    const base = fakeAi(log, { review: () => ({ routes: [], series: "" }), recheck: { routes: [{ key: "A", better: true, remaining: [], score: 8 }] } })();
    C.brandChainDeps.ai = (() => ({ ...base, ask: async (id: string, c: any) => (c.kind === "direction" && /Fond de page : sombre/.test(c.prompt) ? c.schema.parse(draftOf(route("A"), "Bain de Minuit", withNumber(c.prompt))) : base.ask(id, c)) })) as any;
    try { await fr(() => C.runSinaBrandJob(job)); } finally { C.brandChainDeps.ai = undefined; }
    expect(log.ids).toContain("fix-1-A");
    expect(log.prompts["fix-1-A"]).toMatch(/« 4 h » ne vient pas de la fiche du client/);
    const j = J.journeyOf(t.cid);
    expect(j.identities!.list[0].board!.lines).toEqual(route("A").board.lines);
    expect(j.identities!.corrected?.join(" ")).toMatch(/4 h/);
    expect(j.identities!.issues).toEqual([]);
  });

  it("un défaut de série sans identité nommée (même signature) est repris par les identités suivantes, pas par la première", async () => {
    const t = await thread();
    const log = newLog();
    const job = jobCtx(t.user, t.pid, { projectId: t.pid, conversationId: t.cid, capMicro: 9_000_000, count: 3 });
    const base = fakeAi(log, { review: () => ({ routes: [], series: "" }), recheck: { routes: [{ key: "B", better: true, remaining: [], score: 8 }, { key: "C", better: true, remaining: [], score: 8 }] } })();
    // La direction rend la même signature pour A et C ; la reprise rend la bonne.
    C.brandChainDeps.ai = (() => ({ ...base, ask: async (id: string, c: any) => (c.kind === "direction" && /Fond de page : blanc/.test(c.prompt) ? c.schema.parse({ ...draftOf(route("C")), slogan: route("A").slogan }) : base.ask(id, c)) })) as any;
    try { await fr(() => C.runSinaBrandJob(job)); } finally { C.brandChainDeps.ai = undefined; }
    expect(log.ids.filter((i) => i.startsWith("fix"))).toEqual(["fix-1-B", "fix-1-C"]);
    expect(log.prompts["fix-1-C"]).toMatch(/Deux identités ont la même signature\./);
    const j = J.journeyOf(t.cid);
    expect(j.identities!.list.map((x) => x.slogan)).toEqual([route("A").slogan, route("B").slogan, route("C").slogan]);
    expect(j.identities!.issues).toEqual([]);
  });

  it("l'étude lit au plus 45 pages, les paroles de clients d'abord, en extraits raccourcis", async () => {
    const t = await thread();
    const many = (id: string) => id === "paroles" ? [{ url: PAGE, title: "Avis", category: "customers" as const, excerpt: REAL.map((q) => `« ${q} »`).join(" ") + " x".repeat(3000) }]
      : id === "concurrents" ? Array.from({ length: 60 }, (_, i) => ({ url: `https://marques.example/${i}`, title: `Marque ${i}`, category: "competitors" as const, excerpt: "y".repeat(3000) })) : [];
    const { log } = await chain(t, {}, { web: (id) => (id.startsWith("verify") ? [] : many(id)), review: () => ({ routes: [], series: "" }) });
    const prompt = log.prompts.study;
    expect(prompt).toMatch(/# Pages trouvées \(45\)/);
    expect(prompt.indexOf(PAGE)).toBeLessThan(prompt.indexOf("https://marques.example/0")); // les paroles d'abord
    expect(prompt.length).toBeLessThan(60_000);
    expect(J.journeyOf(t.cid).identities!.study).toMatchObject({ quoteCount: 12, sources: 61 });
  });

  it("une parole rapportée par la recherche n'est gardée que si le Studio la relit sur la page elle-même", async () => {
    // La page ne contient que quatre des douze paroles (les autres sont chargées après coup, ou réécrites par la recherche).
    PAGES[PAGE] = `<html><body><div class="avis"><p>&laquo; ${REAL[0]} &raquo;</p><p>${REAL[1].replace("'", "&#39;")}</p><span>${REAL[5]}</span></div><script type="application/ld+json">{"reviewBody":"${REAL[7].replace(/'/g, "\\u0027")}"}</script></body></html>`;
    try {
      const t = await thread();
      await chain(t, {}, { review: () => ({ routes: [], series: "" }) });
      const study = J.journeyOf(t.cid).identities!.study!;
      expect(study.quoteCount).toBe(4);
      expect(study.quotes.map((q) => q.text)).toEqual([REAL[0], REAL[1], REAL[5], REAL[7]]);
      expect(study.notFound.join(" ")).toMatch(/8 paroles rapportées par ma recherche : je n'ai pas pu les relire sur leur page, je ne les ai pas gardées\./);
      // L'aveu s'appuyait sur les paroles 0, 1, 2, 4, 5, 9, 11 : il n'en reste que trois dans les quatre gardées.
      expect(J.journeyOf(t.cid).identities!.list[0].board!.idea.confessionSupport).toBeLessThan(7);
      // Page illisible : toutes ses paroles sont écartées, l'aveu devient une hypothèse.
      PAGES[PAGE] = null;
      const u = await thread();
      await chain(u, {}, { review: () => ({ routes: [], series: "" }) });
      expect(J.journeyOf(u.cid).identities!.study).toMatchObject({ quoteCount: 0 });
      expect(J.journeyOf(u.cid).identities!.list[0].board!.toProve.join(" ")).toMatch(/hypothèse/);
    } finally { delete PAGES[PAGE]; }
    expect(C.pageText("<p>J&rsquo;aime&nbsp;<b>bien</b></p><script>var a=\"go\\u00fbt\"</script>")).toBe("J'aime bien var a=\"goût\"");
    expect(C.quoteOnPage("on sens rien … on boit de l'eau", "Avis : on sens rien du tout, on boit de l’eau quoi")).toBe(true);
    expect(C.quoteOnPage("le goût était fade", "goût très fade")).toBe(false);
  });

  it("recherche sur le web en panne : la chaîne continue, sans rien inventer, et le dit", async () => {
    const t = await thread();
    const { log, out } = await chain(t, {}, { web: () => { throw new Error("recherche indisponible"); }, review: () => ({ routes: [], series: "" }) });
    expect(log.ids).not.toContain("study"); // aucune étude écrite sans page lue
    expect(log.ids).not.toContain("verify-1");
    const j = J.journeyOf(t.cid);
    expect(j.identities!.study).toMatchObject({ quoteCount: 0, sources: 0 });
    for (const x of j.identities!.list) {
      expect(x.board!.idea.confessionSupport).toBe(0);
      expect(x.board!.nameCheck).toBe("non_verifie");
      expect(x.board!.toProve.join(" ")).toMatch(/pas pu le vérifier[\s\S]*hypothèse/);
    }
    expect(out.notes.join(" ")).toMatch(/vérification des noms sur le web impossible/);
  });

  it("refaire une seule identité : les autres restent identiques, l'étude et les noms ne sont pas repayés", async () => {
    const t = await thread();
    await chain(t, {}, { fix: () => FIXED_LINE });
    const before = J.journeyOf(t.cid).identities!.list;
    const { log } = await chain(t, { redo: ["B"], guidance: "Plus doux pour B." }, { shortlist: () => [pick("B", "Nage Libre"), pick("C", "La Main Lourde", true), pick("A", "Grand Bain", true)], review: () => ({ routes: [], series: "" }) });
    expect(log.ids).toEqual(["shortlist", "web:verify-2", "verify-2", "direction-2-B", "review-2", "art-2-B"]);
    // Les routes gardées, déjà dessinées, partent à la relecture SANS leurs dessins.
    expect(log.prompts["review-2"]).not.toMatch(/"nodes"/);
    expect(log.prompts.shortlist).toMatch(/Routes GARDÉES par le client[\s\S]*A « Bain de Minuit »[\s\S]*C « L'Eau Est Bonne »/);
    expect(log.prompts.shortlist).toMatch(/Noms déjà montrés au client \(jamais reproposés\) : .*Lâche le Morceau/);
    expect(log.prompts.shortlist).toMatch(/Plus doux pour B\./);
    expect(log.prompts.shortlist.split("# Noms trouvés par les équipes")[1]).not.toMatch(/- Lâche le Morceau|- Bain de Minuit/);
    const j = J.journeyOf(t.cid);
    expect(j.identities!.round).toBe(2);
    expect(j.identities!.list.map((x) => x.name)).toEqual(["Bain de Minuit", "Nage Libre", "L'Eau Est Bonne"]);
    expect(j.identities!.list[0]).toEqual(before[0]);
    expect(j.identities!.list[2]).toEqual(before[2]);
  });

  it("refonte : le nom gardé par le client est repris mot pour mot, sans équipe de noms ni vérification", async () => {
    const t = await thread();
    J.updateJourney(t.cid, (x) => { x.keep = ["nom"]; x.keptValues = { name: "Maison Lune" }; x.mode = "refonte"; });
    const { log } = await chain(t, {}, { review: () => ({ routes: [], series: "" }) });
    expect(log.ids.filter((i) => i.startsWith("team") || i.includes("verify"))).toEqual([]);
    expect(log.prompts.shortlist).toMatch(/le client garde son nom/);
    const list = J.journeyOf(t.cid).identities!.list;
    expect(list.map((x) => x.name)).toEqual(["Maison Lune", "Maison Lune", "Maison Lune"]);
    for (const x of list) expect(x.board!.toProve.join(" ")).not.toMatch(/Le nom :/);
    expect(J.journeyOf(t.cid).identities!.issues.join(" ")).not.toMatch(/nom/i);
  });

  it("un nom inventé hors de la réserve par le premier jugement passe le même contrôle : mal formé, il est écarté", async () => {
    const t = await thread();
    await chain(t, {}, { shortlist: () => [pick("A"), pick("B", "La Mèche Courte"), pick("C"), pick("B", "Nage Libre", true), pick("C", "Thé 2000", true)], review: () => ({ routes: [], series: "" }) });
    expect(J.journeyOf(t.cid).identities!.list.map((x) => x.name)).toEqual(["Bain de Minuit", "L'Eau Est Bonne", "Nage Libre"]);
  });

  it("« seulement les noms » : couleurs, polices et ton gardés à l'identique", async () => {
    const t = await thread();
    await chain(t, {}, { fix: () => FIXED_LINE });
    const before = J.journeyOf(t.cid).identities!.list;
    const { log } = await chain(t, { namesOnly: true }, { shortlist: () => [pick("C", "Grand Bain"), pick("A", "Plongeon"), pick("B", "Marée Haute"), pick("A", "Patience", true)], review: () => ({ routes: [], series: "" }) });
    expect(log.ids.filter((i) => i.startsWith("team") || i === "study" || i === "strategy")).toEqual([]);
    expect(log.prompts.shortlist).toMatch(/SEULEMENT de nouveaux noms/);
    const after = J.journeyOf(t.cid).identities!.list;
    expect(after.map((x) => x.name)).toEqual(["Grand Bain", "Plongeon", "Marée Haute"]);
    for (const [i, x] of after.entries()) {
      expect(x.palette).toEqual(before[i].palette);
      expect(x.fonts).toEqual(before[i].fonts);
      expect(x.ground).toBe(before[i].ground);
      expect(x.tone).toEqual(before[i].tone);
    }
  });

  // ---------------------------------------------------------------- l'outil de SINA, la vue du fil, le choix

  it("identity.propose lance la chaîne en tâche de fond : devis et nombre d'identités selon le forfait du projet", async () => {
    const { threadView } = await import("@/lib/syna-agent/loop");
    const t = await thread(); // compte d'essai au forfait à 129 € : 4 identités
    const tool = getTool("identity.propose")!;
    const est = await tool.estimate!(t.ctx, {} as never);
    expect(est.label).toBe("4 identités de marque");
    expect(est.maxMicro).toBe(C.chainQuote({ routes: 4 }).maxMicro);
    expect(J.journeyContext(J.journeyOf(t.cid))).toMatch(/Étape 1 \(identités de marque : 2, 3 ou 4 selon le forfait du client[\s\S]*jamais « mon équipe »/);
    // Le même projet au forfait à 49 € : 2 identités, devis plus bas.
    run("UPDATE subscriptions SET plan='creer' WHERE project_id=?", t.pid);
    const small = await tool.estimate!(t.ctx, {} as never);
    expect(small.label).toBe("2 identités de marque");
    expect(small.maxMicro).toBeLessThan(est.maxMicro);
    run("UPDATE subscriptions SET plan='vendre' WHERE project_id=?", t.pid);
    expect((await tool.estimate!(t.ctx, {} as never)).label).toBe("3 identités de marque");
    // Rien à refaire tant qu'aucune proposition n'existe.
    expect((await call("identity.propose", t.ctx, { redo: ["B"] })).ok).toBe(false);
    const r = await call("identity.propose", t.ctx, {});
    expect(r.ok).toBe(true);
    expect(r.jobs).toHaveLength(1);
    expect(r.summary).toMatch(/Création de tes 3 identités de marque lancée \(plusieurs minutes : j'étudie ton marché/);
    const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs![0]);
    expect(job.type).toBe(C.SINA_BRAND_JOB);
    expect(JSON.parse(job.payload)).toMatchObject({ projectId: t.pid, conversationId: t.cid, count: 3, capMicro: C.chainQuote({ routes: 3 }).maxMicro });
    expect(J.journeyOf(t.cid).steps[1].status).toBe("doing");
    // Une seule création à la fois : jamais deux chaînes payées en parallèle.
    expect((await call("identity.propose", t.ctx, {})).summary).toMatch(/déjà en cours de création/);
    // Rien n'est affiché tant que la tâche n'a pas rendu ses planches.
    expect((await fr(() => threadView(t.user, t.cid))).journey.identities).toBeNull();
  });

  it("vue du fil et choix : planches complètes, nom dessiné, étude ; le client choisit D, ou mélange", async () => {
    const { threadView } = await import("@/lib/syna-agent/loop");
    const { loadProject } = await import("@/lib/projects");
    const t = await thread();
    await chain(t, { count: 4 }, { review: () => ({ routes: [], series: "" }) });
    const ids = (await fr(() => threadView(t.user, t.cid))).journey.identities! as any;
    expect(ids.list.map((x: any) => x.key)).toEqual(["A", "B", "C", "D"]);
    expect(ids.study).toMatchObject({ quoteCount: 12, sources: 3 });
    for (const x of ids.list) {
      expect(x.drawn.shapes.length).toBeGreaterThan(0); // nom dessiné par le Studio (tracés)
      expect(x.look.button).toBe(x.palette.primary);
      expect(x.board.object.label).toMatch(/^(Le sachet|Le pot)$/);
      expect(x.board.signs[0].kindLabel).toMatch(/^(Le lettrage|La phrase)$/);
      expect(x.faces.heading?.family).toBeTruthy();
    }
    expect(ids.list[1].drawn.text).toBe("LÂCHE LE\nMOR\nCEAU");
    expect(JSON.stringify(ids)).not.toMatch(/<svg|<script|symbolSvg/);
    expect(J.journeyContext(J.journeyOf(t.cid))).toMatch(/les planches de marque complètes sont affichées[\s\S]*idée : L'attente est la preuve[\s\S]*12 parole\(s\) réelle\(s\) de clients/);
    // Mélange : le nom de A avec les couleurs de B ; la mise en lignes de B ne s'applique pas au nom de A.
    const mixed = await call("identity.choose", t.ctx, { key: "B", mix: { name: "A" } });
    expect(mixed.ok).toBe(true);
    const final = (await fr(() => threadView(t.user, t.cid))).journey.identities!.final as any;
    expect(final.name).toBe("Bain de Minuit");
    expect(final.drawn.text).toBe("BAIN DE MINUIT");
    expect(final.palette).toEqual(route("B").palette);
    // Le client change d'avis et prend D : c'est la marque du projet.
    const d = await call("identity.choose", t.ctx, { key: "D" });
    expect(d.ok).toBe(true);
    expect(d.summary).toMatch(/Identité D enregistrée[\s\S]*Prochaine étape : ton logo\./);
    expect(loadProject(t.pid).brand).toMatchObject({ name: "Trempette", ground: "uni", tagline: "Trempe, attends, savoure." });
    expect(J.journeyOf(t.cid).steps[1].status).toBe("done");
    // Une clé qui n'est pas dans la proposition affichée est refusée (forfait à deux identités).
    const two = await thread();
    await chain(two, { count: 2 }, { review: () => ({ routes: [], series: "" }) });
    expect((await call("identity.choose", two.ctx, { key: "C" })).ok).toBe(false);
    expect((await call("identity.choose", two.ctx, { key: "A", mix: { palette: "D" } })).ok).toBe(false);
    expect((await call("identity.choose", two.ctx, { key: "A" })).ok).toBe(true);
  });

  it("le savoir des spécialistes : les quatre cahiers de métier sont lus, sans la liste des sources", async () => {
    const K = await import("@/lib/syna-agent/brand-knowledge");
    const P = await import("@/lib/syna-agent/brand-prompts");
    expect(K.brandKnowledgeReady()).toEqual({ ok: true });
    for (const b of Object.keys(K.BRAND_BOOKS) as (keyof typeof K.BRAND_BOOKS)[]) {
      const text = K.brandBook(b);
      expect(text.length).toBeGreaterThan(4000);
      expect(text.length).toBeLessThanOrEqual(K.MAX_BOOK_CHARS);
      expect(text).not.toMatch(/^## Sources/m);
      expect(text).not.toMatch(/\]\(https?:/);
    }
    // Chaque spécialiste lit SON cahier ; tous portent les règles de la maison (rien d'inventé, SINA seule voix).
    expect(P.strategySystem()).toContain(K.brandBook("idee").slice(0, 200));
    expect(P.teamSystem("produits", P.TEAM_PATHS.langue)).toContain(K.brandBook("noms").slice(0, 200));
    expect(P.directionSystem("produits")).toContain(K.brandBook("voix").slice(0, 200));
    expect(P.directionSystem("produits")).toContain(K.brandBook("signes").slice(0, 200));
    for (const sys of [P.STUDY_SYSTEM, P.strategySystem(), P.teamSystem("services", P.TEAM_PATHS.metier), P.shortlistSystem("produits", 3), P.directionSystem("services"), P.reviewSystem("produits"), P.recheckSystem("produits"), P.VERIFY_SYSTEM]) {
      expect(sys).toMatch(/Rien d'inventé/);
      expect(sys).toMatch(/Le client n'entend que SINA/);
      expect(sys).toMatch(/le TUTOIE \(« ta fiche », « tes clientes », « je te propose »\) : jamais « vous »/);
    }
    // Leçons de l'essai réel : le nom et le plan de la série ne se changent pas pendant une reprise ; rien n'est promis après.
    expect(P.reviewSystem("produits")).toMatch(/Ce que tu ne demandes jamais dans fixes : changer le nom[\s\S]*replaceName à true/);
    expect(P.fixSystem("produits")).toMatch(/Le NOM et le FOND DE PAGE ne changent jamais pendant une reprise/);
    expect(P.recheckSystem("produits")).toMatch(/Ne promets JAMAIS de le corriger/);
    // Entreprise de services : les équipes partent des mots du métier, et l'objet n'est jamais un emballage.
    expect(P.teamPathsFor("services", 4).map((p) => p.id)).toEqual(["metier", "langue", "mots", "verite"]);
    expect(P.teamPathsFor("produits", 4).map((p) => p.id)).toEqual(["langue", "mots", "univers", "verite"]);
    expect(P.directionSystem("services")).toMatch(/l'objet de terrain d'une entreprise de services, parmi carte, enseigne, vehicule, tablier/);
    const old = process.env.SINA_SAVOIR_DIR;
    process.env.SINA_SAVOIR_DIR = "/dossier/absent";
    try { expect(K.brandKnowledgeReady()).toMatchObject({ ok: false }); } finally { if (old == null) delete process.env.SINA_SAVOIR_DIR; else process.env.SINA_SAVOIR_DIR = old; }
  });

  // ---------------------------------------------------------------- contrôles gratuits et devis

  it("paroles de clients : gardées seulement si elles se retrouvent mot pour mot dans l'extrait de la page citée", () => {
    const findings = [{ url: "https://a.example/avis/", title: "", category: "customers" as const, excerpt: "Marie : « J’ai respecté le dosage, goût très fade. » Paul : on sens rien   on boit de l'eau quoi!!!" }];
    const r = C.verifiedQuotes([
      { text: "J'ai respecté le dosage, goût très fade.", url: "https://a.example/avis" }, // apostrophe typographique, barre finale
      { text: "on sens rien … on boit de l'eau quoi", url: "https://a.example/avis/" }, // coupe signalée par « … »
      { text: "J'ai respecté le dosage, le goût était fade.", url: "https://a.example/avis/" }, // réécrite
      { text: "goût très fade", url: "https://b.example/" }, // autre page
    ], findings);
    expect(r.kept.map((q) => q.text)).toEqual(["J'ai respecté le dosage, goût très fade.", "on sens rien … on boit de l'eau quoi"]);
    expect(r.dropped).toBe(2);
  });

  it("réserve de noms : chaque équipe à tour de rôle, sans doublon ni nom déjà montré", () => {
    const pool = C.namePool([{ team: "langue", names: ["Un Deux", "Trois", "Quatre"].map((name) => ({ name, detail: "", second: "", idea: "" })) }, { team: "mots", names: ["Cinq", "un deux", "Six"].map((name) => ({ name, detail: "", second: "", idea: "" })) }], { shown: ["Six"], competitors: ["Trois"] });
    expect(pool.map((p) => `${p.name}/${p.team}`)).toEqual(["Un Deux/langue", "Cinq/mots", "Quatre/langue"]);
  });

  it("devis : un plafond au-dessus du coût probable ; moins d'identités ou une reprise coûtent moins", () => {
    const three = C.chainQuote({ routes: 3 }), two = C.chainQuote({ routes: 2 }), four = C.chainQuote({ routes: 4 }), redo = C.chainQuote({ routes: 1, fresh: false });
    expect(three.maxMicro).toBeGreaterThan(three.probableMicro!);
    expect(two.maxMicro).toBeLessThan(three.maxMicro);
    expect(four.maxMicro).toBeGreaterThan(three.maxMicro);
    expect(redo.maxMicro).toBeLessThan(two.maxMicro);
    expect(C.chainSettings().teams).toBe(4);
    // Séries d'essai valides (elles servent aux autres tests de la marque).
    expect(series(4).map((x) => x.key)).toEqual(["A", "B", "C", "D"]);
  });

  // ---------------------------------------------------------------- les images qui finissent la planche

  const SLOTS = ["logo", "hero", "object", "site", "post0", "post1", "post2"];

  it("images de planche : la direction artistique, sept images, la relecture ; une image refusée laisse le dessin, et c'est dit", async () => {
    const t = await thread();
    const { log, out, job } = await chain(t, { images: true }, {
      review: () => ({ routes: [], series: "" }),
      look: (id, c) => ({ images: c.images.map((i: any) => (id.endsWith("-B") && i.label === "site" ? { slot: "site", ok: false, read: ["Fni le soda"], why: "Le titre est mal écrit." } : id.endsWith("-C") && i.label === "logo" ? { slot: "logo", ok: true, read: ["L'Eau Est Bone"], why: "" } : { slot: i.label, ok: true, read: [/Marque : « (.+?) »/.exec(c.prompt)![1]], why: "" })) }),
    });
    // Après les dessins : pour chaque planche, les consignes, les sept images dans l'ordre, puis UNE relecture.
    expect(log.ids.slice(log.ids.indexOf("art-1-C") + 1)).toEqual(["A", "B", "C"].flatMap((k) => [`imagery-1-${k}`, ...SLOTS.map((sl) => `image-1-${k}-${sl}`), `imagecheck-1-${k}`]));
    const refs = (log as any).refs;
    expect(refs["image-1-A-logo"]).toEqual({ logo: true, scene: false, aspect: "1:1" }); // le nom composé par le Studio sert de modèle
    expect(refs["image-1-A-hero"]).toEqual({ logo: false, scene: false, aspect: "16:9" });
    expect(refs["image-1-A-object"]).toEqual({ logo: true, scene: false, aspect: "1:1" }); // le logo est posé sur l'objet
    expect(refs["image-1-A-site"]).toEqual({ logo: true, scene: true, aspect: "9:16" });
    // Les textes viennent de la planche, lettre pour lettre ; aucune personne ; la grande image n'a aucun texte.
    const a = J.journeyOf(t.cid).identities!.list[0];
    expect(log.prompts["image-1-A-logo"]).toContain(`« ${a.name} »`);
    expect(log.prompts["image-1-A-site"]).toContain(`« ${a.board!.site.headline} »`);
    expect(log.prompts["image-1-A-site"]).toContain(`« ${a.board!.site.button} »`);
    expect(log.prompts["image-1-A-post1"]).toContain(`« ${a.board!.posts[1].text} »`);
    expect(log.prompts["image-1-A-hero"]).toMatch(/Aucun texte, aucune lettre/);
    for (const sl of SLOTS) expect(log.prompts[`image-1-A-${sl}`]).toMatch(/[Aa]ucune personne/);
    expect(log.prompts["image-1-A-hero"]).toMatch(/^Direction artistique : Lumière de fin d'après-midi/);
    // La relecture reçoit les textes attendus de chaque image.
    expect(log.prompts["imagecheck-1-A"]).toContain(`slot "site"`);
    expect(log.prompts["imagecheck-1-A"]).toContain(a.board!.site.headline);
    // A : tout est gardé. B : l'image du site est refusée. C : le logo ne porte pas le nom exact (contrôle du Studio).
    const [ra, rb, rc] = J.journeyOf(t.cid).identities!.list;
    expect(Object.keys(ra.board!.images!).sort()).toEqual(["hero", "logo", "look", "object", "posts", "site"]);
    expect(ra.board!.images!.posts!.every(Boolean)).toBe(true);
    expect(ra.board!.images!.logo).toMatchObject({ w: 96, h: 96 });
    expect(rb.board!.images!.site).toBeUndefined();
    expect(rb.board!.images!.hero).toBeTruthy();
    expect(rc.board!.images!.logo).toBeUndefined();
    const issues = J.journeyOf(t.cid).identities!.issues.join("\n");
    expect(issues).toMatch(/Identité B : je n'ai pas gardé l'image du site \(Le titre est mal écrit\) ; tu vois mon dessin à la place\./);
    expect(issues).toMatch(/Identité C : je n'ai pas gardé le logo \(le nom n'y est pas écrit exactement\)/);
    expect((out as any).routes).toHaveLength(3);
    // Bibliothèque du client : les images gardées sont prêtes, l'image refusée y est marquée refusée avec sa raison.
    const states = all<{ s: string; n: number }>("SELECT status s, COUNT(*) n FROM assets WHERE project_id=? AND role='brand-board' GROUP BY status", t.pid);
    expect(Object.fromEntries(states.map((r) => [r.s, r.n]))).toEqual({ ready: 19, rejected: 2 });
    expect(one<{ w: string }>("SELECT json_extract(meta,'$.synaBoard.review.why') w FROM assets WHERE project_id=? AND status='rejected' AND name LIKE '%-B-site%'", t.pid)?.w).toBe("Le titre est mal écrit.");
    // Dans le fil : une adresse interne du Studio, jamais une adresse libre.
    const { threadView } = await import("@/lib/syna-agent/loop");
    const shown = (await fr(() => threadView(t.user, t.cid))).journey.identities!.list as any[];
    expect(shown[0].board.images.hero.url).toMatch(/^\/api\/files\/[\w-]+$/);
    expect(shown[1].board.images.site).toBeUndefined();
    // Reprise de la tâche : rien n'est recréé ni repayé.
    const again = await chain(t, {}, {}, reload(job));
    expect(again.log.ids).toEqual([]);
  });

  it("images seules sur des planches déjà écrites : les textes ne bougent pas ; une image en échec n'est pas relancée", async () => {
    const t = await thread();
    await chain(t, {}, { review: () => ({ routes: [], series: "" }) });
    const before = J.journeyOf(t.cid).identities!.list;
    expect(before.every((x) => !x.board!.images)).toBe(true); // réglage par défaut : les dessins de SINA, aucune image
    let tries = 0;
    const { log } = await chain(t, { imagesOnly: true, redo: ["B"] }, { draw: async (id) => { if (id.endsWith("-post1")) { tries++; throw new Error("503 du fournisseur"); } return square("#CC3366", 120, 180); } });
    expect(log.ids).toEqual(["imagery-1-B", ...SLOTS.map((sl) => `image-1-B-${sl}`), "imagecheck-1-B"]);
    expect(tries).toBe(1);
    const after = J.journeyOf(t.cid).identities!.list;
    expect(after[0]).toEqual(before[0]);
    expect(after[2]).toEqual(before[2]);
    const { images, ...restBoard } = after[1].board!;
    expect({ ...after[1], board: restBoard }).toEqual(before[1]);
    expect(images!.posts).toEqual([expect.objectContaining({ w: 120, h: 180 }), null, expect.objectContaining({ w: 120, h: 180 })]);
    expect(J.journeyOf(t.cid).identities!.issues.join("\n")).toMatch(/Identité B : je n'ai pas pu créer la deuxième publication ; tu vois mon dessin à la place\./);
  });

  it("relecture impossible : des images non relues ne sont jamais montrées ; un mélange retire les images qui ne sont plus vraies", async () => {
    const { mixIdentity } = await import("@/lib/syna-agent/tools/identity");
    const t = await thread();
    await chain(t, { images: true }, { review: () => ({ routes: [], series: "" }), look: (id) => { if (id.endsWith("-A")) throw new Error("modèle indisponible"); return { images: SLOTS.map((slot) => ({ slot, ok: true, read: [id.endsWith("-B") ? "Lâche le Morceau" : "L'Eau Est Bonne"], why: "" })) }; } });
    const list = J.journeyOf(t.cid).identities!.list;
    expect(list[0].board!.images).toBeUndefined();
    expect(J.journeyOf(t.cid).identities!.issues.join("\n")).toMatch(/Identité A : je n'ai pas pu relire ses images, donc je ne te les montre pas/);
    expect(list[1].board!.images!.logo).toBeTruthy();
    // Identité prise telle quelle : ses images restent. Nom d'une autre, couleurs d'une autre, nom retouché : elles partent.
    expect(mixIdentity(list, "B").board!.images).toBeTruthy();
    expect(mixIdentity(list, "B", { name: "C" }).board!.images).toBeUndefined();
    expect(mixIdentity(list, "B", { palette: "C" }).board!.images).toBeUndefined();
    expect(mixIdentity(list, "B", {}, { name: "Autre Nom" }).board!.images).toBeUndefined();
    expect(mixIdentity(list, "B", { tone: "C" }).board!.images).toBeTruthy();
  });

  it("devis : les images s'ajoutent au prix annoncé seulement quand elles sont prévues", () => {
    const without = C.chainQuote({ routes: 3, images: false }), withImages = C.chainQuote({ routes: 3, images: true });
    expect(withImages.maxMicro).toBeGreaterThan(without.maxMicro);
    expect(C.chainQuote({ routes: 3 }).maxMicro).toBe(without.maxMicro); // réglage par défaut : pas d'images
    const alone = C.boardImagesQuote(1), three = C.boardImagesQuote(3);
    expect(three.maxMicro).toBeGreaterThan(alone.maxMicro * 2.9);
    expect(alone.probableMicro!).toBeLessThan(alone.maxMicro);
  });
});
