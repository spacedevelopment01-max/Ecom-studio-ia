import {conversationBlogEnabled,conversationBrandReviewEnabled} from './tool-flags';
/** Une conversation dans l'orchestrateur : interpréter/proposer ≠ autoriser/exécuter un outil. */
import { HttpError, type User } from "../../auth";
import { id, json, now, one, run, tx, readSnapshot } from "../../db";
import { stableHash } from "../../brain/hash";
import { remember } from "../../projects";
import { pendingSubscriptions } from "../../project-billing";
import { requirePlan } from "../../plan-gates";
import { L } from "../../i18n-server";
import { redact } from "../../redact";
import { understand, type IntentClassifier } from "../intent";
import { normalizeRequest, requestScope } from "../request";
import type { Brief } from "../../preparation/types";
import { explicitGoals, nextQuestion, proposedBusiness, providedTarget, questionFor } from "./questions";
import { CommandSchema, EDIT_FIELDS, type ActionCard, type Command, type ConversationRow, type ConversationState, type ConversationView, type QuestionKey } from "./contract";
import { assertBriefWritable, nativeAnalysisQuote, quoteCard, saveBrief, writeFact, type NativeQuote } from "./tools";
import { currentBrief, metaOf, ownedConversation, turnsOf } from "./store";
import { creationFields } from "./creation";
import { intelligenceEnabled, intelligenceView } from "./intelligence";
import { applyCognitiveCommand } from "./intelligence-commands";
import {clearConversationAnswer} from './answer-state';
import {activeContextEnabled,resolveActiveContext,observedActiveContext} from './active-context';
import {studioKnowledgeEnabled,captureStudioObservation} from './studio-observation';
import {studioOperationCatalogue} from './studio-operations';
import {conversationToolsEnabled,conversationThemeToolsEnabled,conversationExportsEnabled,conversationRenderEnabled,conversationResearchEnabled,conversationBrandEnabled,conversationCatalogueEnabled,conversationImagesEnabled,conversationLogosEnabled,conversationVideosEnabled,conversationVideoGenerationEnabled,conversationVideoVoiceEnabled,conversationVideoClipEnabled,conversationSocialEnabled,conversationContentEnabled} from './tool-flags';
import {strategyChoicesEnabled,strategyChoicesView,applyStrategyChoice} from "./strategy-choices";
export { openDraft, draftOf, openProjectConversation, projectConversation, assertConversationEnabled } from "./store";
export { CommandSchema } from "./contract";

/** Injection serveur uniquement pour les preuves avec faux fournisseurs, jamais une option de la requête HTTP. */
export type TestDependencies = { classify?: IntentClassifier; quote?: (projectId: string, correction: string) => NativeQuote };
function effective(c: ConversationRow) {
  const { brief, revision, status } = currentBrief(c), meta = metaOf(c);
  if (c.project_id && meta.business) meta.business = brief.input.business;
  // Objectifs déjà exprimés dans la description : les lire sans imposer une seconde saisie.
  if (!intelligenceEnabled() && !brief.profile.facts.some(f => f.key === "conversation.goals")) {
    const goals = explicitGoals(brief.input.description, meta.business);
    if (goals.length) writeFact(brief, "conversation.goals", L("Objectifs indiqués", "Stated goals"), goals.map(c => c.label).join(" ; "));
  }
  return { brief, revision, meta, status };
}
export function conversationView(user: User, cid: string, before?: number,includeStudioHelp=true): ConversationView {
 const {view,c,readOnlyReason}=readSnapshot(()=>{
  const c = ownedConversation(user, cid), { brief: b, revision, meta: m, status } = effective(c);
  const key = nextQuestion(b, m);
  let readOnlyReason:string|null=null;
  if(c.project_id){try{assertBriefWritable(c,user,revision);}catch(e){if(!(e instanceof HttpError))throw e;readOnlyReason=e.message;}}
  else if(!pendingSubscriptions(user.id).length)readOnlyReason=L("Rattachez le brouillon à votre projet pour le poursuivre.","Link the draft to your project to continue.");
  const view: ConversationView = {
    schema: "studio-conversation-1", id: c.id, projectId: c.project_id, revision: c.revision, projectRevision: revision, mode: "local",
    progress: !b.input.description ? "describe" : !m.business ? "clarify" : key ? "collect" : "review",
    message: !b.input.description ? L("Décrivez votre projet en quelques mots. Vous pouvez joindre un lien ; aucune création n’est lancée.", "Describe your project in a few words. You may add a link; no creation is started.") : L("Compréhension locale à relire. Vos réponses sont conservées ; aucune étape n’est validée automatiquement.", "Local understanding to review. Your answers are kept; no step is automatically approved."),
    question: key ? questionFor(key, b, m) : null, correctionFields: readOnlyReason?[]:[...EDIT_FIELDS],readOnlyReason,
    creation: c.project_id ? null : creationFields(b,m),
    ...(activeContextEnabled()?{activeContext:{enabled:true as const,current:observedActiveContext(c,m.activeContext)}}:{}),
    ...(c.project_id&&conversationToolsEnabled()?{execution:{enabled:true as const}}:{}),
    ...(c.project_id&&conversationContentEnabled()?{contentExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&conversationThemeToolsEnabled()?{themeExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&conversationExportsEnabled()?{exportExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&conversationRenderEnabled()?{renderExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&conversationBrandEnabled()?{brandExecution:{enabled:true as const,...(conversationBrandReviewEnabled()?{review:true as const}:{})}}:{}),
    ...(c.project_id&&conversationResearchEnabled()?{researchExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&conversationCatalogueEnabled()?{catalogueExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&conversationImagesEnabled()?{imageExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&conversationSocialEnabled()?{socialExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&conversationVideosEnabled()?{videoExecution:{enabled:true as const,...(conversationVideoGenerationEnabled()?{generation:true as const}:{}),...(conversationVideoVoiceEnabled()?{voice:true as const}:{}),...(conversationVideoClipEnabled()?{clip:true as const}:{})}}:{}),
    ...(c.project_id&&conversationLogosEnabled()?{logoExecution:{enabled:true as const}}:{}),
    tools: [{id:"brief.update",state:readOnlyReason?"unavailable":"available",executionEnabled:!readOnlyReason},{id:"understand-offer",state:!readOnlyReason&&c.project_id&&m.business&&b.input.description?"quote_only":"unavailable",executionEnabled:false},...(["research","brand","logo","theme","products","images","videos","seo","blog","ads","social","calendar","appointments","export","render","publish","delete","purchase"] as const).map(id=>({id,state:(id==="blog"&&conversationBlogEnabled()||id==="ads"&&conversationSocialEnabled()||id==="brand"&&conversationBrandEnabled()||id==="seo"&&conversationContentEnabled()||id==="theme"&&conversationThemeToolsEnabled()||id==="export"&&conversationExportsEnabled()||id==="render"&&conversationRenderEnabled()||id==="research"&&conversationResearchEnabled()||id==="products"&&conversationCatalogueEnabled()||id==="images"&&conversationImagesEnabled()||id==="logo"&&conversationLogosEnabled()||id==="videos"&&conversationVideosEnabled()||(id==="social"||id==="calendar")&&conversationSocialEnabled())?"quote_only" as const:"not_connected" as const,executionEnabled:false}))],
    summary: { description: b.input.description, business: m.business, businessSource: m.businessSource, target: b.input.target, goals: b.profile.facts.find(f => f.key === "conversation.goals" && f.status === "confirmed")?.value ?? "", offerName: b.input.offerName, brandName: b.input.brandName,
      constraints: b.input.constraints, services: b.services.services.map(s=>({name:s.name,description:s.description,source:s.source??"analysis"})), contactModes: b.services.contactModes??[],
      facts: b.profile.facts.filter(f => f.source === "user").map(({ key, label, value, status, source }) => ({ key, label, value, status, source })),
      unknown: [...new Set([...b.missing, ...m.deferred.map(k => questionFor(k, b, m).title), ...b.profile.facts.filter(f => f.status === "unknown").map(f => f.label)])],
      referenceUrls: b.input.referenceUrls, photoIds: b.input.photoIds, approved: status==="approved", preparationStatus:status },
    action: null, ...turnsOf(c, before),
  };
  if (intelligenceEnabled()) {
    view.mode = 'ai'; view.question = null; view.intelligence = intelligenceView(c);
    view.message = view.intelligence.message;
    view.progress = !b.input.description ? 'describe' : m.business ? 'collect' : 'clarify';
  }
  if(c.project_id&&strategyChoicesEnabled())view.strategyChoices=strategyChoicesView(c,m);
  return {view,c,readOnlyReason};
 });
 // Ce relevé possède sa transaction native et peut régulariser une période budgétaire.
 // Il reste hors du snapshot de lecture pour ne pas tenter de convertir un ancien lecteur WAL en écrivain.
 if(includeStudioHelp&&studioKnowledgeEnabled())view.studioHelp={observation:captureStudioObservation(c),capabilities:studioOperationCatalogue(c.project_id,!readOnlyReason)};
 return view;
}
function setUnknown(b: Brief, m: ConversationState, key: QuestionKey) {
  const factKey = `conversation.${key}`;
  const label = questionFor(key, b, m).title;
  b.profile.facts = [...b.profile.facts.filter(f => f.key !== factKey), { key: factKey, label, value: "", status: "unknown", source: "user", later: true }];
  clearConversationAnswer(b,m,key);
  m.deferred = [...new Set([...m.deferred, key])];
}
function answer(b: Brief, m: ConversationState, cmd: Extract<Command, { action: "answer" }>) {
  const card = questionFor(cmd.question, b, m);
  if (!card.multiple && cmd.choices.length > 1) throw new HttpError(400, L("Choisissez une seule réponse pour cette question.", "Choose one answer for this question."));
  if (new Set(cmd.choices).size !== cmd.choices.length || cmd.choices.some(id => !card.choices.some(c => c.id === id))) throw new HttpError(400, L("Choix inconnu pour cette question.", "Unknown choice for this question."));
  if (cmd.unknown && (cmd.choices.length || cmd.text)) throw new HttpError(400, L("Choisissez une réponse ou « Je ne sais pas encore ».", "Choose an answer or 'I do not know yet'."));
  if (cmd.unknown) setUnknown(b, m, cmd.question);
  else {
    if (!cmd.text && (!cmd.choices.length || cmd.choices.includes("other"))) throw new HttpError(400, L("Précisez votre réponse avec vos mots.", "Specify your answer in your own words."));
    const text = [...card.choices.filter(c => cmd.choices.includes(c.id) && c.id !== "other").map(c => c.label), cmd.text].filter(Boolean).join(" ; ");
    if (text.length > 1200) throw new HttpError(400, L("Réponse trop longue ; rien n’a été tronqué.", "Answer is too long; nothing was truncated."));
    if (cmd.question === "business") {
      const kind = cmd.choices.find(c => c === "products" || c === "services") ?? proposedBusiness(cmd.text);
      if (!kind) throw new HttpError(409, L("Je ne sais pas encore s’il s’agit de produits ou de services. Précisez ce que vous proposez ; rien n’est supposé.", "I cannot yet tell whether these are products or services. Clarify what you offer; nothing is assumed."), "conversation_clarification");
      if (m.business && m.business !== kind) {
        setUnknown(b, m, "goals"); m.deferred = m.deferred.filter(k => k !== "goals");
      }
      m.business = b.input.business = kind as "products" | "services"; m.businessSource = "client";
    }
    if (cmd.question === "target") b.input.target = text;
    writeFact(b, `conversation.${cmd.question}`, card.title, text);
    if (cmd.question === "goals" && m.business === "services") {
      const modes = ["quote", "booking"].filter(k => cmd.choices.includes(k)) as ("quote" | "booking")[];
      if (modes.length) {
        b.input.services.contactMode = b.services.contactMode = modes[0];
        b.input.services.contactModes = [...modes]; b.services.contactModes = [...modes];
      }
    }
    m.deferred = m.deferred.filter(k => k !== cmd.question);
  }
  m.answeredOrder = [...m.answeredOrder.filter(k => k !== cmd.question), cmd.question];
  delete m.editing;
}
function validateSources(user: User, c: ConversationRow, cmd: Extract<Command, { action: "message" }>, b: Brief) {
  const urls = cmd.referenceUrls ?? [];
  for (const u of urls) {
    const url = new URL(u);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new HttpError(400, L("Lien HTTP(S) sans identifiant attendu.", "An HTTP(S) link without credentials is expected."));
  }
  const allUrls = [...new Set([...b.input.referenceUrls, ...urls])];
  if (allUrls.length > 12) throw new HttpError(400, L("Douze liens au maximum ; aucun lien n’a été ignoré.", "At most twelve links; no link was ignored."));
  if (cmd.photoIds?.length && !c.project_id) throw new HttpError(409, L("L’ajout de photos avant création n’est pas raccordé. Après rattachement, utilisez les photos du projet ; aucun autre média n’est substitué.", "Photo upload before creation is not connected. After linking, use project photos; no other media is substituted."), "conversation_draft_upload_unavailable");
  for (const assetId of cmd.photoIds ?? []) if (!one("SELECT 1 FROM assets WHERE id=? AND project_id=? AND user_id=? AND kind='image' AND origin='upload' AND deleted_at IS NULL AND status!='rejected'", assetId, c.project_id, user.id)) throw new HttpError(404, L("Photo introuvable.", "Photo not found."));
  const photos = [...new Set([...b.input.photoIds, ...(cmd.photoIds ?? [])])];
  if (photos.length > 12) throw new HttpError(400, L("Douze photos au maximum ; aucune photo n’a été ignorée.", "At most twelve photos; no photo was ignored."));
  b.input.referenceUrls = allUrls; b.input.photoIds = photos;
}
function unavailable(tool: string, message: string, c: ConversationRow): ActionCard {
  return { kind: "action", tool, state: "unavailable", executed: false, message, ...(c.project_id ? { href: `/studio/${c.project_id}/pilote` } : {}) };
}
/** Cette API n'accepte aucun plan, rôle, permission, coût accepté ou nom d'exécuteur fournis par le client. */
export async function submitConversation(user: User, cid: string, raw: unknown, tests: TestDependencies = {}): Promise<ConversationView> {
  const cmd = CommandSchema.parse(raw);
  if (["answer-ai", "accept-ai-changes", "back-ai"].includes(cmd.action) && !intelligenceEnabled()) throw new HttpError(404, "conversation_ai_disabled");
  if (redact(JSON.stringify(cmd)) !== JSON.stringify(cmd)) throw new HttpError(400, L("Ne saisissez pas de clé ou de jeton dans la conversation. Utilisez les réglages sécurisés du Studio.", "Do not enter a key or token in the conversation. Use the Studio's secure settings."), "conversation_secret");
  const hash = stableHash("conversation-request-1", cmd);
  // Propriété et reprise contrôlées AVANT même un classificateur simulé ; recontrôle atomique après l'await.
  const initial=ownedConversation(user, cid);
  const received = one<{request_hash:string;response_json:string}>("SELECT request_hash,response_json FROM agent_conversation_turns WHERE conversation_id=? AND request_id=?", cid, cmd.requestId);
  if (received) {
    if (received.request_hash !== hash) throw new HttpError(409, L("Cet identifiant correspond à une autre demande.", "This identifier belongs to another request."), "conversation_idempotency_conflict");
    return JSON.parse(received.response_json) as ConversationView;
  }
  if(initial.project_id)requirePlan(user,initial.project_id);
  else if(!pendingSubscriptions(user.id).length)throw new HttpError(402,L("Rattachez ce brouillon à votre projet avant de le poursuivre.","Link this draft to your project before continuing."),"subscription_required");
  if(initial.revision!==cmd.revision || currentBrief(initial).revision!==cmd.projectRevision)throw new HttpError(409,L("La conversation ou la fiche a changé. Rechargez avant de répondre.","The conversation or brief changed. Reload before answering."),initial.revision!==cmd.revision?"conversation_conflict":"conversation_brief_conflict");
  // Réutilisation de l'Intent Engine ; pas de classificateur ou d'appel IA de production dans le lot A.
  const intent = cmd.action === "message" && !intelligenceEnabled() ? await understand({ text: cmd.text }, { aiActive: !!tests.classify, classify: tests.classify }) : null;
  return tx(() => {
    const c = ownedConversation(user, cid);
    const prior = one<{ request_hash: string; response_json: string }>("SELECT request_hash,response_json FROM agent_conversation_turns WHERE conversation_id=? AND request_id=?", cid, cmd.requestId);
    if (prior) {
      if (prior.request_hash !== hash) throw new HttpError(409, L("Cet identifiant correspond à une autre demande.", "This identifier belongs to another request."), "conversation_idempotency_conflict");
      return JSON.parse(prior.response_json) as ConversationView;
    }
    if (c.project_id) requirePlan(user, c.project_id);
    else if (!pendingSubscriptions(user.id).length) throw new HttpError(402, L("Rattachez ce brouillon à votre projet avant de le poursuivre.", "Link this draft to your project before continuing."), "subscription_required");
    if (c.revision !== cmd.revision) throw new HttpError(409, L("La conversation a changé. Rechargez-la avant de répondre.", "The conversation changed. Reload it before answering."), "conversation_conflict");
    if (c.revision >= 1000) throw new HttpError(409, L("La limite de cette expérimentation est atteinte ; l’historique reste consultable.", "This experiment's limit is reached; history remains readable."), "conversation_limit");
    const { brief: b, revision, meta: m } = effective(c);
    if (revision !== cmd.projectRevision) throw new HttpError(409, L("La fiche a changé dans un autre écran. Relisez la version actuelle.", "The brief changed in another screen. Read the current version."), "conversation_brief_conflict");
    let changed = false, message = "", action: ActionCard | null = null;
    if(cmd.action==='message'&&cmd.context){
      if(!activeContextEnabled())throw new HttpError(404,L('Le repère contextuel est indisponible.','Context selection is unavailable.'),'conversation_context_disabled');
      m.activeContext=resolveActiveContext(c,cmd.context).selection;
    }
    if (cmd.action === 'message' && intelligenceEnabled()) {
      // Conservation exacte, sans classification locale ni appel facturant implicite.
      let writable = true;
      try { assertBriefWritable(c, user, revision); } catch (e) { if (!(e instanceof HttpError)) throw e; writable = false; }
      if (writable) {
        if (!b.input.description) { b.input.description = b.profile.summary = cmd.text; b.profile.summaryStatus = 'provided'; changed = true; }
        else { b.clientStatements = [...(b.clientStatements ?? []), { id: cmd.requestId, text: cmd.text, source: 'user' }]; changed = true; }
      }
      const inlineUrls = [...cmd.text.matchAll(/https?:\/\/[^\s<>«»"']+/g)].map(x => x[0].replace(/[),.;!?]+$/, ''));
      if (writable && (cmd.referenceUrls?.length || cmd.photoIds?.length || inlineUrls.length)) {
        validateSources(user, c, { ...cmd, referenceUrls: [...new Set([...(cmd.referenceUrls ?? []), ...inlineUrls])] }, b); changed = true;
      }
      message = L('Message exact conservé. Une réponse IA nécessite maintenant un devis et votre confirmation.', 'Exact message saved. An AI reply now requires a quote and your consent.');
    } else if (cmd.action === "message") {
      const scope = requestScope(cmd.text), normalized = normalizeRequest(cmd.text);
      const unknown=/^(je ne sais pas(?: encore)?|je sais pas|aucune idee|i (?:do not|don't) know(?: yet)?|not sure)[.!? ]*$/.test(normalized);
      const sourceOnly=/^(?:(?:la|le|une?|the|a) )?(source|document|citation|exemple|capture)\b/.test(normalized);
      if(unknown){
        const key=nextQuestion(b,m);
        if(key){answer(b,m,{...cmd,action:"answer",question:key,choices:[],text:"",unknown:true});changed=true;}
        message=L("Ce point reste inconnu ; vous pourrez le préciser plus tard.","This point remains unknown; you can specify it later.");
      }else if(sourceOnly){
        message=L("La source reste dans l’historique comme donnée non fiable. Elle ne remplace pas votre réponse et n’autorise aucun outil.","The source remains in history as untrusted data. It does not replace your answer or authorize any tool.");
      }else if(!scope.informational&&((scope.restrictions.length&&!scope.actionable)||/^(je prefere|nous preferons|i prefer|we prefer)\b/.test(normalized))){
        const constraints=[b.input.constraints,cmd.text].filter(Boolean).join("\n");
        if(constraints.length>5000)throw new HttpError(400,L("Consignes trop longues ; aucune consigne n’a été tronquée.","Instructions are too long; no instruction was truncated."));
        b.input.constraints=constraints;changed=true;
        message=L("Votre consigne exacte est conservée, sans la transformer en caractéristique de l’offre.","Your exact instruction is kept without turning it into an offer characteristic.");
      }else if (/^(publie|publish|supprime|delete|achete|buy|reserve|book|envoie|send|fusionne|merge|deploy)\b/.test(scope.actionable)) {
        action = unavailable("sensitive-or-unavailable", L("Cette opération n’est pas autorisée par la conversation du lot A. Utilisez un outil existant avec ses droits et sa confirmation ; aucune action n’a été effectuée.", "This operation is not authorized by the lot A conversation. Use an existing tool with its permissions and confirmation; no action was performed."), c);
      } else if (!scope.actionable && !scope.informational) {
        message = L("La citation ou la source reste dans l’historique, comme donnée non fiable. Elle ne remplace pas votre réponse et n’autorise aucun outil.", "The quote or source remains in history as untrusted data. It does not replace your answer or authorize any tool.");
      } else if (scope.informational || /^(pourquoi|explique|why|explain)\b/.test(normalized)) {
        const key = nextQuestion(b, m); message = key ? questionFor(key, b, m).why : L("Je conserve vos réponses dans la fiche commune. Une demande d’explication ne lance pas d’outil ni de création.", "I keep your answers in the shared brief. A request for explanation starts no tool or creation.");
      } else if (/^(change|modifie|corrige|change|edit|correct)\b/.test(normalized)) {
        message = L("Quel élément souhaitez-vous changer ? Les champs de correction sont disponibles ; rien n’a été remplacé.", "Which item would you like to change? Correction fields are available; nothing has been replaced.");
      } else if (b.input.description && intent?.intents.length) {
        const analyze = intent.intents.length === 1 && intent.intents[0] === "ANALYZE_PRODUCT";
        action = analyze ? { kind: "action", tool: "understand-offer", state: "requires_quote", executed: false, message: L("Demandez d’abord le devis de compréhension. Aucune analyse n’a été lancée.", "Request an understanding quote first. No analysis has started.") } : unavailable(intent.intents.join(","), L("Cette action existe peut-être dans son onglet, mais elle n’est pas raccordée à la conversation du lot A. Aucune création ni publication n’a été lancée.", "This action may exist in its tab, but it is not connected to the lot A conversation. No creation or publication has started."), c);
      } else if (!b.input.description) {
        b.input.description = b.profile.summary = cmd.text;
        b.profile.summaryStatus = "provided";
        m.business = proposedBusiness(cmd.text); m.businessSource = m.business ? "local" : "unknown";
        if (m.business) b.input.business = m.business;
        const target=providedTarget(cmd.text);
        if(target){b.input.target=target;writeFact(b,"conversation.target",L("Clientèle indiquée","Stated customers"),target);}
        const goals = explicitGoals(cmd.text, m.business);
        if (goals.length) {
          answer(b, m, { ...cmd, action: "answer", question: "goals", choices: goals.map(g => g.id), text: "", unknown: false });
        }
        changed = true;
        message = L("Votre description exacte est conservée. Ma proposition de type reste à relire ; aucune caractéristique n’est ajoutée.", "Your exact description is kept. My proposed type is still for review; no characteristics are added.");
      } else {
        const key = nextQuestion(b, m);
        if (key) { answer(b, m, { ...cmd, action: "answer", question: key, choices: [], text: cmd.text, unknown: false }); changed = true; }
        else message = L("Votre demande reste dans l’historique. Pour modifier la fiche, précisez le champ ; pour une action non raccordée, utilisez son onglet. Rien n’a été exécuté.", "Your request remains in history. To edit the brief, specify the field; for an unconnected action, use its tab. Nothing was executed.");
      }
      const inlineUrls = [...cmd.text.matchAll(/https?:\/\/[^\s<>«»"']+/g)].map(x => x[0].replace(/[),.;!?]+$/, ""));
      if (cmd.referenceUrls?.length || cmd.photoIds?.length || inlineUrls.length) { validateSources(user, c, { ...cmd, referenceUrls: [...new Set([...(cmd.referenceUrls ?? []), ...inlineUrls])] }, b); changed = true; message += L(" Liens conservés sans consultation et photos sans analyse ; aucun contenu de source ne commande le Studio.", " Links are kept without fetching and photos without analysis; no source content commands the Studio."); }
    }
    if (cmd.action === "answer") { answer(b, m, cmd); changed = true; }
    if (cmd.action === "edit") {
      if (cmd.field === "services") throw new HttpError(400, L("Utilisez la liste de prestations avec nom et description.", "Use the service list with name and description."));
      if (["description", "target", "offerName", "brandName", "constraints"].includes(cmd.field)) {
        const field = cmd.field as "description" | "target" | "offerName" | "brandName" | "constraints";
        const max = { description: 8000, target: 1200, offerName: 160, brandName: 80, constraints: 5000 }[field];
        if (cmd.value.length > max) throw new HttpError(400, L("Texte trop long pour ce champ ; rien n’a été tronqué.", "Text is too long for this field; nothing was truncated."));
        b.input[field] = cmd.value;
        if (field === "description") {
          b.profile.summary = cmd.value; b.profile.summaryStatus = "provided";
          if(!intelligenceEnabled()&&proposedBusiness(cmd.value)&&proposedBusiness(cmd.value)!==m.business)m.editing="business";
        }
        if (field === "offerName") { b.profile.name = cmd.value; b.profile.nameStatus = "provided"; }
        if (field === "target") { m.deferred = m.deferred.filter(k => k !== "target"); writeFact(b, "conversation.target", L("Clientèle indiquée", "Stated customers"), cmd.value); }
      } else {
        const topic = cmd.field as "customization" | "process" | "quote";
        if (cmd.value.length > 3000) throw new HttpError(400, L("Réponse trop longue ; rien n’a été tronqué.", "Answer is too long; nothing was truncated."));
        const key = { customization: "customization", process: "request_process", quote: "quote_needs" }[topic];
        writeFact(b, key, L({ customization: "Personnalisation", process: "Déroulement", quote: "Informations utiles au devis" }[topic], { customization: "Customization", process: "Process", quote: "Information needed for a quote" }[topic]), cmd.value);
        b.profile.facts.find(f => f.key === key)!.topic = topic;
      }
      changed = true; message = L("Correction enregistrée dans la même fiche ; les versions précédentes restent conservées.", "Correction saved in the same brief; previous versions are kept.");
    }
    if (cmd.action === "edit-services") {
      if (m.business !== "services") throw new HttpError(409, L("Précisez d’abord qu’il s’agit de services.", "First clarify that these are services."));
      b.services.services = cmd.items.map(x => ({ ...x, source: "client" }));
      b.input.services.services = structuredClone(b.services.services);
      changed = true;
    }
    if (cmd.action === "back") {
      const key = cmd.question ?? m.answeredOrder.at(-1);
      if (!key) throw new HttpError(409, L("Aucune réponse précédente à modifier.", "No previous answer to edit."));
      m.editing = key; message = L("La réponse précédente reste conservée jusqu’à votre nouvelle réponse.", "The previous answer is kept until your new answer.");
    }
    if (cmd.action === "explain") {
      const key = nextQuestion(b, m); message = key ? questionFor(key, b, m).why : L("Vos réponses alimentent la fiche du projet ; aucun outil payant n’est lancé.", "Your answers feed the project brief; no paid tool is started.");
    }
    if (cmd.action === "prepare-action") {
      if (!c.project_id || !m.business || !b.input.description) action = unavailable(cmd.tool, L("Rattachez un projet et précisez l’activité avant de demander ce devis.", "Link a project and clarify the activity before requesting this quote."), c);
      else {
        assertBriefWritable(c, user, revision);
        try { action = tx(() => quoteCard((tests.quote ?? nativeAnalysisQuote)(c.project_id!, cmd.correction ?? ""))); }
        catch (e) {
          if (!(e instanceof HttpError)) throw e;
          action = unavailable(cmd.tool, e.message, c);
        }
      }
    }
    if (['answer-ai', 'accept-ai-changes', 'back-ai'].includes(cmd.action)) {
      let canonicalWritable=true;
      if(cmd.action==='answer-ai'&&m.intelligence?.lastReply?.question?.field==='custom'){
        try{assertBriefWritable(c,user,revision);}catch(e){if(e instanceof HttpError&&e.code==='conversation_existing_progress')canonicalWritable=false;else throw e;}
      }
      const result = applyCognitiveCommand(c, b, m, cmd, canonicalWritable);
      changed = result.changed; message = result.message;
    }
    if (cmd.action === 'explain' && intelligenceEnabled() && m.intelligence?.lastReply?.question) message = m.intelligence.lastReply.question.why;
    if (["open-strategy-comparison","compare-strategy-options","decide-strategy-option","undo-strategy-preference","accept-strategy-preference"].includes(cmd.action)) message=applyStrategyChoice(c,m,cmd);
    if (changed) {
      saveBrief(c, b, user, revision);
      if (!c.project_id) m.draft = b;
    }
    // Relevé figé AVANT le devis/appel : les réservations du futur job ne périment pas leur propre contexte.
    if(cmd.action==='message'&&studioKnowledgeEnabled())m.studioObservation=captureStudioObservation(c);
    const next = c.revision + 1;
    // Lire une explication ou rouvrir une carte ne périme pas une proposition aux données inchangées.
    if(!changed&&['explain','summary','back-ai','back'].includes(cmd.action)&&m.intelligence?.sourceRevision===c.revision&&(m.intelligence.sourceProjectRevision??null)===revision)m.intelligence.sourceRevision=next;
    run("UPDATE agent_conversations SET revision=?,state_json=?,updated_at=? WHERE id=? AND revision=?", next, JSON.stringify(m), now(), c.id, c.revision);
    if (c.project_id && changed) remember(c.project_id, { kind: "artifact", key: `conversation.turn.${next}`, value: JSON.stringify({ conversationId: c.id, turn: next, action: cmd.action, field: cmd.action === "edit" ? cmd.field : cmd.action === "answer" ? cmd.question : null, preparationRevision: currentBrief({ ...c, state_json: JSON.stringify(m) }).revision }), status:"inferred",source: "local", origin: "system" });
    // La projection vivante et le catalogue ne sont pas recopiés dans chaque reçu de parole.
    const response = conversationView(user, c.id,undefined,false);
    if (tests.classify || tests.quote) response.mode = "simulation";
    response.message = action?.message || message || L("Réponse conservée. Vous pouvez la compléter, revenir en arrière ou demander pourquoi.", "Answer kept. You can add detail, go back or ask why.");
    response.action = action;
    // Pas de récursion des historiques dans les reçus ; GET sert l'historique paginé complet.
    response.history = []; response.historyBefore = null;
    run("INSERT INTO agent_conversation_turns (id,conversation_id,revision,request_id,request_hash,request_json,response_json,created_at) VALUES (?,?,?,?,?,?,?,?)", id(), c.id, next, cmd.requestId, hash, JSON.stringify(cmd), JSON.stringify(response), now());
    return response;
  });
}
