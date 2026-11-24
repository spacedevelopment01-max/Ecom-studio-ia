/**
 * Les deux boutons du message posé par le Studio quand des planches sont incomplètes (`devants.ts`) :
 * - « Oui, finis-les » ouvre la carte d'accord habituelle (« À ma charge : 0 % de ton budget ») par le même chemin que si
 *   SINA l'avait proposé (devis, carte, puis l'accord du client lance la reprise) : d'abord le logo qui manque, par la
 *   méthode des graphistes (`logo.pistes` pour cette planche), puis le reste par `identity.images` ;
 * - « Plus tard » note le refus de cet état des planches : la ligne prioritaire ne revient plus tant que rien ne change.
 * Aucun appel à l'IA ici.
 */
import { HttpError, type User } from "../auth";
import { id as newId, one, tx } from "../db";
import { L } from "../i18n-server";
import { requirePlan } from "../plan-gates";
import { activeRun, addMessage, createRun, updateRun, type SynaRun } from "./store";
import { journeyOf } from "./journey";
import { getTool } from "./registry";
import { prixJuste } from "./travaux";
import { askConfirmation, threadView, toolContext } from "./loop";
import { boutonsDuMessage, empreinteDuManque, groupesAFinir, logosAFinir, noterRefus, planchesAFinir, pronomDuManque, repriseEnCours } from "./devants";

function conversation(user: User, cid: string) {
  const c = one<{ user_id: string; project_id: string | null }>("SELECT user_id, project_id FROM agent_conversations WHERE id=?", cid);
  if (!c || c.user_id !== user.id) throw new HttpError(404, L("Conversation introuvable.", "Conversation not found."));
  if (!c.project_id) throw new HttpError(409, L("Aucun projet n'est rattaché à ce fil.", "No project is linked to this thread."));
  requirePlan(user, c.project_id);
  return { projectId: c.project_id };
}

/** Ce qui manque doit être celui que le message disait : sinon le fil a changé, l'écran se relit. */
function etatAJour(cid: string, empreinte: string) {
  const list = planchesAFinir(journeyOf(cid));
  if (!list.length || empreinteDuManque(list) !== empreinte) throw new HttpError(409, L("Tes planches ont changé depuis ce message. Relis la conversation.", "Your boards changed since this message. Reload the conversation."), "devants_obsolete");
  return list;
}

export async function accepterLaProposition(user: User, cid: string, empreinte: string) {
  const { projectId } = conversation(user, cid);
  const list = etatAJour(cid, empreinte);
  if (repriseEnCours(cid, projectId)) throw new HttpError(409, L("Je finis déjà tes planches : je te les montre dès qu'elles sont prêtes.", "I'm already finishing your boards."), "devants_en_cours");
  // Le logo qui manque d'abord (une planche à la fois, par la méthode des graphistes) ; sinon une reprise des images, qui
  // refait les mêmes images sur chaque planche demandée : le plus grand groupe d'abord, les autres ensuite.
  const sansLogo = logosAFinir(list), g = groupesAFinir(list)[0];
  const tool = getTool(sansLogo.length ? "logo.pistes" : "identity.images")!;
  const args = tool.args.parse(sansLogo.length ? { planche: sansLogo[0] } : { keys: g.keys, images: g.images });
  const r: SynaRun = tx(() => {
    const current = activeRun(cid);
    if (current && current.status !== "waiting_jobs" && current.status !== "waiting_confirmation") throw new HttpError(409, L("SINA travaille encore sur ta demande précédente. Attends sa réponse ou arrête-la.", "SINA is still working on your previous request. Wait or stop it."), "syna_busy");
    if (current?.status === "waiting_confirmation") { updateRun(current.id, { status: "cancelled", pending_json: null }); addMessage(cid, "event", { kind: "pending_dropped", runId: current.id }, current.id); }
    const run = createRun({ conversationId: cid, userId: user.id, projectId, requestId: `devants:${newId()}` });
    const b = boutonsDuMessage(pronomDuManque(list));
    addMessage(cid, "user", { text: L(b.oui.fr, b.oui.en), attachments: [] }, run.id);
    return run;
  });
  const ctx = toolContext(user, r);
  const est = prixJuste(tool.name, await tool.estimate!(ctx, args));
  // Jamais une carte payante par ce bouton : c'est une reprise du travail de SINA, à sa charge.
  if (!est.studio) { updateRun(r.id, { status: "cancelled" }); throw new HttpError(409, L("Tes planches ont changé depuis ce message. Relis la conversation.", "Your boards changed since this message. Reload the conversation."), "devants_obsolete"); }
  await askConfirmation(r, tool, args, ctx, "cost", est.maxMicro, est);
  return threadView(user, cid);
}

export function refuserLaProposition(user: User, cid: string, empreinte: string) {
  conversation(user, cid);
  const list = etatAJour(cid, empreinte);
  noterRefus(cid);
  addMessage(cid, "user", { text: L(boutonsDuMessage(pronomDuManque(list)).plusTard.fr, "Later"), attachments: [] }, null);
  return threadView(user, cid);
}
