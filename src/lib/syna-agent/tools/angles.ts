/**
 * Étape 4 du parcours SINA (#492) : outils des 5 angles marketing (proposer, choisir). Le moteur est celui du Pilote
 * et de la stratégie marketing (voir ../angles.ts).
 */
import { z } from "zod";
import { one } from "../../db";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { journeyOf, setStep, updateJourney } from "../journey";
import { advanceAngles, angleLimit, anglesMaxMicro, anglesPhase, chooseAngles, pct, researchFailure, usedAngles } from "../angles";
import { budgetPctOf as pctOfUser } from "../../ai/budget-pct";
import { loadProject } from "../../projects";
const budgetPctOf = (pid: string, micro: number) => pctOfUser(loadProject(pid).userId, micro, pid);
import { project } from "./common";

/** Questions à poser, sans doublon (essai réel : la même question listée deux fois). */
export const questionList = (qs: { id: string; question: string }[], missing: string[]) => [...qs.map((q) => `[${q.id}] ${q.question}`), ...missing.filter((m) => !qs.some((q) => q.question.trim() === m.trim()))].join(" ; ");

const running = (pid: string) => !!one("SELECT 1 FROM jobs WHERE project_id=? AND type='project.prepare' AND status IN ('queued','running','paused')", pid);

const proposeTool: AgentTool<{ retry?: boolean; redo?: string }> = {
  name: "angles.propose", module: "stratégie", kind: "generate", needsProject: true,
  description: "Étape 4 : prépare les 5 angles marketing du client (recherche web sur son marché, places de marché exclues, sources réelles). Automate à rappeler après chaque tâche : 1) fait comprendre la fiche de départ par l'IA (payant, tâche de fond) ; 2) s'il manque une information, renvoie les QUESTIONS à poser au client (réponds avec pilot.answer, puis rappelle angles.propose) ; 3) lance la recherche et les 5 angles (payant, tâche de fond de quelques minutes) ; 4) quand tout est prêt, les angles s'affichent dans le fil. Devis annoncé avant chaque partie payante. redo = la demande du client, avec SES mots, quand il veut une NOUVELLE proposition d'angles alors qu'ils sont prêts (nouvelle recherche payante ; les angles précédents restent conservés).",
  args: z.object({ retry: z.boolean().optional(), redo: z.string().min(8).max(1500).optional() }).strict(),
  estimate: (ctx, a) => ({ maxMicro: anglesMaxMicro(project(ctx).id, a.redo), label: anglesPhase(project(ctx).id).kind === "analyze" ? L("analyse de ta fiche de départ, puis recherche web et 5 angles marketing", "brief analysis, then research and 5 angles") : L("recherche web et 5 angles marketing", "research and 5 marketing angles") }),
  // Demande d'accord lisible par le client (essai réel : il voyait « angles.propose {} »).
  preview: (ctx, a) => {
    const pid = project(ctx).id;
    const kind = anglesPhase(pid).kind;
    const max = pct(budgetPctOf(pid, anglesMaxMicro(pid, a.redo)));
    if (kind === "ready" && a.redo) return L(`Nouvelle recherche web et 5 nouveaux angles, d'après ta demande : au plus ${max} du budget IA du mois.`, `New research and 5 new angles: at most ${max}.`);
    return kind === "analyze"
      ? L(`Analyse de ta fiche de départ par l'IA, avant la recherche : au plus ${max} du budget IA du mois.`, `Brief analysis: at most ${max} of the monthly AI budget.`)
      : L(`Recherche web sur ton marché et 5 angles marketing : au plus ${max} du budget IA du mois.`, `Web research and 5 angles: at most ${max} of the monthly AI budget.`);
  },
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[3]?.status !== "done") return { ok: false, summary: L("L'image de marque (étape 3) doit être validée avant les angles marketing.", "Validate the brand kit first (step 3).") };
    if (j.steps[4]?.status === "done") return { ok: false, summary: L("L'angle marketing est déjà choisi.", "The angle is already chosen.") };
    if (running(p.id)) return { ok: true, summary: L("Une préparation est déjà en cours ; je reprends dès qu'elle est finie.", "A preparation is already running.") };
    // Après un échec de la recherche : on dit ce qui s'est passé et ce que ça a VRAIMENT coûté ; on ne relance (payant)
    // que si le client l'a demandé (retry).
    const failed = researchFailure(p.id);
    if (failed && anglesPhase(p.id).kind === "research" && !a.retry) return { ok: false, summary: L(`La dernière recherche n'a pas abouti : ${failed.message} Elle a coûté ${pct(budgetPctOf(p.id, failed.costMicro))} du budget (appels réellement faits) ; l'analyse des angles, elle, n'a pas été payée.`, "The last research failed."), hint: "Dis-le au client avec ce chiffre, puis demande-lui s'il veut relancer (angles.propose avec retry: true, payant).", data: { echec: failed.message, coutPct: budgetPctOf(p.id, failed.costMicro) } };
    const r = advanceAngles(p.id, a.redo);
    updateJourney(ctx.conversationId, (x) => setStep(x, 4, r.phase.kind === "ready" ? "review" : "doing"));
    if (r.jobId) return {
      ok: true, jobs: [r.jobId],
      summary: r.phase.kind === "analyze"
        ? L(`Analyse de la fiche de départ lancée (1re partie, quelques minutes, au plus ${pct(r.maxPct)} du budget). Ensuite : la recherche web et les 5 angles.`, "Brief analysis started.")
        : L(`Recherche web et 5 angles marketing lancés (quelques minutes, au plus ${pct(r.maxPct)} du budget).`, "Research started."),
    };
    if (r.phase.kind === "questions") return { ok: false, summary: L("Avant la recherche, il me manque une ou deux précisions sur tes produits.", "A few details are needed before the research."), hint: `Pose ces questions au client UNE par UNE, enregistre ses réponses avec pilot.answer, puis rappelle angles.propose. ${questionList(r.phase.questions, r.phase.missing)}`, data: { questions: r.phase.questions, manquant: r.phase.missing } };
    if (r.phase.kind === "ready") {
      const angles = r.phase.angles;
      updateJourney(ctx.conversationId, (x) => { x.angles = angles; setStep(x, 4, "review"); });
      return { ok: true, summary: L(`5 angles prêts (${angles.sourceCount} sources lues) : ${angles.list.map((a) => `« ${a.title} »`).join(" ; ")}.${angles.recommendedId ? ` Recommandé : « ${angles.list.find((a) => a.id === angles.recommendedId)?.title ?? angles.recommendedId} ».` : ""}`, "Angles ready."), hint: `Identifiants des angles pour angles.choose : ${angles.list.map((a) => `${a.id} = « ${a.title} »`).join(" ; ")}.`, data: { angles: angles.list.map((a) => ({ id: a.id, titre: a.title, cible: a.audience, accroche: a.message, emotion: a.emotion, aConfirmer: a.proofsToConfirm })), recommande: angles.recommendedId } };
    }
    return { ok: false, summary: L("Rien à lancer pour l'instant.", "Nothing to start.") };
  },
};

const chooseTool: AgentTool<{ angleIds: string[] }> = {
  name: "angles.choose", module: "stratégie", kind: "write", needsProject: true,
  description: "Étape 4 : enregistre le ou les angles CHOISIS PAR LE CLIENT (jamais à sa place). Il peut en choisir PLUSIEURS : angleIds dans l'ordre, le PREMIER est l'angle principal (fil conducteur du site), les suivants servent aux publications et publicités (un angle principal par contenu). Son forfait fixe le nombre d'angles possibles (1, 2 ou 5) : s'il en choisit trop, dis-le-lui et demande lesquels garder. La recherche est validée et l'étape 5 s'ouvre. Gratuit.",
  args: z.object({ angleIds: z.array(z.string().min(1).max(40)).min(1).max(5) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    const ids = [...new Set(a.angleIds)];
    const unknown = ids.filter((id) => !j.angles?.list.some((x) => x.id === id));
    if (unknown.length) return { ok: false, summary: L(`Angle inconnu : ${unknown.join(", ")} ; choisis parmi ${j.angles?.list.map((x) => x.id).join(", ") || "(aucun angle encore)"}.`, "Unknown angle.") };
    const limit = angleLimit(p.id);
    if (ids.length > limit) return { ok: false, summary: L(`Le forfait du client permet ${limit} angle${limit > 1 ? "s" : ""} ; il en a choisi ${ids.length}. Dis-le-lui simplement et demande lequel ou lesquels garder (le premier sera l'angle principal).`, "Too many angles for the plan.") };
    // Un angle déjà utilisé compte pour toujours dans le forfait : le total (anciens + nouveaux) ne doit pas le dépasser.
    const used = usedAngles(p.id), fresh = ids.filter((id) => !used.includes(id));
    if (used.length + fresh.length > limit) {
      const name = (id: string) => j.angles?.list.find((x) => x.id === id)?.title ?? id;
      return { ok: false, summary: L(`Le forfait du client permet ${limit} angle${limit > 1 ? "s" : ""} en tout, et ${used.length} ${used.length > 1 ? "sont déjà utilisés" : "est déjà utilisé"} (${used.map((id) => `« ${name(id)} »`).join(", ")}). Il peut garder ${used.length > 1 ? "ceux-là" : "celui-là"} ou en ajouter ${Math.max(0, limit - used.length)} au plus.`, "Plan angle limit reached.") };
    }
    const r = chooseAngles(p.id, ids, `syna-${ctx.runId}-angles`);
    const titles = ids.map((id) => j.angles!.list.find((x) => x.id === id)!.title);
    if (r.ok) updateJourney(ctx.conversationId, (x) => { x.angleChoice = { id: ids[0], ids, at: Date.now() }; setStep(x, 4, "done"); setStep(x, 5, "todo"); });
    return {
      ok: r.ok,
      summary: r.ok
        ? L(`Angle principal : « ${titles[0]} »${titles.length > 1 ? ` ; aussi retenus pour les publications et publicités : ${titles.slice(1).map((t) => `« ${t} »`).join(", ")}` : ""}. Étape 4 validée. Prochaine étape : l'activité complète.`, "Angles chosen.")
        : L(`Les angles n'ont pas pu être enregistrés, rien n'a été compté dans le forfait${r.error ? ` (${r.error})` : ""}.`, "Angles not saved."),
      changes: [{ module: "stratégie", object: L("angles marketing", "marketing angles"), summary: titles.join(" + "), after: ids, verified: r.ok }],
    };
  },
};

export const angleTools: AgentTool[] = [proposeTool, chooseTool];
