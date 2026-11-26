/**
 * LA PLANCHE DE MARQUE DANS LA TÂCHE DE FOND (accord écrit du propriétaire du 24 novembre 2026, voir planche-de-marque.ts) :
 * pour chaque logo choisi, une planche entière faite par OpenAI à partir du logo fini et de la disposition, relue, avec
 * une reprise au plus à la charge du Studio. Elle remplace, pour les nouveaux projets, les images des planches proposées
 * (la grande scène et le haut du site). Chaque appel payant a son point de reprise : une relance de la tâche ne repaie rien.
 * Les anciens projets et la marque finie gardent l'ancien code.
 *
 * Le devis (`devisDesPlanchesDeMarque`) entre dans l'accord unique de l'étape « La marque » (tools/identity.ts).
 */
import { z } from "zod";
import sharp from "sharp";
import { L } from "../i18n-server";
import { callCostBoundMicro, estimateCallMicro, llmJson } from "../ai/llm";
import { aLaChargeDuStudio, EUR } from "../billing";
import { aiPlancheDeMarque, plancheDeMarqueMaxMicro, recuDeLaPlanche, type RecuDeLaPlanche } from "../ai/media-providers";
import { CostCapReached, withTrace } from "../ai/trace";
import { borneDuStudio } from "../ai/borne-du-studio";
import { assetData, getAsset, saveAsset } from "../library";
import { DEFAULT_MODELS } from "./models";
import { findDomains, type NameDomains } from "./brand-domains";
import type { Route } from "./brand-routes";
import {
  DISPOSITION, RELECTEUR_DE_LA_PLANCHE, RelectureAvecPhraseSchema, RelectureDeLaPlancheSchema, VALEURS_SYSTEM, ValeursEcritesSchema, dessinerLaPlanche, domaineDeLaPlanche,
  ecrireLesValeurs, laDisposition, lignesDeLaPhrase, phraseDeLaPlancheNonMontree, type RelectureDeLaPlanche, type ValeursDuMetier, type ValeursEcrites,
} from "./planche-de-marque";

// ---------------------------------------------------------------- le devis et les deux plafonds

/** Les appels de texte de la planche, en jetons (entrée habituelle, sortie habituelle, limite de sortie), et leur effort. */
const APPELS = {
  // Les valeurs du métier : la fiche du client et le métier, une réponse courte. Le modèle le plus fort, effort moyen.
  valeurs: { input: 3_000, output: 1_500, max: 6_000, effort: "medium" },
  // Le relecteur : quatre bandes de 1 536 × 624, le logo, la disposition réduite, le texte envoyé. Effort élevé.
  relecture: { input: 9_000, output: 2_500, max: 10_000, effort: "high" },
} as const;
const modeleDe = (a: keyof typeof APPELS) => ({ ...DEFAULT_MODELS.strong, effort: APPELS[a].effort });
/**
 * Le devis d'UN appel de texte de la planche (aucun appel) : son maximum (celui que réserve le garde-fou), son coût
 * habituel, son modèle et ses jetons. Lu aussi par le script de l'essai réel (scripts/syna-recette/essai-planches-outil.ts).
 */
export function devisDUnAppelDeLaPlanche(a: keyof typeof APPELS): { max: number; probable: number; modele: ReturnType<typeof modeleDe>; jetons: (typeof APPELS)[typeof a] } {
  const c = APPELS[a], m = modeleDe(a);
  const usual = estimateCallMicro(m.provider, m.model, c.input, c.output) ?? 0;
  return { max: callCostBoundMicro(m.provider, m.model, c.input * 1.5, c.max, m.effort) ?? usual * 4, probable: usual, modele: m, jetons: c };
}
const appel = devisDUnAppelDeLaPlanche;
/** Prix mesuré d'une planche (euros) : 0,1241 € (Tenon et Racine en xhigh, 24 novembre 2026, 3 057 + 1 096 jetons en entrée, 3 811 en sortie). */
export const PRIX_MESURE_DE_LA_PLANCHE = 0.1241;

export type DevisDesPlanches = { maxMicro: number; probableMicro: number; repriseMicro: number; repriseProbableMicro: number; studioMaxMicro: number };
/**
 * N planches de marque : les valeurs du métier (un appel par client), puis par planche l'image et sa relecture. La borne du
 * Studio compte UNE reprise par planche (image et relecture) et UNE réécriture des valeurs.
 */
export function devisDesPlanchesDeMarque(n: number): DevisDesPlanches {
  const v = appel("valeurs"), r = appel("relecture"), image = plancheDeMarqueMaxMicro();
  const une = image + r.max, uneProbable = Math.round(PRIX_MESURE_DE_LA_PLANCHE * EUR) + r.probable;
  const maxMicro = Math.ceil(v.max + une * n);
  const repriseMicro = Math.ceil(v.max + une * n), repriseProbableMicro = Math.ceil(v.probable + uneProbable * n);
  return { maxMicro, probableMicro: Math.ceil(v.probable + uneProbable * n), repriseMicro, repriseProbableMicro, studioMaxMicro: borneDuStudio(maxMicro, false, repriseMicro, 1) };
}

// ---------------------------------------------------------------- les appels réels

export type PlancheAi = {
  valeurs: (demande: string, tour: number) => Promise<ValeursEcrites>;
  dessiner: (logo: { assetId: string; data: Buffer }, disposition: { nom: string; data: Buffer }, texte: string, cle: string) => Promise<{ png: Buffer; recu: RecuDeLaPlanche | null }>;
  /** `avecPhrase` : le client a choisi une phrase sous le logo ; la réponse porte en plus `phrasesLues`. */
  relire: (bandes: Buffer[], logo: Buffer, disposition: Buffer, demande: string, cle: string, avecPhrase?: boolean) => Promise<RelectureDeLaPlanche>;
};
/** Remplaçables par les essais : aucun appel payant, aucune vérification réseau, une horloge fixe. */
export const plancheDeps: { ai?: (jobId: string) => PlancheAi; domaines?: (nom: string, descriptor?: string | null) => Promise<NameDomains>; annee?: () => number } = {};
export const anneeEnCours = (): number => plancheDeps.annee?.() ?? new Date().getFullYear();
export const verifierLesDomaines = (nom: string, descriptor?: string | null): Promise<NameDomains> => (plancheDeps.domaines ?? findDomains)(nom, descriptor);

/** Les vrais appels : le modèle de texte le plus fort (valeurs : effort moyen ; relecture : effort élevé), l'image par logo-policy.ts. */
export function vraisAppelsDeLaPlanche(o: { userId: string; projectId: string; jobId: string }): PlancheAi {
  const scope = (step: string) => ({ jobId: o.jobId, projectId: o.projectId, step });
  const texte = <S extends z.ZodType>(cle: string, a: keyof typeof APPELS, system: string, prompt: string, schema: S, images?: { data: Buffer; label?: string }[]) => {
    const m = modeleDe(a);
    return withTrace(scope(`planche-${cle}`), () => llmJson({
      task: a === "valeurs" ? "strategy" : "quality_control", userId: o.userId, projectId: o.projectId, jobId: o.jobId, system, prompt, ...(images?.length ? { images } : {}),
      promptKey: `syna-planche-${a}-1`, maxTokens: APPELS[a].max, maxOutputTokens: APPELS[a].max, usageKey: `${o.jobId}:planche:${cle}`, nouvelleSiChangee: true,
      routing: { difficulty: "complex", prefer: { provider: m.provider as "anthropic" | "openai", model: m.model, effort: m.effort } },
    }, schema)) as Promise<z.infer<S>>;
  };
  return {
    valeurs: (demande, tour) => texte(`valeurs-${tour}`, "valeurs", VALEURS_SYSTEM, demande, ValeursEcritesSchema),
    dessiner: async (logo, disposition, t, cle) => {
      const png = await withTrace(scope(`planche-${cle}`), () => aiPlancheDeMarque({ userId: o.userId, projectId: o.projectId, jobId: o.jobId, usageKey: `${o.jobId}:planche:${cle}` }, { logo, disposition, prompt: t }));
      return { png, recu: recuDeLaPlanche(png) };
    },
    relire: async (bandes, logo, disposition, demande, cle, avecPhrase) => {
      const petite = await sharp(disposition).resize(768, 768, { fit: "inside" }).png().toBuffer();
      // Sans phrase choisie sous le logo, la réponse demandée est exactement celle d'avant.
      return texte(cle, "relecture", RELECTEUR_DE_LA_PLANCHE, demande, avecPhrase ? RelectureAvecPhraseSchema : RelectureDeLaPlancheSchema, [...bandes.map((data, i) => ({ data, label: `bande ${i + 1}` })), { data: logo, label: "logo" }, { data: petite, label: "disposition" }]);
    },
  };
}

// ---------------------------------------------------------------- les temps de la tâche

/**
 * L'ERREUR D'UNE PLANCHE, VISIBLE AU STUDIO (25 novembre 2026) : écrite au journal des erreurs et envoyée en notification
 * aux administrateurs, jamais au client. Remplaçable par les essais. Ne fait jamais échouer la tâche.
 */
export const signalement: { auStudio?: (o: { userId: string; projectId: string; key: string; nom: string; message: string }) => void | Promise<void> } = {};
export async function signalerAuStudio(o: { userId: string; projectId: string; key: string; nom: string; message: string; e: unknown }): Promise<void> {
  try {
    if (signalement.auStudio) return await signalement.auStudio(o);
    const { logError } = await import("../db");
    const { notifyAdmins } = await import("../payments");
    logError("planche-de-marque", o.e, { userId: o.userId, projectId: o.projectId, details: { identite: o.key, nom: o.nom } });
    notifyAdmins(`Planche de marque ${o.key} « ${o.nom} » en erreur`, `La planche ${o.key} du projet ${o.projectId} s'est arrêtée en erreur, rien n'est relancé tout seul et elle n'est pas montrée au client ; les autres planches continuent. Erreur : ${o.message}`);
  } catch { /* le signalement ne fait jamais échouer la tâche */ }
}

type Etape = { step: <T>(key: string, fn: () => Promise<T>) => Promise<T> };
const norm = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
/**
 * Les points de reprise de la planche : un appel payé est rangé sous sa clé et jamais repayé par une relance de la tâche.
 * Lus aussi par le script d'essai, qui reprend une planche à partir de son premier essai déjà payé.
 */
export const clesDeLaPlanche = {
  valeurs: (nom: string) => `brand:planche:valeurs:${norm(nom)}`,
  domaine: (nom: string, pass = "") => `brand:planche:domaine:${norm(nom)}${pass}`,
  image: (round: number, key: string, tour: number, pass = "") => `brand:planche:image:${round}:${key}:${tour}${pass}`,
  relecture: (round: number, key: string, tour: number, pass = "") => `brand:planche:relecture:${round}:${key}:${tour}${pass}`,
};

/** Les valeurs du métier, UNE fois par client (point de reprise : jamais repayées). */
export async function valeursDuClient(ctx: Etape, ai: PlancheAi, o: { nom: string; metier: string; fiche: string; personnes: boolean; kind: "produits" | "services" }) {
  return ctx.step(clesDeLaPlanche.valeurs(o.nom), () => ecrireLesValeurs({ ecrire: (d, tour) => ai.valeurs(d, tour), aLaChargeDuStudio: (fn) => aLaChargeDuStudio(fn) }, o));
}

/**
 * La planche de marque d'une identité : le domaine vérifié AVANT le dessin, la disposition, le logo fini en première
 * image ; dessinée et relue ; une reprise au plus, à la charge du Studio. Refusée deux fois, ou en panne : la planche
 * n'est pas montrée (`board.planche` sans image) et SINA propose de la finir à sa charge. Rend la route mise à jour.
 * `phrase` : la phrase choisie par le client sous ce logo, toutes ses lignes dans l'ordre (`phraseDuLogoFini`) ; elle est
 * reprise mot pour mot sur la planche et relue lettre pour lettre. Absente : rien ne change.
 */
export async function plancheDeLaRoute(o: {
  ctx: Etape; ai: PlancheAi; who: { userId: string; projectId: string }; route: Route; round: number;
  valeurs: { ok: true; valeurs: ValeursDuMetier } | { ok: false; raison: string }; logoAssetId: string; personnes: boolean; pass?: string;
  phrase?: readonly string[] | null;
}): Promise<{ route: Route; issues: string[]; notes: string[] }> {
  const { ctx, ai, route: x } = o, key = x.key, notes: string[] = [], issues: string[] = [], pass = o.pass ?? "";
  const annee = anneeEnCours();
  const phrase = lignesDeLaPhrase(o.phrase);
  const d = await ctx.step(clesDeLaPlanche.domaine(x.name, pass), () => verifierLesDomaines(x.name, x.board.descriptor));
  const dom = domaineDeLaPlanche(d, x.name);
  const base = { logo: o.logoAssetId, domaine: dom.domaine, statut: dom.statut, annee, ...(phrase ? { phrase } : {}), at: Date.now() };
  const avec = (planche: NonNullable<Route["board"]["planche"]>): Route => ({ ...x, board: { ...x.board, domains: d, planche } });
  if (!o.valeurs.ok) {
    issues.push(phraseDeLaPlancheNonMontree(x.name, key));
    return { route: avec({ ...base, essais: 0, raison: L(`les mots de la planche n'ont pas pu être écrits sans rien inventer (${o.valeurs.raison})`, "the board's words could not be written without inventing anything") }), issues, notes };
  }
  const valeurs = o.valeurs.valeurs;
  const la = getAsset(o.logoAssetId);
  if (!la || la.deleted_at) {
    issues.push(phraseDeLaPlancheNonMontree(x.name, key));
    return { route: avec({ ...base, essais: 0, raison: L("le logo fini est introuvable", "the finished logo is missing") }), issues, notes };
  }
  const logo = assetData(la), disposition = laDisposition(valeurs.metier);
  if (disposition.animaux && disposition.laquelle === "standard") notes.push(`planche ${key} : métier proche des animaux, disposition standard (l'emplacement des métiers des animaux est vide) ; le relecteur refuse toute copie`);
  const ranger = async (png: Buffer, tour: number, gardee: boolean, texte: string, recu: RecuDeLaPlanche | null, verdict?: RelectureDeLaPlanche) => {
    const m = await sharp(png).metadata();
    const a = await saveAsset({ ...o.who, data: png, name: `planche-de-marque-${key}-${tour}.png`, mime: "image/png", role: gardee ? "brand-board" : "planche-refusee", origin: "generated", status: "ready",
      meta: { plancheDeMarque: { key, tour, nom: x.name, texteEnvoye: texte, recu, disposition: disposition.laquelle, verdict: verdict ?? null }, synaBoard: { key, slot: "planche", round: o.round, name: x.name } } });
    return { id: a.id, w: m.width ?? DISPOSITION.largeur, h: m.height ?? DISPOSITION.hauteur };
  };
  const ids = new Map<number, { id: string; w: number; h: number }>();
  try {
    const r = await dessinerLaPlanche({
      // Point de reprise : l'image payée est rangée tout de suite (jamais repayée par une relance de la tâche).
      dessiner: async (lg, disp, texte, tour) => {
        const im = await ctx.step(clesDeLaPlanche.image(o.round, key, tour, pass), async () => { const r = await ai.dessiner({ assetId: o.logoAssetId, data: lg }, { nom: `disposition:${disposition.laquelle}`, data: disp }, texte, `${key}-${o.round}-${tour}${pass}`); return ranger(r.png, tour, false, texte, r.recu); });
        ids.set(tour, im);
        return assetData(getAsset(im.id)!);
      },
      relire: (bandes, lg, disp, demande, tour, avecPhrase) => ctx.step(clesDeLaPlanche.relecture(o.round, key, tour, pass), () => (avecPhrase ? ai.relire(bandes, lg, disp, demande, `${key}-${o.round}-${tour}${pass}-relecture`, true) : ai.relire(bandes, lg, disp, demande, `${key}-${o.round}-${tour}${pass}-relecture`))),
      aLaChargeDuStudio: (fn) => aLaChargeDuStudio(fn),
    }, { nom: x.name, annee, domaine: dom, personnes: o.personnes, animaux: disposition.animaux && disposition.laquelle === "standard", valeurs, logo, disposition: disposition.png, ...(phrase ? { phrase } : {}) });
    const dernier = r.essais.at(-1)!;
    for (const e of r.essais) if (e.raisons.length) notes.push(`planche ${key}, essai ${e.tour} refusé : ${e.raisons.join(" ; ")}`);
    // Les petites finitions (un signe parasite isolé hors des mots) : notées au compte rendu, jamais une raison de refus.
    for (const e of r.essais) if (e.finitions?.length) notes.push(`planche ${key}, essai ${e.tour} : petites finitions notées, sans refus : ${e.finitions.join(" ; ")}`);
    if (!r.ok) {
      issues.push(phraseDeLaPlancheNonMontree(x.name, key));
      return { route: avec({ ...base, essais: r.essais.length, note: dernier.verdict.note, raison: r.raison }), issues, notes };
    }
    // Gardée : son image devient la planche montrée (le reçu et le verdict restent avec elle).
    const im = ids.get(dernier.tour)!;
    const { run } = await import("../db");
    // Le verdict du relecteur est gardé comme celui de toute image de planche : c'est ce que SINA en dit (sa note, ses mots).
    run("UPDATE assets SET role='brand-board', meta=json_set(COALESCE(meta,'{}'),'$.plancheDeMarque.verdict',json(?),'$.synaBoard.review',json(?)) WHERE id=?", JSON.stringify(dernier.verdict), JSON.stringify({ status: "ready", score: dernier.verdict.note, words: dernier.verdict.pourquoi }), im.id);
    return { route: avec({ ...base, image: im, essais: r.essais.length, note: dernier.verdict.note, ...(dernier.finitions?.length ? { finitions: dernier.finitions } : {}) }), issues, notes };
  } catch (e) {
    if (e instanceof CostCapReached) { issues.push(phraseDeLaPlancheNonMontree(x.name, key)); return { route: avec({ ...base, essais: ids.size, raison: L("le plafond annoncé a été atteint avant la fin de la planche", "the announced cap was reached before the board was finished") }), issues, notes }; }
    // Une panne n'est jamais relancée toute seule : la planche manque, c'est dit. Elle ne retient jamais les autres planches
    // (essai réel d'Écume, 25 novembre 2026 : l'échec de A avait empêché B) : chaque planche est indépendante. L'erreur est
    // visible au Studio, pour le propriétaire (journal des erreurs et notification de l'administration) ; le client ne voit
    // que la phrase de SINA, et jamais la planche.
    const message = String((e as Error)?.message ?? e).slice(0, 400);
    issues.push(phraseDeLaPlancheNonMontree(x.name, key));
    notes.push(`planche ${key} non faite : ${message.slice(0, 160)}`);
    await signalerAuStudio({ ...o.who, key, nom: x.name, message, e });
    return { route: avec({ ...base, essais: ids.size, erreur: true, raison: L(`la planche s'est arrêtée en erreur (${message.slice(0, 160)})`, "the board stopped with an error") }), issues, notes };
  }
}
