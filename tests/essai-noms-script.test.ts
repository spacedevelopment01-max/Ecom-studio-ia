/**
 * Le script de l'essai réel des noms (scripts/syna-recette/essai-noms.mts), avec des appels SIMULÉS : aucun appel payant.
 * Chaque appel simulé passe par la réservation du Studio, comme les vrais, pour que le garde-fou de l'essai le voie. La
 * tâche est celle du parcours (`runSinaBrandJob` avec `jusquAuxNoms`) : recherches, étude, idées, équipes, juge, puis la
 * vérification des noms gardés ; l'adresse de chaque nom vérifié (annuaires simulés). Le client n'a pas de nom ; un client
 * qui en a un est refusé ; sous le plafond minimal exact, rien ne part.
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
  const sortie = () => fs.mkdtempSync(path.join(os.tmpdir(), "essai-noms-"));
  afterEach(() => { appels.length = 0; envoyes.length = 0; delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; });

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

  it("sous le plafond minimal exact, rien ne part ; un client qui a déjà un nom est refusé", async () => {
    const d = await devisDesNoms();
    expect(d.plafondMinimalMicro).toBe(Math.ceil(d.lignes.reduce((t, l) => t + l.maxMicro, 0)));
    expect(d.probableMicro).toBeLessThan(d.probableAvecReprisesMicro);
    expect(d.probableAvecReprisesMicro).toBeLessThan(d.plafondMinimalMicro);
    const c = clientDeLEssai({ CLIENT_JSON: FICHIER }, { sansNom: true });
    await expect(essaiDesNoms({ sortie: sortie(), plafondEuros: String((d.plafondMinimalMicro - 1) / 1_000_000), client: c, ai: simule as never })).rejects.toThrow(/sous le plafond minimal exact/);
    await expect(essaiDesNoms({ sortie: sortie(), plafondEuros: "20", client: { ...c, nom: "Fournée" }, ai: simule as never })).rejects.toThrow(/déjà un nom/);
    expect(appels).toEqual([]);
  });

  it("le garde-fou de l'essai refuse un appel au-dessus du plafond : l'essai s'arrête et le dit, rien n'est relancé", async () => {
    const d = await devisDesNoms();
    // Un appel simulé qui réserve plus que tout le plafond de l'essai.
    const gros = (q: { userId: string; projectId: string; jobId: string }) => ({ ...simule(q), research: async () => { appels.push("web"); await withTrace({ jobId: q.jobId }, async () => { billing.reserve(q.userId, d.plafondMinimalMicro + 1_000_000, { task: "strategy", provider: "anthropic", model: "simule", jobId: q.jobId }); }); return []; } });
    const r = await essaiDesNoms({ sortie: sortie(), plafondEuros: String(d.plafondMinimalMicro / 1_000_000), client: clientDeLEssai({ CLIENT_JSON: FICHIER }, { sansNom: true }), ai: gros as never, trouverLesAdresses: adresses });
    expect(r.arret).toMatch(/garde-fou de l'essai|s'est arrêtée/);
    expect(r.noms).toEqual([]);
  });

  it("le script n'écrit jamais une clé et ne passe que par la tâche du Studio", () => {
    const src = fs.readFileSync("scripts/syna-recette/essai-noms.mts", "utf8") + fs.readFileSync("scripts/syna-recette/essai-noms-outil.ts", "utf8");
    expect(src).not.toMatch(/sk-ant|sk-[A-Za-z0-9]{20}/);
    expect(src).toMatch(/runSinaBrandJob/);
    expect(src).toMatch(/jusquAuxNoms: true/);
    expect(src).toMatch(/STUDIO_ANTHROPIC_KEY/);
  });
});
