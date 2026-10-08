/**
 * Website Intent (Theme Engine V2) : quel site faut-il construire ? Déduit du projet (Project Brain) — type
 * d'activité, catalogue, catégorie, prestations, mode de contact, personnalité, préférences du client — sans
 * aucun code propre à un client. Une boutique mono-produit, un artisan, un restaurant et un SaaS n'ont ni la même
 * architecture, ni le même parcours, ni le même appel à l'action.
 */
import { all } from "../db";
import type { Project } from "../projects";
import type { Lang } from "../i18n";
import { fold } from "../seo-v2/lang";

export type SiteType = "shop_mono" | "shop_multi" | "services_trade" | "local_service" | "restaurant" | "saas";
export type Conversion = "buy" | "quote" | "call" | "book" | "demo" | "contact";

export type WebsiteIntent = {
  site: SiteType;
  conversion: Conversion;
  /** Traits utiles à la direction artistique (déduits, jamais affichés comme des faits). */
  premium: boolean;
  tech: boolean;
  warm: boolean;
  beauty: boolean;
  food: boolean;
  /** Préférences du client enregistrées dans le Project Brain (ex. « tons chauds »). */
  preferences: string[];
  lang: Lang;
  /** Pourquoi ce type de site : traçabilité (rapport, studio). */
  reasons: string[];
};

const SAAS = /\b(saas|logiciel|application|appli|plateforme|software|tableaux? de bord|dashboard|abonnement en ligne|outil en ligne)\b/;
const FOOD_PLACE = /\b(restaurant|bistrot|bistro|brasserie|cafe|traiteur|pizzeria|creperie|bar a|cantine|salon de the|boulangerie|patisserie)\b/;
const TRADE = /\b(platr|peint|electric|plomb|menuis|macon|carrel|couvr|charpent|chauffag|serrur|facad|isolation|renovation|paysag|jardin|artisan|batiment|terrass|vitrier|ebenist)/;
const BEAUTY = /\b(beaut|cosmet|soin|serum|creme|parfum|maquill|skin)/;
const TECH = /\b(hightech|high-tech|drone|casque|audio|electronique|camera|connecte|gadget|informatique|tech)\b/;

export function websiteIntent(p: Project): WebsiteIntent {
  const text = fold([p.product.category, p.product.summary, p.product.sector, p.name, ...(p.services?.services ?? []).map((s) => s.name)].filter(Boolean).join(" "));
  const personality = fold([...(p.brand?.personality ?? []), p.brand?.positioning ?? ""].join(" "));
  const prefs = all<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND kind IN ('preference','decision') AND (scope IS NULL OR scope IN ('all','brand','shop')) ORDER BY created_at DESC LIMIT 20", p.id).map((r) => r.value);
  const reasons: string[] = [];
  let site: SiteType;
  if (p.business === "services") {
    if (FOOD_PLACE.test(text)) (site = "restaurant"), reasons.push("activité de restauration (catégorie)");
    else if (TRADE.test(text)) (site = "services_trade"), reasons.push("métier du bâtiment ou de l'artisanat (catégorie, prestations)");
    else (site = "local_service"), reasons.push("entreprise de services");
  } else if (SAAS.test(text)) (site = "saas"), reasons.push("logiciel ou service en ligne (catégorie)");
  else if (p.storeType === "mono" || !p.catalog?.length) (site = "shop_mono"), reasons.push("boutique d'un produit phare");
  else (site = "shop_multi"), reasons.push("boutique avec catalogue");

  const mode = p.services?.contactMode;
  const conversion: Conversion =
    site === "saas" ? "demo"
    : site === "shop_mono" || site === "shop_multi" ? "buy"
    : p.services?.bookingUrl || mode === "booking" ? "book"
    : mode === "quote" ? "quote"
    : mode === "call" || site === "restaurant" ? "call"
    : "contact";
  const premium = /\b(premium|luxe|haut de gamme|raffine|prestige|elegant)\b/.test(personality);
  const warm = /\b(chaleureux|convivial|gourmand|artisanal|authentique|chaud|terre|sable)\b/.test(personality + " " + fold(prefs.join(" ")));
  return {
    site,
    conversion,
    premium,
    tech: TECH.test(text) || p.product.sector === "hightech" || site === "saas",
    warm,
    beauty: BEAUTY.test(text) || p.product.sector === "beaute",
    food: FOOD_PLACE.test(text) || /\b(epicerie|boisson|the|cafe|chocolat|vin)\b/.test(text),
    preferences: prefs,
    lang: p.settings.language === "en" ? "en" : "fr",
    reasons,
  };
}
