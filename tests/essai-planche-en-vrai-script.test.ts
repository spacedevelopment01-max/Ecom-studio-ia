/**
 * Le script de l'essai réel de la planche en vrai (scripts/syna-recette/essai-planche-en-vrai.mts), avec des appels
 * SIMULÉS : aucun appel payant. Chaque appel simulé passe par la réservation du Studio, comme les vrais, pour que le
 * garde-fou de l'essai le voie. Le parcours sans refus, une image refusée puis reprise une fois, une image refusée deux
 * fois (l'aperçu garde sa case), le logo joint seulement si l'inventaire le voit, le garde-fou qui refuse un appel, aucune
 * photo de produit (images d'ambiance), le devis, aucune clé.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

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
  const { RACINE, clientDeLEssai, donneesDeLaPlanche, devisDeLEssaiEnVrai, essaiDeLaPlancheEnVrai } = await import("../scripts/syna-recette/essai-planche-en-vrai-outil");
  const { all } = await import("@/lib/db");
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();

  const INVENTAIRE = 100_000, IMAGE = 50_000, RELECTURE = 60_000;
  const DEMO = "assets/planche-de-marque/disposition.png";
  const appels: string[] = [];
  const demandes: { element: string; cle: string; texte: string; roles: string[] }[] = [];
  /** Les cases où l'inventaire voit le logo. */
  const AVEC_LOGO = new Set(["publication-1x1", "site-ordinateur", "site-telephone", "emballage"]);
  let verdicts: Record<string, Record<string, unknown>> = {};
  const textesDe = (n: string) => (n.startsWith("publication-") ? [`Une plante qui pousse chez toi (${n.slice(12)})`] : []);
  const paye = (q: { userId: string; jobId: string }, max: number, task: string) =>
    withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, max, { task, provider: "openai", model: "simule", jobId: q.jobId }); billing.settle(rid, Math.round(max / 2), null, task); });
  const simule = (q: { userId: string; projectId: string; jobId: string }) => ({
    inventaire: async (images: { data: Buffer; label: string }[]) => {
      appels.push("inventaire"); await paye(q, INVENTAIRE, "quality_control");
      expect(images.at(-1)!.label).toBe("logo");
      const cases = images.map((im) => im.label).filter((l) => (P.NOMS_DES_ELEMENTS as string[]).includes(l));
      return P.InventaireSchema.parse({
        cases: cases.map((c) => ({ case: c, logo: AVEC_LOGO.has(c), textes: textesDe(c), produit: c.startsWith("produit-"), personne: false, comprehensible: c.startsWith("publication-") ? true : null, description: `la case ${c}` })),
        polices: { titres: { nom: "Playfair Display", genre: "serif" }, textes: { nom: "Montserrat", genre: "sans" } },
        couleurs: [{ nom: "Bordeaux", mots: ["profond"] }], icone: "le R", favicon: "le R", iconeReprendLeLogo: false,
      });
    },
    refaire: async (d: { element: string; texte: string; taille: string; jointes: { role: string }[] }, cle: string) => {
      appels.push(`image:${cle}`); demandes.push({ element: d.element, cle, texte: d.texte, roles: d.jointes.map((j) => j.role) });
      await paye(q, IMAGE, "image_generation");
      const [w, h] = d.taille.split("x").map(Number);
      return { png: await uni(w, h, MAGENTA), recu: null };
    },
    relire: async (images: { label: string }[], _demande: string, cle: string) => {
      appels.push(`relecture:${cle}`); await paye(q, RELECTURE, "quality_control");
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
  const lancer = async (plafondEuros = "5") => {
    const { sortie, logo: l } = await preparer();
    const r = await essaiDeLaPlancheEnVrai({ sortie, plafondEuros, planche: DEMO, logo: l, client: RACINE, donnees: donneesDeLaPlanche(RACINE, {}), ai: simule as never });
    return { r, sortie, lire: (f: string) => fs.readFileSync(path.join(sortie, f), "utf8"), existe: (f: string) => fs.existsSync(path.join(sortie, f)) };
  };
  afterEach(() => { appels.length = 0; demandes.length = 0; verdicts = {}; delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; setJsonSetting(P.REGLAGE_PLANCHE_EN_VRAI, false); });

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

  it("le client : Racine par défaut, avec les données de sa planche ; pour un autre, rien n'est deviné", () => {
    expect(clientDeLEssai({})).toEqual({ ...RACINE, descripteur: null });
    expect(donneesDeLaPlanche(RACINE, {})).toEqual({ domaine: "racine-officiel.fr", statut: "disponible", annee: 2026, disposition: "standard", phrase: "" });
    const tenon = { nom: "Tenon", metier: "menuisier", kind: "services" as const, produits: ["cuisines"] };
    expect(() => donneesDeLaPlanche(tenon, {})).toThrow(/Statut du domaine|Domaine de la planche/);
    expect(() => donneesDeLaPlanche(tenon, { DOMAINE: "tenon.fr" })).toThrow(/Année de la planche/);
    expect(donneesDeLaPlanche(tenon, { DOMAINE_STATUT: "adresse_a_choisir", ANNEE: "2026", DISPOSITION: "animaux", PHRASE: "Menuisier à Lyon" })).toEqual({ domaine: null, statut: "adresse_a_choisir", annee: 2026, disposition: "animaux", phrase: "Menuisier à Lyon" });
    expect(() => donneesDeLaPlanche(RACINE, { DISPOSITION: "autre" })).toThrow(/Disposition fausse/);
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

  it("le script n'écrit jamais une clé : la clé Anthropic vient de STUDIO_ANTHROPIC_KEY ; il ne passe que par les fonctions du Studio", () => {
    const src = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8");
    expect(src).toContain("process.env.STUDIO_ANTHROPIC_KEY");
    expect(src).not.toMatch(/sk-ant-|sk-proj-/);
    expect(src).toContain("T.plancheEnVrai({ ctx, ai,");
    expect(src).toContain("T.vraisAppelsEnVrai(qui)");
    expect(src).toContain("T.devisDeLaPlancheEnVrai()");
    expect(src).not.toMatch(/aiElementDeLaPlanche\(|llmJson\(|refaireLesElements\(|assemblerLaPlanche\(/);
  });
});
