/**
 * L'essai réel des planches de marque (un client inventé, ses logos finis déjà faits) : la partie qui se teste (appels
 * simulés dans les essais). Le script à lancer est scripts/syna-recette/essai-planches.mts, qui l'utilise ; son en-tête
 * dit tout. Il n'appelle que les fonctions du Studio (planche-de-marque.ts, planche-de-marque-tache.ts :
 * `valeursDuClient`, `plancheDeLaRoute`, `vraisAppelsDeLaPlanche`) et s'arrête aux planches relues. Rien n'est relancé.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { PlancheAi } from "../../src/lib/syna-agent/planche-de-marque-tache";
import type { RelectureDeLaPlanche, ValeursDuMetier } from "../../src/lib/syna-agent/planche-de-marque";
import type { NameDomains } from "../../src/lib/syna-agent/brand-domains";
import { clientDeLEssai, euros, ficheDuClient, typeDuProjet, type ClientDeLEssai } from "./client-de-l-essai";

// Le client inventé de l'essai (client-de-l-essai.ts) : aucun client n'est pris par défaut.
export { clientDeLEssai, euros, ficheDuClient };
export type { ClientDeLEssai };

// ---------------------------------------------------------------- le devis, sans aucun appel

export type LigneDuDevis = {
  planche: number | null; appel: string; modele: string;
  quand: "toujours" | "si le contrôle refuse les valeurs" | "si le relecteur refuse la planche" | "toujours (son premier essai, déjà payé, est refusé)";
  charge: "client" | "Studio";
  probableMicro: number; maxMicro: number;
};
export type DevisDeLEssai = {
  planches: number;
  /** Les valeurs du métier déjà écrites (valeurs-du-metier.json du dossier d'essai) : aucun appel. */
  valeursFaites?: boolean;
  /** Les planches reprises à partir de leur premier essai déjà payé (1 = A) : seule la reprise unique part. */
  reprises?: number[];
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

/**
 * Le devis de l'essai pour N planches, appel par appel, avec les fonctions du devis du Studio (aucun appel). `valeursFaites` :
 * les valeurs du métier sont déjà écrites, rien n'est compté pour elles. `reprises` : les planches (1 = A) reprises à
 * partir de leur premier essai déjà payé et refusé ; seules leur reprise unique et sa relecture partent, à la charge du
 * Studio, toujours.
 */
export async function devisDeLEssai(n: number, o: { valeursFaites?: boolean; reprises?: readonly number[] } = {}): Promise<DevisDeLEssai> {
  const { devisDUnAppelDeLaPlanche, devisDesPlanchesDeMarque, PRIX_MESURE_DE_LA_PLANCHE } = await import("../../src/lib/syna-agent/planche-de-marque-tache");
  const { plancheDeMarqueMaxMicro } = await import("../../src/lib/ai/media-providers");
  const { jsonCallMaxMicro } = await import("../../src/lib/ai/llm");
  const { PERMISSION_DE_LA_PLANCHE } = await import("../../src/lib/ai/logo-policy");
  const v = devisDUnAppelDeLaPlanche("valeurs"), r = devisDUnAppelDeLaPlanche("relecture");
  const imageMax = plancheDeMarqueMaxMicro(), imageProbable = Math.round(PRIX_MESURE_DE_LA_PLANCHE * 1_000_000);
  const nomDe = (m: { provider: string; model: string; effort: string }) => `${m.provider}:${m.model}${m.effort ? ` (effort ${m.effort})` : ""}`;
  const image = `openai:${PERMISSION_DE_LA_PLANCHE.model} (xhigh, 1536 × 2304)`;
  const lignes: LigneDuDevis[] = o.valeursFaites ? [] : [
    { planche: null, appel: "valeurs du métier", modele: nomDe(v.modele), quand: "toujours", charge: "client", probableMicro: v.probable, maxMicro: v.max },
    { planche: null, appel: "valeurs réécrites (une fois)", modele: nomDe(v.modele), quand: "si le contrôle refuse les valeurs", charge: "Studio", probableMicro: v.probable, maxMicro: v.max },
  ];
  const reprises = [...new Set(o.reprises ?? [])].filter((k) => k >= 1 && k <= n).sort();
  for (let k = 1; k <= n; k++) {
    if (reprises.includes(k)) {
      const deja = "toujours (son premier essai, déjà payé, est refusé)" as const;
      lignes.push(
        { planche: k, appel: "planche, reprise unique", modele: image, quand: deja, charge: "Studio", probableMicro: imageProbable, maxMicro: imageMax },
        { planche: k, appel: "relecture de la reprise", modele: nomDe(r.modele), quand: deja, charge: "Studio", probableMicro: r.probable, maxMicro: r.max },
      );
      continue;
    }
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
    ...(o.valeursFaites ? { valeursFaites: true } : {}),
    ...(reprises.length ? { reprises } : {}),
    lignes,
    probableMicro: Math.ceil(somme((l) => l.quand.startsWith("toujours"), "probableMicro")),
    probableAvecReprisesMicro: Math.ceil(somme(() => true, "probableMicro")),
    plafondMinimalMicro: Math.ceil(somme(() => true, "maxMicro")),
    devisDuStudio: { maxMicro: d.maxMicro, studioMaxMicro: d.studioMaxMicro, probableMicro: d.probableMicro },
    reparationsMicro: Math.ceil((o.valeursFaites ? 0 : 2 * reparation(v)) + (2 * n - reprises.length) * reparation(r)),
  };
}

/**
 * Le plafond de l'essai est-il assez haut ? Sous le plafond minimal (la somme des maxima, reprises comprises), l'essai
 * pourrait s'arrêter avant la fin : le script refuse de partir. Rend la raison du refus, ou null.
 */
export function refusDuPlafond(plafondEuros: string, d: Pick<DevisDeLEssai, "plafondMinimalMicro">): string | null {
  const plafond = Number(plafondEuros.replace(",", "."));
  if (!Number.isFinite(plafond) || plafond <= 0) return "PLAFOND_ESSAI_EUR manquant ou illisible : rien n'est lancé.";
  const micro = Math.floor(plafond * 1_000_000);
  return micro < d.plafondMinimalMicro ? `Le plafond ${euros(micro)} est sous le plafond minimal ${euros(d.plafondMinimalMicro)} (somme des maxima, reprises à la charge du Studio comprises) : rien n'est lancé.` : null;
}

// ---------------------------------------------------------------- la phrase de chaque logo

/**
 * La phrase que porte un logo fini de l'essai de finalisation (étape 2) : le fichier esquisse-NN-phrase-du-logo.txt, à
 * côté de esquisse-NN-logo-garde.png (vide : aucune ; plusieurs lignes : « / » entre elles). Ses lignes, dans l'ordre,
 * reprises mot pour mot ; `undefined` sans phrase. Un logo nommé comme ceux de l'étape 2 dont le fichier de phrase manque :
 * une erreur (la phrase serait perdue), rien n'est lancé. Un logo nommé autrement : aucune phrase.
 */
export async function phraseDuLogoDeLEssai(fichierDuLogo: string): Promise<{ fichier: string | null; lignes?: string[] }> {
  const { lignesDeLaPhrase } = await import("../../src/lib/syna-agent/planche-de-marque");
  const m = /^(esquisse-\d+)-logo-garde\.png$/i.exec(path.basename(fichierDuLogo));
  if (!m) return { fichier: null };
  const fichier = path.join(path.dirname(fichierDuLogo), `${m[1]}-phrase-du-logo.txt`);
  if (!fs.existsSync(fichier)) throw new Error(`La phrase du logo ${fichierDuLogo} est introuvable (${fichier}, écrit par l'essai de finalisation ; vide s'il n'y a aucune phrase). Rien n'est lancé.`);
  const lignes = lignesDeLaPhrase(fs.readFileSync(fichier, "utf8"));
  return { fichier, ...(lignes ? { lignes } : {}) };
}

/** Le devis en texte, pour le rapport et la console. */
export function devisEnTexte(d: DevisDeLEssai): string[] {
  return [
    `Devis de l'essai pour ${d.planches} planches (fonctions du devis du Studio, aucun appel) :`,
    ...(d.valeursFaites ? ["- les valeurs du métier sont déjà écrites (valeurs-du-metier.json du dossier d'essai) : aucun appel"] : []),
    ...(d.reprises?.length ? [`- reprise à partir du premier essai déjà payé : planche ${d.reprises.map((k) => KEYS[k - 1]).join(", ")} (seule sa reprise unique part, à la charge du Studio)`] : []),
    ...d.lignes.map((x) => `- ${x.planche == null ? "le client" : `planche ${x.planche}`} · ${x.appel} · ${x.modele} · ${x.quand} · charge ${x.charge} · probable ${euros(x.probableMicro)} · au plus ${euros(x.maxMicro)}`),
    `Probable, sans refus : ${euros(d.probableMicro)} (devis du Studio : ${euros(d.devisDuStudio.probableMicro)})`,
    `Probable, si ${d.valeursFaites ? "" : "les valeurs sont réécrites et "}chaque planche refaite une fois : ${euros(d.probableAvecReprisesMicro)}`,
    `Plafond minimal pour aller au bout à coup sûr (somme des maxima, reprises comprises) : ${euros(d.plafondMinimalMicro)}`,
    `  dont plafond du client de la tâche ${euros(d.devisDuStudio.maxMicro)} et borne du Studio ${euros(d.devisDuStudio.studioMaxMicro)} (devisDesPlanchesDeMarque)`,
    `Hors plafond : une réponse de texte mal formée à réparer coûterait au plus ${euros(d.reparationsMicro)} de plus en tout ; la tâche ne la couvre pas (elle s'arrêterait sur sa propre borne).`,
  ];
}

// ---------------------------------------------------------------- l'essai

export type EssaiEcrit = { tour: number; texte?: string; brut?: string; bandes?: string[]; demande?: string; verdict?: RelectureDeLaPlanche; raisons?: string[]; ecartes?: string[]; repris?: string };
/** `erreur` : la planche s'est arrêtée en erreur (jamais relancée) ; les autres planches continuent. */
export type PlancheDeLEssai = { key: string; fichier: string; phrase?: string[]; fichierDeLaPhrase?: string | null; gardee?: boolean; fichierGarde?: string; raison?: string; note?: number; essais: EssaiEcrit[]; notes: string[]; issues: string[]; erreur?: string; signale?: string };

// ---------------------------------------------------------------- reprendre une planche déjà payée

/** Les valeurs du métier déjà écrites dans le dossier d'essai (valeurs-du-metier.json), pour ce client ; null sinon. */
export function valeursDejaEcrites(sortie: string, client: ClientDeLEssai): { ok: true; valeurs: ValeursDuMetier; notes: string[] } | null {
  const f = path.join(sortie, "valeurs-du-metier.json");
  if (!fs.existsSync(f)) return null;
  const v = JSON.parse(fs.readFileSync(f, "utf8")) as { ok?: boolean; valeurs?: ValeursDuMetier; notes?: string[] };
  if (!v.ok || !v.valeurs) return null;
  if (v.valeurs.metier !== client.metier.trim().replace(/[.]+$/, "")) throw new Error(`${f} est celui d'un autre métier (« ${v.valeurs.metier} », pas « ${client.metier} ») : rien n'est lancé.`);
  return { ok: true, valeurs: v.valeurs, notes: v.notes ?? [] };
}

/** Ce qu'il faut pour reprendre une planche à partir de son premier essai déjà payé (fichiers écrits par l'essai). */
export type RepriseDePlanche = { dossier: string; key: string; png: Buffer; fichierPng: string; verdict: RelectureDeLaPlanche; texte: string | null; logoSha: string | null; domaine: { verifie: NameDomains; domaine: string | null; statut: string; mention: string } };
/**
 * Lit, dans `dossier`, le premier essai déjà payé de la planche `key` : planche-X-1-brute.png (ou planche-X-1.png), son
 * verdict (planche-X-1-relecture-verdict.json, forme d'avant comprise), le texte envoyé, l'empreinte du logo joint et le
 * domaine vérifié avant le dessin (domaine.json). Un fichier qui manque : une erreur, rien n'est lancé.
 */
export async function lireLaReprise(dossier: string, key: string): Promise<RepriseDePlanche> {
  const P = await import("../../src/lib/syna-agent/planche-de-marque");
  const f = (n: string) => path.join(dossier, n);
  const fichierPng = [`planche-${key}-1-brute.png`, `planche-${key}-1.png`].map(f).find((x) => fs.existsSync(x));
  if (!fichierPng) throw new Error(`Reprise de la planche ${key} : ni planche-${key}-1-brute.png ni planche-${key}-1.png dans ${dossier}. Rien n'est lancé.`);
  const png = fs.readFileSync(fichierPng);
  if (png[0] !== 137 || png[1] !== 80) throw new Error(`Reprise de la planche ${key} : ${fichierPng} n'est pas un PNG. Rien n'est lancé.`);
  const fv = f(`planche-${key}-1-relecture-verdict.json`);
  if (!fs.existsSync(fv)) throw new Error(`Reprise de la planche ${key} : ${fv} manque (le verdict du premier essai). Rien n'est lancé.`);
  const brut = JSON.parse(fs.readFileSync(fv, "utf8"));
  const verdict = P.VerdictRangeDeLaPlancheSchema.parse(brut.verdict ?? brut) as RelectureDeLaPlanche;
  const fd = f("domaine.json");
  if (!fs.existsSync(fd)) throw new Error(`Reprise de la planche ${key} : ${fd} manque (le domaine vérifié avant le premier dessin). Rien n'est lancé.`);
  const d = JSON.parse(fs.readFileSync(fd, "utf8"));
  const ft = f(`planche-${key}-1-texte-envoye.txt`), fr = f(`planche-${key}-1-recu.json`), fres = f(`planche-${key}-resultat.json`);
  const logoSha: string | null = fs.existsSync(fr) ? (JSON.parse(fs.readFileSync(fr, "utf8")).jointes ?? []).find((j: { role: string }) => j.role === "logo")?.sha256 ?? null
    : fs.existsSync(fres) ? JSON.parse(fs.readFileSync(fres, "utf8")).logo?.sha256 ?? null : null;
  return { dossier, key, png, fichierPng, verdict, texte: fs.existsSync(ft) ? fs.readFileSync(ft, "utf8") : null, logoSha, domaine: { verifie: d.verifie, domaine: d.domaine ?? null, statut: d.statut, mention: d.mention } };
}
// ---------------------------------------------------------------- rejuger une planche déjà payée, sans aucun appel

export type RejugementDePlanche = {
  key: string; tour: number; dossier: string; gardee: boolean; note: number;
  raisons: string[]; ecartes: string[]; finitions: string[];
  /** Les raisons d'avant, telles que l'essai payé les avait écrites. */
  raisonsAvant: string[] | null;
  /** Les fichiers écrits dans le dossier. */
  fichiers: string[];
};

/**
 * REJUGER UNE PLANCHE (REJUGER=<dossier>, REJUGER_PLANCHE=<lettre>), à partir de son image et de son verdict déjà payés,
 * avec le code d'aujourd'hui, SANS AUCUN APPEL (essai réel d'Écume, 26 novembre 2026 : la planche A, reprise à 8/10 et
 * jugée « montrable », refusée pour un seul accent parasite isolé). On lit, dans le dossier de l'essai des planches, le
 * dernier essai de la planche : planche-X-N-brute.png, planche-X-N-relecture-verdict.json, planche-X-N-texte-envoye.txt et
 * planche-X-N-relecture-demande.txt (l'accord pour des personnes y est écrit), avec planche-X-resultat.json (le nom, la
 * phrase, l'année, le domaine, le logo) et valeurs-du-metier.json (la disposition). Un fichier qui manque, un autre client,
 * une année ou un domaine qui ne sont pas ceux écrits dans le texte envoyé : une erreur, rien n'est écrit.
 *
 * Le code recalcule les raisons (`lectureDeLaPlanche`, le texte envoyé comme texte attendu) et écrit
 * planche-X-N-relecture-verdict-rejuge.json (l'original n'est jamais réécrit). Gardée : planche-X-gardee.png (l'image
 * payée, telle quelle), planche-X-resultat.json dit la planche gardée (l'ancien est gardé à côté,
 * planche-X-resultat-avant-rejugement.json), prête pour le choix et pour la planche en vrai ; le rapport reçoit, à la fin,
 * le rejugement et les planches gardées. Refusée : rien n'est changé que le verdict rejugé et le rapport.
 */
export async function rejugerUnePlanche(o: { dossier: string; key: string; client: ClientDeLEssai; tour?: number }): Promise<RejugementDePlanche> {
  const P = await import("../../src/lib/syna-agent/planche-de-marque");
  const key = o.key.trim().toUpperCase();
  if (!(KEYS as readonly string[]).includes(key)) throw new Error(`Planche à rejuger inconnue (« ${o.key} ») : A, B, C ou D. Rien n'est écrit.`);
  const dossier = path.resolve(o.dossier), f = (n: string) => path.join(dossier, n);
  if (!fs.existsSync(dossier)) throw new Error(`Dossier à rejuger introuvable : ${dossier}. Rien n'est écrit.`);
  const tours = fs.readdirSync(dossier).map((n) => new RegExp(`^planche-${key}-(\\d+)-relecture-verdict\\.json$`).exec(n)).filter(Boolean).map((m) => Number(m![1]));
  const tour = o.tour ?? Math.max(0, ...tours);
  if (!tour || !tours.includes(tour)) throw new Error(`Aucun verdict de la planche ${key}${o.tour ? ` (essai ${o.tour})` : ""} dans ${dossier}. Rien n'est écrit.`);
  const lire = (n: string) => { if (!fs.existsSync(f(n))) throw new Error(`Rejugement de la planche ${key} : ${f(n)} manque. Rien n'est écrit.`); return fs.readFileSync(f(n)); };
  const png = lire(`planche-${key}-${tour}-brute.png`);
  if (png[0] !== 137 || png[1] !== 80) throw new Error(`Rejugement de la planche ${key} : planche-${key}-${tour}-brute.png n'est pas un PNG. Rien n'est écrit.`);
  const brut = JSON.parse(lire(`planche-${key}-${tour}-relecture-verdict.json`).toString("utf8"));
  const verdict = P.VerdictRangeDeLaPlancheSchema.parse(brut.verdict ?? brut) as RelectureDeLaPlanche;
  const texte = lire(`planche-${key}-${tour}-texte-envoye.txt`).toString("utf8");
  const demande = lire(`planche-${key}-${tour}-relecture-demande.txt`).toString("utf8");
  const resultat = JSON.parse(lire(`planche-${key}-resultat.json`).toString("utf8"));
  const valeurs = JSON.parse(lire("valeurs-du-metier.json").toString("utf8"));
  const pl = resultat.planche ?? {};
  if (resultat.nom !== o.client.nom) throw new Error(`La planche ${key} de ${dossier} est celle de « ${resultat.nom} », pas de « ${o.client.nom} ». Rien n'est écrit.`);
  const annee = Number(pl.annee), domaine = { domaine: (pl.domaine ?? null) as string | null, statut: pl.statut };
  if (!Number.isInteger(annee) || !["disponible", "a_verifier", "adresse_a_choisir"].includes(domaine.statut)) throw new Error(`planche-${key}-resultat.json ne dit pas l'année et le domaine de la planche. Rien n'est écrit.`);
  // L'année et le domaine sont ceux que le texte payé a demandé d'écrire, lettre pour lettre.
  if (!texte.includes(`« ${P.mentionDuDomaine(domaine as never)} »`) || !texte.includes(`« ${P.copyright(annee, o.client.nom)} »`)) throw new Error(`Le texte envoyé de la planche ${key} ne porte pas « ${P.mentionDuDomaine(domaine as never)} » et « ${P.copyright(annee, o.client.nom)} » : rien n'est écrit.`);
  const phrase: string[] | undefined = Array.isArray(resultat.phrase) && resultat.phrase.length ? resultat.phrase : undefined;
  const personnes = /Le client a donné son accord pour des personnes\./u.test(demande);
  const d = P.laDisposition(valeurs?.valeurs?.metier ?? o.client.metier);
  const attendu = { nom: o.client.nom, annee, domaine: domaine as never, personnes, animaux: d.animaux && d.laquelle === "standard", ...(phrase ? { phrase } : {}), texte };
  const lu = P.lectureDeLaPlanche(verdict, attendu);
  const gardee = !lu.raisons.length;
  const fichiers: string[] = [];
  const ecrire = (n: string, c: string | Buffer) => { fs.writeFileSync(f(n), c); fichiers.push(n); };
  const maintenant = new Date().toISOString();
  ecrire(`planche-${key}-${tour}-relecture-verdict-rejuge.json`, `${JSON.stringify({ verdict, raisons: lu.raisons, ecartes: lu.ecartes, finitions: lu.finitions, gardee, rejuge: maintenant, aucunAppel: true, raisonsAvant: brut.raisons ?? null }, null, 2)}\n`);
  if (gardee) {
    ecrire(`planche-${key}-gardee.png`, png);
    if (!fs.existsSync(f(`planche-${key}-resultat-avant-rejugement.json`))) ecrire(`planche-${key}-resultat-avant-rejugement.json`, `${JSON.stringify(resultat, null, 2)}\n`);
    const m = await sharp(png).metadata();
    const { raison: _raison, ...reste } = pl;
    const notes = [...(resultat.notes ?? []), `planche ${key}, essai ${tour} rejugé sans aucun appel par le code d'aujourd'hui (${maintenant}) : gardée${lu.finitions.length ? ` ; petites finitions notées, sans refus : ${lu.finitions.join(" ; ")}` : ""}`];
    ecrire(`planche-${key}-resultat.json`, `${JSON.stringify({ ...resultat, planche: { ...reste, image: { fichier: `planche-${key}-gardee.png`, w: m.width ?? 1536, h: m.height ?? 2304, rejugee: true }, note: verdict.note, essais: Math.max(Number(pl.essais) || 0, tour), ...(lu.finitions.length ? { finitions: lu.finitions } : {}) }, notes, issues: [] }, null, 2)}\n`);
  }
  // Le compte rendu : le rejugement, puis les planches gardées du dossier, prêtes pour le choix.
  const gardees = KEYS.filter((k) => { try { return !!JSON.parse(fs.readFileSync(f(`planche-${k}-resultat.json`), "utf8")).planche?.image; } catch { return false; } });
  const rapport = fs.existsSync(f("rapport.txt")) ? fs.readFileSync(f("rapport.txt"), "utf8") : "";
  ecrire("rapport.txt", `${rapport.trimEnd()}\n\n${[
    `REJUGEMENT SANS AUCUN APPEL (${maintenant}) — planche ${key}, essai ${tour}, à partir de son image et de son verdict déjà payés, avec le code d'aujourd'hui :`,
    `  Planche ${key} : ${gardee ? `GARDÉE (planche-${key}-gardee.png, note ${verdict.note}/10)` : `toujours NON gardée, jamais montrée (${lu.raisons.join(" ; ")})`}`,
    `  raisons du refus d'avant : ${Array.isArray(brut.raisons) && brut.raisons.length ? brut.raisons.join(" ; ") : "aucune"}`,
    `  raisons du refus aujourd'hui : ${lu.raisons.length ? lu.raisons.join(" ; ") : "aucune"}`,
    ...(lu.finitions.length ? [`  petites finitions notées, sans refus : ${lu.finitions.join(" ; ")}`] : []),
    ...(lu.ecartes.length ? [`  non compté : ${lu.ecartes.join(" ; ")}`] : []),
    `  dépense de ce rejugement : 0 € (aucun appel)`,
    `Planches gardées, prêtes pour le choix : ${gardees.length ? gardees.join(", ") : "aucune"}`,
  ].join("\n")}\n`);
  return { key, tour, dossier, gardee, note: verdict.note, raisons: lu.raisons, ecartes: lu.ecartes, finitions: lu.finitions, raisonsAvant: Array.isArray(brut.raisons) ? brut.raisons : null, fichiers };
}

export type LigneDeDepense = { cle: string | null; task: string | null; modele: string | null; studio: boolean; reserveMicro: number; reelMicro: number | null; statut: string; appel?: Record<string, unknown> };
export type ResultatDesPlanches = {
  arret?: string; client: ClientDeLEssai; fiche: string;
  /** Les planches arrêtées en erreur (les autres ont continué). */
  erreurs?: string[];
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
export async function essaiDesPlanches(o: { sortie: string; plafondEuros: string; logos: string[]; client: ClientDeLEssai; ai?: (q: Qui) => PlancheAi; reprendre?: Partial<Record<string, string>> }): Promise<ResultatDesPlanches> {
  const plafond = Number(o.plafondEuros.replace(",", "."));
  if (!Number.isFinite(plafond) || plafond <= 0) throw new Error("PLAFOND_ESSAI_EUR manquant ou illisible : rien n'est lancé.");
  if (o.logos.length < 2 || o.logos.length > 4) throw new Error(`Il faut de 2 à 4 logos finis, pas ${o.logos.length} : rien n'est lancé.`);
  const logos = await Promise.all(o.logos.map(async (f, i) => {
    if (!fs.existsSync(f)) throw new Error(`Logo fini introuvable : ${f}. Rien n'est lancé.`);
    const png = fs.readFileSync(f);
    if (png[0] !== 137 || png[1] !== 80) throw new Error(`Le logo ${f} n'est pas un PNG : rien n'est lancé.`);
    // La phrase choisie sous ce logo (étape 2), reprise mot pour mot sur sa planche.
    const ph = await phraseDuLogoDeLEssai(f);
    return { key: KEYS[i], fichier: f, png, phrase: ph.lignes, fichierDeLaPhrase: ph.fichier };
  }));
  const client = o.client;
  // Les valeurs déjà écrites et les planches à reprendre : tout est lu et vérifié AVANT le premier appel.
  const dejaEcrites = valeursDejaEcrites(o.sortie, client);
  const aReprendre = await Promise.all(Object.entries(o.reprendre ?? {}).filter(([, d]) => d).map(([k, d]) => lireLaReprise(path.resolve(d!), k)));
  for (const r of aReprendre) {
    const l = logos.find((x) => x.key === r.key);
    if (!l) throw new Error(`Reprise de la planche ${r.key} : aucun logo ${r.key} donné. Rien n'est lancé.`);
    if (!dejaEcrites) throw new Error(`Reprise de la planche ${r.key} : les valeurs du métier de son premier essai (valeurs-du-metier.json) manquent dans ${o.sortie}. Rien n'est lancé.`);
    const sha = crypto.createHash("sha256").update(l.png).digest("hex");
    if (r.logoSha && r.logoSha !== sha) throw new Error(`Reprise de la planche ${r.key} : le logo donné (${sha.slice(0, 12)}…) n'est pas celui de son premier essai (${r.logoSha.slice(0, 12)}…). Rien n'est lancé.`);
  }
  if (aReprendre.length > 1 && new Set(aReprendre.map((r) => JSON.stringify(r.domaine.verifie))).size > 1) throw new Error("Les planches reprises n'ont pas été dessinées avec le même domaine vérifié : rien n'est lancé.");
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

  const devis = await devisDeLEssai(logos.length, { valeursFaites: !!dejaEcrites, reprises: aReprendre.map((r) => KEYS.indexOf(r.key as never) + 1) });
  // 1. Le client inventé et son projet.
  const u = await account();
  const projectId = project(u, typeDuProjet(client)) as string;
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

  // Toute erreur d'un appel (panne, plafond) est gardée : la tâche du Studio la transforme en planche non montrée, jamais
  // relancée. Chaque planche est indépendante (essai réel d'Écume, 25 novembre 2026 : l'échec de A avait empêché B) : seul
  // le garde-fou de l'essai arrête tout.
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
    relire: async (bandes, logo, disposition, demande, cle, avecPhrase) => {
      const { key, tour } = cleDe(cle);
      const e = essaiDe(key, tour);
      e.bandes = bandes.map((b, i) => ecrireFichier(`planche-${key}-${tour}-bande-${i + 1}.png`, b));
      e.demande = ecrireFichier(`planche-${key}-${tour}-relecture-demande.txt`, `${P.RELECTEUR_DE_LA_PLANCHE}\n\n--- demande ---\n${demande}\n\n--- images jointes : ${bandes.map((_b, i) => `bande ${i + 1}`).join(", ")}, logo, disposition (réduite à 768 px par les vrais appels) ---\n`);
      const v = await garder(() => (avecPhrase ? brut.relire(bandes, logo, disposition, demande, cle, true) : brut.relire(bandes, logo, disposition, demande, cle)));
      e.verdict = v;
      if (res.domaine && res.valeurs?.ok) {
        const d = P.laDisposition(res.valeurs.valeurs.metier);
        const phrase = logos.find((l) => l.key === key)?.phrase;
        const lu = P.lectureDeLaPlanche(v, { nom: client.nom, annee, domaine: { domaine: res.domaine.domaine, statut: res.domaine.statut as never }, personnes, animaux: d.animaux && d.laquelle === "standard", ...(phrase ? { phrase } : {}) });
        e.raisons = lu.raisons; e.ecartes = lu.ecartes;
      }
      ecrireFichier(`planche-${key}-${tour}-relecture-verdict.json`, json({ verdict: v, raisons: e.raisons ?? null, ecartes: e.ecartes ?? [], gardee: e.raisons ? !e.raisons.length : null }));
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
  // Les valeurs déjà écrites : le point de reprise du Studio, jamais repayé. Le domaine d'une planche reprise : celui de
  // son premier dessin (même nom : les autres planches le reprennent aussi, comme une tâche relancée du Studio).
  if (dejaEcrites) reprises.set(T.clesDeLaPlanche.valeurs(client.nom), dejaEcrites);
  if (aReprendre[0]) {
    const d = aReprendre[0].domaine;
    reprises.set(T.clesDeLaPlanche.domaine(client.nom), d.verifie);
    res.domaine = { verifie: d.verifie, domaine: d.domaine, statut: d.statut, mention: d.mention };
    ecrireFichier("domaine.json", json({ nom: client.nom, descripteur: client.descripteur ?? null, ...res.domaine, caseSousLaPlanche: P.caseDuDomaine({ domaine: d.domaine, statut: d.statut as never }), repris: aReprendre[0].dossier }));
  }
  // L'erreur d'une planche, signalée au Studio : gardée pour le rapport.
  const signalementAvant = T.signalement.auStudio;
  T.signalement.auStudio = (s) => { const p = res.planches.find((x) => x.key === s.key); if (p) p.signale = s.message; };

  const lignes: string[] = [
    `Essai des planches de marque — client « ${client.nom} » (${client.metier}), type « ${client.kind} »`,
    `Produits ou prestations de sa fiche : ${client.produits.join(" ; ")}`,
    `Plafond de l'essai : ${euros(Math.floor(plafond * 1_000_000))}`,
    `Personnes permises : ${personnes ? "oui" : "non (aucune photo de personne ni accord)"}`,
    `Logos finis : ${logos.map((l) => `${l.key} (${l.fichier})`).join(", ")}`,
    ...logos.map((l) => `Phrase sous le logo ${l.key} : ${l.phrase ? `${l.phrase.map((x) => `« ${x} »`).join(" puis ")}, reprise mot pour mot sur la planche` : "aucune"}${l.fichierDeLaPhrase ? ` (${l.fichierDeLaPhrase})` : " (aucun fichier de phrase à côté du logo)"}`),
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
      if (p.erreur) lignes.push(`  ERREUR (planche arrêtée, jamais relancée ; les autres planches ont continué) : ${p.erreur}${p.signale ? " — signalée au Studio" : ""}`);
      for (const e of p.essais) {
        lignes.push(`  essai ${e.tour}${e.tour === 2 ? " (reprise à la charge du Studio)" : ""}${e.repris ? ` (déjà payé, repris de ${e.repris} : aucun appel ; raisons recalculées par le code)` : ""} : texte ${e.texte ?? "—"} ; planche brute ${e.brut ?? "—"} ; bandes ${e.bandes?.join(", ") ?? "—"}`);
        if (e.verdict) lignes.push(`    verdict : note ${e.verdict.note}/10, nom lu « ${e.verdict.nomLu} », copyright lu « ${e.verdict.copyrightLu} », domaine lu « ${e.verdict.domaineLu} », logo fidèle ${e.verdict.logoFidele ? "oui" : "non"} — ${e.verdict.pourquoi}`, `    raisons du refus : ${e.raisons?.length ? e.raisons.join(" ; ") : "aucune"}`, ...(e.ecartes?.length ? [`    non compté : ${e.ecartes.join(" ; ")}`] : []));
      }
      for (const n of p.notes) lignes.push(`  note : ${n}`);
      for (const n of p.issues) lignes.push(`  SINA dirait : ${n}`);
    }
    lignes.push("", "Dépense réelle comptée par le Studio, appel par appel (réservé au plus → réglé) :",
      ...(res.appels.length ? res.appels.map((a) => `- ${a.cle ?? a.task ?? "?"} · ${a.modele ?? "?"} · ${a.studio ? "charge du Studio" : "charge du client"} · réservé ${euros(a.reserveMicro)} → réglé ${a.reelMicro == null ? "—" : euros(a.reelMicro)} (${a.statut})${a.appel ? ` · jetons ${a.appel.jetonsEntree} en entrée, ${a.appel.jetonsSortie} en sortie` : ""}`) : ["- aucun appel"]),
      "", `Dépense réelle comptée par le Studio : ${euros(res.depenseMicro)}`, "Détail complet : depense.json (appel par appel), usage.json (jetons, qualité, taille, fond, format renvoyés).");
    if (res.erreurs?.length) lignes.push("", ...res.erreurs.map((x) => `PLANCHE EN ERREUR : ${x}`));
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
        if (!dejaEcrites) ecrireFichier("valeurs-du-metier.json", json(res.valeurs));
        else res.valeurs = { ...res.valeurs, notes: [...res.valeurs.notes, "valeurs reprises de valeurs-du-metier.json (déjà écrites et payées), aucun appel"] };
      } catch (e) { res.arret = raisonDeLArret(e, "valeurs du métier"); return ecrire(); }
      if (res.valeurs.ok) {
        const d = P.laDisposition(res.valeurs.valeurs.metier);
        res.disposition = `${d.laquelle}${d.animaux ? " (métier proche des animaux)" : ""}`;
        ecrireFichier(`disposition-${d.laquelle}.png`, d.png);
      }
      // 4. Chaque logo, dans l'ordre : sa planche (domaine vérifié avant le dessin), sa relecture, sa reprise unique.
      for (const l of logos) {
        const p: PlancheDeLEssai = { key: l.key, fichier: l.fichier, ...(l.phrase ? { phrase: l.phrase } : {}), fichierDeLaPhrase: l.fichierDeLaPhrase, essais: [], notes: [], issues: [] };
        res.planches.push(p);
        erreur = null;
        ecrireFichier(`planche-${l.key}-logo-recu.png`, l.png);
        const a = await saveAsset({ userId: u.id, projectId, data: l.png, name: `logo-fini-${l.key}.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "ready" });
        const route = { key: l.key, name: client.nom, board: { descriptor: client.descripteur ?? null } };
        // Une planche reprise : son premier essai déjà payé (l'image et le verdict) devient le point de reprise du Studio ;
        // le code corrigé recalcule ses raisons, et seule la reprise unique part, à la charge du Studio.
        const rep = aReprendre.find((x) => x.key === l.key);
        if (rep && res.valeurs.ok && res.domaine) {
          const dp = { domaine: res.domaine.domaine, statut: res.domaine.statut as never };
          const texte1 = P.texteDeLaPlanche({ nom: client.nom, valeurs: res.valeurs.valeurs, annee, domaine: dp, personnes, ...(l.phrase ? { phrase: l.phrase } : {}) });
          if (rep.texte != null && rep.texte !== texte1) { p.erreur = `le texte du premier essai repris (${rep.dossier}) n'est pas celui que le Studio enverrait aujourd'hui avec ces valeurs, ce domaine et cette année : rien n'est repris`; (res.erreurs ??= []).push(`planche ${l.key} : ${p.erreur}`); continue; }
          const m = await sharp(rep.png).metadata();
          const im = await saveAsset({ userId: u.id, projectId, data: rep.png, name: `planche-de-marque-${l.key}-1.png`, mime: "image/png", role: "planche-refusee", origin: "generated", status: "ready", meta: { plancheDeMarque: { key: l.key, tour: 1, nom: client.nom, texteEnvoye: texte1, recu: null, repris: rep.fichierPng, verdict: rep.verdict } } as never });
          reprises.set(T.clesDeLaPlanche.image(1, l.key, 1), { id: im.id, w: m.width ?? 1536, h: m.height ?? 2304 });
          reprises.set(T.clesDeLaPlanche.relecture(1, l.key, 1), rep.verdict);
          const d = P.laDisposition(res.valeurs.valeurs.metier);
          const lu = P.lectureDeLaPlanche(rep.verdict, { nom: client.nom, annee, domaine: dp, personnes, animaux: d.animaux && d.laquelle === "standard", ...(l.phrase ? { phrase: l.phrase } : {}) });
          const brutLocal = path.resolve(rep.fichierPng) === path.resolve(o.sortie, `planche-${l.key}-1-brute.png`) ? `planche-${l.key}-1-brute.png` : ecrireFichier(`planche-${l.key}-1-brute.png`, rep.png);
          if (rep.texte == null) ecrireFichier(`planche-${l.key}-1-texte-envoye.txt`, texte1);
          p.essais.push({ tour: 1, texte: `planche-${l.key}-1-texte-envoye.txt`, brut: brutLocal, verdict: rep.verdict, raisons: lu.raisons, ecartes: lu.ecartes, repris: rep.dossier });
          ecrireFichier(`planche-${l.key}-1-relecture-verdict-recalcule.json`, json({ verdict: rep.verdict, raisons: lu.raisons, ecartes: lu.ecartes, gardee: !lu.raisons.length, repris: rep.dossier }));
        }
        try {
          const r = await T.plancheDeLaRoute({ ctx, ai, who: { userId: u.id, projectId }, route: route as never, round: 1, valeurs: res.valeurs, logoAssetId: a.id, personnes, ...(l.phrase ? { phrase: l.phrase } : {}) });
          const pl = r.route.board.planche;
          p.notes = r.notes; p.issues = r.issues;
          p.gardee = !!pl?.image; p.note = pl?.note;
          if (pl?.image) { const dernier = p.essais.at(-1); if (dernier?.brut) p.fichierGarde = ecrireFichier(`planche-${l.key}-gardee.png`, fs.readFileSync(path.join(o.sortie, dernier.brut))); }
          else p.raison = typeof pl?.raison === "string" ? pl.raison : "non faite";
          ecrireFichier(`planche-${l.key}-resultat.json`, json({ nom: client.nom, disposition: P.laDisposition(res.valeurs?.ok ? res.valeurs.valeurs.metier : client.metier).laquelle, logo: { fichier: l.fichier, sha256: crypto.createHash("sha256").update(l.png).digest("hex") }, phrase: l.phrase ?? null, planche: pl ?? null, notes: r.notes, issues: r.issues }));
        } catch (e) { erreur ??= e; p.gardee = false; p.raison = "arrêtée en erreur"; }
        const parLEssai = arretParLEssai(jobId);
        if (parLEssai) { res.arret = raisonDeLArret(parLEssai, `planche ${l.key}`); break; }
        if (erreur instanceof PlafondDeLEssaiAtteint) { res.arret = raisonDeLArret(erreur, `planche ${l.key}`); break; }
        // Une autre erreur (panne, texte refusé avant l'envoi, plafond de la tâche) : cette planche seule s'arrête.
        if (erreur) { p.erreur = raisonDeLArret(erreur, `planche ${l.key}`); (res.erreurs ??= []).push(`planche ${l.key} : ${p.erreur}`); }
      }
      const parLEssai = arretParLEssai(jobId);
      if (parLEssai && !res.arret) res.arret = raisonDeLArret(parLEssai, "fin de l'essai");
      return ecrire();
    })));
  } finally { T.plancheDeps.domaines = domainesAvant; T.signalement.auStudio = signalementAvant; }
}
