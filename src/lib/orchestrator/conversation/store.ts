import { HttpError, ownedProject, type User } from "../../auth";
import { all, id, json, now, one, run, tx } from "../../db";
import { loadProject } from "../../projects";
import { pendingSubscriptions } from "../../project-billing";
import { requirePlan } from "../../plan-gates";
import { initialize } from "../../preparation/engine";
import { analyzeLocally } from "../../preparation/brief";
import { stateOf } from "../../preparation/store";
import { commitState, draft } from "../../preparation/store";
import { sameCreationInput,sameServiceData } from "./creation";
import { emptyServiceProfile,emptyProduct } from "../../project-types";
import {stableHash} from "../../brain/hash";
import { L, setProjectContentLang } from "../../i18n-server";
import { identifyProject } from "../../access-scope";
import type { Brief, Input } from "../../preparation/types";
import type { ConversationRow, ConversationState } from "./contract";

export function assertConversationEnabled() {
  if (process.env.STUDIO_CONVERSATION_LOT_A !== "1") throw new HttpError(404, L("Parcours indisponible.", "Workflow unavailable."), "conversation_disabled");
}
export function emptyInput(): Input {
  return { description: "", offerName: "", brandName: "", target: "", constraints: "", business: "products", photoIds: [], referenceUrls: [], price: "", services: emptyServiceProfile() };
}
export function metaOf(c: ConversationRow): ConversationState {
  return JSON.parse(c.state_json) as ConversationState;
}
export function ownedConversation(user: User, conversationId: string): ConversationRow {
  assertConversationEnabled();
  const c = one<ConversationRow>("SELECT * FROM agent_conversations WHERE id=? AND user_id=?", conversationId, user.id);
  if (!c) throw new HttpError(404, L("Conversation introuvable.", "Conversation not found."), "conversation_not_found");
  if (c.project_id) {
    ownedProject(user, c.project_id);
    identifyProject(c.project_id);
    setProjectContentLang(loadProject(c.project_id).settings.language);
  }
  return c;
}
export function currentBrief(c: ConversationRow): { brief: Brief; revision: number | null; status:"draft"|"approved"|"stale" } {
  if (!c.project_id) return { brief: structuredClone(metaOf(c).draft!), revision: null, status:"draft" };
  const s = stateOf(c.project_id);
  if (!s?.stages.brief) throw new HttpError(409, L("La fiche du projet est absente. Reprenez la préparation.", "The project brief is missing. Resume preparation."), "conversation_brief_missing");
  return { brief: structuredClone(s.stages.brief.data), revision: s.revision, status:s.stages.brief.status };
}
function metadata(draft: Brief | null, existing: boolean): ConversationState {
  return { schemaVersion: 1, draft, business: existing ? draft?.input.business ?? null : null, businessSource: existing ? "existing" : "unknown", deferred: [], answeredOrder: [] };
}
export function draftOf(user: User): ConversationRow | null {
  assertConversationEnabled();
  return one<ConversationRow>("SELECT * FROM agent_conversations WHERE user_id=? AND project_id IS NULL", user.id) ?? null;
}
export function openDraft(user: User) {
  assertConversationEnabled();
  // Découverte reste en lecture seule : aucun projet ni droit de création ne naît de ce brouillon.
  if (!pendingSubscriptions(user.id).length) throw new HttpError(402, L("Un abonnement payé en attente de projet est nécessaire pour préparer ce démarrage.", "A paid subscription awaiting a project is required to prepare this start."), "subscription_required");
  return tx(() => {
    const previous = draftOf(user);
    if (previous) return previous;
    const cid = id(), t = now();
    run("INSERT INTO agent_conversations (id,user_id,state_json,created_at,updated_at) VALUES (?,?,?,?,?)", cid, user.id, JSON.stringify(metadata(analyzeLocally(emptyInput()), false)), t, t);
    return ownedConversation(user, cid);
  });
}
export function projectConversation(user: User, projectId: string) {
  assertConversationEnabled(); ownedProject(user, projectId);
  const c = one<ConversationRow>("SELECT * FROM agent_conversations WHERE project_id=? AND user_id=?", projectId, user.id);
  return c ? ownedConversation(user, c.id) : null;
}
function hasAcquiredData(p:ReturnType<typeof loadProject>){
  return stableHash("conversation-empty-product",p.product)!==stableHash("conversation-empty-product",emptyProduct()) || Object.keys(json(p.row.brand_json,{})).length>0 || Object.keys(json(p.row.strategy_json,{})).length>0 || p.catalog.length || p.sources.length || p.row.current_theme_version_id || one("SELECT 1 FROM theme_versions WHERE project_id=? LIMIT 1",p.id) || one("SELECT 1 FROM jobs WHERE project_id=? LIMIT 1",p.id) || one("SELECT 1 FROM assets WHERE project_id=? LIMIT 1",p.id) || one("SELECT 1 FROM ai_calls WHERE project_id=? LIMIT 1",p.id);
}
/** Rattachement seulement à un projet vide, déjà créé par le système d'abonnement existant. */
export function openProjectConversation(user: User, projectId: string, draftId?: string, draftRevision?: number) {
  assertConversationEnabled(); ownedProject(user, projectId); requirePlan(user, projectId); identifyProject(projectId);
  return tx(() => {
    const existing = projectConversation(user, projectId);
    if (existing) {
      if (draftId && existing.id !== draftId) throw new HttpError(409, L("Ce projet a déjà sa conversation.", "This project already has its conversation."), "conversation_exists");
      return existing;
    }
    const p = loadProject(projectId), s = stateOf(projectId);
    if (draftId) {
      const c = ownedConversation(user, draftId), m = metaOf(c);
      if (c.revision !== draftRevision) throw new HttpError(409, L("Le brouillon a changé. Relisez-le avant son rattachement.", "The draft changed. Read it again before linking."), "conversation_conflict");
      if (c.project_id || !m.draft || !m.business || !m.draft.input.description.trim()) throw new HttpError(409, L("Précisez l’activité du brouillon avant son rattachement.", "Clarify the draft activity before linking it."), "conversation_draft_incomplete");
      const nativeStart = !!s && s.revision===1 && Object.keys(s.stages).length===1 && s.stages.brief?.status==="draft" && s.stages.brief.data.provenance==="local" && !s.pending && sameCreationInput(s.stages.brief.data.input,m.draft.input) && sameServiceData(p.services,m.draft.services);
      if ((!nativeStart && (s || p.services.services.length || p.services.email || p.services.phone || p.services.address || p.services.bookingUrl)) || p.business!==m.business || hasAcquiredData(p))
        throw new HttpError(409, L("Ce projet contient déjà des données. Son contenu reste conservé ; le brouillon ne le remplace pas.", "This project already contains data. Its content is preserved; the draft does not replace it."), "conversation_project_not_empty");
      if(!s)initialize(projectId, m.draft.input);
      // Import du même Brief natif, y compris réponses et inconnues ; aucune approbation ou analyse supplémentaire.
      commitState(projectId, stateOf(projectId)!.revision, state => draft(state,"brief",structuredClone(m.draft!)));
      m.draft = null;
      run("UPDATE agent_conversations SET project_id=?,state_json=?,updated_at=? WHERE id=?", projectId, JSON.stringify(m), now(), c.id);
      return ownedConversation(user, c.id);
    }
    if (!s) {
      if(hasAcquiredData(p) || p.services.services.length || p.services.email || p.services.phone)
        throw new HttpError(409,L("La migration de ce projet existant n’est pas raccordée au lot A. Son parcours reste intact.","Migration of this existing project is not connected in lot A. Its workflow remains intact."),"conversation_migration_unavailable");
      const input = { ...emptyInput(), business: p.business, offerName: p.product.name, description: p.product.summary, services: p.services };
      initialize(projectId, input);
    }
    const cid = id(), t = now(), brief = stateOf(projectId)!.stages.brief!.data;
    const m = metadata(brief, !!s || !!brief.input.description);
    m.draft = null;
    run("INSERT INTO agent_conversations (id,user_id,project_id,state_json,created_at,updated_at) VALUES (?,?,?,?,?,?)", cid, user.id, projectId, JSON.stringify(m), t, t);
    return ownedConversation(user, cid);
  });
}
export function turnsOf(c: ConversationRow, before?: number) {
  const rows = all<{ revision: number; request_json: string; response_json: string; created_at: number }>(
    "SELECT revision,request_json,response_json,created_at FROM agent_conversation_turns WHERE conversation_id=? AND revision < ? ORDER BY revision DESC LIMIT 41", c.id, before ?? c.revision + 1,
  );
  const more = rows.length > 40;
  const visible = rows.slice(0, 40).reverse();
  return { history: visible.map(r => ({ revision: r.revision, request: json(r.request_json, {}), message: json<{ message: string }>(r.response_json, { message: "" }).message, at: r.created_at })), historyBefore: more ? visible[0].revision : null };
}
