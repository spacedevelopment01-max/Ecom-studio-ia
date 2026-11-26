/**
 * LE BANC D'ÉPREUVES (le socle, 21 novembre 2026) : chaque raté vu avec le propriétaire, rejoué avant chaque envoi.
 * Catalogue et règles : `tests/epreuves/catalogue.ts`. Aucun appel payant : la vraie chaîne des images de la planche
 * tourne avec un faux dessinateur et un faux relecteur ; les autres épreuves rejouent les contrôles du Studio.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { EPREUVES, type Epreuve } from "./epreuves/catalogue";
import { route } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

const sceau = (e: Epreuve) => crypto.createHash("sha256").update(JSON.stringify([e.id, e.date, e.verdict, e.attendu, e.rejeu])).digest("hex");
const SCEAUX: Record<string, string> = JSON.parse(fs.readFileSync("tests/epreuves/sceaux.json", "utf8"));

describe("le banc d'épreuves : les verdicts du propriétaire ne se réécrivent jamais", () => {
  it("chaque épreuve scellée existe encore, à l'identique (aucune retirée, aucune réécrite)", () => {
    for (const [id, h] of Object.entries(SCEAUX)) {
      const e = EPREUVES.find((x) => x.id === id);
      expect(e, `épreuve retirée : ${id}`).toBeTruthy();
      expect(sceau(e!), `épreuve réécrite : ${id} (seul le propriétaire change un verdict)`).toBe(h);
    }
  });
  it("chaque épreuve a son sceau, sa date, sa source ; une épreuve payante dit son prix", () => {
    for (const e of EPREUVES) {
      expect(SCEAUX[e.id], `épreuve sans sceau : ${e.id}`).toBeTruthy();
      expect(e.date).toMatch(/^2026-\d\d-\d\d$/);
      expect(fs.existsSync(e.source.split(" ")[0]), e.source).toBe(true);
      if (e.rejeu === "payant") expect(e.prix, e.id).toBeTruthy();
    }
    expect(new Set(EPREUVES.map((e) => e.id)).size).toBe(EPREUVES.length);
  });
  it("une épreuve remplacée par une décision datée garde son sceau à jamais et ne se rescelle pas", () => {
    const remplacees = EPREUVES.filter((e) => e.remplaceePar);
    expect(remplacees.map((e) => e.id).sort()).toEqual(["logo-goutte-refusee", "consigne-de-sina-au-dessinateur", "logos-de-la-serie-trop-proches", "trait-sous-le-nom-repete", "ligne-la-marque-sans-idee-de-dessin", "serie-compte-les-logos-refuses", "refus-du-logo-une-seule-fois", "refus-du-client-toutes-tournures", "logo-demande-nue", "trait-pres-du-nom-un-par-serie-au-relecteur", "refus-et-consigne-apres-la-demande-nue", "serie-logo-completement-different", "trois-fois-le-meme-dessin", "logos-de-la-serie-dans-l-ordre", "pas-de-consigne-de-style-pour-un-logo", "demande-du-logo-couleurs-typo-fond", "relecteur-du-logo-qualite-seule", "planches-de-recherche-demande-exacte", "relecteur-du-logo-fini", "finalisation-ecrite-par-le-plus-fort", "relecteur-sans-refus-pour-trop-proche", "logo-refait-une-fois-avec-ses-raisons", "relecteur-juge-l-execution-pas-l-idee", "planche-refusee-deux-fois-jamais-montree", "vrai-produit-du-client-joint", "relecteur-petites-finitions-sans-refus", "planche-phrase-par-lignes-et-reprise-qui-part-toujours", "relecteur-de-planche-texte-lisible-et-promesses-mesurables", "planche-reprend-la-phrase-du-logo", "planche-en-vrai-a-l-identique", "planche-en-vrai-symbole-seul-et-bandeau-sans-marges", "planche-en-vrai-palette-mesuree-et-logos-en-hd", "accord-des-noms-compte-la-verification"].sort());
    for (const e of remplacees) {
      const r = e.remplaceePar!;
      // Le sceau ne change pas : celui du catalogue, celui de sceaux.json et celui figé au jour du remplacement.
      expect(sceau(e), e.id).toBe(r.sceau);
      expect(SCEAUX[e.id], e.id).toBe(r.sceau);
      // Rescellée après une réécriture : le sceau figé la refuse.
      expect(sceau({ ...e, attendu: `${e.attendu} (réécrite)` })).not.toBe(r.sceau);
      // Remplacée par une épreuve qui existe et qui est scellée ; en suivant la chaîne des remplacements (sans boucle), la
      // dernière est rejouée et n'est pas remplacée. Avec la décision mot pour mot.
      const vus = new Set<string>([e.id]);
      let par = EPREUVES.find((x) => x.id === r.epreuve);
      expect(par && SCEAUX[par.id], `${e.id} → ${r.epreuve}`).toBeTruthy();
      while (par?.remplaceePar) { expect(vus.has(par.id), `boucle : ${par.id}`).toBe(false); vus.add(par.id); par = EPREUVES.find((x) => x.id === par!.remplaceePar!.epreuve); }
      expect(par && SCEAUX[par.id] && par.rejeu === "gratuit", `${e.id} → ${par?.id}`).toBeTruthy();
      expect(["23 novembre 2026", "24 novembre 2026", "25 novembre 2026", "26 novembre 2026"]).toContain(r.decision);
      expect(r.mots).toMatch(/^« (je pense qu'il ne faut pas donner d'informations sauf fait moi un logo pour une marque de bougies|En même temps il fallait garder la règle de le premier logo est fait|Et si on enlevait mes 50 logos de démo|Oui, marque trois-fois-le-meme-dessin|Oui, marque planches-de-recherche-demande-exacte|Oui, marque finalisation-ecrite-par-le-plus-fort|Oui, marque relecteur-sans-refus-pour-trop-proche|Oui, marque logo-refait-une-fois-avec-ses-raisons|Oui, marque vrai-produit-du-client-joint|Oui, marque relecteur-petites-finitions-sans-refus|Oui, marque relecteur-de-planche-texte-lisible-et-promesses-mesurables|Oui, marque planche-phrase-par-lignes-et-reprise-qui-part-toujours|Oui, marque planche-en-vrai-a-l-identique|Oui, marque planche-en-vrai-palette-mesuree-et-logos-en-hd)/);
      // Les accords écrits du 24 et du 25 novembre 2026 nomment chaque épreuve qu'il remplace, et celle qui la remplace.
      if (r.decision === "24 novembre 2026" || r.decision === "25 novembre 2026" || r.decision === "26 novembre 2026") { expect(r.mots, e.id).toContain(e.id); expect(r.mots, r.epreuve).toContain(r.epreuve); }
    }
  });
  it("chaque épreuve gratuite est rejouée ci-dessous", () => {
    const src = fs.readFileSync("tests/epreuves.test.ts", "utf8");
    for (const e of EPREUVES.filter((x) => x.rejeu === "gratuit")) expect(src.includes(`epreuve("${e.id}"`), e.id).toBe(true);
  });
});

/** Une épreuve gratuite : son verdict en titre. Une épreuve remplacée reste au catalogue, mais n'est plus rejouée. */
const epreuve = (id: string, fn: () => Promise<void> | void) => {
  const e = EPREUVES.find((x) => x.id === id);
  if (!e) throw new Error(`épreuve inconnue : ${id}`);
  if (e.remplaceePar) it.skip(`${id} — remplacée le ${e.remplaceePar.decision} par ${e.remplaceePar.epreuve}`, fn);
  else it(`${id} (${e.date}) — ${e.attendu}`, fn);
};

describe("les épreuves de la planche de marque (vraie chaîne, faux dessinateur et faux relecteur)", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  const { account, project } = await import("./conversation209-fixtures");
  const imagery = { look: "calme, lumière de fin de journée", logo: "Piste écrite par SINA : un logotype sobre, un fil à plomb stylisé, vert profond.", hero: "Une salle de bain claire.", object: "Une camionnette blanche.", site: "Le haut de la page d'accueil.", signs: "", posts: ["Un.", "Deux.", "Trois."] };
  const blanc = (w = 640, h = 480) => sharp({ create: { width: w, height: h, channels: 3, background: "#FFFFFF" } });
  const carre = (c: string, w = 96, h = 96) => sharp({ create: { width: w, height: h, channels: 3, background: c } }).png().toBuffer();
  const lettres = () => Array.from({ length: 8 }, (_v, i) => ({ input: { create: { width: 40, height: 70, channels: 3 as const, background: "#1F3D2B" } }, left: 100 + i * 55, top: 200 }));
  const logoSimple = async () => blanc().composite(lettres()).png().toBuffer();
  const logoAvecTrait = async () => blanc().composite([...lettres(), { input: { create: { width: 420, height: 4, channels: 3 as const, background: "#1F3D2B" } }, left: 100, top: 300 }]).png().toBuffer();
  const brume = async () => { const w = 96, h = 96, d = Buffer.alloc(w * h * 4); for (let i = 0; i < w * h; i++) { d[i * 4] = 40; d[i * 4 + 1] = 80; d[i * 4 + 2] = 120; d[i * 4 + 3] = i < (w * h) / 3 ? 90 : 255; } return sharp(d, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer(); };

  type Draw = (id: string, slot: string, n: number) => Promise<Buffer>;
  type Verdict = (slot: string, n: number) => { ok?: boolean; score?: number; why?: string; defect?: string; read?: string[] };
  /** La chaîne des images d'une planche, telle quelle, avec un dessinateur et un relecteur simulés (rien n'est payé). */
  async function planche(o: { slots: string[]; draw?: Draw; verdict?: Verdict; gouts?: string; x?: any; /** Une boutique, avec ses photos de produit envoyées (vérifiées). */ photos?: number; /** false : la planche n'a pas encore son logo (il viendra de la méthode des graphistes). */ logoFini?: boolean }) {
    const user = await account(), projectId = project(user, o.photos != null ? "products" : "services") as string;
    if (o.photos) {
      const { saveAsset } = await import("@/lib/library");
      const { run } = await import("@/lib/db");
      for (let i = 0; i < o.photos; i++) {
        const a = await saveAsset({ projectId, userId: user.id, data: await sharp({ create: { width: 640, height: 640, channels: 3, background: ["#EEE6DA", "#E8DCCB", "#F2ECE2"][i % 3] } }).png().toBuffer(), name: `bougie-${i + 1}.png`, mime: "image/png", role: "original", origin: "upload" });
        run("UPDATE assets SET meta=json_set(COALESCE(meta,'{}'),'$.verification',json(?)) WHERE id=?", JSON.stringify({ etat: "verifiee", at: Date.now() }), a.id);
      }
    }
    const x0 = o.x ?? { ...route("A"), name: "Aplomb" };
    // Le logo fini par la méthode des graphistes, posé tel quel sur la planche (jamais dessiné avec ses images).
    const { saveAsset: ranger } = await import("@/lib/library");
    const fini = o.logoFini === false || x0.board.images?.logo ? null : await ranger({ projectId, userId: user.id, data: await logoSimple(), name: "logo-fini.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready" });
    const x = fini ? await (await import("@/lib/syna-agent/brand-chain")).poserLeLogoFini(x0, fini.id) : x0;
    const texts = I.slotTexts(x);
    const timeline: { kind: "draw" | "look"; id: string; slot: string; prompt: string; avoid?: boolean; product?: boolean; labels?: string[] }[] = [];
    const drawn = new Map<string, number>(), looked = new Map<string, number>();
    const ai: any = {
      research: async () => [], ask: async () => { throw new Error("aucun appel attendu"); },
      draw: async (id: string, c: any) => {
        const slot = /-(logo|hero|object|signs|site|post\d)(:|$)/.exec(id)![1], n = (drawn.get(slot) ?? 0) + 1; drawn.set(slot, n);
        timeline.push({ kind: "draw", id, slot, prompt: c.prompt, avoid: !!c.avoid, product: !!c.product });
        return o.draw ? o.draw(id, slot, n) : slot === "logo" ? logoSimple() : carre("#224466");
      },
      look: async (id: string, c: any) => {
        const slots = (c.images as { label: string }[]).map((i) => i.label).filter((l) => (I.IMAGE_SLOTS as readonly string[]).includes(l));
        const s = slots[0], n = (looked.get(s) ?? 0) + 1; looked.set(s, n);
        timeline.push({ kind: "look", id, slot: s, prompt: c.prompt, labels: (c.images as { label: string }[]).map((i) => i.label) });
        const v = o.verdict?.(s, n) ?? { ok: true, score: 9 };
        return { images: [{ slot: s, seen: "", score: v.score ?? 9, ...(v.ok === undefined ? {} : { ok: v.ok }), read: v.read ?? texts[s as keyof typeof texts] ?? [], why: v.why ?? "", defect: v.defect ?? "autre" }] };
      },
    };
    const ctx: any = { step: async (_k: string, fn: () => unknown) => fn(), progress: () => {} };
    const r = await I.runBoardImages({ ctx, ai, who: { userId: user.id, projectId }, brief: "", kind: o.photos != null ? "produits" : "services", route: x, round: 1, slots: o.slots as never, imagery: imagery as never, gouts: o.gouts ?? null });
    return { r, timeline, x, projectId, user };
  }

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « logo-demande-nue ».
  epreuve("logo-goutte-refusee", () => {});

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « logo-demande-nue ».
  epreuve("consigne-de-sina-au-dessinateur", () => {});

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « logo-demande-nue ».
  epreuve("logos-de-la-serie-trop-proches", () => {});

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « logo-demande-nue ».
  epreuve("trait-sous-le-nom-repete", () => {});

  epreuve("photo-a-brume-ou-taches", async () => {
    const { r, timeline } = await planche({ slots: ["hero"], draw: async (_id, slot, n) => (slot === "hero" && n === 1 ? brume() : carre("#224466")) });
    expect(timeline.filter((t) => t.slot === "hero").map((t) => t.kind)).toEqual(["draw", "draw", "look"]);
    expect(r.route.board.images?.hero).toBeTruthy();
    // Fond plein demandé à OpenAI pour toute photo (le logo seul garde un fond retirable).
    const { openaiBackground } = await import("@/lib/ai/openai-images");
    expect(openaiBackground({ transparentCap: true })).toEqual({ background: "opaque" });
  });

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « logo-demande-nue ».
  epreuve("ligne-la-marque-sans-idee-de-dessin", () => {});

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « logo-demande-nue ».
  epreuve("serie-compte-les-logos-refuses", () => {});

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « logo-demande-nue ».
  epreuve("refus-du-logo-une-seule-fois", () => {});

  epreuve("logo-relu-avant-ce-qui-le-porte", async () => {
    // Méthode des graphistes : le logo fini est dessiné et relu (refait une fois s'il est refusé) AVANT d'être rendu ;
    // la planche ne reçoit que le logo relu et gardé, puis ce qui le porte est dessiné avec lui.
    const { finaliserUneEsquisse } = await import("@/lib/syna-agent/logo-finalisation");
    const ordre: string[] = [], dessins: Buffer[] = [];
    const bon = { nomLu: "Aplomb", ideeConservee: true, evolution: true, arche: false, phrase: "", phraseDitLeMetier: false, note: 9, pourquoi: "" };
    const f = await finaliserUneEsquisse({
      rediger: async () => ({ idee_centrale: "un fil à plomb", texte: "Transforme cette esquisse en véritable logo contemporain pour Aplomb, un plombier. Conserve l'idée centrale : un fil à plomb. Fais évoluer cette idée vers une identité plus aboutie et plus distinctive. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif" }),
      finaliser: async () => { ordre.push("dessin"); const b = await logoSimple(); dessins.push(b); return b; },
      relire: async () => { ordre.push("relecture"); return ordre.length === 2 ? { ...bon, note: 5 } : bon; },
      detourer: async (png) => ({ ok: true, png }),
      aLaChargeDuStudio: async (fn) => fn(),
    }, { nom: "Aplomb", metier: "un plombier", esquisse: await logoSimple() });
    expect(ordre).toEqual(["dessin", "relecture", "dessin", "relecture"]);
    expect(f.ok && f.logo).toBe(dessins[1]);
    // Sans logo relu et gardé, rien de ce qui le porte n'est dessiné ; avec lui, le haut du site le reçoit, seul logo joint.
    const sans = await planche({ slots: ["hero", "site", "object"], logoFini: false });
    expect(sans.timeline.filter((t) => t.kind === "draw").map((t) => t.slot)).toEqual(["hero"]);
    const avec = await planche({ slots: ["hero", "site"] });
    const order = avec.timeline.map((t) => `${t.kind}:${t.slot}`);
    expect(order.indexOf("look:hero")).toBeLessThan(order.indexOf("draw:site"));
    expect(avec.timeline.some((t) => t.slot === "logo")).toBe(false);
  });

  epreuve("planche-incomplete", async () => {
    const first = await planche({ slots: ["hero", "site"] });
    const before = first.r.route.board.images!.site!;
    expect(before).toBeTruthy();
    const again = await planche({ slots: ["site"], x: first.r.route, verdict: (s) => (s === "site" ? { ok: false, why: "écran à moitié vide" } : { ok: true, score: 9 }) });
    expect(again.r.siteGarde).toBe(true);
    expect(again.r.route.board.images!.site).toEqual(before);
  });

  epreuve("image-pas-au-niveau", async () => {
    const { timeline } = await planche({ slots: ["hero"], verdict: (_s, n) => (n === 1 ? { ok: true, score: 7, why: "lumière plate" } : { ok: true, score: 9 }) });
    expect(timeline.filter((t) => t.slot === "hero").map((t) => t.kind)).toEqual(["draw", "look", "draw", "look"]);
    expect(I.NOTE_MIN).toBe(8);
  });

  epreuve("planche-a-trou-jamais-montree", async () => {
    // La planche n'a pas encore son logo (il vient de la méthode des graphistes) : le haut du site n'est pas dessiné, et il
    // manque à la planche avec le logo.
    const { r, timeline } = await planche({ slots: ["hero", "site"], logoFini: false });
    expect(timeline.some((t) => t.kind === "draw" && (t.slot === "logo" || t.slot === "site"))).toBe(false);
    expect(r.manque).toEqual(["logo", "site"]);
    expect(I.manqueDeLaPlanche(r.route)).toEqual(["logo", "site"]);
    // Elle n'est ni affichée, ni montrée à SINA, ni choisissable ; la planche complète de la série reste montrée.
    const J = await import("@/lib/syna-agent/journey");
    const complete = { ...route("B"), board: { ...route("B").board, images: { logo: { id: "l", w: 1, h: 1 }, hero: { id: "h", w: 1, h: 1 }, site: { id: "s", w: 1, h: 1 } } } };
    const j = { ...J.emptyJourney(), identities: { list: [r.route, complete], issues: [], comparison: "", at: 1, round: 1, incompletes: [{ key: r.route.key, manque: ["logo", "site"] }] } } as any;
    J.setStep(j, 0, "done"); J.setStep(j, 1, "review");
    expect(J.planchesMontrees(j).map((x: any) => x.key)).toEqual(["B"]);
    const { journeyImages } = await import("@/lib/syna-agent/attachments");
    expect((await journeyImages(j)).some((x) => (x.label ?? "").startsWith(`Identité ${r.route.key} `))).toBe(false);
    expect(J.journeyContext(j)).toMatch(/gardée de côté, NON montrée[\s\S]*il manque le logo, le haut du site[\s\S]*identity\.images[\s\S]*À ma charge : 0 % de ton budget/);
    // SINA dit ce qui bloque et propose la suite, à la charge du Studio : la carte d'accord le dit.
    const said = I.phrasePlancheGardee(r.route, ["logo", "site"], r.issues);
    expect(said).toMatch(/je ne te montre pas cette planche, il lui manque le logo et le haut du site.*\. Je ne montre jamais une planche à trou : je peux refaire ce qui manque, à ma charge, rien n'est compté sur ton budget\./);
    expect(said).not.toMatch(/nom dessiné|nom écrit seul/);
    const T = await import("@/lib/syna-agent/tools/identity");
    expect(T.finirPlanchesGardees(j, [r.route.key], ["site"])).toBe(true);
    expect(T.finirPlanchesGardees(j, [r.route.key, "B"], ["site"])).toBe(false); // une planche montrée, c'est un goût du client
    // Son logo se finit par la méthode des graphistes, à la charge du Studio (la carte le dit).
    const LT = await import("@/lib/syna-agent/tools/logo");
    expect(LT.logoAFinir(j, r.route.key)).toBe(true);
    expect(LT.logoAFinir(j, "B")).toBe(false);
    expect(LT.travailDesPistes(j, r.route.key)).toMatchObject({ neuve: true, nom: r.route.name, planche: r.route.key, studio: true });
    const { confirmationText } = await import("@/lib/syna-agent/loop");
    const user = await account();
    expect(await confirmationText({ name: "identity.images", description: "x" } as any, {}, {} as any, user.id, null, { label: "finir ta planche", maxMicro: 50_000, studio: true })).toContain("À ma charge : 0 % de ton budget, rien n'est compté pour toi.");
  });

  epreuve("image-sous-8-jamais-gardee", async () => {
    // Le haut du site de « Pénombre » : note 5, ok = faux, défaut « texte », tous les textes attendus présents.
    const nadia = (_s: string, n: number) => (n === 1 ? { ok: false, score: 5, defect: "texte", why: "un bandeau de mois non demandé (JAN à DÉC, avec « JUI » en double) ; le pot de bougie de la photo est coupé par le bord droit" } : { ok: true, score: 9, why: "titre net, produit entier" });
    const site = await planche({ slots: ["site"], verdict: (s, n) => (s === "site" ? nadia(s, n) : { ok: true, score: 9 }) });
    // Aucune seconde lecture ne la repêche : elle est refaite, et seule la nouvelle (9/10) est gardée.
    expect(site.timeline.filter((t) => t.slot === "site").map((t) => t.kind)).toEqual(["draw", "look", "draw", "look"]);
    expect(site.timeline.some((t) => t.id.startsWith("imagereread"))).toBe(false);
    // Sans ok du tout : la note décide seule, jamais en dessous de 8.
    const sansOk = await planche({ slots: ["hero"], verdict: (_s, n) => (n === 1 ? { score: 6 } : { score: 9 }) });
    expect(sansOk.timeline.filter((t) => t.slot === "hero").map((t) => t.kind)).toEqual(["draw", "look", "draw", "look"]);
    expect(sansOk.r.route.board.images?.hero).toBeTruthy();
    // Ce que SINA en dira : la note et les mots du relecteur, rien d'autre.
    const J = await import("@/lib/syna-agent/journey");
    const v = J.verdictDuRelecteur(site.r.route.board.images!.site!.id);
    expect(v).toEqual({ score: 9, words: "titre net, produit entier" });
    expect(J.phraseDuVerdict(v)).toBe("note 9 sur 10 : « titre net, produit entier »");
    // La planche montrée a ses trois images (une planche à trou n'est jamais montrée, lue sur son contenu) : le logo et la
    // grande scène de l'essai, le haut du site relu ci-dessus.
    const montree = { ...site.r.route, board: { ...site.r.route.board, images: { logo: { id: "logo-essai", w: 1, h: 1 }, hero: { id: "scene-essai", w: 1, h: 1 }, ...site.r.route.board.images } } };
    const j = { ...J.emptyJourney(), identities: { list: [montree], issues: [], comparison: "", at: 1, round: 1 } } as any;
    J.setStep(j, 0, "done"); J.setStep(j, 1, "review");
    expect(J.journeyContext(j)).toMatch(/Relecture des images, à reprendre telle quelle[\s\S]*jamais « soigné »[\s\S]*le haut du site : note 9 sur 10 : « titre net, produit entier »/);
    const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
    expect(SYNA_SYSTEM).toContain("tu en parles avec le verdict de sa relecture (sa note et ses mots, donnés avec elle), jamais avec un éloge qu'elle n'a pas dit");
  });

  epreuve("vrai-produit-du-client-joint", async () => {
    const { timeline } = await planche({ slots: ["hero", "site"], photos: 3 });
    for (const slot of ["hero", "site"]) {
      const dessin = timeline.find((t) => t.kind === "draw" && t.slot === slot)!, relu = timeline.find((t) => t.kind === "look" && t.slot === slot)!;
      expect(dessin.product, slot).toBe(true);
      expect(dessin.prompt).toContain(I.PRODUIT_FIDELE);
      expect(relu.labels).toContain("produit");
      expect(relu.prompt).toContain(I.PRODUIT_A_COMPARER);
    }
    // Le logo ne se dessine pas avec les images de la planche (méthode des graphistes) : il ne reçoit jamais ces photos.
    expect(timeline.some((t) => t.kind === "draw" && t.slot === "logo")).toBe(false);
    // Les photos sont jointes en une seule image « product », annoncée « à reproduire fidèlement ».
    const { imageReferencePrompt } = await import("@/lib/ai/media-providers");
    expect(imageReferencePrompt("x", ["scene", "product", "logo"])).toContain("image 2: product (essential, reproduce faithfully)");
    // Sans photo de produit (une prestation), rien n'est joint.
    const sans = await planche({ slots: ["hero"] });
    expect(sans.timeline.find((t) => t.kind === "draw")!.product).toBe(false);
  });

  epreuve("bougie-cire-et-meche", async () => {
    const { r, timeline } = await planche({ slots: ["hero"], photos: 3, verdict: (_s, n) => (n === 1 ? { ok: false, score: 5, why: "ressemble à un pot de confiture (matière rouge granuleuse, aucune mèche)" } : n === 2 ? { ok: false, score: 6, why: "L'étiquette du bocal est vierge : un grand cadre vide" } : { ok: true, score: 9 }) });
    const dessins = timeline.filter((t) => t.kind === "draw" && t.slot === "hero");
    expect(dessins).toHaveLength(3);
    expect(dessins[1].prompt).toContain("ressemble à un pot de confiture (matière rouge granuleuse, aucune mèche)");
    expect(dessins[2].prompt).toMatch(/aucune mèche[\s\S]*étiquette du bocal est vierge/);
    expect(dessins.every((d) => d.product)).toBe(true);
    // Le relecteur compare au vrai produit : une partie qui le définit absente, une étiquette vierge, un autre contenant.
    expect(I.PRODUIT_A_COMPARER).toMatch(/une partie qui le définit absente, une étiquette vierge ou un contenant différent de sa photo sont un défaut/);
    expect(r.route.board.images?.hero).toBeTruthy();
  });

  epreuve("personne-sans-accord-ecrit", async () => {
    const P = await import("@/lib/syna-agent/brand-prompts");
    const { timeline } = await planche({ slots: ["hero"] });
    expect(timeline.find((t) => t.kind === "draw")!.prompt).toMatch(/Aucune personne, aucun visage, aucune main\./);
    expect(P.imageReviewSystem()).toMatch(/- une personne, un visage ou une main apparaît ;/);
    expect(fs.readFileSync("src/lib/syna-agent/tools/gallery.ts", "utf8")).toContain("if (a.people && !peopleAllowed(p.id) && !(a.accordEcrit && ditParLeClient(ctx.conversationId, a.accordEcrit)))");
  });

  epreuve("le-mot-maquette", async () => {
    // Le haut du site refusé à chaque reprise : ce qui est dit au client.
    const { r } = await planche({ slots: ["site"], verdict: (s) => (s === "site" ? { ok: false, why: "écran à moitié vide" } : { ok: true, score: 9 }) });
    const dit = r.issues.join(" ");
    expect(dit).toMatch(/le haut de ton site/);
    expect(dit).not.toMatch(/maquette/i);
  });

  epreuve("logo-sur-fond-sombre", async () => {
    const x = { ...route("A"), ground: "sombre", palette: { ...route("A").palette, dark: "#101418" } };
    const clair = await I.logoForGround(await logoSimple(), x as never);
    const { data, info } = await sharp(clair!).raw().toBuffer({ resolveWithObject: true });
    // Le centre d'une lettre du nom (foncée sur le logo d'origine) est clair sur le fond sombre.
    const px = (xx: number, yy: number) => { const i = (yy * info.width + xx) * info.channels; return (data[i] + data[i + 1] + data[i + 2]) / 3; };
    const sx = Math.round((120 / 640) * info.width), sy = Math.round((235 / 480) * info.height);
    expect(px(sx, sy)).toBeGreaterThan(200);
  });

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « serie-logo-completement-different ».
  epreuve("logo-demande-nue", () => {});

  epreuve("logo-clair-creux-des-lettres", async () => {
    const { createCanvas } = await import("@napi-rs/canvas");
    const { font } = await import("@/lib/media/fonts");
    // « Halo » et « oe » en lettres fermées, bleu foncé sur fond blanc (comme un logo rendu par le dessinateur).
    const c = createCanvas(900, 320), g = c.getContext("2d");
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, 900, 320);
    g.fillStyle = "#1E2A44"; g.font = font("Inter", 700, 200); g.textBaseline = "alphabetic"; g.fillText("Halo oe", 40, 240);
    const png = c.toBuffer("image/png");
    // Le centre de chaque creux, mesuré sur l'image d'origine : un point blanc entouré d'encre de tous côtés.
    const src = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    const blancAt = (xx: number, yy: number) => src.data[(yy * src.info.width + xx) * src.info.channels] > 240;
    const enferme = (xx: number, yy: number) => {
      // Au cœur du creux : blanc tout autour, à 4 points près (loin du trait de la lettre).
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (!blancAt(xx + dx, yy + dy)) return false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let k = 1; while (xx + dx * k >= 0 && xx + dx * k < src.info.width && yy + dy * k >= 0 && yy + dy * k < src.info.height && blancAt(xx + dx * k, yy + dy * k)) k++; if (xx + dx * k < 0 || xx + dx * k >= src.info.width || yy + dy * k < 0 || yy + dy * k >= src.info.height || k > 120) return false; }
      return true;
    };
    const creux: [number, number][] = [];
    for (let yy = 150; yy < 230; yy += 4) for (let xx = 40; xx < 860; xx += 4) if (enferme(xx, yy)) creux.push([xx, yy]);
    expect(creux.length).toBeGreaterThan(10);
    // La version claire posée sur le foncé de la marque : chaque creux prend le fond sombre, jamais du blanc.
    const x = { ...route("A"), ground: "sombre", palette: { ...route("A").palette, dark: "#101418" } };
    const clair = (await I.logoForGround(png, x as never))!;
    const out = await sharp(clair).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    // Les deux images ne font pas la même taille (fond retiré, marges) : on retrouve les creux dans la version claire
    // par la position relative des lettres (le dessin rogné puis entouré d'une marge égale).
    const det = await import("@/lib/media/detourage-logo");
    const d = await det.detourerLeLogo(png);
    expect(d.ok).toBe(true);
    const meta = await sharp(png).trim({ threshold: 5 }).toBuffer({ resolveWithObject: true });
    const ox = -(meta.info.trimOffsetLeft ?? 0), oy = -(meta.info.trimOffsetTop ?? 0);
    const pad = Math.round((out.info.width - meta.info.width) / 2);
    let blancs = 0;
    for (const [xx, yy] of creux) {
      const X = xx - ox + pad, Y = yy - oy + pad, i = (Y * out.info.width + X) * out.info.channels;
      const lum = (out.data[i] + out.data[i + 1] + out.data[i + 2]) / 3;
      if (lum > 200) blancs++;
    }
    expect(blancs).toBe(0);
    // Le dessin, lui, est passé en clair.
    expect(fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8")).toContain("return onDarkVersion(d?.ok ? d.png : png, null, light);");
  });

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « serie-logo-completement-different ».
  epreuve("trait-pres-du-nom-un-par-serie-au-relecteur", () => {});

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « relecteur-du-logo-qualite-seule ».
  epreuve("refus-et-consigne-apres-la-demande-nue", () => {});

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « demande-du-logo-couleurs-typo-fond ».
  epreuve("serie-logo-completement-different", () => {});

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « logo-refait-une-fois-avec-ses-raisons ».
  epreuve("trois-fois-le-meme-dessin", () => {});
});

describe("les épreuves du site et des marques (contrôles du Studio)", async () => {
  epreuve("bouton-coupe-sur-telephone", () => {
    const css = fs.readFileSync("public/sections/tenue.css", "utf8");
    expect(css).toMatch(/\.ctw\[data-tn-bouton="ombre"\] \.tn \.tn-bt\{position:relative;z-index:1\}/);
    expect(css).toMatch(/\.ctw\[data-tn-bouton="ombre"\] \.tn>\.tn-bt:last-child[^{]*\{margin-bottom:8px\}/);
  });

  epreuve("photo-en-arche", async () => {
    const { sansArche } = await import("@/lib/syna-agent/custom-theme/tenue");
    expect(sansArche("niche")).toBe("droit");
  });

  epreuve("fond-blanc-permis", async () => {
    const VM = await import("@/lib/syna-agent/variete-marques");
    const x = { ...route("A"), palette: { ...route("A").palette, light: "#FFFFFF" } };
    // Toutes les marques récentes ont un fond blanc : un fond blanc n'est jamais refusé ni remplacé.
    expect(VM.fondDeRemplacement(x as never, ["#FFFFFF", "#FFFFFF", "#FFFFFF"])).toBeNull();
  });

  epreuve("sites-trop-semblables", async () => {
    const VS = await import("@/lib/syna-agent/custom-theme/variete-sites");
    const mine = { pages: { home: ["ouverture:a", "galerie:a", "temoins:a", "etapes:a", "contact:a"] }, utiles: ["home"] };
    const autre = { pages: { home: ["ouverture:b", "galerie:b", "temoins:b", "etapes:b", "contact:b"] }, utiles: ["home"] };
    expect(VS.varieteSitesGaps(mine, [autre]).join(" ")).toMatch(/accueil : 4 pièces en commun/);
    expect(VS.ACCUEIL_COMMUNES_MAX).toBe(2);
  });
});

describe("les épreuves du socle (fiche et verrous)", async () => {
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const J = await import("@/lib/syna-agent/journey");
  const F = await import("@/lib/syna-agent/fiche");
  const V = await import("@/lib/syna-agent/verrous");
  // Le symbole tiré du logo est un dessin de logo : son devis prend le tarif du modèle imposé des logos (23 novembre 2026).
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();

  epreuve("marque-finie-jamais-sans-logo", async () => {
    const T = await import("@/lib/syna-agent/tools/identity");
    const { threadView, confirmationText } = await import("@/lib/syna-agent/loop");
    const { getTool } = await import("@/lib/syna-agent/registry");
    const user = await account(), projectId = project(user, "services") as string, cid = threadFor(user, projectId);
    // La marque finie, choisie, dont le logo est resté refusé après ses reprises.
    J.updateJourney(cid, (j) => {
      const a = { ...route("A"), board: { ...route("A").board, images: { hero: { id: "hero1", w: 1, h: 1 } } } };
      j.identities = { list: [a as never], issues: [], comparison: "", at: 1, round: 1 };
      for (const n of [0, 1]) J.setStep(j, n, "done");
      j.identityChoice = { key: "A", mix: {}, at: 1 };
      j.brandFinish = { prepaidMicro: 0, images: { hero: { id: "hero1", w: 1, h: 1 } }, at: 2, issues: ["Ta marque n'est pas encore finie : son logo n'a pas passé ma relecture, même après mes reprises."], logoFrom: null, manque: ["logo"] };
    });
    const j = J.journeyOf(cid);
    // Elle n'est pas montrée comme finie ; SINA ne la présente pas et propose de refaire le logo à sa charge.
    expect(threadView(user, cid).journey.identities!.final).toMatchObject({ finished: false });
    expect(J.journeyContext(j)).toMatch(/La marque — elle N'EST PAS finie[\s\S]*logo\.pistes \(planche = son identité\)[\s\S]*brand\.finish refait ce qui le porte[\s\S]*« À ma charge : 0 % de ton budget »/);
    expect(J.journeyContext(j)).not.toMatch(/sa marque complète est affichée/);
    // La carte d'accord : à la charge du Studio, jamais comptée au client. Le logo se fait par la méthode des graphistes.
    const ctx: any = { user, conversationId: cid, runId: "epreuve-logo", projectId, attachment: () => null };
    await expect(Promise.resolve().then(() => getTool("brand.finish")!.estimate!(ctx, {} as never))).rejects.toThrow(/méthode des graphistes, à ta charge \(logo\.pistes/);
    const est = await getTool("logo.pistes")!.estimate!(ctx, { planche: "A" } as never);
    expect(est).toMatchObject({ studio: true });
    expect(await confirmationText(getTool("logo.pistes")!, { planche: "A" }, ctx, user.id, projectId, est)).toContain("À ma charge : 0 % de ton budget");
    // Le logo posé, ce qui le porte est refait à la charge du Studio.
    J.updateJourney(cid, (x) => { if (x.brandFinish) { delete x.brandFinish.manque; x.brandFinish.studio = true; } });
    expect(await getTool("brand.finish")!.estimate!(ctx, {} as never)).toMatchObject({ studio: true });
    expect((await getTool("brand.finish")!.estimate!(ctx, { redo: ["hero"] } as never)).studio).toBeFalsy(); // un autre changement reste un goût du client
    void T;
    // Plus aucun nom dessiné en secours dans la marque finie, et la reprise part à la charge du Studio.
    const fin = fs.readFileSync("src/lib/syna-agent/brand-finish.ts", "utf8");
    expect(fin).not.toContain("savePlancheLogo(");
    expect(fin).toContain("if (!manqueLogo && loadProject(o.projectId).brand?.logo.assetId) {");
    expect(fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8")).toContain("return a.studio && j.brandFinish?.studio ? aLaChargeDuStudio(finir) : finir();");
  });

  epreuve("etape-validee-qui-bouge", async () => {
    const user = await account(), projectId = project(user, "services") as string, cid = threadFor(user, projectId);
    J.updateJourney(cid, (j) => { for (const n of [0, 1, 2, 3]) J.setStep(j, n, "done"); j.identityChoice = { key: "A", mix: {}, at: 1 }; });
    V.apresValidation(cid, "brand.kit_validate", { ok: true, summary: "ok" });
    for (const t of ["brand.finish", "identity.images", "identity.propose"]) expect(V.refusVerrou(cid, t), t).toMatchObject({ ok: false });
  });

  epreuve("creation-coupee-reprise-sans-repayer", async () => {
    const { run, id, now } = await import("@/lib/db");
    const T = await import("@/lib/syna-agent/tools/identity");
    const { SINA_BRAND_JOB } = await import("@/lib/syna-agent/brand-chain");
    const user = await account(), projectId = project(user, "services") as string, job = id(), t = now();
    // Arrêtée en route après l'étude et 2 images payées (0,40 € gardés).
    run("INSERT INTO jobs (id, user_id, project_id, type, payload, status, checkpoint, run_at, created_at, updated_at, finished_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", job, user.id, projectId, SINA_BRAND_JOB, JSON.stringify({ projectId, capMicro: 2_000_000, finish: true }), "cancelled", JSON.stringify({ "brand:study": {}, "brand:image:1:A:logo": {}, "brand:image:1:A:object": {} }), t, t, t, t);
    run("INSERT INTO ai_reservations (id, user_id, amount, status, job_id, project_id, actual, created_at, result) VALUES (?,?,?,?,?,?,?,?,?)", id(), user.id, 300_000, "settled", job, projectId, 200_000, t, "{}");
    run("INSERT INTO ai_reservations (id, user_id, amount, status, job_id, project_id, actual, created_at, result) VALUES (?,?,?,?,?,?,?,?,?)", id(), user.id, 300_000, "settled", job, projectId, 200_000, t, "{}");
    const c = T.marqueCoupee(projectId)!;
    expect(c.id).toBe(job);
    expect(T.marqueOuArretee(c.etapes)).toBe("déjà fait et gardé : l'étude de ton marché, 2 images");
    // La carte ne montre que ce qui reste : le plafond moins ce qui est payé et repris.
    expect(T.relanceMarqueQuote(c).maxMicro).toBe(1_600_000);
  });

  epreuve("questions-groupees-reponse-incomplete", async () => {
    const { addMessage } = await import("@/lib/syna-agent/store");
    const { getTool } = await import("@/lib/syna-agent/registry");
    const PR = await import("@/lib/syna-agent/custom-theme/preuves");
    const { clientNotes } = await import("@/lib/syna-agent/custom-theme/site-facts");
    const user = await account(), projectId = project(user, "services") as string, cid = threadFor(user, projectId);
    // SINA pose ensemble ses questions simples sur les preuves ; le client ne répond qu'à deux d'entre elles.
    addMessage(cid, "assistant", { message: "1) Tes avis déjà reçus ? 2) Ton assurance ? 3) Depuis quand tu exerces ? 4) Tes réalisations ?" }, null);
    addMessage(cid, "user", { text: "J'ai 23 avis Google à 4,8. Je suis assuré en décennale." }, null);
    const note = getTool("start.note")!, ctx: any = { user, conversationId: cid, runId: "epreuve", projectId, attachment: () => null };
    const r = await note.run(ctx, note.args.parse({ notes: [{ sujet: "avis", value: "23 avis Google à 4,8", portee: "site" }, { sujet: "assurance", value: "assuré en décennale", portee: "site" }] }));
    expect(r.ok).toBe(true);
    // Chaque réponse donnée est notée dans sa fiche, relue en entier par SINA.
    const fiche = F.ficheDuFil(cid, projectId);
    expect(fiche).toContain("- avis : « 23 avis Google à 4,8 »");
    expect(fiche).toContain("- assurance : « assuré en décennale »");
    // Seul ce qui manque reste à demander : ni les avis ni l'assurance ne reviennent.
    const p = PR.preuvesDe(clientNotes(projectId));
    expect(p.a.map((x) => x.id)).toEqual(expect.arrayContaining(["avis", "qualifications"]));
    expect(p.manque.map((x) => x.id)).not.toEqual(expect.arrayContaining(["avis"]));
    expect(p.manque.map((x) => x.id)).not.toContain("qualifications");
    expect(p.manque.map((x) => x.id)).toContain("anciennete");
    // Une réponse que le client n'a pas donnée n'est jamais notée à sa place.
    const faux = await note.run(ctx, note.args.parse({ notes: [{ sujet: "ancienneté", value: "depuis 2009", portee: "site" }] }));
    expect(faux.ok).toBe(false);
  });

  epreuve("fiche-relue-en-entier", async () => {
    const user = await account(), projectId = project(user, "services") as string, cid = threadFor(user, projectId);
    J.updateJourney(cid, (j) => { J.setStep(j, 0, "done"); });
    F.addNotes(cid, [{ sujet: "le style plombier", value: "surtout pas de goutte d'eau", genre: "refuse", portee: "logo" }]);
    const ctx = J.journeyContext(J.journeyOf(cid), { fiche: F.ficheDuFil(cid, projectId) });
    expect(ctx).toContain("## Ce qu'il refuse\n- le style plombier : « surtout pas de goutte d'eau » (pour le logo,");
  });
  epreuve("faire-connaissance-une-question-a-la-fois", async () => {
    const { submitMessage, runAgent } = await import("@/lib/syna-agent/loop");
    const { runWithLang } = await import("@/lib/i18n-server");
    const { defautsDuMessage } = await import("@/lib/syna-agent/controle-message");
    const regle = { etape: 0, payant: () => false, lance: false };
    // Quatre coordonnées d'un coup, puis deux questions : refusés ; une seule question : permise.
    expect(defautsDuMessage({ message: "Super !", question: { text: "Donne-moi ton nom, ton adresse, ton e-mail et ton téléphone." }, actions: [] }, regle)).toHaveLength(1);
    expect(defautsDuMessage({ message: "Tu vends en ligne ?", question: { text: "Et tu livres où ?" }, actions: [] }, regle)).toHaveLength(1);
    expect(defautsDuMessage({ message: "Des bougies, j'adore.", question: { text: "Pour qui les fais-tu ?" }, actions: [] }, regle)).toEqual([]);
    // Dans la vraie boucle : le message groupé ne part pas, SINA le réécrit avec la remarque.
    const user = await account(), cid = threadFor(user, null);
    const r = submitMessage(user, cid, { requestId: `epreuve-${Math.random()}`, text: "Je fais des bijoux." });
    const notes: string[] = [];
    await runWithLang({ ui: "fr", content: "fr" }, () => runAgent(r.id, r.job_id!, { reason: async (c) => {
      notes.push(String(c.context ?? ""));
      return notes.length === 1
        ? { message: "Top !", actions: [], question: { text: "Quel est ton nom, ton adresse e-mail et ton téléphone ?" }, done: false }
        : { message: "Top !", actions: [], question: { text: "Comment s'appelle ta marque ?" }, done: false };
    } }));
    expect(notes).toHaveLength(2);
    expect(notes[1]).toContain("c'est une question à la fois");
    const { all } = await import("@/lib/db");
    const sent = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='assistant'", cid).map((m) => JSON.parse(m.content_json));
    expect(sent.at(-1).question.text).toBe("Comment s'appelle ta marque ?");
  });

  epreuve("c-est-parti-avant-la-carte", async () => {
    const { defautsDuMessage } = await import("@/lib/syna-agent/controle-message");
    const payant = (t: string) => t === "identity.propose";
    expect(defautsDuMessage({ message: "C'est parti, je crée tes identités !", actions: [{ tool: "identity.propose" }] }, { etape: 1, payant, lance: false })).toHaveLength(1);
    // Rien de lancé pendant la demande : pas de départ annoncé non plus.
    expect(defautsDuMessage({ message: "C'est parti !", actions: [] }, { etape: 1, payant, lance: false })).toHaveLength(1);
    // Après l'accord, la création lancée : l'annonce est juste.
    expect(defautsDuMessage({ message: "C'est parti, tes identités sont en cours.", actions: [] }, { etape: 1, payant, lance: true })).toEqual([]);
    expect(defautsDuMessage({ message: "Je te propose trois identités ; la carte te montre le prix.", actions: [{ tool: "identity.propose" }] }, { etape: 1, payant, lance: false })).toEqual([]);
  });

  epreuve("carte-qui-vouvoie", async () => {
    const { confirmationText } = await import("@/lib/syna-agent/loop");
    const { tutoie } = await import("@/lib/ai/budget-pct");
    const user = await account(), projectId = project(user) as string;
    const t: any = { name: "essai.payant", description: "Essai.", estimate: () => ({ maxMicro: 2_000_000, label: "x" }) };
    const txt = await confirmationText(t, {}, {} as never, user.id, projectId, { label: "tes trois identités", probableMicro: 1_000_000, maxMicro: 2_000_000 });
    expect(txt).not.toMatch(/\b(votre|vous|vos)\b/i);
    expect(txt).toMatch(/de ton budget IA/);
    expect(tutoie("≈ 3 % de votre budget IA")).toBe("≈ 3 % de ton budget IA");
  });

  epreuve("acheteuses-inconnues-sina-propose", async () => {
    const cid = threadFor(await account(), null);
    J.updateJourney(cid, (j) => { j.start.business = { value: "products", at: Date.now() } as never; j.start.offer = { value: "Des bijoux en argent faits main.", at: Date.now() } as never; });
    const ctx = J.journeyContext(J.journeyOf(cid));
    expect(ctx).toContain("S'il ne sait pas, ne lui renvoie pas la question : propose-lui toi-même deux ou trois types d'acheteurs probables pour son offre");
  });
  epreuve("mots-corriges-relus-par-sina", async () => {
    const { submitMessage, runAgent } = await import("@/lib/syna-agent/loop");
    const { runWithLang } = await import("@/lib/i18n-server");
    const { addWordingRule } = await import("@/lib/client-wording");
    const user = await account(), projectId = project(user) as string, cid = threadFor(user, projectId);
    addWordingRule(projectId, { avoid: "boutique", use: "atelier" });
    expect(J.currentStep(J.journeyOf(cid))).toBe(0);
    const r = submitMessage(user, cid, { requestId: `epreuve-${Math.random()}`, text: "Bonjour." });
    let ctx = "";
    await runWithLang({ ui: "fr", content: "fr" }, () => runAgent(r.id, r.job_id!, { reason: async (c) => { ctx = String(c.context ?? ""); return { message: "Bonjour !", actions: [], done: true }; } }));
    expect(ctx).toContain("## Ses mots (corrigés une fois, valables pour toujours)\n- « atelier », jamais « boutique »");
  });
  epreuve("fil-ecrit-une-seule-fois", async () => {
    const { submitMessage, runAgent } = await import("@/lib/syna-agent/loop");
    const { runWithLang } = await import("@/lib/i18n-server");
    const user = await account(), cid = threadFor(user, null);
    const fils: string[][] = [], apart: string[] = [];
    const reason = async (c: any) => {
      fils.push(c.history ?? []); apart.push(String(c.context ?? ""));
      // Premier pas de chaque demande : un outil dont le résultat est long ; second pas : la réponse.
      return fils.length % 2 === 1 ? { message: "", actions: [{ tool: "start.state", args: {} }], done: false } : { message: "Merci, je note.", actions: [], done: true };
    };
    for (const text of ["Je fais des bougies.", "Je les vends en ligne.", "Et sur les marchés."]) {
      const r = submitMessage(user, cid, { requestId: `epreuve-${Math.random()}`, text });
      await runWithLang({ ui: "fr", content: "fr" }, () => runAgent(r.id, r.job_id!, { reason }));
    }
    expect(fils.length).toBe(6);
    // Chaque envoi commence par TOUT ce que le précédent avait envoyé, au caractère près.
    for (let i = 1; i < fils.length; i++) expect(fils[i].slice(0, fils[i - 1].length)).toEqual(fils[i - 1]);
    // Un résultat d'outil y est court dès son entrée (jamais plus de 300 caractères de données).
    for (const b of fils.at(-1)!.filter((x) => x.includes("[résultat "))) expect((/données : (.*)$/m.exec(b)?.[1] ?? "").length).toBeLessThanOrEqual(300);
  });
  epreuve("erreur-de-sina-jamais-comptee", async () => {
    const billing = await import("@/lib/billing");
    const { one, run } = await import("@/lib/db");
    const user = await account();
    billing.getSubscription(user.id);
    run("UPDATE subscriptions SET status='active', plan='vendre', billing='month' WHERE user_id=?", user.id);
    billing.alignPeriod(user.id, Date.now());
    billing.syncAllowance(user.id);
    run("UPDATE wallets SET monthly_used = monthly_allowance, topup_balance = 0 WHERE user_id = ?", user.id);
    const avant = one<{ monthly_used: number }>("SELECT monthly_used FROM wallets WHERE user_id=?", user.id)!.monthly_used;
    const rid = billing.aLaChargeDuStudio(() => billing.reserve(user.id, 30_000, { task: "image_generation", provider: "openai", model: "gpt-image-2.6-flare" }));
    billing.settle(rid, 25_000, "epreuve", "image refaite");
    expect(one<{ monthly_used: number }>("SELECT monthly_used FROM wallets WHERE user_id=?", user.id)!.monthly_used).toBe(avant);
    expect(one<{ amount: number }>("SELECT amount FROM ledger WHERE user_id=? AND type='studio'", user.id)!.amount).toBe(-25_000);
    const fs = await import("node:fs");
    expect(fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8")).toMatch(/aLaChargeDuStudio\(\(\) => reason\(user, run0, jobId, step, deps, noteDeControle/);
    expect(fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8")).toMatch(/aLaChargeDuStudio\(\(\) => reason\(user, r, jobId, step, deps, reviewNote/);
    expect(fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8")).toContain("retry ? aLaChargeDuStudio(");
  });
  epreuve("reprise-du-studio-jamais-bloquee-par-la-carte", async () => {
    const billing = await import("@/lib/billing");
    const { one, run } = await import("@/lib/db");
    const { withTrace, CostCapReached, depensesDeLaTache } = await import("@/lib/ai/trace");
    const { borneDuStudioDe } = await import("@/lib/ai/borne-du-studio");
    const user = await account();
    billing.getSubscription(user.id);
    run("UPDATE subscriptions SET status='active', plan='vendre', billing='month' WHERE user_id=?", user.id);
    billing.alignPeriod(user.id, Date.now());
    billing.syncAllowance(user.id);
    const carte = 1_380_000, essai = carte / 3, meta = { task: "image_generation", provider: "openai", model: "gpt-image-2.6-flare" };
    const paye = (studio: boolean) => { const rid = studio ? billing.aLaChargeDuStudio(() => billing.reserve(user.id, essai, meta)) : billing.reserve(user.id, essai, meta); billing.settle(rid, essai, null, "logo"); };
    const jobId = `epreuve-${Math.random()}`, payload = { capMicro: carte };
    const avant = one<{ monthly_used: number }>("SELECT monthly_used FROM wallets WHERE user_id=?", user.id)!.monthly_used;
    await withTrace({ jobId, costCapMicro: carte, studioCapMicro: borneDuStudioDe(payload) }, async () => {
      // Trois logos, trois essais chacun : le premier compté au client, les deux reprises à la charge du Studio.
      for (let i = 0; i < 3; i++) { paye(false); paye(true); paye(true); }
      expect(depensesDeLaTache(jobId)).toMatchObject({ client: carte, studio: 2 * carte });
      // La carte est pleine : le client ne prend pas la borne du Studio.
      expect(() => paye(false)).toThrow(CostCapReached);
      // Budget du mois épuisé : une reprise du Studio n'y est pas soumise (la borne est pleine ici : elle s'arrête là).
      run("UPDATE wallets SET monthly_used = monthly_allowance WHERE user_id = ?", user.id);
      expect(() => paye(true)).toThrow(CostCapReached);
    });
    expect(one<{ monthly_used: number }>("SELECT monthly_used FROM wallets WHERE user_id=?", user.id)!.monthly_used - avant).toBeGreaterThanOrEqual(carte);
    await withTrace({ jobId: `${jobId}-2`, costCapMicro: carte, studioCapMicro: borneDuStudioDe(payload) }, async () => { paye(true); });
    // Les chaînes ne bloquent pas une reprise du Studio par le reste de la carte : la dépense comptée au client l'exclut.
    expect(fs.readFileSync("src/lib/syna-agent/budget.ts", "utf8")).toContain("return depensesDeLaTache(jobId).client;");
  });
  epreuve("charge-du-studio-jamais-au-budget-du-client", async () => {
    const billing = await import("@/lib/billing");
    const { one, run } = await import("@/lib/db");
    const { withTrace, selonLaCharge, chargeDuStudio, depensesDeLaTache } = await import("@/lib/ai/trace");
    const { borneDuStudioDe } = await import("@/lib/ai/borne-du-studio");
    const { confirmationText } = await import("@/lib/syna-agent/loop");
    const user = await account();
    billing.getSubscription(user.id);
    run("UPDATE subscriptions SET status='active', plan='vendre', billing='month' WHERE user_id=?", user.id);
    billing.alignPeriod(user.id, Date.now());
    billing.syncAllowance(user.id);
    // La carte de Nadia : finir ses planches (les logos de Sillage et de Halo), « À ma charge : 0 % de ton budget ».
    const est = { label: "finir tes planches : 1 image qui manque", maxMicro: 765_584, studio: true };
    expect(await confirmationText({ name: "identity.images", description: "x" } as any, {}, {} as any, user.id, null, est)).toContain("À ma charge : 0 % de ton budget, rien n'est compté pour toi.");
    const payload = { capMicro: est.maxMicro, studioCapMicro: 2_296_752, imagesOnly: true, images: true, redo: ["A", "B"], slots: ["logo"], studio: true };
    const engage = () => one<{ m: number; r: number; t: number; rt: number }>("SELECT monthly_used m, reserved r, topup_balance t, reserved_topup rt FROM wallets WHERE user_id=?", user.id)!;
    const jobId = `epreuve-nadia-${Math.random()}`;
    // Chaque appel tel que le moteur le fait : le texte (llm.ts) ne se dit « reprise » qu'à partir de la portée ; l'image
    // (media-providers.ts) et la recherche (web-search.ts) ne disent rien : c'est la portée de la tâche qui décide.
    const appels: { task: string; provider: string; model: string; micro: number; texte?: boolean }[] = [
      { task: "strategy", provider: "anthropic", model: "claude-opus-5-5", micro: 60_000, texte: true }, // l'idée en mots simples
      { task: "image_generation", provider: "openai", model: "gpt-image-2.6-flare", micro: 170_000 }, // logo de Sillage
      { task: "quality_control", provider: "anthropic", model: "claude-opus-5-5", micro: 45_000, texte: true }, // sa relecture
      { task: "image_generation", provider: "openai", model: "gpt-image-2.6-flare", micro: 170_000 }, // logo de Halo
      { task: "quality_control", provider: "anthropic", model: "claude-opus-5-5", micro: 45_000, texte: true }, // sa relecture
      { task: "image_generation", provider: "openai", model: "gpt-image-2.6-flare", micro: 170_000 }, // Halo refait (reprise)
      { task: "quality_control", provider: "anthropic", model: "claude-opus-5-5", micro: 45_000, texte: true },
      { task: "web_research", provider: "anthropic", model: "claude-opus-5-5", micro: 20_000 },
    ];
    const depart = engage();
    // Comme le worker : la tâche entière selon sa charge, dans la trace de la tâche (worker/index.ts).
    await withTrace({ jobId, studioCapMicro: borneDuStudioDe(payload) }, () => selonLaCharge(payload, async () => {
      for (const a of appels) {
        const rid = billing.reserve(user.id, Math.ceil(a.micro * 1.25), { task: a.task, provider: a.provider, model: a.model, ...(a.texte ? { studio: chargeDuStudio() } : {}) });
        expect(engage(), `${a.task} réservé`).toEqual(depart);
        billing.settle(rid, a.micro, null, a.task);
        expect(engage(), `${a.task} réglé`).toEqual(depart);
      }
      // Un résultat incertain se retient aussi sur le Studio, jamais sur le client.
      billing.settleUncertain(billing.reserve(user.id, 90_000, { task: "image_generation", provider: "openai", model: "gpt-image-2.6-flare" }), "coupure");
      expect(engage()).toEqual(depart);
    }));
    expect(depensesDeLaTache(jobId).client).toBe(0);
    // Le worker exécute toute tâche selon sa charge ; la réponse de SINA qui présente le résultat l'est aussi.
    expect(fs.readFileSync("worker/index.ts", "utf8")).toContain("selonLaCharge(ctx.payload, () => handlers[job.type](ctx))");
    const loop = fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8");
    expect(loop).toContain("let pasDuStudio = waited.length > 0 && waited.every((jid) => tacheDuStudio(");
    expect(loop).toContain("out = await selonLePas(() => reason(user, ce, jobId, step, deps));");
    // Une dépense déjà comptée au client se rend par le code, une seule fois.
    const fuite = `${jobId}-fuite`;
    run("INSERT INTO jobs (id, user_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)", fuite, user.id, "syna.brand", "marque", JSON.stringify(payload), "done", Date.now(), Date.now(), Date.now());
    await withTrace({ jobId: fuite }, async () => { const rid = billing.reserve(user.id, 50_000, { task: "image_generation", provider: "openai", model: "gpt-image-2.6-flare", studio: false }); billing.settle(rid, 40_000, null, "logo"); });
    expect(engage().m - depart.m).toBe(40_000);
    const { rendreLaChargeDuStudio } = await import("@/lib/ai/rattrapage-charge-du-studio");
    rendreLaChargeDuStudio();
    expect(engage()).toEqual(depart);
    expect(rendreLaChargeDuStudio().lignes.filter((l) => l.tache === fuite)).toEqual([]);
    expect(engage()).toEqual(depart);
  });
  epreuve("images-de-sina-toujours-openai", async () => {
    const { setJsonSetting } = await import("@/lib/settings");
    const { routeDesImagesDeSina } = await import("@/lib/ai/media-routing");
    const { boardImageRoute } = await import("@/lib/syna-agent/brand-images");
    const { mockupImageRoute } = await import("@/lib/syna-agent/mockup-code/tools");
    setJsonSetting("syna.mockup.image_route", "alibaba:qwen-image-3.0-pro");
    try { for (const r of [routeDesImagesDeSina(), boardImageRoute(), mockupImageRoute()]) expect(r.provider).toBe("openai"); }
    finally { setJsonSetting("syna.mockup.image_route", "openai:gpt-image-2.6-flare"); }
    // Le moteur commun : toute image hors d'OpenAI est refusée ou remplacée par la route de SINA, sauf l'outil du client.
    const src = fs.readFileSync("src/lib/ai/media-providers.ts", "utf8");
    expect(src).toContain('if (!d || task !== "image_generation" || d.provider === REQUIRED_SOCIAL_IMAGE_PROVIDER || outilChoisiParLeClient()) return d;');
    expect(src).toContain("if (mediaExclude.getStore()) return null;");
    // Atelier : seul le choix du client lui-même (« ensemble », « moi ») échappe à la règle.
    expect(fs.readFileSync("src/lib/image-v2/native-edit-approval.ts", "utf8")).toContain("const parLeClient=(r.mode??'moi')!=='sina'&&!!r.outil&&r.outil!==OUTIL_DE_SINA;");
  });
  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « logo-demande-nue ».
  epreuve("refus-du-client-toutes-tournures", () => {});
  epreuve("equipe-coupee-ne-fait-pas-tomber-la-marque", async () => {
    const C = await import("@/lib/syna-agent/brand-chain");
    const P = await import("@/lib/syna-agent/brand-prompts");
    const billing = await import("@/lib/billing");
    const { ReponseInexploitable } = await import("@/lib/ai/llm");
    // La demande tient dans sa limite : réflexion prévue (environ 14 000 jetons chez Nadia) et réponse ensemble.
    for (const id of ["team", "teamShort"] as const) expect(C.BRAND_CALLS[id].max).toBeGreaterThanOrEqual(C.BRAND_CALLS[id].reflexion + C.BRAND_CALLS[id].reponse);
    expect(P.teamSystem("produits")).not.toMatch(/Entre 40 et 70 noms/);
    // L'équipe « langue » du second tour coupée : refaite une fois, plus courte, à la charge du Studio.
    const vu: string[] = [];
    const ai = (coupees: string[]) => ({ ask: async (id: string, c: any) => {
      vu.push(`${id}${billing.chargeDuStudio() ? " (Studio)" : ""}`);
      if (coupees.includes(id)) throw new ReponseInexploitable("coupée", true);
      return c.schema.parse({ names: ["Un", "Deux", "Trois", "Quatre", "Cinq"].map((name) => ({ name })) });
    } });
    const ctx = { step: async (_k: string, fn: () => Promise<unknown>) => fn() };
    const path = P.teamPathsFor("produits", 4)[0], notes: string[] = [];
    const une = (coupees: string[]) => C.equipeDeNoms({ ctx: ctx as any, ai: ai(coupees) as any, kind: "produits", path, step: "brand:team:langue:1:2", id: "team-langue-2", prompt: "", ask: P.TEAM_ASK.second, notes });
    expect(await une(["team-langue-2"])).toHaveLength(5);
    expect(vu).toEqual(["team-langue-2", "team-langue-2-court (Studio)"]);
    // Coupée encore : la création continue sans elle (les autres équipes suffisent).
    expect(await une(["team-langue-2", "team-langue-2-court"])).toBeNull();
    expect(notes.join("")).toMatch(/la création continue avec les noms des autres équipes/);
    // Seule une panne de toutes les équipes arrête la création, avec une phrase claire.
    expect(fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8")).toContain("if (paths.length && !teams.length) throw new UserFacingError(L(\"Mes équipes de noms n'ont rendu aucune réponse lisible");
  });

  epreuve("titre-du-projet-coupe", async () => {
    const { provisionalName, TITRE_MAX } = await import("@/lib/syna-agent/tools/start");
    expect(provisionalName("Je fais des bougies parfumées que je coule à la main chez moi, près de Lyon")).toBe("Bougies parfumées");
    for (const t of ["Je fais des bougies parfumées que je coule à la main chez moi", "des savons artisanaux saponifiés à froid au lait de chèvre et aux huiles bio", "Je fais des tabourets en chêne massif tournés main", "Je répare les crevaisons"]) {
      const n = provisionalName(t);
      expect(n, t).not.toMatch(/provisoire/i);
      expect(n.length, t).toBeLessThanOrEqual(TITRE_MAX);
      expect(n, t).not.toMatch(/\s(à|a|la|le|les|de|du|des|que|qui|et|au|aux)$/i);
      // Un mot entier : chaque mot du titre est un mot de la phrase du client.
      if (n !== "Mon projet") for (const w of n.toLowerCase().split(/\s+/)) expect(t.toLowerCase().split(/[\s,.]+/), `${t} → ${n}`).toContain(w);
    }
  });
});

describe("l'épreuve de SINA qui prend les devants (planches incomplètes, aucun appel)", async () => {
  const J = await import("@/lib/syna-agent/journey");
  const { account, project, emptySpend } = await import("./conversation209-fixtures");
  const { openThread } = await import("@/lib/syna-agent/thread");
  const { accepterLaProposition } = await import("@/lib/syna-agent/devants-actions");
  const { ligneDesPlanchesAFinir } = await import("@/lib/syna-agent/devants");
  const { plancheDuBouton, PHRASE_PLANCHE_INCOMPLETE } = await import("@/lib/syna-agent/choix-planche");
  const { all, json } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();

  epreuve("sina-propose-de-finir-les-planches", async () => {
    const user = await account(), pid = project(user) as string;
    const cid = (await fr(() => openThread(user, pid))).conversationId;
    const noms = { A: "Sillage", B: "Halo", C: "Pénombre" } as const;
    J.updateJourney(cid, (x) => {
      x.steps[0] = { status: "done" };
      x.identities = { list: (["A", "B", "C"] as const).map((k) => { const r = route(k) as any; return { ...r, name: noms[k], board: { ...r.board, images: { hero: { id: `hero-${k}` }, site: { id: `site-${k}` } } } }; }), issues: [], comparison: "", at: 1, round: 1 } as any;
    });
    const avant = emptySpend();
    const v = await fr(() => openThread(user, pid));
    await fr(() => openThread(user, pid));
    const poses = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND role='assistant'", cid).map((m) => json<any>(m.content_json, {})).filter((c) => c.devants);
    expect(poses.map((c) => c.message)).toEqual(["Il manque le logo de Sillage, de Halo et de Pénombre. Je les finis à ma charge, ça ne te coûte rien. On y va ?"]);
    expect(emptySpend()).toEqual(avant);
    // Les anciens boutons : grisés tant que la planche est incomplète.
    const inc = v.journey!.identities!.incompletes!;
    expect(["Je prends Sillage", "Je prends Halo"].map((c) => plancheDuBouton(c, inc))).toEqual(["A", "B"]);
    expect(PHRASE_PLANCHE_INCOMPLETE.fr).toBe("Cette planche n'est pas encore complète : je la finis à ma charge, puis tu pourras la choisir.");
    expect(ligneDesPlanchesAFinir(cid, pid)).toMatch(/^# À DIRE EN PREMIER/);
    // « Oui, finis-les » : la carte à 0 %, aucune dépense pour le client.
    const w = await fr(() => accepterLaProposition(user, cid, poses[0].devants.empreinte));
    expect(w.run!.pending!.preview).toMatch(/À ma charge : 0 % de ton budget/);
    expect(ligneDesPlanchesAFinir(cid, pid)).toBe("");
    expect(emptySpend().calls).toBe(avant.calls);
  });
});

describe("les épreuves des trois ratés des logos de l'essai réel de Nadia (version 02570ae1)", async () => {
  const J = await import("@/lib/syna-agent/journey");
  const C = await import("@/lib/syna-agent/brand-chain");
  const { account, project } = await import("./conversation209-fixtures");
  const { openThread } = await import("@/lib/syna-agent/thread");
  const { runAgent, submitMessage, threadView, toolContext } = await import("@/lib/syna-agent/loop");
  const { addMessage, getRun } = await import("@/lib/syna-agent/store");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { getJob, JobContext } = await import("@/lib/jobs");
  const { saveAsset, getAsset, assetData } = await import("@/lib/library");
  const { chargeDuStudio } = await import("@/lib/billing");
  const { one, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();
  const sha = (b: Buffer) => crypto.createHash("sha256").update(b).digest("hex");
  const PHRASE_DE_NADIA = "Le logo de Halo ne me plaît pas trop, tu peux m'en faire un autre ?";
  const QUESTION_DE_SINA = "Qu'est-ce qui te gêne dans le logo de Halo : les lettres, le bleu, l'ellipse orange au-dessus, ou l'ensemble ?";
  const CONSIGNE = "Le client a dit : « Le logo de Halo ne me plaît pas trop, tu peux m'en faire un autre ? » Refaire les logos de Halo et de Pénombre : logo dessiné sur un fond blanc parfaitement uni ; pas de lettres bleues arrondies avec une ellipse orange.";
  const logo = (c: string) => sharp({ create: { width: 640, height: 480, channels: 3, background: "#FFFFFF" } }).composite(Array.from({ length: 6 }, (_v, i) => ({ input: { create: { width: 40, height: 90, channels: 3 as const, background: c } }, left: 140 + i * 60, top: 180 }))).png().toBuffer();

  /** Les planches de Nadia : Sillage et Halo avec un vrai logo gardé, Pénombre sans le sien (ou avec, selon l'essai). */
  async function nadia(penombreSansLogo: boolean) {
    const user = await account(), pid = project(user) as string, cid = (await fr(() => openThread(user, pid))).conversationId;
    const save = async (k: string, png: Buffer) => (await saveAsset({ projectId: pid, userId: user.id, data: png, name: `planche-${k}-logo.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "ready", meta: { synaBoard: { key: k, slot: "logo", round: 1, name: k } } })).id;
    const sillage = await logo("#6E2A5E");
    const ids: Record<string, string> = { A: await save("A", sillage), B: await save("B", await logo("#2B4C8C")), ...(penombreSansLogo ? {} : { C: await save("C", await logo("#E9A24F")) }) };
    const noms = { A: "Sillage", B: "Halo", C: "Pénombre" } as const;
    J.updateJourney(cid, (x) => {
      x.steps[0] = { status: "done" };
      x.identities = { list: (["A", "B", "C"] as const).map((k) => { const r = route(k) as any; return { ...r, name: noms[k], board: { ...r.board, descriptor: k === "C" ? "Bougies parfumées en cire de soja, Brignais" : "Bougies parfumées coulées à la main près de Lyon", images: { ...(ids[k] ? { logo: { id: ids[k] } } : {}), hero: { id: `hero-${k}` }, site: { id: `site-${k}` } } } }; }), issues: [], comparison: "", at: 1, round: 1 } as any;
    });
    return { user, pid, cid, sillage };
  }

  epreuve("jamais-de-question-sur-le-logo", async () => {
    const { defautsDuMessage, questionSurLeLogo } = await import("@/lib/syna-agent/controle-message");
    const regle = { etape: 1, payant: () => true, lance: false };
    expect(defautsDuMessage({ message: QUESTION_DE_SINA, actions: [] }, regle).join(" ")).toMatch(/On ne demande jamais au client ce qu'il veut ou non dans son logo/);
    for (const q of ["Tu préfères quelle couleur pour le logo ?", "Tu voudrais des lettres plus fines dans ton logo ?", "Qu'est-ce qui ne te plaît pas dans ce logo ?", "Quel style de logo tu imagines ?"]) expect(questionSurLeLogo({ message: q, actions: [] }), q).toBe(true);
    // Les questions permises passent.
    for (const q of ["Tu veux que je le refasse ?", "Tu veux que je refasse le logo de Halo ?", "Tu préfères Sillage, Halo ou Pénombre ?"]) expect(defautsDuMessage({ message: "Voici le logo de Halo.", question: { text: q }, actions: [] }, regle), q).toEqual([]);
    const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
    expect(SYNA_SYSTEM).toContain("Quand il demande un autre logo, tu dis simplement que tu en refais un, puis tu présentes la carte d'accord");
    // Dans la conversation : la question de l'essai réel est réécrite, à la charge du Studio ; la carte s'ouvre.
    const t = await nadia(false);
    const r = submitMessage(t.user, t.cid, { requestId: `req-${Math.random()}`, text: PHRASE_DE_NADIA });
    const studio: boolean[] = [];
    await fr(() => runAgent(r.id, r.job_id!, { reason: async () => { studio.push(chargeDuStudio()); return studio.length === 1 ? { message: QUESTION_DE_SINA, actions: [], question: null, done: false } : { message: "Je t'en refais un autre pour Halo. La carte te montre le prix.", actions: [{ tool: "logo.pistes", args: { planche: "B" } }], question: null, done: false }; } }));
    expect(studio).toEqual([false, true]);
    const v = await fr(() => threadView(t.user, t.cid));
    expect(v.messages.filter((m: any) => m.role === "assistant").map((m: any) => m.content?.message)).not.toContain(QUESTION_DE_SINA);
    // Un ancien projet passe lui aussi par la méthode des graphistes : de nouvelles pistes pour le nom de Halo, sur son budget.
    expect(v.run!.pending).toMatchObject({ tool: "logo.pistes", reason: "cost", args: { planche: "B" } });
    // Elle choisit ensuite son esquisse ; SINA la finit pour Halo, avec la carte (jamais une question sur le logo).
    const { travailDesPistes } = await import("@/lib/syna-agent/tools/logo");
    expect(travailDesPistes(J.journeyOf(t.cid), "B")).toMatchObject({ neuve: true, nom: "Halo", planche: "B", studio: false });
  });

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « esquisses-choisies-selon-le-forfait ».
  epreuve("logos-de-la-serie-dans-l-ordre", () => {});

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « finalisation-ecrite-par-le-plus-fort ».
  epreuve("pas-de-consigne-de-style-pour-un-logo", () => {});

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « planches-de-recherche-demande-exacte ».
  epreuve("demande-du-logo-couleurs-typo-fond", () => {});

  // Remplacée (méthode des graphistes) : l'ancienne série de logos est retirée ; ce qui reste vrai est rejoué par « relecteur-du-logo-fini ».
  epreuve("relecteur-du-logo-qualite-seule", () => {});
});

describe("les épreuves de la méthode des graphistes (24 novembre 2026)", async () => {
  const { finaliserUneEsquisse, consigneDeFinalisation, LIGNE_D_EVOLUTION, controleDuTexte, raisonsDuRefus } = await import("@/lib/syna-agent/logo-finalisation");
  const { demandeDeRecherche, lancerLesPlanches } = await import("@/lib/syna-agent/logo-recherche");
  const { requeteDePlanche, champsDeFinalisation } = await import("@/lib/ai/media-providers");
  const { basculer, messageDuChoix } = await import("@/lib/syna-agent/choix-esquisses");
  const NOM = "Halo", METIER = "une entreprise qui fabrique des bougies parfumées en cire végétale";
  const TEXTE = `Transforme cette esquisse en véritable logo contemporain pour ${NOM}, ${METIER}. Conserve l'idée centrale : un halo autour du H. Fais évoluer cette idée vers une identité plus aboutie et plus distinctive. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif`;
  const bon = { nomLu: NOM, ideeConservee: true, evolution: true, arche: false, phrase: "", phraseDitLeMetier: false, note: 9, pourquoi: "" };
  const png = () => sharp({ create: { width: 300, height: 120, channels: 3, background: "#FFFFFF" } }).composite([{ input: { create: { width: 200, height: 60, channels: 3, background: "#222222" } }, left: 50, top: 30 }]).png().toBuffer();

  epreuve("logo-refait-une-fois-avec-ses-raisons", async () => {
    const envoyes: string[] = [];
    const r = await finaliserUneEsquisse({
      rediger: async () => ({ idee_centrale: "un halo", texte: TEXTE }),
      finaliser: async (_e, t) => { envoyes.push(t); return png(); },
      relire: async () => ({ ...bon, note: 5 }),
      detourer: async (p) => ({ ok: true, png: p }),
      aLaChargeDuStudio: async (fn) => fn(),
    }, { nom: NOM, metier: METIER, esquisse: await png() });
    // Refusé deux fois : pas gardé, jamais un troisième essai ; la reprise porte les raisons du refus, en corrections au
    // début du texte (25 novembre 2026, reprise-du-logo-a-partir-du-refuse).
    expect(r.ok).toBe(false);
    expect(envoyes).toHaveLength(2);
    expect(envoyes[1]).toBe(`Corrige uniquement : il n'est pas au niveau (5/10, il faut 8) ; garde tout le reste à l'identique.\n\n${TEXTE}`);
    // L'identité n'est pas construite avec lui : SINA propose une autre esquisse.
    const { phraseDuLogoNonConstruit } = await import("@/lib/syna-agent/logo-graphistes");
    expect(phraseDuLogoNonConstruit(3, [3, 7, 11])).toMatch(/je ne construis pas cette identité avec lui\. Je te propose une autre esquisse parmi celles que tu as vues \(par exemple la 7\)/);
  });

  epreuve("esquisses-choisies-selon-le-forfait", async () => {
    const { controleDuChoix, esquissesAChoisir } = await import("@/lib/syna-agent/logo-graphistes");
    expect([esquissesAChoisir("creer"), esquissesAChoisir("vendre"), esquissesAChoisir("dominer")]).toEqual([2, 3, 4]);
    const etat = { max: 3, esquisses: [3, 7, 11, 12].map((numero) => ({ numero, assetId: "a", modele: "m", piste: "", tour: 1, recherche: 1, requestId: null })) };
    expect(controleDuChoix(etat, [3, 7, 11])).toBeNull();
    expect(controleDuChoix(etat, [7, 11])).toBeNull();
    expect(controleDuChoix(etat, [7])).toBeTruthy();
    expect(controleDuChoix(etat, [3, 7, 11, 12])).toBeTruthy();
    expect(controleDuChoix(etat, [5])).toBeTruthy();
    let sel: number[] = []; for (const n of [11, 3, 7, 12]) sel = basculer(sel, n, 3);
    expect(sel).toEqual([3, 7, 11]);
    expect(messageDuChoix(sel)).toBe("Je choisis les esquisses 3, 7 et 11");
    // Les logos finis partent dans l'ordre des numéros (la tâche les trie, quel que soit l'ordre donné).
    expect(fs.readFileSync("src/lib/syna-agent/logo-graphistes-tache.ts", "utf8")).toContain("for (const numero of [...new Set(numeros)].sort((x, y) => x - y)) {");
  });

  epreuve("finalisation-ecrite-par-le-plus-fort", async () => {
    const t = await import("@/lib/ai/text-models");
    expect(t.textModel("openai", "gpt-6.2-astra")).toMatchObject({ tier: "strong", vision: true, verified: true });
    const c = consigneDeFinalisation(NOM, METIER);
    expect(c).toContain(LIGNE_D_EVOLUTION);
    expect(c).not.toMatch(/#[0-9a-f]{6}/i);
    expect(controleDuTexte(TEXTE, NOM, METIER)).toEqual([]);
    expect(controleDuTexte("Un logo.", NOM, METIER).length).toBeGreaterThan(0);
    expect(champsDeFinalisation(TEXTE)).toEqual({ model: "gpt-image-2.6-sunburst", prompt: TEXTE, quality: "high", size: "auto", background: "opaque", output_format: "png", n: 1 });
    // Le rédacteur est GPT-6.2 Astra, route imposée (jamais un autre modèle) ; aucune consigne de SINA n'y entre.
    const src = fs.readFileSync("src/lib/syna-agent/logo-graphistes.ts", "utf8");
    expect(src).toContain('const ASTRA: Modele = { provider: "openai", model: "gpt-6.2-astra", effort: "medium" };');
    expect(src).toContain('...(a === "redaction" ? { expectedRoute: { provider: m.provider, model: m.model, effort: m.effort } } : {}),');
  });

  epreuve("planches-de-recherche-demande-exacte", async () => {
    const prompt = demandeDeRecherche({ nom: NOM, metier: { metier: METIER, court: "la bougie", piste: "savoir-faire" } });
    expect(prompt).not.toMatch(/couleur|typograph|#|fond blanc uni|refus|client/i);
    const vus: string[] = [];
    await lancerLesPlanches(async (m, p) => { vus.push(`${m}|${p}`); return { png: Buffer.from(""), requestId: null, usage: null, coutMicro: null }; }, prompt);
    expect(vus.sort()).toEqual([`gpt-image-2.5-sunburst|${prompt}`, `gpt-image-2.6-flare|${prompt}`]);
    expect(requeteDePlanche("gpt-image-2.5-sunburst", prompt)).not.toHaveProperty("complexity");
    expect(requeteDePlanche("gpt-image-2.6-flare", prompt)).toMatchObject({ complexity: "medium" });
    expect(demandeDeRecherche({ nom: NOM, metier: { metier: METIER, court: "la bougie", piste: "savoir-faire" }, eviter: ["un H auréolé"] })).toBe(`${prompt} Évite ces pistes déjà présentées : un H auréolé.`);
  });

  epreuve("couleurs-variees-dans-la-recherche", async () => {
    const metier = { metier: METIER, court: "la bougie", piste: "savoir-faire" as const };
    const prompt = demandeDeRecherche({ nom: NOM, metier });
    // La demande exacte des preuves, mot pour mot, puis la phrase des couleurs ; rien d'autre.
    expect(prompt).toBe(`Crée une planche de recherche graphique pour ${NOM}, ${METIER}. Présente six esquisses de logos contemporains sur une grille de trois colonnes et deux lignes. Explore différentes manières de traduire le savoir-faire de la bougie dans le dessin des lettres et des signes graphiques. Chaque piste doit pouvoir devenir une véritable marque commerciale. Travaille sur fond blanc, sans maquette de présentation. Varie les couleurs d'une esquisse à l'autre.`);
    const sansLaPhrase = prompt.replace(" Varie les couleurs d'une esquisse à l'autre.", "");
    expect(sansLaPhrase).not.toMatch(/couleur|typograph|#|fond blanc uni|refus|client/i);
    // Les deux planches en même temps, avec le même texte et les réglages des preuves.
    const vus: string[] = [];
    await lancerLesPlanches(async (m, p) => { vus.push(`${m}|${p}`); return { png: Buffer.from(""), requestId: null, usage: null, coutMicro: null }; }, prompt);
    expect(vus.sort()).toEqual([`gpt-image-2.5-sunburst|${prompt}`, `gpt-image-2.6-flare|${prompt}`]);
    expect(requeteDePlanche("gpt-image-2.5-sunburst", prompt)).not.toHaveProperty("complexity");
    expect(requeteDePlanche("gpt-image-2.6-flare", prompt)).toMatchObject({ complexity: "medium" });
    // « Évite ces pistes déjà présentées : … » vient seulement à la toute fin, après la phrase des couleurs.
    const avec = demandeDeRecherche({ nom: NOM, metier, eviter: ["un H auréolé", "une flamme dans le O"] });
    expect(avec).toBe(`${prompt} Évite ces pistes déjà présentées : un H auréolé ; une flamme dans le O.`);
    expect(avec.indexOf("Varie les couleurs")).toBeLessThan(avec.indexOf("Évite ces pistes"));
    // Ni typographie, ni goûts, ni logos joints, ni couleurs du client : la demande ne prend que le nom, le métier et « eviter ».
    const src = fs.readFileSync("src/lib/syna-agent/logo-recherche.ts", "utf8");
    expect(src).toContain("export function demandeDeRecherche(o: { nom: string; metier: Pick<Metier, \"metier\" | \"court\" | \"piste\">; eviter?: readonly string[] }): string {");
  });

  epreuve("relecteur-sans-refus-pour-trop-proche", async () => {
    const { RELECTEUR_DU_LOGO_FINI, RelectureDuLogoSchema, demandeAuRelecteurDuLogo } = await import("@/lib/syna-agent/logo-finalisation");
    const bien = { nomLu: NOM, ideeConservee: true, arche: false, phrase: "", phraseDitLeMetier: false, note: 9, pourquoi: "" };
    expect(raisonsDuRefus(bien, NOM)).toEqual([]);
    // Un logo fidèle, « trop proche de l'esquisse », n'est plus refusé : la question n'est plus posée, une réponse d'ancien format est ignorée.
    expect(raisonsDuRefus(RelectureDuLogoSchema.parse({ ...bien, evolution: false }), NOM)).toEqual([]);
    expect(Object.keys(RelectureDuLogoSchema.shape)).not.toContain("evolution");
    expect(RELECTEUR_DU_LOGO_FINI).not.toMatch(/evolution|évolu|trop proche|copie nettoyée/i);
    expect(demandeAuRelecteurDuLogo({ nom: NOM, metier: METIER, texte: TEXTE })).not.toMatch(/écart|indice|identiques/i);
    // Restent les refus : nom mal écrit (comparé par le code), idée perdue, arche, phrase inventée, note sous 8.
    for (const v of [{ nomLu: "Hal0" }, { ideeConservee: false }, { arche: true }, { phrase: "Lumière éternelle", phraseDitLeMetier: false }, { note: 7 }]) expect(raisonsDuRefus({ ...bien, ...v }, NOM)).toHaveLength(1);
    // Un fond que le Studio ne retire pas proprement fait refaire le logo (une fois, à la charge du Studio).
    const envoyes: string[] = [];
    let detourages = 0;
    const r = await finaliserUneEsquisse({
      rediger: async () => ({ idee_centrale: "un halo", texte: TEXTE }),
      finaliser: async (_e, t) => { envoyes.push(t); return png(); },
      relire: async () => bien,
      detourer: async (p) => (++detourages === 1 ? { ok: false, why: "le fond ne se retire pas proprement" } : { ok: true, png: p }),
      aLaChargeDuStudio: async (fn) => fn(),
    }, { nom: NOM, metier: METIER, esquisse: await png() });
    expect(r.ok).toBe(true);
    expect(envoyes).toEqual([TEXTE, `Corrige uniquement : le fond ne se retire pas proprement ; garde tout le reste à l'identique.\n\n${TEXTE}`]);
    // La ligne d'évolution du texte de finalisation reste.
    expect(consigneDeFinalisation(NOM, METIER)).toContain(LIGNE_D_EVOLUTION);
    // Le relecteur est le plus fort, effort élevé, un autre modèle que le rédacteur.
    const src = fs.readFileSync("src/lib/syna-agent/logo-graphistes.ts", "utf8");
    expect(src).toContain('logo: { input: 3_500, output: 1_500, max: 10_000, modele: "strong" as const, effort: "high" },');
  });

  epreuve("phrase-de-l-esquisse-au-choix-du-client", async () => {
    const E = await import("@/lib/syna-agent/esquisses");
    const P = await import("@/lib/syna-agent/phrase-sous-le-nom");
    const F = await import("@/lib/syna-agent/logo-finalisation");
    const G = await import("@/lib/syna-agent/logo-graphistes");
    const { messageDuChoixAvecPhrases } = await import("@/lib/syna-agent/choix-esquisses");
    const { runWithLang } = await import("@/lib/i18n-server");
    const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
    const SLOGAN = "La lumière coulée à la main";
    // La demande de recherche ne change pas : la phrase des couleurs, puis rien d'autre.
    expect(demandeDeRecherche({ nom: NOM, metier: { metier: METIER, court: "la bougie", piste: "savoir-faire" } })).toMatch(/sans maquette de présentation\. Varie les couleurs d'une esquisse à l'autre\.$/);
    // 1. La lecture : la phrase relevée mot pour mot (ou « aucune »), jugée par le relecteur, puis par le code.
    expect(E.RELECTEUR_DES_ESQUISSES).toMatch(/phraseSousLeNom : la petite phrase écrite sous le nom, recopiée mot pour mot/);
    expect(E.RELECTEUR_DES_ESQUISSES).toMatch(/phraseBienEcrite/);
    const c = [0, 1, 2].map((i) => ({ modele: "m", index: i, png: Buffer.from("x"), requestId: null }));
    const lu = (i: number, phraseSousLeNom: string, phraseBienEcrite: boolean) => ({ numero: i, entiere: true, morceauDeVoisine: false, nomLu: NOM, arche: false, ok: true, pourquoi: "", piste: `p${i}`, phraseSousLeNom, phraseBienEcrite });
    const a = E.appliquerLaRelecture(NOM, c, { esquisses: [lu(1, "aucune", false), lu(2, SLOGAN, true), lu(3, "La lumière coullllée", true)] }, 1);
    expect(a.refusees).toEqual([]);
    expect(a.gardees.map((g) => g.phrase?.ok)).toEqual([undefined, true, false]);
    expect(P.fautesEvidentes("Bougies made avec amour")).toContain("un mélange de français et d'anglais");
    expect(P.phraseDeLEsquisse(SLOGAN, false)?.ok).toBe(false);
    // Gardée dans la vue des esquisses.
    const esquisses = a.gardees.map((g, i) => ({ numero: i + 1, assetId: `a${i}`, modele: "m", piste: g.piste, tour: 1, recherche: 1, requestId: null, ...(g.phrase ? { phrase: g.phrase } : {}) }));
    expect(G.vueDesEsquisses({ nom: NOM, max: 3, esquisses, refusees: 0, planches: [], recherches: 1, notes: [], at: 1 }, (id) => id)!.list[1].phrase).toEqual({ texte: SLOGAN, ok: true });
    // 2. Le choix : le logo 1 avec la phrase de la 2, le logo 3 sans phrase, ou sa phrase à lui, mot pour mot.
    expect(await fr(() => G.controleDesPhrases({ esquisses }, [1, 3], [{ logo: 1, de: 2 }, { logo: 3, aucune: true }], []))).toEqual({ ok: true, phrases: { 1: { de: 2, texte: SLOGAN }, 3: { aucune: true } } });
    expect(await fr(() => G.controleDesPhrases({ esquisses }, [1, 3], [{ logo: 1, de: 3 }], []))).toMatchObject({ ok: false });
    expect(await fr(() => G.controleDesPhrases({ esquisses }, [1, 3], [{ logo: 1, texte: "Chez nous, la cire est vivante" }], ["Le logo 1 avec ma phrase : Chez nous, la cire est vivante"]))).toMatchObject({ ok: true });
    expect(await fr(() => G.controleDesPhrases({ esquisses }, [1, 3], [{ logo: 1, texte: "Chez nous la cire vit" }], ["Le logo 1 avec ma phrase : Chez nous, la cire est vivante"]))).toMatchObject({ ok: false });
    expect(messageDuChoixAvecPhrases([3, 7, 11], {})).toBe("Je choisis les esquisses 3, 7 et 11");
    expect(messageDuChoixAvecPhrases([1, 3], { 1: { de: 5, texte: SLOGAN } }, "en")).toBe(`I choose sketches 1 and 3. For logo 1: the line from sketch 5, “${SLOGAN}”.`);
    const T = await import("@/lib/syna-agent/logo-graphistes-tache");
    expect(T.PROPOSITION_DES_PHRASES()).not.toContain("?");
    // 3. La finalisation : sans choix, la consigne d'avant ; avec son choix, une seule ligne de plus ; contrôle mot pour mot.
    const t = await import("@/lib/ai/text-models");
    expect(t.textModel("openai", "gpt-6.2-astra")).toMatchObject({ tier: "strong", vision: true, verified: true });
    const sans = consigneDeFinalisation(NOM, METIER);
    expect(sans).toContain(LIGNE_D_EVOLUTION);
    expect(sans).toContain("- garde une ligne descriptive discrète seulement si elle dit exactement le métier du client ; toute autre phrase est retirée.\nN'ajoute aucune idée");
    expect(sans).not.toMatch(/#[0-9a-f]{6}/i);
    const voulue = { texte: SLOGAN };
    expect(consigneDeFinalisation(NOM, METIER, voulue).replace(`${F.ligneDeLaPhrase(voulue)}\n`, "")).toBe(sans);
    expect(F.ligneDeLaPhrase(voulue)).toContain(`exactement « ${SLOGAN} »`);
    const AVEC = TEXTE.replace("Fais évoluer", `Écris en petit sous le nom, exactement : « ${SLOGAN} ». Fais évoluer`);
    expect(controleDuTexte(AVEC, NOM, METIER, voulue)).toEqual([]);
    expect(controleDuTexte(TEXTE, NOM, METIER, voulue)).toHaveLength(1);
    expect(controleDuTexte(TEXTE, NOM, METIER)).toEqual([]);
    expect(champsDeFinalisation(AVEC)).toMatchObject({ model: "gpt-image-2.6-sunburst", prompt: AVEC });
    const src = fs.readFileSync("src/lib/syna-agent/logo-graphistes.ts", "utf8");
    expect(src).toContain('const ASTRA: Modele = { provider: "openai", model: "gpt-6.2-astra", effort: "medium" };');
    expect(src).toContain('...(a === "redaction" ? { expectedRoute: { provider: m.provider, model: m.model, effort: m.effort } } : {}),');
    // 4. La relecture : jamais « inventée » ; lettre pour lettre, comparée par le code ; mal écrite, le logo est refusé.
    const bien = { nomLu: NOM, ideeConservee: true, arche: false, phrase: SLOGAN, phraseDitLeMetier: false, note: 9, pourquoi: "" };
    expect(raisonsDuRefus(bien, NOM, voulue)).toEqual([]);
    expect(raisonsDuRefus(bien, NOM)).toHaveLength(1); // sans choix du client : la règle d'avant
    expect(raisonsDuRefus({ ...bien, phrase: "La lumiere coulée à la main" }, NOM, voulue)).toHaveLength(1);
    expect(raisonsDuRefus({ ...bien, phrase: "" }, NOM, voulue)).toHaveLength(1);
    expect(raisonsDuRefus({ ...bien, phrase: "Bougies artisanales", phraseDitLeMetier: true }, NOM, { aucune: true })).toHaveLength(1);
    expect(F.demandeAuRelecteurDuLogo({ nom: NOM, metier: METIER, texte: AVEC, phrase: voulue })).toContain(`« ${SLOGAN} ». Elle n'est pas inventée`);
    // De bout en bout : la phrase mal écrite fait refaire le logo une fois, avec la raison.
    const envoyes: string[] = [];
    const verdicts = [{ ...bien, phrase: "La lumiere coulée à la main" }, bien];
    const r = await finaliserUneEsquisse({
      rediger: async () => ({ idee_centrale: "un halo", texte: AVEC }),
      finaliser: async (_e, x) => { envoyes.push(x); return png(); },
      relire: async () => verdicts.shift()!,
      detourer: async (p) => ({ ok: true, png: p }),
      aLaChargeDuStudio: async (fn) => fn(),
    }, { nom: NOM, metier: METIER, esquisse: await png(), phrase: voulue });
    expect(r.ok).toBe(true);
    expect(envoyes[1]).toBe(`Corrige uniquement : la phrase choisie par le client est mal écrite (« La lumiere coulée à la main » au lieu de « ${SLOGAN} ») ; garde tout le reste à l'identique.\n\n${AVEC}`);
  });

  epreuve("relecteur-du-logo-fini", () => {
    expect(raisonsDuRefus(bon, NOM)).toEqual([]);
    for (const v of [{ nomLu: "Hal0" }, { ideeConservee: false }, { evolution: false }, { arche: true }, { phrase: "Lumière éternelle", phraseDitLeMetier: false }, { note: 7 }]) expect(raisonsDuRefus({ ...bon, ...v }, NOM)).toHaveLength(1);
    // Le relecteur est le plus fort, effort élevé, un autre modèle que le rédacteur.
    const src = fs.readFileSync("src/lib/syna-agent/logo-graphistes.ts", "utf8");
    expect(src).toContain('logo: { input: 3_500, output: 1_500, max: 10_000, modele: "strong" as const, effort: "high" },');
  });

  epreuve("relecteur-juge-l-execution-pas-l-idee", async () => {
    const F = await import("@/lib/syna-agent/logo-finalisation");
    const { NOTE_DU_PROPRIETAIRE } = await import("@/lib/syna-agent/note-du-proprietaire");
    const RACINE = "Racine", PEPINIERE = "une pépinière qui cultive et vend en ligne des plantes, des arbustes et des jeunes arbres";
    // 1. La consigne : l'exécution seule, jamais l'idée ; l'étalonnage ; les mots du propriétaire mot pour mot ; le seuil reste 8.
    expect(NOTE_DU_PROPRIETAIRE).toBe(8);
    const R = F.RELECTEUR_DU_LOGO_FINI;
    expect(R).toContain("Le client a choisi lui-même cette esquisse, et son idée, parmi celles qu'on lui a proposées. Tu ne juges jamais l'idée : ni son originalité, ni si elle est courante dans son métier, ni si elle est assez marquante.");
    expect(R).toContain("Tu juges seulement l'exécution : le nom écrit exactement, l'idée de l'esquisse bien gardée, un dessin net (raccords propres, proportions justes, lisible en petit), pas d'arche, pas de phrase inventée, un fond blanc uni qui se retire.");
    expect(R).toContain("Un logo propre et fidèle à l'esquisse choisie, au dessin net et sans défaut visible, vaut 8 ou plus.");
    expect(R).toContain("à la question « Ces logos finis te paraissent assez bons pour être montrés à un client ? », posée devant des logos finis propres et fidèles à leurs esquisses, le propriétaire du Studio a répondu : « Oui très bien je mettrais 9/10 »");
    expect(R).not.toMatch(/agence|evolution|évolu|trop proche|copie nettoyée|racine|feuille|bordeaux/i);
    // Aucune image d'essai : le relecteur reçoit seulement le logo fini et son esquisse ; le plus fort, effort élevé.
    const src = fs.readFileSync("src/lib/syna-agent/logo-graphistes.ts", "utf8");
    expect(src).toContain('relireLogo: (logo, esquisse, demande, cle) => texte(cle, "logo", RELECTEUR_DU_LOGO_FINI, demande, RelectureDuLogoSchema, [{ data: logo, label: "logo fini" }, { data: esquisse, label: "esquisse" }]),');
    expect(src).toContain('logo: { input: 3_500, output: 1_500, max: 10_000, modele: "strong" as const, effort: "high" },');
    expect(F.demandeAuRelecteurDuLogo({ nom: NOM, metier: METIER, texte: TEXTE })).not.toMatch(/écart|indice|identiques|9\/10/i);

    // 2. Le rejeu des quatre relectures réelles de Racine (25 novembre 2026), telles qu'elles sont arrivées.
    const reels = ["04-relecture-1", "04-relecture-2", "11-relecture-1", "11-relecture-2"].map((n) => JSON.parse(fs.readFileSync(`tests/fixtures/relecteur-racine/esquisse-${n}-verdict.json`, "utf8")));
    expect(reels.map((r) => r.verdict.note)).toEqual([6.5, 7, 7, 7]);
    expect(reels.map((r) => r.garde)).toEqual([false, false, false, false]); // ce que décidait le code d'avant
    expect(reels[0].verdict.pourquoi).toContain("un cliché courant du secteur végétal");
    const verdicts = reels.map((r) => F.RelectureDuLogoSchema.parse(r.verdict));
    for (const v of verdicts) expect(F.raisonsDuRefus(v, RACINE)).toEqual([]);
    // De bout en bout, avec la vraie finalisation : la feuille sur le i est gardée du premier coup, sans reprise.
    const TEXTE_R = `Transforme cette esquisse en véritable logo contemporain pour ${RACINE}, ${PEPINIERE}. Conserve l'idée centrale : une feuille tient lieu de point sur le i. Fais évoluer cette idée vers une identité plus aboutie et plus distinctive. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif`;
    expect(controleDuTexte(TEXTE_R, RACINE, PEPINIERE)).toEqual([]);
    const finir = async (suite: any[], detourer?: (p: Buffer) => Promise<any>) => {
      const envoyes: string[] = [], studio: boolean[] = [];
      let dansLeStudio = false;
      const r = await finaliserUneEsquisse({
        rediger: async () => ({ idee_centrale: "une feuille sur le i", texte: TEXTE_R }),
        finaliser: async (_e, t) => { envoyes.push(t); studio.push(dansLeStudio); return png(); },
        relire: async () => suite.shift(),
        detourer: detourer ?? (async (p) => ({ ok: true, png: p })),
        aLaChargeDuStudio: async (fn) => { dansLeStudio = true; try { return await fn(); } finally { dansLeStudio = false; } },
      }, { nom: RACINE, metier: PEPINIERE, esquisse: await png() });
      return { r, envoyes, studio };
    };
    for (const v of verdicts) {
      const { r, envoyes } = await finir([v]);
      expect(r.ok).toBe(true);
      expect(envoyes).toEqual([TEXTE_R]);
      expect(r.notes.join(" ")).toMatch(/non comptée : elle jugeait l'idée choisie par le client/);
    }

    // 3. « Cliché du secteur » et toute raison qui juge l'idée ne font jamais refuser, même écrites par le modèle en défaut.
    const base = verdicts[0];
    const cliche = "L'idée reste toutefois un cliché courant du secteur végétal";
    expect(reels[0].verdict.pourquoi).toContain(cliche);
    for (const d of [cliche, "un cliché du secteur", "UNE IDÉE BANALE", "idée peu originale", "pas assez de singularité pour atteindre le niveau d'une grande agence", "une idée très répandue", "trop proche de l'esquisse, sans évolution"]) {
      expect(F.jugeLIdee(d), d).toBe(true);
      expect(F.raisonsDuRefus({ ...base, note: 5, defauts: [d] }, RACINE), d).toEqual([]);
      expect(F.raisonsDuRefus({ ...base, note: 5, defauts: [d], pourquoi: d }, RACINE), d).toEqual([]);
      expect(F.raisonsDuRefus({ ...base, note: 5, defauts: [], pourquoi: d }, RACINE), d).toEqual([]);
    }
    // Une réponse en texte plutôt qu'en liste est lue de même ; l'ancien format « evolution » reste ignoré.
    expect(F.RelectureDuLogoSchema.parse({ ...reels[0].verdict, defauts: `${cliche} ; idée banale` }).defauts).toEqual([cliche, "idée banale"]);
    expect(F.raisonsDuRefus(F.RelectureDuLogoSchema.parse({ ...reels[0].verdict, defauts: `${cliche} ; idée banale` }), RACINE)).toEqual([]);
    expect(Object.keys(F.RelectureDuLogoSchema.shape)).not.toContain("evolution");

    // 4. L'exécution reste jugée : un défaut d'exécution écrit fait refuser, avec lui dans la raison ; le cliché à côté est écarté.
    const tige = "la fine tige risque de disparaître en petit";
    expect(reels[3].verdict.pourquoi).toContain(tige);
    for (const d of [tige, "les jonctions entre la tige et le fût laissent des formes de blanc maladroites", "la feuille, un peu grosse, flotte légèrement loin du i", "le fond n'est pas blanc uni", "les lettres ne se lisent pas distinctement en petit", "la jambe du R est trop lourde"]) expect(F.jugeLIdee(d), d).toBe(false);
    expect(F.raisonsDuRefus({ ...base, note: 7, defauts: [cliche, tige] }, RACINE)).toEqual([`il n'est pas au niveau (7/10, il faut 8) : ${tige}`]);
    expect(F.raisonsDuRefus({ ...base, note: 8, defauts: [tige] }, RACINE)).toEqual([]);
    // Une note sous 8 sans aucune explication reste un refus, par prudence.
    expect(F.raisonsDuRefus({ ...base, note: 7, defauts: [], pourquoi: "" }, RACINE)).toEqual(["il n'est pas au niveau (7/10, il faut 8)"]);
    // Le nom (comparé par le code), l'idée perdue, l'arche, la phrase inventée restent des refus, chacun seul.
    for (const v of [{ nomLu: "Racines" }, { ideeConservee: false }, { arche: true }, { phrase: "Le jardin éternel", phraseDitLeMetier: false }]) expect(F.raisonsDuRefus({ ...base, note: 9, ...v }, RACINE)).toHaveLength(1);
    // Une phrase choisie par le client n'est jamais inventée : comparée lettre pour lettre ; mal écrite, le logo est refusé.
    const choisie = { texte: "PÉPINIÈRE EN LIGNE" };
    expect(F.raisonsDuRefus({ ...base, note: 9, phraseDitLeMetier: false }, RACINE, choisie)).toEqual([]);
    expect(F.raisonsDuRefus({ ...base, note: 9, phrase: "PEPINIERE EN LIGNE" }, RACINE, choisie)).toHaveLength(1);
    // Refusé pour l'exécution : refait une fois, à la charge du Studio, avec son défaut dans les raisons ; jamais un troisième essai.
    const refait = await finir([{ ...base, note: 7, defauts: [cliche, tige] }, { ...base, note: 9 }]);
    expect(refait.r.ok).toBe(true);
    expect(refait.envoyes).toEqual([TEXTE_R, `Corrige uniquement : ${tige} ; garde tout le reste à l'identique.\n\n${TEXTE_R}`]);
    expect(refait.studio).toEqual([false, true]);
    const deuxFois = await finir([{ ...base, note: 6, defauts: [tige] }, { ...base, note: 6, defauts: [tige] }]);
    expect(deuxFois.r.ok).toBe(false);
    expect(deuxFois.envoyes).toHaveLength(2);
    // Un fond que le Studio ne retire pas proprement fait refaire le logo.
    let detourages = 0;
    const fond = await finir([{ ...base, note: 9 }], async (p) => (++detourages === 1 ? { ok: false, why: "le fond ne se retire pas proprement" } : { ok: true, png: p }));
    expect(fond.r.ok).toBe(true);
    expect(fond.envoyes).toEqual([TEXTE_R, `Corrige uniquement : le fond ne se retire pas proprement ; garde tout le reste à l'identique.\n\n${TEXTE_R}`]);
    // La ligne d'évolution du texte de finalisation reste.
    expect(consigneDeFinalisation(RACINE, PEPINIERE)).toContain(LIGNE_D_EVOLUTION);
  });

  epreuve("relecteur-petites-finitions-sans-refus", async () => {
    const F = await import("@/lib/syna-agent/logo-finalisation");
    const { NOTE_DU_PROPRIETAIRE } = await import("@/lib/syna-agent/note-du-proprietaire");
    const RACINE = "Racine", PEPINIERE = "une pépinière qui cultive et vend en ligne des plantes, des arbustes et des jeunes arbres";
    // 1. La consigne : l'exécution seule ; les défauts graves et les petites finitions séparés ; les deux repères mot pour mot.
    expect(NOTE_DU_PROPRIETAIRE).toBe(8);
    const R = F.RELECTEUR_DU_LOGO_FINI;
    expect(R).toContain("Tu ne juges jamais l'idée : ni son originalité, ni si elle est courante dans son métier, ni si elle est assez marquante.");
    expect(R).toContain("Tu juges seulement l'exécution : le nom écrit exactement, l'idée de l'esquisse bien gardée, un dessin net (raccords propres, proportions justes, lisible en petit), pas d'arche, pas de phrase inventée, un fond blanc uni qui se retire.");
    expect(R).toContain("- defauts : la liste des défauts d'exécution graves, ceux qu'un client verrait comme une faute, un seul par ligne, en mots simples : une lettre fausse, manquante ou illisible ; un nom qui se lit autrement de façon évidente ; une forme cassée ; un fond qui n'est pas blanc uni ;");
    expect(R).toContain("- finitions : la liste des petits défauts de finition, ceux qu'un client ne remarquerait pas comme une faute, un seul par ligne, en mots simples ; ils sont transmis comme corrections si le logo est repris, mais ne le font jamais refuser ;");
    expect(R).toContain("Un logo propre et fidèle à l'esquisse choisie, au dessin net et sans défaut visible, vaut 8 ou plus. Une petite finition ne fait jamais descendre la note sous 8 ; une note sous 8 s'explique par au moins un défaut grave écrit dans defauts.");
    expect(R).toContain("à la question « Ces logos finis te paraissent assez bons pour être montrés à un client ? », posée devant des logos finis propres et fidèles à leurs esquisses, le propriétaire du Studio a répondu : « Oui très bien je mettrais 9/10 »");
    // Ses mots nomment un client d'essai : ils ne vont jamais au relecteur ; la règle y est, sans nom ni exemple d'essai.
    expect(F.SECOND_REPERE_DU_PROPRIETAIRE).toBe("Le racine du milieu est très bien aussi");
    expect(R).not.toContain(F.SECOND_REPERE_DU_PROPRIETAIRE);
    expect(R).not.toMatch(/racine|feuille|esquisse \d|« R »|\bdu i\b|sur le i|en biais/i);
    expect(R).not.toMatch(/agence|evolution|évolu|trop proche|copie nettoyée|bordeaux/i);
    const src = fs.readFileSync("src/lib/syna-agent/logo-graphistes.ts", "utf8");
    expect(src).toContain('relireLogo: (logo, esquisse, demande, cle) => texte(cle, "logo", RELECTEUR_DU_LOGO_FINI, demande, RelectureDuLogoSchema, [{ data: logo, label: "logo fini" }, { data: esquisse, label: "esquisse" }]),');
    expect(src).toContain('logo: { input: 3_500, output: 1_500, max: 10_000, modele: "strong" as const, effort: "high" },');
    expect(consigneDeFinalisation(RACINE, PEPINIERE)).toContain(LIGNE_D_EVOLUTION);

    // 2. Les quatre relectures réelles du premier essai de Racine (avant les défauts écrits) : toujours « gardé ».
    const anciens = ["04-relecture-1", "04-relecture-2", "11-relecture-1", "11-relecture-2"].map((n) => F.RelectureDuLogoSchema.parse(JSON.parse(fs.readFileSync(`tests/fixtures/relecteur-racine/esquisse-${n}-verdict.json`, "utf8")).verdict));
    for (const v of anciens) expect(F.raisonsDuRefus(v, RACINE)).toEqual([]);

    // 3. L'essai réel d'exécution (commit 06750e4), verdicts copiés tels quels dans tests/fixtures/relecteur-execution.
    const lu = (n: string) => JSON.parse(fs.readFileSync(`tests/fixtures/relecteur-execution/esquisse-${n}-verdict.json`, "utf8"));
    // Le R bordeaux, gardé à 8 : reste gardé (une note de 8 ne fait jamais refuser).
    const r8 = lu("11-relecture-1");
    expect(r8.garde).toBe(true);
    expect(F.raisonsDuRefus(F.RelectureDuLogoSchema.parse(r8.verdict), RACINE)).toEqual([]);
    // Le second essai de la feuille sur le i (esquisse-04-logo-2), refusé à 7. Le verdict est de l'ancienne forme : il ne
    // sépare pas les finitions. Lu tel quel, ses deux reproches comptent comme graves : refusé, comme ce jour-là.
    const reel = lu("04-relecture-2");
    expect(reel.garde).toBe(false);
    const tel = F.RelectureDuLogoSchema.parse(reel.verdict);
    expect(tel.note).toBe(7);
    expect(tel.finitions).toEqual([]);
    expect(F.raisonsDuRefus(tel, RACINE)).toEqual(reel.raisons);
    // Ce qu'il reproche, mot pour mot : la feuille-point décalée et le haut du i coupé en biais, deux petits défauts de
    // finition (les exemples que le propriétaire a jugés sans gravité, « Le racine du milieu est très bien aussi »). Aucun ne relève d'un défaut grave : le nom est lu exactement (« racine », comparé par le
    // code), l'idée est gardée, pas d'arche, pas de forme cassée, le fond est uni ; le « racíne » n'est qu'un risque de
    // lecture (« peut faire lire »), pas un nom qui se lit autrement de façon évidente.
    const [feuille, coupe] = tel.defauts!;
    expect(feuille).toBe("La feuille est encore décalée vers la droite du « i » : elle se lit moins bien comme le point de la lettre.");
    expect(coupe).toBe("Le haut du « i » est toujours coupé en biais et ressemble à un accent, ce qui peut faire lire « racíne ».");
    expect(feuille).toMatch(/feuille.*décalée/);
    expect(coupe).toMatch(/coupé en biais/);
    expect(coupe).toMatch(/peut faire lire/);
    expect(F.raisonsDuRefus({ ...tel, defauts: [] }, RACINE).filter((x) => !x.startsWith("il n'est pas au niveau"))).toEqual([]);
    // Rangés en finitions, sans changer un mot ni la note : gardé, la note de 7 non comptée, les finitions écrites au compte rendu.
    const range = F.RelectureDuLogoSchema.parse({ ...reel.verdict, defauts: [], finitions: reel.verdict.defauts });
    expect(range.finitions).toEqual(reel.verdict.defauts);
    expect(range.note).toBe(7);
    expect(F.raisonsDuRefus(range, RACINE)).toEqual([]);
    expect(F.noteEcartee(range)).toMatch(/^note de 7\/10 non comptée : elle ne tenait qu'à de petites finitions/);
    expect(F.finitionsNotees(range)).toBe(`petites finitions notées, sans refus : ${feuille} ; ${coupe}`);

    // 4. De bout en bout : un logo qui n'a que des finitions est gardé du premier coup, sans reprise, finitions au compte rendu.
    const TEXTE_R = `Transforme cette esquisse en véritable logo contemporain pour ${RACINE}, ${PEPINIERE}. Conserve l'idée centrale : une feuille tient lieu de point sur le i. Fais évoluer cette idée vers une identité plus aboutie et plus distinctive. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif`;
    const finir = async (suite: any[]) => {
      const envoyes: string[] = [], studio: boolean[] = [];
      let dansLeStudio = false;
      const r = await finaliserUneEsquisse({
        rediger: async () => ({ idee_centrale: "une feuille sur le i", texte: TEXTE_R }),
        finaliser: async (_j, t) => { envoyes.push(t); studio.push(dansLeStudio); return png(); },
        relire: async () => suite.shift(),
        detourer: async (p) => ({ ok: true, png: p }),
        aLaChargeDuStudio: async (fn) => { dansLeStudio = true; try { return await fn(); } finally { dansLeStudio = false; } },
      }, { nom: RACINE, metier: PEPINIERE, esquisse: await png() });
      return { r, envoyes, studio };
    };
    const garde = await finir([range]);
    expect(garde.r.ok).toBe(true);
    expect(garde.envoyes).toEqual([TEXTE_R]);
    expect(garde.r.notes.join(" | ")).toContain(`logo 1 : petites finitions notées, sans refus : ${feuille} ; ${coupe}`);
    // 5. Un défaut grave, avec une note sous 8, fait toujours refuser : refait une fois, à la charge du Studio, le défaut
    //    et les finitions dans les corrections ; jamais un troisième essai.
    const grave = "le « c » est mal fermé et se lit comme un « e »";
    const refait = await finir([{ ...range, note: 6, defauts: [grave], finitions: ["la feuille est un peu haute"] }, { ...range, note: 9, finitions: [] }]);
    expect(refait.r.ok).toBe(true);
    expect(refait.envoyes[1]).toBe(`Corrige uniquement : ${grave} ; la feuille est un peu haute ; garde tout le reste à l'identique.\n\n${TEXTE_R}`);
    expect(refait.studio).toEqual([false, true]);
    const deuxFois = await finir([{ ...range, note: 6, defauts: [grave] }, { ...range, note: 6, defauts: [grave] }]);
    expect(deuxFois.r.ok).toBe(false);
    expect(deuxFois.envoyes).toHaveLength(2);
    // 6. L'idée ne fait jamais refuser, même rangée en défaut ou en finition ; une note sous 8 sans rien d'écrit reste un refus.
    const cliche = "un cliché courant du secteur végétal";
    for (const v of [{ defauts: [cliche] }, { defauts: [], finitions: [cliche] }, { defauts: [], finitions: [], pourquoi: cliche }]) expect(F.raisonsDuRefus({ ...tel, note: 5, ...v }, RACINE)).toEqual([]);
    expect(F.raisonsDuRefus({ ...tel, note: 7, defauts: [], finitions: [], pourquoi: "" }, RACINE)).toEqual(["il n'est pas au niveau (7/10, il faut 8)"]);
    // Le nom (comparé par le code), l'idée perdue, l'arche, la phrase inventée restent des refus, même avec des finitions seulement.
    for (const v of [{ nomLu: "Racines" }, { ideeConservee: false }, { arche: true }, { phrase: "Le jardin éternel", phraseDitLeMetier: false }]) expect(F.raisonsDuRefus({ ...range, note: 9, phrase: "", ...v }, RACINE)).toHaveLength(1);
    const choisie = { texte: "PÉPINIÈRE EN LIGNE" };
    expect(F.raisonsDuRefus({ ...range, note: 9, phrase: "PEPINIERE EN LIGNE" }, RACINE, choisie)).toHaveLength(1);
    expect(F.raisonsDuRefus({ ...range, note: 9, phrase: "PÉPINIÈRE EN LIGNE" }, RACINE, choisie)).toEqual([]);
  });

  epreuve("relecteur-du-logo-sans-arche", async () => {
    const F = await import("@/lib/syna-agent/logo-finalisation");
    const { NOTE_DU_PROPRIETAIRE } = await import("@/lib/syna-agent/note-du-proprietaire");
    const RACINE = "Racine", PEPINIERE = "une pépinière qui cultive et vend en ligne des plantes, des arbustes et des jeunes arbres";
    // 1. La consigne : l'exécution seule ; les défauts graves et les petites finitions séparés ; les deux repères mot pour mot.
    expect(NOTE_DU_PROPRIETAIRE).toBe(8);
    const R = F.RELECTEUR_DU_LOGO_FINI;
    expect(R).toContain("Tu ne juges jamais l'idée : ni son originalité, ni si elle est courante dans son métier, ni si elle est assez marquante.");
    expect(R).toContain("Tu juges seulement l'exécution : le nom écrit exactement, l'idée de l'esquisse bien gardée, un dessin net (raccords propres, proportions justes, lisible en petit), pas de phrase inventée, un fond blanc uni qui se retire.");
    expect(R).toContain("- defauts : la liste des défauts d'exécution graves, ceux qu'un client verrait comme une faute, un seul par ligne, en mots simples : une lettre fausse, manquante ou illisible ; un nom qui se lit autrement de façon évidente ; une forme cassée ; un fond qui n'est pas blanc uni ;");
    expect(R).toContain("- finitions : la liste des petits défauts de finition, ceux qu'un client ne remarquerait pas comme une faute, un seul par ligne, en mots simples ; ils sont transmis comme corrections si le logo est repris, mais ne le font jamais refuser ;");
    expect(R).toContain("Un logo propre et fidèle à l'esquisse choisie, au dessin net et sans défaut visible, vaut 8 ou plus. Une petite finition ne fait jamais descendre la note sous 8 ; une note sous 8 s'explique par au moins un défaut grave écrit dans defauts.");
    expect(R).toContain("à la question « Ces logos finis te paraissent assez bons pour être montrés à un client ? », posée devant des logos finis propres et fidèles à leurs esquisses, le propriétaire du Studio a répondu : « Oui très bien je mettrais 9/10 »");
    // Ses mots nomment un client d'essai : ils ne vont jamais au relecteur ; la règle y est, sans nom ni exemple d'essai.
    expect(F.SECOND_REPERE_DU_PROPRIETAIRE).toBe("Le racine du milieu est très bien aussi");
    expect(R).not.toContain(F.SECOND_REPERE_DU_PROPRIETAIRE);
    expect(R).not.toMatch(/racine|feuille|esquisse \d|« R »|\bdu i\b|sur le i|en biais/i);
    expect(R).not.toMatch(/agence|evolution|évolu|trop proche|copie nettoyée|bordeaux/i);
    const src = fs.readFileSync("src/lib/syna-agent/logo-graphistes.ts", "utf8");
    expect(src).toContain('relireLogo: (logo, esquisse, demande, cle) => texte(cle, "logo", RELECTEUR_DU_LOGO_FINI, demande, RelectureDuLogoSchema, [{ data: logo, label: "logo fini" }, { data: esquisse, label: "esquisse" }]),');
    expect(src).toContain('logo: { input: 3_500, output: 1_500, max: 10_000, modele: "strong" as const, effort: "high" },');
    expect(consigneDeFinalisation(RACINE, PEPINIERE)).toContain(LIGNE_D_EVOLUTION);

    // 2. Les quatre relectures réelles du premier essai de Racine (avant les défauts écrits) : toujours « gardé ».
    const anciens = ["04-relecture-1", "04-relecture-2", "11-relecture-1", "11-relecture-2"].map((n) => F.RelectureDuLogoSchema.parse(JSON.parse(fs.readFileSync(`tests/fixtures/relecteur-racine/esquisse-${n}-verdict.json`, "utf8")).verdict));
    for (const v of anciens) expect(F.raisonsDuRefus(v, RACINE)).toEqual([]);

    // 3. L'essai réel d'exécution (commit 06750e4), verdicts copiés tels quels dans tests/fixtures/relecteur-execution.
    const lu = (n: string) => JSON.parse(fs.readFileSync(`tests/fixtures/relecteur-execution/esquisse-${n}-verdict.json`, "utf8"));
    // Le R bordeaux, gardé à 8 : reste gardé (une note de 8 ne fait jamais refuser).
    const r8 = lu("11-relecture-1");
    expect(r8.garde).toBe(true);
    expect(F.raisonsDuRefus(F.RelectureDuLogoSchema.parse(r8.verdict), RACINE)).toEqual([]);
    // Le second essai de la feuille sur le i (esquisse-04-logo-2), refusé à 7. Le verdict est de l'ancienne forme : il ne
    // sépare pas les finitions. Lu tel quel, ses deux reproches comptent comme graves : refusé, comme ce jour-là.
    const reel = lu("04-relecture-2");
    expect(reel.garde).toBe(false);
    const tel = F.RelectureDuLogoSchema.parse(reel.verdict);
    expect(tel.note).toBe(7);
    expect(tel.finitions).toEqual([]);
    expect(F.raisonsDuRefus(tel, RACINE)).toEqual(reel.raisons);
    // Ce qu'il reproche, mot pour mot : la feuille-point décalée et le haut du i coupé en biais, deux petits défauts de
    // finition (les exemples que le propriétaire a jugés sans gravité, « Le racine du milieu est très bien aussi »). Aucun ne relève d'un défaut grave : le nom est lu exactement (« racine », comparé par le
    // code), l'idée est gardée, pas d'arche, pas de forme cassée, le fond est uni ; le « racíne » n'est qu'un risque de
    // lecture (« peut faire lire »), pas un nom qui se lit autrement de façon évidente.
    const [feuille, coupe] = tel.defauts!;
    expect(feuille).toBe("La feuille est encore décalée vers la droite du « i » : elle se lit moins bien comme le point de la lettre.");
    expect(coupe).toBe("Le haut du « i » est toujours coupé en biais et ressemble à un accent, ce qui peut faire lire « racíne ».");
    expect(feuille).toMatch(/feuille.*décalée/);
    expect(coupe).toMatch(/coupé en biais/);
    expect(coupe).toMatch(/peut faire lire/);
    expect(F.raisonsDuRefus({ ...tel, defauts: [] }, RACINE).filter((x) => !x.startsWith("il n'est pas au niveau"))).toEqual([]);
    // Rangés en finitions, sans changer un mot ni la note : gardé, la note de 7 non comptée, les finitions écrites au compte rendu.
    const range = F.RelectureDuLogoSchema.parse({ ...reel.verdict, defauts: [], finitions: reel.verdict.defauts });
    expect(range.finitions).toEqual(reel.verdict.defauts);
    expect(range.note).toBe(7);
    expect(F.raisonsDuRefus(range, RACINE)).toEqual([]);
    expect(F.noteEcartee(range)).toMatch(/^note de 7\/10 non comptée : elle ne tenait qu'à de petites finitions/);
    expect(F.finitionsNotees(range)).toBe(`petites finitions notées, sans refus : ${feuille} ; ${coupe}`);

    // 4. De bout en bout : un logo qui n'a que des finitions est gardé du premier coup, sans reprise, finitions au compte rendu.
    const TEXTE_R = `Transforme cette esquisse en véritable logo contemporain pour ${RACINE}, ${PEPINIERE}. Conserve l'idée centrale : une feuille tient lieu de point sur le i. Fais évoluer cette idée vers une identité plus aboutie et plus distinctive. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif`;
    const finir = async (suite: any[]) => {
      const envoyes: string[] = [], studio: boolean[] = [];
      let dansLeStudio = false;
      const r = await finaliserUneEsquisse({
        rediger: async () => ({ idee_centrale: "une feuille sur le i", texte: TEXTE_R }),
        finaliser: async (_j, t) => { envoyes.push(t); studio.push(dansLeStudio); return png(); },
        relire: async () => suite.shift(),
        detourer: async (p) => ({ ok: true, png: p }),
        aLaChargeDuStudio: async (fn) => { dansLeStudio = true; try { return await fn(); } finally { dansLeStudio = false; } },
      }, { nom: RACINE, metier: PEPINIERE, esquisse: await png() });
      return { r, envoyes, studio };
    };
    const garde = await finir([range]);
    expect(garde.r.ok).toBe(true);
    expect(garde.envoyes).toEqual([TEXTE_R]);
    expect(garde.r.notes.join(" | ")).toContain(`logo 1 : petites finitions notées, sans refus : ${feuille} ; ${coupe}`);
    // 5. Un défaut grave, avec une note sous 8, fait toujours refuser : refait une fois, à la charge du Studio, le défaut
    //    et les finitions dans les corrections ; jamais un troisième essai.
    const grave = "le « c » est mal fermé et se lit comme un « e »";
    const refait = await finir([{ ...range, note: 6, defauts: [grave], finitions: ["la feuille est un peu haute"] }, { ...range, note: 9, finitions: [] }]);
    expect(refait.r.ok).toBe(true);
    expect(refait.envoyes[1]).toBe(`Corrige uniquement : ${grave} ; la feuille est un peu haute ; garde tout le reste à l'identique.\n\n${TEXTE_R}`);
    expect(refait.studio).toEqual([false, true]);
    const deuxFois = await finir([{ ...range, note: 6, defauts: [grave] }, { ...range, note: 6, defauts: [grave] }]);
    expect(deuxFois.r.ok).toBe(false);
    expect(deuxFois.envoyes).toHaveLength(2);
    // 6. L'idée ne fait jamais refuser, même rangée en défaut ou en finition ; une note sous 8 sans rien d'écrit reste un refus.
    const cliche = "un cliché courant du secteur végétal";
    for (const v of [{ defauts: [cliche] }, { defauts: [], finitions: [cliche] }, { defauts: [], finitions: [], pourquoi: cliche }]) expect(F.raisonsDuRefus({ ...tel, note: 5, ...v }, RACINE)).toEqual([]);
    expect(F.raisonsDuRefus({ ...tel, note: 7, defauts: [], finitions: [], pourquoi: "" }, RACINE)).toEqual(["il n'est pas au niveau (7/10, il faut 8)"]);
    // Le nom (comparé par le code), l'idée perdue, la phrase inventée restent des refus, même avec des finitions seulement.
    for (const v of [{ nomLu: "Racines" }, { ideeConservee: false }, { phrase: "Le jardin éternel", phraseDitLeMetier: false }]) expect(F.raisonsDuRefus({ ...range, note: 9, phrase: "", ...v }, RACINE)).toHaveLength(1);
    const choisie = { texte: "PÉPINIÈRE EN LIGNE" };
    expect(F.raisonsDuRefus({ ...range, note: 9, phrase: "PEPINIERE EN LIGNE" }, RACINE, choisie)).toHaveLength(1);
    expect(F.raisonsDuRefus({ ...range, note: 9, phrase: "PÉPINIÈRE EN LIGNE" }, RACINE, choisie)).toEqual([]);
    // 7. Une arche, un médaillon ou un badge rond sont permis (25 novembre 2026) : ni demandés aux relecteurs des logos, ni
    //    une raison d'écarter une esquisse ou de refuser un logo fini, même dans un verdict d'avant qui le dit.
    const E = await import("@/lib/syna-agent/esquisses");
    for (const consigne of [R, E.RELECTEUR_DES_ESQUISSES]) expect(consigne).not.toMatch(/arche|demi-lune|arrondi en arc/i);
    expect(F.raisonsDuRefus(F.RelectureDuLogoSchema.parse({ ...range, note: 9, arche: true }), RACINE)).toEqual([]);
    const v = E.RelectureEsquissesSchema.parse({ esquisses: [{ numero: 1, entiere: true, morceauDeVoisine: false, nomLu: RACINE, arche: true, ok: true, pourquoi: "un badge rond", piste: "un médaillon" }] });
    expect(E.appliquerLaRelecture(RACINE, [{ modele: "m", index: 0, png: Buffer.from("x"), requestId: null }], v, 1).gardees).toHaveLength(1);
    // La règle sans arche reste pour les photos du site.
    expect(fs.readFileSync("src/lib/syna-agent/custom-theme/tenue.ts", "utf8")).toMatch(/sansArche/);
  });

  epreuve("reprise-du-logo-a-partir-du-refuse", async () => {
    const F = await import("@/lib/syna-agent/logo-finalisation");
    const RACINE = "Racine", PEPINIERE = "une pépinière qui cultive et vend en ligne des plantes, des arbustes et des jeunes arbres";
    const TEXTE_R = `Transforme cette esquisse en véritable logo contemporain pour ${RACINE}, ${PEPINIERE}. Conserve l'idée centrale : une feuille tient lieu de point sur le i. Fais évoluer cette idée vers une identité plus aboutie et plus distinctive. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif`;
    // Les défauts du premier essai de la feuille sur le i (essai réel du 25 novembre 2026 avec le relecteur qui juge
    // l'exécution, branche claude/essais-complets, commit 06750e4), recopiés mot pour mot.
    const DEFAUTS = ["La feuille est trop haute et décalée vers la droite du « i » : on ne la lit plus aussi bien comme le point de la lettre.", "Le haut du « i » est coupé en biais et ressemble à un accent, ce qui peut faire lire « racíne »."];
    const refuse = F.RelectureDuLogoSchema.parse({ nomLu: "racine", ideeConservee: true, phrase: "", phraseDitLeMetier: false, defauts: DEFAUTS, note: 7, pourquoi: "Le logo est propre, garde bien l'esquisse et sa phrase descriptive, sur un fond blanc uni. En revanche, la feuille est trop éloignée du « i » et le haut de la lettre, coupé en biais, brouille l'idée du point." });
    const bien = { ...refuse, note: 9, defauts: [] };
    const teinte = (c: string) => sharp({ create: { width: 300, height: 120, channels: 3, background: "#FFFFFF" } }).composite([{ input: { create: { width: 200, height: 60, channels: 3, background: c } }, left: 50, top: 30 }]).png().toBuffer();
    const esquisse = await teinte("#6B4E2E");
    const finir = async (suite: any[], o: { detourer?: (p: Buffer) => Promise<any> } = {}) => {
      const envoyes: string[] = [], jointes: Buffer[] = [], dessines: Buffer[] = [], references: Buffer[] = [], studio: boolean[] = [];
      let dansLeStudio = false;
      const r = await finaliserUneEsquisse({
        rediger: async () => ({ idee_centrale: "une feuille sur le i", texte: TEXTE_R }),
        finaliser: async (jointe, t) => { envoyes.push(t); jointes.push(jointe); studio.push(dansLeStudio); const p = await teinte(["#1F5B2E", "#2E1F5B", "#5B2E1F"][dessines.length]); dessines.push(p); return p; },
        relire: async (_l, reference) => { references.push(reference); return suite.shift(); },
        detourer: o.detourer ?? (async (p) => ({ ok: true, png: p })),
        aLaChargeDuStudio: async (fn) => { dansLeStudio = true; try { return await fn(); } finally { dansLeStudio = false; } },
      }, { nom: RACINE, metier: PEPINIERE, esquisse });
      return { r, envoyes, jointes, dessines, references, studio };
    };
    // 1. Refusé pour l'exécution : au premier essai le texte part tel quel, l'esquisse jointe ; à la reprise, le logo refusé
    //    est joint, jamais l'esquisse ; les corrections précises d'abord, puis le texte tel qu'il était ; le relecteur
    //    reçoit toujours l'esquisse ; la reprise est à la charge du Studio.
    const a = await finir([refuse, bien]);
    expect(a.r.ok).toBe(true);
    expect(a.envoyes[0]).toBe(TEXTE_R);
    expect(a.jointes[0].equals(esquisse)).toBe(true);
    expect(a.jointes[1].equals(a.dessines[0])).toBe(true);
    expect(a.jointes[1].equals(esquisse)).toBe(false);
    expect(a.references.map((b) => b.equals(esquisse))).toEqual([true, true]);
    expect(a.envoyes[1]).toBe(`Corrige uniquement : ${DEFAUTS.map((d) => d.replace(/\.$/, "")).join(" ; ")} ; garde tout le reste à l'identique.\n\n${TEXTE_R}`);
    expect(a.envoyes[1].startsWith("Corrige uniquement : ")).toBe(true);
    expect(a.envoyes[1].endsWith(TEXTE_R)).toBe(true);
    expect(a.envoyes[1]).not.toMatch(/À corriger/);
    expect(a.studio).toEqual([false, true]);
    // Toutes les raisons du refus deviennent des corrections, sous la même forme stable.
    expect(F.debutDeReprise(["le nom est mal écrit (« Racines » au lieu de « Racine »)", "l'idée de l'esquisse est perdue"])).toBe("Corrige uniquement : le nom est mal écrit (« Racines » au lieu de « Racine ») ; l'idée de l'esquisse est perdue ; garde tout le reste à l'identique.");
    expect(F.debutDeReprise(["il n'est pas au niveau (7/10, il faut 8)"])).toBe("Corrige uniquement : il n'est pas au niveau (7/10, il faut 8) ; garde tout le reste à l'identique.");
    // Les petites finitions notées au premier essai s'ajoutent aux corrections d'une reprise faite pour une autre raison.
    const avecFinitions = await finir([{ ...refuse, ideeConservee: false, defauts: [], finitions: ["la feuille est un peu haute"] }, bien]);
    expect(avecFinitions.envoyes[1]).toBe(`Corrige uniquement : l'idée de l'esquisse est perdue ; la feuille est un peu haute ; garde tout le reste à l'identique.\n\n${TEXTE_R}`);
    // 2. Un fond qui ne se retire pas : refait une fois, à partir du logo refusé, la correction au début.
    let detourages = 0;
    const fond = await finir([bien], { detourer: async (p) => (++detourages === 1 ? { ok: false, why: "le fond ne se retire pas proprement" } : { ok: true, png: p }) });
    expect(fond.r.ok).toBe(true);
    expect(fond.jointes[1].equals(fond.dessines[0])).toBe(true);
    expect(fond.envoyes[1]).toBe(`Corrige uniquement : le fond ne se retire pas proprement ; garde tout le reste à l'identique.\n\n${TEXTE_R}`);
    // 3. Refusé deux fois : pas gardé, jamais un troisième essai ; SINA propose une autre esquisse.
    const deux = await finir([refuse, refuse, bien]);
    expect(deux.r.ok).toBe(false);
    expect(deux.envoyes).toHaveLength(2);
    const { phraseDuLogoNonConstruit } = await import("@/lib/syna-agent/logo-graphistes");
    expect(phraseDuLogoNonConstruit(4, [4, 11])).toMatch(/je ne construis pas cette identité avec lui\. Je te propose une autre esquisse parmi celles que tu as vues \(par exemple la 11\)/);
    // 4. La retouche des couleurs : sa reprise part de la retouche refusée, le relecteur la compare au logo d'origine.
    const origine = await teinte("#000000");
    const vus: { jointes: Buffer[]; dessines: Buffer[]; references: Buffer[]; textes: string[] } = { jointes: [], dessines: [], references: [], textes: [] };
    const suite = [{ ...refuse, defauts: ["le vert déborde sur le contour du R"] }, bien];
    const t = await F.retoucherLesCouleurs({
      rediger: async () => { throw new Error("aucun texte à écrire"); },
      finaliser: async (jointe, x) => { vus.jointes.push(jointe); vus.textes.push(x); const p = await teinte(["#1F5B2E", "#2E1F5B"][vus.dessines.length]); vus.dessines.push(p); return p; },
      relire: async (_l, reference) => { vus.references.push(reference); return suite.shift()!; },
      detourer: async (p) => ({ ok: true, png: p }),
      aLaChargeDuStudio: async (fn) => fn(),
    }, { nom: RACINE, metier: PEPINIERE, logo: origine, demande: "en vert sapin" });
    expect(t.ok).toBe(true);
    expect(vus.jointes[0].equals(origine)).toBe(true);
    expect(vus.jointes[1].equals(vus.dessines[0])).toBe(true);
    expect(vus.references.map((b) => b.equals(origine))).toEqual([true, true]);
    expect(vus.textes[1]).toBe(`Corrige uniquement : le vert déborde sur le contour du R ; garde tout le reste à l'identique.\n\n${F.texteDeRetouche("en vert sapin")}`);
    // La planche de marque garde sa propre reprise (ses raisons à la fin du texte) : rien n'y change.
    expect(fs.readFileSync("src/lib/syna-agent/planche-de-marque.ts", "utf8")).toContain("export const finDeReprise = (raisons: readonly string[]) => `À corriger : ${raisons.join(\" ; \")}.`;");
    expect(fs.readFileSync("src/lib/syna-agent/logo-finalisation.ts", "utf8")).not.toContain("À corriger");
  });
});

describe("les épreuves de la planche de marque par OpenAI (24 novembre 2026, faux dessinateur et faux relecteur)", async () => {
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const T = await import("@/lib/syna-agent/planche-de-marque-tache");
  const J = await import("@/lib/syna-agent/journey");
  const mp = await import("@/lib/ai/media-providers");
  const { account, project } = await import("./conversation209-fixtures");
  const { saveAsset } = await import("@/lib/library");
  const { chargeDuStudio } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <X,>(fn: () => Promise<X>) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const F = "tests/fixtures/planche-de-marque";
  const TENON = { metier: "une entreprise de menuiserie qui réalise des cuisines et des dressings sur mesure", traits: ["artisanale", "chaleureuse", "précise", "haut de gamme"], emotion: "la vie dans une cuisine sur mesure", site: "marque" as const, appel: "devis" as const, images: ["famille dans sa cuisine sur mesure", "dressing rangé", "gros plan bois / assemblage", "atelier et savoir-faire", "détail de quincaillerie", "lumière naturelle intérieure"], produits: ["cuisines", "dressings", "rangements sur mesure"] };
  const RACINE = { metier: "une pépinière qui cultive et vend en ligne des plantes, des arbustes et des jeunes arbres", traits: ["vivante", "chaleureuse", "généreuse", "naturelle"], emotion: "le plaisir de voir pousser ses plantes", site: "boutique" as const, images: ["plante dans un intérieur lumineux", "jardin qui pousse", "gros plan feuillage / terre / racines", "plante seule en studio ou lifestyle", "pépinière et serres", "mise en pot"], produits: ["plantes d'intérieur", "arbustes", "jeunes arbres"] };
  const bon = (nom: string, mention: string, annee = 2026) => ({ nomLu: nom, logoFidele: true, copyrightLu: `© ${annee} ${nom}`, domaineLu: mention, fautes: [] as string[], promesses: [] as string[], personnes: false, logoFonceSurFondSombre: false, motMaquette: false, copies: [] as string[], note: 9, pourquoi: "Nette." });
  /** Une planche passée par la vraie tâche, avec un faux dessinateur et un faux relecteur (rien n'est payé). */
  async function tache(o: { verdicts: (demande: string, tour: number) => any; domaines?: any; personnes?: boolean; phrase?: string[] }) {
    const u = await account(), pid = project(u, "services") as string;
    const logo = await saveAsset({ projectId: pid, userId: u.id, data: await sharp({ create: { width: 256, height: 256, channels: 3, background: "#FFFFFF" } }).png().toBuffer(), name: "logo-fini.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready" });
    const appels: { texte: string; logo: Buffer; disposition: Buffer; studio: boolean }[] = [];
    const relectures: { demande: string; nbArgs: number; avecPhrase?: boolean }[] = [];
    const ai = {
      valeurs: async () => { throw new Error("aucun appel attendu"); },
      dessiner: async (l: { data: Buffer }, d: { data: Buffer }, texte: string) => { appels.push({ texte, logo: l.data, disposition: d.data, studio: chargeDuStudio() }); return { png: await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#EEE" } }).png().toBuffer(), recu: null }; },
      relire: async (...a: [Buffer[], Buffer, Buffer, string, string, boolean?]) => { relectures.push({ demande: a[3], nbArgs: a.length, avecPhrase: a[5] }); return o.verdicts(a[3], appels.length); },
    };
    T.plancheDeps.domaines = async () => o.domaines ?? { taken: [], free: ["tenon.fr"], unknown: [], at: 1 };
    T.plancheDeps.annee = () => 2026;
    try {
      const x = { ...route("A"), name: "Tenon" };
      const r = await fr(() => T.plancheDeLaRoute({ ctx: { step: async (_k: string, fn: () => Promise<any>) => fn() }, ai, who: { userId: u.id, projectId: pid }, route: x as never, round: 1, valeurs: { ok: true, valeurs: TENON }, logoAssetId: logo.id, personnes: o.personnes ?? false, ...(o.phrase ? { phrase: o.phrase } : {}) }));
      return { r, appels, logo, relectures };
    } finally { T.plancheDeps.domaines = undefined; T.plancheDeps.annee = undefined; }
  }

  epreuve("planche-de-marque-openai", async () => {
    // Les champs exacts des requêtes de preuve, le chemin permis, sans secours.
    const preuve = JSON.parse(fs.readFileSync(`${F}/tenon-requete.json`, "utf8"));
    const { prompt: _p, n, ...reglages } = preuve.champs;
    const { prompt: _q, ...champs } = mp.champsDeLaPlanche("t");
    expect(champs).toEqual({ ...reglages, n: Number(n) });
    expect(champs).toMatchObject({ model: "gpt-image-2.5-sunburst", quality: "xhigh", size: "1536x2304" });
    expect(preuve["image[]"]).toEqual(["logo-tenon.png", "disposition-variante-2.png"]);
    // Le texte de base mot pour mot : Tenon et Racine refaits à l'identique ; seules les six parties changent.
    expect(P.texteDesPreuves("Tenon", TENON)).toBe(fs.readFileSync(`${F}/tenon-prompt.txt`, "utf8"));
    expect(P.texteDesPreuves("Racine", RACINE)).toBe(fs.readFileSync(`${F}/racine-prompt.txt`, "utf8"));
    expect(crypto.createHash("sha256").update(fs.readFileSync("assets/planche-de-marque/disposition.png")).digest("hex")).toBe(P.DISPOSITION.sha256);
    // Un produit absent de la fiche n'entre jamais dans le texte.
    expect(P.controleDesValeurs({ nom: "Tenon", traits: TENON.traits, emotion: "un repas en famille", images: TENON.images.slice(1), produits: ["cuisines", "escaliers"], appel: "devis" }, { nom: "Tenon", metier: TENON.metier, fiche: "Je fais des cuisines.", personnes: true, kind: "services" }).valeurs.produits).toEqual(["cuisines"]);
    // La vraie tâche : image[] = le logo fini, puis la disposition ; le texte des preuves suivi de la phrase des données.
    const { r, appels, logo } = await tache({ verdicts: () => bon("Tenon", "tenon.fr — disponible") });
    expect(appels).toHaveLength(1);
    const { assetData, getAsset } = await import("@/lib/library");
    expect(appels[0].logo.equals(assetData(getAsset(logo.id)!))).toBe(true);
    expect(crypto.createHash("sha256").update(appels[0].disposition).digest("hex")).toBe(P.DISPOSITION.sha256);
    expect(appels[0].texte.startsWith(fs.readFileSync(`${F}/tenon-prompt.txt`, "utf8"))).toBe(true);
    expect(r.route.board.planche!.image).toBeTruthy();
  });

  epreuve("planche-donnees-verifiees", async () => {
    const libre = await tache({ verdicts: () => bon("Tenon", "tenon.fr — disponible") });
    expect(libre.appels[0].texte.endsWith("écris exactement « tenon.fr — disponible » et « © 2026 Tenon » ; n'ajoute aucune promesse, aucun chiffre ni aucun avis ; aucune personne visible.")).toBe(true);
    const doute = await tache({ domaines: { taken: [], free: [], unknown: ["tenon.fr"], at: 1 }, personnes: true, verdicts: () => bon("Tenon", "tenon.fr — à vérifier") });
    expect(doute.appels[0].texte.endsWith("écris exactement « tenon.fr — à vérifier » et « © 2026 Tenon » ; n'ajoute aucune promesse, aucun chiffre ni aucun avis.")).toBe(true);
    expect(doute.r.route.board.planche).toMatchObject({ statut: "a_verifier", domaine: "tenon.fr", annee: 2026 });
    // Lettre pour lettre : une année fausse, un domaine différent ou « disponible » à la place de « à vérifier » font refaire.
    const faux = await tache({ verdicts: (_d, n) => (n === 1 ? bon("Tenon", "tenon.fr — disponible", 2025) : bon("Tenon", "tenon.com — disponible")) });
    expect(faux.appels).toHaveLength(2);
    expect(faux.appels[1].texte.endsWith("À corriger : le copyright doit être exactement « © 2026 Tenon » (lu : « © 2025 Tenon »).")).toBe(true);
    expect(faux.r.route.board.planche!.image).toBeUndefined();
    expect(P.raisonsDuRefusDeLaPlanche(bon("Tenon", "tenon.fr — disponible"), { nom: "Tenon", annee: 2026, domaine: { domaine: "tenon.fr", statut: "a_verifier" }, personnes: true, animaux: false }).join(" ")).toMatch(/« tenon.fr — à vérifier »/);
  });

  // Les rejeux des deux épreuves remplacées par planche-phrase-par-lignes-et-reprise-qui-part-toujours (essai réel d'Écume,
  // étape 3) : inchangés, rejoués par l'épreuve qui les remplace.
  const rejeuLisible = async () => {
    const R = P.RELECTEUR_DE_LA_PLANCHE;
    // 1. La consigne : les micro-textes à part, les promesses mesurables seules, le repère mot pour mot, sans image d'essai.
    expect(R).toContain("- fautes : chaque faute d'orthographe ou mot mal écrit dans un texte lisible à taille normale (le nom, les accroches, les titres des blocs, les mentions, le domaine, l'année), recopié ;");
    expect(R).toContain("- microTextes : les micro-textes décoratifs, illisibles à taille normale, que tu ne juges pas : les lignes d'alphabet des spécimens de polices, le petit texte circulaire d'un badge, l'heure de la barre d'état d'un téléphone ; recopiés s'ils sont déformés, jamais mis dans fautes ;");
    expect(R).toContain("un mot qualitatif ordinaire (soigné, sélectionné, conseils, qualité) n'est pas une promesse ;");
    expect(R).toContain("Une planche complète, juste dans ses textes lisibles et soignée vaut 8 ou plus ; un micro-texte décoratif ou un mot qualitatif ne fait jamais descendre la note sous 8.");
    expect(R).toContain("à la question « Ces deux planches te paraissent montrables à un client telles quelles ? », posée devant deux planches dont seuls les alphabets des spécimens, le petit texte circulaire du badge et des mots qualitatifs de réassurance étaient reprochés, le propriétaire du Studio a répondu : « C'est très bien »");
    expect(R).not.toMatch(/meilleures agences|racine|tenon/i);
    const { NOTE_DU_PROPRIETAIRE } = await import("@/lib/syna-agent/note-du-proprietaire");
    expect(NOTE_DU_PROPRIETAIRE).toBe(8);
    // 2. Le code : les micro-textes et les mots qualitatifs écartés ; un texte lisible faux, une promesse mesurable refusent.
    const a = { nom: "Tenon", annee: 2026, domaine: { domaine: "tenon.fr", statut: "disponible" as const }, personnes: false, animaux: false };
    const ok = bon("Tenon", "tenon.fr — disponible");
    for (const f of ["abcdefgljujbirimopootywxyz", "ABCDEFFGIHJLLNMMCCEWWXYZ (alphabet déformé)", "texte du badge déformé", "Texte circulaire illisible", "0-6T (heure de la barre d'état du téléphone)"]) {
      expect(P.microTexteDecoratif(f), f).toBe(true);
      expect(P.raisonsDuRefusDeLaPlanche({ ...ok, fautes: [f] }, a), f).toEqual([]);
    }
    for (const f of ["menuserie", "Tenonn", "Fabriqué a la main"]) expect(P.raisonsDuRefusDeLaPlanche({ ...ok, fautes: [f] }, a).join(" "), f).toMatch(/fautes/);
    expect(P.raisonsDuRefusDeLaPlanche({ ...ok, microTextes: ["abcxyz déformé"] }, a)).toEqual([]);
    for (const p of ["Livraison soignée", "Conseils pratiques", "Emballage soigné", "Plantes de qualité", "Bois sélectionné"]) {
      expect(P.promesseMesurable(p), p).toBe(false);
      expect(P.raisonsDuRefusDeLaPlanche({ ...ok, promesses: [p] }, a), p).toEqual([]);
    }
    for (const p of ["Livraison offerte", "Livraison gratuite", "Livré en 48 h", "Satisfait ou remboursé", "Garantie 10 ans", "4,9/5", "Plus de 2 000 clients", "Avis vérifiés", "Paiement sécurisé", "Le meilleur bois", "-20 % sur tout"]) {
      expect(P.promesseMesurable(p), p).toBe(true);
      expect(P.raisonsDuRefusDeLaPlanche({ ...ok, promesses: [p] }, a).join(" "), p).toMatch(/promesses ou chiffres inventés/);
    }
    // Le nom, l'année et le domaine toujours lettre pour lettre, même avec tout le reste écarté.
    expect(P.raisonsDuRefusDeLaPlanche({ ...ok, copyrightLu: "© 2025 Tenon", microTextes: ["x"] }, a).join(" ")).toMatch(/copyright/);
    expect(P.raisonsDuRefusDeLaPlanche({ ...ok, domaineLu: "tenon.com — disponible" }, a).join(" ")).toMatch(/bloc 10/);
    expect(P.raisonsDuRefusDeLaPlanche({ ...ok, nomLu: "Tenom" }, a).join(" ")).toMatch(/nom est mal écrit/);
    // La note : non comptée quand elle ne tenait qu'à ce qui est écarté ; sans rien d'écrit, toujours un refus.
    expect(P.raisonsDuRefusDeLaPlanche({ ...ok, note: 7, fautes: ["abcdefghijklmnopq"], promesses: ["Livraison soignée"] }, a)).toEqual([]);
    expect(P.lectureDeLaPlanche({ ...ok, note: 7, promesses: ["Livraison soignée"] }, a).ecartes.join(" | ")).toMatch(/note de 7\/10 non comptée/);
    expect(P.raisonsDuRefusDeLaPlanche({ ...ok, note: 7 }, a)).toEqual(["elle n'est pas au niveau (7/10, il faut 8)"]);
    expect(P.raisonsDuRefusDeLaPlanche({ ...ok, note: 7, promesses: ["Livraison soignée"], copies: ["le harnais"] }, a)).toHaveLength(2);

    // 3. Les verdicts réels de l'essai de Racine (planches-execution, commit 86645c7), copiés tels quels.
    const R26 = { nom: "Racine", annee: 2026, domaine: { domaine: "racine-officiel.fr", statut: "disponible" as const }, personnes: false, animaux: false };
    const reel = (n: string) => JSON.parse(fs.readFileSync(`tests/fixtures/relecteur-planche/planche-${n}-relecture-verdict.json`, "utf8"));
    const lu = (n: string) => P.lectureDeLaPlanche(P.RelectureDeLaPlancheSchema.parse(reel(n).verdict), R26);
    for (const n of ["A-1", "A-2", "B-1", "B-2"]) expect(reel(n).gardee, n).toBe(false); // ce que décidait le code d'avant
    // A-2 (note 7) et B-2 (note 7,5) : ce qu'ils reprochaient, ce sont les alphabets des spécimens, le texte circulaire du
    // badge (A-2), l'heure de la barre d'état (B-2) et des mots qualitatifs ; le nom, le copyright et le domaine sont justes,
    // le logo fidèle, aucune personne, aucune copie : « gardée », la note non comptée et écrite au compte rendu.
    for (const n of ["A-2", "B-2"]) {
      const v = reel(n).verdict;
      expect([v.copyrightLu, v.domaineLu, v.logoFidele, v.personnes, v.copies], n).toEqual(["© 2026 Racine", "racine-officiel.fr — disponible", true, false, []]);
      expect(v.fautes.every((f: string) => P.microTexteDecoratif(f)), n).toBe(true);
      expect(v.promesses.some((p: string) => P.promesseMesurable(p)), n).toBe(false);
      expect(lu(n).raisons, n).toEqual([]);
      expect(lu(n).ecartes.join(" | "), n).toMatch(/note de 7(\.5)?\/10 non comptée/);
    }
    // A-1 : des mains sont visibles sans l'accord du client : toujours « refusée » (avec aussi une faute d'un texte lisible et
    // « Paiement sécurisé », une garantie). B-1 : l'emballage recopié de la disposition : toujours « refusée ».
    expect(reel("A-1").verdict.personnes).toBe(true);
    expect(lu("A-1").raisons).toContain("une personne est visible sans l'accord du client");
    expect(lu("B-1").raisons.join(" ")).toMatch(/éléments recopiés de la disposition/);

    // 4. La reprise unique et la planche refusée deux fois ne changent pas.
    const une = await tache({ verdicts: (_d, n) => (n === 1 ? { ...bon("Tenon", "tenon.fr — disponible"), copies: ["le harnais de la disposition"] } : bon("Tenon", "tenon.fr — disponible")) });
    expect(une.appels.map((x) => x.studio)).toEqual([false, true]);
    expect(une.appels[1].texte.endsWith("À corriger : éléments recopiés de la disposition : le harnais de la disposition.")).toBe(true);
    expect(une.r.route.board.planche!.image).toBeTruthy();
    // Une planche aux seuls micro-textes et mots qualitatifs, notée 7 : gardée du premier coup, sans reprise.
    const garde = await tache({ verdicts: () => ({ ...bon("Tenon", "tenon.fr — disponible"), note: 7, fautes: ["abcdefghijklmnopqrstuvwxyz"], promesses: ["Livraison soignée"] }) });
    expect(garde.appels).toHaveLength(1);
    expect(garde.r.route.board.planche!.image).toBeTruthy();
    const deux = await tache({ verdicts: () => ({ ...bon("Tenon", "tenon.fr — disponible"), note: 6 }) });
    expect(deux.appels).toHaveLength(2);
    expect(deux.r.route.board.planche!.image).toBeUndefined();
    expect(deux.r.issues.join(" ")).toMatch(/je ne te montre pas cette planche, elle n'a pas passé ma relecture, même refaite\. Je peux la refaire à ma charge : rien n'est compté sur ton budget\./);
    const j = { keep: [], identities: { list: [{ ...deux.r.route, board: { ...deux.r.route.board, images: { logo: { id: "logoabcd", w: 1, h: 1 } } } }] } };
    expect(J.planchesMontrees(j as never)).toEqual([]);
    expect(J.planchesIncompletes(j as never)).toEqual([{ key: "A", manque: ["planche"] }]);
    const I = await import("@/lib/syna-agent/tools/identity");
    expect(I.finirPlanchesGardees(j as never, ["A"], ["planche"])).toBe(true);
    expect(I.devisDesImages(j as never, ["A"], ["planche"])).toMatchObject({ studio: true });
  };
  epreuve("relecteur-de-planche-texte-lisible-et-promesses-mesurables", rejeuLisible);

  epreuve("planche-refusee-deux-fois-jamais-montree", async () => {
    const une = await tache({ verdicts: (_d, n) => (n === 1 ? { ...bon("Tenon", "tenon.fr — disponible"), copies: ["le harnais de la disposition"] } : bon("Tenon", "tenon.fr — disponible")) });
    expect(une.appels.map((a) => a.studio)).toEqual([false, true]);
    expect(une.appels[1].texte.endsWith("À corriger : éléments recopiés de la disposition : le harnais de la disposition.")).toBe(true);
    expect(une.r.route.board.planche!.image).toBeTruthy();
    const deux = await tache({ verdicts: () => ({ ...bon("Tenon", "tenon.fr — disponible"), note: 6 }) });
    expect(deux.appels).toHaveLength(2);
    expect(deux.r.route.board.planche!.image).toBeUndefined();
    expect(deux.r.issues.join(" ")).toMatch(/je ne te montre pas cette planche, elle n'a pas passé ma relecture, même refaite\. Je peux la refaire à ma charge : rien n'est compté sur ton budget\./);
    const j = { keep: [], identities: { list: [{ ...deux.r.route, board: { ...deux.r.route.board, images: { logo: { id: "logoabcd", w: 1, h: 1 } } } }] } };
    expect(J.planchesMontrees(j as never)).toEqual([]);
    expect(J.planchesIncompletes(j as never)).toEqual([{ key: "A", manque: ["planche"] }]);
    // La reprise, à la charge du Studio, passe par identity.images (images « planche ») ; le choix attend sous deux planches.
    const I = await import("@/lib/syna-agent/tools/identity");
    expect(I.finirPlanchesGardees(j as never, ["A"], ["planche"])).toBe(true);
    expect(I.devisDesImages(j as never, ["A"], ["planche"])).toMatchObject({ studio: true });
  });

  const rejeuPhrase = async () => {
    const DEUX = ["SAVONNERIE ARTISANALE", "SAVONS · SHAMPOINGS · BAUMES"];
    const lue = (l: string[]) => ({ phrasesLues: [l.join(" / ")] });
    // 1. Le Studio retrouve la phrase choisie pour CE logo fini (par le numéro de son esquisse) ; « aucune » : aucune.
    const g = { logos: [{ numero: 6, assetId: "logo6abcd" }, { numero: 10, assetId: "logo10abcd" }, { numero: 2, assetId: "logo2abcd" }], phrases: { "6": { de: 6, texte: DEUX.join(" / "), lignes: DEUX }, "10": { sienne: true as const, texte: "Le savon à froid" }, "2": { aucune: true as const } } };
    expect([P.phraseDuLogoFini(g, "logo6abcd"), P.phraseDuLogoFini(g, "logo10abcd"), P.phraseDuLogoFini(g, "logo2abcd")]).toEqual([DEUX, ["Le savon à froid"], undefined]);
    // 2. Le texte : la phrase, toutes ses lignes dans l'ordre, posée par le code dans la ligne de la marque ; le reste du
    // texte des preuves mot pour mot (une seule ligne diffère), la phrase des données vérifiées toujours à la toute fin.
    const avec = await tache({ phrase: DEUX, verdicts: () => ({ ...bon("Tenon", "tenon.fr — disponible"), ...lue(DEUX) }) });
    const preuve = fs.readFileSync(`${F}/tenon-prompt.txt`, "utf8").split("\n"), envoye = avec.appels[0].texte.split("\n");
    expect(envoye.slice(0, preuve.length).filter((l, i) => l !== preuve[i])).toEqual([`- Tenon, ${TENON.metier} : marque artisanale, chaleureuse, précise et haut de gamme. Sa phrase, choisie par le client et écrite sous le logo, en 2 lignes, dans cet ordre : « SAVONNERIE ARTISANALE » puis « SAVONS · SHAMPOINGS · BAUMES » ; c'est aussi son slogan : partout où la planche l'écrit, écris-la exactement, toutes ses lignes dans cet ordre, sans en changer une lettre ni un accent.`]);
    expect(avec.appels[0].texte.endsWith("écris exactement « tenon.fr — disponible » et « © 2026 Tenon » ; n'ajoute aucune promesse, aucun chiffre ni aucun avis ; aucune personne visible.")).toBe(true);
    // L'appel des valeurs ne la voit jamais (sa demande ne la porte pas) ; le contrôle gratuit la retrouve mot pour mot.
    expect(P.demandeDesValeurs({ nom: "Tenon", metier: TENON.metier, fiche: "Je fais des cuisines.", personnes: false, kind: "services" })).not.toMatch(/SAVONNERIE/);
    expect(P.controleDeLaPhrase(avec.appels[0].texte, DEUX)).toEqual([]);
    expect(P.controleDeLaPhrase(avec.appels[0].texte.replace("BAUMES", "BAUME"), DEUX)).toHaveLength(1);
    // 3. Le relecteur la reçoit et dit où il la lit ; juste partout : gardée du premier coup.
    expect(avec.relectures[0]).toMatchObject({ nbArgs: 6, avecPhrase: true });
    expect(avec.relectures[0].demande).toContain("Le client a choisi la phrase écrite sous son logo, en 2 lignes, dans cet ordre : « SAVONNERIE ARTISANALE » puis « SAVONS · SHAMPOINGS · BAUMES ». Elle n'est pas inventée, et ce n'est jamais un micro-texte décoratif");
    expect(avec.r.route.board.planche).toMatchObject({ phrase: DEUX, essais: 1 });
    expect(avec.r.route.board.planche!.image).toBeTruthy();
    // Mal écrite à un endroit (une lettre), ou rangée dans les micro-textes : refusée comme un nom mal écrit, refaite une
    // fois à la charge du Studio avec cette raison.
    const faute = await tache({ phrase: DEUX, verdicts: (_d, n) => ({ ...bon("Tenon", "tenon.fr — disponible"), phrasesLues: n === 1 ? [DEUX.join(" / "), "SAVONNERIE ARTISANALE / SAVONS · SHAMPOOINGS · BAUMES"] : [DEUX.join(" / ")] }) });
    expect(faute.appels.map((a) => a.studio)).toEqual([false, true]);
    expect(faute.appels[1].texte.endsWith("À corriger : la phrase choisie par le client est mal écrite (« SAVONNERIE ARTISANALE / SAVONS · SHAMPOOINGS · BAUMES » au lieu de « SAVONNERIE ARTISANALE » / « SAVONS · SHAMPOINGS · BAUMES »).")).toBe(true);
    const a = { nom: "Tenon", annee: 2026, domaine: { domaine: "tenon.fr", statut: "disponible" as const }, personnes: false, animaux: false, phrase: DEUX };
    expect(P.raisonsDuRefusDeLaPlanche({ ...bon("Tenon", "tenon.fr — disponible"), ...lue(DEUX), microTextes: ["SAVONERIE ARTISANAL (texte circulaire du badge)"] }, a).join(" ")).toMatch(/la phrase choisie par le client est mal écrite/);
    expect(P.raisonsDuRefusDeLaPlanche({ ...bon("Tenon", "tenon.fr — disponible"), ...lue(DEUX), fautes: ["SAVONS · SHAMPOING · BAUMES (badge)"] }, a).join(" ")).toMatch(/fautes/);
    expect(P.raisonsDuRefusDeLaPlanche({ ...bon("Tenon", "tenon.fr — disponible"), ...lue(["SAVONNERIE ARTISANALE"]) }, a).join(" ")).toMatch(/mal écrite/);
    expect(P.raisonsDuRefusDeLaPlanche({ ...bon("Tenon", "tenon.fr — disponible") }, a).join(" ")).toMatch(/n'est lue nulle part/);
    // 4. Sans phrase (« aucune » ou rien de choisi) : rien ne change (le texte des preuves, cinq paramètres au relecteur).
    const sans = await tache({ verdicts: () => bon("Tenon", "tenon.fr — disponible") });
    expect(sans.appels[0].texte.startsWith(fs.readFileSync(`${F}/tenon-prompt.txt`, "utf8"))).toBe(true);
    expect(sans.relectures[0]).toMatchObject({ nbArgs: 5 });
    expect(sans.relectures[0].demande).not.toMatch(/phrase écrite sous son logo|phrasesLues/);
    expect(sans.r.route.board.planche!.phrase).toBeUndefined();
    // 5. Le script d'essai lit la phrase à côté du logo fini de l'étape 2 (esquisse-NN-phrase-du-logo.txt).
    const src = fs.readFileSync("scripts/syna-recette/essai-planches-outil.ts", "utf8");
    expect(src).toContain("`${m[1]}-phrase-du-logo.txt`");
    expect(src).toContain("...(l.phrase ? { phrase: l.phrase } : {}) });");
  };
  epreuve("planche-reprend-la-phrase-du-logo", rejeuPhrase);

  // Le rejeu de planche-phrase-par-lignes-et-reprise-qui-part-toujours, remplacée le 26 novembre 2026 par
  // planche-signe-parasite-petite-finition : inchangé, rejoué par l'épreuve qui la remplace.
  const rejeuLignes = async () => {
    // 1. Tout ce que demandaient les deux épreuves remplacées reste vrai.
    await rejeuLisible();
    await rejeuPhrase();
    const E = "tests/fixtures/ecume-planches", PH = ["SAVONNERIE ARTISANALE", "BULLES DE SOIN AU NATUREL"];
    const ECUME = { nom: "Écume", annee: 2026, domaine: { domaine: "ecumefrance.fr", statut: "disponible" as const }, personnes: false, animaux: false, phrase: PH };
    // 2. Le verdict réel de la planche A d'Écume (premier essai), copié tel quel : plus aucun des quinze refus faux.
    const brut = JSON.parse(fs.readFileSync(`${E}/planche-A-1-relecture-verdict.json`, "utf8"));
    expect(brut.raisons.filter((x: string) => x.startsWith("la phrase choisie par le client est mal écrite"))).toHaveLength(16);
    const lu = P.lectureDeLaPlanche(P.VerdictRangeDeLaPlancheSchema.parse(brut.verdict), ECUME);
    expect(lu.raisons).toEqual([
      "la phrase choisie par le client est mal écrite (« 09 Sac en tissu : [1re ligne masquée par l'étiquette] / [illisible] AU NATUREL » au lieu de « SAVONNERIE ARTISANALE » / « BULLES DE SOIN AU NATUREL »)",
      "fautes : « Dites-le nous ! (il faut « Dites-le-nous ! ») », « Sac en tissu (bloc 09) : la 2e ligne de la phrase sous le logo est déformée, « BULLES DE SOIN » illisible, la 1re ligne est masquée par l'étiquette »",
      "une personne est visible sans l'accord du client",
      "à retirer, aucune personne ni partie du corps : une main est visible dans l'image de référence « Mousse délicate » alors qu'aucune personne ne doit apparaître",
      "elle n'est pas au niveau (5/10, il faut 8)",
    ]);
    // 3. La forme structurée : seules les lignes comptent ; cachée en partie par un objet, seuls les mots visibles.
    expect(P.raisonsDuRefusDeLaPlanche({ ...bon("Écume", "ecumefrance.fr — disponible"), copyrightLu: "© 2026 Écume", phrasesLues: [{ emplacement: "01 Logo principal", lignes: PH, cachee: false }, { emplacement: "09 Support", lignes: ["…", "BULLES DE SOIN AU NATUREL"], cachee: true }] }, ECUME)).toEqual([]);
    expect(P.raisonsDuRefusDeLaPlanche({ ...bon("Écume", "ecumefrance.fr — disponible"), copyrightLu: "© 2026 Écume", phrasesLues: [{ emplacement: "09 Support", lignes: ["…", "BULES DE SOIN AU NATUREL"], cachee: true }] }, ECUME).join(" ")).toMatch(/la phrase choisie par le client est mal écrite/);
    const consigne = P.demandeAuRelecteurDeLaPlanche({ ...ECUME, texte: "t" });
    expect(consigne).toContain("Une partie seulement cachée ne va jamais dans fautes.");
    expect(`${consigne}\n${P.RELECTEUR_DE_LA_PLANCHE}`).not.toMatch(/sac|étiquette|tissu|mousse délicate|Dites-le/i);
    // 4. La reprise part toujours : le texte de la reprise réelle de A, puis 30 raisons, sous la taille permise.
    const valeurs = JSON.parse(fs.readFileSync(`${E}/valeurs-du-metier.json`, "utf8")).valeurs;
    const donnees = { nom: "Écume", valeurs, annee: 2026, domaine: ECUME.domaine, personnes: false, phrase: PH };
    expect(P.texteDeLaPlanche(donnees)).toBe(fs.readFileSync(`${E}/planche-A-1-texte-envoye.txt`, "utf8"));
    expect(Buffer.byteLength(fs.readFileSync(`${E}/planche-A-2-texte-envoye.txt`, "utf8"))).toBeGreaterThan(mp.PLANCHE_TEXTE_MAX_OCTETS);
    expect(Buffer.byteLength(P.texteDeLaPlanche({ ...donnees, raisons: lu.raisons }))).toBeLessThanOrEqual(mp.PLANCHE_TEXTE_MAX_OCTETS);
    const trente = Array.from({ length: 30 }, (_x, i) => `fautes : « un long texte relevé numéro ${i} ${"encore ".repeat(20)}»`);
    expect(Buffer.byteLength(P.texteDeLaPlanche({ ...donnees, raisons: trente }))).toBeLessThanOrEqual(mp.PLANCHE_TEXTE_MAX_OCTETS);
    expect(P.TEXTE_DE_LA_PLANCHE_MAX_OCTETS).toBe(mp.PLANCHE_TEXTE_MAX_OCTETS);
    // 5. Chaque planche est indépendante : A en erreur (signalée au Studio, jamais montrée), B faite.
    const signales: string[] = [];
    T.signalement.auStudio = (x) => { signales.push(x.key); };
    try {
      let n = 0;
      const ai = {
        valeurs: async () => { throw new Error("aucun appel attendu"); },
        dessiner: async () => { n += 1; if (n === 1) throw new Error("Texte de la planche trop long : rien n'est envoyé."); return { png: await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#EEE" } }).png().toBuffer(), recu: null }; },
        relire: async () => ({ ...bon("Tenon", "tenon.fr — disponible") }),
      };
      const u = await account(), pid = project(u, "services") as string;
      const logo = await saveAsset({ projectId: pid, userId: u.id, data: await sharp({ create: { width: 256, height: 256, channels: 3, background: "#FFFFFF" } }).png().toBuffer(), name: "logo-fini.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready" });
      T.plancheDeps.domaines = async () => ({ taken: [], free: ["tenon.fr"], unknown: [], at: 1 });
      T.plancheDeps.annee = () => 2026;
      const faire = (key: string) => fr(() => T.plancheDeLaRoute({ ctx: { step: async (_k: string, fn: () => Promise<any>) => fn() }, ai, who: { userId: u.id, projectId: pid }, route: { ...route(key as never), name: "Tenon" } as never, round: 1, valeurs: { ok: true, valeurs: TENON }, logoAssetId: logo.id, personnes: false }));
      const a = await faire("A"), b = await faire("B");
      expect(a.route.board.planche).toMatchObject({ erreur: true });
      expect(a.route.board.planche!.image).toBeUndefined();
      expect(b.route.board.planche!.image).toBeTruthy();
      expect(signales).toEqual(["A"]);
    } finally { T.signalement.auStudio = undefined; T.plancheDeps.domaines = undefined; T.plancheDeps.annee = undefined; }
    expect(fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8")).toContain("if (!plafond) await T.signalerAuStudio({ userId: p.userId, projectId: p.id, key: x.key, nom: x.name, message, e });");
    // 6. Le script d'essai : planches indépendantes, reprise d'une planche déjà payée, devis de ce chemin.
    const outil = fs.readFileSync("scripts/syna-recette/essai-planches-outil.ts", "utf8"), script = fs.readFileSync("scripts/syna-recette/essai-planches.mts", "utf8");
    expect(outil).toContain("if (erreur instanceof PlafondDeLEssaiAtteint) { res.arret = raisonDeLArret(erreur, `planche ${l.key}`); break; }");
    expect(outil).toContain("reprises.set(T.clesDeLaPlanche.relecture(1, l.key, 1), rep.verdict);");
    expect(outil).toContain("if (dejaEcrites) reprises.set(T.clesDeLaPlanche.valeurs(client.nom), dejaEcrites);");
    expect(script).toContain("process.env[`REPRENDRE_${k}`]");
    const { devisDeLEssai } = await import("../scripts/syna-recette/essai-planches-outil");
    const d = await devisDeLEssai(2, { valeursFaites: true, reprises: [1] });
    expect(d.lignes.filter((l) => l.planche === 1).map((l) => l.charge)).toEqual(["Studio", "Studio"]);
    expect(d.lignes.some((l) => l.planche == null)).toBe(false);
  };
  epreuve("planche-phrase-par-lignes-et-reprise-qui-part-toujours", rejeuLignes);

  epreuve("planche-signe-parasite-petite-finition", async () => {
    // 1. Tout ce que demandait l'épreuve remplacée reste vrai.
    await rejeuLignes();
    const E2 = "tests/fixtures/ecume-planches-2", PH = ["SAVONNERIE ARTISANALE", "BULLES DE SOIN AU NATUREL"];
    const FAUTE = "Titre SEO (bloc 10) : « Écume – Savonnerie artisanale |´ » — accent parasite après la barre de séparation";
    const texte = fs.readFileSync(`${E2}/planche-A-2-texte-envoye.txt`, "utf8");
    const ECUME = { nom: "Écume", annee: 2026, domaine: { domaine: "ecumefrance.fr", statut: "disponible" as const }, personnes: false, animaux: false, phrase: PH, texte };
    // 2. Le verdict réel de A-2 d'Écume, copié tel quel : refusé pour ce seul accent ; aujourd'hui gardé, la finition notée.
    const brut = JSON.parse(fs.readFileSync(`${E2}/planche-A-2-relecture-verdict.json`, "utf8"));
    expect(brut.gardee).toBe(false);
    expect(brut.raisons).toEqual([`fautes : « ${FAUTE} »`]);
    const v = P.VerdictRangeDeLaPlancheSchema.parse(brut.verdict);
    expect([v.note, v.fautes]).toEqual([8, [FAUTE]]);
    expect(v.pourquoi).toMatch(/montrable/);
    const lu = P.lectureDeLaPlanche(v, ECUME);
    expect(lu.raisons).toEqual([]);
    expect(lu.finitions).toEqual([FAUTE]);
    expect(lu.ecartes).toContain(`petite finition, notée sans refus : « ${FAUTE} »`);
    // 3. Toujours des refus : un accent dans un mot ou collé à un mot, une lettre fausse, un mot mal écrit.
    for (const f of ["Titre SEO (bloc 10) : « Écume – Savonne´rie artisanale » — accent parasite dans le mot", "Titre SEO (bloc 10) : « Écume – Savonnerie artisanale´ » — accent parasite collé au mot", "Titre SEO (bloc 10) : « Écume – Savonerie artisanale |´ » — accent parasite après la barre", "Titre SEO (bloc 10) : « Écume – Savonnerie artisanale | » — lettre en trop et barre parasite"]) expect(P.lectureDeLaPlanche({ ...v, fautes: [f] }, ECUME).raisons.join(" "), f).toMatch(/^fautes : /);
    // Le nom, la phrase du logo, l'adresse et l'année : comparés lettre pour lettre, jamais rangés en finition.
    expect(P.lectureDeLaPlanche({ ...v, nomLu: "Écume´" }, ECUME).raisons.join(" ")).toMatch(/le nom est mal écrit/);
    expect(P.lectureDeLaPlanche({ ...v, copyrightLu: "© 2025 Écume" }, ECUME).raisons.join(" ")).toMatch(/copyright/);
    expect(P.lectureDeLaPlanche({ ...v, domaineLu: "ecumefrance.fr ´ — disponible" }, ECUME).raisons.join(" ")).toMatch(/bloc 10 doit dire exactement/);
    expect(P.lectureDeLaPlanche({ ...v, phrasesLues: [{ emplacement: "slogan", lignes: ["SAVONNERIE ARTISANALE ´", PH[1]], cachee: false }] }, ECUME).raisons.join(" ")).toMatch(/la phrase choisie par le client est mal écrite/);
    for (const f of ["Titre : « Écume ´ » — accent parasite", "Bloc 10 : « ecumefrance.fr ´ — disponible » — accent parasite", "Bloc 10 : « © 2026 Écume . » — point parasite", "Bloc 04 : « SAVONNERIE ARTISANALE ´ » — accent parasite"]) expect(P.signeParasiteIsole(f, ECUME), f).toBeNull();
    // 4. La note sous 8 qui ne tient qu'à des finitions ne compte pas ; avec une autre raison, elle compte.
    expect(P.lectureDeLaPlanche({ ...v, note: 7 }, ECUME).raisons).toEqual([]);
    expect(P.lectureDeLaPlanche({ ...v, note: 7, copies: ["le harnais"] }, ECUME).raisons).toHaveLength(2);
    // 5. La consigne, en termes généraux, sans nom ni exemple d'essai.
    expect(P.RELECTEUR_DE_LA_PLANCHE).toContain(P.PETITE_FINITION_DE_LA_PLANCHE);
    expect(P.PETITE_FINITION_DE_LA_PLANCHE).toMatch(/^Un signe parasite isolé, hors des mots, qui ne change aucun mot \(un accent, un trait, une barre ou un point égaré\) est une petite finition : il ne fait jamais descendre la note sous 8/);
    expect(P.RELECTEUR_DE_LA_PLANCHE).not.toMatch(/écume|savonnerie|SEO|référencement|\|´|séparation|racine|tenon/i);
    // 6. Le script des planches rejuge A-2 à partir de son image et de son verdict déjà payés, sans aucun appel.
    const os = await import("node:os"), path = await import("node:path");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "epreuve-rejuger-"));
    for (const n of ["planche-A-2-relecture-verdict.json", "planche-A-2-texte-envoye.txt", "planche-A-2-relecture-demande.txt", "planche-A-resultat.json", "valeurs-du-metier.json"]) fs.copyFileSync(`${E2}/${n}`, path.join(dir, n));
    fs.writeFileSync(path.join(dir, "planche-A-2-brute.png"), await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#F4EFE6" } }).png().toBuffer());
    const { rejugerUnePlanche } = await import("../scripts/syna-recette/essai-planches-outil");
    const { ECUME: client } = await import("./clients-d-essai");
    const r = await rejugerUnePlanche({ dossier: dir, key: "A", client });
    expect(r).toMatchObject({ gardee: true, note: 8, raisons: [], finitions: [FAUTE] });
    expect(JSON.parse(fs.readFileSync(path.join(dir, "planche-A-resultat.json"), "utf8")).planche.image).toBeTruthy();
    expect(fs.readFileSync(path.join(dir, "rapport.txt"), "utf8")).toContain("dépense de ce rejugement : 0 € (aucun appel)");
    expect(fs.readFileSync("scripts/syna-recette/essai-planches.mts", "utf8")).toContain("if (process.env.REJUGER?.trim())");
  });
});

describe("les épreuves de la planche en vrai (25 novembre 2026, aucun appel)", async () => {
  const V = await import("@/lib/syna-agent/planche-en-vrai");
  const C = await import("@/lib/syna-agent/planche-en-vrai-code");
  const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
  const mp = await import("@/lib/ai/media-providers");
  const { aLaChargeDuStudio, chargeDuStudio } = await import("@/lib/billing");
  const uni = (w: number, h: number, c: string) => sharp({ create: { width: w, height: h, channels: 3, background: c } }).png().toBuffer();
  const bon = { identique: true, textesLus: [] as string[], logoPresent: false, personne: false, logoFonceSurFondSombre: false, produitFidele: null as boolean | null, texteCoupe: false, note: 9, pourquoi: "" };

  epreuve("vrai-produit-dans-la-planche-en-vrai", async () => {
    // Sa photo jointe là où l'inventaire voit le produit, en dernier, avec la phrase ; jamais ailleurs.
    const inv = (produit: boolean, logo = true) => ({ case: "produit-1", logo, textes: [], produit, personne: false, comprehensible: null, description: "" });
    const a = Buffer.from("a"), l = Buffer.from("l"), ph = Buffer.from("p");
    expect(V.jointesDeLElement({ apercu: a, logo: l, photo: ph, inventaire: inv(true) }).map((j) => j.role)).toEqual(["apercu", "logo", "produit"]);
    expect(V.jointesDeLElement({ apercu: a, logo: l, photo: ph, inventaire: inv(false) }).map((j) => j.role)).toEqual(["apercu", "logo"]);
    expect(V.texteDeLElement({ element: "produit-1", nom: "Aplomb", logo: true, photo: true, personnes: false })).toContain("remplace le produit par celui de la photo jointe, garde la mise en scène à l'identique");
    // La relecture reçoit la photo, compare, et refuse un autre produit.
    const vus: string[] = [];
    const r = await V.refaireLesElements({
      refaire: async () => uni(912, 1088, "#777777"),
      relire: async (_g, items, demande) => { vus.push(...items.flatMap((it) => (it.photo ? [`${it.element}:photo`] : [])), demande); return { images: items.map((it) => ({ case: it.element, ...bon, produitFidele: false })) }; },
      aLaChargeDuStudio,
    }, { nom: "Aplomb", personnes: false, logo: l, photo: await uni(64, 64, "#222222"), apercus: new Map([["produit-1", await uni(229, 272, "#666666")]]), inventaire: V.InventaireSchema.parse({ cases: [inv(true)], polices: { titres: {}, textes: {} } }), elements: ["produit-1"] });
    expect(vus).toContain("produit-1:photo");
    expect(vus.join(" ")).toMatch(/produit-1 \(photo du produit jointe\)/);
    expect(r.get("produit-1")).toMatchObject({ ok: false });
    expect(r.get("produit-1")!.essais[0].raisons.join(" ")).toMatch(/pas celui de la photo du client/);
    // Sans photo : image d'ambiance, jamais reprise par le site.
    const { photothequeDeLaPlanche } = await import("@/lib/syna-agent/custom-theme/brand");
    expect(photothequeDeLaPlanche({ plancheEnVrai: { elements: [{ element: "produit-1", id: "x", essais: 1, ambiance: true }] } } as never)).toEqual([]);
    expect(V.phraseDuProduitImagine()).toMatch(/« image d'ambiance, ce n'est pas ton produit »\) : ils ne vont jamais sur les emplacements produit de ton site, où « Ta photo ici » attend tes photos/);
    expect(T.produitsImagines({ elements: [{ element: "produit-2", id: "y", essais: 1, ambiance: true }] } as never)).toEqual(["produit-2"]);
  });

  const rejeuEnVraiALIdentique = async () => {
    // Les 17 images, leurs tailles des preuves, les champs exacts.
    expect(V.NOMS_DES_ELEMENTS).toHaveLength(17);
    expect(mp.champsDElementDeLaPlanche("t", "1088x1088")).toEqual({ model: "gpt-image-2.5-sunburst", prompt: "t", quality: "high", size: "1088x1088", background: "opaque", output_format: "png", n: 1 });
    for (const n of V.NOMS_DES_ELEMENTS) expect(mp.TAILLES_DE_LA_PLANCHE_EN_VRAI as readonly string[]).toContain(V.ELEMENTS[n].taille);
    // Les cases fixes, empreinte vérifiée.
    expect(crypto.createHash("sha256").update(fs.readFileSync("assets/planche-de-marque/cases.json")).digest("hex")).toBe(V.CASES.sha256);
    // La règle des preuves mot pour mot, plus la ligne ; le logo seulement s'il y est ; les marges des formats larges.
    expect(V.texteDeLElement({ element: "reference-1", nom: "Aplomb", logo: true, photo: false, personnes: true })).toBe(`${V.REGLE_APERCU} ${V.regleDuLogo("Aplomb")} C'est une photo d'ambiance de la marque.`);
    expect(V.jointesDeLElement({ apercu: Buffer.from("a"), logo: Buffer.from("l"), photo: null, inventaire: undefined }).map((j) => j.role)).toEqual(["apercu"]);
    expect(V.ligneDeLElement("ouverture-site", true)).toContain("Garde des marges généreuses : aucun texte ne touche les bords.");
    // Les formats : publications recadrées, ouverture réduite, jamais rognée.
    const o = await V.auFormatFinal("ouverture-site", await uni(2048, 768, "#AAAAAA"));
    expect(o.ok && [o.w, o.h]).toEqual([1920, 720]);
    expect((await V.auFormatFinal("ouverture-site", await uni(2048, 1088, "#AAAAAA"))).ok).toBe(false);
    const p = await V.auFormatFinal("publication-9x16", await uni(1088, 1936, "#AAAAAA"));
    expect(p.ok && [p.w, p.h]).toEqual([1080, 1920]);
    // Une reprise à la charge du Studio ; refusée deux fois, pas de fichier (l'aperçu garde sa case).
    const tours: boolean[] = [];
    const r = await V.refaireLesElements({ refaire: async () => { tours.push(chargeDuStudio()); return uni(1024, 912, "#777777"); }, relire: async (_g, items) => ({ images: items.map((it) => ({ case: it.element, ...bon, note: 5 })) }), aLaChargeDuStudio },
      { nom: "Aplomb", personnes: false, logo: Buffer.alloc(0), photo: null, apercus: new Map([["reference-3", await uni(236, 211, "#555555")]]), inventaire: V.InventaireSchema.parse({ polices: { titres: {}, textes: {} } }), elements: ["reference-3"] });
    expect(tours).toEqual([false, true]);
    expect(r.get("reference-3")).toMatchObject({ ok: false, png: null });
    // La palette mesurée et les polices du catalogue ; les dix versions.
    const past = V.lesCases("animaux").pastilles;
    expect(await C.mesurerLaPalette(await C.plancheDeTest(past, ["#0A4E2B", "#6B8F5A", "#A7C0A0", "#F8F6EE", "#D9B89A"]), past)).toEqual(["#0A4E2B", "#6B8F5A", "#A7C0A0", "#F8F6EE", "#D9B89A"]);
    expect(C.policeDuCatalogue({ nom: "Inter", genre: "sans" }, 400)).toMatchObject({ famille: "Inter", remplacee: false });
    expect(C.VERSIONS_DU_LOGO).toHaveLength(10);
    // L'assemblage en 3072 × 4608.
    expect(V.TAILLE_EN_VRAI).toEqual({ w: 3072, h: 4608 });
    // Plus de mélange une fois la planche de marque faite.
    expect(V.phraseDuMelangeRefuse()).toMatch(/le mélange de deux identités n'est plus possible/);
    expect(fs.readFileSync("src/lib/syna-agent/tools/identity.ts", "utf8")).toContain("return { ok: false, summary: phraseDuMelangeRefuse()");
  };
  epreuve("planche-en-vrai-a-l-identique", rejeuEnVraiALIdentique);

  const rejeuSymboleSeulEtBandeau = async () => {
    // 1. Le vrai logo de l'essai : symbole et nom séparés sur le masque d'encre ; le compact, l'icône et le favicon en symbole seul.
    const logo = fs.readFileSync("tests/fixtures/planche-en-vrai/esquisse-11-logo-garde-512.png");
    const sep = await C.separerSymbole(logo);
    expect(sep).toMatchObject({ fiable: true, sens: "dessus" });
    const police = C.policeDuCatalogue({ nom: "Montserrat", genre: "sans" }, 400);
    const bas = C.texteDuBasDuBadge({ ligneDuLogo: "", metierCourt: "les plantes d'intérieur" });
    expect(bas).toBe("plantes d'intérieur");
    expect(C.texteDuBasDuBadge({ ligneDuLogo: "Le bois bien fait", metierCourt: "la menuiserie" })).toBe("Le bois bien fait");
    const v = await C.versionsDuLogo({ logo, separation: sep, couleur: "#5D0126", sombre: "#640B29", clair: "#F7F3EC", monoClair: "#A1B89B", nom: "Aplomb", bas, police });
    expect(v.symboleComplet).toBe(false);
    const sym = await sharp(sep.symbole).metadata(), compact = await sharp(v.versions["logo-compact"]).metadata();
    expect([compact.width, compact.height]).toEqual([sym.width, sym.height]);
    const hz = await sharp(v.versions["logo-horizontal"]).metadata();
    expect(hz.width! / hz.height!).toBeGreaterThan(3);
    const bloc = await uni(300, 300, "#0A0A0A");
    expect((await C.separerSymbole(bloc)).fiable).toBe(false);
    // 2. Le symbole seul joint là où l'inventaire ne voit que lui ; sans séparation fiable, rien ; une ancienne réponse garde la règle d'avant.
    const cas = (x: Record<string, unknown>) => V.CaseLueSchema.parse({ case: "reference-6", logo: true, textes: [], produit: false, personne: false, comprehensible: null, description: "", ...x });
    const a = Buffer.from("a"), l = Buffer.from("l"), s = Buffer.from("s");
    expect(V.jointesDeLElement({ apercu: a, logo: l, photo: null, inventaire: cas({ logoVu: "symbole" }), symbole: s }).map((j) => j.role)).toEqual(["apercu", "symbole"]);
    expect(V.jointesDeLElement({ apercu: a, logo: l, photo: null, inventaire: cas({ logoVu: "symbole" }), symbole: null }).map((j) => j.role)).toEqual(["apercu"]);
    expect(V.jointesDeLElement({ apercu: a, logo: l, photo: null, inventaire: cas({}), symbole: s }).map((j) => j.role)).toEqual(["apercu", "logo"]);
    expect(V.texteDeLElement({ element: "reference-6", nom: "Aplomb", logo: false, symbole: true, photo: false, personnes: false })).toContain(V.regleDuSymbole("Aplomb"));
    // 3. Le bandeau : marges blanches rognées avant la relecture, l'image rognée gardée.
    const photo = await sharp({ create: { width: 2304, height: 558, channels: 3, background: "#3A5A40" } }).png().toBuffer();
    const avecMarges = await sharp({ create: { width: 2304, height: 768, channels: 3, background: "#FFFFFF" } }).composite([{ input: photo, left: 0, top: 120 }]).png().toBuffer();
    const relues: number[] = [];
    const r = await V.refaireLesElements({ refaire: async () => avecMarges, relire: async (_g, items) => { for (const it of items) relues.push((await sharp(it.image).metadata()).height!); return { images: items.map((it) => ({ case: it.element, ...bon })) }; }, aLaChargeDuStudio },
      { nom: "Aplomb", personnes: false, logo: Buffer.alloc(0), photo: null, apercus: new Map([["ouverture-planche", await uni(1056, 285, "#3A5A40")]]), inventaire: V.InventaireSchema.parse({ polices: { titres: {}, textes: {} } }), elements: ["ouverture-planche"] });
    expect(relues).toEqual([558]);
    expect(r.get("ouverture-planche")).toMatchObject({ ok: true, w: 2304, h: 558 });
    // Les publications incompréhensibles restent hors du calendrier.
    expect(V.phraseDeLaPublicationIncomprehensible(1)).toMatch(/je ne la mets pas à ton calendrier/);
  };
  epreuve("planche-en-vrai-symbole-seul-et-bandeau-sans-marges", rejeuSymboleSeulEtBandeau);
  epreuve("planche-en-vrai-identique-a-l-apercu", async () => {
    // Tout ce que demandaient les deux épreuves remplacées reste rejoué.
    await rejeuEnVraiALIdentique();
    await rejeuSymboleSeulEtBandeau();
    const Fx = "tests/fixtures/ecume-planche-en-vrai";
    const inv = V.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${Fx}/inventaire-reponse.json`, "utf8")));
    const verdictDe = (f: string, n: string) => (JSON.parse(fs.readFileSync(`${Fx}/${f}`, "utf8")) as { verdict: import("@/lib/syna-agent/planche-en-vrai").RelectureDuGroupe }).verdict.images.find((x) => x.case === n)!;
    const demo = fs.readFileSync(`${Fx}/planche-B-gardee.jpg`), cases = V.lesCases("standard").cases;
    const pol = (cle: string, famille: string, poids: number) => ({ cle, famille, fichier: "", poids, handle: `${cle}_n${String(poids)[0]}`, lue: famille, remplacee: false });
    const route = { key: "A", name: "Écume", slogan: "SAVONNERIE / ARTISANALE", palette: { dark: "#C14706" }, board: { planche: { domaine: "ecumefrance.fr", statut: "disponible", annee: 2026 } } } as never;
    // 5. La palette : les codes écrits sur l'aperçu, gardés (écarts de 0,7 à 3,2) ; un code loin de la couleur peinte : la mesure.
    const mesurees = ["#C7470C", "#E37C52", "#F2E1D1", "#AAB599", "#977450"], ecrits = ["#C44912", "#D97A52", "#F6E8DA", "#A7B89B", "#8C6F4E"];
    expect(C.codesEcritsDeLaPalette(V.caseLue(inv, "palette")!.textes)).toEqual(ecrits);
    expect(T.paletteDeLaPlanche(mesurees, inv).hex).toEqual(ecrits);
    expect(C.paletteRetenue(mesurees, ["#C44912", "#2E7D32", "#F6E8DA", "#A7B89B", "#8C6F4E"]).hex[1]).toBe("#E37C52");
    expect(C.paletteRetenue(mesurees, []).hex).toEqual(mesurees);
    expect(C.SEUIL_DU_CODE_ECRIT).toBe(10);
    expect(fs.readFileSync("src/lib/syna-agent/planche-en-vrai-tache.ts", "utf8")).toContain("const retenue = paletteDeLaPlanche(await mesurerLaPalette(demo, cases.pastilles), inventaire);");
    // 1. La police manuscrite de la marque ne sert que dans son spécimen.
    const decor = await uni(V.TAILLE_DEMO.w, V.TAILLE_DEMO.h, "#F6F2EC");
    const entree = (textes: ReturnType<typeof pol>) => ({ demo: decor, boites: new Map([["palette", cases.palette], ["typographies", cases.typographies], ["seo", cases.seo]]), pastilles: V.lesCases("standard").pastilles, images: new Map(), versions: {} as never,
      palette: [{ hex: "#C44912", nom: "Orange Écume", mots: ["Chaleur", "énergie"] }], polices: { titres: pol("poppins", "Poppins", 700), textes }, signature: [], titres: new Map(), encre: "#1C2A24",
      blocs: new Map([["seo", { lignes: ["Titre SEO", "© 2026 Écume"] }]]) as never });
    const a = await C.assemblerLaPlanche(entree(pol("sacramento", "Sacramento", 400))), b = await C.assemblerLaPlanche(entree(pol("inter", "Inter", 400)));
    const zone = async (png: Buffer, q: number[]) => sharp(png).extract({ left: q[0] * 2, top: q[1] * 2, width: (q[2] - q[0]) * 2, height: (q[3] - q[1]) * 2 }).raw().toBuffer();
    expect((await zone(a, cases.palette)).equals(await zone(b, cases.palette))).toBe(true);
    expect((await zone(a, cases.seo)).equals(await zone(b, cases.seo))).toBe(true);
    expect((await zone(a, cases.typographies)).equals(await zone(b, cases.typographies))).toBe(false);
    expect(T.phrasesDesPolices(inv)).toEqual(["Moderne, ronde, accessible.", "Chaleureuse, humaine, naturelle."]);
    // 2. Rien ne s'ajoute sous le logo du haut.
    const t = T.textesDeLaPlanche(inv, route);
    expect(t.haut).toEqual([]);
    expect(t.hautDansLeLogo).toBe(true);
    // 3. Un titre redessiné : aucune encre de l'ancien ne reste dans la bande.
    const { createCanvas } = await import("@napi-rs/canvas");
    const b8 = cases["titre-08"], cv = createCanvas(V.TAILLE_DEMO.w, V.TAILLE_DEMO.h), x = cv.getContext("2d");
    x.fillStyle = "#F6F2EC"; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = "#E00000"; x.font = "800 17px sans-serif"; x.fillText("SITE WEB", b8[0] + 2, b8[1] + 9);
    const t8 = await C.assemblerLaPlanche({ ...entree(pol("sacramento", "Sacramento", 400)), demo: await cv.encode("png"), boites: new Map([["titre-08", b8]]), titres: new Map([["titre-08", "SITE WEB"]]), blocs: new Map() as never });
    const { data, info } = await sharp(t8).extract({ left: b8[0] * 2 - 20, top: b8[1] * 2 - 30, width: (b8[2] - b8[0]) * 2 + 60, height: (b8[3] - b8[1]) * 2 + 50 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let rouges = 0; for (let i = 0; i < info.width * info.height; i++) if (data[i * 3] > 150 && data[i * 3 + 1] < 90 && data[i * 3 + 2] < 90) rouges++;
    expect(rouges).toBe(0);
    // 4. Le bloc 01 du vrai logo 10 : sans symbole séparable, les quatre cases reprises de l'aperçu ; l'horizontal avec sa phrase.
    const det = await (await import("@/lib/syna-agent/brand-images")).logoDetoure(fs.readFileSync(`${Fx}/esquisse-10-logo-garde-512.png`), "#C14706");
    const logo = det.ok ? det.png : Buffer.alloc(0), sep = await C.separerSymbole(logo);
    expect(sep.fiable).toBe(false);
    const d = await V.decouperLesApercus(demo, "standard");
    const v = await C.versionsDuLogo({ logo, separation: sep, couleur: "#C44912", sombre: "#C44912", clair: "#F6E8DA", monoClair: "#A7B89B", nom: "Écume", bas: "SAVONNERIE ARTISANALE", police: T.POLICE_DU_BADGE, tuiles: d.apercus });
    expect([...v.depuisLApercu].sort()).toEqual(["badge", "favicon", "icone", "logo-compact"]);
    expect(await C.separerLaPhrase(logo)).not.toBeNull();
    // 6. La zone d'une case et l'heure du téléphone, sur les verdicts réels.
    expect(d.boites.get("publication-4x5")![1]).toBeGreaterThan(V.bandesDesTitres("standard").get("titre-07")![3]);
    expect(V.raisonsDuRefusEnVrai(verdictDe("publications-1-verdict.json", "publication-9x16"), { inventaire: V.caseLue(inv, "publication-9x16"), personnes: false, photo: false, deborde: true })).toEqual([]);
    const portrait = V.raisonsDuRefusEnVrai(verdictDe("publications-2-verdict.json", "publication-4x5"), { inventaire: V.caseLue(inv, "publication-4x5"), personnes: false, photo: false, deborde: true });
    expect(portrait).toEqual(["un texte est coupé ou collé au bord", "sa fidélité n'est pas au niveau (7/10, il faut 8)"]);
    expect(V.raisonsDuRefusEnVrai(verdictDe("site-2-verdict.json", "site-telephone"), { inventaire: V.caseLue(inv, "site-telephone"), personnes: false, photo: false })).toEqual([]);
    // Le réassemblage d'un essai, par le script, sans appel ; le devis de la reprise.
    const src = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8");
    expect(src).toContain("T.plancheEnVraiParLeCode(");
    expect(src).toContain("T.reprendreDesCasesEnVrai(");
    expect(src).toContain("process.env.REASSEMBLER");
    expect(T.devisDUneReprise(["publication-4x5", "emballage"]).maxMicro).toBeGreaterThan(0);
    // Les retouches gratuites : le recalage élargi (la story ne cache plus le sous-titre du bloc 07, le portrait n'est plus coupé).
    const story = d.boites.get("publication-9x16")!;
    expect(story[0] - cases["publication-9x16"][0]).toBeGreaterThanOrEqual(30);
    expect(d.boites.get("publication-4x5")![2]).toBeGreaterThanOrEqual(1328);
    // Le fond de l'aperçu gardé : une ombre douce n'est pas de l'encre, l'orange du logo l'est.
    expect(C.estEncre(0xC8, 0xBC, 0xAE, [0xF6, 0xEB, 0xDD], 40)).toBe(false);
    expect(C.estEncre(0xC4, 0x49, 0x12, [0xF6, 0xEB, 0xDD], 40)).toBe(true);
    // Les trois mots de chaque couleur.
    expect(C.lignesDesMots(createCanvas(10, 10).getContext("2d"), ["Chaleur", "énergie", "bienveillance"], C.fonteDeMiseEnPage(23, 400), 211).join(" ")).toBe("Chaleur, énergie, bienveillance");
    // Le site en une seule image, à la place des deux images séparées ; le rognage au contenu.
    const ev = { key: "B", demo: "d", logo: "l", laquelle: "standard", at: 1, planche: { id: "pl", w: 3072, h: 4608 }, logos: [], palette: [], symboleComplet: false, publications: [], issues: [], notes: [], siteEntier: { id: "site", w: 1698, h: 940 },
      elements: V.NOMS_DES_ELEMENTS.map((n) => ({ element: n, id: `id-${n}`, essais: 1 })) } as never;
    expect(V.imagesMontrees(ev).map((m) => m.element).filter((e) => e.startsWith("site"))).toEqual(["site"]);
    expect(Object.keys((await import("@/lib/syna-agent/brand-zip")).fichiersDeLaMarque(ev, "Écume", (id) => Buffer.from(id), () => null))).toContain("images/site-ordinateur-et-telephone.png");
    const cadre = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#F6F2EC" } }).composite([{ input: await uni(150, 120, "#30485A"), left: 100, top: 80 }]).png().toBuffer();
    expect([(await sharp(await C.rognerAuContenu(cadre, 6)).metadata()).width, (await sharp(await C.rognerAuContenu(cadre, 6)).metadata()).height]).toEqual([162, 132]);
    expect(fs.readFileSync("src/components/studio/tab-marque.tsx", "utf8")).toContain('className="columns-2 gap-3 md:columns-3 lg:columns-4" data-brand-envrai-images');
    expect(T.devisDesLogosEnHd().maxMicro).toBeGreaterThan(0);
  });
});

describe("les épreuves du texte sous le nom sur plusieurs lignes (essai d'Écume)", async () => {
  const E = await import("@/lib/syna-agent/esquisses");
  const P = await import("@/lib/syna-agent/phrase-sous-le-nom");
  const F = await import("@/lib/syna-agent/logo-finalisation");
  const G = await import("@/lib/syna-agent/logo-graphistes");
  const { phrasesDites } = await import("@/lib/syna-agent/tools/logo");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const NOM = "Écume", METIER = "une savonnerie artisanale qui vend en ligne des savons solides, des shampoings solides et des baumes";
  const L1 = "SAVONNERIE ARTISANALE", L2 = "SAVONS · SHAMPOINGS · BAUMES", DEUX = `${L1} / ${L2}`;
  const TEXTE = `Transforme cette esquisse en véritable logo contemporain pour ${NOM}, ${METIER}. Conserve l'idée centrale : un galet. Écris en petit sous le nom : « ${L1} », puis « ${L2} ». Fais évoluer cette idée vers une identité plus aboutie et plus distinctive. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif`;

  epreuve("phrase-sous-le-nom-toutes-ses-lignes", async () => {
    // 1. Le relevé : toutes les lignes, dans l'ordre ; une réponse d'avant se lit encore ; chaque ligne contrôlée.
    expect(E.RELECTEUR_DES_ESQUISSES).toContain("TOUT le texte écrit sous le nom, ligne par ligne, dans l'ordre");
    const c = [0, 1, 2].map((i) => ({ modele: "m", index: i, png: Buffer.from("x"), requestId: null }));
    const lu = (numero: number, phraseSousLeNom: unknown) => ({ numero, entiere: true, morceauDeVoisine: false, nomLu: NOM, arche: false, ok: true, pourquoi: "", piste: `p${numero}`, phraseSousLeNom, phraseBienEcrite: true });
    const a = E.appliquerLaRelecture(NOM, c, E.RelectureEsquissesSchema.parse({ esquisses: [lu(1, [L1, L2]), lu(2, L1), lu(3, [L1, "SAVONS · BAUMMMES"])] }), 1);
    expect(a.gardees.map((g) => g.phrase)).toEqual([{ texte: DEUX, lignes: [L1, L2], ok: true }, { texte: L1, ok: true }, expect.objectContaining({ ok: false })]);
    // 2. Le choix : toutes les lignes, une seule, ou la sienne avec « / », mot pour mot.
    const esquisses = [{ numero: 1, assetId: "a1", modele: "m", piste: "", tour: 1, recherche: 1, requestId: null, phrase: a.gardees[0].phrase }, { numero: 2, assetId: "a2", modele: "m", piste: "", tour: 1, recherche: 1, requestId: null }];
    expect(await fr(() => G.controleDesPhrases({ esquisses }, [1, 2], phrasesDites({ 2: 1 }), []))).toEqual({ ok: true, phrases: { 2: { de: 1, texte: DEUX, lignes: [L1, L2] } } });
    expect(await fr(() => G.controleDesPhrases({ esquisses }, [1, 2], phrasesDites({ 2: "1:1" }), []))).toEqual({ ok: true, phrases: { 2: { de: 1, texte: L1 } } });
    expect(await fr(() => G.controleDesPhrases({ esquisses }, [1, 2], [{ logo: 2, texte: DEUX }], [`Je veux ${DEUX}`]))).toMatchObject({ ok: true, phrases: { 2: { sienne: true, lignes: [L1, L2] } } });
    expect(await fr(() => G.controleDesPhrases({ esquisses }, [1, 2], [{ logo: 2, texte: DEUX }], [`Je veux ${L1}`]))).toMatchObject({ ok: false });
    // 3. La finalisation : les lignes exactes, dans l'ordre ; chacune contrôlée mot pour mot.
    const voulue = P.phraseVoulue({ de: 1, texte: DEUX, lignes: [L1, L2] })!;
    expect(F.ligneDeLaPhrase(voulue)).toContain(`dans cet ordre, chacune sur sa ligne, « ${L1} » puis « ${L2} »`);
    expect(F.controleDuTexte(TEXTE, NOM, METIER, voulue)).toEqual([]);
    expect(F.controleDuTexte(TEXTE.replace(`, puis « ${L2} »`, ""), NOM, METIER, voulue)).toHaveLength(1);
    // 4. La relecture : jamais « inventée » ; chaque ligne lettre pour lettre.
    const bien = { nomLu: NOM, ideeConservee: true, arche: false, phrase: DEUX, phraseDitLeMetier: false, note: 9, pourquoi: "" };
    expect(F.raisonsDuRefus(bien, NOM, voulue)).toEqual([]);
    for (const phrase of [L1, `${L1} / SAVONS · SHAMPOINGS`, `${DEUX} / DEPUIS 1998`, `${L2} / ${L1}`, ""]) expect(F.raisonsDuRefus({ ...bien, phrase }, NOM, voulue), phrase).toHaveLength(1);
    expect(F.raisonsDuRefus({ ...bien, phrase: L1 }, NOM, voulue).join(" ")).not.toMatch(/inventée/);
  });

});

describe("l'épreuve des 12 esquisses toujours correctes (essai d'Écume)", async () => {
  const E = await import("@/lib/syna-agent/esquisses");
  const G = await import("@/lib/syna-agent/logo-graphistes");
  const { MODELES_DE_RECHERCHE, demandeDeRecherche } = await import("@/lib/syna-agent/logo-recherche");
  const { jetonsDeSortieGptImage } = await import("@/lib/ai/media-providers");
  const metier = { metier: "une savonnerie artisanale qui vend en ligne des savons solides", court: "la savonnerie artisanale", piste: "savoir-faire" as const };
  const dessin = (cx: number, cy: number) => [
    { input: { create: { width: 80, height: 80, channels: 3 as const, background: "#E0703A" } }, left: cx - 40, top: cy - 100 },
    ...Array.from({ length: 5 }, (_v, i) => ({ input: { create: { width: 44, height: 80, channels: 3 as const, background: "#1F3D5B" } }, left: cx - 150 + i * 62, top: cy + 10 })),
  ];
  const planche = () => sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#FFFFFF" } }).composite([0, 1].flatMap((r) => [0, 1, 2].flatMap((c) => dessin(256 + c * 512, 256 + r * 512)))).png().toBuffer();
  const faux = (ecarter: (tour: number, modele: string, index: number) => boolean) => {
    const appels: { quoi: string; modele?: string; tour: number; studio: boolean; prompt?: string }[] = [];
    let studio = false;
    const parTour = new Map<number, string[]>();
    const d: import("@/lib/syna-agent/esquisses").RechercheDeps = {
      planche: async (modele, prompt, tour) => { appels.push({ quoi: "planche", modele, tour, studio, prompt }); parTour.set(tour, [...(parTour.get(tour) ?? []), modele]); return { png: await planche(), requestId: null, usage: null, coutMicro: 1 }; },
      relire: async (images, nom, tour) => {
        appels.push({ quoi: "relecture", tour, studio });
        const ms = [...(parTour.get(tour) ?? [])].sort((x, y) => (MODELES_DE_RECHERCHE as readonly string[]).indexOf(x) - (MODELES_DE_RECHERCHE as readonly string[]).indexOf(y));
        return { esquisses: images.map((_b, i) => ({ numero: i + 1, entiere: true, morceauDeVoisine: false, nomLu: ecarter(tour, ms[Math.floor(i / 6)], i % 6) ? "Ecum" : nom, ok: true, pourquoi: "", piste: `piste ${tour}-${i + 1}` })) };
      },
      aLaChargeDuStudio: async (fn) => { studio = true; try { return await fn(); } finally { studio = false; } },
    };
    return { d, appels };
  };

  epreuve("douze-esquisses-toujours-correctes", async () => {
    // Deux écartées sur la planche 2.5 : une nouvelle planche 2.5 seulement, la demande exacte suivie de « Évite ces
    // pistes déjà présentées », relue, à la charge du Studio ; 12 montrées, 6 et 6.
    const t = faux((tour, modele, i) => tour === 1 && modele === "gpt-image-2.5-sunburst" && (i === 1 || i === 4));
    const r = await E.rechercheDesEsquisses(t.d, { nom: "Écume", metier });
    expect(r.complete).toBe(true);
    expect(r.esquisses).toHaveLength(E.ESQUISSES_MONTREES);
    expect(E.ESQUISSES_MONTREES).toBe(12);
    expect(r.correctesDesLesPlanches).toBe(10);
    expect(r.remplacees.map((x) => [x.modele, x.index + 1])).toEqual([["gpt-image-2.5-sunburst", 2], ["gpt-image-2.5-sunburst", 5]]);
    const remplacement = t.appels.filter((a) => a.tour === 2);
    expect(remplacement.map((a) => [a.quoi, a.modele ?? null, a.studio])).toEqual([["planche", "gpt-image-2.5-sunburst", true], ["relecture", null, true]]);
    expect(remplacement[0].prompt!.startsWith(`${demandeDeRecherche({ nom: "Écume", metier })} Évite ces pistes déjà présentées : `)).toBe(true);
    for (const m of MODELES_DE_RECHERCHE) expect(r.esquisses.filter((e) => e.modele === m)).toHaveLength(6);
    // La façon la moins chère : une planche de six (1536 × 1024) produit moins de jetons qu'une seule esquisse carrée.
    for (const m of MODELES_DE_RECHERCHE) expect(jetonsDeSortieGptImage(m, "1536x1024", "medium")!).toBeLessThan(jetonsDeSortieGptImage(m, "1024x1024", "medium")!);
    // La borne : au plus trois tours ; atteinte, la recherche est incomplète et rien n'est montré.
    const b = faux((_tour, modele) => modele === "gpt-image-2.6-flare");
    const rb = await E.rechercheDesEsquisses(b.d, { nom: "Écume", metier });
    expect(E.REMPLACEMENTS_MAX).toBe(3);
    expect(rb.complete).toBe(false);
    expect(rb.tours).toBe(3);
    expect(rb.esquisses).toEqual([]);
    expect(rb.contact).toBeNull();
    expect(b.appels.filter((a) => a.studio)).toHaveLength(6);
    // La borne du Studio de la tâche couvre les trois tours de remplacement et la réécriture du métier.
    const d = G.devisDeLaRecherche(), sans = G.devisDeLaRecherche({ metier: false });
    expect(d.studioMaxMicro).toBeGreaterThanOrEqual(3 * d.repriseMicro + (d.maxMicro - sans.maxMicro));
    // La tâche du parcours s'arrête en erreur du Studio (jamais un message au client) quand la recherche est incomplète.
    const tache = fs.readFileSync("src/lib/syna-agent/logo-graphistes-tache.ts", "utf8");
    expect(tache).toContain("if (!r.complete) throw new PermanentError(");
    // Le script d'essai écrit le vrai résultat et les écartées sur la planche complète.
    const O = await import("../scripts/syna-recette/essai-esquisses-outil");
    expect(O.compteEnTexte({ voulues: 12, correctesDesLesPlanches: 10, remplacees: 2, toursDeRemplacement: 1, complete: true, lesquelles: [{ modele: "gpt-image-2.5-sunburst", case: 2, raison: "nom mal écrit : « Ecum »" }] })).toEqual([
      "Vrai résultat : 10 esquisse(s) correcte(s) sur 12 dès les deux planches.", "Remplacées : 2 (en 1 tour(s) de remplacement, à la charge du Studio).", "- planche gpt-image-2.5-sunburst, case 2 : nom mal écrit : « Ecum »"]);
    const src = fs.readFileSync("scripts/syna-recette/essai-esquisses-outil.ts", "utf8");
    expect(src).toContain('ecrireFichier("esquisses.json", json({ nom: CLIENT.nom, metier, compte: res.compte,');
    expect(src).toContain('ecrireFichier("planche-contact-complete.png", await plancheContactComplete(cases))');
  });
});

describe("l'épreuve de la planche en vrai identique en visuel (essai d'Écume, 26 novembre 2026, aucun appel)", async () => {
  const PM = await import("@/lib/syna-agent/planche-de-marque");
  const V = await import("@/lib/syna-agent/planche-en-vrai");
  const C = await import("@/lib/syna-agent/planche-en-vrai-code");
  const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
  const { BoardSchema } = await import("@/lib/syna-agent/brand-board");
  const { runWithLang } = await import("@/lib/i18n-server");
  const F2 = "tests/fixtures/ecume-planches-2";

  epreuve("planche-en-vrai-finitions-nettoyees-et-police-de-l-apercu", async () => {
    // 1. La finition de A-2, notée au verdict réel, voyage avec la planche gardée.
    const texte = fs.readFileSync(`${F2}/planche-A-2-texte-envoye.txt`, "utf8");
    const v = PM.VerdictRangeDeLaPlancheSchema.parse(JSON.parse(fs.readFileSync(`${F2}/planche-A-2-relecture-verdict.json`, "utf8")).verdict);
    const { finitions } = PM.lectureDeLaPlanche(v, { nom: "Écume", annee: 2026, domaine: { domaine: "ecumefrance.fr", statut: "disponible" }, personnes: false, animaux: false, phrase: ["SAVONNERIE ARTISANALE", "BULLES DE SOIN AU NATUREL"], texte });
    expect(finitions).toHaveLength(1);
    expect(BoardSchema.shape.planche.parse({ logo: "lg01", domaine: "ecumefrance.fr", statut: "disponible", annee: 2026, essais: 2, at: 1, finitions })!.finitions).toEqual(finitions);
    expect(fs.readFileSync("src/lib/syna-agent/planche-de-marque-tache.ts", "utf8")).toContain("...(dernier.finitions?.length ? { finitions: dernier.finitions } : {})");
    // 2. Le bloc 10 juste, avec la finition notée : redessiné par le code, l'accent « ´ » n'y est plus ; sans elle, le décor gardé.
    const route = (pl: Record<string, unknown> = {}) => ({ key: "A", name: "Écume", slogan: "", palette: {}, board: { planche: { image: { id: "pl", w: 1536, h: 2304 }, logo: "lg", domaine: "ecumefrance.fr", statut: "disponible", annee: 2026, essais: 2, at: 1, ...pl } } }) as any;
    const inv = (cases: Record<string, string[]>) => V.InventaireSchema.parse({ cases: Object.entries(cases).map(([c, textes]) => ({ case: c, textes })), polices: { titres: { nom: "Playfair Display", genre: "serif" }, textes: { nom: "Montserrat", genre: "sans" } } });
    const juste = ["Écume – Savonnerie artisanale", "ecumefrance.fr — disponible", "© 2026 Écume"];
    expect(T.textesDeLaPlanche(inv({ seo: juste }), route()).blocs.get("seo")).toBeNull();
    for (const seo of [juste, ["Écume – Savonnerie artisanale |´", ...juste.slice(1)], juste.slice(1), []]) {
      const bloc = T.textesDeLaPlanche(inv({ seo }), route({ finitions })).blocs.get("seo")!;
      expect(bloc.lignes.join(" "), seo.join(" / ")).not.toMatch(/´/);
      expect(bloc.lignes).toEqual(expect.arrayContaining(juste));
    }
    // À l'inventaire seulement, et dans les autres textes écrits par le code : nettoyés aussi ; la ponctuation reste.
    const t = T.textesDeLaPlanche(inv({ seo: ["Écume – Savonnerie artisanale |´", ...juste.slice(1)], ton: ["Douce ´"], haut: ["Planche ¨"] }), route());
    expect([t.blocs.get("seo")!.lignes, t.blocs.get("ton"), t.haut]).toEqual([juste, { lignes: ["Douce"] }, ["Planche"]]);
    expect(PM.nettoyerLesSignesIsoles("Dites-le-nous !")).toBe("Dites-le-nous !");
    expect(PM.nettoyerLesSignesIsoles("Écume | Savonnerie")).toBe("Écume | Savonnerie");
    // 3. La police suit l'aperçu : B d'Écume, « Nunito » montrée en manuscrite (verdict réel de B-2).
    expect(JSON.parse(fs.readFileSync(`${F2}/planche-B-2-relecture-verdict.json`, "utf8")).verdict.pourquoi).toContain("la police « Nunito » est présentée en écriture manuscrite");
    const p = C.policeDuCatalogue({ nom: "Nunito", genre: "manuscrite" }, 400);
    expect(p).toMatchObject({ famille: "Dancing Script", remplacee: true, pourquoi: "genre", lue: "Nunito" });
    expect(C.genreDu(p.cle)).toBe("manuscrite");
    expect(await runWithLang({ ui: "fr", content: "fr" }, async () => V.phraseDeLaPoliceRemplacee(p.lue, p.famille, p.genreLu))).toContain("la police nommée « Nunito » était montrée en écriture manuscrite");
    expect(fs.readFileSync("src/lib/syna-agent/planche-en-vrai-tache.ts", "utf8")).toContain('p.pourquoi === "genre" ? phraseDeLaPoliceRemplacee(p.lue, p.famille, p.genreLu)');
    // Le genre concorde : rien ne change ; absente du catalogue : la phrase d'avant.
    expect(C.policeDuCatalogue({ nom: "Nunito", genre: "sans" }, 400)).toMatchObject({ cle: "nunito", remplacee: false });
    expect(C.policeDuCatalogue({ nom: "Abril Fatface", genre: "serif" }, 400)).toMatchObject({ remplacee: false });
    expect(await runWithLang({ ui: "fr", content: "fr" }, async () => V.phraseDeLaPoliceRemplacee("Helvetica Neue", "Inter"))).toBe("La police « Helvetica Neue » de ta planche n'est pas dans le catalogue du Studio : j'ai pris la plus proche, « Inter ».");
    // 4. Le choix de l'inventaire, dans le même appel : la liste des polices du catalogue par genre, des noms seulement.
    const liste = C.catalogueDesPolicesParGenre();
    expect(fs.readFileSync("src/lib/syna-agent/planche-en-vrai-tache.ts", "utf8")).toContain("demandeDeLInventaire(nom, catalogueDesPolicesParGenre())");
    expect(V.INVENTAIRE_SYSTEM).toContain("procheDuCatalogue");
    expect(liste).not.toMatch(/écume|savonnerie|racine|tenon|nunito montr/i);
    // Retenu s'il est au catalogue et dans le genre lu ; sinon la règle d'avant.
    expect(C.policeDuCatalogue({ nom: "Nunito", genre: "manuscrite", procheDuCatalogue: "Caveat" }, 400)).toMatchObject({ famille: "Caveat", remplacee: true, pourquoi: "genre" });
    for (const x of ["Brush Script MT", "Inter", "Nunito"]) expect(C.policeDuCatalogue({ nom: "Nunito", genre: "manuscrite", procheDuCatalogue: x }, 400).famille, x).toBe("Dancing Script");
    expect(C.policeDuCatalogue({ nom: "Montserrat", genre: "sans", procheDuCatalogue: "Poppins" }, 400)).toMatchObject({ famille: "Poppins", remplacee: true, pourquoi: "apercu" });
    expect(C.policeDuCatalogue({ nom: "Montserrat", genre: "sans", procheDuCatalogue: "Montserrat" }, 400)).toMatchObject({ famille: "Montserrat", remplacee: false });
    // Le devis de l'inventaire compte la liste.
    expect(T.APPELS_EN_VRAI.inventaire.input).toBe(32_000 + Math.ceil(Buffer.byteLength(liste) / 3));
  });
});

describe("l'épreuve du spécimen mesuré et de l'écran qui suit le réassemblage (essai d'Écume, 26 novembre 2026, aucun appel)", async () => {
  const V = await import("@/lib/syna-agent/planche-en-vrai");
  const C = await import("@/lib/syna-agent/planche-en-vrai-code");
  const Fx = "tests/fixtures/ecume-planche-en-vrai";

  epreuve("planche-en-vrai-specimen-mesure-et-ecran-du-reassemblage", async () => {
    const os = await import("node:os"), path = await import("node:path");
    // 1. Le spécimen du bloc 03, sur l'aperçu réel de B : l'encre, la hauteur et le trait de l'aperçu.
    const demo = fs.readFileSync(`${Fx}/planche-B-gardee.jpg`), cases = V.lesCases("standard");
    const pol = (cle: string, famille: string, poids: number) => ({ cle, famille, fichier: "", poids, handle: `${cle}_n${String(poids)[0]}`, lue: famille, remplacee: false });
    const png = await C.assemblerLaPlanche({ demo, boites: new Map([["palette", cases.cases.palette], ["typographies", cases.cases.typographies]]), pastilles: cases.pastilles, images: new Map(), versions: {} as never,
      palette: [{ hex: "#C44912", nom: "Orange Écume", mots: [] }], polices: { titres: pol("poppins", "Poppins", 700), textes: pol("sacramento", "Sacramento", 400) }, signature: [], titres: new Map(), blocs: new Map(), encre: "#1C2A24", typos: ["Moderne, ronde, accessible.", "Chaleureuse, humaine, naturelle."] });
    const lum = (hx: string) => { const c = C.rgbDe(hx).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const contraste = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    const lignes = async (p: Buffer, k: number) => {
      const { data, info } = await sharp(p).removeAlpha().raw().toBuffer({ resolveWithObject: true }), b = cases.cases.typographies.map((v) => v * k) as import("@/lib/syna-agent/planche-en-vrai").Boite, fond = C.fondDe(data, info.width, b);
      return { fond, l: C.lignesDuSpecimen(data, info.width, b, fond)!.map((c) => c!) };
    };
    const a = await lignes(demo, 1), b = await lignes(png, 2);
    for (const k of [0, 1]) for (let i = 0; i < 5; i++) {
      const x = a.l[k][i], y = b.l[k][i];
      expect(contraste(y.couleur, b.fond), `${k}:${i}`).toBeGreaterThanOrEqual(contraste(x.couleur, a.fond) * 0.98);
      expect(Math.abs((y.bas - y.haut) / 2 - (x.bas - x.haut)) / (x.bas - x.haut), `${k}:${i}`).toBeLessThanOrEqual(0.15);
      expect(y.epaisseur / 2, `${k}:${i}`).toBeGreaterThanOrEqual(x.epaisseur * 0.85);
    }
    // 2. L'écran suit le réassemblage : etat.json et le parcours portent les images regagnées et la nouvelle planche.
    const { reassemblerLEssaiEnVrai } = await import("../scripts/syna-recette/essai-planche-en-vrai-outil");
    const { ECUME } = await import("./clients-d-essai");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "epreuve-ecran-")), essai = path.join(dir, "essai");
    for (const d of ["apercus", "cases", "relectures"]) fs.mkdirSync(path.join(essai, d), { recursive: true });
    fs.writeFileSync(path.join(essai, "essai.json"), JSON.stringify({ client: ECUME, donnees: { domaine: "ecumefrance.fr", statut: "disponible", annee: 2026, disposition: "standard", phrase: "SAVONNERIE / ARTISANALE" } }));
    fs.copyFileSync(`${Fx}/inventaire-reponse.json`, path.join(essai, "inventaire-reponse.json"));
    fs.copyFileSync(`${Fx}/cases-de-l-essai.json`, path.join(essai, "apercus", "cases.json"));
    for (const [f, g] of [["publications-1-verdict.json", "publications-1"], ["publications-2-verdict.json", "publications-2"], ["site-2-verdict.json", "site-2"]]) fs.copyFileSync(`${Fx}/${f}`, path.join(essai, "relectures", `${g}-verdict.json`));
    const uni = (w: number, hh: number) => sharp({ create: { width: w, height: hh, channels: 3, background: "#8899AA" } }).png().toBuffer();
    for (const [n, t, w, hh] of [["publication-1x1", 1, 1088, 1088], ["publication-4x5", 1, 1088, 1360], ["publication-4x5", 2, 1088, 1360], ["publication-9x16", 1, 1088, 1936], ["publication-9x16", 2, 1088, 1936], ["site-telephone", 2, 1024, 1536]] as const)
      fs.writeFileSync(path.join(essai, "cases", `${n}-${t}-hd.png`), await uni(w, hh));
    const planche = path.join(dir, "planche-B.png"); fs.writeFileSync(planche, await sharp(demo).png().toBuffer());
    const logo = path.join(dir, "logo-10.png"); fs.copyFileSync(`${Fx}/esquisse-10-logo-garde-512.png`, logo);
    const sansAppel = { inventaire: async () => { throw new Error("aucun appel"); }, refaire: async () => { throw new Error("aucun appel"); }, relire: async () => { throw new Error("aucun appel"); } };
    const sortie = path.join(dir, "4b"), r = await reassemblerLEssaiEnVrai({ dossier: essai, sortie, planche, logo, ai: () => sansAppel as never });
    const etat = JSON.parse(fs.readFileSync(path.join(sortie, "etat.json"), "utf8")) as import("@/lib/syna-agent/planche-en-vrai").EtatPlancheEnVrai, el = (n: string) => etat.elements.find((e) => e.element === n)!;
    for (const n of ["publication-9x16", "site-telephone"]) expect(el(n).id, n).toBeTruthy();
    expect(el("publication-4x5").id).toBeNull();
    const { journeyOfProject } = await import("@/lib/syna-agent/construction");
    const j = journeyOfProject(r.projectId)!;
    expect(j.plancheEnVrai?.planche?.id).toBe(etat.planche!.id);
    expect(j.plancheEnVrai?.elements.map((e) => e.id)).toEqual(etat.elements.map((e) => e.id));
    const { brandSheetOf } = await import("@/lib/syna-agent/brand-sheet");
    const { runWithLang } = await import("@/lib/i18n-server");
    const s = runWithLang({ ui: "fr", content: "fr" }, () => brandSheetOf(r.projectId));
    expect(s.enVrai?.planche?.url).toContain(etat.planche!.id);
    expect(s.enVrai?.images.some((i) => i.url.includes(el("publication-9x16").id!))).toBe(true);
    // La tâche et le réassemblage rangent par les mêmes fonctions du Studio.
    const src = fs.readFileSync("src/lib/syna-agent/planche-en-vrai-tache.ts", "utf8");
    for (const f of ["rangerLesImages(", "rangerLesLogos(", "marqueRelueSurLaPlanche(", "publicationsDeLaPlanche("]) expect(src.split(f).length, f).toBeGreaterThanOrEqual(4);
  });
});

describe("l'épreuve de la palette mesurée et des quatre petites versions du logo en haute définition (essai d'Écume, 26 novembre 2026, aucun appel)", async () => {
  const V = await import("@/lib/syna-agent/planche-en-vrai");
  const C = await import("@/lib/syna-agent/planche-en-vrai-code");
  const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
  const Fx = "tests/fixtures/ecume-planche-en-vrai";

  epreuve("planche-en-vrai-palette-mesuree-et-logos-en-hd", async () => {
    const demo = fs.readFileSync(`${Fx}/planche-B-gardee.jpg`), cases = V.lesCases("standard");
    const inv = V.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${Fx}/inventaire-reponse.json`, "utf8")));
    // 1. La palette, sur l'aperçu réel de B : chaque ligne au moins aussi contrastée, à sa hauteur à ±15 %.
    const pol = (cle: string, famille: string, poids: number) => ({ cle, famille, fichier: "", poids, handle: `${cle}_n${String(poids)[0]}`, lue: famille, remplacee: false });
    const palette = ["#C44912", "#D97A52", "#F6E8DA", "#A7B89B", "#8C6F4E"].map((hex, i) => ({ hex, nom: inv.couleurs[i].nom, mots: inv.couleurs[i].mots }));
    const png = await C.assemblerLaPlanche({ demo, boites: new Map([["palette", cases.cases.palette]]), pastilles: cases.pastilles, images: new Map(), versions: {} as never, palette,
      polices: { titres: pol("poppins", "Poppins", 700), textes: pol("sacramento", "Sacramento", 400) }, signature: [], titres: new Map(), blocs: new Map(), encre: "#1C2A24", motsLus: T.lignesDesMotsLues(inv) });
    const lum = (hx: string) => { const c = C.rgbDe(hx).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const contraste = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    const lignes = async (p: Buffer, k: number) => {
      const { data, info } = await sharp(p).removeAlpha().raw().toBuffer({ resolveWithObject: true }), b = cases.cases.palette.map((v) => v * k) as import("@/lib/syna-agent/planche-en-vrai").Boite, fond = C.fondDe(data, info.width, b);
      return { fond, l: C.lignesSousLesPastilles(data, info.width, b, cases.pastilles.map(([x, y, r]) => [x * k, y * k, r * k] as [number, number, number]), fond) };
    };
    const a = await lignes(demo, 1), b = await lignes(png, 2);
    for (let i = 0; i < 5; i++) {
      expect(b.l[i]?.length, `pastille ${i + 1}`).toBe(a.l[i]?.length);
      for (let k = 0; k < a.l[i]!.length; k++) {
        const x = a.l[i]![k], y = b.l[i]![k];
        expect(contraste(y.couleur, b.fond), `${i}:${k}`).toBeGreaterThanOrEqual(contraste(x.couleur, a.fond) * 0.98);
        expect(Math.abs((y.bas - y.haut) / 2 - (x.bas - x.haut)) / (x.bas - x.haut), `${i}:${k}`).toBeLessThanOrEqual(0.15);
      }
    }
    // 2. Les quatre versions en haute définition : le texte, les jointes et la taille ; le relecteur ; la reprise ; le repli.
    expect(V.texteDuLogoEnHd({ version: "badge", nom: "Écume", personnes: false })).toBe(`${V.REGLE_APERCU} ${V.regleDuLogo("Écume")} C'est le badge rond. ${V.SANS_PERSONNE_EN_VRAI}`);
    expect(V.TAILLE_DES_LOGOS_EN_HD).toBe("1088x1088");
    expect(V.demandeDuLogoEnHd({ version: "icone", nom: "Écume", personnes: false, tuile: Buffer.from("t"), logo: Buffer.from("l") }).jointes.map((j) => j.role)).toEqual(["apercu", "logo"]);
    const ok = { version: "badge", memeForme: true, memesLettres: true, texteCirculaire: "illisible-sur-l-apercu" as const, textesDeLApercu: [], textesLus: [], memesCouleurs: true, ajout: false, texteCoupe: false, note: 8, pourquoi: "" };
    expect(V.raisonsDuRefusDuLogoEnHd(ok)).toEqual([]);
    expect(V.raisonsDuRefusDuLogoEnHd({ ...ok, texteCirculaire: "different" })).toEqual(["son texte circulaire n'est pas celui de l'aperçu"]);
    expect(V.raisonsDuRefusDuLogoEnHd({ ...ok, ajout: true, memesCouleurs: false })).toEqual(["ses couleurs ne sont pas celles de l'aperçu", "quelque chose a été ajouté qui n'est pas sur l'aperçu"]);
    const tuiles = (await V.decouperLesApercus(demo, "standard")).apercus, tours: number[] = [];
    const res = await V.refaireLesLogosEnHd({
      refaire: async (d, tour) => { tours.push(tour); return sharp(d.jointes[0].data).resize(1088, 1088, { fit: "contain", background: "#F8F7F2" }).png().toBuffer(); },
      relire: async (items, _d, tour) => ({ versions: items.map((it) => ({ ...ok, version: it.version, note: tour === 1 && it.version === "badge" ? 7 : 9 })) }),
      aLaChargeDuStudio: (fn) => fn(), sansFond: T.sansFondDuLogoEnHd,
    }, { nom: "Écume", personnes: false, logo: Buffer.alloc(0), tuiles });
    expect(tours).toEqual([1, 1, 1, 1, 2]);
    expect([...res.values()].every((r) => r.ok)).toBe(true);
    const { runWithLang } = await import("@/lib/i18n-server");
    expect(runWithLang({ ui: "fr", content: "fr" }, () => V.phraseDesLogosEnHdRefuses(["badge"]))).toBe("J'ai refait en haute définition le badge, mais cette version n'a pas passé ma relecture, même refaite : elle n'est pas identique à ta planche choisie. Je garde donc celle de ta planche, agrandie, telle que tu l'as vue.");
    // Sur la planche : une version fidèle prend sa case.
    const { data, info } = await sharp(demo).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    expect((await C.caseDuLogoEnHd(data, info.width, cases.cases["logo-5"], res.get("icone")!.png!)).garde).toBe(true);
    // Le devis : la reprise des quatre dans le plafond minimal ; le script les enchaîne et refuse sous le plafond minimal.
    const d = T.devisDesLogosEnHd();
    expect(d.maxMicro).toBe(2 * d.repriseMicro);
    const src = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8");
    expect(src).toContain("T.refaireLesLogosEnHdDeLaPlanche(");
    expect(src).toContain("est sous le plafond minimal exact");
    expect(src.indexOf("const r = await repriseDesCases(")).toBeLessThan(src.indexOf("const r = await logosEnHdDeLEssai("));
    expect(src.indexOf("const r = await logosEnHdDeLEssai(")).toBeLessThan(src.indexOf("const code = await T.plancheEnVraiParLeCode("));
  });
});

describe("l'épreuve de l'accord de la tâche des noms (devis seul, aucun appel)", async () => {
  const C = await import("@/lib/syna-agent/brand-chain");
  const I = await import("@/lib/syna-agent/tools/identity");
  const { callCostBoundMicro, estimateCallMicro } = await import("@/lib/ai/llm");
  const { webSearchQuote } = await import("@/lib/ai/web-search");

  epreuve("accord-des-noms-compte-la-verification", () => {
    const s = C.chainSettings();
    // Chaque borne recalculée ici, sans le devis du Studio (même formule que la réservation de l'appel).
    const borne = (id: keyof typeof C.BRAND_CALLS) => {
      const c: { tier: "strong" | "craft"; effort?: string; input: number; output: number; max: number } = C.BRAND_CALLS[id], m = { ...s[c.tier], ...(c.effort ? { effort: c.effort } : {}) };
      return callCostBoundMicro(m.provider, m.model, c.input * 1.5, c.max, m.effort) ?? (estimateCallMicro(m.provider, m.model, c.input, c.output) ?? 0) * 4;
    };
    const web = webSearchQuote(s.craft, { maxSearches: C.BRAND_SEARCHES }).maxMicro;
    const equipe = borne("team") + borne("teamShort");
    // Tous les appels possibles jusqu'aux noms vérifiés, chacun à son maximum ; la vérification compte sa recherche et son appel.
    const tous = 3 * web + borne("study") + 2 * borne("strategy") + s.teams * equipe + borne("judge") + s.teams * equipe + borne("judge") + web + borne("verify");
    expect(borne("verify")).toBeGreaterThan(0);
    for (const count of [2, 3, 4]) {
      const g = I.accordGraphistes(count);
      expect(g.nomsMicro, `${count} identités`).toBeGreaterThanOrEqual(Math.ceil(tous));
      expect(g.nomsMicro + g.rechercheMicro + g.finalisationsMicro + g.planchesMicro).toBeLessThanOrEqual(g.maxMicro);
    }
  });
});

describe("l'épreuve du coût probable seul et de l'arrêt au double (26 novembre 2026, aucun appel)", async () => {
  const V = await import("@/lib/syna-agent/planche-en-vrai");
  const C = await import("@/lib/syna-agent/planche-en-vrai-code");
  const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
  const B = await import("@/lib/syna-agent/brand-chain");
  const I = await import("@/lib/syna-agent/tools/identity");
  const { callCostBoundMicro, estimateCallMicro } = await import("@/lib/ai/llm");
  const { webSearchQuote } = await import("@/lib/ai/web-search");
  const billing = await import("@/lib/billing");
  const jobs = await import("@/lib/jobs");
  const { withTrace, CostCapReached, DepassementDeLAnnonce, arretParLAnnonce, depensesDeLaTache } = await import("@/lib/ai/trace");
  const { confirmationText, budgetInsuffisant } = await import("@/lib/syna-agent/loop");
  const { phraseDuDepassement, previewDeLaSuite } = await import("@/lib/syna-agent/depense-annoncee");
  const { coutProbableTu } = await import("@/lib/ai/budget-pct");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { account, project } = await import("./conversation209-fixtures");
  const { id, json, run } = await import("@/lib/db");
  const E = await import("../scripts/syna-recette/plafond-des-essais");
  const fr = <R,>(fn: () => R) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const Fx = "tests/fixtures/ecume-planche-en-vrai";
  const PIRE = /au plus|at most|jusqu'à|fourchette|pire|plafond/i;

  epreuve("cout-probable-seul-et-arret-au-double", async () => {
    // 1. Ce qui reste vrai de planche-en-vrai-palette-mesuree-et-logos-en-hd (palette, versions HD, ordre du script).
    const demo = fs.readFileSync(`${Fx}/planche-B-gardee.jpg`), cases = V.lesCases("standard");
    const inv = V.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${Fx}/inventaire-reponse.json`, "utf8")));
    const pol = (cle: string, famille: string, poids: number) => ({ cle, famille, fichier: "", poids, handle: `${cle}_n${String(poids)[0]}`, lue: famille, remplacee: false });
    const palette = ["#C44912", "#D97A52", "#F6E8DA", "#A7B89B", "#8C6F4E"].map((hex, i) => ({ hex, nom: inv.couleurs[i].nom, mots: inv.couleurs[i].mots }));
    const png = await C.assemblerLaPlanche({ demo, boites: new Map([["palette", cases.cases.palette]]), pastilles: cases.pastilles, images: new Map(), versions: {} as never, palette,
      polices: { titres: pol("poppins", "Poppins", 700), textes: pol("sacramento", "Sacramento", 400) }, signature: [], titres: new Map(), blocs: new Map(), encre: "#1C2A24", motsLus: T.lignesDesMotsLues(inv) });
    const lum = (hx: string) => { const c = C.rgbDe(hx).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const contraste = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    const lignes = async (p: Buffer, k: number) => {
      const { data, info } = await sharp(p).removeAlpha().raw().toBuffer({ resolveWithObject: true }), b = cases.cases.palette.map((v) => v * k) as import("@/lib/syna-agent/planche-en-vrai").Boite, fond = C.fondDe(data, info.width, b);
      return { fond, l: C.lignesSousLesPastilles(data, info.width, b, cases.pastilles.map(([x, y, r]) => [x * k, y * k, r * k] as [number, number, number]), fond) };
    };
    const a = await lignes(demo, 1), b = await lignes(png, 2);
    for (let i = 0; i < 5; i++) {
      expect(b.l[i]?.length, `pastille ${i + 1}`).toBe(a.l[i]?.length);
      for (let k = 0; k < a.l[i]!.length; k++) {
        const x = a.l[i]![k], y = b.l[i]![k];
        expect(contraste(y.couleur, b.fond), `${i}:${k}`).toBeGreaterThanOrEqual(contraste(x.couleur, a.fond) * 0.98);
        expect(Math.abs((y.bas - y.haut) / 2 - (x.bas - x.haut)) / (x.bas - x.haut), `${i}:${k}`).toBeLessThanOrEqual(0.15);
      }
    }
    expect(V.texteDuLogoEnHd({ version: "badge", nom: "Écume", personnes: false })).toBe(`${V.REGLE_APERCU} ${V.regleDuLogo("Écume")} C'est le badge rond. ${V.SANS_PERSONNE_EN_VRAI}`);
    expect(V.TAILLE_DES_LOGOS_EN_HD).toBe("1088x1088");
    const ok = { version: "badge", memeForme: true, memesLettres: true, texteCirculaire: "illisible-sur-l-apercu" as const, textesDeLApercu: [], textesLus: [], memesCouleurs: true, ajout: false, texteCoupe: false, note: 8, pourquoi: "" };
    expect(V.raisonsDuRefusDuLogoEnHd(ok)).toEqual([]);
    const tuiles = (await V.decouperLesApercus(demo, "standard")).apercus, tours: number[] = [];
    const res = await V.refaireLesLogosEnHd({
      refaire: async (d, tour) => { tours.push(tour); return sharp(d.jointes[0].data).resize(1088, 1088, { fit: "contain", background: "#F8F7F2" }).png().toBuffer(); },
      relire: async (items, _d, tour) => ({ versions: items.map((it) => ({ ...ok, version: it.version, note: tour === 1 && it.version === "badge" ? 7 : 9 })) }),
      aLaChargeDuStudio: (fn) => fn(), sansFond: T.sansFondDuLogoEnHd,
    }, { nom: "Écume", personnes: false, logo: Buffer.alloc(0), tuiles });
    expect(tours).toEqual([1, 1, 1, 1, 2]);
    expect([...res.values()].every((r) => r.ok)).toBe(true);
    const d = T.devisDesLogosEnHd();
    expect(d.maxMicro).toBe(2 * d.repriseMicro);
    const enVrai = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8");
    expect(enVrai).toContain("T.refaireLesLogosEnHdDeLaPlanche(");
    expect(enVrai.indexOf("const r = await repriseDesCases(")).toBeLessThan(enVrai.indexOf("const r = await logosEnHdDeLEssai("));
    expect(enVrai.indexOf("const r = await logosEnHdDeLEssai(")).toBeLessThan(enVrai.indexOf("const code = await T.plancheEnVraiParLeCode("));
    // L'exception : il ne refuse plus de partir sous la somme des maxima.
    expect(enVrai).not.toContain("est sous le plafond minimal exact");

    // 2. Ce qui reste vrai de accord-des-noms-compte-la-verification : la part des noms couvre la somme des maxima.
    const s = B.chainSettings();
    const borne = (k: keyof typeof B.BRAND_CALLS) => {
      const c: { tier: "strong" | "craft"; effort?: string; input: number; output: number; max: number } = B.BRAND_CALLS[k], m = { ...s[c.tier], ...(c.effort ? { effort: c.effort } : {}) };
      return callCostBoundMicro(m.provider, m.model, c.input * 1.5, c.max, m.effort) ?? (estimateCallMicro(m.provider, m.model, c.input, c.output) ?? 0) * 4;
    };
    const web = webSearchQuote(s.craft, { maxSearches: B.BRAND_SEARCHES }).maxMicro, equipe = borne("team") + borne("teamShort");
    const tous = 3 * web + borne("study") + 2 * borne("strategy") + s.teams * equipe + borne("judge") + s.teams * equipe + borne("judge") + web + borne("verify");
    for (const count of [2, 3, 4]) {
      const g = I.accordGraphistes(count);
      expect(g.nomsMicro, `${count} identités`).toBeGreaterThanOrEqual(Math.ceil(tous));
      expect(g.nomsMicro + g.rechercheMicro + g.finalisationsMicro + g.planchesMicro).toBeLessThanOrEqual(g.maxMicro);
    }

    // 3. La carte : le coût probable seul, en tutoyant ; jamais de pire cas ; le budget qui manque, sans pire cas.
    const u = await account(), pid = project(u) as string;
    const t: any = { name: "essai.payant", description: "Essai." };
    const carte = await fr(() => confirmationText(t, {}, {} as never, u.id, pid, { label: "tes trois identités", probableMicro: 1_000_000, maxMicro: 3_000_000 }));
    expect(carte).toContain(`Coût probable : ${await fr(() => coutProbableTu(u.id, 1_000_000, pid))}.`);
    expect(carte).toMatch(/environ [\d,]+\u00a0% de ton budget IA du mois/);
    expect(carte).not.toMatch(PIRE);
    expect(await fr(() => confirmationText(t, {}, {} as never, u.id, pid, { label: "x", maxMicro: 3_000_000 }))).not.toMatch(PIRE);
    run("UPDATE wallets SET monthly_allowance = 43000000, monthly_used = 37000000, topup_balance = 0, reserved = 0, reserved_topup = 0 WHERE user_id = ?", u.id);
    const manque = await fr(() => budgetInsuffisant(u.id, null, 16_000_000, 8_000_000))!;
    expect(manque).toMatch(/^Pas lancé, rien n'est payé : il ne reste que/);
    expect(manque).toContain("(il coûte environ");
    expect(manque).not.toMatch(/peut coûter|jusqu'à/);
    for (const f of ["src/lib/syna-agent/loop.ts", "src/lib/syna-agent/prompt.ts", "src/lib/syna-agent/journey.ts", "src/lib/syna-agent/tools/gallery.ts", "src/lib/syna-agent/tools/atelier.ts", "src/components/studio/guided-video.tsx"]) {
      const src = fs.readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/; au plus \$\{|au plus \$\{budgetPctTu|ce travail peut coûter jusqu'à \$\{|le coût probable et le plafond|coût probable et plafond|et « au plus » quand il est donné|auPlusTexte\(/);
    }

    // 4. L'arrêt au double : le premier appel part toujours ; l'appel qui ferait dépasser deux fois l'annonce ne part pas.
    const meta = { task: "image_generation", provider: "openai", model: "gpt-image-2.6-flare" };
    const appel = (max: number, cout = max) => { const rid = billing.reserve(u.id, max, meta); billing.settle(rid, cout, null, "image"); };
    run("UPDATE wallets SET monthly_allowance = 430000000, monthly_used = 0 WHERE user_id = ?", u.id);
    const j = jobs.avecLaDepenseAnnoncee(1_000_000, () => jobs.enqueue({ userId: u.id, projectId: pid, type: B.SINA_BRAND_JOB, payload: { projectId: pid, capMicro: 5_000_000 } }));
    expect(jobs.annonceDe(json(j.payload, {}))).toBe(1_000_000);
    const ctx = new jobs.JobContext(jobs.getJob(j.id)!);
    await withTrace({ jobId: j.id, costCapMicro: 5_000_000, annonceMicro: 1_000_000 }, async () => {
      await ctx.step("une", async () => { appel(1_200_000, 900_000); return 1; });
      await expect(ctx.step("deux", async () => { try { appel(1_200_000); } catch (e) { if (!(e instanceof CostCapReached)) throw e; } return 2; })).rejects.toBeInstanceOf(DepassementDeLAnnonce);
      expect(() => billing.aLaChargeDuStudio(() => billing.reserve(u.id, 1000, meta))).toThrow(DepassementDeLAnnonce);
    });
    expect(Object.keys(json<Record<string, unknown>>(jobs.getJob(j.id)!.checkpoint ?? "{}", {}))).toEqual(["une"]);
    expect(depensesDeLaTache(j.id).client).toBe(900_000);
    expect(arretParLAnnonce(j.id)).toBeInstanceOf(DepassementDeLAnnonce);
    jobs.mettreEnAttenteDAccord(j.id, { depenseMicro: 900_000, annonceMicro: 1_000_000 });
    expect(jobs.getJob(j.id)!.status).toBe("paused");
    const phrase = await fr(() => phraseDuDepassement(u.id, pid, { depenseMicro: 2_100_000, annonceMicro: 1_000_000 }));
    expect(phrase.split(/(?<=[.!?])\s/).length).toBe(1);
    expect(phrase).toMatch(/tu veux que je continue \?$/);
    expect(phrase).toMatch(/ce qui est fait est gardé/);
    expect(phrase).not.toMatch(/€|plafond|tâche|appel|\b(vous|votre)\b/i);
    expect(await fr(() => previewDeLaSuite())).not.toMatch(PIRE);
    // Oui (« Reprendre ») : elle reprend, l'annonce relevée à ce qui est dépensé plus l'annonce d'origine.
    jobs.resumeJob(j.id);
    expect(jobs.getJob(j.id)!.status).toBe("queued");
    expect(json<any>(jobs.getJob(j.id)!.payload, {}).annonceMicro).toBe(1_900_000);
    const loop = fs.readFileSync("src/lib/syna-agent/loop.ts", "utf8"), worker = fs.readFileSync("worker/index.ts", "utf8");
    expect(loop).toContain("if (enAttente) return demanderDeContinuer(r, enAttente);");
    expect(loop).toContain("if (getJob(jid)) cancelJob(jid);");
    expect(worker).toContain("annonceMicro: annonceDe(ctx.payload)");
    expect(worker).toContain("if (attendreLAccord(job.id)) return;");
    void id;

    // 5. Les essais du propriétaire : sous la somme des maxima, ils partent, s'arrêtent proprement et disent la suite.
    expect(E.plafondConseilleMicro(1_450_000)).toBe(3_000_000);
    expect(E.avisDuPlafond(3_000_000, { plafondMinimalMicro: 9_850_000, probableMicro: 1_450_000 })).toMatch(/l'essai part quand même/);
    expect(E.lignesDeLArret({ depenseMicro: 1, plafondMicro: 2, plafondMinimalMicro: 3, fait: [], reprendre: "REPRENDRE=1." }).join("\n")).toMatch(/Arrêt propre[\s\S]*Ce qui est fait[\s\S]*Pour finir : au plus/);
    for (const k of ["essai-noms", "essai-esquisses", "essai-finalisation", "essai-planches", "essai-planche-en-vrai"]) {
      const src = fs.readFileSync(`scripts/syna-recette/${k}.mts`, "utf8") + fs.readFileSync(`scripts/syna-recette/${k}-outil.ts`, "utf8");
      expect(src, k).not.toMatch(/est sous le plafond minimal( exact)?[^`]*rien n'est lancé/);
      expect(src, k).toMatch(/lignesDeLArret\(|arretPropre/);
    }
    expect(fs.readFileSync("scripts/syna-recette/essai-noms-outil.ts", "utf8")).toContain("REPRENDRE=1");
    expect(fs.readFileSync("src/lib/jobs.ts", "utf8")).toContain("arreteeParLAnnonce(this.job.id) ?? arreteeParLEssai(this.job.id)");

    // 6. Les anciens écrans : le coût probable seul, dit de la même façon ; le plafond par semaine choisi par le client reste.
    const { coutProbableTexte } = await import("@/lib/budget-pct");
    expect(coutProbableTexte(18.2, "fr")).toBe("environ 18\u00a0% de ton budget IA du mois");
    expect(coutProbableTexte(0.05, "fr")).toBe("moins de 0,1\u00a0% de ton budget IA du mois");
    expect(coutProbableTexte(null, "fr")).toBe("une part de ton budget IA du mois");
    expect(coutProbableTexte(4.2, "en")).toBe("about 4.2% of your monthly AI budget");
    const pub = fs.readFileSync("src/components/studio/ad-editor/ad-editor.tsx", "utf8"), conf = fs.readFileSync("src/components/studio/cost-confirm.tsx", "utf8");
    expect(pub).toContain("Coût probable : ${coutProbableTexte(quote.estimatePct!, \"fr\")}. Continuer ?");
    expect(conf).toContain("Coût probable : ${coutProbableTexte(s.quote.estimatePct, \"fr\")}.");
    for (const [f, src] of [["ad-editor.tsx", pub], ["cost-confirm.tsx", conf]] as const) {
      // Le maximum reste dans le devis reçu (la réservation en coulisses), jamais dans le texte montré.
      expect(src, f).not.toMatch(/\(quote\.maximumPct|\$\{[^}]*maximumPct|Plafond de cette demande|plafond \$\{|Au plus \$\{|estimation \$\{|reprises restent plafonnées/);
    }
    const auto = fs.readFileSync("src/components/studio/social-autopilot.tsx", "utf8");
    expect(auto).toContain("data-paid-cap");
    expect(auto).toContain("Plafond par semaine pour ces visuels (% de ton budget IA du mois)");

    // 7. Les tâches de ces écrans emportent le coût probable montré et s'arrêtent de même ; la phrase est dans leur message.
    const campagnes = fs.readFileSync("src/app/api/projects/[id]/campaigns/v2/route.ts", "utf8"), coeur = fs.readFileSync("src/lib/atelier/coeur.ts", "utf8");
    expect(campagnes).toContain("avecLaDepenseAnnoncee(quote, () => enqueue(");
    expect(campagnes).toContain("avecLaDepenseAnnoncee(campaignPrice.estimateMicro, () => enqueue(");
    expect(coeur).toContain("avecLaDepenseAnnoncee(approval.cost.estimateMicro, () => enqueue(");
    expect(coeur).toContain("avecLaDepenseAnnoncee(approval.capMicro, () => enqueue(");
    expect(worker).toContain("attendreLAccordDeLaTache(jobId)");
    expect(pub).toContain('if (j.status === "paused") { toast("ok", `${j.message ?? ""}');
    for (const f of ["tests/depense-annoncee-ecran-images.test.ts", "tests/depense-annoncee-ecran-publicites.test.ts"]) expect(fs.existsSync(f), f).toBe(true);
  });
});

describe("l'épreuve des noms jamais dits vérifiés sans comparaison (tâche des noms, appels simulés, aucun appel payant)", async () => {
  const os = await import("node:os");
  const path = await import("node:path");
  const billing = await import("@/lib/billing");
  const { withTrace } = await import("@/lib/ai/trace");
  const J = await import("@/lib/syna-agent/journey");
  const B = await import("@/lib/syna-agent/brand-chain");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { clientDeLEssai, essaiDesNoms, FICHIER_DE_REPRISE } = await import("../scripts/syna-recette/essai-noms-outil");
  await (await import("../scripts/syna-recette/tarifs-verifies")).appliquerTarifsVerifies();
  const PHRASE = "Je n'ai rien trouvé sur Internet pour vérifier que personne n'utilise déjà ces noms dans ton métier : regarde de ton côté avant de choisir le tien.";
  const PAGE = "https://avis.example/cafe", ANNUAIRE = "https://annuaire.example/cafes";
  type Page = { url: string; title: string; category: "competitors"; excerpt: string };
  /** La tâche des noms avec des appels simulés ; `pages` dit ce que rend chaque recherche des noms gardés. */
  const essai = async (pages: (id: string) => Page[]) => {
    const appels: string[] = [], envoyes: string[] = [];
    const paye = (q: { userId: string; jobId: string }) => withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, 30_000, { task: "strategy", provider: "anthropic", model: "simule", jobId: q.jobId }); billing.settle(rid, 15_000, null, "strategy"); });
    const ai = (q: { userId: string; projectId: string; jobId: string }) => ({
      research: async (id: string, query: string) => { appels.push(`web:${id}`); envoyes.push(query); await paye(q); return id.startsWith("verify") ? pages(id) : [{ url: PAGE, title: "Avis sur le café", category: "customers" as const, excerpt: "« Le café frais moulu change tout le matin. »" }]; },
      ask: async (id: string, c: { kind: string; schema: { parse: (v: unknown) => unknown } }) => {
        appels.push(id); await paye(q);
        const r: Record<string, unknown> = {
          study: { quotes: [{ text: "Le café frais moulu change tout le matin.", url: PAGE }], competitors: [], mould: "des paquets kraft" },
          strategy: { job: "boire un café frais chez soi", confessions: [{ text: "je ne sais jamais quand mon café a été torréfié", quotes: [0] }], ideas: [1, 2, 3, 4].map((i) => ({ id: `i${i}`, belief: `idée ${i}`, enemy: "le café rassis", proof: "la date", cost: "torréfier chaque semaine", strong: true })) },
          team: { names: ["Fournée", "Braise", "Mouture", "Grain Franc", "Torréfie", "Cerise Rouge", "Tasse Claire"].map((name) => ({ name, detail: "le grain torréfié", second: "aucune", idea: "i1" })) },
          judge: { kept: ["Fournée", "Braise", "Mouture", "Grain Franc"].map((name) => ({ name, seen: "un grain torréfié", why: "il dit le métier" })) },
          verify: { checks: [{ name: "Braise", taken: true, url: ANNUAIRE, note: "déjà un torréfacteur" }] },
        };
        return c.schema.parse(r[c.kind]);
      },
      draw: async () => { throw new Error("interdit"); },
      look: async () => { throw new Error("interdit"); },
    });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "epreuve-noms-"));
    try {
      const r = await essaiDesNoms({ sortie: dir, plafondEuros: "20", client: clientDeLEssai({ CLIENT_JSON: "scripts/syna-recette/clients/torrefacteur.json" }, { sansNom: true }), ai: ai as never, lirePage: async () => "<p>« Le café frais moulu change tout le matin. »</p>", trouverLesAdresses: async () => null as never });
      const lire = (f: string) => fs.readFileSync(path.join(dir, f), "utf8");
      const cid = JSON.parse(lire(FICHIER_DE_REPRISE)).conversationId as string;
      return { r, appels, envoyes, rapport: lire("rapport.txt"), noms: JSON.parse(lire("noms.json")), cid };
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  };
  const ANNUAIRE_DES_CAFES: Page = { url: ANNUAIRE, title: "Annuaire des cafés", category: "competitors", excerpt: "Braise, torréfacteur." };

  epreuve("nom-jamais-verifie-sans-comparaison", async () => {
    // 1. Deux recherches vides : refaite une fois, autrement formulée ; aucune vérification ; « non vérifiés », jamais « vérifiés ».
    const vide = await essai(() => []);
    expect(vide.r.arret, vide.r.arret).toBeUndefined();
    expect(vide.appels.filter((a) => /verify/.test(a))).toEqual(["web:verify-noms-1", "web:verify-noms-1-2"]);
    expect(vide.envoyes.at(-1)).not.toBe(vide.envoyes.at(-2));
    expect(vide.envoyes.at(-1)).toMatch(/entre guillemets suivi du métier du client/);
    expect(vide.envoyes.at(-1)).toMatch(/suivi du mot « marque »/);
    expect(vide.r).toMatchObject({ verifies: false, verification: "non_verifie", aDireAuClient: PHRASE });
    expect(vide.r.noms.length).toBe(4);
    expect(vide.r.noms.every((n) => n.verification === "non_verifie")).toBe(true);
    expect(vide.noms).toMatchObject({ verifies: false, verification: "non_verifie", aDireAuClient: PHRASE });
    expect(vide.rapport).toContain("Noms NON VÉRIFIÉS proposés au client : 4");
    expect(vide.rapport).not.toContain("Noms vérifiés proposés au client");
    expect(vide.rapport).toContain(`Ce que SINA dit au client : « ${PHRASE} »`);
    expect(vide.rapport).toContain("1. Fournée [non vérifié]");
    // Le parcours : l'état distinct, et ce que SINA lit de l'étape (la phrase mot pour mot, l'adresse jamais promise).
    const n = J.journeyOf(vide.cid).nomsDeLaMarque!;
    expect(n).toMatchObject({ verifies: false, verification: "non_verifie", pourquoiNonVerifie: "rien_trouve" });
    expect(n.list.every((x) => x.verification === "non_verifie")).toBe(true);
    J.updateJourney(vide.cid, (x) => { J.setStep(x, 0, "done"); J.setStep(x, 1, "doing"); });
    const contexte = await runWithLang({ ui: "fr", content: "fr" }, async () => J.journeyContext(J.journeyOf(vide.cid)));
    expect(contexte).toContain(`dis-lui, mot pour mot : « ${PHRASE} »`);
    expect(contexte).toContain("ne dis jamais que ces noms sont vérifiés ni libres");
    expect(contexte).toContain("L'adresse sur Internet n'est jamais promise");

    // 2. Une page trouvée la seconde fois : la vérification habituelle ; le nom pris est écarté ; les autres sont vérifiés.
    const seconde = await essai((id) => (id === "verify-noms-1-2" ? [ANNUAIRE_DES_CAFES] : []));
    expect(seconde.appels.filter((a) => /verify/.test(a))).toEqual(["web:verify-noms-1", "web:verify-noms-1-2", "verify-noms-1"]);
    expect(seconde.r).toMatchObject({ verifies: true, verification: "verifie", aDireAuClient: null });
    expect(seconde.r.noms.map((x) => x.nom)).toEqual(["Fournée", "Mouture", "Grain Franc"]);
    // 3. Une page trouvée dès la première fois : une seule recherche, puis la vérification habituelle.
    const premiere = await essai(() => [ANNUAIRE_DES_CAFES]);
    expect(premiere.appels.filter((a) => /verify/.test(a))).toEqual(["web:verify-noms-1", "verify-noms-1"]);
    expect(premiere.rapport).toContain("1. Fournée [vérifié]");

    // 4. Le devis de la tâche des noms compte la recherche refaite dans son maximum, pas dans le probable ; l'accord la couvre.
    const d = B.devisDesNomsVerifies();
    expect(d.lignes.find((l) => l.id === "recherche:verify:2")).toMatchObject({ appel: "web", fois: 1, toujours: false });
    expect(d.maxMicro).toBe(Math.ceil(d.lignes.reduce((t, l) => t + l.maxMicro, 0)));
    expect(d.probableMicro).toBe(Math.ceil(d.lignes.filter((l) => l.toujours).reduce((t, l) => t + l.probableMicro, 0)));
    expect((await import("@/lib/syna-agent/tools/identity")).accordGraphistes(3).nomsMicro).toBe(d.maxMicro);
    // 5. Une tâche d'avant, sans comparaison gardée, n'est jamais relue comme vérifiée.
    expect(B.etatDeLaVerification({ done: true, taken: [] }).verification).toBe("non_verifie");
    expect(J.phraseDesNomsMontres({ verifies: true })).toBeNull();
  });
});
