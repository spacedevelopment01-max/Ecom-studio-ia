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
  source?: Source;
  observations?: string[];
};
export type Source = {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  consultedAt: number;
  status: "consulted" | "unavailable";
  error?: string;
  provenance: "web" | "simulation";
};
export type Angle = {
  id: string;
  title: string;
  positioning: string;
  audience: string;
  /** Absents des anciennes recherches à trois angles ; jamais inventés par migration. */
  motivation?: string;
  message?: string;
  arguments: string[];
  objections: { objection: string; answer: string }[];
  reason: string;
  sourceIds: string[];
  hypothesis: boolean;
};
export type Research = {
  formatVersion?: 2;
  sources: Source[];
  observations: { quote: string; sourceId: string }[];
  angles: Angle[];
  recommendedId: string;
  recommendation: string;
  selectedId?: string;
  legalAvailability: "not_checked";
};
export type Identity = {
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
export type VisualSlot = {
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
  error?: { step: Step; message: string; at: number };
  pending?: { step: Step; jobId: string; inputHash: string };
  simulation?: boolean;
};
export type ReadyContract = {
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
  pages: PlannedPage[];
  documents: Contents["documents"];
  media: VisualSlot[];
  sources: Source[];
  approvals: Record<Step, { candidateId: string; approvedAt: number }>;
  warnings: string[];
  research: Research;
  copyReadiness: { status: "review_required" | "mapped"; provisionalFields: string[]; documentKeys: string[] };
};
