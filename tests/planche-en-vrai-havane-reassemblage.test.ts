/**
 * LE RÉASSEMBLAGE DE HAVANE APRÈS LA CORRECTION DU 27 NOVEMBRE 2026 (branche claude/essais-complets, commit 0662228 :
 * docs/studio/essais-complets/images/maroquinerie/5b-planche-reassemblee et 6b-ecran). Cinq défauts relevés par le chef
 * d'orchestre, rejoués sans aucun appel sur les vrais fichiers de l'essai (tests/fixtures/havane-planche-en-vrai : l'aperçu
 * choisi, le logo fini au fond retiré, l'inventaire réel, l'image du site gardée au premier essai, qui porte encore le titre
 * de son bloc) :
 *  a) les titres « 08 SITE WEB – … » et « 09 PACKAGING & SUPPORTS – … » effacés de la planche par les images posées dessus ;
 *  b) un trait vertical laissé entre le favicon et le monochrome foncé, reste d'une case retirée ;
 *  c) le logo horizontal à télécharger minuscule (la marque et sa phrase sur une seule ligne) ;
 *  d) le monochrome clair dit « sans aucune encre » alors que son fichier se voit ;
 *  e) « 6.GI » dans la barre d'état du téléphone.
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import * as P from "@/lib/syna-agent/planche-en-vrai";
import * as C from "@/lib/syna-agent/planche-en-vrai-code";
import * as T from "@/lib/syna-agent/planche-en-vrai-tache";

const F = "tests/fixtures/havane-planche-en-vrai";
const apercu = () => fs.readFileSync(`${F}/apercu-planche-A-2.jpg`);
const inventaire = () => P.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${F}/inventaire-reponse.json`, "utf8")));
const logo = () => fs.readFileSync(`${F}/logo-detoure.png`);
const PHRASE = "SACS · PORTEFEUILLES · CEINTURES";
const ROUTE = { key: "A", name: "Havane", slogan: PHRASE, palette: { dark: "#052116", primary: "#BC702F", secondary: "#F6EBE2", accent: "#2A3C34", light: "#FCF8F5" },
  board: { planche: { image: { id: "", w: 1536, h: 2304 }, logo: "", domaine: "havanefrance.fr", statut: "disponible", annee: 2026, essais: 1, at: 0 } } } as never;
/** Les titres 08 et 09 sur l'aperçu de Havane : sous leur case fixe, dans le haut des cases du site et de l'emballage. */
const TITRE_08: P.Boite = [27, 1676, 650, 1709], TITRE_09: P.Boite = [930, 1675, 1500, 1709];
const grisDe = async (png: Buffer) => { const { data, info } = await sharp(png).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
/** La part des points foncés (encre d'un titre) dans une zone, à l'échelle k. */
async function partFoncee(png: Buffer, z: P.Boite, k: number): Promise<number> {
  const g = await grisDe(png);
  let n = 0, f = 0;
  for (let y = z[1] * k; y < z[3] * k; y++) for (let x = z[0] * k; x < z[2] * k; x++) { n++; if (g.data[y * g.w + x] < 110) f++; }
  return f / n;
}

let assemblee: Awaited<ReturnType<typeof T.plancheEnVraiParLeCode>> | null = null;
/** La planche réassemblée par le code, sans appel, avec l'image du site gardée et une photo d'emballage sans titre. */
async function reassembler() {
  if (assemblee) return assemblee;
  const site = await sharp(`${F}/site-ordinateur-essai-2-hd.jpg`).png().toBuffer();
  // Une photo d'emballage refaite sans le titre de son bloc (comme le premier essai gardé au réassemblage).
  const emballage = await sharp({ create: { width: 1344, height: 1024, channels: 3, background: "#8A5A36" } }).png().toBuffer();
  assemblee = await T.plancheEnVraiParLeCode({ demo: apercu(), laquelle: "standard", inventaire: inventaire(), route: ROUTE, logo: logo(), phrase: PHRASE,
    images: new Map<P.NomElement, Buffer>([["site-ordinateur", site], ["emballage", emballage]]) });
  return assemblee;
}

describe("a) le titre d'un bloc n'est jamais effacé de la planche", () => {
  it("sur l'aperçu réel : le haut des cases du site et de l'emballage porte le titre de leur bloc ; la case est ramenée sous lui, et seulement elles", async () => {
    const d = await P.decouperLesApercus(apercu(), "standard");
    expect([...(d.titresEnHaut ?? [])].sort()).toEqual(["emballage", "site-ordinateur"]);
    // Les cases commencent sous le titre (la ligne d'encre la plus basse du titre est à 1709).
    expect(d.boites.get("site-ordinateur")![1]).toBeGreaterThan(TITRE_08[3]);
    expect(d.boites.get("emballage")![1]).toBeGreaterThan(TITRE_09[3]);
    // Le téléphone, sans titre au-dessus de lui, garde sa case.
    expect(d.boites.get("site-telephone")![1]).toBeLessThan(TITRE_08[1]);
    // L'aperçu envoyé ne porte plus le titre.
    const g = await grisDe(d.apercus.get("site-ordinateur")!);
    expect(P.titreEnHautDeLaCase(g, [0, 0, g.w, g.h])).toBeNull();
  });
  it("l'image refaite qui porte encore le titre en haut est posée sans lui ; une image sans titre ne change pas", async () => {
    const site = await sharp(`${F}/site-ordinateur-essai-2-hd.jpg`).png().toBuffer();
    const sans = await P.sansTitreEnHaut(site), m = await sharp(site).metadata(), ms = await sharp(sans).metadata();
    expect(ms.height!).toBeLessThan(m.height! * 0.92);
    expect(ms.height!).toBeGreaterThan(m.height! * 0.85);
    const g0 = await grisDe(site), g1 = await grisDe(sans);
    expect(P.titreEnHautDeLaCase(g0, [0, 0, g0.w, g0.h])).not.toBeNull();
    expect(P.titreEnHautDeLaCase(g1, [0, 0, g1.w, g1.h])).toBeNull();
    const photo = await sharp({ create: { width: 600, height: 400, channels: 3, background: "#8A5A36" } }).png().toBuffer();
    expect((await P.sansTitreEnHaut(photo)).equals(photo)).toBe(true);
  });
  it("sur la planche réassemblée : « 08 SITE WEB – … » et « 09 PACKAGING & SUPPORTS – … » restent, comme sur l'aperçu", async () => {
    const r = await reassembler();
    for (const t of [TITRE_08, TITRE_09]) {
      const avant = await partFoncee(apercu(), t, 1), apres = await partFoncee(r.planche, t, 2);
      expect(avant).toBeGreaterThan(0.08);
      expect(apres).toBeGreaterThan(avant * 0.7);
    }
    // Le site en une seule image ne prend pas le titre.
    const g = await grisDe(r.site!);
    expect(P.titreEnHautDeLaCase(g, [0, 0, g.w, g.h])).toBeNull();
  }, 120_000);
});

describe("b) la rangée du bloc 01 refaite en huit cases ne garde aucun trait des dix cases", () => {
  it("entre le favicon et le monochrome foncé, la page est unie, sans trait", async () => {
    const r = await reassembler();
    const rangee = C.rangeeDuBloc01(r.decoupe.boites);
    expect(rangee.refaite).toBe(true);
    const fav = rangee.lignes.find((l) => l.version === "favicon")!.cible, mono = rangee.lignes.find((l) => l.version === "monochrome-fonce")!.cible;
    const g = await grisDe(r.planche);
    const ecarts: number[] = [];
    for (let x = (fav[2] + 1) * 2; x < (mono[0] - 1) * 2; x++) {
      let mn = 255, mx = 0;
      for (let y = (fav[1] + 20) * 2; y < (fav[3] - 20) * 2; y++) { const v = g.data[y * g.w + x]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
      ecarts.push(mx - mn);
    }
    expect(Math.max(...ecarts)).toBeLessThan(12);
  }, 120_000);
});

describe("c) le logo horizontal reste lisible, à la taille des autres versions", () => {
  it("la marque et sa phrase sur une seule ligne, plus de deux fois plus allongée que sa tuile : reprise de la tuile de l'aperçu, fichier compris", async () => {
    const r = await reassembler();
    expect(r.depuisLApercu).toContain("logo-horizontal");
    const h = await sharp(r.versions["logo-horizontal"]).metadata(), p = await sharp(r.versions["logo-principal"]).metadata();
    // Avant : 3073 × 171 (18 pour 1). Aujourd'hui : la tuile agrandie, guère plus allongée que le logo principal.
    expect(h.width! / h.height!).toBeLessThan(C.TROP_ALLONGE * (p.width! / p.height!));
    expect(h.height!).toBeGreaterThan(150);
    expect(r.notes.join(" ")).not.toMatch(/logo-horizontal fait par le code/);
  }, 120_000);
});

describe("d) le monochrome clair a de l'encre : la mesure le voit", () => {
  it("la version du code, sauge sur la page crème, n'est plus dite « sans aucune encre » ; la raison donnée est la vraie", async () => {
    const r = await reassembler();
    const ink = await sharp(r.versions["monochrome-clair"]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let opaques = 0;
    for (let i = 3; i < ink.data.length; i += 4) if (ink.data[i] > 128) opaques++;
    expect(opaques / (ink.info.width * ink.info.height)).toBeGreaterThan(0.1);
    const note = r.notes.find((n) => n.startsWith("monochrome-clair"))!;
    expect(note).toBeDefined();
    expect(note).not.toMatch(/aucune encre/);
  }, 120_000);
  it("une version pâle posée dans une tuile de la même encre pâle : gardée, ses proportions comparées à celles du dessin pâle de l'aperçu", async () => {
    const { createCanvas } = await import("@napi-rs/canvas");
    const demo = createCanvas(400, 200), x = demo.getContext("2d");
    x.fillStyle = "#F8F7F3"; x.fillRect(0, 0, 400, 200); x.fillStyle = "#9BAE94"; x.fillRect(120, 80, 160, 40);
    const { data } = await sharp(await demo.encode("png")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const v = createCanvas(400, 100), y = v.getContext("2d");
    y.fillStyle = "#9BAE94"; y.fillRect(0, 0, 400, 100);
    const c = await C.caseDuLogoEnHd(data, 400, [100, 40, 300, 160], await v.encode("png"));
    expect(c.raison ?? "").not.toMatch(/aucune encre/);
    expect(c.garde).toBe(true);
  });
});

describe("e) la barre d'état du téléphone : une heure simple et lisible, jamais « 6.GI »", () => {
  it("la ligne de l'élément du téléphone le dit en positif ; les autres cases ne changent pas", () => {
    const t = P.texteDeLElement({ element: "site-telephone", nom: "Havane", logo: true, photo: false, personnes: false, produits: ["sacs en cuir"] });
    expect(t).toContain(P.BARRE_D_ETAT_EN_VRAI);
    expect(P.BARRE_D_ETAT_EN_VRAI).toContain("« 9:41 »");
    for (const n of P.NOMS_DES_ELEMENTS.filter((e) => e !== "site-telephone")) expect(P.ligneDeLElement(n, false)).not.toContain(P.BARRE_D_ETAT_EN_VRAI);
    // Aucun nom de client d'essai dans la ligne.
    expect(P.BARRE_D_ETAT_EN_VRAI).not.toMatch(/Havane|6\.GI/);
  });
  it("une image déjà reçue avec le texte d'avant est reconnue, jamais repayée", () => {
    const aujourdhui = P.texteDeLElement({ element: "site-telephone", nom: "Havane", logo: true, photo: false, personnes: false, produits: ["sacs en cuir"] });
    const avant = [P.REGLE_APERCU, P.regleDuLogo("Havane"), [P.def("site-telephone").quoi, P.MICRO_TEXTES_EN_VRAI, P.ligneDesTextesEnVrai(["sacs en cuir"]), P.SANS_PERSONNE_EN_VRAI].join(" ")].join(" ");
    expect(P.texteSansLaLigneDeLaBarreDEtat(aujourdhui)).toBe(avant);
    const src = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8");
    expect(src).toContain("map(P.texteSansLaLigneDeLaBarreDEtat)");
  });
  it("l'heure écrite dans la barre d'état n'est jamais un fait inventé ; ailleurs, un chiffre inventé reste refusé", () => {
    const inv = P.caseLue(inventaire(), "site-telephone");
    const v = { case: "site-telephone", identique: true, note: 9, textesLus: ["9:41", "HAVANE", "Sacs · Portefeuilles · Ceintures", "L'élégance", "au quotidien.", "Découvrir"], logoPresent: true, personne: false, logoFonceSurFondSombre: false, texteCoupe: false, pourquoi: "", inventes: [{ ou: "barre d'état", texte: "9:41" }] } as never;
    expect(P.raisonsDuRefusEnVrai(v, { inventaire: inv, personnes: false, photo: false, element: "site-telephone" }).join(" ")).not.toMatch(/inventés/);
    const w = { ...(v as object), case: "produit-2", inventes: [{ ou: "étiquette", texte: "9:41" }] } as never;
    expect(P.raisonsDuRefusEnVrai(w, { inventaire: P.caseLue(inventaire(), "produit-2"), personnes: false, photo: false, element: "produit-2" }).join(" ")).toMatch(/inventés/);
  });
});
