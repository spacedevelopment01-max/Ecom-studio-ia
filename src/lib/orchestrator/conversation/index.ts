import {bookingServiceCatalogEnabled,bookingServiceCatalogCandidate,proposeBookingServiceCatalog,confirmBookingServiceCatalog} from './local-booking-service-catalog';
import {bookingRecordsEnabled,bookingRecordsCandidate,listBookingRecords,bookingRecordsView} from './local-booking-records';
import {bookingStaffEnabled,bookingStaffCandidate,proposeBookingStaff,confirmBookingStaff} from './local-booking-staff';
import {localFileTrashEnabled,localFileTrashCandidate,proposeFileTrash,confirmFileTrash} from './local-file-trash';
import {localFolderDeleteEnabled,localFolderDeleteCandidate,proposeFolderDelete,confirmFolderDelete} from './local-folder-delete';
import {bookingServiceTextEnabled,bookingServiceTextCandidate,proposeBookingServiceText,confirmBookingServiceText} from './local-booking-service-text';
import {bookingClosuresEnabled,bookingClosuresCandidate,proposeBookingClosures,confirmBookingClosures} from './local-booking-closures';
import {restaurantSettingsEnabled,restaurantSettingsCandidate,proposeRestaurantSettings,confirmRestaurantSettings} from './local-restaurant-settings';
import {bookingHoursEnabled,bookingHoursCandidate,bookingHoursIncompleteRequest,proposeBookingHours,confirmBookingHours} from './local-booking-hours';
import {bookingEditEnabled,bookingEditCandidate,proposeBookingEdit,confirmBookingEdit} from './local-booking-edit';
import {bookingServicesEnabled,bookingServicesCandidate,listBookingServices,bookingServicesView} from './local-booking-services';
import {lockedPhotoMessage,attachLockedPhotos,threadPhotos} from './photo-attachments';
import {localFolderMoveEnabled,localFolderMoveCandidate,proposeFolderMove,confirmFolderMove} from "./local-folder-move";
import {localFolderRenameEnabled,localFolderRenameCandidate,proposeFolderRename,confirmFolderRename} from "./local-folder-rename";
import {localFileRestoreEnabled,localFileRestoreCandidate,proposeFileRestore,confirmFileRestore} from "./local-file-restore";
import {localFoldersEnabled,localFoldersCandidate,hasFolderClarificationReply,proposeLocalFolder,confirmLocalFolder} from "./local-folders";
import {localThemeRestoreEnabled,localThemeRestoreCandidate,localThemeRestoreGuardCandidate,hasCurrentVersionUndo,proposeLocalThemeRestore,confirmLocalThemeRestore} from './local-theme-restore';
import {localSiteMotionEnabled,localSiteMotionCandidate,proposeLocalSiteMotion,confirmLocalSiteMotion} from './local-site-motion';
import {MAX_CONVERSATION_PHOTO_BYTES} from './photo-import';
import {localThemeChoiceEnabled,localThemeChoiceCandidate,prepareLocalThemeChoice,acceptPreparedThemeChoice,confirmLocalThemeChoice} from './local-theme-choice';
import {localCalendarEnabled,localCalendarCandidate,proposeLocalCalendar,confirmLocalCalendar} from './local-calendar';
import {localStockEnabled,localStockCandidate,proposeLocalStock,confirmLocalStock} from "./local-stock";
import {localPagesEnabled,localPagesCandidate,pagesModelReplyCandidate,hasPagesModelReply,proposeLocalPages,confirmLocalPages} from "./local-pages";
import {localSeoEnabled,localSeoCandidate,proposeLocalSeo,confirmLocalSeo} from "./local-seo";
import {serviceProfileEnabled,serviceProfileCandidate,proposeServiceProfile,confirmServiceProfile} from "./local-service-profile";
import {adDocumentCandidate,adDocumentToolsEnabled,proposeAdDocument,bindAdDocumentProposal,adDocumentPresentation} from './ad-document-tool-execution';
import {localPromptsEnabled,localPromptsCandidate,listLocalPrompts,localPromptsView} from './local-prompts';
import {localFilesEnabled,localFilesCandidate,scopedLibraryReadCandidate,proposeLocalFiles,confirmLocalFiles} from './local-files';
import {localBusinessContentEnabled,localBusinessContentCandidate,proposeLocalBusinessContent,confirmLocalBusinessContent} from './local-business-content';
import {localRequestsCandidate,proposeLocalRequests,confirmLocalRequest,localRequestsView} from './local-site-requests';
import {withAiDisabled} from '../../ai/access';
import {localSiteEnabled,localSiteCandidate,proposeLocalSite,confirmLocalSite,cancelLocalSite} from './local-site';
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
import { currentBrief, metaOf, ownedConversation, turnsOf, isExistingProjectRead } from "./store";
import { existingProjectView, submitExistingProjectMessage } from './existing-project';
import {contextPresentation} from './context-session';
import { creationFields } from "./creation";
import { intelligenceEnabled, intelligenceView } from "./intelligence";
import { applyCognitiveCommand } from "./intelligence-commands";
import {clearConversationAnswer} from './answer-state';
import {activeContextEnabled,resolveActiveContext,observedActiveContext,siteRequestsEnabled} from './active-context';
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
 const initial=ownedConversation(user,cid,true);
 if(isExistingProjectRead(initial))return existingProjectView(user,cid,before);
 const {view,c,readOnlyReason}=readSnapshot(()=>{
  const c = ownedConversation(user, cid), { brief: b, revision, meta: m, status } = effective(c);
  const key = nextQuestion(b, m);
  let readOnlyReason:string|null=null;
  if(c.project_id){try{assertBriefWritable(c,user,revision);}catch(e){if(!(e instanceof HttpError))throw e;readOnlyReason=e.message;}}
  else if(!pendingSubscriptions(user.id).length)readOnlyReason=L("Rattachez le brouillon à votre projet pour le poursuivre.","Link the draft to your project to continue.");
  let localEditsWritable=false;
  if(c.project_id){try{requirePlan(user,c.project_id);localEditsWritable=true;}catch(e){if(!(e instanceof HttpError))throw e;}}
  const view: ConversationView = {
    schema: "studio-conversation-1", id: c.id, projectId: c.project_id, revision: c.revision, projectRevision: revision, mode: "local",
    progress: !b.input.description ? "describe" : !m.business ? "clarify" : key ? "collect" : "review",
    message: !b.input.description ? L("Décrivez votre projet en quelques mots. Vous pouvez joindre un lien ; aucune création n’est lancée.", "Describe your project in a few words. You may add a link; no creation is started.") : L("Compréhension locale à relire. Vos réponses sont conservées ; aucune étape n’est validée automatiquement.", "Local understanding to review. Your answers are kept; no step is automatically approved."),
    question: key ? questionFor(key, b, m) : null, correctionFields: readOnlyReason?[]:[...EDIT_FIELDS],readOnlyReason,
    localEditsWritable,
    conversationPhotos:threadPhotos(user,c,m),
    creation: c.project_id ? null : creationFields(b,m),
    ...(localEditsWritable&&adDocumentToolsEnabled()&&m.localAdDocumentProposalId?{localAdDocument:adDocumentPresentation(user,c.id,m.localAdDocumentProposalId)}:{}),
    ...(localEditsWritable&&c.project_id&&adDocumentToolsEnabled()?{localAdDocumentExecution:{enabled:true as const}}:{}),
    ...(m.localFiles?{localFiles:m.localFiles}:{}),
    ...(c.project_id&&localEditsWritable&&localFilesEnabled()?{localFilesExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&localEditsWritable&&localFilesEnabled()?{photoImport:{enabled:true as const,endpoint:`/api/studio-agent/conversations/${c.id}/photos`,maxFileBytes:MAX_CONVERSATION_PHOTO_BYTES,kind:'image' as const,analysis:false as const}}:{}),
    ...(m.localFileRestore?{localFileRestore:m.localFileRestore}:{}),
    ...(m.localFolderMove?{localFolderMove:m.localFolderMove}:{}),
    ...(c.project_id&&localEditsWritable&&localFolderMoveEnabled()?{localFolderMoveExecution:{enabled:true as const}}:{}),
    ...(m.localFolderRename?{localFolderRename:m.localFolderRename}:{}),
    ...(c.project_id&&localEditsWritable&&localFolderRenameEnabled()?{localFolderRenameExecution:{enabled:true as const}}:{}),
    ...(m.localFolders?{localFolders:m.localFolders}:{}),
    ...(m.localStock?{localStock:m.localStock}:{}),
    ...(m.localCalendar?{localCalendar:m.localCalendar}:{}),
    ...(m.localThemeRestore?{localThemeRestore:m.localThemeRestore}:{}),
    ...(m.localSiteMotion?{localSiteMotion:m.localSiteMotion}:{}),
    ...(m.localThemeChoice?{localThemeChoice:m.localThemeChoice}:{}),
    ...(c.project_id&&localEditsWritable&&localFileRestoreEnabled()?{localFileRestoreExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&localEditsWritable&&localFoldersEnabled()?{localFoldersExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&localEditsWritable&&localStockEnabled()?{localStockExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&localEditsWritable&&localCalendarEnabled()?{localCalendarExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&localEditsWritable&&localThemeRestoreEnabled()?{localThemeRestoreExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&localEditsWritable&&localSiteMotionEnabled()?{localSiteMotionExecution:{enabled:true as const}}:{}),
    ...(c.project_id&&localEditsWritable&&localThemeChoiceEnabled()?{localThemeChoiceExecution:{enabled:true as const}}:{}),
    ...(m.localPages?{localPages:m.localPages}:{}),
    ...(c.project_id&&localEditsWritable&&localPagesEnabled()?{localPagesExecution:{enabled:true as const}}:{}),
    ...(m.localSeo?{localSeo:m.localSeo}:{}),
    ...(c.project_id&&localEditsWritable&&localSeoEnabled()?{localSeoExecution:{enabled:true as const}}:{}),
    ...(m.serviceProfile?{serviceProfile:m.serviceProfile}:{}),
    ...(c.project_id&&localEditsWritable&&serviceProfileEnabled()?{serviceProfileExecution:{enabled:true as const}}:{}),
    ...(m.localBusinessContent?{localBusinessContent:m.localBusinessContent}:{}),
    ...(c.project_id&&localEditsWritable&&localBusinessContentEnabled()?{localBusinessContentExecution:{enabled:true as const}}:{}),
    // Lecture gratuite native indépendante du verrou de fiche ; forfait et drapeau toujours requis.
    ...(m.bookingRecords&&localEditsWritable&&bookingRecordsEnabled()?{bookingRecords:bookingRecordsView(user,c,m.bookingRecords)}:{}),
    ...(c.project_id&&localEditsWritable&&bookingRecordsEnabled()?{bookingRecordsRead:{enabled:true as const}}:{}),
    ...(m.bookingStaff&&localEditsWritable&&bookingStaffEnabled()?{bookingStaff:m.bookingStaff}:{}),
    ...(c.project_id&&localEditsWritable&&bookingStaffEnabled()?{bookingStaffExecution:{enabled:true as const}}:{}),
    ...(m.localFileTrash&&localEditsWritable&&localFileTrashEnabled()?{localFileTrash:m.localFileTrash}:{}),
    ...(c.project_id&&localEditsWritable&&localFileTrashEnabled()?{localFileTrashExecution:{enabled:true as const}}:{}),
    ...(m.localFolderDelete&&localEditsWritable&&localFolderDeleteEnabled()?{localFolderDelete:m.localFolderDelete}:{}),
    ...(c.project_id&&localEditsWritable&&localFolderDeleteEnabled()?{localFolderDeleteExecution:{enabled:true as const}}:{}),
    ...(m.bookingServiceCatalog&&localEditsWritable&&bookingServiceCatalogEnabled()?{bookingServiceCatalog:m.bookingServiceCatalog}:{}),
    ...(c.project_id&&localEditsWritable&&bookingServiceCatalogEnabled()?{bookingServiceCatalogExecution:{enabled:true as const}}:{}),
    ...(m.bookingServiceText&&localEditsWritable&&bookingServiceTextEnabled()?{bookingServiceText:m.bookingServiceText}:{}),
    ...(c.project_id&&localEditsWritable&&bookingServiceTextEnabled()?{bookingServiceTextExecution:{enabled:true as const}}:{}),
    ...(m.bookingClosures&&localEditsWritable&&bookingClosuresEnabled()?{bookingClosures:m.bookingClosures}:{}),
    ...(c.project_id&&localEditsWritable&&bookingClosuresEnabled()?{bookingClosuresExecution:{enabled:true as const}}:{}),
    ...(m.restaurantSettings&&localEditsWritable&&restaurantSettingsEnabled()?{restaurantSettings:m.restaurantSettings}:{}),
    ...(c.project_id&&localEditsWritable&&restaurantSettingsEnabled()?{restaurantSettingsExecution:{enabled:true as const}}:{}),
    ...(m.bookingHours&&localEditsWritable&&bookingHoursEnabled()?{bookingHours:m.bookingHours}:{}),
    ...(c.project_id&&localEditsWritable&&bookingHoursEnabled()?{bookingHoursExecution:{enabled:true as const}}:{}),
    ...(m.bookingEdit&&localEditsWritable&&bookingEditEnabled()?{bookingEdit:m.bookingEdit}:{}),
    ...(c.project_id&&localEditsWritable&&bookingEditEnabled()?{bookingEditExecution:{enabled:true as const}}:{}),
    ...(m.bookingServices&&localEditsWritable&&bookingServicesEnabled()?{bookingServices:bookingServicesView(user,c,m.bookingServices)}:{}),
    ...(c.project_id&&localEditsWritable&&bookingServicesEnabled()?{bookingServicesRead:{enabled:true as const}}:{}),
    ...(m.localPrompts&&localEditsWritable&&localPromptsEnabled()?{localPrompts:localPromptsView(user,c,m.localPrompts)}:{}),
    ...(c.project_id&&localEditsWritable&&localPromptsEnabled()?{localPromptsRead:{enabled:true as const}}:{}),
    ...(m.localRequests?{localRequests:localRequestsView(user,c,m.localRequests)}:{}),
    ...(c.project_id&&localEditsWritable&&siteRequestsEnabled()?{localRequestsExecution:{enabled:true as const}}:{}),
    ...(m.localSite?{localSite:m.localSite}:{}),
    ...(c.project_id&&localEditsWritable&&localSiteEnabled()?{localSiteExecution:{enabled:true as const}}:{}),
    ...(activeContextEnabled()?{activeContext:{enabled:true as const,current:observedActiveContext(c,m.activeContext),presentation:contextPresentation(c)}}:{}),
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
async function submitConversationImpl(user: User, cid: string, raw: unknown, tests: TestDependencies = {}): Promise<ConversationView> {
  const cmd = CommandSchema.parse(raw);
  if (["answer-ai", "accept-ai-changes", "back-ai"].includes(cmd.action) && !intelligenceEnabled()) throw new HttpError(404, "conversation_ai_disabled");
  if (redact(JSON.stringify(cmd)) !== JSON.stringify(cmd)) throw new HttpError(400, L("Ne saisissez pas de clé ou de jeton dans la conversation. Utilisez les réglages sécurisés du Studio.", "Do not enter a key or token in the conversation. Use the Studio's secure settings."), "conversation_secret");
  const hash = stableHash("conversation-request-1", cmd);
  // Propriété et reprise contrôlées AVANT même un classificateur simulé ; recontrôle atomique après l'await.
  const initial=ownedConversation(user, cid, true);
  if(isExistingProjectRead(initial))return submitExistingProjectMessage(user,cid,cmd,hash);
  if(lockedPhotoMessage(user,initial,cmd)&&cmd.action==='message')return withAiDisabled('Photos jointes sans analyse ni réécriture de la fiche',()=>attachLockedPhotos(user,cid,cmd,hash,()=>conversationView(user,cid,undefined,false)));
  const bookingRecordsCommand=cmd.action==='message'&&bookingRecordsCandidate(cmd.text);
  if(bookingRecordsCommand&&!bookingRecordsEnabled())throw new HttpError(404,'Lecture des réservations avec SYNA indisponible.');
  const bookingStaffCommand=cmd.action==='message'&&bookingStaffCandidate(cmd.text);
  if((bookingStaffCommand||cmd.action==='confirm-booking-staff'||cmd.action==='cancel-booking-staff')&&!bookingStaffEnabled())throw new HttpError(404,'Intervenants salon avec SYNA indisponibles.');
  const bookingServiceCatalogCommand=cmd.action==='message'&&bookingServiceCatalogCandidate(cmd.text);
  const catalogAction=bookingServiceCatalogCommand||cmd.action==='confirm-booking-service-catalog'||cmd.action==='cancel-booking-service-catalog';
  if(catalogAction&&!bookingServiceCatalogEnabled())throw new HttpError(404,'Ajout et retrait de prestations réservables avec SYNA indisponibles.');
  if(catalogAction&&initial.project_id)requirePlan(user,initial.project_id);
  const bookingServiceTextCommand=cmd.action==='message'&&bookingServiceTextCandidate(cmd.text);
  if((bookingServiceTextCommand||cmd.action==='confirm-booking-service-text'||cmd.action==='cancel-booking-service-text')&&!bookingServiceTextEnabled())throw new HttpError(404,'Textes de prestations réservables avec SYNA indisponibles.');
  const folderDeleteCommand=cmd.action==='message'&&localFolderDeleteCandidate(cmd.text);
  if((folderDeleteCommand||cmd.action==='confirm-folder-delete'||cmd.action==='cancel-folder-delete')&&!localFolderDeleteEnabled())throw new HttpError(404,'Suppression de dossier vide avec SYNA indisponible.');
  const fileTrashCommand=cmd.action==='message'&&localFileTrashCandidate(cmd.text);
  if((cmd.action==='confirm-file-trash'||cmd.action==='cancel-file-trash')&&!localFileTrashEnabled())throw new HttpError(404,'Corbeille gratuite avec SYNA indisponible.');
  if((fileTrashCommand||cmd.action==='confirm-file-trash'||cmd.action==='cancel-file-trash')&&initial.project_id)requirePlan(user,initial.project_id);
  const scopedLibraryReadCommand=cmd.action==='message'&&scopedLibraryReadCandidate(cmd.text);
  const priorityLocalCommand=bookingServiceCatalogCommand||bookingRecordsCommand||bookingStaffCommand||bookingServiceTextCommand||folderDeleteCommand||fileTrashCommand||scopedLibraryReadCommand;
  const bookingClosuresCommand=cmd.action==='message'&&!priorityLocalCommand&&bookingClosuresCandidate(cmd.text);
  if((bookingClosuresCommand||cmd.action==='confirm-booking-closures'||cmd.action==='cancel-booking-closures')&&!bookingClosuresEnabled())throw new HttpError(404,'Fermetures datées avec SYNA indisponibles.');
  const restaurantCommand=cmd.action==='message'&&!priorityLocalCommand&&restaurantSettingsCandidate(cmd.text);
  if((restaurantCommand||cmd.action==='confirm-restaurant-settings'||cmd.action==='cancel-restaurant-settings')&&!restaurantSettingsEnabled())throw new HttpError(404,'Réglages restaurant avec SYNA indisponibles.');
  const profileHoursClarification=cmd.action==='message'&&(cmd.context?.tab??metaOf(initial).activeContextTab)==='produit'&&serviceProfileEnabled()&&bookingHoursIncompleteRequest(cmd.text);
  const bookingHoursCommand=cmd.action==='message'&&!priorityLocalCommand&&!restaurantCommand&&!bookingClosuresCommand&&!profileHoursClarification&&bookingHoursCandidate(cmd.text);
  if((bookingHoursCommand||cmd.action==='confirm-booking-hours'||cmd.action==='cancel-booking-hours')&&!bookingHoursEnabled())throw new HttpError(404,'Horaires réservables avec SYNA indisponibles.');
  const bookingEditCommand=cmd.action==='message'&&!priorityLocalCommand&&bookingEditCandidate(cmd.text);
  if((bookingEditCommand||cmd.action==='confirm-booking-edit'||cmd.action==='cancel-booking-edit')&&!bookingEditEnabled())throw new HttpError(404,'Retouche gratuite des services réservables indisponible.');
  const bookingReadCommand=cmd.action==='message'&&!priorityLocalCommand&&bookingServicesCandidate(cmd.text);
  if(bookingReadCommand&&!bookingServicesEnabled())throw new HttpError(404,'Lecture des services réservables indisponible.');
  const promptsCommand=cmd.action==='message'&&!priorityLocalCommand&&localPromptsCandidate(cmd.text);
  const folderMoveCommand=cmd.action==='message'&&!priorityLocalCommand&&localFolderMoveCandidate(cmd.text);
  if((folderMoveCommand||cmd.action==='confirm-folder-move'||cmd.action==='cancel-folder-move')&&!localFolderMoveEnabled())throw new HttpError(404,'Déplacement gratuit de dossier indisponible.');
  const folderRenameCommand=cmd.action==='message'&&!priorityLocalCommand&&localFolderRenameCandidate(cmd.text);
  if((folderRenameCommand||cmd.action==='confirm-folder-rename'||cmd.action==='cancel-folder-rename')&&!localFolderRenameEnabled())throw new HttpError(404,'Renommage gratuit de dossier indisponible.');
  if(cmd.action==='confirm-site-request'&&!siteRequestsEnabled())throw new HttpError(404,'Demandes reçues avec SYNA indisponibles.');
  if(initial.project_id)requirePlan(user,initial.project_id);
  if(promptsCommand&&!localPromptsEnabled())throw new HttpError(404,'Lecture de la bibliothèque de prompts avec SYNA indisponible.');
  const received = one<{request_hash:string;response_json:string}>("SELECT request_hash,response_json FROM agent_conversation_turns WHERE conversation_id=? AND request_id=?", cid, cmd.requestId);
  if (received) {
    if (received.request_hash !== hash) throw new HttpError(409, L("Cet identifiant correspond à une autre demande.", "This identifier belongs to another request."), "conversation_idempotency_conflict");
    return JSON.parse(received.response_json) as ConversationView;
  }
  if(initial.project_id)requirePlan(user,initial.project_id);
  else if(!pendingSubscriptions(user.id).length)throw new HttpError(402,L("Rattachez ce brouillon à votre projet avant de le poursuivre.","Link this draft to your project before continuing."),"subscription_required");
  if(initial.revision!==cmd.revision || currentBrief(initial).revision!==cmd.projectRevision)throw new HttpError(409,L("La conversation ou la fiche a changé. Rechargez avant de répondre.","The conversation or brief changed. Reload before answering."),initial.revision!==cmd.revision?"conversation_conflict":"conversation_brief_conflict");
  // Réutilisation de l'Intent Engine ; pas de classificateur ou d'appel IA de production dans le lot A.
  const adCommand=cmd.action==='message'&&!priorityLocalCommand&&adDocumentCandidate(cmd.text);
  let adProposalId:string|undefined;
  if(adCommand){const selected=metaOf(initial).activeContext,target=selected?.target;if(cmd.action==='message'&&cmd.context&&(cmd.context.tab!==selected?.tab||cmd.context.projectId!==undefined&&cmd.context.projectId!==initial.project_id||stableHash('ad-document-selected',cmd.context.target)!==stableHash('ad-document-selected',target)))throw new HttpError(409,'La sélection affichée diffère du repère sauvegardé. Confirmez sa désignation avant de proposer la retouche.');if(target?.kind!=='ad-document-text')throw new HttpError(409,'Désignez le titre enregistré dans le contexte partagé avant cette demande.');const proposed=await proposeAdDocument(user,cid,{action:'propose',revision:cmd.revision,projectRevision:cmd.projectRevision!,docKey:target.docKey,layerId:target.layerId,expectedVersion:target.version,operation:'title-larger'});adProposalId=proposed.proposalId;}
  const fileRestoreCommand=cmd.action==='message'&&!priorityLocalCommand&&localFileRestoreCandidate(cmd.text);
  const folderCommand=cmd.action==='message'&&!priorityLocalCommand&&(localFoldersCandidate(cmd.text)||hasFolderClarificationReply(metaOf(initial),cmd.text));
  const fileCommand=cmd.action==='message'&&(!priorityLocalCommand||scopedLibraryReadCommand)&&localFilesCandidate(cmd.text);
  const requestCommand=cmd.action==='message'&&!priorityLocalCommand&&localRequestsCandidate(cmd.text);
  const themeChoiceCommand=cmd.action==='message'&&!priorityLocalCommand&&localThemeChoiceCandidate(cmd.text);
  const preparedThemeChoice=themeChoiceCommand?await prepareLocalThemeChoice(user,initial,(cmd as Extract<Command,{action:'message'}>).text,cmd.action==='message'?cmd.context?.tab??metaOf(initial).activeContextTab:undefined):null;
  const motionCommand=cmd.action==='message'&&!priorityLocalCommand&&localSiteMotionCandidate(cmd.text);
  const restoreCommand=cmd.action==='message'&&!priorityLocalCommand&&(localThemeRestoreCandidate(cmd.text)||hasCurrentVersionUndo(initial,cmd.text));
  const calendarCommand=cmd.action==='message'&&!priorityLocalCommand&&localCalendarCandidate(cmd.text);
  const stockCommand=cmd.action==='message'&&!priorityLocalCommand&&localStockCandidate(cmd.text);
  const pagesCommand=cmd.action==='message'&&!priorityLocalCommand&&(localPagesCandidate(cmd.text)||hasPagesModelReply(metaOf(initial),cmd.text));
  const seoCommand=cmd.action==='message'&&!priorityLocalCommand&&localSeoCandidate(cmd.text);
  const localCommand=cmd.action==='message'&&!priorityLocalCommand&&!seoCommand&&!pagesCommand&&localSiteCandidate(cmd.text);
  const serviceCommand=cmd.action==='message'&&!priorityLocalCommand&&serviceProfileCandidate(cmd.text);
  const businessCommand=cmd.action==='message'&&!priorityLocalCommand&&localBusinessContentCandidate(cmd.text);
  const intent = cmd.action === "message" && !fileRestoreCommand && !folderMoveCommand && !folderRenameCommand && !folderCommand && !themeChoiceCommand && !motionCommand && !restoreCommand && !calendarCommand && !stockCommand && !pagesCommand && !seoCommand && !adCommand && !localCommand && !fileCommand && !businessCommand && !serviceCommand && !requestCommand && !promptsCommand && !priorityLocalCommand && !bookingReadCommand && !bookingEditCommand && !bookingHoursCommand && !restaurantCommand && !intelligenceEnabled() ? await understand({ text: cmd.text }, { aiActive: !!tests.classify, classify: tests.classify }) : null;
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
    if(cmd.action==='message'&&cmd.context&&!adCommand){
      if(!activeContextEnabled())throw new HttpError(404,L('Le repère contextuel est indisponible.','Context selection is unavailable.'),'conversation_context_disabled');
      const resolved=resolveActiveContext(c,cmd.context);
      m.activeContextTab=cmd.context.tab;
      if(cmd.context.target||!m.activeContext?.target){m.activeContext=resolved.selection;m.activeContextReference=stableHash('conversation-active-context-1',resolved);m.activeContextIdentity=resolved.canonical.identity;}
    }
    if(bookingRecordsCommand){m.bookingRecords=listBookingRecords(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.bookingRecords.message;}
    else if(bookingStaffCommand||cmd.action==='confirm-booking-staff'||cmd.action==='cancel-booking-staff'){
      if(cmd.action==='cancel-booking-staff'){if(m.bookingStaffProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition d’intervenant périmée.');delete m.bookingStaffProposal;delete m.bookingStaff;message='Retouche d’intervenant annulée, aucun changement.';}
      else{m.bookingStaff=cmd.action==='confirm-booking-staff'?confirmBookingStaff(user,c,m,cmd.proposalId,cmd.requestId):proposeBookingStaff(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.bookingStaff.message;}
    }else if(fileTrashCommand||cmd.action==='confirm-file-trash'||cmd.action==='cancel-file-trash'){
      if(cmd.action==='cancel-file-trash'){if(m.localFileTrashProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition de corbeille périmée.');delete m.localFileTrashProposal;delete m.localFileTrash;message='Mise à la corbeille annulée, aucun changement.';}
      else{m.localFileTrash=cmd.action==='confirm-file-trash'?confirmFileTrash(user,c,m,cmd.proposalId,cmd.requestId):proposeFileTrash(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.localFileTrash.message;}
    }else if(folderDeleteCommand||cmd.action==='confirm-folder-delete'||cmd.action==='cancel-folder-delete'){
      if(cmd.action==='cancel-folder-delete'){if(m.localFolderDeleteProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition de suppression périmée.');delete m.localFolderDeleteProposal;delete m.localFolderDelete;message='Suppression du dossier annulée, aucun changement.';}
      else{m.localFolderDelete=cmd.action==='confirm-folder-delete'?confirmFolderDelete(user,c,m,cmd.proposalId,cmd.requestId):proposeFolderDelete(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.localFolderDelete.message;}
    }else if(bookingServiceCatalogCommand||cmd.action==='confirm-booking-service-catalog'||cmd.action==='cancel-booking-service-catalog'){
      if(cmd.action==='cancel-booking-service-catalog'){if(m.bookingServiceCatalogProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition de prestation périmée.');delete m.bookingServiceCatalogProposal;delete m.bookingServiceCatalog;message='Ajout ou retrait de prestation annulé, aucun changement.';}
      else{m.bookingServiceCatalog=cmd.action==='confirm-booking-service-catalog'?confirmBookingServiceCatalog(user,c,m,cmd.proposalId,cmd.requestId):proposeBookingServiceCatalog(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.bookingServiceCatalog.message;}
    }else if(bookingServiceTextCommand||cmd.action==='confirm-booking-service-text'||cmd.action==='cancel-booking-service-text'){
      if(cmd.action==='cancel-booking-service-text'){if(m.bookingServiceTextProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition de texte réservable périmée.');delete m.bookingServiceTextProposal;delete m.bookingServiceText;message='Retouche de texte réservable annulée, aucun changement.';}
      else{m.bookingServiceText=cmd.action==='confirm-booking-service-text'?confirmBookingServiceText(user,c,m,cmd.proposalId,cmd.requestId):proposeBookingServiceText(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.bookingServiceText.message;}
    }else if(bookingClosuresCommand||cmd.action==='confirm-booking-closures'||cmd.action==='cancel-booking-closures'){
      if(cmd.action==='cancel-booking-closures'){if(m.bookingClosuresProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition fermeture périmée.');delete m.bookingClosuresProposal;delete m.bookingClosures;message='Réglage fermeture annulé, aucun changement.';}
      else{m.bookingClosures=cmd.action==='confirm-booking-closures'?confirmBookingClosures(user,c,m,cmd.proposalId,cmd.requestId):proposeBookingClosures(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.bookingClosures.message;}
    }else if(restaurantCommand||cmd.action==='confirm-restaurant-settings'||cmd.action==='cancel-restaurant-settings'){
      if(cmd.action==='cancel-restaurant-settings'){if(m.restaurantSettingsProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition restaurant périmée.');delete m.restaurantSettingsProposal;delete m.restaurantSettings;message='Réglage restaurant annulé, aucun changement.';}
      else{m.restaurantSettings=cmd.action==='confirm-restaurant-settings'?confirmRestaurantSettings(user,c,m,cmd.proposalId,cmd.requestId):proposeRestaurantSettings(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.restaurantSettings.message;}
    }else if(bookingHoursCommand||cmd.action==='confirm-booking-hours'||cmd.action==='cancel-booking-hours'){
      if(cmd.action==='cancel-booking-hours'){if(m.bookingHoursProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition d’horaires périmée.');delete m.bookingHoursProposal;delete m.bookingHours;message='Horaires réservables annulés, aucun changement.';}
      else{m.bookingHours=cmd.action==='confirm-booking-hours'?confirmBookingHours(user,c,m,cmd.proposalId,cmd.requestId):proposeBookingHours(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.bookingHours.message;}
    }else if(bookingEditCommand||cmd.action==='confirm-booking-edit'||cmd.action==='cancel-booking-edit'){
      if(cmd.action==='cancel-booking-edit'){if(m.bookingEditProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition de réservation périmée.');delete m.bookingEditProposal;delete m.bookingEdit;message='Retouche de réservation annulée, aucun changement.';}
      else{m.bookingEdit=cmd.action==='confirm-booking-edit'?confirmBookingEdit(user,c,m,cmd.proposalId,cmd.requestId):proposeBookingEdit(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.bookingEdit.message;}
    }else if(adCommand&&adProposalId){bindAdDocumentProposal(user,c.id,adProposalId,c.revision+1);m.localAdDocumentProposalId=adProposalId;message='Vérifiez les aperçus et les changements exacts puis confirmez gratuitement. Aucun appel IA.';}else if(bookingReadCommand){m.bookingServices=listBookingServices(user,c,(cmd as Extract<Command,{action:'message'}>).text);message=m.bookingServices.message;}else if(promptsCommand){
      m.localPrompts=listLocalPrompts(user,c,(cmd as Extract<Command,{action:'message'}>).text);
      message=m.localPrompts.message;
    }else if(fileRestoreCommand||cmd.action==='confirm-file-restore'||cmd.action==='cancel-file-restore'){
      if(cmd.action==='cancel-file-restore'){if(!localFileRestoreEnabled())throw new HttpError(404,'Restauration de fichier indisponible.');if(m.localFileRestoreProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition périmée.');delete m.localFileRestore;delete m.localFileRestoreProposal;message='Restauration du fichier annulée, aucun changement.';}else{m.localFileRestore=cmd.action==='confirm-file-restore'?confirmFileRestore(user,c,m,cmd.proposalId,cmd.requestId):proposeFileRestore(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.localFileRestore.message;}
    }else if(folderMoveCommand||cmd.action==='confirm-folder-move'||cmd.action==='cancel-folder-move'){
      if(cmd.action==='cancel-folder-move'){if(!localFolderMoveEnabled())throw new HttpError(404,'Déplacement gratuit de dossier indisponible.');if(m.localFolderMoveProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition périmée.');delete m.localFolderMoveProposal;delete m.localFolderMove;message='Déplacement du dossier annulé, aucun changement.';}else{m.localFolderMove=cmd.action==='confirm-folder-move'?confirmFolderMove(user,c,m,cmd.proposalId,cmd.requestId):proposeFolderMove(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.localFolderMove.message;}
    }else if(folderRenameCommand||cmd.action==='confirm-folder-rename'||cmd.action==='cancel-folder-rename'){
      if(cmd.action==='cancel-folder-rename'){if(!localFolderRenameEnabled())throw new HttpError(404,'Renommage gratuit de dossier indisponible.');if(m.localFolderRenameProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition périmée.');delete m.localFolderRenameProposal;delete m.localFolderRename;message='Renommage du dossier annulé, aucun changement.';}else{m.localFolderRename=cmd.action==='confirm-folder-rename'?confirmFolderRename(user,c,m,cmd.proposalId,cmd.requestId):proposeFolderRename(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.localFolderRename.message;}
    }else if(folderCommand||cmd.action==='confirm-folder'||cmd.action==='cancel-folder'){
      if(cmd.action==='cancel-folder'){if(!localFoldersEnabled())throw new HttpError(404,'Dossiers indisponibles.');if(m.localFolderProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition périmée.');delete m.localFolderProposal;delete m.localFolders;message='Création du dossier annulée, aucun changement.';}else{m.localFolders=cmd.action==='confirm-folder'?confirmLocalFolder(user,c,m,cmd.proposalId,cmd.requestId):proposeLocalFolder(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.localFolders.message;}
    }else if(fileCommand||cmd.action==='confirm-files'){
      const active={...c,state_json:JSON.stringify(m)};
      m.localFiles=cmd.action==='confirm-files'?confirmLocalFiles(user,active,m,cmd.proposalId,cmd.requestId):proposeLocalFiles(user,active,m,(cmd as Extract<Command,{action:'message'}>).text);
      message=m.localFiles.message;
    }else if(themeChoiceCommand||cmd.action==='confirm-theme-choice'||cmd.action==='cancel-theme-choice'){
      if(cmd.action==='cancel-theme-choice'){if(!localThemeChoiceEnabled())throw new HttpError(404,'Choix de thème indisponible.');if(m.localThemeChoiceProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition de thème périmée.');delete m.localThemeChoice;delete m.localThemeChoiceProposal;message='Proposition de thème annulée, aucun changement.';}else{m.localThemeChoice=cmd.action==='confirm-theme-choice'?confirmLocalThemeChoice(user,c,m,cmd.proposalId,cmd.requestId):acceptPreparedThemeChoice(user,c,m,preparedThemeChoice!);message=m.localThemeChoice.message;}
    }else if(motionCommand||cmd.action==='confirm-motion'||cmd.action==='cancel-motion'){
      if(cmd.action==='cancel-motion'){if(!localSiteMotionEnabled())throw new HttpError(404,'Réglage d’animation indisponible.');if(m.localSiteMotionProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition d’animation périmée.');delete m.localSiteMotion;delete m.localSiteMotionProposal;message='Proposition d’animation annulée, aucun changement.';}else{m.localSiteMotion=cmd.action==='confirm-motion'?confirmLocalSiteMotion(user,c,m,cmd.proposalId,cmd.requestId):proposeLocalSiteMotion(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.localSiteMotion.message;}
    }else if(restoreCommand||cmd.action==='confirm-restore'||cmd.action==='cancel-restore'){
      delete m.localSiteProposal;delete m.localSite;
      if(cmd.action==='cancel-restore'){if(!localThemeRestoreEnabled())throw new HttpError(404,'Restauration native indisponible.');if(m.localThemeRestoreProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition de restauration périmée.');delete m.localThemeRestore;delete m.localThemeRestoreProposal;message='Proposition de restauration annulée, aucun changement.';}else{m.localThemeRestore=cmd.action==='confirm-restore'?confirmLocalThemeRestore(user,c,m,cmd.proposalId,cmd.requestId):proposeLocalThemeRestore(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.localThemeRestore.message;}
    }else if(calendarCommand||cmd.action==='confirm-calendar'||cmd.action==='cancel-calendar'){
      if(cmd.action==='cancel-calendar'){if(!localCalendarEnabled())throw new HttpError(404,'Calendrier local indisponible.');if(m.localCalendarProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition de calendrier périmée.');delete m.localCalendar;delete m.localCalendarProposal;message='Proposition de calendrier annulée, aucun changement.';}else{m.localCalendar=cmd.action==='confirm-calendar'?confirmLocalCalendar(user,c,m,cmd.proposalId,cmd.requestId):proposeLocalCalendar(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.localCalendar.message;}
    }else if(stockCommand||cmd.action==='confirm-stock'||cmd.action==='cancel-stock'){
      if(cmd.action==='cancel-stock'){if(!localStockEnabled())throw new HttpError(404,'Stock natif indisponible.');if(m.localStockProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition de stock périmée.');delete m.localStock;delete m.localStockProposal;message='Proposition de stock annulée, aucun changement.';}else{const active={...c,state_json:JSON.stringify(m)};m.localStock=cmd.action==='confirm-stock'?confirmLocalStock(user,active,m,cmd.proposalId,cmd.requestId):proposeLocalStock(user,active,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.localStock.message;}
    }else if(pagesCommand||cmd.action==='confirm-pages'||cmd.action==='cancel-pages'){
      if(cmd.action==='cancel-pages'){if(!localPagesEnabled())throw new HttpError(404,'Pages natives gratuites indisponibles.');if(m.localPagesProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition de page périmée.');delete m.localPagesProposal;delete m.localPages;message='Proposition de page annulée, aucun changement.';}else{m.localPages=cmd.action==='confirm-pages'?confirmLocalPages(user,c,m,cmd.proposalId,cmd.requestId):proposeLocalPages(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.localPages.message;}
    }else if(seoCommand||cmd.action==='confirm-seo'||cmd.action==='cancel-seo'){
      if(cmd.action==='cancel-seo'){if(!localSeoEnabled())throw new HttpError(404,'Retouches SEO gratuites indisponibles.');if(m.localSeoProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition SEO périmée.');delete m.localSeoProposal;delete m.localSeo;message='Proposition SEO annulée, aucun changement.';}else{m.localSeo=cmd.action==='confirm-seo'?confirmLocalSeo(user,c,m,cmd.proposalId,cmd.requestId):proposeLocalSeo(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.localSeo.message;}
    }else if(serviceCommand||cmd.action==='confirm-service-profile'||cmd.action==='cancel-service-profile'){
      if(cmd.action==='cancel-service-profile'){if(m.serviceProfileProposal?.id!==cmd.proposalId)throw new HttpError(409,'Proposition périmée.');delete m.serviceProfileProposal;delete m.serviceProfile;message='Proposition annulée, aucun changement.';}else{m.serviceProfile=cmd.action==='confirm-service-profile'?confirmServiceProfile(user,c,m,cmd.proposalId,cmd.requestId):proposeServiceProfile(user,c,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.serviceProfile.message;}
    }else if(businessCommand||cmd.action==='confirm-business-content'){
      const active={...c,state_json:JSON.stringify(m)};
      m.localBusinessContent=cmd.action==='confirm-business-content'?confirmLocalBusinessContent(user,active,m,cmd.proposalId,cmd.requestId):proposeLocalBusinessContent(user,active,m,(cmd as Extract<Command,{action:'message'}>).text);
      message=m.localBusinessContent.message;
    }else if(requestCommand||cmd.action==='confirm-site-request'){
      const active={...c,state_json:JSON.stringify(m)};
      m.localRequests=cmd.action==='confirm-site-request'?confirmLocalRequest(user,active,m,cmd.proposalId,cmd.requestId):proposeLocalRequests(user,active,m,(cmd as Extract<Command,{action:'message'}>).text);
      message=m.localRequests.message;
    } else if(localCommand||cmd.action==='confirm-local'||cmd.action==='cancel-local'){
      const active={...c,state_json:JSON.stringify(m)};
      if(cmd.action==='cancel-local'){cancelLocalSite(m,cmd.proposalId);message='Proposition gratuite annulée, aucune version modifiée.';}else{m.localSite=cmd.action==='confirm-local'?confirmLocalSite(user,active,m,cmd.proposalId,cmd.requestId):proposeLocalSite(user,active,m,(cmd as Extract<Command,{action:'message'}>).text);message=m.localSite.message;}
    } else if (cmd.action === 'message' && intelligenceEnabled()) {
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
    if(!adCommand)delete m.localAdDocumentProposalId;
    if(!promptsCommand)delete m.localPrompts;
    if(!bookingRecordsCommand)delete m.bookingRecords;
    if(!bookingStaffCommand&&cmd.action!=='confirm-booking-staff'&&cmd.action!=='cancel-booking-staff'){delete m.bookingStaff;delete m.bookingStaffProposal;}
    if(!fileTrashCommand&&cmd.action!=='confirm-file-trash'&&cmd.action!=='cancel-file-trash'){delete m.localFileTrash;delete m.localFileTrashProposal;}
    if(!folderDeleteCommand&&cmd.action!=='confirm-folder-delete'&&cmd.action!=='cancel-folder-delete'){delete m.localFolderDelete;delete m.localFolderDeleteProposal;}
    if(!bookingServiceCatalogCommand&&cmd.action!=='confirm-booking-service-catalog'&&cmd.action!=='cancel-booking-service-catalog'){delete m.bookingServiceCatalog;delete m.bookingServiceCatalogProposal;}
    if(!bookingServiceTextCommand&&cmd.action!=='confirm-booking-service-text'&&cmd.action!=='cancel-booking-service-text'){delete m.bookingServiceText;delete m.bookingServiceTextProposal;}
    if(!bookingClosuresCommand&&cmd.action!=='confirm-booking-closures'&&cmd.action!=='cancel-booking-closures'){delete m.bookingClosures;delete m.bookingClosuresProposal;}
    if(!restaurantCommand&&cmd.action!=='confirm-restaurant-settings'&&cmd.action!=='cancel-restaurant-settings'){delete m.restaurantSettings;delete m.restaurantSettingsProposal;}
    if(!bookingHoursCommand&&cmd.action!=='confirm-booking-hours'&&cmd.action!=='cancel-booking-hours'){delete m.bookingHours;delete m.bookingHoursProposal;}
    if(!bookingEditCommand&&cmd.action!=='confirm-booking-edit'&&cmd.action!=='cancel-booking-edit'){delete m.bookingEdit;delete m.bookingEditProposal;}
    if(!bookingReadCommand)delete m.bookingServices;
    if(!fileRestoreCommand&&cmd.action!=='confirm-file-restore'&&cmd.action!=='cancel-file-restore'){delete m.localFileRestore;delete m.localFileRestoreProposal;}
    if(!folderMoveCommand&&cmd.action!=='confirm-folder-move'&&cmd.action!=='cancel-folder-move'){delete m.localFolderMove;delete m.localFolderMoveProposal;}
    if(!folderRenameCommand&&cmd.action!=='confirm-folder-rename'&&cmd.action!=='cancel-folder-rename'){delete m.localFolderRename;delete m.localFolderRenameProposal;}
    if(!folderCommand&&cmd.action!=='confirm-folder'&&cmd.action!=='cancel-folder'){delete m.localFolders;delete m.localFolderProposal;delete m.localFolderClarification;}
    if(!stockCommand&&cmd.action!=='confirm-stock'&&cmd.action!=='cancel-stock'){delete m.localStock;delete m.localStockProposal;}
    if(!calendarCommand&&cmd.action!=='confirm-calendar'&&cmd.action!=='cancel-calendar'){delete m.localCalendar;delete m.localCalendarProposal;}
    if(!restoreCommand&&cmd.action!=='confirm-restore'&&cmd.action!=='cancel-restore'){delete m.localThemeRestore;delete m.localThemeRestoreProposal;}
    if(!motionCommand&&cmd.action!=='confirm-motion'&&cmd.action!=='cancel-motion'){delete m.localSiteMotion;delete m.localSiteMotionProposal;}
    if(!themeChoiceCommand&&cmd.action!=='confirm-theme-choice'&&cmd.action!=='cancel-theme-choice'){delete m.localThemeChoice;delete m.localThemeChoiceProposal;}
    if(!pagesCommand&&cmd.action!=='confirm-pages'&&cmd.action!=='cancel-pages'){delete m.localPages;delete m.localPagesProposal;delete m.localPagesClarification;}
    if(!seoCommand&&cmd.action!=='confirm-seo'&&cmd.action!=='cancel-seo'){delete m.localSeo;delete m.localSeoProposal;}
    if(!serviceCommand&&cmd.action!=='confirm-service-profile'&&cmd.action!=='cancel-service-profile'){delete m.serviceProfile;delete m.serviceProfileProposal;}
    if(!businessCommand&&cmd.action!=='confirm-business-content'){delete m.localBusinessContent;delete m.localBusinessContentProposal;}
    if(!localCommand&&cmd.action!=='confirm-local'&&cmd.action!=='cancel-local')delete m.localSite;
    if(!fileCommand&&cmd.action!=='confirm-files'){delete m.localFiles;delete m.localFilesProposal;}
    if(!requestCommand&&cmd.action!=='confirm-site-request'){delete m.localRequests;delete m.localRequestProposal;}
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
    if(m.localSite)response.localSite=m.localSite;
    if(m.localBusinessContent)response.localBusinessContent=m.localBusinessContent;
    // Pas de récursion des historiques dans les reçus ; GET sert l'historique paginé complet.
    response.history = []; response.historyBefore = null;
    run("INSERT INTO agent_conversation_turns (id,conversation_id,revision,request_id,request_hash,request_json,response_json,created_at) VALUES (?,?,?,?,?,?,?,?)", id(), c.id, next, cmd.requestId, hash, JSON.stringify(cmd), JSON.stringify(response), now());
    return response;
  });
}

/** Une commande locale candidate ne peut jamais devenir un appel fournisseur implicite. */
export async function submitConversation(user:User,cid:string,raw:unknown,tests:TestDependencies={}):Promise<ConversationView>{
 const parsed=CommandSchema.safeParse(raw),cmd=parsed.success?parsed.data:null;
 const pagesReply=cmd?.action==='message'&&pagesModelReplyCandidate(cmd.text)&&hasPagesModelReply(metaOf(ownedConversation(user,cid,true)),cmd.text);
 const local=cmd?.action==='confirm-booking-service-catalog'||cmd?.action==='cancel-booking-service-catalog'||cmd?.action==='message'&&bookingServiceCatalogCandidate(cmd.text)||cmd?.action==='message'&&bookingRecordsCandidate(cmd.text)||cmd?.action==='confirm-booking-staff'||cmd?.action==='cancel-booking-staff'||cmd?.action==='message'&&bookingStaffCandidate(cmd.text)||cmd?.action==='confirm-file-trash'||cmd?.action==='cancel-file-trash'||cmd?.action==='message'&&localFileTrashCandidate(cmd.text)||cmd?.action==='confirm-folder-delete'||cmd?.action==='cancel-folder-delete'||cmd?.action==='message'&&localFolderDeleteCandidate(cmd.text)||cmd?.action==='confirm-booking-service-text'||cmd?.action==='cancel-booking-service-text'||cmd?.action==='message'&&bookingServiceTextCandidate(cmd.text)||cmd?.action==='confirm-booking-closures'||cmd?.action==='cancel-booking-closures'||cmd?.action==='message'&&bookingClosuresCandidate(cmd.text)||cmd?.action==='confirm-restaurant-settings'||cmd?.action==='cancel-restaurant-settings'||cmd?.action==='message'&&restaurantSettingsCandidate(cmd.text)||cmd?.action==='confirm-booking-hours'||cmd?.action==='cancel-booking-hours'||cmd?.action==='message'&&bookingHoursCandidate(cmd.text)||cmd?.action==='confirm-booking-edit'||cmd?.action==='cancel-booking-edit'||cmd?.action==='message'&&bookingEditCandidate(cmd.text)||cmd?.action==='confirm-folder-move'||cmd?.action==='cancel-folder-move'||cmd?.action==='message'&&localFolderMoveCandidate(cmd.text)||cmd?.action==='confirm-folder-rename'||cmd?.action==='cancel-folder-rename'||cmd?.action==='message'&&localFolderRenameCandidate(cmd.text)||cmd?.action==='confirm-file-restore'||cmd?.action==='cancel-file-restore'||cmd?.action==='message'&&localFileRestoreCandidate(cmd.text)||cmd?.action==='message'&&hasFolderClarificationReply(metaOf(ownedConversation(user,cid,true)),cmd.text)||cmd?.action==='confirm-folder'||cmd?.action==='cancel-folder'||cmd?.action==='message'&&localFoldersCandidate(cmd.text)||cmd?.action==='confirm-restore'||cmd?.action==='cancel-restore'||cmd?.action==='message'&&localThemeRestoreGuardCandidate(cmd.text)||cmd?.action==='confirm-motion'||cmd?.action==='cancel-motion'||cmd?.action==='message'&&localSiteMotionCandidate(cmd.text)||cmd?.action==='confirm-theme-choice'||cmd?.action==='cancel-theme-choice'||cmd?.action==='message'&&localThemeChoiceCandidate(cmd.text)||cmd?.action==='confirm-calendar'||cmd?.action==='cancel-calendar'||cmd?.action==='message'&&localCalendarCandidate(cmd.text)||cmd?.action==='confirm-stock'||cmd?.action==='cancel-stock'||cmd?.action==='message'&&localStockCandidate(cmd.text)||pagesReply||cmd?.action==='confirm-pages'||cmd?.action==='cancel-pages'||cmd?.action==='message'&&localPagesCandidate(cmd.text)||cmd?.action==='confirm-seo'||cmd?.action==='cancel-seo'||cmd?.action==='message'&&localSeoCandidate(cmd.text)||cmd?.action==='message'&&adDocumentCandidate(cmd.text)||cmd?.action==='confirm-local'||cmd?.action==='cancel-local'||cmd?.action==='confirm-site-request'||cmd?.action==='confirm-files'||cmd?.action==='confirm-business-content'||cmd?.action==='confirm-service-profile'||cmd?.action==='cancel-service-profile'||cmd?.action==='message'&&(bookingServicesCandidate(cmd.text)||localPromptsCandidate(cmd.text)||localRequestsCandidate(cmd.text)||localSiteCandidate(cmd.text)||localFilesCandidate(cmd.text)||localBusinessContentCandidate(cmd.text)||serviceProfileCandidate(cmd.text));
 return local?withAiDisabled('B1 : retouche gratuite déterministe, aucun devis IA',()=>submitConversationImpl(user,cid,raw,tests)):submitConversationImpl(user,cid,raw,tests);
}
