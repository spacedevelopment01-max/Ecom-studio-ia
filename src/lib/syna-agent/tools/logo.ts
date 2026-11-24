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
import { controleDuChoix, devisDesFinalisations, devisDesPistes, devisDUneAutreEsquisse, messageDuChoix } from "../logo-graphistes";
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
  description: "Enregistre les esquisses de logo choisies PAR LE CLIENT (jamais à sa place), par leurs numéros : au plus autant que son forfait le permet (2, 3 ou 4), moins est permis. Un numéro inconnu ou refusé est refusé. Gratuit ; les logos finis partent ensuite, déjà couverts par son accord de l'étape « La marque ».",
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
      ...(job ? { jobs: [job.id] } : couvert ? {} : { hint: "Les logos finis partent avec l'accord de l'étape « La marque » ; s'il n'est pas encore donné, la carte de cette étape le demande." }),
    };
  },
};

const autreTool: AgentTool<{ esquisse: number }> = {
  name: "logo.autre", module: "marque", kind: "generate", needsProject: true,
  description: "« Un autre logo » après le choix : finit une AUTRE des esquisses déjà montrées (seule la finalisation est payée). Si aucune ne lui plaît, propose d'abord logo.pistes. Sur son budget, avec une carte. Ne pose jamais de question sur le contenu du logo.",
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
  description: "« D'autres pistes » : de nouvelles planches de recherche, qui évitent les pistes déjà montrées ; les nouvelles esquisses sont numérotées à la suite. Sur son budget, avec une carte.",
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

export const logoTools: AgentTool[] = [choisirTool, autreTool, pistesTool];
