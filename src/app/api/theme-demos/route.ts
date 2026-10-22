/**
 * État des démos intégrales des thèmes (voir src/lib/theme/theme-demos.ts). Une démo absente ou périmée est préparée en
 * arrière-plan (processus séparé, base temporaire) ; la consulter ne touche jamais au projet du client.
 */
import { requireUser } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { prepareThemeDemos, themeDemoStatuses } from "@/lib/theme/theme-demos";

export const runtime = "nodejs";

export const GET = handle(async () => {
  await requireUser();
  const demos = themeDemoStatuses();
  const running = prepareThemeDemos(demos);
  return ok({ demos: demos.map((d) => ({ ...d, preparing: running && (!d.ready || d.stale) })) }, { headers: { "Cache-Control": "no-store" } });
});
