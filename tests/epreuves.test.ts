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
    expect(remplacees.map((e) => e.id).sort()).toEqual(["logo-goutte-refusee", "consigne-de-sina-au-dessinateur", "logos-de-la-serie-trop-proches", "trait-sous-le-nom-repete", "ligne-la-marque-sans-idee-de-dessin", "serie-compte-les-logos-refuses", "refus-du-logo-une-seule-fois", "refus-du-client-toutes-tournures", "logo-demande-nue", "trait-pres-du-nom-un-par-serie-au-relecteur", "refus-et-consigne-apres-la-demande-nue", "serie-logo-completement-different", "trois-fois-le-meme-dessin", "logos-de-la-serie-dans-l-ordre", "pas-de-consigne-de-style-pour-un-logo", "demande-du-logo-couleurs-typo-fond", "relecteur-du-logo-qualite-seule", "planches-de-recherche-demande-exacte", "relecteur-du-logo-fini"].sort());
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
      expect(["23 novembre 2026", "24 novembre 2026"]).toContain(r.decision);
      expect(r.mots).toMatch(/^« (je pense qu'il ne faut pas donner d'informations sauf fait moi un logo pour une marque de bougies|En même temps il fallait garder la règle de le premier logo est fait|Et si on enlevait mes 50 logos de démo|Oui, marque trois-fois-le-meme-dessin|Oui, marque planches-de-recherche-demande-exacte)/);
      // L'accord écrit du 24 novembre 2026 nomme chaque épreuve qu'il remplace, et celle qui la remplace.
      if (r.decision === "24 novembre 2026") { expect(r.mots, e.id).toContain(e.id); expect(r.mots, r.epreuve).toContain(r.epreuve); }
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
    // Refusé deux fois : pas gardé, jamais un troisième essai ; la reprise porte les raisons du refus à la fin du texte.
    expect(r.ok).toBe(false);
    expect(envoyes).toHaveLength(2);
    expect(envoyes[1]).toBe(`${TEXTE} À corriger : il n'est pas au niveau (5/10, il faut 8).`);
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
    expect(envoyes).toEqual([TEXTE, `${TEXTE} À corriger : le fond ne se retire pas proprement.`]);
    // La ligne d'évolution du texte de finalisation reste.
    expect(consigneDeFinalisation(NOM, METIER)).toContain(LIGNE_D_EVOLUTION);
    // Le relecteur est le plus fort, effort élevé, un autre modèle que le rédacteur.
    const src = fs.readFileSync("src/lib/syna-agent/logo-graphistes.ts", "utf8");
    expect(src).toContain('logo: { input: 3_500, output: 1_500, max: 10_000, modele: "strong" as const, effort: "high" },');
  });

  epreuve("relecteur-du-logo-fini", () => {
    expect(raisonsDuRefus(bon, NOM)).toEqual([]);
    for (const v of [{ nomLu: "Hal0" }, { ideeConservee: false }, { evolution: false }, { arche: true }, { phrase: "Lumière éternelle", phraseDitLeMetier: false }, { note: 7 }]) expect(raisonsDuRefus({ ...bon, ...v }, NOM)).toHaveLength(1);
    // Le relecteur est le plus fort, effort élevé, un autre modèle que le rédacteur.
    const src = fs.readFileSync("src/lib/syna-agent/logo-graphistes.ts", "utf8");
    expect(src).toContain('logo: { input: 3_500, output: 1_500, max: 10_000, modele: "strong" as const, effort: "high" },');
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
  async function tache(o: { verdicts: (demande: string, tour: number) => any; domaines?: any; personnes?: boolean }) {
    const u = await account(), pid = project(u, "services") as string;
    const logo = await saveAsset({ projectId: pid, userId: u.id, data: await sharp({ create: { width: 256, height: 256, channels: 3, background: "#FFFFFF" } }).png().toBuffer(), name: "logo-fini.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready" });
    const appels: { texte: string; logo: Buffer; disposition: Buffer; studio: boolean }[] = [];
    const ai = {
      valeurs: async () => { throw new Error("aucun appel attendu"); },
      dessiner: async (l: { data: Buffer }, d: { data: Buffer }, texte: string) => { appels.push({ texte, logo: l.data, disposition: d.data, studio: chargeDuStudio() }); return { png: await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#EEE" } }).png().toBuffer(), recu: null }; },
      relire: async (_b: Buffer[], _l: Buffer, _d: Buffer, demande: string) => o.verdicts(demande, appels.length),
    };
    T.plancheDeps.domaines = async () => o.domaines ?? { taken: [], free: ["tenon.fr"], unknown: [], at: 1 };
    T.plancheDeps.annee = () => 2026;
    try {
      const x = { ...route("A"), name: "Tenon" };
      const r = await fr(() => T.plancheDeLaRoute({ ctx: { step: async (_k: string, fn: () => Promise<any>) => fn() }, ai, who: { userId: u.id, projectId: pid }, route: x as never, round: 1, valeurs: { ok: true, valeurs: TENON }, logoAssetId: logo.id, personnes: o.personnes ?? false }));
      return { r, appels, logo };
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
});
