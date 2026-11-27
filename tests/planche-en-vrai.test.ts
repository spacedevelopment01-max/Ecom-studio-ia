/**
 * LA PLANCHE EN VRAI (25 novembre 2026) : la planche de démonstration choisie, refaite à l'identique en haute définition.
 * Tout est simulé : aucun appel payant, aucune clé (OpenAI simulé, faux relecteur). Un test par comportement.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { unzipSync, strFromU8 } from "fflate";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";
let keys: Record<string, string | null> = {};
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

const oa = { calls: [] as any[], panne: false, taille: "1088x1088" };
vi.mock("openai", () => {
  class OpenAI {
    constructor(public opts: any) {}
    private run = (kind: string, p: any) => {
      oa.calls.push({ kind, ...p });
      const usage = { input_tokens: 1941, output_tokens: 1834, input_tokens_details: { text_tokens: 148, image_tokens: 1793 } };
      const done = (async () => {
        if (oa.panne) { const e: any = new Error("502 upstream request failed"); e.status = 502; throw e; }
        const [w, h] = oa.taille.split("x").map(Number);
        const b64 = (await sharp({ create: { width: w, height: h, channels: 3, background: "#F4EFE6" } }).png().toBuffer()).toString("base64");
        return { data: [{ b64_json: b64 }], usage, size: oa.taille, quality: "high", background: "opaque", output_format: "png" };
      })();
      return Object.assign(done, { withResponse: async () => ({ data: await done, request_id: `req_${kind}_${oa.calls.length}` }) });
    };
    images = { generate: (p: any) => this.run("generate", p), edit: (p: any) => this.run("edit", p) };
  }
  return { default: OpenAI, OpenAI, toFile: async (b: Buffer, name: string) => ({ name, size: b.length, data: b }) };
});

const sha = (b: Buffer | string) => crypto.createHash("sha256").update(b).digest("hex");
const uni = (w: number, h: number, c: string) => sharp({ create: { width: w, height: h, channels: 3, background: c } }).png().toBuffer();
const px = async (png: Buffer, x: number, y: number) => { const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const i = (y * info.width + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };

/** La règle des preuves (lancer.py, REGLE), recopiée mot pour mot ; le nom de l'essai y est remplacé par celui du client. */
const REGLE_DE_LANCER_PY = "La première image est un aperçu en petit, découpé sur la planche d'identité que le client a choisie. "
  + "Refais-la à l'identique, en haute définition et à son vrai format : même composition, mêmes couleurs, même photographie, "
  + "mêmes textes au mot près, même typographie, mêmes placements. Améliore seulement la netteté et les détails. "
  + "La deuxième image est le logo officiel de Racine : là où il apparaît, reproduis-le exactement, sans le redessiner.";
/** Les 13 cases de boites.json et les TUILES et POSTS d'assembler-planche.py (preuves), repris tels quels. */
const BOITES = { "reference-1": [29, 903, 265, 1114], "reference-2": [276, 903, 514, 1114], "reference-3": [525, 903, 761, 1114], "reference-4": [773, 903, 1010, 1114], "reference-5": [1022, 903, 1259, 1114], "reference-6": [1271, 903, 1509, 1114], "produit-1": [35, 1220, 264, 1492], "produit-2": [278, 1220, 505, 1492], "produit-3": [517, 1220, 743, 1492], "site-ordinateur": [25, 1650, 659, 2079], "site-telephone": [674, 1655, 862, 2074], emballage: [922, 1654, 1511, 2106], "ouverture-planche": [480, 0, 1536, 285] };
const TUILES = [[22, 332, 210, 492], [215, 332, 388, 492], [393, 332, 535, 492], [540, 332, 655, 492], [659, 332, 773, 492], [779, 332, 893, 492], [908, 332, 1053, 492], [1059, 332, 1196, 492], [1201, 332, 1362, 492], [1368, 332, 1514, 492]];
const POSTS = { "publication-1x1": [777, 1243, 1033, 1510], "publication-4x5": [1048, 1209, 1296, 1535], "publication-9x16": [1317, 1177, 1512, 1535] };

describe("les cases fixes et la découpe", async () => {
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  it("cases.json : son empreinte est vérifiée comme la disposition ; une entrée par disposition (standard et animaux)", () => {
    const d = fs.readFileSync(`assets/planche-de-marque/${P.CASES.fichier}`);
    expect(sha(d)).toBe(P.CASES.sha256);
    for (const l of ["standard", "animaux"] as const) {
      const c = P.lesCases(l);
      for (const n of [...P.NOMS_DES_ELEMENTS, ...P.TUILES_DU_LOGO, ...P.CASES_DU_CODE, ...P.TITRES]) {
        const b = c.cases[n];
        expect(b, `${l} : ${n}`).toBeTruthy();
        expect(b[0] >= 0 && b[1] >= 0 && b[2] <= 1536 && b[3] <= 2304 && b[2] > b[0] && b[3] > b[1], `${l} : ${n}`).toBe(true);
      }
      expect(c.pastilles).toHaveLength(5);
    }
  });
  it("la disposition standard reprend tels quels boites.json, les TUILES et les POSTS des preuves", () => {
    const c = P.lesCases("standard").cases;
    for (const [n, b] of Object.entries(BOITES)) expect(c[n], n).toEqual(b);
    TUILES.forEach((b, i) => expect(c[`logo-${i + 1}`]).toEqual(b));
    for (const [n, b] of Object.entries(POSTS)) expect(c[n], n).toEqual(b);
    // L'ouverture du site est découpée dans l'écran de l'ordinateur.
    const o = c["ouverture-site"], s = c["site-ordinateur"];
    expect(o[0] > s[0] && o[1] > s[1] && o[2] < s[2] && o[3] < s[3]).toBe(true);
  });
  it("la découpe de la planche des animaux : chaque case recalée de quelques dizaines de pixels au plus, aucune refusée", async () => {
    const png = fs.readFileSync("assets/planche-de-marque/disposition-animaux.png");
    const d = await P.decouperLesApercus(png, "animaux");
    expect(d.refus).toEqual([]);
    for (const n of P.NOMS_DES_ELEMENTS) {
      const b = d.boites.get(n)!, m = P.lesCases("animaux").cases[n];
      expect(b.every((v, i) => Math.abs(v - m[i]) <= P.RECALAGE_MAX), n).toBe(true);
      const meta = await sharp(d.apercus.get(n)!).metadata();
      expect([meta.width, meta.height]).toEqual([b[2] - b[0], b[3] - b[1]]);
    }
  });
  it("le code refuse une case vide, coupée ou collée au bord", async () => {
    const blanche = await uni(1536, 2304, "#FAFAF7");
    const d = await P.decouperLesApercus(blanche, "standard", ["produit-1", "reference-1"]);
    expect(d.refus.map((r) => r.raison)).toEqual(["vide (presque une seule couleur)", "vide (presque une seule couleur)"]);
    const g = { data: Buffer.alloc(100 * 100, 128), w: 100, h: 100 };
    expect(await P.refusDUneCase(g, [-2, 10, 50, 50], [0, 10, 50, 50])).toMatch(/coupée/);
    expect(await P.refusDUneCase(g, [10, 10, 20, 20], [0, 0, 50, 50])).toMatch(/coupée/);
    expect(await P.refusDUneCase(g, [0, 10, 50, 50], [0, 10, 50, 50])).toMatch(/collée au bord/);
  });
});

describe("le texte envoyé et les images jointes", async () => {
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  const inv = (o: Partial<import("@/lib/syna-agent/planche-en-vrai").CaseLue> = {}) => ({ case: "produit-1", logo: false, textes: [], produit: false, personne: false, comprehensible: null, description: "", ...o });
  const a = Buffer.from("apercu"), l = Buffer.from("logo"), ph = Buffer.from("photo");
  it("REGLE mot pour mot (le nom du client à la place de celui de l'essai), plus une ligne qui dit ce qu'est l'élément", () => {
    expect(P.regle("Racine")).toBe(REGLE_DE_LANCER_PY);
    const t = P.texteDeLElement({ element: "publication-1x1", nom: "Aplomb", logo: true, photo: false, personnes: true });
    expect(t).toBe(`${REGLE_DE_LANCER_PY.replace("Racine", "Aplomb")} C'est une publication carrée pour les réseaux sociaux, 1080 × 1080. ${P.MICRO_TEXTES_EN_VRAI}`);
    // Sans accord du client pour des personnes, la ligne ajoute « Aucune personne n'apparaît. ».
    expect(P.texteDeLElement({ element: "reference-2", nom: "Aplomb", logo: true, photo: false, personnes: false })).toBe(`${P.regle("Aplomb")} C'est une photo d'ambiance de la marque. ${P.MICRO_TEXTES_EN_VRAI} Aucune personne n'apparaît.`);
    // Les formats larges demandent une marge généreuse.
    expect(P.ligneDeLElement("ouverture-site", true)).toMatch(/Garde des marges généreuses : aucun texte ne touche les bords\./);
    expect(P.ligneDeLElement("ouverture-planche", true)).toMatch(/garde des marges généreuses en haut et en bas, rien ne touche les bords\./);
  });
  it("le logo n'est joint (et dit) que si l'inventaire le voit dans la case", () => {
    expect(P.jointesDeLElement({ apercu: a, logo: l, photo: null, inventaire: inv() }).map((j) => j.role)).toEqual(["apercu"]);
    expect(P.jointesDeLElement({ apercu: a, logo: l, photo: null, inventaire: inv({ logo: true }) }).map((j) => j.role)).toEqual(["apercu", "logo"]);
    const sans = P.texteDeLElement({ element: "reference-1", nom: "Aplomb", logo: false, photo: false, personnes: true });
    expect(sans).toBe(`${P.REGLE_APERCU} C'est une photo d'ambiance de la marque. ${P.MICRO_TEXTES_EN_VRAI}`);
    expect(sans).not.toMatch(/logo officiel/);
  });
  it("la photo du produit est jointe quand le client en a une et que l'inventaire voit le produit, en dernier, avec sa phrase", () => {
    expect(P.jointesDeLElement({ apercu: a, logo: l, photo: ph, inventaire: inv({ logo: true, produit: true }) }).map((j) => j.role)).toEqual(["apercu", "logo", "produit"]);
    expect(P.jointesDeLElement({ apercu: a, logo: l, photo: ph, inventaire: inv({ produit: false }) }).map((j) => j.role)).toEqual(["apercu"]);
    expect(P.texteDeLElement({ element: "produit-1", nom: "Aplomb", logo: true, photo: true, personnes: true })).toContain("La troisième image est la photo du vrai produit du client : remplace le produit par celui de la photo jointe, garde la mise en scène à l'identique.");
    expect(P.texteDeLElement({ element: "produit-1", nom: "Aplomb", logo: false, photo: true, personnes: true })).toContain("La deuxième image est la photo du vrai produit du client");
  });
});

describe("le format final", async () => {
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  it("l'ouverture du site est demandée en 2048 × 768 puis RÉDUITE à 1920 × 720, jamais rognée", async () => {
    expect(P.ELEMENTS["ouverture-site"].taille).toBe("2048x768");
    // Une bande rouge à gauche et bleue à droite, d'un pixel : toutes deux restent après la réduction.
    const base = sharp({ create: { width: 2048, height: 768, channels: 3, background: "#FFFFFF" } });
    const png = await base.composite([{ input: await uni(8, 768, "#FF0000"), left: 0, top: 0 }, { input: await uni(8, 768, "#0000FF"), left: 2040, top: 0 }]).png().toBuffer();
    const r = await P.auFormatFinal("ouverture-site", png);
    expect(r.ok && [r.w, r.h]).toEqual([1920, 720]);
    if (!r.ok) return;
    expect((await px(r.png, 1, 360))[0]).toBeGreaterThan(200);
    expect((await px(r.png, 1918, 360))[2]).toBeGreaterThan(200);
    // Une image d'un autre rapport serait rognée : refusée.
    const autre = await P.auFormatFinal("ouverture-site", await uni(2048, 1024, "#FFFFFF"));
    expect(autre.ok).toBe(false);
  });
  it("les trois publications sont demandées en 1088 puis recadrées en 1080 × 1080, 1080 × 1350 et 1080 × 1920", async () => {
    for (const [n, t, f] of [["publication-1x1", "1088x1088", [1080, 1080]], ["publication-4x5", "1088x1360", [1080, 1350]], ["publication-9x16", "1088x1936", [1080, 1920]]] as const) {
      expect(P.ELEMENTS[n].taille).toBe(t);
      const [w, h] = t.split("x").map(Number);
      const r = await P.auFormatFinal(n, await uni(w, h, "#123456"));
      expect(r.ok && [r.w, r.h]).toEqual(f);
    }
  });
});

describe("le code seul : les dix versions, la palette, les polices", async () => {
  const C = await import("@/lib/syna-agent/planche-en-vrai-code");
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  /** Un logo d'essai fabriqué par le code : un symbole rond au-dessus d'un nom large, fond transparent. */
  const logo = async () => {
    const sym = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: Buffer.from('<svg width="200" height="200"><circle cx="100" cy="100" r="90" fill="#630A29"/></svg>') }]).png().toBuffer();
    const nom = await sharp({ create: { width: 600, height: 120, channels: 4, background: { r: 0x63, g: 0x0a, b: 0x29, alpha: 1 } } }).png().toBuffer();
    return sharp({ create: { width: 700, height: 460, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: sym, left: 250, top: 20 }, { input: nom, left: 50, top: 300 }]).png().toBuffer();
  };
  const police = C.policeDuCatalogue({ nom: "Montserrat", genre: "sans" }, 600);
  it("les dix versions du logo, en PNG haute définition sur fond transparent ; l'inversé est clair sur fond sombre", async () => {
    const lg = await logo(), sep = await C.separerSymbole(lg);
    expect(sep).toMatchObject({ fiable: true, sens: "dessus" });
    const v = await C.versionsDuLogo({ logo: lg, separation: sep, couleur: "#630A29", sombre: "#630A29", clair: "#F7F3EC", monoClair: "#A0B79B", nom: "Aplomb", bas: "Le bois bien fait", police });
    expect(Object.keys(v.versions)).toEqual([...C.VERSIONS_DU_LOGO]);
    expect(v.symboleComplet).toBe(false);
    for (const k of C.VERSIONS_DU_LOGO) { const m = await sharp(v.versions[k]).metadata(); expect(m.format).toBe("png"); expect(m.hasAlpha, k).toBe(true); }
    // Le coin du logo principal est transparent ; l'inversé : un fond sombre et un logo blanc.
    const { data } = await sharp(v.versions["logo-principal"]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0);
    const inv = await sharp(v.versions.inverse).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const lum = (i: number) => (inv.data[i * 3] + inv.data[i * 3 + 1] + inv.data[i * 3 + 2]) / 3;
    const centre = Math.floor(inv.info.height / 2) * inv.info.width + Math.floor(inv.info.width / 2);
    let blanc = 0; for (let i = 0; i < inv.info.width * inv.info.height; i++) if (lum(i) > 240) blanc++;
    expect(lum(Math.floor(inv.info.height * 0.1) * inv.info.width + 20)).toBeLessThan(120);
    expect(blanc).toBeGreaterThan(1000); void centre;
    // Favicons 32, 64, 512 et l'avatar.
    const f = await C.faviconsEtAvatar(v.versions.favicon, v.symbole, "#F7F3EC");
    for (const [b, t] of [[f.f32, 32], [f.f64, 64], [f.f512, 512]] as const) expect((await sharp(b).metadata()).width).toBe(t);
  });
  it("le symbole est séparé dès que la séparation est fiable (l'icône de la démonstration n'y change rien) ; sinon le symbole complet, et c'est dit", async () => {
    const lg = await logo(), sep = await C.separerSymbole(lg);
    const v = await C.versionsDuLogo({ logo: lg, separation: sep, couleur: "#630A29", sombre: "#630A29", clair: "#FFFFFF", monoClair: "#A0B79B", nom: "Aplomb", bas: "", police });
    expect(v.symboleComplet).toBe(false);
    const bloc = await sharp({ create: { width: 300, height: 300, channels: 4, background: { r: 10, g: 10, b: 10, alpha: 1 } } }).png().toBuffer();
    const sepBloc = await C.separerSymbole(bloc);
    expect(sepBloc.fiable).toBe(false);
    const vb = await C.versionsDuLogo({ logo: bloc, separation: sepBloc, couleur: "#0A0A0A", sombre: "#0A0A0A", clair: "#FFFFFF", monoClair: "#A0B79B", nom: "Aplomb", bas: "", police });
    expect(vb.symboleComplet).toBe(true);
    expect(P.phraseDuSymboleComplet()).toMatch(/ton icône et ton favicon reprennent ton logo complet/);
  });
  it("chaque version, badge compris, tient entière dans sa tuile avec sa marge, réduite sans être déformée ni coupée (logos très large, très haut et carré ; deux dispositions)", async () => {
    const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
    const forme = async (w: number, h: number) => {
      // Un symbole au-dessus d'un nom, dans un cadre aux proportions voulues ; encre jusqu'aux bords du cadre.
      const sh = Math.round(h * 0.45), nh = Math.round(h * 0.35);
      return sharp({ create: { width: w, height: h, channels: 4, background: transparent } }).composite([
        { input: await sharp({ create: { width: Math.max(8, Math.round(Math.min(w, sh))), height: sh, channels: 4, background: { r: 99, g: 10, b: 41, alpha: 1 } } }).png().toBuffer(), left: Math.round((w - Math.max(8, Math.round(Math.min(w, sh)))) / 2), top: 0 },
        { input: await sharp({ create: { width: w, height: nh, channels: 4, background: { r: 99, g: 10, b: 41, alpha: 1 } } }).png().toBuffer(), left: 0, top: h - nh },
      ]).png().toBuffer();
    };
    const logos = { "très large": await forme(1800, 200), "très haut": await forme(160, 1400), carre: await forme(700, 700) };
    const MARGES: Record<string, number> = { favicon: 0.3, icone: 0.2, badge: 0.06, inverse: 0.05 };
    for (const [quoi, lg] of Object.entries(logos)) {
      const sep = await C.separerSymbole(lg);
      const v = await C.versionsDuLogo({ logo: lg, separation: sep, couleur: "#630A29", sombre: "#630A29", clair: "#F7F3EC", monoClair: "#A0B79B", nom: "Aplomb", bas: "Le bois bien fait", police });
      for (const l of ["standard", "animaux"] as const) {
        for (const k of C.VERSIONS_DU_LOGO) {
          const t = P.lesCases(l).cases[C.tuileDeLaVersion(k)].map((n) => n * 2) as [number, number, number, number];
          const r = await C.rendreDansLaTuile(v.versions[k], t, MARGES[k] ?? 0.14);
          const { data, info } = await sharp(r.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
          const [ix0, iy0, ix1, iy1] = r.interieur;
          let dehors = 0, dedans = 0;
          for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
            if (data[(y * info.width + x) * 4 + 3] === 0) continue;
            if (x < ix0 || y < iy0 || x >= ix1 || y >= iy1) dehors++; else dedans++;
          }
          expect(dehors, `${quoi} · ${l} · ${k}`).toBe(0);
          expect(dedans, `${quoi} · ${l} · ${k}`).toBeGreaterThan(0);
          // Jamais déformée : le rapport des côtés posé est celui de la version, au pixel près.
          const m = await sharp(v.versions[k]).metadata(), p = C.poseDansLaTuile(m.width!, m.height!, t, MARGES[k] ?? 0.14);
          expect(Math.abs(p.w / p.h - m.width! / m.height!), `${quoi} · ${l} · ${k}`).toBeLessThan(Math.max(1 / p.w, 1 / p.h) * (m.width! / m.height!) + 0.02);
          expect(p.interieur[0] >= t[0] && p.interieur[2] <= t[2] && p.interieur[1] >= t[1] && p.interieur[3] <= t[3]).toBe(true);
        }
      }
    }
  });
  it("le badge est refait par le code : un anneau et le texte autour du symbole du logo", async () => {
    const lg = await logo(), sep = await C.separerSymbole(lg);
    const b = await C.badge(sep.symbole, "#630A29", "Aplomb", "Le bois bien fait", police);
    expect((await sharp(b).metadata()).width).toBe(1024);
    const anneau = await px(b, 512, 8);
    expect(anneau[0]).toBeGreaterThan(60);
  });
  it("la palette : la médiane des pixels de chaque pastille, mesurée sur une petite planche de test fabriquée par le code ; les rôles donnés par le code", async () => {
    const past = P.lesCases("standard").pastilles, couleurs = ["#630A29", "#25583B", "#A0B79B", "#EDDECB", "#F7F3EC"];
    expect(await C.mesurerLaPalette(await C.plancheDeTest(past, couleurs), past)).toEqual(couleurs);
    // Une pastille décalée de dix pixels (la démonstration n'est pas au pixel près) : retrouvée quand même.
    const decalees = past.map(([x, y, r]) => [x + 10, y - 6, r] as [number, number, number]);
    expect(await C.mesurerLaPalette(await C.plancheDeTest(decalees, couleurs), past)).toEqual(couleurs);
    expect(C.rolesDeLaPalette(couleurs)).toEqual({ light: "#F7F3EC", dark: "#25583B", primary: "#630A29", secondary: "#EDDECB", accent: "#A0B79B" });
  });
  it("la police lue est cherchée dans le catalogue du Studio ; absente, la plus proche, et SINA le dit en une phrase", () => {
    expect(C.policeDuCatalogue({ nom: "Playfair Display", genre: "serif" }, 700)).toMatchObject({ cle: "playfair_display", famille: "Playfair Display", remplacee: false, handle: "playfair_display_n7" });
    const h = C.policeDuCatalogue({ nom: "Helvetica Neue", genre: "sans" }, 400);
    expect(h).toMatchObject({ cle: "inter", remplacee: true, lue: "Helvetica Neue" });
    expect(fs.existsSync(`assets/fonts/${h.fichier}`)).toBe(true);
    expect(C.policeDuCatalogue({ nom: "Police Inconnue Xyz", genre: "manuscrite" }, 400).remplacee).toBe(true);
    expect(P.phraseDeLaPoliceRemplacee("Helvetica Neue", "Inter")).toBe("La police « Helvetica Neue » de ta planche n'est pas dans le catalogue du Studio : j'ai pris la plus proche, « Inter ».");
  });
});

describe("l'assemblage, la reprise et l'aperçu gardé", async () => {
  const C = await import("@/lib/syna-agent/planche-en-vrai-code");
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  const { aLaChargeDuStudio, chargeDuStudio } = await import("@/lib/billing");
  const police = C.policeDuCatalogue({ nom: "Inter", genre: "sans" }, 400);
  /** Une publication au cadre bleu de 30 pixels : posée entière, son cadre se voit sur ses quatre bords. */
  const cadre = async (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: "#0000FF" } }).composite([{ input: await uni(w - 60, h - 60, "#FF0000"), left: 30, top: 30 }]).png().toBuffer();
  it("en 3072 × 4608 : le décor agrandi deux fois, les publications entières à leurs proportions ; une image absente garde l'aperçu", async () => {
    const demo = await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#F9F8F4" } }).composite([{ input: await uni(229, 272, "#33AA33"), left: 35, top: 1220 }]).png().toBuffer();
    const c = P.lesCases("standard");
    const boites = new Map(Object.entries(c.cases));
    const versions = Object.fromEntries(C.VERSIONS_DU_LOGO.map((k) => [k, Buffer.alloc(0)])) as Record<string, Buffer>;
    const lg = await sharp({ create: { width: 100, height: 60, channels: 4, background: { r: 99, g: 10, b: 41, alpha: 1 } } }).png().toBuffer();
    for (const k of C.VERSIONS_DU_LOGO) versions[k] = lg;
    const images = new Map<any, Buffer>([["publication-4x5", await cadre(1080, 1350)], ["publication-9x16", await cadre(1080, 1920)]]);
    const out = await C.assemblerLaPlanche({ demo, boites, pastilles: c.pastilles, images, versions: versions as never, palette: c.pastilles.map(() => ({ hex: "#630A29", nom: "Bordeaux", mots: ["Élégance"] })), polices: { titres: police, textes: police }, signature: ["UNE LIGNE"], titres: new Map(), blocs: new Map(), encre: "#1C2A24" });
    expect([(await sharp(out).metadata()).width, (await sharp(out).metadata()).height]).toEqual([3072, 4608]);
    for (const [n, w, h] of [["publication-4x5", 1080, 1350], ["publication-9x16", 1080, 1920]] as const) {
      const b = c.cases[n].map((v) => v * 2), W = b[2] - b[0], H = b[3] - b[1], k = Math.min(W / w, H / h);
      const x0 = b[0] + (W - w * k) / 2, y0 = b[1] + (H - h * k) / 2, x1 = x0 + w * k, y1 = y0 + h * k;
      // Le cadre bleu se voit sur les quatre bords : rien n'est coupé.
      for (const [x, y] of [[x0 + 2, (y0 + y1) / 2], [x1 - 3, (y0 + y1) / 2], [(x0 + x1) / 2, y0 + 2], [(x0 + x1) / 2, y1 - 3]]) expect((await px(out, Math.round(x), Math.round(y)))[2], `${n} ${x},${y}`).toBeGreaterThan(200);
    }
    // Le produit 1 n'a pas de fichier en haute définition : sa case garde l'aperçu agrandi (vert).
    const p1 = c.cases["produit-1"];
    expect(await px(out, (p1[0] + 40) * 2, (p1[1] + 40) * 2)).toEqual([0x33, 0xaa, 0x33]);
  });
  it("refusée : refaite UNE fois à la charge du Studio avec ses raisons ; refusée deux fois : pas de fichier, l'aperçu garde sa case", async () => {
    const apercus = new Map<string, Buffer>([["reference-1", await uni(236, 211, "#445566")], ["reference-2", await uni(236, 211, "#445566")]]);
    const inventaire = P.InventaireSchema.parse({ cases: [{ case: "reference-1", textes: [] }, { case: "reference-2", textes: [] }], polices: { titres: { nom: "Inter" }, textes: { nom: "Inter" } } });
    const demandes: { element: string; tour: number; studio: boolean; texte: string }[] = [], relues: string[] = [];
    const bon = { identique: true, textesLus: [], logoPresent: false, personne: false, logoFonceSurFondSombre: false, produitFidele: null, texteCoupe: false, note: 9, pourquoi: "" };
    const r = await P.refaireLesElements({
      refaire: async (d, tour) => { demandes.push({ element: d.element, tour, studio: chargeDuStudio(), texte: d.texte }); return uni(1024, 912, "#556677"); },
      relire: async (g, items, _d, tour) => { relues.push(`${g}:${tour}`); return { images: items.map((it) => ({ case: it.element, ...bon, note: it.element === "reference-2" ? 6 : 9 })) }; },
      aLaChargeDuStudio,
    }, { nom: "Aplomb", personnes: false, logo: Buffer.alloc(0), photo: null, apercus, inventaire, elements: ["reference-1", "reference-2"] });
    expect(demandes.map((d) => `${d.element}:${d.tour}:${d.studio}`)).toEqual(["reference-1:1:false", "reference-2:1:false", "reference-2:2:true"]);
    expect(demandes[2].texte.endsWith("\n\nÀ corriger : sa fidélité n'est pas au niveau (6/10, il faut 8).")).toBe(true);
    expect(relues).toEqual(["references:1", "references:2"]);
    expect(r.get("reference-1")).toMatchObject({ ok: true, w: 1024, h: 912 });
    expect(r.get("reference-2")).toMatchObject({ ok: false, png: null });
    expect(r.get("reference-2")!.essais).toHaveLength(2);
    expect(P.phraseDeLImageGardeeEnApercu(["reference-2"])).toMatch(/sa case garde l'aperçu de ta planche choisie, sans fichier en haute définition\. Je peux la refaire à ma charge/);
  });
  it("la relecture compare les textes lettre pour lettre, refuse un logo ajouté, une personne sans accord, un autre produit, un texte coupé, une note sous 8", () => {
    const inv = { case: "publication-1x1", logo: false, textes: ["La magie prend", "chez vous."], produit: true, personne: false, comprehensible: true, description: "" };
    const bon = { case: "publication-1x1", identique: true, textesLus: ["La magie prend chez vous."], logoPresent: false, personne: false, logoFonceSurFondSombre: false, produitFidele: true, texteCoupe: false, note: 9, pourquoi: "" };
    expect(P.raisonsDuRefusEnVrai(bon, { inventaire: inv, personnes: false, photo: true })).toEqual([]);
    const r = (v: object) => P.raisonsDuRefusEnVrai({ ...bon, ...v }, { inventaire: inv, personnes: false, photo: true }).join(" | ");
    expect(r({ textesLus: ["La magie prand chez vous."] })).toMatch(/lettre pour lettre.*« prend ».*« prand »/);
    expect(r({ logoPresent: true })).toMatch(/logo a été ajouté/);
    expect(r({ personne: true })).toMatch(/personne est visible/);
    expect(r({ produitFidele: false })).toMatch(/pas celui de la photo du client/);
    expect(r({ texteCoupe: true })).toMatch(/coupé ou collé au bord/);
    expect(r({ logoFonceSurFondSombre: true })).toMatch(/logo foncé/);
    expect(r({ identique: false })).toMatch(/pas identique/);
    expect(r({ note: 7 })).toMatch(/7\/10, il faut 8/);
    expect(P.raisonsDuRefusEnVrai(undefined, { inventaire: inv, personnes: false, photo: false })).toEqual(["le relecteur ne l'a pas relue"]);
  });
});

describe("l'appel d'image, jusqu'à OpenAI simulé, et la borne", async () => {
  const { account, project } = await import("./conversation209-fixtures");
  const mp = await import("@/lib/ai/media-providers");
  const LP = await import("@/lib/ai/logo-policy");
  beforeEach(() => { keys = { openai: "sk-openai-test-123456" }; oa.calls = []; oa.panne = false; oa.taille = "1088x1088"; });
  it("2.5 Sunburst, high, la taille des preuves, fond opaque, n 1 ; image[] = l'aperçu, le logo, la photo ; le reçu complet ; aucune relance", async () => {
    const u = await account(), pid = project(u) as string;
    const jointes = [{ role: "apercu" as const, assetId: null, data: await uni(256, 267, "#111111") }, { role: "logo" as const, assetId: "l", data: await uni(64, 64, "#FFFFFF") }, { role: "produit" as const, assetId: "p", data: await uni(64, 64, "#222222") }];
    const png = await mp.aiElementDeLaPlanche({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:envrai` }, { element: "publication-1x1", texte: "t", taille: "1088x1088", jointes });
    expect(oa.calls).toHaveLength(1);
    const { kind, image, ...corps } = oa.calls[0];
    expect(kind).toBe("edit");
    expect(corps).toEqual({ model: "gpt-image-2.5-sunburst", prompt: "t", quality: "high", size: "1088x1088", background: "opaque", output_format: "png", n: 1 });
    expect(image.map((f: any) => f.name)).toEqual(["apercu.png", "logo.png", "produit.png"]);
    const recu = mp.recuDElementDeLaPlanche(png)!;
    expect(recu).toMatchObject({ tailleRecue: "1088x1088", requestId: expect.stringMatching(/^req_edit_/) });
    expect(recu.jointes.map((j) => j.role)).toEqual(["apercu", "logo", "produit"]);
    // Une taille hors des preuves, un aperçu absent : rien n'est envoyé ; une panne n'est jamais relancée.
    await expect(mp.aiElementDeLaPlanche({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:t` }, { element: "x", texte: "t", taille: "1024x1024", jointes })).rejects.toThrow(/hors des preuves/);
    await expect(mp.aiElementDeLaPlanche({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:a` }, { element: "x", texte: "t", taille: "1088x1088", jointes: jointes.slice(1) })).rejects.toThrow(/aperçu/);
    oa.calls = []; oa.panne = true;
    await expect(mp.aiElementDeLaPlanche({ userId: u.id, projectId: pid, jobId: null, usageKey: `essai:${Date.now()}:p` }, { element: "x", texte: "t", taille: "1088x1088", jointes })).rejects.toThrow();
    expect(oa.calls).toHaveLength(1);
  });
  it("la permission : le modèle réservé aux logos seulement sur ce chemin ; le verrou reste ailleurs", () => {
    expect(LP.PERMISSION_DE_LA_PLANCHE_EN_VRAI).toEqual({ chemin: "aiElementDeLaPlanche", provider: "openai", model: "gpt-image-2.5-sunburst" });
    expect(LP.permisPourLaPlancheEnVrai("aiElementDeLaPlanche", "openai", "gpt-image-2.5-sunburst")).toBe(true);
    expect(LP.permisPourLaPlancheEnVrai("aiPlancheDeMarque", "openai", "gpt-image-2.5-sunburst")).toBe(false);
    expect(LP.estReserveAuxLogos("openai", "gpt-image-2.5-sunburst")).toBe(true);
  });
  it("la borne : jetonsDeSortieGptImage(taille, « high ») ; le devis : au plus, probable, reprise et borne du Studio", async () => {
    const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
    const P = await import("@/lib/syna-agent/planche-en-vrai");
    const { borneDuStudio } = await import("@/lib/ai/borne-du-studio");
    const { EUR } = await import("@/lib/billing");
    // Mesuré dans l'essai : 1 834 jetons de sortie pour la publication carrée en « high ».
    expect(mp.jetonsDeSortieGptImage("gpt-image-2.5-sunburst", "1088x1088", "high")).toBeGreaterThanOrEqual(1834);
    for (const t of P.TAILLES_DE_LA_PLANCHE_EN_VRAI) expect(mp.TAILLES_DE_LA_PLANCHE_EN_VRAI as readonly string[]).toContain(t);
    for (const n of P.NOMS_DES_ELEMENTS) expect(mp.elementDeLaPlancheMaxMicro(P.ELEMENTS[n].taille, 3)).toBeGreaterThan(Math.round(T.PRIX_MESURES[n] * EUR));
    const d = T.devisDeLaPlancheEnVrai();
    expect(d.images).toBe(17);
    expect(d.maxMicro).toBeGreaterThan(d.probableMicro);
    expect(d.studioMaxMicro).toBe(borneDuStudio(d.maxMicro, false, d.repriseMicro, 1));
    // Une relance ne repaie pas ce qui est fait.
    const reste = T.devisDeLaPlancheEnVrai(["brand:envrai:inventaire", "brand:envrai:publication-1x1", "brand:envrai:relecture:publications"]);
    expect(reste.images).toBe(16);
    expect(reste.maxMicro).toBeLessThan(d.maxMicro);
  });
});

describe("l'onglet Marque : le zip, « Copier », la police remplacée", async () => {
  const Z = await import("@/lib/syna-agent/brand-zip");
  const S = await import("@/lib/syna-agent/brand-sheet");
  const C = await import("@/lib/syna-agent/planche-en-vrai-code");
  const police = C.policeDuCatalogue({ nom: "Helvetica Neue", genre: "sans" }, 400);
  const ev: import("@/lib/syna-agent/planche-en-vrai").EtatPlancheEnVrai = {
    key: "A", demo: "d", logo: "l", laquelle: "standard", at: 1, planche: { id: "planche", w: 3072, h: 4608 },
    elements: [{ element: "produit-1", id: "p1", w: 912, h: 1088, essais: 1, ambiance: true }, { element: "reference-1", id: null, essais: 2, raison: "refusée deux fois" }],
    logos: C.VERSIONS_DU_LOGO.map((version) => ({ version, id: `logo-${version}` })), favicons: { f32: "f32", f64: "f64", f512: "f512", avatar: "av" },
    palette: [{ hex: "#630A29", nom: "Bordeaux", mots: [] }, { hex: "#25583B", nom: "Vert forêt", mots: [] }], polices: { titres: C.policeDuCatalogue({ nom: "Playfair Display", genre: "serif" }, 700), textes: police },
    symboleComplet: false, publications: [], issues: [], notes: [],
  };
  it("« Tout télécharger » : un zip avec les dix versions, les favicons, les images, la planche, les couleurs et les polices", () => {
    const zip = Z.zipDeLaMarque(Z.fichiersDeLaMarque(ev, "Aplomb", (id) => Buffer.from(`fichier ${id}`)));
    const f = unzipSync(zip);
    for (const v of C.VERSIONS_DU_LOGO) expect(f[`logos/${v}.png`]).toBeTruthy();
    expect(Object.keys(f)).toEqual(expect.arrayContaining(["logos/favicon-32.png", "logos/favicon-512.png", "logos/avatar.png", "images/produit-1-image-d-ambiance.png", "planche-en-vrai.png", "couleurs.txt", "polices.txt", `polices/${police.fichier}`]));
    expect(strFromU8(f["couleurs.txt"])).toContain("#630A29  Bordeaux");
    expect(strFromU8(f["polices.txt"])).toContain("Textes : Inter (la plus proche de « Helvetica Neue »)");
    expect(fs.existsSync("src/app/api/projects/[id]/brand/zip/route.ts")).toBe(true);
  });
  it("chaque couleur avec son code et « Copier » ; les polices avec leur nom à copier et leur fichier ; l'image d'ambiance marquée", async () => {
    const v = S.vueEnVrai(ev, "pid", (id, d) => `/f/${id}${d ? "?dl" : ""}`)!;
    expect(v.zip).toBe("/api/projects/pid/brand/zip");
    expect(v.logos).toHaveLength(8);
    expect(v.polices.map((p) => p.url)).toEqual([`/api/syna/fonts/${ev.polices!.titres.fichier}`, `/api/syna/fonts/${police.fichier}`]);
    expect(v.images[0].label).toMatch(/image d'ambiance, ce n'est pas ton produit/);
    expect(v.sansFichier).toHaveLength(1);
    const { PlancheEnVrai } = await import("@/components/studio/tab-marque");
    const html = renderToStaticMarkup(createElement(PlancheEnVrai, { v }));
    expect(html).toContain('data-copier="#630A29"');
    expect(html).toContain('data-copier="Inter"');
    expect(html).toContain("Copier");
    expect(html).toContain("Tout télécharger");
    expect(html).toContain("La plus proche de « Helvetica Neue »");
  });
});

describe("le réglage, le mélange, les publications et le produit sans photo", async () => {
  const { setJsonSetting } = await import("@/lib/settings");
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  const I = await import("@/lib/syna-agent/tools/identity");
  const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
  const J = await import("@/lib/syna-agent/journey");
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { getTool } = await import("@/lib/syna-agent/registry");
  const { route } = await import("./sina-routes-fixtures");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <X,>(fn: () => Promise<X> | X) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();

  it("le réglage éteint (par défaut) ne change rien : l'accord de l'étape garde la grande scène de la fin", () => {
    setJsonSetting(P.REGLAGE_PLANCHE_EN_VRAI, false);
    expect(P.plancheEnVraiActive()).toBe(false);
    const g = I.accordGraphistes(3), s = I.sceneDeLaFin();
    setJsonSetting(P.REGLAGE_PLANCHE_EN_VRAI, true);
    try {
      const g2 = I.accordGraphistes(3), d = T.devisDeLaPlancheEnVrai();
      // Allumé : la planche en vrai remplace la marque finie dans l'accord unique.
      expect(g2.maxMicro - g.maxMicro).toBe(d.maxMicro - s.maxMicro);
    } finally { setJsonSetting(P.REGLAGE_PLANCHE_EN_VRAI, false); }
    expect(I.accordGraphistes(3)).toEqual(g);
  });
  async function deuxPlanches() {
    const user = await account(), pid = project(user) as string, cid = threadFor(user, pid);
    J.updateJourney(cid, (x) => {
      x.identities = { list: (["A", "B"] as const).map((k) => { const r = route(k) as any; return { ...r, board: { ...r.board, images: { logo: { id: `logo-${k}`, w: 1, h: 1 } }, planche: { image: { id: `pl-${k}`, w: 1536, h: 2304 }, logo: `logo-${k}`, domaine: "aplomb.fr", statut: "disponible", annee: 2026, essais: 1, at: 1 } } }; }), issues: [], comparison: "", at: 1, round: 1 } as any;
    });
    return { user, pid, cid, ctx: { user, conversationId: cid, runId: `envrai-${Date.now()}`, projectId: pid, attachment: () => null } as any };
  }
  it("une fois la planche de marque faite, le mélange de deux identités n'est plus proposé, et il est refusé proprement", async () => {
    const t = await deuxPlanches();
    setJsonSetting(P.REGLAGE_PLANCHE_EN_VRAI, true);
    try {
      const choix = getTool("identity.choose")!;
      const r = await fr(() => choix.run(t.ctx, choix.args.parse({ key: "A", mix: { palette: "B" } })));
      expect(r).toMatchObject({ ok: false, summary: P.phraseDuMelangeRefuse() });
      const j = J.journeyOf(t.cid);
      const contexte = J.journeyContext({ ...j, steps: { ...j.steps, 0: { status: "done" } as any, 1: { status: "doing" } as any } } as any);
      expect(contexte).not.toMatch(/MÉLANGER/);
      expect(contexte).toContain(J.PHRASE_SANS_MELANGE);
    } finally { setJsonSetting(P.REGLAGE_PLANCHE_EN_VRAI, false); }
    // Éteint : le mélange reste proposé comme avant.
    const j = J.journeyOf(t.cid);
    expect(J.journeyContext({ ...j, steps: { ...j.steps, 0: { status: "done" } as any, 1: { status: "doing" } as any } } as any)).toMatch(/MÉLANGER/);
  });
  it("les publications : celles qui se comprennent vont au calendrier ; l'incompréhensible reste sur la planche, et SINA le dit", async () => {
    const { publicationsDeLaMarque } = await import("@/lib/syna-agent/publications-de-la-marque");
    const j = { plancheEnVrai: { publications: [{ element: "publication-1x1", id: "a1", texte: "Un texte", comprehensible: true, format: "1:1" }, { element: "publication-4x5", id: "a2", texte: "Autre", comprehensible: false, format: "4:5" }, { element: "publication-9x16", id: "a3", texte: "Story", comprehensible: true, format: "9:16" }] } } as any;
    expect(publicationsDeLaMarque(j)).toEqual([{ index: 0, text: "Un texte", assetId: "a1" }, { index: 2, text: "Story", assetId: "a3" }]);
    expect(P.phraseDeLaPublicationIncomprehensible(2)).toMatch(/reste sur ta planche, mais je ne la mets pas à ton calendrier/);
  });
  it("le produit sans photo : marqué « image d'ambiance », jamais repris par le site ; refait avec ses photos sur son budget, avec une carte", async () => {
    const { photothequeDeLaPlanche } = await import("@/lib/syna-agent/custom-theme/brand");
    const { saveAsset } = await import("@/lib/library");
    const t = await deuxPlanches();
    const ref = await saveAsset({ projectId: t.pid, userId: t.user.id, data: await uni(64, 64, "#888888"), name: "r.png", mime: "image/png", role: "brand-envrai", origin: "generated", status: "ready" });
    const ouv = await saveAsset({ projectId: t.pid, userId: t.user.id, data: await uni(64, 24, "#888888"), name: "o.png", mime: "image/png", role: "brand-envrai", origin: "generated", status: "ready" });
    const prod = await saveAsset({ projectId: t.pid, userId: t.user.id, data: await uni(64, 64, "#888888"), name: "p.png", mime: "image/png", role: "brand-envrai", origin: "generated", status: "ready" });
    const ev = { elements: [{ element: "ouverture-site", id: ouv.id, essais: 1, description: "une table au soleil" }, { element: "reference-1", id: ref.id, essais: 1 }, { element: "produit-1", id: prod.id, essais: 1, ambiance: true }] } as any;
    const ph = photothequeDeLaPlanche({ plancheEnVrai: ev } as any);
    expect(ph.map((x) => x.id)).toEqual([ouv.id, ref.id]);
    expect(ph[0].description).toMatch(/^GRANDE PHOTO D'OUVERTURE DE L'ACCUEIL \(bandeau 1920 × 720/);
    expect(T.produitsImagines(ev)).toEqual(["produit-1"]);
    // Le concepteur du site sait que ces photos sont déjà faites : reprises, jamais recréées.
    const PB = await import("@/lib/syna-agent/custom-theme/photo-budget");
    expect(PB.lignePhotosDeLaPlanche(2)).toMatch(/^Dont 2 photos déjà faites sur sa planche de marque/);
    expect(PB.lignePhotosDeLaPlanche(0)).toBe("");
    expect(fs.readFileSync("src/lib/syna-agent/custom-theme/site-job.ts", "utf8")).toContain("reprise.phototheque = [...photothequeDeLaPlanche(");
    expect(P.phraseDuProduitImagine()).toMatch(/« image d'ambiance, ce n'est pas ton produit »/);
    expect(P.phraseDuProduitImagine()).toMatch(/« Ta photo ici »/);
    // Sans photo du client, rien à refaire ; la carte des produits a son propre prix.
    J.updateJourney(t.cid, (x) => { x.plancheEnVrai = ev; });
    expect(I.produitsEnVraiARefaire(J.journeyOf(t.cid), t.pid)).toBe(0);
    const d = T.devisDesProduitsEnVrai(1);
    expect(d.maxMicro).toBeGreaterThan(d.probableMicro);
  });
});

describe("jamais une case de texte vide (l'inventaire n'y a rien lu)", async () => {
  const C = await import("@/lib/syna-agent/planche-en-vrai-code");
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
  const police = C.policeDuCatalogue({ nom: "Inter", genre: "sans" }, 400);
  const route = (o: { revu?: "disponible" | "a_verifier"; slogan?: string } = {}) => ({ key: "A", name: "Racine", slogan: o.slogan ?? "", palette: { dark: "#5D0126" }, board: { planche: { image: { id: "pl", w: 1536, h: 2304 }, logo: "lg", domaine: "racine-officiel.fr", statut: "disponible", annee: 2026, essais: 1, at: 1, ...(o.revu ? { revu: { statut: o.revu, at: 2 } } : {}) } } }) as any;
  const inventaire = (cases: Record<string, string[]>) => P.InventaireSchema.parse({ cases: Object.entries(cases).map(([c, textes]) => ({ case: c, textes })), polices: { titres: { nom: "Inter" }, textes: { nom: "Inter" } } });
  /** La démonstration : un fond, la case du bloc 10 en vert, celle du ton en bleu, le bas de la case « haut » en orange. */
  const demo = async () => {
    const c = P.lesCases("standard").cases;
    const [s, t, h] = [c.seo, c.ton, c.haut];
    return sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#F9F8F4" } }).composite([
      { input: await uni(s[2] - s[0], s[3] - s[1], "#33AA33"), left: s[0], top: s[1] },
      { input: await uni(t[2] - t[0], t[3] - t[1], "#3333AA"), left: t[0], top: t[1] },
      { input: await uni(h[2] - h[0], Math.round((h[3] - h[1]) * 0.2), "#EE8822"), left: h[0], top: h[1] + Math.round((h[3] - h[1]) * 0.8) },
    ]).png().toBuffer();
  };
  const assembler = async (t: { titres: ReadonlyMap<string, string>; blocs: ReadonlyMap<"ton" | "seo", { lignes: string[] } | null>; haut: string[] }) => {
    const c = P.lesCases("standard"), lg = await sharp({ create: { width: 100, height: 60, channels: 4, background: { r: 99, g: 10, b: 41, alpha: 1 } } }).png().toBuffer();
    const versions = Object.fromEntries(C.VERSIONS_DU_LOGO.map((k) => [k, lg])) as never;
    return C.assemblerLaPlanche({ demo: await demo(), boites: new Map(Object.entries(c.cases)), pastilles: c.pastilles, images: new Map(), versions, palette: [], polices: { titres: police, textes: police }, signature: t.haut, titres: t.titres, blocs: t.blocs, encre: "#1C2A24" });
  };
  /** Le centre d'une case sur la planche en vrai (deux fois plus grande). */
  const centre = (n: string): [number, number] => { const b = P.lesCases("standard").cases[n]; return [b[0] + b[2], b[1] + b[3]]; };

  it("rien lu dans le bloc 10, aucun contrôle en échec : l'aperçu de la démonstration est gardé tel quel, jamais effacé", async () => {
    const t = T.textesDeLaPlanche(inventaire({}), route());
    expect(t.blocs.get("seo")).toBeNull();
    expect(t.notes.join(" ")).toMatch(/bloc 10 : l'inventaire n'y a rien lu ; l'aperçu de la démonstration est gardé tel quel/);
    expect(await px(await assembler(t), ...centre("seo"))).toEqual([0x33, 0xaa, 0x33]);
  });

  it("rien lu dans le bloc 10, mais le domaine revérifié a changé : redessiné avec les données vérifiées du Studio, jamais vide", async () => {
    const t = T.textesDeLaPlanche(inventaire({}), route({ revu: "a_verifier" }));
    expect(t.blocs.get("seo")).toEqual({ lignes: ["© 2026 Racine", "racine-officiel.fr — à vérifier"] });
    // Le bloc est redessiné sur son fond, avec ses deux lignes : des pixels de texte apparaissent dans la case.
    const s = P.lesCases("standard").cases.seo;
    const { data } = await sharp(await assembler(t)).extract({ left: s[0] * 2, top: s[1] * 2, width: (s[2] - s[0]) * 2, height: (s[3] - s[1]) * 2 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let texte = 0;
    for (let i = 0; i < data.length; i += 3) if (Math.abs(data[i] - 0x33) + Math.abs(data[i + 1] - 0xaa) + Math.abs(data[i + 2] - 0x33) > 60) texte++;
    expect(texte).toBeGreaterThan(500);
  });

  it("un bloc 10 redessiné porte toujours le copyright et la mention vérifiés, même s'ils n'ont pas été lus", () => {
    expect(T.textesDeLaPlanche(inventaire({ seo: ["Livraison gratuite en 48 h"] }), route()).blocs.get("seo")).toEqual({ lignes: ["© 2026 Racine", "racine-officiel.fr — disponible"] });
    expect(T.textesDeLaPlanche(inventaire({ seo: ["Plantes en ligne", "racine.fr"] }), route()).blocs.get("seo")).toEqual({ lignes: ["Plantes en ligne", "racine.fr", "© 2026 Racine", "racine-officiel.fr — disponible"] });
    // Juste : le décor est gardé.
    expect(T.textesDeLaPlanche(inventaire({ seo: ["© 2026 Racine", "racine-officiel.fr — disponible"] }), route()).blocs.get("seo")).toBeNull();
  });

  it("le ton : rien lu, le décor est gardé ; toutes ses lignes promettent, il garde une ligne sans promesse, jamais vide", async () => {
    const vide = T.textesDeLaPlanche(inventaire({}), route());
    expect(vide.blocs.get("ton")).toBeNull();
    expect(await px(await assembler(vide), ...centre("ton"))).toEqual([0x33, 0x33, 0xaa]);
    expect(T.textesDeLaPlanche(inventaire({ ton: ["Livraison offerte", "Satisfait ou remboursé"] }), route({ slogan: "Des plantes pour des espaces plus vivants" })).blocs.get("ton")).toEqual({ lignes: ["Des plantes pour des espaces plus vivants"] });
    expect(T.textesDeLaPlanche(inventaire({ ton: ["Livraison offerte"] }), route({ slogan: "Livraison en 24 h" })).blocs.get("ton")).toEqual({ lignes: ["Racine"] });
  });

  it("les autres cases de texte : un titre ou une signature non lus gardent le décor ; un bloc sans ligne n'est jamais effacé", async () => {
    const t = T.textesDeLaPlanche(inventaire({ "titre-01": [] }), route());
    expect(t.titres.size).toBe(0);
    expect(t.haut).toEqual([]);
    const out = await assembler({ ...t, blocs: new Map([["ton", { lignes: [] }], ["seo", { lignes: ["  "] }]]) });
    // La ligne sous le logo (orange) reste ; le ton (bleu) et le bloc 10 (vert) ne sont pas effacés.
    const h = P.lesCases("standard").cases.haut;
    expect(await px(out, h[0] + h[2], Math.round(2 * (h[1] + (h[3] - h[1]) * 0.9)))).toEqual([0xee, 0x88, 0x22]);
    expect(await px(out, ...centre("ton"))).toEqual([0x33, 0x33, 0xaa]);
    expect(await px(out, ...centre("seo"))).toEqual([0x33, 0xaa, 0x33]);
  });
});
