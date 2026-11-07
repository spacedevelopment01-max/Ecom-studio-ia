/**
 * Étape 4 du parcours SINA (#492) : outils des 5 angles marketing (proposer, choisir). Le moteur est celui du Pilote
 * et de la stratégie marketing (voir ../angles.ts).
 */
import { z } from "zod";
import { one } from "../../db";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { journeyOf, setStep, updateJourney } from "../journey";
import { advanceAngles, anglesMaxMicro, anglesPhase, chooseAngle, pct, researchFailure } from "../angles";
import { budgetPctOf as pctOfUser } from "../../ai/budget-pct";
import { loadProject } from "../../projects";
const budgetPctOf = (pid: string, micro: number) => pctOfUser(loadProject(pid).userId, micro, pid);
import { project } from "./common";

/** Questions à poser, sans doublon (essai réel : la même question listée deux fois). */
export const questionList = (qs: { id: string; question: string }[], missing: string[]) => [...qs.map((q) => `[${q.id}] ${q.question}`), ...missing.filter((m) => !qs.some((q) => q.question.trim() === m.trim()))].join(" ; ");

const running = (pid: string) => !!one("SELECT 1 FROM jobs WHERE project_id=? AND type='project.prepare' AND status IN ('queued','running','paused')", pid);

const proposeTool: AgentTool<{ retry?: boolean }> = {
  name: "angles.propose", module: "stratégie", kind: "generate", needsProject: true,
  description: "Étape 4 : prépare les 5 angles marketing du client (recherche web sur son marché, places de marché exclues, sources réelles). Automate à rappeler après chaque tâche : 1) fait comprendre la fiche de départ par l'IA (payant, tâche de fond) ; 2) s'il manque une information, renvoie les QUESTIONS à poser au client (réponds avec pilot.answer, puis rappelle angles.propose) ; 3) lance la recherche et les 5 angles (payant, tâche de fond de quelques minutes) ; 4) quand tout est prêt, les angles s'affichent dans le fil. Devis annoncé avant chaque partie payante.",
  args: z.object({ retry: z.boolean().optional() }).strict(),
  estimate: (ctx) => ({ maxMicro: anglesMaxMicro(project(ctx).id), label: L("5 angles marketing", "5 marketing angles") }),
  // Demande d'accord lisible par le client (essai réel : il voyait « angles.propose {} »).
  preview: (ctx) => {
    const pid = project(ctx).id;
    const kind = anglesPhase(pid).kind;
    const max = pct(budgetPctOf(pid, anglesMaxMicro(pid)));
    return kind === "analyze"
      ? L(`Analyse de ta fiche de départ par l'IA, avant la recherche : au plus ${max} du budget IA du mois.`, `Brief analysis: at most ${max} of the monthly AI budget.`)
      : L(`Recherche web sur ton marché et 5 angles marketing : au plus ${max} du budget IA du mois.`, `Web research and 5 angles: at most ${max} of the monthly AI budget.`);
  },
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[3]?.status !== "done") return { ok: false, summary: L("L'image de marque (étape 3) doit être validée avant les angles marketing.", "Validate the brand kit first (step 3).") };
    if (j.steps[4]?.status === "done") return { ok: false, summary: L("L'angle marketing est déjà choisi.", "The angle is already chosen.") };
    if (running(p.id)) return { ok: true, summary: L("Une préparation est déjà en cours : SINA reprend quand elle est finie.", "A preparation is already running.") };
    // Après un échec de la recherche : on dit ce qui s'est passé et ce que ça a VRAIMENT coûté ; on ne relance (payant)
    // que si le client l'a demandé (retry).
    const failed = researchFailure(p.id);
    if (failed && anglesPhase(p.id).kind === "research" && !a.retry) return { ok: false, summary: L(`La dernière recherche n'a pas abouti : ${failed.message} Elle a coûté ${pct(budgetPctOf(p.id, failed.costMicro))} du budget (appels réellement faits) ; l'analyse des angles, elle, n'a pas été payée. Dis-le au client avec ce chiffre, puis demande-lui s'il veut relancer (angles.propose avec retry: true, payant).`, "The last research failed."), data: { echec: failed.message, coutPct: budgetPctOf(p.id, failed.costMicro) } };
    const r = advanceAngles(p.id);
    updateJourney(ctx.conversationId, (x) => setStep(x, 4, r.phase.kind === "ready" ? "review" : "doing"));
    if (r.jobId) return {
      ok: true, jobs: [r.jobId],
      summary: r.phase.kind === "analyze"
        ? L(`Analyse de la fiche de départ lancée (1re partie, quelques minutes, au plus ${pct(r.maxPct)} du budget). Ensuite : la recherche web et les 5 angles.`, "Brief analysis started.")
        : L(`Recherche web et 5 angles marketing lancés (quelques minutes, au plus ${pct(r.maxPct)} du budget).`, "Research started."),
    };
    if (r.phase.kind === "questions") return { ok: false, summary: L(`Avant la recherche, il manque des informations : pose ces questions au client une par une, enregistre ses réponses avec pilot.answer, puis rappelle angles.propose. ${questionList(r.phase.questions, r.phase.missing)}`, "Questions to ask first."), data: { questions: r.phase.questions, manquant: r.phase.missing } };
    if (r.phase.kind === "ready") {
      const angles = r.phase.angles;
      updateJourney(ctx.conversationId, (x) => { x.angles = angles; setStep(x, 4, "review"); });
      return { ok: true, summary: L(`5 angles prêts (${angles.sourceCount} sources lues) : ${angles.list.map((a) => `${a.id} « ${a.title} »`).join(" ; ")}. Recommandé : ${angles.recommendedId ?? "aucun"}.`, "Angles ready."), data: { angles: angles.list.map((a) => ({ id: a.id, titre: a.title, cible: a.audience, accroche: a.message, emotion: a.emotion, aConfirmer: a.proofsToConfirm })), recommande: angles.recommendedId } };
    }
    return { ok: false, summary: L("Rien à lancer pour l'instant.", "Nothing to start.") };
  },
};

const chooseTool: AgentTool<{ angleId: string }> = {
  name: "angles.choose", module: "stratégie", kind: "write", needsProject: true,
  description: "Étape 4 : enregistre l'angle marketing CHOISI PAR LE CLIENT (jamais à sa place) : il devient le fil conducteur du site, des publications et des publicités ; la recherche est validée et l'étape 5 s'ouvre. angleId = l'identifiant d'un angle affiché. Gratuit.",
  args: z.object({ angleId: z.string().min(1).max(40) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    const angle = j.angles?.list.find((x) => x.id === a.angleId);
    if (!angle) return { ok: false, summary: L(`Angle « ${a.angleId} » inconnu : choisis parmi ${j.angles?.list.map((x) => x.id).join(", ") || "(aucun angle encore)"}.`, "Unknown angle.") };
    const r = chooseAngle(p.id, a.angleId, `syna-${ctx.runId}-angle-${a.angleId}`);
    if (r.ok) updateJourney(ctx.conversationId, (x) => { x.angleChoice = { id: a.angleId, at: Date.now() }; setStep(x, 4, "done"); setStep(x, 5, "todo"); });
    return {
      ok: r.ok,
      summary: r.ok ? L(`Angle « ${angle.title} » choisi : c'est le fil conducteur de la marque. Étape 4 validée. Prochaine étape : l'activité complète.`, "Angle chosen.") : L(`L'angle n'a pas pu être enregistré (actif : ${r.active ?? "aucun"}, recherche validée : ${r.approved ? "oui" : "non"}).`, "Angle not saved."),
      changes: [{ module: "stratégie", object: L("angle marketing", "marketing angle"), summary: angle.title, after: r.active, verified: r.ok }],
    };
  },
};

export const angleTools: AgentTool[] = [proposeTool, chooseTool];
