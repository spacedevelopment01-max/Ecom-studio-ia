import { one } from "./db";
import { HttpError } from "./auth";
import { accessScope } from "./access-scope";

/** Même refus pour une référence absente ou appartenant à un autre compte. */
const refused = () => new HttpError(404, "Ressource introuvable / Resource not found", "resource_not_found");

export function assertProjectOwner(userId: string, projectId: string) {
  const project = one<{ user_id: string; archived: number; hidden: number }>("SELECT user_id, archived, hidden FROM projects WHERE id=?", projectId);
  if (!project || project.user_id !== userId || project.archived || project.hidden) throw refused();
}

export function assertProjectScope(projectId:string){
 const s=accessScope();if(!s||s.administration)return;
 if(s.userId)assertProjectOwner(s.userId,projectId);
 if(s.kind==="worker"&&s.projectId&&s.projectId!==projectId)throw refused();
}

export function assetWithinScope(a: { user_id: string; project_id: string }): boolean {
  const s = accessScope();
  if (!s || s.administration) return true;
  if (s.userId && a.user_id !== s.userId) return false;
  if (s.projectId && a.project_id !== s.projectId) return false;
  if (s.userId || s.projectId) {
    const p = one<{ user_id: string; archived: number; hidden: number }>("SELECT user_id, archived, hidden FROM projects WHERE id=?", a.project_id);
    return !!p && p.user_id === a.user_id && !p.archived && !p.hidden;
  }
  return true;
}

export function assertAssetScope(a: { user_id: string; project_id: string; storage_key: string; thumb_key?: string | null }) {
  if (!assetWithinScope(a)) throw refused();
  const s = accessScope();
  if (!s?.userId && !s?.projectId) return;
  const prefix = `${a.user_id}/${a.project_id}/`;
  if (!a.storage_key.startsWith(prefix) || (a.thumb_key && !a.thumb_key.startsWith(prefix))) throw refused();
}

/** Recontrôle à l'enqueue ET à l'exécution : une tâche ancienne ne conserve pas un droit révoqué. */
export function assertJobScope(input: { userId: string; projectId?: string | null; parentId?: string | null; dependsOn?: string[]; payload?: unknown }) {
  const s = accessScope();
  if (s?.userId && s.userId !== input.userId && !s.administration) throw refused();
  if (input.projectId) assertProjectOwner(input.userId, input.projectId);
  for (const ref of new Set([input.parentId, ...(input.dependsOn ?? [])].filter(Boolean))) {
    const j = one<{ user_id: string; project_id: string | null }>("SELECT user_id,project_id FROM jobs WHERE id=?", ref!);
    if (!j || j.user_id !== input.userId || j.project_id !== (input.projectId ?? null)) throw refused();
  }
  function visit(value: unknown, depth = 0) {
    if (depth > 30) throw refused();
    if (!value || typeof value !== "object") return;
    for (const [key, v] of Object.entries(value)) {
      if (/^project_?id$/i.test(key) && v != null && v !== input.projectId) throw refused();
      if(/^user_?id$/i.test(key)&&v!=null&&v!==input.userId)throw refused();
      const resources:Record<string,string>={postId:"posts",post_id:"posts",campaignId:"campaigns",campaign_id:"campaigns",articleId:"blog_articles",article_id:"blog_articles",connectionId:"connections",connection_id:"connections"};
      const table=resources[key];
      if(table&&typeof v==="string"&&v){
        if(table==="connections"){if(!one("SELECT 1 FROM connections WHERE id=? AND user_id=?",v,input.userId))throw refused();}
        else if(!one(`SELECT 1 FROM ${table} WHERE id=? AND project_id=?`,v,input.projectId))throw refused();
      }
      if (/(?:^|_)(?:asset_?id|source_?asset_?id|version_?of)$/i.test(key) || /^(?:assetId|sourceAssetId|referenceAssetId|imageAssetId|logoAssetId|coverAssetId)$/.test(key)) {
        if (typeof v === "string" && v) {
          const a = one<{ user_id: string; project_id: string }>("SELECT user_id,project_id FROM assets WHERE id=? AND deleted_at IS NULL", v);
          if (!a || a.user_id !== input.userId || a.project_id !== input.projectId) throw refused();
        }
      }
      if (Array.isArray(v) && /assetIds$/i.test(key)) {
        for (const assetId of v) visit({ assetId }, depth + 1);
      } else if (typeof v === "object") visit(v, depth + 1);
    }
  }
  visit(input.payload);
}
