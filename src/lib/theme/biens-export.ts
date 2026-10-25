/**
 * Biens immobiliers dans les exports (thème Maison & Horizon, issue #172). Les biens vivent dans le studio (onglet
 * « Biens »), pas dans le thème : l'export les joint sous forme de données, avec leurs photos (médias du thème
 * `es-bien-*`), et dit honnêtement ce qui reste à faire sur chaque plateforme.
 *  - biens/biens.json : les biens visibles (publiés, vendus, loués), tels que le site les affiche ;
 *  - biens/shopify-metaobjets.json : la définition du métaobjet « bien » (champs aux noms lus par le thème, fiche
 *    publiée à /pages/bien/<adresse>) et une entrée par bien, prêtes pour l'API Admin de Shopify
 *    (metaobjectDefinitionCreate puis metaobjectUpsert) — création non automatique aujourd'hui ;
 *  - biens/LISEZ-MOI.md : la marche à suivre par plateforme.
 */
import { strToU8 } from "fflate";
import { bienDrops } from "./biens-drop";
import type { ThemeSpec } from "./spec";

type ShopifyType = "single_line_text_field" | "multi_line_text_field" | "number_decimal" | "boolean" | "json" | "url";

/** Type de champ Shopify d'après la valeur lue par le thème (`bien.<champ>.value`). */
function fieldType(key: string, values: unknown[]): ShopifyType {
  const v = values.find((x) => x !== null && x !== undefined && x !== "");
  if (typeof v === "number") return "number_decimal";
  if (typeof v === "boolean") return "boolean";
  if (v && typeof v === "object") return "json";
  return /description|quartier_texte|accroche/.test(key) ? "multi_line_text_field" : "single_line_text_field";
}
const fieldValue = (type: ShopifyType, v: unknown) => (type === "json" ? JSON.stringify(v) : type === "boolean" ? (v ? "true" : "false") : String(v));

export function biensExportFiles(spec: ThemeSpec, platform: string): Record<string, Uint8Array<ArrayBuffer>> | null {
  const biens = spec.store.biens ?? [];
  if (!biens.length) return null;
  const drops = bienDrops(biens, "");
  const keys = Object.keys(drops[0]).filter((k) => k !== "system");
  const types = Object.fromEntries(keys.map((k) => [k, fieldType(k, drops.map((d) => (d as unknown as Record<string, { value: unknown }>)[k].value))])) as Record<string, ShopifyType>;
  const definition = {
    type: "bien", name: "Bien immobilier", displayNameKey: "titre",
    capabilities: { publishable: { enabled: true }, onlineStore: { enabled: true, data: { urlHandle: "bien" } } },
    fieldDefinitions: keys.map((k) => ({ key: k, name: k, type: types[k] })),
  };
  const entries = drops.map((d) => ({
    type: "bien", handle: d.system.handle, status: "ACTIVE",
    fields: keys.flatMap((k) => { const v = (d as unknown as Record<string, { value: unknown }>)[k].value; return v === null || v === undefined || v === "" ? [] : [{ key: k, value: fieldValue(types[k], v) }]; }),
  }));
  const files = [...new Set(biens.flatMap((b) => [...b.photos, ...(b.plan ? [b.plan] : []), ...b.neighborhood.photos].map((p) => p.file)))];
  const readme = [
    "# Biens immobiliers / Property listings",
    "",
    `${biens.length} bien(s) visibles exportés (publiés, vendus ou loués) ; ${files.length} photo(s) jointes aux médias du thème (fichiers « es-bien-… »).`,
    "Les biens se gèrent dans le studio (onglet « Biens ») : cet export en est une copie à la date de l'export.",
    "",
    "## Shopify",
    "- Le thème contient la fiche d'un bien (templates/metaobject/bien.json) et les pages Acheter, Louer, Carte, Favoris.",
    "- Les biens doivent exister dans Shopify comme métaobjets « bien » : `shopify-metaobjets.json` contient la définition et une entrée par bien, prêtes pour l'API Admin (metaobjectDefinitionCreate, puis metaobjectUpsert). Cette création n'est pas automatique aujourd'hui (connexion à la boutique requise, prévue en V2).",
    "- Tant que les métaobjets ne sont pas créés, les listes affichent « Aucun bien n'est publié pour le moment ».",
    "",
    "## WooCommerce (WordPress), PrestaShop, Wix, Squarespace",
    `- ${platform === "woocommerce" || platform === "prestashop" ? "Les pages du thème sont exportées ; " : "Le guide de reconstruction est fourni ; "}les listes de biens, filtres, carte et fiches dynamiques demandent un module serveur (type de contenu « bien » et son import) qui n'existe pas encore : à prévoir en V2.`,
    "- `biens.json` contient toutes les données des biens pour un import manuel ou par un développeur.",
    "",
    "## Limites / Limits",
    "- Favoris, comparaison et recherches récentes restent dans le navigateur du visiteur : ce n'est pas un compte client.",
    "- Les formulaires (visite, rappel, estimation, alerte, contact) passent par le formulaire de contact de la plateforme ; l'envoi automatique d'alertes par e-mail demande un service d'e-mails.",
    "- La carte est illustrative : position saisie à la main, pas de géolocalisation.",
    "- Hébergement natif du site par le studio : V2.",
    "",
  ].join("\n");
  const u8 = (text: string) => new Uint8Array(strToU8(text)) as Uint8Array<ArrayBuffer>;
  return {
    "biens/biens.json": u8(JSON.stringify(biens, null, 2)),
    "biens/shopify-metaobjets.json": u8(JSON.stringify({ definition, entries }, null, 2)),
    "biens/LISEZ-MOI.md": u8(readme),
  };
}
