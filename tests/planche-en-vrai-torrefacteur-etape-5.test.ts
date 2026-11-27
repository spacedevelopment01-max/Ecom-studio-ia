/**
 * LA PLANCHE EN VRAI DE MOUTURE, ÉTAPE 5 (essai réel du torréfacteur, 26 novembre 2026 ; 1,77 € dépensés, rien d'assemblé).
 * Constats du chef d'orchestre :
 *  - « Faux refus « en trop : TORRÉFACTION, ARTISANALE ». C'est la phrase du logo, imprimée sous le logo sur les sachets. »
 *  - « Produits et faits inventés dans les images refaites en HD. On y lit « L'ARABY DE PÉROU », « 100% ARABICA », des
 *    origines Brésil et Pérou, et « CAFÉ DEPUIS 1928 ». L'aperçu A n'en avait pas. »
 * Verdicts réels, inventaire réel et textes envoyés copiés tels quels dans tests/fixtures/torrefacteur-planche-en-vrai.
 * Aucun appel : tout est jugé par le code.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import * as P from "@/lib/syna-agent/planche-en-vrai";
import { jointeAllegeeSansPerte } from "@/lib/ai/media-providers";
import { motQuiDitUnFait } from "@/lib/syna-agent/planche-de-marque";

const F = "tests/fixtures/torrefacteur-planche-en-vrai";
const PRODUITS = ["cafés en grains", "cafés moulus", "coffrets"];
const LOGO = { nom: "Mouture", phrase: ["TORRÉFACTION ARTISANALE"] };
const inventaire = P.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${F}/inventaire-reponse.json`, "utf8")));
const verdicts = (g: string): P.RelectureDuGroupe => JSON.parse(fs.readFileSync(`${F}/${g}-1-verdict.json`, "utf8")).verdict;
const verdict = (n: P.NomElement) => verdicts(P.def(n).groupe).images.find((x) => x.case === n)!;
const raisons = (n: P.NomElement, o: { logo?: typeof LOGO; produits?: string[] } = { logo: LOGO, produits: PRODUITS }) =>
  P.raisonsDuRefusEnVrai(verdict(n), { inventaire: P.caseLue(inventaire, n), personnes: false, photo: false, element: n, ...o });

describe("planche en vrai de Mouture, étape 5 : les textes du logo jamais en trop", () => {
  it("sans le nom et la phrase du logo, le code d'avant refusait pour « TORRÉFACTION », « ARTISANALE » (verdicts réels)", () => {
    for (const n of ["publication-1x1", "publication-9x16"] as const) expect(raisons(n, {}).join(" ")).toMatch(/en trop ou mal écrits : « TORRÉFACTION », « ARTISANALE »/);
    // Depuis le 27 novembre 2026 (`textesExcusesEnVrai`), site-ordinateur n'en a plus besoin : « TORRÉFACTION ARTISANALE »
    // y est aussi un texte de l'aperçu (le bandeau du site), écrit une seconde fois sous le logo : jamais en trop.
    expect(raisons("site-ordinateur", {})).toEqual([]);
  });
  it("avec eux, publication-1x1, publication-9x16 et site-ordinateur sont gardées ; produit-1, produit-2 et reference-4 ne sont plus reprochés pour la phrase ni pour le nom", () => {
    for (const n of ["publication-1x1", "publication-9x16", "site-ordinateur"] as const) expect(raisons(n), n).toEqual([]);
    for (const n of ["produit-1", "produit-2", "reference-4", "site-telephone"] as const) {
      const r = raisons(n).join(" ");
      expect(r, n).not.toMatch(/« TORRÉFACTION »|« ARTISANALE »|« MOUTURE »/);
    }
  });
  it("un mot du logo mal écrit reste en trop ; ailleurs que là où est le logo, rien ne change", () => {
    expect(P.sansLesTextesDuLogo(["TORÉFACTION", "ARTISANALE", "MOUTURE", "Mouturé"], LOGO)).toEqual(["TORÉFACTION", "Mouturé"]);
    expect(P.sansLesTextesDuLogo(["ARTISANALE"], undefined)).toEqual(["ARTISANALE"]);
    // reference-1 n'a pas de logo : un mot de la phrase y serait reproché.
    const v = { ...verdict("reference-1"), textesLus: ["TORRÉFACTION ARTISANALE"], logoPresent: false };
    expect(P.raisonsDuRefusEnVrai(v, { inventaire: P.caseLue(inventaire, "reference-1"), personnes: false, photo: false, element: "reference-1", logo: LOGO, produits: PRODUITS }).join(" ")).toMatch(/« TORRÉFACTION »/);
  });
  it("le bandeau de la planche : un mot entier perdu au bord gauche de l'aperçu (« à » de « à la tasse, ») n'est plus reproché", () => {
    expect(raisons("ouverture-planche", { produits: PRODUITS })).toEqual([]);
  });
});

describe("planche en vrai de Mouture, étape 5 : produits et faits inventés", () => {
  it("le code reconnaît les faits : chiffres, pays, origines ; jamais un mot ordinaire", () => {
    for (const w of ["100%", "1928", "PÉROU", "BRÉSIL", "ÉTHIOPIE", "250G", "origine", "France"]) expect(motQuiDitUnFait(w), w).toBe(true);
    for (const w of ["CAFÉ", "MOUTURE", "TORRÉFACTION", "bas", "uni", "nouvelle", "Découvrir"]) expect(motQuiDitUnFait(w), w).toBe(false);
  });
  it("les verdicts réels de produit-3, reference-5 et reference-6 sont refusés pour faits inventés, cités au compte rendu", () => {
    const p3 = raisons("produit-3");
    expect(p3[0]).toBe(`${P.DEBUT_FAITS_INVENTES_EN_VRAI}« L'ARABY DE PÉROU », « 100% ARABICA »`);
    expect(raisons("reference-5")[0]).toMatch(/^faits ou produits inventés.*« DEPUIS 1928 »/);
    expect(raisons("reference-6")[0]).toMatch(/« L'ARABICA PUR BRÉSIL ».*« LE MOKA ÉTHIOPIE - BIO »/);
    expect(raisons("produit-1")[0]).toMatch(/« CLASSÉ \| 500 g \| 100% ARABICA »/);
  });
  it("le relecteur relève à part (inventes) : un nom absent de la fiche fait refuser, un produit de la fiche jamais", () => {
    const base = { ...verdict("produit-2"), textesLus: ["MOUTURE", "TORRÉFACTION ARTISANALE", "CAFÉ MOULU"] };
    const o = { inventaire: P.caseLue(inventaire, "produit-2"), personnes: false, photo: false, element: "produit-2", logo: LOGO, produits: PRODUITS };
    expect(P.raisonsDuRefusEnVrai(base, o)).toEqual([]);
    expect(P.raisonsDuRefusEnVrai({ ...base, inventes: [{ ou: "étiquette", texte: "Café moulu" }] }, o)).toEqual([]);
    expect(P.raisonsDuRefusEnVrai({ ...base, inventes: [{ ou: "étiquette", texte: "Signature du torréfacteur" }] }, o)[0]).toBe(`${P.DEBUT_FAITS_INVENTES_EN_VRAI}« Signature du torréfacteur »`);
    // Le schéma accepte un verdict d'avant ce champ.
    expect(P.ImageRelueSchema.parse({ case: "produit-2" }).inventes).toBeUndefined();
  });
  it("la relecture reçoit les produits de la fiche et la phrase du logo ; sa consigne demande les inventions à part", () => {
    const d = P.demandeAuRelecteurEnVrai({ nom: "Mouture", personnes: false, groupe: "produits", cases: [{ element: "produit-1", photo: false }], produits: PRODUITS, phrase: LOGO.phrase });
    expect(d).toMatch(/« cafés en grains », « cafés moulus », « coffrets »/);
    expect(d).toMatch(/la phrase « TORRÉFACTION ARTISANALE » : partout où le logo apparaît, ces textes sont attendus/);
    expect(P.RELECTEUR_EN_VRAI).toMatch(/- inventes : chaque texte lisible de l'image refaite qui donne un nom de produit, une origine, une date, une année ou un chiffre/);
    expect(P.RELECTEUR_EN_VRAI).not.toMatch(/Mouture|ARABICA|PÉROU|1928/);
  });
  it("la consigne de reprise en HD : la règle des preuves mot pour mot, puis la ligne de l'élément qui dit les étiquettes en positif", () => {
    const t = P.texteDeLElement({ element: "produit-3", nom: "Mouture", logo: true, photo: false, personnes: false, produits: PRODUITS });
    expect(t.startsWith(`${P.REGLE_APERCU} ${P.regleDuLogo("Mouture")} `)).toBe(true);
    expect(t).toContain("Les étiquettes et les emballages ne portent que les textes de l'aperçu, le nom de la marque, la phrase de son logo et les noms des produits du client : « Cafés en grains », « Cafés moulus », « Coffrets » ; aucune date, aucune origine, aucun chiffre n'y est ajouté.");
    // Le texte réellement envoyé à l'essai (sans la ligne) est reconnu, pour reprendre l'image reçue sans la repayer.
    const avant = fs.readFileSync(`${F}/produit-1-1-texte-envoye.txt`, "utf8");
    expect(P.texteSansLaLigneDesTextes(P.texteDeLElement({ element: "produit-1", nom: "Mouture", logo: true, photo: false, personnes: false, produits: PRODUITS }), PRODUITS)).toBe(avant);
    // Sans produits, le texte d'avant ne change pas.
    expect(P.texteDeLElement({ element: "produit-1", nom: "Mouture", logo: true, photo: false, personnes: false })).toBe(avant);
  });
  it("la reprise ne renvoie jamais au dessinateur un texte inventé (l'essai réel les renvoyait), et rappelle les noms de la fiche", () => {
    expect(fs.readFileSync(`${F}/produit-3-2-texte-envoye-avant.txt`, "utf8")).toMatch(/« PÉROU »/);
    for (const n of ["produit-3", "reference-6", "reference-5", "produit-1", "reference-4"] as const) {
      const t = P.texteDeLElement({ element: n, nom: "Mouture", logo: true, photo: false, personnes: false, produits: PRODUITS, raisons: P.raisonsPourLeDessinateurEnVrai(raisons(n), { produits: PRODUITS }) });
      const reprise = t.slice(t.indexOf("À corriger"));
      for (const interdit of ["ARABY", "PÉROU", "100%", "ARABICA", "SIGNATURE", "BRÉSIL", "ÉTHIOPIE", "MOKA", "1928", "DEPUIS", "500 g", "250", "FRANCE", "CERROAZUL"]) expect(reprise, `${n} : ${interdit}`).not.toContain(interdit);
      if (n !== "reference-4") expect(reprise).toContain("« Cafés en grains », « Cafés moulus », « Coffrets »");
    }
  });
  it("de bout en bout (appels simulés) : la reprise d'une image refusée pour un fait inventé part sans lui, avec la ligne des étiquettes", async () => {
    const textes: string[] = [];
    const apercus = new Map<string, Buffer>([["produit-3", await sharp({ create: { width: 227, height: 285, channels: 3, background: "#8a6a4a" } }).png().toBuffer()]]);
    await P.refaireLesElements({
      refaire: async (d) => { textes.push(d.texte); return sharp({ create: { width: 912, height: 1088, channels: 3, background: "#8a6a4a" } }).png().toBuffer(); },
      relire: async (_g, _items, _d, tour) => ({ images: [tour === 1 ? verdict("produit-3") : { ...verdict("produit-3"), textesLus: ["MOUTURE", "TORRÉFACTION ARTISANALE", "MOUTURE", "MOUTURE"], note: 9 }] }),
      aLaChargeDuStudio: (fn) => fn(),
    }, { nom: "Mouture", personnes: false, logo: Buffer.from("logo"), photo: null, apercus, inventaire, elements: ["produit-3"], produits: PRODUITS, phrase: LOGO.phrase });
    expect(textes).toHaveLength(2);
    for (const t of textes) expect(t).toContain(P.ligneDesTextesEnVrai(PRODUITS));
    expect(textes[1]).toMatch(/À corriger : un texte absent de l'aperçu est écrit/);
    for (const interdit of ["ARABY", "PÉROU", "100%"]) expect(textes[1]).not.toContain(interdit);
  });
});

describe("les coupures de l'étape 5 : les images jointes allégées sans perte", () => {
  it("le logo joint réel (718 173 octets) part plus léger, chaque point identique", async () => {
    const logo = fs.readFileSync(`${F}/logo-joint.png`);
    const leger = await jointeAllegeeSansPerte(logo);
    expect(logo.length).toBe(718_173);
    expect(leger.length).toBeLessThan(logo.length * 0.85);
    const [a, b] = await Promise.all([sharp(logo).raw().toBuffer({ resolveWithObject: true }), sharp(leger).raw().toBuffer({ resolveWithObject: true })]);
    expect([b.info.width, b.info.height, b.info.channels]).toEqual([a.info.width, a.info.height, a.info.channels]);
    expect(b.data.equals(a.data)).toBe(true);
  });
  it("une image qui n'est pas un PNG, ou déjà au plus léger, part telle quelle", async () => {
    const jpeg = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#123456" } }).jpeg().toBuffer();
    expect(await jointeAllegeeSansPerte(jpeg)).toBe(jpeg);
    const petit = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#ffffff" } }).png({ compressionLevel: 9 }).toBuffer();
    expect((await jointeAllegeeSansPerte(petit)).equals(petit)).toBe(true);
  });
});

describe("REJUGER=1 sur les fichiers réels de Mouture : aucun appel", () => {
  const dossiers: string[] = [];
  afterEach(() => { for (const d of dossiers.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });
  it("8 images gardées sur 17, 9 à refaire avec leurs raisons, les reprises d'avant déclarées périmées, le devis de ce qui reste", async () => {
    const O = await import("../scripts/syna-recette/essai-planche-en-vrai-outil");
    const sortie = fs.mkdtempSync(path.join(os.tmpdir(), "rejuger-mouture-"));
    dossiers.push(sortie);
    for (const d of ["cases", "relectures", "apercus"]) fs.mkdirSync(path.join(sortie, d));
    fs.copyFileSync(`${F}/inventaire-reponse.json`, path.join(sortie, "inventaire-reponse.json"));
    fs.copyFileSync(`${F}/cases.json`, path.join(sortie, "apercus", "cases.json"));
    for (const g of P.GROUPES) fs.copyFileSync(`${F}/${g}-1-verdict.json`, path.join(sortie, "relectures", `${g}-1-verdict.json`));
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#777777" } }).png().toBuffer();
    // Comme à l'essai : les 17 images du premier essai, quatre reprises reçues jamais relues, une reprise partie sans réponse.
    const recues = [...P.NOMS_DES_ELEMENTS.map((n) => `${n}-1`), "publication-4x5-2", "site-telephone-2", "produit-1-2", "produit-2-2"];
    for (const b of recues) { fs.writeFileSync(path.join(sortie, "cases", `${b}-hd.png`), png); fs.writeFileSync(path.join(sortie, "cases", `${b}-texte-envoye.txt`), "texte"); }
    fs.writeFileSync(path.join(sortie, "cases", "produit-3-2-texte-envoye.txt"), "texte");
    const client = O.clientDeLEssai({ CLIENT_JSON: "scripts/syna-recette/clients/torrefacteur.json", CLIENT_NOM: "Mouture" });
    const donnees = O.donneesDeLaPlanche(client, { RESULTAT_PLANCHE: `${F}/planche-A-resultat.json` });
    const r = await O.rejugerLEssaiEnVrai({ sortie, client, donnees, logoHd: true });
    expect(r.gardees.map((g) => g.element)).toEqual(["publication-1x1", "publication-9x16", "ouverture-site", "ouverture-planche", "site-ordinateur", "reference-1", "reference-2", "reference-3"]);
    expect(r.aRefaire.map((x) => x.element)).toEqual(["publication-4x5", "site-telephone", "produit-1", "produit-2", "produit-3", "emballage", "reference-4", "reference-5", "reference-6"]);
    expect(r.perimees).toEqual(["publication-4x5-2", "site-telephone-2", "produit-1-2", "produit-2-2"]);
    expect(r.aRefaire.find((x) => x.element === "produit-3")!.raisons[0]).toMatch(/« L'ARABY DE PÉROU »/);
    expect(r.devis).toMatchObject({ images: 9, relectures: 4, logoHd: true });
    expect(fs.existsSync(path.join(sortie, "rejugement.json")) && fs.existsSync(path.join(sortie, "rejugement.txt"))).toBe(true);
    // La passe relue après le rejugement le porte, et le devis de la reprise le suit.
    const prec = O.passePrecedente(sortie)!;
    expect(prec.rejugement?.perimees).toEqual(r.perimees);
    const d = await O.devisDeLaReprise(prec, { logoHd: true });
    expect(d.probableMicro).toBe(r.devis.probableMicro);
    expect(d.plafondMinimalMicro).toBe(r.devis.maxMicro);
    expect(d.texte.join("\n")).toMatch(/produit-3-2\. Jamais relancé tout seul/);
    // Un texte inventé vu au contrôle sur une image gardée la fait refaire (A_REFAIRE).
    const r2 = await O.rejugerLEssaiEnVrai({ sortie, client, donnees, logoHd: true, aLOeil: O.lireALOeil("reference-2:CAFÉ DEPUIS 1928") });
    expect(r2.aRefaire.map((x) => x.element)).toContain("reference-2");
    expect(r2.aRefaire.find((x) => x.element === "reference-2")!.raisons[0]).toMatch(/« CAFÉ DEPUIS 1928 »/);
  });
});
