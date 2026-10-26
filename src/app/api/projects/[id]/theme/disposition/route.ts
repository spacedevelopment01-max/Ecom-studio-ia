import { assertThemeOperations, assertLibrarySelection } from "@/lib/theme/plan-access";
import { z } from "zod";
import { projectKind } from "@/lib/theme/project-kind";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { L, uiLang } from "@/lib/i18n-server";
import { currentTheme, saveThemeVersion } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { applyOps, validateSpec } from "@/lib/theme/ops";
import { chromeOps, dispositionOps } from "@/lib/theme/family-ops";
import { chromePresets } from "@/lib/theme/family-chrome";
import { withProjectMedia } from "@/lib/theme/section-defaults";
import { sectionContentContext } from "@/lib/theme/section-content";
import { pickT } from "@/lib/theme/section-families";
import { containerOf, sectionSchema, themeLang } from "@/lib/theme/spec";

/**
 * Changement de disposition (issue #141), depuis le panneau « Réglages » :
 *  - d'une section de bibliothèque (`disposition`) : mêmes contenus, autre mise en page ; quand la disposition est
 *    portée par une autre section du thème, le contenu est converti (titres, textes, boutons, images, éléments) et ce
 *    qui manque est complété depuis le projet, jamais depuis une démonstration ;
 *  - de l'en-tête ou du pied de page (`chrome`) : une des cinq dispositions de la famille du projet ; logo, menus,
 *    textes et blocs du projet sont conservés.
 * Mêmes opérations, mêmes verrous et mêmes versions restaurables que les autres retouches.
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const cur = currentTheme(p.id);
  if (!cur) throw new HttpError(409, L("Aucune boutique.", "No store yet."));
  if (cur.spec.imported) throw new HttpError(400, L("Thème importé : ses dispositions se règlent dans l'éditeur de la plateforme.", "Imported theme: its layouts are set in the platform's editor."));
  const b = await body(req, z.object({
    template: z.string().max(80).optional(),
    section: z.string().max(120).optional(),
    disposition: z.string().regex(/^[a-z0-9-]{1,40}$/).optional(),
    chrome: z.object({ part: z.enum(["header", "footer"]), preset: z.string().regex(/^[a-z0-9-]{1,40}$/) }).optional(),
  }));
  const kind = projectKind(p);
  const lang = themeLang(cur.spec);
  let ops, summary: string, targeted: Set<string>;
  if (b.chrome) {
    const sv = p.services;
    const r = chromeOps(cur.spec, kind, b.chrome.part, b.chrome.preset, lang, { address: sv?.address || sv?.area, phone: sv?.phone, email: sv?.email, hours: sv?.hours });
    if ("error" in r) throw new HttpError(400, L(r.error.fr, r.error.en));
    const preset = chromePresets(kind, b.chrome.part).find((x) => x.id === b.chrome!.preset)!;
    ops = r.ops;
    summary = b.chrome.part === "header" ? L(`En-tête : disposition « ${preset.label.fr} »`, `Header: “${preset.label.en}” layout`) : L(`Pied de page : disposition « ${preset.label.fr} »`, `Footer: “${preset.label.en}” layout`);
    targeted = new Set(ops.map((o) => `${(o as { template: string }).template}:${(o as { section: string }).section}`));
  } else {
    if (!b.template || !b.section || !b.disposition) throw new HttpError(400, L("Section ou disposition manquante.", "Missing section or layout."));
    const cctx = sectionContentContext(p, cur.spec, false, b.template);
    const r = dispositionOps(cur.spec, kind, b.template, b.section, b.disposition, (type) => withProjectMedia(cur.spec, type, {}, undefined, cctx) as never);
    if ("error" in r) throw new HttpError(400, L(r.error.fr, r.error.en));
    ops = r.ops;
    if (r.entry) {
      const label = r.entry.dispositions.find((x) => x.id === r.dispositionId)!.label;
      summary = L(`${pickT(r.entry.name, "fr")} : disposition « ${label.fr} »`, `${pickT(r.entry.name, "en")}: “${label.en}” layout`);
    } else {
      // Section propre au thème : une de ses dispositions déclarées.
      const s = containerOf(cur.spec, b.template)?.sections[b.section];
      const name = sectionSchema(cur.spec, s?.type ?? "", uiLang())?.name ?? s?.type ?? "";
      summary = L(`${name} : autre disposition`, `${name}: another layout`);
    }
    targeted = new Set([`${b.template}:${b.section}`]);
  }
  assertThemeOperations(p.id,cur.spec,ops);
  if (!ops.length) return ok({ unchanged: true, applied: [] });
  const res = applyOps(cur.spec, ops, { targeted, storeKind: kind });
  if (!res.applied.length) throw new HttpError(400, res.rejected.map((x) => x.reason).join(" ; ") || L("Changement impossible.", "The layout couldn't be changed."));
  const problems = validateSpec(res.spec);
  if (problems.length) throw new HttpError(400, problems.join(" ; "));
  const v = saveThemeVersion(p.id, res.spec, summary.slice(0, 200), "user");
  return ok({ versionId: v.id, number: v.number, applied: res.applied, rejected: res.rejected.map((x) => x.reason), lang: uiLang() });
});
