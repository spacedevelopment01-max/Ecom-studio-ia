/**
 * L'essai réel du torréfacteur, étape 4 (26 novembre 2026, deux planches de marque, 0,76 €) : la planche A gardée à 9/10,
 * la planche B refusée deux fois. Trois points, sans aucun appel (verdicts réels copiés tels quels dans
 * tests/fixtures/torrefacteur-planches, les autres simulés) :
 *  1. le signe isolé hors des mots, que le relecteur ne pouvait pas recopier entre deux espaces, est déclaré par lui dans
 *     un champ à part (`signesIsoles`) et rangé en petite finition ; ce qui touche une lettre, un mot, le nom, la phrase du
 *     logo, l'adresse ou l'année reste une faute ;
 *  2. « 100% Arabica » reste refusé : un fait inventé sur le produit, chiffré ;
 *  3. le constat du chef d'orchestre : « Plus grave, et pas vu par le relecteur : la planche B invente des produits. » Le
 *     texte de la planche dit en positif les noms des produits du client ; le contrôle gratuit des valeurs refuse toute
 *     origine, variété ou gamme absente de la fiche ; le relecteur reçoit la liste des produits et relève tout autre nom de
 *     produit lisible (`produitsInventes`), que le code compare à la fiche et qui fait refuser.
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const F = "tests/fixtures/torrefacteur-planches";
const PHRASE = ["TORRÉFACTEUR PASSIONNÉ"];
const SIGNE_REEL = "Bloc 09, boîte kraft : signe parasite sous « commence ici. », un petit crochet en forme de « ? » égaré, hors des mots";
const VIRGULE_REELLE = "Bloc 09, boîte kraft : « Le bon café, commence ici. » : virgule fautive entre le sujet et le verbe";

describe("l'essai réel du torréfacteur, étape 4 : les verdicts réels relus par le code", async () => {
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const valeurs = JSON.parse(fs.readFileSync(`${F}/valeurs-du-metier.json`, "utf8")).valeurs;
  const texte = fs.readFileSync(`${F}/planche-B-2-texte-envoye.txt`, "utf8");
  const ATTENDU = { nom: "Mouture", annee: 2026, domaine: { domaine: "mouturefrance.fr", statut: "disponible" as const }, personnes: false, animaux: false, phrase: PHRASE, texte, produits: valeurs.produits as string[] };
  const brut = (n: string) => JSON.parse(fs.readFileSync(`${F}/${n}`, "utf8"));
  const B2 = brut("planche-B-2-relecture-verdict.json");
  const v = P.VerdictRangeDeLaPlancheSchema.parse(B2.verdict);

  it("les fichiers réels : la fiche dit trois produits, la planche B-2 a été refusée pour la virgule, le signe et « 100% Arabica »", () => {
    expect(valeurs.produits).toEqual(["cafés en grains", "cafés moulus", "coffrets"]);
    expect(fs.readFileSync(`${F}/fiche-du-client.txt`, "utf8")).toContain("cafés en grains, cafés moulus, coffrets");
    expect(B2.gardee).toBe(false);
    expect(v.fautes).toEqual([VIRGULE_REELLE, SIGNE_REEL]);
    expect(v.promesses).toEqual(["Bloc 09, sachet Éthiopie : « 100% Arabica »"]);
    expect(v.note).toBe(8);
    // Le relecteur n'a vu aucun produit inventé : le champ n'existait pas.
    expect(v.produitsInventes).toEqual([]);
    expect(brut("planche-A-1-relecture-verdict.json").gardee).toBe(true);
  });

  it("point 1, tel quel : le signe reste une faute dans fautes (le code ne le reconnaît pas sans le recopier entre deux espaces)", () => {
    expect(P.signeParasiteIsole(SIGNE_REEL, ATTENDU)).toBeNull();
    expect(P.lectureDeLaPlanche(v, ATTENDU).raisons[0]).toContain(SIGNE_REEL);
  });

  it("point 1 : déclaré par le relecteur dans signesIsoles, avec ses mots, le signe devient une petite finition, notée sans refus", () => {
    const declare = { ...v, fautes: [VIRGULE_REELLE], signesIsoles: [{ ou: "Bloc 09, boîte kraft, sous « commence ici. »", description: "un petit crochet en forme de « ? » égaré, hors des mots" }] };
    const lu = P.lectureDeLaPlanche(declare, ATTENDU);
    expect(lu.finitions).toEqual(["signe isolé hors des mots : Bloc 09, boîte kraft, sous “commence ici.” : un petit crochet en forme de “?” égaré, hors des mots"]);
    expect(lu.ecartes).toContain(P.finitionNotee(lu.finitions[0]));
    // La virgule fautive et « 100% Arabica » font toujours refuser.
    expect(lu.raisons).toEqual([`fautes : « ${VIRGULE_REELLE} »`, "promesses ou chiffres inventés : « Bloc 09, sachet Éthiopie : « 100% Arabica » »"]);
    // Sans elles, la planche est gardée, la finition notée ; aucun texte n'en est repris par la planche en vrai.
    const seul = P.lectureDeLaPlanche({ ...declare, fautes: [], promesses: [] }, ATTENDU);
    expect(seul.raisons).toEqual([]);
    expect(P.texteDeLaFinition(seul.finitions[0])).toBeNull();
    expect(P.blocDeLaFinition(seul.finitions[0])).toBe("autre");
    // Une note sous 8 qui ne tient qu'à cette finition ne compte pas.
    expect(P.lectureDeLaPlanche({ ...declare, fautes: [], promesses: [], note: 7 }, ATTENDU).raisons).toEqual([]);
  });

  it("point 1 : un signe déclaré isolé qui touche une lettre, un mot, le nom, la phrase du logo, l'adresse ou l'année reste une faute", () => {
    const base = { ...v, fautes: [], promesses: [] };
    for (const s of [
      { ou: "Bloc 08, accroche du site", description: "un accent collé au mot « caractère »" },
      { ou: "Bloc 06, carte produit", description: "un trait dans le mot « moulus »" },
      { ou: "Bloc 04, titre", description: "un signe sur une lettre, lettre déformée" },
      { ou: "Ouverture, à côté du nom Mouture", description: "un point égaré" },
      { ou: "Bloc 01, sous le logo", description: "un accent égaré" },
      { ou: "Bloc 07, story, à côté de « TORRÉFACTEUR PASSIONNÉ »", description: "un trait égaré" },
      { ou: "Bloc 10, nom de domaine", description: "une barre égarée" },
      { ou: "Bloc 10, après mouturefrance.fr", description: "un point égaré" },
      { ou: "Bloc 10, copyright", description: "un accent égaré" },
      { ou: "Bloc 10, après « 2026 »", description: "un point égaré" },
    ]) {
      const lu = P.lectureDeLaPlanche({ ...base, signesIsoles: [s] }, ATTENDU);
      expect(lu.raisons.join(" "), s.ou).toMatch(/^fautes : « signe déclaré isolé, mais qui touche/);
      expect(lu.finitions, s.ou).toEqual([]);
    }
    // Le nom, l'année et le domaine restent comparés lettre pour lettre, quoi que le relecteur déclare.
    expect(P.lectureDeLaPlanche({ ...base, nomLu: "MOUTURE ´", signesIsoles: [{ ou: "nom", description: "accent" }] }, ATTENDU).raisons.join(" ")).toMatch(/le nom est mal écrit/);
  });

  it("point 2 : « 100% Arabica » reste refusé, un fait chiffré inventé sur le produit", () => {
    expect(P.promesseMesurable("Bloc 09, sachet Éthiopie : « 100% Arabica »")).toBe(true);
    expect(P.lectureDeLaPlanche({ ...v, fautes: [] }, ATTENDU).raisons).toEqual(["promesses ou chiffres inventés : « Bloc 09, sachet Éthiopie : « 100% Arabica » »"]);
  });

  it("point 3 : le verdict réel de B-2, plus le relecteur qui relève « Éthiopie Yirgacheffe » : refusée, avec une raison claire pour la reprise", () => {
    const releve = { ...v, fautes: [], promesses: [], produitsInventes: [{ ou: "Bloc 06, sachet de café moulu", texte: "Éthiopie Yirgacheffe" }] };
    const lu = P.lectureDeLaPlanche(releve, ATTENDU);
    expect(lu.raisons).toEqual(["produits inventés, absents de la fiche du client : « Éthiopie Yirgacheffe » (Bloc 06, sachet de café moulu) ; sur les étiquettes, les emballages, les fiches produits et le site, seulement ses produits, avec ses noms : « Cafés en grains », « Cafés moulus », « Coffrets »"]);
    // La reprise reçoit cette raison à la fin de son texte.
    const reprise = P.texteDeLaPlanche({ nom: "Mouture", valeurs, annee: 2026, domaine: ATTENDU.domaine, personnes: false, phrase: PHRASE, raisons: lu.raisons });
    expect(reprise.endsWith(`À corriger : ${lu.raisons[0]}.`)).toBe(true);
    // Les quatre origines de la planche B : chacune fait refuser.
    for (const o of ["Brésil Sul de Minas", "Éthiopie Yirgacheffe", "Guatemala Antigua", "Colombie"]) expect(P.lectureDeLaPlanche({ ...releve, produitsInventes: [{ ou: "Bloc 06", texte: o }] }, ATTENDU).raisons.join(" "), o).toMatch(/^produits inventés/);
    // Une variété, une gamme, un nom de produit qui n'est pas dans la fiche : aussi.
    for (const o of ["Arabica", "L'Essentiel", "Café en grains Éthiopie", "Coffret découverte des origines"]) expect(P.nomDeProduitPermis(o, valeurs.produits), o).toBe(false);
  });

  it("point 3 : le nom lisible d'un produit de la fiche, au singulier ou au pluriel, est permis, écrit au compte rendu", () => {
    for (const o of ["Café en grains", "CAFÉ EN GRAINS", "Cafés moulus", "Café moulu", "Coffret", "Coffrets", "Coffrets café"]) expect(P.nomDeProduitPermis(o, valeurs.produits), o).toBe(true);
    const lu = P.lectureDeLaPlanche({ ...v, fautes: [], promesses: [], produitsInventes: [{ ou: "Bloc 06", texte: "Café en grains" }, { ou: "Bloc 06", texte: "Coffret" }] }, ATTENDU);
    expect(lu.raisons).toEqual([]);
    expect(lu.ecartes).toEqual(expect.arrayContaining(["nom d'un produit de la fiche, permis : « Café en grains »", "nom d'un produit de la fiche, permis : « Coffret »"]));
    // Sans la liste des produits, rien n'est permis, par prudence.
    expect(P.lectureDeLaPlanche({ ...v, fautes: [], promesses: [], produitsInventes: [{ ou: "Bloc 06", texte: "Café en grains" }] }, { ...ATTENDU, produits: undefined }).raisons.join(" ")).toMatch(/^produits inventés/);
  });
});

describe("point 3 : le texte de la planche, le contrôle gratuit des valeurs, la consigne et la demande au relecteur", async () => {
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const valeurs = JSON.parse(fs.readFileSync(`${F}/valeurs-du-metier.json`, "utf8")).valeurs;
  const fiche = fs.readFileSync(`${F}/fiche-du-client.txt`, "utf8");
  const o = { nom: "Mouture", metier: valeurs.metier, fiche, personnes: false, kind: "produits" as const };
  const ecrites = { nom: "Mouture", traits: valeurs.traits, emotion: valeurs.emotion, images: valeurs.images, produits: valeurs.produits, appel: "devis" as const };

  it("le texte envoyé dit en positif, dans la partie « produits », les noms des produits du client ; le reste ne bouge pas", () => {
    const t = P.texteDeLaPlanche({ nom: "Mouture", valeurs, annee: 2026, domaine: { domaine: "mouturefrance.fr", statut: "disponible" }, personnes: false, phrase: PHRASE });
    const ligne = "Sur les étiquettes, les emballages, les fiches produits et le site, chaque produit porte seulement l'un de ces noms, ceux du client, au singulier pour un seul article : « Cafés en grains », « Cafés moulus », « Coffrets ».";
    expect(P.ligneDesNomsDesProduits(valeurs.produits)).toBe(ligne);
    expect(t).toContain(`Montrer clairement :\n- cafés en grains\n- cafés moulus\n- coffrets\n${ligne}\nLes visuels doivent être propres`);
    // Le texte réel envoyé pour B (avant ses raisons de reprise), mot pour mot, à cette ligne près.
    expect(t.replace(`${ligne}\n`, "")).toBe(fs.readFileSync(`${F}/planche-B-2-texte-envoye.txt`, "utf8").split("\n\nÀ corriger : ")[0]);
    // Aucune origine, aucune variété n'est nommée dans le texte (rien qui donne l'idée d'en inventer).
    expect(t).not.toMatch(/origine|variété|gamme|arabica|éthiopie|brésil/i);
    // Un site de marque (des prestations) ne change pas ; le texte des preuves non plus.
    expect(P.texteAvecLesNomsDesProduits("x", { site: "marque", produits: ["cuisines"] })).toBe("x");
  });

  it("le contrôle gratuit des valeurs : les valeurs réelles passent ; une origine, une variété, une gamme absentes de la fiche sont refusées", () => {
    expect(P.controleDesValeurs(ecrites, o).fautes).toEqual([]);
    const f = (v: Partial<typeof ecrites>) => P.controleDesValeurs({ ...ecrites, ...v }, o).fautes.join(" | ");
    expect(f({ produits: ["cafés en grains d'éthiopie yirgacheffe", "cafés moulus", "coffrets"] })).toMatch(/rien que le client n'a pas donné.*« ethiopie »/);
    expect(f({ images: [...valeurs.images.slice(0, 5), "sachets brésil sul de minas sur une étagère"] })).toMatch(/« bresil »/);
    expect(f({ images: [...valeurs.images.slice(0, 5), "sachets de Guatemala Antigua"] })).toMatch(/« guatemala »/);
    expect(f({ images: [...valeurs.images.slice(0, 5), "sachets de Yirgacheffe"] })).toMatch(/« Yirgacheffe »/);
    expect(f({ images: [...valeurs.images.slice(0, 5), "paquets de différentes origines"] })).toMatch(/« origines »/);
    expect(f({ emotion: "le goût de nos variétés rares" })).toMatch(/« varietes »/);
    expect(f({ produits: ["cafés en grains", "cafés moulus", "coffret gamme prestige"] })).toMatch(/« gamme »/);
    expect(f({ images: [...valeurs.images.slice(0, 5), "sachets de colombie"] })).toMatch(/ses produits, avec ses mots : « cafés en grains », « cafés moulus », « coffrets »/);
    // Ce qui est dans la fiche reste permis ; « haut de gamme » n'est pas une gamme.
    expect(P.controleDesValeurs({ ...ecrites, images: [...valeurs.images.slice(0, 5), "sachets de colombie"] }, { ...o, fiche: `${fiche}\n- Origines : « Colombie »` }).fautes).toEqual([]);
    expect(f({ traits: ["artisanale", "chaleureuse", "haut de gamme"] })).toBe("");
  });

  it("la consigne au relecteur : les produits inventés et les signes isolés, en termes généraux, sans nom ni exemple d'essai", () => {
    const R = P.RELECTEUR_DE_LA_PLANCHE;
    expect(R).toContain("- produitsInventes : chaque nom de produit lisible qui n'est pas l'un des produits de la marque donnés dans la demande");
    expect(R).toContain("Le nom d'un produit de la marque, au singulier ou au pluriel, n'en est pas un.");
    expect(R).toContain("- signesIsoles : chaque petit signe égaré hors des mots");
    expect(P.PETITE_FINITION_DE_LA_PLANCHE).toContain("Mets-le dans signesIsoles, jamais dans fautes");
    expect(R).toContain(P.PETITE_FINITION_DE_LA_PLANCHE);
    expect(R).not.toMatch(/mouture|torréf|arabica|éthiopie|brésil|yirgacheffe|guatemala|colombie|crochet|commence ici|kraft|écume|racine|tenon|SEO|sac/i);
    const d = P.demandeAuRelecteurDeLaPlanche({ nom: "Mouture", annee: 2026, domaine: { domaine: "mouturefrance.fr", statut: "disponible" }, personnes: false, animaux: false, phrase: PHRASE, produits: valeurs.produits, texte: "t" });
    expect(d).toContain("Les produits que la marque vend, donnés par le client : « cafés en grains », « cafés moulus », « coffrets ».");
    // Sans liste, la demande est celle d'avant.
    expect(P.demandeAuRelecteurDeLaPlanche({ nom: "Mouture", annee: 2026, domaine: { domaine: "mouturefrance.fr", statut: "disponible" }, personnes: false, animaux: false, texte: "t" })).not.toMatch(/produits que la marque vend/);
  });

  it("la planche entière : le relecteur reçoit les produits ; un produit inventé fait refaire la planche, la raison à la fin du texte", async () => {
    const { aLaChargeDuStudio } = await import("@/lib/billing");
    const png = await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#FFFFFF" } }).png().toBuffer();
    const bon = { nomLu: "MOUTURE", logoFidele: true, copyrightLu: "© 2026 Mouture", domaineLu: "mouturefrance.fr — disponible", fautes: [], promesses: [], personnes: false, logoFonceSurFondSombre: false, motMaquette: false, copies: [], note: 9, pourquoi: "", phrasesLues: [{ emplacement: "logo", lignes: PHRASE, cachee: false }] };
    const textes: string[] = [], demandes: string[] = [];
    const r = await P.dessinerLaPlanche({
      dessiner: async (_l, _d, t) => { textes.push(t); return png; },
      relire: async (_b, _l, _d, demande, tour) => { demandes.push(demande); return tour === 1 ? { ...bon, produitsInventes: [{ ou: "Bloc 09, sachet", texte: "Éthiopie Yirgacheffe" }] } : bon; },
      aLaChargeDuStudio,
    }, { nom: "Mouture", annee: 2026, domaine: { domaine: "mouturefrance.fr", statut: "disponible" }, personnes: false, animaux: false, phrase: PHRASE, valeurs, logo: png, disposition: png });
    expect(r.ok).toBe(true);
    expect(textes).toHaveLength(2);
    expect(demandes[0]).toContain("« cafés en grains », « cafés moulus », « coffrets »");
    expect(textes[1]).toMatch(/À corriger : produits inventés, absents de la fiche du client : « Éthiopie Yirgacheffe » \(Bloc 09, sachet\)/);
  });
});
