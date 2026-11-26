/**
 * Le signe parasite isolé, une petite finition (26 novembre 2026, essai réel d'Écume, étape 3 reprise) : la planche A,
 * reprise à 8/10 et jugée « montrable » par le relecteur, était refusée pour un seul accent égaré après une barre de
 * séparation. Règle du propriétaire, déjà scellée pour les logos : « les petites finitions ne font pas refuser ». Aucun
 * appel : le verdict réel de A-2 est copié tel quel dans tests/fixtures/ecume-planches-2, les autres sont simulés.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const F = "tests/fixtures/ecume-planches-2";
const PHRASE = ["SAVONNERIE ARTISANALE", "BULLES DE SOIN AU NATUREL"];
const FAUTE_REELLE = "Titre SEO (bloc 10) : « Écume – Savonnerie artisanale |´ » — accent parasite après la barre de séparation";

describe("le signe parasite isolé hors des mots : une petite finition, jamais un refus", async () => {
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const texte = fs.readFileSync(`${F}/planche-A-2-texte-envoye.txt`, "utf8");
  const ATTENDU = { nom: "Écume", annee: 2026, domaine: { domaine: "ecumefrance.fr", statut: "disponible" as const }, personnes: false, animaux: false, phrase: PHRASE, texte };
  const reel = JSON.parse(fs.readFileSync(`${F}/planche-A-2-relecture-verdict.json`, "utf8"));
  const v = P.VerdictRangeDeLaPlancheSchema.parse(reel.verdict);

  it("le verdict réel de A-2, tel quel : gardée, la finition notée au compte rendu, la note de 8 inchangée", () => {
    // Ce que décidait le code d'avant : refusée pour cette seule faute.
    expect(reel.gardee).toBe(false);
    expect(reel.raisons).toEqual([`fautes : « ${FAUTE_REELLE} »`]);
    expect(v.fautes).toEqual([FAUTE_REELLE]);
    expect(v.note).toBe(8);
    expect(v.pourquoi).toMatch(/montrable/);
    const lu = P.lectureDeLaPlanche(v, ATTENDU);
    expect(lu.raisons).toEqual([]);
    expect(lu.finitions).toEqual([FAUTE_REELLE]);
    expect(lu.ecartes).toContain(`petite finition, notée sans refus : « ${FAUTE_REELLE} »`);
    expect(P.signeParasiteIsole(FAUTE_REELLE, ATTENDU)).toBe("Écume Savonnerie artisanale");
    // Sans le texte envoyé : le nom et la phrase suffisent ici à retrouver chaque mot.
    expect(P.lectureDeLaPlanche(v, { ...ATTENDU, texte: undefined }).raisons).toEqual([]);
  });

  it("un accent parasite DANS un mot, collé à un mot, ou une lettre fausse : toujours un refus", () => {
    const refuse = (f: string) => P.lectureDeLaPlanche({ ...v, fautes: [f] }, ATTENDU).raisons.join(" ");
    for (const f of [
      "Titre SEO (bloc 10) : « Écume – Savonne´rie artisanale » — accent parasite dans le mot",
      "Titre SEO (bloc 10) : « Écume – Savonnerie artisanale´ » — accent parasite collé au mot",
      "Titre SEO (bloc 10) : « Écume – Savonnnerie artisanale | » — barre parasite",
      "Titre SEO (bloc 10) : « Écume – Savonerie artisanale |´ » — accent parasite après la barre",
      "Titre SEO (bloc 10) : « Écume – Savonnerie artisanale | » — lettre en trop et barre parasite",
      "Titre SEO (bloc 10) : « Écume – Savonnerie artisanale » — mot mal écrit",
      "Bloc 08 : « Découvrir la colection · » — point égaré au lieu de « Découvrir la collection »",
      "Titre SEO (bloc 10) : accent parasite après la barre de séparation",
      "Mentions : « Ecume – Savonnerie artisanale |´ » — accent parasite après la barre",
    ]) expect(refuse(f), f).toMatch(/^fautes : /);
    // Le texte attendu, donné par le relecteur, sans les signes : la finition est gardée ; avec une lettre de différence, non.
    expect(refuse("Bloc 08 : « Découvrir la collection · » — point égaré au lieu de « Découvrir la collection »")).toBe("");
  });

  it("le nom, la phrase du logo, l'adresse et l'année font toujours refuser, même avec un seul signe parasite", () => {
    const refuse = (x: Partial<typeof v>) => P.lectureDeLaPlanche({ ...v, ...x }, ATTENDU).raisons.join(" ");
    // Les données comparées par le code, lettre pour lettre.
    expect(refuse({ nomLu: "Écume´" })).toMatch(/le nom est mal écrit/);
    expect(refuse({ copyrightLu: "© 2026 Écume ´" })).toMatch(/copyright/);
    expect(refuse({ copyrightLu: "© 2025 Écume" })).toMatch(/copyright/);
    expect(refuse({ domaineLu: "ecumefrance.fr ´ — disponible" })).toMatch(/bloc 10 doit dire exactement/);
    expect(refuse({ phrasesLues: [{ emplacement: "Bloc 04, slogan", lignes: ["SAVONNERIE ARTISANALE ´", "BULLES DE SOIN AU NATUREL"], cachee: false }] })).toMatch(/la phrase choisie par le client est mal écrite/);
    // Ces mêmes données relevées en fautes avec un signe parasite : jamais une finition.
    for (const f of [
      "Titre (ouverture) : « Écume ´ » — accent parasite",
      "Bloc 10 : « ecumefrance.fr ´ — disponible » — accent parasite",
      "Bloc 10 : « © 2026 Écume . » — point parasite",
      "Bloc 04 : « SAVONNERIE ARTISANALE ´ » — accent parasite",
      "Bloc 04 : « BULLES DE SOIN AU NATUREL | » — barre parasite dans le slogan",
    ]) {
      expect(P.signeParasiteIsole(f, ATTENDU), f).toBeNull();
      expect(refuse({ fautes: [f] }), f).toMatch(/^fautes : /);
    }
  });

  it("une note sous 8 qui ne tient qu'à des finitions ne compte pas ; avec une autre raison, elle compte", () => {
    const lu = P.lectureDeLaPlanche({ ...v, note: 7 }, ATTENDU);
    expect(lu.raisons).toEqual([]);
    expect(lu.ecartes.join(" | ")).toMatch(/note de 7\/10 non comptée : elle ne tenait qu'à des micro-textes décoratifs, à des mots qualitatifs ou à de petites finitions/);
    expect(P.lectureDeLaPlanche({ ...v, note: 7, copies: ["le harnais"] }, ATTENDU).raisons).toHaveLength(2);
  });

  it("la consigne au relecteur le dit en termes généraux, sans nom ni exemple d'essai", () => {
    expect(P.RELECTEUR_DE_LA_PLANCHE).toContain(P.PETITE_FINITION_DE_LA_PLANCHE);
    expect(P.PETITE_FINITION_DE_LA_PLANCHE).toContain("Un signe parasite isolé, hors des mots, qui ne change aucun mot (un accent, un trait, une barre ou un point égaré) est une petite finition : il ne fait jamais descendre la note sous 8");
    expect(P.PETITE_FINITION_DE_LA_PLANCHE).toContain("Un accent ou une lettre faux dans un mot reste une faute.");
    const aplomb = P.demandeAuRelecteurDeLaPlanche({ nom: "Aplomb", annee: 2026, domaine: { domaine: "aplomb.fr", statut: "disponible" }, personnes: false, animaux: false, texte: "t" });
    expect(`${P.RELECTEUR_DE_LA_PLANCHE}\n${aplomb}`).not.toMatch(/écume|savonnerie|racine|tenon|SEO|référencement|\|´|séparation/i);
  });

  it("de bout en bout : une finition seule, gardée du premier coup ; reprise pour une autre raison, la finition s'ajoute aux corrections, en dernier", async () => {
    const png = await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#FFFFFF" } }).png().toBuffer();
    const valeurs = JSON.parse(fs.readFileSync(`${F}/valeurs-du-metier.json`, "utf8")).valeurs;
    const textes: string[] = [];
    const deps = (verdicts: any[]) => ({ dessiner: async (_l: Buffer, _d: Buffer, t: string) => { textes.push(t); return png; }, relire: async (_b: Buffer[], _l: Buffer, _d: Buffer, _x: string, tour: number) => verdicts[tour - 1], aLaChargeDuStudio: <T,>(fn: () => Promise<T>) => fn() });
    const o = { ...ATTENDU, texte: undefined, valeurs, logo: png, disposition: png };
    const seule = await P.dessinerLaPlanche(deps([v]), o);
    expect(seule.ok).toBe(true);
    expect(textes).toHaveLength(1);
    expect(seule.essais[0].finitions).toEqual([FAUTE_REELLE]);
    textes.length = 0;
    const reprise = await P.dessinerLaPlanche(deps([{ ...v, copies: ["le harnais de la disposition"] }, v]), o);
    expect(reprise.ok).toBe(true);
    expect(textes[1].endsWith(`À corriger : éléments recopiés de la disposition : le harnais de la disposition ; petite finition à nettoyer : « ${FAUTE_REELLE} ».`)).toBe(true);
  });
});

describe("le script des planches : rejuger une planche déjà payée, sans aucun appel", async () => {
  const { rejugerUnePlanche } = await import("../scripts/syna-recette/essai-planches-outil");
  const { ECUME } = await import("./clients-d-essai");
  const preparer = async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rejuger-"));
    for (const n of ["planche-A-2-relecture-verdict.json", "planche-A-2-texte-envoye.txt", "planche-A-2-relecture-demande.txt", "planche-A-resultat.json", "valeurs-du-metier.json", "domaine.json"]) fs.copyFileSync(path.join(F, n), path.join(dir, n));
    fs.writeFileSync(path.join(dir, "planche-A-2-brute.png"), await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#F4EFE6" } }).png().toBuffer());
    fs.writeFileSync(path.join(dir, "rapport.txt"), "Rapport de l'essai payé.\n");
    return dir;
  };

  it("A-2 d'Écume : gardée, écrite comme gardée (image, résultat, rapport), l'original jamais réécrit ; prête pour la planche en vrai", async () => {
    const dir = await preparer();
    const avant = fs.readFileSync(path.join(dir, "planche-A-2-relecture-verdict.json"), "utf8"), resultatAvant = fs.readFileSync(path.join(dir, "planche-A-resultat.json"), "utf8");
    const r = await rejugerUnePlanche({ dossier: dir, key: "A", client: ECUME });
    expect(r).toMatchObject({ key: "A", tour: 2, gardee: true, note: 8, raisons: [], finitions: [FAUTE_REELLE] });
    expect(fs.readFileSync(path.join(dir, "planche-A-2-relecture-verdict.json"), "utf8")).toBe(avant);
    expect(fs.readFileSync(path.join(dir, "planche-A-resultat-avant-rejugement.json"), "utf8")).toBe(`${JSON.stringify(JSON.parse(resultatAvant), null, 2)}\n`);
    expect(fs.readFileSync(path.join(dir, "planche-A-gardee.png"))).toEqual(fs.readFileSync(path.join(dir, "planche-A-2-brute.png")));
    const rejuge = JSON.parse(fs.readFileSync(path.join(dir, "planche-A-2-relecture-verdict-rejuge.json"), "utf8"));
    expect(rejuge).toMatchObject({ gardee: true, aucunAppel: true, raisons: [], finitions: [FAUTE_REELLE] });
    const rapport = fs.readFileSync(path.join(dir, "rapport.txt"), "utf8");
    expect(rapport.startsWith("Rapport de l'essai payé.\n")).toBe(true);
    expect(rapport).toContain("Planche A : GARDÉE (planche-A-gardee.png, note 8/10)");
    expect(rapport).toContain("dépense de ce rejugement : 0 € (aucun appel)");
    expect(rapport).toContain("Planches gardées, prêtes pour le choix : A");
    // La planche en vrai accepte ce résultat (gardée, domaine et année relus).
    const { resultatDeLaPlanche } = await import("../scripts/syna-recette/essai-planche-en-vrai-outil");
    expect(resultatDeLaPlanche(path.join(dir, "planche-A-resultat.json"))).toMatchObject({ nom: "Écume", domaine: "ecumefrance.fr", statut: "disponible", annee: 2026 });
  });

  it("un verdict qui refuse encore reste refusé ; un autre client, une année qui n'est pas celle du texte : rien n'est écrit", async () => {
    const dir = await preparer();
    const f = path.join(dir, "planche-A-2-relecture-verdict.json"), brut = JSON.parse(fs.readFileSync(f, "utf8"));
    fs.writeFileSync(f, JSON.stringify({ ...brut, verdict: { ...brut.verdict, fautes: [...brut.verdict.fautes, "Bloc 08 : « Découvrir la colection »"] } }));
    const r = await rejugerUnePlanche({ dossier: dir, key: "A", client: ECUME });
    expect(r.gardee).toBe(false);
    expect(fs.existsSync(path.join(dir, "planche-A-gardee.png"))).toBe(false);
    expect(fs.readFileSync(path.join(dir, "rapport.txt"), "utf8")).toContain("Planche A : toujours NON gardée");
    await expect(rejugerUnePlanche({ dossier: dir, key: "A", client: { ...ECUME, nom: "Autre" } })).rejects.toThrow(/pas de « Autre »/);
    const res = path.join(dir, "planche-A-resultat.json"), x = JSON.parse(fs.readFileSync(res, "utf8"));
    fs.writeFileSync(res, JSON.stringify({ ...x, planche: { ...x.planche, annee: 2025 } }));
    await expect(rejugerUnePlanche({ dossier: dir, key: "A", client: ECUME })).rejects.toThrow(/ne porte pas/);
    await expect(rejugerUnePlanche({ dossier: dir, key: "B", client: ECUME })).rejects.toThrow(/Aucun verdict de la planche B/);
  });

  it("le script : REJUGER et REJUGER_PLANCHE passent avant toute clé, tout plafond et tout appel", () => {
    const src = fs.readFileSync("scripts/syna-recette/essai-planches.mts", "utf8");
    const i = src.indexOf("if (process.env.REJUGER?.trim())");
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(src.indexOf("STUDIO_ANTHROPIC_KEY) {"));
    expect(i).toBeLessThan(src.indexOf("refusDuPlafond(process.env.PLAFOND_ESSAI_EUR"));
    expect(i).toBeLessThan(src.indexOf("await essaiDesPlanches("));
    const outil = fs.readFileSync("scripts/syna-recette/essai-planches-outil.ts", "utf8");
    const corps = outil.slice(outil.indexOf("export async function rejugerUnePlanche"), outil.indexOf("export type LigneDeDepense"));
    expect(corps).not.toMatch(/vraisAppels|plancheDeLaRoute|\.relire\(|\.dessiner\(|withTrace|findDomains|fetch\(/);
  });
});
