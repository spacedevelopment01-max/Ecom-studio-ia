/**
 * Étape « Les angles » du parcours SINA (lot 3, 16 novembre 2026) : proposer les trois angles, puis enregistrer celui
 * que le client choisit. Une seule façon de faire : la chaîne de `angles-chain.ts` (trois stratèges séparées, un juge
 * à part, un lecteur qui ne sait rien), en tâche de fond. Un seul accord du client pour toute l'étape.
 */
import { z } from "zod";
import { enqueue, pendingJob } from "../../jobs";
import { L } from "../../i18n-server";
import type { AgentTool, ToolContext } from "../types";
import { journeyOf, setStep, updateJourney } from "../journey";
import { brandStudyOf, chooseAngle, type SinaAngles } from "../angles";
import { ANGLE_ROLE_LABEL, roleOf, shownAngles } from "../angle-roles";
import { MIN_QUOTES, SINA_ANGLES_JOB, anglesQuote } from "../angles-chain";
import { project } from "./common";

/**
 * Ce que SINA dit de ses angles après leur relecture : un angle dont elle doute est montré avec son doute, à la
 * première personne ; ce qu'elle n'a pas pu vérifier est dit aussi. Jamais « le juge », jamais « la stratège ».
 */
export function anglesDoubtHint(angles: SinaAngles): string {
  const doubts = shownAngles(angles).filter((a) => a.doubt);
  const out: string[] = [];
  if (doubts.length) out.push(`Tu doutes de ${doubts.length > 1 ? "ces angles" : "cet angle"} et tu le dis franchement au client, à la première personne, sans jamais parler de juge ni de relecteur : ${doubts.map((a) => `« ${a.title} » (${a.doubt})`).join(" ; ")}. Propose-lui de le reprendre s'il le veut. Le choix reste le sien.`);
  if (angles.issues?.length) out.push(`À dire honnêtement au client, en mots simples : ${angles.issues.join(" ; ")}`);
  return out.length ? ` ${out.join(" ")}` : "";
}

/** Ce que SINA lit de ses trois angles (les cartes sont affichées au client par le fil). */
function readyResult(angles: SinaAngles) {
  const shown = shownAngles(angles), role = (id: string) => { const r = roleOf(angles, id); return r ? `${ANGLE_ROLE_LABEL[r].fr.toLowerCase()} ` : ""; };
  const recommended = shown.find((a) => a.id === angles.recommendedId);
  return {
    ok: true,
    summary: L(`${shown.length} angles prêts : ${shown.map((a) => `${role(a.id)}« ${a.title} »`).join(" ; ")}.${recommended ? ` Recommandé : « ${recommended.title} ».` : ""}`, "Angles ready."),
    hint: `Identifiants pour angles.choose : ${shown.map((a) => `${a.id} = « ${a.title} »`).join(" ; ")}.${angles.reserve?.length ? ` ${angles.reserve.length} autre(s) angle(s) gardé(s) restent en réserve pour ses publications et ses publicités : ne les propose pas comme choix.` : ""}${anglesDoubtHint(angles)}`,
    data: { angles: shown.map((a) => ({ id: a.id, role: roleOf(angles, a.id), titre: a.title, client: a.client?.name, personne: a.person ?? a.audience, accroche: a.message, emotion: a.emotion, promesse: a.promise, aConfirmer: a.proofsToConfirm, ...(a.doubt ? { doute: a.doubt } : {}) })), recommande: angles.recommendedId, pourquoi: angles.recommendation },
  };
}

type ProposeArgs = { redo?: string };
/** Les trois angles sont-ils à créer (payant), ou déjà prêts (lecture gratuite) ? */
const toCreate = (ctx: ToolContext, a: ProposeArgs | undefined) => { const j = journeyOf(ctx.conversationId); return { j, create: !j.angles?.shown?.length || !!a?.redo }; };

const proposeTool: AgentTool<ProposeArgs> = {
  name: "angles.propose", module: "stratégie", kind: "generate", needsProject: true,
  description: "Étape des angles : crée les TROIS angles marketing du client, pour TROIS TYPES DE CLIENTS différents (un sûr, un d'émotion, un audacieux), chacun écrit comme une scène (qui, quand, avant, après), avec son accroche, le haut du site en mots et une publication d'exemple. Tu pars de ce que tu sais : ses faits, sa marque, ton étude de son marché (paroles réelles d'acheteurs, concurrents) ; tu ne retournes écouter le web que s'il te manque des paroles d'acheteurs. Tu relis chaque angle sévèrement avant de le montrer. Tâche de fond de quelques minutes. Payant : le Studio montre le prix (carte d'accord) avant de lancer ; un seul accord pour toute l'étape. Angles prêts : rappeler cet outil sans argument les relit gratuitement. redo = sa demande, avec SES mots, pour une NOUVELLE proposition (payant ; les angles déjà montrés ne sont pas refaits).",
  args: z.object({ redo: z.string().min(8).max(1500).optional() }).strict(),
  estimate: (ctx, a) => {
    const { j, create } = toCreate(ctx, a);
    // Lire des angles prêts est gratuit et ne demande jamais d'accord.
    if (!create) return { maxMicro: 0, label: L("lecture de tes angles", "reading your angles") };
    const listen = (brandStudyOf(j)?.quotes.length ?? 0) < MIN_QUOTES;
    return { ...anglesQuote({ listen }), label: a?.redo ? L("3 nouveaux angles marketing", "3 new marketing angles") : L("tes 3 angles marketing", "your 3 marketing angles") };
  },
  preview: (_ctx, a) => (a.redo ? L("Trois nouveaux angles, d'après ta demande.", "Three new angles, as you asked.") : L("Tes trois angles : un sûr, un d'émotion, un audacieux.", "Your three angles: a safe one, an emotional one, a bold one.")),
  run: (ctx, a) => {
    const p = project(ctx);
    const { j, create } = toCreate(ctx, a);
    if (j.steps[3]?.status !== "done") return { ok: false, summary: L("La marque doit être validée avant les angles.", "Validate the brand first.") };
    if (pendingJob(p.id, SINA_ANGLES_JOB)) return { ok: false, summary: L("Tes angles sont déjà en cours de création : attends-les.", "Your angles are already being created.") };
    if (!create) return readyResult(j.angles!);
    if (j.steps[4]?.status === "done" && !a.redo) return { ok: false, summary: L("L'angle est déjà choisi.", "The angle is already chosen."), hint: "Pour en changer : angles.choose avec un autre des trois angles, ou une nouvelle proposition (angles.propose avec redo = les mots du client)." };
    const quote = anglesQuote(), round = (j.angles?.round ?? 0) + 1;
    const job = enqueue({
      userId: ctx.user.id, projectId: p.id, type: SINA_ANGLES_JOB, label: L("3 angles marketing (SINA)", "3 marketing angles (SINA)"),
      payload: { projectId: p.id, conversationId: ctx.conversationId, capMicro: quote.maxMicro, ...(a.redo ? { guidance: a.redo } : {}) },
      maxAttempts: 1, idempotencyKey: `syna:${ctx.runId}:angles:${round}`,
    });
    updateJourney(ctx.conversationId, (x) => setStep(x, 4, "doing"));
    return { ok: true, jobs: [job.id], data: {}, summary: L("Création de tes trois angles lancée (quelques minutes : je relis ce que disent tes acheteurs, j'écris les angles, puis je les relis un par un). Je reprends quand c'est prêt.", "Creating your three angles (a few minutes).") };
  },
};

const chooseTool: AgentTool<{ angleId: string }> = {
  name: "angles.choose", module: "stratégie", kind: "write", needsProject: true,
  description: "Étape des angles : enregistre l'angle CHOISI PAR LE CLIENT (jamais à sa place), parmi les trois montrés : angleId = sur, emotion ou audacieux. Il devient l'angle principal : le fil conducteur de son site, de ses publications et de ses publicités. Les autres angles gardés restent en réserve pour ses publications et ses publicités. Il peut changer d'avis plus tard en en choisissant un autre. Gratuit.",
  args: z.object({ angleId: z.string().min(1).max(40) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    const choosable = j.angles ? shownAngles(j.angles) : [];
    const angle = choosable.find((x) => x.id === a.angleId);
    if (!angle) return { ok: false, summary: L(`Angle inconnu : ${a.angleId} ; choisis parmi ${choosable.map((x) => x.id).join(", ") || "(aucun angle encore)"}.`, "Unknown angle.") };
    const r = chooseAngle(p.id, j, angle.id, `syna-${ctx.runId}-angle-${j.angles?.round ?? 1}-${angle.id}`);
    if (r.ok) updateJourney(ctx.conversationId, (x) => { x.angleChoice = { id: angle.id, ids: [angle.id], at: Date.now() }; setStep(x, 4, "done"); if (x.steps[5]?.status !== "done") setStep(x, 5, "todo"); });
    return {
      ok: r.ok,
      summary: r.ok
        ? L(`Angle choisi : « ${angle.title} ». L'étape des angles est validée. Prochaine étape : l'activité.`, "Angle chosen.")
        : L(`L'angle n'a pas pu être enregistré${r.error ? ` (${r.error})` : ""}.`, "The angle could not be saved."),
      ...(r.ok && angle.proofsToConfirm.length ? { hint: `Cet angle a des informations à confirmer : ${angle.proofsToConfirm.join(" ; ")}. Demande-les au client quand tu en auras besoin (une à la fois) ; rien de cela n'est écrit sans sa réponse.` } : {}),
      changes: [{ module: "stratégie", object: L("angle marketing", "marketing angle"), summary: angle.title, after: [angle.id], verified: r.ok }],
    };
  },
};

export const angleTools: AgentTool[] = [proposeTool, chooseTool];
