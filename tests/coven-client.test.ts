/**
 * Le Coven des Charmes — projet CLIENT dédié (`clients/le-coven-des-charmes/`, consigne
 * `docs/client-briefs/le-coven-des-charmes/CONSIGNE_CLAUDE.md`) :
 *  - isolement : rien dans le thème de base, le catalogue, les démonstrations ni la bibliothèque de sections ; aucun
 *    média du client dans le dépôt ; les sections du Coven n'existent que dans le thème du projet qui les reçoit ;
 *  - concept : un bracelet commandé, tirage physique au scoop APRÈS la commande, aucun scoop vendu, aucun choix de
 *    charms, aucun tirage numérique ; prix, tailles, matières, délais et mentions légales restent « à renseigner » ;
 *  - rendu : toutes les pages du site (et la page introuvable) se rendent dans le thème du projet, sans erreur Liquid.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { composeShop } from "@/lib/engine/shop";
import { localBrand } from "@/lib/engine/local";
import { id, now, run } from "@/lib/db";
import { emptyProduct } from "@/lib/project-types";
import { compileTheme } from "@/lib/theme/compile";
import { renderPage } from "@/lib/theme/render";
import { validateSpec } from "@/lib/theme/ops";
import { DIRECTIONS } from "@/lib/theme/directions";
import { SECTION_LIBRARY } from "@/lib/theme/section-library";
import { baseSectionTypes, type ThemeSpec } from "@/lib/theme/spec";
import { runWithLang } from "@/lib/i18n-server";
import { applyCoven, covenMedia, covenSections, COVEN_KEY, COVEN_NAME } from "../clients/le-coven-des-charmes/coven-spec";
import { COVEN_PAGES, PRODUCT_HANDLE } from "../clients/le-coven-des-charmes/coven-pages";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const ROOT = process.cwd();
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/\s+/g, " ");
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

/** Projet isolé : un compte de test, le projet du client, des médias factices (aucun média réel dans les tests). */
async function covenProject(mode: "client" | "controle" = "client") {
  const user = await createUser(`coven-${mode}-${Date.now()}@example.invalid`, "isolated-test-only", "Test Coven");
  const product = { ...emptyProduct(), name: "Bracelet de charms surprise", nameStatus: "provided" as const, category: "Bracelets de charms", sector: "autre" as never, summary: "Bracelet de charms surprise." };
  const { brand, strategy } = localBrand(product, COVEN_NAME, { business: "products" });
  const pid = id();
  run("INSERT INTO projects (id,user_id,name,status,platform,product_json,brand_json,strategy_json,settings_json,sources_json,business_type,business_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    pid, user.id, COVEN_NAME, "draft", "shopify", JSON.stringify(product), JSON.stringify({ ...brand, name: COVEN_NAME, generatedBy: "local" }), JSON.stringify(strategy), "{}", "[]", "products", "null", now(), now());
  const built = await fr(() => composeShop(pid, "orbe" as never, null, false));
  const ids = Object.fromEntries(covenMedia().map((m, i) => [m.file, `asset-${i}`]));
  return { pid, spec: applyCoven(built.spec, ids, { preview: true, mode }) };
}
const render = (spec: ThemeSpec, route: string) => fr(() => renderPage({ spec, base: "/p", files: compileTheme(spec), cart: [] }, route, new URLSearchParams()));

describe("Le Coven des Charmes : isolement du projet client", () => {
  it("aucune section, feuille ni script du Coven dans le thème de base du studio", () => {
    const base = walk(path.join(ROOT, "theme-base"));
    expect(base.filter((f) => /coven|cvn-/i.test(path.basename(f)))).toEqual([]);
    expect(base.filter((f) => /\.(liquid|css|js|json)$/.test(f)).filter((f) => /le coven des charmes|es-custom-coven|\bcvn-[a-z]/i.test(fs.readFileSync(f, "utf8")))).toEqual([]);
    expect(baseSectionTypes().some((t) => t.includes("coven"))).toBe(false);
  });

  it("absent du catalogue, des démonstrations et de la bibliothèque de sections", () => {
    expect(DIRECTIONS.map((d) => String(d.id))).not.toContain(COVEN_KEY);
    expect(SECTION_LIBRARY.some((e) => /coven/i.test(e.type))).toBe(false);
    for (const f of ["src/lib/theme/theme-catalog.ts", "src/lib/theme/reference-themes.ts", "src/lib/theme/theme-demos.ts", "src/lib/theme/theme-fit.ts", "scripts/prepare-theme-demos.ts", "scripts/reference-static-preview.ts", "public/demo/manifest.json"]) {
      if (fs.existsSync(path.join(ROOT, f))) expect(fs.readFileSync(path.join(ROOT, f), "utf8"), f).not.toMatch(/coven/i);
    }
    expect(fs.readdirSync(path.join(ROOT, "src")).join(" ")).not.toMatch(/coven/i);
    expect(walk(path.join(ROOT, "src")).filter((f) => /coven/i.test(fs.readFileSync(f, "utf8")))).toEqual([]);
  });

  it("aucun média du client dans le dépôt (photos, logo, extraits) : seules les polices libres sont versionnées", () => {
    const files = walk(path.join(ROOT, "clients", COVEN_KEY));
    const media = files.filter((f) => /\.(jpe?g|png|webp|heic|gif|svg|mp4)$/i.test(f));
    expect(media).toEqual([]);
    expect(files.filter((f) => /\.ttf$/.test(f)).every((f) => /EBGaramond-\d00\.ttf$/.test(f))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "clients", COVEN_KEY, "theme", "fonts", "OFL.txt"))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "public", "demo", COVEN_KEY))).toBe(false);
    const gitignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
    expect(gitignore).toMatch(/clients\/\*\/prive\//);
  });

  it("les sections du Coven ne viennent que dans le thème du projet qui les reçoit", async () => {
    const other = await covenProject();
    const plain = await fr(async () => {
      const user = await createUser(`coven-autre-${Date.now()}@example.invalid`, "isolated-test-only", "Autre");
      const pid = id();
      const product = { ...emptyProduct(), name: "Lampe", nameStatus: "provided" as const, category: "Luminaire", sector: "maison" as never, summary: "Lampe." };
      const { brand, strategy } = localBrand(product, "Autre boutique", { business: "products" });
      run("INSERT INTO projects (id,user_id,name,status,platform,product_json,brand_json,strategy_json,settings_json,sources_json,business_type,business_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        pid, user.id, "Autre", "draft", "shopify", JSON.stringify(product), JSON.stringify({ ...brand, name: "Autre boutique", generatedBy: "local" }), JSON.stringify(strategy), "{}", "[]", "products", "null", now(), now());
      return (await composeShop(pid, "orbe" as never, null, false)).spec;
    });
    expect(Object.keys(other.spec.customSections).filter((t) => t.startsWith("es-custom-coven")).length).toBe(Object.keys(covenSections()).length);
    expect(Object.keys(plain.customSections).some((t) => t.includes("coven"))).toBe(false);
    expect([...compileTheme(plain).keys()].some((f) => f.includes("coven"))).toBe(false);
    expect(JSON.stringify(plain)).not.toMatch(/coven/i);
  });
});

describe("Le Coven des Charmes : concept et données réelles", () => {
  it("un bracelet, sans prix inventé, sans choix des charms ni scoop vendu", async () => {
    const { spec } = await covenProject();
    expect(validateSpec(spec)).toEqual([]);
    expect(spec.store.products).toHaveLength(1);
    const p = spec.store.product;
    expect(p.handle).toBe(PRODUCT_HANDLE);
    expect(p.price).toBeNull();
    expect(p.variants.every((v) => v.price === null)).toBe(true);
    expect(p.options).toEqual([]);
    const all = JSON.stringify(spec.templates) + JSON.stringify(spec.store);
    expect(all).not.toMatch(/scoop (vendu|à acheter)|acheter (un|des) scoops?|recharge|jetons?|probabilit|rareté|gagne[rz]? /i);
    expect(all).not.toMatch(/\d+[,.]\d{2}\s?€|\d+\s?€/);
    expect(all).toMatch(/tirés au sort au scoop/);
    expect(all).toMatch(/après (votre|la) commande/);
  });

  it("les pages et la confirmation n'annoncent ni tirage ni expédition déjà faits", async () => {
    const { spec } = await covenProject();
    const confirm = JSON.stringify(spec.templates["page.coven-confirmation"]);
    expect(confirm).toMatch(/à réaliser/);
    expect(confirm).toMatch(/sera ensuite monté|seront tirés/);
    expect(confirm).not.toMatch(/a été tiré|ont été tirés|a été expédié|est expédié/);
    const legal = JSON.stringify(spec.templates["page.coven-informations"]);
    expect(legal).not.toMatch(/SIRET \| \d|Statut juridique \| [A-Z]/);
  });

  it("toutes les pages se rendent dans le thème du projet (contrôle et client), sans erreur Liquid", async () => {
    for (const mode of ["client", "controle"] as const) {
      const { spec } = await covenProject(mode);
      const routes = ["/", `/products/${PRODUCT_HANDLE}`, "/cart", ...(COVEN_PAGES as { handle: string }[]).map((pg) => `/pages/${pg.handle}`)];
      for (const r of routes) {
        const out = await render(spec, r);
        expect(out.status, `${mode} ${r}`).toBe(200);
        expect(out.html, `${mode} ${r}`).not.toMatch(/Liquid error|liquid-error|undefined filter/i);
        expect(text(out.html)).toMatch(/Le Coven des Charmes/);
      }
      const nf = await render(spec, "/une-page-qui-nexiste-pas");
      expect(nf.status).toBe(404);
      expect(text(nf.html)).toMatch(/Vous vous êtes égaré\s+dans le Coven\./);
    }
  });

  it("le prix reste « — € Tarif à renseigner » et le nom de marque est exact", async () => {
    const { spec } = await covenProject();
    const html = text((await render(spec, `/products/${PRODUCT_HANDLE}`)).html);
    expect(html).toMatch(/— € Tarif à renseigner/);
    expect(html).toMatch(/Bracelet de charms surprise/);
    expect(JSON.stringify(spec)).not.toMatch(/cover des charmes/i);
  });

  it("cookies : mesure d'audience désactivée tant que le visiteur n'accepte pas ; aucun traceur ajouté", () => {
    const js = fs.readFileSync(path.join(ROOT, "clients", COVEN_KEY, "theme", "assets", "coven.js"), "utf8");
    expect(js).not.toMatch(/document\.cookie|googletagmanager|gtag\(|fbq\(|analytics\.js/);
    expect(js).toMatch(/audience: !!\(consent && consent\.audience\)|i\.checked = !!\(consent && consent\.audience\)/);
    const footer = covenSections()["es-custom-coven-footer"].liquid;
    expect(footer).toMatch(/data-cvn-consent="audience"/);
    expect(footer).not.toMatch(/data-cvn-consent="audience"[^>]*checked/);
  });
});
