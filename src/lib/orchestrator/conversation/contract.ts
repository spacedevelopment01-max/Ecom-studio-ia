/** Contrat serveur du lot A ; aucune commande d'exécution, publication ou validation d'étape. */
import { z } from "zod";
import {ActiveContextSchema,type ActiveContext} from './active-context-contract';
import type { Brief } from "../../preparation/types";
import type { BusinessType } from "../../project-types";

export const QUESTION_KEYS = ["business", "goals", "target"] as const;
export type QuestionKey = (typeof QUESTION_KEYS)[number];
export const EDIT_FIELDS = ["description", "target", "offerName", "brandName", "constraints", "services", "customization", "process", "quote"] as const;
export type EditField = (typeof EDIT_FIELDS)[number];
import {ANGLE_IDS} from "../../marketing-strategy/types";
const base = z.object({
  revision: z.number().int().min(0),
  requestId: z.string().min(8).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  projectRevision: z.number().int().min(0).nullable(),
});
export const CommandSchema = z.discriminatedUnion("action", [
  base.extend({action:z.literal('confirm-booking-staff'),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal('cancel-booking-staff'),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal('confirm-file-trash'),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal('cancel-file-trash'),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal('confirm-folder-delete'),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal('cancel-folder-delete'),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal('confirm-booking-staff-catalog'),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal('confirm-booking-service-catalog'),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal('cancel-booking-staff-catalog'),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal('cancel-booking-service-catalog'),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal('confirm-booking-service-text'),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal('cancel-booking-service-text'),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal('confirm-booking-closures'),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal('cancel-booking-closures'),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal('confirm-restaurant-settings'),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal('cancel-restaurant-settings'),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal('confirm-booking-hours'),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal('cancel-booking-hours'),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal('confirm-booking-edit'),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal('cancel-booking-edit'),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("confirm-file-restore"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("cancel-file-restore"),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("confirm-folder-move"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("cancel-folder-move"),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("confirm-folder-rename"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("cancel-folder-rename"),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("confirm-folder"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("cancel-folder"),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("confirm-stock"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("confirm-calendar"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("confirm-restore"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("confirm-motion"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("confirm-theme-choice"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("cancel-stock"),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("cancel-calendar"),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("cancel-restore"),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("cancel-motion"),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("cancel-theme-choice"),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("confirm-pages"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("cancel-pages"),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("confirm-seo"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("cancel-seo"),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("cancel-local"),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("confirm-service-profile"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("cancel-service-profile"),proposalId:z.string().min(1).max(120)}).strict(),
  base.extend({action:z.literal("confirm-files"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal('confirm-business-content'),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("confirm-site-request"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("confirm-local"),proposalId:z.string().min(1).max(120),confirmation:z.literal(true)}).strict(),
  base.extend({action:z.literal("open-strategy-comparison"),comparisonId:z.string().min(1).max(100)}).strict(),
  base.extend({action:z.literal("compare-strategy-options"),angleIds:z.array(z.enum(ANGLE_IDS)).min(2).max(5).optional(),sourceComparisonId:z.string().min(1).max(100).optional(),sourceVersion:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict(),
  base.extend({action:z.literal("decide-strategy-option"),comparisonId:z.string().min(1).max(100),version:z.string().regex(/^[a-f0-9]{64}$/),angleId:z.enum(ANGLE_IDS),decision:z.enum(["prefer","reject"]),reason:z.string().trim().min(1).max(1200)}).strict(),
  base.extend({action:z.literal("undo-strategy-preference"),decisionId:z.string().min(1).max(100)}).strict(),
  base.extend({action:z.literal("accept-strategy-preference"),receiptId:z.string().min(1).max(100)}).strict(),
  base.extend({ action: z.literal("message"), text: z.string().trim().min(1).max(8000), context:ActiveContextSchema.optional(), referenceUrls: z.array(z.url().max(1000)).max(12).optional(), photoIds: z.array(z.string().min(1).max(80)).max(12).optional() }).strict(),
  base.extend({ action: z.literal("answer"), question: z.enum(QUESTION_KEYS), choices: z.array(z.string().max(60)).max(5).default([]), text: z.string().trim().max(1200).default(""), unknown: z.boolean().default(false) }).strict(),
  base.extend({ action: z.literal("edit"), field: z.enum(EDIT_FIELDS), value: z.string().trim().min(1).max(8000) }).strict(),
  base.extend({ action: z.literal("edit-services"), items: z.array(z.object({ name: z.string().trim().min(1).max(160), description: z.string().trim().max(1000) }).strict()).max(20) }).strict(),
  base.extend({ action: z.literal("back"), question: z.enum(QUESTION_KEYS).optional() }).strict(),
  base.extend({ action: z.literal("explain") }).strict(),
  base.extend({ action: z.literal("summary") }).strict(),
  base.extend({ action: z.literal("prepare-action"), tool: z.literal("understand-offer"), correction: z.string().max(1200).optional() }).strict(),
  base.extend({ action: z.literal('answer-ai'), questionId: z.string().regex(/^[a-z0-9_-]{1,60}$/), choices: z.array(z.string().max(60)).max(5).default([]), text: z.string().trim().max(1200).default(''), unknown: z.boolean().default(false) }).strict(),
  base.extend({ action: z.literal('accept-ai-changes'), proposalId: z.string().min(1).max(100) }).strict(),
  base.extend({ action: z.literal('back-ai'), questionId: z.string().regex(/^[a-z0-9_-]{1,60}$/) }).strict(),
]);
export type Command = z.infer<typeof CommandSchema>;
/** Un seul Brief natif pour le brouillon ; après rattachement, il est retiré et relu via stateOf(projectId). */
export type ConversationState = {
  bookingWorkshops?:import('./local-booking-workshops').BookingWorkshopsState;
  bookingAvailability?:import('./local-booking-availability').BookingAvailabilityState;
  bookingStaffCatalogProposal?:import('./local-booking-staff-catalog').BookingStaffCatalogProposal;
  bookingServiceCatalogProposal?:import('./local-booking-service-catalog').BookingServiceCatalogProposal;
  bookingStaffCatalog?:import('./local-booking-staff-catalog').BookingStaffCatalogPresentation;
  bookingServiceCatalog?:import('./local-booking-service-catalog').BookingServiceCatalogPresentation;
  bookingRecords?:import('./local-booking-records').BookingRecordsState;
  bookingStaffProposal?:import('./local-booking-staff').BookingStaffProposal;
  bookingStaff?:import('./local-booking-staff').BookingStaffPresentation;
  localFileTrashProposal?:import('./local-file-trash').FileTrashProposal;
  localFileTrash?:import('./local-file-trash').FileTrashPresentation;
  localFolderDeleteProposal?:import('./local-folder-delete').FolderDeleteProposal;
  localFolderDelete?:import('./local-folder-delete').FolderDeletePresentation;
  bookingServiceTextProposal?:import('./local-booking-service-text').BookingServiceTextProposal;
  bookingServiceText?:import('./local-booking-service-text').BookingServiceTextPresentation;
  bookingClosuresProposal?:import('./local-booking-closures').BookingClosuresProposal;
  bookingClosures?:import('./local-booking-closures').BookingClosuresPresentation;
  restaurantSettingsProposal?:import('./local-restaurant-settings').RestaurantSettingsProposal;
  restaurantSettings?:import('./local-restaurant-settings').RestaurantSettingsPresentation;
  bookingHoursProposal?:import('./local-booking-hours').BookingHoursProposal;
  bookingHours?:import('./local-booking-hours').BookingHoursPresentation;
  bookingEditProposal?:import('./local-booking-edit').BookingEditProposal;
  bookingEdit?:import('./local-booking-edit').BookingEditPresentation;
  bookingServices?:import('./local-booking-services').BookingServicesState;
  conversationPhotoIds?:string[];
  localAdDocumentProposalId?:string;
  localPrompts?:import('./local-prompts').LocalPromptsState;
  localPagesClarification?:{title:string;versionId:string;expiresAt:number;tab:string|null};
  localFolderClarification?:{name:string;expiresAt:number};
  localFileRestoreProposal?:import("./local-file-restore").FileRestoreProposal;
  localFolderMoveProposal?:import("./local-folder-move").FolderMoveProposal;
  localFolderRenameProposal?:import("./local-folder-rename").FolderRenameProposal;
  localFolderProposal?:import("./local-folders").FolderProposal;
  localStockProposal?:import("./local-stock").StockProposal;
  localCalendarProposal?:import("./local-calendar").CalendarProposal;
  localThemeRestoreProposal?:import("./local-theme-restore").RestoreProposal;
  localSiteMotionProposal?:import("./local-site-motion").MotionProposal;
  localThemeChoiceProposal?:import("./local-theme-choice").ThemeChoiceProposal;
  localPagesProposal?:import("./local-pages").PagesProposal;
  localSeoProposal?:import("./local-seo").SeoProposal;
  serviceProfileProposal?:import("./local-service-profile").ServiceProfileProposal;
  localFileRestore?:import("./local-file-restore").FileRestorePresentation;
  localFolderMove?:import("./local-folder-move").FolderMovePresentation;
  localFolderRename?:import("./local-folder-rename").FolderRenamePresentation;
  localFolders?:import("./local-folders").FolderPresentation;
  localStock?:import("./local-stock").StockPresentation;
  localCalendar?:import("./local-calendar").CalendarPresentation;
  localThemeRestore?:import("./local-theme-restore").RestorePresentation;
  localSiteMotion?:import("./local-site-motion").MotionPresentation;
  localThemeChoice?:import("./local-theme-choice").ThemeChoicePresentation;
  localPages?:import("./local-pages").PagesPresentation;
  localSeo?:import("./local-seo").SeoPresentation;
  serviceProfile?:import("./local-service-profile").ServiceProfilePresentation;
  localBusinessContentProposal?:import('./local-business-content').LocalBusinessContentProposal;
  localBusinessContent?:import('./local-business-content').LocalBusinessContentPresentation;
  schemaVersion: 1;
  draft: Brief | null;
  business: BusinessType | null;
  businessSource: "client" | "local" | "existing" | "unknown" | 'ai';
  deferred: QuestionKey[];
  answeredOrder: QuestionKey[];
  editing?: QuestionKey;
  intelligence?: import('./intelligence-contract').CognitiveState;
  localFilesProposal?: import('./local-files').LocalFilesProposal;
  localFiles?: import('./local-files').LocalFilesPresentation;
  localRequestProposal?:import('./local-site-requests').LocalRequestProposal;
  localRequests?:import('./local-site-requests').LocalRequestsState;
  localSiteProposal?: import('./local-site').LocalSiteProposal;
  localSite?: import('./local-site').LocalSitePresentation;
  activeContext?: ActiveContext;
  activeContextReference?: string;
  activeContextIdentity?: string;
  activeContextTab?: ActiveContext['tab'];
  strategyChoices?:import("./strategy-choices").StrategyChoicesState;
  studioObservation?:import('./studio-observation').StudioObservation;
  /** A1 : rattachement historique en lecture, jamais une nouvelle Préparation. */
  recovery?: { schema: 'existing-project-read-1'; mode: 'read-only' };
};
export type ConversationRow = { id: string; user_id: string; project_id: string | null; revision: number; state_json: string; created_at: number; updated_at: number };
export type ChoiceCard = {
  kind: "question";
  key: QuestionKey;
  title: string;
  why: string;
  multiple: boolean;
  choices: { id: string; label: string }[];
  allowFreeText: true;
  allowUnknown: true;
  currentAnswer: string;
};
export type ActionCard = {
  kind: "action";
  tool: string;
  state: "available" | "requires_quote" | "requires_confirmation" | "unavailable";
  message: string;
  executed: false;
  quote?: { id: string; estimatePct: number | null; maximumPct: number | null; expiresAt: number; confirmationRequired: true; executionEnabled: false };
  href?: string;
};
export type ConversationView = {
  bookingRecords?:import('./local-booking-records').BookingRecordsPresentation;
  bookingRecordsRead?:{enabled:true};
  bookingStaff?:import('./local-booking-staff').BookingStaffPresentation;
  bookingStaffExecution?:{enabled:true};
  localFileTrash?:import('./local-file-trash').FileTrashPresentation;
  localFileTrashExecution?:{enabled:true};
  localFolderDelete?:import('./local-folder-delete').FolderDeletePresentation;
  localFolderDeleteExecution?:{enabled:true};
  bookingWorkshops?:import('./local-booking-workshops').BookingWorkshopsPresentation;
  bookingWorkshopsRead?:{enabled:true};
  bookingAvailability?:import('./local-booking-availability').BookingAvailabilityPresentation;
  bookingAvailabilityRead?:{enabled:true};
  bookingStaffCatalog?:import('./local-booking-staff-catalog').BookingStaffCatalogPresentation;
  bookingServiceCatalog?:import('./local-booking-service-catalog').BookingServiceCatalogPresentation;
  bookingStaffCatalogExecution?:{enabled:true};
  bookingServiceCatalogExecution?:{enabled:true};
  bookingServiceText?:import('./local-booking-service-text').BookingServiceTextPresentation;
  bookingServiceTextExecution?:{enabled:true};
  bookingClosures?:import('./local-booking-closures').BookingClosuresPresentation;
  bookingClosuresExecution?:{enabled:true};
  restaurantSettings?:import('./local-restaurant-settings').RestaurantSettingsPresentation;
  restaurantSettingsExecution?:{enabled:true};
  bookingHours?:import('./local-booking-hours').BookingHoursPresentation;
  bookingHoursExecution?:{enabled:true};
  bookingEdit?:import('./local-booking-edit').BookingEditPresentation;
  bookingEditExecution?:{enabled:true};
  bookingServicesRead?:{enabled:true};
  bookingServices?:import('./local-booking-services').BookingServicesPresentation;
  /** Permission for native free project operations; independent of the acquired preparation brief lock. A1 uses recovery.localEdits only. */
  localEditsWritable?:boolean;
  localAdDocument?:ReturnType<typeof import('./ad-document-tool-execution').adDocumentPresentation>;
  localAdDocumentExecution?:{enabled:true};
  localPromptsRead?:{enabled:true};
  localPrompts?:import('./local-prompts').LocalPromptsPresentation;
  conversationPhotos?:import('./photo-attachments').ConversationPhotos;
  photoImport?:{enabled:true;endpoint:string;maxFileBytes:number;kind:'image';analysis:false};
  localFilesExecution?: {enabled:true};
  localFiles?: import('./local-files').LocalFilesPresentation;
  localBusinessContentExecution?:{enabled:true};
  localFileRestore?:import("./local-file-restore").FileRestorePresentation;
  localFolderMove?:import("./local-folder-move").FolderMovePresentation;
  localFolderRename?:import("./local-folder-rename").FolderRenamePresentation;
  localFolders?:import("./local-folders").FolderPresentation;
  localStock?:import("./local-stock").StockPresentation;
  localCalendar?:import("./local-calendar").CalendarPresentation;
  localThemeRestore?:import("./local-theme-restore").RestorePresentation;
  localSiteMotion?:import("./local-site-motion").MotionPresentation;
  localThemeChoice?:import("./local-theme-choice").ThemeChoicePresentation;
  localPages?:import("./local-pages").PagesPresentation;
  localSeo?:import("./local-seo").SeoPresentation;
  serviceProfile?:import("./local-service-profile").ServiceProfilePresentation;
  localFileRestoreExecution?:{enabled:true};
  localFolderMoveExecution?:{enabled:true};
  localFolderRenameExecution?:{enabled:true};
  localFoldersExecution?:{enabled:true};
  localStockExecution?:{enabled:true};
  localCalendarExecution?:{enabled:true};
  localThemeRestoreExecution?:{enabled:true};
  localSiteMotionExecution?:{enabled:true};
  localThemeChoiceExecution?:{enabled:true};
  localPagesExecution?:{enabled:true};
  localSeoExecution?:{enabled:true};
  serviceProfileExecution?:{enabled:true};
  localBusinessContent?:import('./local-business-content').LocalBusinessContentPresentation;
  localRequestsExecution?:{enabled:true};
  localRequests?:import('./local-site-requests').LocalRequestsPresentation;
  localSiteExecution?: {enabled:true};
  localSite?: import('./local-site').LocalSitePresentation;
  schema: "studio-conversation-1";
  recovery?: import('./existing-project').ExistingProjectRecovery;
  id: string;
  projectId: string | null;
  revision: number;
  projectRevision: number | null;
  mode: "local" | "simulation" | 'ai';
  intelligence?: import('./intelligence-contract').IntelligenceView;
  execution?: {enabled:true};
  themeExecution?: {enabled:true};
  exportExecution?: {enabled:true};
  renderExecution?: {enabled:true};
  researchExecution?: {enabled:true};
  brandExecution?: {enabled:true;review?:true};
  catalogueExecution?: {enabled:true};
  imageExecution?: {enabled:true};
  logoExecution?: {enabled:true};
  socialExecution?:{enabled:true};
  contentExecution?:{enabled:true};
  videoExecution?: {enabled:true;generation?:true;voice?:true;clip?:true};
  activeContext?: {enabled:true;current:ReturnType<typeof import('./active-context').observedActiveContext>;presentation?:ReturnType<typeof import('./context-session').contextPresentation>};
  strategyChoices?:ReturnType<typeof import("./strategy-choices").strategyChoicesView>;
  studioHelp?:{observation:import('./studio-observation').StudioObservation;capabilities:ReturnType<typeof import('./studio-operations').studioOperationCatalogue>};
  progress: "describe" | "clarify" | "collect" | "review";
  message: string;
  question: ChoiceCard | null;
  correctionFields: EditField[];
  readOnlyReason: string | null;
  creation: ReturnType<typeof import("./creation").creationFields> | null;
  tools: { id: string; state: "available" | "quote_only" | "not_connected" | "unavailable"; executionEnabled: boolean }[];
  summary: { description: string; business: BusinessType | null; businessSource: ConversationState["businessSource"]; target: string; goals: string; offerName: string; brandName: string; constraints: string; services: {name:string;description:string;source:string}[]; contactModes: string[]; facts: { key: string; label: string; value: string; status: string; source: string }[]; unknown: string[]; referenceUrls: string[]; photoIds: string[]; approved: boolean; preparationStatus:"draft"|"approved"|"stale"|"absent" };
  action: ActionCard | null;
  history: { revision: number; request: unknown; message: string; at: number }[];
  historyBefore: number | null;
};
