/** Aides communes aux routes API liées à un projet. */
import { ownedProject, requireUser, type User } from "./auth";
import { loadProject, type Project } from "./projects";
import { setProjectContentLang } from "./i18n-server";

export type Ctx<P extends Record<string, string> = { id: string }> = { params: Promise<P> };

export async function projectFromCtx(ctx: Ctx): Promise<{ user: User; project: Project }> {
  const user = await requireUser();
  const { id } = await ctx.params;
  ownedProject(user, id);
  const project = loadProject(id);
  setProjectContentLang(project.settings.language);
  return { user, project };
}
