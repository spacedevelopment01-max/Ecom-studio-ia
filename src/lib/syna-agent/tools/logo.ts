/**
 * Les outils du logo, méthode des graphistes (24 novembre 2026, plan accepté par le chef d'orchestre).
 *  - logo.choisir : gratuit. Le client choisit ses esquisses (au plus N : 2, 3 ou 4 selon son forfait ; moins est permis).
 *    Un numéro inconnu ou refusé est refusé. Couvert par l'accord de l'étape « La marque », il lance les finalisations.
 *  - logo.autre : « un autre logo » après le choix, c'est d'abord une autre des esquisses déjà montrées (seule la
 *    finalisation est payée). Sur son budget, avec une carte.
 *  - logo.pistes : « d'autres pistes » : de nouvelles planches avec « Évite ces pistes déjà présentées : … », la
 *    numérotation continue. Sur son budget, avec une carte.
 *  - logo.couleurs : un changement de couleur demandé par le client lui-même, une fois les logos finis : une retouche sur
 *    sa demande, sur son budget, avec une carte.
 * Aucun outil ne pose de question sur le contenu d'un logo (règle du 23 novembre 2026, toujours vraie).
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import { enqueue, pendingJob } from "../../jobs";
import type { AgentTool, ToolContext } from "../types";
import { journeyOf, updateJourney } from "../journey";
import { project } from "./common";
import { controleDuChoix, devisDeLaRecherche, devisDesFinalisations, devisDesPistes, devisDUneAutreEsquisse, esquissesAChoisir, messageDuChoix } from "../logo-graphistes";
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

const choisirTool: AgentTool<{ esquisses: number[] }> = {
  name: "logo.choisir", module: "marque", kind: "write", needsProject: true,
  description: "Les esquisses de logo choisies PAR LE CLIENT (2 au moins, au plus selon son forfait). Gratuit : les logos finis partent.",
  args: z.object({ esquisses: z.array(z.number().int().min(1)).min(1).max(8) }).strict(),
  run: (ctx, a) => {
    const etat = etatDe(ctx);
    if (!etat?.esquisses.length) return PAS_D_ESQUISSES;
    const faute = controleDuChoix(etat, a.esquisses);
    if (faute) return { ok: false, summary: faute };
    const choix = [...new Set(a.esquisses)].sort((x, y) => x - y);
    updateJourney(ctx.conversationId, (x) => { if (x.graphistes) x.graphistes = { ...x.graphistes, choix, at: Date.now() }; });
    const couvert = (etat.finalisationsAccordees ?? 0) >= devisDesFinalisations(choix.length).maxMicro;
    const job = couvert ? lancer(ctx, { phase: "finalisation", numeros: choix, capMicro: etat.finalisationsAccordees, studioCapMicro: devisDesFinalisations(choix.length).studioMaxMicro }, L("Logos finis (SINA)", "Finished logos (SINA)"), `finalisation:${choix.join("-")}`) : null;
    return {
      ok: true, data: { choix, message: messageDuChoix(choix) },
      summary: job ? L(`${messageDuChoix(choix)} : c'est noté. Je finis ${choix.length > 1 ? "ces logos" : "ce logo"} et je les relis avant de te les montrer.`, "Noted. I am finishing the logos.") : L(`${messageDuChoix(choix)} : c'est noté.`, "Noted."),
      ...(job ? { jobs: [job.id] } : couvert ? { hint: "Un travail sur son logo est déjà en cours : ses logos finis partiront quand il sera fini (relance logo.choisir avec les mêmes numéros)." } : { hint: "Les logos finis partent avec l'accord de l'étape « La marque » ; s'il n'est pas encore donné, la carte de cette étape le demande." }),
    };
  },
};

const autreTool: AgentTool<{ esquisse: number }> = {
  name: "logo.autre", module: "marque", kind: "generate", needsProject: true,
  description: "« Un autre logo » : finit une autre esquisse montrée. Payant (carte).",
  args: z.object({ esquisse: z.number().int().min(1) }).strict(),
  estimate: () => { const d = devisDUneAutreEsquisse(); return { maxMicro: d.maxMicro, probableMicro: d.probableMicro, studioMaxMicro: d.studioMaxMicro, label: L("un autre logo, tiré d'une esquisse déjà vue", "another logo from a sketch already seen") }; },
  run: (ctx, a) => {
    const etat = etatDe(ctx);
    if (!etat?.esquisses.length) return PAS_D_ESQUISSES;
    if (!etat.esquisses.some((e) => e.numero === a.esquisse)) return { ok: false, summary: L(`L'esquisse ${a.esquisse} n'a pas été montrée.`, "Unknown sketch.") };
    const d = devisDUneAutreEsquisse();
    const job = lancer(ctx, { phase: "finalisation", numeros: [a.esquisse], capMicro: d.maxMicro, studioCapMicro: d.studioMaxMicro }, L("Un autre logo (SINA)", "Another logo (SINA)"), `autre:${a.esquisse}`);
    if (!job) return DEJA;
    return { ok: true, jobs: [job.id], summary: L(`Je refais ton logo à partir de l'esquisse ${a.esquisse}, puis je le relis.`, "Redoing your logo from that sketch.") };
  },
};

const pistesTool: AgentTool<Record<string, never>> = {
  name: "logo.pistes", module: "marque", kind: "generate", needsProject: true,
  description: "« D'autres pistes » de logo : nouvelles esquisses, numérotées à la suite. Payant (carte).",
  args: z.object({}).strict(),
  estimate: () => { const d = devisDesPistes(); return { maxMicro: d.maxMicro, probableMicro: d.probableMicro, studioMaxMicro: d.studioMaxMicro, label: L("d'autres pistes de logo", "other logo directions") }; },
  run: (ctx) => {
    const etat = etatDe(ctx);
    if (!etat?.metier) return PAS_D_ESQUISSES;
    const d = devisDesPistes();
    const job = lancer(ctx, { phase: "pistes", capMicro: d.maxMicro, studioCapMicro: d.studioMaxMicro }, L("D'autres pistes de logo (SINA)", "Other logo directions (SINA)"), `pistes:${etat.recherches + 1}`);
    if (!job) return DEJA;
    return { ok: true, jobs: [job.id], summary: L("Je cherche d'autres pistes, différentes de celles que tu as vues ; je te montre les nouvelles esquisses à la suite.", "Looking for other directions.") };
  },
};

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
