/** Lot B : propositions cognitives strictes, jamais des permissions ou des commandes exécutables. */
import { z } from 'zod';
import {BrandCorrectionPlanSchema} from './brand-review-contract';
import {AgentRoleSchema,type AgentRole} from './specialists';
import {CompositionPlanSchema} from '../../theme/composition/contract';
import {RenderToolPlanSchema} from './render-tool-contract';
import {ExportToolPlanSchema} from './export-tool-contract';
import {ThemeToolPlanSchema} from './theme-tool-contract';
import {CataloguePlanSchema} from './catalogue-tool-contract';
import {ImageToolPlanSchema} from './image-tool-contract';
import {LogoToolPlanSchema} from './logo-tool-contract';
import {VideoGenerationPlanSchema}from './video-generation-contract';
import {VideoToolPlanSchema}from './video-tool-contract';
import {VideoVoicePlanSchema}from './video-voice-contract';
import {VideoClipPlanSchema}from './video-clip-contract';
import {SocialToolPlanSchema}from './social-tool-contract';

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
const CognitiveReplyBaseSchema = z.object({
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
  proposedTools: z.array(z.enum(['understand-offer', 'research', 'brief.update', 'studio.help','theme.edit','theme.compose','theme.export','theme.inspect-render','catalogue.draft','images.create','images.edit','logos.create','videos.motion','videos.edit','videos.restore'])).max(3),
  videoPlan:VideoToolPlanSchema.optional(),
  logoPlan:LogoToolPlanSchema.optional(),
  imagePlan:ImageToolPlanSchema.optional(),
  cataloguePlan:CataloguePlanSchema.optional(),
  strategyChoice:StrategyChoiceProposalSchema.optional(),
  themePlan:ThemeToolPlanSchema.optional(),
  compositionPlan:CompositionPlanSchema.optional(),
  exportPlan:ExportToolPlanSchema.optional(),
  renderPlan:RenderToolPlanSchema.optional(),
  actionsExecuted: z.literal(false),
}).strict();
function refineReply(r:Omit<z.infer<typeof CognitiveReplyBaseSchema>,'proposedTools'>&{proposedTools:string[];generationPlan?:z.infer<typeof VideoGenerationPlanSchema>;voicePlan?:z.infer<typeof VideoVoicePlanSchema>;clipPlan?:z.infer<typeof VideoClipPlanSchema>;socialPlan?:z.infer<typeof SocialToolPlanSchema>;brandCorrection?:z.infer<typeof BrandCorrectionPlanSchema>},ctx:z.RefinementCtx){if([r.themePlan,r.compositionPlan,r.exportPlan,r.renderPlan,r.cataloguePlan,r.imagePlan,r.logoPlan,r.videoPlan,r.generationPlan,r.voicePlan,r.clipPlan,r.socialPlan,r.brandCorrection].filter(Boolean).length>1)ctx.addIssue({code:'custom',message:'Une seule opération native par proposition.'});if(!!r.generationPlan!==(r.proposedTools as string[]).some(id=>id==='videos.generate' as string))ctx.addIssue({code:'custom',message:'Le plan génératif doit correspondre à son outil.'});if(!!r.voicePlan!==r.proposedTools.includes('videos.voice'))ctx.addIssue({code:'custom',message:'Le plan vocal doit correspondre à son outil.'});if(!!r.clipPlan!==r.proposedTools.includes('videos.retake'))ctx.addIssue({code:'custom',message:'Le plan de reprise doit correspondre à son outil.'});if(!!r.brandCorrection!==r.proposedTools.includes('brand.correct'))ctx.addIssue({code:'custom',message:'La correction de marque doit correspondre à son outil.'});const socials=r.proposedTools.filter(id=>id==='social.draft'||id==='social.plan'||id==='campaign.draft');if(r.socialPlan?socials.length!==1||socials[0]!==r.socialPlan.tool:socials.length>0)ctx.addIssue({code:'custom',message:'Le plan social doit correspondre à son outil unique.'});const videos=r.proposedTools.filter(id=>id.startsWith('videos.')&&id!=='videos.generate'&&id!=='videos.voice'&&id!=='videos.retake');if(r.videoPlan?videos.length!==1||r.videoPlan.tool!==videos[0]:videos.length>0)ctx.addIssue({code:'custom',message:'Le plan vidéo doit correspondre à son outil unique.'});if(!!r.logoPlan!==r.proposedTools.includes('logos.create'))ctx.addIssue({code:'custom',message:'Le plan logo doit correspondre à son outil.'});if(!!r.cataloguePlan!==r.proposedTools.includes('catalogue.draft'))ctx.addIssue({code:'custom',message:'Le plan Catalogue doit correspondre à son outil.'});const images=r.proposedTools.filter(id=>id==='images.create'||id==='images.edit');if(r.imagePlan?images.length!==1||r.imagePlan.tool!==images[0]:images.length>0)ctx.addIssue({code:'custom',message:'Le plan image doit correspondre à son outil unique.'});}
const LegacyCognitiveReplySchema=CognitiveReplyBaseSchema.superRefine(refineReply);
const GenerationBase=CognitiveReplyBaseSchema.extend({generationPlan:VideoGenerationPlanSchema.optional(),proposedTools:z.array(z.enum([...CognitiveReplyBaseSchema.shape.proposedTools.element.options,'videos.generate'])).max(3)});
const GenerationReplySchema=GenerationBase.superRefine(refineReply);
const VoiceBase=GenerationBase.extend({voicePlan:VideoVoicePlanSchema.optional(),proposedTools:z.array(z.enum([...GenerationBase.shape.proposedTools.element.options,'videos.voice'])).max(3)});
const ClipBase=VoiceBase.extend({clipPlan:VideoClipPlanSchema.optional(),proposedTools:z.array(z.enum([...VoiceBase.shape.proposedTools.element.options,'videos.retake'])).max(3)});
const SocialBase=ClipBase.extend({socialPlan:SocialToolPlanSchema.optional(),proposedTools:z.array(z.enum([...ClipBase.shape.proposedTools.element.options,'social.draft','social.plan','campaign.draft'])).max(3)});
const BrandBase=SocialBase.extend({brandCorrection:BrandCorrectionPlanSchema.optional(),proposedTools:z.array(z.enum([...SocialBase.shape.proposedTools.element.options,'brand.propose','brand.confirm','brand.correct'])).max(3)});
export const CognitiveReplySchema=BrandBase.superRefine(refineReply);
function socialResponseSchema(logos:boolean,videos:boolean,generation:boolean,voice:boolean,clip:boolean){let base=SocialBase;if(!clip||!videos)base=base.omit({clipPlan:true}) as typeof base;if(!voice||!videos)base=base.omit({voicePlan:true}) as typeof base;if(!generation||!videos)base=base.omit({generationPlan:true}) as typeof base;if(!videos)base=base.omit({videoPlan:true}) as typeof base;if(!logos)base=base.omit({logoPlan:true}) as typeof base;return base.extend({proposedTools:z.array(z.enum(SocialBase.shape.proposedTools.element.options.filter(id=>!(!logos&&id==='logos.create'||!videos&&id.startsWith('videos.')||!generation&&id==='videos.generate'||!voice&&id==='videos.voice'||!clip&&id==='videos.retake')))).max(3)}).superRefine(refineReply);}
function clipResponseSchema(logos:boolean,generation:boolean,voice:boolean){const v=voice?ClipBase:ClipBase.omit({voicePlan:true}).extend({proposedTools:z.array(z.enum(ClipBase.shape.proposedTools.element.options.filter(id=>id!=='videos.voice'))).max(3)});const g=generation?v:v.omit({generationPlan:true}).extend({proposedTools:z.array(z.enum(v.shape.proposedTools.element.options.filter(id=>id!=='videos.generate'))).max(3)});return logos?g.superRefine(refineReply):g.omit({logoPlan:true}).extend({proposedTools:z.array(z.enum(g.shape.proposedTools.element.options.filter(id=>id!=='logos.create'))).max(3)}).superRefine(refineReply);}
function voiceResponseSchema(logos:boolean,generation:boolean){const base=generation?VoiceBase:VoiceBase.omit({generationPlan:true}).extend({proposedTools:z.array(z.enum(VoiceBase.shape.proposedTools.element.options.filter(id=>id!=='videos.generate'))).max(3)});return logos?base.superRefine(refineReply):base.omit({logoPlan:true}).extend({proposedTools:z.array(z.enum(base.shape.proposedTools.element.options.filter(id=>id!=='logos.create'))).max(3)}).superRefine(refineReply);}
const GenerationWithoutLogos=GenerationBase.omit({logoPlan:true}).extend({proposedTools:z.array(z.enum(GenerationBase.shape.proposedTools.element.options.filter(id=>id!=='logos.create'))).max(3)}).superRefine(refineReply);
const legacyTools=['understand-offer','research','brief.update','studio.help','theme.edit','theme.compose','theme.export','theme.inspect-render','catalogue.draft','images.create','images.edit']as const;
const WithoutVideos=CognitiveReplyBaseSchema.omit({videoPlan:true}).extend({proposedTools:z.array(z.enum([...legacyTools,'logos.create'])).max(3)});
const ReplyWithoutLogos=WithoutVideos.omit({logoPlan:true}).extend({proposedTools:z.array(z.enum(legacyTools)).max(3)}).superRefine(refineReply);
const VideoWithoutLogos=CognitiveReplyBaseSchema.omit({logoPlan:true}).extend({proposedTools:z.array(z.enum([...legacyTools,'videos.motion','videos.edit','videos.restore'])).max(3)}).superRefine(refineReply);
/** Aucun coût de schéma supplémentaire pour les modules fermés. */
export const cognitiveResponseSchema=(logos:boolean,videos=false,generation=false,voice=false,clip=false,social=false,brand=false,brandReview=false)=>{const schema=social?socialResponseSchema(logos,videos,generation,voice,clip):clip&&videos?clipResponseSchema(logos,generation,voice):voice&&videos?voiceResponseSchema(logos,generation):generation&&videos?(logos?GenerationReplySchema:GenerationWithoutLogos):videos?(logos?LegacyCognitiveReplySchema:VideoWithoutLogos):(logos?WithoutVideos.superRefine(refineReply):ReplyWithoutLogos);if(!brand)return schema;const base=z.object({...schema.shape,proposedTools:z.array(z.enum([...schema.shape.proposedTools.element.options,'brand.propose',...(brandReview?['brand.confirm' as const,'brand.correct' as const]:[])])).max(3)}).strict();return brandReview?base.extend({brandCorrection:BrandCorrectionPlanSchema.optional()}).superRefine(refineReply):base.superRefine(refineReply);};
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
