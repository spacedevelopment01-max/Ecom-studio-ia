/** Lot B : propositions cognitives strictes, jamais des permissions ou des commandes exécutables. */
import { z } from 'zod';
import {AgentRoleSchema,type AgentRole} from './specialists';
import {CompositionPlanSchema} from '../../theme/composition/contract';
import {RenderToolPlanSchema} from './render-tool-contract';
import {ExportToolPlanSchema} from './export-tool-contract';
import {ThemeToolPlanSchema} from './theme-tool-contract';

import {StrategyChoiceProposalSchema} from './strategy-choice-contract';
const text = (max: number) => z.string().trim().min(1).max(max);
export const CognitiveQuestionSchema = z.object({
  id: text(60).regex(/^[a-z0-9_-]+$/),
  field: z.enum(['business', 'target', 'goals', 'offerName', 'brandName', 'constraints', 'services', 'custom']),
  title: text(500), why: text(1200), multiple: z.boolean(),
  choices: z.array(z.object({ id: text(60).regex(/^[a-z0-9_-]+$/), label: text(240) }).strict()).min(2).max(5),
}).strict().superRefine((q, c) => {
  if (!q.choices.some(x => x.id === 'other')) c.addIssue({ code: 'custom', message: 'other_required' });
  if (new Set(q.choices.map(x => x.id)).size !== q.choices.length) c.addIssue({ code: 'custom', message: 'duplicate_choices' });
});
const noUnprovedCompletion = (s: string) => !/^(?:c['’]est fait|fait\s*[.!]|done\s*[.!])|(?:j['’]ai|nous avons|i have|i['’]ve|we have)\s+(?:créé|publié|envoyé|supprimé|acheté|réservé|created|published|sent|deleted|bought|booked)|(?:a été|ont été|has been|have been)\s+(?:créé|créée|publié|publiée|envoyé|envoyée|supprimé|supprimée|created|published|sent|deleted)/i.test(s);
export const CognitiveReplySchema = z.object({
  specialistSuggestions:z.array(AgentRoleSchema.exclude(['principal'])).max(2).optional(),
  message: text(6000).refine(noUnprovedCompletion, 'Aucune exécution métier n’a eu lieu ; ne pas annoncer une action terminée.'),
  status: z.enum(['question', 'clarification', 'summary', 'answer', 'unavailable']),
  business: z.enum(['products', 'services']).nullable(),
  businessEvidence: z.object({ sourceId: text(120), quote: text(8000) }).strict().nullable(),
  question: CognitiveQuestionSchema.nullable(),
  proposedChanges: z.array(z.object({
    field: z.enum(['target', 'offerName', 'brandName', 'constraints', 'goals']),
    value: text(1200), sourceId: text(120), quote: text(8000),
  }).strict()).max(8),
  knowledgeSourceIds: z.array(text(100)).max(20),
  proposedTools: z.array(z.enum(['understand-offer', 'research', 'brief.update', 'studio.help','theme.edit','theme.compose','theme.export','theme.inspect-render'])).max(3),
  strategyChoice:StrategyChoiceProposalSchema.optional(),
  themePlan:ThemeToolPlanSchema.optional(),
  compositionPlan:CompositionPlanSchema.optional(),
  exportPlan:ExportToolPlanSchema.optional(),
  renderPlan:RenderToolPlanSchema.optional(),
  actionsExecuted: z.literal(false),
}).strict().superRefine((r,ctx)=>{if([r.themePlan,r.compositionPlan,r.exportPlan,r.renderPlan].filter(Boolean).length>1)ctx.addIssue({code:'custom',message:'Une seule opération de thème par proposition.'});});
export type CognitiveReply = z.infer<typeof CognitiveReplySchema>;
export type CognitiveQuestion = z.infer<typeof CognitiveQuestionSchema>;
export type CognitiveState = {
  lastRole?:AgentRole;
  boundId?:string;
  lastReply?: CognitiveReply;
  lastReceiptId?: string;
  pendingJobId?: string;
  questionHistory?: CognitiveQuestion[];
  proposalId?: string;
  sourceRevision?: number;
  sourceProjectRevision?:number|null;
};
export type IntelligenceView = {
  roles?:{id:AgentRole;label:string}[];
  lastRole?:AgentRole;
  requestBounds?:ReturnType<typeof import('../../ai/request-bounds').boundPublic>;
  available: boolean; state: 'describe' | 'requires_quote' | 'running' | 'reply' | 'failed' | 'stale';
  pendingJobId: string | null; reply: CognitiveReply | null;
  lastReceiptId?:string|null;
  proposalId: string | null; sourceRevision: number | null;
  sourceProjectRevision?:number|null;
  provenance: 'provider' | 'simulation' | null;
  message: string; qualification: 'real_provider_not_tested';
};
export const IntelligenceCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('quote'), revision: z.number().int().nonnegative(), projectRevision: z.number().int().nonnegative().nullable(), subscriptionKey: text(100).optional(),role:AgentRoleSchema.optional() }).strict(),
  z.object({ action: z.literal('confirm'), quoteId: text(100), confirmation: z.literal(true), requestId: text(80).regex(/^[a-zA-Z0-9_-]{8,80}$/) }).strict(),
]);
