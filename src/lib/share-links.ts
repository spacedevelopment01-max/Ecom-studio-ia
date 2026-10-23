import { one, run } from "./db";
import { assertProjectOwner } from "./project-security";

/** Une révocation invalide ensemble les aperçus et téléchargements signés, sans supprimer les médias. */
export function shareBinding(projectId: string): string | null {
  const p = one<{ user_id: string; archived: number; hidden: number }>("SELECT user_id,archived,hidden FROM projects WHERE id=?", projectId);
  if (!p || p.archived || p.hidden) return null;
  const version = one<{ version: number }>("SELECT version FROM project_link_versions WHERE project_id=?", projectId)?.version ?? 0;
  return `${projectId}:${p.user_id}:${version}`;
}

export function revokeProjectLinks(userId: string, projectId: string) {
  assertProjectOwner(userId, projectId);
  run("INSERT INTO project_link_versions(project_id,version) VALUES(?,1) ON CONFLICT(project_id) DO UPDATE SET version=version+1", projectId);
}
