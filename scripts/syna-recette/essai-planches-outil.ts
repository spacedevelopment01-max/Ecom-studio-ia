/**
 * L'essai réel des planches de marque (un client inventé, ses logos finis déjà faits) : la partie qui se teste (appels
 * simulés dans les essais). Le script à lancer est scripts/syna-recette/essai-planches.mts, qui l'utilise ; son en-tête
 * dit tout. Il n'appelle que les fonctions du Studio (planche-de-marque.ts, planche-de-marque-tache.ts :
 * `valeursDuClient`, `plancheDeLaRoute`, `vraisAppelsDeLaPlanche`) et s'arrête aux planches relues. Rien n'est relancé.
 */
import fs from "node:fs";
import path from "node:path";
import type { PlancheAi } from "../../src/lib/syna-agent/planche-de-marque-tache";
import type { RelectureDeLaPlanche, ValeursDuMetier } from "../../src/lib/syna-agent/planche-de-marque";
import type { NameDomains } from "../../src/lib/syna-agent/brand-domains";
import { euros } from "./essai-esquisses-outil";

export { euros };

// ---------------------------------------------------------------- les entrées

/** Le client inventé de l'essai : ce que sa fiche dit, avec ses mots. */
export type ClientDeLEssai = {
  nom: string;
  /** Le métier en mots simples, tel que la recherche du logo l'a écrit (« pépiniériste qui vend des plantes en ligne »). */
  metier: string;
  kind: "produits" | "services";
  /** Ses produits ou prestations réels, avec ses mots. */
  produits: string[];
  /** Le mot du métier pour les adresses de remplacement (findDomains), facultatif. */
  descripteur?: string | null;
};

/** Racine, par défaut : le client des essais des esquisses et de la finalisation ; ses produits, ceux de sa planche d'essai. */
export const RACINE: ClientDeLEssai = { nom: "Racine", metier: "pépiniériste qui vend des plantes en ligne", kind: "produits", produits: ["plantes d'intérieur", "arbustes", "jeunes arbres"] };

/**
 * Le client de l'essai : un fichier JSON (CLIENT_JSON) ou les variables CLIENT_NOM, CLIENT_METIER, CLIENT_TYPE
 * (« produits » ou « services »), CLIENT_PRODUITS (séparés par « ; »), CLIENT_DESCRIPTEUR ; sinon Racine. Rien d'incomplet
 * n'est lancé.
 */
export function clientDeLEssai(env: Record<string, string | undefined> = process.env): ClientDeLEssai {
  const brut: Partial<ClientDeLEssai> = env.CLIENT_JSON ? JSON.parse(fs.readFileSync(env.CLIENT_JSON, "utf8")) : {};
  const liste = (t?: string) => t?.split(";").map((x) => x.trim()).filter(Boolean);
  const donne = env.CLIENT_JSON || env.CLIENT_NOM || env.CLIENT_METIER || env.CLIENT_TYPE || env.CLIENT_PRODUITS;
  const c: ClientDeLEssai = donne ? {
    nom: (env.CLIENT_NOM ?? brut.nom ?? "").trim(),
    metier: (env.CLIENT_METIER ?? brut.metier ?? "").trim(),
    kind: (env.CLIENT_TYPE ?? brut.kind ?? "") as ClientDeLEssai["kind"],
    produits: liste(env.CLIENT_PRODUITS) ?? (brut.produits ?? []).map((x) => String(x).trim()).filter(Boolean),
    descripteur: (env.CLIENT_DESCRIPTEUR ?? brut.descripteur ?? null) || null,
  } : { ...RACINE, descripteur: env.CLIENT_DESCRIPTEUR?.trim() || null };
  if (!c.nom) throw new Error("Nom du client manquant (CLIENT_NOM) : rien n'est lancé.");
  if (!c.metier) throw new Error("Métier du client manquant (CLIENT_METIER) : rien n'est lancé.");
  if (c.kind !== "produits" && c.kind !== "services") throw new Error("Type du client manquant ou faux (CLIENT_TYPE : « produits » ou « services ») : rien n'est lancé.");
  if (!c.produits.length) throw new Error("Produits ou prestations du client manquants (CLIENT_PRODUITS, séparés par « ; ») : rien n'est lancé.");
  return c;
}

/** La fiche du client telle que le Studio l'écrit (`ficheTexte`), à partir de ses réponses : son activité et son offre. */
export async function ficheDuClient(c: ClientDeLEssai, projectId?: string): Promise<string> {
  const { ficheTexte } = await import("../../src/lib/syna-agent/fiche");
  const at = Date.now();
  const j = {
    start: {
      business: { value: c.kind === "produits" ? "products" : "services", status: "answered", source: "client", at },
      offer: { value: `${c.metier} : ${c.produits.join(", ")}`, status: "answered", source: "client", at },
    },
    keep: [], steps: {},
  };
  return ficheTexte({ j: j as never, notes: [], projectId: projectId ?? null });
}

// ---------------------------------------------------------------- le devis, sans aucun appel

export type LigneDuDevis = {
  planche: number | null; appel: string; modele: string;
  quand: "toujours" | "si le contrôle refuse les valeurs" | "si le relecteur refuse la planche";
  charge: "client" | "Studio";
  probableMicro: number; maxMicro: number;
};
export type DevisDeLEssai = {
  planches: number;
  lignes: LigneDuDevis[];
  /** Sans aucun refus (le probable du devis du Studio). */
  probableMicro: number;
  /** Si les valeurs sont réécrites et chaque planche refaite une fois. */
  probableAvecReprisesMicro: number;
  /** La somme des maxima de tous les appels possibles : le plafond minimal pour aller au bout à coup sûr. */
  plafondMinimalMicro: number;
  /** Le devis du Studio (`devisDesPlanchesDeMarque`) : plafond du client et borne du Studio de la tâche. */
  devisDuStudio: { maxMicro: number; studioMaxMicro: number; probableMicro: number };
  /** En plus, au pire, si une réponse de texte mal formée doit être réparée (une fois par appel, règle de llmJson). */
  reparationsMicro: number;
};

/** Le devis de l'essai pour N planches, appel par appel, avec les fonctions du devis du Studio (aucun appel). */
export async function devisDeLEssai(n: number): Promise<DevisDeLEssai> {
  const { devisDUnAppelDeLaPlanche, devisDesPlanchesDeMarque, PRIX_MESURE_DE_LA_PLANCHE } = await import("../../src/lib/syna-agent/planche-de-marque-tache");
  const { plancheDeMarqueMaxMicro } = await import("../../src/lib/ai/media-providers");
  const { jsonCallMaxMicro } = await import("../../src/lib/ai/llm");
  const { PERMISSION_DE_LA_PLANCHE } = await import("../../src/lib/ai/logo-policy");
  const v = devisDUnAppelDeLaPlanche("valeurs"), r = devisDUnAppelDeLaPlanche("relecture");
  const imageMax = plancheDeMarqueMaxMicro(), imageProbable = Math.round(PRIX_MESURE_DE_LA_PLANCHE * 1_000_000);
  const nomDe = (m: { provider: string; model: string; effort: string }) => `${m.provider}:${m.model}${m.effort ? ` (effort ${m.effort})` : ""}`;
  const image = `openai:${PERMISSION_DE_LA_PLANCHE.model} (xhigh, 1536 × 2304)`;
  const lignes: LigneDuDevis[] = [
    { planche: null, appel: "valeurs du métier", modele: nomDe(v.modele), quand: "toujours", charge: "client", probableMicro: v.probable, maxMicro: v.max },
    { planche: null, appel: "valeurs réécrites (une fois)", modele: nomDe(v.modele), quand: "si le contrôle refuse les valeurs", charge: "Studio", probableMicro: v.probable, maxMicro: v.max },
  ];
  for (let k = 1; k <= n; k++) {
    lignes.push(
      { planche: k, appel: "planche, 1er essai", modele: image, quand: "toujours", charge: "client", probableMicro: imageProbable, maxMicro: imageMax },
      { planche: k, appel: "relecture du 1er essai", modele: nomDe(r.modele), quand: "toujours", charge: "client", probableMicro: r.probable, maxMicro: r.max },
      { planche: k, appel: "planche, reprise unique", modele: image, quand: "si le relecteur refuse la planche", charge: "Studio", probableMicro: imageProbable, maxMicro: imageMax },
      { planche: k, appel: "relecture de la reprise", modele: nomDe(r.modele), quand: "si le relecteur refuse la planche", charge: "Studio", probableMicro: r.probable, maxMicro: r.max },
    );
  }
  const d = devisDesPlanchesDeMarque(n);
  const somme = (f: (l: LigneDuDevis) => boolean, k: "probableMicro" | "maxMicro") => lignes.filter(f).reduce((s, l) => s + l[k], 0);
  // Une réparation de réponse (llmJson) : la réponse renvoyée et la consigne en plus à l'entrée, même limite de sortie.
  const reparation = (a: typeof v) => Math.max(0, (jsonCallMaxMicro(a.modele.provider, a.modele.model, a.jetons.input * 1.5, a.jetons.max, a.jetons.max, a.modele.effort || null)?.maxMicro ?? a.max) - a.max);
  return {
    planches: n,
    lignes,
    probableMicro: Math.ceil(somme((l) => l.quand === "toujours", "probableMicro")),
    probableAvecReprisesMicro: Math.ceil(somme(() => true, "probableMicro")),
    plafondMinimalMicro: Math.ceil(somme(() => true, "maxMicro")),
    devisDuStudio: { maxMicro: d.maxMicro, studioMaxMicro: d.studioMaxMicro, probableMicro: d.probableMicro },
    reparationsMicro: Math.ceil(2 * reparation(v) + 2 * n * reparation(r)),
  };
}

/** Le devis en texte, pour le rapport et la console. */
export function devisEnTexte(d: DevisDeLEssai): string[] {
  return [
    `Devis de l'essai pour ${d.planches} planches (fonctions du devis du Studio, aucun appel) :`,
    ...d.lignes.map((x) => `- ${x.planche == null ? "le client" : `planche ${x.planche}`} · ${x.appel} · ${x.modele} · ${x.quand} · charge ${x.charge} · probable ${euros(x.probableMicro)} · au plus ${euros(x.maxMicro)}`),
    `Probable, sans refus : ${euros(d.probableMicro)} (devis du Studio : ${euros(d.devisDuStudio.probableMicro)})`,
    `Probable, si les valeurs sont réécrites et chaque planche refaite une fois : ${euros(d.probableAvecReprisesMicro)}`,
    `Plafond minimal pour aller au bout à coup sûr (somme des maxima, reprises comprises) : ${euros(d.plafondMinimalMicro)}`,
    `  dont plafond du client de la tâche ${euros(d.devisDuStudio.maxMicro)} et borne du Studio ${euros(d.devisDuStudio.studioMaxMicro)} (devisDesPlanchesDeMarque)`,
    `Hors plafond : une réponse de texte mal formée à réparer coûterait au plus ${euros(d.reparationsMicro)} de plus en tout ; la tâche ne la couvre pas (elle s'arrêterait sur sa propre borne).`,
  ];
}

// ---------------------------------------------------------------- l'essai

export type EssaiEcrit = { tour: number; texte?: string; brut?: string; bandes?: string[]; demande?: string; verdict?: RelectureDeLaPlanche; raisons?: string[] };
export type PlancheDeLEssai = { key: string; fichier: string; gardee?: boolean; fichierGarde?: string; raison?: string; note?: number; essais: EssaiEcrit[]; notes: string[]; issues: string[] };
export type LigneDeDepense = { cle: string | null; task: string | null; modele: string | null; studio: boolean; reserveMicro: number; reelMicro: number | null; statut: string; appel?: Record<string, unknown> };
export type ResultatDesPlanches = {
  arret?: string; client: ClientDeLEssai; fiche: string;
  valeurs?: { ok: true; valeurs: ValeursDuMetier; notes: string[] } | { ok: false; raison: string; notes: string[] };
  domaine?: { verifie: NameDomains; domaine: string | null; statut: string; mention: string };
  disposition?: string;
  planches: PlancheDeLEssai[]; depenseMicro: number; appels: LigneDeDepense[]; devis: DevisDeLEssai;
};

type Qui = { userId: string; projectId: string; jobId: string };
const KEYS = ["A", "B", "C", "D"] as const;

/**
 * L'essai lui-même. `ai` : les appels (par défaut `plancheDeps.ai`, sinon les vrais appels du Studio,
 * `vraisAppelsDeLaPlanche`, sous le plafond du client et la borne du Studio du devis, comme dans la tâche). Le plafond, en
 * euros, allume le garde-fou de l'essai pour toute la durée du script. Le domaine : `findDomains` (RDAP, gratuit), sauf
 * `plancheDeps.domaines` dans les essais.
 */
export async function essaiDesPlanches(o: { sortie: string; plafondEuros: string; logos: string[]; client: ClientDeLEssai; ai?: (q: Qui) => PlancheAi }): Promise<ResultatDesPlanches> {
  const plafond = Number(o.plafondEuros.replace(",", "."));
  if (!Number.isFinite(plafond) || plafond <= 0) throw new Error("PLAFOND_ESSAI_EUR manquant ou illisible : rien n'est lancé.");
  if (o.logos.length < 2 || o.logos.length > 4) throw new Error(`Il faut de 2 à 4 logos finis, pas ${o.logos.length} : rien n'est lancé.`);
  const logos = o.logos.map((f, i) => {
    if (!fs.existsSync(f)) throw new Error(`Logo fini introuvable : ${f}. Rien n'est lancé.`);
    const png = fs.readFileSync(f);
    if (png[0] !== 137 || png[1] !== 80) throw new Error(`Le logo ${f} n'est pas un PNG : rien n'est lancé.`);
    return { key: KEYS[i], fichier: f, png };
  });
  const client = o.client;
  // Le garde-fou de l'essai, compté depuis le début du script.
  process.env.STUDIO_ESSAI_PLAFOND_EUROS = String(plafond);
  const debut = Date.now();
  process.env.STUDIO_ESSAI_DEBUT = String(debut);
  fs.mkdirSync(o.sortie, { recursive: true });

  const { id, run, all } = await import("../../src/lib/db");
  const { account, project } = await import("../../tests/conversation209-fixtures");
  const T = await import("../../src/lib/syna-agent/planche-de-marque-tache");
  const P = await import("../../src/lib/syna-agent/planche-de-marque");
  const { findDomains } = await import("../../src/lib/syna-agent/brand-domains");
  const { saveAsset } = await import("../../src/lib/library");
  const { peopleAllowed } = await import("../../src/lib/people-policy");
  const { CostCapReached, depensesDeLaTache, withTrace } = await import("../../src/lib/ai/trace");
  const { PlafondDeLEssaiAtteint, depensesDeLEssai, arretParLEssai } = await import("../../src/lib/ai/plafond-essai");
  const { runForUser } = await import("../../src/lib/ai/access");
  const { runWithLang } = await import("../../src/lib/i18n-server");

  const devis = await devisDeLEssai(logos.length);
  // 1. Le client inventé et son projet.
  const u = await account();
  const projectId = project(u, client.kind === "produits" ? "products" : "services") as string;
  run("UPDATE projects SET name=? WHERE id=?", client.nom, projectId);
  const jobId = `essai-planches-${id()}`;
  const qui: Qui = { userId: u.id, projectId, jobId };
  const brut: PlancheAi = o.ai ? o.ai(qui) : T.plancheDeps.ai ? T.plancheDeps.ai(jobId) : T.vraisAppelsDeLaPlanche(qui);
  const personnes = peopleAllowed(projectId);
  const fiche = await ficheDuClient(client, projectId);

  const res: ResultatDesPlanches = { client, fiche, planches: [], depenseMicro: 0, appels: [], devis };
  const ecrireFichier = (nom: string, contenu: string | Buffer) => { fs.writeFileSync(path.join(o.sortie, nom), contenu); return nom; };
  const json = (v: unknown) => `${JSON.stringify(v, (_k, x) => (Buffer.isBuffer(x) ? `[image de ${x.length} octets]` : x && typeof x === "object" && x.type === "Buffer" && Array.isArray(x.data) ? `[image de ${x.data.length} octets]` : x), 2)}\n`;
  const cleDe = (cle: string) => { const m = cle.match(/^([A-D])-\d+-(\d+)(?:-relecture)?$/); return m ? { key: m[1], tour: Number(m[2]) } : { key: "?", tour: 0 }; };
  const plancheDe = (key: string) => res.planches.find((p) => p.key === key)!;
  const essaiDe = (key: string, tour: number) => { const p = plancheDe(key); let e = p.essais.find((x) => x.tour === tour); if (!e) { e = { tour }; p.essais.push(e); } return e; };
  let annee = T.anneeEnCours();

  // Toute erreur d'un appel (panne, plafond) est gardée : la tâche du Studio la transforme en planche non montrée, l'essai
  // s'arrête là (jamais de relance).
  let erreur: unknown = null;
  const garder = async <X>(fn: () => Promise<X>): Promise<X> => { try { return await fn(); } catch (e) { erreur ??= e; throw e; } };
  // 2. Les appels du Studio, tels quels, avec ce qui part et ce qui revient écrit tout de suite (un arrêt ne perd rien).
  const ai: PlancheAi = {
    valeurs: async (demande, tour) => {
      ecrireFichier(`valeurs-${tour}-demande.txt`, `${P.VALEURS_SYSTEM}\n\n--- demande ---\n${demande}\n`);
      const v = await garder(() => brut.valeurs(demande, tour));
      ecrireFichier(`valeurs-${tour}-reponse.json`, json(v));
      return v;
    },
    dessiner: async (logo, disposition, texte, cle) => {
      const { key, tour } = cleDe(cle);
      const e = essaiDe(key, tour);
      e.texte = ecrireFichier(`planche-${key}-${tour}-texte-envoye.txt`, texte);
      const r = await garder(() => brut.dessiner(logo, disposition, texte, cle));
      e.brut = ecrireFichier(`planche-${key}-${tour}-brute.png`, r.png);
      if (r.recu) ecrireFichier(`planche-${key}-${tour}-recu.json`, json(r.recu));
      return r;
    },
    relire: async (bandes, logo, disposition, demande, cle) => {
      const { key, tour } = cleDe(cle);
      const e = essaiDe(key, tour);
      e.bandes = bandes.map((b, i) => ecrireFichier(`planche-${key}-${tour}-bande-${i + 1}.png`, b));
      e.demande = ecrireFichier(`planche-${key}-${tour}-relecture-demande.txt`, `${P.RELECTEUR_DE_LA_PLANCHE}\n\n--- demande ---\n${demande}\n\n--- images jointes : ${bandes.map((_b, i) => `bande ${i + 1}`).join(", ")}, logo, disposition (réduite à 768 px par les vrais appels) ---\n`);
      const v = await garder(() => brut.relire(bandes, logo, disposition, demande, cle));
      e.verdict = v;
      if (res.domaine && res.valeurs?.ok) {
        const d = P.laDisposition(res.valeurs.valeurs.metier);
        e.raisons = P.raisonsDuRefusDeLaPlanche(v, { nom: client.nom, annee, domaine: { domaine: res.domaine.domaine, statut: res.domaine.statut as never }, personnes, animaux: d.animaux && d.laquelle === "standard" });
      }
      ecrireFichier(`planche-${key}-${tour}-relecture-verdict.json`, json({ verdict: v, raisons: e.raisons ?? null, gardee: e.raisons ? !e.raisons.length : null }));
      return v;
    },
  };
  // Le domaine : la vérification du Studio (RDAP), gardée telle qu'elle revient.
  const domainesAvant = T.plancheDeps.domaines;
  T.plancheDeps.domaines = async (nom, descriptor) => {
    const d = await (domainesAvant ?? findDomains)(nom, descriptor);
    const dp = P.domaineDeLaPlanche(d, nom);
    res.domaine = { verifie: d, domaine: dp.domaine, statut: dp.statut, mention: P.mentionDuDomaine(dp) };
    ecrireFichier("domaine.json", json({ nom, descripteur: descriptor ?? null, ...res.domaine, caseSousLaPlanche: P.caseDuDomaine(dp) }));
    return d;
  };
  // Les points de reprise de la tâche, en mémoire : le domaine (même nom pour toutes les planches) n'est vérifié qu'une fois.
  const reprises = new Map<string, unknown>();
  const ctx = { step: async <X>(k: string, fn: () => Promise<X>): Promise<X> => { if (reprises.has(k)) return reprises.get(k) as X; const v = await fn(); reprises.set(k, v); return v; } };

  const lignes: string[] = [
    `Essai des planches de marque — client « ${client.nom} » (${client.metier}), type « ${client.kind} »`,
    `Produits ou prestations de sa fiche : ${client.produits.join(" ; ")}`,
    `Plafond de l'essai : ${euros(Math.floor(plafond * 1_000_000))}`,
    `Personnes permises : ${personnes ? "oui" : "non (aucune photo de personne ni accord)"}`,
    `Logos finis : ${logos.map((l) => `${l.key} (${l.fichier})`).join(", ")}`,
    "", ...devisEnTexte(devis), "",
  ];
  const lireLaDepense = () => {
    const reservations = all<Record<string, any>>("SELECT * FROM ai_reservations WHERE job_id=? ORDER BY created_at, rowid", jobId);
    const appels = all<Record<string, any>>("SELECT * FROM ai_calls WHERE job_id=? ORDER BY created_at, rowid", jobId);
    const appelDe = (r: Record<string, any>) => appels.find((c) => r.usage_event_id && c.usage_event_id === r.usage_event_id);
    const detail = (c: Record<string, any> | undefined) => {
      if (!c) return undefined;
      let details: unknown = c.details;
      try { details = c.details ? JSON.parse(c.details) : null; } catch { /* tel quel */ }
      return { etape: c.step, fournisseur: c.provider, modeleDemande: c.requested_model, modeleServi: c.served_model, unite: c.unit, jetonsEntree: c.input_tokens, jetonsCacheLus: c.cache_read_tokens, jetonsCacheEcrits: c.cache_write_tokens, jetonsSortie: c.output_tokens, quantite: c.quantity, effort: c.effort, fin: c.stop_reason, dureeMs: c.latency_ms, coutMicro: c.cost, estime: !!c.estimated, statut: c.status, cle: c.usage_key, details };
    };
    res.appels = reservations.map((r) => ({ cle: r.operation_key ?? appelDe(r)?.usage_key ?? null, task: r.task ?? null, modele: r.model ? `${r.provider ?? ""}:${r.model}` : null, studio: !!r.studio, reserveMicro: r.amount, reelMicro: r.actual ?? null, statut: r.status, ...(appelDe(r) ? { appel: detail(appelDe(r)) } : {}) }));
    ecrireFichier("depense.json", json(res.appels));
    ecrireFichier("usage.json", json(appels.map(detail)));
  };
  const ecrire = () => {
    res.depenseMicro = Math.max(depensesDeLEssai(debut), depensesDeLaTache(jobId).total);
    lireLaDepense();
    if (res.valeurs) {
      if (res.valeurs.ok) {
        const v = res.valeurs.valeurs;
        lignes.push("Valeurs du métier (contrôlées) :", `  métier : ${v.metier}`, `  traits : ${v.traits.join(", ")}`, `  émotion : ${v.emotion}`, `  site : ${v.site}${v.appel ? ` (${v.appel})` : ""}`, `  images : ${v.images.join(" ; ")}`, `  produits : ${v.produits.join(" ; ")}`);
      } else lignes.push(`Valeurs du métier : NON écrites sans rien inventer (${res.valeurs.raison}) ; aucune planche n'est dessinée.`);
      for (const n of res.valeurs.notes) lignes.push(`  note : ${n}`);
    }
    if (res.domaine) lignes.push(`Domaine vérifié avant le dessin : ${res.domaine.mention} (libres : ${res.domaine.verifie.free.join(", ") || "aucun"} ; pris : ${res.domaine.verifie.taken.join(", ") || "aucun"} ; à vérifier : ${res.domaine.verifie.unknown.join(", ") || "aucun"}) ; année ${annee}`);
    if (res.disposition) lignes.push(`Disposition jointe : ${res.disposition}`);
    for (const p of res.planches) {
      lignes.push("", `Planche ${p.key} (${p.fichier}) : ${p.gardee === true ? `GARDÉE par le relecteur (${p.fichierGarde}, note ${p.note}/10)` : p.gardee === false ? `NON gardée, jamais montrée (${p.raison})` : "non terminée"}`);
      for (const e of p.essais) {
        lignes.push(`  essai ${e.tour}${e.tour === 2 ? " (reprise à la charge du Studio)" : ""} : texte ${e.texte ?? "—"} ; planche brute ${e.brut ?? "—"} ; bandes ${e.bandes?.join(", ") ?? "—"}`);
        if (e.verdict) lignes.push(`    verdict : note ${e.verdict.note}/10, nom lu « ${e.verdict.nomLu} », copyright lu « ${e.verdict.copyrightLu} », domaine lu « ${e.verdict.domaineLu} », logo fidèle ${e.verdict.logoFidele ? "oui" : "non"} — ${e.verdict.pourquoi}`, `    raisons du refus : ${e.raisons?.length ? e.raisons.join(" ; ") : "aucune"}`);
      }
      for (const n of p.notes) lignes.push(`  note : ${n}`);
      for (const n of p.issues) lignes.push(`  SINA dirait : ${n}`);
    }
    lignes.push("", "Dépense réelle comptée par le Studio, appel par appel (réservé au plus → réglé) :",
      ...(res.appels.length ? res.appels.map((a) => `- ${a.cle ?? a.task ?? "?"} · ${a.modele ?? "?"} · ${a.studio ? "charge du Studio" : "charge du client"} · réservé ${euros(a.reserveMicro)} → réglé ${a.reelMicro == null ? "—" : euros(a.reelMicro)} (${a.statut})${a.appel ? ` · jetons ${a.appel.jetonsEntree} en entrée, ${a.appel.jetonsSortie} en sortie` : ""}`) : ["- aucun appel"]),
      "", `Dépense réelle comptée par le Studio : ${euros(res.depenseMicro)}`, "Détail complet : depense.json (appel par appel), usage.json (jetons, qualité, taille, fond, format renvoyés).");
    if (res.arret) lignes.push("", `ARRÊT : ${res.arret}`);
    ecrireFichier("rapport.txt", `${lignes.join("\n")}\n`);
    return res;
  };
  const raisonDeLArret = (e: unknown, ou: string) => e instanceof PlafondDeLEssaiAtteint ? `le garde-fou de l'essai a refusé un appel (${ou}) : ${e.message}`
    : e instanceof CostCapReached ? `le plafond de la tâche (celui du Studio) a refusé un appel (${ou}) : ${e.message}`
      : `un appel a échoué (${ou}), jamais relancé : ${String((e as Error)?.message ?? e).slice(0, 400)}`;

  ecrireFichier("fiche-du-client.txt", `${fiche}\n`);
  try {
    return await runWithLang({ ui: "fr", content: "fr" }, () => runForUser(u.id, () => withTrace({ jobId, projectId, costCapMicro: devis.devisDuStudio.maxMicro, studioCapMicro: devis.devisDuStudio.studioMaxMicro }, async () => {
      annee = T.anneeEnCours();
      // 3. Les valeurs du métier : un appel pour le client, contrôlé, une réécriture au plus à la charge du Studio.
      try {
        res.valeurs = await T.valeursDuClient(ctx, ai, { nom: client.nom, metier: client.metier, fiche, personnes, kind: client.kind });
        ecrireFichier("valeurs-du-metier.json", json(res.valeurs));
      } catch (e) { res.arret = raisonDeLArret(e, "valeurs du métier"); return ecrire(); }
      if (res.valeurs.ok) {
        const d = P.laDisposition(res.valeurs.valeurs.metier);
        res.disposition = `${d.laquelle}${d.animaux ? " (métier proche des animaux)" : ""}`;
        ecrireFichier(`disposition-${d.laquelle}.png`, d.png);
      }
      // 4. Chaque logo, dans l'ordre : sa planche (domaine vérifié avant le dessin), sa relecture, sa reprise unique.
      for (const l of logos) {
        const p: PlancheDeLEssai = { key: l.key, fichier: l.fichier, essais: [], notes: [], issues: [] };
        res.planches.push(p);
        ecrireFichier(`planche-${l.key}-logo-recu.png`, l.png);
        const a = await saveAsset({ userId: u.id, projectId, data: l.png, name: `logo-fini-${l.key}.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "ready" });
        const route = { key: l.key, name: client.nom, board: { descriptor: client.descripteur ?? null } };
        const r = await T.plancheDeLaRoute({ ctx, ai, who: { userId: u.id, projectId }, route: route as never, round: 1, valeurs: res.valeurs, logoAssetId: a.id, personnes });
        const pl = r.route.board.planche;
        p.notes = r.notes; p.issues = r.issues;
        p.gardee = !!pl?.image; p.note = pl?.note;
        if (pl?.image) { const dernier = p.essais.at(-1); if (dernier?.brut) p.fichierGarde = ecrireFichier(`planche-${l.key}-gardee.png`, fs.readFileSync(path.join(o.sortie, dernier.brut))); }
        else p.raison = typeof pl?.raison === "string" ? pl.raison : "non faite";
        ecrireFichier(`planche-${l.key}-resultat.json`, json({ planche: pl ?? null, notes: r.notes, issues: r.issues }));
        if (erreur) { res.arret = raisonDeLArret(erreur, `planche ${l.key}`); break; }
        const parLEssai = arretParLEssai(jobId);
        if (parLEssai) { res.arret = raisonDeLArret(parLEssai, `planche ${l.key}`); break; }
      }
      const parLEssai = arretParLEssai(jobId);
      if (parLEssai && !res.arret) res.arret = raisonDeLArret(parLEssai, "fin de l'essai");
      return ecrire();
    })));
  } finally { T.plancheDeps.domaines = domainesAvant; }
}
