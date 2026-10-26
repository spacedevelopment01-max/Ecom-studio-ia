/** Contrat amont versionné : aucune construction de thème ni publication. */
import type {
  Brand,
  ProductProfile,
  ServiceProfile,
  Strategy,
} from "../project-types";
import type { ContentDoc } from "../seo-v2/types";
import type { ShopCopy } from "../theme/copy";
export const STEPS = [
  "brief",
  "research",
  "brand",
  "content",
  "media",
] as const;
export type Step = (typeof STEPS)[number];
export type Input = {
  offerUrl?: string;
  description: string;
  offerName: string;
  brandName: string;
  target: string;
  constraints: string;
  business: "products" | "services";
  photoIds: string[];
  referenceUrls: string[];
  price: string;
  services: ServiceProfile;
};
export type Brief = {
  input: Input;
  profile: ProductProfile;
  services: ServiceProfile;
  missing: string[];
  provenance: "client" | "local" | "provider" | "simulation";
  documentStamp?: string;
  source?: Source;
  observations?: string[];
  execution?: ApiEvidence;
};
export type ApiEvidence = { provider: string; model: string; usageKey: string; vision: boolean; at: number };
export type Source = {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  consultedAt: number;
  status: "consulted" | "unavailable";
  error?: string;
  provenance: "web" | "simulation";
  category?: "offer" | "competitors" | "customers" | "sector";
  contentHash?: string;
  relevance?: { accepted: boolean; reason: string };
};
export type Angle = {
  id: string;
  title: string;
  positioning: string;
  audience: string;
  /** Absents des anciennes recherches à trois angles ; jamais inventés par migration. */
  motivation?: string;
  communicationChange?: string;
  tone?: string;
  visualDirection?: string;
  message?: string;
  arguments: string[];
  objections: { objection: string; answer: string }[];
  reason: string;
  sourceIds: string[];
  hypothesis: boolean;
};
export type Research = {
  formatVersion?: 2 | 3;
  offerDigest?: string;
  coverage?: { target: number; consulted: number; status: "partial" | "covered"; missingCategories: string[]; limits: string[] };
  execution?: ApiEvidence;
  sources: Source[];
  observations: { quote: string; sourceId: string }[];
  angles: Angle[];
  recommendedId: string;
  recommendation: string;
  recommendationSourceIds?: string[];
  selectedId?: string;
  legalAvailability: "not_checked";
};
export type Identity = {
  seriesId?: string;
  directions?: import("../logo-v2/direction-series").CompleteDirection[];
  proposal: Brand;
  identityConfirmed: boolean;
  logoCandidates: string[];
  selectedLogo?: string;
  legalAvailability: "not_checked";
  provenance: "local" | "provider" | "simulation";
};
export type PlannedPage = {
  key: string;
  path: string;
  title: string;
  kind: "home" | "product" | "service" | "brand" | "contact";
  goal: string;
  sections: { key: string; purpose: string; mediaSlot?: string }[];
  docKey?: string;
};
export type EditorialBlock = { pageKey: string; sectionKey: string; objective: string; message: string; docKey: string; blockIds: string[]; text: string; mediaSlotKeys: string[]; rationale: string };
export type VisualSlot = {
  kind?: "image" | "video";
  aspect?: "1:1" | "16:9" | "9:16";
  source?: "ai" | "pixabay";
  scene?: string;
  correction?: string;
  queries?: string[];
  caption?: string;
  alt?: string;
  rationale?: string;
  posterId?: string;
  webAssetId?: string;
  alignment?: { status: "accepted" | "rejected"; reason: string; contextHash?: string; execution?: ApiEvidence };
  playback?: { muted: true; playsInline: true; loop: boolean; pauseControl: true; reducedMotion: "poster"; mobileFallback: "poster" };

  key: string;
  pageKey: string;
  sectionKey: string;
  purpose: string;
  required: boolean;
  assetId?: string;
  peopleConsent?: "none_confirmed" | "this_slot";
  reviewed?: boolean;
  inputHash?: string;
};
export type Contents = {
  sourceHash?: string;
  pending?: string;
  execution?: ApiEvidence;
  editorial?: EditorialBlock[];
  recommendation?: ThemeRecommendation;
  copy: ShopCopy;
  documents: { docKey: string; doc: ContentDoc; verdict: string }[];
  pages: PlannedPage[];
  slots: VisualSlot[];
  notes: string[];
  provenance: "local" | "provider" | "simulation";
};
export type Media = {
  slots: VisualSlot[];
  notes: string[];
  provenance: "provider" | "client" | "simulation";
};
export type Data = {
  brief: Brief;
  research: Research;
  brand: Identity;
  content: Contents;
  media: Media;
};
export type Stage<K extends Step = Step> = {
  data: Data[K];
  inputHash: string;
  status: "draft" | "approved" | "stale";
  approvedAt?: number;
  candidateId: string;
};
export type State = {
  schemaVersion: 1;
  projectId: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
  stages: Partial<{ [K in Step]: Stage<K> }>;
  error?: { step: Step; message: string; at: number; jobId?: string; revision?: number };
  pending?: { step: Step; jobId: string; inputHash: string };
  simulation?: boolean;
};
export type ThemeRecommendation = {
  projectCategory?: import("../project-handoff/categories").CategoryRecommendation;
  /** Ancienne projection installable : conservée à la lecture, jamais remplie avec un identifiant de référence. */
  recommendedId: string;
  alternatives: { id: string; reasons: string[] }[];
  recommendedReferenceId?: import("../project-handoff/categories").ReferenceThemeId | null;
  alternativesReferenceIds?: import("../project-handoff/categories").ReferenceThemeId[];
  engineThemeId?: string | null;
  reasons: string[];
  selectedId?: string;
  status: "proposal" | "selected" | "reference_pending" | "clarification_required";
  catalogue: { id: string; referenceId?: import("../project-handoff/categories").ReferenceThemeId; engineThemeId?: string | null; category?: import("../project-handoff/categories").ProjectCategory; name?: string; status: "available" | "in_progress" | "incompatible"; reason: string }[];
};
export type ReadyContract = {
  handoff?: import("../project-handoff/contract").ProjectHandoff;
  dataReadiness: "ready" | "review_required";
  themeConsumerStatus: "awaiting_theme_consumer";
  schemaVersion: 1;
  kind: "project_ready_for_theme";
  projectId: string;
  revision: number;
  provenance: "simulation" | "production";
  builtAt: number;
  clientBrief: Input;
  profile: ProductProfile;
  services: ServiceProfile | null;
  strategy: Strategy;
  brand: Brand;
  copy: ShopCopy;
  editorial: EditorialBlock[];
  recommendation?: ThemeRecommendation;
  mediaPolicy: { images: number; videos: number; source: string; heroVideoRequired: true };
  pages: PlannedPage[];
  documents: Contents["documents"];
  media: VisualSlot[];
  sources: Source[];
  approvals: Record<Step, { candidateId: string; approvedAt: number }>;
  warnings: string[];
  research: Research;
  copyReadiness: { status: "review_required" | "mapped"; provisionalFields: string[]; documentKeys: string[] };
};
