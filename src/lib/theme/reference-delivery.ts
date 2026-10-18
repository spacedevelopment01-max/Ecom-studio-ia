/** Liens de prestations livrées : identité enregistrée à la construction, jamais titre ni position courante. */
import type { Project } from "../projects";
import { associatePages, plannedPages, themePages } from "../seo-v2/pages";
import type { ThemeSpec } from "./spec";

export function bindReferenceOffers(spec: ThemeSpec, project: Project, freshTargets: ReadonlySet<string> = new Set()) {
  if (!spec.meta?.reference || project.business !== "services") return;
  const matches = associatePages(plannedPages(project), themePages(spec));
  for (const ref of spec.meta.reference.links) {
    const block = spec.templates[ref.template]?.sections[ref.section]?.blocks?.[ref.block];
    const page = matches.get(ref.target);
    if (block && page?.kind === "service" && page.url) {
      block.settings.link = page.url;
      if (!freshTargets.has(ref.target)) continue;
      const stored = spec.store.pages.find((p) => p.contentTarget === ref.target);
      const template = stored && spec.templates[`page.${stored.template_suffix}`];
      // Seulement le corps fraîchement livré par le lot 1. Un gabarit personnalisé reste intact.
      const body = template?.sections.seo_body;
      const text = body?.blocks?.body;
      if (!stored || !template || template.order.length !== 1 || template.order[0] !== "seo_body" || !text || typeof text.settings.text !== "string") continue;
      const heading = text.settings.text.match(/^<h1>[\s\S]*?<\/h1>\s*/);
      if (!heading) continue;
      // Le titre complet devient l'unique h1 de l'ouverture ; aucun paragraphe n'est résumé.
      text.settings.text = text.settings.text.slice(heading[0].length);
      template.sections.reference_opening = { type: "ref-hero", settings: {
        layout: "landscape", heading_tag: "h1", heading: stored.title, label: spec.store.shopName,
        text: "", image_asset: block.settings.image_asset ?? "", image_alt: block.settings.image_alt ?? stored.title,
        button_label: spec.language === "en" ? "Discuss your project" : "Parlons de votre projet", button_link: "/pages/contact",
        color_scheme: "scheme-1", motion: "reveal", padding_top: 32, padding_bottom: 32,
      } };
      template.order = ["reference_opening", "seo_body"];
    }
  }
}
