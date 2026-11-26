/**
 * Le script de l'essai réel de la planche en vrai (scripts/syna-recette/essai-planche-en-vrai.mts), avec des appels
 * SIMULÉS : aucun appel payant. Chaque appel simulé passe par la réservation du Studio, comme les vrais, pour que le
 * garde-fou de l'essai le voie. Le parcours sans refus, une image refusée puis reprise une fois, une image refusée deux
 * fois (l'aperçu garde sa case), le logo joint seulement si l'inventaire le voit, le garde-fou qui refuse un appel, aucune
 * photo de produit (images d'ambiance), le devis, aucune clé.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { VERSIONS_DU_LOGO } from "@/lib/syna-agent/planche-en-vrai-code";

const MAGENTA = "#FF00FF";
const uni = (w: number, h: number, c: string) => sharp({ create: { width: w, height: h, channels: 3, background: c } }).png().toBuffer();
const px = async (png: Buffer, x: number, y: number) => { const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const i = (y * info.width + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };
/** Un logo fini simulé : un dessin bordeaux sur fond blanc. */
const logo = () => sharp({ create: { width: 512, height: 512, channels: 3, background: "#FFFFFF" } })
  .composite([{ input: { create: { width: 260, height: 160, channels: 3 as const, background: "#5D0126" } }, left: 126, top: 176 }]).png().toBuffer();

describe("le script de l'essai de la planche en vrai (appels simulés)", async () => {
  const billing = await import("@/lib/billing");
  const { withTrace } = await import("@/lib/ai/trace");
  const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  const { setJsonSetting } = await import("@/lib/settings");
  const { clientDeLEssai, donneesDeLaPlanche, donneesVerifiees, logoDeLaPlancheVerifie, devisDeLEssaiEnVrai, essaiDeLaPlancheEnVrai } = await import("../scripts/syna-recette/essai-planche-en-vrai-outil");
  const { RACINE, ECUME, sansRacine } = await import("./clients-d-essai");
  /** Les données de la planche A de Racine (exemple de test), données explicitement : aucun client n'a de valeur par défaut. */
  const DONNEES_RACINE = { DOMAINE: "racine-officiel.fr", DOMAINE_STATUT: "disponible", ANNEE: "2026" };
  /** Tout ce qui part vers l'IA : la demande de l'inventaire, les textes des retouches, les demandes de relecture. */
  const envoyes: string[] = [];
  const { all } = await import("@/lib/db");
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();

  const INVENTAIRE = 100_000, IMAGE = 50_000, RELECTURE = 60_000;
  const DEMO = "assets/planche-de-marque/disposition.png";
  const appels: string[] = [];
  const demandes: { element: string; cle: string; texte: string; roles: string[] }[] = [];
  /** Les cases où l'inventaire voit le logo. */
  const AVEC_LOGO = new Set(["publication-1x1", "site-ordinateur", "site-telephone", "emballage"]);
  let verdicts: Record<string, Record<string, unknown>> = {};
  let accroche = "Une plante qui pousse chez toi";
  /** Les polices que l'inventaire lit dans la case « typographies ». */
  let policesLues: Record<string, { nom: string; genre: string }> = { titres: { nom: "Playfair Display", genre: "serif" }, textes: { nom: "Montserrat", genre: "sans" } };
  const textesDe = (n: string) => (n.startsWith("publication-") ? [`${accroche} (${n.slice(12)})`] : []);
  const paye = (q: { userId: string; jobId: string }, max: number, task: string) =>
    withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, max, { task, provider: "openai", model: "simule", jobId: q.jobId }); billing.settle(rid, Math.round(max / 2), null, task); });
  const simule = (q: { userId: string; projectId: string; jobId: string }) => ({
    inventaire: async (images: { data: Buffer; label: string }[], demande: string) => {
      envoyes.push(demande);
      appels.push("inventaire"); await paye(q, INVENTAIRE, "quality_control");
      expect(images.at(-1)!.label).toBe("logo");
      const cases = images.map((im) => im.label).filter((l) => (P.NOMS_DES_ELEMENTS as string[]).includes(l));
      return P.InventaireSchema.parse({
        cases: cases.map((c) => ({ case: c, logo: AVEC_LOGO.has(c), textes: textesDe(c), produit: c.startsWith("produit-"), personne: false, comprehensible: c.startsWith("publication-") ? true : null, description: `la case ${c}` })),
        polices: policesLues,
        couleurs: [{ nom: "Bordeaux", mots: ["profond"] }], icone: "le R", favicon: "le R", iconeReprendLeLogo: false,
      });
    },
    refaire: async (d: { element: string; texte: string; taille: string; jointes: { role: string }[] }, cle: string) => {
      appels.push(`image:${cle}`); envoyes.push(d.texte); demandes.push({ element: d.element, cle, texte: d.texte, roles: d.jointes.map((j) => j.role) });
      await paye(q, IMAGE, "image_generation");
      const [w, h] = d.taille.split("x").map(Number);
      return { png: await uni(w, h, MAGENTA), recu: null };
    },
    relire: async (images: { label: string }[], demande: string, cle: string) => {
      appels.push(`relecture:${cle}`); envoyes.push(demande); await paye(q, RELECTURE, "quality_control");
      const tour = cle.endsWith("-r1") ? 2 : 1;
      const cases = images.map((im) => im.label).filter((l) => l.endsWith(" refaite")).map((l) => l.replace(/ refaite$/, ""));
      return { images: cases.map((c) => ({ case: c, identique: true, textesLus: textesDe(c), logoPresent: AVEC_LOGO.has(c), personne: false, logoFonceSurFondSombre: false, produitFidele: null, texteCoupe: false, note: 9, pourquoi: "simulé", ...verdicts[`${c}:${tour}`] })) };
    },
  });
  const preparer = async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "essai-envrai-"));
    const entree = path.join(dir, "entree"); fs.mkdirSync(entree);
    const l = path.join(entree, "esquisse-11-logo-garde.png"); fs.writeFileSync(l, await logo());
    return { sortie: path.join(dir, "sortie"), logo: l };
  };
  const lancer = async (plafondEuros = "5", client = RACINE, env: Record<string, string> = DONNEES_RACINE) => {
    const { sortie, logo: l } = await preparer();
    const r = await essaiDeLaPlancheEnVrai({ sortie, plafondEuros, planche: DEMO, logo: l, client, donnees: donneesDeLaPlanche(client, env), ai: simule as never });
    return { r, sortie, lire: (f: string) => fs.readFileSync(path.join(sortie, f), "utf8"), existe: (f: string) => fs.existsSync(path.join(sortie, f)) };
  };
  afterEach(() => { policesLues = { titres: { nom: "Playfair Display", genre: "serif" }, textes: { nom: "Montserrat", genre: "sans" } }; appels.length = 0; envoyes.length = 0; demandes.length = 0; verdicts = {}; delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; setJsonSetting(P.REGLAGE_PLANCHE_EN_VRAI, false); });

  it("sans refus : l'inventaire, les 17 retouches, les 4 relectures, puis les logos, la palette, les polices et la planche en 3072 × 4608 ; tout est écrit", async () => {
    const { r, sortie, lire, existe } = await lancer();
    expect(r.arret).toBeUndefined();
    expect(P.plancheEnVraiActive()).toBe(true);
    expect(appels).toEqual(["inventaire", ...P.NOMS_DES_ELEMENTS.map((n) => `image:${n}`), ...P.GROUPES.map((g) => `relecture:relecture-${g}`)]);
    expect(r.apercus).toHaveLength(42);
    expect(r.cases.every((c) => c.gardee)).toBe(true);
    expect(r.planche).toMatchObject({ fichier: "planche-en-vrai.png", w: 3072, h: 4608 });
    for (const f of ["fiche-du-client.txt", "apercus/publication-1x1.png", "apercus/cases.json", "inventaire-demande.txt", "inventaire-reponse.json", "inventaire-logo-joint.png",
      "cases/publication-1x1-1-texte-envoye.txt", "cases/publication-1x1-1-jointe-1-apercu.png", "cases/publication-1x1-1-hd.png", "cases/publication-1x1-gardee-hd.png",
      "relectures/publications-1-demande.txt", "relectures/publications-1-verdict.json", "logos/logo-principal.png", "logos/badge.png", "logos/favicon-32.png", "logos/icone-512.png", "logos/avatar-reseaux.png", "logos/symbole.png",
      "palette.json", "polices.json", "planche-en-vrai.png", "etat.json", "depense.json", "usage.json", "rapport.txt"]) expect(existe(f), f).toBe(true);
    expect(r.logos.filter((f) => !/favicon-\d|icone-512|avatar|symbole/.test(f))).toHaveLength(10);
    // Les publications aux formats finaux, l'ouverture du site réduite à 1920 × 720.
    for (const [n, w, h] of [["publication-1x1", 1080, 1080], ["publication-4x5", 1080, 1350], ["publication-9x16", 1080, 1920], ["ouverture-site", 1920, 720]] as const) {
      const m = await sharp(path.join(sortie, `cases/${n}-gardee-hd.png`)).metadata();
      expect([m.width, m.height], n).toEqual([w, h]);
    }
    const palette = JSON.parse(lire("palette.json"));
    expect(palette.couleurs.length).toBe(P.lesCases("standard").pastilles.length);
    expect(palette.couleurs.every((c: { hex: string }) => /^#[0-9A-F]{6}$/.test(c.hex))).toBe(true);
    expect(Object.keys(palette.roles).sort()).toEqual(["accent", "dark", "light", "primary", "secondary"]);
    const polices = JSON.parse(lire("polices.json"));
    expect(polices.lues.titres.nom).toBe("Playfair Display");
    expect(polices.choisies.titres.lue).toBe("Playfair Display");
    expect(Array.isArray(polices.remplacees)).toBe(true);
    // La dépense réelle comptée par le Studio, appel par appel : la moitié de chaque maximum, tout à la charge du client.
    expect(r.appels).toHaveLength(22);
    expect(r.appels.every((a) => !a.studio && a.reelMicro === a.reserveMicro / 2)).toBe(true);
    expect(r.depenseMicro).toBe((INVENTAIRE + 17 * IMAGE + 4 * RELECTURE) / 2);
    const rapport = lire("rapport.txt");
    expect(rapport).toContain("Planche choisie : assets/planche-de-marque/disposition.png");
    expect(rapport).toContain("© 2026 Racine ; racine-officiel.fr — disponible");
    expect(rapport).toContain("Planche assemblée : planche-en-vrai.png (3072 × 4608)");
    expect(rapport).toContain("Plafond minimal pour aller au bout à coup sûr");
    expect(rapport).not.toMatch(/ARRÊT/);
  });

  it("le logo n'est joint (et dit) que là où l'inventaire le voit", async () => {
    const { existe } = await lancer();
    expect(demandes).toHaveLength(17);
    for (const d of demandes) {
      const avec = AVEC_LOGO.has(d.element);
      expect(d.roles, d.element).toEqual(avec ? ["apercu", "logo"] : ["apercu"]);
      expect(d.texte.includes(P.regleDuLogo("Racine")), d.element).toBe(avec);
      expect(d.texte.startsWith(P.REGLE_APERCU)).toBe(true);
      expect(d.texte).toContain(P.SANS_PERSONNE_EN_VRAI);
    }
    expect(existe("cases/publication-1x1-1-jointe-2-logo.png")).toBe(true);
    expect(existe("cases/reference-1-1-jointe-2-logo.png")).toBe(false);
  });

  it("sans aucune photo de produit : jamais de photo jointe, les produits restent « image d'ambiance », et SINA le dit", async () => {
    const { r, lire } = await lancer();
    const produits = demandes.filter((d) => d.element.startsWith("produit-"));
    expect(produits).toHaveLength(3);
    for (const d of demandes) { expect(d.roles).not.toContain("produit"); expect(d.texte).not.toMatch(/photo du vrai produit du client/); }
    expect(r.etat!.elements.filter((e) => e.element.startsWith("produit-")).every((e) => e.ambiance && e.id)).toBe(true);
    expect(r.etat!.elements.filter((e) => e.ambiance).map((e) => e.element)).toEqual(["produit-1", "produit-2", "produit-3"]);
    expect(lire("rapport.txt")).toContain("Photos de produit du client : 0");
    expect(lire("rapport.txt")).toMatch(/produit-1 : GARDÉE \(cases\/produit-1-gardee-hd\.png\) — image d'ambiance, ce n'est pas son produit/);
    expect(r.etat!.issues.join(" ")).toMatch(/ambiance/);
  });

  it("une image refusée est refaite une fois, avec ses raisons, à la charge du Studio ; la refusée est gardée", async () => {
    verdicts = { "reference-2:1": { note: 6 } };
    const { r, lire, existe } = await lancer();
    expect(r.arret).toBeUndefined();
    expect(appels.slice(-2)).toEqual(["image:reference-2-r1", "relecture:relecture-references-r1"]);
    const reprise = demandes.find((d) => d.cle === "reference-2-r1")!;
    expect(reprise.texte.endsWith("\n\nÀ corriger : sa fidélité n'est pas au niveau (6/10, il faut 8).")).toBe(true);
    expect(existe("cases/reference-2-1-hd.png") && existe("cases/reference-2-2-hd.png") && existe("cases/reference-2-gardee-hd.png")).toBe(true);
    expect(JSON.parse(lire("relectures/references-1-verdict.json")).raisons["reference-2"]).toEqual(["sa fidélité n'est pas au niveau (6/10, il faut 8)"]);
    expect(JSON.parse(lire("relectures/references-2-verdict.json")).gardees).toEqual(["reference-2"]);
    expect(r.cases.find((c) => c.element === "reference-2")).toMatchObject({ gardee: true });
    // La reprise (image et relecture) est à la charge du Studio.
    expect(r.appels.filter((a) => a.studio)).toHaveLength(2);
    expect(lire("rapport.txt")).toContain("essai 2 (reprise à la charge du Studio)");
  });

  it("une image refusée deux fois n'a pas de fichier HD : aucun troisième essai, l'aperçu garde sa case sur la planche", async () => {
    verdicts = { "reference-2:1": { note: 6 }, "reference-2:2": { texteCoupe: true } };
    const { r, sortie, lire, existe } = await lancer();
    expect(r.arret).toBeUndefined();
    expect(appels.filter((a) => a.startsWith("image:reference-2"))).toEqual(["image:reference-2", "image:reference-2-r1"]);
    expect(r.etat!.elements.find((e) => e.element === "reference-2")).toMatchObject({ id: null, essais: 2 });
    expect(existe("cases/reference-2-gardee-hd.png")).toBe(false);
    expect(existe("cases/reference-2-2-hd.png")).toBe(true);
    expect(lire("rapport.txt")).toMatch(/reference-2 : NON gardée, l'aperçu garde sa case \(.*texte est coupé/);
    expect(r.etat!.issues.join(" ")).toMatch(/sa case garde l'aperçu de ta planche choisie/);
    // Sur la planche assemblée : la case gardée est l'image refaite (magenta), la refusée garde l'aperçu de la démonstration.
    const planche = fs.readFileSync(path.join(sortie, "planche-en-vrai.png")), demo = fs.readFileSync(DEMO);
    const centre = (n: string) => { const b = JSON.parse(lire("apercus/cases.json")).boites[n]; return [Math.round((b[0] + b[2]) / 2), Math.round((b[1] + b[3]) / 2)]; };
    const [x1, y1] = centre("reference-1"), [x2, y2] = centre("reference-2");
    expect(await px(planche, x1 * 2, y1 * 2)).toEqual([255, 0, 255]);
    const attendu = await px(demo, x2, y2), lu = await px(planche, x2 * 2, y2 * 2);
    expect(lu.every((v, i) => Math.abs(v - attendu[i]) <= 24), `${lu} / ${attendu}`).toBe(true);
  });

  it("le garde-fou refuse l'appel au-dessus du plafond : il ne part pas, rien n'est relancé, le script le dit", async () => {
    const { r, lire } = await lancer("0.30");
    expect(r.arret).toMatch(/garde-fou de l'essai a refusé un appel/);
    const images = appels.filter((a) => a.startsWith("image:"));
    expect(images.length).toBeGreaterThan(1);
    expect(images.length).toBeLessThan(17);
    expect(appels.some((a) => a.startsWith("relecture:"))).toBe(false);
    // L'appel refusé n'a rien rendu : pas d'image HD pour sa case, et rien n'est tenté après lui.
    const refusee = images.at(-1)!.replace("image:", "");
    expect(r.cases.find((c) => c.element === refusee)?.essais[0]?.brute).toBeUndefined();
    expect(r.planche).toBeUndefined();
    expect(all("SELECT 1 FROM ai_reservations WHERE model='simule'")).toBeTruthy();
    expect(lire("rapport.txt")).toMatch(/ARRÊT : le garde-fou de l'essai a refusé un appel/);
  });

  it("le client Écume, sa planche choisie lue dans le résultat de l'essai des planches : sa phrase et son domaine partent, aucune trace de Racine", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "essai-envrai-ecume-"));
    const { logo: l } = await preparer();
    const resultat = path.join(dir, "planche-B-resultat.json");
    fs.writeFileSync(resultat, JSON.stringify({ nom: "Écume", disposition: "standard", logo: { fichier: l, sha256: crypto.createHash("sha256").update(fs.readFileSync(l)).digest("hex") }, planche: { image: { id: "x", w: 1536, h: 2304 }, domaine: "ecume-savonnerie.fr", statut: "disponible", annee: 2026 } }));
    const env = { RESULTAT_PLANCHE: resultat, PHRASE: "Savons solides faits main" };
    const donnees = donneesDeLaPlanche(ECUME, env);
    expect(donnees).toEqual({ domaine: "ecume-savonnerie.fr", statut: "disponible", annee: 2026, disposition: "standard", phrase: "Savons solides faits main" });
    expect(() => logoDeLaPlancheVerifie(env, fs.readFileSync(l))).not.toThrow();
    expect(() => logoDeLaPlancheVerifie(env, fs.readFileSync(DEMO))).toThrow(/n'est pas celui de la planche choisie/);
    accroche = "Un savon qui mousse dans ta main";
    try {
      const sortie = path.join(dir, "sortie");
      const r = await essaiDeLaPlancheEnVrai({ sortie, plafondEuros: "5", planche: DEMO, logo: l, client: ECUME, donnees, ai: simule as never });
      expect(r.arret).toBeUndefined();
      expect(envoyes.length).toBe(1 + 17 + 4);
      for (const t of envoyes) expect(sansRacine(t), t.slice(0, 200)).toBe(true);
      // Le nom du client dans la règle du logo, là où l'inventaire voit le logo.
      expect(demandes.filter((d) => d.texte.includes(P.regleDuLogo("Écume"))).map((d) => d.element).sort()).toEqual([...AVEC_LOGO].sort());
      const rapport = fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8");
      expect(rapport).toContain("client « Écume » (savonnerie artisanale");
      expect(rapport).toContain("© 2026 Écume ; ecume-savonnerie.fr — disponible ; phrase sous le nom : « Savons solides faits main »");
      expect(sansRacine(rapport)).toBe(true);
      // Ce que l'écran relira : le client, les données, le projet.
      expect(JSON.parse(fs.readFileSync(path.join(sortie, "essai.json"), "utf8"))).toMatchObject({ client: { nom: "Écume" }, donnees, projectId: r.projectId });
      const { brandSheetOf } = await import("@/lib/syna-agent/brand-sheet");
      const { runWithLang } = await import("@/lib/i18n-server");
      expect(runWithLang({ ui: "fr", content: "fr" }, () => brandSheetOf(r.projectId!)).name).toBe("Écume");
    } finally { accroche = "Une plante qui pousse chez toi"; }
  });

  it("le domaine sans résultat ni variable : vérifié par le Studio (findDomains, annuaires simulés), comme la planche", async () => {
    const { domainDeps } = await import("@/lib/syna-agent/brand-domains");
    const regardes: string[] = [];
    domainDeps.lookup = async (d) => { regardes.push(d); return d.startsWith("ecume.") || d.startsWith("ecumefrance.") ? "pris" : "libre"; };
    try {
      const v = await donneesVerifiees(ECUME, { ANNEE: "2026" });
      expect(regardes[0]).toBe("ecume.fr");
      expect(v.verifie?.free[0]).toBe("ecume-savonnerie.fr");
      expect(v.donnees).toEqual({ domaine: "ecume-savonnerie.fr", statut: "disponible", annee: 2026, disposition: "standard", phrase: "" });
      // Tout est pris : « Adresse à choisir », sans domaine.
      domainDeps.lookup = async () => "pris";
      expect((await donneesVerifiees(ECUME, { ANNEE: "2026" })).donnees).toMatchObject({ domaine: null, statut: "adresse_a_choisir" });
      // Donné : aucune vérification.
      regardes.length = 0; domainDeps.lookup = async (d) => { regardes.push(d); return "libre"; };
      expect((await donneesVerifiees(ECUME, { DOMAINE: "ecume.fr", ANNEE: "2026" })).verifie).toBeUndefined();
      expect(regardes).toEqual([]);
    } finally { delete domainDeps.lookup; }
  });

  it("le client et les données de la planche : aucune valeur par défaut, rien n'est deviné, une contradiction fait tout refuser", () => {
    expect(() => clientDeLEssai({})).toThrow(/Client de l'essai manquant/);
    expect(() => donneesDeLaPlanche(RACINE, {})).toThrow(/Statut du domaine|Domaine de la planche/);
    expect(donneesDeLaPlanche(RACINE, DONNEES_RACINE)).toEqual({ domaine: "racine-officiel.fr", statut: "disponible", annee: 2026, disposition: "standard", phrase: "" });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "essai-envrai-resultat-"));
    const resultat = path.join(dir, "planche-A-resultat.json");
    fs.writeFileSync(resultat, JSON.stringify({ nom: "Écume", disposition: "standard", planche: { image: { id: "x" }, domaine: "ecume-savonnerie.fr", statut: "disponible", annee: 2026 } }));
    expect(() => donneesDeLaPlanche(RACINE, { RESULTAT_PLANCHE: resultat })).toThrow(/celle de « Écume », pas de « Racine »/);
    expect(() => donneesDeLaPlanche(ECUME, { RESULTAT_PLANCHE: resultat, DOMAINE: "ecume.fr" })).toThrow(/DOMAINE .* contredit la planche choisie/);
    expect(() => donneesDeLaPlanche(ECUME, { RESULTAT_PLANCHE: resultat, ANNEE: "2027" })).toThrow(/ANNEE .* contredit/);
    expect(() => donneesDeLaPlanche(ECUME, { RESULTAT_PLANCHE: path.join(dir, "absent.json") })).toThrow(/introuvable/);
    const refusee = path.join(dir, "planche-B-resultat.json");
    fs.writeFileSync(refusee, JSON.stringify({ nom: "Écume", planche: { domaine: "ecume-savonnerie.fr", statut: "disponible", annee: 2026, raison: "refusée deux fois" } }));
    expect(() => donneesDeLaPlanche(ECUME, { RESULTAT_PLANCHE: refusee })).toThrow(/n'a pas été gardée/);
    const src = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8") + fs.readFileSync("scripts/syna-recette/ecran-planche-en-vrai.mts", "utf8") + fs.readFileSync("scripts/syna-recette/ecran-planche-en-vrai-outil.ts", "utf8");
    expect(sansRacine(src)).toBe(true);
  });

  it("les données de la planche données par variables (sans résultat)", () => {
    const tenon = { nom: "Tenon", metier: "menuisier", kind: "services" as const, produits: ["cuisines"] };
    expect(() => donneesDeLaPlanche(tenon, {})).toThrow(/Statut du domaine|Domaine de la planche/);
    expect(() => donneesDeLaPlanche(tenon, { DOMAINE: "tenon.fr" })).toThrow(/Année de la planche/);
    expect(donneesDeLaPlanche(tenon, { DOMAINE_STATUT: "adresse_a_choisir", ANNEE: "2026", DISPOSITION: "animaux", PHRASE: "Menuisier à Lyon" })).toEqual({ domaine: null, statut: "adresse_a_choisir", annee: 2026, disposition: "animaux", phrase: "Menuisier à Lyon" });
    expect(() => donneesDeLaPlanche(RACINE, { ...DONNEES_RACINE, DISPOSITION: "autre" })).toThrow(/Disposition fausse/);
  });

  it("le devis, sans appel : le probable du Studio, la somme des maxima reprises comprises, et le détail", async () => {
    const d = await devisDeLEssaiEnVrai();
    const s = T.devisDeLaPlancheEnVrai();
    expect(d.devisDuStudio).toEqual(s);
    expect(d.lignes).toHaveLength(1 + 4 * P.GROUPES.length);
    expect(d.lignes.filter((l) => l.quoi === "retouche").reduce((n, l) => n + l.appels, 0)).toBe(17);
    expect(d.lignes.filter((l) => l.quoi === "reprise d'une retouche").reduce((n, l) => n + l.appels, 0)).toBe(17);
    expect(d.lignes.filter((l) => l.quoi === "relecture").map((l) => l.categorie)).toEqual(P.GROUPES.map((g) => P.NOM_DU_GROUPE[g]));
    expect(d.lignes.filter((l) => l.charge === "Studio").every((l) => l.quand === "si le relecteur refuse")).toBe(true);
    expect(Math.abs(d.probableMicro - s.probableMicro)).toBeLessThanOrEqual(2);
    expect(Math.abs(d.probableAvecReprisesMicro - (s.probableMicro + s.repriseProbableMicro))).toBeLessThanOrEqual(4);
    // Le garde-fou réserve le maximum de chaque appel : le plafond minimal est le plafond du client plus la borne du Studio.
    expect(Math.abs(d.plafondMinimalMicro - (s.maxMicro + s.repriseMicro))).toBeLessThanOrEqual(4);
    expect(Math.abs(d.plafondMinimalMicro - (s.maxMicro + s.studioMaxMicro))).toBeLessThanOrEqual(4);
    expect(d.plafondConseilleMicro).toBeGreaterThanOrEqual(d.plafondMinimalMicro);
    expect(d.plafondConseilleMicro % 100_000).toBe(0);
  });

  it("le parcours est enregistré comme la vraie tâche : l'onglet Marque trouve la planche en vrai, les logos, la palette et les polices ; le fil se lit", async () => {
    const { r } = await lancer();
    expect(r.arret).toBeUndefined();
    const { brandSheetOf } = await import("@/lib/syna-agent/brand-sheet");
    const { journeyOfProject } = await import("@/lib/syna-agent/construction");
    const { runWithLang } = await import("@/lib/i18n-server");
    const j = journeyOfProject(r.projectId!)!;
    expect(j).toBeTruthy();
    expect(j.identities?.list.map((x) => x.key)).toEqual(["A"]);
    expect(j.identityChoice?.key).toBe("A");
    expect(j.plancheEnVrai?.planche?.id).toBe(r.etat!.planche!.id);
    // Comme la fin de la marque (brand-finish.ts) : la charte est préparée et l'étape « Image de marque complète » attend
    // la validation du client ; le logo est fait ; les angles, l'activité, le site et la suite restent à faire.
    expect(j.brandKit?.items.length).toBeGreaterThan(0);
    expect([0, 1, 2].map((n) => j.steps[n]?.status)).toEqual(["done", "done", "done"]);
    expect(j.steps[3]?.status).toBe("review");
    for (const n of [4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) expect(j.steps[n]?.status).toBe("todo");
    const s = runWithLang({ ui: "fr", content: "fr" }, () => brandSheetOf(r.projectId!));
    expect(s.stage).toBe("finished");
    expect(s.name).toBe("Racine");
    expect(s.enVrai?.planche).toMatchObject({ w: 3072, h: 4608 });
    // Les dix versions, puis le symbole seul, le favicon 32, l'icône 512 et l'avatar : une seule section des logos.
    expect(s.enVrai?.logos.map((l) => l.version)).toEqual([...VERSIONS_DU_LOGO, "symbole", "favicon-32", "icone-512", "avatar"]);
    expect(s.enVrai?.couleurs.map((c) => c.hex)).toEqual(r.etat!.palette.map((p) => p.hex));
    expect(s.enVrai?.polices.map((p) => p.famille)).toEqual(["Playfair Display", "Montserrat"]);
    // 17 images refaites, montrées en 16 : l'ordinateur et le téléphone en une seule, « Le site sur ordinateur et téléphone ».
    expect(s.enVrai?.images).toHaveLength(16);
    expect(s.enVrai?.images.filter((i) => i.element.startsWith("site")).map((i) => i.label)).toEqual(["Le site sur ordinateur et téléphone"]);
    expect(r.etat!.elements).toHaveLength(17);
    expect(s.planches.map((p) => p.key)).toEqual(["A"]);
    // La marque du projet porte la palette mesurée et les polices lues ; ses couleurs s'affichent.
    expect(s.colors.length).toBe(5);
    expect(s.fonts.heading?.family).toBe("Playfair Display");
    // Le fil du projet se lit sans erreur (les cartes des identités sont préparées pour l'écran).
    const { threadView } = await import("@/lib/syna-agent/loop");
    const { one } = await import("@/lib/db");
    const user = one<any>("SELECT id, email, name, role, timezone, created_at FROM users WHERE id=(SELECT user_id FROM projects WHERE id=?)", r.projectId);
    const v = await runWithLang({ ui: "fr", content: "fr" }, async () => threadView(user, r.conversationId!));
    expect((v as { journey: { identities?: { list: unknown[] } } }).journey.identities?.list).toHaveLength(1);
  });

  it("l'écran de la planche en vrai : le parcours écrit depuis etat.json, un compte fictif connu, l'adresse de la page Marque ; un média manquant fait tout refuser", async () => {
    const { r, sortie } = await lancer();
    const { preparerLEcran, MOT_DE_PASSE_DE_RECETTE } = await import("../scripts/syna-recette/ecran-planche-en-vrai-outil");
    const { one, run } = await import("@/lib/db");
    const etat = path.join(sortie, "etat.json");
    // Une base où le projet n'a encore aucun parcours (comme celle de l'essai du 25 novembre 2026).
    run("DELETE FROM agent_conversations WHERE project_id=?", r.projectId);
    expect((await import("@/lib/syna-agent/construction")).journeyOfProject(r.projectId!)).toBeNull();
    // Refus propres, sans rien écrire.
    await expect(preparerLEcran({ projectId: r.projectId!, etat: path.join(sortie, "absent.json") })).rejects.toThrow(/introuvable/);
    await expect(preparerLEcran({ projectId: r.projectId!, etat, email: "quelqu.un@gmail.com" })).rejects.toThrow(/example\.com/);
    await expect(preparerLEcran({ projectId: "inconnu", etat })).rejects.toThrow(/Projet inconnu introuvable/);
    const casse = JSON.parse(fs.readFileSync(etat, "utf8"));
    casse.logos[3].id = "media-absent";
    const etatCasse = path.join(sortie, "etat-casse.json"); fs.writeFileSync(etatCasse, JSON.stringify(casse));
    await expect(preparerLEcran({ projectId: r.projectId!, etat: etatCasse })).rejects.toThrow(/logo logo-compact \(media-absent\)/);
    expect(one("SELECT 1 FROM agent_conversations WHERE project_id=?", r.projectId)).toBeUndefined();
    // Sans l'essai.json écrit par l'essai, ni client donné : rien n'est écrit (aucun client par défaut).
    const seul = fs.mkdtempSync(path.join(os.tmpdir(), "ecran-sans-essai-")), etatSeul = path.join(seul, "etat.json");
    fs.copyFileSync(etat, etatSeul);
    await expect(preparerLEcran({ projectId: r.projectId!, etat: etatSeul, env: {} })).rejects.toThrow(/Client de l'essai manquant/);
    expect(one("SELECT 1 FROM agent_conversations WHERE project_id=?", r.projectId)).toBeUndefined();
    // Le bon état : le parcours, le compte, l'adresse ; le client et les données sont relus dans l'essai.json.
    expect(JSON.parse(fs.readFileSync(path.join(sortie, "essai.json"), "utf8")).client.nom).toBe("Racine");
    const e = await preparerLEcran({ projectId: r.projectId!, etat, port: 3493 });
    expect(e.url).toBe(`http://localhost:3493/studio/${r.projectId}/marque`);
    expect(e).toMatchObject({ email: "planche-en-vrai@example.com", motDePasse: "Recette-492-fictif" });
    expect(MOT_DE_PASSE_DE_RECETTE).toBe("Recette-492-fictif");
    const u = one<{ password_hash: string }>("SELECT password_hash FROM users WHERE email=?", e.email)!;
    expect(await (await import("bcryptjs")).default.compare(MOT_DE_PASSE_DE_RECETTE, u.password_hash)).toBe(true);
    const { runWithLang } = await import("@/lib/i18n-server");
    const { brandSheetOf } = await import("@/lib/syna-agent/brand-sheet");
    const s = runWithLang({ ui: "fr", content: "fr" }, () => brandSheetOf(r.projectId!));
    // Les dix versions, puis le symbole seul, le favicon 32, l'icône 512 et l'avatar : une seule section des logos.
    expect(s.enVrai?.logos.map((l) => l.version)).toEqual([...VERSIONS_DU_LOGO, "symbole", "favicon-32", "icone-512", "avatar"]);
    expect(s.enVrai?.planche).toMatchObject({ w: 3072, h: 4608 });
    // Relancé une seconde fois : le même fil, rien n'est doublé.
    const e2 = await preparerLEcran({ projectId: r.projectId!, etat, port: 3493 });
    expect(e2.conversationId).toBe(e.conversationId);
    // Le script n'appelle ni l'IA ni le réseau, et n'a aucune clé.
    const src = fs.readFileSync("scripts/syna-recette/ecran-planche-en-vrai.mts", "utf8") + fs.readFileSync("scripts/syna-recette/ecran-planche-en-vrai-outil.ts", "utf8");
    expect(src).not.toMatch(/fetch\(|llmJson|vraisAppelsEnVrai|sk-ant-|sk-proj-|https:\/\//);
  });

  it("REFAIRE_LOGOS : les logos refaits par le code corrigé à partir du logo fini, sans aucun appel ; l'état, les médias, la marque et le parcours mis à jour", async () => {
    const { r, sortie } = await lancer();
    const { preparerLEcran } = await import("../scripts/syna-recette/ecran-planche-en-vrai-outil");
    const { saveAsset, getAsset, assetData } = await import("@/lib/library");
    const { one } = await import("@/lib/db");
    const { journeyOfProject } = await import("@/lib/syna-agent/construction");
    const { loadProject } = await import("@/lib/projects");
    const { runWithLang } = await import("@/lib/i18n-server");
    // Une base d'avant la correction : le logo fini est le vrai logo de Racine, les versions montrent le logo complet.
    const userId = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id=?", r.projectId)!.user_id;
    const fini = await saveAsset({ userId, projectId: r.projectId!, data: fs.readFileSync("tests/fixtures/planche-en-vrai/esquisse-11-logo-garde-512.png"), name: "logo-fini.png", mime: "image/png", role: "logo", origin: "generated", status: "ready" });
    const fichier = path.join(sortie, "etat.json");
    const avant = JSON.parse(fs.readFileSync(fichier, "utf8"));
    avant.logo = fini.id; avant.symboleComplet = true;
    avant.issues = [...avant.issues, runWithLang({ ui: "fr", content: "fr" }, () => P.phraseDuSymboleComplet())];
    fs.writeFileSync(fichier, JSON.stringify(avant));
    const appelsAvant = appels.length;
    const e = await runWithLang({ ui: "fr", content: "fr" }, () => preparerLEcran({ projectId: r.projectId!, etat: fichier, email: "logos-refaits@example.com", refaireLesLogos: true }));
    expect(appels.length).toBe(appelsAvant);
    expect(e.logosRefaits?.symboleComplet).toBe(false);
    const apres = JSON.parse(fs.readFileSync(fichier, "utf8"));
    // L'ancien état est gardé ; le nouveau a dix nouvelles versions, de nouveaux favicons, la phrase du symbole complet retirée.
    expect(JSON.parse(fs.readFileSync(path.join(sortie, "etat-avant-logos.json"), "utf8")).logos).toEqual(avant.logos);
    expect(apres.logos).toHaveLength(10);
    for (const [i, l] of apres.logos.entries()) { expect(l.version).toBe(avant.logos[i].version); expect(l.id).not.toBe(avant.logos[i].id); expect(assetData(getAsset(l.id)!).length).toBeGreaterThan(0); }
    expect(apres.favicons.f32).not.toBe(avant.favicons.f32);
    expect(apres.symboleComplet).toBe(false);
    expect(apres.issues.some((l: string) => /séparer proprement le symbole/.test(l))).toBe(false);
    // Les images refaites ne sont jamais touchées ; avec l'inventaire, la planche est réassemblée.
    expect(apres.elements).toEqual(avant.elements);
    if (avant.inventaire) { expect(e.logosRefaits?.plancheReassemblee).toBe(true); expect(apres.planche.id).not.toBe(avant.planche.id); }
    // Le parcours et la marque lisent le nouvel état : le symbole seul, tiré du vrai logo.
    const j = journeyOfProject(r.projectId!)!;
    expect(j.plancheEnVrai?.logos.map((l) => l.id)).toEqual(apres.logos.map((l: { id: string }) => l.id));
    expect(j.brandFinish?.issues).toEqual(apres.issues);
    const mark = loadProject(r.projectId!).brand?.logo.markAssetId;
    expect(mark && getAsset(mark)?.role).toBe("logo-mark");
    const compact = await sharp(assetData(getAsset(apres.logos.find((l: { version: string }) => l.version === "logo-compact").id)!)).metadata();
    const complet = await sharp(assetData(getAsset(apres.logos.find((l: { version: string }) => l.version === "logo-principal").id)!)).metadata();
    // Le compact ne montre que le symbole : bien moins haut par rapport à sa largeur que le logo complet empilé.
    expect(compact.width! / compact.height!).not.toBeCloseTo(complet.width! / complet.height!, 1);
    // L'option ne passe par aucun appel.
    const src = fs.readFileSync("scripts/syna-recette/ecran-planche-en-vrai.mts", "utf8") + fs.readFileSync("scripts/syna-recette/ecran-planche-en-vrai-outil.ts", "utf8");
    expect(src).toContain('refaireLesLogos: process.env.REFAIRE_LOGOS === "1"');
    expect(src).not.toMatch(/fetch\(|llmJson|vraisAppelsEnVrai|aiElementDeLaPlanche/);
  });

  it("le script n'écrit jamais une clé : la clé Anthropic vient de STUDIO_ANTHROPIC_KEY ; il ne passe que par les fonctions du Studio", () => {
    const src = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8");
    expect(src).toContain("process.env.STUDIO_ANTHROPIC_KEY");
    expect(src).not.toMatch(/sk-ant-|sk-proj-/);
    expect(src).toContain("T.plancheEnVrai({ ctx, ai,");
    expect(src).toContain("T.vraisAppelsEnVrai(qui)");
    expect(src).toContain("T.devisDeLaPlancheEnVrai()");
    expect(src).not.toMatch(/aiElementDeLaPlanche\(|llmJson\(|refaireLesElements\(|assemblerLaPlanche\(/);
  });

  it("la planche B d'Écume (26 novembre 2026) : la phrase sur deux lignes lue dans son résultat, jamais le « / » ; « Nunito » montrée en manuscrite, remplacée et dite", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "essai-envrai-b-"));
    const { logo: l } = await preparer();
    const resultat = path.join(dir, "planche-B-resultat.json");
    const reel = JSON.parse(fs.readFileSync("tests/fixtures/ecume-planches-2/planche-B-resultat.json", "utf8"));
    expect(reel.phrase).toEqual(["SAVONNERIE", "ARTISANALE"]);
    fs.writeFileSync(resultat, JSON.stringify({ ...reel, logo: { fichier: l, sha256: crypto.createHash("sha256").update(fs.readFileSync(l)).digest("hex") } }));
    // Sans PHRASE : les lignes du résultat ; avec le fichier de phrase de l'étape 2 (« SAVONNERIE / ARTISANALE ») : les mêmes lignes.
    expect(donneesDeLaPlanche(ECUME, { RESULTAT_PLANCHE: resultat }).phrase).toBe("SAVONNERIE / ARTISANALE");
    const donnees = donneesDeLaPlanche(ECUME, { RESULTAT_PLANCHE: resultat, PHRASE: "SAVONNERIE / ARTISANALE" });
    expect(donnees).toEqual({ domaine: "ecumefrance.fr", statut: "disponible", annee: 2026, disposition: "standard", phrase: "SAVONNERIE / ARTISANALE" });
    expect(donneesDeLaPlanche(ECUME, { RESULTAT_PLANCHE: resultat, PHRASE: "SAVONNERIE\nARTISANALE" }).phrase).toBe("SAVONNERIE / ARTISANALE");
    expect(() => donneesDeLaPlanche(ECUME, { RESULTAT_PLANCHE: resultat, PHRASE: "SAVONNERIE ARTISANALE" })).toThrow(/contredit la phrase de la planche choisie/);
    policesLues = { titres: { nom: "Playfair Display", genre: "serif" }, textes: { nom: "Nunito", genre: "manuscrite" } };
    const r = await essaiDeLaPlancheEnVrai({ sortie: path.join(dir, "sortie"), plafondEuros: "5", planche: DEMO, logo: l, client: ECUME, donnees, ai: simule as never });
    expect(r.arret).toBeUndefined();
    const etat = JSON.parse(fs.readFileSync(path.join(dir, "sortie", "etat.json"), "utf8"));
    expect(etat.polices.textes).toMatchObject({ famille: "Dancing Script", remplacee: true, pourquoi: "genre", lue: "Nunito" });
    expect(etat.issues.join(" ")).toContain("Sur ta planche, la police nommée « Nunito » était montrée en écriture manuscrite : j'ai pris celle du catalogue du Studio qui ressemble le plus à ce que tu as vu, « Dancing Script ».");
    const rapport = fs.readFileSync(path.join(dir, "sortie", "rapport.txt"), "utf8");
    expect(rapport).toContain("phrase sous le nom : « SAVONNERIE » puis « ARTISANALE »");
    // Le « / » n'est jamais écrit : ni au bas du badge, ni dans le ton redessiné, ni dans ce qui part vers l'IA.
    const C = await import("@/lib/syna-agent/planche-en-vrai-code");
    expect(C.texteDuBasDuBadge({ signature: donnees.phrase })).toBe("SAVONNERIE ARTISANALE");
    expect(C.texteDuBasDuBadge({ ligneDuLogo: ["SAVONNERIE", "ARTISANALE"] })).toBe("SAVONNERIE ARTISANALE");
    expect(C.texteDuBasDuBadge({ ligneDuLogo: "SAVONNERIE / ARTISANALE" })).toBe("SAVONNERIE ARTISANALE");
    expect(C.texteDuBasDuBadge({ ligneDuLogo: "Ouvert 7j/7" })).toBe("Ouvert 7j/7");
    for (const t of envoyes) expect(t).not.toContain("SAVONNERIE / ARTISANALE");
    const T2 = await import("@/lib/syna-agent/planche-en-vrai-tache");
    const inv = P.InventaireSchema.parse({ cases: [{ case: "ton", textes: ["Livraison offerte en 24 h"] }], polices: policesLues });
    const route = { key: "B", name: "Écume", slogan: donnees.phrase, palette: {}, board: { planche: { image: { id: "x", w: 1536, h: 2304 }, logo: "lg", domaine: "ecumefrance.fr", statut: "disponible", annee: 2026, essais: 2, at: 1 } } } as never;
    expect(T2.textesDeLaPlanche(inv, route).blocs.get("ton")).toEqual({ lignes: ["SAVONNERIE", "ARTISANALE"] });
  });
  it("le réassemblage d'un essai d'Écume (26 novembre 2026) : rejugé sans appel sur les verdicts réels, puis une seule reprise à la charge du Studio pour la case encore refusée", async () => {
    const { reassemblerLEssaiEnVrai, devisDuReassemblage } = await import("../scripts/syna-recette/essai-planche-en-vrai-outil");
    const Fx = "tests/fixtures/ecume-planche-en-vrai";
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reassemblage-"));
    const essai = path.join(dir, "essai"); fs.mkdirSync(path.join(essai, "apercus"), { recursive: true }); fs.mkdirSync(path.join(essai, "cases")); fs.mkdirSync(path.join(essai, "relectures"));
    fs.writeFileSync(path.join(essai, "essai.json"), JSON.stringify({ client: ECUME, donnees: { domaine: "ecumefrance.fr", statut: "disponible", annee: 2026, disposition: "standard", phrase: "SAVONNERIE / ARTISANALE" } }));
    fs.copyFileSync(`${Fx}/inventaire-reponse.json`, path.join(essai, "inventaire-reponse.json"));
    fs.copyFileSync(`${Fx}/cases-de-l-essai.json`, path.join(essai, "apercus", "cases.json"));
    for (const [f, g] of [["publications-1-verdict.json", "publications-1"], ["publications-2-verdict.json", "publications-2"], ["site-2-verdict.json", "site-2"]]) fs.copyFileSync(`${Fx}/${f}`, path.join(essai, "relectures", `${g}-verdict.json`));
    for (const [n, t, w, h] of [["publication-1x1", 1, 1088, 1088], ["publication-4x5", 1, 1088, 1360], ["publication-4x5", 2, 1088, 1360], ["publication-9x16", 1, 1088, 1936], ["publication-9x16", 2, 1088, 1936], ["site-telephone", 2, 1024, 1536]] as const)
      fs.writeFileSync(path.join(essai, "cases", `${n}-${t}-hd.png`), await uni(w, h, "#8899AA"));
    const planche = path.join(dir, "planche-B.png"); fs.writeFileSync(planche, await sharp(fs.readFileSync(`${Fx}/planche-B-gardee.jpg`)).png().toBuffer());
    const logoF = path.join(dir, "logo-10.png"); fs.copyFileSync(`${Fx}/esquisse-10-logo-garde-512.png`, logoF);
    // a) et b) : aucun appel.
    const sansAppel = { inventaire: async () => { throw new Error("aucun appel"); }, refaire: async () => { throw new Error("aucun appel"); }, relire: async () => { throw new Error("aucun appel"); } };
    const r = await reassemblerLEssaiEnVrai({ dossier: essai, sortie: path.join(dir, "a-b"), planche, logo: logoF, ai: () => sansAppel as never });
    const cas = (n: string) => r.cases.find((c) => c.element === n)!;
    expect(cas("publication-1x1").gardee).toBe(1);
    expect(cas("publication-9x16").gardee).toBe(1);
    expect(cas("site-telephone").gardee).toBe(2);
    expect(cas("publication-4x5").gardee).toBeNull();
    expect(cas("publication-4x5").essais.at(-1)!.raisonsApres).toEqual(["un texte est coupé ou collé au bord", "sa fidélité n'est pas au niveau (7/10, il faut 8)"]);
    expect(r.palette.map((p) => p.hex)).toEqual(["#C44912", "#D97A52", "#F6E8DA", "#A7B89B", "#8C6F4E"]);
    expect(r.logosDeLApercu.sort()).toEqual(["badge", "favicon", "icone", "logo-compact"]);
    expect((await sharp(path.join(dir, "a-b", "planche-en-vrai.png")).metadata()).width).toBe(3072);
    expect(fs.existsSync(path.join(dir, "a-b", "comparaison-apercu-et-reassemblee.jpg"))).toBe(true);
    // c) : la seule case encore refusée, reprise une fois avec ses raisons d'aujourd'hui, relue.
    const vus: string[] = [];
    const inv = P.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${Fx}/inventaire-reponse.json`, "utf8")));
    const ai = () => ({
      inventaire: sansAppel.inventaire,
      refaire: async (d: { element: string; texte: string; taille: string }, cle: string) => { vus.push(`image:${cle}`, d.texte); const [w, h] = d.taille.split("x").map(Number); return { png: await uni(w, h, "#8899AA"), recu: null }; },
      relire: async (images: { label: string }[], _demande: string, cle: string) => { vus.push(`relecture:${cle}`); return { images: images.filter((i) => i.label.endsWith(" refaite")).map((i) => ({ case: i.label.replace(/ refaite$/, ""), identique: true, textesLus: P.caseLue(inv, "publication-4x5")!.textes.slice(1), logoPresent: false, personne: false, logoFonceSurFondSombre: false, produitFidele: null, texteCoupe: false, note: 9, pourquoi: "" })) }; },
    });
    await expect(reassemblerLEssaiEnVrai({ dossier: essai, sortie: path.join(dir, "c0"), planche, logo: logoF, reprendre: ["publication-4x5"], ai: ai as never })).rejects.toThrow(/PLAFOND_ESSAI_EUR/);
    const c = await reassemblerLEssaiEnVrai({ dossier: essai, sortie: path.join(dir, "c"), planche, logo: logoF, reprendre: ["publication-4x5", "publication-9x16"], plafondEuros: "0.80", ai: ai as never });
    expect(vus.filter((v) => /^(image|relecture):/.test(v))).toEqual(["image:publication-4x5-reprise", "relecture:relecture-publications-reprise"]);
    expect(vus[1]).toMatch(/À corriger : un texte est coupé ou collé au bord/);
    expect(c.reprise).toMatchObject({ elements: ["publication-4x5"], gardees: ["publication-4x5"] });
    expect(c.cases.find((x) => x.element === "publication-4x5")!.gardee).toBe("reprise");
    expect(c.gardees).toBe(r.gardees + 1);
    expect((await devisDuReassemblage(["publication-4x5", "emballage"])).join("\n")).toMatch(/a\) réassemblage par le code : 0 € ; b\) rejugement des images de l'essai : 0 €[\s\S]*Plafond minimal exact pour la reprise/);
  });
});
