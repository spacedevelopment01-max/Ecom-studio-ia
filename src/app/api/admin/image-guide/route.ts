import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { getJsonSetting, setJsonSetting, setSetting } from "@/lib/settings";
import { DEFAULT_IMAGE_GUIDE, IMAGE_GUIDE_SETTING, loadImageGuide } from "@/lib/image-v2/image-guide";

/** Guide du moteur d'images en vigueur (valeurs du dépôt + modifications du propriétaire) et les modifications seules. */
export const GET = handle(async () => {
  await requireAdmin();
  const strip = <T extends { cliches: { when: RegExp; avoid: string }[] }>(g: T) => ({ ...g, cliches: g.cliches.map((c) => ({ when: c.when.source, avoid: c.avoid })) });
  return ok({ guide: strip(loadImageGuide()), overrides: getJsonSetting<Record<string, unknown>>(IMAGE_GUIDE_SETTING, {}), defaults: strip(DEFAULT_IMAGE_GUIDE) });
});

/**
 * Modifie le guide sans toucher au code : `overrides` (JSON partiel fusionné sur les valeurs du dépôt), persistant ;
 * `reset: true` revient aux valeurs du dépôt. La règle « toute image finale par l'IA » et les clichés interdits ne se
 * désactivent pas par ce réglage. Relu à chaque image finale.
 */
export const PUT = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req, z.object({ overrides: z.record(z.string(), z.unknown()).optional(), reset: z.boolean().optional() }));
  if (b.reset) setSetting(IMAGE_GUIDE_SETTING, null);
  else if (b.overrides) {
    const { aiMandatory: _a, cliches: _c, ...rest } = b.overrides;
    setJsonSetting(IMAGE_GUIDE_SETTING, rest);
  }
  return ok({ guide: { ...loadImageGuide(), cliches: undefined } });
});
