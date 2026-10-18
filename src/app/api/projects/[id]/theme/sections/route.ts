import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { L, uiLang } from "@/lib/i18n-server";
import { currentTheme, saveThemeVersion } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { applyOps, validateSpec } from "@/lib/theme/ops";
import { addable, libraryEntry } from "@/lib/theme/section-library";
import { withProjectMedia } from "@/lib/theme/section-defaults";
import { sectionContentContext } from "@/lib/theme/section-content";

/**
 * Ajout d'une section depuis la bibliothèque : préréglage + médias du projet, à la position choisie.
 * Avec `replace` : la section désignée est refaite dans ce type en gardant ses contenus compatibles (titres, textes,
 * images) ; le préréglage ne complète que ce qui manque.
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const cur = currentTheme(p.id);
  if (!cur) throw new HttpError(409, L("Aucune boutique.", "No store yet."));
  const b = await body(req, z.object({ type: z.string().max(80), template: z.string().max(80), index: z.number().int().min(0).optional(), replace: z.string().max(120).optional() }));
  if (!addable(b.type)) throw new HttpError(400, L("Cette section ne s'ajoute pas depuis la bibliothèque.", "This section can't be added from the library."));
  const filled = withProjectMedia(cur.spec, b.type, {}, undefined, sectionContentContext(p, cur.spec, false, b.template));
  if (b.replace) {
    const prev = cur.spec.templates[b.template]?.sections[b.replace];
    if (!prev) throw new HttpError(404, L("Section introuvable.", "Section not found."));
    const keep = Object.fromEntries(Object.entries(filled.settings).filter(([k]) => !(k in prev.settings)));
    const r = applyOps(cur.spec, [{ op: "replace_section", template: b.template, section: b.replace, type: b.type, settings: keep as any, ...(prev.blocks && Object.keys(prev.blocks).length ? {} : { blocks: filled.blocks as any }) } as any], { targeted: new Set([`${b.template}:${b.replace}`]) });
    if (!r.applied.length) throw new HttpError(400, r.rejected.map((x) => x.reason).join(" ; ") || L("Remplacement impossible.", "The section couldn't be replaced."));
    const problems = validateSpec(r.spec);
    if (problems.length) throw new HttpError(400, problems.join(" ; "));
    const name = libraryEntry(b.type, uiLang())?.name ?? b.type;
    const v = saveThemeVersion(p.id, r.spec, L(`Section remplacée par « ${name} »`, `Section replaced with "${name}"`), "user");
    return ok({ versionId: v.id, number: v.number, applied: r.applied });
  }
  const res = applyOps(cur.spec, [{ op: "add_section", template: b.template, type: b.type, settings: filled.settings as any, blocks: filled.blocks as any, position: b.index === undefined ? undefined : { index: b.index } } as any], { targeted: new Set() });
  if (!res.applied.length) throw new HttpError(400, res.rejected.map((r) => r.reason).join(" ; ") || L("Ajout impossible.", "The section couldn't be added."));
  const problems = validateSpec(res.spec);
  if (problems.length) throw new HttpError(400, problems.join(" ; "));
  const name = libraryEntry(b.type, uiLang())?.name ?? b.type;
  const v = saveThemeVersion(p.id, res.spec, L(`Section « ${name} » ajoutée`, `Section "${name}" added`), "user");
  return ok({ versionId: v.id, number: v.number, applied: res.applied });
});
