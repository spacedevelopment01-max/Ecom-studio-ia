/**
 * Site d'une entreprise de services : aucune trace de vente en ligne (panier, produit, livraison),
 * les pages attendues, l'appel à l'action selon le mode de contact, et des exports sans produits obligatoires.
 */
import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { compileTheme } from "@/lib/theme/compile";
import { validateSpec } from "@/lib/theme/ops";
import { renderPage } from "@/lib/theme/render";
import { DIRECTIONS } from "@/lib/theme/directions";
import { exportKit, exportWooCommerce } from "@/lib/theme/platforms";
import { serviceProfile, serviceSpec } from "./fixtures";

/** Texte visible d'une page rendue (sans scripts, styles, attributs ni commentaires). */
const visible = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

const PAGES_FR = ["/", "/pages/prestations", "/pages/a-propos", "/pages/contact", "/pages/faq", "/pages/mentions-legales"];
const PAGES_EN = ["/", "/pages/services", "/pages/about", "/pages/contact", "/pages/faq", "/pages/legal-notice"];
const loader = () => null;

describe("site d'entreprise de services", () => {
  it.each(DIRECTIONS.map((d) => d.id))("%s : pages attendues, ni panier ni produit ni livraison (FR et EN)", async (dir) => {
    for (const lang of ["fr", "en"] as const) {
      const spec = serviceSpec(dir, lang);
      expect(validateSpec(spec)).toEqual([]);
      expect(spec.store.business).toBe("services");
      expect(spec.settings.cart_type).toBe("none");
      const files = compileTheme(spec);
      const pages = lang === "fr" ? PAGES_FR : PAGES_EN;
      const menu = spec.store.menus["main-menu"].links.map((l) => l.url);
      for (const p of pages.slice(1, 5)) expect(menu).toContain(p);
      for (const path of pages) {
        const r = await renderPage({ spec, base: "/p", files, cart: [] }, path, new URLSearchParams());
        expect(r.status, `${dir} ${lang} ${path}`).toBe(200);
        const text = visible(r.html);
        expect(text, `${dir} ${lang} ${path}`).not.toMatch(lang === "fr" ? /panier|livraison|fiche produit|ajouter au panier/i : /\bcart\b|shipping|delivery|add to cart/i);
        expect(r.html).not.toMatch(/es-cart-link|data-cart-drawer|href="\/p\/products\/|href="\/p\/collections/);
      }
      const home = (await renderPage({ spec, base: "/p", files, cart: [] }, "/", new URLSearchParams())).html;
      for (const type of ["services-list", "practical-info", "portfolio", "team", "testimonials", "faq", "cta-banner"]) expect(home, `${dir} ${type}`).toContain(`data-es-type="${type}"`);
      expect(visible(home)).toContain(lang === "fr" ? "Prendre rendez-vous" : "Book an appointment");
      expect(visible(home)).toContain(serviceProfile.services[0].name);
      expect(home).toContain(`tel:${serviceProfile.phone.replace(/\s/g, "")}`);
      const contact = (await renderPage({ spec, base: "/p", files, cart: [] }, "/pages/contact", new URLSearchParams())).html;
      expect(contact).toContain('data-es-type="booking"');
      expect(contact).toContain("calendly.com/cabinet-ondine");
    }
  });

  it("avis, équipe et réalisations : espaces réservés honnêtes, jamais d'avis inventé", () => {
    const spec = serviceSpec("atelier");
    const index = spec.templates.index;
    const reviews = Object.values(index.sections).find((s) => s.type === "testimonials")!;
    for (const b of Object.values(reviews.blocks ?? {})) {
      expect(String(b.settings.quote)).toMatch(/^\[À compléter/);
      expect(b.settings.rating).toBe("0");
    }
    const team = Object.values(index.sections).find((s) => s.type === "team")!;
    for (const b of Object.values(team.blocks ?? {})) expect(String(b.settings.name)).toMatch(/^\[À compléter/);
  });

  it("appel à l'action selon le mode de contact (devis, appel)", () => {
    const quote = serviceSpec("clinique", "fr", { ...serviceProfile, contactMode: "quote", bookingUrl: "" });
    const header = Object.values(quote.groups.header.sections).find((s) => s.type === "header")!;
    expect(header.settings.cta_label).toBe("Demander un devis");
    expect(header.settings.show_cart).toBe(false);
    expect(quote.store.pages.find((p) => p.handle === "contact")!.title).toBe("Demande de devis");
    const call = serviceSpec("nocturne", "en", { ...serviceProfile, contactMode: "call", bookingUrl: "" });
    const h2 = Object.values(call.groups.header.sections).find((s) => s.type === "header")!;
    expect(h2.settings.cta_link).toBe("");
    expect(h2.settings.phone).toBe(serviceProfile.phone);
  });

  it("export WordPress : site vitrine sans WooCommerce ; kit Wix sans CSV produit", async () => {
    const spec = serviceSpec("terroir");
    const wp = await exportWooCommerce(spec, loader);
    expect(wp.name).toMatch(/-wordpress\.zip$/);
    const files = unzipSync(new Uint8Array(wp.zip));
    const names = Object.keys(files);
    const all = names.map((n) => (/\.(html|php|json|css)$/.test(n) ? strFromU8(files[n]) : "")).join("\n");
    expect(all).not.toMatch(/woocommerce/i);
    expect(names.some((n) => n.endsWith("templates/page-prestations.html"))).toBe(true);
    expect(names.some((n) => n.endsWith("templates/single-product.html"))).toBe(false);
    const header = strFromU8(files[names.find((n) => n.endsWith("parts/header.html"))!]);
    expect(header).toContain("Prendre rendez-vous");
    const kit = unzipSync(new Uint8Array((await exportKit(spec, loader, "wix")).zip));
    expect(Object.keys(kit).some((n) => /produits\.csv|products\.csv/.test(n))).toBe(false);
  });

  it("thème Shopify : pages de services compilées, panier désactivé", () => {
    const files = compileTheme(serviceSpec("galerie"));
    for (const k of ["page.services", "page.about", "page.contact", "page.faq", "page.legal"]) expect(files.has(`templates/${k}.json`)).toBe(true);
    expect(files.has("templates/page.shipping.json")).toBe(false);
    for (const t of ["services-list", "pricing", "booking", "practical-info", "team", "portfolio"]) expect(files.has(`sections/${t}.liquid`)).toBe(true);
  });
});
