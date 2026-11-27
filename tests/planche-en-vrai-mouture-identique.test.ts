/**
 * LA PLANCHE EN VRAI DE MOUTURE IDENTIQUE À L'APERÇU A (essai réel du torréfacteur, étape 5 finie, 2,62 € ; 27 novembre
 * 2026). Constat du chef d'orchestre : « La planche est assemblée, mais elle n'est pas identique à l'aperçu A. » Ses cinq
 * points, rejoués sans aucun appel, sur les vrais fichiers de l'essai (tests/fixtures/torrefacteur-planche-en-vrai :
 * l'aperçu A, le logo fini, l'inventaire réel, les verdicts réels des deux passes, l'image d'ouverture refaite et gardée).
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import * as P from "@/lib/syna-agent/planche-en-vrai";
import * as C from "@/lib/syna-agent/planche-en-vrai-code";
import * as T from "@/lib/syna-agent/planche-en-vrai-tache";
import { logoDetoure } from "@/lib/syna-agent/brand-images";
import type { Route } from "@/lib/syna-agent/brand-routes";

const F = "tests/fixtures/torrefacteur-planche-en-vrai";
const PRODUITS = ["cafés en grains", "cafés moulus", "coffrets"];
const LOGO = { nom: "Mouture", phrase: ["TORRÉFACTION ARTISANALE"] };
const inventaire = P.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${F}/inventaire-reponse.json`, "utf8")));
const verdict2 = (n: P.NomElement) => (JSON.parse(fs.readFileSync(`${F}/${P.def(n).groupe}-2-verdict.json`, "utf8")).verdict as P.RelectureDuGroupe).images.find((x) => x.case === n)!;
const raisons2 = (n: P.NomElement) => P.raisonsDuRefusEnVrai(verdict2(n), { inventaire: P.caseLue(inventaire, n), personnes: false, photo: false, element: n, logo: LOGO, produits: PRODUITS });
const route = { key: "A", name: "Mouture", slogan: "TORRÉFACTION ARTISANALE", palette: { dark: "#2B140E" }, board: { planche: { domaine: "mouturefrance.fr", statut: "disponible", annee: 2026 } } } as unknown as Route;
const apercu = async () => sharp(`${F}/apercu-planche-A-gardee.jpg`).resize(P.TAILLE_DEMO.w, P.TAILLE_DEMO.h, { fit: "fill" }).png().toBuffer();
const logoDuClient = async () => { const d = await logoDetoure(fs.readFileSync(`${F}/logo-joint.png`)); return d.ok ? d.png : fs.readFileSync(`${F}/logo-joint.png`); };
const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe("1. monochrome foncé, monochrome clair et inversé : le nom reste lisible", () => {
  it("le logo de Mouture est à aplats ; peint d'une seule couleur (le code d'avant), le nom disparaît", async () => {
    const logo = await logoDuClient();
    const a = await C.logoAAplats(logo);
    expect(a).not.toBeNull();
    // Le code d'avant : toute la silhouette d'une seule couleur, contraste 1 entre les lettres et l'aplat.
    const uni = await sharp(logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < uni.data.length; i += 4) { uni.data[i] = 0x22; uni.data[i + 1] = 0x22; uni.data[i + 2] = 0x22; }
    const avant = await sharp(uni.data, { raw: { width: uni.info.width, height: uni.info.height, channels: 4 } }).png().toBuffer();
    expect(await C.contrasteDesLettres(logo, avant, "#FCFAF7", a!.seuil)).toBeLessThan(1.2);
  });
  it("chaque version garde le contraste intérieur : lettres et aplat à 3 au moins (contraste mesuré), là où la version sert", async () => {
    const logo = await logoDuClient(), a = (await C.logoAAplats(logo))!;
    const fonce = await C.monochromeAuxCreux(logo, "#222222", a.seuil), clair = await C.monochromeAuxCreux(logo, "#C89B6B", a.seuil), inv = await C.monochromeAuxCreux(logo, "#FFFFFF", a.seuil, "claires");
    expect(await C.contrasteDesLettres(logo, fonce, "#FCFAF7", a.seuil)).toBeGreaterThanOrEqual(C.CONTRASTE_MIN_DES_LETTRES);
    expect(await C.contrasteDesLettres(logo, clair, "#2E1A12", a.seuil)).toBeGreaterThanOrEqual(C.CONTRASTE_MIN_DES_LETTRES);
    expect(await C.contrasteDesLettres(logo, inv, "#2E1A12", a.seuil)).toBeGreaterThanOrEqual(C.CONTRASTE_MIN_DES_LETTRES);
    // Chaque monochrome est d'un seul ton : une seule couleur sur tous ses points visibles.
    for (const [png, c] of [[fonce, [0x22, 0x22, 0x22]], [clair, [0xC8, 0x9B, 0x6B]], [inv, [255, 255, 255]]] as const) {
      const r = await sharp(png).ensureAlpha().raw().toBuffer();
      for (let i = 0; i < r.length; i += 4 * 97) if (r[i + 3] > 0) expect([r[i], r[i + 1], r[i + 2]]).toEqual([...c]);
    }
  });
  it("dans versionsDuLogo, sur les vrais fichiers : les trois versions sont lisibles, l'inversé est clair sur le fond sombre", async () => {
    const logo = await logoDuClient(), demo = await apercu(), d = await P.decouperLesApercus(demo, "standard");
    const v = await C.versionsDuLogo({ logo, separation: await C.separerSymbole(logo), couleur: await C.couleurDuLogo(logo), sombre: "#2E1A12", clair: "#FCFAF7", monoClair: "#C89B6B", nom: "Mouture", bas: "TORRÉFACTION ARTISANALE", police: T.POLICE_DU_BADGE, tuiles: d.apercus });
    const a = (await C.logoAAplats(logo))!;
    expect(v.depuisLApercu).not.toContain("monochrome-fonce");
    expect(v.depuisLApercu).not.toContain("monochrome-clair");
    // Les versions ont la taille du logo rogné à son contenu (le logo principal) : les points se comparent un à un.
    const ref = v.versions["logo-principal"];
    expect(await C.contrasteDesLettres(ref, v.versions["monochrome-fonce"], "#FCFAF7", a.seuil)).toBeGreaterThanOrEqual(3);
    expect(await C.contrasteDesLettres(ref, v.versions["monochrome-clair"], "#2E1A12", a.seuil)).toBeGreaterThanOrEqual(3);
    // L'inversé : au centre (les lettres du nom), des points blancs et des points du fond sombre, jamais un aplat d'une couleur.
    const inv = await sharp(v.versions.inverse).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = inv.info;
    let blancs = 0, sombres = 0;
    for (let y = Math.round(h * 0.4); y < h * 0.55; y++) for (let x = Math.round(w * 0.25); x < w * 0.75; x++) { const i = (y * w + x) * 3, l = lum(inv.data[i], inv.data[i + 1], inv.data[i + 2]); if (l > 200) blancs++; else if (l < 70) sombres++; }
    expect(blancs).toBeGreaterThan(500);
    expect(sombres).toBeGreaterThan(500);
  });
  it("un logo d'un seul ton (des lettres seules) n'est pas à aplats : sa silhouette teinte reste la règle", async () => {
    const lettres = await sharp({ create: { width: 400, height: 120, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(Array.from({ length: 5 }, (_v, i) => ({ input: { create: { width: 50, height: 90, channels: 4 as const, background: { r: 30, g: 40, b: 30, alpha: 1 } } }, left: 20 + i * 75, top: 15 }))).png().toBuffer();
    expect(await C.logoAAplats(lettres)).toBeNull();
  });
});

describe("2. le logo horizontal que le code ne sait pas composer est repris de l'aperçu", () => {
  it("Mouture (aucun symbole ni phrase séparable) : le logo horizontal est la tuile de l'aperçu, large, jamais le logo principal", async () => {
    const logo = await logoDuClient(), demo = await apercu(), d = await P.decouperLesApercus(demo, "standard");
    const sep = await C.separerSymbole(logo);
    expect(sep.fiable).toBe(false);
    const v = await C.versionsDuLogo({ logo, separation: sep, couleur: await C.couleurDuLogo(logo), sombre: "#2E1A12", clair: "#FCFAF7", monoClair: "#C89B6B", nom: "Mouture", bas: "TORRÉFACTION ARTISANALE", police: T.POLICE_DU_BADGE, tuiles: d.apercus });
    expect(v.depuisLApercu).toContain("logo-horizontal");
    expect(v.versions["logo-horizontal"].equals(v.versions["logo-principal"])).toBe(false);
    const m = await sharp(v.versions["logo-horizontal"]).metadata(), p = await sharp(v.versions["logo-principal"]).metadata();
    expect(m.width! / m.height!).toBeGreaterThan(2);
    expect(p.width! / p.height!).toBeLessThan(1.3);
    expect(C.tuileDeLaVersion("logo-horizontal")).toBe("logo-2");
    // Sur la planche, sa tuile garde l'aperçu ; les monochromes et l'inversé faits par le code ne sont posés que s'ils ne
    // changent pas visiblement leur case (ici, ils la changent : l'aperçu est gardé, tel que le client l'a vu).
    const tu = await C.tuilesDuBloc01({ demo, boites: d.boites, versions: v.versions, depuisLApercu: v.depuisLApercu });
    for (const x of ["logo-horizontal", "monochrome-fonce", "monochrome-clair", "inverse"] as const) expect(tu.tuilesDeLApercu, x).toContain(x);
  });
});

describe("3. les polices : les rôles lus sur la place dans l'aperçu, la police nommée et au catalogue jamais remplacée", () => {
  it("l'inventaire réel avait rangé Playfair Display en titres ; l'aperçu montre Montserrat à gauche : Montserrat est la police des titres", () => {
    expect(inventaire.polices.titres.nom).toBe("Playfair Display");
    const lues = P.policesDeLApercu(inventaire);
    expect(lues.titres.nom).toBe("Montserrat");
    expect(lues.textes.nom).toBe("Playfair Display");
    expect(T.phrasesDesPolices(inventaire)).toEqual(["Moderne, lisible, polyvalente.", "Élégante, authentique, chaleureuse."]);
  });
  it("Montserrat, nommée, au catalogue et lue « sans », n'est jamais remplacée par « Nunito » (le choix de l'inventaire) ; Playfair Display non plus", () => {
    const lues = P.policesDeLApercu(inventaire);
    expect(lues.titres.procheDuCatalogue).toBe("Nunito");
    expect(C.policeDuCatalogue(lues.titres, 700)).toMatchObject({ cle: "montserrat", famille: "Montserrat", remplacee: false });
    expect(C.policeDuCatalogue(lues.textes, 400)).toMatchObject({ cle: "playfair_display", famille: "Playfair Display", remplacee: false });
    expect(T.phrasesDesPolicesRemplacees({ titres: C.policeDuCatalogue(lues.titres, 700), textes: C.policeDuCatalogue(lues.textes, 400) })).toEqual([]);
  });
  it("l'exception déjà décidée reste : le genre lu contredit la police nommée (« Nunito » montrée en manuscrite), le choix de l'inventaire est pris", () => {
    expect(C.policeDuCatalogue({ nom: "Nunito", genre: "manuscrite", procheDuCatalogue: "Caveat" }, 400)).toMatchObject({ famille: "Caveat", remplacee: true, pourquoi: "genre" });
  });
  it("l'aperçu qui dit autrement fait foi ; sans les deux noms dans la case, rien ne change", () => {
    const avec = (textes: string[]) => ({ ...inventaire, cases: inventaire.cases.map((c) => (c.case === "typographies" ? { ...c, textes } : c)) });
    expect(P.policesDeLApercu(avec(["Textes : Montserrat", "Titres : Playfair Display"])).titres.nom).toBe("Playfair Display");
    expect(P.policesDeLApercu(avec(["Titres", "Playfair Display", "Montserrat"])).titres.nom).toBe("Playfair Display");
    expect(P.policesDeLApercu(avec(["Montserrat"]))).toEqual(inventaire.polices);
  });
});

describe("4. le bandeau du haut : aucune encre de l'ancien titre, le fond de l'aperçu avec sa photo", () => {
  it("les morceaux du titre du bandeau lus dans le haut (« D », « à », « le », « TO ») ne sont jamais écrits ; le haut est porté par le logo", () => {
    const t = T.textesDeLaPlanche(inventaire, route);
    expect(t.haut).toEqual([]);
    expect(t.hautDansLeLogo).toBe(true);
    expect(t.notes.join(" ")).toContain("« D », « à », « le », « TO » sont des morceaux du titre du bandeau voisin");
  });
  it("encresDuHaut : le logo est le plus grand bloc, le filet du décor est gardé, les débris du titre sont à effacer", async () => {
    const { data, info } = await sharp(await apercu()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const haut = P.lesCases("standard").cases.haut;
    const e = C.encresDuHaut(data, info.width, haut, C.fondDe(data, info.width, haut));
    expect(e.logo).not.toBeNull();
    expect(e.logo![2] - e.logo![0]).toBeGreaterThan(150);
    expect(e.debris.length).toBeGreaterThanOrEqual(1);
    // Les débris sont à droite du logo, au bord de la case ; un trait fin du décor n'en est jamais un.
    for (const d of e.debris) { expect(d[0]).toBeGreaterThan(e.logo![2]); expect(d[2] - d[0] <= 4 && d[3] - d[1] >= (haut[3] - haut[1]) * 0.4).toBe(false); }
  });
  it("assemblée sur les vrais fichiers : aucune encre de l'ancien titre ne reste entre le filet et l'image, et les bandes du bandeau gardent la photo", async () => {
    const demo = await apercu(), d = await P.decouperLesApercus(demo, "standard"), logo = await logoDuClient();
    const t = T.textesDeLaPlanche(inventaire, route);
    const versions = Object.fromEntries(C.VERSIONS_DU_LOGO.map((v) => [v, logo])) as Record<C.VersionDuLogo, Buffer>;
    const ouv = await sharp(`${F}/ouverture-planche-gardee-hd.jpg`).png().toBuffer();
    const planche = await C.assemblerLaPlanche({
      demo, boites: d.boites, pastilles: P.lesCases("standard").pastilles, images: new Map([["ouverture-planche", ouv]]), versions,
      palette: [], polices: { titres: C.policeDuCatalogue({ nom: "Montserrat", genre: "sans" }, 700), textes: C.policeDuCatalogue({ nom: "Playfair Display", genre: "serif" }, 400) },
      signature: t.haut, titres: new Map(), blocs: new Map([["ton", null], ["seo", null]]), encre: "#2B140E", hautDansLeLogo: t.hautDansLeLogo,
    });
    const { data, info } = await sharp(planche).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, ob = d.boites.get("ouverture-planche")!, haut = d.boites.get("haut")!;
    const sombre = (x0: number, y0: number, x1: number, y1: number, px: Buffer = data, w = W) => { let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * w + x) * 3; if (lum(px[i], px[i + 1], px[i + 2]) < 110) n++; } return n; };
    // Entre le filet (aperçu x ≈ 400) et le début de l'image entière : ni « D », ni « à », ni trait vertical.
    const { data: a0, info: ai } = await sharp(demo).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const e = C.encresDuHaut(a0, ai.width, haut, C.fondDe(a0, ai.width, haut));
    expect(e.debris.length).toBeGreaterThanOrEqual(1);
    expect(sombre((e.logo![2] + 8) * 2, 20, (ob[0] + 40) * 2, (ob[3] - 10) * 2)).toBe(0);
    // Le code d'avant, sur le même aperçu, y laissait de l'encre (le titre de l'aperçu entre les deux cases).
    expect(sombre(e.logo![2] + 8, 10, ob[0] + 40, ob[3] - 5, a0, ai.width)).toBeGreaterThan(0);
    // Les bandes de part et d'autre de l'image : la photo de l'aperçu (sombre, à droite), jamais un aplat crème.
    const droite: number[] = [];
    for (let y = ob[1] * 2 + 40; y < ob[3] * 2 - 40; y += 3) for (let x = ob[2] * 2 - 60; x < ob[2] * 2 - 10; x += 3) { const i = (y * W + x) * 3; droite.push(lum(data[i], data[i + 1], data[i + 2])); }
    droite.sort((p, q) => p - q);
    expect(droite[droite.length >> 1]).toBeLessThan(170);
  }, 60_000);
});

describe("5. les faux refus : noms des produits de la fiche et textes de l'aperçu jamais en trop (verdicts réels de la reprise)", () => {
  it("les noms des produits de la fiche, au singulier comme au pluriel, quelle que soit la casse, ne sont jamais en trop", () => {
    for (const n of ["produit-3", "emballage", "reference-6"] as const) expect(raisons2(n), n).toEqual([]);
    const tel = raisons2("site-telephone").join(" ");
    expect(tel).not.toMatch(/« Cafés »|« moulus »|« Coffrets »|« grains »/);
    const v = { ...verdict2("produit-3"), textesLus: ["MOUTURE", "MOUTURE", "MOUTURE", "CAFÉ EN GRAINS", "cafés moulus", "COFFRET"] };
    expect(P.raisonsDuRefusEnVrai(v, { inventaire: P.caseLue(inventaire, "produit-3"), personnes: false, photo: false, element: "produit-3", logo: LOGO, produits: PRODUITS })).toEqual([]);
  });
  it("« Saveurs intenses » écrit une seconde fois sur l'étiquette de la 4:5, déjà un texte de l'aperçu : jamais en trop", () => {
    expect(verdict2("publication-4x5").textesLus).toContain("Saveurs intenses");
    expect(raisons2("publication-4x5")).toEqual([]);
  });
  it("un texte que le relecteur voit aussi sur l'aperçu (aussiSurLApercu) n'est pas en trop ; un fait inventé reste refusé", () => {
    const base = { ...verdict2("reference-5"), textesLus: ["Moulin d'antan"], inventes: [] };
    const juge = (v: P.ImageRelue) => P.raisonsDuRefusEnVrai(v, { inventaire: P.caseLue(inventaire, "reference-5"), personnes: false, photo: false, element: "reference-5", logo: LOGO, produits: PRODUITS });
    expect(juge(base).join(" ")).toMatch(/en trop ou mal écrits : « Moulin », « d'antan »/);
    expect(juge({ ...base, aussiSurLApercu: ["Moulin d'antan"] })).toEqual([]);
    // Un texte déclaré vu sur l'aperçu mais absent des textes lus ne sert à rien ; un chiffre reste un fait inventé.
    expect(juge({ ...base, aussiSurLApercu: ["Autre chose"] }).join(" ")).toMatch(/« Moulin »/);
    expect(juge({ ...base, textesLus: ["DEPUIS 1928"], aussiSurLApercu: ["DEPUIS 1928"] }).join(" ")).toMatch(/faits ou produits inventés.*DEPUIS 1928/);
    expect(P.RELECTEUR_EN_VRAI).toContain("aussiSurLApercu : chaque texte de textesLus que tu lis aussi");
  });
  it("ce qui reste vraiment à refaire : « EXCELLENCE » (produit-2), « Café de Qualité » (reference-5), le téléphone sans sa phrase manuscrite, et l'étagère de reference-4", () => {
    expect(raisons2("produit-2").join(" ")).toMatch(/inventés.*« EXCELLENCE »/);
    expect(raisons2("reference-5").join(" ")).toMatch(/« Café », « de », « Qualité »/);
    expect(raisons2("site-telephone").join(" ")).toMatch(/manquent : « Une », « boutiq »/);
    expect(raisons2("reference-4").join(" ")).toMatch(/coupé ou collé au bord/);
  });
});
