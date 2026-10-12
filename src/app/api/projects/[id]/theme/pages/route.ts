import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { L, uiLang } from "@/lib/i18n-server";
import { pick } from "@/lib/i18n";
import { currentTheme, saveSettings, saveThemeVersion, ThemeConflict, type Project } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { validateSpec } from "@/lib/theme/ops";
import { storeProducts, type ThemeSpec } from "@/lib/theme/spec";
import { assertPageModels, planOfProject } from "@/lib/plan-gates";
import { PLANS } from "@/lib/plans";
import { ACTIVITY_LABEL, activityOf, bookingTarget, buildContext, buildModelTemplate, contactUrl, modelById, PAGE_MODELS, suggestedModels } from "@/lib/theme/page-templates";
import { addPage, addProductLayout, assignProductLayout, changePageModel, duplicatePage, duplicateProductLayout, inNavigation, isProtectedPage, PageError, productLayouts, removePage, reorderNavigation, setBookingLink, setNavigation, updatePage } from "@/lib/theme/pages";

/**
 * Pages du site dans « Modifier le thème » : liste, modèles, activité, mises en page des produits.
 * Lecture : tout projet (le client voit ce qui existe et ce que son forfait ouvre).
 */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const cur = currentTheme(p.id);
  if (!cur) throw new HttpError(409, L("Aucune boutique.", "No store yet."));
  return ok(view(p, cur.spec, cur.version.id));
});

function view(p: Project, spec: ThemeSpec, version: string) {
  const lang = uiLang();
  const plan = planOfProject(p.id);
  const activity = activityOf(p);
  const layouts = productLayouts(spec);
  const booking = bookingTarget(spec, p.services);
  return {
    version,
    plan,
    canUseModels: !!plan && PLANS[plan].pageModels,
    activity: { ...activity, label: pick(lang, ACTIVITY_LABEL[activity.value].fr, ACTIVITY_LABEL[activity.value].en) },
    activities: Object.entries(ACTIVITY_LABEL).map(([id, l]) => ({ id, label: pick(lang, l.fr, l.en) })),
    suggested: suggestedModels(activity.value),
    models: PAGE_MODELS.map((m) => ({ id: m.id, kind: m.kind, category: m.category, name: pick(lang, m.name.fr, m.name.en), description: pick(lang, m.description.fr, m.description.en), usage: pick(lang, m.usage.fr, m.usage.en) })),
    pages: spec.store.pages.map((pg) => ({
      handle: pg.handle,
      title: pg.title,
      url: `/pages/${pg.handle}`,
      model: pg.model ?? null,
      status: pg.status ?? "published",
      inNav: inNavigation(spec, pg.handle),
      protected: isProtectedPage(spec, pg),
      seo: pg.seo ?? { title: "", description: "" },
      service: pg.links?.service ?? null,
      booking: pg.links?.booking ?? null,
      template: pg.template_suffix ? `page.${pg.template_suffix}` : "page",
    })),
    navigation: (spec.store.menus["main-menu"]?.links ?? []).map((l) => ({ title: l.title, url: l.url })),
    products: storeProducts(spec).map((x) => ({ handle: x.handle, title: x.title, layout: x.template_suffix && spec.templates[`product.${x.template_suffix}`] ? x.template_suffix : null })),
    layouts,
    services: (p.services.services ?? []).map((s) => s.name).filter(Boolean),
    booking,
    contactUrl: contactUrl(spec),
  };
}

const Seo = z.object({ title: z.string().max(200), description: z.string().max(600) });
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_activity"), activity: z.enum(["products", "booking", "quote", "local", "mixed"]) }),
  z.object({ action: z.literal("add_page"), version: z.string(), model: z.string(), title: z.string().min(1).max(120), handle: z.string().max(80).optional(), service: z.string().max(200).optional(), inNav: z.boolean().default(true), status: z.enum(["draft", "published"]).default("published") }),
  z.object({ action: z.literal("add_product_layout"), version: z.string(), model: z.string(), product: z.string() }),
  z.object({ action: z.literal("assign_layout"), version: z.string(), product: z.string(), layout: z.string().nullable() }),
  z.object({ action: z.literal("duplicate_layout"), version: z.string(), from: z.string(), product: z.string() }),
  z.object({ action: z.literal("duplicate_page"), version: z.string(), handle: z.string() }),
  z.object({ action: z.literal("change_model"), version: z.string(), handle: z.string(), model: z.string() }),
  z.object({ action: z.literal("update_page"), version: z.string(), handle: z.string(), title: z.string().max(120).optional(), newHandle: z.string().max(80).optional(), seo: Seo.optional(), status: z.enum(["draft", "published"]).optional() }),
  z.object({ action: z.literal("set_nav"), version: z.string(), handle: z.string(), show: z.boolean() }),
  z.object({ action: z.literal("reorder_nav"), version: z.string(), urls: z.array(z.string().max(300)).max(60) }),
  z.object({ action: z.literal("remove_page"), version: z.string(), handle: z.string(), confirm: z.boolean().default(false) }),
  z.object({ action: z.literal("set_booking"), version: z.string(), handle: z.string(), url: z.string().max(500).nullable() }),
]);

/** Actions réservées aux forfaits Développer et Dominer (vérifiées ici, quel que soit l'écran qui les envoie). */
const PREMIUM = new Set(["add_page", "add_product_layout", "duplicate_layout", "duplicate_page", "change_model"]);

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, Body);
  const cur = currentTheme(p.id);
  if (!cur) throw new HttpError(409, L("Aucune boutique.", "No store yet."));
  if (b.action === "set_activity") {
    saveSettings(p.id, { ...p.settings, activity: b.activity });
    return ok(view({ ...p, settings: { ...p.settings, activity: b.activity } }, cur.spec, cur.version.id));
  }
  // Thème importé (ZIP du client) : ses fichiers ne contiennent pas les sections des modèles ; il se modifie dans l'éditeur.
  if (cur.spec.imported) throw new HttpError(409, L("Votre thème importé se modifie directement dans l'éditeur : les modèles de pages s'appliquent aux thèmes créés par le studio.", "Your imported theme is edited directly in the editor: page templates apply to themes created by the studio."));
  if (PREMIUM.has(b.action)) assertPageModels(p.id);
  // Affecter une autre mise en page qu'une fiche commune : fonction des modèles ; revenir à la fiche commune : toujours possible.
  if (b.action === "assign_layout" && b.layout) assertPageModels(p.id);
  if (b.version !== cur.version.id) throw conflict();

  const spec = cur.spec;
  const model = "model" in b ? modelById(b.model) : null;
  if ("model" in b && !model) throw new HttpError(400, L("Modèle inconnu.", "Unknown template."));
  let next: ThemeSpec;
  let summary: string;
  let extra: Record<string, unknown> = {};
  try {
    switch (b.action) {
      case "add_page": {
        if (model!.kind !== "page") throw new PageError(L("Ce modèle s'applique à un produit.", "This template applies to a product."));
        if (b.service && !p.services.services.some((s) => s.name === b.service)) throw new PageError(L("Prestation inconnue.", "Unknown service."));
        const c = buildContext(spec, p, { service: b.service });
        const r = addPage(spec, { title: b.title, handle: b.handle, template: buildModelTemplate(spec, p, model!, c), model: model!.id, service: b.service, inNav: b.inNav, status: b.status });
        next = r.spec;
        extra = { handle: r.handle, needsCalendar: model!.category === "service" && !c.booking };
        summary = L(`Page « ${b.title} » ajoutée (modèle ${model!.name.fr})`, `Page "${b.title}" added (${model!.name.en} template)`);
        break;
      }
      case "add_product_layout": {
        if (model!.kind !== "product") throw new PageError(L("Ce modèle s'applique à une page.", "This template applies to a page."));
        const c = buildContext(spec, p, { productHandle: b.product });
        if (!c.product) throw new PageError(L("Produit introuvable.", "Product not found."), 404);
        const r = addProductLayout(spec, b.product, buildModelTemplate(spec, p, model!, c), `${model!.id}-${b.product}`);
        next = r.spec;
        extra = { layout: r.suffix };
        summary = L(`Mise en page « ${model!.name.fr} » pour ${c.product.title}`, `"${model!.name.en}" layout for ${c.product.title}`);
        break;
      }
      case "assign_layout":
        next = assignProductLayout(spec, b.product, b.layout).spec;
        summary = b.layout ? L("Mise en page affectée à un produit", "Layout assigned to a product") : L("Produit remis sur la fiche produit commune", "Product back on the shared product page");
        break;
      case "duplicate_layout": {
        const r = duplicateProductLayout(spec, b.from, b.product);
        next = r.spec;
        extra = { layout: r.suffix };
        summary = L("Mise en page produit copiée", "Product layout copied");
        break;
      }
      case "duplicate_page": {
        const r = duplicatePage(spec, b.handle);
        next = r.spec;
        extra = { handle: r.handle };
        summary = L("Page dupliquée (brouillon)", "Page duplicated (draft)");
        break;
      }
      case "change_model": {
        if (model!.kind !== "page") throw new PageError(L("Ce modèle s'applique à un produit.", "This template applies to a product."));
        const page = spec.store.pages.find((x) => x.handle === b.handle);
        const c = buildContext(spec, p, { service: page?.links?.service });
        const r = changePageModel(spec, b.handle, buildModelTemplate(spec, p, model!, c), model!.id);
        next = r.spec;
        extra = { kept: r.kept };
        summary = L(`Modèle de la page changé : ${model!.name.fr} (version précédente restaurable)`, `Page template changed: ${model!.name.en} (previous version restorable)`);
        break;
      }
      case "update_page": {
        const r = updatePage(spec, b.handle, { title: b.title, handle: b.newHandle, seo: b.seo, status: b.status });
        next = r.spec;
        extra = { handle: r.handle };
        summary = L("Page modifiée", "Page updated");
        break;
      }
      case "set_nav":
        next = cloneAnd(spec, (s) => setNavigation(s, b.handle, b.show));
        summary = b.show ? L("Page ajoutée au menu", "Page added to the menu") : L("Page retirée du menu", "Page removed from the menu");
        break;
      case "reorder_nav":
        next = cloneAnd(spec, (s) => reorderNavigation(s, b.urls));
        summary = L("Menu réorganisé", "Menu reordered");
        break;
      case "remove_page": {
        const r = removePage(spec, b.handle, b.confirm);
        if (!r.removed) return ok({ confirmNeeded: true, deps: r.deps });
        next = r.spec;
        summary = L("Page supprimée (restaurable depuis l'historique)", "Page deleted (restorable from history)");
        break;
      }
      case "set_booking":
        next = setBookingLink(spec, b.handle, b.url, contactUrl(spec)).spec;
        summary = b.url ? L("Destination du bouton de réservation enregistrée", "Booking button destination saved") : L("Bouton de réservation retiré", "Booking button removed");
        break;
    }
  } catch (e) {
    if (e instanceof PageError) throw new HttpError(e.status, e.message);
    throw e;
  }
  const problems = validateSpec(next!);
  if (problems.length) throw new HttpError(400, problems.join(" ; "));
  try {
    const v = saveThemeVersion(p.id, next!, summary!, "user", undefined, cur.version.id);
    return ok({ ...view(p, next!, v.id), ...extra });
  } catch (e) {
    if (e instanceof ThemeConflict) throw conflict();
    throw e;
  }
});

const conflict = () => new HttpError(409, L("Le site vient d'être modifié ailleurs (autre onglet ou double clic) : la liste a été rechargée, refaites votre action si besoin.", "The site was just changed elsewhere (another tab or a double click): the list was reloaded, redo your action if needed."), "theme_conflict");

function cloneAnd(spec: ThemeSpec, fn: (s: ThemeSpec) => void): ThemeSpec {
  const s: ThemeSpec = JSON.parse(JSON.stringify(spec));
  fn(s);
  return s;
}
