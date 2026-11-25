/**
 * LA MÉTHODE DES GRAPHISTES : le parcours entier du logo (24 novembre 2026, plan accepté par le chef d'orchestre ; le
 * propriétaire a dit oui à la construction ; aucune dépense réelle faite pour la construire).
 *
 *   1. le métier (logo-recherche.ts) ; 2. la recherche, deux planches en même temps (logo-recherche.ts) ;
 *   3. la découpe et le contrôle des esquisses (esquisses.ts) ; 4. le choix du client (logo.choisir, EsquissesCards) ;
 *   5. la finalisation et 6. la relecture du logo fini (logo-finalisation.ts) ; 7. le logo d'abord : ses couleurs
 *   (couleurs-du-logo.ts) ; 8. « d'autres pistes » et « un autre logo » (outils, sur son budget, avec une carte) ;
 *   11. le devis et les deux plafonds (ici).
 *
 * Elle remplace entièrement l'ancienne série de logos. LE BRANCHEMENT (point 0, « Oui » du propriétaire le 24 novembre
 * 2026 à « Le client choisit d'abord son nom, puis les logos : tu es d'accord ? ») : la chaîne s'arrête après les noms
 * vérifiés (`jusquAuxNoms`), le client choisit son nom (identity.nom) ou garde le sien, la recherche se fait pour ce nom,
 * il choisit ses esquisses, les logos finis sont relus, puis ses 2, 3 ou 4 identités partagent ce nom, chacune avec son
 * propre logo (`logosGraphistes` de la chaîne). Un seul accord pour toute l'étape (`accordGraphistes`, tools/identity.ts).
 *
 * C'est la seule façon de faire un logo (l'ancienne série est retirée, accord écrit du propriétaire du 24 novembre 2026).
 * Anciens projets : ils gardent leurs planches ; un autre logo, ou un logo qui manque à une planche, passe par logo.pistes
 * puis logo.autre pour cette planche (son nom), à la charge du Studio quand le logo manque.
 */
import { z } from "zod";
import { L } from "../i18n-server";
import { callCostBoundMicro, estimateCallMicro, llmJson } from "../ai/llm";
import { aLaChargeDuStudio } from "../billing";
import { aiLogoFinalise, aiLogoPlanche, logoFinalisationMaxMicro, logoPlancheMaxMicro, recuDuLogo, type RecuDuLogo } from "../ai/media-providers";
import { CostCapReached, withTrace } from "../ai/trace";
import { borneDuStudio } from "../ai/borne-du-studio";
import { LOGO_MODELS } from "../ai/logo-policy";
import { EUR } from "../billing";
import type { PlanId } from "../plans";
import { DEFAULT_MODELS } from "./models";
import { ROUTES_BY_PLAN } from "./brand-routes";
import { METIER_SYSTEM, MetierSchema, controleDuMetier, demandeDuMetier, type Metier } from "./logo-recherche";
import { REMPLACEMENTS_MAX, RELECTEUR_DES_ESQUISSES, RelectureEsquissesSchema, demandeAuRelecteurDesEsquisses, rechercheDesEsquisses, type ResultatDeRecherche } from "./esquisses";
import { DEMANDE_AU_REDACTEUR, RELECTEUR_DU_LOGO_FINI, RelectureDuLogoSchema, TexteDeFinalisationSchema, finaliserUneEsquisse, type Finalisation, type FinalisationDeps, type RelectureDuLogo } from "./logo-finalisation";
import { couleursDuLogo, type PaletteDuLogo } from "./couleurs-du-logo";
import { LIGNES_MAX, PHRASE_MAX, deLignes, lignesDe, lignesDuTexte, type PhraseChoisie, type PhraseDeLEsquisse, type PhraseVoulue } from "./phrase-sous-le-nom";


/** Le nombre d'esquisses que le client peut choisir : celui des identités de son forfait (2, 3 ou 4). */
export const esquissesAChoisir = (plan: PlanId | null | undefined): number => (plan ? ROUTES_BY_PLAN[plan] : ROUTES_BY_PLAN.creer);

// ---------------------------------------------------------------- l'état, dans le parcours du client

/** `phrase` : la petite phrase sous le nom, relevée mot pour mot ; `ok` : proposable telle quelle (orthographe sûre). */
export type EsquisseVue = { numero: number; assetId: string; modele: string; piste: string; tour: number; recherche: number; requestId: string | null; phrase?: PhraseDeLEsquisse };
export type LogoFini = { numero: number; ok: boolean; assetId?: string; detoureAssetId?: string; texte?: string; ideeCentrale?: string; palette?: PaletteDuLogo; raison?: string; essais: number };
export type PlancheGardee = { modele: string; recherche: number; tour: number; assetId?: string; texteEnvoye: string; requestId: string | null; coutMicro: number | null; refusee?: string; manquee?: string };
export type EtatGraphistes = {
  nom: string; metier?: Metier; max: number;
  /** Les esquisses montrées au client (jamais une refusée), numérotées sans trou ; la numérotation continue. */
  esquisses: EsquisseVue[]; refusees: number; contactAssetId?: string; planches: PlancheGardee[];
  /** Les recherches faites (la première, puis chaque « d'autres pistes »). */
  recherches: number;
  choix?: number[]; logos?: LogoFini[]; notes: string[]; at: number;
  /**
   * La part de l'accord unique de l'étape « La marque » réservée aux N finalisations (micro-euros) : présente, le choix
   * du client lance les finalisations sans nouvelle carte. Posée par la chaîne quand le branchement sera fait (point 0).
   */
  finalisationsAccordees?: number;
  /**
   * Une recherche pour UNE planche déjà faite (ancien projet, ou un autre logo une fois les planches faites) : le client
   * choisit une seule esquisse (logo.autre), et le logo fini est posé sur cette planche.
   */
  planche?: string;
  /**
   * La phrase sous le nom choisie par le client pour chaque logo (clé : le numéro de l'esquisse dont le logo est tiré) : la
   * phrase d'une autre esquisse, aucune, ou la sienne mot pour mot. Absente pour un logo : la règle d'avant (une ligne
   * seulement si elle dit le vrai métier, sinon aucune).
   */
  phrases?: Record<string, PhraseChoisie>;
};

/** Ce que le client a dit pour la phrase d'un logo : `logo` (le numéro de son esquisse), puis `de`, `aucune` ou `texte`. */
export const PhraseDuClientSchema = z.object({
  logo: z.number().int().min(1),
  /** La phrase de cette esquisse-là (son numéro) : toutes ses lignes, dans l'ordre. */
  de: z.number().int().min(1).optional(),
  /** Avec `de` : seulement ces lignes-là de sa phrase (numérotées à partir de 1), dans l'ordre de l'esquisse. */
  lignes: z.array(z.number().int().min(1).max(8)).min(1).max(8).optional(),
  /** Aucune phrase sous le nom. */
  aucune: z.literal(true).optional(),
  /** Sa phrase à lui, recopiée mot pour mot depuis son message ; plusieurs lignes : « / » entre elles. */
  texte: z.string().max(PHRASE_MAX * LIGNES_MAX + 3 * LIGNES_MAX).optional(),
}).strict();
export type PhraseDuClient = z.infer<typeof PhraseDuClientSchema>;

/**
 * Les phrases demandées par le client, contrôlées par le code (gratuit). `logos` : les numéros des logos qu'il fait finir ;
 * `motsDuClient` : ses derniers messages, pour vérifier que sa phrase à lui est reprise mot pour mot. Rend les phrases à
 * garder, ou ce qui ne va pas (dit à SINA, jamais une dépense).
 */
export function controleDesPhrases(etat: Pick<EtatGraphistes, "esquisses">, logos: readonly number[], demandes: readonly PhraseDuClient[], motsDuClient: readonly string[]): { ok: true; phrases: Record<string, PhraseChoisie> } | { ok: false; faute: string; interne?: boolean } {
  const phrases: Record<string, PhraseChoisie> = {};
  for (const d of demandes) {
    if (!logos.includes(d.logo)) return { ok: false, faute: L(`Le logo ${d.logo} n'est pas parmi ceux que tu fais finir.`, `Logo ${d.logo} is not among those being finished.`) };
    if ([d.de != null, !!d.aucune, d.texte != null].filter(Boolean).length !== 1) return { ok: false, interne: true, faute: `Pour le logo ${d.logo}, donne une seule chose : de (le numéro de l'esquisse dont il veut la phrase), aucune (sans phrase) ou texte (sa phrase à lui, mot pour mot).` };
    if (phrases[String(d.logo)]) return { ok: false, interne: true, faute: `Une seule phrase pour le logo ${d.logo}.` };
    if (d.aucune) { phrases[String(d.logo)] = { aucune: true }; continue; }
    if (d.de != null) {
      const e = etat.esquisses.find((x) => x.numero === d.de);
      if (!e) return { ok: false, faute: L(`L'esquisse ${d.de} n'a pas été montrée.`, `Sketch ${d.de} was not shown.`) };
      if (!e.phrase) return { ok: false, faute: L(`L'esquisse ${d.de} n'a pas de phrase sous son nom. Tu peux écrire la tienne.`, `Sketch ${d.de} has no line under its name. You can write your own.`) };
      // Une phrase dont l'orthographe n'est pas sûre n'est jamais proposée telle quelle ; il peut toujours écrire la sienne.
      if (!e.phrase.ok) return { ok: false, faute: L(`La phrase de l'esquisse ${d.de} n'est pas proposée telle quelle : son orthographe n'est pas sûre. Tu peux écrire la tienne, je la reprendrai mot pour mot.`, `The line from sketch ${d.de} is not offered as is: its spelling is not certain. You can write your own.`) };
      // Toutes ses lignes, dans l'ordre ; ou seulement celles qu'il garde (`lignes`), dans l'ordre de l'esquisse.
      const toutes = lignesDe(e.phrase);
      if (d.lignes) {
        const hors = d.lignes.filter((k) => k > toutes.length);
        if (hors.length) return { ok: false, faute: L(`La phrase de l'esquisse ${d.de} a ${toutes.length} ligne${toutes.length > 1 ? "s" : ""} : la ligne ${hors.join(", ")} n'existe pas.`, `The line under sketch ${d.de} has ${toutes.length} line(s).`) };
        phrases[String(d.logo)] = { de: d.de, ...deLignes([...new Set(d.lignes)].sort((x, y) => x - y).map((k) => toutes[k - 1])) };
      } else phrases[String(d.logo)] = { de: d.de, ...deLignes(toutes) };
      continue;
    }
    if (d.lignes) return { ok: false, interne: true, faute: `Pour le logo ${d.logo}, lignes ne va qu'avec de (le numéro de l'esquisse dont il garde ces lignes).` };
    // Sa phrase à lui : reprise mot pour mot, jamais réécrite ; plusieurs lignes : « / » entre elles. Elle doit figurer
    // telle quelle dans un de ses messages, le « / » mis à part (chaque ligne, mot pour mot, dans le même message).
    const texte = d.texte!.normalize("NFC").trim();
    const lignes = lignesDuTexte(texte);
    if (!lignes.length || lignes.length > LIGNES_MAX || lignes.some((l) => l.length > PHRASE_MAX)) return { ok: false, interne: true, faute: `Sa phrase pour le logo ${d.logo} tient en ${LIGNES_MAX} lignes au plus (« / » entre elles), chacune en ${PHRASE_MAX} signes au plus.` };
    const absente = lignes.find((l) => !motsDuClient.some((m) => m.normalize("NFC").includes(l)));
    if (absente != null || !motsDuClient.some((m) => lignes.every((l) => m.normalize("NFC").includes(l)))) return { ok: false, interne: true, faute: `La phrase « ${absente ?? texte} » ne figure pas mot pour mot dans ses messages : recopie-la exactement, caractère pour caractère, depuis ce qu'il a écrit (jamais corrigée ni reformulée ; plusieurs lignes : « / » entre elles).` };
    phrases[String(d.logo)] = { sienne: true, ...deLignes(lignes) };
  }
  return { ok: true, phrases };
}

/** Le choix du client, contrôlé par le code. null : bon ; sinon ce qui ne va pas (dit à SINA, jamais une dépense). */
export function controleDuChoix(etat: Pick<EtatGraphistes, "esquisses" | "max">, numeros: readonly number[]): string | null {
  const uniques = [...new Set(numeros)];
  if (!uniques.length) return L("Choisis au moins une esquisse.", "Choose at least one sketch.");
  const connus = new Set(etat.esquisses.map((e) => e.numero));
  const inconnus = uniques.filter((n) => !connus.has(n));
  if (inconnus.length) return L(`Esquisse ${inconnus.map((n) => `n°${n}`).join(", ")} inconnue : elle n'a pas été montrée (une esquisse refusée n'est jamais montrée).`, `Unknown sketch ${inconnus.join(", ")}.`);
  // Une proposition de marque compte au moins deux identités (forfaits validés : 2, 3 et 4 identités proposées).
  if (uniques.length < Math.min(2, etat.esquisses.length)) return L("Choisis au moins deux esquisses : chacune devient une identité de ta marque.", "Choose at least two sketches.");
  if (uniques.length > etat.max) return L(`Ton forfait permet ${etat.max} esquisses au plus ; tu en as choisi ${uniques.length}.`, `Your plan allows ${etat.max} sketches at most.`);
  return null;
}

export { messageDuChoix } from "./choix-esquisses";

// ---------------------------------------------------------------- le devis et les deux plafonds

/** Les appels de texte du parcours, en jetons (entrée habituelle, sortie habituelle, limite de sortie). */
const APPELS = {
  // Le métier : une phrase, une piste.
  metier: { input: 1_500, output: 1_200, max: 6_000, modele: "strong" as const, effort: "low" },
  // Le relecteur des esquisses : jusqu'à 12 esquisses de 512 px (environ 350 jetons chacune), un avis court par esquisse.
  esquisses: { input: 6_000, output: 3_500, max: 12_000, modele: "strong" as const, effort: "medium" },
  // Le rédacteur du texte de finalisation (GPT-6.2 Astra) : mesuré 638 jetons en entrée, 298 en sortie (Reflet).
  redaction: { input: 1_200, output: 600, max: 6_000, modele: "astra" as const, effort: "medium" },
  // Le relecteur du logo fini : deux images, le texte envoyé.
  logo: { input: 3_500, output: 1_500, max: 10_000, modele: "strong" as const, effort: "high" },
};
type Modele = { provider: "anthropic" | "openai"; model: string; effort: string };
const ASTRA: Modele = { provider: "openai", model: "gpt-6.2-astra", effort: "medium" };
const modeleDe = (a: keyof typeof APPELS): Modele => APPELS[a].modele === "astra" ? ASTRA : { ...DEFAULT_MODELS.strong, effort: APPELS[a].effort ?? DEFAULT_MODELS.strong.effort };
function appel(a: keyof typeof APPELS): { max: number; probable: number } {
  const c = APPELS[a], m = modeleDe(a);
  const usual = estimateCallMicro(m.provider, m.model, c.input, c.output) ?? 0;
  const bound = callCostBoundMicro(m.provider, m.model, c.input * 1.5, c.max, m.effort || null) ?? usual * 4;
  return { max: bound, probable: usual };
}
/**
 * Un appel de texte du devis, tel que le devis le compte (son modèle, son coût habituel, son maximum, et les jetons
 * supposés) : pour détailler un devis appel par appel (essais réels), sans un second jeu de chiffres.
 */
export function devisDUnAppel(a: keyof typeof APPELS): { max: number; probable: number; modele: Modele; jetons: { input: number; output: number; max: number } } {
  const c = APPELS[a];
  return { ...appel(a), modele: modeleDe(a), jetons: { input: c.input, output: c.output, max: c.max } };
}
/**
 * Prix mesurés (euros) des images du parcours, aux tarifs officiels au jeton (30 $ le million en sortie image, 5 $ en
 * texte) et au taux du Studio (0,86) :
 *  - planche 2.5 Sunburst : 0,0098 € (essai réel des planches de recherche du 24 novembre 2026, relayé par le chef
 *    d'orchestre : 343 jetons de sortie, soit 0,0089 € de sortie, plus le texte de la demande). Avant : 0,009 €, la sortie
 *    seule ; c'est le même essai qui a montré le prix par image faux (0,081 €) du studio d'essai ;
 *  - planche 2.6 Flare : 0,030 €, vérifié par la formule officielle (« medium » en 1536 × 1024 : 1 132 jetons, 0,0292 € de
 *    sortie, plus le texte) ;
 *  - texte de finalisation 0,015 € ; logo fini de 0,026 € à 0,061 € (essais réels du 24 novembre 2026).
 */
export const PRIX_MESURES = { planche: { "gpt-image-2.5-sunburst": 0.0098, "gpt-image-2.6-flare": 0.030 } as Record<string, number>, redaction: 0.015, logoFini: { min: 0.026, max: 0.061 } };
const microDe = (eur: number) => Math.round(eur * EUR);

export type DevisDuLogo = { maxMicro: number; probableMicro: number; repriseMicro: number; repriseProbableMicro: number; studioMaxMicro: number };

/** La recherche : le métier (s'il n'est pas déjà écrit), deux planches, la relecture des esquisses. */
export function devisDeLaRecherche(o: { metier?: boolean } = {}): DevisDuLogo {
  const planches = LOGO_MODELS.recherche.reduce((s, m) => s + logoPlancheMaxMicro(m), 0);
  const planchesProbable = LOGO_MODELS.recherche.reduce((s, m) => s + microDe(PRIX_MESURES.planche[m] ?? 0.03), 0);
  const r = appel("esquisses"), m = o.metier === false ? { max: 0, probable: 0 } : appel("metier");
  const repriseMicro = planches + r.max, repriseProbableMicro = planchesProbable + r.probable;
  const maxMicro = Math.ceil(m.max + repriseMicro);
  // La borne du Studio couvre ses reprises possibles dans la même recherche (25 novembre 2026) : les remplacements des
  // esquisses écartées, au plus `REMPLACEMENTS_MAX` tours d'une planche par modèle et d'une relecture (« jamais au grand
  // jamais on propose une planche de logo sans les 12 logos fait correctement »), ET la réécriture du métier quand son
  // contrôle gratuit le refuse.
  return { maxMicro, probableMicro: Math.ceil(m.probable + repriseProbableMicro), repriseMicro, repriseProbableMicro, studioMaxMicro: Math.ceil(borneDuStudio(maxMicro, false, repriseMicro, REMPLACEMENTS_MAX) + m.max) };
}
/** N finalisations : le texte (GPT-6.2 Astra), le logo fini (2.6 Sunburst), sa relecture. */
export function devisDesFinalisations(n: number): DevisDuLogo {
  const r = appel("redaction"), v = appel("logo");
  const un = r.max + logoFinalisationMaxMicro() + v.max;
  const unProbable = microDe(PRIX_MESURES.redaction) + microDe((PRIX_MESURES.logoFini.min + PRIX_MESURES.logoFini.max) / 2) + v.probable;
  const maxMicro = Math.ceil(un * n);
  return { maxMicro, probableMicro: Math.ceil(unProbable * n), repriseMicro: Math.ceil(un * n), repriseProbableMicro: Math.ceil(unProbable * n), studioMaxMicro: borneDuStudio(maxMicro, false, Math.ceil(un * n), 1) };
}
/**
 * La part « logo » de l'accord unique de l'étape « La marque » : recherche, contrôle, N finalisations et leurs relectures
 * (les planches et la marque finie sont comptées par leur propre devis). Chaque morceau est réservé dans le parcours.
 */
export function devisDuLogo(n: number): DevisDuLogo {
  const a = devisDeLaRecherche(), b = devisDesFinalisations(n);
  const maxMicro = a.maxMicro + b.maxMicro, repriseMicro = a.repriseMicro + b.repriseMicro;
  return { maxMicro, probableMicro: a.probableMicro + b.probableMicro, repriseMicro, repriseProbableMicro: a.repriseProbableMicro + b.repriseProbableMicro, studioMaxMicro: a.studioMaxMicro + b.studioMaxMicro };
}
/** « D'autres pistes » : de nouvelles planches (le métier est déjà écrit). Sur le budget du client, avec une carte. */
export const devisDesPistes = (): DevisDuLogo => devisDeLaRecherche({ metier: false });
/** « Un autre logo » après le choix : une autre esquisse déjà montrée, seule la finalisation est payée. */
export const devisDUneAutreEsquisse = (): DevisDuLogo => devisDesFinalisations(1);

// ---------------------------------------------------------------- les appels réels

/** Ce dont le parcours a besoin (remplaçable par les essais : aucun appel payant). */
export type GraphistesAi = {
  metier: (demande: string, tour: number) => Promise<Metier>;
  planche: (modele: string, prompt: string, cle: string) => Promise<{ png: Buffer; recu: RecuDuLogo | null }>;
  relireEsquisses: (images: Buffer[], nom: string, cle: string) => Promise<z.infer<typeof RelectureEsquissesSchema>>;
  rediger: (consigne: string, esquisse: Buffer, cle: string) => Promise<z.infer<typeof TexteDeFinalisationSchema>>;
  /** L'image jointe : l'esquisse au premier essai, le logo refusé à la reprise (25 novembre 2026). */
  finaliser: (jointe: Buffer, texte: string, cle: string) => Promise<{ png: Buffer; recu: RecuDuLogo | null }>;
  relireLogo: (logo: Buffer, esquisse: Buffer, demande: string, cle: string) => Promise<RelectureDuLogo>;
};
export const graphistesDeps: { ai?: (cle: string) => GraphistesAi } = {};

/**
 * Les vrais appels. Le relecteur est le modèle le plus fort (Opus 5.5), un autre modèle que le rédacteur (GPT-6.2 Astra) ;
 * les images partent par logo-policy.ts (aucun secours). `capMicro` : le plafond du client ; `studioCapMicro` : la borne
 * des reprises du Studio.
 */
export function vraisAppels(o: { userId: string; projectId: string; jobId: string; capMicro: number; studioCapMicro: number }): GraphistesAi {
  const scope = (step: string) => ({ jobId: o.jobId, projectId: o.projectId, step, costCapMicro: o.capMicro, studioCapMicro: o.studioCapMicro });
  const ctx = (cle: string) => ({ userId: o.userId, projectId: o.projectId, jobId: o.jobId, usageKey: `${o.jobId}:logo:${cle}` });
  const texte = <S extends z.ZodType>(cle: string, a: keyof typeof APPELS, system: string, prompt: string, schema: S, images?: { data: Buffer; label?: string }[]) => {
    const m = modeleDe(a);
    return withTrace(scope(`logo-${cle}`), () => llmJson({
      task: a === "metier" ? "strategy" : "quality_control", userId: o.userId, projectId: o.projectId, jobId: o.jobId, system, prompt, ...(images?.length ? { images } : {}),
      promptKey: `syna-logo-${a}-1`, maxTokens: APPELS[a].max, maxOutputTokens: APPELS[a].max, usageKey: `${o.jobId}:logo:${cle}`, nouvelleSiChangee: true,
      routing: { difficulty: "complex", prefer: { provider: m.provider as "anthropic" | "openai", model: m.model, ...(m.effort ? { effort: m.effort } : {}) } },
      // Le rédacteur est GPT-6.2 Astra, jamais un autre : sans lui (clé, tarif), l'appel est refusé avant tout envoi, pour
      // que celui qui écrit ne soit jamais celui qui relit.
      ...(a === "redaction" ? { expectedRoute: { provider: m.provider, model: m.model, effort: m.effort } } : {}),
    }, schema)) as Promise<z.infer<S>>;
  };
  const image = async (cle: string, fn: () => Promise<Buffer>) => { const png = await withTrace(scope(`logo-${cle}`), fn); return { png, recu: recuDuLogo(png) }; };
  return {
    metier: (demande, tour) => texte(`metier-${tour}`, "metier", METIER_SYSTEM, demande, MetierSchema),
    planche: (modele, prompt, cle) => image(cle, () => aiLogoPlanche(ctx(cle), { model: modele, prompt })),
    relireEsquisses: (images, nom, cle) => texte(cle, "esquisses", RELECTEUR_DES_ESQUISSES, demandeAuRelecteurDesEsquisses(nom, images.length), RelectureEsquissesSchema, images.map((data, i) => ({ data, label: `esquisse ${i + 1}` }))),
    rediger: (consigne, esquisse, cle) => texte(cle, "redaction", consigne, DEMANDE_AU_REDACTEUR, TexteDeFinalisationSchema, [{ data: esquisse, label: "esquisse choisie" }]),
    finaliser: (jointe, t, cle) => image(cle, () => aiLogoFinalise(ctx(cle), { esquisse: jointe, prompt: t })),
    relireLogo: (logo, esquisse, demande, cle) => texte(cle, "logo", RELECTEUR_DU_LOGO_FINI, demande, RelectureDuLogoSchema, [{ data: logo, label: "logo fini" }, { data: esquisse, label: "esquisse" }]),
  };
}

// ---------------------------------------------------------------- les temps du parcours

/** Le métier : un petit appel, un contrôle gratuit, une réécriture au plus (à la charge du Studio). */
export async function ecrireLeMetier(ai: GraphistesAi, o: { nom: string; activite: string; kind: "produits" | "services" }): Promise<{ ok: true; metier: Metier } | { ok: false; raison: string }> {
  const demande = demandeDuMetier(o);
  const m1 = await ai.metier(demande, 1);
  const f1 = controleDuMetier(m1, o.nom);
  if (!f1) return { ok: true, metier: m1 };
  const m2 = await aLaChargeDuStudio(() => ai.metier(`${demande}\n\nTa première réponse ne convenait pas : ${f1}. Réécris-la.`, 2));
  const f2 = controleDuMetier(m2, o.nom);
  return f2 ? { ok: false, raison: f2 } : { ok: true, metier: m2 };
}

/** Une recherche (la première ou « d'autres pistes ») : les esquisses gardées, numérotées à la suite des précédentes. */
export async function uneRecherche(ai: GraphistesAi, o: { nom: string; metier: Metier; depart: number; eviter: string[]; recherche: number }): Promise<ResultatDeRecherche> {
  return rechercheDesEsquisses({
    planche: async (modele, prompt, tour) => { const r = await ai.planche(modele, prompt, `r${o.recherche}-t${tour}-${modele}`); return { png: r.png, requestId: r.recu?.requestId ?? null, usage: r.recu?.usage ?? null, coutMicro: r.recu?.coutMicro ?? null }; },
    relire: (images, nom, tour) => ai.relireEsquisses(images, nom, `r${o.recherche}-t${tour}-relecture`),
    aLaChargeDuStudio: (fn) => aLaChargeDuStudio(fn),
    estPlafond: (e) => e instanceof CostCapReached,
  }, { nom: o.nom, metier: o.metier, depart: o.depart, eviter: o.eviter });
}

/** Une finalisation (le texte, le logo, la relecture ; une reprise unique à la charge du Studio). */
export async function uneFinalisation(ai: GraphistesAi, o: { nom: string; metier: string; esquisse: Buffer; numero: number; detourer: FinalisationDeps["detourer"]; /** La phrase choisie par le client (absente : la règle d'avant). */ phrase?: PhraseVoulue }): Promise<Finalisation & { recus: (RecuDuLogo | null)[]; palette?: PaletteDuLogo }> {
  const recus: (RecuDuLogo | null)[] = [];
  const f = await finaliserUneEsquisse({
    rediger: (consigne, esq, tour) => ai.rediger(consigne, esq, `e${o.numero}-texte-${tour}`),
    finaliser: async (jointe, t, tour) => { const r = await ai.finaliser(jointe, t, `e${o.numero}-logo-${tour}`); recus.push(r.recu); return r.png; },
    relire: (logo, esq, demande, tour) => ai.relireLogo(logo, esq, demande, `e${o.numero}-relecture-${tour}`),
    detourer: o.detourer,
    aLaChargeDuStudio: (fn) => aLaChargeDuStudio(fn),
  }, { nom: o.nom, metier: o.metier, esquisse: o.esquisse, ...(o.phrase ? { phrase: o.phrase } : {}) });
  if (!f.ok) return { ...f, recus };
  // Le logo d'abord : ses couleurs, par le code (gratuit), à partir du logo détouré.
  const palette = (await couleursDuLogo(f.detoure).catch(() => null))?.palette;
  return { ...f, recus, ...(palette ? { palette } : {}) };
}

/** Ce que SINA dit quand un logo est refusé deux fois : l'identité n'est pas construite, une autre esquisse est proposée. */
export function phraseDuLogoNonConstruit(numero: number, autres: readonly number[]): string {
  const reste = autres.filter((n) => n !== numero);
  return L(`Le logo tiré de l'esquisse ${numero} n'a pas passé ma relecture, même refait : je ne construis pas cette identité avec lui.${reste.length ? ` Je te propose une autre esquisse parmi celles que tu as vues (par exemple la ${reste[0]}).` : " Je te propose de voir d'autres pistes."}`,
    `The logo from sketch ${numero} did not pass my review, even redone: I am not building this identity with it.`);
}

// ---------------------------------------------------------------- ce que voit le client

/** `phrase` : la phrase sous le nom de l'esquisse, et si elle est proposée telle quelle (`ok`) ; `phrases` : ses choix. */
export type VueDesEsquisses = { max: number; choix: number[]; list: { numero: number; href: string; piste: string; phrase?: { texte: string; ok: boolean; lignes?: string[] } }[]; logos: { numero: number; ok: boolean; href: string | null }[]; phrases?: Record<string, PhraseChoisie> };
/** La vue des esquisses (fil et onglet Marque) : seulement celles montrées, jamais une refusée ; null sans esquisses. */
export function vueDesEsquisses(etat: EtatGraphistes | undefined, url: (assetId: string) => string): VueDesEsquisses | null {
  if (!etat?.esquisses.length) return null;
  return {
    max: etat.max, choix: etat.choix ?? [], ...(etat.phrases && Object.keys(etat.phrases).length ? { phrases: etat.phrases } : {}),
    list: etat.esquisses.map((e) => ({ numero: e.numero, href: url(e.assetId), piste: e.piste, ...(e.phrase ? { phrase: { texte: e.phrase.texte, ok: e.phrase.ok, ...(e.phrase.lignes && e.phrase.lignes.length > 1 ? { lignes: e.phrase.lignes } : {}) } } : {}) })),
    logos: (etat.logos ?? []).map((l) => ({ numero: l.numero, ok: l.ok, href: l.ok && l.assetId ? url(l.assetId) : null })),
  };
}
