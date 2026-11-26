/**
 * Le script de l'essai réel des noms (scripts/syna-recette/essai-noms.mts), avec des appels SIMULÉS : aucun appel payant.
 * Chaque appel simulé passe par la réservation du Studio, comme les vrais, pour que le garde-fou de l'essai le voie. La
 * tâche est celle du parcours (`runSinaBrandJob` avec `jusquAuxNoms`) : recherches, étude, idées, équipes, juge, puis la
 * vérification des noms gardés ; l'adresse de chaque nom vérifié (annuaires simulés). Le client n'a pas de nom ; un client
 * qui en a un est refusé. Depuis le 26 novembre 2026 (« Il faut arrêter de montrer des plafond aussi haut ça va faire peur
 * aux clients »), un plafond sous la somme des maxima est permis : l'essai s'arrête proprement avant l'appel dont le pire
 * cas dépasserait ce qui reste, garde ses fichiers et ses points de reprise, et REPRENDRE=1 le reprend là.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const FICHIER = "scripts/syna-recette/clients/torrefacteur.json";

describe("le script de l'essai des noms (appels simulés)", async () => {
  const billing = await import("@/lib/billing");
  const { withTrace } = await import("@/lib/ai/trace");
  const { clientDeLEssai, devisDesNoms, essaiDesNoms } = await import("../scripts/syna-recette/essai-noms-outil");
  const { sansRacine } = await import("./clients-d-essai");
  // Les tarifs que le script applique au démarrage (le prix d'une recherche sur le web compris).
  await (await import("../scripts/syna-recette/tarifs-verifies")).appliquerTarifsVerifies();

  const appels: string[] = [];
  const envoyes: string[] = [];
  const APPEL = 30_000;
  const NOMS = ["Fournée", "Braise", "Mouture", "Grain Franc", "Torréfie", "Cerise Rouge", "Tasse Claire"];
  const paye = (q: { userId: string; jobId: string }, task: string) =>
    withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, APPEL, { task, provider: "anthropic", model: "simule", jobId: q.jobId }); billing.settle(rid, APPEL / 2, null, task); });
  const PAGE = "https://avis.example/cafe";
  const simule = (q: { userId: string; projectId: string; jobId: string }) => ({
    research: async (id: string, query: string) => {
      appels.push(`web:${id}`); envoyes.push(query); await paye(q, "strategy");
      return id.startsWith("verify") ? [{ url: "https://annuaire.example/cafes", title: "Annuaire des cafés", category: "competitors" as const, excerpt: "Braise, torréfacteur." }]
        : [{ url: PAGE, title: "Avis sur le café en grains", category: "customers" as const, excerpt: "« Le café frais moulu change tout le matin. »" }];
    },
    ask: async (id: string, c: { kind: string; system: string; prompt: string; schema: { parse: (v: unknown) => unknown } }) => {
      appels.push(id); envoyes.push(c.prompt); await paye(q, "strategy");
      const r: Record<string, unknown> = {
        study: { quotes: [{ text: "Le café frais moulu change tout le matin.", url: PAGE }], competitors: [{ name: "Torréfaction Lointaine", url: "" }], mould: "des paquets kraft et des origines lointaines" },
        strategy: { job: "boire un café frais chez soi", confessions: [{ text: "je ne sais jamais quand mon café a été torréfié", quotes: [0] }], ideas: [1, 2, 3, 4].map((i) => ({ id: `i${i}`, belief: `idée ${i}`, enemy: "le café rassis", proof: "la date de torréfaction", cost: "torréfier chaque semaine", strong: true })) },
        team: { names: NOMS.map((name) => ({ name, detail: "le grain torréfié", second: "aucune", idea: "i1" })) },
        judge: { kept: ["Fournée", "Braise", "Mouture", "Grain Franc"].map((name) => ({ name, seen: "un grain torréfié", why: "il dit le métier" })) },
        verify: { checks: [{ name: "Braise", taken: true, url: "https://annuaire.example/cafes", note: "déjà un torréfacteur" }] },
      };
      return c.schema.parse(r[c.kind]);
    },
    draw: async () => { appels.push("draw"); throw new Error("interdit"); },
    look: async () => { appels.push("look"); throw new Error("interdit"); },
  });
  const adresses = async (nom: string) => ({ taken: [`${nom.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z]/g, "")}.fr`], free: [`${nom.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z]/g, "")}france.fr`], unknown: [], at: Date.now() });
  const dossiers: string[] = [];
  const sortie = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "essai-noms-")); dossiers.push(d); return d; };
  afterEach(() => { for (const d of dossiers.splice(0)) fs.rmSync(d, { recursive: true, force: true }); appels.length = 0; envoyes.length = 0; delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; });

  it("la fiche du torréfacteur : un client sans nom, ses prix, sa clientèle et ses goûts ; les autres scripts exigent le nom choisi (CLIENT_NOM)", () => {
    const c = clientDeLEssai({ CLIENT_JSON: FICHIER }, { sansNom: true });
    expect(c).toMatchObject({ nom: "", kind: "produits", produits: ["cafés en grains", "cafés moulus", "coffrets"], descripteur: "café" });
    expect(c.prix).toMatch(/250 g/);
    expect(c.clientele && c.gouts).toBeTruthy();
    expect(() => clientDeLEssai({ CLIENT_JSON: FICHIER })).toThrow(/Nom du client manquant \(CLIENT_NOM/);
    expect(clientDeLEssai({ CLIENT_JSON: FICHIER, CLIENT_NOM: "Fournée" }).nom).toBe("Fournée");
    // Un client qui a déjà un nom n'entre jamais dans l'essai des noms.
    expect(() => clientDeLEssai({ CLIENT_JSON: FICHIER, CLIENT_NOM: "Fournée" }, { sansNom: true })).toThrow(/déjà un nom/);
    // Aucun exemple tiré des anciens essais dans sa fiche.
    const brut = fs.readFileSync(FICHIER, "utf8");
    expect(brut).not.toMatch(/infusion|thé\b|toilett|Racine|Écume|savon|"nom"/i);
  });

  it("les noms du parcours : la tâche du Studio jusqu'aux noms vérifiés, puis l'adresse de chacun ; un nom pris est écarté ; tout est écrit", async () => {
    const dir = sortie();
    const r = await essaiDesNoms({ sortie: dir, plafondEuros: "20", client: clientDeLEssai({ CLIENT_JSON: FICHIER }, { sansNom: true }), ai: simule as never, lirePage: async () => "<p>« Le café frais moulu change tout le matin. »</p>", trouverLesAdresses: adresses });
    expect(r.arret).toBeUndefined();
    expect(appels).toEqual(["web:paroles", "web:concurrents", "web:usages", "study", "strategy", "team-langue", "team-mots", "team-univers", "team-verite", "judge-1", "web:verify-noms-1", "verify-noms-1"]);
    expect(r.verifies).toBe(true);
    expect(r.noms.map((n) => n.nom)).toEqual(["Fournée", "Mouture", "Grain Franc"]);
    expect(r.noms[0]).toMatchObject({ numero: 1, adresseDeLaPlanche: { domaine: "fourneefrance.fr", statut: "disponible", mention: "fourneefrance.fr — disponible" } });
    expect(r.noms[0].phraseDeLAdresse).toMatch(/fournee\.fr est déjà pris.*libre aujourd'hui : fourneefrance\.fr/);
    for (const f of ["fiche-du-client.txt", "noms.json", "depense.json", "rapport.txt"]) expect(fs.existsSync(path.join(dir, f)), f).toBe(true);
    const fiche = fs.readFileSync(path.join(dir, "fiche-du-client.txt"), "utf8");
    expect(fiche).toMatch(/torréfacteur artisanal/);
    expect(fiche).toMatch(/Prix : « environ 9 €/);
    expect(fiche).toMatch(/Client idéal : « des gens qui aiment le bon café/);
    expect(fiche).toMatch(/Image voulue : « chaleureux, simple et artisanal »/);
    const rapport = fs.readFileSync(path.join(dir, "rapport.txt"), "utf8");
    expect(rapport).toContain("1. Fournée");
    expect(rapport).toContain("CLIENT_NOM=");
    // La dépense de chaque appel simulé, comptée par le Studio ; rien d'autre ne part.
    expect(r.depenseMicro).toBe(appels.length * APPEL / 2);
    // Ce que l'essai ajoute à ce qui part vers l'IA (les demandes, hors consignes du Studio) : le métier du client, jamais un
    // ancien exemple.
    const tout = envoyes.join("\n");
    expect(tout).toMatch(/torréfacteur artisanal/);
    expect(sansRacine(tout)).toBe(true);
    expect(tout).not.toMatch(/Écume|savonnerie|toiletteuse/i);
  });

  it("la somme des maxima reste comptée ; un client qui a déjà un nom est refusé", async () => {
    const d = await devisDesNoms();
    expect(d.plafondMinimalMicro).toBe(Math.ceil(d.lignes.reduce((t, l) => t + l.maxMicro, 0)));
    // Une seule source : le plafond minimal de l'essai est le devis des noms vérifiés du Studio, et l'accord du Studio le
    // couvre (vérification des noms gardés comprise, décision du 26 novembre 2026).
    expect(d.lignes.map((l) => l.appel)).toEqual(expect.arrayContaining(["recherche sur le web des noms gardés", "vérification des noms gardés"]));
    expect(d.plafondDuStudioMicro).toBeGreaterThanOrEqual(d.plafondMinimalMicro);
    expect(d.probableMicro).toBeLessThan(d.probableAvecReprisesMicro);
    expect(d.probableAvecReprisesMicro).toBeLessThan(d.plafondMinimalMicro);
    const c = clientDeLEssai({ CLIENT_JSON: FICHIER }, { sansNom: true });
    await expect(essaiDesNoms({ sortie: sortie(), plafondEuros: "20", client: { ...c, nom: "Fournée" }, ai: simule as never })).rejects.toThrow(/déjà un nom/);
    expect(appels).toEqual([]);
  });

  it("un plafond proche du probable : l'essai part, s'arrête proprement avant l'appel qui pourrait le dépasser, dit ce qui est fait et ce qu'il faut pour finir ; REPRENDRE=1 finit sans rien refaire", async () => {
    const d = await devisDesNoms();
    const { plafondConseilleMicro, avisDuPlafond } = await import("../scripts/syna-recette/plafond-des-essais");
    expect(plafondConseilleMicro(1_450_000)).toBe(3_000_000);
    expect(plafondConseilleMicro(d.probableMicro)).toBeLessThan(d.plafondMinimalMicro);
    expect(avisDuPlafond(1_000_000, d)).toMatch(/l'essai part quand même/);
    expect(avisDuPlafond(d.plafondMinimalMicro, d)).toBeNull();
    const dir = sortie(), c = clientDeLEssai({ CLIENT_JSON: FICHIER }, { sansNom: true });
    const lire = async () => "<p>« Le café frais moulu change tout le matin. »</p>";
    // 0,10 € : chaque appel simulé réserve 0,03 € et en coûte 0,015 € ; le sixième ne tiendrait plus au pire.
    const r = await essaiDesNoms({ sortie: dir, plafondEuros: "0.10", client: c, ai: simule as never, lirePage: lire, trouverLesAdresses: adresses });
    expect(r.arret).toMatch(/garde-fou de l'essai a refusé un appel/);
    // Les quatre équipes partent en même temps : chacune est refusée par le garde-fou avant de partir, rien n'est payé.
    expect(appels).toEqual(["web:paroles", "web:concurrents", "web:usages", "study", "strategy", "team-langue", "team-mots", "team-univers", "team-verite"]);
    expect(r.depenseMicro).toBe(5 * APPEL / 2);
    expect(r.etapesFaites).toEqual(expect.arrayContaining(["brand:study", "brand:strategy"]));
    const rapport = fs.readFileSync(path.join(dir, "rapport.txt"), "utf8");
    expect(rapport).toContain("l'essai part quand même");
    expect(rapport).toContain("Arrêt propre");
    expect(rapport).toContain("étape brand:study (point de reprise");
    expect(rapport).toMatch(/Pour finir : au plus [\d,]+ € de plus, au pire/);
    expect(rapport).toContain("REPRENDRE=1");
    expect(fs.existsSync(path.join(dir, "reprise.json"))).toBe(true);
    // La reprise : la même tâche, ses étapes finies ni refaites ni repayées.
    appels.length = 0;
    const r2 = await essaiDesNoms({ sortie: dir, plafondEuros: "20", client: c, ai: simule as never, lirePage: lire, trouverLesAdresses: adresses, reprendre: true });
    expect(r2.arret).toBeUndefined();
    expect(appels).toEqual(["team-langue", "team-mots", "team-univers", "team-verite", "judge-1", "web:verify-noms-1", "verify-noms-1"]);
    expect(r2.noms.map((n) => n.nom)).toEqual(["Fournée", "Mouture", "Grain Franc"]);
    // À 3 € pour le torréfacteur : les trois recherches partent ensemble, chacune réservée à son pire cas ; la dernière
    // serait refusée. Le script le dit dans son devis, et attend que les appels déjà partis se règlent avant d'écrire.
    const { devisDesNomsEnTexte } = await import("../scripts/syna-recette/essai-noms-outil");
    expect(devisDesNomsEnTexte(d).join("\n")).toMatch(/Attention au départ : les 3 recherches sur le web partent en même temps, chacune réservée à son pire cas ; sous [\d,]+ €, la dernière est refusée/);
    expect(d.lignes[0].fois).toBe(3);
    // Sans essai à reprendre dans le dossier : rien ne part.
    await expect(essaiDesNoms({ sortie: sortie(), plafondEuros: "1", client: c, ai: simule as never, reprendre: true })).rejects.toThrow(/aucun essai des noms à reprendre/);
    // Le script ne refuse plus de partir sous la somme des maxima.
    const src = fs.readFileSync("scripts/syna-recette/essai-noms.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-noms-outil.ts", "utf8");
    expect(src).not.toMatch(/est sous le plafond minimal exact/);
  });

  it("le garde-fou de l'essai refuse un appel au-dessus du plafond : l'essai s'arrête et le dit, rien n'est relancé", async () => {
    const d = await devisDesNoms();
    // Un appel simulé qui réserve plus que tout le plafond de l'essai.
    const gros = (q: { userId: string; projectId: string; jobId: string }) => ({ ...simule(q), research: async () => { appels.push("web"); await withTrace({ jobId: q.jobId }, async () => { billing.reserve(q.userId, d.plafondMinimalMicro + 1_000_000, { task: "strategy", provider: "anthropic", model: "simule", jobId: q.jobId }); }); return []; } });
    const r = await essaiDesNoms({ sortie: sortie(), plafondEuros: String(d.plafondMinimalMicro / 1_000_000), client: clientDeLEssai({ CLIENT_JSON: FICHIER }, { sansNom: true }), ai: gros as never, trouverLesAdresses: adresses });
    expect(r.arret).toMatch(/garde-fou de l'essai|s'est arrêtée/);
    expect(r.noms).toEqual([]);
  });

  it("les noms écartés à chaque tour sont écrits avec leur raison et leur note (contrôles gratuits, juge, vérification), puis relus dans les traces d'un essai déjà fait", async () => {
    // Premier tour : le juge n'en garde qu'un (le second tour part), en met un « presque » avec sa note, et rend un nom
    // qui n'est pas dans la liste. Les contrôles gratuits écartent un concurrent et un nom trop long. Second tour : il garde
    // Braise, que la vérification trouve déjà porté.
    const PREMIER = ["Fournée", "Torréfaction Lointaine", "Un Nom Bien Trop Long Pour Une Marque", "Mouture", "Grain Franc", "Tasse Claire"];
    const SECOND = ["Braise", "Fournée", "Cerise Rouge", "Torréfie", "Moulin Doux"];
    const simule2 = (q: { userId: string; projectId: string; jobId: string }) => ({
      ...simule(q),
      ask: async (id: string, c: { kind: string; system: string; prompt: string; schema: { parse: (v: unknown) => unknown } }) => {
        appels.push(id); envoyes.push(c.prompt); await paye(q, "strategy");
        const equipe = (noms: string[]) => ({ names: noms.map((name) => ({ name, detail: "le grain torréfié", second: "aucune", idea: "i1" })) });
        const r: Record<string, unknown> = {
          study: { quotes: [{ text: "Le café frais moulu change tout le matin.", url: PAGE }], competitors: [{ name: "Torréfaction Lointaine", url: "" }], mould: "des paquets kraft" },
          strategy: { job: "boire un café frais", confessions: [{ text: "je ne sais jamais quand mon café a été torréfié", quotes: [0] }], ideas: [1, 2, 3, 4].map((i) => ({ id: `i${i}`, belief: `idée ${i}`, enemy: "le café rassis", proof: "la date", cost: "torréfier chaque semaine", strong: true })) },
          team: equipe(/-2$/.test(id) ? SECOND : PREMIER),
          judge: /-2$/.test(id)
            ? { kept: [{ name: "Braise", seen: "la chaleur du feu", why: "il dit le métier", note: 9 }, { name: "Cerise Rouge", seen: "le fruit du café", why: "il est beau", note: "8,5" }], almost: [{ name: "Torréfie", why: "un verbe, pas un nom", note: 7 }] }
            : { kept: [{ name: "Mouture", seen: "le moulu", why: "un mot du métier", note: 8 }, { name: "Mouturre", seen: "", why: "recopié de travers" }], almost: [{ name: "Grain Franc", why: "il ne dit pas assez le café", note: 6.5 }] },
          verify: { checks: [{ name: "Braise", taken: true, url: "https://annuaire.example/cafes", note: "déjà un torréfacteur à Lyon." }] },
        };
        return c.schema.parse(r[c.kind]);
      },
    });
    const dir = sortie();
    const r = await essaiDesNoms({ sortie: dir, plafondEuros: "20", client: clientDeLEssai({ CLIENT_JSON: FICHIER }, { sansNom: true }), ai: simule2 as never, lirePage: async () => "<p>« Le café frais moulu change tout le matin. »</p>", trouverLesAdresses: adresses });
    expect(r.arret).toBeUndefined();
    expect(appels).toEqual(expect.arrayContaining(["judge-1", "team-langue-2", "judge-1-2", "verify-noms-1"]));
    // Ce que voit le client ne change pas : Mouture et Cerise Rouge ; Braise est pris.
    expect(r.noms.map((n) => n.nom)).toEqual(["Mouture", "Cerise Rouge"]);
    const e = r.ecartes!;
    expect(e.permis).toEqual(["Mouture", "Braise", "Cerise Rouge"]);
    expect(e.libres).toEqual(r.noms.map((n) => n.nom));
    const trouve = (nom: string) => e.ecartes.find((x) => x.nom === nom);
    expect(trouve("Torréfaction Lointaine")).toMatchObject({ tour: 1, etape: "controle", raison: "nom d'un concurrent trouvé par l'étude" });
    expect(trouve("Un Nom Bien Trop Long Pour Une Marque")).toMatchObject({ tour: 1, etape: "controle", raison: expect.stringMatching(/nom mal formé : .*trop long/) });
    expect(trouve("Grain Franc")).toMatchObject({ tour: 1, etape: "juge", verdict: "presque", note: 6.5, raison: "il ne dit pas assez le café" });
    expect(trouve("Fournée")).toMatchObject({ tour: 1, etape: "juge", verdict: "refuse", note: null, raison: expect.stringMatching(/refusé par le juge, sans raison écrite/) });
    expect(trouve("Mouturre")).toMatchObject({ tour: 1, etape: "juge", verdict: "ignore" });
    expect(e.ecartes.filter((x) => x.nom === "Fournée").map((x) => [x.tour, x.etape, x.raison])).toContainEqual([2, "controle", "déjà trouvé au premier tour"]);
    expect(trouve("Torréfie")).toMatchObject({ tour: 2, etape: "juge", verdict: "presque", note: 7 });
    expect(trouve("Braise")).toMatchObject({ tour: 2, etape: "verification", raison: "déjà porté par une marque du même secteur : déjà un torréfacteur à Lyon (https://annuaire.example/cafes)" });
    expect(e.tours).toEqual([
      { tour: 1, trouves: 6, ecartesParLeCode: 2, juges: 4, gardesParLeJuge: 1 },
      { tour: 2, trouves: 5, ecartesParLeCode: 1, juges: 4, gardesParLeJuge: 2 },
    ]);
    // Le rapport et noms.json les écrivent, tour par tour, avec la raison et la note.
    const rapport = fs.readFileSync(path.join(dir, "rapport.txt"), "utf8");
    expect(rapport).toContain("Noms écartés par SINA, et pourquoi (pour toi seulement : le client ne les voit pas) :");
    expect(rapport).toContain("Premier tour : 6 nom(s) différent(s) trouvé(s) par les équipes ; 2 écarté(s) par les contrôles gratuits du Studio ; 4 envoyé(s) au juge, qui en garde 1.");
    expect(rapport).toContain("  - Torréfaction Lointaine (équipe « langue ») : nom d'un concurrent trouvé par l'étude");
    expect(rapport).toContain("  - Grain Franc (équipe « langue »), note 6,5/10 : il ne dit pas assez le café");
    expect(rapport).toContain("  Refusés par le juge (2), sans raison écrite : il n'écrit une raison et une note que pour les noms presque gardés.\n  - équipe « langue » : Fournée, Tasse Claire");
    expect(rapport).toContain("  - Torréfie (équipe « langue »), note 7/10 : un verbe, pas un nom");
    expect(rapport).toContain("Vérification des noms gardés (3 vérifié(s)) : 1 écarté(s) :\n  - Braise (équipe « langue ») : déjà porté par une marque du même secteur : déjà un torréfacteur à Lyon (https://annuaire.example/cafes)");
    const noms = JSON.parse(fs.readFileSync(path.join(dir, "noms.json"), "utf8"));
    expect(noms.ecartes.ecartes).toEqual(e.ecartes);
    // Le résultat de la tâche, que SINA relit, ne les porte pas : ils sont dans l'état de la tâche seulement.
    const { one, run } = await import("@/lib/db");
    const rp = JSON.parse(fs.readFileSync(path.join(dir, "reprise.json"), "utf8"));
    const cp = JSON.parse(one<{ checkpoint: string }>("SELECT checkpoint FROM jobs WHERE id=?", rp.jobId)!.checkpoint);
    expect(cp["ecartes:noms:1"].ecartes).toEqual(e.ecartes);
    // Un essai d'avant (sans les noms écartés gardés, sans la partie du rapport) : relu dans ses traces, sans aucun appel,
    // il donne les mêmes noms écartés ; le reste du rapport ne change pas.
    delete cp["ecartes:noms:1"];
    for (const k of Object.keys(cp)) if (k.startsWith("brand:verify:noms:")) delete cp[k].preuves;
    run("UPDATE jobs SET checkpoint=? WHERE id=?", JSON.stringify(cp), rp.jobId);
    const sansEcartes = rapport.slice(0, rapport.indexOf("\nNoms écartés par SINA")) + rapport.slice(rapport.indexOf("Fin des noms écartés.") + "Fin des noms écartés.".length);
    fs.writeFileSync(path.join(dir, "rapport.txt"), sansEcartes);
    appels.length = 0;
    const { reecrireLesEcartesDesNoms } = await import("../scripts/syna-recette/essai-noms-outil");
    const re = await reecrireLesEcartesDesNoms({ sortie: dir });
    expect(appels).toEqual([]);
    expect(re.ecartes.ecartes.map((x) => [x.tour, x.etape, x.nom, x.note ?? null])).toEqual(e.ecartes.map((x) => [x.tour, x.etape, x.nom, x.note ?? null]));
    // Sans la preuve gardée, la raison de la vérification le dit autrement, sans rien inventer.
    expect(re.ecartes.ecartes.find((x) => x.nom === "Braise")?.raison).toBe("déjà porté par une marque du même secteur (page trouvée par la recherche)");
    const reecrit = fs.readFileSync(path.join(dir, "rapport.txt"), "utf8");
    expect(reecrit).toContain("  - Grain Franc (équipe « langue »), note 6,5/10 : il ne dit pas assez le café");
    expect(reecrit.startsWith(sansEcartes.slice(0, sansEcartes.indexOf("\nLe nom choisi")))).toBe(true);
    expect(reecrit).toContain("Dépense réelle comptée par le Studio :");
    // Réécrit deux fois : une seule partie des noms écartés.
    await reecrireLesEcartesDesNoms({ sortie: dir });
    expect(fs.readFileSync(path.join(dir, "rapport.txt"), "utf8").split("Noms écartés par SINA").length).toBe(2);
    // Sans la base de l'essai, rien n'est réécrit, et c'est dit.
    const vide = sortie();
    fs.writeFileSync(path.join(vide, "reprise.json"), JSON.stringify({ ...rp, jobId: "tache-absente" }));
    await expect(reecrireLesEcartesDesNoms({ sortie: vide })).rejects.toThrow(/n'est pas dans ce studio d'essai/);
  });

  it("le script n'écrit jamais une clé et ne passe que par la tâche du Studio", () => {
    const src = fs.readFileSync("scripts/syna-recette/essai-noms.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-noms-outil.ts", "utf8");
    expect(src).not.toMatch(/sk-ant|sk-[A-Za-z0-9]{20}/);
    expect(src).toMatch(/runSinaBrandJob/);
    expect(src).toMatch(/jusquAuxNoms: true/);
    expect(src).toMatch(/STUDIO_ANTHROPIC_KEY/);
  });
});
