/**
 * L'ESSAI RÉEL DE HAVANE, PLANCHE EN VRAI ET ONGLET MARQUE (27 novembre 2026) : les défauts 6 à 11 relevés par le chef
 * d'orchestre (docs/studio/essais-complets/havane-defauts.md, branche claude/essais-complets), et le retrait du logo
 * compact et du logo empilé (« En même temps logo Compact et logo empiler j'en veux plus sur la planche et nul part »).
 * Aucun appel ; aucune image de l'essai n'est copiée dans le dépôt : les logos et les planches sont dessinés ici, avec la
 * même construction que ceux de l'essai (vérifiée à part sur les vrais fichiers, sans appel).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import * as P from "@/lib/syna-agent/planche-en-vrai";
import * as C from "@/lib/syna-agent/planche-en-vrai-code";
import * as T from "@/lib/syna-agent/planche-en-vrai-tache";
import { FONT_DIR } from "@/lib/media/fonts";

GlobalFonts.registerFromPath(path.join(FONT_DIR, "Montserrat-600.ttf"), "essai-havane");
const VERT = "#052116", COGNAC = "#BC702F";
const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * Un logo construit comme celui de Havane : six lettres capitales espacées, la deuxième remplacée par un chevron posé sur un
 * trait cognac, et la phrase en petites capitales dessous, qui commence sous la première lettre. Fond transparent.
 */
async function logoEnLettres(o: { phrase?: string; frange?: boolean } = {}): Promise<Buffer> {
  const c = createCanvas(1000, 260), x = c.getContext("2d");
  x.fillStyle = VERT; x.font = "600 170px essai-havane"; x.textBaseline = "alphabetic";
  const lettres = ["H", "", "V", "A", "N", "E"];
  for (const [i, l] of lettres.entries()) if (l) x.fillText(l, 20 + i * 160, 170);
  // Le chevron et son trait, à la place de la deuxième lettre.
  x.beginPath(); x.moveTo(190, 170); x.lineTo(250, 40); x.lineTo(310, 170); x.lineTo(285, 170); x.lineTo(250, 90); x.lineTo(215, 170); x.closePath(); x.fill();
  x.fillStyle = COGNAC; x.fillRect(180, 176, 140, 12);
  if (o.phrase) { x.fillStyle = VERT; x.font = "600 30px essai-havane"; x.fillText(o.phrase, 22, 245); }
  if (o.frange) {
    // La frange claire laissée par un fond retiré, tout autour du dessin.
    const { data } = await sharp(await c.encode("png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const out = Buffer.from(data), w = 1000, h = 260;
    for (let y = 1; y < h - 1; y++) for (let xx = 1; xx < w - 1; xx++) {
      const i = (y * w + xx) * 4;
      if (data[i + 3] > 0) continue;
      const voisin = [-1, 1, -w, w].some((d) => data[i + d * 4 + 3] > 200);
      if (voisin) { out[i] = 250; out[i + 1] = 248; out[i + 2] = 244; out[i + 3] = 255; }
    }
    return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  }
  return c.encode("png");
}

describe("point 6 : les petites versions ne prennent jamais une lettre du nom avec un morceau de la phrase", () => {
  it("le « H » du nom et « SACS » dessous ne sont pas un symbole : aucune séparation ; l'icône, le favicon et le badge reprennent le logo entier, jamais un bout", async () => {
    const logo = await logoEnLettres({ phrase: "SACS  ·  PORTEFEUILLES  ·  CEINTURES" });
    const sep = await C.separerSymbole(logo);
    expect(sep.fiable).toBe(false);
    const v = await C.versionsDuLogo({ logo, separation: sep, couleur: VERT, sombre: VERT, clair: "#FCF8F5", monoClair: "#9BAE94", nom: "Havane", bas: "SACS · PORTEFEUILLES · CEINTURES", police: T.POLICE_DU_BADGE });
    expect(v.symboleComplet).toBe(true);
    // Le symbole de la marque est le logo entier (rogné), jamais la lettre seule.
    expect(v.symbole.equals(v.versions["logo-principal"])).toBe(true);
    const m = await sharp(v.symbole).metadata();
    expect(m.width! / m.height!).toBeGreaterThan(3);
    // L'icône montre le logo entier, aussi large que lui, sur son carré.
    const { data, info } = await sharp(v.versions.icone).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let x0 = info.width, x1 = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * 3; if (lum(data[i], data[i + 1], data[i + 2]) > 200) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }
    expect((x1 - x0) / info.width).toBeGreaterThan(0.5);
  });
  it("sans phrase, une lettre du nom (même hauteur, même écart que les autres lettres) n'est jamais un symbole ; un vrai symbole à gauche du nom se sépare toujours", async () => {
    expect((await C.separerSymbole(await logoEnLettres())).fiable).toBe(false);
    // Un rond plus haut que le nom, bien écarté : un vrai symbole.
    const c = createCanvas(900, 260), x = c.getContext("2d");
    x.fillStyle = VERT; x.beginPath(); x.arc(110, 130, 100, 0, Math.PI * 2); x.fill();
    x.font = "600 110px essai-havane"; x.fillText("ROND", 300, 175);
    const sep = await C.separerSymbole(await c.encode("png"));
    expect(sep).toMatchObject({ fiable: true, sens: "gauche" });
  });
  it("avec les tuiles de l'aperçu, l'icône, le favicon et le badge sont repris de l'aperçu : ce que le client a vu", async () => {
    const logo = await logoEnLettres({ phrase: "SACS  ·  PORTEFEUILLES  ·  CEINTURES" });
    const tuile = await sharp({ create: { width: 110, height: 150, channels: 3, background: "#F7F3EC" } }).composite([{ input: { create: { width: 50, height: 60, channels: 3, background: VERT } }, left: 30, top: 45 }]).png().toBuffer();
    const tuiles = new Map(["logo-5", "logo-6", "logo-10"].map((t) => [t, tuile]));
    const v = await C.versionsDuLogo({ logo, separation: await C.separerSymbole(logo), couleur: VERT, sombre: VERT, clair: "#FCF8F5", monoClair: "#9BAE94", nom: "Havane", bas: "", police: T.POLICE_DU_BADGE, tuiles });
    expect([...v.depuisLApercu].sort()).toEqual(["badge", "favicon", "icone"]);
    expect(v.symbole.equals(v.versions.icone)).toBe(true);
  });
});

describe("point 7 : sur fond sombre, le logo est toujours clair et lisible (contraste mesuré)", () => {
  it("des lettres foncées avec une frange claire et un trait de couleur ne sont pas un logo à aplats ; l'inversé est blanc, entier, et la mesure le dit lisible", async () => {
    const logo = await logoEnLettres({ phrase: "SACS  ·  PORTEFEUILLES", frange: true });
    expect(await C.logoAAplats(logo)).toBeNull();
    // La mesure : l'inversé d'avant (seules la frange et le trait gardés en blanc) ne montre presque rien du dessin.
    const avant = await C.monochromeAuxCreux(logo, "#FFFFFF", 86.5, "claires");
    expect(await C.partVisibleSurLeFond(logo, avant, VERT)).toBeLessThan(C.PART_VISIBLE_MIN);
    const v = await C.versionsDuLogo({ logo, separation: await C.separerSymbole(logo), couleur: VERT, sombre: VERT, clair: "#FCF8F5", monoClair: "#9BAE94", nom: "Havane", bas: "", police: T.POLICE_DU_BADGE });
    // Le centre d'une lettre (le « E », à droite) est blanc sur la bande sombre.
    const inv = await sharp(v.versions.inverse).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const lg = await sharp(v.versions["logo-principal"]).metadata();
    const ox = (inv.info.width - lg.width!) / 2, oy = (inv.info.height - lg.height!) / 2;
    const ici = (x: number, y: number) => { const i = (Math.round(oy + y) * inv.info.width + Math.round(ox + x)) * 3; return lum(inv.data[i], inv.data[i + 1], inv.data[i + 2]); };
    const r = await sharp(v.versions["logo-principal"]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let blancs = 0, n = 0;
    for (let y = 0; y < lg.height!; y += 3) for (let x = 0; x < lg.width!; x += 3) {
      const i = (y * lg.width! + x) * 4;
      if (r.data[i + 3] < 250 || lum(r.data[i], r.data[i + 1], r.data[i + 2]) > 100) continue;
      n++; if (ici(x, y) > 200) blancs++;
    }
    expect(n).toBeGreaterThan(500);
    expect(blancs / n).toBeGreaterThan(0.9);
  });
  it("un vrai logo à aplats (des lettres claires dans un badge sombre) le reste", async () => {
    const c = createCanvas(600, 300), x = c.getContext("2d");
    x.fillStyle = "#2B140E"; x.fillRect(20, 20, 560, 260);
    x.fillStyle = "#F4E9D8"; x.font = "600 210px essai-havane"; x.fillText("MOT", 90, 230);
    expect(await C.logoAAplats(await c.encode("png"))).not.toBeNull();
  });
  it("partVisibleSurLeFond : tout le dessin blanc sur le sombre se voit ; foncé sur foncé, rien", async () => {
    const logo = await logoEnLettres();
    const blanc = await sharp(logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < blanc.data.length; i += 4) { blanc.data[i] = 255; blanc.data[i + 1] = 255; blanc.data[i + 2] = 255; }
    const enBlanc = await sharp(blanc.data, { raw: { width: blanc.info.width, height: blanc.info.height, channels: 4 } }).png().toBuffer();
    expect(await C.partVisibleSurLeFond(logo, enBlanc, VERT)).toBeGreaterThan(0.99);
    expect(await C.partVisibleSurLeFond(logo, logo, VERT)).toBeLessThan(0.2);
  });
});

describe("point 1 : ni logo compact ni logo empilé ; la rangée du bloc 01 sans vide", () => {
  const cases = P.lesCases("standard").cases;
  const dix = new Map(Object.entries(cases).filter(([n]) => n.startsWith("logo-") || n === "titre-02") as [string, P.Boite][]);
  it("une planche d'avant, à dix cases : les huit cases gardées couvrent toute la rangée, dans l'ordre, sans se chevaucher, plus larges que sur l'aperçu", () => {
    const r = C.rangeeDuBloc01(dix);
    expect(r.refaite).toBe(true);
    expect(r.lignes.map((l) => l.version)).toEqual([...C.VERSIONS_DU_LOGO]);
    expect(r.lignes[0].cible[0]).toBe(cases["logo-1"][0]);
    expect(r.lignes.at(-1)!.cible[2]).toBe(cases["logo-10"][2]);
    for (const [i, l] of r.lignes.entries()) {
      expect(l.cible[2] - l.cible[0], l.version).toBeGreaterThan(l.source[2] - l.source[0]);
      expect([l.cible[1], l.cible[3]]).toEqual([l.source[1], l.source[3]]);
      if (i) { const g = l.cible[0] - r.lignes[i - 1].cible[2]; expect(g, l.version).toBeGreaterThanOrEqual(4); expect(g, l.version).toBeLessThanOrEqual(15); }
    }
    expect(C.VERSIONS_DU_LOGO).toHaveLength(8);
    expect(C.VERSIONS_DU_LOGO.join(" ")).not.toMatch(/compact|empile/);
  });
  it("une planche à huit cases garde les siennes", () => {
    const huit = new Map([...dix].filter(([n]) => !["logo-3", "logo-4"].includes(n)));
    const r = C.rangeeDuBloc01(huit);
    expect(r.refaite).toBe(false);
    for (const l of r.lignes) expect(l.cible).toEqual(l.source);
  });
  it("les huit cases d'une planche dessinée sans le compact ni l'empilé sont lues sur la planche ; une planche à dix cases garde les cases fixes", async () => {
    const demo = fs.readFileSync("tests/fixtures/ecume-planche-en-vrai/planche-B-gardee.jpg");
    const d10 = await P.decouperLesApercus(demo, "standard");
    expect(d10.boites.get("logo-3")).toEqual(cases["logo-3"]);
    // La même planche, sa rangée redessinée avec huit cases, chacune avec son dessin.
    const page = (await sharp(demo).resize(1536, 2304).extract({ left: 5, top: 520, width: 1, height: 1 }).raw().toBuffer());
    const bande = { create: { width: 1520, height: 180, channels: 3 as const, background: { r: page[0], g: page[1], b: page[2] } } };
    const dessins = Array.from({ length: 8 }, (_v, i) => ({ input: { create: { width: 90, height: 70, channels: 3 as const, background: "#1E3D2B" } }, left: 70 + i * 185, top: 375 }));
    const huit = await sharp(demo).resize(1536, 2304).composite([{ input: bande, left: 8, top: 320 }, ...dessins]).png().toBuffer();
    const d8 = await P.decouperLesApercus(huit, "standard");
    expect(d8.boites.has("logo-3")).toBe(false);
    expect(d8.boites.has("logo-4")).toBe(false);
    for (const [i, t] of P.TUILES_GARDEES.entries()) {
      const b = d8.boites.get(t)!;
      expect(b[0], t).toBeLessThanOrEqual(70 + i * 185);
      expect(b[2], t).toBeGreaterThanOrEqual(70 + i * 185 + 90);
    }
  });
  it("assemblée sur l'aperçu réel d'une planche à dix cases : chaque case gardée porte son dessin, et sa légende dessous ; rien au-delà de la rangée", async () => {
    const demo = fs.readFileSync("tests/fixtures/ecume-planche-en-vrai/planche-B-gardee.jpg");
    const d = await P.decouperLesApercus(demo, "standard");
    const lg = await logoEnLettres();
    const versions = Object.fromEntries(C.VERSIONS_DU_LOGO.map((k) => [k, lg])) as Record<C.VersionDuLogo, Buffer>;
    const png = await C.assemblerLaPlanche({ demo, boites: d.boites, pastilles: P.lesCases("standard").pastilles, images: new Map(), versions, palette: [],
      polices: { titres: C.policeDuCatalogue({ nom: "Poppins", genre: "sans" }, 700), textes: C.policeDuCatalogue({ nom: "Inter", genre: "sans" }, 400) },
      signature: [], titres: new Map(), blocs: new Map([["ton", null], ["seo", null]]), encre: "#1C2A24", tuilesDeLApercu: ["icone", "favicon", "badge"] });
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const r = C.rangeeDuBloc01(d.boites), legendes = C.bandeDesLegendes(d.boites)!;
    const fond = C.fondDe(data, info.width, [legendes[0] * 2, legendes[1] * 2, legendes[2] * 2, legendes[3] * 2]);
    const encre = (b: P.Boite) => { const f = C.rgbDe(fond); let n = 0; for (let y = b[1] * 2; y < b[3] * 2; y += 2) for (let x = b[0] * 2; x < b[2] * 2; x += 2) { const i = (y * info.width + x) * 3; if (C.estEncre(data[i], data[i + 1], data[i + 2], f, 60)) n++; } return n; };
    for (const l of r.lignes) {
      expect(encre([l.cible[0] + 6, l.cible[1] + 6, l.cible[2] - 6, l.cible[3] - 6]), `${l.version} : son dessin`).toBeGreaterThan(20);
      expect(encre([l.cible[0], legendes[1], l.cible[2], legendes[3]]), `${l.version} : sa légende`).toBeGreaterThan(5);
    }
  });
});

describe("point 8 : le bandeau du haut, sans second logo, la photo dans son cadre", () => {
  it("le panneau clair du bord gauche d'une image refaite (avec son petit logo) est retiré ; une photo pleine ne change pas", async () => {
    const c = createCanvas(1400, 340), x = c.getContext("2d");
    x.fillStyle = "#F7F3EC"; x.fillRect(0, 0, 1400, 340);
    x.fillStyle = VERT; x.font = "600 40px essai-havane"; x.fillText("NOM", 40, 180);
    for (let i = 0; i < 4000; i++) { x.fillStyle = `rgb(${90 + (i * 37) % 120},${50 + (i * 13) % 60},${30 + (i * 7) % 40})`; x.fillRect(250 + ((i * 97) % 1150), (i * 53) % 340, 14, 14); }
    x.fillStyle = "#6A4A30"; x.fillRect(250, 0, 4, 340);
    const sans = await C.sansPanneauClair(await c.encode("png"));
    const m = await sharp(sans).metadata();
    expect(m.width).toBeGreaterThanOrEqual(1140);
    expect(m.width).toBeLessThanOrEqual(1160);
    const pleine = await sharp({ create: { width: 800, height: 300, channels: 3, background: "#5A3A28" } }).png().toBuffer();
    expect((await sharp(await C.sansPanneauClair(pleine)).metadata()).width).toBe(800);
  });
  it("assemblée : le logo du haut débordant dans le bandeau reste un seul logo ; aucune photo de l'aperçu au-dessus ni au-dessous de l'image posée", async () => {
    const cases = P.lesCases("standard").cases, haut = cases.haut, ob = cases["ouverture-planche"];
    // L'aperçu : la page crème ; le grand logo du haut déborde sur un panneau crème au début du bandeau ; puis la photo, bleue.
    const demo = createCanvas(1536, 2304), dx = demo.getContext("2d");
    dx.fillStyle = "#F7F3EC"; dx.fillRect(0, 0, 1536, 2304);
    dx.fillStyle = "#1030C0"; dx.fillRect(ob[0] + 107, 0, ob[2] - ob[0] - 107, ob[3]);
    dx.fillStyle = VERT; dx.fillRect(46, 90, 500, 70);
    // L'image refaite : un panneau crème avec un second petit logo vert, puis la photo, brune, plus large que la case.
    const ouv = createCanvas(1400, 341), ox = ouv.getContext("2d");
    ox.fillStyle = "#F7F3EC"; ox.fillRect(0, 0, 1400, 341);
    ox.fillStyle = VERT; ox.fillRect(30, 150, 180, 40);
    for (let i = 0; i < 5000; i++) { ox.fillStyle = `rgb(${120 + (i * 37) % 80},${60 + (i * 13) % 40},${30 + (i * 7) % 30})`; ox.fillRect(250 + ((i * 97) % 1150), (i * 53) % 341, 12, 12); }
    const lg = await sharp({ create: { width: 500, height: 70, channels: 4, background: VERT } }).png().toBuffer();
    const versions = Object.fromEntries(C.VERSIONS_DU_LOGO.map((k) => [k, lg])) as Record<C.VersionDuLogo, Buffer>;
    const png = await C.assemblerLaPlanche({ demo: await demo.encode("png"), boites: new Map([["haut", haut], ["ouverture-planche", ob]]), pastilles: [], images: new Map([["ouverture-planche", await ouv.encode("png")]]), versions, palette: [],
      polices: { titres: C.policeDuCatalogue({ nom: "Poppins", genre: "sans" }, 700), textes: C.policeDuCatalogue({ nom: "Inter", genre: "sans" }, 400) },
      signature: [], titres: new Map(), blocs: new Map(), encre: "#1C2A24", hautDansLeLogo: true });
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const compte = (b: P.Boite, p: (r: number, g: number, bl: number) => boolean) => { let n = 0; for (let y = b[1]; y < b[3]; y++) for (let x = b[0]; x < b[2]; x++) { const i = (y * info.width + x) * 3; if (p(data[i], data[i + 1], data[i + 2])) n++; } return n; };
    const vert = (r: number, g: number, b: number) => g > r + 8 && g > b && r < 40 && g < 60;
    // Un seul logo : rien de vert dans le bandeau, à droite du logo du haut.
    expect(compte([(546 + 10) * 2, 0, ob[2] * 2, ob[3] * 2], vert)).toBe(0);
    expect(compte([46 * 2, 90 * 2, 546 * 2, 160 * 2], vert)).toBeGreaterThan(1000);
    // Aucune photo bleue de l'aperçu au-dessus ni au-dessous de l'image posée.
    expect(compte([(ob[0] + 120) * 2, 0, ob[2] * 2, ob[3] * 2], (r, g, b) => b > 150 && r < 60)).toBe(0);
  });
});

describe("points 9 et 10 : une image n'est jugée que sur les textes de sa seule zone", () => {
  it("« 6.GI » de la barre d'état n'est jamais attendu ni reproché ; une heure non plus ; un vrai texte de l'écran reste attendu", () => {
    const attendus = ["6.GI", "HAVANE", "Sacs · Portefeuilles · Ceintures", "L'élégance", "au quotidien.", "Découvrir"];
    const z = P.textesDeLaZone(attendus, ["9:41", "HAVANE", "Sacs · Portefeuilles · Ceintures", "L'élégance", "au quotidien.", "Découvrir"], { element: "site-telephone" });
    expect(z.attendus).toEqual(attendus.slice(1));
    expect(z.lus).toEqual(attendus.slice(1));
    expect(P.comparerLesTextes(z.attendus, z.lus)).toEqual({ manquants: [], enTrop: [] });
    // Un fragment d'heure n'est attendu dans aucune case ; une année, un prix ou un format, si.
    expect(P.textesDeLaZone(["9.4l", "2019", "38 x 30 cm"], ["2019", "38 x 30 cm"], { element: "produit-1" }).attendus).toEqual(["2019", "38 x 30 cm"]);
    expect(P.estUnFragmentDeMicroTexte("5G")).toBe(true);
    expect(P.estUnFragmentDeMicroTexte("2019")).toBe(false);
    expect(P.estUnFragmentDeMicroTexte("HAVANE")).toBe(false);
  });
  it("le numéro et le titre d'un bloc relus au-dessus de l'image ne sont jamais attendus ; les textes de l'image le restent", () => {
    const site = ["08", "SITE WEB – Une expérience fluide, du premier clic à la prochaine balade", "HAVANE", "Sacs", "Portefeuilles", "Ceintures", "Des essentiels", "en cuir, pour la vie.", "Découvrir la collection →", "Cuir de France", "Fait main à Toulouse", "Tannage végétal"];
    const lus = site.slice(2);
    const z = P.textesDeLaZone(site, lus, { element: "site-ordinateur" });
    expect(z.attendus).toEqual(lus);
    expect(P.comparerLesTextes(z.attendus, z.lus).manquants).toEqual([]);
    const emballage = ["09", "PACKAGING & SUPPORTS – Une marque qui vous suit partout", "HAVANE", "SACS · PORTEFEUILLES · CEINTURES", "HAVANE"];
    expect(P.textesDeLaZone(emballage, ["HAVANE", "SACS · PORTEFEUILLES · CEINTURES", "HAVANE"], { element: "emballage" }).attendus).toEqual(emballage.slice(2));
    // Le refus d'avant (titre manquant) n'a plus lieu.
    const v = { case: "site-ordinateur", identique: true, textesLus: lus, logoPresent: true, personne: false, logoFonceSurFondSombre: false, produitFidele: null, texteCoupe: false, note: 9, pourquoi: "" } as never as P.ImageRelue;
    expect(P.raisonsDuRefusEnVrai(v, { inventaire: { case: "site-ordinateur", logo: true, textes: site, produit: true, personne: false, comprehensible: null, description: "" }, personnes: false, photo: false, element: "site-ordinateur", logo: { nom: "Havane", phrase: ["SACS · PORTEFEUILLES · CEINTURES"] } })).toEqual([]);
    // Un vrai titre de l'image, relu dans l'image refaite, reste attendu.
    expect(P.textesDeLaZone(["SOLDES – Tout à moitié prix", "Découvrir"], ["SOLDES – Tout à moitié prix", "Découvrir"]).attendus).toHaveLength(2);
    expect(P.estUnTitreDeBloc("PACKAGING & SUPPORTS – Une marque qui vous suit partout")).toBe(true);
    expect(P.estUnTitreDeBloc("Des essentiels")).toBe(false);
  });
});

describe("point 11 : à l'écran, la photo d'un produit au plus juste de son contenu, entière", () => {
  it("le bas de sa carte (une bande claire, son nom, le rond de son bouton) est retiré ; une photo sans carte ne change pas", async () => {
    const c = createCanvas(912, 1088), x = c.getContext("2d");
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgb(${110 + (i * 37) % 90},${70 + (i * 13) % 50},${40 + (i * 7) % 40})`; x.fillRect((i * 97) % 912, (i * 53) % 948, 16, 16); }
    x.fillStyle = "#FDFCFA"; x.fillRect(0, 948, 912, 140);
    x.fillStyle = "#0A1A12"; x.font = "600 60px essai-havane"; x.fillText("Portefeuilles en cuir", 30, 1050);
    x.fillStyle = "#0D3B2E"; x.beginPath(); x.arc(815, 1088, 60, 0, Math.PI * 2); x.fill();
    const png = await c.encode("png");
    const sans = await C.sansLeBasDeCarte(png), m = await sharp(sans).metadata();
    expect(m.height).toBeGreaterThanOrEqual(940);
    expect(m.height).toBeLessThanOrEqual(964);
    const montree = await T.imageMontree("produit-2", png);
    expect((await sharp(montree).metadata()).height).toBeLessThanOrEqual(964);
    const pleine = await sharp(png).extract({ left: 0, top: 0, width: 912, height: 940 }).png().toBuffer();
    expect((await sharp(await C.sansLeBasDeCarte(pleine)).metadata()).height).toBe(940);
  });
});
