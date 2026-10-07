/**
 * Mode de livraison honnête de chaque plateforme (sans dépendance serveur : utilisé par l'interface et les tests).
 *  - CONNECTED : le studio envoie lui-même le site dans la boutique du client — seulement avec une vraie connexion active ;
 *  - EXPORT : fichier installable (thème ZIP, CSV) que le client importe lui-même ;
 *  - KIT : la plateforme n'accepte pas de thème importé → kit de reprise (médias, charte, textes, guide).
 */
export type DeliveryMode = "connected" | "export" | "kit";
export type DeliveryPlatform = "shopify" | "woocommerce" | "prestashop" | "wix" | "squarespace";

/**
 * Capacités par plateforme. `connector` : le studio sait envoyer directement (aujourd'hui Shopify seulement) ;
 * WooCommerce et PrestaShop passeront à `true` le jour où leur connecteur existera — sans autre changement.
 */
export const DELIVERY_SUPPORT: Record<DeliveryPlatform, { connector: boolean; installable: boolean }> = {
  shopify: { connector: true, installable: true },
  woocommerce: { connector: false, installable: true },
  prestashop: { connector: false, installable: true },
  wix: { connector: false, installable: false },
  squarespace: { connector: false, installable: false },
};

/** CONNECTED uniquement si la plateforme a un connecteur ET que le client a une connexion active ; sinon EXPORT ou KIT. */
export function deliveryMode(platform: DeliveryPlatform, connected = false): DeliveryMode {
  const s = DELIVERY_SUPPORT[platform];
  if (s.connector && connected) return "connected";
  return s.installable ? "export" : "kit";
}

/** Libellé du mode de livraison : Connecté (envoi direct), Export (fichier à installer), Kit (reprise manuelle). */
export function deliveryLabel(mode: DeliveryMode, t: (fr: string, en: string) => string): string {
  return mode === "connected" ? t("Connecté · envoi direct", "Connected · direct send") : mode === "export" ? t("Export · thème installable", "Export · installable theme") : t("Kit de reprise", "Rebuild kit");
}
export const deliveryTone = (mode: DeliveryMode) => (mode === "kit" ? ("warn" as const) : ("ok" as const));
