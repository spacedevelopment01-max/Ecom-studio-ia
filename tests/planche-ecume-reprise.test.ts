/**
 * L'essai réel de l'étape 3 d'Écume (25 novembre 2026), arrêté en erreur après 0,23 € : les quatre défauts corrigés, sans
 * aucun appel payant (verdict réel copié tel quel dans tests/fixtures/ecume-planches, appels simulés).
 *  1. la phrase lue est comparée par ses lignes seulement (forme structurée ; forme d'avant : sans l'emplacement) ;
 *  2. une phrase cachée en partie par un objet : seuls les mots visibles sont comparés ;
 *  3. la reprise part toujours : raisons dédoublonnées, rangées, bornées ;
 *  4. l'échec d'une planche n'empêche jamais les autres (Studio et script) ;
 *  5. le chemin d'essai : reprendre A à partir de son premier essai déjà payé.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

const F = "tests/fixtures/ecume-planches";
const PHRASE = ["SAVONNERIE ARTISANALE", "BULLES DE SOIN AU NATUREL"];
const reel = () => JSON.parse(fs.readFileSync(`${F}/planche-A-1-relecture-verdict.json`, "utf8"));
/**
 * Le texte réel du premier essai de A, tel que le Studio l'enverrait aujourd'hui : depuis le 26 novembre 2026 (essai réel du
 * torréfacteur), la partie « produits » d'une boutique porte en plus la ligne des noms des produits ; depuis le 27 novembre
 * 2026, la liste des logos ne nomme plus le logo compact ni le logo empilé ; le reste est mot pour mot.
 */
const texteA1DAujourdhui = async () => {
  const P = await import("@/lib/syna-agent/planche-de-marque");
  return P.sansLeCompactNiLEmpile(P.texteAvecLesNomsDesProduits(fs.readFileSync(`${F}/planche-A-1-texte-envoye.txt`, "utf8"), JSON.parse(fs.readFileSync(`${F}/valeurs-du-metier.json`, "utf8")).valeurs));
};

describe("Écume, étape 3 : la relecture de la planche A recalculée par le code corrigé", async () => {
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const mp = await import("@/lib/ai/media-providers");
  const ATTENDU = { nom: "Écume", annee: 2026, domaine: { domaine: "ecumefrance.fr", statut: "disponible" as const }, personnes: false, animaux: false, phrase: PHRASE };
  const lu = () => P.lectureDeLaPlanche(P.VerdictRangeDeLaPlancheSchema.parse(reel().verdict), ATTENDU);

  it("le verdict réel, tel quel : plus aucun des 15 refus faux de la phrase ; restent la main, « Dites-le nous ! » et le sac", () => {
    const v = reel();
    // Ce que décidait le code d'avant : 16 raisons sur la phrase, dont 15 fausses.
    expect(v.raisons.filter((r: string) => r.startsWith("la phrase choisie par le client est mal écrite"))).toHaveLength(16);
    const r = lu().raisons;
    expect(r).toEqual([
      "la phrase choisie par le client est mal écrite (« 09 Sac en tissu : [1re ligne masquée par l'étiquette] / [illisible] AU NATUREL » au lieu de « SAVONNERIE ARTISANALE » / « BULLES DE SOIN AU NATUREL »)",
      "fautes : « Dites-le nous ! (il faut « Dites-le-nous ! ») », « Sac en tissu (bloc 09) : la 2e ligne de la phrase sous le logo est déformée, « BULLES DE SOIN » illisible, la 1re ligne est masquée par l'étiquette »",
      "une personne est visible sans l'accord du client",
      "à retirer, aucune personne ni partie du corps : une main est visible dans l'image de référence « Mousse délicate » alors qu'aucune personne ne doit apparaître",
      "elle n'est pas au niveau (5/10, il faut 8)",
    ]);
    // Les quinze endroits justes ne donnent aucun refus, emplacement et « / » compris.
    for (const x of v.verdict.phrasesLues.slice(0, 15)) expect(P.jugerLaPhraseLue(x, PHRASE).juste, x).toBe(true);
  });

  it("la reprise de A part : ses raisons tiennent sous la limite, les plus graves d'abord", async () => {
    const v = JSON.parse(fs.readFileSync(`${F}/valeurs-du-metier.json`, "utf8")).valeurs;
    const t = P.texteDeLaPlanche({ nom: "Écume", valeurs: v, annee: 2026, domaine: ATTENDU.domaine, personnes: false, phrase: PHRASE, raisons: lu().raisons });
    // L'ancien texte de la reprise (8 939 octets) n'était jamais parti.
    expect(Buffer.byteLength(fs.readFileSync(`${F}/planche-A-2-texte-envoye.txt`, "utf8"))).toBeGreaterThan(mp.PLANCHE_TEXTE_MAX_OCTETS);
    expect(Buffer.byteLength(t)).toBeLessThanOrEqual(mp.PLANCHE_TEXTE_MAX_OCTETS);
    expect(t.startsWith(await texteA1DAujourdhui())).toBe(true);
    const fin = t.slice(t.lastIndexOf("À corriger : "));
    expect(fin.indexOf("une personne est visible")).toBeLessThan(fin.indexOf("la phrase choisie"));
    expect(fin.indexOf("la phrase choisie")).toBeLessThan(fin.indexOf("Dites-le nous"));
    expect(fin).toContain("« Mousse délicate »");
    expect(fin.endsWith("elle n'est pas au niveau (5/10, il faut 8).")).toBe(true);
  });

  it("la taille permise du texte est la même que celle de l'appel d'image", () => {
    expect(P.TEXTE_DE_LA_PLANCHE_MAX_OCTETS).toBe(mp.PLANCHE_TEXTE_MAX_OCTETS);
  });
});

describe("point 1 : la phrase lue, comparée par ses seules lignes", async () => {
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const a = { nom: "Écume", annee: 2026, domaine: { domaine: "ecumefrance.fr", statut: "disponible" as const }, personnes: false, animaux: false, phrase: PHRASE };
  const bon = { nomLu: "Écume", logoFidele: true, copyrightLu: "© 2026 Écume", domaineLu: "ecumefrance.fr — disponible", fautes: [] as string[], promesses: [] as string[], personnes: false, logoFonceSurFondSombre: false, motMaquette: false, copies: [] as string[], note: 9, pourquoi: "" };

  it("la forme structurée demandée au relecteur : { emplacement, lignes, cachee }, l'emplacement jamais comparé", () => {
    const v = P.RelectureAvecPhraseSchema.parse({ ...bon, phrasesLues: [{ emplacement: "01 Logo principal", lignes: PHRASE, cachee: false }, { emplacement: "Badge / sceau (texte circulaire)", lignes: PHRASE, cachee: false }] });
    expect(P.raisonsDuRefusDeLaPlanche(v, a)).toEqual([]);
    // Une lettre fausse dans une ligne : refusée, l'emplacement dit dans la raison.
    expect(P.raisonsDuRefusDeLaPlanche({ ...bon, phrasesLues: [{ emplacement: "09 Boîte", lignes: ["SAVONNERIE ARTISANALE", "BULES DE SOIN AU NATUREL"] }] }, a))
      .toEqual(["la phrase choisie par le client est mal écrite (« 09 Boîte : SAVONNERIE ARTISANALE / BULES DE SOIN AU NATUREL » au lieu de « SAVONNERIE ARTISANALE » / « BULLES DE SOIN AU NATUREL »)"]);
    // Une ligne manquante, en trop, hors de l'ordre : refusée.
    for (const lignes of [[PHRASE[0]], [...PHRASE, "FAIT MAIN"], [PHRASE[1], PHRASE[0]]]) expect(P.jugerLaPhraseLue({ emplacement: "x", lignes }, PHRASE).juste, lignes.join(" / ")).toBe(false);
    // Le schéma envoyé au relecteur ne porte que la forme structurée ; la forme d'avant se relit dans un verdict rangé.
    expect(P.RelectureAvecPhraseSchema.parse({ phrasesLues: ["x"] }).phrasesLues).toEqual([]);
    expect(P.VerdictRangeDeLaPlancheSchema.parse({ phrasesLues: ["x"] }).phrasesLues).toEqual(["x"]);
  });

  it("la forme d'avant (une chaîne) : l'emplacement retiré avant le premier « : », les lignes coupées sur « / »", () => {
    expect(P.jugerLaPhraseLue("01 Logo principal : SAVONNERIE ARTISANALE / BULLES DE SOIN AU NATUREL", PHRASE)).toMatchObject({ juste: true, emplacement: "01 Logo principal" });
    expect(P.jugerLaPhraseLue("01 Badge / sceau (texte circulaire) : SAVONNERIE ARTISANALE / BULLES DE SOIN AU NATUREL", PHRASE).juste).toBe(true);
    expect(P.jugerLaPhraseLue("SAVONNERIE ARTISANALE / BULLES DE SOIN AU NATUREL", PHRASE).juste).toBe(true);
    // Un emplacement qui porte lui-même un « : ».
    expect(P.jugerLaPhraseLue("07 Format 1:1 : SAVONNERIE ARTISANALE / BULLES DE SOIN AU NATUREL", PHRASE).juste).toBe(true);
    expect(P.jugerLaPhraseLue("01 Logo principal : SAVONERIE ARTISANALE / BULLES DE SOIN AU NATUREL", PHRASE).juste).toBe(false);
  });

  it("le relecteur reçoit la forme structurée, la règle de la phrase cachée en termes généraux, sans nom ni exemple d'essai", () => {
    const d = P.demandeAuRelecteurDeLaPlanche({ ...a, texte: "t" });
    expect(d).toContain("Dans « phrasesLues », un élément pour chaque endroit où elle apparaît : « emplacement »");
    expect(d).toContain("« cachee », vrai seulement si un objet de la scène");
    expect(d).toContain("Une partie seulement cachée ne va jamais dans fautes.");
    expect(d).not.toMatch(/sac|étiquette|tissu|mousse délicate|Dites-le/i);
    expect(P.RELECTEUR_DE_LA_PLANCHE).toContain("- personnesVues : ");
    expect(P.RELECTEUR_DE_LA_PLANCHE).not.toMatch(/sac|étiquette|tissu|mousse délicate|écume|racine|tenon/i);
  });
});

describe("point 2 : une phrase cachée en partie par un objet de la scène n'est pas mal écrite", async () => {
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const a = { nom: "Écume", annee: 2026, domaine: { domaine: "ecumefrance.fr", statut: "disponible" as const }, personnes: false, animaux: false, phrase: PHRASE };
  const bon = { nomLu: "Écume", logoFidele: true, copyrightLu: "© 2026 Écume", domaineLu: "ecumefrance.fr — disponible", fautes: [] as string[], promesses: [] as string[], personnes: false, logoFonceSurFondSombre: false, motMaquette: false, copies: [] as string[], note: 9, pourquoi: "" };
  const juste = { emplacement: "01 Logo principal", lignes: PHRASE };

  it("cachee : chaque mot visible juste et l'ordre tenu ; gardée, notée au compte rendu", () => {
    const l = P.lectureDeLaPlanche({ ...bon, phrasesLues: [juste, { emplacement: "09 Support", lignes: ["…", "BULLES DE SOIN AU NATUREL"], cachee: true }, { emplacement: "09 Autre", lignes: ["SAVONNERIE ARTI…", "… AU NATUREL"], cachee: true }] }, a);
    expect(l.raisons).toEqual([]);
    expect(l.ecartes.join(" | ")).toMatch(/phrase cachée en partie par un objet de la scène, mots visibles justes : « 09 Support : … \/ BULLES DE SOIN AU NATUREL »/);
    // Sans « … », seuls les mots visibles recopiés : justes.
    expect(P.jugerLaPhraseLue({ emplacement: "x", lignes: ["SOIN AU NATUREL"], cachee: true }, PHRASE).juste).toBe(true);
  });

  it("un mot visible faux, déformé ou hors de l'ordre fait refuser, même cachée en partie", () => {
    for (const lignes of [["…", "BULES DE SOIN AU NATUREL"], ["…", "[illisible] AU NATUREL"], ["AU NATUREL", "SAVONNERIE"], ["…", "BULLES DE S?IN"]]) {
      expect(P.raisonsDuRefusDeLaPlanche({ ...bon, phrasesLues: [juste, { emplacement: "09 Support", lignes, cachee: true }] }, a).join(" "), lignes.join(" / ")).toMatch(/la phrase choisie par le client est mal écrite \(« 09 Support : /);
    }
    // La forme d'avant : « [… masquée …] » est caché ; « [illisible] » est une lettre visible fausse.
    expect(P.jugerLaPhraseLue("09 Support : [1re ligne masquée par un objet] / BULLES DE SOIN AU NATUREL", PHRASE)).toMatchObject({ juste: true, cachee: true });
    expect(P.jugerLaPhraseLue("09 Support : [1re ligne masquée par un objet] / [illisible] AU NATUREL", PHRASE).juste).toBe(false);
    // Des marques sans rien de caché : refusée.
    expect(P.jugerLaPhraseLue({ emplacement: "x", lignes: ["SAVONNERIE ARTISANALE", "[illisible] AU NATUREL"] }, PHRASE).juste).toBe(false);
  });

  it("une faute qui dit seulement « cachée » n'est pas une faute ; une faute qui dit « déformée » en reste une", () => {
    const seule = P.lectureDeLaPlanche({ ...bon, phrasesLues: [juste], fautes: ["la 1re ligne de la phrase SAVONNERIE ARTISANALE est masquée par un objet posé devant"] }, a);
    expect(seule.raisons).toEqual([]);
    expect(seule.ecartes.join(" | ")).toMatch(/phrase seulement cachée en partie par un objet, pas une faute/);
    expect(P.raisonsDuRefusDeLaPlanche({ ...bon, phrasesLues: [juste], fautes: ["la 2e ligne BULLES DE SOIN est déformée, la 1re masquée"] }, a).join(" ")).toMatch(/fautes/);
    // Sans phrase choisie : rien ne change, une faute reste une faute.
    expect(P.raisonsDuRefusDeLaPlanche({ ...bon, fautes: ["un mot masqué par un objet"] }, { ...a, phrase: undefined }).join(" ")).toMatch(/fautes/);
  });
});

describe("point 3 : la reprise part toujours", async () => {
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const mp = await import("@/lib/ai/media-providers");
  const v = JSON.parse(fs.readFileSync(`${F}/valeurs-du-metier.json`, "utf8")).valeurs;
  const donnees = { nom: "Écume", valeurs: v, annee: 2026, domaine: { domaine: "ecumefrance.fr", statut: "disponible" as const }, personnes: false, phrase: PHRASE };

  it("avec 30 raisons, le texte reste sous la limite ; les plus graves d'abord ; dédoublonnées", () => {
    const raisons = [
      ...Array.from({ length: 20 }, (_x, i) => `fautes : « un texte assez long qui se répète pour remplir la place, numéro ${i} » ${"et encore ".repeat(12)}`),
      "elle n'est pas au niveau (5/10, il faut 8)",
      "le bloc 10 doit dire exactement « ecumefrance.fr — disponible » (lu : « ecume.fr »)",
      "le copyright doit être exactement « © 2026 Écume » (lu : « © 2025 Écume »)",
      "la phrase choisie par le client est mal écrite (« X » au lieu de « SAVONNERIE ARTISANALE » / « BULLES DE SOIN AU NATUREL »)",
      "le nom est mal écrit (« Ecume » au lieu de « Écume »)",
      "une personne est visible sans l'accord du client",
      "une personne est visible sans l'accord du client",
      "Une personne est visible  sans l'accord du client",
      "le mot « maquette » ou « mockup » est écrit",
      `${"une raison démesurée ".repeat(80)}`,
    ];
    expect(raisons).toHaveLength(30);
    const t = P.texteDeLaPlanche({ ...donnees, raisons });
    expect(Buffer.byteLength(t)).toBeLessThanOrEqual(mp.PLANCHE_TEXTE_MAX_OCTETS);
    const fin = t.slice(t.lastIndexOf("À corriger : "));
    const ordre = ["une personne est visible", "le nom est mal écrit", "la phrase choisie", "le copyright", "le bloc 10"].map((x) => fin.indexOf(x));
    expect(ordre.every((k) => k >= 0)).toBe(true);
    expect([...ordre].sort((x, y) => x - y)).toEqual(ordre);
    expect(fin.split("une personne est visible")).toHaveLength(2);
    expect(fin).toMatch(/et \d+ autres défauts relevés par la relecture\.$/);
    // Une raison seule et courte : la forme stable d'avant.
    expect(P.texteDeLaPlanche({ ...donnees, raisons: ["une faute"] }).endsWith("\n\nÀ corriger : une faute.")).toBe(true);
    // Une raison démesurée, seule : coupée, jamais une reprise sans raison.
    const seule = P.raisonsDeLaReprise(["x".repeat(5000)], 300);
    expect(seule).toHaveLength(1);
    expect(Buffer.byteLength(P.finDeReprise(seule))).toBeLessThanOrEqual(300);
  });

  it("le rang des raisons : personne, nom, phrase, année, domaine, le reste, la note", () => {
    expect(["une personne est visible sans l'accord du client", "le nom « X » n'y est pas écrit", "la phrase choisie par le client (« A ») n'est lue nulle part sur la planche", "le copyright doit être exactement « © 2026 X »", "le bloc 10 doit dire exactement « x.fr — disponible »", "fautes : « a »", "elle n'est pas au niveau (5/10, il faut 8)"].map(P.gravite)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe("point 4 : l'échec d'une planche n'empêche jamais les autres", async () => {
  const T = await import("@/lib/syna-agent/planche-de-marque-tache");
  const { account, project } = await import("./conversation209-fixtures");
  const { saveAsset } = await import("@/lib/library");
  const { runWithLang } = await import("@/lib/i18n-server");
  const v = JSON.parse(fs.readFileSync(`${F}/valeurs-du-metier.json`, "utf8")).valeurs;
  const bon = (nom: string) => ({ nomLu: nom, logoFidele: true, copyrightLu: `© 2026 ${nom}`, domaineLu: "ecumefrance.fr — disponible", fautes: [], promesses: [], personnes: false, logoFonceSurFondSombre: false, motMaquette: false, copies: [], note: 9, pourquoi: "" });
  afterEach(() => { T.plancheDeps.domaines = undefined; T.plancheDeps.annee = undefined; T.signalement.auStudio = undefined; });

  it("dans le Studio : A s'arrête en erreur (signalée au Studio, jamais montrée), B est quand même faite", async () => {
    const u = await account(), pid = project(u, "products") as string;
    const logo = await saveAsset({ projectId: pid, userId: u.id, data: await sharp({ create: { width: 256, height: 256, channels: 3, background: "#FFFFFF" } }).png().toBuffer(), name: "logo.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready" });
    T.plancheDeps.domaines = async () => ({ taken: [], free: ["ecumefrance.fr"], unknown: [], at: 1 });
    T.plancheDeps.annee = () => 2026;
    const signales: { key: string; message: string }[] = [];
    T.signalement.auStudio = (s) => { signales.push({ key: s.key, message: s.message }); };
    const dessins: string[] = [];
    const ai = {
      valeurs: async () => { throw new Error("aucun appel attendu"); },
      dessiner: async (_l: unknown, _d: unknown, _t: string, cle: string) => {
        dessins.push(cle);
        if (cle.startsWith("A-")) throw new Error("Texte de la planche trop long : rien n'est envoyé.");
        return { png: await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#EEE" } }).png().toBuffer(), recu: null };
      },
      relire: async () => ({ ...bon("Écume"), phrasesLues: [{ emplacement: "sous le logo", lignes: PHRASE, cachee: false }] }),
    };
    const ctx = { step: async <X,>(_k: string, fn: () => Promise<X>) => fn() };
    const faire = (key: string) => runWithLang({ ui: "fr", content: "fr" }, () => T.plancheDeLaRoute({ ctx, ai: ai as never, who: { userId: u.id, projectId: pid }, route: { key, name: "Écume", board: { descriptor: null } } as never, round: 1, valeurs: { ok: true, valeurs: v }, logoAssetId: logo.id, personnes: false, phrase: PHRASE }));
    const ra = await faire("A"), rb = await faire("B");
    expect(dessins).toEqual(["A-1-1", "B-1-1"]);
    expect(ra.route.board.planche).toMatchObject({ essais: 0, erreur: true });
    expect(ra.route.board.planche!.image).toBeUndefined();
    expect(ra.route.board.planche!.raison).toMatch(/s'est arrêtée en erreur \(Texte de la planche trop long/);
    expect(ra.issues.join(" ")).toMatch(/je ne te montre pas cette planche/);
    expect(signales).toEqual([{ key: "A", message: "Texte de la planche trop long : rien n'est envoyé." }]);
    expect(rb.route.board.planche!.image).toBeTruthy();
  });

  it("par défaut, l'erreur va au journal des erreurs et en notification à l'administration, jamais au client", async () => {
    const { all } = await import("@/lib/db");
    const u = await account(), pid = project(u, "products") as string;
    await T.signalerAuStudio({ userId: u.id, projectId: pid, key: "A", nom: "Écume", message: "panne simulée", e: new Error("panne simulée") });
    expect(all<{ scope: string }>("SELECT scope FROM error_log WHERE project_id=?", pid).map((x) => x.scope)).toContain("planche-de-marque");
    expect(all<{ user_id: string }>("SELECT user_id FROM notifications WHERE title LIKE 'Planche de marque A%' AND body LIKE '%panne simulée%'").every((x) => x.user_id !== u.id)).toBe(true);
  });

  it("la chaîne de la marque : chaque planche dans son propre essai, l'erreur signalée au Studio", () => {
    const src = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    expect(src).toContain("// Chaque planche est indépendante (essai réel d'Écume, 25 novembre 2026 : l'échec de A avait empêché B)");
    expect(src).toContain("if (!plafond) await T.signalerAuStudio({ userId: p.userId, projectId: p.id, key: x.key, nom: x.name, message, e });");
  });
});

describe("le script d'essai des planches : planches indépendantes, et le chemin d'Écume (reprendre A)", async () => {
  const billing = await import("@/lib/billing");
  const { withTrace } = await import("@/lib/ai/trace");
  const T = await import("@/lib/syna-agent/planche-de-marque-tache");
  const { devisDeLEssai, essaiDesPlanches, refusDuPlafond } = await import("../scripts/syna-recette/essai-planches-outil");
  const { ECUME } = await import("./clients-d-essai");
  const appels: string[] = [], textes: Record<string, string> = {}, studio: Record<string, boolean> = {};
  const paye = (q: { userId: string; jobId: string }, max: number, task: string) =>
    withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, max, { task, provider: "openai", model: "simule", jobId: q.jobId }); billing.settle(rid, Math.round(max / 2), null, task); });
  let casser = "";
  const simule = (q: { userId: string; projectId: string; jobId: string }) => ({
    valeurs: async () => { appels.push("valeurs"); throw new Error("les valeurs ne doivent pas être refaites"); },
    dessiner: async (_l: unknown, _d: unknown, texte: string, cle: string) => {
      appels.push(`image:${cle}`); textes[cle] = texte; studio[cle] = billing.chargeDuStudio();
      if (casser && cle.startsWith(casser)) throw new Error("panne simulée du fournisseur");
      await paye(q, 200_000, "image_generation");
      return { png: await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#F4EFE6" } }).png().toBuffer(), recu: null };
    },
    relire: async (_b: Buffer[], _l: Buffer, _d: Buffer, _demande: string, cle: string) => {
      appels.push(`relecture:${cle}`); await paye(q, 60_000, "quality_control");
      return { nomLu: "Écume", logoFidele: true, copyrightLu: "© 2026 Écume", domaineLu: "ecumefrance.fr — disponible", fautes: [], promesses: [], personnes: false, personnesVues: [], logoFonceSurFondSombre: false, motMaquette: false, copies: [], note: 9, pourquoi: "simulé", phrasesLues: [{ emplacement: "sous le logo", lignes: cle.startsWith("A") ? PHRASE : ["SAVONNERIE", "ARTISANALE"], cachee: false }] };
    },
  });
  afterEach(() => { appels.length = 0; casser = ""; for (const k of Object.keys(textes)) delete textes[k]; delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; T.plancheDeps.annee = undefined; T.plancheDeps.domaines = undefined; });

  /** Le dossier d'essai d'Écume, comme sur la branche des essais : l'étape 2 (deux logos et leurs phrases) et l'étape 3. */
  async function dossier(o: { reprise: boolean }) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "essai-ecume-3-"));
    const etape2 = path.join(dir, "2-finalisation"), sortie = path.join(dir, "3-planches");
    fs.mkdirSync(etape2); fs.mkdirSync(sortie);
    const logos = [path.join(etape2, "esquisse-06-logo-garde.png"), path.join(etape2, "esquisse-10-logo-garde.png")];
    fs.writeFileSync(logos[0], await sharp({ create: { width: 300, height: 300, channels: 3, background: "#2F5D62" } }).png().toBuffer());
    fs.writeFileSync(logos[1], await sharp({ create: { width: 300, height: 300, channels: 3, background: "#8A5A44" } }).png().toBuffer());
    fs.writeFileSync(path.join(etape2, "esquisse-06-phrase-du-logo.txt"), "SAVONNERIE ARTISANALE / BULLES DE SOIN AU NATUREL");
    fs.writeFileSync(path.join(etape2, "esquisse-10-phrase-du-logo.txt"), "SAVONNERIE / ARTISANALE");
    for (const f of ["valeurs-du-metier.json", "domaine.json", "planche-A-1-relecture-verdict.json"]) fs.copyFileSync(path.join(F, f), path.join(sortie, f));
    fs.writeFileSync(path.join(sortie, "planche-A-1-texte-envoye.txt"), await texteA1DAujourdhui());
    if (o.reprise) fs.writeFileSync(path.join(sortie, "planche-A-1-brute.png"), await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#EDE6DA" } }).png().toBuffer());
    return { sortie, logos };
  }

  it("sans reprise : A en panne, B est quand même faite ; la panne écrite, signalée, jamais relancée ; les valeurs déjà écrites ne sont pas refaites", async () => {
    const { sortie, logos } = await dossier({ reprise: false });
    T.plancheDeps.annee = () => 2026;
    T.plancheDeps.domaines = async () => ({ taken: ["ecume.fr", "ecume.com"], free: ["ecumefrance.fr", "ecumefrance.com"], unknown: [], at: 1 });
    casser = "A-";
    const r = await essaiDesPlanches({ sortie, plafondEuros: "3", logos, client: ECUME, ai: simule as never });
    expect(r.arret).toBeUndefined();
    expect(appels).toEqual(["image:A-1-1", "image:B-1-1", "relecture:B-1-1-relecture"]);
    expect(r.planches.map((p) => [p.key, p.gardee])).toEqual([["A", false], ["B", true]]);
    expect(r.planches[0].erreur).toMatch(/un appel a échoué \(planche A\), jamais relancé : panne simulée du fournisseur/);
    expect(r.planches[0].signale).toBe("panne simulée du fournisseur");
    expect(r.erreurs).toHaveLength(1);
    const rapport = fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8");
    expect(rapport).toContain("ERREUR (planche arrêtée, jamais relancée ; les autres planches ont continué)");
    expect(rapport).toContain("PLANCHE EN ERREUR : planche A");
    expect(rapport).toContain("valeurs reprises de valeurs-du-metier.json");
  });

  it("REPRENDRE_A : le premier essai déjà payé repris sans appel, ses raisons recalculées, une seule reprise à la charge du Studio ; B depuis le début", async () => {
    const { sortie, logos } = await dossier({ reprise: true });
    T.plancheDeps.annee = () => 2026;
    // Le domaine n'est pas revérifié : celui du premier dessin de A.
    T.plancheDeps.domaines = async () => { throw new Error("le domaine ne doit pas être revérifié"); };
    const r = await essaiDesPlanches({ sortie, plafondEuros: "3", logos, client: ECUME, ai: simule as never, reprendre: { A: sortie } });
    expect(r.arret).toBeUndefined();
    expect(r.erreurs).toBeUndefined();
    expect(appels).toEqual(["image:A-1-2", "relecture:A-1-2-relecture", "image:B-1-1", "relecture:B-1-1-relecture"]);
    // Le texte du premier essai, refait par le Studio d'aujourd'hui, est exactement celui qui était parti.
    expect(textes["A-1-2"].startsWith(await texteA1DAujourdhui())).toBe(true);
    expect(Buffer.byteLength(textes["A-1-2"])).toBeLessThanOrEqual(7000);
    expect(textes["A-1-2"]).toContain("À corriger : une personne est visible sans l'accord du client ; à retirer, aucune personne ni partie du corps : une main est visible dans l'image de référence « Mousse délicate »");
    expect(textes["A-1-2"]).toContain("« Dites-le nous ! (il faut « Dites-le-nous ! ») »");
    expect(textes["A-1-2"]).not.toContain("« 01 Logo principal");
    expect(studio["A-1-2"]).toBe(true);
    expect(studio["B-1-1"]).toBe(false);
    expect(textes["B-1-1"]).not.toContain("À corriger");
    expect(r.planches.map((p) => [p.key, p.gardee])).toEqual([["A", true], ["B", true]]);
    expect(r.planches[0].essais[0]).toMatchObject({ tour: 1, repris: sortie });
    expect(r.planches[0].essais[0].raisons).toHaveLength(5);
    const recalcule = JSON.parse(fs.readFileSync(path.join(sortie, "planche-A-1-relecture-verdict-recalcule.json"), "utf8"));
    expect(recalcule.raisons.filter((x: string) => x.startsWith("la phrase choisie"))).toHaveLength(1);
    // Le verdict d'origine n'est jamais réécrit.
    expect(fs.readFileSync(path.join(sortie, "planche-A-1-relecture-verdict.json"), "utf8")).toBe(fs.readFileSync(path.join(F, "planche-A-1-relecture-verdict.json"), "utf8"));
    expect(fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8")).toContain("(déjà payé, repris de ");
  });

  it("REPRENDRE_A avec le texte d'avant le retrait du logo compact et du logo empilé (27 novembre 2026) : reconnu, jamais repayé ; la reprise part sans eux", async () => {
    const { sortie, logos } = await dossier({ reprise: true });
    const P = await import("@/lib/syna-agent/planche-de-marque");
    const avant = P.texteAvecLesNomsDesProduits(fs.readFileSync(`${F}/planche-A-1-texte-envoye.txt`, "utf8"), JSON.parse(fs.readFileSync(`${F}/valeurs-du-metier.json`, "utf8")).valeurs);
    expect(avant).toContain("- logo empilé\n- logo compact\n");
    fs.writeFileSync(path.join(sortie, "planche-A-1-texte-envoye.txt"), avant);
    T.plancheDeps.annee = () => 2026;
    T.plancheDeps.domaines = async () => { throw new Error("le domaine ne doit pas être revérifié"); };
    const r = await essaiDesPlanches({ sortie, plafondEuros: "3", logos, client: ECUME, ai: simule as never, reprendre: { A: sortie } });
    expect(r.erreurs).toBeUndefined();
    expect(appels).toEqual(["image:A-1-2", "relecture:A-1-2-relecture", "image:B-1-1", "relecture:B-1-1-relecture"]);
    expect(textes["A-1-2"].startsWith(await texteA1DAujourdhui())).toBe(true);
    expect(textes["A-1-2"]).not.toMatch(/logo empilé|logo compact/);
  });

  it("REPRENDRE_A : un logo qui n'est pas celui du premier essai, ou des valeurs absentes : rien n'est lancé", async () => {
    const { sortie, logos } = await dossier({ reprise: true });
    fs.copyFileSync(path.join(F, "planche-A-1-recu.json"), path.join(sortie, "planche-A-1-recu.json"));
    await expect(essaiDesPlanches({ sortie, plafondEuros: "3", logos, client: ECUME, ai: simule as never, reprendre: { A: sortie } })).rejects.toThrow(/n'est pas celui de son premier essai.*Rien n'est lancé/);
    fs.rmSync(path.join(sortie, "planche-A-1-recu.json")); fs.rmSync(path.join(sortie, "valeurs-du-metier.json"));
    await expect(essaiDesPlanches({ sortie, plafondEuros: "3", logos, client: ECUME, ai: simule as never, reprendre: { A: sortie } })).rejects.toThrow(/valeurs du métier de son premier essai.*Rien n'est lancé/);
    fs.rmSync(path.join(sortie, "planche-A-1-brute.png"));
    await expect(essaiDesPlanches({ sortie, plafondEuros: "3", logos, client: ECUME, ai: simule as never, reprendre: { A: sortie } })).rejects.toThrow(/ni planche-A-1-brute\.png ni planche-A-1\.png/);
    expect(appels).toEqual([]);
  });

  it("le devis du chemin d'Écume : la reprise de A et la planche B, sans les valeurs ; le script refuse de partir dessous", async () => {
    const d = await devisDeLEssai(2, { valeursFaites: true, reprises: [1] });
    const plein = await devisDeLEssai(2);
    expect(d.lignes.map((l) => `${l.planche} ${l.appel} ${l.charge}`)).toEqual(["1 planche, reprise unique Studio", "1 relecture de la reprise Studio", "2 planche, 1er essai client", "2 relecture du 1er essai client", "2 planche, reprise unique Studio", "2 relecture de la reprise Studio"]);
    const image = plein.lignes.find((l) => l.appel === "planche, 1er essai")!, relecture = plein.lignes.find((l) => l.appel === "relecture du 1er essai")!;
    expect(d.plafondMinimalMicro).toBe(3 * (image.maxMicro + relecture.maxMicro));
    expect(d.probableMicro).toBe(2 * (image.probableMicro + relecture.probableMicro));
    // Sous la somme des maxima, l'essai part quand même depuis le 26 novembre 2026 (il s'arrête proprement s'il le faut).
    expect(refusDuPlafond(((d.plafondMinimalMicro - 10_000) / 1_000_000).toFixed(2), d)).toBeNull();
    const src = fs.readFileSync("scripts/syna-recette/essai-planches.mts", "utf8");
    expect(src).toContain("process.env[`REPRENDRE_${k}`]");
    expect(src).toContain("const devis = await devisDeLEssai(logos.length, optionsDuDevis());");
    expect(crypto.createHash("sha256").update(fs.readFileSync(path.join(F, "planche-A-1-texte-envoye.txt"))).digest("hex")).toMatch(/^[0-9a-f]{64}$/);
  });
});
