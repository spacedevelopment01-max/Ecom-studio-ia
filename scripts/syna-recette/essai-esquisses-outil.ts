/**
 * L'essai réel des esquisses de logo : la partie qui se teste (appels simulés dans les essais). Le script à lancer est
 * scripts/syna-recette/essai-esquisses.mts, qui l'utilise ; son en-tête dit tout. Le client inventé est donné à chaque
 * essai (client-de-l-essai.ts) : aucun client n'est imposé.
 *
 * La recherche est EXACTEMENT celle du parcours (logo-graphistes-tache.ts) : `ecrireLeMetier`, puis `uneRecherche` avec
 * les vrais appels (`vraisAppels`) : deux planches, la découpe, un seul appel au relecteur, une esquisse refusée jamais
 * montrée, chaque esquisse écartée remplacée par le même modèle (une nouvelle planche de six, avec « Évite ces pistes
 * déjà présentées : … », à la charge du Studio) jusqu'à 12 correctes, au plus `REMPLACEMENTS_MAX` tours ; la phrase sous
 * le nom relevée en entier pour chaque esquisse gardée. Le compte rendu et esquisses.json disent le vrai résultat :
 * combien des 12 étaient correctes dès les deux planches, combien ont dû être remplacées, lesquelles et pourquoi.
 */
import fs from "node:fs";
import path from "node:path";
import type { GraphistesAi } from "../../src/lib/syna-agent/logo-graphistes";
import type { RelectureEsquisses } from "../../src/lib/syna-agent/esquisses";
import type { PhraseDeLEsquisse } from "../../src/lib/syna-agent/phrase-sous-le-nom";
import { clientDeLEssai, euros, typeDuProjet, type ClientDeLEssai } from "./client-de-l-essai";
import { lignesDeLArret, avisDuPlafond } from "./plafond-des-essais";

export { clientDeLEssai, euros };
export type { ClientDeLEssai };

// ---------------------------------------------------------------- le devis, sans aucun appel

export type LigneDuDevisDesEsquisses = { appel: string; modele: string; quand: string; charge: "client" | "Studio"; probableMicro: number; maxMicro: number };
export type DevisDesEsquisses = {
  lignes: LigneDuDevisDesEsquisses[];
  /** Sans réécriture du métier ni reprise des planches. */
  probableMicro: number;
  /** Si le métier est réécrit une fois et un tour de remplacement fait (les deux planches et leur relecture). */
  probableAvecReprisesMicro: number;
  /** La somme des maxima de tous les appels possibles, remplacements compris jusqu'à la borne : le plafond minimal pour aller au bout à coup sûr. */
  plafondMinimalMicro: number;
  /** Le devis du Studio pour la recherche (`devisDeLaRecherche`) : plafond du client et borne du Studio. */
  devisDuStudio: { maxMicro: number; studioMaxMicro: number; probableMicro: number };
  /** En plus, au pire, si une réponse de texte mal formée doit être réparée (une fois par appel de texte, règle de llmJson). */
  reparationsMicro: number;
};

/**
 * Le devis de l'essai, appel par appel, avec les fonctions du devis du Studio (aucun appel) : le métier (et sa réécriture
 * unique, à la charge du Studio), les deux planches, la relecture des esquisses, puis jusqu'à `REMPLACEMENTS_MAX` tours de
 * remplacement (une planche par modèle à qui il manque des esquisses, et leur relecture, à la charge du Studio).
 */
export async function devisDesEsquisses(): Promise<DevisDesEsquisses> {
  const { devisDUnAppel, devisDeLaRecherche, PRIX_MESURES } = await import("../../src/lib/syna-agent/logo-graphistes");
  const { logoPlancheMaxMicro } = await import("../../src/lib/ai/media-providers");
  const { LOGO_MODELS } = await import("../../src/lib/ai/logo-policy");
  const { jsonCallMaxMicro } = await import("../../src/lib/ai/llm");
  const { REMPLACEMENTS_MAX } = await import("../../src/lib/syna-agent/esquisses");
  const m = devisDUnAppel("metier"), r = devisDUnAppel("esquisses");
  const nomDe = (a: typeof m) => `${a.modele.provider}:${a.modele.model}${a.modele.effort ? ` (effort ${a.modele.effort})` : ""}`;
  const planches = (quand: string, charge: LigneDuDevisDesEsquisses["charge"], appel: string) => LOGO_MODELS.recherche.map((modele) => ({ appel, modele: `openai:${modele}`, quand, charge, probableMicro: Math.round((PRIX_MESURES.planche[modele] ?? 0.03) * 1_000_000), maxMicro: logoPlancheMaxMicro(modele) }));
  const remplacements = Array.from({ length: REMPLACEMENTS_MAX }, (_v, i) => {
    const quand = i === 0 ? "si une esquisse est écartée" : `si une esquisse est encore écartée (tour ${i + 1})`;
    return [...planches(quand, "Studio", `remplacement ${i + 1} : nouvelle planche du même modèle`), { appel: `relecture du remplacement ${i + 1}`, modele: nomDe(r), quand, charge: "Studio" as const, probableMicro: r.probable, maxMicro: r.max }];
  }).flat();
  const lignes: LigneDuDevisDesEsquisses[] = [
    { appel: "métier", modele: nomDe(m), quand: "toujours", charge: "client", probableMicro: m.probable, maxMicro: m.max },
    { appel: "métier réécrit (une fois)", modele: nomDe(m), quand: "si le contrôle refuse le métier", charge: "Studio", probableMicro: m.probable, maxMicro: m.max },
    ...planches("toujours", "client", "planche de six esquisses"),
    { appel: "relecture des esquisses (un appel)", modele: nomDe(r), quand: "toujours", charge: "client", probableMicro: r.probable, maxMicro: r.max },
    ...remplacements,
  ];
  const somme = (f: (l: LigneDuDevisDesEsquisses) => boolean, k: "probableMicro" | "maxMicro") => lignes.filter(f).reduce((s, l) => s + l[k], 0);
  const reparation = (a: typeof m) => Math.max(0, (jsonCallMaxMicro(a.modele.provider, a.modele.model, a.jetons.input * 1.5, a.jetons.max, a.jetons.max, a.modele.effort || null)?.maxMicro ?? a.max) - a.max);
  const d = devisDeLaRecherche();
  return {
    lignes,
    probableMicro: Math.ceil(somme((l) => l.quand === "toujours", "probableMicro")),
    probableAvecReprisesMicro: Math.ceil(somme((l) => l.quand === "toujours" || l.quand === "si le contrôle refuse le métier" || l.quand === "si une esquisse est écartée", "probableMicro")),
    plafondMinimalMicro: Math.ceil(somme(() => true, "maxMicro")),
    devisDuStudio: { maxMicro: d.maxMicro, studioMaxMicro: d.studioMaxMicro, probableMicro: d.probableMicro },
    reparationsMicro: Math.ceil(2 * reparation(m) + (1 + REMPLACEMENTS_MAX) * reparation(r)),
  };
}

/** Le devis en texte, pour le rapport et la console. */
export function devisDesEsquissesEnTexte(d: DevisDesEsquisses): string[] {
  return [
    "Devis de l'essai des esquisses (fonctions du devis du Studio, aucun appel) :",
    ...d.lignes.map((x) => `- ${x.appel} · ${x.modele} · ${x.quand} · charge ${x.charge} · probable ${euros(x.probableMicro)} · au plus ${euros(x.maxMicro)}`),
    `Probable, sans reprise : ${euros(d.probableMicro)} (devis du Studio : ${euros(d.devisDuStudio.probableMicro)})`,
    `Probable, si le métier est réécrit et un tour de remplacement fait (deux planches et leur relecture) : ${euros(d.probableAvecReprisesMicro)}`,
    `Plafond minimal pour aller au bout à coup sûr (somme des maxima, remplacements compris jusqu'à la borne) : ${euros(d.plafondMinimalMicro)}`,
    `  dont plafond du client de la tâche ${euros(d.devisDuStudio.maxMicro)} et borne du Studio ${euros(d.devisDuStudio.studioMaxMicro)} (devisDeLaRecherche)`,
    `Hors plafond : une réponse de texte mal formée à réparer coûterait au plus ${euros(d.reparationsMicro)} de plus en tout.`,
  ];
}

// ---------------------------------------------------------------- la planche-contact complète (gratuite)

const echapper = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
/** Une raison courte, sur deux lignes au plus, pour le bandeau d'une esquisse écartée. */
export const raisonCourte = (r: string): string[] => {
  const mots = r.replace(/\s+/g, " ").trim().split(" "), lignes: string[] = [];
  let l = "";
  for (const m of mots) { if ((l + " " + m).trim().length > 30) { lignes.push(l.trim()); l = m; if (lignes.length === 2) break; } else l = `${l} ${m}`; }
  if (lignes.length < 2 && l.trim()) lignes.push(l.trim());
  const brut = lignes.join(" ");
  if (brut.length < r.trim().length && lignes.length) lignes[lignes.length - 1] = `${lignes[lignes.length - 1].replace(/[,;:.]?$/, "")}…`;
  return lignes.slice(0, 2);
};

/** `enPlus` : correcte, mais pas nécessaire (les 6 de son modèle étaient déjà là) : un bandeau gris « EN PLUS », pas rouge. */
export type CaseDecoupee = { tour: number; modele: string; index: number; png: Buffer | null; numero?: number; raison?: string; enPlus?: boolean };

/**
 * La planche-contact COMPLÈTE, pour le propriétaire : toutes les esquisses découpées, dans l'ordre des planches ; les gardées
 * avec leur numéro (celui que le client voit), les écartées voilées, barrées d'un bandeau rouge « ÉCARTÉE » et de leur
 * raison courte. Une case vide à la découpe garde sa place, avec sa raison.
 */
export async function plancheContactComplete(cases: CaseDecoupee[], colonnes = 6, cote = 256): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const { LOGO_MODELS } = await import("../../src/lib/ai/logo-policy");
  const n = Math.max(1, cases.length), lignes = Math.ceil(n / colonnes), pas = cote + 16;
  const W = colonnes * pas + 16, H = lignes * pas + 16;
  const tuiles = await Promise.all(cases.map(async (c, i) => {
    const x = 16 + (i % colonnes) * pas, y = 16 + Math.floor(i / colonnes) * pas;
    const fond = c.png ? await sharp(c.png).resize(cote, cote, { fit: "contain", background: "#FFFFFF" }).png().toBuffer()
      : await sharp({ create: { width: cote, height: cote, channels: 3, background: "#FFFFFF" } }).png().toBuffer();
    // Ce que le propriétaire lit : la planche (1 ou 2, dans l'ordre des modèles de recherche) et la case, jamais un nom de modèle.
    const origine = `${c.tour > 1 ? `remplacement ${c.tour - 1} · ` : ""}planche ${(LOGO_MODELS.recherche as readonly string[]).indexOf(c.modele) + 1 || "?"} · case ${c.index + 1}`;
    let svg: string;
    if (c.numero != null) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cote}" height="${cote}"><rect x="6" y="6" width="44" height="34" rx="8" fill="#111111"/><text x="28" y="30" font-family="sans-serif" font-size="20" font-weight="700" fill="#FFFFFF" text-anchor="middle">${c.numero}</text><text x="${cote - 6}" y="${cote - 8}" font-family="sans-serif" font-size="11" fill="#666666" text-anchor="end">${echapper(origine)}</text></svg>`;
    } else {
      const r = raisonCourte(c.raison ?? "écartée");
      const teinte = c.enPlus ? "#6B6B6B" : "#C62828", titre = c.enPlus ? "EN PLUS" : "ÉCARTÉE";
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cote}" height="${cote}"><rect width="${cote}" height="${cote}" fill="#FFFFFF" fill-opacity="0.45"/><rect x="2" y="2" width="${cote - 4}" height="${cote - 4}" fill="none" stroke="${teinte}" stroke-width="4"/>${c.enPlus ? "" : `<line x1="0" y1="0" x2="${cote}" y2="${cote}" stroke="#C62828" stroke-width="3" stroke-opacity="0.55"/>`}<rect x="0" y="${cote - 78}" width="${cote}" height="78" fill="${teinte}"/><text x="${cote / 2}" y="${cote - 54}" font-family="sans-serif" font-size="18" font-weight="700" fill="#FFFFFF" text-anchor="middle">${titre}</text>${r.map((l, k) => `<text x="${cote / 2}" y="${cote - 34 + k * 16}" font-family="sans-serif" font-size="13" fill="#FFFFFF" text-anchor="middle">${echapper(l)}</text>`).join("")}<text x="${cote - 6}" y="16" font-family="sans-serif" font-size="11" fill="${teinte}" text-anchor="end">${echapper(origine)}</text></svg>`;
    }
    return [{ input: fond, left: x, top: y }, { input: Buffer.from(svg), left: x, top: y }];
  }));
  return sharp({ create: { width: W, height: H, channels: 3, background: "#F2F2F0" } }).composite(tuiles.flat()).png().toBuffer();
}

// ---------------------------------------------------------------- l'essai

export type EsquisseDeLEssai = { numero: number; fichier: string; modele: string; tour: number; case: number; piste: string; pourquoi: string; phrase?: PhraseDeLEsquisse };
export type EcarteeDeLEssai = { fichier: string | null; modele: string; tour: number; case: number; raison: string };
/** Le vrai résultat : combien des 12 étaient correctes dès les deux planches ; combien ont dû être remplacées, et lesquelles. */
export type CompteDesDouze = { voulues: number; correctesDesLesPlanches: number; remplacees: number; lesquelles: { modele: string; case: number; raison: string }[]; toursDeRemplacement: number; complete: boolean };
export type ResultatDeLEssai = {
  arret?: string; metier?: string; texte?: string; planches: string[]; esquisses: number; gardees: EsquisseDeLEssai[]; ecartees: EcarteeDeLEssai[];
  /** Les écartées, en mots (« modèle, case N : raison »). */
  refusees: string[]; manquees: string[]; reprise: boolean; notes: string[]; depenseMicro: number;
  compte?: CompteDesDouze;
};

/** Le compte des 12, en mots, pour le compte rendu. */
export function compteEnTexte(c: CompteDesDouze): string[] {
  return [
    `Vrai résultat : ${c.correctesDesLesPlanches} esquisse(s) correcte(s) sur ${c.voulues} dès les deux planches.`,
    `Remplacées : ${c.remplacees}${c.remplacees ? ` (en ${c.toursDeRemplacement} tour(s) de remplacement, à la charge du Studio)` : ""}${c.complete ? "" : ` ; INCOMPLÈTE : moins de ${c.voulues} esquisses correctes, rien ne serait montré au client`}.`,
    ...c.lesquelles.map((x) => `- planche ${x.modele}, case ${x.case} : ${x.raison}`),
  ];
}

/**
 * « D'autres pistes » : lit le esquisses.json d'une recherche précédente de l'essai et en tire ce que la tâche du Studio
 * reprend de son état (logo-graphistes-tache.ts) : le métier déjà écrit, le premier numéro suivant, les pistes déjà
 * présentées (toutes les esquisses montrées).
 */
export function lesPistesDeLaRechercheAvant(fichier: string): { metier: NonNullable<import("../../src/lib/syna-agent/logo-graphistes").EtatGraphistes["metier"]>; depart: number; eviter: string[]; recherche: number } {
  const j = JSON.parse(fs.readFileSync(fichier, "utf8")) as { metier?: unknown; gardees?: { numero: number; piste?: string }[]; recherche?: number };
  const gardees = j.gardees ?? [];
  if (!j.metier || !gardees.length) throw new Error(`${fichier} : ni métier ni esquisses gardées, « d'autres pistes » ne peut pas partir. Rien n'est lancé.`);
  return { metier: j.metier as never, depart: Math.max(...gardees.map((g) => g.numero)) + 1, eviter: gardees.map((g) => g.piste ?? "").filter(Boolean), recherche: (j.recherche ?? 1) + 1 };
}

/**
 * L'essai lui-même. `ai` : les appels (par défaut `graphistesDeps.ai`, sinon les vrais appels de SINA, sous le plafond du
 * client et la borne du Studio du devis de la recherche, comme dans le parcours). Le plafond, en euros, allume le
 * garde-fou de l'essai pour toute la durée du script.
 */
export async function essaiDesEsquisses(o: { sortie: string; plafondEuros: string; client: ClientDeLEssai; autresPistes?: string; ai?: (c: { userId: string; projectId: string; jobId: string; capMicro: number }) => GraphistesAi }): Promise<ResultatDeLEssai> {
  const plafond = Number(o.plafondEuros.replace(",", "."));
  if (!Number.isFinite(plafond) || plafond <= 0) throw new Error("PLAFOND_ESSAI_EUR manquant ou illisible : rien n'est lancé.");
  if (!o.client?.nom || !o.client.metier) throw new Error("Client de l'essai manquant (nom et métier) : rien n'est lancé.");
  // Ce que le métier reçoit : le nom, l'activité avec ses mots, le type.
  const CLIENT = { nom: o.client.nom, activite: o.client.metier, kind: o.client.kind };
  // Le garde-fou de l'essai, compté depuis le début du script.
  process.env.STUDIO_ESSAI_PLAFOND_EUROS = String(plafond);
  const debut = Date.now();
  process.env.STUDIO_ESSAI_DEBUT = String(debut);
  fs.mkdirSync(o.sortie, { recursive: true });

  const { id, run, all } = await import("../../src/lib/db");
  const { account, project } = await import("../../tests/conversation209-fixtures");
  const { graphistesDeps, vraisAppels, ecrireLeMetier, uneRecherche } = await import("../../src/lib/syna-agent/logo-graphistes");
  const { demandeDeRecherche } = await import("../../src/lib/syna-agent/logo-recherche");
  const { decouperLaPlanche, RELECTEUR_DES_ESQUISSES, demandeAuRelecteurDesEsquisses, ESQUISSES_MONTREES } = await import("../../src/lib/syna-agent/esquisses");
  const { depensesDeLaTache, withTrace } = await import("../../src/lib/ai/trace");
  const { PlafondDeLEssaiAtteint, depensesDeLEssai, arretParLEssai } = await import("../../src/lib/ai/plafond-essai");
  const { runForUser } = await import("../../src/lib/ai/access");
  const { runWithLang } = await import("../../src/lib/i18n-server");

  const devis = await devisDesEsquisses();
  // 1. Le client fictif et son projet.
  const u = await account();
  const projectId = project(u, typeDuProjet(o.client)) as string;
  run("UPDATE projects SET name=? WHERE id=?", CLIENT.nom, projectId);
  const jobId = `essai-esquisses-${id()}`;
  const capMicro = Math.floor(plafond * 1_000_000);
  const qui = { userId: u.id, projectId, jobId, capMicro };
  const brut: GraphistesAi = o.ai ? o.ai(qui) : graphistesDeps.ai ? graphistesDeps.ai(jobId) : vraisAppels({ userId: u.id, projectId, jobId, capMicro: devis.devisDuStudio.maxMicro, studioCapMicro: devis.devisDuStudio.studioMaxMicro });

  const res: ResultatDeLEssai = { planches: [], esquisses: 0, gardees: [], ecartees: [], refusees: [], manquees: [], reprise: false, notes: [], depenseMicro: 0 };
  const ecrireFichier = (nom: string, contenu: string | Buffer) => { fs.writeFileSync(path.join(o.sortie, nom), contenu); return nom; };
  const json = (v: unknown) => `${JSON.stringify(v, (_k, x) => (Buffer.isBuffer(x) ? `[image de ${x.length} octets]` : x), 2)}\n`;
  const nn = (n: number) => String(n).padStart(2, "0");
  // Les planches reçues (pour la planche-contact complète) et les verdicts, écrits dès qu'ils arrivent.
  const planchesRecues: { tour: number; modele: string; png: Buffer }[] = [];
  const verdicts: { tour: number; verdict: RelectureEsquisses }[] = [];
  const ai: GraphistesAi = {
    ...brut,
    planche: async (modele, prompt, cle) => {
      const tour = Number(/-t(\d+)-/.exec(cle)?.[1] ?? 1);
      ecrireFichier(`${tour > 1 ? `remplacement-${tour - 1}-${modele}-` : ""}texte-envoye.txt`, `${prompt}\n`);
      const r = await brut.planche(modele, prompt, cle);
      planchesRecues.push({ tour, modele, png: r.png });
      res.planches.push(ecrireFichier(`planche-${tour > 1 ? `remplacement-${tour - 1}-` : ""}${modele}.png`, r.png));
      return r;
    },
    relireEsquisses: async (images, nom, cle) => {
      const tour = Number(/-t(\d+)-/.exec(cle)?.[1] ?? 1);
      ecrireFichier(`relecture-${tour}-demande.txt`, `${RELECTEUR_DES_ESQUISSES}\n\n--- demande ---\n${demandeAuRelecteurDesEsquisses(nom, images.length)}\n\n--- ${images.length} esquisse(s) jointe(s), dans l'ordre de la découpe ---\n`);
      const v = await brut.relireEsquisses(images, nom, cle);
      verdicts.push({ tour, verdict: v });
      ecrireFichier(`relecture-${tour}-verdict.json`, json(v));
      return v;
    },
  };

  const avis = avisDuPlafond(Math.floor(plafond * 1_000_000), devis);
  const lignes: string[] = [`Essai des esquisses de logo — client « ${CLIENT.nom} » (${CLIENT.activite}), type « ${CLIENT.kind} »`, `Plafond de l'essai : ${euros(Math.floor(plafond * 1_000_000))}`, ...(avis ? [avis] : []), "", ...devisDesEsquissesEnTexte(devis), ""];
  const lireLaDepense = () => {
    const reservations = all<Record<string, any>>("SELECT * FROM ai_reservations WHERE job_id=? ORDER BY created_at, rowid", jobId);
    const appels = reservations.map((r) => ({ cle: r.operation_key ?? null, task: r.task ?? null, modele: r.model ? `${r.provider ?? ""}:${r.model}` : null, studio: !!r.studio, reserveMicro: r.amount, reelMicro: r.actual ?? null, statut: r.status }));
    ecrireFichier("depense.json", json(appels));
    return appels;
  };
  const ecrire = () => {
    res.depenseMicro = Math.max(depensesDeLEssai(debut), depensesDeLaTache(jobId).total);
    const appels = lireLaDepense();
    if (res.notes.length) lignes.push("", "Notes de la recherche :", ...res.notes.map((n) => `- ${n}`));
    if (res.manquees.length) lignes.push("", "Planches ou relecture manquées (jamais relancées) :", ...res.manquees.map((m) => `- ${m}`));
    lignes.push("", "Dépense réelle comptée par le Studio, appel par appel (réservé au plus → réglé) :",
      ...(appels.length ? appels.map((a) => `- ${a.cle ?? a.task ?? "?"} · ${a.modele ?? "?"} · ${a.studio ? "charge du Studio" : "charge du client"} · réservé ${euros(a.reserveMicro)} → réglé ${a.reelMicro == null ? "—" : euros(a.reelMicro)} (${a.statut})`) : ["- aucun appel"]),
      "", `Dépense réelle comptée par le Studio : ${euros(res.depenseMicro)}`);
    if (res.arret) lignes.push("", `ARRÊT : ${res.arret}`);
    // Arrêté par le plafond de l'essai (26 novembre 2026) : ce qui est fait, ce qu'il faudrait pour finir, comment reprendre.
    if (res.arret?.startsWith("le garde-fou de l'essai a refusé")) lignes.push("", ...lignesDeLArret({ depenseMicro: res.depenseMicro, plafondMicro: Math.floor(plafond * 1_000_000), plafondMinimalMicro: devis.plafondMinimalMicro,
      fait: [...res.planches.map((f) => `planche reçue : ${f}`), ...(res.metier ? [`métier écrit et contrôlé : « ${res.metier} »`] : [])],
      reprendre: "la recherche n'a pas de point de reprise : relance la même commande dans un nouveau dossier, avec un plafond plus haut ; les fichiers de ce dossier restent pour comparer." }));
    ecrireFichier("rapport.txt", `${lignes.join("\n")}\n`);
    return res;
  };
  const arret = (e: unknown) => e instanceof PlafondDeLEssaiAtteint ? `le garde-fou de l'essai a refusé un appel : ${e.message}` : null;

  // « D'autres pistes » (27 novembre 2026), comme la tâche du Studio (logo-graphistes-tache.ts, phase « pistes ») : le
  // métier déjà écrit est repris tel quel, la numérotation continue, et les pistes déjà présentées sont à éviter.
  const avant = o.autresPistes ? lesPistesDeLaRechercheAvant(o.autresPistes) : null;
  if (avant) lignes.push(`« D'autres pistes » : recherche ${avant.recherche}, numéros à partir de ${avant.depart}, ${avant.eviter.length} piste(s) déjà présentée(s) à éviter :`, ...avant.eviter.map((x) => `- ${x}`), "");

  return runWithLang({ ui: "fr", content: "fr" }, () => runForUser(u.id, () => withTrace({ jobId, projectId, costCapMicro: devis.devisDuStudio.maxMicro, studioCapMicro: devis.devisDuStudio.studioMaxMicro }, async () => {
    // Le métier, contrôle compris (comme la tâche du parcours) ; pour « d'autres pistes », celui déjà écrit.
    let metier;
    if (avant) metier = avant.metier;
    else try {
      const m = await ecrireLeMetier(ai, CLIENT);
      if (!m.ok) { res.arret = `le métier n'a pas passé le contrôle : ${m.raison}`; return ecrire(); }
      metier = m.metier;
    } catch (e) {
      res.arret = arret(e) ?? `le métier n'a pas pu être écrit : ${String((e as Error)?.message ?? e).slice(0, 300)}`;
      return ecrire();
    }
    res.metier = metier.metier;
    lignes.push(`Phrase du métier : ${metier.metier}`, `Ce que la piste explore : ${metier.court} (${metier.piste})`);
    res.texte = demandeDeRecherche({ nom: CLIENT.nom, metier, ...(avant ? { eviter: avant.eviter } : {}) });
    lignes.push("", "Texte exact envoyé aux deux modèles (premier tour) :", res.texte, "");
    // La recherche du parcours, telle quelle : planches, découpe, une relecture, remplacements jusqu'à 12 correctes.
    const r = await uneRecherche(ai, { nom: CLIENT.nom, metier, depart: avant?.depart ?? 1, eviter: avant?.eviter ?? [], recherche: avant?.recherche ?? 1 });
    res.reprise = r.reprise; res.notes = r.notes;
    res.compte = { voulues: ESQUISSES_MONTREES, correctesDesLesPlanches: r.correctesDesLesPlanches, remplacees: r.remplacees.length, lesquelles: r.remplacees.map((x) => ({ modele: x.modele, case: x.index + 1, raison: x.raison })), toursDeRemplacement: r.tours, complete: r.complete };
    res.manquees = r.manquees.map((m) => `${m.modele} : ${m.raison}${m.plafond ? " (plafond)" : ""}`);
    // Les esquisses gardées, numérotées comme le Studio les montre ; leur phrase sous le nom.
    for (const e of r.esquisses) {
      const fichier = ecrireFichier(`esquisse-${nn(e.numero)}.png`, e.png);
      res.gardees.push({ numero: e.numero, fichier, modele: e.modele, tour: e.tour, case: e.index + 1, piste: e.piste, pourquoi: e.pourquoi, ...(e.phrase ? { phrase: e.phrase } : {}) });
    }
    res.esquisses = r.esquisses.length;
    if (r.contact) ecrireFichier("planche-contact.png", r.contact);
    // Les écartées, avec leur image (redécoupée gratuitement, à l'identique) et leur raison.
    const decoupes = new Map<string, (Buffer | null)[]>();
    for (const p of planchesRecues) { const d = await decouperLaPlanche(p.png); decoupes.set(`${p.tour}:${p.modele}`, d.ok ? d.cases.map((c) => c.png ?? null) : []); }
    for (const x of r.refusees) {
      const png = decoupes.get(`${x.tour}:${x.modele}`)?.[x.index] ?? null;
      const fichier = png ? ecrireFichier(`ecartee-${x.tour > 1 ? `remplacement-${x.tour - 1}-` : ""}${x.modele}-case-${x.index + 1}.png`, png) : null;
      res.ecartees.push({ fichier, modele: x.modele, tour: x.tour, case: x.index + 1, raison: x.raison });
    }
    for (const pr of r.planchesRefusees) res.ecartees.push({ fichier: null, modele: pr.modele, tour: pr.tour, case: 0, raison: `planche entière refusée à la découpe : ${pr.raison}` });
    res.refusees = res.ecartees.map((x) => `${x.tour > 1 ? `remplacement ${x.tour - 1}, ` : ""}${x.modele}, ${x.case ? `case ${x.case}` : "planche entière"} : ${x.raison}`);
    // La planche-contact complète : toutes les cases découpées, les écartées marquées.
    const cases: CaseDecoupee[] = [];
    for (const p of planchesRecues) {
      const d = decoupes.get(`${p.tour}:${p.modele}`) ?? [];
      d.forEach((png, index) => {
        const g = r.esquisses.find((e) => e.tour === p.tour && e.modele === p.modele && e.index === index);
        const x = r.refusees.find((e) => e.tour === p.tour && e.modele === p.modele && e.index === index);
        cases.push({ tour: p.tour, modele: p.modele, index, png, ...(g ? { numero: g.numero } : { raison: x?.raison ?? "écartée", ...(x?.enPlus ? { enPlus: true } : {}) }) });
      });
    }
    if (cases.length) ecrireFichier("planche-contact-complete.png", await plancheContactComplete(cases));
    ecrireFichier("esquisses.json", json({ nom: CLIENT.nom, metier, recherche: avant?.recherche ?? 1, compte: res.compte, gardees: res.gardees, ecartees: res.ecartees, reprise: res.reprise }));
    lignes.push(...compteEnTexte(res.compte), "",
      `Esquisses gardées par le relecteur : ${res.gardees.length}${res.reprise ? " (remplacements compris, à la charge du Studio)" : ""} — ${r.contact ? "planche-contact.png" : "aucune planche-contact : moins de 12, rien ne serait montré au client"}`,
      ...res.gardees.map((g) => `Esquisse ${nn(g.numero)} : ${g.fichier} ; piste « ${g.piste} » ; phrase sous le nom : ${g.phrase ? `« ${g.phrase.texte} » (${g.phrase.ok ? "proposable telle quelle" : `jamais proposée telle quelle : ${(g.phrase.raisons ?? []).join(", ")}`})` : "aucune"}`),
      "", `Esquisses écartées (jamais montrées au client) : ${res.ecartees.length} — planche-contact-complete.png`,
      ...(res.ecartees.length ? res.ecartees.map((x) => `- ${x.tour > 1 ? `remplacement ${x.tour - 1}, ` : ""}${x.modele}, ${x.case ? `case ${x.case}` : "planche entière"} : ${x.raison}${x.fichier ? ` (${x.fichier})` : ""}`) : ["- aucune"]),
      "", `Verdict complet du relecteur : ${verdicts.map((v) => `relecture-${v.tour}-verdict.json`).join(", ") || "aucun"}`);
    const refusParLEssai = arretParLEssai(jobId) ?? null;
    const plafondDeLEssai = r.manquees.find((m) => m.plafond && /essai/.test(m.raison));
    if (refusParLEssai) res.arret = `le garde-fou de l'essai a refusé un appel : ${refusParLEssai.message}`;
    else if (plafondDeLEssai) res.arret = `le garde-fou de l'essai a refusé ${plafondDeLEssai.modele} : ${plafondDeLEssai.raison}`;
    else if (r.manquees.some((m) => m.plafond)) res.arret = `un plafond a refusé : ${r.manquees.filter((m) => m.plafond).map((m) => m.modele).join(", ")}`;
    else if (!r.complete) res.arret = `recherche incomplète : moins de ${ESQUISSES_MONTREES} esquisses correctes après ${r.tours} tour(s) de remplacement ; dans le parcours, la tâche s'arrêterait en erreur visible au Studio et rien ne serait montré au client`;
    return ecrire();
  })));
}
