import { planAllowsSection } from "@/lib/plan-entitlements";
import { planOfProject } from "@/lib/plan-gates";
import { PLANS } from "@/lib/plans";
import { storeProducts } from "@/lib/theme/spec";
import { themeRecommendation } from "@/lib/theme/theme-recommendation";
import { incompatibleSections } from "@/lib/theme/section-fit";
import { sectionIncompatibility } from "@/lib/theme/section-compat";
import fs from "node:fs";
import { LANGUAGES } from "@/lib/theme-v2/art-direction";
import { LANGUAGE_LABEL_EN } from "@/lib/theme-v2/engine";
import path from "node:path";
import { addable, libraryEntry } from "@/lib/theme/section-library";
import { familyGallery } from "@/lib/theme/family-gallery";
import { L, uiLang } from "@/lib/i18n-server";
import { all, json } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { currentTheme, listThemeVersions } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { containerOf, sectionSchema, baseSectionTypes, availableSectionTypes } from "@/lib/theme/spec";
import { directionCards } from "@/lib/theme/directions";
import { themeFingerprint } from "@/lib/theme/compile";
import { layoutChoices } from "@/lib/theme/layout-choices";
import { previewSandbox } from "@/lib/theme/preview-access";
import { stockPhotosInTheme } from "@/lib/theme/stock-notice";
import { getAsset } from "@/lib/library";
import { pixabayOnly } from "@/lib/stock/photos";

export const runtime = "nodejs";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  // Noms des sections et libellés : langue de l'interface (les textes de la boutique restent dans sa langue).
  const ui = uiLang();
  const cur = currentTheme(p.id);
  const messages = all<any>("SELECT id, role, content, attachments, selection, theme_version_id, job_id, created_at FROM chat_messages WHERE project_id = ? AND thread = 'shop' ORDER BY created_at ASC LIMIT 200", p.id).map((m) => ({ ...m, attachments: JSON.parse(m.attachments || "[]"), selection: m.selection ? JSON.parse(m.selection) : null }));
  const recommendation = themeRecommendation(p, ui);
  const kind = recommendation.category.kind;
  const plan=planOfProject(p.id);
  const entitlements=plan?{librarySections:PLANS[plan].librarySections,themeEditing:PLANS[plan].themeEditing}:null;
  if (!cur) return ok({ current: null, versions: listThemeVersions(p.id), messages, directions: directionCards(ui, p.brand?.direction ? [p.brand.direction] : []), sandbox: previewSandbox(), storeKind: recommendation.category, recommendation });
  const structure = ["group:header", ...Object.keys(cur.spec.templates), "group:footer"].map((t) => {
    const c = containerOf(cur.spec, t)!;
    return {
      template: t,
      sections: c.order.filter((id) => c.sections[id]).map((id) => ({ id, type: c.sections[id].type, name: sectionSchema(cur.spec, c.sections[id].type, ui)?.name ?? c.sections[id].type, disabled: !!c.sections[id].disabled, locked: cur.spec.locks.includes(`${t}:${id}`), heading: String(c.sections[id].settings?.heading ?? c.sections[id].settings?.heading_line1 ?? "").slice(0, 80), layout: layoutChoices(cur.spec, c.sections[id], ui) })),
    };
  });
  return ok({
    entitlements,
    quality: json<{ gate?: unknown }>(cur.version.qc, {})?.gate ?? null,
    current: { versionId: cur.version.id, number: cur.version.number, direction: cur.spec.direction, name: cur.spec.name, language: cur.spec.language ?? "fr", summary: cur.version.summary, fingerprint: themeFingerprint(cur.spec), structure, pages: cur.spec.store.pages, products: storeProducts(cur.spec).map((x) => ({ handle: x.handle, title: x.title, template_suffix: x.template_suffix && cur.spec.templates[`product.${x.template_suffix}`] ? x.template_suffix : null })), product: { handle: cur.spec.store.product.handle, title: cur.spec.store.product.title, price: cur.spec.store.product.price }, motion: cur.spec.imported ? undefined : { enabled: cur.spec.settings.motion_enabled !== false, intensity: String(cur.spec.settings.motion_intensity ?? "normal"), parallax: cur.spec.settings.motion_parallax !== false }, imported: cur.spec.imported ? { name: cur.spec.imported.name, report: cur.spec.imported.report } : undefined },
    versions: listThemeVersions(p.id),
    // Theme Engine V2 : langage visuel, plan des pages (complètes ou à compléter), informations manquantes.
    v2: cur.spec.meta?.engine === "v2" ? { language: cur.spec.meta.v2?.language, site: cur.spec.meta.v2?.site, plan: cur.spec.meta.v2?.plan ?? [], todo: cur.spec.meta.v2?.todo ?? [], languages: LANGUAGES.map((l) => ({ id: l.id, label: ui === "en" ? LANGUAGE_LABEL_EN[l.id] : l.label })) } : null,
    // Photos libres de droits sur le site : toujours signalées au client (jamais en silence), remplaçables.
    stock: (() => {
      const photos = stockPhotosInTheme(cur.spec, getAsset, ui);
      return { photos, aiBlocked: photos.length > 0 && pixabayOnly() };
    })(),
    // Attribut « sandbox » des iframes d'aperçu (dépend de l'hébergement, voir preview-access.ts).
    sandbox: previewSandbox(),
    messages,
    // Vignettes composées avec le contenu du projet (photos, nom, textes) plutôt que les captures d'exemple.
    // Le thème installé reste listé même s'il est retiré du catalogue (conservé, signalé, jamais proposé ailleurs).
    directions: directionCards(ui, [cur.spec.direction]).map((d) => (p.brand ? { ...d, preview: `/api/projects/${p.id}/theme/direction-thumb?d=${d.id}` } : d)),
    // Catégorie du projet (contrat « catégorie / thèmes éligibles / justification ») et sections devenues incompatibles
    // avec le thème installé (jamais supprimées : signalées).
    storeKind: recommendation.category,
    recommendation,
    incompatible: cur.spec.imported ? [] : incompatibleSections(cur.spec, kind, ui).map((x) => ({ ...x, name: libraryEntry(x.type, ui)?.name ?? x.type })),
    // Thème importé : ses propres sections ajoutables (celles qui ont un préréglage, comme dans l'éditeur Shopify).
    library: cur.spec.imported
      ? availableSectionTypes(cur.spec)
          .map((t) => ({ t, schema: sectionSchema(cur.spec, t, ui) }))
          .filter(({ schema }) => schema?.presets?.length && !schema.enabled_on?.groups?.length)
          .map(({ t, schema }) => ({ type: t, name: String((schema!.presets![0] as { name?: string }).name ?? schema!.name), category: "Votre thème", description: (() => {
            const n = schema!.blocks.filter((b) => !b.type.startsWith("@")).length;
            return L(`Section de votre thème${schema!.blocks.length ? ` · ${n} type(s) de blocs` : ""}`, `Section from your theme${schema!.blocks.length ? ` · ${n} block type${n > 1 ? "s" : ""}` : ""}`);
          })(), keywords: t.replace(/-/g, " "), preview: null }))
      // Toutes les sections du thème de base : les ajoutables, et les composants structurels (catégorie « Structure »,
      // retrouvables et réglables depuis la bibliothèque, mais ni ajoutés ni dupliqués).
      // Galerie contextuelle : seules les sections compatibles avec le thème installé ET la catégorie du projet
      // (métadonnées déclarées, section-fit.ts) ; les composants structurels restent listés pour leurs réglages.
      // Bibliothèque de la famille du projet (issue #141) : ses 20 fonctions et leurs dispositions, rien d'autre ; une
      // disposition dont la section ne convient pas au thème installé n'est pas proposée.
      : [
          ...familyGallery(kind, ui, (t) => !sectionIncompatibility(cur.spec, t, kind, ui)).filter(e=>planAllowsSection(plan,kind,e.type.replace(/^fam:/,"").split("~")[0])),
          ...baseSectionTypes().filter((t) => !addable(t)).map((t) => {
            const e = libraryEntry(t, ui);
            return { type: t, name: e?.name ?? sectionSchema(null, t, ui)?.name ?? t, category: e?.category ?? "Structure", description: e?.description ?? "", keywords: e?.keywords ?? "", preview: fs.existsSync(path.join(process.cwd(), "public", "sections", `${t}.jpg`)) ? `/sections/${t}.jpg` : null, addable: false };
          }),
        ],
  });
});
