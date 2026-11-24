/**
 * LA MÉTHODE DES PUBLICATIONS (validée par le propriétaire le 24 novembre 2026 ; plan accepté « Oui au plan des
 * publications, tel quel »). Éteinte par défaut ; allumée, la demande exacte jusqu'à OpenAI simulé, le recadrage exact, les
 * cinq parties, l'objectif contrôlé, la trace gardée, la bande aux rapports exacts, le devis, une seule reprise à la charge
 * du Studio avec la même demande, et le verrou des logos intact ailleurs. Aucun appel payant, aucune clé réelle.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { route } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";
let keys: Record<string, string | null> = {};
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

const oa = { calls: [] as any[], panne: false, taille: "" };
vi.mock("openai", () => {
  class OpenAI {
    constructor(public opts: any) {}
    private run = (kind: string, p: any) => {
      oa.calls.push({ kind, ...p });
      const usage = { input_tokens: 1292, input_tokens_details: { text_tokens: 268, image_tokens: 1024 }, output_tokens: 1834, output_tokens_details: { image_tokens: 1834, text_tokens: 0 }, total_tokens: 3126 };
      const done = (async () => {
        if (oa.panne) { const e: any = new Error("502 upstream request failed"); e.status = 502; throw e; }
        const [w, h] = String(p.size).split("x").map(Number);
        const b64 = (await sharp({ create: { width: w || 64, height: h || 64, channels: 3, background: "#EEE6DA" } }).png().toBuffer()).toString("base64");
        return { created: 1, background: "opaque", output_format: "png", quality: "high", size: p.size, data: [{ b64_json: b64 }], usage };
      })();
      return Object.assign(done, { withResponse: async () => ({ data: await done, request_id: `req_${kind}_${oa.calls.length}` }) });
    };
    images = { generate: (p: any) => this.run("generate", p), edit: (p: any) => this.run("edit", p) };
  }
  return { default: OpenAI, OpenAI, toFile: async (b: Buffer, name: string, o?: { type?: string }) => ({ name, size: b.length, data: b, type: o?.type }) };
});

const M = await import("@/lib/syna-agent/publications-methode");
const { setJsonSetting } = await import("@/lib/settings");
const allumer = (v: boolean) => setJsonSetting(M.REGLAGE_METHODE, v);
afterEach(() => allumer(false));

/** Une image « reçue » non uniforme (le contrôle sans IA refuse une image vide d'une seule couleur). */
const recue = async (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: "#E9E1D4" } })
  .composite([{ input: { create: { width: Math.round(w / 2), height: Math.round(h / 3), channels: 3, background: "#7A3E2B" } }, left: Math.round(w / 4), top: Math.round(h / 3) }, { input: { create: { width: Math.round(w / 5), height: Math.round(h / 8), channels: 3, background: "#1E2B24" } }, left: 20, top: 20 }])
  .png().toBuffer();

/** Une identité inventée pour les essais (aucun projet d'essai). */
const identite = (objectifs: (string | undefined)[] = ["Crée une scène chaude au petit matin, autour du four encore rouge. L'objectif est de faire sentir l'odeur du pain qui sort.", "Crée une vraie campagne produit : une miche entière, désirable, sur un fond franc.", "Crée une situation drôle que tout amateur de pain reconnaît. Le contenu doit donner envie d'être envoyé à un ami."]) => {
  const x0: any = route("A");
  return { ...x0, name: "Fournil", palette: { dark: "#2B1D14", primary: "#B5562A", secondary: "#E8D7BF", accent: "#D9A441", light: "#FBF6EE" },
    board: { ...x0.board, descriptor: "Pain au levain cuit au feu de bois", images: undefined,
      posts: [{ text: "La croûte chante encore.", look: "fond" }, { text: "Une miche, trois jours de bonheur.", look: "couleur" }, { text: "Quand le pain sort du four, tout le monde se lève.", look: "motif" }].map((p, i) => ({ ...p, ...(objectifs[i] ? { objectif: objectifs[i] } : {}) })) } };
};

describe("le module : éteint par défaut, cinq parties dans l'ordre, recadrage exact", () => {
  it("éteint par défaut ; seul le réglage l'allume", () => {
    expect(M.methodeActive()).toBe(false);
    allumer(true); expect(M.methodeActive()).toBe(true);
    allumer(false); expect(M.methodeActive()).toBe(false);
  });

  it("les formats : demandés en 1088 × 1088, 1088 × 1360, 1088 × 1936 ; finaux 1080 × 1080, 1080 × 1350, 1080 × 1920 ; post0 à post2 dans cet ordre", () => {
    expect(M.FORMATS).toEqual({ "1:1": { nom: "carré", w: 1080, h: 1080, demande: "1088x1088" }, "4:5": { nom: "portrait", w: 1080, h: 1350, demande: "1088x1360" }, "9:16": { nom: "story", w: 1080, h: 1920, demande: "1088x1936" } });
    expect(M.FORMAT_DES_PLACES).toEqual({ post0: "1:1", post1: "4:5", post2: "9:16" });
    for (const f of Object.values(M.FORMATS)) for (const n of f.demande.split("x").map(Number)) expect(n % 16).toBe(0);
  });

  it("la partie 5 est mot pour mot celle de l'essai validé", () => {
    expect(M.EXIGENCES_COMMUNES).toBe("Le logo de l'image jointe signe la publication sans monopoliser l'image ; ne le redessine pas. Un sujet principal, une accroche forte, une hiérarchie visuelle claire. Pas d'accumulation de slogans, de pictogrammes, de blocs de réassurance ni de textes secondaires. N'invente aucune caractéristique technique, garantie, certification ou performance produit. Textes en français.");
  });

  it("les cinq parties dans l'ordre, séparées d'une espace, sans modèle de texte", () => {
    const x = identite();
    const id = M.phraseIdentite(x);
    expect(id).toMatch(/^Identité Fournil à conserver : palette [^;]+#2B1D14, [^;]+#B5562A, [^;]+#E8D7BF, [^;]+#D9A441, [^;]+#FBF6EE ; typographies .+ et .+ ; ton complice, patiente et nocturne\.$/);
    const t = M.textePublication({ marque: "Fournil", metier: M.metierDe("Pain au levain cuit au feu de bois."), format: "4:5", accroche: "Une miche, trois jours de bonheur.", objectif: "Crée une campagne produit.", identite: id });
    expect(t).toBe(`Crée une publication pour les réseaux sociaux de Fournil, pain au levain cuit au feu de bois. Format portrait 1080 × 1350. Accroche, écrite exactement : « Une miche, trois jours de bonheur. » Crée une campagne produit. ${id} ${M.EXIGENCES_COMMUNES}`);
    const parties = [t.indexOf("Crée une publication"), t.indexOf("Accroche, écrite exactement"), t.indexOf("Crée une campagne produit."), t.indexOf("Identité Fournil"), t.indexOf("Le logo de l'image jointe")];
    expect([...parties].sort((a, b) => a - b)).toEqual(parties);
    expect(parties.every((p) => p >= 0)).toBe(true);
    expect(() => M.textePublication({ marque: "Fournil", metier: "", format: "1:1", accroche: "x", objectif: "y", identite: id })).not.toThrow();
    expect(() => M.textePublication({ marque: "Fournil", metier: "pain", format: "1:1", accroche: "x", objectif: " ", identite: id })).toThrow(/vide/);
  });

  it("recadrage central exact ; une image reçue plus petite est refusée, jamais agrandie", async () => {
    const brute = await recue(1088, 1360);
    const fin = await M.recadrer(brute, "4:5");
    const m = await sharp(fin).metadata();
    expect([m.width, m.height]).toEqual([1080, 1350]);
    // Le centre est gardé : le pixel (540, 675) du final est le pixel (544, 680) de la brute.
    const px = async (b: Buffer, x: number, y: number) => [...(await sharp(b).extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer())].slice(0, 3);
    expect(await px(fin, 540, 675)).toEqual(await px(brute, 544, 680));
    expect(await px(fin, 0, 0)).toEqual(await px(brute, 4, 5));
    for (const [f, w, h] of [["1:1", 1088, 1088], ["9:16", 1088, 1936]] as const) { const r = await sharp(await M.recadrer(await recue(w, h), f)).metadata(); expect([r.width, r.height]).toEqual([M.FORMATS[f].w, M.FORMATS[f].h]); }
    await expect(M.recadrer(await recue(1080, 1349), "4:5")).rejects.toBeInstanceOf(M.ImageTropPetite);
    await expect(M.recadrer(await recue(1024, 1536), "4:5")).rejects.toThrow(/jamais agrandie/);
  });

  it("aucun texte du projet d'essai de la référence dans le code", () => {
    // Les mots sont écrits à l'envers : ce fichier ne les porte pas non plus.
    const mots = ["yppop", "siennrah", "23A3E1#", "596AC8#", "F6F7D1#", "elpmoc te xuerueluahc", "esissael al ed tuob ua elyts eL"].map((m) => m.split("").reverse().join(""));
    const fichiers: string[] = [];
    const lire = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) lire(p); else if (/\.(ts|tsx|js|json|md)$/.test(e.name)) fichiers.push(p); } };
    lire("src");
    for (const f of fichiers) { const s = fs.readFileSync(f, "utf8").toLowerCase(); for (const m of mots) expect(s.includes(m.toLowerCase()), `${f} : ${m}`).toBe(false); }
  });
});

describe("l'objectif : la seule partie libre, contrôlée gratuitement", () => {
  it("sans accord écrit ni photo d'une personne, l'objectif dit lui-même qu'il n'y a aucune personne", () => {
    const r = M.controleDesObjectifs(["Crée une scène chaude autour du four. L'objectif est de faire sentir l'odeur.", "Crée une campagne produit franche.", "Crée une situation drôle."], false);
    expect(r.raisons).toEqual([null, null, null]);
    for (const o of r.objectifs) expect(o).toMatch(/ Aucune personne n'apparaît dans l'image\.$/);
    // Avec l'accord : rien n'est ajouté.
    expect(M.controleDesObjectifs(["Crée une scène.", "Crée une campagne.", "Crée un sourire."], true).objectifs).toEqual(["Crée une scène.", "Crée une campagne.", "Crée un sourire."]);
    // Déjà dit : pas répété.
    expect(M.controleDesObjectifs([`Crée une scène. ${M.SANS_PERSONNE}`], false).objectifs[0]).toBe(`Crée une scène. ${M.SANS_PERSONNE}`);
  });
  it("refuse une personne demandée sans accord, un ordre au lecteur, un texte en plus, plus de deux phrases, deux objectifs identiques", () => {
    const r = M.controleDesObjectifs(["Crée une scène avec une femme qui sourit.", "Commande maintenant ta miche.", "Écris « Promo » en grand.", "Une. Deux. Trois.", "Crée une scène.", "Crée une scène."], false);
    expect(r.objectifs.slice(0, 5).map(Boolean)).toEqual([false, false, false, false, true]);
    expect(r.raisons).toEqual([expect.stringMatching(/personne/), expect.stringMatching(/ordre/), expect.stringMatching(/texte en plus/), expect.stringMatching(/deux phrases/), null, expect.stringMatching(/identique/)]);
    expect(M.controleDesObjectifs(["Crée une scène avec une femme qui sourit."], true).objectifs[0]).toBe("Crée une scène avec une femme qui sourit.");
  });
  it("écrit dans l'appel qui écrit déjà les publications, seulement allumée : éteinte, la consigne de la planche ne change pas", async () => {
    const P = await import("@/lib/syna-agent/brand-prompts");
    const base = P.directionSystem("produits");
    expect(P.directionSystem("produits", {})).toBe(base);
    expect(base).not.toMatch(/objectif/);
    const on = P.directionSystem("produits", { objectifs: { personnes: false } });
    expect(on).toContain("board.posts[].objectif");
    expect(on).toContain(`"note": "", "objectif": ""}]`);
    expect(on).toContain(`chaque objectif finit par « ${M.SANS_PERSONNE} »`);
    expect(P.directionSystem("produits", { objectifs: { personnes: true } })).not.toContain(M.SANS_PERSONNE);
    expect(on.replace(`\n${M.consigneDesObjectifs(false)}`, "").replace(`, "objectif": ""}]`, "}]")).toBe(base);
    expect(P.fixSystem("services", { objectifs: { personnes: false } })).toBe(P.directionSystem("services", { objectifs: { personnes: false } }));
  });
});

describe("l'appel à OpenAI simulé : la demande exacte, la trace, aucune relance", async () => {
  const { account, project } = await import("./conversation209-fixtures");
  const mp = await import("@/lib/ai/media-providers");
  const { all } = await import("@/lib/db");
  const { EUR } = await import("@/lib/billing");
  const { usdToEur } = await import("@/lib/ai/config");
  beforeEach(() => { keys = { openai: "sk-openai-test-123456" }; oa.calls = []; oa.panne = false; });
  const logo = () => sharp({ create: { width: 512, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: { create: { width: 300, height: 80, channels: 3, background: "#2B1D14" } }, left: 100, top: 90 }]).png().toBuffer();
  const photo = (c: string) => sharp({ create: { width: 600, height: 600, channels: 3, background: c } }).jpeg().toBuffer();
  const TEXTE = "Crée une publication pour les réseaux sociaux de Fournil, pain au levain cuit au feu de bois. Format story 1080 × 1920.";

  it("POST /v1/images/edits, champs exacts, logo officiel joint en premier puis les vraies photos, sans flux ni complexité", async () => {
    const u = await account(), pid = project(u) as string;
    const [lg, p1, p2] = [await logo(), await photo("#EEE6DA"), await photo("#C9B79C")];
    const png = await mp.aiPublicationMethode({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:pub` }, { texte: TEXTE, taille: "1088x1936", logo: { assetId: "logo-1", data: lg }, photos: [{ assetId: "photo-1", data: p1 }, { assetId: "photo-2", data: p2 }] });
    expect(oa.calls).toHaveLength(1);
    const { kind, image, ...corps } = oa.calls[0];
    expect(kind).toBe("edit");
    expect(corps).toEqual({ model: "gpt-image-2.5-sunburst", prompt: TEXTE, quality: "high", size: "1088x1936", background: "opaque", output_format: "png", n: 1 });
    expect(Object.keys(corps)).toEqual(["model", "prompt", "quality", "size", "background", "output_format", "n"]);
    expect(image.map((f: any) => f.name)).toEqual(["logo.png", "produit-1.png", "produit-2.png"]);
    expect(image[0].data.equals(lg) && image[1].data.equals(p1) && image[2].data.equals(p2)).toBe(true);
    expect(image.map((f: any) => f.type)).toEqual(["image/png", "image/jpeg", "image/jpeg"]);
    // La trace gardée pour refaire l'image.
    const r = mp.recuDePublication(png)!;
    const sha = (b: Buffer) => crypto.createHash("sha256").update(b).digest("hex");
    expect(r).toMatchObject({ adresse: "POST https://api.openai.com/v1/images/edits (multipart)", champs: corps, tailleRecue: "1088x1936", renvoye: { quality: "high", size: "1088x1936", background: "opaque", output_format: "png" } });
    expect(r.jointes).toEqual([{ role: "logo", assetId: "logo-1", sha256: sha(lg), octets: lg.length }, { role: "produit", assetId: "photo-1", sha256: sha(p1), octets: p1.length }, { role: "produit", assetId: "photo-2", sha256: sha(p2), octets: p2.length }]);
    expect(r.requestId).toMatch(/^req_edit_/);
    expect(r.usage).toMatchObject({ output_tokens: 1834 });
    // Le coût : la formule de l'essai (texte 5 $, image jointe 8 $, sortie 30 $ le million), au change du Studio.
    expect(r.coutMicro).toBe(Math.round(((268 * 5 + 1024 * 8 + 1834 * 30) / 1e6) * usdToEur() * EUR));
    expect(typeof r.dureeMs).toBe("number");
    const det = JSON.parse(all<{ details: string }>("SELECT details FROM ai_calls WHERE project_id=? ORDER BY rowid DESC LIMIT 1", pid)[0].details);
    expect(det).toMatchObject({ methode: "publications", texteEnvoye: TEXTE, reglages: { model: "gpt-image-2.5-sunburst", size: "1088x1936" } });
  });

  it("une taille hors méthode, un texte trop long ou sans logo : refusés avant tout envoi ; une panne n'est jamais relancée", async () => {
    const u = await account(), pid = project(u) as string, lg = await logo();
    const c = (k: string) => ({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:${k}` });
    await expect(mp.aiPublicationMethode(c("t"), { texte: TEXTE, taille: "1024x1024", logo: { assetId: null, data: lg }, photos: [] })).rejects.toThrow(/hors de la méthode/);
    await expect(mp.aiPublicationMethode(c("l"), { texte: "x".repeat(mp.PUBLICATION_METHODE_TEXTE_MAX_OCTETS + 1), taille: "1088x1088", logo: { assetId: null, data: lg }, photos: [] })).rejects.toThrow(/trop long/);
    await expect(mp.aiPublicationMethode(c("s"), { texte: TEXTE, taille: "1088x1088", logo: { assetId: null, data: Buffer.alloc(0) }, photos: [] })).rejects.toThrow(/logo validé/);
    expect(oa.calls).toHaveLength(0);
    oa.panne = true;
    await expect(mp.aiPublicationMethode(c("p"), { texte: TEXTE, taille: "1088x1088", logo: { assetId: null, data: lg }, photos: [] })).rejects.toThrow(/502/);
    expect(oa.calls).toHaveLength(1);
    expect(mp.PUBLICATION_METHODE_TEXTE_MAX_OCTETS).toBe(M.TEXTE_MAX_OCTETS);
  });

  it("le maximum : la formule officielle des jetons, au-dessus de ce qu'a coûté l'essai validé", () => {
    const essai = Math.round(((268 * 5 + 1024 * 8 + 1834 * 30) / 1e6) * usdToEur() * EUR);
    expect(mp.jetonsDeSortieGptImage("gpt-image-2.5-sunburst", "1088x1088", "high")).toBe(1834);
    expect(mp.jetonsDeSortieGptImage("gpt-image-2.5-sunburst", "1088x1936", "high")).toBe(1331);
    expect(mp.publicationMethodeMaxMicro("1:1", 1)).toBeGreaterThan(essai);
    expect(mp.publicationMethodeMaxMicro("1:1", 4)).toBeGreaterThan(mp.publicationMethodeMaxMicro("1:1", 1));
  });

  it("le verrou « réservé aux logos » reste partout ailleurs ; la permission ne vaut que pour ce chemin", async () => {
    const P = await import("@/lib/ai/logo-policy");
    const R = await import("@/lib/ai/media-routing");
    const { mediaModel } = await import("@/lib/ai/media-models");
    const S = await import("@/lib/ai/social-image-policy");
    const sun = mediaModel("openai", "gpt-image-2.5-sunburst")!;
    expect(R.incompatibility(sun, { kind: "image", usage: "social_image" } as never)).toMatch(/réservé aux logos et à leur planche/);
    expect(P.estReserveAuxLogos("openai", "gpt-image-2.5-sunburst")).toBe(true);
    expect(P.permisPourLesPublications("aiPublicationMethode", "openai", "gpt-image-2.5-sunburst")).toBe(true);
    expect(P.permisPourLesPublications("aiPostImage", "openai", "gpt-image-2.5-sunburst")).toBe(false);
    expect(P.permisPourLesPublications("aiPublicationMethode", "openai", "gpt-image-2.6-flare")).toBe(false);
    expect(S.PUBLICATIONS_METHODE_ROUTE).toEqual({ provider: "openai", model: P.PERMISSION_DES_PUBLICATIONS.model });
    expect(S.DEFAULT_SOCIAL_IMAGE_MODEL).toBe("gpt-image-2.6-flare");
    // Une seule adresse du code appelle le modèle sur ce chemin direct.
    const src = fs.readFileSync("src/lib/ai/media-providers.ts", "utf8");
    expect(src.match(/permisPourLesPublications\(/g)).toHaveLength(1);
  });
});

describe("la bande : même hauteur, rapports exacts, posée par le code", async () => {
  const B = await import("@/lib/media/bande-publications");
  const PP = await import("@/lib/media/planche-publications");
  it("la géométrie : même hauteur, largeurs exactes, dans le rectangle donné, jamais plus grand que les fichiers", () => {
    const p = B.bandeDesPublications(B.TAILLES_DE_LA_METHODE, { x: 16, y: 70, w: 1504, h: 600 }, { ecart: 44 });
    expect(p).toHaveLength(3);
    expect(new Set(p.map((x) => x.h)).size).toBe(1);
    expect(p[0].h % 80).toBe(0);
    for (const [i, t] of B.TAILLES_DE_LA_METHODE.entries()) { expect(p[i].w * t.h).toBe(p[i].h * t.w); expect(Number.isInteger(p[i].w)).toBe(true); }
    expect(p[2].x + p[2].w).toBeLessThanOrEqual(16 + 1504);
    expect(p[0].y).toBeGreaterThanOrEqual(70);
    expect(B.bandeDesPublications(B.TAILLES_DE_LA_METHODE, { x: 0, y: 0, w: 99999, h: 99999 })[0].h).toBe(1040);
    expect(B.bandeDesPublications(B.TAILLES_DE_LA_METHODE, { x: 0, y: 0, w: 50, h: 50 })).toEqual([]);
    expect(B.sontLesPublicationsDeLaMethode([{ w: 1080, h: 1080 }, { w: 1080, h: 1350 }, { w: 1080, h: 1920 }])).toBe(true);
    expect(B.sontLesPublicationsDeLaMethode([{ w: 1024, h: 1280 }, { w: 1024, h: 1280 }, { w: 1024, h: 1280 }])).toBe(false);
  });
  it("le fichier à part et la pose dans un rectangle : chaque publication réduite à son rapport, sans recadrage", async () => {
    const pubs = await Promise.all(B.TAILLES_DE_LA_METHODE.map((t) => recue(t.w, t.h)));
    const f = await PP.bandeEnFichier(pubs.map((data) => ({ data })), { hauteur: 560, ecart: 44, marge: 32 });
    const m = await sharp(f).metadata();
    expect(m.height).toBe(560 + 64);
    expect(m.width).toBe(560 + 448 + 315 + 88 + 64);
    const posees = await PP.publicationsPosees(pubs.map((data) => ({ data })), { x: 32, y: 32, w: 560 + 448 + 315 + 88, h: 560 }, { ecart: 44 });
    expect(posees.map((x) => [x.w, x.h])).toEqual([[560, 560], [448, 560], [315, 560]]);
    // Une image dont le rapport ne peut pas tomber juste dans le rectangle n'est jamais déformée ni coupée : refusée.
    await expect(PP.publicationsPosees([{ data: await recue(1080, 1081) }, { data: pubs[1] }, { data: pubs[2] }], { x: 0, y: 0, w: 2000, h: 560 })).rejects.toThrow(/trop petit/);
    // Chaque publication posée garde son rapport exact, pixel pour pixel.
    for (const [i, x] of posees.entries()) expect(x.w * B.TAILLES_DE_LA_METHODE[i].h).toBe(x.h * B.TAILLES_DE_LA_METHODE[i].w);
  });
  it("la planche en fichier reçoit une ligne de plus avec les trois publications ; sans elles, rien ne change", async () => {
    const { renderIdentityBoard } = await import("@/lib/media/identity-board");
    const { runWithLang } = await import("@/lib/i18n-server");
    const logo = await sharp({ create: { width: 400, height: 160, channels: 3, background: "#FFFFFF" } }).composite([{ input: { create: { width: 300, height: 80, channels: 3, background: "#2B1D14" } }, left: 50, top: 40 }]).png().toBuffer();
    const base = { name: "Fournil", business: "products" as const, logo, palette: { dark: "#2B1D14", primary: "#B5562A", secondary: "#E8D7BF", accent: "#D9A441", light: "#FBF6EE" }, fonts: { heading: "Cormorant", body: "Jost" }, icons: [] as string[] };
    const sans = await runWithLang({ ui: "fr", content: "fr" }, () => renderIdentityBoard(base));
    const pubs = await Promise.all(B.TAILLES_DE_LA_METHODE.map((t) => recue(t.w, t.h)));
    const avec = await runWithLang({ ui: "fr", content: "fr" }, () => renderIdentityBoard({ ...base, publications: pubs }));
    const [ms, ma] = [await sharp(sans).metadata(), await sharp(avec).metadata()];
    expect(ma.width).toBe(ms.width);
    expect((ma.height ?? 0) - (ms.height ?? 0)).toBe(20 + 820);
  });
});

describe("la planche : éteinte rien ne change ; allumée, les trois publications passent par le module", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  const { account, project } = await import("./conversation209-fixtures");
  const { saveAsset, getAsset } = await import("@/lib/library");
  const { run } = await import("@/lib/db");
  const { chargeDuStudio } = await import("@/lib/ai/trace");
  const imagery = { look: "lumière du matin", logo: "", hero: "Une boulangerie.", object: "Un sac.", site: "Le haut de la page.", signs: "", posts: ["Un.", "Deux.", "Trois."] };

  async function planche(o: { x?: any; verdict?: (slot: string, n: number) => { ok?: boolean; score?: number; why?: string } | undefined; photos?: number; sansLogo?: boolean; personnes?: boolean } = {}) {
    const user = await account(), projectId = project(user, "products") as string;
    for (let i = 0; i < (o.photos ?? 0); i++) {
      const a = await saveAsset({ projectId, userId: user.id, data: await recue(640, 640), name: `miche-${i + 1}.png`, mime: "image/png", role: "original", origin: "upload" });
      run("UPDATE assets SET meta=json_set(COALESCE(meta,'{}'),'$.verification',json(?)) WHERE id=?", JSON.stringify({ etat: "verifiee", at: Date.now() }), a.id);
    }
    const x0 = o.x ?? identite();
    const fini = o.sansLogo ? null : await saveAsset({ projectId, userId: user.id, data: await recue(512, 512), name: "logo-fini.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready" });
    const x = fini ? await (await import("@/lib/syna-agent/brand-chain")).poserLeLogoFini(x0, fini.id) : x0;
    const texts = I.slotTexts(x);
    const draws: { id: string; slot: string; aspect: string }[] = [], pubs: { id: string; c: any; studio: boolean }[] = [], looks: { id: string; slot: string; prompt: string; labels: string[] }[] = [];
    const vus = new Map<string, number>();
    const ai: any = {
      research: async () => [], ask: async () => { throw new Error("aucun appel attendu"); },
      draw: async (id: string, c: any) => { draws.push({ id, slot: /-(hero|object|signs|site|post\d)(:|$)/.exec(id)![1], aspect: c.aspect }); return sharp({ create: { width: 96, height: 96, channels: 3, background: "#224466" } }).png().toBuffer(); },
      publier: async (id: string, c: any) => { pubs.push({ id, c, studio: chargeDuStudio() }); const [w, h] = c.taille.split("x").map(Number); return recue(w, h); },
      look: async (id: string, c: any) => {
        const s = (c.images as { label: string }[]).map((i) => i.label).filter((l) => (I.IMAGE_SLOTS as readonly string[]).includes(l))[0];
        const n = (vus.get(s) ?? 0) + 1; vus.set(s, n);
        looks.push({ id, slot: s, prompt: c.prompt, labels: (c.images as { label: string }[]).map((i) => i.label) });
        const v = o.verdict?.(s, n) ?? { ok: true, score: 9 };
        return { images: [{ slot: s, seen: "", score: v.score ?? 9, ...(v.ok === undefined ? {} : { ok: v.ok }), read: texts[s as keyof typeof texts] ?? [], why: v.why ?? "", defect: "autre" }] };
      },
    };
    const ctx: any = { step: async (_k: string, fn: () => unknown) => fn(), progress: () => {} };
    const r = await I.runBoardImages({ ctx, ai, who: { userId: user.id, projectId }, brief: "", kind: "produits", route: x, round: 1, slots: ["post0", "post1", "post2"] as never, imagery: imagery as never });
    return { r, draws, pubs, looks, x, projectId, fini };
  }

  it("éteinte : les mêmes appels qu'avant (le dessinateur des images, en 4:5), le module n'est jamais appelé", async () => {
    const { r, draws, pubs } = await planche();
    expect(pubs).toHaveLength(0);
    expect(draws.map((d) => [d.slot, d.aspect])).toEqual([["post0", "4:5"], ["post1", "4:5"], ["post2", "4:5"]]);
    expect(r.route.board.images?.posts?.every(Boolean)).toBe(true);
    expect(r.route.board.images?.bande).toBeUndefined();
  });

  it("allumée : la demande exacte de chaque publication, à son format, le logo officiel puis les vraies photos ; la trace et l'image brute gardées ; la bande posée", async () => {
    allumer(true);
    const { r, draws, pubs, looks, x, fini } = await planche({ photos: 2 });
    expect(draws).toHaveLength(0);
    expect(pubs.map((p) => p.c.taille)).toEqual(["1088x1088", "1088x1360", "1088x1936"]);
    for (const [i, p] of pubs.entries()) {
      const f = (["1:1", "4:5", "9:16"] as const)[i];
      const objectif = M.controleDesObjectifs(x.board.posts.map((q: any) => q.objectif), false).objectifs[i]!;
      expect(p.c.texte).toBe(M.textePublication({ marque: "Fournil", metier: "pain au levain cuit au feu de bois", format: f, accroche: x.board.posts[i].text, objectif, identite: M.phraseIdentite(x) }));
      expect(p.c.texte).toContain(M.SANS_PERSONNE);
      expect(p.c.logo.assetId).toBe(fini!.id);
      expect(p.c.photos).toHaveLength(2);
      expect(p.studio).toBe(false);
    }
    const posts = r.route.board.images!.posts!;
    expect(posts.map((q) => q && [q.w, q.h])).toEqual([[1080, 1080], [1080, 1350], [1080, 1920]]);
    for (const q of posts) {
      const a = getAsset(q!.id)!, meta = JSON.parse(a.meta);
      expect(a.status).toBe("ready");
      expect(meta.publicationMethode).toMatchObject({ formatFinal: `${q!.w}x${q!.h}`, tailleRecue: expect.stringMatching(/^1088x/) });
      expect(meta.publicationMethode.jointes.map((j: any) => j.role)).toEqual(["logo", "produit", "produit"]);
      expect(meta.publicationMethode.jointes[0].assetId).toBe(fini!.id);
      const brute = getAsset(meta.publicationMethode.brute)!;
      expect(a.source_asset_id).toBe(brute.id);
      expect(brute.status).toBe("ready");
      expect([brute.width, brute.height]).toEqual([1088, Number(meta.publicationMethode.tailleRecue.split("x")[1])]);
    }
    // Le relecteur le plus fort juge chaque publication : logo joint pour comparer, produit joint, consigne de la méthode.
    const pl = looks.filter((l) => /^post/.test(l.slot));
    expect(pl).toHaveLength(3);
    for (const l of pl) { expect(l.prompt).toContain(I.ROLE_PUBLICATION_METHODE); expect(l.labels).toEqual([l.slot, "logo", "produit"]); }
    const bande = r.route.board.images!.bande!;
    expect(bande).toBeTruthy();
    expect(bande.h).toBe(560 + 64);
  });

  it("refusée : refaite UNE seule fois, à la charge du Studio, avec la MÊME demande ; refusée deux fois, elle n'est pas montrée et c'est dit", async () => {
    allumer(true);
    const une = await planche({ verdict: (s, n) => (s === "post1" && n === 1 ? { ok: false, score: 5, why: "flou" } : undefined) });
    const p1 = une.pubs.filter((p) => p.c.taille === "1088x1360");
    expect(p1.map((p) => p.id)).toHaveLength(2);
    expect(p1[1].id).toMatch(/:r1$/);
    expect(p1[1].c.texte).toBe(p1[0].c.texte);
    expect(p1[1].c.texte).not.toMatch(/CORRECTION|flou/);
    expect([p1[0].studio, p1[1].studio]).toEqual([false, true]);
    expect(une.r.route.board.images!.posts![1]).toBeTruthy();
    const deux = await planche({ verdict: (s) => (s === "post2" ? { ok: false, score: 4, why: "raté" } : undefined) });
    expect(deux.pubs.filter((p) => p.c.taille === "1088x1936")).toHaveLength(2);
    expect(deux.r.route.board.images!.posts![2]).toBeNull();
    expect(deux.r.issues.join(" ")).toMatch(/je n'ai pas gardé la troisième publication/);
    expect(deux.r.route.board.images?.bande).toBeUndefined();
  });

  it("sans logo validé, rien ne part ; un objectif manquant ou refusé : cette publication n'est pas créée, et c'est dit", async () => {
    allumer(true);
    const sans = await planche({ sansLogo: true });
    expect(sans.pubs).toHaveLength(0);
    expect(sans.r.issues.join(" ")).toMatch(/aucun logo validé/);
    const obj = await planche({ x: identite([undefined, "Crée une scène avec une femme au four.", "Crée une situation drôle."]) });
    expect(obj.pubs.map((p) => p.c.taille)).toEqual(["1088x1936"]);
    expect(obj.r.issues.join(" ")).toMatch(/objectif manquant/);
    expect(obj.r.issues.join(" ")).toMatch(/personne sans photo ni accord écrit/);
  });
});

describe("le devis : allumé, le prix du module ; éteint, rien ne change", async () => {
  const C = await import("@/lib/syna-agent/brand-chain");
  const mp = await import("@/lib/ai/media-providers");
  const I = await import("@/lib/syna-agent/brand-images");
  it("finishQuote et boardImagesQuote", () => {
    const off = C.finishQuote(), offB = C.boardImagesQuote(1, undefined, I.FINISH_SLOTS);
    allumer(true);
    const on = C.finishQuote(), onB = C.boardImagesQuote(1, undefined, I.FINISH_SLOTS);
    allumer(false);
    expect(C.finishQuote()).toEqual(off);
    expect(C.boardImagesQuote(1, undefined, I.FINISH_SLOTS)).toEqual(offB);
    const ancienne = mp.photoRequestMaxMicro(I.boardImageRoute(), { prompt: "x".repeat(6000), references: 1, aspect: "4:5", quality: "high" });
    const methode = (["1:1", "4:5", "9:16"] as const).reduce((s, f) => s + mp.publicationMethodeMaxMicro(f, 1 + M.PHOTOS_MAX), 0);
    expect(on.maxMicro - off.maxMicro).toBe(methode - 3 * ancienne);
    expect(onB.maxMicro - offB.maxMicro).toBe(methode - 3 * ancienne);
    // Les autres images et le logo ne changent pas : seule la place des publications change de prix.
    expect(C.boardImagesQuote(1, undefined, ["object", "signs"])).toEqual((() => { allumer(true); const q = C.boardImagesQuote(1, undefined, ["object", "signs"]); allumer(false); return q; })());
  });
});

describe("le calendrier : une publication de la méthode n'est offerte qu'aux réseaux de son format exact", async () => {
  const D = await import("@/lib/syna-agent/publications-de-la-marque");
  it("1:1, 4:5, 9:16", () => {
    const tous = ["instagram", "facebook", "tiktok", "youtube", "pinterest", "linkedin"];
    expect(D.reseauxDuFormat("1:1", tous)).toEqual([]);
    expect(D.reseauxDuFormat("4:5", tous)).toEqual([{ network: "instagram", format: "image" }, { network: "facebook", format: "image" }]);
    expect(D.reseauxDuFormat("9:16", tous)).toEqual([{ network: "instagram", format: "story" }]);
    expect(D.reseauxDuFormat("9:16", ["facebook"])).toEqual([]);
  });
});
