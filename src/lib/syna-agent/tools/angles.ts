/**
 * Étape 4 du parcours SINA (#492) : outils des 5 angles marketing (proposer, choisir). Le moteur est celui du Pilote
 * et de la stratégie marketing (voir ../angles.ts).
 */
import { z } from "zod";
import { one } from "../../db";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { journeyOf, setStep, updateJourney } from "../journey";
import { advanceAngles, anglesMaxMicro, chooseAngle } from "../angles";
import { project } from "./common";

const running = (pid: string) => !!one("SELECT 1 FROM jobs WHERE project_id=? AND type='project.prepare' AND status IN ('queued','running','paused')", pid);

const proposeTool: AgentTool<Record<string, never>> = {
  name: "angles.propose", module: "stratégie", kind: "generate", needsProject: true,
  description: "Étape 4 : prépare les 5 angles marketing du client (recherche web sur son marché, places de marché exclues, sources réelles). Automate à rappeler après chaque tâche : 1) fait comprendre la fiche de départ par l'IA (payant, tâche de fond) ; 2) s'il manque une information, renvoie les QUESTIONS à poser au client (réponds avec pilot.answer, puis rappelle angles.propose) ; 3) lance la recherche et les 5 angles (payant, tâche de fond de quelques minutes) ; 4) quand tout est prêt, les angles s'affichent dans le fil. Devis annoncé avant chaque partie payante.",
  args: z.object({}).strict(),
  estimate: (ctx) => ({ maxMicro: anglesMaxMicro(project(ctx).id), label: L("5 angles marketing", "5 marketing angles") }),
  run: (ctx) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[3]?.status !== "done") return { ok: false, summary: L("L'image de marque (étape 3) doit être validée avant les angles marketing.", "Validate the brand kit first (step 3).") };
    if (j.steps[4]?.status === "done") return { ok: false, summary: L("L'angle marketing est déjà choisi.", "The angle is already chosen.") };
    if (running(p.id)) return { ok: true, summary: L("Une préparation est déjà en cours : SINA reprend quand elle est finie.", "A preparation is already running.") };
    const r = advanceAngles(p.id);
    updateJourney(ctx.conversationId, (x) => setStep(x, 4, r.phase.kind === "ready" ? "review" : "doing"));
    if (r.jobId) return {
      ok: true, jobs: [r.jobId],
      summary: r.phase.kind === "analyze"
        ? L(`Analyse de la fiche de départ lancée (1re partie, quelques minutes, au plus ${r.maxPct ?? "?"} % du budget). Ensuite : la recherche web et les 5 angles.`, "Brief analysis started.")
        : L(`Recherche web et 5 angles marketing lancés (quelques minutes, au plus ${r.maxPct ?? "?"} % du budget).`, "Research started."),
    };
    if (r.phase.kind === "questions") return { ok: false, summary: L(`Avant la recherche, il manque des informations : pose ces questions au client une par une, enregistre ses réponses avec pilot.answer, puis rappelle angles.propose. ${[...r.phase.questions.map((q) => `[${q.id}] ${q.question}`), ...r.phase.missing].join(" ; ")}`, "Questions to ask first."), data: { questions: r.phase.questions, manquant: r.phase.missing } };
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
