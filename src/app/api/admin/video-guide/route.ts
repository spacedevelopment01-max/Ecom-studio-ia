import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { getJsonSetting, setJsonSetting, setSetting } from "@/lib/settings";
import { DEFAULT_VIDEO_GUIDE, VIDEO_GUIDE_SETTING, loadVideoGuide } from "@/lib/video-v2/creative-guide";

/** Guide créatif vidéo en vigueur (valeurs du dépôt + modifications du propriétaire) et les modifications seules. */
export const GET = handle(async () => {
  await requireAdmin();
  return ok({ guide: loadVideoGuide(), overrides: getJsonSetting<Record<string, unknown>>(VIDEO_GUIDE_SETTING, {}), defaults: DEFAULT_VIDEO_GUIDE });
});

/**
 * Modifie le guide sans toucher au code : `overrides` (JSON partiel, fusionné sur les valeurs du dépôt), persistant
 * après redémarrage ; `reset: true` revient aux valeurs du dépôt. Chargé par le moteur à chaque publicité vidéo.
 */
export const PUT = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req, z.object({ overrides: z.record(z.string(), z.unknown()).optional(), reset: z.boolean().optional() }));
  if (b.reset) setSetting(VIDEO_GUIDE_SETTING, null);
  else if (b.overrides) setJsonSetting(VIDEO_GUIDE_SETTING, b.overrides);
  return ok({ guide: loadVideoGuide() });
});
