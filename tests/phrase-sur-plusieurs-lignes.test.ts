/**
 * Le texte sous le nom, sur plusieurs lignes (25 novembre 2026, essai réel d'Écume : les esquisses 1 à 4 portaient
 * « SAVONNERIE ARTISANALE », puis « SAVONS · SHAMPOINGS · BAUMES », et le relecteur n'avait relevé que la première). Aucun
 * appel payant : faux relecteur, faux rédacteur, faux dessinateur.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

const E = await import("@/lib/syna-agent/esquisses");
const P = await import("@/lib/syna-agent/phrase-sous-le-nom");
const F = await import("@/lib/syna-agent/logo-finalisation");
const G = await import("@/lib/syna-agent/logo-graphistes");
const C = await import("@/lib/syna-agent/choix-esquisses");
const { phrasesDites } = await import("@/lib/syna-agent/tools/logo");
const { runWithLang } = await import("@/lib/i18n-server");
const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());

const NOM = "Écume", METIER = "une savonnerie artisanale qui fabrique et vend en ligne des savons solides, des shampoings solides et des baumes";
const L1 = "SAVONNERIE ARTISANALE", L2 = "SAVONS · SHAMPOINGS · BAUMES";
const DEUX = `${L1} / ${L2}`;
const TEXTE = `Transforme cette esquisse en véritable logo contemporain pour ${NOM}, ${METIER}. Conserve l'idée centrale : un galet de savon. Fais évoluer cette idée vers une identité plus aboutie et plus distinctive. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif`;
const lu = (numero: number, phraseSousLeNom: unknown, phraseBienEcrite = true) => ({ numero, entiere: true, morceauDeVoisine: false, nomLu: NOM, arche: false, ok: true, pourquoi: "", piste: `p${numero}`, phraseSousLeNom, phraseBienEcrite });
const candidates = (n: number) => Array.from({ length: n }, (_v, i) => ({ modele: "m", index: i, png: Buffer.from("x"), requestId: null }));

describe("1. le relecteur des esquisses relève tout le texte sous le nom, ligne par ligne", () => {
  it("la consigne demande toutes les lignes, dans l'ordre ; chaque ligne est jugée", () => {
    expect(E.RELECTEUR_DES_ESQUISSES).toContain("TOUT le texte écrit sous le nom, ligne par ligne, dans l'ordre, une ligne par élément de la liste, sans en oublier aucune ([] s'il n'y en a pas)");
    expect(E.RELECTEUR_DES_ESQUISSES).toContain("phraseBienEcrite : chacune de ces lignes est en bon français");
  });
  it("relevé multi-lignes : les deux lignes gardées dans l'ordre, réunies par « / »", () => {
    const v = E.RelectureEsquissesSchema.parse({ esquisses: [lu(1, [L1, L2]), lu(2, []), lu(3, [L1])] });
    const a = E.appliquerLaRelecture(NOM, candidates(3), v, 1);
    expect(a.refusees).toEqual([]);
    expect(a.gardees[0].phrase).toEqual({ texte: DEUX, lignes: [L1, L2], ok: true });
    expect(a.gardees[1].phrase).toBeUndefined();
    expect(a.gardees[2].phrase).toEqual({ texte: L1, ok: true });
  });
  it("ancienne réponse en une chaîne : lue comme avant (une ligne, « aucune »)", () => {
    const v = E.RelectureEsquissesSchema.parse({ esquisses: [lu(1, L1), lu(2, "aucune", false)] });
    const a = E.appliquerLaRelecture(NOM, candidates(2), v, 1);
    expect(a.gardees.map((g) => g.phrase)).toEqual([{ texte: L1, ok: true }, undefined]);
  });
  it("le contrôle d'orthographe s'applique à chaque ligne ; une ligne douteuse rend la phrase non proposable", () => {
    expect(P.phraseDeLEsquisse([L1, "SAVONS · SHAMPPPOINGS"], true)).toMatchObject({ ok: false, lignes: [L1, "SAVONS · SHAMPPPOINGS"], raisons: ["ligne 2 : une lettre répétée trois fois"] });
    expect(P.phraseDeLEsquisse([L1, L2], false)).toMatchObject({ ok: false, raisons: ["le relecteur n'est pas sûr de son orthographe"] });
    expect(P.phraseDeLEsquisse(["Savons pour la peau", "made with love"], true)?.ok).toBe(false);
    expect(P.phraseDeLEsquisse(["a b c d e", "x", "y", "z", "w"].map((x, i) => `Ligne ${"abcde"[i]} ${x}`), true)?.raisons).toContain("trop de lignes (5, 4 au plus)");
    // Un « / » collé reste dans la ligne (« 7j/7 »).
    expect(P.lignesDuTexte("Lavage à domicile, 7j/7")).toEqual(["Lavage à domicile, 7j/7"]);
    expect(P.lignesDuTexte(`${L1}\n${L2}`)).toEqual([L1, L2]);
  });
});

describe("2. le choix : « la phrase de l'esquisse N » reprend toutes ses lignes ; une seule ligne ; la sienne avec « / »", () => {
  const etat = { esquisses: [
    { numero: 1, assetId: "a1", modele: "m", piste: "", tour: 1, recherche: 1, requestId: null, phrase: { texte: DEUX, lignes: [L1, L2], ok: true } },
    { numero: 2, assetId: "a2", modele: "m", piste: "", tour: 1, recherche: 1, requestId: null },
  ] };
  it("choix « esquisse 1 » à deux lignes : les deux, dans l'ordre", async () => {
    expect(await fr(() => G.controleDesPhrases(etat, [1, 2], [{ logo: 2, de: 1 }], []))).toEqual({ ok: true, phrases: { 2: { de: 1, texte: DEUX, lignes: [L1, L2] } } });
    // Par l'outil : un numéro.
    expect(phrasesDites({ 2: 1 })).toEqual([{ logo: 2, de: 1 }]);
    // La vue des esquisses garde les lignes ; la carte les montre et les envoie toutes.
    const vue = G.vueDesEsquisses({ nom: NOM, max: 2, esquisses: etat.esquisses, refusees: 0, planches: [], recherches: 1, notes: [], at: 1 }, (id) => id)!;
    expect(vue.list[0].phrase).toEqual({ texte: DEUX, ok: true, lignes: [L1, L2] });
    expect(C.messageDuChoixAvecPhrases([1, 2], { 2: { de: 1, texte: DEUX } })).toBe(`Je choisis les esquisses 1 et 2. Pour le logo 2 : la phrase de l'esquisse 1, « ${DEUX} ».`);
  });
  it("une seule ligne gardée : « 1:1 » par l'outil, ou la ligne choisie sur la carte", async () => {
    expect(phrasesDites({ 2: "1:1" })).toEqual([{ logo: 2, de: 1, lignes: [1] }]);
    expect(await fr(() => G.controleDesPhrases(etat, [1, 2], phrasesDites({ 2: "1:2" }), []))).toEqual({ ok: true, phrases: { 2: { de: 1, texte: L2 } } });
    expect(await fr(() => G.controleDesPhrases(etat, [1, 2], phrasesDites({ 2: "1:3" }), []))).toMatchObject({ ok: false });
    expect(C.messageDuChoixAvecPhrases([1, 2], { 1: { de: 1, texte: L1, ligne: 1 } })).toBe(`Je choisis les esquisses 1 et 2. Pour le logo 1 : seulement la ligne 1 de la phrase de l'esquisse 1, « ${L1} ».`);
    // Ou il l'écrit lui-même : une ligne, mot pour mot.
    expect(await fr(() => G.controleDesPhrases(etat, [1, 2], [{ logo: 1, texte: L1 }], [`Garde juste ${L1} sous le nom`]))).toEqual({ ok: true, phrases: { 1: { sienne: true, texte: L1 } } });
  });
  it("sa phrase avec « / » : chaque ligne doit figurer mot pour mot dans un de ses messages, le « / » mis à part", async () => {
    const r = await fr(() => G.controleDesPhrases(etat, [1, 2], [{ logo: 2, texte: DEUX }], [`Pour le 2 je veux :\n${L1}\n${L2}`]));
    expect(r).toEqual({ ok: true, phrases: { 2: { sienne: true, texte: DEUX, lignes: [L1, L2] } } });
    expect(await fr(() => G.controleDesPhrases(etat, [1, 2], [{ logo: 2, texte: `${L1} / SAVONS ET BAUMES` }], [`Pour le 2 : ${DEUX}`]))).toMatchObject({ ok: false });
    expect(phrasesDites({ 2: DEUX })).toEqual([{ logo: 2, texte: DEUX }]);
  });
});

describe("3. la finalisation reçoit toutes les lignes et les garde telles quelles", () => {
  const voulue = P.phraseVoulue({ de: 1, texte: DEUX, lignes: [L1, L2] })!;
  it("la consigne dit d'écrire exactement ces lignes, dans cet ordre, en petit sous le nom", () => {
    expect(voulue).toEqual({ texte: DEUX, lignes: [L1, L2] });
    const ligne = F.ligneDeLaPhrase(voulue);
    expect(ligne).toContain(`demande de les écrire exactement, dans cet ordre, chacune sur sa ligne, « ${L1} » puis « ${L2} »`);
    expect(ligne).toContain("en petit sous le nom");
    expect(F.consigneDeFinalisation(NOM, METIER, voulue).replace(`${ligne}\n`, "")).toBe(F.consigneDeFinalisation(NOM, METIER));
  });
  it("le contrôle gratuit vérifie chaque ligne mot pour mot", () => {
    const avec = TEXTE.replace("Fais évoluer", `Écris en petit sous le nom, sur deux lignes : « ${L1} », puis « ${L2} ». Fais évoluer`);
    expect(F.controleDuTexte(avec, NOM, METIER, voulue)).toEqual([]);
    const sansLa2 = TEXTE.replace("Fais évoluer", `Écris en petit sous le nom : « ${L1} ». Fais évoluer`);
    expect(F.controleDuTexte(sansLa2, NOM, METIER, voulue)).toEqual([`il doit demander d'écrire sous le nom, exactement, chacune des lignes choisies par le client ; il manque « ${L2} »`]);
  });
});

describe("4. la relecture du logo fini : jamais « inventée », chaque ligne comparée lettre pour lettre", () => {
  const voulue = { texte: DEUX, lignes: [L1, L2] };
  const bien = { nomLu: NOM, ideeConservee: true, arche: false, phrase: DEUX, phraseDitLeMetier: false, note: 9, pourquoi: "" };
  it("la demande au relecteur donne les lignes choisies et dit qu'elles ne sont pas inventées", () => {
    const d = F.demandeAuRelecteurDuLogo({ nom: NOM, metier: METIER, texte: TEXTE, phrase: voulue });
    expect(d).toContain(`« ${L1} » puis « ${L2} ». Elles ne sont pas inventées`);
  });
  it("ne refuse jamais une ligne choisie ; refuse une ligne manquante, mal écrite, en trop, ou dans le désordre", () => {
    expect(F.raisonsDuRefus(bien, NOM, voulue)).toEqual([]);
    expect(F.raisonsDuRefus({ ...bien, phrase: `${L1}\n${L2}` }, NOM, voulue)).toEqual([]);
    expect(F.raisonsDuRefus({ ...bien, phrase: `${L1} ${L2}` }, NOM, voulue)).toEqual([]); // lues sans séparateur
    expect(F.raisonsDuRefus({ ...bien, phrase: L1 }, NOM, voulue)).toEqual([`la ligne choisie par le client « ${L2} » n'y est pas écrite`]);
    expect(F.raisonsDuRefus({ ...bien, phrase: `${L1} / SAVONS · SHAMPOINGS · BAUME` }, NOM, voulue)).toEqual([`une ligne choisie par le client est mal écrite (« SAVONS · SHAMPOINGS · BAUME » au lieu de « ${L2} »)`]);
    expect(F.raisonsDuRefus({ ...bien, phrase: `${DEUX} / DEPUIS 1998` }, NOM, voulue)).toEqual(["le logo porte une ligne que le client n'a pas choisie (« DEPUIS 1998 »)"]);
    expect(F.raisonsDuRefus({ ...bien, phrase: `${L2} / ${L1}` }, NOM, voulue)).toHaveLength(1);
    expect(F.raisonsDuRefus({ ...bien, phrase: "" }, NOM, voulue)).toHaveLength(1);
    // Aucune raison ne dit « inventée » pour une ligne choisie.
    expect(F.raisonsDuRefus({ ...bien, phrase: L1 }, NOM, voulue).join(" ")).not.toMatch(/inventée/);
  });
  it("de bout en bout : une ligne mal écrite fait refaire le logo une fois, avec la raison", async () => {
    const png = () => sharp({ create: { width: 64, height: 64, channels: 3, background: "#FFFFFF" } }).png().toBuffer();
    const avec = TEXTE.replace("Fais évoluer", `Écris sous le nom : « ${L1} », puis « ${L2} ». Fais évoluer`);
    const envoyes: string[] = [];
    const verdicts = [{ ...bien, phrase: `${L1} / SAVONS · SHAMPOINGS` }, bien];
    const r = await F.finaliserUneEsquisse({
      rediger: async () => ({ idee_centrale: "un galet", texte: avec }),
      finaliser: async (_e, x) => { envoyes.push(x); return png(); },
      relire: async () => verdicts.shift()!,
      detourer: async (p) => ({ ok: true, png: p }),
      aLaChargeDuStudio: async (fn) => fn(),
    }, { nom: NOM, metier: METIER, esquisse: await png(), phrase: voulue });
    expect(r.ok).toBe(true);
    expect(envoyes[1]).toBe(`Corrige uniquement : une ligne choisie par le client est mal écrite (« SAVONS · SHAMPOINGS » au lieu de « ${L2} ») ; garde tout le reste à l'identique.\n\n${avec}`);
  });
});

describe("5. l'essai : esquisses.json corrigé à la main, PHRASE avec « / » ou « esquisse N »", async () => {
  const O = await import("../scripts/syna-recette/essai-finalisation-outil");
  const dossier = () => fs.mkdtempSync(path.join(os.tmpdir(), "ecume-"));
  const fichier = (gardees: unknown[]) => { const d = dossier(); fs.writeFileSync(path.join(d, "esquisses.json"), JSON.stringify({ nom: NOM, gardees })); fs.writeFileSync(path.join(d, "rapport.txt"), `Phrase du métier : ${METIER}\n`); return path.join(d, "rapport.txt"); };
  it("les trois corrections à la main sont relues telles quelles, contrôlées ligne par ligne", async () => {
    const rapport = fichier([
      { numero: 1, fichier: "esquisse-01.png", phrase: { lignes: [L1, L2], ok: true } },
      { numero: 2, fichier: "esquisse-02.png", phrase: [L1, L2] },
      { numero: 3, fichier: "esquisse-03.png", phrase: DEUX },
      { numero: 4, fichier: "esquisse-04.png", phrase: { texte: DEUX, ok: true } },
      { numero: 5, fichier: "esquisse-05.png", phrase: { texte: L1, ok: true } },
      { numero: 6, fichier: "esquisse-06.png", phrase: [L1, "SAVONNS · BAUMMMES"] },
    ]);
    const g = O.esquissesGardees(rapport)!;
    for (const n of [1, 2, 3, 4]) expect(g[n - 1].phrase, String(n)).toEqual({ texte: DEUX, lignes: [L1, L2], ok: true });
    expect(g[4].phrase).toEqual({ texte: L1, ok: true });
    expect(g[5].phrase).toMatchObject({ ok: false, raisons: ["ligne 2 : une lettre répétée trois fois"] });
    // PHRASE="esquisse 1" : les deux lignes ; « esquisse 1 ligne 1 » : la première ; une douteuse : rien n'est lancé.
    expect(await fr(() => O.phrasesDeLEssai([1, 3], { PHRASE: "esquisse 1" }, g))).toEqual({ 1: { texte: DEUX, lignes: [L1, L2] }, 3: { texte: DEUX, lignes: [L1, L2] } });
    expect(await fr(() => O.phrasesDeLEssai([1, 3], { PHRASE_3: "esquisse 1 ligne 1" }, g))).toEqual({ 3: { texte: L1 } });
    await expect(fr(() => O.phrasesDeLEssai([1, 3], { PHRASE: "esquisse 6" }, g))).rejects.toThrow(/Rien n'est lancé/);
    expect(O.phraseEnMots({ texte: DEUX, lignes: [L1, L2] })).toBe(`2 lignes, dans l'ordre, « ${L1} » puis « ${L2} », mot pour mot`);
  });
  it("PHRASE=\"SAVONNERIE ARTISANALE / SAVONS · SHAMPOINGS · BAUMES\" : sa phrase, deux lignes, sans toucher au fichier", async () => {
    const g = O.esquissesGardees(fichier([{ numero: 1, fichier: "esquisse-01.png", phrase: { texte: L1, ok: true } }, { numero: 3, fichier: "esquisse-03.png", phrase: { texte: L1, ok: true } }]))!;
    expect(await fr(() => O.phrasesDeLEssai([1, 3], { PHRASE: DEUX }, g))).toEqual({ 1: { texte: DEUX, lignes: [L1, L2] }, 3: { texte: DEUX, lignes: [L1, L2] } });
    await expect(fr(() => O.phrasesDeLEssai([1], { PHRASE: `${L1} / SAVONNS BAUMMMES` }, g))).rejects.toThrow(/faute évidente/);
  });
  it("un fichier mal corrigé est refusé avant toute dépense", () => {
    expect(() => O.esquissesGardees(fichier([{ numero: 1, phrase: { ok: true } }]))).toThrow(/esquisse 1 .*Rien n'est lancé/);
    expect(() => O.esquissesGardees(fichier([{ numero: 1, phrase: [L1, 3] }]))).toThrow(/Rien n'est lancé/);
  });
});

