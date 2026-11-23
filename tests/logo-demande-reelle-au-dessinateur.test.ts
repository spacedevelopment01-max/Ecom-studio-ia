/**
 * LA DEMANDE RÉELLE REÇUE PAR LE DESSINATEUR DU LOGO (essai réel de Nadia, 23 novembre 2026, version 02570ae1). Pour
 * refaire les logos de « Halo » (B) et de « Pénombre » (C), la consigne de SINA contenait « logo dessiné sur un fond blanc
 * parfaitement uni » et « pas de lettres bleues arrondies avec une ellipse orange », et la fiche « pas de flamme
 * dessinée ». Cet essai rejoue cette carte avec ces mots exacts, dans l'ordre donné par SINA ([C, B]), avec la vraie tâche
 * de la marque et le vrai chemin du dessin du logo jusqu'à l'appel d'OpenAI, qui est simulé ici : ce qui est vérifié est la
 * demande telle qu'OpenAI la reçoit (le texte et les images jointes). Aucun appel payant, aucune clé réelle.
 */
import crypto from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { route } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

let keys: Record<string, string | null> = {};
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

/** OpenAI Images simulé : chaque demande est notée telle qu'elle partirait (texte, images jointes), une image rendue. */
const oa = { calls: [] as any[], next: [] as string[] };
vi.mock("openai", () => {
  class OpenAI {
    constructor(public opts: any) {}
    private run = async (kind: string, p: any) => {
      oa.calls.push({ kind, ...p });
      const b64 = oa.next.shift()!;
      const usage = { input_tokens: 300, output_tokens: 1000, input_tokens_details: { text_tokens: 300, image_tokens: 0 } };
      if (p.stream) return (async function* () { yield { type: `image_${kind === "edit" ? "edit" : "generation"}.completed`, b64_json: b64, usage }; })();
      return { data: [{ b64_json: b64 }], usage };
    };
    images = { generate: (p: any) => this.run("generate", p), edit: (p: any) => this.run("edit", p) };
  }
  return { default: OpenAI, OpenAI, toFile: async (b: Buffer, name: string) => ({ name, size: b.length, data: b }) };
});

const sha = (b: Buffer) => crypto.createHash("sha256").update(b).digest("hex");
const GUIDANCE = "Le client a dit : « Le logo de Halo ne me plaît pas trop, tu peux m'en faire un autre ? » Refaire les logos de Halo et de Pénombre : logo dessiné sur un fond blanc parfaitement uni ; pas de lettres bleues arrondies avec une ellipse orange.";
const INTERDITS = /parfaitement uni|lettres bleues|arrondies|ellipse|orange|flamme|ne me plaît|Le client|chaleureux|pas trop chic|REFERENCES|image \d|^La marque :|\nLa marque :/i;

describe("la demande réelle reçue par le dessinateur du logo, carte B + C de Nadia rejouée", async () => {
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const J = await import("@/lib/syna-agent/journey");
  const F = await import("@/lib/syna-agent/fiche");
  const C = await import("@/lib/syna-agent/brand-chain");
  const mp = await import("@/lib/ai/media-providers");
  const { saveAsset, getAsset, assetData } = await import("@/lib/library");
  const { one, run } = await import("@/lib/db");
  const { JobContext } = await import("@/lib/jobs");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { getJsonSetting, setJsonSetting, setSetting } = await import("@/lib/settings");
  const { TARIFS_VERIFIES } = await import("../scripts/syna-recette/tarifs-verifies");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

  /** Un logo d'essai sur fond blanc net, d'une couleur par dessin. */
  const logo = (c: string) => sharp({ create: { width: 640, height: 480, channels: 3, background: "#FFFFFF" } }).composite(Array.from({ length: 6 }, (_v, i) => ({ input: { create: { width: 40, height: 90, channels: 3 as const, background: c } }, left: 140 + i * 60, top: 180 }))).png().toBuffer();

  beforeEach(() => {
    keys = { openai: "sk-openai-test-123456", anthropic: "sk-ant-test-1234567890abcdef" };
    oa.calls = []; oa.next = [];
    setSetting("ai.prices.checkedAt", String(Date.now()));
    const cle = `${mp.LOGO_ROUTE.provider}:${mp.LOGO_ROUTE.model}`;
    setJsonSetting("ai.prices", { ...getJsonSetting<Record<string, unknown>>("ai.prices", {}), [cle]: TARIFS_VERIFIES[cle] });
    setJsonSetting("ai.media.models", { ...getJsonSetting<Record<string, unknown>>("ai.media.models", {}), [cle]: { confirmedAt: Date.now(), enabled: true } });
  });
  afterEach(() => { C.brandChainDeps.ai = undefined; });

  async function nadia() {
    const user = await account(), projectId = project(user, "products") as string, cid = threadFor(user, projectId);
    const save = async (k: string, png: Buffer) => (await saveAsset({ projectId, userId: user.id, data: png, name: `planche-${k}-logo.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "ready", meta: { synaBoard: { key: k, slot: "logo", round: 1, name: k } } })).id;
    // Sillage (A) : logo gardé. Halo (B) : l'ancien logo gardé, que Nadia ne veut plus. Pénombre (C) : son logo manque.
    const sillage = await logo("#6E2A5E"), haloAncien = await logo("#2B4C8C");
    const ids = { A: await save("A", sillage), B: await save("B", haloAncien) };
    // Les couleurs et les polices des trois identités de Nadia (diagnostic de l'essai réel).
    const PAL: Record<string, [Record<string, string>, string]> = {
      A: [{ dark: "#3A1F2B", primary: "#6E2A5E", secondary: "#F5E6DC", accent: "#C77E4F", light: "#FFFFFF" }, "instrument_serif_n4"],
      B: [{ dark: "#2A1A22", primary: "#2B4C8C", secondary: "#FFF0DC", accent: "#B4450F", light: "#FFF6EA" }, "nunito_n8"],
      C: [{ dark: "#1F1714", primary: "#2F6A4E", secondary: "#3A2B25", accent: "#E9A24F", light: "#FBEFDD" }, "alfa_slab_one_n4"],
    };
    const une = (key: "A" | "B" | "C", name: string, descriptor: string, img?: string) => { const b = route(key); return { ...b, key, name, ground: "blanc" as const, palette: PAL[key][0] as never, fonts: { heading: PAL[key][1], body: "manrope_n4" }, board: { ...b.board, descriptor, images: img ? { logo: { id: img }, hero: { id: `hero-${key}` }, site: { id: `site-${key}` } } : { hero: { id: `hero-${key}` }, site: { id: `site-${key}` } } } }; };
    J.updateJourney(cid, (j) => {
      j.steps[0] = { status: "done" };
      j.start.image = { value: "Quelque chose de chaleureux, simple, pas trop chic. Par contre pas de flamme dessinée dans le logo, toutes les marques de bougies font ça.", status: "answered", source: "client", at: Date.now() };
      j.identities = { list: [une("A", "Sillage", "Bougies parfumées coulées à la main près de Lyon", ids.A), une("B", "Halo", "Bougies parfumées coulées à la main près de Lyon", ids.B), une("C", "Pénombre", "Bougies parfumées en cire de soja, Brignais")], issues: [], comparison: "", at: 1, round: 1 } as any;
    });
    F.addNotes(cid, [{ sujet: "la flamme", value: "pas de flamme dessinée dans le logo, toutes les marques de bougies font ça.", genre: "refuse", portee: "logo" }]);
    return { user, projectId, cid, sillage };
  }

  it("Halo part d'abord malgré l'ordre [C, B] ; chaque demande ne porte que le métier, le nom, l'épellation, les couleurs, la typographie, le fond et la série", async () => {
    const t = await nadia();
    // Ce que dessinerait OpenAI : un nouveau Halo, puis un nouveau Pénombre.
    oa.next = [(await logo("#B4450F")).toString("base64"), (await logo("#2F6A4E")).toString("base64")];
    const dessins: { id: string; prompt: string; serie: Buffer[] }[] = [];
    const relectures: string[] = [];
    C.brandChainDeps.ai = (ctx) => ({
      research: async () => [], ask: async () => { throw new Error("aucun appel de texte attendu"); },
      // Le vrai chemin du dessin du logo (modèle imposé, demande, images jointes), jusqu'à OpenAI simulé.
      draw: async (id, c) => {
        if (c.usage !== "logo") throw new Error("seul le logo est refait");
        dessins.push({ id, prompt: c.prompt, serie: c.serie ?? [] });
        return mp.withQuotedImageRoute(mp.LOGO_ROUTE, () => mp.aiBoardLogo({ userId: t.user.id, projectId: t.projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:brand:${id}` }, { prompt: c.prompt, aspect: "1:1", ...(c.serie?.length ? { serie: c.serie } : {}) }));
      },
      // Le relecteur garde chaque logo ; il reçoit, lui, les mots du client.
      look: async (_id, c) => { relectures.push(c.prompt); return { images: [{ slot: "logo", seen: "", score: 9, ok: true, read: [/Marque : « ([^»]+) »/.exec(c.prompt)![1]], why: "net" }] } as never; },
    });
    // La carte telle que SINA l'a donnée : les clés dans son ordre [C, B], sa consigne avec ses mots exacts.
    const payload = { projectId: t.projectId, conversationId: t.cid, capMicro: 9_000_000, count: 3, imagesOnly: true, images: true, redo: ["C", "B"], slots: ["logo"], guidance: GUIDANCE };
    const jid = `job-logo-reel-${Date.now()}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, t.user.id, t.projectId, C.SINA_BRAND_JOB, "marque", JSON.stringify(payload), "running", Date.now(), Date.now(), Date.now());
    await fr(() => C.runSinaBrandJob(new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid))));

    // Deux demandes à OpenAI : Halo d'abord, puis Pénombre.
    expect(oa.calls).toHaveLength(2);
    const [halo, penombre] = oa.calls;
    expect(halo.model).toBe(mp.LOGO_ROUTE.model);
    // La demande décidée le 23 novembre 2026 au soir : le métier et le nom, l'épellation si besoin, les couleurs, la
    // typographie, le fond en une phrase, puis la série.
    const I = await import("@/lib/syna-agent/brand-images");
    const lignes = (x: any, serie: string, epel = "") => ["Fais-moi un logo pour une marque de bougies. Le nom de la marque : « " + x.name + " ».", ...(epel ? [epel] : []), `Couleurs de la marque : foncé ${x.palette.dark}, couleur de marque ${x.palette.primary}, surface ${x.palette.secondary}, accent ${x.palette.accent}, clair ${x.palette.light}.`, I.typoLine(x.fonts.heading), "Sur un fond blanc uni.", serie].join("\n");
    const L0 = J.journeyOf(t.cid).identities!.list;
    expect(halo.prompt).toBe(lignes(L0[1], "Je veux un autre logo complètement différent de celui-là."));
    expect(penombre.prompt).toBe(lignes(L0[2], "Fais-moi un autre logo complètement différent des deux premiers.", "Il s'écrit lettre par lettre : P, é, n, o, m, b, r, e."));
    expect(halo.prompt).toMatch(/^Typographie de la marque : un caractère .+ \(dans l'esprit de .+\) ; tu peux le redessiner à ta façon\.$/m);
    for (const c of oa.calls) {
      expect(c.prompt).not.toMatch(INTERDITS);
      expect(c.kind).toBe("edit");
      expect(c.background).toBeUndefined();
    }
    // Les images jointes, telles qu'OpenAI les reçoit : Halo reçoit Sillage gardé ; Pénombre, Sillage et le nouveau Halo.
    const prep = async (b: Buffer) => sha(await mp.prepareImageReference(b, 1024));
    const list = J.journeyOf(t.cid).identities!.list;
    const nouveauHalo = assetData(getAsset(list[1].board!.images!.logo!.id)!);
    expect(halo.image.map((f: any) => sha(f.data))).toEqual([await prep(t.sillage)]);
    expect(penombre.image.map((f: any) => sha(f.data))).toEqual([await prep(t.sillage), await prep(nouveauHalo)]);
    expect(sha(nouveauHalo)).not.toBe(sha(assetData(getAsset(J.journeyOf(t.cid).identities!.list[0].board!.images!.logo!.id)!)));
    // Au niveau de la chaîne aussi : le nouveau Halo, jamais l'ancien.
    expect(dessins.map((d) => d.id.split("-")[2])).toEqual(["B", "C"]);
    expect(dessins[1].serie.map(sha)).toEqual([sha(t.sillage), sha(nouveauHalo)]);
    // 
    // Le relecteur juge la qualité seulement : ni les mots du client, ni ses refus, ni sa fiche de portée logo.
    for (const r of relectures) { expect(r).not.toMatch(/flamme|ne me plaît|chaleureux|Ce que le client a dit/); expect(r).toMatch(/planche des logos que le propriétaire du Studio aime/); }
    // Ce que la tâche a reçu de la consigne de SINA : rien n'en sort vers OpenAI (la consigne reste dans la tâche).
    console.info("DEMANDES REELLES AU DESSINATEUR", JSON.stringify(oa.calls.map((c) => ({ modele: c.model, prompt: c.prompt, images: c.image.length })), null, 1));
  });

  it("une reprise de Halo : la même demande, avec Sillage et son essai refusé joints, « de tous ceux-là » ; jamais la raison du refus", async () => {
    const t = await nadia();
    oa.next = [(await logo("#B4450F")).toString("base64"), (await logo("#884422")).toString("base64")];
    let vus = 0;
    const relectures: string[] = [];
    C.brandChainDeps.ai = (ctx) => ({
      research: async () => [], ask: async () => { throw new Error("aucun appel de texte attendu"); },
      draw: async (id, c) => mp.withQuotedImageRoute(mp.LOGO_ROUTE, () => mp.aiBoardLogo({ userId: t.user.id, projectId: t.projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:brand:${id}` }, { prompt: c.prompt, aspect: "1:1", ...(c.serie?.length ? { serie: c.serie } : {}) })),
      // Le 1er essai refusé (un sous-titre non demandé), le 2e gardé.
      look: async (_id, c) => { relectures.push(c.prompt); return (++vus === 1 ? { images: [{ slot: "logo", seen: "", score: 5, ok: false, read: ["Halo", "Bougies"], why: "un sous-titre non demandé", defect: "texte" }] } : { images: [{ slot: "logo", seen: "", score: 9, ok: true, read: ["Halo"], why: "net" }] }) as never; },
    });
    const jid = `job-logo-reprise-${Date.now()}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, t.user.id, t.projectId, C.SINA_BRAND_JOB, "marque", JSON.stringify({ projectId: t.projectId, conversationId: t.cid, capMicro: 9_000_000, count: 3, imagesOnly: true, images: true, redo: ["B"], slots: ["logo"], guidance: GUIDANCE }), "running", Date.now(), Date.now(), Date.now());
    await fr(() => C.runSinaBrandJob(new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid))));
    expect(oa.calls).toHaveLength(2);
    const [e1, e2] = oa.calls;
    expect(e2.prompt).toBe(e1.prompt.replace("Je veux un autre logo complètement différent de celui-là.", "Fais-moi un autre logo complètement différent de tous ceux-là."));
    expect(e1.image).toHaveLength(1);
    expect(e2.image).toHaveLength(2);
    expect(e2.image[0].data).toEqual(e1.image[0].data);
    for (const c of oa.calls) expect(c.prompt).not.toMatch(/sous-titre|Bougies|5 sur 10|CORRECTION/);
    for (const r of relectures) expect(r).not.toMatch(/flamme|ne me plaît|chaleureux|Ce que le client a dit/);
    console.info("REPRISE DE HALO", JSON.stringify(oa.calls.map((c) => ({ prompt: c.prompt, images: c.image.length })), null, 1));
  });
});
