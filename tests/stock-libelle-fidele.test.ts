/**
 * Suivi #194 (P2 signalé par Codex) : l'onglet Catalogue promettait « un stock modifié par une vente ou dans la boutique
 * n'est jamais écrasé ». Faux pour WooCommerce et PrestaShop, qui n'acceptent qu'une quantité absolue : une vente faite
 * pendant l'écriture elle-même peut ne pas être déduite (src/lib/products/sync.ts, contre-vérification #195).
 * Le texte montré au client décrit désormais les garanties réelles ; ce test le relie aux capacités des connecteurs :
 * si un connecteur gagne ou perd l'ajustement relatif, le texte doit être revu.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { shopifyConnector } from "@/lib/products/connectors/shopify";
import { wooConnector } from "@/lib/products/connectors/woocommerce";
import { prestaConnector } from "@/lib/products/connectors/prestashop";

const ui = fs.readFileSync(path.join(process.cwd(), "src/components/studio/tab-catalogue.tsx"), "utf8");
const noFetch = (() => { throw new Error("aucun appel réseau dans ce test"); }) as unknown as typeof fetch;

describe("Onglet Catalogue — libellé du stock fidèle à la synchronisation", () => {
  it("plus aucune promesse absolue de stock « jamais écrasé »", () => {
    expect(ui).not.toMatch(/jamais écrasé/i);
    expect(ui).not.toMatch(/never overwritten/i);
  });

  it("Shopify : ajustement relatif réel, et le texte le dit", () => {
    const shopify = shopifyConnector({ shop: "exemple.myshopify.com", token: "jeton-factice" }, noFetch);
    expect(typeof shopify.adjustStock).toBe("function");
    expect(ui).toMatch(/Shopify : le studio envoie un ajustement/);
  });

  it("WooCommerce et PrestaShop : quantité absolue seulement, et la limite est annoncée", () => {
    const woo = wooConnector({ url: "https://boutique.example.invalid", key: "ck_factice", secret: "cs_factice" }, noFetch);
    const presta = prestaConnector({ url: "https://boutique.example.invalid", key: "CLEFACTICE" }, noFetch);
    for (const c of [woo, presta]) {
      expect(c.adjustStock).toBeUndefined();
      expect(typeof c.setStock).toBe("function");
    }
    expect(ui).toMatch(/WooCommerce et PrestaShop n'acceptent qu'une quantité totale/);
    expect(ui).toMatch(/une vente passée pendant l'envoi lui-même peut ne pas être déduite/);
    expect(ui).toMatch(/a sale made during the send itself may not be deducted/);
  });

  it("envoi sans réponse : jamais refait, stock de la boutique repris, vérification demandée", () => {
    expect(ui).toMatch(/il n'est jamais refait automatiquement/);
    expect(ui).toMatch(/le studio reprend le stock affiché par la boutique/);
  });
});
