/**
 * L'essai réel des noms de la marque : la partie qui se teste (appels simulés dans les essais). Le script à lancer est
 * scripts/syna-recette/essai-noms.mts, qui l'utilise ; son en-tête dit tout. Le client inventé est donné à chaque essai
 * (client-de-l-essai.ts), SANS nom : c'est un client qui n'en a pas encore.
 *
 * Les noms sont EXACTEMENT ceux du parcours (méthode des graphistes, point 0 : « Le client choisit d'abord son nom, puis les
 * logos ») : la tâche de la marque du Studio, `runSinaBrandJob` avec `jusquAuxNoms`, comme `identity.propose` la lance
 * (tools/identity.ts) : trois recherches sur le web et l'étude, les idées, les équipes de noms (chacune seule), le juge des
 * noms le plus sévère, un second tour s'il en garde trop peu, puis la vérification des noms gardés sur le web. La tâche
 * s'arrête là, comme dans le Studio. Puis, gratuit, l'adresse de chaque nom vérifié : la vérification du Studio
 * (`findDomains`, annuaires publics des registres), lue comme la planche de marque la lira (`domaineDeLaPlanche`).
 */
import fs from "node:fs";
import path from "node:path";
import type { ChainAi } from "../../src/lib/syna-agent/brand-chain";
import type { NameDomains } from "../../src/lib/syna-agent/brand-domains";
import { clientDeLEssai, euros, reponsesFacultatives, typeDuProjet, type ClientDeLEssai } from "./client-de-l-essai";

export { clientDeLEssai, euros };
export type { ClientDeLEssai };

/** Le nombre d'identités de l'essai (le forfait du milieu en propose 3 ; l'essai compte deux logos et deux planches). */
export const IDENTITES_DE_L_ESSAI = 2;

// ---------------------------------------------------------------- le devis, sans aucun appel

export type LigneDuDevisDesNoms = { appel: string; modele: string; fois: number; quand: string; probableMicro: number; maxMicro: number };
export type DevisDesNoms = {
  lignes: LigneDuDevisDesNoms[];
  /** Le déroulé habituel : trois recherches et l'étude, un tour d'idées, les équipes, le juge, la vérification. */
  probableMicro: number;
  /** Avec le second tour d'idées et le second tour de noms (équipes et juge). */
  probableAvecReprisesMicro: number;
  /** La somme des maxima de tous les appels possibles (seconds tours et reprises courtes des équipes compris). */
  plafondMinimalMicro: number;
  /**
   * Le plafond que le Studio donne à cette tâche dans l'accord unique de l'étape (`accordGraphistes(n).nomsMicro`, compté
   * avec la clé du fournisseur) : tout sauf la vérification des noms gardés (sa recherche et son appel), que l'accord compte
   * avec les planches. Le Studio compte sur ce que chaque appel rend de sa réservation pour la payer.
   */
  plafondDuStudioMicro: number;
  /** En plus, au pire, si une réponse de texte mal formée doit être réparée (une fois par appel de texte). */
  reparationsMicro: number;
};

/**
 * Le devis de l'essai des noms, appel par appel, avec les fonctions du devis du Studio (aucun appel, aucune clé) : les
 * bornes de `BRAND_CALLS` et la borne d'une recherche sur le web (`webSearchMaxMicro`, comptée comme le Studio la compte).
 */
export async function devisDesNoms(count = IDENTITES_DE_L_ESSAI): Promise<DevisDesNoms> {
  const C = await import("../../src/lib/syna-agent/brand-chain");
  const { callCostBoundMicro, estimateCallMicro, jsonCallMaxMicro } = await import("../../src/lib/ai/llm");
  const { webSearchMaxMicro, webSearchProbableMicro } = await import("../../src/lib/ai/web-search");
  const { accordGraphistes } = await import("../../src/lib/syna-agent/tools/identity");
  const s = C.chainSettings();
  type Id = keyof typeof C.BRAND_CALLS;
  const modele = (id: Id) => { const c: { tier: "strong" | "craft"; effort?: string } = C.BRAND_CALLS[id]; return { ...s[c.tier], ...(c.effort ? { effort: c.effort } : {}) }; };
  const nomDe = (m: { provider: string; model: string; effort?: string }) => `${m.provider}:${m.model}${m.effort ? ` (effort ${m.effort})` : ""}`;
  const appel = (id: Id) => {
    const c = C.BRAND_CALLS[id], m = modele(id);
    const borne = callCostBoundMicro(m.provider, m.model, c.input * 1.5, c.max, m.effort), usuel = estimateCallMicro(m.provider, m.model, c.input, c.output) ?? 0;
    return { modele: nomDe(m), maxMicro: borne ?? usuel * 4, probableMicro: usuel, reparation: Math.max(0, (jsonCallMaxMicro(m.provider, m.model, c.input * 1.5, c.max, c.max, m.effort || null)?.maxMicro ?? 0) - (borne ?? 0)) };
  };
  const web = { modele: `${s.craft.provider}:${s.craft.model} (recherche sur le web, ${C.BRAND_SEARCHES} recherches au plus)`, maxMicro: webSearchMaxMicro(s.craft.provider as "anthropic", s.craft.model, 4000, C.BRAND_SEARCHES), probableMicro: webSearchProbableMicro({ provider: s.craft.provider, model: s.craft.model }) };
  const equipes = s.teams;
  const lignes: LigneDuDevisDesNoms[] = [];
  const ajouter = (nom: string, a: { modele: string; maxMicro: number; probableMicro: number }, fois: number, quand: string) => lignes.push({ appel: nom, modele: a.modele, fois, quand, probableMicro: a.probableMicro * fois, maxMicro: a.maxMicro * fois });
  ajouter("recherches sur le web (paroles de clients, concurrents, usages)", web, 3, "toujours");
  ajouter("étude du marché", appel("study"), 1, "toujours");
  ajouter("idées de la marque", appel("strategy"), 1, "toujours");
  ajouter("second tour d'idées", appel("strategy"), 1, "si trop peu d'idées passent les deux épreuves");
  ajouter(`équipes de noms (une par chemin)`, appel("team"), equipes, "toujours");
  ajouter("reprise courte d'une équipe coupée", appel("teamShort"), equipes, "si une réponse est coupée");
  ajouter("juge des noms", appel("judge"), 1, "toujours");
  ajouter("second tour des équipes", appel("team"), equipes, "si le juge garde trop peu de noms");
  ajouter("reprise courte du second tour", appel("teamShort"), equipes, "si une réponse du second tour est coupée");
  ajouter("juge du second tour", appel("judge"), 1, "si le juge garde trop peu de noms");
  ajouter("recherche sur le web des noms gardés", web, 1, "toujours");
  ajouter("vérification des noms gardés", appel("verify"), 1, "toujours");
  const somme = (f: (l: LigneDuDevisDesNoms) => boolean, k: "probableMicro" | "maxMicro") => lignes.filter(f).reduce((t, l) => t + l[k], 0);
  const avec = new Set(["toujours", "si trop peu d'idées passent les deux épreuves", "si le juge garde trop peu de noms"]);
  const rep = (id: Id) => appel(id).reparation;
  return {
    lignes,
    probableMicro: Math.ceil(somme((l) => l.quand === "toujours", "probableMicro")),
    probableAvecReprisesMicro: Math.ceil(somme((l) => avec.has(l.quand), "probableMicro")),
    plafondMinimalMicro: Math.ceil(somme(() => true, "maxMicro")),
    // Sans clé (devis seul), le devis du Studio ne sait pas compter les recherches sur le web : elles sont ajoutées ici.
    plafondDuStudioMicro: Math.max(accordGraphistes(count).nomsMicro, Math.ceil(somme((l) => !/noms gardés/.test(l.appel), "maxMicro"))),
    reparationsMicro: Math.ceil(rep("study") + 2 * rep("strategy") + 2 * equipes * (rep("team") + rep("teamShort")) + 2 * rep("judge") + rep("verify")),
  };
}

/** Le devis en texte, pour le rapport et la console. */
export function devisDesNomsEnTexte(d: DevisDesNoms): string[] {
  return [
    "Devis de l'essai des noms (fonctions du devis du Studio, aucun appel) :",
    ...d.lignes.map((x) => `- ${x.appel}${x.fois > 1 ? ` (${x.fois} fois)` : ""} · ${x.modele} · ${x.quand} · probable ${euros(x.probableMicro)} · au plus ${euros(x.maxMicro)}`),
    `Probable, déroulé habituel : ${euros(d.probableMicro)}`,
    `Probable, avec le second tour d'idées et le second tour de noms : ${euros(d.probableAvecReprisesMicro)}`,
    `Plafond minimal pour aller au bout à coup sûr (somme des maxima, seconds tours et reprises courtes compris) : ${euros(d.plafondMinimalMicro)}`,
    `Plafond que le Studio donne à cette tâche dans l'accord de l'étape (accordGraphistes, part des noms) : ${euros(d.plafondDuStudioMicro)}${d.plafondDuStudioMicro < d.plafondMinimalMicro ? " (sans la vérification des noms gardés, plus bas que la somme des maxima : chaque appel réserve son maximum et rend ce qu'il n'a pas dépensé, le Studio compte sur ce reste pour la vérification ; l'essai prend la somme des maxima comme plafond de la tâche, pour aller au bout à coup sûr)" : ""}`,
    `Hors plafond : une réponse de texte mal formée à réparer coûterait au plus ${euros(d.reparationsMicro)} de plus en tout.`,
    "L'adresse de chaque nom (annuaires publics des registres) : gratuite.",
  ];
}

// ---------------------------------------------------------------- l'essai

export type NomPropose = {
  numero: number; nom: string; pourquoi: string; detail: string; doute: string | null;
  /** Ce que l'annuaire des registres a répondu à l'instant (pris, libres, pas vérifiés). */
  adresses: NameDomains | null;
  /** Ce que SINA en dit (`domainLine`), et l'adresse que la planche de marque écrirait (`domaineDeLaPlanche`). */
  phraseDeLAdresse: string; adresseDeLaPlanche: { domaine: string | null; statut: string; mention: string };
};
export type ResultatDesNoms = { arret?: string; noms: NomPropose[]; verifies: boolean; notes: string[]; depenseMicro: number; projectId?: string };

/**
 * L'essai lui-même. `ai` : les appels de la chaîne (par défaut les vrais appels du Studio, sous le plafond de la tâche) ;
 * `trouverLesAdresses` : la vérification des adresses (par défaut `findDomains`, gratuite). Le plafond, en euros, allume le
 * garde-fou de l'essai pour toute la durée du script.
 */
export async function essaiDesNoms(o: {
  sortie: string; plafondEuros: string; client: ClientDeLEssai; count?: number;
  ai?: (q: { userId: string; projectId: string; jobId: string }) => ChainAi; lirePage?: (url: string) => Promise<string | null>; trouverLesAdresses?: (nom: string, descripteur?: string | null) => Promise<NameDomains>;
}): Promise<ResultatDesNoms> {
  const plafond = Number(o.plafondEuros.replace(",", "."));
  if (!Number.isFinite(plafond) || plafond <= 0) throw new Error("PLAFOND_ESSAI_EUR manquant ou illisible : rien n'est lancé.");
  if (o.client.nom) throw new Error(`Ce client a déjà un nom (« ${o.client.nom} ») : l'essai des noms ne vaut que pour un client qui n'en a pas encore. Rien n'est lancé.`);
  const count = o.count ?? IDENTITES_DE_L_ESSAI;
  const devis = await devisDesNoms(count);
  if (Math.floor(plafond * 1_000_000) < devis.plafondMinimalMicro) throw new Error(`Le plafond ${euros(Math.floor(plafond * 1_000_000))} est sous le plafond minimal exact ${euros(devis.plafondMinimalMicro)} (somme des maxima, seconds tours compris ; probable ${euros(devis.probableMicro)}) : rien n'est lancé.`);
  process.env.STUDIO_ESSAI_PLAFOND_EUROS = String(plafond);
  const debut = Date.now();
  process.env.STUDIO_ESSAI_DEBUT = String(debut);
  fs.mkdirSync(o.sortie, { recursive: true });

  const { one, run, all } = await import("../../src/lib/db");
  const { JobContext } = await import("../../src/lib/jobs");
  const { account, project } = await import("../../tests/conversation209-fixtures");
  const { threadFor } = await import("../../src/lib/syna-agent/thread");
  const J = await import("../../src/lib/syna-agent/journey");
  const C = await import("../../src/lib/syna-agent/brand-chain");
  const { findDomains, domainLine } = await import("../../src/lib/syna-agent/brand-domains");
  const { domaineDeLaPlanche, mentionDuDomaine } = await import("../../src/lib/syna-agent/planche-de-marque");
  const { ficheDuFil } = await import("../../src/lib/syna-agent/fiche");
  const { depensesDeLaTache, withTrace } = await import("../../src/lib/ai/trace");
  const { PlafondDeLEssaiAtteint, depensesDeLEssai, arretParLEssai } = await import("../../src/lib/ai/plafond-essai");
  const { runForUser } = await import("../../src/lib/ai/access");
  const { runWithLang } = await import("../../src/lib/i18n-server");

  // 1. Le client fictif, son projet sans nom, son fil et ses réponses de départ, avec ses mots.
  const u = await account();
  const projectId = project(u, typeDuProjet(o.client)) as string;
  run("UPDATE projects SET name=? WHERE id=?", "Projet sans nom", projectId);
  const cid = threadFor(u, projectId);
  const at = Date.now();
  J.updateJourney(cid, (x) => {
    x.start = { business: { value: typeDuProjet(o.client), status: "answered", source: "client", at }, offer: { value: `${o.client.metier} : ${o.client.produits.join(", ")}`, status: "answered", source: "client", at }, ...reponsesFacultatives(o.client, at) };
  });
  // 2. La tâche de la marque, comme `identity.propose` la lance par la méthode des graphistes (jusquAuxNoms).
  const capMicro = Math.max(devis.plafondDuStudioMicro, devis.plafondMinimalMicro);
  const jobId = `essai-noms-${Date.now()}`;
  const payload = { projectId, conversationId: cid, capMicro, count, jusquAuxNoms: true };
  run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jobId, u.id, projectId, C.SINA_BRAND_JOB, "Les noms de ta marque (essai)", JSON.stringify(payload), "running", Date.now(), Date.now(), Date.now());
  const ctx = new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jobId));

  const res: ResultatDesNoms = { noms: [], verifies: false, notes: [], depenseMicro: 0, projectId };
  const ecrireFichier = (nom: string, contenu: string | Buffer) => { fs.writeFileSync(path.join(o.sortie, nom), contenu); return nom; };
  const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;
  ecrireFichier("fiche-du-client.txt", `${ficheDuFil(cid, projectId)}\n`);
  const lignes: string[] = [
    `Essai des noms — client sans nom (${o.client.metier}), type « ${o.client.kind} », ${count} identités`,
    `Plafond de l'essai : ${euros(Math.floor(plafond * 1_000_000))} ; plafond de la tâche : ${euros(capMicro)}`, "",
    ...devisDesNomsEnTexte(devis), "",
  ];
  const ecrire = () => {
    res.depenseMicro = Math.max(depensesDeLEssai(debut), depensesDeLaTache(jobId).total);
    const reservations = all<Record<string, any>>("SELECT * FROM ai_reservations WHERE job_id=? ORDER BY created_at, rowid", jobId);
    const appels = reservations.map((r) => ({ cle: r.operation_key ?? null, task: r.task ?? null, modele: r.model ? `${r.provider ?? ""}:${r.model}` : null, studio: !!r.studio, reserveMicro: r.amount, reelMicro: r.actual ?? null, statut: r.status }));
    ecrireFichier("depense.json", json(appels));
    if (res.notes.length) lignes.push("", "Notes de la tâche :", ...res.notes.map((n) => `- ${n}`));
    lignes.push("", "Dépense réelle comptée par le Studio, appel par appel (réservé au plus → réglé) :",
      ...(appels.length ? appels.map((a) => `- ${a.cle ?? a.task ?? "?"} · ${a.modele ?? "?"} · ${a.studio ? "charge du Studio" : "charge du client"} · réservé ${euros(a.reserveMicro)} → réglé ${a.reelMicro == null ? "—" : euros(a.reelMicro)} (${a.statut})`) : ["- aucun appel"]),
      "", `Dépense réelle comptée par le Studio : ${euros(res.depenseMicro)}`);
    if (res.arret) lignes.push("", `ARRÊT : ${res.arret}`);
    ecrireFichier("rapport.txt", `${lignes.join("\n")}\n`);
    return res;
  };

  if (o.ai) C.brandChainDeps.ai = () => o.ai!({ userId: u.id, projectId, jobId });
  if (o.lirePage) C.brandPageDeps.read = o.lirePage;
  try {
    const sortie = await runWithLang({ ui: "fr", content: "fr" }, () => runForUser(u.id, () => withTrace({ jobId, projectId, costCapMicro: capMicro }, () => C.runSinaBrandJob(ctx))));
    const r = sortie as { noms?: { name: string; why: string; detail: string; doute: string | null }[]; verifies?: boolean; notes?: string[] };
    res.verifies = !!r.verifies; res.notes = r.notes ?? [];
    // 3. L'adresse de chaque nom vérifié, gratuite, comme la planche la lira.
    const trouver = o.trouverLesAdresses ?? findDomains;
    for (const [i, n] of (r.noms ?? []).entries()) {
      let adresses: NameDomains | null = null;
      try { adresses = await trouver(n.name, o.client.descripteur ?? null); } catch { /* contrôle impossible : rien n'est affirmé */ }
      const d = domaineDeLaPlanche(adresses, n.name);
      res.noms.push({ numero: i + 1, nom: n.name, pourquoi: n.why, detail: n.detail, doute: n.doute, adresses, phraseDeLAdresse: domainLine(adresses) || "Nom de domaine : pas pu vérifier.", adresseDeLaPlanche: { ...d, mention: mentionDuDomaine(d) } });
    }
  } catch (e) {
    const p = arretParLEssai(jobId) ?? (e instanceof PlafondDeLEssaiAtteint ? e : null);
    res.arret = p ? `le garde-fou de l'essai a refusé un appel : ${p.message}` : `la tâche s'est arrêtée, jamais relancée : ${String((e as Error)?.message ?? e).slice(0, 400)}`;
  } finally {
    if (o.ai) C.brandChainDeps.ai = undefined;
    if (o.lirePage) C.brandPageDeps.read = undefined;
  }
  ecrireFichier("noms.json", json({ client: { metier: o.client.metier, kind: o.client.kind, produits: o.client.produits }, verifies: res.verifies, noms: res.noms, notes: res.notes }));
  lignes.push(`Noms vérifiés proposés au client : ${res.noms.length}${res.verifies ? "" : " (la vérification sur le web n'a pas pu se faire : ils sont montrés sans être vérifiés, et c'est dit)"}`,
    ...res.noms.map((n) => `${n.numero}. ${n.nom}${n.doute ? ` (avec un doute : ${n.doute})` : ""} — ${n.pourquoi || n.detail}\n   ${n.phraseDeLAdresse}\n   La planche écrirait : « ${n.adresseDeLaPlanche.mention} »`),
    "", "Le nom choisi part aux étapes suivantes par CLIENT_NOM=\"<le nom, tel qu'il est écrit ci-dessus>\".");
  return ecrire();
}
