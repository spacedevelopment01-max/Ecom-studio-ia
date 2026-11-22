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
  it("chaque épreuve gratuite est rejouée ci-dessous", () => {
    const src = fs.readFileSync("tests/epreuves.test.ts", "utf8");
    for (const e of EPREUVES.filter((x) => x.rejeu === "gratuit")) expect(src.includes(`epreuve("${e.id}"`), e.id).toBe(true);
  });
});

/** Une épreuve gratuite : son verdict en titre. */
const epreuve = (id: string, fn: () => Promise<void> | void) => {
  const e = EPREUVES.find((x) => x.id === id);
  if (!e) throw new Error(`épreuve inconnue : ${id}`);
  it(`${id} (${e.date}) — ${e.attendu}`, fn);
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
  type Verdict = (slot: string, n: number) => { ok: boolean; score?: number; why?: string };
  /** La chaîne des images d'une planche, telle quelle, avec un dessinateur et un relecteur simulés (rien n'est payé). */
  async function planche(o: { slots: string[]; draw?: Draw; verdict?: Verdict; madeLogos?: Buffer[]; gouts?: string; logoLine?: string; x?: any }) {
    const user = await account(), projectId = project(user, "services") as string;
    const x = o.x ?? { ...route("A"), name: "Aplomb" };
    const texts = I.slotTexts(x);
    const timeline: { kind: "draw" | "look"; id: string; slot: string; prompt: string; avoid?: boolean }[] = [];
    const drawn = new Map<string, number>(), looked = new Map<string, number>();
    const ai: any = {
      research: async () => [], ask: async () => { throw new Error("aucun appel attendu"); },
      draw: async (id: string, c: any) => {
        const slot = /-(logo|hero|object|signs|site|post\d)(:|$)/.exec(id)![1], n = (drawn.get(slot) ?? 0) + 1; drawn.set(slot, n);
        timeline.push({ kind: "draw", id, slot, prompt: c.prompt, avoid: !!c.avoid });
        return o.draw ? o.draw(id, slot, n) : slot === "logo" ? logoSimple() : carre("#224466");
      },
      look: async (id: string, c: any) => {
        const slots = (c.images as { label: string }[]).map((i) => i.label).filter((l) => (I.IMAGE_SLOTS as readonly string[]).includes(l));
        const s = slots[0], n = (looked.get(s) ?? 0) + 1; looked.set(s, n);
        timeline.push({ kind: "look", id, slot: s, prompt: c.prompt });
        const v = o.verdict?.(s, n) ?? { ok: true, score: 9 };
        return { images: [{ slot: s, seen: "", score: v.score ?? 9, ok: v.ok, read: texts[s as keyof typeof texts] ?? [], why: v.why ?? "", defect: "autre" }] };
      },
    };
    const ctx: any = { step: async (_k: string, fn: () => unknown) => fn(), progress: () => {} };
    const r = await I.runBoardImages({ ctx, ai, who: { userId: user.id, projectId }, brief: "", kind: "services", route: x, round: 1, slots: o.slots as never, imagery: imagery as never, madeLogos: o.madeLogos, gouts: o.gouts ?? null, logoLine: o.logoLine ?? null });
    return { r, timeline, x };
  }

  epreuve("logo-goutte-refusee", async () => {
    const F = await import("@/lib/syna-agent/fiche");
    const gouts = F.goutsPour([{ sujet: "le style plombier", value: "le style plombier avec une goutte d'eau et une clé à molette", genre: "refuse", portee: "logo", at: 1 }, { sujet: "les matières", value: "le laiton brossé", genre: "aime", portee: "images", at: 1 }], ["logo", "images"]).join("\n");
    const { timeline } = await planche({ slots: ["logo"], gouts });
    const dessin = timeline.find((t) => t.kind === "draw" && t.slot === "logo")!, relu = timeline.find((t) => t.kind === "look" && t.slot === "logo")!;
    expect(dessin.prompt).toContain("Ce que le client refuse, avec ses mots : « Il ne veut pas : le style plombier avec une goutte d'eau et une clé à molette »");
    // Ses goûts vont au relecteur, jamais au dessinateur du logo (« enlève la 7 », 21 novembre 2026).
    expect(dessin.prompt).not.toContain("laiton");
    expect(relu.prompt).toContain("Il aime : le laiton brossé");
    expect(relu.prompt).toContain("Il ne veut pas : le style plombier avec une goutte d'eau et une clé à molette");
    expect(relu.prompt).toMatch(/qui montre ce qu'il refuse est un défaut/);
  });

  epreuve("consigne-de-sina-au-dessinateur", async () => {
    const { timeline } = await planche({ slots: ["logo"], logoLine: "Ce qu'on savait de la marque : un plombier calme et soigneux." });
    const dessin = timeline.find((t) => t.kind === "draw" && t.slot === "logo")!;
    expect(dessin.prompt).not.toMatch(/fil à plomb|logotype sobre/);
    expect(dessin.prompt).toContain("un plombier calme et soigneux");
  });

  epreuve("logos-de-la-serie-trop-proches", async () => {
    const premier = await planche({ slots: ["logo"] });
    const d1 = premier.timeline.find((t) => t.kind === "draw")!;
    expect(d1.avoid).toBe(false);
    expect(d1.prompt).not.toMatch(/complètement différent/);
    const second = await planche({ slots: ["logo"], madeLogos: [await logoSimple()] });
    const d2 = second.timeline.find((t) => t.kind === "draw")!;
    expect(d2.avoid).toBe(true);
    expect(d2.prompt).toMatch(/Je veux un logo complètement différent de celui-là/);
  });

  epreuve("trait-sous-le-nom-repete", async () => {
    const { timeline } = await planche({ slots: ["logo"], madeLogos: [await logoAvecTrait()], draw: async (_id, slot, n) => (slot === "logo" && n === 1 ? logoAvecTrait() : logoSimple()) });
    const dessins = timeline.filter((t) => t.kind === "draw" && t.slot === "logo");
    expect(dessins.map((d) => d.id.endsWith(":sans-trait"))).toEqual([false, true]);
    expect(dessins[1].prompt).toMatch(/refais-le sans trait, sans filet ni ligne/);
  });

  epreuve("photo-a-brume-ou-taches", async () => {
    const { r, timeline } = await planche({ slots: ["hero"], draw: async (_id, slot, n) => (slot === "hero" && n === 1 ? brume() : carre("#224466")) });
    expect(timeline.filter((t) => t.slot === "hero").map((t) => t.kind)).toEqual(["draw", "draw", "look"]);
    expect(r.route.board.images?.hero).toBeTruthy();
    // Fond plein demandé à OpenAI pour toute photo (le logo seul garde un fond retirable).
    const { openaiBackground } = await import("@/lib/ai/openai-images");
    expect(openaiBackground({ transparentCap: true })).toEqual({ background: "opaque" });
  });

  epreuve("logo-relu-avant-ce-qui-le-porte", async () => {
    // Le logo est refusé au premier dessin : rien de ce qui le porte n'est dessiné avec lui.
    const { timeline } = await planche({ slots: ["logo", "hero", "object"], verdict: (s, n) => (s === "logo" && n === 1 ? { ok: false, why: "une goutte d'eau" } : { ok: true, score: 9 }) });
    const order = timeline.map((t) => `${t.kind}:${t.slot}`);
    const objet = order.indexOf("draw:object");
    expect(order.slice(0, objet)).toEqual(["draw:logo", "look:logo", "draw:logo", "look:logo", "draw:hero"]);
    expect(timeline.filter((t) => t.kind === "draw" && t.slot === "object")).toHaveLength(1);
  });

  epreuve("planche-incomplete", async () => {
    const first = await planche({ slots: ["logo", "hero", "site"] });
    const before = first.r.route.board.images!.site!;
    expect(before).toBeTruthy();
    const again = await planche({ slots: ["logo", "site"], x: first.r.route, verdict: (s) => (s === "site" ? { ok: false, why: "écran à moitié vide" } : { ok: true, score: 9 }) });
    expect(again.r.siteGarde).toBe(true);
    expect(again.r.route.board.images!.site).toEqual(before);
  });

  epreuve("image-pas-au-niveau", async () => {
    const { timeline } = await planche({ slots: ["hero"], verdict: (_s, n) => (n === 1 ? { ok: true, score: 7, why: "lumière plate" } : { ok: true, score: 9 }) });
    expect(timeline.filter((t) => t.slot === "hero").map((t) => t.kind)).toEqual(["draw", "look", "draw", "look"]);
    expect(I.NOTE_MIN).toBe(8);
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
});
