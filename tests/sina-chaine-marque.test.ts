/**
 * SINA — chaîne de création de la marque (décisions du propriétaire du 12 novembre 2026) : étude du marché avec des
 * paroles réelles vérifiées, idées, équipes de noms séparées, routes composées, noms vérifiés, planches, directeur de
 * création qui relit aussi la reprise. Aucun appel d'IA : les spécialistes et la recherche sont simulés.
 */
import { describe, expect, it } from "vitest";
import { journey, route, series } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";
/** L'idée en mots simples que la directrice de marque écrit avec chaque identité neuve (depuis le 23 novembre 2026). */
const IDEE_SIMPLE_DESSAI = "elle croit qu'un goût vrai demande du temps, et elle se bat contre ce qui est prêt tout de suite";

describe("SINA — chaîne de création de la marque", async () => {
  // Ces essais rejouent la chaîne des PLANCHES d'une proposition (identity.propose d'avant la méthode des graphistes) et la
  // marque finie. L'entrée par la méthode des graphistes (noms vérifiés, esquisses, logos finis, puis planches avec leurs
  // logos) est essayée dans tests/logo-graphistes-*.test.ts et tests/sina-graphistes-chaine.test.ts.
  const { all, one, run } = await import("@/lib/db");
  const { JobContext } = await import("@/lib/jobs");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const J = await import("@/lib/syna-agent/journey");
  const C = await import("@/lib/syna-agent/brand-chain");
  const { LOGO_ROUTE, photoRequestMaxMicro } = await import("@/lib/ai/media-providers");
  const { boardImageRoute } = await import("@/lib/syna-agent/brand-images");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  type Route = ReturnType<typeof route>;
  // Le logo est dessiné par le modèle imposé des logos (23 novembre 2026) : son devis prend son tarif par image.
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();

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
      board: { ...rest, idea: { ...ideaRest, simple: IDEE_SIMPLE_DESSAI }, signs: signs.map(({ symbol: _p, ...s }, i) => ({ ...s, symbolSvg: i === 0 ? GOOD_SVG : i === 1 ? BAD_SVG : "" })), wordmark: { ...mark, symbolSvg: "" }, ...over },
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
    /** Dessins qu'une illustratrice rendrait si elle était encore appelée (elle ne l'est plus : lot 2). */
    art?: (id: string) => any;
    /** Juge des noms (par défaut : il garde les douze premiers noms qu'il reçoit). */
    judge?: (id: string, names: string[]) => any;
    /** Noms rendus par une équipe au second tour (quand le juge en a gardé trop peu). */
    team2?: (id: string) => string[];
    /** Réponse d'un appel coupée à sa limite (essai réel de Nadia, 23 novembre 2026) : l'appel lève l'erreur d'une réponse inexploitable. */
    cut?: (id: string) => boolean;
    /** Création d'une image (par défaut : un petit carré de couleur ; une erreur simule un appel en échec). */
    draw?: (id: string, call: any) => Promise<Buffer>;
    /** Relecture des images (par défaut : tout est accepté, le nom est lu tel quel). */
    look?: (id: string, call: any) => any;
    /** Relecture en image de dessins (plus jamais appelée par la chaîne : lot 2). */
    artcheck?: (id: string, call: any) => any;
  };
  const sharpLib = (await import("sharp")).default;
  const square = (color: string, w = 96, h = 96) => sharpLib({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer();
  /** Un logo d'essai sur fond blanc net (le contrôle gratuit du fond refuse tout logo sur fond noir ou coloré). */
  const whiteLogo = async (color = "#1F5A47", w = 96, h = 96) => sharpLib({ create: { width: w, height: h, channels: 3, background: "#FFFFFF" } }).composite([{ input: await square(color, Math.round(w / 2), Math.round(h / 3)), gravity: "center" }]).png().toBuffer();
  const DRAWN = {
    hero: '<svg viewBox="0 0 320 250"><rect width="320" height="250" fill="#0A0F3D"/><circle cx="240" cy="60" r="30" fill="#FFE98A"/></svg>',
    // Du texte dans un dessin : refusé en entier par le contrôle du Studio.
    object: '<svg viewBox="0 0 190 130"><text x="0" y="10">Bio</text></svg>', site: "",
    signs: [{ index: 0, svg: '<svg viewBox="0 0 100 70"><circle cx="50" cy="35" r="20" fill="#FFE44D"/></svg>', ground: "dark" }, { index: 1, svg: '<svg viewBox="0 0 100 70"><circle cx="50" cy="35" r="20" fill="#FFE44D"/></svg>', ground: "dark" }, { index: 2, svg: "", sample: "Voilà, c'est dit.", hand: true, ground: "light" }],
    posts: [{ index: 0, svg: '<svg viewBox="0 0 100 92"><circle cx="70" cy="24" r="14" fill="#FFE98A"/></svg>', ground: "dark" }],
  };
  const fakeAi = (log: { ids: string[]; prompts: Record<string, string>; systems: Record<string, string> }, s: Script = {}) => () => ({
    research: async (id: string, _query: string, famille?: string) => { log.ids.push(`web:${id}`); (log as any).familles = { ...((log as any).familles ?? {}), [id]: famille }; return s.web ? s.web(id) : id.startsWith("verify") ? [{ url: "https://annuaire.example/boissons", title: "Marques de boissons", category: "competitors", excerpt: "Annuaire des marques de boissons aux fruits." }] : pages(id); },
    ask: async (id: string, c: any) => {
      // Le lecteur qui ne sait rien : par défaut il comprend tout, et son appel n'encombre pas les suites d'appels vérifiées.
      if (c.kind === "reader" && !(s as any).reader) return c.schema.parse({ texts: [] });
      log.ids.push(id); log.prompts[id] = c.prompt; log.systems[id] = c.system;
      ((log as any).studio ??= {})[id] = (await import("@/lib/billing")).chargeDuStudio();
      if (s.cut?.(id)) throw new (await import("@/lib/ai/llm")).ReponseInexploitable("La réponse de l'IA a été coupée faute de place.", true);
      const raw: any = (() => {
        if (c.kind === "study") return { quotes: [...REAL.map((text) => ({ text, url: PAGE })), { text: "Cette boisson a changé ma vie, je la recommande à tous.", url: PAGE }, { text: REAL[0], url: "https://inconnu.example/page" }], competitors: [{ name: "Fruits Givrés", url: RIVAL, codes: "pastels, fraîcheur" }], mould: "Des noms de fruits et de fraîcheur, des pastels.", substitutes: ["le soda de l'après-midi"], facts: [{ text: "Une infusion à froid demande au moins une heure au frais.", url: USAGE }, { text: "Fait sans page.", url: "https://inconnu.example/fait" }], notFound: [] };
        if (c.kind === "strategy") return { job: "Le soda était un moment à soi.", confessions: [{ text: "Quand je lis « sans sucre », je cherche ce qu'on me cache.", quotes: [0, 1, 2, 4, 5, 9, 11] }, { text: "Mon soda, c'est mon seul petit plaisir.", quotes: [] }], ideas: ["A", "B", "C", "D", "A", "B", "C", "D"].map((k, i) => ({ id: `i${i + 1}`, belief: i < 4 ? route(k as "A").board.idea.belief : `Idée de réserve ${i}`, confession: k === "D" ? 1 : 0, enemy: route(k as "A").board.idea.enemy, proof: route(k as "A").board.idea.proof, cost: route(k as "A").board.idea.cost, opposite: "les marques pressées", onlyUs: "nos morceaux se voient", tone: "franc", strong: s.strong ? s.strong(id, i) : i !== 7 })) };
        if (c.kind === "team" || c.kind === "teamShort") {
          const mine: Record<string, string[]> = { "team-langue": ["Bain de Minuit", "Lâche le Morceau", "La Main Lourde", "La Mèche Courte", "Sans Rancune"], "team-mots": ["Trempette", "Fruits Givrés", "Thé 2000", "Lâche le Morceau", "Frisquet"], "team-univers": ["Nage Libre", "L'Eau Est Bonne", "Grand Bain", "Plongeon", "Marée Haute"], "team-verite": ["Minute Papillon", "À Tremper", "Sans Bulles", "Patience", "Morceaux Choisis"] };
          const base = id.replace(/-court$/, "");
          return { names: (base.endsWith("-2") && s.team2 ? s.team2(base) : mine[id] ?? (c.kind === "teamShort" ? [`Reprise ${base}`, "Six", "Sept", "Huit", "Neuf"] : ["Un", "Deux", "Trois", "Quatre", "Cinq"])).map((name) => ({ name, detail: "détail", second: "lecture", idea: "" })) };
        }
        if (c.kind === "judge") { const names = [...c.prompt.matchAll(/^- (.+?) \| détail réel/gm)].map((m: RegExpMatchArray) => m[1]); return s.judge ? s.judge(id, names) : { kept: names.slice(0, 12).map((name) => ({ name, seen: "Une image nette.", why: "On le porterait avec fierté." })), almost: [] }; }
        if (c.kind === "shortlist") return { routes: s.shortlist ? s.shortlist(c.prompt) : [...(c.prompt.match(/Compose (\d)/)?.[1] === "2" ? [pick("A"), pick("B")] : c.prompt.match(/Compose (\d)/)?.[1] === "4" ? [pick("A"), pick("B"), pick("C"), pick("D")] : [pick("A"), pick("B"), pick("C")]), pick("B", "Nage Libre", true), pick("C", "La Main Lourde", true)] };
        if (c.kind === "verify") return { checks: [...(s.taken ?? []).map((t) => ({ name: t.name, taken: true, url: t.url, note: "Une marque de boissons porte ce nom." })), { name: "Bain de Minuit", taken: true, url: "https://jamais-lue.example", note: "inventé" }] };
        if (c.kind === "direction" || c.kind === "fix") {
          const ground = /Fond de page : (\w+)/.exec(c.prompt)?.[1] ?? /"ground":"(\w+)"/.exec(c.prompt)?.[1] ?? "blanc";
          const name = /^Nom : (.+?)(?: \(nom gardé|$)/m.exec(c.prompt)?.[1] ?? /"name":"([^"]+)"/.exec(c.prompt)?.[1];
          const base = route(BY_GROUND[ground]);
          return { ...draftOf(base, name ?? base.name, c.kind === "fix" && s.fix ? s.fix(base.key) : {}), ...(c.kind === "fix" && s.fixTop ? s.fixTop(base.key) : {}) };
        }
        if (c.kind === "review") return s.review ? s.review(c.prompt) : { routes: [{ key: "A", score: 8, verdict: "garder", fixes: [] }, { key: "B", score: 6, verdict: "reprendre", fixes: ["« Si c'est fade, remets-en. » est un ordre donné au lecteur : réécris cette phrase."] }, { key: "C", score: 8, verdict: "garder", fixes: [] }], series: "" };
        if (c.kind === "reader") return (s as any).reader(c.prompt);
        if (c.kind === "recheck") return s.recheck ?? { routes: [{ key: "B", better: true, remaining: [], score: 8 }] };
        if (c.kind === "art") return s.art ? s.art(id) : DRAWN;
        if (c.kind === "imagery") return { look: "Lumière de fin d'après-midi, rasante, sur une table claire.", logo: "Un logo net tiré du nom composé.", signs: "Photographie des signes de la marque brodés sur un tablier et imprimés sur une serviette.", hero: "Photographie d'une carafe pleine de morceaux de fruits.", object: "Le sachet posé sur la table.", site: "Le haut de la page d'accueil.", posts: ["Une scène.", "Un gros plan.", "Un aplat."] };
        throw new Error(`appel inattendu : ${id}`);
      })();
      return c.schema.parse(c.prepare ? c.prepare(raw) : raw);
    },
    draw: async (id: string, c: any) => { log.ids.push(id); log.prompts[id] = c.prompt; (log as any).refs = { ...((log as any).refs ?? {}), [id]: { logo: !!c.logo, scene: !!c.scene, aspect: c.aspect } }; if (c.avoid) (log as any).avoid = { ...((log as any).avoid ?? {}), [id]: true }; (log as any).serie = { ...((log as any).serie ?? {}), [id]: c.serie ?? [] }; return s.draw ? s.draw(id, c) : isLogo(id) ? whiteLogo() : square("#3366CC"); },
    look: async (id: string, c: any) => {
      log.ids.push(id); log.prompts[id] = c.prompt; log.systems[id] = c.system;
      const name = /Marque : « (.+?) »/.exec(c.prompt)?.[1] ?? "";
      if (id.startsWith("artcheck")) return c.schema.parse(s.artcheck ? s.artcheck(id, c) : { drawings: c.images.map((i: any) => ({ slot: i.label, ok: true, why: "" })) });
      // La maquette du site est lue avec tous ses mots attendus (le nom, le titre, le bouton) : un mot manquant la ferait relire.
      return c.schema.parse(s.look ? s.look(id, c) : { images: c.images.map((i: any) => ({ slot: i.label, ok: true, read: i.label === "site" ? siteWords(c.prompt, name) : [name], why: "" })) });
    },
  });
  /** Les mots que la relecture attend sur la maquette du site, tels qu'ils sont écrits dans sa consigne. */
  const siteWords = (prompt: string, name: string): string[] => { const w = [...(/slot "site" : [^\n]*Textes attendus : ([^\n]*)/.exec(prompt)?.[1] ?? "").matchAll(/« (.+?) »/g)].map((m) => m[1]); return w.length ? w : [name]; };
  /** L'identifiant d'une image de logo, avec ou sans le suffixe d'une création partielle (« :logo+hero+site »). */
  const isLogo = (id: string) => /-logo(:|$)/.test(id);
  /** Les trois images du premier temps (chaque planche proposée : logo, grande scène, maquette du site) et leur suffixe d'étape. */
  // Le premier temps des images d'une planche : la grande scène et le haut du site (le logo vient de la méthode des graphistes).
  const FIRST = ":hero+site";
  /** Les logos finis par la méthode des graphistes, un par identité (rangés comme la tâche les range), posés tels quels. */
  const logosFinis = async (t: { user: any; pid: string }, n: number) => { const { saveAsset } = await import("@/lib/library"); const out: { assetId: string }[] = []; for (let i = 0; i < n; i++) { const png = await sharpLib({ create: { width: 96, height: 96, channels: 3, background: "#FFFFFF" } }).composite([{ input: await sharpLib({ create: { width: 60, height: 30, channels: 3, background: ["#1F3D2B", "#2B3D6E", "#6E2A5E"][i % 3] } }).png().toBuffer(), left: 18, top: 33 }]).png().toBuffer(); out.push({ assetId: (await saveAsset({ projectId: t.pid, userId: t.user.id, data: png, name: `logo-esquisse-${i + 1}.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "ready" })).id }); } return out; };
  const newLog = () => ({ ids: [] as string[], prompts: {} as Record<string, string>, systems: {} as Record<string, string> });
  /**
   * Lance la tâche de la marque. Par défaut SANS images (`images: false`) : la plupart des tests ne portent que sur les
   * textes de la chaîne ; ceux qui portent sur les images passent `images: true`.
   */
  async function chain(t: { user: any; pid: string; cid: string }, payload: Record<string, unknown>, s: Script = {}, ctx?: InstanceType<typeof JobContext>) {
    const log = newLog();
    const job = ctx ?? jobCtx(t.user, t.pid, { projectId: t.pid, conversationId: t.cid, capMicro: 9_000_000, count: 3, images: false, ...payload });
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
    // Une seule famille de pages par recherche (22 novembre 2026), au lieu de la consigne des angles et de ses quatre familles.
    expect((log as any).familles).toMatchObject({ paroles: "customers", concurrents: "competitors", usages: "offer", "verify-1": "competitors" });
    expect(log.ids).toEqual(["web:paroles", "web:concurrents", "web:usages", "study", "strategy", "team-langue", "team-mots", "team-univers", "team-verite", "judge-1", "shortlist", "web:verify-1", "verify-1", "direction-1-A", "direction-1-B", "direction-1-C", "review-1", "fix-1-B", "recheck-1"]);
    // Plus d'illustratrice (lot 2) : aucun appel de dessin ni de relecture de dessin, et aucune planche ne porte de
    // dessin en code à la place d'une image (scène, objet, site, signes, publications).
    expect(log.ids.some((i) => i.startsWith("art"))).toBe(false);
    for (const x of J.journeyOf(t.cid).identities!.list) {
      expect(x.board!.hero).toBeUndefined();
      expect(x.board!.object.art).toBeUndefined();
      expect(x.board!.site.art).toBeUndefined();
      for (const g of x.board!.signs) expect(g.art).toBeUndefined();
      for (const q of x.board!.posts) expect(q.art).toBeUndefined();
    }
    // La relecture ne reçoit jamais les dessins (trop lourds, inutiles à la lecture des textes).
    expect(log.prompts["review-1"]).not.toMatch(/"nodes"/);
    // Chaque équipe suit UN chemin et ne voit pas les noms des autres.
    // Le chemin de chaque équipe part à la fin de sa demande ; la consigne est la même pour les quatre (audit 2.6).
    expect(log.prompts["team-mots"]).toMatch(/# Ton chemin : mots forts[^\n]*\n[\s\S]*$/);
    expect(log.prompts["team-langue"]).toMatch(/# Ton chemin : expressions de la langue/);
    expect(log.systems["team-mots"]).toBe(log.systems["team-langue"]);
    expect(log.prompts["team-mots"]).not.toMatch(/Bain de Minuit/);
    // Les noms du propriétaire servent de mesure, sans formule imposée.
    expect(log.systems.shortlist).toMatch(/La Mèche Courte/);
    expect(log.systems.shortlist).toMatch(/PAS une formule/);
    // La réserve de noms : ni nom d'exemple, ni nom d'un concurrent, ni nom mal formé, ni doublon.
    // (Le juge lit toute la réserve ; la composition ne reçoit ensuite que les noms qu'il a gardés.)
    const pool = log.prompts["judge-1"].split("# Noms trouvés par les équipes")[1];
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
    // Aucun pictogramme dessiné en code, même rendu par le modèle (audit du 22 novembre 2026, 2.12) ; ni ruban du colis.
    expect(b.signs.every((s) => !s.symbol)).toBe(true);
    expect(b.wordmark.symbol).toBeUndefined();
    expect(b.parcel).toBeUndefined();
    expect((await import("@/lib/syna-agent/brand-prompts")).directionSystem("produits")).not.toMatch(/symbolSvg|Pictogrammes|ruban du colis|parcel/);
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
    expect(log.ids.slice(-3)).toEqual(["review-1", "replace-1-C", "recheck-1"]);
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

  it("un chiffre que le client n'a pas donné : annoncé par le Studio dans « ce qui reste à prouver », sans reprise payée (audit 2.8)", async () => {
    const t = await thread();
    const withNumber = (prompt: string) => (/Fond de page : sombre/.test(prompt) ? { lines: ["Prête en 4 h au frais.", "La nuit porte fruit."] } : {});
    const log = newLog();
    const job = jobCtx(t.user, t.pid, { projectId: t.pid, conversationId: t.cid, capMicro: 9_000_000, count: 3, images: false });
    const base = fakeAi(log, { review: () => ({ routes: [], series: "" }), recheck: { routes: [{ key: "A", better: true, remaining: [], score: 8 }] } })();
    C.brandChainDeps.ai = (() => ({ ...base, ask: async (id: string, c: any) => (c.kind === "direction" && /Fond de page : sombre/.test(c.prompt) ? c.schema.parse(draftOf(route("A"), "Bain de Minuit", withNumber(c.prompt))) : base.ask(id, c)) })) as any;
    try { await fr(() => C.runSinaBrandJob(job)); } finally { C.brandChainDeps.ai = undefined; }
    // Avant : le contrôle partait au directeur, puis à une reprise payée de la planche entière. Le Studio l'annonce
    // lui-même (ce que la règle permet) ; le directeur ne juge que le talent.
    expect(log.ids).not.toContain("fix-1-A");
    expect(log.prompts["review-1"]).not.toMatch(/« 4 h » ne vient pas de la fiche du client/);
    const j = J.journeyOf(t.cid), a = j.identities!.list[0];
    expect(a.board!.lines).toContain("Prête en 4 h au frais.");
    expect(a.board!.toProve.join(" ")).toMatch(/« 4 h » : il ne vient pas de ta fiche ; à confirmer avant de l'utiliser\./);
    expect(j.identities!.corrected?.join(" ") ?? "").not.toMatch(/4 h/);
    expect(j.identities!.issues).toEqual([]);
  });

  it("un défaut de série sans identité nommée (même signature) est repris par les identités suivantes, pas par la première", async () => {
    const t = await thread();
    const log = newLog();
    const job = jobCtx(t.user, t.pid, { projectId: t.pid, conversationId: t.cid, capMicro: 9_000_000, count: 3, images: false });
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

  it("manière d'ouvrir le haut du site : le contrôle gratuit relève deux ouvertures identiques et une ouverture absente", async () => {
    const withLayout = (x: Route, layout: unknown): Route => ({ ...x, board: { ...x.board, site: { ...x.board.site, layout } } }) as Route;
    const [a, b, c, d] = series(4);
    // La série d'exemple : quatre manières d'ouvrir différentes, dites en mots, rien à relever.
    expect(C.layoutIssues([a, b, c, d])).toEqual([]);
    for (const x of [a, b, c, d]) expect(x.board.site.layout!.opening!.length).toBeGreaterThan(20);
    expect(new Set([a, b, c, d].map((x) => x.board.site.layout!.opening)).size).toBe(4);
    // Deux identités qui ouvrent de la même manière : la SECONDE est reprise, la première est nommée.
    const twin = C.layoutIssues([a, b, withLayout(c, a.board.site.layout)]);
    expect(twin).toEqual(["Identité C : le haut de son site s'ouvre de la même manière que celui de A ; choisis une autre manière d'ouvrir, d'après sa planche."]);
    // La même phrase à la casse, aux accents, à la ponctuation et aux espaces près reste la même manière d'ouvrir.
    const open = "Photo plein écran : titre en bas à gauche, accès direct.";
    expect(C.layoutIssues([withLayout(a, { opening: open }), withLayout(b, { opening: "  PHOTO PLEIN ECRAN, titre en bas a gauche ;  acces direct " })])).toEqual(["Identité B : le haut de son site s'ouvre de la même manière que celui de A ; choisis une autre manière d'ouvrir, d'après sa planche."]);
    // Deux phrases différentes : rien à relever, même si les anciens champs sont les mêmes (l'ouverture en mots prime).
    const old = { title: "bas", menu: "burger", button: "pilule", corners: "ronds", next: "produits" };
    expect(C.layoutIssues([withLayout(a, { ...old, opening: open }), withLayout(b, { ...old, opening: "Affiche typographique, titre centré sous le produit." })])).toEqual([]);
    // Trois fois la même : la deuxième et la troisième sont relevées.
    expect(C.layoutIssues([a, withLayout(b, a.board.site.layout), withLayout(c, a.board.site.layout)]).map((l) => l.slice(0, 10))).toEqual(["Identité B", "Identité C"]);
    // Ouverture absente (pas de layout, layout vide, ou anciens champs incomplets) : relevée pour cette identité, sans la comparer aux autres.
    const missing = "Identité B : la manière d'ouvrir le haut de son site (board.site.layout.opening) n'est pas choisie ; choisis-la d'après sa planche.";
    expect(C.layoutIssues([a, withLayout(b, undefined), c])).toEqual([missing]);
    expect(C.layoutIssues([a, withLayout(b, {}), c])).toEqual([missing]);
    expect(C.layoutIssues([a, withLayout(b, { button: "pilule", corners: "ronds" }), c])).toEqual([missing]);
    expect(C.layoutIssues([withLayout(a, undefined), withLayout(b, undefined)])).toHaveLength(2);
    expect(C.layoutIssues([])).toEqual([]);
    // Planches d'avant (sans « opening ») : la place du titre, le menu et la suite font la signature ; la forme du
    // bouton et les angles ne font pas une autre composition, la suite, si.
    expect(C.layoutIssues([withLayout(a, old), withLayout(b, { ...old, button: "souligne", corners: "droits" })])).toEqual(["Identité B : le haut de son site s'ouvre de la même manière que celui de A ; choisis une autre manière d'ouvrir, d'après sa planche."]);
    expect(C.layoutIssues([withLayout(a, old), withLayout(b, { ...old, next: "bandeau" })])).toEqual([]);
    // Le schéma de la planche : « opening » est un texte libre (3 à 160 caractères), les anciens champs sont facultatifs.
    const { BoardSchema } = await import("@/lib/syna-agent/brand-board");
    const site = (layout: unknown) => BoardSchema.shape.site.safeParse({ ...a.board.site, layout }).success;
    expect(site({ opening: open })).toBe(true);
    expect(site({})).toBe(true);
    expect(site(old)).toBe(true);
    expect(site({ opening: "ab" })).toBe(false);
    expect(site({ opening: "x".repeat(161) })).toBe(false);
    expect(site({ opening: open, title: "ailleurs" })).toBe(false);
  });

  it("manière d'ouvrir le haut du site : une ouverture recopiée ou oubliée par la direction est corrigée par le Studio, sans reprise payée (audit 2.8)", async () => {
    const t = await thread();
    const log = newLog();
    const job = jobCtx(t.user, t.pid, { projectId: t.pid, conversationId: t.cid, capMicro: 9_000_000, count: 3, images: false });
    const base = fakeAi(log, { review: () => ({ routes: [], series: "" }), recheck: { routes: [{ key: "B", better: true, remaining: [], score: 8 }, { key: "C", better: true, remaining: [], score: 8 }] } })();
    const { layout: _l, ...siteB } = route("B").board.site;
    // La direction oublie la manière d'ouvrir de B et recopie pour C celle de A ; la reprise rend les bonnes.
    C.brandChainDeps.ai = (() => ({ ...base, ask: async (id: string, c: any) => {
      if (c.kind === "direction" && /Fond de page : degrade/.test(c.prompt)) return c.schema.parse(draftOf(route("B"), route("B").name, { site: siteB }));
      if (c.kind === "direction" && /Fond de page : blanc/.test(c.prompt)) return c.schema.parse(draftOf(route("C"), route("C").name, { site: { ...route("C").board.site, layout: route("A").board.site.layout } }));
      return base.ask(id, c);
    } })) as any;
    try { await fr(() => C.runSinaBrandJob(job)); } finally { C.brandChainDeps.ai = undefined; }
    // Le Studio prend pour B et C la première manière d'ouvrir libre de la liste de la consigne : le directeur ne reçoit
    // plus ces points, et aucune reprise n'est payée pour eux.
    expect(log.prompts["review-1"]).not.toMatch(/la manière d'ouvrir le haut de son site|s'ouvre de la même manière/);
    expect(log.ids.filter((i) => i.startsWith("fix"))).toEqual([]);
    // La consigne de la planche demande cette manière d'ouvrir, choisie pour la marque et dite en une courte phrase.
    expect(log.systems["direction-1-A"]).toMatch(/layout\.opening : la MANIÈRE D'OUVRIR la page, choisie pour CETTE marque d'après sa planche \([^)]+\), en une courte phrase/);
    expect(log.systems["direction-1-A"]).toMatch(/Deux identités d'une même série n'ont JAMAIS la même manière d'ouvrir\./);
    expect(log.systems["direction-1-A"]).not.toMatch(/layout : la COMPOSITION/);
    const j = J.journeyOf(t.cid);
    const { MANIERES_D_OUVRIR } = await import("@/lib/syna-agent/brand-corrections");
    const [la, lb, lc] = j.identities!.list.map((x) => x.board!.site.layout?.opening);
    expect(la).toBe(route("A").board.site.layout!.opening);
    for (const o of [lb, lc]) expect(MANIERES_D_OUVRIR.produits as readonly string[]).toContain(o);
    expect(new Set([la, lb, lc]).size).toBe(3);
    expect(C.layoutIssues(j.identities!.list as any)).toEqual([]);
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
    expect(log.ids).toEqual(["judge-2", "shortlist", "web:verify-2", "verify-2", "direction-2-B", "review-2"]);
    // Les routes gardées partent à la relecture en texte seulement.
    expect(log.prompts["review-2"]).not.toMatch(/"nodes"/);
    expect(log.prompts.shortlist).toMatch(/Routes GARDÉES par le client[\s\S]*A « Bain de Minuit »[\s\S]*C « L'Eau Est Bonne »/);
    expect(log.prompts.shortlist).toMatch(/Noms déjà montrés au client \(jamais reproposés\) : .*Lâche le Morceau/);
    expect(log.prompts.shortlist).toMatch(/Plus doux pour B\./);
    expect(log.prompts["judge-2"].split("# Noms trouvés par les équipes")[1]).not.toMatch(/- Lâche le Morceau|- Bain de Minuit/);
    expect(log.prompts.shortlist.split("# Noms gardés par le juge des noms")[1]).not.toMatch(/- Lâche le Morceau|- Bain de Minuit/);
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
    // Un juge qui garde tous les noms : ses verdicts resservent à la proposition suivante (audit du 22 novembre 2026, 2.13).
    const garde = ["Bain de Minuit", "Lâche le Morceau", "L'Eau Est Bonne", "Nage Libre", "La Main Lourde", "Grand Bain", "Plongeon", "Marée Haute", "Patience"];
    const judge = (_id: string, names: string[]) => ({ kept: names.filter((n) => garde.includes(n)).map((name) => ({ name, seen: "Une image nette.", why: "On le porterait avec fierté." })), almost: [] });
    await chain(t, {}, { fix: () => FIXED_LINE, judge });
    const before = J.journeyOf(t.cid).identities!.list;
    const { log } = await chain(t, { namesOnly: true }, { judge, shortlist: () => [pick("C", "Grand Bain"), pick("A", "Plongeon"), pick("B", "Marée Haute"), pick("A", "Patience", true)], review: () => ({ routes: [], series: "" }) });
    expect(log.ids.filter((i) => i.startsWith("team") || i === "study" || i === "strategy")).toEqual([]);
    // Sans nouveaux mots du client, le juge des noms n'est pas relancé sur les mêmes noms.
    expect(log.ids.filter((i) => i.startsWith("judge"))).toEqual([]);
    // Les noms déjà montrés ne reviennent jamais devant le client.
    expect(log.prompts.shortlist).not.toMatch(/^- Bain de Minuit \|/m);
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
    // Un seul accord pour toute l'étape (méthode des graphistes, seule façon de faire) : les noms, la recherche du logo,
    // ses logos finis et les planches, PLUS la fin de la marque de l'identité qu'il choisira.
    const { accordGraphistes } = await import("@/lib/syna-agent/tools/identity");
    expect(est.maxMicro).toBe(accordGraphistes(4).maxMicro + C.finishQuote().maxMicro);
    expect(est.probableMicro).toBe(accordGraphistes(4).probableMicro + C.finishQuote().probableMicro!);
    expect(J.journeyContext(J.journeyOf(t.cid))).toMatch(/Étape 1 \(identités de marque : 2, 3 ou 4 selon le forfait du client[\s\S]*Le prix affiché couvre toute l'étape : ses identités, puis la marque complète de celle qu'il choisira \(un seul accord\)[\s\S]*jamais « mon équipe »/);
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
    expect(r.summary).toMatch(/^C'est parti : j'étudie ton marché, je cherche l'idée et les noms/);
    const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs![0]);
    expect(job.type).toBe(C.SINA_BRAND_JOB);
    expect(JSON.parse(job.payload)).toMatchObject({ projectId: t.pid, conversationId: t.cid, count: 3, jusquAuxNoms: true, capMicro: accordGraphistes(3).nomsMicro });
    expect(J.journeyOf(t.cid).steps[1].status).toBe("doing");
    // La tâche des planches garde SON plafond ; la part de l'accord qui couvre la fin de marque est notée dans le parcours.
    expect(J.journeyOf(t.cid).brandFinish).toEqual({ prepaidMicro: C.finishQuote().maxMicro });
    // Une seule création à la fois : jamais deux chaînes payées en parallèle.
    expect((await call("identity.propose", t.ctx, {})).summary).toMatch(/déjà en cours de création/);
    // Rien n'est affiché tant que la tâche n'a pas rendu ses planches.
    expect((await fr(() => threadView(t.user, t.cid))).journey.identities).toBeNull();
  });

  it("maquette du site : sur une identité à fond sombre, le logo joint est sa version claire posée sur le foncé de la marque (retour du propriétaire : « le logo sombre sur un fond sombre, ça marche pas »)", async () => {
    const { logoForGround } = await import("@/lib/syna-agent/brand-images");
    const dark = await sharpLib({ create: { width: 120, height: 80, channels: 3, background: "#FFFFFF" } }).composite([{ input: await sharpLib({ create: { width: 60, height: 30, channels: 3, background: "#141414" } }).png().toBuffer() }]).png().toBuffer();
    const palette = { dark: "#101820", primary: "#B5562B", secondary: "#EFE6D8", accent: "#7FB5A8", light: "#FAF6EF" };
    expect(await logoForGround(dark, { ground: "blanc", palette } as never)).toBe(dark); // fond clair : le logo tel quel
    expect(await logoForGround(null, { ground: "sombre", palette } as never)).toBeNull();
    const out = await logoForGround(dark, { ground: "sombre", palette } as never);
    const { data, info } = await sharpLib(out!).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
    expect(px(2, 2)).toEqual([0x10, 0x18, 0x20]); // le fond : le foncé de la marque
    expect(px(Math.floor(info.width / 2), Math.floor(info.height / 2))).toEqual([0xfb, 0xf8, 0xf2]); // le dessin foncé est devenu clair
    // Une couleur FONCÉE de la marque (un nom brun) passe en clair elle aussi ; une couleur vive est gardée (essai réel
    // du 16 novembre 2026 : nom brun illisible sur le fond sombre de sa planche).
    const { lightLogo } = await import("@/lib/syna-agent/brand-images");
    const one = async (hex: string) => { const o = await sharpLib(await lightLogo(await sharpLib({ create: { width: 8, height: 8, channels: 4, background: hex } }).png().toBuffer())).raw().toBuffer(); return [o[0], o[1], o[2]]; };
    expect(await one("#4A2A1C")).toEqual([0xfb, 0xf8, 0xf2]);
    expect(await one("#F26A4B")).toEqual([0xf2, 0x6a, 0x4b]);
  });

  it("maquette du site : comparée au logo de la planche, et gardée quand la seconde lecture ne rend rien alors que la première avait tout trouvé", async () => {
    const t = await thread();
    const expected = (prompt: string, slot: string) => [...(new RegExp(`slot "${slot}" : [^\\n]*Textes attendus : ([^\\n]*)`).exec(prompt)?.[1] ?? "").matchAll(/« (.+?) »/g)].map((m) => m[1]);
    await chain(t, {}, { review: () => ({ routes: [], series: "" }) });
    // Le logo fini de A (méthode des graphistes), posé tel quel sur sa planche.
    const [fini] = await logosFinis(t, 1);
    const posee = await C.poserLeLogoFini(J.journeyOf(t.cid).identities!.list[0] as never, fini.assetId);
    J.updateJourney(t.cid, (x) => { x.identities!.list[0] = posee as never; });
    const { log } = await chain(t, { imagesOnly: true, slots: ["site"], redo: ["A"] }, {
      look: (id, c) => {
        if (id.startsWith("imagereread")) return { images: [] }; // la seconde lecture ne rend rien
        // Refusée « texte » alors que tous ses textes sont recopiés sans faute : le doute, donc une seconde lecture.
        return { images: c.images.filter((i: any) => i.label === "site").map(() => ({ slot: "site", ok: false, defect: "texte", read: expected(c.prompt, "site"), why: "Le titre est mal écrit." })) };
      },
    });
    const check = Object.keys(log.prompts).find((k) => k.startsWith("imagecheck-1-A"))!;
    expect(log.prompts[check]).toMatch(/Le logo de l'en-tête est CELUI de la marque \(compare-le à l'image « logo » fournie avec les autres\)[^\n]*une nuance de couleur différente n'est pas un défaut\. Seul un AUTRE signe/);
    expect(log.ids.some((x) => x.startsWith("imagereread-1-A"))).toBe(true);
    expect(J.journeyOf(t.cid).identities!.list[0].board!.images!.site).toBeTruthy();
  });

  it("logo joint à une demande d'image : toujours sur un fond blanc plein, jamais transparent (essai réel du 16 novembre 2026 : le logo détouré de la marque finie faisait rendre à OpenAI des images aux bords transparents, refusées « abîmées »)", async () => {
    const I = await import("@/lib/syna-agent/brand-images");
    const clear = await sharpLib({ create: { width: 40, height: 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: await square("#4A2A1C", 20, 20) }]).png().toBuffer();
    expect((await sharpLib(clear).metadata()).hasAlpha).toBe(true);
    const flat = await I.onWhite(clear), meta = await sharpLib(flat).metadata();
    expect(meta.hasAlpha).toBe(false);
    const px = await sharpLib(flat).raw().toBuffer();
    expect([px[0], px[1], px[2]]).toEqual([255, 255, 255]); // le coin transparent est devenu blanc
    // La création d'une image passe son logo par là.
    const src = (await import("node:fs")).readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(src).toContain("logo: refs.logo ? await onWhite(refs.logo) : null");
    expect((await import("node:fs")).readFileSync("src/lib/syna-agent/brand-finish.ts", "utf8")).toContain("logo: await onWhite(logoPng)");
  });

  it("le lecteur qui ne sait rien : il ne reçoit que les phrases courtes et ce qui est vendu ; une phrase qu'il ne comprend pas est reprise avant les images (retour du propriétaire : « des textes un peu difficiles à comprendre »)", async () => {
    const t = await thread();
    let seen = "";
    const { log } = await chain(t, {}, {
      reader: (prompt: string) => { seen = prompt; const id = /id (B-p2) /.exec(prompt)![1]; return { texts: [{ id, understood: "Le café est vieux de plusieurs jours", clear: false, why: "« quelques jours » se lit comme un café pas frais." }, { id: "A-s", understood: "ok", clear: true, why: "" }] }; },
      review: () => ({ routes: [], series: "" }),
    } as never);
    // Il lit la signature, le titre et le bouton du site, et les trois publications de chaque planche ; rien de l'idée.
    for (const k of ["A", "B", "C"]) for (const f of ["s", "t", "b", "p1", "p2", "p3"]) expect(seen).toContain(`id ${k}-${f} | l'entreprise vend : `);
    expect(seen).not.toMatch(/confession|territoire|Ce que ton client pense/i);
    expect(log.systems["reader-1"]).toMatch(/Tu ne connais PAS ces marques, tu n'es pas du métier/);
    // La phrase relevée arrive chez le directeur de création et dans la reprise de SA planche seulement.
    const line = /- Identité B : la publication 2 « .+ » n'est pas comprise du premier coup par quelqu'un qui ne connaît pas la marque \(« quelques jours » se lit comme un café pas frais ; il comprend : « Le café est vieux de plusieurs jours »\)\. Réécris-la : claire d'abord, belle ensuite\./;
    expect(log.prompts["review-1"]).toMatch(line);
    expect(log.prompts["fix-1-B"]).toMatch(line);
    expect(log.ids).not.toContain("fix-1-A");
    // La règle est écrite pour celle qui rédige, et le lecteur compte dans le devis.
    const P3 = await import("@/lib/syna-agent/brand-prompts");
    // La forme demandée à la directrice artistique nomme TOUTES les consignes, la maquette du site comprise.
    for (const f of ["look", "hero", "object", "signs", "site", "posts"]) expect(P3.imagerySystem("produits")).toMatch(new RegExp(`Forme exacte : \\{[^\\n]*"${f}": `));
    // La directrice artistique n'écrit plus de ligne pour le logo (23 novembre 2026) : le Studio l'écrit lui-même.
    expect(P3.imagerySystem("produits")).not.toMatch(/Forme exacte : \{[^\n]*"logo": /);
    expect(P3.HOUSE_RULES).toMatch(/CLAIR D'ABORD, BEAU ENSUITE[\s\S]*comprise à la PREMIÈRE lecture par quelqu'un qui ne connaît ni la marque ni le métier/);
    expect(C.readerTexts(J.journeyOf(t.cid).identities!.list[0] as never, true).some((x) => x.id === "A-s")).toBe(false); // une signature gardée du client n'est pas relue
  });

  it("identity.images : SINA refait elle-même seulement certaines images d'une planche, avec devis (retour du propriétaire : « c'est à SINA d'y faire, pas à toi »)", async () => {
    const t = await thread();
    const tool = getTool("identity.images")!;
    expect(tool.kind).toBe("generate"); // payant : accord du client avec le devis avant
    expect((await call("identity.images", t.ctx, { keys: ["A"], images: ["hero"] })).ok).toBe(false); // aucune planche encore
    await chain(t, {}, { review: () => ({ routes: [], series: "" }) });
    run("UPDATE jobs SET status='done' WHERE project_id=? AND type=?", t.pid, C.SINA_BRAND_JOB);
    const est = await tool.estimate!(t.ctx, { keys: ["A", "B"], images: ["hero", "site"] } as never);
    expect(est.label).toBe("2 images à refaire sur 2 planches");
    expect(est.maxMicro).toBe(C.boardImagesQuote(2, undefined, ["hero", "site"]).maxMicro);
    expect((await tool.estimate!(t.ctx, { keys: ["A"], images: ["hero"] } as never)).maxMicro).toBe(C.boardImagesQuote(1, undefined, ["hero"]).maxMicro);
    const r = await call("identity.images", t.ctx, { keys: ["B", "A"], images: ["hero"], guidance: "Le client a dit : « une scène plus lumineuse »" });
    expect(r.ok).toBe(true);
    expect(r.summary).toMatch(/^Je refais 1 image sur « .+ » et « .+ » \(quelques minutes\) ; le reste des planches ne bouge pas\.$/);
    const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs![0]);
    expect(job.type).toBe(C.SINA_BRAND_JOB);
    // Les clés dans l'ordre des identités ; la consigne du client passe telle quelle (elle ne parle que de la photo).
    expect(JSON.parse(job.payload)).toMatchObject({ imagesOnly: true, images: true, redo: ["A", "B"], slots: ["hero"], capMicro: (await tool.estimate!(t.ctx, { keys: ["A", "B"], images: ["hero"] } as never)).maxMicro, guidance: "Le client a dit : « une scène plus lumineuse »" });
    // Avant le choix, une planche a son logo (méthode des graphistes, jamais redessiné ici), sa grande scène et le haut de
    // son site : seules ces deux images se refont ici ; l'objet, les signes et les publications, avec brand.finish.
    for (const slot of ["hero", "site"]) expect(tool.args.safeParse({ keys: ["A"], images: [slot] }).success).toBe(true);
    for (const slot of ["logo", "object", "signs", "post0"]) expect(tool.args.safeParse({ keys: ["A"], images: [slot] }).success).toBe(false);
    expect(tool.args.safeParse({ keys: ["A"], images: ["hero", "site", "hero"] }).success).toBe(false); // deux au plus
    expect(tool.description).toMatch(/refait SEULEMENT la grande scène \(« hero »\) ou le haut du site \(« site »\)[^"]*logo\.autre, logo\.pistes/);
    const siteEst = await tool.estimate!(t.ctx, { keys: ["A"], images: ["site"] } as never);
    expect(siteEst.label).toBe("1 image à refaire sur 1 planche");
    expect(siteEst.maxMicro).toBe(C.boardImagesQuote(1, undefined, ["site"]).maxMicro);
    expect(siteEst.maxMicro).toBeGreaterThan(0);
    expect((await call("identity.images", t.ctx, { keys: ["A"], images: ["site"] })).summary).toMatch(/déjà en cours/);
    // SINA sait que c'est à elle de refaire une image fausse, sans refaire l'identité ; le logo ne se redessine jamais ainsi.
    const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
    expect(SYNA_SYSTEM).toContain("Une grande scène ou un haut de site faux se refait avec identity.images, sans refaire l'identité ; le logo ne se redessine jamais ainsi.");
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
    // Planches sans images et accord non donné par identity.propose : la fin de marque n'est pas couverte, elle ne
    // part pas seule ; SINA est renvoyée vers brand.finish, qui montrera son prix.
    expect(mixed.jobs).toBeUndefined();
    expect(d.summary).toMatch(/Identité D enregistrée[\s\S]*Reste à finir ta marque : appelle brand\.finish\./);
    expect(d.summary).not.toMatch(/Prochaine étape : ton logo/);
    expect(d.hint).toMatch(/brand\.finish/);
    expect(d.jobs).toBeUndefined();
    expect(loadProject(t.pid).brand).toMatchObject({ name: "Trempette", ground: "uni", tagline: "Trempe, attends, savoure." });
    expect(J.journeyOf(t.cid).steps[1].status).toBe("done");
    // Une clé qui n'est pas dans la proposition affichée est refusée (forfait à deux identités).
    const two = await thread();
    await chain(two, { count: 2 }, { review: () => ({ routes: [], series: "" }) });
    expect((await call("identity.choose", two.ctx, { key: "C" })).ok).toBe(false);
    expect((await call("identity.choose", two.ctx, { key: "A", mix: { palette: "D" } })).ok).toBe(false);
    expect((await call("identity.choose", two.ctx, { key: "A" })).ok).toBe(true);
  });

  it("le savoir des spécialistes : les cinq cahiers de métier sont lus, sans la liste des sources", async () => {
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
    // Le cahier de la maquette du haut de l'accueil (15 novembre 2026) : lisible, assez long, écrit en principes.
    expect(Object.keys(K.BRAND_BOOKS)).toEqual(["noms", "idee", "voix", "signes", "maquette"]);
    expect(K.BRAND_BOOKS.maquette).toBe("maquettes-accueil-mobile.md");
    const mock = K.brandBook("maquette");
    expect(mock.length).toBeGreaterThan(4000);
    expect(mock).toMatch(/^# La maquette du haut de l'accueil, sur téléphone/);
    expect(mock).toMatch(/Un téléphone récent, entier, vu bien de face, posé sur un fond uni très doux/);
    expect(mock).toMatch(/Les grandes manières d'ouvrir/);
    // Aucun nom de marque d'exemple des maquettes de référence : le cahier ne garde que les principes.
    for (const n of ["Trempe", "Fumée", "Hors Cadre", "Les Rives", "Orée", "Réveil Club", "Rebâtir", "Volta", "Solstice"]) expect(mock, n).not.toContain(n);
    // La directrice artistique des images le lit en entier, à la fin de sa consigne, pour les produits comme pour les services.
    for (const k of ["produits", "services"] as const) {
      const sys = P.imagerySystem(k);
      expect(sys).toContain(`# Cahier : la maquette du haut de l'accueil, sur téléphone\n${mock}`);
      expect(sys.endsWith(mock)).toBe(true);
      for (const n of ["Trempe", "Fumée", "Hors Cadre", "Les Rives", "Orée", "Réveil Club", "Rebâtir", "Volta", "Solstice"]) expect(sys, `${k} : ${n}`).not.toContain(n);
    }
    for (const sys of [P.STUDY_SYSTEM, P.strategySystem(), P.teamSystem("services", P.TEAM_PATHS.metier), P.shortlistSystem("produits", 3), P.directionSystem("services"), P.reviewSystem("produits"), P.recheckSystem("produits"), P.VERIFY_SYSTEM]) {
      expect(sys).toMatch(/Rien d'inventé/);
      expect(sys).toMatch(/Le client n'entend que SINA/);
      expect(sys).toMatch(/le TUTOIE \(« ta fiche », « tes clientes », « je te propose »\) : jamais « vous »/);
    }
    // Leçons de l'essai réel : le nom et le plan de la série ne se changent pas pendant une reprise ; rien n'est promis après.
    expect(P.reviewSystem("produits")).toMatch(/Ce que tu ne demandes jamais dans fixes : changer le nom[\s\S]*replaceName à true/);
    expect(P.FIX_HEAD).toMatch(/Le NOM et le FOND DE PAGE ne changent jamais pendant une reprise/);
    // Audit 2.5 : la reprise reçoit exactement la consigne de la planche (relue en mémoire), sa propre consigne part en tête de la demande.
    expect(P.fixSystem("produits")).toBe(P.directionSystem("produits"));
    // Audit 2.6 : les quatre équipes reçoivent la même consigne ; leur chemin part à la fin de la demande.
    const teams = P.teamPathsFor("produits", 4);
    expect(new Set(teams.map((t) => P.teamSystem("produits", t))).size).toBe(1);
    for (const t of teams) { expect(P.teamSystem("produits", t)).not.toContain(t.brief); expect(P.teamPathBlock(t)).toContain(t.brief); }
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

  // Dans l'ordre de création : la maquette du site vient juste après le logo et la grande scène, qu'elle reçoit en
  // références (15 novembre 2026 : de nouveau une image créée). Les signes : une vraie photo, plus de pictogrammes.
  const SLOTS = ["hero", "site", "object", "signs", "post0", "post1", "post2"];
/** Ordre de la relecture, une image à la fois (celui des images de la planche). */
const REVIEW_ORDER = ["logo", "hero", "object", "signs", "site", "post0", "post1", "post2"];

  it("images de planche en deux temps : à la proposition, la grande scène et la maquette du site avec le logo fini posé ; puis toutes les images, la relecture ; une image refusée n'est pas montrée, et c'est dit", async () => {
    const t = await thread();
    const script: Script = {
      review: () => ({ routes: [], series: "" }),
      look: (id, c) => ({ images: c.images.filter((i: any) => i.label !== "logo" && i.label !== "produit").map((i: any) => (/-B(:|$)/.test(id) && i.label === "object" ? { slot: "object", ok: false, read: ["Fni le soda"], why: "Le titre est mal écrit." } : { slot: i.label, ok: true, read: i.label === "site" ? siteWords(c.prompt, "") : [/Marque : « (.+?) »/.exec(c.prompt)![1]], why: "" })) }),
    };
    // Premier temps (la proposition) : les logos finis de A et de B (méthode des graphistes) sont posés tels quels ; C n'a
    // pas le sien. Pour chaque planche : la direction artistique, la grande scène relue, puis le haut du site, qui porte
    // le logo. Aucun logo n'est dessiné ici ; ni objet, ni signes, ni publications.
    const logos = await logosFinis(t, 2);
    const first = await chain(t, { images: true, logosGraphistes: logos }, script);
    expect(first.log.ids.slice(first.log.ids.indexOf("review-1") + 1).filter((i) => !/:r\d$/.test(i) && /^(imagery|image|imagecheck)-/.test(i))).toEqual(["A", "B", "C"].flatMap((k) => [`imagery-1-${k}${FIRST}`, `image-1-${k}-hero${FIRST}`, `imagecheck-1-${k}${FIRST}:hero`, ...(k === "C" ? [] : [`image-1-${k}-site${FIRST}`, `imagecheck-1-${k}${FIRST}:site`])]));
    expect(first.log.ids.some((i) => /-(logo|object|signs|post\d)(:|$)/.test(i) && i.startsWith("image-"))).toBe(false);
    // La maquette : en portrait, avec le logo et la grande scène de sa planche en références.
    for (const k of ["A", "B"]) expect((first.log as any).refs[`image-1-${k}-site${FIRST}`]).toEqual({ logo: true, scene: true, aspect: "9:16" });
    // C : sans logo, la maquette n'est pas dessinée (elle serait fausse d'avance), et la planche C n'est pas montrée.
    expect((first.log as any).refs[`image-1-C-site${FIRST}`]).toBeUndefined();
    expect(first.log.prompts[`image-1-A-site${FIRST}`]).toContain("Le haut de la page d'accueil.");
    expect(first.log.systems[`imagery-1-A${FIRST}`]).toMatch(/- site : la MAQUETTE du haut de la page d'accueil du site sur téléphone\. Suis le cahier « La maquette du haut de l'accueil » ci-dessous/);
    expect(first.log.prompts[`imagery-1-A${FIRST}`]).toContain(`manière d'ouvrir choisie pour cette identité : ${route("A").board.site.layout!.opening}`);
    expect(first.log.ids.some((i) => i.startsWith("imagereread"))).toBe(false);
    expect(first.log.ids.some((i) => i.startsWith("art"))).toBe(false);
    expect((first.log as any).refs[`image-1-A-hero${FIRST}`]).toEqual({ logo: false, scene: false, aspect: "16:9" });
    const [pa, pb, pc] = J.journeyOf(t.cid).identities!.list;
    expect(pa.board!.images!.logo!.id).toBe(logos[0].assetId);
    expect(pb.board!.images!.logo!.id).toBe(logos[1].assetId);
    expect(Object.keys(pa.board!.images!)).toEqual(expect.arrayContaining(["hero", "logo", "look", "site"]));
    expect(Object.keys(pa.board!.images!).filter((k) => ["object", "signs", "posts"].includes(k))).toEqual([]);
    expect(Object.keys(pc.board!.images!).filter((k) => ["logo", "site", "mark", "markDark"].includes(k))).toEqual([]);
    expect(J.journeyOf(t.cid).identities!.incompletes).toEqual([{ key: "C", manque: ["logo", "site"] }]);
    expect(J.journeyOf(t.cid).identities!.issues.join("\n")).toMatch(/Identité C « .+ » : je ne te montre pas cette planche, il lui manque le logo et le haut du site\. Je ne montre jamais une planche à trou/);
    expect(J.journeyOf(t.cid).identities!.issues.join("\n")).not.toMatch(/nom dessiné/);
    const count = () => Object.fromEntries(all<{ s: string; n: number }>("SELECT status s, COUNT(*) n FROM assets WHERE project_id=? AND role='brand-board' GROUP BY status", t.pid).map((r) => [r.s, r.n]));
    // Les deux logos finis et 5 images gardées (2 + 2 + 1), avec les versions claires d'un logo sur fond sombre ; rien de refusé.
    expect(count().ready).toBeGreaterThanOrEqual(7);
    expect(count().rejected).toBeUndefined();
    // Reprise de la tâche : aucun appel n'est refait ni repayé, et les images des planches restent les mêmes.
    const shownBefore = JSON.stringify(J.journeyOf(t.cid).identities!.list.map((x) => [x.board!.images!.logo, x.board!.images!.hero]));
    expect((await chain(t, {}, {}, reload(first.job))).log.ids).toEqual([]);
    expect(JSON.stringify(J.journeyOf(t.cid).identities!.list.map((x) => [x.board!.images!.logo, x.board!.images!.hero]))).toBe(shownBefore);

    // Toutes les images des planches déjà écrites : la grande scène relue, puis les autres dans l'ordre, et leur relecture.
    const { log, out, job } = await chain(t, { imagesOnly: true }, script);
    const sansSite = (k: string, sl: string) => !(k === "C" && sl === "site");
    expect(log.ids.filter((i) => !/:r\d$/.test(i))).toEqual(["A", "B", "C"].flatMap((k) => [`image-1-${k}-hero`, `imagecheck-1-${k}:hero`, ...SLOTS.filter((sl) => sl !== "hero" && sansSite(k, sl)).map((sl) => `image-1-${k}-${sl}`), ...REVIEW_ORDER.filter((sl) => sl !== "logo" && sl !== "hero" && sansSite(k, sl)).map((sl) => `imagecheck-1-${k}:${sl}`)]));
    const refs = (log as any).refs;
    expect(refs["image-1-A-hero"]).toEqual({ logo: false, scene: false, aspect: "16:9" });
    expect(refs["image-1-A-object"]).toEqual({ logo: true, scene: false, aspect: "1:1" }); // le logo est posé sur l'objet
    expect(refs["image-1-A-site"]).toEqual({ logo: true, scene: true, aspect: "9:16" });
    expect(refs["image-1-B-site"]).toEqual({ logo: true, scene: true, aspect: "9:16" });
    expect(refs["image-1-C-object"]).toEqual({ logo: false, scene: false, aspect: "1:1" }); // sans logo : le nom seul, jamais un logo inventé
    const a = J.journeyOf(t.cid).identities!.list[0];
    const I0 = await import("@/lib/syna-agent/brand-images");
    expect(a.board!.site.menu.length).toBeGreaterThan(0);
    expect(I0.slotTexts(a as any).site).toEqual([a.name, a.board!.site.headline, a.board!.site.button]);
    expect(log.prompts["image-1-A-site"]).toContain(`Textes à écrire dans l'image, lettre pour lettre, accents et ponctuation compris : ${[a.board!.site.headline, a.board!.site.button].map((w) => `« ${w} »`).join(" ; ")}. Aucun autre texte`);
    expect(log.prompts["image-1-A-site"]).not.toContain(a.board!.site.text);
    expect(log.prompts["image-1-A-site"]).toContain(`elles ne portent QUE ces mots, écrits tels quels : ${a.board!.site.menu.map((m) => `« ${m} »`).join(", ")}.`);
    expect(log.prompts["image-1-A-site"]).toMatch(/UN téléphone récent, entier, vu bien de face, posé sur un fond uni très doux, avec une ombre légère/);
    expect(log.prompts["image-1-A-site"]).toMatch(/Le titre est TRÈS grand et occupe une vraie place sur l'écran ; un seul bouton ; très peu de mots\./);
    expect(log.prompts["image-1-A-site"]).toMatch(/Rien autour du téléphone : ni main, ni table, ni décor\./);
    expect(log.prompts["imagecheck-1-A:site"]).toContain(`slot "site" : la maquette du haut de la page d'accueil, dans un téléphone entier vu de face : elle doit être BELLE et donner envie`);
    expect(log.ids.some((i) => i.startsWith("imagereread"))).toBe(false);
    expect(log.prompts["image-1-A-post1"]).toContain(`« ${a.board!.posts[1].text} »`);
    expect(log.prompts["image-1-A-hero"]).toMatch(/Aucun texte, aucune lettre/);
    for (const sl of SLOTS) expect(log.prompts[`image-1-A-${sl}`]).toMatch(/[Aa]ucune personne/);
    expect(log.prompts["image-1-A-hero"]).toMatch(/^Direction artistique : Lumière de fin d'après-midi/);
    expect(log.prompts["imagecheck-1-A:object"]).toContain(`slot "object"`);
    expect(log.prompts["imagecheck-1-A:post0"]).toContain(a.board!.posts[0].text);
    // A : tout est gardé. B : l'image de l'objet est refusée. C : toujours sans logo.
    const [ra, rb, rc] = J.journeyOf(t.cid).identities!.list;
    expect(Object.keys(ra.board!.images!)).toEqual(expect.arrayContaining(["hero", "logo", "look", "object", "posts", "signs", "site"]));
    expect(ra.board!.images!.logo!.id).toBe(logos[0].assetId); // jamais redessiné
    expect(ra.board!.images!.posts!.every(Boolean)).toBe(true);
    expect(rb.board!.images!.object).toBeUndefined();
    expect(rb.board!.images!.hero).toBeTruthy();
    expect(rc.board!.images!.logo).toBeUndefined();
    const issues = J.journeyOf(t.cid).identities!.issues.join("\n");
    expect(issues).toContain("Identité B : je n'ai pas gardé l'image de l'objet (elle n'est pas au niveau) ; je ne la montre pas.");
    expect(issues).not.toContain("Le titre est mal écrit");
    expect(issues).toMatch(/Identité C « .+ » : je ne te montre pas cette planche, il lui manque le logo et le haut du site\./);
    expect(J.journeyOf(t.cid).identities!.incompletes).toEqual([{ key: "C", manque: ["logo", "site"] }]);
    expect((out as any).routes).toHaveLength(3);
    // L'image refusée y est marquée refusée avec sa raison, reprise deux fois avant d'être dite.
    expect(count().rejected).toBe(3);
    const I = await import("@/lib/syna-agent/brand-images");
    expect(log.prompts["image-1-A-signs"]).toContain(I.SIGNS_LINE);
    expect(log.prompts["image-1-A-signs"]).toMatch(/Aucun autre texte que le logo/);
    expect(refs["image-1-A-signs"]).toEqual({ logo: true, scene: false, aspect: "1:1" });
    expect(first.log.systems[`imagery-1-A${FIRST}`]).toMatch(/- signs : LES SIGNES de la marque[\s\S]*Jamais une icône plate, jamais un pictogramme/);
    expect(one<{ w: string }>("SELECT json_extract(meta,'$.synaBoard.review.why') w FROM assets WHERE project_id=? AND status='rejected' AND name LIKE '%-B-object%'", t.pid)?.w).toBe("Le titre est mal écrit.");
    const { threadView } = await import("@/lib/syna-agent/loop");
    const shown = (await fr(() => threadView(t.user, t.cid))).journey.identities!.list as any[];
    expect(shown[0].board.images.hero.url).toMatch(/^\/api\/files\/[\w-]+$/);
    expect(shown[1].board.images.object).toBeUndefined();
    for (const x of shown) expect(x.board.images.site.url).toMatch(/^\/api\/files\/[\w-]+$/);
    const again = await chain(t, {}, {}, reload(job));
    expect(again.log.ids).toEqual([]);
  });

  it("un nom bâti sur un nom déjà montré n'est pas un autre nom (essai réel : « Pulpe Vive » après « Pulpe »)", async () => {
    const C2 = await import("@/lib/syna-agent/brand-chain");
    expect(C2.builtOnShown("Pulpe Vive", ["Pulpe"])).toBe(true);
    expect(C2.builtOnShown("pulpe", ["Pulpe"])).toBe(true);
    expect(C2.builtOnShown("La Pulpe d'Été", ["Pulpe"])).toBe(true);
    expect(C2.builtOnShown("Plein les Yeux d'Or", ["Plein les Yeux"])).toBe(true);
    // Un mot qui en contient un autre n'est pas ce mot ; un nom plus court non plus.
    expect(C2.builtOnShown("Pulpeuse", ["Pulpe"])).toBe(false);
    expect(C2.builtOnShown("Zeste", ["Pulpe", "Tranche"])).toBe(false);
    expect(C2.builtOnShown("Plein", ["Plein les Yeux"])).toBe(false);
    expect(C2.builtOnShown("Zeste", [])).toBe(false);
    // Dans la réserve : la variante n'arrive jamais devant le juge.
    const name = (n: string) => ({ name: n, detail: "Le fruit visible dans le sachet.", second: "Une deuxième lecture.", why: "Il dit la matière." });
    const pool = C2.namePool([{ team: "mots", names: [name("Pulpe Vive"), name("Zeste"), name("Gorgée")] as any }], { shown: ["Pulpe"] });
    expect(pool.map((n) => n.name)).toEqual(["Zeste", "Gorgée"]);
  });

  const texts: Record<string, string[]> = {};
  it("relecture des images : le Studio compare lui-même la lecture au texte attendu (essai réel du 13 novembre : « dedans » lu sans faute puis refusé)", async () => {
    const I = await import("@/lib/syna-agent/brand-images");
    // La comparaison, sans IA : casse, espaces, apostrophes et point final ne comptent pas ; lettres et accents, si.
    expect(I.textCheck(["Ça a le goût de mordre dedans."], ["Ça a le goût de mordre dedans."], "Pulpe")).toEqual({ missing: [], extra: [] });
    expect(I.textCheck(["L'hibiscus et la fraise rougissent l'eau jusqu'au fond."], ["L’hibiscus et la fraise\nrougissent l’eau jusqu’au fond"], "Pulpe")).toEqual({ missing: [], extra: [] });
    expect(I.textCheck(["Pulpe", "Pêche-verveine"], ["PULPE", "Pêche-verveine", "250 g"], "Pulpe")).toEqual({ missing: [], extra: ["250 g"] });
    expect(I.textCheck(["Pêche-verveine"], ["Peche-verveine"], "Pulpe")).toEqual({ missing: ["Pêche-verveine"], extra: ["Peche-verveine"] });
    expect(I.textCheck(["Goûter les six recettes"], ["PULPE Goûter les six recettes"], "Pulpe")).toEqual({ missing: [], extra: [] }); // un bloc lu d'un trait
    expect(I.textCheck([], [], "Pulpe")).toEqual({ missing: [], extra: [] });
    // Un titre dessiné sur deux lignes et recopié ligne par ligne est bien le titre attendu (essai réel du 16 novembre 2026).
    expect(I.textCheck(["Atelier Vasco", "Cousu ici. Recousu ici.", "Voir le cuir de près"], ["9:41", "Atelier Vasco", "Cousu ici.", "Recousu ici.", "Voir le cuir de près"], "Atelier Vasco").missing).toEqual([]);
    expect(I.textCheck(["Cousu ici. Recousu ici."], ["Cousu ici.", "Recousu la."], "Atelier Vasco").missing).toEqual(["Cousu ici. Recousu ici."]);
    // Une date à remplir, faite de tirets : le nombre de tirets et les espaces ne comptent pas ; un texte dessiné sur
    // deux lignes n'est pas « en trop » (essai réel du 16 novembre 2026 : une publication juste, refusée à tort).
    expect(I.textCheck(["__ / __ / ____ : à vous de l'écrire."], ["___ / ___ / _____ :", "à vous de l'écrire."], "Atelier Vasco")).toEqual({ missing: [], extra: [] });
    expect(I.textCheck(["Ce jour-là :", "__ / __ / ____"], ["Ce jour-là :", "____/____/______", "Bordeaux"], "Atelier Vasco")).toEqual({ missing: [], extra: ["Bordeaux"] });
    expect(I.textCheck(["__ / __ / ____"], ["Ce jour-là"], "Atelier Vasco").missing).toEqual(["__ / __ / ____"]);
    expect(I.textCheck([], ["Offre spéciale"], "Pulpe").extra).toEqual(["Offre spéciale"]);

    const t = await thread();
    const expected = (prompt: string, slot: string) => [...(new RegExp(`slot "${slot}" : [^\\n]*Textes attendus : ([^\\n]*)`).exec(prompt)?.[1] ?? "").matchAll(/« (.+?) »/g)].map((m) => m[1]);
    // Les planches sont écrites, puis toutes leurs images sont créées (les publications portent du texte à relire).
    await chain(t, {}, { review: () => ({ routes: [], series: "" }) });
    const { log } = await chain(t, { imagesOnly: true }, {
      look: (id, c) => {
        // Seconde lecture (seulement recopier) : post0 est exact ; post2 porte toujours son texte en trop.
        if (id.startsWith("imagereread")) return { images: c.images.map((i: any) => ({ slot: i.label, read: i.label === "post2" ? [...texts[i.label], "250 g"] : texts[i.label] })) };
        if (!/-A(:\w+)?$/.test(id)) return { images: c.images.map((i: any) => ({ slot: i.label, ok: true, read: expected(c.prompt, i.label), why: "" })) };
        for (const i of c.images) texts[i.label] = expected(c.prompt, i.label);
        return { images: c.images.map((i: any) => {
          const read = texts[i.label];
          // Le cas réel : le texte est recopié sans une faute, et pourtant refusé « mal écrit ».
          if (i.label === "post0") return { slot: "post0", ok: false, defect: "texte", read, why: "Le mot « dedans » est mal écrit." };
          // Accepté alors que la lecture montre un texte que personne n'a demandé.
          if (i.label === "post2") return { slot: "post2", ok: true, read: [...read, "250 g"], why: "" };
          // Un défaut qui n'est pas de texte ne se discute pas, même si le texte est exact.
          if (i.label === "object") return { slot: "object", ok: false, defect: "personne", read, why: "Une main apparaît." };
          // Refus sans nature précisée : le côté sûr, l'image reste refusée.
          if (i.label === "post1") return { slot: "post1", ok: false, read, why: "Elle ne va pas." };
          return { slot: i.label, ok: true, read, why: "" };
        }) };
      },
    });
    // Une seule seconde lecture, pour les deux images dont le jugement contredit la lecture (pas pour la main).
    // Une image à la fois : une seconde lecture par image en doute.
    expect(log.ids.filter((x) => x.startsWith("imagereread"))).toEqual(["imagereread-1-A:post0", "imagereread-1-A:post2"]);
    expect(log.prompts["imagereread-1-A:post0"]).toMatch(/Voici 1 image\(s\), dans l'ordre\.\nImage 1 — slot "post0"\./);
    expect(log.prompts["imagereread-1-A:post2"]).toMatch(/Voici 1 image\(s\), dans l'ordre\.\nImage 1 — slot "post2"\./);
    expect(log.systems["imagereread-1-A:post0"]).toMatch(/Tu ne juges rien et tu ne corriges rien/);
    const a = J.journeyOf(t.cid).identities!.list[0];
    expect(a.board!.images!.posts![0]).toBeTruthy(); // gardée : sa lecture était exacte, deux fois
    // Les trois images refusées sont REFAITES avant d'être montrées (règle du propriétaire du 16 novembre 2026 : « on ne
    // peut pas donner une identité de marque incomplète »), avec la raison du refus donnée au modèle d'images.
    expect(log.ids.filter((x) => /^image-1-A-.*:r1$/.test(x))).toEqual(["image-1-A-object:r1", "image-1-A-post1:r1", "image-1-A-post2:r1"]);
    expect(log.prompts["image-1-A-object:r1"]).toMatch(/CORRECTION : une première image a été refusée pour cette raison : « Une main apparaît\. »\. Refais l'image en corrigeant ce point\.$/);
    expect(log.prompts["image-1-A-post2:r1"]).toMatch(/refusée pour cette raison : « un texte non demandé y apparaît : « 250 g » »/);
    expect(log.ids).toContain("imagecheck-1-A:r1:object");
    expect(log.ids.some((x) => x.endsWith(":r2"))).toBe(false); // la première reprise a suffi
    expect(a.board!.images!.posts![1]).toBeTruthy();
    expect(a.board!.images!.posts![2]).toBeTruthy();
    expect(a.board!.images!.object).toBeTruthy();
    expect(a.board!.images!.hero).toBeTruthy();
    const issues = J.journeyOf(t.cid).identities!.issues.filter((x) => x.startsWith("Identité A")).join("\n");
    expect(issues).not.toMatch(/je n'ai pas gardé/);
    expect(issues).not.toMatch(/mon dessin|forme simple de la planche/);
    // La consigne du relecteur : recopier sans corriger, nommer la nature du défaut, relire sa lecture avant de refuser.
    expect(log.systems[Object.keys(log.systems).find((k) => k.startsWith("imagecheck-1-A"))!]).toMatch(/recopiés lettre par lettre tels qu'ils sont dessinés, fautes comprises/);
    expect(log.systems[Object.keys(log.systems).find((k) => k.startsWith("imagecheck-1-A"))!]).toMatch(/si tu as recopié le texte attendu sans faute, il n'y a pas de faute/);
  });

  it("nouvelle proposition sans les mots du client : l'étude, les idées, les noms et les verdicts du juge de moins d'un mois resservent (audit, partie 3)", async () => {
    const t = await thread();
    const garde = ["Bain de Minuit", "Lâche le Morceau", "L'Eau Est Bonne", "Nage Libre", "La Main Lourde", "Grand Bain", "Plongeon", "Marée Haute", "Patience"];
    const judge = (_id: string, names: string[]) => ({ kept: names.filter((n) => garde.includes(n)).map((name) => ({ name, seen: "Une image nette.", why: "On le porterait avec fierté." })), almost: [] });
    await chain(t, {}, { judge, review: () => ({ routes: [], series: "" }) });
    const { log } = await chain(t, {}, { judge, shortlist: () => [pick("A", "Plongeon"), pick("B", "Marée Haute"), pick("C", "Grand Bain"), pick("A", "Patience", true)], review: () => ({ routes: [], series: "" }) });
    expect(J.journeyOf(t.cid).identities!.list.map((x) => x.name)).toEqual(["Plongeon", "Marée Haute", "Grand Bain"]);
    expect(log.ids.filter((i) => /^(web:(paroles|concurrents|usages)|study|strategy|team-|judge)/.test(i))).toEqual([]);
    const shown = J.journeyOf(t.cid).identities!.shownNames ?? [];
    expect(shown.length).toBeGreaterThan(3);
    const { atelierDuMois } = await import("@/lib/syna-agent/tools/identity");
    expect(atelierDuMois(J.journeyOf(t.cid))).toBe(true);
  });

  it("images seules sur des planches déjà écrites : les textes ne bougent pas ; une image en échec n'est pas relancée", async () => {
    const t = await thread();
    await chain(t, {}, { review: () => ({ routes: [], series: "" }) });
    const before = J.journeyOf(t.cid).identities!.list;
    expect(before.every((x) => !x.board!.images)).toBe(true); // planches écrites sans leurs images (`images: false`)
    // Le logo fini de B (méthode des graphistes), posé tel quel : il est sur ce qui le porte, jamais redessiné.
    const [fini] = await logosFinis(t, 1);
    const posee = await C.poserLeLogoFini(before[1] as never, fini.assetId);
    J.updateJourney(t.cid, (x) => { x.identities!.list[1] = posee as never; });
    let tries = 0;
    const { log } = await chain(t, { imagesOnly: true, redo: ["B"] }, { draw: async (id) => { if (id.endsWith("-post1")) { tries++; throw new Error("503 du fournisseur"); } return id.endsWith("-logo") ? whiteLogo("#CC3366", 120, 180) : square("#CC3366", 120, 180); } });
    // Aucun logo n'est dessiné ; la grande scène est relue avant la maquette qui la reprend (audit du 22 novembre 2026, 2.11).
    expect(log.ids).toEqual(["imagery-1-B", "image-1-B-hero", "imagecheck-1-B:hero", ...SLOTS.filter((sl) => sl !== "hero").map((sl) => `image-1-B-${sl}`), ...REVIEW_ORDER.filter((sl) => sl !== "post1" && sl !== "logo" && sl !== "hero").map((sl) => `imagecheck-1-B:${sl}`)]);
    expect(tries).toBe(1);
    const after = J.journeyOf(t.cid).identities!.list;
    expect(after[0]).toEqual(before[0]);
    expect(after[2]).toEqual(before[2]);
    const { images, ...restBoard } = after[1].board!;
    expect({ ...after[1], board: restBoard }).toEqual(before[1]);
    expect(images!.posts).toEqual([expect.objectContaining({ w: 120, h: 180 }), null, expect.objectContaining({ w: 120, h: 180 })]);
    // Le message dit vrai : l'image manquante n'est pas montrée (jamais un dessin à sa place).
    expect(J.journeyOf(t.cid).identities!.issues.join("\n")).toContain("Identité B : je n'ai pas pu créer la deuxième publication ; je ne la montre pas.");
  });

  it("relecture impossible : des images non relues ne sont jamais montrées ; un mélange retire les images qui ne sont plus vraies", async () => {
    const { mixIdentity } = await import("@/lib/syna-agent/tools/identity");
    const t = await thread();
    await chain(t, { images: true, logosGraphistes: await logosFinis(t, 3) }, { review: () => ({ routes: [], series: "" }), look: (id) => { if (id.includes("-A:")) throw new Error("modèle indisponible"); return { images: SLOTS.map((slot) => ({ slot, ok: true, read: [id.includes("-B:") ? "Lâche le Morceau" : "L'Eau Est Bonne"], why: "" })) }; } });
    const list = J.journeyOf(t.cid).identities!.list;
    // Le logo fini (méthode des graphistes) reste posé ; aucune image non relue n'est gardée.
    expect(Object.keys(list[0].board!.images ?? {}).filter((k) => ["hero", "site", "object", "signs", "posts"].includes(k))).toEqual([]);
    // Jamais une planche incomplète (essai réel de Nadia, 23 novembre 2026) : A, sans images relues, est gardée de côté.
    expect(J.journeyOf(t.cid).identities!.issues.join("\n")).toMatch(/Identité A « .+ » : je ne te montre pas cette planche, il lui manque la grande scène et le haut du site \(je n'ai pas pu relire ses images, donc je ne te les montre pas\)/);
    expect(J.journeyOf(t.cid).identities!.incompletes!.map((x) => x.key)).toContain("A");
    expect(list[1].board!.images!.logo).toBeTruthy();
    // Identité prise telle quelle : ses images restent. Couleurs d'une autre : toutes partent, sauf le logo (méthode des
    // graphistes : il ne se redessine jamais). Nom d'une autre ou nom retouché : toutes sauf la grande scène, qui n'a aucun
    // texte, et le logo. Signature retouchée : rien ne part, aucune image ne la porte (22 novembre 2026, audit de la marque).
    const avecLogo = (o: Record<string, unknown>) => Object.keys(o).filter((k) => !["logo", "mark", "markDark"].includes(k)).sort();
    expect(mixIdentity(list, "B").board!.images).toBeTruthy();
    expect(avecLogo(mixIdentity(list, "B", { name: "C" }).board!.images ?? {})).toEqual(list[1].board!.images!.hero ? ["hero"] : []);
    expect(mixIdentity(list, "B", { name: "C" }).board!.images!.logo).toEqual(list[1].board!.images!.logo);
    expect(avecLogo(mixIdentity(list, "B", { palette: "C" }).board!.images ?? {})).toEqual([]);
    expect(mixIdentity(list, "B", { palette: "C" }).board!.images!.logo).toEqual(list[1].board!.images!.logo);
    // Le logo pris à une autre identité : le sien, tel quel.
    expect(mixIdentity(list, "B", { logo: "C" }).board!.images!.logo).toEqual(list[2].board!.images!.logo);
    expect(avecLogo(mixIdentity(list, "B", {}, { name: "Autre Nom" }).board!.images ?? {})).toEqual(list[1].board!.images!.hero ? ["hero"] : []);
    expect(mixIdentity(list, "B", {}, { slogan: "Une autre signature" }).board!.images).toEqual(list[1].board!.images);
    expect(mixIdentity(list, "B", { tone: "C" }).board!.images).toBeTruthy();
  });

  it("la phrase du ton de la signature reste entière (essai réel du 14 novembre 2026 : coupée à 80 signes au milieu d'une phrase)", async () => {
    const { IdentitySchema } = await import("@/lib/syna-agent/identities");
    const tone = "Franc et protecteur : la marque prend le parti des animaux que les salons classiques ne savent pas accueillir.";
    expect(tone.length).toBeGreaterThan(80);
    expect(IdentitySchema.shape.sloganTone.parse(tone)).toBe(tone);
  });

  it("création de marque coupée en route puis relancée (reprise d'Aplomb, 21 novembre 2026) : la même tâche repart, rien de ce qui est fait n'est refait ni repayé", async () => {
    const t = await thread();
    const T = await import("@/lib/syna-agent/tools/identity");
    const first = jobCtx(t.user, t.pid, { projectId: t.pid, conversationId: t.cid, capMicro: 9_000_000, count: 3, images: false });
    // Coupure du serveur au moment de composer les identités : l'étude, l'idée, les noms et leur tri sont déjà faits.
    await expect(chain(t, {}, { shortlist: () => { throw new Error("Interrompue : coupure du serveur"); } }, first)).rejects.toThrow(/Interrompue/);
    run("UPDATE jobs SET status='failed', error='Interrompue : coupure du serveur', finished_at=? WHERE id=?", Date.now(), first.job.id);
    const c = T.marqueCoupee(t.pid)!;
    expect(c.id).toBe(first.job.id);
    expect(T.marqueOuArretee(c.etapes)).toBe("déjà fait et gardé : l'étude de ton marché, l'idée de ta marque, les pistes de noms, le tri des noms");
    // Le prix de la reprise : seulement ce qui reste à faire (23 novembre 2026), avec son prix probable.
    const reste = T.relanceMarqueQuote(c);
    expect(reste.maxMicro).toBe(C.chainQuote({ routes: 3, images: false, done: c.etapes }).maxMicro);
    expect(reste.maxMicro).toBeLessThan(C.chainQuote({ routes: 3, images: false }).maxMicro);
    expect(reste.probableMicro).toBeGreaterThan(0);
    // SINA relance : la MÊME tâche repart, avec la relance comptée (un appel coupé en plein milieu se renvoie une fois).
    const r = await call("identity.propose", ctxOf(t.user, t.cid), { relancer: true });
    expect(r).toMatchObject({ ok: true, jobs: [first.job.id] });
    expect(r.summary).toMatch(/repris sans être repayé/);
    const again = one<{ status: string; payload: string }>("SELECT status, payload FROM jobs WHERE id=?", first.job.id)!;
    expect(again.status).toBe("queued");
    expect(JSON.parse(again.payload)).toMatchObject({ relance: 1, conversationId: t.cid });
    const { log } = await chain(t, {}, {}, reload(first));
    // Rien de ce qui était fait n'est redemandé : ni la recherche, ni l'étude, ni l'idée, ni les équipes, ni le tri.
    for (const done of ["web:paroles", "study", "strategy", "team-langue", "team-mots", "team-univers", "team-verite", "judge-1"]) expect(log.ids, done).not.toContain(done);
    expect(log.ids[0]).toBe("shortlist");
    expect(J.journeyOf(t.cid).identities?.list.length).toBe(3);
    // Plus rien à relancer une fois la création finie.
    run("UPDATE jobs SET status='done', finished_at=? WHERE id=?", Date.now(), first.job.id);
    expect(T.marqueCoupee(t.pid)).toBeNull();
    expect(await call("identity.propose", ctxOf(t.user, t.cid), { relancer: true })).toMatchObject({ ok: false, internal: true });
    // SINA le sait quand la tâche s'arrête, et la fin de marque se relance de la même façon.
    expect((await import("node:fs")).readFileSync("src/lib/syna-agent/loop.ts", "utf8")).toContain("avec relancer:true (une carte affiche le prix de ce qui reste). Ne dis jamais que la reprise est impossible.");
    expect(getTool("brand.finish")!.args.safeParse({ relancer: true }).success).toBe(true);
    expect(getTool("identity.propose")!.description).toMatch(/relancer:true quand la création de sa marque s'est arrêtée en route/);
  });

  it("photo en partie transparente (panne du 21 novembre 2026) : refusée sans relecture payée, puis refaite et relue", async () => {
    const t = await thread();
    await chain(t, { images: true }, { review: () => ({ routes: [], series: "" }) });
    const brume = () => { const w = 96, h = 96, d = Buffer.alloc(w * h * 4); for (let i = 0; i < w * h; i++) { d[i * 4] = 40; d[i * 4 + 1] = 80; d[i * 4 + 2] = 120; d[i * 4 + 3] = i < (w * h) / 3 ? 90 : 255; } return sharpLib(d, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer(); };
    let n = 0;
    const { log } = await chain(t, { imagesOnly: true, redo: ["A"], slots: ["hero"] }, { draw: async (id) => (id.includes("-hero") && n++ === 0 ? brume() : square("#224466", 128, 128)) });
    // Aucune relecture n'est payée pour la photo transparente : elle est refaite, et seule la nouvelle est relue.
    // La direction artistique de la proposition ressert (audit du 22 novembre 2026, 2.3).
    expect(log.ids).toEqual(["image-1-A-hero:hero", "image-1-A-hero:hero:r1", "imagecheck-1-A:hero:r1"]);
    expect(log.prompts["image-1-A-hero:hero:r1"]).toMatch(/une partie de l'image est transparente/);
    const hero = J.journeyOf(t.cid).identities!.list[0].board!.images!.hero!;
    expect(one<{ status: string }>("SELECT status FROM assets WHERE id=?", hero.id)!.status).toBe("ready");
  });

  it("refaire seulement l'objet ou la maquette : les autres images gardées restent, le logo n'est jamais redessiné, le devis ne compte que ces images", async () => {
    const t = await thread();
    // La proposition (la grande scène et le haut du site, avec le logo fini posé), puis toutes les images de la planche A.
    await chain(t, { images: true, logosGraphistes: await logosFinis(t, 3) }, { review: () => ({ routes: [], series: "" }) });
    expect(J.journeyOf(t.cid).identities!.list[0].board!.images!.object).toBeUndefined();
    await chain(t, { imagesOnly: true, redo: ["A"] });
    const before = J.journeyOf(t.cid).identities!.list[0].board!.images!;
    expect(before.object).toBeTruthy();
    // Refaire seulement l'objet : il porte le logo gardé, et ce logo est joint à la relecture pour comparer (essai
    // réel : le fourgon de « Pelage » portait le bon signe mais le nom dans une autre police).
    const third = await chain(t, { imagesOnly: true, redo: ["A"], slots: ["object"] }, { draw: async () => square("#224466", 128, 128) });
    expect(third.log.ids.filter((id) => id.startsWith("image-"))).toEqual(["image-1-A-object:object"]);
    expect((third.log as any).refs["image-1-A-object:object"].logo).toBe(true);
    expect(third.log.prompts["imagecheck-1-A:object"]).toMatch(/La dernière image jointe \(2\) est seulement le logo de la marque, pour comparer : ne la juge pas\./);
    expect(third.log.prompts["imagecheck-1-A:object"]).toMatch(/EXACTEMENT celui de l'image « logo »/);
    const P2 = await import("@/lib/syna-agent/brand-prompts");
    expect(P2.imageReviewSystem()).toMatch(/même signe, même dessin de lettres, même graisse, mêmes couleurs/);
    const after = J.journeyOf(t.cid).identities!.list[0].board!.images!;
    expect(after.logo).toEqual(before.logo);
    expect(after.object!.id).not.toBe(before.object!.id);
    expect(after.hero).toEqual(before.hero);
    expect(after.posts).toEqual(before.posts);
    // Refaire seulement la maquette du site : elle reçoit le logo et la grande scène GARDÉS de la planche, en portrait ;
    // le logo, la scène et l'objet ne bougent pas.
    const held = J.journeyOf(t.cid).identities!.list[0].board!.images!;
    const fourth = await chain(t, { imagesOnly: true, redo: ["A"], slots: ["site"] }, { draw: async () => square("#883311", 128, 128) });
    expect(fourth.log.ids).toEqual(["image-1-A-site:site", "imagecheck-1-A:site"]);
    expect((fourth.log as any).refs["image-1-A-site:site"]).toEqual({ logo: true, scene: true, aspect: "9:16" });
    expect(fourth.log.prompts["imagecheck-1-A:site"]).toMatch(/La dernière image jointe \(2\) est seulement le logo de la marque, pour comparer : ne la juge pas\./);
    const moved = J.journeyOf(t.cid).identities!.list[0].board!.images!;
    expect(moved.site!.id).not.toBe(held.site!.id);
    expect({ ...moved, site: undefined, markDark: undefined }).toEqual({ ...held, site: undefined, markDark: undefined });
    // Le devis : le logo n'y est jamais compté (il ne se dessine pas ici).
    const one1 = C.boardImagesQuote(1, undefined, ["object"]), all6 = C.boardImagesQuote(1);
    expect(one1.maxMicro).toBeLessThan(all6.maxMicro);
    expect(one1.maxMicro).toBeGreaterThan(0);
    expect(C.boardImagesQuote(1, undefined, ["logo"]).maxMicro).toBe(0);
  });

  it("devis : les images s'ajoutent au prix annoncé seulement quand elles sont prévues", () => {
    const without = C.chainQuote({ routes: 3, images: false }), withImages = C.chainQuote({ routes: 3, images: true });
    expect(withImages.maxMicro).toBeGreaterThan(without.maxMicro);
    // Les images sont toujours prévues (plus de réglage) : à la proposition, le logo, la grande scène et la maquette du site.
    expect(C.chainQuote({ routes: 3 }).maxMicro).toBe(withImages.maxMicro);
    const firstStep = C.boardImagesQuote(3, undefined, ["logo", "hero", "site"]);
    expect(withImages.maxMicro - without.maxMicro).toBe(firstStep.maxMicro);
    expect(firstStep.maxMicro).toBeGreaterThan(C.boardImagesQuote(3, undefined, ["logo", "hero"]).maxMicro); // la maquette est comptée
    expect(withImages.maxMicro - without.maxMicro).toBeGreaterThanOrEqual(firstStep.maxMicro);
    expect(withImages.maxMicro - without.maxMicro).toBeLessThan(C.boardImagesQuote(3).maxMicro);
    expect(firstStep.maxMicro).toBeLessThan(C.boardImagesQuote(3).maxMicro);
    // La fin de marque : l'objet, les signes et les trois publications d'UNE identité ; un seul logo coûte moins.
    // S'y ajoute le symbole seul, tiré du logo : UNE image carrée avec une référence (le logo), au tarif du modèle imposé
    // des logos (le symbole est un dessin du logo : usage « logo », 23 novembre 2026).
    const images = C.boardImagesQuote(1, undefined, ["object", "signs", "post0", "post1", "post2"]);
    const symbol = photoRequestMaxMicro(LOGO_ROUTE, { prompt: "x".repeat(6000), references: 1, aspect: "1:1", quality: "high" });
    expect(symbol).toBeGreaterThan(0);
    expect(C.finishQuote()).toMatchObject({ maxMicro: images.maxMicro + symbol, probableMicro: Math.ceil(images.probableMicro! + symbol / 1.25) });
    // Deux plafonds (23 novembre 2026) : ce qui se reprend (chaque image et sa relecture, le symbole) pour la borne du Studio.
    expect(C.finishQuote().repriseMicro).toBe(images.repriseMicro! + symbol);
    // Le symbole coûte ce que coûte l'objet qui porte le logo (même format, même référence) : rien de plus n'est compté.
    // (la relecture se fait image par image : la différence entre les deux devis compte aussi la relecture de l'objet)
    expect(symbol).toBeLessThan(C.boardImagesQuote(1, undefined, ["object", "signs"]).maxMicro - C.boardImagesQuote(1, undefined, ["signs"]).maxMicro);
    // Il est compté une fois, quelles que soient les images demandées.
    for (const slots of [["post1"], ["logo", "object", "signs"], ["site"]] as const) expect(C.finishQuote(slots).maxMicro).toBe(C.boardImagesQuote(1, undefined, slots).maxMicro + symbol);
    expect(C.finishQuote(["logo", "object", "signs"]).maxMicro).toBeLessThan(C.finishQuote().maxMicro);
    expect(C.finishQuote().probableMicro!).toBeLessThan(C.finishQuote().maxMicro);
    const alone = C.boardImagesQuote(1), three = C.boardImagesQuote(3);
    expect(three.maxMicro).toBeGreaterThan(alone.maxMicro * 2.9);
    expect(alone.probableMicro!).toBeLessThan(alone.maxMicro);
    // Aperçu des noms seuls : bien moins cher qu'une série de planches.
    const names = C.namesPreviewQuote();
    expect(names.maxMicro).toBeGreaterThan(0);
    expect(names.maxMicro).toBeLessThan(without.maxMicro / 2);
  });

  // ---------------------------------------------------------------- le juge des noms

  const SEEN = { seen: "On voit une scène.", why: "On le porterait avec fierté." };
  /** Juge simulé : il garde les noms de `keep` qu'il reçoit, et signale les « presque » de `near`. */
  const judging = (keep: string[], near: Record<string, string> = {}) => (_id: string, names: string[]) => ({ kept: names.filter((n) => keep.includes(n)).map((name) => ({ name, ...SEEN })), almost: names.filter((n) => n in near).map((name) => ({ name, why: near[name] })) });

  it("juge des noms : il lit tous les noms avant la composition ; les routes ne se font qu'avec les noms gardés", async () => {
    const t = await thread();
    const { log } = await chain(t, {}, { review: () => ({ routes: [], series: "" }), judge: judging(["Bain de Minuit", "Nage Libre", "L'Eau Est Bonne", "Grand Bain"]) });
    // Le juge passe après les équipes et AVANT la composition des routes ; pas de second tour (assez de noms gardés).
    expect(log.ids.slice(log.ids.indexOf("team-verite") + 1, log.ids.indexOf("web:verify-1"))).toEqual(["judge-1", "shortlist"]);
    expect(log.systems["judge-1"]).toMatch(/tu appellerais ta marque comme ça, toi/);
    // Le sous-entendu : il cherche aussi les sens négatifs du mot dans les expressions de tous les jours.
    expect(log.systems["judge-1"]).toMatch(/4\. Le sous-entendu : [\s\S]*\(sexuel, grivois, vulgaire, moqueur\) \? Cherche aussi les expressions courantes où ce mot prend un sens négatif ou moqueur \([^)]+\) : dis-le à voix haute dans trois phrases de tous les jours avant de répondre\. Au moindre doute, c'est NON/);
    // La mesure du propriétaire est écrite en règles générales : plus aucun nom tiré des projets d'essai dans la consigne.
    expect(log.systems["judge-1"]).toMatch(/Il refuse un nom qui « ne représente rien » ou qu'il trouve laid/);
    expect(log.systems["judge-1"]).toMatch(/UN MOT SIMPLE ET FORT, qui dit la matière même du produit ou le métier/);
    expect(log.systems["judge-1"]).toMatch(/tu ne gardes qu'un nom que le propriétaire du Studio noterait 8 sur 10 ou plus/);
    expect(log.systems["judge-1"]).toMatch(/un jeu de mots sur une expression, même bien trouvé, vaut 6 sur 10 : il est refusé, au mieux « presque »/);
    expect(log.systems["judge-1"]).not.toMatch(/Tintamarre|Morceaux Choisis|Gorgée|Fruit Nu|Pulpe|Zeste|Haut les Pêches|Tout Feu Tout Fruit|Cerise sur le Verre|Éclat de thé|Pelage|toilettage/);
    // Il reçoit tous les noms libres des équipes ; un nom déjà refusé par le propriétaire n'arrive même pas devant lui.
    expect(log.prompts["judge-1"]).toMatch(/# Noms trouvés par les équipes \(15\)/);
    expect(log.prompts["judge-1"]).toMatch(/^- Marée Haute \| détail réel/m);
    expect(log.prompts["judge-1"]).not.toMatch(/Morceaux Choisis|Thé 2000|La Mèche Courte/);
    // La composition ne reçoit que les noms gardés ; un nom hors de cette liste est écarté, une réserve prend sa place.
    expect(log.prompts.shortlist).toMatch(/# Noms gardés par le juge des noms \(4\) : les SEULS noms permis/);
    expect(log.prompts.shortlist).not.toMatch(/^- Lâche le Morceau \|/m);
    const ids = J.journeyOf(t.cid).identities!;
    expect(ids.list.map((x) => x.name)).toEqual(["Bain de Minuit", "L'Eau Est Bonne", "Nage Libre"]);
    expect(ids.issues.join("\n")).not.toMatch(/pas convaincue/);
  });

  it("trop peu de noms gardés : les équipes repartent chercher une fois, en sachant le niveau attendu", async () => {
    const t = await thread();
    const { log } = await chain(t, {}, {
      review: () => ({ routes: [], series: "" }),
      judge: judging(["Bain de Minuit", "Haut les Pêches", "Tout Feu Tout Fruit"], { "Nage Libre": "Il rate le nom seul de peu." }),
      team2: (id) => (id === "team-langue-2" ? ["Haut les Pêches", "Tintamarre", "Bain de Minuit", "Nage Libre", "Grand Bain"] : id === "team-mots-2" ? ["Tout Feu Tout Fruit", "Pulpe 3000", "Trempette", "Frisquet", "Plongeon"] : ["Vitrine", "Patience", "Sans Bulles", "À Tremper", "Marée Haute"]),
      shortlist: () => [pick("A", "Bain de Minuit"), pick("B", "Haut les Pêches"), pick("C", "Tout Feu Tout Fruit")],
    });
    expect(log.ids.slice(log.ids.indexOf("team-verite") + 1, log.ids.indexOf("web:verify-1"))).toEqual(["judge-1", "team-langue-2", "team-mots-2", "team-univers-2", "team-verite-2", "judge-1-2", "shortlist"]);
    expect(log.prompts["team-mots-2"]).toMatch(/# Second tour[\s\S]*Noms gardés par le juge \(le niveau à atteindre, à ne pas redonner\) : Bain de Minuit/);
    expect(log.prompts["team-mots-2"]).toMatch(/Presque gardés, avec ce qui leur manque :\n- Nage Libre : Il rate le nom seul de peu\./);
    // Second passage du juge : seulement les noms NEUFS et libres (ni déjà trouvés, ni refusés par le propriétaire, ni mal formés).
    expect(log.prompts["judge-1-2"]).toMatch(/# Noms trouvés par les équipes \(3\)/);
    expect(log.prompts["judge-1-2"]).toMatch(/- Haut les Pêches \|[\s\S]*- Tout Feu Tout Fruit \|[\s\S]*- Vitrine \|/);
    expect(log.prompts["judge-1-2"]).not.toMatch(/Tintamarre|Bain de Minuit|Pulpe 3000|Nage Libre|Patience/);
    const ids = J.journeyOf(t.cid).identities!;
    expect(ids.list.map((x) => x.name)).toEqual(["Bain de Minuit", "Haut les Pêches", "Tout Feu Tout Fruit"]);
    expect(ids.issues.join("\n")).not.toMatch(/pas convaincue/);
  });

  // ---------------------------------------------------------------- une équipe coupée ne fait pas tomber la marque (Nadia, 23 novembre 2026)

  it("une équipe coupée au premier tour : une seule reprise, plus courte et à la charge du Studio ; la marque se crée", async () => {
    const t = await thread();
    const { log } = await chain(t, {}, { cut: (id) => id === "team-langue", review: () => ({ routes: [], series: "" }) });
    const i = log.ids.indexOf("team-langue-court");
    expect(i, "reprise courte de l'équipe coupée").toBeGreaterThan(-1);
    expect(log.ids.filter((x) => x.startsWith("team-langue"))).toEqual(["team-langue", "team-langue-court"]);
    // Moins de noms, réflexion brève ; le premier tour garde sa demande normale.
    expect(log.systems["team-langue-court"]).toMatch(/Entre 15 et 20 noms, jamais plus/);
    expect(log.systems["team-langue-court"]).toMatch(/Réflexion brève/);
    expect(log.systems["team-mots"]).toMatch(/Entre 30 et 40 noms, jamais plus/);
    // C'est la faute du Studio : la reprise n'est pas débitée au client ; le premier appel l'était.
    expect((log as any).studio["team-langue-court"]).toBe(true);
    expect((log as any).studio["team-langue"]).toBe(false);
    // Les noms de la reprise et ceux des autres équipes arrivent au juge.
    expect(log.prompts["judge-1"]).toMatch(/^- Reprise team-langue \|/m);
    expect(log.prompts["judge-1"]).toMatch(/^- Trempette \|/m);
    expect(J.journeyOf(t.cid).identities!.list.length).toBe(3);
  });

  it("une équipe coupée deux fois : la création continue avec les noms des autres équipes, et c'est noté", async () => {
    const t = await thread();
    const { log, out } = await chain(t, {}, { cut: (id) => id.startsWith("team-langue"), review: () => ({ routes: [], series: "" }) });
    expect(log.ids.filter((x) => x.startsWith("team-langue"))).toEqual(["team-langue", "team-langue-court"]);
    expect(log.prompts["judge-1"]).not.toMatch(/Bain de Minuit|Lâche le Morceau \| détail réel : détail \| deuxième lecture : lecture\n- La Main/);
    expect(log.prompts["judge-1"]).toMatch(/^- Trempette \|/m);
    expect((out as any).notes.join("\n")).toMatch(/équipe de noms « expressions de la langue[^»]*» sans réponse lisible, même plus courte/);
    expect(J.journeyOf(t.cid).identities!.list.length).toBe(3);
  });

  it("toutes les équipes coupées, même plus courtes : la création s'arrête proprement, avec une phrase claire ; l'acquis est gardé", async () => {
    const t = await thread();
    const job = jobCtx(t.user, t.pid, { projectId: t.pid, conversationId: t.cid, capMicro: 9_000_000, count: 3, images: false });
    await expect(chain(t, {}, { cut: (id) => id.startsWith("team-") }, job)).rejects.toThrow(/Mes équipes de noms n'ont rendu aucune réponse lisible, même avec une demande plus courte : la création de ta marque s'arrête ici\. Ce qui est déjà fait est gardé et ne sera pas repayé\./);
    const cp = JSON.parse(one<{ checkpoint: string }>("SELECT checkpoint FROM jobs WHERE id=?", job.job.id)!.checkpoint);
    expect(Object.keys(cp)).toEqual(expect.arrayContaining(["brand:study", "brand:strategy"]));
  });

  it("panne de Nadia rejouée : au second tour, l'équipe « langue » coupée puis coupée encore ; la marque se crée avec les trois autres", async () => {
    const t = await thread();
    const { log } = await chain(t, {}, {
      cut: (id) => id === "team-langue-2" || id === "team-langue-2-court",
      review: () => ({ routes: [], series: "" }),
      judge: judging(["Bain de Minuit", "Haut les Pêches", "Tout Feu Tout Fruit"]),
      team2: (id) => (id === "team-mots-2" ? ["Tout Feu Tout Fruit", "Pulpe 3000", "Trempette", "Frisquet", "Plongeon"] : ["Haut les Pêches", "Vitrine", "Patience", "Sans Bulles", "Marée Haute"]),
      shortlist: () => [pick("A", "Bain de Minuit"), pick("B", "Haut les Pêches"), pick("C", "Tout Feu Tout Fruit")],
    });
    expect(log.ids).toContain("team-langue-2-court");
    expect(log.systems["team-mots-2"]).toMatch(/Entre 25 et 35 noms, jamais plus/);
    expect(log.ids).toContain("judge-1-2");
    expect(J.journeyOf(t.cid).identities!.list.map((x) => x.name)).toEqual(["Bain de Minuit", "Haut les Pêches", "Tout Feu Tout Fruit"]);
  });

  it("reprise après une panne à 54 % (Nadia) : le devis ne compte que ce qui reste, avec un prix probable, nettement sous la création entière", async () => {
    const T = await import("@/lib/syna-agent/tools/identity");
    const etapes = ["brand:study", "brand:strategy", "brand:team:langue", "brand:team:mots", "brand:team:univers", "brand:team:verite", "brand:shown", "brand:round", "brand:judge:1", "brand:team:mots:1:2", "brand:team:univers:1:2", "brand:team:verite:1:2"];
    const entiere = C.chainQuote({ routes: 3, images: true });
    const q = T.relanceMarqueQuote({ id: "job-inexistant", payload: { capMicro: entiere.maxMicro, count: 3, images: true }, etapes });
    expect(q.probableMicro, "prix probable").toBeGreaterThan(0);
    expect(q.probableMicro!).toBeLessThanOrEqual(q.maxMicro);
    // L'ancienne carte annonçait l'ancien plafond moins ce qui était payé, soit 82 % du plafond (17,21 € sur 20,88 €).
    expect(q.maxMicro).toBeLessThan(entiere.maxMicro * 0.85);
    expect(q.probableMicro!).toBeLessThan(entiere.probableMicro!);
    // Exactement le devis de ce qui reste : sans l'étude, la stratégie, les équipes faites et le premier juge.
    expect(q.maxMicro).toBe(C.chainQuote({ routes: 3, images: true, done: etapes }).maxMicro);
    // Une reprise qui n'a encore rien fait coûte la création entière, pas plus.
    expect(C.chainQuote({ routes: 3, images: true, done: ["brand:shown"] }).maxMicro).toBe(entiere.maxMicro);
  });

  it("aucun nom gardé, même au second tour : les noms sont montrés faute de mieux, et le doute est dit franchement", async () => {
    const t = await thread();
    // La composition ne reçoit que trois noms permis : le « presque », puis les premiers trouvés. Pas un de plus.
    let permitted: string[] = [];
    const { log } = await chain(t, {}, {
      review: () => ({ routes: [], series: "" }), judge: judging([], { "Nage Libre": "Il rate la beauté de peu." }),
      shortlist: (prompt) => { permitted = [...prompt.split("# Noms gardés par le juge des noms")[1].matchAll(/^- (.+?) \| détail :/gm)].map((m) => m[1]); return permitted.map((n, i) => pick("ABC"[i] as "A", n)); },
    });
    expect(log.ids.slice(log.ids.indexOf("team-verite") + 1, log.ids.indexOf("web:verify-1"))).toEqual(["judge-1", "team-langue-2", "team-mots-2", "team-univers-2", "team-verite-2", "judge-1-2", "shortlist"]);
    expect(permitted).toHaveLength(3);
    expect(permitted[0]).toBe("Nage Libre");
    const ids = J.journeyOf(t.cid).identities!;
    expect(ids.list.map((x) => x.name)).toEqual(permitted);
    const issues = ids.issues.join("\n");
    expect(issues).toMatch(/Identité A : je ne suis pas convaincue par le nom « Nage Libre » \(Il rate la beauté de peu\)\. Je te le montre faute de mieux/);
    expect(issues).toMatch(new RegExp(`Identité B : je ne suis pas convaincue par le nom « ${permitted[1]} » \\(il n'a pas passé mon contrôle le plus sévère\\)`));
    expect(issues.match(/pas convaincue/g)).toHaveLength(3);
  });

  it("aperçu des noms seuls : les noms gardés et les « presque », sans composition, sans planche, sans toucher au parcours", async () => {
    const t = await thread();
    const { log, out } = await chain(t, { namesPreview: true }, { judge: judging(["Bain de Minuit", "Nage Libre", "Grand Bain"], { "La Main Lourde": "Il rate la beauté de peu." }) });
    expect(log.ids.slice(log.ids.indexOf("team-verite") + 1)).toEqual(["judge-1"]);
    expect((out as any).preview).toEqual([{ name: "Bain de Minuit", ...SEEN, detail: "détail", second: "lecture" }, { name: "Nage Libre", ...SEEN, detail: "détail", second: "lecture" }, { name: "Grand Bain", ...SEEN, detail: "détail", second: "lecture" }]);
    expect((out as any).almost).toEqual([{ name: "La Main Lourde", why: "Il rate la beauté de peu." }]);
    expect((out as any).searched).toBe(15);
    expect(J.journeyOf(t.cid).identities ?? null).toBeNull();
  });

  it("nom choisi par le client : la proposition se fait sur CE nom, lettre pour lettre, sans recherche ni juge", async () => {
    const t = await thread();
    await chain(t, {}, { review: () => ({ routes: [], series: "" }) });
    const before = J.journeyOf(t.cid).identities!.list;
    const { log } = await chain(t, { redo: ["B"], names: ["Pulpe"] }, { review: () => ({ routes: [], series: "" }), shortlist: () => [pick("B", "Nage Libre")] });
    expect(log.ids).toEqual(["shortlist", "web:verify-2", "verify-2", "direction-2-B", "review-2"]);
    expect(log.prompts.shortlist).toMatch(/# Noms CHOISIS par le client : compose une route par nom[^\n]*« Pulpe »/);
    const after = J.journeyOf(t.cid).identities!.list;
    expect(after.map((x) => x.name)).toEqual([before[0].name, "Pulpe", before[2].name]);
    expect(after[1].ground).toBe(before[1].ground);
    expect(after[0]).toEqual(before[0]);
    // Un nom par proposition à faire, et un nom bien formé : sinon rien ne part.
    await expect(chain(t, { redo: ["B"], names: ["Pulpe", "Zeste"] })).rejects.toThrow(/un nom par proposition à faire \(1\) ; j'en ai reçu 2/);
    await expect(chain(t, { redo: ["B"], names: ["Pulpe 3000"] })).rejects.toThrow(/Ce nom ne peut pas servir tel quel/);
    // Devis : un nom choisi coûte moins qu'une recherche (ni équipes, ni juge, ni second tour).
    expect(C.chainQuote({ routes: 1, fresh: false, imposed: true }).maxMicro).toBeLessThan(C.chainQuote({ routes: 1, fresh: false }).maxMicro);
  });

  it("plus d'illustratrice dans la chaîne : aucun dessin demandé ni relu, même quand les images sont créées ; les équipes de noms cherchent ensemble", async () => {
    const t = await thread();
    // Les équipes de noms sont lancées en même temps (une seule attente au lieu de quatre), au premier comme au second tour.
    let open = 0;
    const most: Record<string, number> = { first: 0, second: 0 };
    const log = newLog();
    const job = jobCtx(t.user, t.pid, { projectId: t.pid, conversationId: t.cid, capMicro: 9_000_000, count: 3, images: true, logosGraphistes: await logosFinis(t, 3) });
    const base = fakeAi(log, {
      review: () => ({ routes: [], series: "" }), judge: judging(["Bain de Minuit", "Haut les Pêches", "Tout Feu Tout Fruit"]),
      team2: (id) => (id === "team-langue-2" ? ["Haut les Pêches", "Vitrine", "Grand Large", "Plein Soleil", "Bord de Mer"] : ["Tout Feu Tout Fruit", "Verger", "Corbeille", "Panier", "Cueillette"]),
      shortlist: () => [pick("A", "Bain de Minuit"), pick("B", "Haut les Pêches"), pick("C", "Tout Feu Tout Fruit")],
      // Si une illustratrice était encore appelée, ces réponses serviraient : elles ne doivent jamais être demandées.
      art: () => DRAWN, artcheck: (_id, c) => ({ drawings: c.images.map((i: any) => ({ slot: i.label, ok: true, why: "" })) }),
    })();
    C.brandChainDeps.ai = (() => ({ ...base, ask: async (id: string, c: any) => {
      if (c.kind !== "team") return base.ask(id, c);
      const round = id.endsWith("-2") ? "second" : "first";
      open++; most[round] = Math.max(most[round], open);
      await new Promise((r) => setTimeout(r, 15));
      try { return await base.ask(id, c); } finally { open--; }
    } })) as any;
    let out: any;
    try { out = await fr(() => C.runSinaBrandJob(job)); } finally { C.brandChainDeps.ai = undefined; }
    expect(most).toEqual({ first: 4, second: 4 });
    expect(log.ids.filter((i) => i.startsWith("team"))).toHaveLength(8);
    // Aucun appel « art-… » ni « artcheck-… » : après la relecture, seulement les images du premier temps.
    expect(log.ids.filter((i) => i.startsWith("art"))).toEqual([]);
    expect(log.ids.slice(log.ids.indexOf("review-1") + 1).every((i) => /^(imagery|image|imagecheck)-1-[ABC]/.test(i))).toBe(true);
    const list = J.journeyOf(t.cid).identities!.list;
    expect(list.map((x) => x.name)).toEqual(["Bain de Minuit", "Haut les Pêches", "Tout Feu Tout Fruit"]);
    for (const x of list) {
      expect(x.board!.hero).toBeUndefined(); // aucune scène dessinée en code : la vraie image, ou rien
      expect(x.board!.images!.hero).toBeTruthy();
      expect(x.board!.images!.logo).toBeTruthy();
      expect(JSON.stringify(x.board)).not.toMatch(/"nodes"/);
    }
    expect((out as any).notes.join("\n")).not.toMatch(/dessin/);
  });

  // ---------------------------------------------------------------- une identité différente de chaque marque récente

  it("variété entre les marques : SINA reçoit les polices et les fonds des marques récentes ; une police reprise est remplacée sans IA, avant les images", async () => {
    const t = await thread();
    // La marque la plus récente du Studio (un autre client) a les titres de l'identité B (Archivo Black) et un fond
    // presque pareil au sien (#FFFCF7 contre #FFFDF5).
    const other = await account();
    const far = Date.now() + 50_000_000;
    run("INSERT INTO projects(id,user_id,name,brand_json,created_at,updated_at) VALUES(?,?,?,?,?,?)", `variete-${far}`, other.id, "Autre client", JSON.stringify({ name: "Autre client", fonts: { heading: "archivo_black_n4", body: "dm_sans_n4" }, palette: { light: "#FFFCF7", dark: "#111111", primary: "#FF2E63", secondary: "#EEEEEE", accent: "#12A36D" } }), far, far);
    try {
      const { out, log } = await chain(t, {}, { fix: () => FIXED_LINE }, undefined);
      const { marquesRecentes, ligneeDe, deltaE2000, fondDoux } = await import("@/lib/syna-agent/variete-marques");
      const recent = marquesRecentes(t.pid);
      expect(recent[0]).toEqual({ heading: "archivo_black_n4", light: "#FFFCF7" });
      // La consigne de chaque planche nomme les polices et les fonds pris, sans le nom de l'autre marque.
      expect(log.prompts["direction-1-B"]).toMatch(/Polices de titres déjà prises[^\n]*Archivo Black \(archivo_black\)/);
      expect(log.prompts["direction-1-B"]).toMatch(/Fonds clairs des \d dernières \(light\) : #FFFCF7/);
      expect(log.prompts["direction-1-B"]).not.toMatch(/Autre client/);
      expect(log.prompts["fix-1-B"]).toMatch(/Polices de titres déjà prises/);
      const list = J.journeyOf(t.cid).identities!.list;
      const taken = new Set(recent.flatMap((m) => (m.heading ? [ligneeDe(m.heading)] : [])));
      const b = list.find((x) => x.key === "B")!;
      expect(ligneeDe(b.fonts.heading)).not.toBe("archivo");
      // Fond trop proche (#FFFDF5 contre #FFFCF7) : remplacé par un fond doux, plus écarté.
      expect(b.palette.light).not.toBe(route("B").palette.light);
      expect(fondDoux(b.palette.light)).toBe(true);
      expect(deltaE2000(b.palette.light, "#FFFCF7")).toBeGreaterThan(deltaE2000(route("B").palette.light, "#FFFCF7"));
      expect(b.palette.primary).toBe(route("B").palette.primary); // la couleur vedette ne change jamais
      for (const x of list) expect(taken.has(ligneeDe(x.fonts.heading))).toBe(false);
      expect(new Set(list.map((x) => ligneeDe(x.fonts.heading))).size).toBe(list.length);
      // Le directeur de création a relu la série déjà corrigée.
      expect(log.prompts["review-1"]).not.toMatch(/"heading":"archivo_black_n4"/);
      expect((out as any).notes.join("\n")).toMatch(/Identité B : police de titres Archivo Black \(déjà prise par une marque récente\) remplacée/);
    } finally {
      run("DELETE FROM projects WHERE id=?", `variete-${far}`);
    }
  });

  // ---------------------------------------------------------------- la méthode des graphistes (point 0 : « Oui »)

  it("méthode des graphistes : identity.propose arrête la chaîne après les noms VÉRIFIÉS ; un seul accord pour l'étape, découpé en morceaux", async () => {
    const { setJsonSetting } = await import("@/lib/settings");
    setJsonSetting("sina.logo.graphistes", true);
    try {
      const t = await thread();
      const tool = getTool("identity.propose")!;
      const { accordGraphistes } = await import("@/lib/syna-agent/tools/identity");
      const est = await fr(() => tool.estimate!({ ...t.ctx, projectId: t.pid }, {} as never));
      const count = C.routeCountOfProject(t.pid), g = accordGraphistes(count);
      expect(est.maxMicro).toBe(g.maxMicro + C.finishQuote().maxMicro);
      // La somme des morceaux réservés ne dépasse jamais le « au plus » montré.
      expect(g.nomsMicro + g.rechercheMicro + g.finalisationsMicro + g.planchesMicro).toBeLessThanOrEqual(g.maxMicro);
      const r = await call("identity.propose", t.ctx, {});
      expect(r.ok).toBe(true);
      const job = one<any>("SELECT * FROM jobs WHERE id=?", r.jobs![0]);
      expect(JSON.parse(job.payload)).toMatchObject({ jusquAuxNoms: true, count, capMicro: g.nomsMicro });
      expect(J.journeyOf(t.cid).accordGraphistes).toMatchObject({ count, rechercheMicro: g.rechercheMicro, finalisationsMicro: g.finalisationsMicro, planchesMicro: g.planchesMicro });
      run("UPDATE jobs SET status='done' WHERE id=?", job.id);
      // La chaîne s'arrête après la vérification des noms : ni composition, ni planche, ni image.
      const { out, log } = await chain(t, { jusquAuxNoms: true }, { taken: [{ name: "Trempette", url: "https://annuaire.example/boissons" }] });
      expect(log.ids.slice(-3)).toEqual(["judge-1", "web:verify-noms-1", "verify-noms-1"]);
      expect(log.ids.some((i) => /^(shortlist|direction|imagery|image-)/.test(i))).toBe(false);
      const noms = (out as any).noms.map((n: any) => n.name);
      expect(noms).not.toContain("Trempette");
      expect(J.journeyOf(t.cid).nomsVerifies).toEqual(noms);
      expect(J.journeyOf(t.cid).identities).toBeUndefined();
    } finally { setJsonSetting("sina.logo.graphistes", false); }
  });

  it("méthode des graphistes : les identités partagent le nom choisi, chacune avec son logo fini posé tel quel ; ses couleurs imposées, le logo joint à la direction ; aucun logo redessiné", async () => {
    const t = await thread();
    const { saveAsset } = await import("@/lib/library");
    // Trois logos finis (ce qu'aurait rendu la méthode des graphistes), avec leurs couleurs tirées par le code.
    const pal = (primary: string) => ({ dark: "#1A1A1A", primary, secondary: "#F4F4F2", accent: primary, light: "#FFFFFF" });
    const logos = await Promise.all(["#2B6CB0", "#C05621", "#2F855A"].map(async (c) => ({ assetId: (await saveAsset({ projectId: t.pid, userId: t.user.id, data: await whiteLogo(c, 400, 200), name: "logo.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready" })).id, palette: pal(c) })));
    const { out, log } = await chain(t, { names: ["Bain de Minuit", "Bain de Minuit", "Bain de Minuit"], logosGraphistes: logos, images: true }, { fix: () => FIXED_LINE });
    expect((out as any).routes.map((r: any) => r.name)).toEqual(["Bain de Minuit", "Bain de Minuit", "Bain de Minuit"]);
    const list = J.journeyOf(t.cid).identities!.list as any[];
    expect(list.map((x) => x.board.images?.logo?.id)).toEqual(logos.map((l) => l.assetId));
    // Aucun logo dessiné par l'ancienne série : seuls la grande scène et le haut du site sont créés.
    expect(log.ids.filter((i) => /^image-.*-logo/.test(i))).toEqual([]);
    expect(log.ids.some((i) => /^image-.*-hero/.test(i))).toBe(true);
    // La direction reçoit les couleurs du logo, imposées, et la consigne de la police tirée du logo.
    for (const k of ["A", "B", "C"]) expect(log.prompts[`direction-1-${k}`]).toMatch(/tirées de son logo et IMPOSÉES/);
    expect(log.prompts["direction-1-B"]).toMatch(/Choisis la police de titres dont le dessin est le plus proche de ses lettres/);
    // Les routes restent différentes (idée, fond) malgré le même nom ; la couleur de marque est celle du logo, sauf correction de contraste dite.
    expect(new Set(list.map((x) => x.ground)).size).toBe(3);
    expect(new Set(list.map((x) => x.fonts.heading.replace(/_[ni]\d$/, ""))).size).toBe(3);
  });
});
