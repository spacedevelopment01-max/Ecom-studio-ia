import { HttpError } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { L, uiLang } from "@/lib/i18n-server";
import { currentTheme } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { libraryEntry, structural } from "@/lib/theme/section-library";
import { containerOf, sectionSchema } from "@/lib/theme/spec";
import { familyPanel } from "@/lib/theme/family-ops";
import { projectKind } from "@/lib/theme/project-kind";

/**
 * Panneau « Réglages » d'une section : son schéma (libellés dans la langue de l'interface), ses réglages actuels et ses
 * blocs, pour une édition manuelle champ par champ. Les modifications passent ensuite par `/theme/ops` (set_setting,
 * add_block, remove_block, move_block, use_media…) : la MÊME source de données que les retouches par l'IA et la
 * discussion, donc les mêmes versions restaurables.
 */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const cur = currentTheme(p.id);
  if (!cur) throw new HttpError(409, L("Aucune boutique.", "No store yet."));
  const u = new URL(req.url).searchParams;
  const template = u.get("template") ?? "", id = u.get("section") ?? "";
  const c = containerOf(cur.spec, template);
  const s = c?.sections[id];
  if (!c || !s) throw new HttpError(404, L("Section introuvable.", "Section not found."));
  const ui = uiLang();
  const schema = sectionSchema(cur.spec, s.type, ui);
  if (!schema) throw new HttpError(404, L("Schéma de section introuvable.", "Section schema not found."));
  const entry = libraryEntry(s.type, ui);
  const blocks = (s.block_order ?? Object.keys(s.blocks ?? {})).filter((b) => s.blocks?.[b]).map((b) => ({ id: b, type: s.blocks![b].type, name: schema.blocks.find((x) => x.type === s.blocks![b].type)?.name ?? s.blocks![b].type, settings: s.blocks![b].settings ?? {} }));
  // Schémas de couleurs disponibles (réglages « color_scheme ») : identifiants du thème, libellés lisibles.
  const schemes = Object.keys((cur.spec.settings as Record<string, unknown>).color_schemes ?? {}).length
    ? Object.keys((cur.spec.settings as { color_schemes: Record<string, unknown> }).color_schemes).map((k) => ({ id: k, label: /^scheme-(\d+)$/.test(k) ? L(`Schéma ${k.slice(7)}`, `Scheme ${k.slice(7)}`) : k }))
    : ["scheme-1", "scheme-2", "scheme-3", "scheme-4", "scheme-5"].map((k, i) => ({ id: k, label: L(`Schéma ${i + 1}`, `Scheme ${i + 1}`) }));
  // Fichiers image du thème (réglages « image_asset ») : noms de fichiers connus, pour un choix sans erreur de saisie.
  const files = Object.keys(cur.spec.files ?? {}).filter((f) => /\.(webp|jpe?g|png|avif|gif|svg)$/i.test(f)).sort();
  // Fichiers vidéo du thème (réglages « video_asset », « *_video_asset ») : même principe.
  const videos = Object.keys(cur.spec.files ?? {}).filter((f) => /\.(mp4|webm|mov|m4v)$/i.test(f)).sort();
  return ok({
    template, id, type: s.type, name: entry?.name ?? schema.name, disabled: !!s.disabled, locked: cur.spec.locks.includes(`${template}:${id}`), structural: structural(s.type),
    settings: s.settings ?? {}, blocks, schema: { settings: schema.settings, blocks: schema.blocks, max_blocks: schema.max_blocks }, schemes, files, videos,
    // Bibliothèque par famille (issue #141) : fonction de la section et ses dispositions, ou les cinq dispositions de
    // l'en-tête / du pied de page de la famille du projet.
    family: cur.spec.imported ? null : familyPanel(cur.spec, projectKind(p), s, ui),
    versionId: cur.version.id,
  });
});
