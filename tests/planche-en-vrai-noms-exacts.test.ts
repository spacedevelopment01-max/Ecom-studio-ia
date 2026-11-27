/**
 * LES NOMS DE PRODUITS COMPARÉS AUX NOMS EXACTS DONNÉS PAR LE CLIENT (27 novembre 2026 ; essai réel : docs/studio/
 * essais-complets/images/torrefacteur/5d-reprise-vrais-faits, branche claude/essais-complets, commit d8b3c1b). Sur
 * reference-4, refaite, on lit « CAFÉ MOULUS » et « COFFRETS » sur des étiquettes, alors que le client a donné « Café moulu »
 * et « Coffret découverte » ; rien ne l'avait relevé. Les verdicts, les raisons comptées et les textes envoyés réels sont
 * copiés tels quels dans tests/fixtures/torrefacteur-planche-en-vrai/reprise-vrais-faits, avec le fichier du client et ses
 * réponses (client-avec-faits.json, commit ddbb860 de la même branche). Aucun appel.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import * as P from "@/lib/syna-agent/planche-en-vrai";
import * as F from "@/lib/syna-agent/faits-a-montrer";

const X = "tests/fixtures/torrefacteur-planche-en-vrai";
const R = `${X}/reprise-vrais-faits`;
const client = JSON.parse(fs.readFileSync(`${R}/client-avec-faits.json`, "utf8")) as { produits: string[]; faits: F.FaitAMontrer[] };
const PRODUITS = client.produits, FAITS = F.faitsPermis(client.faits), LOGO = { nom: "Mouture", phrase: ["TORRÉFACTION ARTISANALE"] };
const NOMS = "(noms donnés : « Café en grains », « Café moulu », « Coffret découverte »)";
const inventaire = P.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${X}/inventaire-reponse.json`, "utf8")));
const boites = (JSON.parse(fs.readFileSync(`${X}/cases.json`, "utf8")) as { boites: Record<string, P.Boite> }).boites;
const reprise = [
  ...P.RelectureDuGroupeSchema.parse(JSON.parse(fs.readFileSync(`${R}/relecture-produits-reprise-verdict.json`, "utf8"))).images,
  ...P.RelectureDuGroupeSchema.parse(JSON.parse(fs.readFileSync(`${R}/relecture-references-reprise-verdict.json`, "utf8"))).images,
];
/** Le verdict réel d'une case : « r » pour la reprise du 27 novembre, 1 ou 2 pour les passes de l'étape 5. */
const verdict = (n: P.NomElement, tour: 1 | 2 | "r") => tour === "r" ? reprise.find((v) => v.case === n)
  : P.RelectureDuGroupeSchema.parse(JSON.parse(fs.readFileSync(`${X}/${P.def(n).groupe}-${tour}-verdict.json`, "utf8")).verdict).images.find((v) => v.case === n);
const raisons = (n: P.NomElement, tour: 1 | 2 | "r", o: { faits?: F.FaitsPermis; v?: P.ImageRelue } = {}) => P.raisonsDuRefusEnVrai(o.v ?? verdict(n, tour), {
  inventaire: P.caseLue(inventaire, n), personnes: false, photo: false, element: n, deborde: !!boites[n] && P.entreDansUneBandeDeTitre("standard", boites[n]), logo: LOGO, produits: PRODUITS, ...(o.faits ? { faits: o.faits } : {}) });

describe("les faits réels du client de l'essai", () => {
  it("ses noms exacts sont dans ses faits à montrer ; ceux de la fiche sont autres", () => {
    expect(FAITS.noms).toEqual(["Café en grains", "Café moulu", "Coffret découverte"]);
    expect(PRODUITS).toEqual(["cafés en grains", "cafés moulus", "coffrets"]);
    // Sans noms donnés, rien de plus dans les faits permis (un ancien projet ne change pas).
    expect(F.faitsPermis([{ sujet: "annee", etat: "donne", valeur: "2019", at: 1 }])).toEqual({ mentions: [{ sujet: "annee", libelle: "Année de création", valeur: "2019" }], interdits: [] });
    expect(F.aDesFaits(F.faitsPermis([{ sujet: "noms", etat: "donne", noms: ["Pain de seigle"], at: 1 }]))).toBe(true);
    expect(F.aDesFaits(F.AUCUN_FAIT)).toBe(false);
  });
});

describe("reference-4, verdict réel de la reprise : refusée pour « CAFÉ MOULUS » et « COFFRETS »", () => {
  it("le verdict réel les lit, et rien ne les avait relevés", () => {
    const v = verdict("reference-4", "r")!;
    expect(v.textesLus).toContain("CAFÉ MOULUS");
    expect(v.textesLus).toContain("COFFRETS");
    expect(v.inventes).toEqual([]);
    expect(JSON.parse(fs.readFileSync(`${R}/reference-4-raisons.json`, "utf8"))).toEqual([[]]);
    // Rejugée comme alors (sans les faits du client, que la reprise n'a pas reçus) : gardée, comme alors.
    expect(raisons("reference-4", "r")).toEqual([]);
  });
  it("avec ses faits réels : refusée pour ces deux noms, et pour eux seuls", () => {
    expect(raisons("reference-4", "r", { faits: FAITS })).toEqual([`${P.DEBUT_NOMS_DE_PRODUITS_EN_VRAI}« CAFÉ MOULUS », « COFFRETS » ${NOMS}`]);
  });
  it("produit-2, refaite dans la même reprise, écrit « CAFÉ MOULU » : un nom donné, gardée", () => {
    expect(verdict("produit-2", "r")!.textesLus).toContain("CAFÉ MOULU");
    expect(raisons("produit-2", "r", { faits: FAITS })).toEqual([]);
  });
  it("la reprise ne recopie jamais un nom mal écrit au dessinateur : elle lui rappelle ses noms exacts", () => {
    const r = P.raisonsPourLeDessinateurEnVrai(raisons("reference-4", "r", { faits: FAITS }), { produits: PRODUITS, faits: FAITS });
    expect(r).toEqual(["un nom de produit n'est pas écrit exactement comme le client l'a donné : sur les étiquettes et les emballages, écris seulement ses noms exacts, lettre pour lettre : « Café en grains », « Café moulu », « Coffret découverte »"]);
    const t = P.texteDeLElement({ element: "reference-4", nom: "Mouture", logo: true, photo: false, personnes: false, produits: PRODUITS, faits: FAITS, raisons: r });
    expect(t).not.toMatch(/MOULUS|COFFRETS|Cafés|Coffrets/);
    expect(t).toContain("les noms exacts des produits du client, écrits tels quels : « Café en grains », « Café moulu », « Coffret découverte »");
  });
});

describe("la comparaison, pour tout client qui a donné ses noms", () => {
  const faits = F.faitsPermis([{ sujet: "noms", etat: "donne", noms: ["Pain de seigle", "Brioche tressée"], at: 1 }]);
  const inv = { case: "produit-1", textes: ["FOURNIL"], logo: true } as never as P.CaseLue;
  /** L'aperçu de la case porte « PAIN DE SEI », coupé au bord. */
  const invCoupe = { case: "produit-1", textes: ["FOURNIL", "PAIN DE SEI"], logo: true } as never as P.CaseLue;
  const lue = (textesLus: string[], plus: Partial<P.ImageRelue> = {}) => ({ case: "produit-1", identique: true, textesLus, logoPresent: true, personne: false, logoFonceSurFondSombre: false, produitFidele: null, texteCoupe: false, note: 9, pourquoi: "", ...plus }) as P.ImageRelue;
  const r = (v: P.ImageRelue, f: F.FaitsPermis | null = faits, i = inv) => P.raisonsDuRefusEnVrai(v, { inventaire: i, personnes: false, photo: false, element: "produit-1", logo: { nom: "Fournil" }, produits: ["pains", "brioches"], ...(f ? { faits: f } : {}) });
  it("la casse ne compte pas ; les espaces et les apostrophes sont unifiés", () => {
    expect(r(lue(["FOURNIL", "BRIOCHE TRESSÉE"]))).toEqual([]);
    expect(r(lue(["FOURNIL", "brioche  tressée"]))).toEqual([]);
    expect(F.memeNomExact("L’Épi d'or", "L'ÉPI D'OR")).toBe(true);
  });
  it("chaque lettre et chaque accent comptent ; un nom raccourci, au pluriel ou celui de la fiche fait refuser", () => {
    expect(r(lue(["FOURNIL", "BRIOCHE TRESSEE"]))).toEqual([`${P.DEBUT_NOMS_DE_PRODUITS_EN_VRAI}« BRIOCHE TRESSEE » (noms donnés : « Pain de seigle », « Brioche tressée »)`]);
    expect(r(lue(["FOURNIL", "BRIOCHES TRESSÉES"]))[0]).toMatch(/« BRIOCHES TRESSÉES »/);
    expect(r(lue(["FOURNIL", "BRIOCHE"]))[0]).toMatch(/« BRIOCHE »/);
    expect(r(lue(["FOURNIL", "PAINS"]))[0]).toMatch(/« PAINS »/);
  });
  it("un texte déjà lisible sur l'aperçu de la case reste permis, coupé au bord compris ; le nom du logo n'est jamais un produit", () => {
    expect(r(lue(["FOURNIL", "PAIN DE SEI"]), faits, invCoupe)).toEqual([]);
    expect(r(lue(["FOURNIL", "PAIN DE SEIGLE"]), faits, invCoupe)).toEqual([]);
    // « PAIN », un début de la ligne de l'aperçu : pas un nom refusé (ses mots manquants restent comptés comme avant).
    expect(r(lue(["FOURNIL", "PAIN"]), faits, invCoupe).join(" ")).not.toContain(P.DEBUT_NOMS_DE_PRODUITS_EN_VRAI);
    expect(r(lue(["FOURNIL", "PAIN"]))[0]).toMatch(/« PAIN »/);
    expect(r(lue(["FOURNIL", "BRIOCHES"], { aussiSurLApercu: ["BRIOCHES"] }))).toEqual([]);
    expect(r(lue(["FOURNIL"]))).toEqual([]);
  });
  it("une ligne qui porte plusieurs noms est lue nom par nom ; les noms relevés à part par le relecteur sont comparés aussi", () => {
    expect(r(lue(["FOURNIL", "Pain de seigle · Brioche tressée"]))).toEqual([]);
    expect(r(lue(["FOURNIL", "Pain de seigle · Brioches"]))[0]).toMatch(/« Brioches »/);
    expect(r(lue(["FOURNIL", "BRIOCHE PRESTIGE"], { nomsDeProduits: [{ ou: "boîte", texte: "BRIOCHE PRESTIGE" }] }))[0]).toMatch(/« BRIOCHE PRESTIGE »/);
    expect(r(lue(["FOURNIL", "BRIOCHE TRESSÉE"], { nomsDeProduits: [{ ou: "boîte", texte: "Brioche tressée" }] }))).toEqual([]);
  });
  it("l'exception du logo, la coupe fidèle et les petits textes restent : seuls les noms sont comparés en plus", () => {
    const v = lue(["FOURNIL", "BRIOCHE TRESSÉE", "FOUR"], { texteCoupe: true, coupeCommeSurLApercu: true });
    expect(r(v)).toEqual([]);
    // Un fait inventé reste refusé pour lui-même, sans être compté deux fois.
    expect(r(lue(["FOURNIL", "BRIOCHE TRESSÉE", "Origine Pérou"]))).toEqual([`${P.DEBUT_FAITS_INVENTES_EN_VRAI}« Origine Pérou »`]);
  });
  it("sans noms donnés, rien ne change", () => {
    expect(r(lue(["FOURNIL", "BRIOCHES"]), null)).toEqual([]);
    expect(r(lue(["FOURNIL", "BRIOCHES"]), F.faitsPermis([{ sujet: "annee", etat: "donne", valeur: "2019", at: 1 }]))).toEqual([]);
    expect(P.nomsDeProduitsNonDonnes({}, { attendus: [], lus: ["BRIOCHES"], produits: ["brioches"] })).toEqual([]);
  });
});

describe("le texte envoyé, la demande au relecteur et les images déjà payées", () => {
  it("la ligne des étiquettes donne ses noms exacts ; sans noms donnés, à la lettre près celle d'avant", () => {
    const sans = P.texteDeLElement({ element: "reference-4", nom: "Mouture", logo: true, photo: false, personnes: false, produits: PRODUITS });
    expect(P.texteDeLElement({ element: "reference-4", nom: "Mouture", logo: true, photo: false, personnes: false, produits: PRODUITS, faits: F.AUCUN_FAIT })).toBe(sans);
    const avec = P.texteDeLElement({ element: "reference-4", nom: "Mouture", logo: true, photo: false, personnes: false, produits: PRODUITS, faits: FAITS });
    expect(avec).toContain("la phrase de son logo, les noms exacts des produits du client, écrits tels quels : « Café en grains », « Café moulu », « Coffret découverte », et ces mentions vraies, données par le client, écrites exactement : ");
    expect(avec).not.toMatch(/Cafés|Coffrets/);
    expect(avec).toContain(P.MICRO_TEXTES_EN_VRAI);
    // Ses noms seuls, sans mention : la même tournure que sans faits, ses noms à la place de la fiche.
    const noms = F.faitsPermis([{ sujet: "noms", etat: "donne", noms: ["Café moulu"], at: 1 }]);
    expect(P.ligneDesTextesEnVrai(PRODUITS, noms)).toBe("Les étiquettes et les emballages ne portent que les textes de l'aperçu, le nom de la marque, la phrase de son logo et les noms exacts des produits du client, écrits tels quels : « Café moulu » ; aucune date, aucune origine, aucun chiffre n'y est ajouté.");
    expect(P.texteDeLElement({ element: "produit-1", nom: "Mouture", logo: true, photo: false, personnes: false, faits: noms })).toContain("« Café moulu »");
  });
  it("une image déjà payée n'est jamais repayée : les textes envoyés plus anciens sont reconnus", () => {
    // Le texte réellement envoyé pour reference-4 dans la reprise (les produits de la fiche, sans mention) ...
    const reel = fs.readFileSync(`${R}/reference-4-texte-envoye.txt`, "utf8");
    const raisonsEnvoyees = ["ses textes ne sont pas ceux de l'aperçu, lettre pour lettre (manquent : « CAFÉ »)"];
    expect(P.texteDeLElement({ element: "reference-4", nom: "Mouture", logo: true, photo: false, personnes: false, produits: PRODUITS, raisons: raisonsEnvoyees })).toBe(reel);
    // ... est reconnu à partir du texte d'aujourd'hui, ses noms et ses mentions retirés.
    const aujourdhui = P.texteDeLElement({ element: "reference-4", nom: "Mouture", logo: true, photo: false, personnes: false, produits: PRODUITS, faits: FAITS, raisons: raisonsEnvoyees });
    expect(aujourdhui).not.toBe(reel);
    expect(P.texteSansLesMentionsVraies(aujourdhui, PRODUITS, FAITS)).toBe(reel);
    // Le texte des mentions vraies avant les noms exacts (la ligne aux produits de la fiche, mentions comprises).
    const avantLesNoms = P.texteDeLElement({ element: "reference-4", nom: "Mouture", logo: true, photo: false, personnes: false, produits: PRODUITS, faits: { mentions: FAITS.mentions, interdits: FAITS.interdits } });
    expect(avantLesNoms).toContain("les noms des produits du client : « Cafés en grains », « Cafés moulus », « Coffrets », et ces mentions vraies");
    expect(P.texteSansLesNomsDonnes(P.texteDeLElement({ element: "reference-4", nom: "Mouture", logo: true, photo: false, personnes: false, produits: PRODUITS, faits: FAITS }), PRODUITS, FAITS)).toBe(avantLesNoms);
    // Le script d'essai les reconnaît tous avant de rien relancer.
    const src = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8");
    expect(src).toContain("P.texteSansLesNomsDonnes(d.texte, client.produits, faitsDuClient)");
  });
  it("le relecteur reçoit ses noms exacts et le champ à part, sans aucun nom ni exemple d'essai ; sans noms, la demande d'avant", () => {
    const o = { nom: "Fournil", personnes: false, groupe: "produits" as const, cases: [{ element: "produit-1" as const, photo: false }], produits: ["pains"], phrase: ["PAIN AU LEVAIN"] };
    expect(P.demandeAuRelecteurEnVrai({ ...o, faits: F.AUCUN_FAIT })).toBe(P.demandeAuRelecteurEnVrai(o));
    const d = P.demandeAuRelecteurEnVrai({ ...o, faits: F.faitsPermis([{ sujet: "noms", etat: "donne", noms: ["Pain de seigle"], at: 1 }]) });
    expect(d).toContain("Les noms exacts des produits que la marque vend, donnés par le client : « Pain de seigle ».");
    expect(d).toContain("Réponds aussi, pour chaque case, nomsDeProduits : ");
    expect(d).not.toContain("« pains »");
    for (const t of P.demandeDesNomsDonnes(["X"])) expect(t).not.toMatch(/Mouture|café|coffret|Écume|Racine|Tenon|moulu/i);
    expect(P.ImageRelueSchema.parse({ case: "produit-1", nomsDeProduits: [{ ou: "sachet", texte: "Pain de seigle" }] }).nomsDeProduits).toEqual([{ ou: "sachet", texte: "Pain de seigle" }]);
    expect(P.ImageRelueSchema.parse({ case: "produit-1" }).nomsDeProduits).toBeUndefined();
  });
  it("le réassemblage reprend les faits du fichier du client quand l'essai a été écrit avant ses réponses", () => {
    const src = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8");
    expect(src).toContain("!essai.client.faits?.length && o.clientJson");
    expect(fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai.mts", "utf8")).toContain("clientJson: path.resolve(process.env.CLIENT_JSON)");
    // L'essai réel : son essai.json n'avait pas de faits ; le texte envoyé n'avait ni ses noms ni ses mentions.
    expect(fs.readFileSync(`${R}/reference-4-texte-envoye.txt`, "utf8")).not.toContain("mentions vraies");
  });
});

describe("les 15 images gardées de l'essai, rejugées sur leurs verdicts réels (aucun appel)", () => {
  const GARDEES: [P.NomElement, 1 | 2 | "r"][] = [["publication-1x1", 1], ["publication-4x5", 2], ["publication-9x16", 1], ["ouverture-site", 1], ["ouverture-planche", 1], ["site-ordinateur", 1], ["produit-1", 2], ["produit-2", "r"], ["produit-3", 2], ["emballage", 2], ["reference-1", 1], ["reference-2", 1], ["reference-3", 1], ["reference-4", "r"], ["reference-6", 2]];
  it("sans les faits du client (comme l'essai les a jugées) : les 15 restent gardées", () => {
    for (const [n, t] of GARDEES) expect(raisons(n, t), `${n} ${t}`).toEqual([]);
  });
  it("avec ses faits réels : 11 restent gardées ; reference-4, produit-3, emballage et reference-6 écrivent des noms de la fiche, pas les siens", () => {
    const refusees = GARDEES.filter(([n, t]) => raisons(n, t, { faits: FAITS }).length).map(([n]) => n);
    expect(refusees).toEqual(["produit-3", "emballage", "reference-4", "reference-6"]);
    expect(raisons("produit-3", 2, { faits: FAITS })).toEqual([`${P.DEBUT_NOMS_DE_PRODUITS_EN_VRAI}« CAFÉS EN GRAINS », « CAFÉS MOULUS » ${NOMS}`]);
    expect(raisons("emballage", 2, { faits: FAITS })).toEqual([`${P.DEBUT_NOMS_DE_PRODUITS_EN_VRAI}« Cafés moulus » ${NOMS}`]);
    expect(raisons("reference-6", 2, { faits: FAITS })).toEqual([`${P.DEBUT_NOMS_DE_PRODUITS_EN_VRAI}« Cafés en grains », « Cafés moulus » ${NOMS}`]);
    // L'ouverture de la planche : « Du grain », coupé en « u grain » au bord de l'aperçu, n'est pas un nom de produit à refuser.
    expect(raisons("ouverture-planche", 1, { faits: FAITS })).toEqual([]);
  });
});
