import type { Platform } from "./types";
/** Same concepts and destinations as the campaign engine; probable cost and bounded retry cap are distinct. */
import type { Project } from "../projects";
import { projectRights } from "../plan-gates";
import {
  aiPostProbableMicro,
  estimateTaskMicro,
  capMicro,
} from "../ai/estimate";
import { aiPostEstimate } from "../social-v2/deps";
import { defaultPlatforms, formatsFor } from "./platforms";
export function campaignEstimate(
  p: Project,
  o: { count?: number; platforms?: Platform[]; aspects?: string[] },
) {
  const rights = projectRights(p.id),
    limit =
      !rights || rights.ads === "full" ? 6 : rights.ads === "advanced" ? 3 : 1;
  const concepts = Math.max(1, Math.min(limit, o.count ?? 3));
  const all = formatsFor(
    o.platforms?.length ? o.platforms : defaultPlatforms(p.business),
  );
  const selected = o.aspects?.length
    ? all.filter((f) => o.aspects!.includes(f.aspect))
    : all;
  const images = concepts * (selected.length ? selected.length : all.length);
  const planning =
    estimateTaskMicro("copywriting", { input: 24000, output: 4000 }) +
    estimateTaskMicro("quality_control", { input: 16000, output: 1200 });
  return {
    concepts,
    images,
    estimateMicro: planning + images * aiPostProbableMicro(),
    capMicro: capMicro(planning) + images * aiPostEstimate(),
  };
}
