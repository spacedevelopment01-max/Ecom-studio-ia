/**
 * En-têtes, menus burger, méga menus et pieds de page : chaque disposition se rend sans erreur, les sous-menus
 * (collections sous « Boutique », prestations sous « Prestations ») apparaissent, et le méga menu reste au choix.
 */
import { describe, expect, it } from "vitest";
import { compileTheme } from "@/lib/theme/compile";
import { renderPage } from "@/lib/theme/render";
import { sampleSpec, serviceSpec } from "./fixtures";

type Spec = ReturnType<typeof sampleSpec>;
const headerOf = (spec: Spec) => {
  const g = spec.groups.header;
  const id = g.order.find((k) => g.sections[k].type === "header")!;
  return g.sections[id];
};
const footerOf = (spec: Spec) => {
  const g = spec.groups.footer;
  const id = g.order.find((k) => g.sections[k].type === "footer")!;
  return g.sections[id];
};
const home = async (spec: Spec) => (await renderPage({ spec, base: "/p", files: compileTheme(spec), cart: [] }, "/", new URLSearchParams())).html;

describe("menus : sous-menus dans les données", () => {
  it("boutique multi-produit : les collections sont sous « Boutique »", () => {
    const spec = sampleSpec("atelier", "multi");
    const shop = spec.store.menus["main-menu"].links.find((l) => l.url === "/collections/all")!;
    expect(shop.links?.length).toBeGreaterThan(0);
    expect(shop.links!.every((l) => l.url.startsWith("/collections/"))).toBe(true);
  });

  it("site de services : chaque prestation est sous « Prestations »", () => {
    const spec = serviceSpec();
    const main = spec.store.menus["main-menu"].links;
    const svc = main.find((l) => l.title === "Prestations")!;
    expect(svc.links?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("en-tête : dispositions, méga menus et menu téléphone", () => {
  it("sans méga menu : simple liste déroulante + accordéon sur téléphone", async () => {
    const spec = sampleSpec("atelier", "multi");
    const html = await home(spec);
    expect(html).toContain("es-dropdown");
    expect(html).not.toContain("es-mega ");
    expect(html).toContain("es-mm__group");
    expect(html).toContain("Tout voir");
  });

  for (const mega of ["columns", "columns-promo", "cards", "featured"]) {
    it(`méga menu « ${mega} » : icônes, images et encarts promo`, async () => {
      const spec = sampleSpec("atelier", "multi");
      const h = headerOf(spec);
      Object.assign(h.settings, { mega_menu: mega, desktop_icons: true, mobile_menu: "cards", mobile_promo: "top" });
      const shop = spec.store.menus["main-menu"].links.find((l) => l.url === "/collections/all")!;
      h.blocks = {
        ico: { type: "link_extra", settings: { link_title: shop.title.toUpperCase(), icon: "gift", image_asset: "" } },
        promo: { type: "promo", settings: { image_asset: "", eyebrow: "Soldes", heading: "Jusqu'à -30 %", button_label: "J'en profite", link: "", placement: "both", menu_title: "" } },
      };
      h.block_order = ["ico", "promo"];
      const html = await home(spec);
      expect(html).toContain(`es-mega--${mega}`);
      expect(html).toContain("es-link-icon");
      expect(html).toContain("es-mobile-menu--cards");
      expect(html.match(/Jusqu'à -30 %|Jusqu&#39;à -30 %/g)?.length ?? 0).toBeGreaterThanOrEqual(mega === "columns" ? 1 : 2);
    });
  }

  for (const layout of ["menu-right", "nav-left", "two-rows"]) {
    it(`disposition « ${layout} »`, async () => {
      const spec = sampleSpec("atelier", "multi");
      headerOf(spec).settings.layout = layout;
      expect(await home(spec)).toContain(`es-header--${layout}`);
    });
  }

  for (const m of ["drawer-right", "sheet"]) {
    it(`menu téléphone « ${m} », sous-menus toujours ouverts`, async () => {
      const spec = sampleSpec("atelier", "multi");
      Object.assign(headerOf(spec).settings, { mobile_menu: m, mobile_submenu: "open" });
      const html = await home(spec);
      expect(html).toContain(`es-mobile-menu--${m}`);
      expect(html).toMatch(/<details class="es-mm__group" open>/);
    });
  }
});

describe("pied de page : nouvelles dispositions", () => {
  for (const style of ["brand-left", "split", "stacked", "boxed"]) {
    it(`style « ${style} »`, async () => {
      const spec = sampleSpec("atelier", "multi");
      Object.assign(footerOf(spec).settings, { style, tagline: "Fait main, livré vite." });
      const html = await home(spec);
      expect(html).toContain(`es-footer--${style}`);
      if (style === "brand-left" || style === "split") expect(html).toContain("Fait main, livré vite.");
    });
  }
});
