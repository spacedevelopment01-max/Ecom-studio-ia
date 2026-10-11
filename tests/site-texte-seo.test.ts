/**
 * Texte et référencement du site (Theme V2, entreprise de services) : l'accueil rédigé par SEO & Copywriting V2
 * donne le titre principal (métier + ville) ; chaque page a un titre ≤ 60 signes et une description ≤ 155 signes ;
 * l'appel final suit le mode de contact (réservation ≠ devis). Moteur local, aucun appel payant.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 })));
afterEach(() => vi.unstubAllGlobals());

describe("Texte et SEO du site", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject, currentTheme } = await import("@/lib/projects");
  const { buildShopV2 } = await import("@/lib/theme-v2/engine");
  const { runContentEngineV2 } = await import("@/lib/seo-v2/engine");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  it("accueil : titre principal de la page rédigée, titres et descriptions Google bornés, appel final selon le mode de contact", async () => {
    const u = await createUser(`seo${Date.now()}@test.fr`, "motdepasse-test", "S");
    const pid = await seedThemeScenario(u.id, "artisan");
    await fr(() => runContentEngineV2(null, pid, { type: "home_page" }));
    await fr(() => buildShopV2(null, pid));
    const spec = currentTheme(pid)!.spec;
    // Titre et description de l'accueil pour Google.
    expect(spec.store.seo?.title).toBeTruthy();
    expect(spec.store.seo!.title.length).toBeLessThanOrEqual(60);
    expect(spec.store.seo!.description.length).toBeGreaterThan(20);
    expect(spec.store.seo!.description.length).toBeLessThanOrEqual(155);
    // Chaque page a son titre et sa description.
    expect(spec.store.pages.length).toBeGreaterThan(1);
    for (const pg of spec.store.pages) {
      expect(pg.seo?.title, pg.handle).toBeTruthy();
      expect(pg.seo!.title.length).toBeLessThanOrEqual(60);
      expect(pg.seo!.description.length).toBeLessThanOrEqual(155);
    }
    // Titre principal = celui de la page d'accueil rédigée (métier + ville), sans le nom de marque en suffixe.
    const hero = Object.values((spec.templates.index as any).sections).find((s: any) => s.type === "v2-hero") as any;
    const h1 = `${hero.settings.heading} ${hero.settings.heading_em ?? ""}`;
    const p = loadProject(pid);
    expect(h1.toLowerCase()).toContain((p.product.category ?? "").toLowerCase().split(/\s+/)[0]);
    expect(h1).not.toMatch(/—/);
  });

  it("réservation : l'appel final invite à réserver, pas à décrire un projet sur devis", async () => {
    const u = await createUser(`seo-b${Date.now()}@test.fr`, "motdepasse-test", "S");
    const pid = await seedThemeScenario(u.id, "artisan");
    const p = loadProject(pid);
    const { run } = await import("@/lib/db");
    run("UPDATE projects SET business_json = ? WHERE id = ?", JSON.stringify({ ...(p.services ?? {}), contactMode: "booking" }), pid);
    await fr(() => buildShopV2(null, pid));
    const spec = currentTheme(pid)!.spec;
    const cta = Object.values((spec.templates.index as any).sections).find((s: any) => s.type === "v2-cta") as any;
    expect(cta.settings.heading).toMatch(/Réserv/);
    expect(JSON.stringify(cta.settings)).not.toMatch(/sur devis/);
  });
});
