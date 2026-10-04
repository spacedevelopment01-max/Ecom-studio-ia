import { describe, expect, it } from "vitest";
import { strToU8, unzipSync, zipSync } from "fflate";
import { createUser } from "@/lib/auth";
import { id, now, run } from "@/lib/db";
import { ensureFolders } from "@/lib/library";
import { decomposeTheme, openThemeZip } from "@/lib/theme/import";

const J = (o: unknown) => strToU8(JSON.stringify(o));
/** Petit thème OS 2.0 de test, rangé dans un dossier racine comme les ZIP téléchargés depuis GitHub. */
function sampleTheme() {
  const R = "mon-theme-main/";
  return zipSync({
    [`${R}layout/theme.liquid`]: strToU8(`<!doctype html><html><head>{{ content_for_header }}</head><body>{% sections 'header-group' %}<main>{{ content_for_layout }}</main>{% render 'note' %}</body></html>`),
    [`${R}snippets/note.liquid`]: strToU8(`<p class="note">{{ section.id }}{{ shop.name }}</p>`),
    [`${R}sections/hero.liquid`]: strToU8(`{% doc %}Bannière{% enddoc %}<section class="hero"><h1>{{ section.settings.title }}</h1>{% for b in section.blocks %}<span>{{ b.settings.text }}</span>{% endfor %}<em>{{ product.vendor }}</em></section>
{% schema %}{"name":"t:sections.hero.name","settings":[{"type":"text","id":"title","label":"t:sections.hero.title","default":"t:sections.hero.title_default"}],"blocks":[{"type":"pill","name":"Pastille","settings":[{"type":"text","id":"text","label":"Texte"}]}],"presets":[{"name":"t:sections.hero.name","blocks":[{"type":"pill"}]}]}{% endschema %}`),
    [`${R}sections/header.liquid`]: strToU8(`<header>{{ shop.name }}</header>{% schema %}{"name":"En-tête","settings":[],"enabled_on":{"groups":["header"]}}{% endschema %}`),
    [`${R}sections/cart-bubble.liquid`]: strToU8(`<span>{{ cart.item_count }}</span>`),
    [`${R}sections/header-group.json`]: strToU8(`/* Généré par Shopify */\n${JSON.stringify({ type: "header", name: "Groupe d'en-tête", sections: { header: { type: "header" } }, order: ["header"] })}`),
    [`${R}templates/index.json`]: strToU8(`/* Généré par Shopify */\n${JSON.stringify({ sections: { hero: { type: "hero", settings: { title: "Bonjour" } } }, order: ["hero"] })}`),
    [`${R}templates/gift_card.liquid`]: strToU8("<p>carte</p>"),
    [`${R}config/settings_schema.json`]: J([{ name: "theme_info", theme_name: "Mon Thème", theme_version: "2.1.0", theme_author: "Studio X" }, { name: "t:settings.colors", settings: [{ type: "color", id: "accent", label: "Accent", default: "#112233" }] }]),
    [`${R}config/settings_data.json`]: J({ current: "Défaut", presets: { Défaut: { accent: "#445566" } } }),
    [`${R}locales/fr.schema.json`]: J({ sections: { hero: { name: "Grande bannière", title: "Titre", title_default: "Votre titre ici" } }, settings: { colors: "Couleurs" } }),
    [`${R}assets/base.css`]: strToU8(".hero{color:red}"),
    [`${R}assets/logo.png`]: new Uint8Array([137, 80, 78, 71, 1, 2, 3]),
    [`__MACOSX/${R}._x`]: strToU8("x"),
  });
}

describe("import du thème Shopify du client", () => {
  it("découpe pages, groupes, sections et réglages, traduit les libellés et signale les points d'attention", () => {
    const arc = openThemeZip(sampleTheme());
    expect(arc.root).toBe("mon-theme-main/");
    expect(arc.binary.has("assets/logo.png")).toBe(true);
    const d = decomposeTheme(arc, "mon-theme.zip");
    expect(d.report.name).toBe("Mon Thème");
    expect(d.report.version).toBe("2.1.0");
    expect(d.templates.index.order).toEqual(["hero"]);
    expect(d.templates.index.sections.hero.blocks ?? {}).toEqual({});
    expect(d.groups.header?.order).toEqual(["header"]);
    expect(d.settings).toEqual({ accent: "#445566" }); // préréglage courant désigné par son nom
    const hero = d.report.sections.find((s) => s.type === "hero")!;
    expect(hero.name).toBe("Grande bannière");
    expect(hero.addable).toBe(true);
    expect(d.report.pages[0]).toMatchObject({ template: "index", label: "Accueil" });
    expect(d.report.warnings.join(" ")).toMatch(/gabarit\(s\) Liquid/);
    expect(d.report.settingsGroups.find((g) => g.name === "Couleurs")?.settings).toBe(1);
  });

  it("refuse un fichier qui n'est pas un thème", () => {
    expect(() => openThemeZip(zipSync({ "photo.jpg": new Uint8Array([1, 2]) }))).toThrow(/layout\/theme\.liquid/);
    expect(() => openThemeZip(new Uint8Array([1, 2, 3]))).toThrow(/ZIP/);
  });

  it("importe dans un projet : modifiable section par section, aperçu fidèle, export complet", async () => {
    const { importThemeForProject } = await import("@/lib/engine/theme-import");
    const { currentTheme } = await import("@/lib/projects");
    const { compileTheme, exportThemeZip } = await import("@/lib/theme/compile");
    const { applyOps, validateSpec } = await import("@/lib/theme/ops");
    const { renderPage } = await import("@/lib/theme/render");
    const { sectionSchema } = await import("@/lib/theme/spec");
    const { libraryLoader } = await import("@/lib/theme/loader");
    const u = await createUser(`import${Date.now()}@test.fr`, "motdepasse-test", "Import");
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, status, platform, store_type, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", pid, u.id, "Projet import", "draft", "shopify", "mono", "{}", "[]", now(), now());
    ensureFolders(pid);
    const r = await importThemeForProject(pid, u.id, Buffer.from(sampleTheme()), "mon-theme.zip");
    expect(r.report.files.sections).toBe(3);
    const spec = currentTheme(pid)!.spec;
    expect(spec.imported?.name).toBe("Mon Thème");
    expect(sectionSchema(spec, "cart-bubble")?.settings).toEqual([]); // section sans schéma : acceptée
    expect(validateSpec(spec)).toEqual([]);

    // Ajout d'une section du thème avec son préréglage (blocs compris), texte par défaut traduit.
    const out = applyOps(spec, [{ op: "add_section", template: "index", type: "hero", position: { index: 0 } }, { op: "set_global", key: "accent", value: "#000000" }]);
    expect(out.rejected).toEqual([]);
    const added = out.spec.templates.index.sections[out.spec.templates.index.order[0]];
    expect(added.settings.title).toBe("Votre titre ici");
    expect(Object.values(added.blocks ?? {})[0]?.type).toBe("pill");

    // Le thème compilé reprend les fichiers du client et les modifications.
    const files = compileTheme(out.spec);
    expect(files.get("assets/base.css")).toBe(".hero{color:red}");
    expect(files.has("sections/main-product.liquid")).toBe(false); // aucune section du thème de base
    expect(JSON.parse(files.get("config/settings_data.json")!.replace(/^\/\*[\s\S]*?\*\/\s*/, "")).current.accent).toBe("#000000");

    // Aperçu : les extraits voient « section » et les objets globaux comme sur Shopify.
    const html = (await renderPage({ spec: out.spec, base: "/apercu", cart: [] }, "/", new URLSearchParams())).html;
    expect(html).toContain("<h1>Votre titre ici</h1>");
    expect(html).toContain("<h1>Bonjour</h1>");
    expect(html).toContain("Projet import");

    // Export : tous les fichiers d'origine, médias binaires compris.
    const zip = await exportThemeZip(out.spec, libraryLoader);
    const entries = unzipSync(new Uint8Array(zip.zip));
    expect(Object.keys(entries)).toEqual(expect.arrayContaining(["assets/logo.png", "templates/gift_card.liquid", "snippets/note.liquid", "sections/header-group.json", "templates/index.json"]));
    expect(Object.keys(entries).some((k) => k.startsWith("assets/es-"))).toBe(false);
  });
});
