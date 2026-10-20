export type DiagnosticOptions = {
  projectId?: string;
  projectName?: string;
  jobId?: string;
  jobType?: string;
  budgetOnly?: boolean;
  limit?: number;
  database?: string;
  dataDir?: string;
  storageDir?: string;
  versionUrl?: string;
  since?: number;
  noEnv?: boolean;
  offline?: boolean;
};
export type DiagnosticReport = {
  readOnly: boolean;
  realProviderCalls: number;
  anonymized: boolean;
  assets: { ref: string; fileExists: boolean; aiAdQueryMatches: boolean; decoded: { valid: boolean | null; width?: number; height?: number; format?: string; inspectionLimited?: boolean } | null; [key: string]: unknown }[];
  jobs: { ref: string; type: string; status: string | null; flags: string[]; [key: string]: unknown }[];
  calls: { sameRequestedAndServed: boolean | null; [key: string]: unknown }[];
  usages: { billedMicro: number; [key: string]: unknown }[];
  [key: string]: unknown;
};
export function diagnostic(options?: DiagnosticOptions): Promise<DiagnosticReport>;
export function budgetFailureCode(message: unknown): string;

export function failureOriginCode(message: unknown): string;
export function sourceErrorEvidence(message: unknown, sourceRoot?: string): {available:boolean;sourceCommit:string|null;matches:{file:string;line:number;fileSha256:string;matchedStaticCharacters:number}[]};
export function copyFactsEvidence(copy: unknown, project: Record<string, unknown>, request?: Record<string, unknown>, receiptUpdatedAt?: number | null, failureAt?: number | null): Record<string, unknown>;
