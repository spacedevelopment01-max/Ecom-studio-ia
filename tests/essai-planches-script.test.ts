/**
 * Le script de l'essai réel des planches de marque (scripts/syna-recette/essai-planches.mts), avec des appels SIMULÉS :
 * aucun appel payant, aucune vérification réseau. Chaque appel simulé passe par la réservation du Studio, comme les vrais,
 * pour que le garde-fou de l'essai le voie. Parcours sans refus, une planche refusée puis reprise une fois, une planche
 * refusée deux fois (jamais gardée), le garde-fou qui refuse un appel, la disposition des animaux, aucune clé, le devis.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

const sha = (b: Buffer) => crypto.createHash("sha256").update(b).digest("hex");
/** Un logo fini simulé : un dessin sombre sur fond blanc. */
const logo = (teinte: string) => sharp({ create: { width: 512, height: 512, channels: 3, background: "#FFFFFF" } })
  .composite([{ input: { create: { width: 220, height: 140, channels: 3 as const, background: teinte } }, left: 146, top: 186 }]).png().toBuffer();

describe("le script de l'essai des planches de marque (appels simulés)", async () => {
  const billing = await import("@/lib/billing");
  const { withTrace } = await import("@/lib/ai/trace");
  const T = await import("@/lib/syna-agent/planche-de-marque-tache");
  const P = await import("@/lib/syna-agent/planche-de-marque");
  const { clientDeLEssai, devisDeLEssai, essaiDesPlanches } = await import("../scripts/syna-recette/essai-planches-outil");
  const { RACINE, ECUME, sansRacine } = await import("./clients-d-essai");
  const { all } = await import("@/lib/db");

  const VALEURS = 30_000, IMAGE = 200_000, RELECTURE = 60_000;
  const appels: string[] = [];
  /** Tout ce qui part vers l'IA : la demande des valeurs, le texte de la planche, la demande au relecteur. */
  const envoyes: string[] = [];
  const textes: string[] = [];
  const dispositions: string[] = [];
  let verdicts: Record<string, Partial<{ note: number; nomLu: string; motMaquette: boolean }>> = {};
  let valeursSimulees = (nom: string) => ({ nom, traits: ["vivante", "chaleureuse", "généreuse", "naturelle"], emotion: "le plaisir de voir pousser ses plantes", images: ["plante dans un intérieur lumineux", "jardin qui pousse", "gros plan feuillage / terre / racines", "plante seule en studio", "pépinière et serres", "mise en pot"], produits: ["plantes d'intérieur", "arbustes", "jeunes arbres"], appel: "devis" as const });
  const paye = (q: { userId: string; jobId: string }, max: number, task: string) =>
    withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, max, { task, provider: "openai", model: "simule", jobId: q.jobId }); billing.settle(rid, Math.round(max / 2), null, task); });
  const simule = (q: { userId: string; projectId: string; jobId: string }) => ({
    valeurs: async (demande: string, tour: number) => { appels.push(`valeurs-${tour}`); envoyes.push(demande); await paye(q, VALEURS, "strategy"); return valeursSimulees(/Le nom de la marque : « (.+?) »/.exec(demande)![1]); },
    dessiner: async (_l: { assetId: string; data: Buffer }, d: { nom: string; data: Buffer }, texte: string, cle: string) => {
      appels.push(`image:${cle}`); textes.push(texte); envoyes.push(texte); dispositions.push(sha(d.data)); await paye(q, IMAGE, "image_generation");
      return { png: await sharp({ create: { width: 1536, height: 2304, channels: 3, background: "#F4EFE6" } }).png().toBuffer(), recu: null };
    },
    relire: async (bandes: Buffer[], _l: Buffer, _d: Buffer, demande: string, cle: string) => {
      appels.push(`relecture:${cle}`); envoyes.push(demande); await paye(q, RELECTURE, "quality_control");
      expect(bandes).toHaveLength(4);
      const nom = /Marque : « (.+?) »/.exec(demande)![1];
      // Ce que le relecteur lit sur la planche : ce que le texte a demandé d'écrire exactement.
      const ecrit = /écris exactement « (.+?) » et « (.+?) »/.exec(demande);
      return { nomLu: nom, logoFidele: true, copyrightLu: ecrit?.[2] ?? `© 2026 ${nom}`, domaineLu: ecrit?.[1] ?? `${nom.toLowerCase()}.fr — disponible`, fautes: [], promesses: [], personnes: false, logoFonceSurFondSombre: false, motMaquette: false, copies: [], note: 9, pourquoi: "simulé", ...verdicts[cle] };
    },
  });
  T.plancheDeps.domaines = async (nom: string) => ({ taken: [], free: [`${nom.toLowerCase()}.fr`], unknown: [], at: 1 });
  T.plancheDeps.annee = () => 2026;
  const preparer = async (n = 2) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "essai-planches-"));
    const entree = path.join(dir, "entree"); fs.mkdirSync(entree);
    const logos = await Promise.all(["#3A7D44", "#7A4EB0", "#B04E4E", "#4E7AB0"].slice(0, n).map(async (c, i) => { const f = path.join(entree, `esquisse-0${i + 1}-logo-garde.png`); fs.writeFileSync(f, await logo(c)); return f; }));
    return { sortie: path.join(dir, "sortie"), logos };
  };
  afterEach(() => { appels.length = 0; envoyes.length = 0; textes.length = 0; dispositions.length = 0; verdicts = {}; delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; });

  it("sans refus : les valeurs une fois, le domaine une fois, puis planche et relecture par logo ; tout est écrit", async () => {
    const { sortie, logos } = await preparer();
    let verifications = 0;
    const avant = T.plancheDeps.domaines;
    T.plancheDeps.domaines = async (nom, d) => { verifications += 1; return avant!(nom, d); };
    try {
      const r = await essaiDesPlanches({ sortie, plafondEuros: "2", logos, client: RACINE, ai: simule as never });
      expect(r.arret).toBeUndefined();
      expect(verifications).toBe(1);
      expect(appels).toEqual(["valeurs-1", "image:A-1-1", "relecture:A-1-1-relecture", "image:B-1-1", "relecture:B-1-1-relecture"]);
      expect(r.planches.map((p) => [p.key, p.gardee])).toEqual([["A", true], ["B", true]]);
      expect(r.domaine).toMatchObject({ domaine: "racine.fr", statut: "disponible", mention: "racine.fr — disponible" });
      expect(r.disposition).toBe("standard");
      expect(dispositions.every((d) => d === P.DISPOSITION.sha256)).toBe(true);
      const f = fs.readdirSync(sortie);
      expect(f).toEqual(expect.arrayContaining([
        "fiche-du-client.txt", "valeurs-1-demande.txt", "valeurs-1-reponse.json", "valeurs-du-metier.json", "domaine.json", "disposition-standard.png",
        "planche-A-logo-recu.png", "planche-A-1-texte-envoye.txt", "planche-A-1-brute.png", "planche-A-1-bande-1.png", "planche-A-1-bande-4.png",
        "planche-A-1-relecture-demande.txt", "planche-A-1-relecture-verdict.json", "planche-A-gardee.png", "planche-A-resultat.json", "planche-B-gardee.png",
        "depense.json", "usage.json", "rapport.txt",
      ]));
      // Le texte envoyé est celui du Studio : le texte des preuves, puis la phrase des données vérifiées.
      const texte = fs.readFileSync(path.join(sortie, "planche-A-1-texte-envoye.txt"), "utf8");
      expect(texte).toBe(textes[0]);
      expect(texte.endsWith("écris exactement « racine.fr — disponible » et « © 2026 Racine » ; n'ajoute aucune promesse, aucun chiffre ni aucun avis ; aucune personne visible.")).toBe(true);
      expect(fs.readFileSync(path.join(sortie, "fiche-du-client.txt"), "utf8")).toContain("plantes d'intérieur, arbustes, jeunes arbres");
      expect(JSON.parse(fs.readFileSync(path.join(sortie, "planche-A-1-relecture-verdict.json"), "utf8")).raisons).toEqual([]);
      // La dépense réelle comptée par le Studio, appel par appel : la moitié de chaque maximum, tout à la charge du client.
      expect(r.depenseMicro).toBe((VALEURS + 2 * (IMAGE + RELECTURE)) / 2);
      expect(r.appels).toHaveLength(5);
      expect(r.appels.every((a) => !a.studio && a.reelMicro === a.reserveMicro / 2)).toBe(true);
      const rapport = fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8");
      expect(rapport).toContain("Planche A (");
      expect(rapport).toMatch(/GARDÉE par le relecteur \(planche-A-gardee\.png, note 9\/10\)/);
      expect(rapport).toContain("Domaine vérifié avant le dessin : racine.fr — disponible");
      expect(rapport).toContain("Dépense réelle comptée par le Studio : 0,2750 €");
      expect(rapport).toContain("Plafond minimal pour aller au bout à coup sûr");
    } finally { T.plancheDeps.domaines = avant; }
  });

  it("une planche refusée est refaite une fois, avec ses raisons, à la charge du Studio", async () => {
    const { sortie, logos } = await preparer();
    verdicts = { "A-1-1-relecture": { note: 6 } };
    const r = await essaiDesPlanches({ sortie, plafondEuros: "2", logos, client: RACINE, ai: simule as never });
    expect(r.arret).toBeUndefined();
    expect(appels.filter((a) => a.includes(":A-"))).toEqual(["image:A-1-1", "relecture:A-1-1-relecture", "image:A-1-2", "relecture:A-1-2-relecture"]);
    expect(r.planches[0].essais[0].raisons).toEqual(["elle n'est pas au niveau (6/10, il faut 8)"]);
    expect(textes[1]).toBe(`${textes[0]}\n\nÀ corriger : elle n'est pas au niveau (6/10, il faut 8).`);
    expect(r.planches[0].gardee).toBe(true);
    expect(fs.existsSync(path.join(sortie, "planche-A-1-brute.png"))).toBe(true); // la refusée est gardée
    expect(JSON.parse(fs.readFileSync(path.join(sortie, "planche-A-1-relecture-verdict.json"), "utf8")).gardee).toBe(false);
    // La reprise (image et relecture) est à la charge du Studio.
    expect(r.appels.filter((a) => a.studio)).toHaveLength(2);
    expect(fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8")).toContain("essai 2 (reprise à la charge du Studio)");
  });

  it("une planche refusée deux fois n'est jamais gardée : aucun troisième essai, l'autre logo continue", async () => {
    const { sortie, logos } = await preparer();
    verdicts = { "A-1-1-relecture": { note: 5 }, "A-1-2-relecture": { motMaquette: true } };
    const r = await essaiDesPlanches({ sortie, plafondEuros: "2", logos, client: RACINE, ai: simule as never });
    expect(r.arret).toBeUndefined();
    expect(appels.filter((a) => a.startsWith("image:A"))).toEqual(["image:A-1-1", "image:A-1-2"]);
    expect(r.planches[0].gardee).toBe(false);
    expect(r.planches[0].raison).toMatch(/refusée deux fois \(le mot « maquette »/);
    expect(r.planches[0].issues.join(" ")).toMatch(/je ne te montre pas cette planche/);
    expect(r.planches[1].gardee).toBe(true);
    expect(fs.existsSync(path.join(sortie, "planche-A-gardee.png"))).toBe(false);
    expect(fs.existsSync(path.join(sortie, "planche-A-2-brute.png"))).toBe(true);
    expect(fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8")).toMatch(/Planche A .*NON gardée, jamais montrée \(refusée deux fois/);
  });

  it("le garde-fou refuse l'appel au-dessus du plafond : il ne part pas, rien n'est relancé, le script le dit", async () => {
    const { sortie, logos } = await preparer();
    // 0,30 € : les valeurs (0,03 au plus) et la planche A (0,20 + 0,06) tiennent ; la planche B (0,20) ferait dépasser
    // (0,145 € réglés).
    const r = await essaiDesPlanches({ sortie, plafondEuros: "0.30", logos, client: RACINE, ai: simule as never });
    expect(r.arret).toMatch(/garde-fou de l'essai a refusé un appel \(planche B\)/);
    expect(appels).toEqual(["valeurs-1", "image:A-1-1", "relecture:A-1-1-relecture", "image:B-1-1"]);
    expect(r.planches[0].gardee).toBe(true);
    expect(r.planches[1].gardee).toBe(false);
    expect(fs.existsSync(path.join(sortie, "planche-B-1-brute.png"))).toBe(false);
    expect(all("SELECT 1 FROM ai_reservations WHERE model='simule'")).toBeTruthy();
    expect(fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8")).toMatch(/ARRÊT : le garde-fou de l'essai a refusé un appel/);
  });

  it("un métier d'animaux : la disposition des animaux est jointe, jamais la standard", async () => {
    const { sortie, logos } = await preparer();
    const avant = valeursSimulees;
    valeursSimulees = (nom) => ({ ...avant(nom), traits: ["douce", "soignée", "joyeuse"], emotion: "un chien propre et détendu", images: ["table de toilettage", "serviettes pliées", "brosses et peignes", "salon lumineux", "bain moussant"], produits: ["toilettage", "bains", "coupes"] });
    try {
      const client = { nom: "Poil", metier: "un salon de toilettage pour chiens", kind: "services" as const, produits: ["toilettage", "bains", "coupes"] };
      const r = await essaiDesPlanches({ sortie, plafondEuros: "2", logos, client, ai: simule as never });
      expect(r.arret).toBeUndefined();
      expect(r.disposition).toBe("animaux (métier proche des animaux)");
      expect(dispositions).toHaveLength(2);
      expect(dispositions.every((d) => d === P.DISPOSITION_DES_ANIMAUX!.sha256)).toBe(true);
      expect(fs.existsSync(path.join(sortie, "disposition-animaux.png"))).toBe(true);
      expect(textes[0]).toContain("Le site doit sembler être un vrai site de marque :");
      expect(r.planches.every((p) => p.gardee)).toBe(true);
    } finally { valeursSimulees = avant; }
  });

  it("le client Écume : le domaine passe par la vraie vérification du Studio (findDomains, annuaires simulés), disposition standard, aucune trace de Racine", async () => {
    const { domainDeps } = await import("@/lib/syna-agent/brand-domains");
    const { sortie, logos } = await preparer();
    const avant = valeursSimulees, domainesAvant = T.plancheDeps.domaines;
    valeursSimulees = (nom) => ({ nom, traits: ["douce", "artisanale", "généreuse", "naturelle"], emotion: "le parfum doux d'un savon qui sèche sur une étagère", images: ["savon posé sur une pierre humide", "mousse épaisse sur une pierre", "gros plan de la pâte à savon", "savon seul en studio", "atelier de fabrication", "emballage en papier kraft"], produits: ["savons solides", "shampoings solides", "baumes"], appel: "devis" as const });
    // Pas de raccourci des essais : la tâche appelle findDomains, qui interroge les annuaires (simulés ici, aucun réseau).
    delete T.plancheDeps.domaines;
    const regardes: string[] = [];
    domainDeps.lookup = async (d) => { regardes.push(d); return d.startsWith("ecume.") || d.startsWith("ecumefrance.") ? "pris" : "libre"; };
    try {
      const r = await essaiDesPlanches({ sortie, plafondEuros: "2", logos, client: ECUME, ai: simule as never });
      expect(r.arret).toBeUndefined();
      expect(regardes.slice(0, 5)).toEqual(["ecume.fr", "ecume.com", "ecumefrance.fr", "ecumefrance.com", "ecume-savonnerie.fr"]);
      expect(r.domaine).toMatchObject({ domaine: "ecume-savonnerie.fr", statut: "disponible", mention: "ecume-savonnerie.fr — disponible" });
      expect(r.valeurs?.ok ? "" : (r.valeurs as { raison: string }).raison).toBe("");
      expect(r.disposition).toBe("standard");
      expect(dispositions.every((d) => d === P.DISPOSITION.sha256)).toBe(true);
      expect(r.planches.map((p) => [p.key, p.gardee])).toEqual([["A", true], ["B", true]]);
      expect(textes[0].endsWith("écris exactement « ecume-savonnerie.fr — disponible » et « © 2026 Écume » ; n'ajoute aucune promesse, aucun chiffre ni aucun avis ; aucune personne visible.")).toBe(true);
      expect(envoyes.length).toBe(5);
      expect(envoyes[0]).toContain("Le nom de la marque : « Écume »");
      for (const t of envoyes) expect(sansRacine(t), t).toBe(true);
      expect(fs.readFileSync(path.join(sortie, "fiche-du-client.txt"), "utf8")).toContain("savons solides, shampoings solides, baumes");
      // Ce que la planche en vrai relira : le domaine, son statut, l'année, la disposition et le logo de la planche.
      const res = JSON.parse(fs.readFileSync(path.join(sortie, "planche-B-resultat.json"), "utf8"));
      expect(res).toMatchObject({ nom: "Écume", disposition: "standard", logo: { fichier: logos[1], sha256: sha(fs.readFileSync(logos[1])) }, planche: { domaine: "ecume-savonnerie.fr", statut: "disponible", annee: 2026 } });
      expect(sansRacine(fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8"))).toBe(true);
    } finally { valeursSimulees = avant; T.plancheDeps.domaines = domainesAvant; delete domainDeps.lookup; }
  });

  it("le client : aucun par défaut, ce qui est donné ; rien d'incomplet n'est lancé", () => {
    expect(() => clientDeLEssai({})).toThrow(/Client de l'essai manquant/);
    const src = fs.readFileSync("scripts/syna-recette/essai-planches.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-planches-outil.ts", "utf8");
    expect(sansRacine(src)).toBe(true);
    expect(clientDeLEssai({ CLIENT_NOM: "Tenon", CLIENT_METIER: "menuisier", CLIENT_TYPE: "services", CLIENT_PRODUITS: "cuisines ; dressings" })).toMatchObject({ nom: "Tenon", kind: "services", produits: ["cuisines", "dressings"] });
    expect(() => clientDeLEssai({ CLIENT_NOM: "Tenon" })).toThrow(/Métier du client manquant/);
    expect(() => clientDeLEssai({ CLIENT_NOM: "Tenon", CLIENT_METIER: "menuisier", CLIENT_TYPE: "autre", CLIENT_PRODUITS: "x" })).toThrow(/Type du client/);
  });

  it("le devis, sans appel : le probable du Studio et la somme des maxima, reprises comprises, pour 2 et 3 planches", async () => {
    for (const n of [2, 3]) {
      const d = await devisDeLEssai(n);
      const s = T.devisDesPlanchesDeMarque(n);
      expect(d.devisDuStudio).toEqual({ maxMicro: s.maxMicro, studioMaxMicro: s.studioMaxMicro, probableMicro: s.probableMicro });
      expect(d.lignes).toHaveLength(2 + 4 * n);
      expect(Math.abs(d.probableMicro - s.probableMicro)).toBeLessThanOrEqual(2);
      // Le garde-fou réserve le maximum de chaque appel : le plafond minimal est le plafond du client plus la borne du Studio.
      expect(Math.abs(d.plafondMinimalMicro - (s.maxMicro + s.studioMaxMicro))).toBeLessThanOrEqual(2);
      expect(d.plafondMinimalMicro).toBeGreaterThan(d.probableAvecReprisesMicro);
      expect(d.probableAvecReprisesMicro).toBeGreaterThan(d.probableMicro);
    }
  });

  it("le script n'écrit jamais une clé : la clé Anthropic vient de STUDIO_ANTHROPIC_KEY ; il ne passe que par les fonctions du Studio", () => {
    const src = fs.readFileSync("scripts/syna-recette/essai-planches.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-planches-outil.ts", "utf8");
    expect(src).toContain("process.env.STUDIO_ANTHROPIC_KEY");
    expect(src).not.toMatch(/sk-ant-|sk-proj-/);
    expect(src).toContain("T.valeursDuClient(ctx, ai,");
    expect(src).toContain("T.plancheDeLaRoute({ ctx, ai,");
    expect(src).not.toMatch(/aiPlancheDeMarque\(|llmJson\(|dessinerLaPlanche\(|ecrireLesValeurs\(/);
  });
});
