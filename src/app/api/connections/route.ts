import { all } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { PROVIDER_INFO, providerConfig, type ProviderKey } from "@/lib/social/oauth";
import { capabilitiesOf } from "@/lib/social/publish";
import { isPublicAppUrl } from "@/lib/public-url";

export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  const projectId = new URL(req.url).searchParams.get("project");
  const rows = all<any>("SELECT id, provider, external_id, name, avatar_url, scopes, meta, status, status_message, expires_at, updated_at FROM connections WHERE user_id = ? ORDER BY provider, name", user.id);
  const linked = projectId ? new Set(all<{ connection_id: string }>("SELECT connection_id FROM project_connections WHERE project_id = ?", projectId).map((r) => r.connection_id)) : new Set<string>();
  return ok({
    providers: (Object.keys(PROVIDER_INFO) as ProviderKey[]).map((k) => ({ key: k, ...PROVIDER_INFO[k], configured: providerConfig(k).configured })),
    connections: rows.map((r) => {
      const meta = JSON.parse(r.meta || "{}");
      const caps = capabilitiesOf(r);
      return { id: r.id, provider: r.provider, name: r.name, avatar: r.avatar_url, status: r.status, statusMessage: r.status_message, expiresAt: r.expires_at, updatedAt: r.updated_at, linked: linked.has(r.id), can: caps.can, missing: caps.missing, boards: meta.boards ?? null, boardId: meta.boardId ?? null, privacy: meta.privacy ?? null };
    }),
    publicUrl: isPublicAppUrl(),
  });
});
