/**
 * LA REPRISE DES TROIS IMAGES DE MOUTURE (27 novembre 2026 ; essai réel : docs/studio/essais-complets/images/torrefacteur/
 * 5c-reprise-trois-images, branche claude/essais-complets, commit d448fa8). produit-2, reference-4 et reference-5, refaites
 * une fois de plus à la charge du Studio, ont encore été refusées. Les verdicts, les raisons comptées et les textes envoyés
 * réels sont copiés tels quels dans tests/fixtures/torrefacteur-planche-en-vrai/reprise-trois-images. Quatre corrections,
 * pour tout client, vérifiées ici sans aucun appel :
 *  1. les petits textes illisibles de l'aperçu restent des traits ou une texture, sans mot lisible (consigne en positif) ;
 *  2. le nom et la phrase du logo, écrits exactement, ne sont jamais une faute, où que le logo soit posé ;
 *  3. une coupe au bord fidèle à l'aperçu ne fait jamais refuser ;
 *  4. les codes et les légendes de la palette (bloc 02) gardent l'encre pleine et la netteté de l'aperçu.
 * Puis le rejugement hors ligne des trois images, sur leurs verdicts réels, par le code d'aujourd'hui.
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import * as P from "@/lib/syna-agent/planche-en-vrai";

const F = "tests/fixtures/torrefacteur-planche-en-vrai";
const R = `${F}/reprise-trois-images`;
const PRODUITS = ["cafés en grains", "cafés moulus", "coffrets"], LOGO = { nom: "Mouture", phrase: ["TORRÉFACTION ARTISANALE"] };
const inventaire = P.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${F}/inventaire-reponse.json`, "utf8")));
const verdicts = [
  ...P.RelectureDuGroupeSchema.parse(JSON.parse(fs.readFileSync(`${R}/relecture-produits-reprise-verdict.json`, "utf8"))).images,
  ...P.RelectureDuGroupeSchema.parse(JSON.parse(fs.readFileSync(`${R}/relecture-references-reprise-verdict.json`, "utf8"))).images,
];
const verdict = (n: string) => verdicts.find((v) => v.case === n)!;
const raisons = (n: string, v = verdict(n)) => P.raisonsDuRefusEnVrai(v, { inventaire: P.caseLue(inventaire, n), personnes: false, photo: false, element: n, logo: LOGO, produits: PRODUITS });
const raisonsDAlors = (n: string) => (JSON.parse(fs.readFileSync(`${R}/${n}-raisons.json`, "utf8")) as string[][])[0];

describe("1. les petits textes illisibles de l'aperçu restent des traits, sans mot lisible", () => {
  it("les mots plausibles écrits dans les petits textes de l'aperçu sont réels (verdicts de la reprise)", () => {
    expect(verdict("produit-2").inventes?.map((x) => x.texte)).toEqual(["ÉTIOPIENNE"]);
    expect(verdict("reference-4").inventes?.map((x) => x.texte)).toEqual(["100% ARABICA", "TORRÉFIÉ EN FRANCE"]);
    expect(verdict("reference-5").inventes?.map((x) => x.texte)).toEqual(["Café de Paris"]);
    // La consigne envoyée à la reprise réelle ne le disait pas.
    for (const n of ["produit-2", "reference-4", "reference-5"]) expect(fs.readFileSync(`${R}/${n}-texte-envoye.txt`, "utf8")).not.toContain("petits textes illisibles");
  });
  it("la consigne de reprise en HD le dit en positif, pour toute image et tout client ; la règle des preuves reste mot pour mot", () => {
    expect(P.MICRO_TEXTES_EN_VRAI).toBe("Les petits textes illisibles de l'aperçu restent de simples traits ou une texture, sans aucun mot lisible ; seuls les mots déjà lisibles sur l'aperçu sont écrits.");
    for (const n of P.NOMS_DES_ELEMENTS) {
      for (const produits of [PRODUITS, undefined]) {
        const t = P.texteDeLElement({ element: n, nom: "Mouture", logo: true, photo: false, personnes: false, produits });
        expect(t.startsWith(`${P.REGLE_APERCU} ${P.regleDuLogo("Mouture")} `), n).toBe(true);
        expect(t, n).toContain(P.MICRO_TEXTES_EN_VRAI);
      }
    }
    // Aucun nom de client ni mot d'essai dans la ligne ; jamais un ordre négatif sur un mot à éviter.
    expect(P.MICRO_TEXTES_EN_VRAI).not.toMatch(/Mouture|ARABICA|ÉTIOPIE|Paris|FRANCE|Écume|Racine/i);
    // Une image reçue avant cette ligne reste reconnue (jamais repayée) ; sans produits comme avec.
    const avant = fs.readFileSync(`${F}/produit-1-1-texte-envoye.txt`, "utf8");
    expect(P.texteSansLaLigneDesTextes(P.texteDeLElement({ element: "produit-1", nom: "Mouture", logo: true, photo: false, personnes: false, produits: PRODUITS }), PRODUITS)).toBe(avant);
    expect(P.texteSansLaLigneDesTextes(P.texteDeLElement({ element: "produit-1", nom: "Mouture", logo: true, photo: false, personnes: false }), undefined)).toBe(avant);
  });
  it("la reprise de la planche réassemblée reçoit les produits de la fiche et la phrase du logo (la reprise réelle ne les avait pas)", () => {
    // Le texte réellement envoyé pour produit-2 n'avait pas la ligne des étiquettes : la phrase du logo et la fiche manquaient.
    expect(fs.readFileSync(`${R}/produit-2-texte-envoye.txt`, "utf8")).not.toContain(P.ligneDesTextesEnVrai(PRODUITS));
    const src = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8");
    const appel = src.slice(src.indexOf("T.reprendreDesCasesEnVrai("), src.indexOf("T.reprendreDesCasesEnVrai(") + 600);
    expect(appel).toContain("produits: o.client.produits");
    expect(appel).toContain("phrase: o.phrase");
    expect(src).toContain("phrase: lignesDuTexte(donnees.phrase) });");
  });
});

describe("2. le nom et la phrase du logo, exacts, ne sont jamais une faute, où que le logo soit posé", () => {
  it("sur les verdicts réels de produit-2 et reference-4 : « TORRÉFACTION », « ARTISANALE » ne sont plus reprochés", () => {
    expect(raisonsDAlors("produit-2").join(" ")).toMatch(/« TORRÉFACTION », « ARTISANALE »/);
    expect(raisonsDAlors("reference-4").join(" ")).toMatch(/« TORRÉFACTION », « ARTISANALE »/);
    for (const n of ["produit-2", "reference-4"]) expect(raisons(n).join(" "), n).not.toMatch(/« TORRÉFACTION »|« ARTISANALE »|« MOUTURE »/);
  });
  it("quelle que soit la place du logo dans l'image (l'aperçu de la case n'en avait pas) ; un mot du logo mal écrit reste une faute", () => {
    const v = { ...verdict("reference-5"), textesLus: ["MOUTURE", "TORRÉFACTION ARTISANALE"], inventes: [], logoPresent: true, note: 9 };
    expect(raisons("reference-5", v).join(" ")).not.toMatch(/« TORRÉFACTION »|« ARTISANALE »|« MOUTURE »/);
    expect(raisons("reference-5", { ...v, textesLus: ["MOUTURE", "TORÉFACTION ARTISANALE"] }).join(" ")).toMatch(/« TORÉFACTION »/);
  });
  it("le rejugement de la reprise réelle sans la phrase du logo (comme elle a été comptée) la reprochait ; avec elle, plus jamais", () => {
    const sans = P.raisonsDuRefusEnVrai(verdict("produit-2"), { inventaire: P.caseLue(inventaire, "produit-2"), personnes: false, photo: false, element: "produit-2", produits: PRODUITS });
    expect(sans).toEqual(raisonsDAlors("produit-2"));
    expect(raisons("produit-2").join(" ")).not.toMatch(/« TORRÉFACTION »/);
  });
  it("la consigne du relecteur le dit, sans nom de client", () => {
    expect(P.RELECTEUR_EN_VRAI).toContain("Le nom de la marque et la phrase de son logo, écrits exactement, ne sont jamais une faute, où que le logo soit posé");
    expect(P.RELECTEUR_EN_VRAI).not.toMatch(/Mouture|ARABICA|PÉROU|1928|ÉTIOPIE|Paris/);
  });
});

describe("3. une coupe au bord fidèle à l'aperçu ne fait jamais refuser", () => {
  it("reference-4 : le relecteur écrit « comme sur l'aperçu » ; la coupe et ses mots tronqués ne sont plus reprochés", () => {
    expect(verdict("reference-4").pourquoi).toContain("coupé par le bord de l'image, ce qui tronque son logo et son étiquette, comme sur l'aperçu");
    expect(raisonsDAlors("reference-4")).toContain("un texte est coupé ou collé au bord");
    expect(P.coupeFideleALApercu(verdict("reference-4"))).toBe(true);
    const r = raisons("reference-4");
    expect(r).not.toContain("un texte est coupé ou collé au bord");
    expect(r.join(" ")).not.toMatch(/« MOU »|« TORRÉF »|« E »|manquent/);
  });
  it("une coupe qui n'est pas dite fidèle reste une faute ; « fidèle à l'aperçu » ailleurs dans la phrase ne suffit pas", () => {
    const base = { ...verdict("reference-4"), inventes: [], textesLus: ["MOUTURE", "CAFÉ EN GRAINS"], note: 9 };
    expect(raisons("reference-4", { ...base, pourquoi: "Le sachet de droite est coupé par le bord de l'image." })).toEqual(["un texte est coupé ou collé au bord"]);
    expect(raisons("reference-4", { ...base, pourquoi: "La composition est fidèle à l'aperçu, mais « GRAINS » touche le bord droit et sa dernière lettre est coupée." })).toEqual(["un texte est coupé ou collé au bord"]);
    // Deux coupes, une seule comme sur l'aperçu : refusée.
    expect(P.coupeFideleALApercu({ texteCoupe: true, pourquoi: "Le sachet de droite est coupé comme sur l'aperçu. Le titre est coupé en haut." })).toBe(false);
    // Le champ du relecteur, quand il est là, fait foi.
    expect(raisons("reference-4", { ...base, pourquoi: "", coupeCommeSurLApercu: true })).toEqual([]);
    expect(raisons("reference-4", { ...base, pourquoi: "coupé comme sur l'aperçu", coupeCommeSurLApercu: false })).toEqual(["un texte est coupé ou collé au bord"]);
    // Rien de coupé : rien d'excusé.
    expect(P.coupeFideleALApercu({ texteCoupe: false, pourquoi: "comme sur l'aperçu" })).toBe(false);
  });
  it("les mots tronqués par la coupe vont avec leur ligne ; aucun autre mot n'est excusé", () => {
    expect(P.motsCoupesCommeSurLApercu(["CAFÉ EN GRAINS"], ["CAFÉ E", "MOU", "TORRÉF", "GRAND"], LOGO)).toEqual({ enTrop: ["E", "MOU", "TORRÉF"], manquants: ["EN", "GRAINS"] });
    expect(P.motsCoupesCommeSurLApercu(["CAFÉ EN GRAINS"], ["CAFÉ EN GRAINS"], LOGO)).toEqual({ enTrop: [], manquants: [] });
  });
  it("la consigne du relecteur demande à part si la coupe est celle de l'aperçu", () => {
    expect(P.RELECTEUR_EN_VRAI).toContain("- coupeCommeSurLApercu : ");
    expect(P.RELECTEUR_EN_VRAI).toContain("une coupe fidèle à l'aperçu n'est jamais une faute");
  });
});

describe("le rejugement hors ligne des trois images (aucun appel)", () => {
  it("aucune n'est gardée : il reste dans chacune un mot lisible écrit à la place d'un petit texte de l'aperçu", () => {
    expect(raisons("produit-2")).toEqual([`${P.DEBUT_FAITS_INVENTES_EN_VRAI}« ÉTIOPIENNE »`, "sa fidélité n'est pas au niveau (6/10, il faut 8)"]);
    expect(raisons("reference-4")).toEqual([`${P.DEBUT_FAITS_INVENTES_EN_VRAI}« 100% ARABICA », « TORRÉFIÉ EN FRANCE », « 100% »`]);
    expect(raisons("reference-5")).toEqual([`${P.DEBUT_FAITS_INVENTES_EN_VRAI}« Café de Paris »`, "sa fidélité n'est pas au niveau (7/10, il faut 8)"]);
    // La reprise ne renvoie jamais au dessinateur un texte inventé ; elle porte la ligne des petits textes.
    for (const n of ["produit-2", "reference-4", "reference-5"] as const) {
      const t = P.texteDeLElement({ element: n, nom: "Mouture", logo: n !== "reference-5", photo: false, personnes: false, produits: PRODUITS, raisons: P.raisonsPourLeDessinateurEnVrai(raisons(n), { produits: PRODUITS }) });
      expect(t, n).not.toMatch(/ÉTIOPIENNE|ARABICA|100%|FRANCE|Paris/);
      expect(t, n).toContain(P.MICRO_TEXTES_EN_VRAI);
      expect(t, n).toContain(P.ligneDesTextesEnVrai(PRODUITS));
    }
  });
});

describe("4. la palette du bloc 02 : codes et légendes nets, à l'encre pleine de l'aperçu", async () => {
  const C = await import("@/lib/syna-agent/planche-en-vrai-code");
  const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
  const lum = (hx: string) => { const c = C.rgbDe(hx).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const contraste = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const police = (cle: string, famille: string, poids: number): import("@/lib/syna-agent/planche-en-vrai-code").PoliceChoisie => ({ cle, famille, fichier: "", poids, handle: `${cle}_n${String(poids)[0]}`, lue: famille, remplacee: false });
  it("sur l'aperçu réel de Mouture : chaque code et chaque légende au moins aussi foncé que l'encre pleine de l'aperçu, le trait plein", async () => {
    const demo = await sharp(fs.readFileSync(`${F}/apercu-planche-A-gardee.jpg`)).resize(P.TAILLE_DEMO.w, P.TAILLE_DEMO.h, { fit: "fill" }).png().toBuffer();
    const cases = P.lesCases("standard"), b0 = cases.cases.palette;
    const palette = ["#2E1A12", "#A86B3A", "#C89B6B", "#F6E9D7", "#7B8470"].map((hex, i) => ({ hex, nom: inventaire.couleurs[i].nom, mots: inventaire.couleurs[i].mots }));
    const png = await C.assemblerLaPlanche({ demo, boites: new Map([["palette", b0]]), pastilles: cases.pastilles, images: new Map(), versions: {} as never, palette,
      polices: { titres: police("montserrat", "Montserrat", 700), textes: police("playfair_display", "Playfair Display", 400) }, signature: [], titres: new Map(), blocs: new Map(), encre: "#2E1A12", motsLus: T.lignesDesMotsLues(inventaire) });
    const lignes = async (p: Buffer, k: number) => {
      const { data, info } = await sharp(p).removeAlpha().raw().toBuffer({ resolveWithObject: true }), b = b0.map((v) => v * k) as P.Boite, fond = C.fondDe(data, info.width, b);
      const l = C.lignesSousLesPastilles(data, info.width, b, cases.pastilles.map(([x, y, r]) => [x * k, y * k, r * k] as [number, number, number]), fond);
      // La part des points d'encre au cœur du trait (au moins 75 % de l'écart plein au fond) : un texte flou n'en a guère.
      const nettete = (x: import("@/lib/syna-agent/planche-en-vrai-code").LigneDeLaPalette) => {
        const f = C.rgbDe(fond), e = C.rgbDe(x.couleur), plein = Math.max(...[0, 1, 2].map((q) => Math.abs(e[q] - f[q])));
        let n = 0, cœur = 0;
        for (let y = x.haut; y < x.bas; y++) for (let z = x.gauche; z < x.droite; z++) { const i = (y * info.width + z) * 3, ec = Math.max(...[0, 1, 2].map((q) => Math.abs(data[i + q] - f[q]))); if (ec > 60) { n++; if (ec >= plein * 0.75) cœur++; } }
        return cœur / Math.max(1, n);
      };
      return { fond, l, nettete };
    };
    const a = await lignes(demo, 1), z = await lignes(png, 2);
    let petites = 0;
    for (let i = 0; i < 5; i++) {
      expect(z.l[i]?.length, `pastille ${i + 1}`).toBe(a.l[i]?.length);
      for (let k = 1; k < a.l[i]!.length; k++) {
        const x = a.l[i]![k], y = z.l[i]![k], quoi = `${inventaire.couleurs[i].nom}, ligne ${k + 1}`;
        // L'encre : au moins celle du cœur des traits de l'aperçu (à 3 % près), plus foncée que la moyenne de ses bords.
        expect(contraste(y.couleur, z.fond), quoi).toBeGreaterThanOrEqual(contraste(x.plein!, a.fond) * 0.97);
        expect(contraste(y.couleur, z.fond), quoi).toBeGreaterThan(contraste(x.couleur, a.fond));
        // Net : la plupart des points d'encre sont au cœur du trait.
        expect(z.nettete(y), quoi).toBeGreaterThanOrEqual(Math.max(0.55, a.nettete(x)));
        petites++;
      }
    }
    expect(petites).toBeGreaterThanOrEqual(15);
    // Le nom garde l'encre de l'aperçu (il l'atteint déjà, en gras).
    for (let i = 0; i < 5; i++) expect(contraste(z.l[i]![0].couleur, z.fond)).toBeGreaterThanOrEqual(contraste(a.l[i]![0].couleur, a.fond) * 0.98);
  });
  it("jamais d'opacité réduite ni de position à demi-pixel pour les lignes de la palette", () => {
    const src = fs.readFileSync("src/lib/syna-agent/planche-en-vrai-code.ts", "utf8");
    const f = src.slice(src.indexOf("function ligneDeLaPalette("), src.indexOf("function ecrireLaLigne("));
    expect(f).toContain("Math.round(milieu");
    expect(f).toContain("Math.round(l.bas * S");
    expect(f).toContain("l.plein ?? l.couleur");
    expect(src).not.toMatch(/globalAlpha\s*=\s*0\./);
  });
});
