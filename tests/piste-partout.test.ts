/**
 * Choisir une piste de logo met tout le projet à ses couleurs : charte refaite, bannières du site (services, sans photo)
 * redessinées, site qui prend le logo de la piste (pas un ancien logo validé) et les bannières aux bonnes couleurs.
 */
import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { all, id, now, run } from "@/lib/db";
import { runWithLang } from "@/lib/i18n-server";
import { localBrand } from "@/lib/engine/local";
import { loadProject } from "@/lib/projects";
import { getAsset } from "@/lib/library";
import { effectivePalette, paletteKey } from "@/lib/route-palette";
import { serviceProduct, serviceProfile } from "./fixtures";

const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);

describe("la piste choisie s'applique partout", () => {
  it("charte, bannières du site et logo du site suivent la piste", async () => {
    await fr(async () => {
      const u = await createUser(`piste${Date.now()}@test.fr`, "motdepasse-test", "P");
      const product = { ...serviceProduct, name: "AutoDim", summary: "Carrosserie et peinture automobile à Mâcon." };
      const services = { ...serviceProfile, contactMode: "call" as const, bookingUrl: "" };
      const { brand, strategy } = localBrand(product, "AutoDim", { business: "services", services } as any);
      const pid = id();
      run(
        "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        pid, u.id, "AutoDim", "ready", "shopify", JSON.stringify(product), JSON.stringify(brand), JSON.stringify(strategy), JSON.stringify({ language: "fr" }), "[]", "services", JSON.stringify(services), now(), now(),
      );
      const { generateLogos, latestProposals, applyLogo } = await import("@/lib/engine/identity");
      const { collectImages } = await import("@/lib/engine/shop");
      await generateLogos(null, pid, { routeAi: null });
      // Anciennes bannières et ancien logo « validé » (piste précédente).
      const oldLogo = loadProject(pid).brand!.logo.assetId!;
      run("UPDATE assets SET status = 'approved' WHERE id = ?", oldLogo);
      const props = latestProposals(pid);
      // Piste dont les couleurs changent la palette du site (accent repris d'un autre rôle).
      const target = props.find((x) => {
        const eff = effectivePalette({ palette: loadProject(pid).brand!.palette, logo: { route: x.info.route } } as any)!;
        return paletteKey(eff) !== paletteKey(loadProject(pid).brand!.palette);
      }) ?? props[props.length - 1];
      const t0 = Date.now();
      await applyLogo(null, pid, { key: target.info.key, label: target.info.label, concept: target.info.concept, spec: target.info.spec, colors: target.info.colors, route: target.info.route });
      const p = loadProject(pid);
      const key = paletteKey(effectivePalette(p.brand)!);

      // Charte refaite après le choix.
      const book = all<{ created_at: number }>("SELECT created_at FROM assets WHERE project_id = ? AND role = 'brand-book' ORDER BY created_at DESC LIMIT 1", pid)[0];
      expect(book.created_at).toBeGreaterThanOrEqual(t0);
      // Bannières redessinées aux couleurs de la piste, et celles-là illustrent le site.
      const { slots, files } = collectImages(pid);
      const bannerId = files[slots.banner!];
      expect(JSON.parse(getAsset(bannerId)!.meta).palette).toBe(key);
      // Logo du site = celui de la piste choisie (même si un ancien logo était validé).
      const logoId = files[slots.logo!];
      const logo = getAsset(logoId)!;
      const main = p.brand!.logo.assetId;
      expect(logo.id === main || logo.source_asset_id === main).toBe(true);
      expect(logoId).not.toBe(oldLogo);
    });
  }, 120_000);
});
