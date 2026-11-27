/**
 * LES TROIS CORRECTIONS DE LA PLANCHE EN VRAI après l'essai réel du 25 novembre 2026 (14 images gardées sur 17), sans
 * aucun appel : la séparation du symbole et du nom sur le vrai logo de l'essai, le symbole seul joint là où l'inventaire
 * ne voit que lui, et les marges blanches du bandeau rognées avant la relecture.
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const LOGO_REEL = "tests/fixtures/planche-en-vrai/esquisse-11-logo-garde-512.png";
type Px = { data: Buffer; w: number; h: number };
const pixels = async (png: Buffer): Promise<Px> => { const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
/** Les points d'« encre » : opaques et proches de la couleur donnée. */
const encre = (p: Px, x: number, y: number, rgb: [number, number, number]) => {
  const i = (y * p.w + x) * 4;
  return p.data[i + 3] > 128 && Math.abs(p.data[i] - rgb[0]) + Math.abs(p.data[i + 1] - rgb[1]) + Math.abs(p.data[i + 2] - rgb[2]) < 90;
};
/** Les lignes qui portent de l'encre, regroupées en blocs séparés par au moins `ecart` lignes vides. */
const blocsDeLignes = (p: Px, rgb: [number, number, number], ecart = 3, x0 = 0, x1 = p.w) => {
  const pleines: number[] = [];
  for (let y = 0; y < p.h; y++) { let n = 0; for (let x = x0; x < x1; x++) if (encre(p, x, y, rgb)) n++; if (n > 1) pleines.push(y); }
  const blocs: [number, number][] = [];
  for (const y of pleines) { const d = blocs.at(-1); if (d && y - d[1] <= ecart) d[1] = y; else blocs.push([y, y]); }
  return blocs;
};
const blocsDeColonnes = (p: Px, rgb: [number, number, number], ecart = 3) => {
  const pleines: number[] = [];
  for (let x = 0; x < p.w; x++) { let n = 0; for (let y = 0; y < p.h; y++) if (encre(p, x, y, rgb)) n++; if (n > 1) pleines.push(x); }
  const blocs: [number, number][] = [];
  for (const x of pleines) { const d = blocs.at(-1); if (d && x - d[1] <= ecart) d[1] = x; else blocs.push([x, x]); }
  return blocs;
};

describe("1. les logos : le symbole et le nom séparés sur le vrai logo de l'essai (masque d'encre, plus grande bande vide)", async () => {
  const C = await import("@/lib/syna-agent/planche-en-vrai-code");
  const police = C.policeDuCatalogue({ nom: "Montserrat", genre: "sans" }, 400);
  const logo = fs.readFileSync(LOGO_REEL);
  const versions = async (bas: string) => {
    const sep = await C.separerSymbole(logo);
    return { sep, v: await C.versionsDuLogo({ logo, separation: sep, couleur: "#5D0126", sombre: "#640B29", clair: "#F7F3EC", monoClair: "#A1B89B", nom: "Racine", bas, police }) };
  };

  it("le symbole est au-dessus du nom, séparés de façon fiable ; le symbole est ramassé, le nom large", async () => {
    const { sep, v } = await versions("");
    expect(sep).toMatchObject({ fiable: true, sens: "dessus", raison: null });
    const s = await sharp(sep.symbole).metadata(), n = await sharp(sep.nom!).metadata();
    expect(s.width! / s.height!).toBeGreaterThan(0.8);
    expect(s.width! / s.height!).toBeLessThan(1.25);
    expect(n.width! / n.height!).toBeGreaterThan(4);
    expect(v.symboleComplet).toBe(false);
    // Le symbole seul ne porte qu'un bloc d'encre : aucune bande vide, donc aucun nom dessous.
    expect(blocsDeLignes(await pixels(sep.symbole), [0x5d, 0x01, 0x26], 6)).toHaveLength(1);
    // Le logo principal, lui, a ses deux blocs (le symbole, puis le nom).
    expect(blocsDeLignes(await pixels(v.versions["logo-principal"]), [0x5d, 0x01, 0x26], 6)).toHaveLength(2);
  });

  it("l'icône et le favicon ne montrent que le symbole ; ni logo compact ni logo empilé (27 novembre 2026)", async () => {
    const { sep, v } = await versions("");
    const sym = await sharp(sep.symbole).metadata();
    expect(Object.keys(v.versions)).toEqual([...C.VERSIONS_DU_LOGO]);
    expect(Object.keys(v.versions).join(" ")).not.toMatch(/compact|empile/);
    for (const k of ["icone", "favicon"] as const) {
      const p = await pixels(v.versions[k]);
      // Le signe est blanc sur le carré sombre : un seul bloc de lignes blanches, aux proportions du symbole.
      const blocs = blocsDeLignes(p, [255, 255, 255], 6, Math.round(p.w * 0.1), Math.round(p.w * 0.9));
      expect(blocs, k).toHaveLength(1);
      const cols = blocsDeColonnes(p, [255, 255, 255], 6);
      const hauteur = blocs[0][1] - blocs[0][0], largeur = cols.at(-1)![1] - cols[0][0];
      expect(Math.abs(largeur / hauteur - sym.width! / sym.height!), k).toBeLessThan(0.12);
    }
  });

  it("l'horizontal met le symbole à gauche du nom", async () => {
    const { sep, v } = await versions("");
    const p = await pixels(v.versions["logo-horizontal"]);
    expect(p.w / p.h).toBeGreaterThan(3);
    const cols = blocsDeColonnes(p, [0x5d, 0x01, 0x26], Math.round(p.h * 0.12));
    expect(cols.length).toBeGreaterThanOrEqual(2);
    // Le premier bloc de colonnes, à gauche, est le symbole : de la hauteur du logo, aux proportions du symbole.
    const sym = await sharp(sep.symbole).metadata(), gauche = cols[0][1] - cols[0][0] + 1;
    expect(Math.abs(gauche / p.h - sym.width! / sym.height!)).toBeLessThan(0.1);
  });

  it("le badge porte un texte en bas, comme sur la planche : la ligne du logo, sinon le métier court", async () => {
    expect(C.texteDuBasDuBadge({ ligneDuLogo: "Le bois bien fait", metierCourt: "la menuiserie" })).toBe("Le bois bien fait");
    expect(C.texteDuBasDuBadge({ ligneDuLogo: "", metierCourt: "les accessoires pour chiens" })).toBe("accessoires pour chiens");
    expect(C.texteDuBasDuBadge({ metierCourt: "l'ébénisterie" })).toBe("ébénisterie");
    expect(C.texteDuBasDuBadge({ signature: "Fait main" })).toBe("Fait main");
    const encreDuBas = async (bas: string) => {
      const { v } = await versions(bas);
      const p = await pixels(v.versions.badge);
      // Le bas du sceau, entre l'anneau et le symbole : là où le texte du bas s'écrit.
      let n = 0;
      for (let y = Math.round(p.h * 0.84); y < Math.round(p.h * 0.95); y++) for (let x = Math.round(p.w * 0.2); x < Math.round(p.w * 0.8); x++) if (encre(p, x, y, [0x5d, 0x01, 0x26])) n++;
      return n;
    };
    const sans = await encreDuBas(""), avec = await encreDuBas(C.texteDuBasDuBadge({ metierCourt: "les plantes d'intérieur" }));
    expect(avec).toBeGreaterThan(sans + 2000);
    // Un texte très long tient sur son arc : écrit plus petit, puis coupé à un mot entier, jamais en lettres serrées.
    const long = await encreDuBas("une entreprise qui vend des plantes d'intérieur, des arbustes et des jeunes arbres pour la maison");
    expect(long).toBeGreaterThan(sans + 1000);
  });

  it("sans séparation fiable : le symbole complet, et c'est dit", async () => {
    const bloc = await sharp({ create: { width: 300, height: 300, channels: 4, background: { r: 10, g: 10, b: 10, alpha: 1 } } }).png().toBuffer();
    const sep = await C.separerSymbole(bloc);
    expect(sep.fiable).toBe(false);
    const v = await C.versionsDuLogo({ logo: bloc, separation: sep, couleur: "#0A0A0A", sombre: "#0A0A0A", clair: "#FFFFFF", monoClair: "#A0A0A0", nom: "Aplomb", bas: "", police });
    expect(v.symboleComplet).toBe(true);
    const V = await import("@/lib/syna-agent/planche-en-vrai");
    expect(V.phraseDuSymboleComplet()).toMatch(/ton icône et ton favicon reprennent ton logo complet/);
  });

  it("un logo en ligne (symbole à gauche du nom) : la bande verticale les sépare ; la frange presque transparente d'un fond retiré n'y change rien", async () => {
    const t = { r: 0, g: 0, b: 0, alpha: 0 };
    const plein = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 4, background: { r: 30, g: 60, b: 40, alpha: 1 } } }).png().toBuffer();
    // Une frange à 10 % d'opacité entre le symbole et le nom (ce que laisse parfois un fond retiré).
    const frange = await sharp({ create: { width: 60, height: 200, channels: 4, background: { r: 240, g: 240, b: 240, alpha: 0.1 } } }).png().toBuffer();
    const enLigne = await sharp({ create: { width: 900, height: 240, channels: 4, background: t } }).composite([
      { input: await plein(200, 200), left: 10, top: 20 }, { input: frange, left: 220, top: 20 }, { input: await plein(600, 110), left: 290, top: 65 },
    ]).png().toBuffer();
    const sep = await C.separerSymbole(enLigne);
    expect(sep).toMatchObject({ fiable: true, sens: "gauche" });
    expect((await sharp(sep.symbole).metadata()).width).toBe(200);
  });
});

describe("2. la référence 6 : le symbole seul joint là où l'inventaire ne voit que lui", async () => {
  const V = await import("@/lib/syna-agent/planche-en-vrai");
  const { aLaChargeDuStudio } = await import("@/lib/billing");
  const a = Buffer.from("apercu"), l = Buffer.from("logo"), s = Buffer.from("symbole");
  const cas = (x: Record<string, unknown>) => V.CaseLueSchema.parse({ case: "reference-6", textes: [], produit: false, personne: false, comprehensible: null, description: "", ...x });

  it("l'inventaire dit ce qu'il voit du logo ; une réponse d'avant ce champ est écartée sans risque", () => {
    expect(cas({ logo: true, logoVu: "symbole" }).logoVu).toBe("symbole");
    expect(cas({ logo: true, logoVu: "complet" }).logoVu).toBe("complet");
    expect(cas({ logo: true }).logoVu ?? null).toBeNull();
    expect(cas({ logo: true, logoVu: "autre chose" }).logoVu).toBeNull();
    expect(V.INVENTAIRE_SYSTEM).toContain("logoVu");
    // Une ancienne réponse entière se lit toujours.
    expect(V.InventaireSchema.parse({ cases: [{ case: "reference-6", logo: true, textes: [], produit: true, personne: false, comprehensible: null, description: "" }], polices: { titres: {}, textes: {} } }).cases[0].logoVu ?? null).toBeNull();
  });

  it("symbole seul vu : le symbole joint, jamais le logo complet ; sans séparation fiable, rien n'est joint", () => {
    expect(V.jointesDeLElement({ apercu: a, logo: l, photo: null, inventaire: cas({ logo: true, logoVu: "symbole" }), symbole: s })).toEqual([{ role: "apercu", data: a }, { role: "symbole", data: s }]);
    expect(V.jointesDeLElement({ apercu: a, logo: l, photo: null, inventaire: cas({ logo: true, logoVu: "symbole" }), symbole: null }).map((j) => j.role)).toEqual(["apercu"]);
    expect(V.jointesDeLElement({ apercu: a, logo: l, photo: null, inventaire: cas({ logo: true, logoVu: "complet" }), symbole: s }).map((j) => j.role)).toEqual(["apercu", "logo"]);
    // Réponse d'avant le champ : la règle d'avant (le logo complet).
    expect(V.jointesDeLElement({ apercu: a, logo: l, photo: null, inventaire: cas({ logo: true }), symbole: s }).map((j) => j.role)).toEqual(["apercu", "logo"]);
    expect(V.jointesDeLElement({ apercu: a, logo: l, photo: null, inventaire: cas({ logo: false, logoVu: "symbole" }), symbole: s }).map((j) => j.role)).toEqual(["apercu"]);
  });

  it("le texte envoyé dit que c'est le symbole seul, sans nom ajouté, à la couleur de l'aperçu", () => {
    const t = V.texteDeLElement({ element: "reference-6", nom: "Aplomb", logo: false, symbole: true, photo: true, personnes: false });
    expect(t).toContain(V.regleDuSymbole("Aplomb"));
    expect(t).not.toContain(V.regleDuLogo("Aplomb"));
    expect(t).toContain(V.phraseDuProduit(3));
    expect(V.regleDuSymbole("Aplomb")).toMatch(/seul, sans son nom/);
    expect(V.regleDuSymbole("Aplomb")).toMatch(/avec la couleur et la matière qu'il a sur l'aperçu/);
    expect(V.regleDuSymbole("Aplomb")).toMatch(/n'ajoute ni le nom ni aucun texte/);
  });

  it("dans la vraie chaîne, la référence où seul le symbole se voit reçoit le symbole tiré de la séparation", async () => {
    const vues: { element: string; roles: string[]; data: Buffer[]; texte: string }[] = [];
    const uni = (w: number, h: number, c: string) => sharp({ create: { width: w, height: h, channels: 3, background: c } }).png().toBuffer();
    const symbole = await uni(40, 40, "#5D0126");
    const inventaire = V.InventaireSchema.parse({ cases: [cas({ logo: true, logoVu: "symbole" }), { ...cas({ logo: true, logoVu: "complet" }), case: "emballage" }], polices: { titres: {}, textes: {} } });
    await V.refaireLesElements({
      refaire: async (d) => { vues.push({ element: d.element, roles: d.jointes.map((j) => j.role), data: d.jointes.map((j) => j.data), texte: d.texte }); return uni(1024, 912, "#777777"); },
      relire: async (_g, items) => ({ images: items.map((it) => ({ case: it.element, identique: true, textesLus: [], logoPresent: true, personne: false, logoFonceSurFondSombre: false, produitFidele: null, texteCoupe: false, note: 9, pourquoi: "" })) }),
      aLaChargeDuStudio,
    }, { nom: "Aplomb", personnes: false, logo: Buffer.from("logo complet"), symbole, photo: null, apercus: new Map([["reference-6", await uni(236, 211, "#555555")], ["emballage", await uni(300, 228, "#555555")]]), inventaire, elements: ["reference-6", "emballage"] });
    const ref = vues.find((v) => v.element === "reference-6")!, emb = vues.find((v) => v.element === "emballage")!;
    expect(ref.roles).toEqual(["apercu", "symbole"]);
    expect(ref.data[1].equals(symbole)).toBe(true);
    expect(ref.texte).toContain(V.regleDuSymbole("Aplomb"));
    expect(emb.roles).toEqual(["apercu", "logo"]);
  });

  it("la tâche sépare le symbole avant les retouches et ne joint jamais le logo complet à sa place", () => {
    const src = fs.readFileSync("src/lib/syna-agent/planche-en-vrai-tache.ts", "utf8");
    const avant = src.indexOf("const separation = await separerSymbole(logo)"), retouches = src.indexOf("refaireLesElements({");
    expect(avant).toBeGreaterThan(0);
    expect(avant).toBeLessThan(retouches);
    expect(src).toContain("const symboleSurBlanc = separation.fiable ?");
    expect(src).toContain("symbole: symboleSurBlanc");
  });
});

describe("3. le bandeau d'ouverture de la planche : ses marges blanches rognées avant la relecture", async () => {
  const V = await import("@/lib/syna-agent/planche-en-vrai");
  const { aLaChargeDuStudio } = await import("@/lib/billing");
  /** Un bandeau : une « photo » (du bruit) entre deux bandes blanches de `haut` et `bas` lignes. */
  const bandeau = async (w: number, h: number, haut: number, bas: number, clairAGauche = false) => {
    const H = h - haut - bas, bruit = Buffer.alloc(w * H * 3);
    for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
      const v = clairAGauche && x < w / 2 ? 250 : 60 + ((x * 7 + y * 13) % 120);
      bruit.fill(v, (y * w + x) * 3, (y * w + x) * 3 + 3);
    }
    const photo = await sharp(bruit, { raw: { width: w, height: H, channels: 3 } }).png().toBuffer();
    return sharp({ create: { width: w, height: h, channels: 3, background: "#FDFDFD" } }).composite([{ input: photo, left: 0, top: haut }]).png().toBuffer();
  };
  const taille = async (b: Buffer) => { const m = await sharp(b).metadata(); return [m.width, m.height]; };

  it("les bandes blanches du haut et du bas sont retirées, la largeur jamais touchée, l'image jamais déformée", async () => {
    expect(V.ELEMENTS["ouverture-planche"]).toMatchObject({ taille: "2304x768", sansMargesBlanches: true });
    const r = await V.rognerLesMargesBlanches(await bandeau(2304, 768, 120, 90), await bandeau(1056, 285, 0, 4));
    expect(await taille(r)).toEqual([2304, 558]);
    // Rien à rogner : l'image est rendue telle quelle.
    const plein = await bandeau(2304, 768, 0, 0);
    expect(await V.rognerLesMargesBlanches(plein)).toBe(plein);
  });

  it("la règle est adaptée avec soin : une ligne n'est une marge que blanche sur toute sa largeur ; jamais une ligne du milieu ; jamais le dessin de l'aperçu", async () => {
    // Un fond clair à gauche (la photo à droite) n'est pas une marge : seule la vraie bande blanche du haut part.
    expect(await taille(await V.rognerLesMargesBlanches(await bandeau(1200, 400, 50, 0, true)))).toEqual([1200, 350]);
    // L'aperçu a lui-même une bande blanche en haut (au moins 8 % de sa hauteur) : le haut est gardé, le bas rogné.
    const apercuBlancEnHaut = await bandeau(1056, 285, 40, 0);
    expect(await taille(await V.rognerLesMargesBlanches(await bandeau(2304, 768, 110, 80), apercuBlancEnHaut))).toEqual([2304, 688]);
    // Des marges de plus de la moitié de la hauteur : rien n'est rogné.
    expect(await taille(await V.rognerLesMargesBlanches(await bandeau(2304, 768, 300, 200)))).toEqual([2304, 768]);
  });

  it("c'est l'image rognée qui est relue face à son aperçu, gardée en haute définition et posée sans être déformée", async () => {
    const relues: number[] = [];
    const r = await V.refaireLesElements({
      refaire: async () => bandeau(2304, 768, 120, 90),
      relire: async (_g, items) => { for (const it of items) relues.push((await sharp(it.image).metadata()).height!); return { images: items.map((it) => ({ case: it.element, identique: true, textesLus: [], logoPresent: false, personne: false, logoFonceSurFondSombre: false, produitFidele: null, texteCoupe: false, note: 9, pourquoi: "" })) }; },
      aLaChargeDuStudio,
    }, { nom: "Aplomb", personnes: false, logo: Buffer.alloc(0), photo: null, apercus: new Map([["ouverture-planche", await bandeau(1056, 285, 0, 4)]]), inventaire: V.InventaireSchema.parse({ polices: { titres: {}, textes: {} } }), elements: ["ouverture-planche"] });
    expect(relues).toEqual([558]);
    const g = r.get("ouverture-planche")!;
    expect(g).toMatchObject({ ok: true, w: 2304, h: 558 });
    expect(await taille(g.png!)).toEqual([2304, 558]);
    // Les autres images ne sont jamais rognées.
    expect(V.NOMS_DES_ELEMENTS.filter((n) => (V.ELEMENTS[n] as { sansMargesBlanches?: boolean }).sansMargesBlanches)).toEqual(["ouverture-planche"]);
  });

  it("dans l'assemblage, le bandeau n'est jamais déformé ni coupé dans ses textes : plein cadre s'il n'y perd presque rien, sinon entier", async () => {
    const C = await import("@/lib/syna-agent/planche-en-vrai-code");
    // Le bandeau rogné de l'essai (2304 × 582) dans sa case (2072 × 564) : le plein cadre en couperait plus de 3 % de chaque côté.
    expect(C.coupeDuPleinCadre(2304, 582, 2072, 564)).toBeGreaterThan(C.COUPE_MAX_DU_BANDEAU);
    expect(C.coupeDuPleinCadre(2304, 628, 2072, 564)).toBeLessThan(C.COUPE_MAX_DU_BANDEAU);
    // Assemblé : la case du bandeau porte l'image entière, aux bonnes proportions (aucun étirement).
    const demo = await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#F9F8F4" } }).png().toBuffer();
    const rouge = await sharp({ create: { width: 2304, height: 582, channels: 3, background: "#C02020" } }).png().toBuffer();
    const case_: [number, number, number, number] = [500, 0, 1536, 282];
    const police = C.policeDuCatalogue({ nom: "Montserrat", genre: "sans" }, 400);
    const versions = Object.fromEntries(await Promise.all(C.VERSIONS_DU_LOGO.map(async (k) => [k, await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer()]))) as never;
    const png = await C.assemblerLaPlanche({ demo, boites: new Map([["ouverture-planche", case_]]), pastilles: [], images: new Map([["ouverture-planche", rouge]]), versions, palette: [], polices: { titres: police, textes: police }, signature: [], titres: new Map(), blocs: new Map(), encre: "#1C2A24" });
    const { data, info } = await sharp(png).extract({ left: 1000, top: 0, width: 2072, height: 564 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let haut = -1, bas = -1;
    for (let y = 0; y < info.height; y++) { const i = (y * info.width + 1036) * 3; if (data[i] > 150 && data[i + 1] < 80) { if (haut < 0) haut = y; bas = y; } }
    const hauteurPosee = bas - haut + 1;
    // Entier, à ses proportions : 2072 de large, donc environ 2072 × 582 / 2304 = 523 de haut.
    expect(Math.abs(hauteurPosee - Math.round((2072 * 582) / 2304))).toBeLessThanOrEqual(2);
    const bord = (data[(Math.round(info.height / 2) * info.width + 2) * 3]);
    expect(bord).toBeGreaterThan(150);
  });
});
