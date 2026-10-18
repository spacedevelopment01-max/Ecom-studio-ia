/** Deux compositions de référence. Choix par thème et type de site, jamais par marque ou métier. */
import type { BuildInput } from "./directions";
import type { ShopCopy } from "./copy";
import type { Kit, Row } from "./theme-catalog";
import type { ServicesPlan } from "./services-site";

export const isReferenceTheme = (direction: string, services: boolean) => services ? direction === "jardin" : direction === "vitrine";
const real = (s: string | undefined) => !!s?.trim() && !/\[(?:À|A) (?:compléter|définir)|\[To (?:complete|define)/i.test(s);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const html = (s: string) => real(s) ? `<p>${esc(s)}</p>` : "";

export function referenceHomeRows(input: BuildInput, c: ShopCopy, k: Kit, svc: ServicesPlan | null): Row[] | null {
  if (!isReferenceTheme(input.direction, !!svc)) return null;
  const t = k.t, im = input.images;
  const photos = [...new Set([im.lifestyle, im.hero, im.scene1, im.scene2, im.scene3, im.detail1, im.detail2, im.packshot, ...(svc?.photos ?? [])].filter((x): x is string => !!x && !!input.files[x]))]
    .filter((file, index, list) => list.findIndex((other) => input.files[other] === input.files[file]) === index);
  const shared = { color_scheme: "scheme-1", padding_top: 80, padding_bottom: 80, motion: "reveal" };
  const editorial = (heading: string, text: string, image: string | undefined, layout: string, n = 1): Row[] => real(heading) || real(text) ? [["ref-editorial", { ...shared, heading: real(heading) ? heading : "", text: html(text), image_asset: image ?? "", image_alt: svc ? heading : input.product.title, layout, color_scheme: `scheme-${n}`, button_label: "", button_link: "" }]] : [];
  const notes = (heading: string, items: { title: string; text: string }[]): Row[] => {
    const known = items.filter((x) => real(x.title) && real(x.text));
    return known.length ? [["ref-notes", { ...shared, heading, layout: svc ? "rows" : "columns" }, known.map((x) => ({ type: "note", settings: { title: x.title, text: html(x.text) } }))]] : [];
  };
  const hero: Row = ["ref-hero", { ...shared, heading: real(c.hero.heading) ? c.hero.heading : input.shopName, text: real(c.hero.text) ? html(c.hero.text) : "", label: input.shopName, image_asset: photos[0] ?? "", image_alt: svc ? t("Vue de l'activité", "View of the business") : input.product.title, layout: svc ? "landscape" : "object", button_label: svc ? svc.cta.label : t("Découvrir le produit", "Explore the product"), button_link: svc ? svc.cta.url : `/products/${input.product.handle}`, secondary_label: svc ? t("Voir les prestations", "Explore services") : t("Voir la collection", "Explore the collection"), secondary_link: svc ? svc.urls.services : "/collections/all", caption: real(c.hero.eyebrow) ? c.hero.eyebrow : "" }];
  const faq = c.faq.items.filter((x) => real(x.q) && real(x.a));
  const questionRows: Row[] = faq.length ? [["v2-faq", { ...shared, heading: c.faq.heading, layout: svc ? "center" : "side" }, faq.map((x) => ({ type: "question", settings: { question: x.q, answer: html(x.a) } }))]] : [];
  if (svc) {
    const offers: Row = ["ref-offers", { ...shared, layout: "studio", heading: t("Une réponse à votre projet", "An approach for your project"), text: "", button_label: svc.cta.label, button_link: svc.cta.url }, svc.services.map((s) => ({ type: "offer", settings: { title: s.name, text: html(s.description), image_asset: s.key ? im.byService?.[`service:${s.key}`] ?? "" : "", image_alt: s.name, price: s.price ?? "", duration: s.duration ?? "", link: svc.urls.services } }))];
    return [hero, ...editorial(c.about.heading, c.about.intro, photos[1], "inset"), offers,
      ...editorial(c.detail.heading, c.detail.text, photos[2], "wide", 3),
      ...notes(t("Notre façon de travailler", "Our approach"), c.about.values),
      ...k.v2.steps("line", 1), ...k.v2.media("rail", 2), ...questionRows,
      ...k.v2.facts("ledger", 1), ...k.v2.cta("split", 3)];
  }
  return [hero,
    ["featured-collection", { heading: t("La collection", "The collection"), collection: "all", limit: 8, columns: 3, ratio: "square", color_scheme: "scheme-1", padding_top: 80, padding_bottom: 80 }],
    ...editorial(c.detail.heading, c.detail.text, photos[1], "offset"),
    ...k.v2.benefits("images", 2), ...editorial(c.statement.heading, c.statement.text, photos[2] ?? photos[0], "inset", 3),
    ...(c.specs.items.some((s) => real(s.value)) ? k.v2.specs("columns", 1) : []),
    ...k.v2.media("rail", 2), ...questionRows, ...k.v2.cta("band", 3)];
}
