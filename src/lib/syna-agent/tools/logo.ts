/**
 * Les outils du logo, méthode des graphistes (24 novembre 2026, plan accepté par le chef d'orchestre).
 *  - logo.choisir : gratuit. Le client choisit ses esquisses (au plus N : 2, 3 ou 4 selon son forfait ; moins est permis).
 *    Un numéro inconnu ou refusé est refusé. Couvert par l'accord de l'étape « La marque », il lance les finalisations.
 *  - logo.autre : « un autre logo » après le choix, c'est d'abord une autre des esquisses déjà montrées (seule la
 *    finalisation est payée). Sur son budget, avec une carte. Une fois les planches faites, le logo fini se pose sur la
 *    planche dite (`planche`), jamais redessiné ensuite.
 *  - logo.pistes : « d'autres pistes » : de nouvelles planches avec « Évite ces pistes déjà présentées : … », la
 *    numérotation continue. Sur son budget, avec une carte. Avec `planche` : la recherche se fait pour le nom de cette
 *    planche-là (les anciens projets, dont chaque planche a son propre nom, passent aussi par ici : une seule façon de
 *    faire un logo, l'ancienne série est retirée).
 *  Une planche à laquelle il manque son logo se finit par ces deux outils à la charge du Studio (« À ma charge : 0 % ») :
 *  c'est une reprise du travail de SINA, jamais comptée au client.
 *  - logo.couleurs : un changement de couleur demandé par le client lui-même, une fois les logos finis : une retouche sur
 *    sa demande, sur son budget, avec une carte.
 *  La phrase sous le nom (24 novembre 2026 au soir, « si le client veux le slogan de la 5 et le logo 1, sina doit pouvoir
 *  le faire ») : logo.choisir (`phrases`) et logo.autre (`phrase`) prennent, pour un logo, la phrase d'une autre esquisse
 *  (seulement si son orthographe est sûre), aucune phrase, ou la sienne, qui doit figurer mot pour mot dans ses messages.
 *  Sans rien de lui, la règle d'avant reste.
 * Aucun outil ne pose de question sur le contenu d'un logo (règle du 23 novembre 2026, toujours vraie).
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import { enqueue, pendingJob } from "../../jobs";
import type { AgentTool, ToolContext } from "../types";
import { journeyOf, planchesIncompletes, updateJourney, type Journey } from "../journey";
import { ROUTE_KEYS } from "../brand-routes";
import { project } from "./common";
import { lastMessages } from "../store";
import type { PhraseChoisie } from "../phrase-sous-le-nom";
import { PhraseDuClientSchema, controleDesPhrases, type PhraseDuClient, controleDuChoix, devisDeLaRecherche, devisDesFinalisations, devisDesPistes, devisDUneAutreEsquisse, esquissesAChoisir, messageDuChoix } from "../logo-graphistes";
import { planOfProject } from "../../plan-gates";
import { LOGO_GRAPHISTES_JOB } from "../logo-graphistes-tache";

const etatDe = (ctx: ToolContext) => journeyOf(ctx.conversationId).graphistes;
const PAS_D_ESQUISSES = { ok: false, summary: L("Il n'y a pas encore d'esquisses de logo à choisir.", "There are no logo sketches to choose yet.") };

function lancer(ctx: ToolContext, payload: Record<string, unknown>, label: string, cle: string) {
  const p = project(ctx);
  if (pendingJob(p.id, LOGO_GRAPHISTES_JOB)) return null;
  return enqueue({ userId: ctx.user.id, projectId: p.id, type: LOGO_GRAPHISTES_JOB, label, payload: { projectId: p.id, conversationId: ctx.conversationId, ...payload }, maxAttempts: 1, idempotencyKey: `syna:${ctx.runId}:logo:${cle}` });
}
const DEJA = { ok: false, summary: L("Un travail sur ton logo est déjà en cours : attends-le.", "A logo job is already running.") };

/** Ce qui est noté pour la phrase de chaque logo, dit simplement (vide sans choix du client). */
function resumeDesPhrases(phrases: Record<string, PhraseChoisie>): string {
  const parts = Object.entries(phrases).sort(([x], [y]) => Number(x) - Number(y)).map(([logo, p]) => "aucune" in p
    ? L(`le logo ${logo} sans phrase`, `logo ${logo} with no line`)
    : "de" in p ? L(`le logo ${logo} avec la phrase de l'esquisse ${p.de}, « ${p.texte} »`, `logo ${logo} with the line from sketch ${p.de}, “${p.texte}”`)
      : L(`le logo ${logo} avec ta phrase, mot pour mot : « ${p.texte} »`, `logo ${logo} with your line, word for word: “${p.texte}”`));
  return parts.length ? ` ${L("Noté aussi :", "Also noted:")} ${parts.join(" ; ")}.` : "";
}

/** Les derniers messages du client, pour vérifier que sa phrase à lui est reprise mot pour mot. */
const motsDuClient = (ctx: ToolContext): string[] => lastMessages(ctx.conversationId, 40).filter((m) => m.role === "user").map((m) => String(m.content?.text ?? ""));

const choisirTool: AgentTool<{ esquisses: number[]; phrases?: PhraseDuClient[] }> = {
  name: "logo.choisir", module: "marque", kind: "write", needsProject: true,
  description: "Les esquisses de logo choisies PAR LE CLIENT (2 au moins, au plus selon son forfait). phrases = seulement s'il le dit, pour un logo : de = l'esquisse dont il veut la phrase sous le nom, aucune = sans phrase, texte = sa phrase, recopiée mot pour mot de son message. Gratuit : les logos finis partent.",
  args: z.object({ esquisses: z.array(z.number().int().min(1)).min(1).max(8), phrases: z.array(PhraseDuClientSchema).max(8).optional() }).strict(),
  run: (ctx, a) => {
    const etat = etatDe(ctx);
    if (!etat?.esquisses.length) return PAS_D_ESQUISSES;
    // Une recherche pour une seule planche : son esquisse se finit par logo.autre (elle devient le logo de cette planche).
    if (etat.planche) return { ok: false, internal: true, summary: `Ces esquisses sont pour la planche ${etat.planche} : le client en choisit une, finis-la avec logo.autre (esquisse = son numéro, planche = ${etat.planche}).` };
    const faute = controleDuChoix(etat, a.esquisses);
    if (faute) return { ok: false, summary: faute };
    const choix = [...new Set(a.esquisses)].sort((x, y) => x - y);
    // La phrase sous le nom, au choix du client : celle d'une autre esquisse (orthographe sûre), aucune, ou la sienne mot pour mot.
    const ph = controleDesPhrases(etat, choix, a.phrases ?? [], a.phrases?.some((p) => p.texte != null) ? motsDuClient(ctx) : []);
    if (!ph.ok) return { ok: false, summary: ph.faute, ...(ph.interne ? { internal: true } : {}) };
    updateJourney(ctx.conversationId, (x) => { if (x.graphistes) x.graphistes = { ...x.graphistes, choix, phrases: ph.phrases, at: Date.now() }; });
    const couvert = (etat.finalisationsAccordees ?? 0) >= devisDesFinalisations(choix.length).maxMicro;
    const job = couvert ? lancer(ctx, { phase: "finalisation", numeros: choix, capMicro: etat.finalisationsAccordees, studioCapMicro: devisDesFinalisations(choix.length).studioMaxMicro }, L("Logos finis (SINA)", "Finished logos (SINA)"), `finalisation:${choix.join("-")}`) : null;
    return {
      ok: true, data: { choix, message: messageDuChoix(choix), ...(Object.keys(ph.phrases).length ? { phrases: ph.phrases } : {}) },
      summary: `${job ? L(`${messageDuChoix(choix)} : c'est noté. Je finis ${choix.length > 1 ? "ces logos" : "ce logo"} et je les relis avant de te les montrer.`, "Noted. I am finishing the logos.") : L(`${messageDuChoix(choix)} : c'est noté.`, "Noted.")}${resumeDesPhrases(ph.phrases)}`,
      ...(job ? { jobs: [job.id] } : couvert ? { hint: "Un travail sur son logo est déjà en cours : ses logos finis partiront quand il sera fini (relance logo.choisir avec les mêmes numéros)." } : { hint: "Les logos finis partent avec l'accord de l'étape « La marque » ; s'il n'est pas encore donné, la carte de cette étape le demande." }),
    };
  },
};

/**
 * La planche à laquelle il manque son logo (planche gardée de côté, ou marque finie sans logo) : la finir est une reprise
 * du travail de SINA, à la charge du Studio.
 */
export function logoAFinir(j: Journey, planche: string | undefined): boolean {
  if (!planche) return false;
  if (planchesIncompletes(j).some((x) => x.key === planche && x.manque.includes("logo"))) return true;
  return j.identityChoice?.key === planche && !!j.brandFinish?.manque?.includes("logo");
}
/** La planche qui recevra le logo fini : celle dite, sinon celle de la recherche, sinon l'identité choisie. */
const plancheVisee = (j: Journey, planche: string | undefined): string | undefined => planche ?? j.graphistes?.planche ?? (j.identities?.list.length ? j.identityChoice?.mix?.logo ?? j.identityChoice?.key : undefined);
const SANS_PLANCHE = { ok: false as const, internal: true, summary: "Les planches sont déjà faites : dis sur quelle planche poser le logo (planche = A, B, C ou D)." };
const PLANCHE = z.enum(ROUTE_KEYS).optional();

const autreTool: AgentTool<{ esquisse: number; planche?: (typeof ROUTE_KEYS)[number]; phrase?: Omit<PhraseDuClient, "logo"> }> = {
  name: "logo.autre", module: "marque", kind: "generate", needsProject: true,
  description: "« Un autre logo » : finit une esquisse montrée. planche = celle qui le reçoit, planches faites. phrase = seulement s'il le dit (de, aucune ou texte, comme logo.choisir). Payant (carte) ; à ta charge si son logo manque.",
  args: z.object({ esquisse: z.number().int().min(1), planche: PLANCHE, phrase: PhraseDuClientSchema.omit({ logo: true }).optional() }).strict(),
  estimate: (ctx, a) => {
    const d = devisDUneAutreEsquisse(), studio = logoAFinir(journeyOf(ctx.conversationId), plancheVisee(journeyOf(ctx.conversationId), a?.planche));
    return { maxMicro: d.maxMicro, probableMicro: d.probableMicro, studioMaxMicro: d.studioMaxMicro, label: studio ? L("finir ta planche : son logo, tiré de l'esquisse choisie", "finish your board: its logo") : L("un autre logo, tiré d'une esquisse déjà vue", "another logo from a sketch already seen"), ...(studio ? { studio: true } : {}) };
  },
  run: (ctx, a) => {
    const j = journeyOf(ctx.conversationId), etat = j.graphistes;
    if (!etat?.esquisses.length) return { ...PAS_D_ESQUISSES, hint: "Sans esquisses : logo.pistes (avec planche = la planche, une fois les planches faites) cherche d'abord les pistes de son logo." };
    if (!etat.esquisses.some((e) => e.numero === a.esquisse)) return { ok: false, summary: L(`L'esquisse ${a.esquisse} n'a pas été montrée.`, "Unknown sketch.") };
    const planche = plancheVisee(j, a.planche);
    if (j.identities?.list.length && !planche) return SANS_PLANCHE;
    if (planche && j.identities?.list.length && !j.identities.list.some((x) => x.key === planche)) return { ok: false, summary: L(`Il n'y a pas de planche ${planche}.`, "Unknown board.") };
    const d = devisDUneAutreEsquisse(), studio = logoAFinir(j, planche);
    // La phrase sous le nom, s'il l'a dite : contrôlée comme pour logo.choisir ; sinon ce qu'il a dit avant reste.
    if (a.phrase) {
      const ph = controleDesPhrases(etat, [a.esquisse], [{ logo: a.esquisse, ...a.phrase }], a.phrase.texte != null ? motsDuClient(ctx) : []);
      if (!ph.ok) return { ok: false, summary: ph.faute, ...(ph.interne ? { internal: true } : {}) };
      if (pendingJob(project(ctx).id, LOGO_GRAPHISTES_JOB)) return DEJA;
      updateJourney(ctx.conversationId, (x) => { if (x.graphistes) x.graphistes = { ...x.graphistes, phrases: { ...(x.graphistes.phrases ?? {}), ...ph.phrases } }; });
    }
    const job = lancer(ctx, { phase: "finalisation", numeros: [a.esquisse], capMicro: d.maxMicro, studioCapMicro: d.studioMaxMicro, ...(planche && j.identities?.list.length ? { planche } : {}), ...(studio ? { studio: true } : {}) }, L("Un autre logo (SINA)", "Another logo (SINA)"), `autre:${a.esquisse}:${planche ?? ""}`);
    if (!job) return DEJA;
    return { ok: true, jobs: [job.id], summary: L(`Je fais ton logo à partir de l'esquisse ${a.esquisse}, puis je le relis.`, "Making your logo from that sketch.") };
  },
};

const pistesTool: AgentTool<{ planche?: (typeof ROUTE_KEYS)[number] }> = {
  name: "logo.pistes", module: "marque", kind: "generate", needsProject: true,
  description: "« D'autres pistes » de logo : nouvelles esquisses numérotées. planche = celle visée, planches faites (pistes pour son nom). Payant (carte) ; à ta charge si son logo manque.",
  args: z.object({ planche: PLANCHE }).strict(),
  estimate: (ctx, a) => {
    const j = journeyOf(ctx.conversationId), w = travailDesPistes(j, a?.planche), d = w.neuve ? devisDeLaRecherche() : devisDesPistes();
    return { maxMicro: d.maxMicro, probableMicro: d.probableMicro, studioMaxMicro: d.studioMaxMicro, label: w.studio ? L("finir ta planche : les pistes de son logo", "finish your board: its logo directions") : L("d'autres pistes de logo", "other logo directions"), ...(w.studio ? { studio: true } : {}) };
  },
  run: (ctx, a) => {
    const j = journeyOf(ctx.conversationId), etat = j.graphistes, w = travailDesPistes(j, a.planche);
    if (w.refus) return w.refus;
    if (!w.neuve && !etat?.metier) return PAS_D_ESQUISSES;
    const d = w.neuve ? devisDeLaRecherche() : devisDesPistes();
    const job = lancer(ctx, { phase: w.neuve ? "recherche" : "pistes", ...(w.neuve ? { nom: w.nom } : {}), ...(w.planche ? { planche: w.planche } : {}), ...(w.studio ? { studio: true } : {}), capMicro: d.maxMicro, studioCapMicro: d.studioMaxMicro }, L("D'autres pistes de logo (SINA)", "Other logo directions (SINA)"), `pistes:${w.planche ?? ""}:${w.neuve ? 1 : (etat?.recherches ?? 0) + 1}`);
    if (!job) return DEJA;
    // Une recherche pour une autre planche (un autre nom) repart de zéro : ses esquisses, sa numérotation.
    if (w.neuve) updateJourney(ctx.conversationId, (x) => { x.graphistes = undefined; });
    return { ok: true, jobs: [job.id], summary: w.neuve && w.planche ? L(`Je cherche les pistes du logo de « ${w.nom} » ; je te montre les esquisses numérotées, et tu choisis la tienne.`, "Looking for the logo directions.") : L("Je cherche d'autres pistes, différentes de celles que tu as vues ; je te montre les nouvelles esquisses à la suite.", "Looking for other directions.") };
  },
};

/**
 * Ce que fait logo.pistes : une première recherche pour le nom d'une planche (ancien projet, ou planche d'un autre nom),
 * ou d'autres pistes à la suite de la recherche en cours (même nom). Gratuit, sans IA.
 */
export function travailDesPistes(j: Journey, planche0: string | undefined): { neuve: boolean; nom?: string; planche?: string; studio: boolean; refus?: { ok: false; internal?: boolean; summary: string } } {
  const list = j.identities?.list ?? [], etat = j.graphistes;
  const planche = list.length ? plancheVisee(j, planche0) : undefined;
  if (list.length && !planche) return { neuve: false, studio: false, refus: SANS_PLANCHE };
  if (!planche) return { neuve: false, studio: false };
  const x = list.find((y) => y.key === planche);
  if (!x) return { neuve: false, studio: false, refus: { ok: false, summary: L(`Il n'y a pas de planche ${planche}.`, "Unknown board.") } };
  const meme = !!etat?.metier && etat.nom.normalize("NFC").toLowerCase() === x.name.normalize("NFC").toLowerCase();
  return { neuve: !meme, nom: x.name, planche, studio: logoAFinir(j, planche) };
}

const couleursTool: AgentTool<{ esquisse: number; demande: string }> = {
  name: "logo.couleurs", module: "marque", kind: "generate", needsProject: true,
  description: "Change les couleurs d'un logo fini, sur demande du client (ses mots). Payant (carte).",
  args: z.object({ esquisse: z.number().int().min(1), demande: z.string().min(1).max(600) }).strict(),
  estimate: () => { const d = devisDesFinalisations(1); return { maxMicro: d.maxMicro, probableMicro: d.probableMicro, studioMaxMicro: d.studioMaxMicro, label: L("changer les couleurs de ton logo", "change your logo colours") }; },
  run: (ctx, a) => {
    const etat = etatDe(ctx);
    if (!etat?.logos?.some((l) => l.numero === a.esquisse && l.ok)) return { ok: false, summary: L("Ce logo n'est pas encore fini.", "This logo is not finished yet.") };
    const d = devisDesFinalisations(1);
    const job = lancer(ctx, { phase: "couleurs", numero: a.esquisse, demande: a.demande, capMicro: d.maxMicro, studioCapMicro: d.studioMaxMicro }, L("Couleurs du logo (SINA)", "Logo colours (SINA)"), `couleurs:${a.esquisse}:${a.demande.length}`);
    if (!job) return DEJA;
    return { ok: true, jobs: [job.id], summary: L("Je change les couleurs de ton logo, sans toucher à son dessin, puis je le relis.", "Changing your logo colours.") };
  },
};

export const logoTools: AgentTool[] = [choisirTool, autreTool, pistesTool, couleursTool];
/** Tous les outils du logo et du nom, dans le registre commun. */
export const outilsDuLogo = (): AgentTool[] => [nomTool, ...logoTools];

/**
 * LE POINT 0 (« Oui » du propriétaire, 24 novembre 2026 : « Le client choisit d'abord son nom, puis les logos ») : la chaîne de la marque
 * s'arrête après les noms vérifiés (`noms`), le client choisit son nom, et la recherche des esquisses part pour ce nom,
 * couverte par l'accord unique de l'étape « La marque » (la part des N finalisations y est réservée). Les N identités
 * partagent ensuite ce nom, chacune avec son logo.
 */
export const nomTool: AgentTool<{ nom: string }> = {
  name: "identity.nom", module: "marque", kind: "write", needsProject: true,
  description: "Le nom choisi PAR LE CLIENT parmi les noms vérifiés montrés ; lance la recherche de son logo. Gratuit.",
  args: z.object({ nom: z.string().min(1).max(60) }).strict(),
  run: (ctx, a) => {
    const nom = a.nom.trim(), noms = journeyOf(ctx.conversationId).nomsVerifies ?? [];
    if (!noms.some((n) => n.normalize("NFC").toLowerCase() === nom.normalize("NFC").toLowerCase())) return { ok: false, summary: L("Ce nom n'est pas parmi ceux que je t'ai montrés, vérifiés.", "This name is not among the verified names shown.") };
    const p = project(ctx), j = journeyOf(ctx.conversationId), n = j.accordGraphistes?.count ?? esquissesAChoisir(planOfProject(p.id));
    // Le nom exact montré (sa casse, ses accents), jamais une autre écriture.
    const exact = noms.find((x) => x.normalize("NFC").toLowerCase() === nom.normalize("NFC").toLowerCase()) ?? nom;
    const r = devisDeLaRecherche(), f = devisDesFinalisations(n);
    const job = lancer(ctx, { phase: "recherche", nom: exact, capMicro: j.accordGraphistes?.rechercheMicro ?? r.maxMicro, studioCapMicro: r.studioMaxMicro, finalisationsAccordees: j.accordGraphistes?.finalisationsMicro ?? f.maxMicro }, L("Recherche de ton logo (SINA)", "Your logo research (SINA)"), `recherche:${exact}`);
    if (!job) return DEJA;
    updateJourney(ctx.conversationId, (x) => { if (x.nomsDeLaMarque) x.nomsDeLaMarque.choisi = exact; x.graphistes = undefined; });
    return { ok: true, jobs: [job.id], summary: L(`« ${exact} » : c'est noté. Je cherche les pistes de ton logo et je te montre les esquisses numérotées.`, "Noted. Looking for your logo directions.") };
  },
};
