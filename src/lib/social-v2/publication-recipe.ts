/** Durable, project-scoped stage receipts. A dispatched stage with unknown outcome is never repaid automatically. */
import { one, run, id, now } from "../db";
import { stableHash } from "../brain/hash";
import { assetData, getAsset, saveAsset } from "../library";
import type { Project } from "../projects";
import { UnsentBudgetError } from "../billing";
import { CostCapReached,currentTrace } from "../ai/trace";
export function publicationKey(projectId: string, data: unknown) {
  return `ai-post:${projectId}:${stableHash("campaign-2", data)}`;
}
type Receipt<T> = { state: "pending" | "done" | "not_sent"; value?: T };
const memoryKey = (key: string) => `publication.stage.${key}`;
export async function publicationStage<T>(
  projectId: string,
  key: string,
  fn: () => Promise<T>,
  replaySafe = false,
  beforeDispatch?:()=>void,
): Promise<T> {
  const execute=async(rid:string)=>{
    const jobId=currentTrace().jobId;
    // No absence-of-log inference: only a typed pre-dispatch refusal AND unchanged native billing/trace rows.
    const evidence=()=>jobId?one<{n:number}>(`SELECT (SELECT COUNT(*) FROM ai_calls WHERE project_id=? AND job_id=?) + (SELECT COUNT(*) FROM ai_reservations WHERE project_id=? AND job_id=?) + (SELECT COUNT(*) FROM usage_events WHERE project_id=? AND job_id=?) n`,projectId,jobId,projectId,jobId,projectId,jobId)?.n:null;
    const before=evidence();
    try {
      const value=await fn();
      run("UPDATE memory SET value=?,updated_at=? WHERE id=?",JSON.stringify({state:"done",value}),now(),rid);
      return value;
    } catch(error) {
      if((error instanceof UnsentBudgetError||error instanceof CostCapReached)&&before!=null&&evidence()===before)
        run("UPDATE memory SET value=?,updated_at=? WHERE id=?",JSON.stringify({state:"not_sent",code:"BUDGET_BEFORE_DISPATCH"}),now(),rid);
      throw error;
    }
  };
  const row = one<{ id: string; value: string }>(
    "SELECT id,value FROM memory WHERE project_id = ? AND key = ? ORDER BY rowid DESC LIMIT 1",
    projectId,
    memoryKey(key),
  );
  if (row) {
    const v = JSON.parse(row.value) as Receipt<T>;
    if (v.state === "done") return v.value as T;
    if(v.state==="not_sent") {
      beforeDispatch?.();
      const claim=run("UPDATE memory SET value=?,updated_at=? WHERE id=? AND value=?",JSON.stringify({state:"pending"}),now(),row.id,row.value);
      if(!claim.changes)return publicationStage(projectId,key,fn,replaySafe,beforeDispatch);
      return execute(row.id);
    }
    if (replaySafe) {
      beforeDispatch?.();
      const value = await fn();
      run(
        "UPDATE memory SET value=?,updated_at=? WHERE id=?",
        JSON.stringify({ state: "done", value }),
        now(),
        row.id,
      );
      return value;
    }
    throw new Error(
      "Étape déjà envoyée, résultat incertain ou en cours : reprise automatique bloquée pour éviter un double paiement.",
    );
  }
  // Synchronous claim before first await also serializes callers in the worker process.
  beforeDispatch?.();
  const rid = id();
  const claim = run(
    "INSERT INTO memory (id,project_id,kind,key,value,status,source,scope,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM memory WHERE project_id=? AND key=?)",
    rid,
    projectId,
    "artifact",
    memoryKey(key),
    JSON.stringify({ state: "pending" }),
    "confirmed",
    "local",
    "publication-receipts",
    now(),
    now(),
    projectId,
    memoryKey(key),
  );
  if (!claim.changes) return publicationStage(projectId, key, fn, replaySafe,beforeDispatch);
  return execute(rid);
}
export async function publicationImageStage(
  p: Project,
  key: string,
  prompt: string,
  fn: () => Promise<Buffer>,
  beforeDispatch?:()=>void,
) {
  const aid = await publicationStage(p.id, key, async () => {
    const data = await fn();
    const { imageRequestReceipt } = await import("../ai/media-providers");
    const receipt = imageRequestReceipt(data);
    const a = await saveAsset({
      projectId: p.id,
      userId: p.userId,
      data,
      name: "publication-etape-native.png",
      mime: "image/png",
      role: "social-trial",
      folderKey: "content.calendar",
      origin: "generated",
      status: "draft",
      meta: {
        publicationStage: key,
        effectivePrompt: receipt?.prompt ?? prompt,
        imageRequest: receipt ?? { transport: "injected, not verified" },
      },
    });
    return a.id;
  },false,beforeDispatch);
  const a = getAsset(aid);
  if (!a || a.project_id !== p.id || a.deleted_at)
    throw new Error(
      "Étape conservée indisponible : aucune régénération payante automatique.",
    );
  return { data: assetData(a), assetId: aid };
}

export function publicationStageDone(projectId: string, key: string) {
  const r = one<{ value: string }>(
    "SELECT value FROM memory WHERE project_id=? AND key=? ORDER BY rowid DESC LIMIT 1",
    projectId,
    memoryKey(key),
  );
  return !!r && JSON.parse(r.value).state === "done";
}

export function publicationStageValue<T>(projectId:string,key:string):T|null {
  const r=one<{value:string}>("SELECT value FROM memory WHERE project_id=? AND key=? ORDER BY rowid DESC LIMIT 1",projectId,memoryKey(key));
  if(!r)return null;
  const receipt=JSON.parse(r.value) as Receipt<T>;
  return receipt.state==="done"?receipt.value??null:null;
}
