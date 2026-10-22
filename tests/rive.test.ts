/**
 * Atelier Rive d'après le dossier du 23 octobre (docs/design/atelier-rive-reference-20261023, approuvé par Thomas).
 * Garde-fous : thème de services aux polices et au profil propres ; démonstration aux 14 médias suivis et aux six pages
 * des maquettes (accueil, prestations, projets filtrables, un détail cohérent par projet, atelier, contact) ; rien
 * d'inventé (projets annoncés comme exemples, aucun client, chiffre, équipe ou envoi réel) ; chaque composition dans la
 * galerie Services ; un autre projet de services n'hérite d'aucun nom, texte ou image d'Atelier Rive ; exports.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { renderPage } from "@/lib/theme/render";
import { compileTheme } from "@/lib/theme/compile";
import { validateSpec } from "@/lib/theme/ops";
import { catalogTheme } from "@/lib/theme/theme-catalog";
import { FAMILY_LIBRARY } from "@/lib/theme/section-families";
import { resolveLibraryType } from "@/lib/theme/family-gallery";
import { withProjectMedia } from "@/lib/theme/section-defaults";
import { currentChromePreset } from "@/lib/theme/family-chrome";
import { composeShop } from "@/lib/engine/shop";
import { saveBrand, loadProject } from "@/lib/projects";
import { libraryLoader } from "@/lib/theme/loader";
import { cmsExport } from "@/lib/cms-v2/export";
import { demoProject } from "./demo-fixtures";
import { RIVE_MEDIA, RIVE_PROJECTS } from "./rive-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visible = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/g, "").replace(/<[^>]+>/g, " ").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ");
const HOME = ["ed-opening", "fs-needs", "portfolio", "services-list", "timeline", "ed-scene", "faq", "cta-banner"];
const PAGES = ["prestations", "projets", ...RIVE_PROJECTS.map((x) => x.handle), "atelier", "contact", "mentions-legales"];

describe("Atelier Rive : thème de services d'après les maquettes du 23 octobre", () => {
  it("services seulement ; Newsreader (licence OFL) et Inter ; profil « journal » ; fonds blancs", () => {
    const t = catalogTheme("rive")!;
    expect(t.kinds).toEqual(["services"]);
    expect(t.fonts).toEqual({ heading: "newsreader_n4", body: "inter_n4" });
    expect(fs.existsSync(path.join("assets", "fonts", "Newsreader-400.ttf"))).toBe(true);
    expect(fs.readFileSync(path.join("assets", "fonts", "licenses", "Newsreader-OFL.txt"), "utf8")).toMatch(/Newsreader Project Authors[\s\S]*SIL Open Font License/);
    expect(t.settings.editorial_profile).toBe("journal");
  });
});

describe("Atelier Rive : démonstration", async () => {
  const user = await createUser("rive-demo@example.invalid", "isolated-test-only", "Rive");
  const f = await fr(() => demoProject(user.id, "rive"));
  const { spec } = f;
  const files = compileTheme(spec);
  const render = (route: string) => fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()));
  const types = (key: string) => spec.templates[key].order.map((k) => spec.templates[key].sections[k]).filter((s) => !s.disabled).map((s) => s.type);

  it("accueil dans l'ordre de la maquette, mêmes sections que la composition du thème ; valide", () => {
    expect(validateSpec(spec)).toEqual([]);
    expect(types("index")).toEqual(HOME);
    expect(spec.settings.color_schemes).toBeTruthy();
    const schemes = spec.settings.color_schemes as Record<string, { settings: Record<string, string> }>;
    expect(schemes["scheme-1"].settings.background.toUpperCase()).toBe("#FFFFFF");
    expect(JSON.stringify(schemes).toUpperCase()).toContain("#37152C");
  });

  it("les 14 médias livrés, suivis dans le dépôt, tous utilisés ; aucun fichier du kit privé", () => {
    expect(f.missing).toEqual([]);
    for (const m of RIVE_MEDIA) expect(fs.existsSync(path.join("public", "theme-assets", "rive", m.file)), m.file).toBe(true);
    const used = JSON.stringify(spec.templates);
    for (const m of RIVE_MEDIA) expect(used, m.file).toContain(`rive-${m.file}`);
    expect(used).not.toMatch(/rive-(01-salon|02-cuisine|03-chambre|04-entree|05-salle-eau|06-bibliotheque|07-matieres|08-plans|09-volume|10-menuiserie|11-repas|12-escalier)\.webp/);
  });

  it("six pages et les mentions légales ; un H1 par page ; liens internes vers des pages existantes ; rien « à compléter » visible", async () => {
    expect(spec.store.pages.map((p) => p.handle).sort()).toEqual([...PAGES].sort());
    const handles = new Set(spec.store.pages.map((p) => p.handle));
    for (const route of ["/", ...PAGES.map((h) => `/pages/${h}`)]) {
      const r = await render(route);
      expect(r.status, route).toBe(200);
      expect((r.html.match(/<h1\b/g) ?? []).length, route).toBe(1);
      expect(visible(r.html), route).not.toMatch(/\[À compléter/);
      for (const m of r.html.matchAll(/href="\/pages\/([a-z0-9-]+)"/g)) expect(handles.has(m[1]), `${route} → ${m[1]}`).toBe(true);
    }
    expect(spec.store.menus["main-menu"].links.map((l) => l.title)).toEqual(["Projets", "Prestations", "L'atelier"]);
  });

  it("projets : filtres par type de lieu ; chaque carte ouvre son projet, avec sa propre photo et son nom ; même modèle de détail", async () => {
    const gallery = Object.values(spec.templates["page.projets"].sections).find((s) => s.type === "portfolio")!;
    expect(gallery.settings).toMatchObject({ layout: "asym", show_filters: true, heading_tag: "h1" });
    const cards = gallery.block_order!.map((k) => gallery.blocks![k].settings);
    expect(new Set(cards.map((c) => c.tag))).toEqual(new Set(["Appartements", "Maisons", "Espaces professionnels"]));
    expect(cards).toHaveLength(RIVE_PROJECTS.length);
    const html = (await render("/pages/projets")).html;
    expect(html).toContain('data-folio-filter="maisons"');
    for (const c of cards) {
      const handle = String(c.link).replace("/pages/", "");
      const x = RIVE_PROJECTS.find((p) => p.handle === handle)!;
      expect(x, handle).toBeTruthy();
      expect(c.title).toBe(x.name);
      const t = spec.templates[`page.${handle}`];
      expect(t.order.map((k) => t.sections[k].type)).toEqual(["main-page", "ed-scene", "fs-case", "cta-banner"]);
      const opening = Object.values(t.sections).find((s) => s.type === "ed-scene")!;
      // La photo d'ouverture est celle de la carte, ou une autre vue du même lieu (maison sur la pinède, réserve du dossier).
      expect([c.image_asset, "rive-12-salon-jardin.webp"]).toContain(opening.settings.image_asset);
      const page = visible((await render(`/pages/${handle}`)).html);
      expect(page).toContain(x.place);
      expect(page).toContain("Projet de démonstration");
      expect(page).toMatch(/Projet précédent[\s\S]*Projet suivant/);
    }
    // Les deux « Un salon pour se retrouver » restent deux projets distincts, chacun avec ses photos.
    const salons = RIVE_PROJECTS.filter((p) => p.headline.startsWith("Un salon pour se retrouver"));
    expect(salons).toHaveLength(2);
    expect(new Set(salons.map((p) => p.image)).size).toBe(2);
  });

  it("rien d'inventé : ni client, ni avis, ni chiffre, ni équipe ; marque de démonstration annoncée ; aucun envoi réel", async () => {
    for (const route of ["/", ...PAGES.map((h) => `/pages/${h}`)]) {
      const text = visible((await render(route)).html);
      expect(text, route).not.toMatch(/nos clients|témoignage|★|\d+\s?%|\d+\s?(ans|années) d'expérience|diplôm|notre équipe/i);
    }
    expect(visible((await render("/pages/atelier")).html)).toContain("marque de démonstration");
    expect(visible((await render("/pages/mentions-legales")).html)).toContain("aucun message envoyé depuis ce site n'est transmis");
    for (const t of Object.values(spec.templates)) for (const s of Object.values(t.sections)) expect(["testimonials", "fs-reviews", "team"]).not.toContain(s.type);
  });

  it("contact : nom, e-mail, lieu, besoin, projet, photos ou plan facultatifs, consentement obligatoire, « Envoyer mon projet » ; états d'envoi prêts", async () => {
    const html = (await render("/pages/contact")).html;
    for (const name of ["contact[name]", "contact[email]", "contact[place]", "contact[room]", "contact[body]", "contact[files]", "contact[consent]"]) expect(html, name).toContain(`name="${name}"`);
    expect(html).toMatch(/type="checkbox" name="contact\[consent\]" value="oui" required/);
    expect(html).toContain("Envoyer mon projet");
    for (const k of ["required", "email", "choice", "consent", "sending", "failed", "success"]) expect(html, k).toMatch(new RegExp(`data-msg-${k}="[^"]+"`));
    // Le succès n'est jamais affiché d'avance : seulement après réponse (JavaScript du thème) ou après un vrai envoi Shopify.
    expect(visible(html)).not.toContain("votre demande est bien complète");
    expect(fs.readFileSync(path.join("theme-base", "assets", "editorial.js"), "utf8")).toContain("__esContactTransport");
  });

  it("en-tête et pied de page : dispositions de la famille Services reconnues", () => {
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
    const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
    expect(currentChromePreset("services", "header", header.settings)?.id).toBe("contact");
    expect(currentChromePreset("services", "footer", footer.settings)?.id).toBe("signature");
    expect(header.settings.cta_label).toBe("Parlons de votre projet");
  });
});

describe("Atelier Rive : chaque composition dans la galerie Services", () => {
  const services = FAMILY_LIBRARY.services;
  it("20 fonctions (plafond), aucun doublon ; les dispositions des maquettes, chacune avec ses réglages", () => {
    expect(services).toHaveLength(20);
    const ids = services.flatMap((e) => e.dispositions.map((d) => `${e.key}~${d.id}`));
    expect(new Set(ids).size).toBe(ids.length);
    const want: [string, string, Record<string, unknown>][] = [
      ["services.hero~banner", "ed-opening", { layout: "banner" }],
      ["services.needs~row", "fs-needs", { layout: "row" }],
      ["services.portfolio~asym", "portfolio", { layout: "asym" }],
      ["services.offers~thumbs", "services-list", { layout: "thumbs" }],
      ["services.offers~illustrated", "services-list", { layout: "cards", action_style: "button" }],
      ["services.method~columns", "timeline", { layout: "columns" }],
      ["services.history~band", "ed-scene", { layout: "band" }],
      ["services.history~stacked", "about", { layout: "stacked" }],
      ["services.faq~side", "faq", { layout: "side" }],
      ["services.case~detail", "fs-case", { layout: "detail" }],
      ["services.contact~band-split", "cta-banner", { style: "split" }],
      ["services.contact~card", "cta-banner", { style: "card" }],
      ["services.contact~form-image", "ed-contact", {}],
    ];
    for (const [id, type, settings] of want) {
      const r = resolveLibraryType(`fam:${id}`);
      expect(r.type, id).toBe(type);
      expect(r.settings, id).toMatchObject(settings);
    }
    // Le détail de projet arrive avec ses blocs : le besoin, la réponse et trois photos de détail.
    expect(resolveLibraryType("fam:services.case~detail").blocks?.map((b) => b.type)).toEqual(["part", "part", "photo", "photo", "photo"]);
  });

  it("le détail de projet ajouté depuis la galerie reçoit des photos du projet", async () => {
    const user = await createUser("rive-galerie@example.invalid", "isolated-test-only", "Galerie");
    const f = await fr(() => demoProject(user.id, "rive"));
    const r = resolveLibraryType("fam:services.case~detail");
    const filled = withProjectMedia(f.spec, r.type, r.settings, r.blocks);
    expect(filled.blocks?.filter((b) => b.type === "photo").every((b) => String(b.settings?.image_asset ?? "") !== "")).toBe(true);
  });
});

describe("Atelier Rive appliqué à un autre projet de services : rien d'Atelier Rive", async () => {
  const user = await createUser("rive-autre@example.invalid", "isolated-test-only", "Autre");
  it("aucun nom, texte, image ni projet d'exemple d'Atelier Rive ; couleurs et nom du projet", async () => {
    const pid = seedHoldout(user.id, 2, "Cabinet Lune");
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Cabinet Lune", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: "rive" });
    const built = await fr(() => composeShop(pid, "rive", null, false));
    const spec = built.spec;
    expect(spec.direction).toBe("rive");
    expect(spec.store.pages.some((pg) => /^projet-/.test(pg.handle))).toBe(false);
    const files = compileTheme(spec);
    for (const route of ["/", ...spec.store.pages.map((pg) => `/pages/${pg.handle}`)]) {
      const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html;
      expect(visible(html), route).not.toMatch(/Atelier Rive|Enfin chez vous|Plus de place pour ce qui compte|Un coup de pouce|Des lieux faits pour être vécus|Un salon pour se retrouver|haussmannien|pinède/i);
      expect(html, route).not.toMatch(/theme-assets\/rive|rive-\d\d-/);
    }
    expect(JSON.stringify(spec.settings.color_schemes).toUpperCase()).not.toContain("#37152C");
  });
});

describe("Atelier Rive : exports", async () => {
  const user = await createUser("rive-exports@example.invalid", "isolated-test-only", "Exports");
  const demo = await fr(() => demoProject(user.id, "rive"));
  const zipText = (z: Record<string, Uint8Array>, re: RegExp) => Object.entries(z).filter(([k]) => re.test(k)).map(([, v]) => strFromU8(v)).join("\n");
  it("Shopify : médias, pages, sections et profil", async () => {
    const exp = await fr(() => cmsExport("shopify", demo.spec, libraryLoader, { projectId: demo.pid }));
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const m of RIVE_MEDIA) expect(names, m.file).toContain(`rive-${m.file}`);
    const json = zipText(z, /\.json$/);
    for (const t of ["page.projets", "page.contact", "page.projet-maison-pinede"]) expect(names, t).toContain(t);
    for (const t of HOME) expect(names + json, t).toContain(t);
    expect(json).toMatch(/"editorial_profile":\s*"journal"/);
    expect(names + json).not.toMatch(/\/home\/|\/tmp\/|localhost|127\.0\.0\.1/);
  });
  for (const platform of ["woocommerce", "prestashop"] as const) it(`${platform} : export produit, médias inclus`, async () => {
    const exp = await fr(() => cmsExport(platform, demo.spec, libraryLoader, { projectId: demo.pid }));
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    expect(names).toMatch(/rive-01-hero-salon/);
  });
});
