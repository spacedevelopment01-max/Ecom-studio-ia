/**
 * Theme Check sur documents Shopify vérifiés en mémoire (suivi #194 ; cause des échecs CI intermittents relevée par
 * Codex). Le module téléchargeait les documents à chaque processus et gardait une réponse « 429 » comme schéma : de
 * fausses erreurs ValidSchema, en CI et au studio (une section valide écrite par l'IA refusée puis « corrigée » par
 * l'IA). Ces essais passent par la fonction réelle du studio, themeCheck().
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import https from "node:https";
import { afterEach, describe, expect, it } from "vitest";
import { readShopifyDocs, resetThemeCheckForTests, ShopifyDocsError } from "@/lib/theme/shopify-docs";
import { themeCheck } from "@/lib/theme/theme-check";
import { sampleSpec } from "./fixtures";

const SECTION_OK = `<section class="es-section">{{ section.settings.heading | escape }}</section>
{% schema %}{"name":"Essai","settings":[{"type":"text","id":"heading","label":"Titre","default":"Bonjour"}],"presets":[{"name":"Essai"}]}{% endschema %}`;
const withSection = (liquid: string) => {
  const spec = sampleSpec("atelier");
  spec.customSections = { ...spec.customSections, "es-custom-essai": { name: "Essai", liquid } };
  return spec;
};
/** Copie des documents livrés, dont un rendu illisible comme une réponse « 429 » enregistrée. */
const brokenDocs = () => {
  const src = path.dirname(require.resolve("@shopify/theme-check-docs-updater/package.json"));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-docs-illisibles-"));
  fs.cpSync(path.join(src, "data"), dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "preset.json"), "429: Too Many Requests");
  return dir;
};

afterEach(() => {
  delete process.env.ES_SHOPIFY_DOCS_DIR;
  resetThemeCheckForTests();
});

describe("Theme Check — documents Shopify vérifiés, sans téléchargement", () => {
  it("lit et vérifie tous les documents attendus par le module", () => {
    const docs = readShopifyDocs();
    expect(docs.revision).toMatch(/^[0-9a-f]{40}$/);
    expect(docs.schemas.size).toBeGreaterThanOrEqual(13);
    for (const text of [...docs.resources.values(), ...docs.schemas.values()]) expect(() => JSON.parse(text)).not.toThrow();
  });

  it("thème valide, appels simultanés : aucune erreur et aucune requête vers raw.githubusercontent.com", async () => {
    const original = https.request;
    let attempts = 0;
    // Toute requête vers les documents Shopify en ligne est comptée (la CI y recevait des « 429 »).
    https.request = ((...args: Parameters<typeof https.request>) => {
      const o = args[0] as { hostname?: string; host?: string } | string | URL;
      const host = typeof o === "string" ? new URL(o).hostname : o instanceof URL ? o.hostname : o.hostname ?? o.host ?? "";
      if (String(host).includes("raw.githubusercontent.com")) attempts++;
      return original(...args);
    }) as typeof https.request;
    try {
      const results = await Promise.all([themeCheck(sampleSpec("atelier")), themeCheck(withSection(SECTION_OK)), themeCheck(sampleSpec("atelier", "multi"))]);
      for (const r of results) expect(r).toEqual({ available: true, errors: [] });
    } finally {
      https.request = original;
    }
    expect(attempts).toBe(0);
  }, 240_000);

  it("les vraies erreurs restent détectées : Liquid invalide et réglage de schéma invalide", async () => {
    const liquid = await themeCheck(withSection(`<section>{% if section.settings.heading %}</section>\n{% schema %}{"name":"Essai","presets":[{"name":"Essai"}]}{% endschema %}`));
    expect(liquid.available).toBe(true);
    expect(liquid.errors.some((e) => e.file === "sections/es-custom-essai.liquid")).toBe(true);
    const schema = await themeCheck(withSection(SECTION_OK.replace('"type":"text"', '"type":"inexistant"')));
    expect(schema.errors.some((e) => e.file === "sections/es-custom-essai.liquid" && e.check === "ValidSchema")).toBe(true);
  }, 240_000);

  it("document Shopify illisible : la vérification s'arrête avec l'erreur, jamais « outil indisponible »", async () => {
    const dir = brokenDocs();
    expect(() => readShopifyDocs(dir)).toThrow(ShopifyDocsError);
    process.env.ES_SHOPIFY_DOCS_DIR = dir;
    resetThemeCheckForTests();
    await expect(themeCheck(sampleSpec("atelier"))).rejects.toThrow(/preset\.json/);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120_000);
});
