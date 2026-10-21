import type { PlanId } from '../plans';
export const ANGLE_IDS = ['usage', 'reassurance', 'expression', 'discovery', 'generalist'] as const;
export type AngleId = typeof ANGLE_IDS[number];
export type StrategySource = { kind: 'client' | 'confirmed_fact' | 'dated_source' | 'creative_hypothesis'; label: string; value: string; date?: string; ref?: string };
export type MarketingAngle = {
 id: AngleId; title: string; audience: string; situation: string; notPriority: string;
 tension: string; motivation: string; benefit: string; promise: string; rationale: string;
 proofs: string[]; objections: { objection: string; answer: string }[]; limits: string[];
 tone: string; messages: string[]; exclusions: string[]; visualDirection: string;
 examples: { hero: string; subtext: string; cta: string; advertisement: string };
 source: 'creative_hypothesis'; sources: StrategySource[];
};
export type ActiveStrategy = { id: string; projectId: string; version: number; angleId: AngleId; angle: MarketingAngle; inputDigest: string; activatedAt: number };
export type StrategyModule = 'theme' | 'seo' | 'blog' | 'image' | 'video' | 'advertisement' | 'campaign' | 'social' | 'calendar' | 'identity' | string;
export type StrategyContent = { module: StrategyModule; contentId: string; strategyId: string | null; version: number | null; angleId: AngleId | null; inputDigest: string; protected: boolean; published: boolean; scheduled: boolean; aligned: boolean; reason: 'aligned' | 'legacy_unreviewed' | 'previous_angle' | 'project_changed'; };
export type StrategyImpact = { module: string; total: number; reusable: number; protected: number; published: number; scheduled: number; needsReview: number };
export type StrategyPreparation = {
 id: string; projectId: string; angleId: AngleId; inputDigest: string; baseStrategyId: string | null; inventoryDigest: string;
 status: 'prepared' | 'failed' | 'activated'; impact: StrategyImpact[]; contents: StrategyContent[];
 createdAt: number; failure?: string; cost: { localPercent: 0; paidWork: 'none_authorized'; explanation: string };
};
export type StrategyState = {
 projectId: string; plan: PlanId | null; limit: number; angles: MarketingAngle[]; usedAngleIds: AngleId[]; active: ActiveStrategy | null;
 missingQuestions: { key: string; question: string }[]; recommendation: { angleId: AngleId; reason: string } | null;
 generalistExplanation: string; analysis: { method: 'local_project_evidence'; inputDigest: string; sources: StrategySource[]; marketSourcesVerified: false; limits: string[] };
 alignment: StrategyContent[]; pending: StrategyPreparation | null;
};
