/**
 * Export contrôlé et enregistré (CMS Engine V2) : génération, contrôles, Quality Gate (verdict enregistré), rangement
 * versionné dans « Exports de thèmes ». Partagé par la route d'export du studio et par l'étape « cms_export » des
 * plans de l'orchestrateur (phase 12A) : un seul chemin. Un export REFUSÉ n'est jamais rangé comme livrable.
 */
import { themeFingerprint } from "../theme/compile";
import { libraryLoader } from "../theme/loader";
import { saveAsset } from "../library";
import type { ThemeSpec } from "../theme/spec";
import { gateMeta, saveCheck } from "../quality/store";
import { checkCmsExport, cmsExport } from "./export";
import { verdictMessage } from "./quality";
import type { CmsPlatform } from "./types";

export type RecordedExport = {
  platform: CmsPlatform;
  name: string;
  zip: Buffer;
  verdict: string;
  scope: string | null;
  message: string;
  checkId: string | null;
  assetId: string | null;
  issues: string[];
  fingerprint: string;
};

export async function exportAndRecord(
  p: { id: string; userId: string },
  v: { spec: ThemeSpec; number: number; id: string },
  platform: CmsPlatform,
  lang: "fr" | "en",
  o: { jobId?: string | null } = {},
): Promise<RecordedExport> {
  const exp = await cmsExport(platform, v.spec, libraryLoader, { projectId: p.id });
  const check = await checkCmsExport(platform, exp, v.spec, { projectId: p.id });
  const checkId = saveCheck(check.gate.decision, { userId: p.userId, projectId: p.id, jobId: o.jobId ?? undefined, candidateId: `${platform}:v${v.number}` });
  const message = verdictMessage(platform, check.gate, lang);
  const fingerprint = themeFingerprint(v.spec);
  const name = exp.name.replace(/\.zip$/, `-v${v.number}.zip`);
  const base: RecordedExport = { platform, name, zip: exp.zip, verdict: check.gate.decision.verdict, scope: check.gate.scope, message, checkId, assetId: null, issues: check.static.issues.slice(0, 20), fingerprint };
  if (check.gate.decision.verdict === "REJECTED") return base;
  const asset = await saveAsset({
    projectId: p.id,
    userId: p.userId,
    data: exp.zip,
    name,
    mime: "application/zip",
    kind: "archive",
    role: "theme-export",
    folderKey: "shop.exports",
    origin: "export",
    meta: { platform, delivery: exp.kind, themeVersion: v.number, versionId: v.id, fingerprint, gate: gateMeta(check.gate.decision, checkId), scope: check.gate.scope, unmeasured: check.gate.unmeasured, issues: check.static.issues.slice(0, 20), stats: check.static.stats, message },
  });
  return { ...base, assetId: asset.id };
}
