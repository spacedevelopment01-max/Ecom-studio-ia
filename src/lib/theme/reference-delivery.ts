/** Liens de prestations livrées : identité enregistrée à la construction, jamais titre ni position courante. */
import type { Project } from "../projects";
import { associatePages, plannedPages, themePages } from "../seo-v2/pages";
import type { ThemeSpec } from "./spec";
import { serviceCta } from "./section-copy-services";
import { contentContext } from "./section-content";

export function bindReferenceOffers(spec: ThemeSpec, project: Project, freshTargets: ReadonlySet<string> = new Set()) {
  if (!spec.meta?.reference || project.business !== "services") return;
  const matches = associatePages(plannedPages(project), themePages(spec));
  const cta = serviceCta(contentContext(project, spec, false));
  for (const [template, tpl] of Object.entries(spec.templates)) for (const [section, s] of Object.entries(tpl.sections)) if (s.type === "ref-offers") for (const [block, b] of Object.entries(s.blocks ?? {})) if (b.settings.content_target && matches.get(String(b.settings.content_target))?.url) b.settings.link = matches.get(String(b.settings.content_target))!.url;
  for (const ref of [...spec.meta.reference.links]) {
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
      const t = (fr: string, en: string) => spec.language === "en" ? en : fr;
      // Le texte livré reste intégral ; les blocs suivants apportent une orientation et des informations connues.
      const offers = project.services.services.filter((s) => s.key && s.name).map((s) => ({
        type: "offer", settings: { title: s.name, text: `<p>${s.description.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`, content_target: `service:${s.key}`, price: s.price ?? "", duration: s.duration ?? "", link: matches.get(`service:${s.key}`)?.url ?? "/pages/contact" },
      }));
      if (offers.length > 1) template.sections.reference_compare = { type: "ref-offers", settings: { layout: "comparison", heading: t("Choisir la prestation adaptée", "Find the right service"), color_scheme: "scheme-2", motion: "none", padding_top: 64, padding_bottom: 64 }, blocks: Object.fromEntries(offers.map((b, i) => [`service_${i}`, b])), block_order: offers.map((_, i) => `service_${i}`) };
      const facts = [project.services.area && { title: t("Zone d’intervention", "Service area"), text: project.services.area }, project.services.hours && { title: t("Horaires", "Hours"), text: project.services.hours }].filter((x): x is { title: string; text: string } => !!x);
      if (facts.length) template.sections.reference_practical = { type: "ref-notes", settings: { heading: t("Préparer notre échange", "Plan our conversation"), layout: "columns", color_scheme: "scheme-1", padding_top: 64, padding_bottom: 64 }, blocks: Object.fromEntries(facts.map((f, i) => [`fact_${i}`, { type: "note", settings: { title: f.title, text: `<p>${f.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` } }])), block_order: facts.map((_, i) => `fact_${i}`) };
      template.sections.reference_contact = { type: "ref-editorial", settings: { layout: "inset", heading: t("Parlons de votre projet", "Let's discuss your project"), text: "", button_label: cta.label, button_link: cta.url, color_scheme: "scheme-3", motion: "none", padding_top: 64, padding_bottom: 64 } };
      template.order = ["reference_opening", "seo_body", ...(offers.length > 1 ? ["reference_compare"] : []), ...(facts.length ? ["reference_practical"] : []), "reference_contact"];
    }
  }
}
