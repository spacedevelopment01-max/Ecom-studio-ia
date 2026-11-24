/**
 * L'essai réel de la finalisation de deux esquisses choisies (client « Racine ») : la partie qui se teste (appels simulés
 * dans les essais). Le script à lancer est scripts/syna-recette/essai-finalisation.mts, qui l'utilise ; son en-tête dit
 * tout. Il n'appelle que les fonctions de SINA (`uneFinalisation`, `vraisAppels`) et s'arrête au logo fini relu : ni
 * planche de marque, ni couleurs au-delà de ce que `uneFinalisation` tire déjà du logo, gratuitement. Rien n'est relancé.
 */
import fs from "node:fs";
import path from "node:path";
import type { GraphistesAi } from "../../src/lib/syna-agent/logo-graphistes";
import type { RelectureDuLogo } from "../../src/lib/syna-agent/logo-finalisation";
import { CLIENT, euros } from "./essai-esquisses-outil";

export { CLIENT, euros };

// ---------------------------------------------------------------- les entrées

/** La phrase du métier écrite par l'essai des esquisses dans son rapport (« Phrase du métier : … »). */
export function metierDuRapport(texte: string): string | null {
  const m = texte.match(/^Phrase du métier : (.+)$/m);
  return m ? m[1].trim() : null;
}

/**
 * Le métier de l'essai, jamais réécrit par un appel : lu dans le rapport de l'essai des esquisses quand son chemin est
 * donné, sinon pris tel quel (paramètre ou variable). Les deux donnés et différents : rien n'est lancé.
 */
export function metierDeLEssai(o: { rapport?: string; metier?: string }): string {
  const donne = o.metier?.trim() ?? "";
  if (o.rapport) {
    const lu = metierDuRapport(fs.readFileSync(o.rapport, "utf8"));
    if (!lu) throw new Error(`Le rapport ${o.rapport} ne contient pas de ligne « Phrase du métier : … » : rien n'est lancé.`);
    if (donne && donne !== lu) throw new Error(`Le métier donné (« ${donne} ») n'est pas celui du rapport (« ${lu} ») : rien n'est lancé.`);
    return lu;
  }
  if (!donne) throw new Error("Métier manquant : donnez le rapport de l'essai des esquisses (RAPPORT_ESQUISSES) ou la phrase (METIER_ESSAI). Rien n'est lancé.");
  return donne;
}

/** Le numéro d'une esquisse d'après son fichier (esquisse-04.png : 4), sinon sa place dans la liste. */
export const numeroDe = (fichier: string, place: number): number => {
  const m = path.basename(fichier).match(/esquisse-0*(\d+)/i);
  return m ? Number(m[1]) : place + 1;
};

// ---------------------------------------------------------------- le devis, sans aucun appel

export type LigneDuDevis = {
  esquisse: number; appel: string; modele: string;
  quand: "toujours" | "si le contrôle refuse le texte" | "si le relecteur refuse le logo";
  charge: "client" | "Studio";
  probableMicro: number; maxMicro: number;
};
export type DevisDeLEssai = {
  lignes: LigneDuDevis[];
  /** Le coût probable des logos sans aucun refus (celui du devis du Studio). */
  probableMicro: number;
  /** Le coût probable si chaque logo est refusé une fois et refait (texte réécrit compris). */
  probableAvecReprisesMicro: number;
  /** La somme des maxima de tous les appels possibles : le plafond minimal pour aller au bout à coup sûr. */
  plafondMinimalMicro: number;
  /** Le devis du Studio (`devisDesFinalisations`) : plafond du client et borne du Studio de la tâche. */
  devisDuStudio: { maxMicro: number; studioMaxMicro: number; probableMicro: number };
  /** En plus, au pire, si une réponse de texte mal formée doit être réparée (une fois par appel, règle de llmJson). */
  reparationsMicro: number;
};

/** Le devis de l'essai, appel par appel, calculé avec les fonctions du devis du Studio (aucun appel). */
export async function devisDeLEssai(numeros: readonly number[]): Promise<DevisDeLEssai> {
  const { devisDUnAppel, devisDesFinalisations, PRIX_MESURES } = await import("../../src/lib/syna-agent/logo-graphistes");
  const { logoFinalisationMaxMicro } = await import("../../src/lib/ai/media-providers");
  const { jsonCallMaxMicro } = await import("../../src/lib/ai/llm");
  const { LOGO_MODELS } = await import("../../src/lib/ai/logo-policy");
  const micro = (eur: number) => Math.round(eur * 1_000_000);
  const r = devisDUnAppel("redaction"), v = devisDUnAppel("logo");
  const logoMax = logoFinalisationMaxMicro(), logoProbable = micro((PRIX_MESURES.logoFini.min + PRIX_MESURES.logoFini.max) / 2);
  const redactionProbable = micro(PRIX_MESURES.redaction);
  const nomDe = (m: { provider: string; model: string; effort: string }) => `${m.provider}:${m.model}${m.effort ? ` (effort ${m.effort})` : ""}`;
  const lignes: LigneDuDevis[] = [];
  for (const n of numeros) {
    lignes.push(
      { esquisse: n, appel: "texte de finalisation", modele: nomDe(r.modele), quand: "toujours", charge: "client", probableMicro: redactionProbable, maxMicro: r.max },
      { esquisse: n, appel: "texte réécrit (une fois)", modele: nomDe(r.modele), quand: "si le contrôle refuse le texte", charge: "Studio", probableMicro: redactionProbable, maxMicro: r.max },
      { esquisse: n, appel: "logo fini, 1er essai", modele: `openai:${LOGO_MODELS.finalisation}`, quand: "toujours", charge: "client", probableMicro: logoProbable, maxMicro: logoMax },
      { esquisse: n, appel: "relecture du 1er essai", modele: nomDe(v.modele), quand: "toujours", charge: "client", probableMicro: v.probable, maxMicro: v.max },
      { esquisse: n, appel: "logo fini, reprise unique", modele: `openai:${LOGO_MODELS.finalisation}`, quand: "si le relecteur refuse le logo", charge: "Studio", probableMicro: logoProbable, maxMicro: logoMax },
      { esquisse: n, appel: "relecture de la reprise", modele: nomDe(v.modele), quand: "si le relecteur refuse le logo", charge: "Studio", probableMicro: v.probable, maxMicro: v.max },
    );
  }
  const d = devisDesFinalisations(numeros.length);
  const somme = (f: (l: LigneDuDevis) => boolean, k: "probableMicro" | "maxMicro") => lignes.filter(f).reduce((s, l) => s + l[k], 0);
  // Une réparation de réponse (llmJson) : la réponse renvoyée et la consigne en plus à l'entrée, même limite de sortie.
  const reparation = (a: ReturnType<typeof devisDUnAppel>) => (jsonCallMaxMicro(a.modele.provider, a.modele.model, a.jetons.input * 1.5, a.jetons.max, a.jetons.max, a.modele.effort || null)?.maxMicro ?? a.max) - a.max;
  const parEsquisse = 2 * reparation(r) + 2 * reparation(v);
  return {
    lignes,
    probableMicro: Math.ceil(somme((l) => l.quand === "toujours", "probableMicro")),
    probableAvecReprisesMicro: Math.ceil(somme(() => true, "probableMicro")),
    plafondMinimalMicro: Math.ceil(somme(() => true, "maxMicro")),
    devisDuStudio: { maxMicro: d.maxMicro, studioMaxMicro: d.studioMaxMicro, probableMicro: d.probableMicro },
    reparationsMicro: Math.ceil(parEsquisse * numeros.length),
  };
}

/** Le devis en texte, pour le rapport et la console. */
export function devisEnTexte(d: DevisDeLEssai): string[] {
  const l = [
    "Devis de l'essai (fonctions du devis du Studio, aucun appel) :",
    ...d.lignes.map((x) => `- esquisse ${x.esquisse} · ${x.appel} · ${x.modele} · ${x.quand} · charge ${x.charge} · probable ${euros(x.probableMicro)} · au plus ${euros(x.maxMicro)} · écart ${euros(x.maxMicro - x.probableMicro)}`),
    `Probable, sans refus : ${euros(d.probableMicro)} (devis du Studio : ${euros(d.devisDuStudio.probableMicro)})`,
    `Probable, si chaque logo est refait une fois et son texte réécrit : ${euros(d.probableAvecReprisesMicro)}`,
    `Plafond minimal pour aller au bout à coup sûr (somme des maxima) : ${euros(d.plafondMinimalMicro)}`,
    `  dont plafond du client de la tâche ${euros(d.devisDuStudio.maxMicro)} et borne du Studio ${euros(d.devisDuStudio.studioMaxMicro)} (devisDesFinalisations)`,
    `Écart entre le probable et ce plafond : ${euros(d.plafondMinimalMicro - d.probableMicro)}`,
    `Hors plafond : une réponse de texte mal formée à réparer coûterait au plus ${euros(d.reparationsMicro)} de plus en tout ; la tâche du parcours ne la couvre pas (elle s'arrêterait sur sa propre borne).`,
  ];
  return l;
}

// ---------------------------------------------------------------- l'essai

export type EssaiEcrit = { tour: number; texte?: string; brut?: string; detoure?: string; verdict?: RelectureDuLogo; raisons?: string[] };
export type LogoDeLEssai = { numero: number; fichier: string; ok?: boolean; raison?: string; essais: EssaiEcrit[]; notes: string[]; palette?: unknown };
export type LigneDeDepense = { cle: string | null; task: string | null; modele: string | null; studio: boolean; reserveMicro: number; reelMicro: number | null; statut: string; appel?: Record<string, unknown> };
export type ResultatDeLaFinalisation = { arret?: string; metier: string; logos: LogoDeLEssai[]; depenseMicro: number; appels: LigneDeDepense[]; devis: DevisDeLEssai };

type Qui = { userId: string; projectId: string; jobId: string; capMicro: number };

/**
 * L'essai lui-même. `ai` : les appels (par défaut `graphistesDeps.ai`, sinon les vrais appels de SINA, avec le plafond du
 * client et la borne du Studio du devis, comme dans le parcours). Le plafond, en euros, allume le garde-fou de l'essai
 * pour toute la durée du script. `detourer` : le retrait du fond (par défaut celui du Studio, `logoDetoure`).
 */
export async function essaiDeFinalisation(o: {
  sortie: string; plafondEuros: string; esquisses: string[]; metier: string;
  ai?: (q: Qui) => GraphistesAi;
  detourer?: (png: Buffer) => Promise<{ ok: true; png: Buffer } | { ok: false; why: string }>;
}): Promise<ResultatDeLaFinalisation> {
  const plafond = Number(o.plafondEuros.replace(",", "."));
  if (!Number.isFinite(plafond) || plafond <= 0) throw new Error("PLAFOND_ESSAI_EUR manquant ou illisible : rien n'est lancé.");
  if (!o.esquisses.length) throw new Error("Aucune esquisse donnée : rien n'est lancé.");
  const metier = o.metier.trim();
  if (!metier) throw new Error("Métier manquant : rien n'est lancé.");
  const images = o.esquisses.map((f, i) => {
    if (!fs.existsSync(f)) throw new Error(`Esquisse introuvable : ${f}. Rien n'est lancé.`);
    return { fichier: f, numero: numeroDe(f, i), png: fs.readFileSync(f) };
  });
  if (new Set(images.map((x) => x.numero)).size !== images.length) throw new Error("Deux esquisses portent le même numéro : rien n'est lancé.");
  // Le garde-fou de l'essai, compté depuis le début du script.
  process.env.STUDIO_ESSAI_PLAFOND_EUROS = String(plafond);
  const debut = Date.now();
  process.env.STUDIO_ESSAI_DEBUT = String(debut);
  fs.mkdirSync(o.sortie, { recursive: true });

  const { id, run, all } = await import("../../src/lib/db");
  const { account, project } = await import("../../tests/conversation209-fixtures");
  const { graphistesDeps, vraisAppels, uneFinalisation } = await import("../../src/lib/syna-agent/logo-graphistes");
  const { consigneDeFinalisation, DEMANDE_AU_REDACTEUR, RELECTEUR_DU_LOGO_FINI, raisonsDuRefus } = await import("../../src/lib/syna-agent/logo-finalisation");
  const { logoDetoure } = await import("../../src/lib/syna-agent/brand-images");
  const { CostCapReached, depensesDeLaTache } = await import("../../src/lib/ai/trace");
  const { PlafondDeLEssaiAtteint, depensesDeLEssai, arretParLEssai } = await import("../../src/lib/ai/plafond-essai");
  const { runForUser } = await import("../../src/lib/ai/access");
  const { runWithLang } = await import("../../src/lib/i18n-server");

  const devis = await devisDeLEssai(images.map((x) => x.numero));
  // 1. Le client fictif et son projet.
  const u = await account();
  const projectId = project(u) as string;
  run("UPDATE projects SET name=? WHERE id=?", CLIENT.nom, projectId);
  const jobId = `essai-finalisation-${id()}`;
  const qui: Qui = { userId: u.id, projectId, jobId, capMicro: devis.devisDuStudio.maxMicro };
  const brut: GraphistesAi = o.ai ? o.ai(qui) : graphistesDeps.ai ? graphistesDeps.ai(jobId) : vraisAppels({ ...qui, studioCapMicro: devis.devisDuStudio.studioMaxMicro });

  const res: ResultatDeLaFinalisation = { metier, logos: [], depenseMicro: 0, appels: [], devis };
  const nn = (n: number) => String(n).padStart(2, "0");
  const ecrireFichier = (nom: string, contenu: string | Buffer) => { fs.writeFileSync(path.join(o.sortie, nom), contenu); return nom; };
  const json = (v: unknown) => `${JSON.stringify(v, (_k, x) => (Buffer.isBuffer(x) ? `[image de ${x.length} octets]` : x), 2)}\n`;
  const cleDe = (cle: string) => { const m = cle.match(/^e(\d+)-(texte|logo|relecture)-(\d+)$/); return m ? { numero: Number(m[1]), tour: Number(m[3]) } : { numero: 0, tour: 0 }; };
  const logoDe = (numero: number) => res.logos.find((l) => l.numero === numero)!;
  const essaiDe = (numero: number, tour: number) => { const l = logoDe(numero); let e = l.essais.find((x) => x.tour === tour); if (!e) { e = { tour }; l.essais.push(e); } return e; };

  // 2. Les appels de SINA, tels quels, avec ce qui part et ce qui revient écrit tout de suite (un arrêt ne perd rien).
  const ai: GraphistesAi = {
    ...brut,
    rediger: async (consigne, esquisse, cle) => {
      const { numero, tour } = cleDe(cle);
      ecrireFichier(`esquisse-${nn(numero)}-redaction-${tour}-consigne.txt`, `${consigne}\n\n--- message joint à l'esquisse ---\n${DEMANDE_AU_REDACTEUR}\n`);
      const t = await brut.rediger(consigne, esquisse, cle);
      ecrireFichier(`esquisse-${nn(numero)}-redaction-${tour}-reponse.json`, json(t));
      return t;
    },
    finaliser: async (esquisse, texte, cle) => {
      const { numero, tour } = cleDe(cle);
      const e = essaiDe(numero, tour);
      e.texte = ecrireFichier(`esquisse-${nn(numero)}-logo-${tour}-texte-envoye.txt`, `${texte}\n`);
      const r = await brut.finaliser(esquisse, texte, cle);
      e.brut = ecrireFichier(`esquisse-${nn(numero)}-logo-${tour}-brut.png`, r.png);
      if (r.recu) ecrireFichier(`esquisse-${nn(numero)}-logo-${tour}-recu.json`, json(r.recu));
      return r;
    },
    relireLogo: async (logo, esquisse, demande, cle) => {
      const { numero, tour } = cleDe(cle);
      ecrireFichier(`esquisse-${nn(numero)}-relecture-${tour}-demande.txt`, `${RELECTEUR_DU_LOGO_FINI}\n\n--- demande ---\n${demande}\n\n--- images jointes : 1. le logo fini sur blanc ; 2. l'esquisse ---\n`);
      const v = await brut.relireLogo(logo, esquisse, demande, cle);
      const e = essaiDe(numero, tour);
      e.verdict = v;
      e.raisons = raisonsDuRefus(v, CLIENT.nom);
      ecrireFichier(`esquisse-${nn(numero)}-relecture-${tour}-verdict.json`, json({ verdict: v, raisons: e.raisons, garde: !e.raisons.length }));
      return v;
    },
  };
  const detourer = o.detourer ?? ((png: Buffer) => logoDetoure(png));

  const lignes: string[] = [
    `Essai de la finalisation des logos — client « ${CLIENT.nom} » (${CLIENT.activite}), type « ${CLIENT.kind} »`,
    `Plafond de l'essai : ${euros(Math.floor(plafond * 1_000_000))}`,
    `Phrase du métier (essai des esquisses, jamais réécrite) : ${metier}`,
    `Esquisses : ${images.map((x) => `${x.numero} (${x.fichier})`).join(", ")}`,
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
    for (const l of res.logos) {
      lignes.push("", `Esquisse ${l.numero} : ${l.ok === true ? "logo GARDÉ par le relecteur" : l.ok === false ? `logo NON gardé (${l.raison})` : "non terminée"}`);
      for (const e of l.essais) {
        lignes.push(`  essai ${e.tour} : texte ${e.texte ?? "—"} ; logo brut ${e.brut ?? "—"} ; détouré ${e.detoure ?? "—"}`);
        if (e.verdict) lignes.push(`    verdict : note ${e.verdict.note}/10, nom lu « ${e.verdict.nomLu} », idée conservée ${e.verdict.ideeConservee ? "oui" : "non"}, arche ${e.verdict.arche ? "oui" : "non"}${e.verdict.phrase ? `, phrase « ${e.verdict.phrase} »` : ""} — ${e.verdict.pourquoi}`, `    raisons du refus : ${e.raisons?.length ? e.raisons.join(" ; ") : "aucune"}`);
        else if (e.raisons?.length) lignes.push(`    refusé sans relecture : ${e.raisons.join(" ; ")}`);
      }
      for (const n of l.notes) lignes.push(`  note : ${n}`);
    }
    lignes.push("", "Dépense réelle comptée par le Studio, appel par appel (réservé au plus → réglé) :",
      ...(res.appels.length ? res.appels.map((a) => `- ${a.cle ?? a.task ?? "?"} · ${a.modele ?? "?"} · ${a.studio ? "charge du Studio" : "charge du client"} · réservé ${euros(a.reserveMicro)} → réglé ${a.reelMicro == null ? "—" : euros(a.reelMicro)} (${a.statut})${a.appel ? ` · jetons ${a.appel.jetonsEntree} en entrée, ${a.appel.jetonsSortie} en sortie` : ""}`) : ["- aucun appel"]),
      "", `Dépense réelle comptée par le Studio : ${euros(res.depenseMicro)}`, "Détail complet : depense.json (appel par appel), usage.json (jetons, qualité, taille, fond, format renvoyés).");
    if (res.arret) lignes.push("", `ARRÊT : ${res.arret}`);
    ecrireFichier("rapport.txt", `${lignes.join("\n")}\n`);
    return res;
  };

  return runWithLang({ ui: "fr", content: "fr" }, () => runForUser(u.id, async () => {
    // 3. Chaque esquisse, telle quelle, dans l'ordre de leurs numéros (comme le parcours) ; rien n'est relancé.
    for (const x of [...images].sort((a, b) => a.numero - b.numero)) {
      const l: LogoDeLEssai = { numero: x.numero, fichier: x.fichier, essais: [], notes: [] };
      res.logos.push(l);
      ecrireFichier(`esquisse-${nn(x.numero)}-recue.png`, x.png);
      ecrireFichier(`esquisse-${nn(x.numero)}-consigne-du-redacteur.txt`, `${consigneDeFinalisation(CLIENT.nom, metier)}\n`);
      let tours = 0;
      const detourerIci = async (png: Buffer) => {
        tours += 1;
        const d = await detourer(png);
        const e = essaiDe(x.numero, tours);
        if (d.ok) e.detoure = ecrireFichier(`esquisse-${nn(x.numero)}-logo-${tours}-detoure.png`, d.png);
        else e.raisons = [d.why];
        return d;
      };
      try {
        const f = await uneFinalisation(ai, { nom: CLIENT.nom, metier, esquisse: x.png, numero: x.numero, detourer: detourerIci });
        l.ok = f.ok; l.notes = f.notes;
        if (!f.ok) l.raison = f.raison;
        else {
          ecrireFichier(`esquisse-${nn(x.numero)}-logo-garde.png`, f.logo);
          ecrireFichier(`esquisse-${nn(x.numero)}-logo-garde-detoure.png`, f.detoure);
          if (f.palette) { l.palette = f.palette; ecrireFichier(`esquisse-${nn(x.numero)}-couleurs-du-logo.json`, json(f.palette)); }
        }
      } catch (e) {
        res.arret = e instanceof PlafondDeLEssaiAtteint ? `le garde-fou de l'essai a refusé un appel (esquisse ${x.numero}) : ${e.message}`
          : e instanceof CostCapReached ? `le plafond de la tâche (celui du parcours) a refusé un appel (esquisse ${x.numero}) : ${e.message}`
            : `un appel a échoué (esquisse ${x.numero}), jamais relancé : ${String((e as Error)?.message ?? e).slice(0, 400)}`;
        break;
      }
    }
    const parLEssai = arretParLEssai(jobId);
    if (parLEssai && !res.arret) res.arret = `le garde-fou de l'essai a refusé un appel : ${parLEssai.message}`;
    return ecrire();
  }));
}
