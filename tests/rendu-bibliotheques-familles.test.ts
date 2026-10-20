/**
 * Défauts de rendu des sections de bibliothèque constatés par l'audit visuel de l'issue #145 (projets neufs) :
 *  - icônes au trait (fs-icon) affichées en formes noires pleines : style absent ;
 *  - FAQ « numérotées » : numéro invisible sur une question fermée (profil conversion) ;
 *  - citation en bandeau : sur-titre invisible, disque vide sans auteur, 5 étoiles et « Avis fictif » posés sur un site
 *    réel sans avis ;
 *  - avant / après d'un site de services : deux photos quelconques du projet présentées comme avant / après, avec la
 *    même légende superposée deux fois.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => {
  const root = process.env.DATA_DIR; if (!root) throw new Error("Tests isolés obligatoires");
  const dir = process.getBuiltinModule("fs").mkdtempSync(`${root}/rendu-familles-`), shared = globalThis as { __ecomDb?: { close(): void } }, previousDb = shared.__ecomDb; delete shared.__ecomDb; vi.stubEnv("DATA_DIR", dir); return { dir, previousDb };
});
afterAll(() => { const shared = globalThis as { __ecomDb?: { close(): void } }; if (shared.__ecomDb !== session.previousDb) shared.__ecomDb?.close(); if (session.previousDb) shared.__ecomDb = session.previousDb; else delete shared.__ecomDb; vi.unstubAllEnvs(); });
vi.mock("@/lib/ai/llm", async (original) => ({ ...await original<object>(), llmConfigured: () => false }));
import fs from "node:fs";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { currentTheme, loadProject } from "@/lib/projects";
import { applyOps } from "@/lib/theme/ops";
import { renderPage } from "@/lib/theme/render";
import { withProjectMedia } from "@/lib/theme/section-defaults";
import { sectionContentContext } from "@/lib/theme/section-content";
import { CONTROL_BRANDS, controlProject } from "./control-brands-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const css = (f: string) => fs.readFileSync(`theme-base/assets/${f}`, "utf8");

/** Section ajoutée comme le fait la route « Ajouter une section » (contenu de production), puis rendue. */
async function added(pid: string, type: string, settings: Record<string, unknown>, kind: "specialty" | "catalog" | "services") {
  const p = loadProject(pid), spec = currentTheme(pid)!.spec;
  const filled = withProjectMedia(spec, type, { ...settings }, undefined, sectionContentContext(p, spec, false, "index"));
  const r = applyOps(spec, [{ op: "add_section", template: "index", type, settings: filled.settings as never, blocks: filled.blocks as never, position: { index: 0 } } as never], { targeted: new Set(), storeKind: kind });
  expect(r.applied).toHaveLength(1);
  const s = r.spec.templates.index.sections[r.spec.templates.index.order[0]];
  const html = (await fr(() => renderPage({ spec: r.spec, base: "", cart: [] }, "/", new URLSearchParams()))).html;
  const start = html.indexOf(`data-es-section="index:${r.spec.templates.index.order[0]}"`);
  expect(start).toBeGreaterThan(-1);
  return { s, html: html.slice(start, html.indexOf("</section>", start)) };
}

describe("rendu des sections de bibliothèque (issue #145)", async () => {
  const user = await createUser("rendu-familles@example.invalid", "isolated-test-only", "Rendu");

  it("icônes au trait : style défini (contour, sans remplissage), sinon formes noires pleines", () => {
    expect(css("family.css")).toMatch(/\.fs-icon \{[^}]*fill: none;[^}]*stroke: currentColor;/);
  });

  it("FAQ numérotée et citation en bandeau : numéro et sur-titre lisibles sur le fond de la couleur d'accent", () => {
    const c = css("conversion.css");
    expect(c).toMatch(/\.es-faq__item:not\(\[open\]\) \.es-faq__num\{color:var\(--c-accent-text\)\}/);
    expect(c).toMatch(/\.cv-quote--band \.cv-eyebrow\{color:var\(--c-accent-text\)\}|\.cv-quote--band \.cv-eyebrow[,{]/);
  });

  it("citation (projet sans avis) : ni étoiles, ni « Avis fictif », ni disque vide ; le manque est signalé", async () => {
    const pid = await fr(() => controlProject(user.id, "specialty", CONTROL_BRANDS.specialty.brands[0]));
    const { s, html } = await added(pid, "cv-quote", { layout: "band" }, "specialty");
    expect(s.settings.rating).toBe(0);
    expect(html).not.toContain("cv-quote__stars");
    expect(html).not.toMatch(/Avis fictif/);
    expect(html).not.toContain("cv-quote__avatar");
    expect(html).toMatch(/À compléter : un avis client réel/);
  }, 120_000);

  it("avant / après d'un site de services : jamais deux photos quelconques, légendes « Avant » et « Après »", async () => {
    const pid = await fr(() => controlProject(user.id, "services", CONTROL_BRANDS.services.brands[0]));
    const { s, html } = await added(pid, "ed-study", { aligned: true }, "services");
    expect(s.settings.image_asset ?? "").toBe("");
    expect(s.settings.second_asset ?? "").toBe("");
    expect(s.settings.first_label).toBe("Avant");
    expect(s.settings.second_label).toBe("Après");
    expect(html).toMatch(/À compléter : la transformation montrée/);
    // Curseur : les deux légendes côte à côte sous l'image (elles se superposaient au même endroit).
    expect(html).toMatch(/class="ed-study__labels"[^>]*><span>Avant<\/span><span>Après<\/span>/);
    expect(css("editorial.css")).toMatch(/\.ed-study__views\[data-ed-comparison\] figcaption\{position:absolute;width:1px/);
  }, 120_000);
});
