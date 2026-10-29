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
  schemaVersion: 1;
  draft: Brief | null;
  business: BusinessType | null;
  businessSource: "client" | "local" | "existing" | "unknown" | 'ai';
  deferred: QuestionKey[];
  answeredOrder: QuestionKey[];
  editing?: QuestionKey;
  intelligence?: import('./intelligence-contract').CognitiveState;
  activeContext?: ActiveContext;
  strategyChoices?:import("./strategy-choices").StrategyChoicesState;
  studioObservation?:import('./studio-observation').StudioObservation;
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
  schema: "studio-conversation-1";
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
  catalogueExecution?: {enabled:true};
  imageExecution?: {enabled:true};
  activeContext?: {enabled:true;current:ReturnType<typeof import('./active-context').observedActiveContext>};
  strategyChoices?:ReturnType<typeof import("./strategy-choices").strategyChoicesView>;
  studioHelp?:{observation:import('./studio-observation').StudioObservation;capabilities:ReturnType<typeof import('./studio-operations').studioOperationCatalogue>};
  progress: "describe" | "clarify" | "collect" | "review";
  message: string;
  question: ChoiceCard | null;
  correctionFields: EditField[];
  readOnlyReason: string | null;
  creation: ReturnType<typeof import("./creation").creationFields> | null;
  tools: { id: string; state: "available" | "quote_only" | "not_connected" | "unavailable"; executionEnabled: boolean }[];
  summary: { description: string; business: BusinessType | null; businessSource: ConversationState["businessSource"]; target: string; goals: string; offerName: string; brandName: string; constraints: string; services: {name:string;description:string;source:string}[]; contactModes: string[]; facts: { key: string; label: string; value: string; status: string; source: string }[]; unknown: string[]; referenceUrls: string[]; photoIds: string[]; approved: boolean; preparationStatus:"draft"|"approved"|"stale" };
  action: ActionCard | null;
  history: { revision: number; request: unknown; message: string; at: number }[];
  historyBefore: number | null;
};
