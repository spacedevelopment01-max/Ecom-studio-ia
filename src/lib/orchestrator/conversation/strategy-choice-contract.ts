import {z} from 'zod';
import {ANGLE_IDS} from '../../marketing-strategy/types';
export const StrategyChoiceProposalSchema=z.object({
 comparisonId:z.string().min(1).max(100),version:z.string().regex(/^[a-f0-9]{64}$/),angleId:z.enum(ANGLE_IDS),
 sourceId:z.string().min(1).max(120),quote:z.string().min(1).max(8000),reason:z.string().trim().min(1).max(1200),
}).strict();
/** Proposition de préférence seulement. Jamais un ordre d'activation ou de dépense. */
export type StrategyChoiceProposal=z.infer<typeof StrategyChoiceProposalSchema>;
