/**
 * La phrase sous le nom des esquisses (24 novembre 2026 au soir ; le propriétaire : « Non ça donne des idées de slogan, le
 * seul truc c'est que si le client veux le slogan de la 5 et le logo 1, sina doit pouvoir le faire »). Aucun appel payant :
 * la lecture par le relecteur, le contrôle d'orthographe du code, le choix du client (outil et carte), la finalisation, la
 * relecture du logo fini et la tâche de fond, avec de faux appels.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { RELECTEUR_DES_ESQUISSES, RelectureEsquissesSchema, appliquerLaRelecture, type RelectureEsquisses } from "@/lib/syna-agent/esquisses";
import { fautesEvidentes, phraseDeLEsquisse, phraseExacte, phraseVoulue } from "@/lib/syna-agent/phrase-sous-le-nom";
import { LIGNE_D_EVOLUTION, consigneDeFinalisation, controleDuTexte, demandeAuRelecteurDuLogo, finaliserUneEsquisse, ligneDeLaPhrase, raisonsDuRefus, type FinalisationDeps, type RelectureDuLogo } from "@/lib/syna-agent/logo-finalisation";
import { messageDuChoix, messageDuChoixAvecPhrases } from "@/lib/syna-agent/choix-esquisses";

process.env.STUDIO_SYNA_AGENT = "1";

const NOM = "Reflet", METIER = "une entreprise de nettoyage de voitures, intérieur et extérieur";
const TEXTE = `Transforme cette esquisse en véritable logo contemporain pour ${NOM}, ${METIER}. Conserve l'idée centrale : un éclat sur le t. Fais évoluer cette idée vers une identité plus aboutie et plus distinctive. style vectoriel, fond blanc uni, pas de maquette, pas d'ombre, pas d'effet 3D, pas de texture réaliste, pas de dégradé excessif`;
const avecPhrase = (p: string) => TEXTE.replace("Fais évoluer", `Écris en petit sous le nom, exactement : « ${p} ». Fais évoluer`);

describe("1. la lecture : le relecteur relève la phrase mot pour mot, le code vérifie l'orthographe", () => {
  it("la consigne du relecteur des esquisses demande la phrase mot pour mot (ou « aucune ») et si elle est bien écrite", () => {
    expect(RELECTEUR_DES_ESQUISSES).toContain("phraseSousLeNom : la petite phrase écrite sous le nom, recopiée mot pour mot, lettre pour lettre, accents et ponctuation compris, sans rien corriger (« aucune » s'il n'y en a pas)");
    expect(RELECTEUR_DES_ESQUISSES).toMatch(/phraseBienEcrite : cette phrase est en bon français, sans aucune faute d'orthographe/);
    // Une réponse d'avant, sans ces champs, se lit encore (aucune phrase).
    const ancien = RelectureEsquissesSchema.parse({ esquisses: [{ numero: 1, entiere: true, morceauDeVoisine: false, nomLu: NOM, arche: false, ok: true, pourquoi: "", piste: "" }] });
    expect(ancien.esquisses[0].phraseSousLeNom).toBeUndefined();
  });
  it("les fautes évidentes sont refusées par le code ; une phrase propre passe", () => {
    for (const ok of ["Nettoyage automobile intérieur & extérieur", "L'éclat de votre voiture", "Fait main à Lyon depuis 1998", "Lavage à domicile, 7j/7", "NETTOYAGE AUTO", "Made in France"]) expect(fautesEvidentes(ok), ok).toEqual([]);
    expect(fautesEvidentes("Nettoyagge automobile")).toEqual([]); // plausible : seul le relecteur peut le voir
    expect(fautesEvidentes("Brillannnce garantie")).toContain("une lettre répétée trois fois");
    expect(fautesEvidentes("Le lavage made with love")).toContain("un mélange de français et d'anglais");
    expect(fautesEvidentes("Lavage Ωmega")[0]).toMatch(/caractères étranges \(Ω\)/);
    expect(fautesEvidentes("Lav@ge auto")[0]).toMatch(/caractères étranges \(@\)/);
    expect(fautesEvidentes("Net1oyage auto")[0]).toMatch(/chiffre au milieu d'un mot/);
    expect(fautesEvidentes("NetToyage auto")[0]).toMatch(/majuscule au milieu d'un mot/);
    expect(fautesEvidentes("Nkrtg auto")[0]).toMatch(/sans voyelle/);
    expect(fautesEvidentes("Lavage , auto")).toContain("une ponctuation doublée ou mal placée");
    expect(fautesEvidentes("Lavage auto..")).toContain("une ponctuation doublée ou mal placée");
    expect(fautesEvidentes("x".repeat(30) + " " + "lavage ".repeat(20))).toContain("trop longue pour tenir sous un nom");
  });
  it("une phrase n'est proposable que si le relecteur la juge bien écrite ET si le code ne voit rien d'évident", () => {
    expect(phraseDeLEsquisse("aucune", false)).toBeUndefined();
    expect(phraseDeLEsquisse("", true)).toBeUndefined();
    expect(phraseDeLEsquisse(" « Nettoyage  automobile » ", true)).toEqual({ texte: "Nettoyage automobile", ok: true });
    expect(phraseDeLEsquisse("Nettoyagge automobile", false)).toEqual({ texte: "Nettoyagge automobile", ok: false, raisons: ["le relecteur n'est pas sûr de son orthographe"] });
    expect(phraseDeLEsquisse("Brillannnce garantie", true)).toMatchObject({ ok: false, raisons: ["une lettre répétée trois fois"] });
    expect(phraseDeLEsquisse("Nettoyage automobile", undefined)?.ok).toBe(false);
  });
  it("la phrase est gardée avec l'esquisse ; une esquisse sans phrase n'en a pas ; la phrase ne fait jamais refuser l'esquisse", () => {
    const c = [0, 1, 2].map((i) => ({ modele: "m", index: i, png: Buffer.from("x"), requestId: null }));
    const v: RelectureEsquisses = { esquisses: [
      { numero: 1, entiere: true, morceauDeVoisine: false, nomLu: NOM, arche: false, ok: true, pourquoi: "", piste: "a", phraseSousLeNom: "Nettoyage automobile", phraseBienEcrite: true },
      { numero: 2, entiere: true, morceauDeVoisine: false, nomLu: NOM, arche: false, ok: true, pourquoi: "", piste: "b", phraseSousLeNom: "aucune", phraseBienEcrite: false },
      { numero: 3, entiere: true, morceauDeVoisine: false, nomLu: NOM, arche: false, ok: true, pourquoi: "", piste: "c", phraseSousLeNom: "Brilance garantie", phraseBienEcrite: false },
    ] };
    const a = appliquerLaRelecture(NOM, c, v, 1);
    expect(a.refusees).toEqual([]);
    expect(a.gardees.map((g) => g.phrase)).toEqual([{ texte: "Nettoyage automobile", ok: true }, undefined, { texte: "Brilance garantie", ok: false, raisons: ["le relecteur n'est pas sûr de son orthographe"] }]);
  });
});

describe("2. le choix : librement, la phrase d'une autre esquisse, aucune, ou la sienne mot pour mot", async () => {
  const { controleDesPhrases, vueDesEsquisses } = await import("@/lib/syna-agent/logo-graphistes");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const etat = { esquisses: [
    { numero: 1, assetId: "a1", modele: "m", piste: "", tour: 1, recherche: 1, requestId: null },
    { numero: 5, assetId: "a5", modele: "m", piste: "", tour: 1, recherche: 1, requestId: null, phrase: { texte: "L'éclat de votre voiture", ok: true } },
    { numero: 6, assetId: "a6", modele: "m", piste: "", tour: 1, recherche: 1, requestId: null, phrase: { texte: "Brilance garantie", ok: false, raisons: ["le relecteur n'est pas sûr de son orthographe"] } },
  ] };
  it("le logo 1 avec la phrase de la 5, le logo 5 sans phrase, le logo 6 avec sa phrase reprise mot pour mot", async () => {
    const r = await fr(() => controleDesPhrases(etat, [1, 5, 6], [{ logo: 1, de: 5 }, { logo: 5, aucune: true }, { logo: 6, texte: "Votre voiture comme neuve, chez vous" }], ["Je prends le 1, le 5 et le 6. Pour le 6 je veux : Votre voiture comme neuve, chez vous"]));
    expect(r).toEqual({ ok: true, phrases: { 1: { de: 5, texte: "L'éclat de votre voiture" }, 5: { aucune: true }, 6: { sienne: true, texte: "Votre voiture comme neuve, chez vous" } } });
  });
  it("une phrase dont l'orthographe n'est pas sûre n'est pas proposée telle quelle ; il peut écrire la sienne", async () => {
    const r = await fr(() => controleDesPhrases(etat, [1, 5], [{ logo: 1, de: 6 }], []));
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.faute).toMatch(/n'est pas proposée telle quelle : son orthographe n'est pas sûre\. Tu peux écrire la tienne/);
  });
  it("sa phrase doit figurer mot pour mot dans ses messages (jamais corrigée ni reformulée par SINA)", async () => {
    const r = await fr(() => controleDesPhrases(etat, [1, 5], [{ logo: 1, texte: "Votre voiture comme neuve" }], ["je veux « votre voiture, comme neuve »"]));
    expect(r).toMatchObject({ ok: false, interne: true });
    if (!r.ok) expect(r.faute).toMatch(/ne figure pas mot pour mot dans ses messages/);
  });
  it("refuse un logo qui n'est pas choisi, une esquisse sans phrase, et deux choses à la fois", async () => {
    expect(await fr(() => controleDesPhrases(etat, [1, 5], [{ logo: 6, aucune: true }], []))).toMatchObject({ ok: false });
    expect(await fr(() => controleDesPhrases(etat, [1, 5], [{ logo: 1, de: 1 }], []))).toMatchObject({ ok: false });
    expect(await fr(() => controleDesPhrases(etat, [1, 5], [{ logo: 1, de: 5, aucune: true }], []))).toMatchObject({ ok: false, interne: true });
    expect(await fr(() => controleDesPhrases(etat, [1, 5], [], []))).toEqual({ ok: true, phrases: {} });
  });
  it("la vue des esquisses garde la phrase et dit si elle est proposée", () => {
    const v = vueDesEsquisses({ nom: NOM, max: 2, esquisses: etat.esquisses, refusees: 0, planches: [], recherches: 1, notes: [], at: 1, phrases: { 1: { de: 5, texte: "L'éclat de votre voiture" } } }, (id) => `/a/${id}`)!;
    expect(v.list.map((e) => e.phrase)).toEqual([undefined, { texte: "L'éclat de votre voiture", ok: true }, { texte: "Brilance garantie", ok: false }]);
    expect(v.phrases).toEqual({ 1: { de: 5, texte: "L'éclat de votre voiture" } });
  });
  it("le message de la carte : exactement celui d'avant sans phrase choisie ; sinon une phrase par logo, ses mots tels quels", () => {
    expect(messageDuChoixAvecPhrases([7, 3, 11], {})).toBe(messageDuChoix([3, 7, 11]));
    expect(messageDuChoixAvecPhrases([3, 7], { 3: { sienne: "  " } })).toBe("Je choisis les esquisses 3 et 7");
    expect(messageDuChoixAvecPhrases([1, 3, 7], { 1: { de: 5, texte: "L'éclat de votre voiture" }, 3: { aucune: true }, 7: { sienne: "Votre voiture comme neuve" } }))
      .toBe("Je choisis les esquisses 1, 3 et 7. Pour le logo 1 : la phrase de l'esquisse 5, « L'éclat de votre voiture ». Pour le logo 3 : sans phrase. Pour le logo 7 : ma phrase « Votre voiture comme neuve ».");
    expect(messageDuChoixAvecPhrases([1, 3], { 1: { aucune: true } }, "en")).toBe("I choose sketches 1 and 3. For logo 1: no line.");
  });
  it("la carte montre la phrase de chaque esquisse, ou dit qu'elle n'est pas proposée", async () => {
    const { EsquissesCards } = await import("@/components/studio/syna-thread");
    const esquisses = { max: 2, choix: [] as number[], list: [{ numero: 1, href: "/a/1.png", piste: "" }, { numero: 5, href: "/a/5.png", piste: "", phrase: { texte: "L'éclat de votre voiture", ok: true } }, { numero: 6, href: "/a/6.png", piste: "", phrase: { texte: "Brilance garantie", ok: false } }], logos: [] };
    const html = renderToStaticMarkup(createElement(EsquissesCards, { esquisses, busy: false, onChoose: () => undefined }));
    expect(html).toContain('data-esquisse-phrase="5"');
    expect(html).toContain("« L&#x27;éclat de votre voiture »");
    expect(html).toContain('data-esquisse-phrase-douteuse="6"');
    expect(html).not.toContain("Brilance garantie");
    expect(html).toContain("son orthographe n&#x27;est pas sûre");
  });
});

describe("2 bis. les outils logo.choisir et logo.autre", async () => {
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const { addMessage } = await import("@/lib/syna-agent/store");
  const J = await import("@/lib/syna-agent/journey");
  const G = await import("@/lib/syna-agent/logo-graphistes");
  const { logoTools } = await import("@/lib/syna-agent/tools/logo");
  const { one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const preparer = async () => {
    const user = await account(), projectId = project(user) as string, cid = threadFor(user, projectId);
    J.updateJourney(cid, (j) => { j.graphistes = { nom: NOM, metier: { metier: METIER, court: "le nettoyage automobile", piste: "savoir-faire" }, max: 3, esquisses: [1, 2, 5, 6].map((numero) => ({ numero, assetId: `a${numero}`, modele: "m", piste: "", tour: 1, recherche: 1, requestId: null, ...(numero === 5 ? { phrase: { texte: "L'éclat de votre voiture", ok: true } } : numero === 6 ? { phrase: { texte: "Brilance garantie", ok: false } } : {}) })), refusees: 0, planches: [], recherches: 1, notes: [], at: 1, finalisationsAccordees: G.devisDesFinalisations(3).maxMicro }; });
    return { user, projectId, cid, ctx: { user, projectId, conversationId: cid, runId: `run-phrase-${Date.now()}-${Math.random()}`, attachment: () => null } as any };
  };
  it("logo.choisir garde les phrases choisies, les dit, et ne prend sa phrase que mot pour mot", async () => {
    const t = await preparer();
    const choisir = logoTools.find((x) => x.name === "logo.choisir")!;
    addMessage(t.cid, "user", { text: "Je choisis les esquisses 1, 2 et 5. Pour le logo 1 : la phrase de l'esquisse 5. Pour le logo 2 : ma phrase « Lavage à domicile, 7j/7 ». Pour le logo 5 : sans phrase.", attachments: [] });
    // Une phrase reformulée par SINA est refusée, sans rien lancer.
    const mauvais = await fr(() => choisir.run(t.ctx, { esquisses: [1, 2, 5], phrases: [{ logo: 2, texte: "Lavage à domicile 7 jours sur 7" }] })) as any;
    expect(mauvais).toMatchObject({ ok: false, internal: true });
    expect(J.journeyOf(t.cid).graphistes!.choix).toBeUndefined();
    // La phrase douteuse de la 6 n'est pas proposée.
    expect(await fr(() => choisir.run(t.ctx, { esquisses: [1, 2, 5], phrases: [{ logo: 1, de: 6 }] }))).toMatchObject({ ok: false });
    const r = await fr(() => choisir.run(t.ctx, { esquisses: [5, 2, 1], phrases: [{ logo: 1, de: 5 }, { logo: 2, texte: "Lavage à domicile, 7j/7" }, { logo: 5, aucune: true }] })) as any;
    expect(r.ok).toBe(true);
    expect(J.journeyOf(t.cid).graphistes!.phrases).toEqual({ 1: { de: 5, texte: "L'éclat de votre voiture" }, 2: { sienne: true, texte: "Lavage à domicile, 7j/7" }, 5: { aucune: true } });
    expect(r.summary).toContain("Noté aussi : le logo 1 avec la phrase de l'esquisse 5, « L'éclat de votre voiture » ; le logo 2 avec ta phrase, mot pour mot : « Lavage à domicile, 7j/7 » ; le logo 5 sans phrase.");
    expect(r.jobs).toHaveLength(1);
  });
  it("sans phrase dite, rien ne change : aucune phrase n'est notée", async () => {
    const t = await preparer();
    const choisir = logoTools.find((x) => x.name === "logo.choisir")!;
    const r = await fr(() => choisir.run(t.ctx, { esquisses: [1, 2] })) as any;
    expect(r.ok).toBe(true);
    expect(J.journeyOf(t.cid).graphistes!.phrases).toEqual({});
    expect(r.summary).not.toContain("Noté aussi");
  });
  it("logo.autre prend aussi la phrase d'une autre esquisse", async () => {
    const t = await preparer();
    const autre = logoTools.find((x) => x.name === "logo.autre")!;
    expect(autre.args.safeParse({ esquisse: 2, phrase: { de: 5 } }).success).toBe(true);
    expect(autre.args.safeParse({ esquisse: 2, phrase: { de: 5, logo: 1 } }).success).toBe(false);
    const r = await fr(() => autre.run(t.ctx, { esquisse: 2, phrase: { de: 5 } })) as any;
    expect(r.ok).toBe(true);
    expect(J.journeyOf(t.cid).graphistes!.phrases).toEqual({ 2: { de: 5, texte: "L'éclat de votre voiture" } });
    expect(JSON.parse(one<any>("SELECT payload FROM jobs WHERE id=?", r.jobs[0]).payload)).toMatchObject({ phase: "finalisation", numeros: [2] });
  });
});

describe("3. la finalisation : la phrase choisie écrite exactement, une seule ligne de plus dans la consigne", () => {
  it("sans choix du client, la consigne ne change pas ; avec son choix, une seule ligne, juste après la ligne descriptive", () => {
    const base = consigneDeFinalisation(NOM, METIER);
    expect(consigneDeFinalisation(NOM, METIER, undefined)).toBe(base);
    const p = { texte: "L'éclat de votre voiture" };
    const c = consigneDeFinalisation(NOM, METIER, p);
    expect(c.replace(`${ligneDeLaPhrase(p)}\n`, "")).toBe(base);
    expect(ligneDeLaPhrase(p)).toBe("- le client a choisi la phrase à écrire en petit sous le nom : demande de l'écrire exactement « L'éclat de votre voiture », sans en changer une lettre ni un accent ; elle remplace la ligne descriptive.");
    expect(c).toContain(`toute autre phrase est retirée.\n${ligneDeLaPhrase(p)}\nN'ajoute aucune idée`);
    expect(consigneDeFinalisation(NOM, METIER, { aucune: true }).replace(`${ligneDeLaPhrase({ aucune: true })}\n`, "")).toBe(base);
    expect(c).toContain(LIGNE_D_EVOLUTION);
  });
  it("le contrôle gratuit vérifie que la phrase choisie figure mot pour mot dans le texte ; elle ne compte pas dans les dix phrases", () => {
    const p = { texte: "Lavage à domicile. Partout. Toujours." };
    expect(controleDuTexte(avecPhrase(p.texte), NOM, METIER, p)).toEqual([]);
    expect(controleDuTexte(TEXTE, NOM, METIER, p)).toEqual(["il doit demander d'écrire sous le nom, exactement, la phrase choisie par le client : « Lavage à domicile. Partout. Toujours. »"]);
    expect(controleDuTexte(avecPhrase("Lavage a domicile. Partout. Toujours."), NOM, METIER, p)).toHaveLength(1);
    expect(controleDuTexte(TEXTE, NOM, METIER)).toEqual([]);
  });
});

describe("4. la relecture du logo fini : jamais « inventée », écrite lettre pour lettre", () => {
  const bon: RelectureDuLogo = { nomLu: NOM, ideeConservee: true, arche: false, phrase: "", phraseDitLeMetier: false, note: 9, pourquoi: "" };
  const p = { texte: "L'éclat de votre voiture" };
  it("une phrase choisie qui ne dit pas le métier n'est jamais refusée comme inventée ; mal écrite ou absente, le logo est refusé", () => {
    expect(raisonsDuRefus({ ...bon, phrase: "L’ÉCLAT DE VOTRE VOITURE", phraseDitLeMetier: false }, NOM, p)).toEqual([]);
    expect(raisonsDuRefus({ ...bon, phrase: "L'éclat de votre voiture.", phraseDitLeMetier: false }, NOM, p)).toEqual([]);
    expect(raisonsDuRefus({ ...bon, phrase: "L'eclat de votre voiture" }, NOM, p)).toEqual(["la phrase choisie par le client est mal écrite (« L'eclat de votre voiture » au lieu de « L'éclat de votre voiture »)"]);
    expect(raisonsDuRefus({ ...bon, phrase: "L'éclat de vos voitures" }, NOM, p)).toHaveLength(1);
    expect(raisonsDuRefus(bon, NOM, p)).toEqual(["la phrase choisie par le client (« L'éclat de votre voiture ») n'y est pas écrite"]);
    // Sans phrase voulue : la règle d'avant (une phrase qui ne dit pas le métier est inventée).
    expect(raisonsDuRefus({ ...bon, phrase: "L'éclat de votre voiture" }, NOM)[0]).toMatch(/inventée et ne dit pas le vrai métier/);
    // « Aucune » : toute phrase fait refuser le logo.
    expect(raisonsDuRefus({ ...bon, phrase: "Nettoyage automobile", phraseDitLeMetier: true }, NOM, { aucune: true })).toEqual(["le client ne veut aucune phrase sous le nom, et le logo porte « Nettoyage automobile »"]);
    expect(raisonsDuRefus(bon, NOM, { aucune: true })).toEqual([]);
    expect(phraseExacte("  l'éclat  de votre voiture ", "L’éclat de votre voiture")).toBe(true);
    expect(phraseExacte("L'éclat de votre voiture !", "L'éclat de votre voiture")).toBe(false);
  });
  it("le relecteur reçoit la phrase choisie, avec la consigne de la lire lettre pour lettre", () => {
    const d = demandeAuRelecteurDuLogo({ nom: NOM, metier: METIER, texte: TEXTE, phrase: p });
    expect(d).toContain("Le client a choisi la phrase à écrire sous le nom : « L'éclat de votre voiture ». Elle n'est pas inventée : vérifie seulement qu'elle est écrite exactement, lettre pour lettre");
    expect(demandeAuRelecteurDuLogo({ nom: NOM, metier: METIER, texte: TEXTE, phrase: { aucune: true } })).toContain("Le client ne veut aucune phrase sous le nom.");
    expect(demandeAuRelecteurDuLogo({ nom: NOM, metier: METIER, texte: TEXTE })).not.toMatch(/a choisi la phrase|aucune phrase/);
  });
  it("de bout en bout : la phrase dans la consigne, chez le relecteur ; mal écrite, le logo est refait une fois avec la raison", async () => {
    const logo = () => sharp({ create: { width: 600, height: 300, channels: 3, background: "#FFFFFF" } }).composite([{ input: { create: { width: 300, height: 90, channels: 3, background: "#1F3D5B" } }, left: 150, top: 100 }]).png().toBuffer();
    const vu = { consignes: [] as string[], textes: [] as string[], demandes: [] as string[] };
    const verdicts = [{ ...bon, phrase: "L'eclat de votre voiture" }, { ...bon, phrase: "L'éclat de votre voiture" }];
    const d: FinalisationDeps = {
      rediger: async (consigne) => { vu.consignes.push(consigne); return { idee_centrale: "un éclat", texte: avecPhrase(p.texte) }; },
      finaliser: async (_e, t) => { vu.textes.push(t); return logo(); },
      relire: async (_l, _e, demande) => { vu.demandes.push(demande); return verdicts.shift()!; },
      detourer: async (png) => ({ ok: true, png }),
      aLaChargeDuStudio: async (fn) => fn(),
    };
    const r = await finaliserUneEsquisse(d, { nom: NOM, metier: METIER, esquisse: await logo(), phrase: p });
    expect(r.ok).toBe(true);
    expect(vu.consignes[0]).toContain(ligneDeLaPhrase(p));
    expect(vu.demandes.every((x) => x.includes("« L'éclat de votre voiture »"))).toBe(true);
    expect(vu.textes[1]).toBe(`${avecPhrase(p.texte)} À corriger : la phrase choisie par le client est mal écrite (« L'eclat de votre voiture » au lieu de « L'éclat de votre voiture »).`);
  });
  it("phraseVoulue : de l'esquisse et la sienne donnent un texte exact, « aucune » donne aucune", () => {
    expect(phraseVoulue(undefined)).toBeUndefined();
    expect(phraseVoulue({ de: 5, texte: "a" })).toEqual({ texte: "a" });
    expect(phraseVoulue({ sienne: true, texte: "b" })).toEqual({ texte: "b" });
    expect(phraseVoulue({ aucune: true })).toEqual({ aucune: true });
  });
});

describe("la tâche de fond : la phrase relevée est rangée, proposée en une phrase, puis donnée à la finalisation", async () => {
  const { account, project } = await import("./conversation209-fixtures");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const J = await import("@/lib/syna-agent/journey");
  const G = await import("@/lib/syna-agent/logo-graphistes");
  const T = await import("@/lib/syna-agent/logo-graphistes-tache");
  const { one, run } = await import("@/lib/db");
  const { JobContext } = await import("@/lib/jobs");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { questionSurLeLogo } = await import("@/lib/syna-agent/controle-message");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const dessin = (cx: number, cy: number) => [
    { input: { create: { width: 80, height: 80, channels: 3 as const, background: "#E0703A" } }, left: cx - 40, top: cy - 100 },
    ...Array.from({ length: 5 }, (_v, i) => ({ input: { create: { width: 44, height: 80, channels: 3 as const, background: "#1F3D5B" } }, left: cx - 150 + i * 62, top: cy + 10 })),
  ];
  const planche = () => sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#FFFFFF" } }).composite([0, 1].flatMap((r) => [0, 1, 2].flatMap((c) => dessin(256 + c * 512, 256 + r * 512)))).png().toBuffer();
  const logoFini = () => sharp({ create: { width: 800, height: 300, channels: 3, background: "#FFFFFF" } }).composite([{ input: { create: { width: 400, height: 120, channels: 3, background: "#0B2545" } }, left: 100, top: 90 }]).png().toBuffer();
  const tache = async (user: { id: string }, projectId: string, payload: Record<string, unknown>) => {
    const jid = `job-phrase-${Date.now()}-${Math.random()}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, user.id, projectId, T.LOGO_GRAPHISTES_JOB, "logo", JSON.stringify({ projectId, ...payload }), "running", Date.now(), Date.now(), Date.now());
    const out = await fr(() => T.runLogoGraphistesJob(new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid))));
    run("UPDATE jobs SET status='done' WHERE id=?", jid);
    return out;
  };
  it("recherche puis finalisation avec la phrase de la 5 pour le logo 1", async () => {
    const user = await account(), projectId = project(user) as string, cid = threadFor(user, projectId);
    J.updateJourney(cid, (j) => { j.start.offer = { value: "Je nettoie les voitures à domicile.", status: "answered", source: "client", at: Date.now() } as never; });
    const vu = { consignes: [] as string[], demandes: [] as string[] };
    G.graphistesDeps.ai = () => ({
      metier: async () => ({ metier: METIER, court: "le nettoyage automobile", piste: "savoir-faire" }),
      planche: async (modele, prompt) => ({ png: await planche(), recu: { endpoint: "POST /v1/images/generations", modele, texteEnvoye: prompt, reglages: {}, requestId: `req_${modele}`, usage: null, coutMicro: 1, dureeMs: 1 } }),
      relireEsquisses: async (images) => ({ esquisses: images.map((_b, i) => ({ numero: i + 1, entiere: true, morceauDeVoisine: false, nomLu: NOM, arche: false, ok: true, pourquoi: "", piste: `piste ${i + 1}`, phraseSousLeNom: i === 4 ? "L'éclat de votre voiture" : i === 5 ? "Brillannnce garantie" : "aucune", phraseBienEcrite: i === 4 || i === 5 })) }),
      rediger: async (consigne) => { vu.consignes.push(consigne); return { idee_centrale: "un éclat", texte: avecPhrase("L'éclat de votre voiture") }; },
      finaliser: async (_e, t) => ({ png: await logoFini(), recu: { endpoint: "POST /v1/images/edits (multipart, image[])", modele: "gpt-image-2.6-sunburst", texteEnvoye: t, reglages: {}, requestId: "req_edit", usage: null, coutMicro: 1, dureeMs: 1 } }),
      relireLogo: async (_l, _e, demande) => { vu.demandes.push(demande); return { nomLu: NOM, ideeConservee: true, arche: false, phrase: demande.includes("a choisi la phrase") ? "L'éclat de votre voiture" : "", phraseDitLeMetier: false, note: 9, pourquoi: "" }; },
    });
    try {
      const r1 = await tache(user, projectId, { conversationId: cid, phase: "recherche", nom: NOM, capMicro: 5_000_000 }) as any;
      const e = J.journeyOf(cid).graphistes!;
      expect(e.esquisses.find((x) => x.numero === 5)!.phrase).toEqual({ texte: "L'éclat de votre voiture", ok: true });
      expect(e.esquisses.find((x) => x.numero === 6)!.phrase).toMatchObject({ texte: "Brillannnce garantie", ok: false });
      expect(e.esquisses.find((x) => x.numero === 1)!.phrase).toBeUndefined();
      // SINA le propose en une phrase, sans question sur le contenu du logo.
      expect(r1.notice).toContain(T.PROPOSITION_DES_PHRASES());
      expect(T.PROPOSITION_DES_PHRASES()).not.toContain("?");
      expect(questionSurLeLogo({ message: `Voici les esquisses de ton logo. ${T.PROPOSITION_DES_PHRASES()}`, actions: [] } as never)).toBe(false);
      J.updateJourney(cid, (j) => { j.graphistes!.choix = [1, 2]; j.graphistes!.phrases = { 1: { de: 5, texte: "L'éclat de votre voiture" } }; });
      const r2 = await tache(user, projectId, { conversationId: cid, phase: "finalisation", numeros: [1, 2], capMicro: 5_000_000 }) as any;
      expect(r2.logos).toBe(2);
      // Le logo 1 reçoit la phrase choisie ; le logo 2, sans choix, garde la règle d'avant (consigne inchangée).
      expect(vu.consignes[0]).toContain("demande de l'écrire exactement « L'éclat de votre voiture »");
      expect(vu.consignes[1]).toBe(consigneDeFinalisation(NOM, METIER));
      expect(vu.demandes[0]).toContain("Le client a choisi la phrase à écrire sous le nom : « L'éclat de votre voiture »");
      expect(vu.demandes[1]).not.toContain("a choisi la phrase");
    } finally { G.graphistesDeps.ai = undefined; }
  });
});
