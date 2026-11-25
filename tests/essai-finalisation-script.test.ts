/**
 * Le script de l'essai réel de la finalisation de deux esquisses (scripts/syna-recette/essai-finalisation.mts), avec des
 * appels SIMULÉS : aucun appel payant. Chaque appel simulé passe par la réservation du Studio, comme les vrais, pour que le
 * garde-fou de l'essai le voie. Parcours sans refus, un logo refusé puis repris une fois à partir du logo refusé, les corrections au début du texte, un logo
 * refusé deux fois (pas de troisième essai), le garde-fou qui refuse un appel, aucune clé dans le code, le devis.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

const METIER = "une pépinière qui vend des plantes en ligne";
/** Une esquisse ou un logo simulé : un dessin sombre sur fond blanc (le fond se retire proprement). */
const dessin = (teinte: string) => sharp({ create: { width: 512, height: 512, channels: 3, background: "#FFFFFF" } })
  .composite([{ input: { create: { width: 200, height: 120, channels: 3 as const, background: teinte } }, left: 156, top: 120 }, ...Array.from({ length: 5 }, (_v, i) => ({ input: { create: { width: 30, height: 70, channels: 3 as const, background: "#1F3D5B" } }, left: 120 + i * 58, top: 320 }))]).png().toBuffer();

describe("le script de l'essai de la finalisation (appels simulés)", async () => {
  const billing = await import("@/lib/billing");
  const { withTrace } = await import("@/lib/ai/trace");
  const { debutDuTexte, FIN_DU_TEXTE, texteDeReprise } = await import("@/lib/syna-agent/logo-finalisation");
  const { essaiDeFinalisation, metierDeLEssai, metierDuRapport, devisDeLEssai, phrasesDeLEssai } = await import("../scripts/syna-recette/essai-finalisation-outil");
  const { RACINE, ECUME, sansRacine } = await import("./clients-d-essai");
  const CLIENT = RACINE;
  const { devisDesFinalisations } = await import("@/lib/syna-agent/logo-graphistes");
  const { all } = await import("@/lib/db");

  const REDACTION = 20_000, LOGO = 120_000, RELECTURE = 40_000;
  const appels: string[] = [];
  const textesEnvoyes: string[] = [];
  const jointes: Buffer[] = [];
  const relues: Buffer[] = [];
  let verdicts: Record<string, { note: number; perdue?: boolean; nomLu?: string; phrase?: string }> = {};
  const paye = (q: { userId: string; jobId: string }, max: number, task: string) =>
    withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, max, { task, provider: "openai", model: "simule", jobId: q.jobId }); billing.settle(rid, Math.round(max / 2), null, task); });
  const bonTexte = `${debutDuTexte(CLIENT.nom, METIER)} Garde la feuille qui forme le R. Fais évoluer l'idée vers une identité plus aboutie. Palette vert sauge. ${FIN_DU_TEXTE}.`;
  const simule = (q: { userId: string; projectId: string; jobId: string; capMicro: number }) => ({
    metier: async () => { appels.push("metier"); throw new Error("interdit"); },
    planche: async () => { appels.push("planche"); throw new Error("interdit"); },
    relireEsquisses: async () => { appels.push("relireEsquisses"); throw new Error("interdit"); },
    rediger: async (consigne: string, _e: Buffer, cle: string) => {
      appels.push(cle); envoyes.push(consigne); await paye(q, REDACTION, "quality_control");
      // Le texte suit la consigne : son début exact, et la phrase choisie quand la consigne la donne.
      const debut = /commence par « (.+?\.) »/.exec(consigne)![1], phrase = /demande de l'écrire exactement « (.+?) »/.exec(consigne)?.[1];
      return { idee_centrale: "l'idée de l'esquisse", texte: `${debut} Garde la feuille qui forme le R. Fais évoluer l'idée vers une identité plus aboutie. Palette vert sauge.${phrase ? ` Écris en petit sous le nom, exactement : ${phrase}` : ""} ${FIN_DU_TEXTE}.` };
    },
    finaliser: async (jointe: Buffer, texte: string, cle: string) => { appels.push(cle); textesEnvoyes.push(texte); envoyes.push(texte); jointes.push(jointe); await paye(q, LOGO, "image_generation"); return { png: await dessin("#3A7D44"), recu: { endpoint: "simulé", modele: "gpt-image-2.6-sunburst", texteEnvoye: texte, reglages: { quality: "high" }, requestId: `req-${cle}`, usage: { output_tokens: 1000 }, coutMicro: LOGO / 2, dureeMs: 1, renvoye: { quality: "high", size: "1024x1024", background: "opaque", output_format: "png" } } as never }; },
    relireLogo: async (_l: Buffer, esquisse: Buffer, demande: string, cle: string) => {
      appels.push(cle); relues.push(esquisse); envoyes.push(demande); await paye(q, RELECTURE, "quality_control");
      const v = verdicts[cle] ?? { note: 9 };
      const nom = /Marque : « (.+?) »/.exec(demande)![1], phrase = /phrase à écrire sous le nom : « (.+?) »/.exec(demande)?.[1] ?? "";
      return { nomLu: v.nomLu ?? nom, ideeConservee: !v.perdue, phrase: v.phrase ?? phrase, phraseDitLeMetier: false, note: v.note, pourquoi: "simulé" };
    },
  });
  /** Tout ce qui part vers l'IA : la consigne du rédacteur, le texte du dessinateur, la demande au relecteur. */
  const envoyes: string[] = [];
  const preparer = async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "essai-finalisation-"));
    const entree = path.join(dir, "entree"); fs.mkdirSync(entree);
    const a = path.join(entree, "esquisse-04.png"), b = path.join(entree, "esquisse-11.png");
    fs.writeFileSync(a, await dessin("#E0703A")); fs.writeFileSync(b, await dessin("#7A4EB0"));
    return { sortie: path.join(dir, "sortie"), esquisses: [a, b] };
  };
  afterEach(() => { appels.length = 0; envoyes.length = 0; textesEnvoyes.length = 0; jointes.length = 0; relues.length = 0; verdicts = {}; delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; });

  it("sans refus : texte, logo, relecture pour chaque esquisse, rien d'autre ; tout est écrit", async () => {
    const { sortie, esquisses } = await preparer();
    const r = await essaiDeFinalisation({ sortie, plafondEuros: "2", esquisses, metier: METIER, client: RACINE, ai: simule as never });
    expect(r.arret).toBeUndefined();
    expect(appels).toEqual(["e4-texte-1", "e4-logo-1", "e4-relecture-1", "e11-texte-1", "e11-logo-1", "e11-relecture-1"]);
    expect(r.logos.map((l) => [l.numero, l.ok])).toEqual([[4, true], [11, true]]);
    const f = fs.readdirSync(sortie);
    expect(f).toEqual(expect.arrayContaining([
      "esquisse-04-consigne-du-redacteur.txt", "esquisse-04-redaction-1-consigne.txt", "esquisse-04-redaction-1-reponse.json",
      "esquisse-04-logo-1-texte-envoye.txt", "esquisse-04-logo-1-brut.png", "esquisse-04-logo-1-detoure.png", "esquisse-04-logo-1-recu.json",
      "esquisse-04-relecture-1-demande.txt", "esquisse-04-relecture-1-verdict.json", "esquisse-04-logo-garde.png", "esquisse-11-logo-garde-detoure.png",
      "depense.json", "usage.json", "rapport.txt",
    ]));
    expect(fs.readFileSync(path.join(sortie, "esquisse-04-logo-1-texte-envoye.txt"), "utf8").trim()).toBe(bonTexte);
    expect(fs.readFileSync(path.join(sortie, "esquisse-04-relecture-1-demande.txt"), "utf8")).toContain(`Son vrai métier : ${METIER}`);
    expect(JSON.parse(fs.readFileSync(path.join(sortie, "esquisse-04-logo-1-recu.json"), "utf8")).renvoye).toEqual({ quality: "high", size: "1024x1024", background: "opaque", output_format: "png" });
    // La dépense réelle comptée par le Studio, appel par appel : ce qui a été réglé (la moitié de chaque maximum).
    expect(r.depenseMicro).toBe(2 * (REDACTION + LOGO + RELECTURE) / 2);
    expect(r.appels).toHaveLength(6);
    expect(r.appels.every((a) => !a.studio && a.reelMicro === a.reserveMicro / 2)).toBe(true);
    const rapport = fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8");
    expect(rapport).toContain(`Phrase du métier (essai des esquisses, jamais réécrite) : ${METIER}`);
    expect(rapport).toContain("Esquisse 4 : logo GARDÉ par le relecteur");
    expect(rapport).toContain("Dépense réelle comptée par le Studio : 0,1800 €");
    expect(rapport).toContain("Plafond minimal pour aller au bout à coup sûr");
    expect(appels).not.toContain("metier");
  });

  it("un logo refusé est repris une fois, à partir du logo refusé, les corrections au début du texte, à la charge du Studio", async () => {
    const { sortie, esquisses } = await preparer();
    verdicts = { "e4-relecture-1": { note: 6, perdue: true } };
    const r = await essaiDeFinalisation({ sortie, plafondEuros: "2", esquisses, metier: METIER, client: RACINE, ai: simule as never });
    expect(r.arret).toBeUndefined();
    expect(appels.filter((a) => a.startsWith("e4-"))).toEqual(["e4-texte-1", "e4-logo-1", "e4-relecture-1", "e4-logo-2", "e4-relecture-2"]);
    const raisons = r.logos[0].essais[0].raisons!;
    expect(raisons).toEqual(["l'idée de l'esquisse est perdue", "il n'est pas au niveau (6/10, il faut 8)"]);
    expect(textesEnvoyes[1]).toBe(texteDeReprise(raisons, bonTexte));
    expect(textesEnvoyes[1]).toBe(`Corrige uniquement : l'idée de l'esquisse est perdue ; il n'est pas au niveau (6/10, il faut 8) ; garde tout le reste à l'identique.\n\n${bonTexte}`);
    // L'image jointe : l'esquisse au premier essai, le logo refusé à la reprise ; le relecteur reçoit toujours l'esquisse.
    const esquisse = fs.readFileSync(esquisses[0]), refuse = fs.readFileSync(path.join(sortie, "esquisse-04-logo-1-brut.png"));
    expect(jointes[0].equals(esquisse)).toBe(true);
    expect(jointes[1].equals(refuse)).toBe(true);
    expect(jointes[1].equals(esquisse)).toBe(false);
    expect(relues.slice(0, 2).every((b) => b.equals(esquisse))).toBe(true);
    // Le script écrit l'image jointe de chaque essai.
    expect(fs.readFileSync(path.join(sortie, "esquisse-04-logo-1-image-jointe.png")).equals(esquisse)).toBe(true);
    expect(fs.readFileSync(path.join(sortie, "esquisse-04-logo-2-image-jointe.png")).equals(refuse)).toBe(true);
    expect(fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8")).toContain("image jointe esquisse-04-logo-2-image-jointe.png");
    expect(r.logos[0].ok).toBe(true);
    expect(fs.existsSync(path.join(sortie, "esquisse-04-logo-1-brut.png"))).toBe(true); // le refusé est gardé
    expect(fs.existsSync(path.join(sortie, "esquisse-04-logo-2-brut.png"))).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(sortie, "esquisse-04-relecture-1-verdict.json"), "utf8")).garde).toBe(false);
    // La reprise (logo et relecture) est à la charge du Studio.
    expect(r.appels.filter((a) => a.studio)).toHaveLength(2);
  });

  it("un logo refusé deux fois s'arrête là : aucun troisième essai, l'autre esquisse continue", async () => {
    const { sortie, esquisses } = await preparer();
    verdicts = { "e4-relecture-1": { note: 5 }, "e4-relecture-2": { note: 7, nomLu: "Racines" } };
    const r = await essaiDeFinalisation({ sortie, plafondEuros: "2", esquisses, metier: METIER, client: RACINE, ai: simule as never });
    expect(r.arret).toBeUndefined();
    expect(appels.filter((a) => a.startsWith("e4-logo"))).toEqual(["e4-logo-1", "e4-logo-2"]);
    expect(r.logos[0].ok).toBe(false);
    expect(r.logos[0].raison).toMatch(/refusé deux fois/);
    expect(r.logos[1].ok).toBe(true);
    expect(fs.existsSync(path.join(sortie, "esquisse-04-logo-garde.png"))).toBe(false);
    expect(fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8")).toMatch(/Esquisse 4 : logo NON gardé \(refusé deux fois/);
  });

  it("le garde-fou refuse l'appel au-dessus du plafond : il ne part pas, rien n'est relancé, le script le dit", async () => {
    const { sortie, esquisses } = await preparer();
    // 0,20 € : la première esquisse (0,02 + 0,12 + 0,04 au plus) tient ; le texte de la seconde est encore accepté
    // (0,09 € réglés + 0,02 €), son logo (0,12 €) ferait dépasser.
    const r = await essaiDeFinalisation({ sortie, plafondEuros: "0.20", esquisses, metier: METIER, client: RACINE, ai: simule as never });
    expect(r.arret).toMatch(/garde-fou de l'essai a refusé un appel \(esquisse 11\)/);
    expect(appels).toEqual(["e4-texte-1", "e4-logo-1", "e4-relecture-1", "e11-texte-1", "e11-logo-1"]);
    expect(textesEnvoyes).toHaveLength(2);
    expect(r.logos[0].ok).toBe(true);
    expect(fs.existsSync(path.join(sortie, "esquisse-11-logo-1-brut.png"))).toBe(false);
    expect(all("SELECT 1 FROM ai_reservations WHERE model='simule'")).toBeTruthy();
    expect(fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8")).toMatch(/ARRÊT : le garde-fou de l'essai a refusé un appel/);
  });

  it("le client Écume avec la phrase choisie : elle part mot pour mot au rédacteur et au relecteur, le code la compare, aucune trace de Racine", async () => {
    const { sortie, esquisses } = await preparer();
    const METIER_ECUME = "une savonnerie artisanale qui vend en ligne des savons solides, des shampoings solides et des baumes";
    const PHRASE = "Savons solides faits main";
    const phrases = await phrasesDeLEssai([4, 11], { PHRASE, PHRASE_11: "aucune" });
    expect(phrases).toEqual({ 4: { texte: PHRASE }, 11: { aucune: true } });
    const r = await essaiDeFinalisation({ sortie, plafondEuros: "2", esquisses, metier: METIER_ECUME, client: ECUME, phrases, ai: simule as never });
    expect(r.arret).toBeUndefined();
    expect(r.logos.map((l) => [l.numero, l.ok, l.phrase])).toEqual([[4, true, PHRASE], [11, true, ""]]);
    // La consigne et la demande au relecteur portent le nom, le métier et la phrase ; le texte du dessinateur aussi.
    const consigne4 = fs.readFileSync(path.join(sortie, "esquisse-04-consigne-du-redacteur.txt"), "utf8");
    expect(consigne4).toContain("Le client Écume (");
    expect(consigne4).toContain(`demande de l'écrire exactement « ${PHRASE} »`);
    expect(fs.readFileSync(path.join(sortie, "esquisse-11-consigne-du-redacteur.txt"), "utf8")).toContain("le client ne veut aucune phrase sous le nom");
    expect(fs.readFileSync(path.join(sortie, "esquisse-04-logo-1-texte-envoye.txt"), "utf8")).toContain(`${debutDuTexte("Écume", METIER_ECUME)}`);
    expect(fs.readFileSync(path.join(sortie, "esquisse-04-relecture-1-demande.txt"), "utf8")).toContain(`Le client a choisi la phrase à écrire sous le nom : « ${PHRASE} »`);
    expect(fs.readFileSync(path.join(sortie, "esquisse-04-phrase-du-logo.txt"), "utf8")).toBe(PHRASE);
    expect(fs.readFileSync(path.join(sortie, "esquisse-11-phrase-du-logo.txt"), "utf8")).toBe("");
    expect(envoyes.length).toBeGreaterThanOrEqual(6);
    for (const t of envoyes) expect(sansRacine(t), t).toBe(true);
    const rapport = fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8");
    expect(rapport).toContain("client « Écume » (savonnerie artisanale");
    expect(rapport).toContain(`Phrase sous le nom du logo 4 : « ${PHRASE} », mot pour mot`);
    expect(rapport).toContain("Phrase sous le nom du logo 11 : aucune phrase");
    expect(sansRacine(rapport)).toBe(true);
  });

  it("la phrase choisie mal écrite dans le logo fait refuser le logo, comme un nom mal écrit", async () => {
    const { sortie, esquisses } = await preparer();
    verdicts = { "e4-relecture-1": { note: 9, phrase: "Savon solide fait main" }, "e4-relecture-2": { note: 9, phrase: "Savon solide fait main" } };
    const r = await essaiDeFinalisation({ sortie, plafondEuros: "2", esquisses, metier: "une savonnerie", client: ECUME, phrases: { 4: { texte: "Savons solides faits main" } }, ai: simule as never });
    expect(r.logos[0].essais[0].raisons).toEqual(["la phrase choisie par le client est mal écrite (« Savon solide fait main » au lieu de « Savons solides faits main »)"]);
    expect(r.logos[0].ok).toBe(false);
    expect(r.logos[1].ok).toBe(true);
  });

  it("la phrase : rien de donné, la règle d'avant ; une faute évidente ou une phrase trop longue, rien n'est lancé", async () => {
    expect(await phrasesDeLEssai([4, 11], {})).toEqual({});
    expect(await phrasesDeLEssai([4, 11], { PHRASE_04: "Le savon qui sent bon" })).toEqual({ 4: { texte: "Le savon qui sent bon" } });
    await expect(phrasesDeLEssai([4], { PHRASE: "Savonnn solide" })).rejects.toThrow(/faute évidente/);
    await expect(phrasesDeLEssai([4], { PHRASE: "x".repeat(130) })).rejects.toThrow(/Rien n'est lancé/);
    const { sortie, esquisses } = await preparer();
    await expect(essaiDeFinalisation({ sortie, plafondEuros: "2", esquisses, metier: "une savonnerie", client: ECUME, phrases: { 7: { aucune: true } }, ai: simule as never })).rejects.toThrow(/pas finalisée/);
    await expect(essaiDeFinalisation({ sortie, plafondEuros: "2", esquisses, metier: "une savonnerie", client: undefined as never, ai: simule as never })).rejects.toThrow(/Client de l'essai manquant/);
    expect(appels).toEqual([]);
    const src = fs.readFileSync("scripts/syna-recette/essai-finalisation.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-finalisation-outil.ts", "utf8");
    expect(sansRacine(src)).toBe(true);
    expect(src).toContain("controleDesPhrases(");
  });

  it("le métier vient du rapport de l'essai des esquisses, jamais réécrit", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "essai-finalisation-rapport-"));
    const rapport = path.join(dir, "rapport.txt");
    fs.writeFileSync(rapport, `Essai des esquisses de logo\nPlafond de l'essai : 0,6000 €\n\nPhrase du métier : ${METIER}\nCe que la piste explore : les plantes (univers)\n`);
    expect(metierDuRapport(fs.readFileSync(rapport, "utf8"))).toBe(METIER);
    expect(metierDeLEssai({ rapport })).toBe(METIER);
    expect(metierDeLEssai({ metier: `  ${METIER} ` })).toBe(METIER);
    expect(() => metierDeLEssai({ rapport, metier: "un fleuriste" })).toThrow(/n'est pas celui du rapport/);
    expect(() => metierDeLEssai({})).toThrow(/Métier manquant/);
  });

  it("le devis, sans appel : le probable du Studio et la somme des maxima, reprises et réécritures comprises", async () => {
    const d = await devisDeLEssai([4, 11]);
    const s = devisDesFinalisations(2);
    expect(d.devisDuStudio).toEqual({ maxMicro: s.maxMicro, studioMaxMicro: s.studioMaxMicro, probableMicro: s.probableMicro });
    expect(d.lignes).toHaveLength(12);
    expect(Math.abs(d.probableMicro - s.probableMicro)).toBeLessThanOrEqual(2);
    // Ce que le parcours peut engager au plus : le plafond du client plus la borne du Studio.
    expect(Math.abs(d.plafondMinimalMicro - (s.maxMicro + s.studioMaxMicro))).toBeLessThanOrEqual(2);
    expect(d.plafondMinimalMicro).toBeGreaterThan(d.probableAvecReprisesMicro);
    expect(d.probableAvecReprisesMicro).toBeGreaterThan(d.probableMicro);
  });

  it("le script lancé seul n'écrit jamais une clé : la clé Anthropic vient de STUDIO_ANTHROPIC_KEY ; rien au-delà du logo fini", () => {
    const src = fs.readFileSync("scripts/syna-recette/essai-finalisation.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-finalisation-outil.ts", "utf8");
    expect(src).toContain("process.env.STUDIO_ANTHROPIC_KEY");
    expect(src).not.toMatch(/sk-ant-|sk-proj-/);
    expect(src).not.toMatch(/ai\.(metier|planche|relireEsquisses)\(|uneRecherche\(|ecrireLeMetier\(|lancerLesPlanches\(|SINA_BRAND_JOB/);
    expect(src).toContain("uneFinalisation(ai,");
  });
});
