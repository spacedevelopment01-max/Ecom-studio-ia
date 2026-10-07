/**
 * Livraison honnête par plateforme : « Connecté » seulement avec un vrai connecteur ET une connexion active ;
 * sinon « Export » (thème installable) ou « Kit » (reprise manuelle, la plateforme n'accepte pas de thème).
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { DELIVERY_SUPPORT, deliveryLabel, deliveryMode, type DeliveryPlatform } from "@/lib/delivery";

// Interface (composant React, non importable ici) : elle doit calculer le mode avec deliveryMode, à partir d'une
// connexion Shopify ACTIVE seulement.
const picker = fs.readFileSync("src/components/studio/platform-picker.tsx", "utf8");
const boutique = fs.readFileSync("src/components/studio/tab-boutique.tsx", "utf8");
const PLATFORM_IDS = (picker.match(/PLATFORM_IDS = \[([^\]]+)\]/)![1].match(/"(\w+)"/g) ?? []).map((s) => s.replace(/"/g, "")) as DeliveryPlatform[];
const platformInfo = (id: DeliveryPlatform, _b: string, _t: unknown, connected = false) => ({ delivery: deliveryMode(id, connected) });

const t = (fr: string) => fr;

describe("plateformes : mode de livraison honnête", () => {
  it("Shopify connecté (connexion active) → CONNECTED", () => {
    expect(deliveryMode("shopify", true)).toBe("connected");
    expect(platformInfo("shopify", "products", t as any, true).delivery).toBe("connected");
  });
  it("Shopify sans connexion → EXPORT (jamais « Connecté »)", () => {
    expect(deliveryMode("shopify", false)).toBe("export");
    expect(deliveryMode("shopify")).toBe("export");
    expect(platformInfo("shopify", "products", t as any).delivery).toBe("export");
  });
  it("WooCommerce → EXPORT, même si le client se dit connecté (pas encore de connecteur)", () => {
    expect(deliveryMode("woocommerce", false)).toBe("export");
    expect(deliveryMode("woocommerce", true)).toBe("export");
  });
  it("PrestaShop → EXPORT, même si le client se dit connecté (pas encore de connecteur)", () => {
    expect(deliveryMode("prestashop", false)).toBe("export");
    expect(deliveryMode("prestashop", true)).toBe("export");
  });
  it("Wix → KIT", () => {
    expect(deliveryMode("wix", true)).toBe("kit");
    expect(platformInfo("wix", "services", t as any, true).delivery).toBe("kit");
  });
  it("Squarespace → KIT", () => {
    expect(deliveryMode("squarespace", true)).toBe("kit");
    expect(platformInfo("squarespace", "products", t as any).delivery).toBe("kit");
  });

  it("WooCommerce et PrestaShop prêts à devenir CONNECTED : il suffit d'activer leur connecteur", () => {
    for (const id of ["woocommerce", "prestashop"] as const) {
      const before = DELIVERY_SUPPORT[id].connector;
      DELIVERY_SUPPORT[id].connector = true;
      try {
        expect(deliveryMode(id, true)).toBe("connected");
        expect(deliveryMode(id, false)).toBe("export");
      } finally {
        DELIVERY_SUPPORT[id].connector = before;
      }
    }
  });

  it("chaque plateforme du studio a un mode et un libellé, sans jamais promettre plus", () => {
    for (const id of PLATFORM_IDS) {
      const info = platformInfo(id, "products", t as any);
      expect(["export", "kit"]).toContain(info.delivery);
      expect(deliveryLabel(info.delivery, t as any)).not.toMatch(/Connecté/);
    }
    expect(deliveryLabel("connected", t as any)).toMatch(/Connecté/);
    expect(PLATFORM_IDS).toEqual(["shopify", "woocommerce", "prestashop", "wix", "squarespace"]);
  });

  it("interface : mode calculé par deliveryMode, Shopify « Connecté » seulement avec une connexion active", () => {
    expect(picker).toMatch(/delivery: deliveryMode\(id, connected\)/);
    expect(boutique).toMatch(/c\.provider === "shopify" && c\.status === "active"/);
    expect(boutique).toMatch(/platformInfo\(platform, business, t, platform === "shopify" && !!shop\)/);
  });
});
