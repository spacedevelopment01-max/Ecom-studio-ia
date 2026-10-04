import fs from "node:fs";
import path from "node:path";
import { addable, SECTION_LIBRARY } from "@/lib/theme/section-library";
import { all } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { currentTheme, listThemeVersions } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { containerOf, sectionSchema, baseSectionTypes, availableSectionTypes } from "@/lib/theme/spec";
import { directionCards } from "@/lib/theme/directions";
import { themeFingerprint } from "@/lib/theme/compile";

export const runtime = "nodejs";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const cur = currentTheme(p.id);
  const messages = all<any>("SELECT id, role, content, attachments, selection, theme_version_id, job_id, created_at FROM chat_messages WHERE project_id = ? AND thread = 'shop' ORDER BY created_at ASC LIMIT 200", p.id).map((m) => ({ ...m, attachments: JSON.parse(m.attachments || "[]"), selection: m.selection ? JSON.parse(m.selection) : null }));
  if (!cur) return ok({ current: null, versions: [], messages, directions: directionCards() });
  const structure = ["group:header", ...Object.keys(cur.spec.templates), "group:footer"].map((t) => {
    const c = containerOf(cur.spec, t)!;
    return {
      template: t,
      sections: c.order.filter((id) => c.sections[id]).map((id) => ({ id, type: c.sections[id].type, name: sectionSchema(cur.spec, c.sections[id].type)?.name ?? c.sections[id].type, disabled: !!c.sections[id].disabled, locked: cur.spec.locks.includes(`${t}:${id}`), heading: String(c.sections[id].settings?.heading ?? c.sections[id].settings?.heading_line1 ?? "").slice(0, 80) })),
    };
  });
  return ok({
    current: { versionId: cur.version.id, number: cur.version.number, direction: cur.spec.direction, name: cur.spec.name, summary: cur.version.summary, fingerprint: themeFingerprint(cur.spec), structure, pages: cur.spec.store.pages, product: { handle: cur.spec.store.product.handle, title: cur.spec.store.product.title, price: cur.spec.store.product.price }, motion: cur.spec.imported ? undefined : { enabled: cur.spec.settings.motion_enabled !== false, intensity: String(cur.spec.settings.motion_intensity ?? "normal"), parallax: cur.spec.settings.motion_parallax !== false }, imported: cur.spec.imported ? { name: cur.spec.imported.name, report: cur.spec.imported.report } : undefined },
    versions: listThemeVersions(p.id),
    messages,
    directions: directionCards(),
    // Thème importé : ses propres sections ajoutables (celles qui ont un préréglage, comme dans l'éditeur Shopify).
    library: cur.spec.imported
      ? availableSectionTypes(cur.spec)
          .map((t) => ({ t, schema: sectionSchema(cur.spec, t) }))
          .filter(({ schema }) => schema?.presets?.length && !schema.enabled_on?.groups?.length)
          .map(({ t, schema }) => ({ type: t, name: String((schema!.presets![0] as { name?: string }).name ?? schema!.name), category: "Votre thème", description: `Section de votre thème${schema!.blocks.length ? ` · ${schema!.blocks.filter((b) => !b.type.startsWith("@")).length} type(s) de blocs` : ""}`, keywords: t.replace(/-/g, " "), preview: null }))
      : baseSectionTypes().filter(addable).map((t) => {
      const e = SECTION_LIBRARY.find((x) => x.type === t);
      return { type: t, name: e?.name ?? sectionSchema(null, t)?.name ?? t, category: e?.category ?? "Avancé", description: e?.description ?? "", keywords: e?.keywords ?? "", preview: fs.existsSync(path.join(process.cwd(), "public", "sections", `${t}.jpg`)) ? `/sections/${t}.jpg` : null };
    }),
  });
});
