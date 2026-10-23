/**
 * Site d'agence immobilière (thème Maison & Horizon, issue #172) : ce que le moteur ajoute au site de services d'un
 * projet qui choisit ce thème, pour que les biens de l'onglet « Biens » s'affichent sans rien construire à la main :
 * pages Acheter, Louer, Carte, Estimer et Favoris, modèle de la fiche d'un bien (`metaobject/bien`), menu et icône
 * « favoris » de l'en-tête. Les pages de services (prestations, à propos, contact, FAQ, mentions) restent.
 * Textes génériques et vrais : aucun bien, prix, coordonnée ni promesse inventés ; les formulaires disent ce qu'ils font.
 */
import { sectionSchema, withDefaults, type SectionInstance, type TemplateJson, type ThemeSpec } from "./spec";

type Lang = "fr" | "en";

export function addRealEstateSite(spec: ThemeSpec, lang: Lang) {
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const p = (s: string) => `<p>${s}</p>`;
  const section = (type: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []): SectionInstance | null => {
    const schema = sectionSchema(spec, type); if (!schema) return null;
    return { type, settings: withDefaults(schema.settings, settings), blocks: Object.fromEntries(blocks.map((b, i) => [`b${i}`, { type: b.type, settings: withDefaults(schema.blocks.find((x) => x.type === b.type)?.settings, b.settings) }])), block_order: blocks.map((_, i) => `b${i}`) };
  };
  const template = (rows: [string, SectionInstance | null][]): TemplateJson => {
    const ok = rows.filter((r): r is [string, SectionInstance] => !!r[1]);
    return { order: ok.map(([k]) => k), sections: Object.fromEntries(ok) };
  };
  // Photo d'ouverture : celle de l'accueil composé (photo du client), réutilisée en haut des pages de recherche.
  const homeHero = Object.values(spec.templates.index?.sections ?? {}).find((s) => s.type === "re-hero");
  const heroImage = String(homeHero?.settings.image_asset ?? "");
  const BUY = "/pages/acheter", RENT = "/pages/louer", MAP = "/pages/carte", ESTIMATE = "/pages/estimer", FAVORITES = "/pages/favoris";
  const hero = (heading: string, text: string) => section("re-hero", { layout: "page", height: "medium", heading, text: p(text), image_asset: heroImage, padding_bottom: 0 });
  const listing = (mode: "vente" | "location", heading: string) => section("re-listings", { mode, layout: "grid", heading, note: "", link_label: "", limit: 0, show_summary: true, show_filters: true, use_url: true, show_count: true, show_sort: true, per_page: 9, tabs: "transaction", buy_url: BUY, rent_url: RENT, overlap: true, padding_top: 0, padding_bottom: 48 });
  const pages: { handle: string; title: string; rows: [string, SectionInstance | null][] }[] = [
    { handle: "acheter", title: t("Acheter", "Buy"), rows: [["hero", hero(t("Nos biens à vendre", "Properties for sale"), t("Maisons, appartements et biens de caractère.", "Houses, flats and characterful homes."))], ["list", listing("vente", t("Biens à vendre", "For sale"))]] },
    { handle: "louer", title: t("Louer", "Rent"), rows: [["hero", hero(t("Nos biens à louer", "Properties to rent"), t("Appartements et maisons en location.", "Flats and houses to rent."))], ["list", listing("location", t("Biens à louer", "To rent"))]] },
    { handle: "carte", title: t("Carte des biens", "Property map"), rows: [["hero", hero(t("Nos biens sur la carte", "Our properties on the map"), t("Choisissez une ville pour placer ses biens sur la carte illustrative.", "Choose a city to place its properties on the illustrative map."))], ["map", section("re-listings", { mode: "vente", layout: "map", heading: "", note: "", link_label: "", limit: 0, show_filters: true, use_url: true, show_count: true, show_sort: true, tabs: "view", overlap: true, map_label: t("Carte illustrative", "Illustrative map"), padding_top: 0, padding_bottom: 48 })]] },
    { handle: "estimer", title: t("Estimer", "Valuation"), rows: [["hero", section("re-hero", { layout: "page", height: "medium", eyebrow: t("Estimation", "Valuation"), heading: t("Faites estimer votre bien", "Get your property valued"), text: p(t("Décrivez votre bien : un conseiller l'étudie et vous recontacte avec son avis de valeur.", "Describe your property: an adviser studies it and gets back to you with a valuation.")), image_asset: heroImage, room_below: 150, padding_bottom: 0 })], ["form", section("re-form", { kind: "estimate", overlap: true, padding_top: 0, padding_bottom: 48 })]] },
    { handle: "favoris", title: t("Mes favoris", "My favourites"), rows: [["fav", section("re-favorites", { buy_url: BUY, rent_url: RENT, padding_top: 24, padding_bottom: 48 })]] },
    // Tableau de bord de ce navigateur (favoris, recherches récentes) : jamais présenté comme un compte client.
    { handle: "mon-espace", title: t("Mon espace", "My space"), rows: [["dash", section("re-account", { layout: "dashboard", heading: t("Mon projet immobilier", "My property project"), text: t("Vos favoris et vos recherches récentes, gardés dans ce navigateur.", "Your favourites and recent searches, kept in this browser."), favorites_url: FAVORITES, contact_url: "/pages/contact", padding_top: 24, padding_bottom: 48 })]] },
  ];
  for (const pg of pages) {
    if (spec.store.pages.some((x) => x.handle === pg.handle)) continue;
    spec.store.pages.push({ handle: pg.handle, title: pg.title, template_suffix: pg.handle, body_html: "" });
    spec.templates[`page.${pg.handle}`] = template([["title", section("main-page", { show_title: false, width: "wide", padding_top: 0, padding_bottom: 0 })], ...pg.rows]);
  }
  // Fiche d'un bien : un seul modèle pour tous les biens publiés.
  spec.templates["metaobject/bien"] = template([
    ["bien", section("re-bien", { buy_url: BUY, rent_url: RENT, padding_top: 8, padding_bottom: 32 })],
    ["similar", section("re-listings", { mode: "similar", layout: "mini", heading: t("Autres biens [transaction] à [ville]", "Other properties [transaction] in [ville]"), note: "", link_label: "", limit: 4, same_city: true, padding_top: 8, padding_bottom: 48 })],
  ]);
  // Menu : Acheter, Louer, Estimer après l'accueil ; pied de page : carte et favoris.
  const main = spec.store.menus["main-menu"];
  if (main && !main.links.some((l) => l.url === BUY)) main.links.splice(1, 0, { title: t("Acheter", "Buy"), url: BUY }, { title: t("Louer", "Rent"), url: RENT }, { title: t("Estimer", "Valuation"), url: ESTIMATE });
  const footer = spec.store.menus.footer;
  if (footer && !footer.links.some((l) => l.url === MAP)) footer.links.unshift({ title: t("Carte des biens", "Property map"), url: MAP }, { title: t("Mes favoris", "My favourites"), url: FAVORITES });
  for (const g of Object.values(spec.groups)) for (const s of Object.values(g.sections)) if (s.type === "header") Object.assign(s.settings, { favorites_link: FAVORITES, favorites_label: t("Mes favoris", "My favourites"), account_link: "/pages/mon-espace" });
  // L'accueil mène aux pages créées ici.
  for (const s of Object.values(spec.templates.index?.sections ?? {})) {
    if (s.type === "re-hero") Object.assign(s.settings, { buy_url: BUY, rent_url: RENT });
    if (s.type === "re-listings" && s.settings.mode === "featured") Object.assign(s.settings, { link: BUY, link_label: t("Voir tous les biens", "See all properties") });
  }
  return spec;
}
