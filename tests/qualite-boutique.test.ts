/**
 * Qualité de la boutique produite : finitions d'agence (doublons, sections d'espaces réservés, liens répétés,
 * images inexistantes, bandeau qui répète le nom), rendu (recommandations vides, lettres rognées, galerie alignée),
 * et garde-fous sur la composition et la relecture visuelle par l'IA (simulées : réponses correctes, médiocres et hors format).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { buildSpec, DIRECTIONS, type DirectionId } from "@/lib/theme/directions";
import { localCopy } from "@/lib/engine/local-copy";
import { tidyComposition, isPlaceholderOnly } from "@/lib/theme/tidy";
import { compileTheme } from "@/lib/theme/compile";
import { renderPage } from "@/lib/theme/render";
import { validateSpec } from "@/lib/theme/ops";
import type { ThemeSpec } from "@/lib/theme/spec";
import { catalogSample, product, sampleSpec } from "./fixtures";

// IA simulée : composition puis relecture visuelle (réponses brutes passées au vrai schéma, comme le ferait llmJson).
const sim = { design: null as unknown, review: null as unknown, calls: [] as { task: string; images?: unknown[]; prompt: string }[] };
vi.mock("@/lib/ai/llm", async (orig) => {
  const real = (await orig()) as any;
  return {
    ...real,
    llmConfigured: () => true,
    llmJson: async (call: { task: string; images?: unknown[]; prompt: string }, schema: { parse: (v: unknown) => unknown }) => {
      sim.calls.push(call);
      return schema.parse(call.images?.length ? sim.review : sim.design);
    },
  };
});
// Captures simulées (accueil et fiche produit) : la relecture reçoit des planches sans lancer de navigateur.
vi.mock("@/lib/theme/snapshot", () => ({ snapshotTheme: async () => ({ desktop: [Buffer.from("d")], mobile: [Buffer.from("m")] }) }));

const SOVA = { ...product, name: "SOVA", sector: "enfants" as const, facts: [] };
function sovaSpec(direction: DirectionId, opts: { files?: Record<string, string> } = {}) {
  const copy = localCopy(SOVA, { name: "SOVA", tagline: "Grandir en douceur.", story: "", values: [] });
  return buildSpec({
    direction,
    shopName: "SOVA",
    palette: { primary: "#B03A48", secondary: "#F2D7DA", accent: "#E07A5F", light: "#FBF4F4", dark: "#2A1416" },
    copy,
    images: { hero: "es-hero.jpg", packshot: "es-packshot.jpg", detail1: "es-detail-1.jpg", scene1: "es-scene-1.jpg" },
    files: opts.files ?? { "es-hero.jpg": "a1", "es-packshot.jpg": "a2", "es-detail-1.jpg": "a3", "es-scene-1.jpg": "a4" },
    product: { title: "SOVA", handle: "sova", vendor: "SOVA", description_html: "<p>Compagnon pour enfant.</p>", price: 4990, compare_at_price: null, currency: "EUR", options: [], variants: [], images: ["es-packshot.jpg"], tags: [] },
  });
}
const sections = (spec: ThemeSpec, t = "index") => spec.templates[t].order.map((id) => spec.templates[t].sections[id]);
const footerOf = (spec: ThemeSpec) => spec.groups.footer.sections[spec.groups.footer.order[0]];
const announcements = (spec: ThemeSpec) => {
  const h = spec.groups.header;
  const bar = h.order.map((id) => h.sections[id]).find((s) => s.type === "announcement-bar");
  return bar ? Object.values(bar.blocks ?? {}).map((b) => String(b.settings.text)) : [];
};

describe("finitions de composition (tidyComposition)", () => {
  it("une seule inscription : pas de section « Lettre d'information » quand le pied de page a sa carte d'inscription", () => {
    for (const d of DIRECTIONS) {
      const spec = sovaSpec(d.id);
      const card = footerOf(spec).settings.style === "card";
      const news = sections(spec).filter((s) => s.type === "newsletter").length;
      if (card) expect(news, d.id).toBe(0);
      expect(news, d.id).toBeLessThanOrEqual(1);
      expect(sections(spec).filter((s) => s.type === "faq").length, d.id).toBeLessThanOrEqual(1);
      expect(validateSpec(spec), d.id).toEqual([]);
    }
  });

  it("ni pastille ni bandeau qui répètent le nom de la boutique ou le titre du héros", () => {
    for (const d of DIRECTIONS) {
      const spec = sovaSpec(d.id);
      for (const s of sections(spec).filter((x) => /^hero-/.test(x.type))) {
        const badge = String(s.settings.badge ?? "");
        expect(badge, d.id).not.toMatch(/\bSOVA\b/);
        if (s.settings.heading) expect(badge.toLowerCase(), d.id).not.toContain(String(s.settings.heading).toLowerCase().replace(/\.$/, ""));
      }
      for (const a of announcements(spec)) expect(a.trim().toLowerCase(), d.id).not.toBe("sova");
    }
    // Boutique multi-produit : aucune phrase sur le produit principal en bandeau pour tout le catalogue.
    const multi = sampleSpec("gourmand", "multi");
    expect(announcements(multi)).toEqual([]);
  });

  it("fiche produit : pas de surtitre « SOVA » au-dessus du titre « SOVA », pas de « Caractéristiques » faite d'espaces réservés", () => {
    const spec = sovaSpec("pop");
    const main = sections(spec, "product").find((s) => s.type === "main-product")!;
    const eyebrows = Object.values(main.blocks!).filter((b) => b.type === "eyebrow");
    expect(eyebrows).toEqual([]);
    for (const t of Object.keys(spec.templates)) {
      for (const s of sections(spec, t).filter((x) => x.type === "specs-list")) {
        expect(Object.values(s.blocks ?? {}).some((b) => !isPlaceholderOnly(b.settings.value)), t).toBe(true);
      }
    }
    // Une marque différente du produit garde son surtitre.
    const ondine = sampleSpec("atelier");
    const m2 = sections(ondine, "product").find((s) => s.type === "main-product")!;
    expect(Object.values(m2.blocks!).some((b) => b.type === "eyebrow" && b.settings.text === "Maison Ondine")).toBe(true);
  });

  it("composition médiocre (IA) : doublons, liens identiques, image inventée, galerie vide, bandeau répétitif → corrigés", () => {
    const spec = structuredClone(sovaSpec("terroir"));
    const index = spec.templates.index;
    const add = (id: string, type: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []) => {
      index.sections[id] = { type, settings, blocks: Object.fromEntries(blocks.map((b, i) => [`${id}_b${i}`, b])), block_order: blocks.map((_, i) => `${id}_b${i}`) };
      index.order.push(id);
    };
    add("n1", "newsletter", { heading: "Restons en contact" });
    add("n2", "newsletter", { heading: "Restons en contact" });
    add("f1", "faq", { heading: "FAQ" }, [{ type: "question", settings: { question: "Q", answer: "R" } }]);
    add("f2", "faq", { heading: "FAQ bis" }, [{ type: "question", settings: { question: "Q", answer: "R" } }]);
    add("g1", "features-grid", { heading: "Pourquoi" }, [1, 2, 3].map((i) => ({ type: "feature", settings: { title: `T${i}`, text: "x", link: "/products/sova", link_label: "Découvrir" } })));
    add("img", "image-with-text", { heading: "Détail", image_asset: "es-invente-par-ia.jpg" });
    add("gal", "horizontal-gallery", { heading: "En images" });
    add("sp", "specs-list", { heading: "Caractéristiques" }, [{ type: "spec", settings: { label: "Livraison", value: "[À compléter : délais]" } }]);
    const h = spec.groups.header;
    h.sections.ann = { type: "announcement-bar", settings: { style: "marquee" }, blocks: { a: { type: "announcement", settings: { text: "SOVA" } }, b: { type: "announcement", settings: { text: "Livraison suivie" } }, c: { type: "announcement", settings: { text: "Livraison suivie" } } }, block_order: ["a", "b", "c"] };
    h.order.unshift("ann");

    const out = tidyComposition(spec);
    const types = sections(out).map((s) => s.type);
    expect(types.filter((t) => t === "newsletter")).toHaveLength(0); // pied de page « card » (terroir)
    expect(types.filter((t) => t === "faq")).toHaveLength(1);
    expect(out.templates.index.sections.gal).toBeUndefined(); // galerie sans image
    expect(out.templates.index.sections.sp).toBeUndefined(); // espaces réservés seulement
    const grid = out.templates.index.sections.g1;
    expect(Object.values(grid.blocks!).every((b) => !b.settings.link && !b.settings.link_label)).toBe(true);
    expect(out.files[String(out.templates.index.sections.img.settings.image_asset)]).toBeTruthy();
    const bar = out.groups.header.sections.ann;
    expect(Object.values(bar.blocks!).map((b) => b.settings.text)).toEqual(["Livraison suivie"]);
    expect(bar.settings.style).toBe("static");
    expect(validateSpec(out)).toEqual([]);
  });
});

describe("rendu de la boutique", () => {
  it("boutique d'un seul produit : pas de « Vous aimerez aussi » au-dessus du vide ; catalogue : recommandations présentes", async () => {
    const mono = sovaSpec("pop", { files: {} });
    const r = await renderPage({ spec: mono, base: "/p", files: compileTheme(mono), cart: [] }, "/products/sova", new URLSearchParams());
    expect(r.status).toBe(200);
    expect(r.html).not.toMatch(/<section[^>]*data-es-recos/);
    expect(r.html).not.toContain("Vous aimerez aussi");
    const multi = sampleSpec("atelier", "multi");
    const r2 = await renderPage({ spec: multi, base: "/p", files: compileTheme(multi), cart: [] }, "/products/serum-eclat", new URLSearchParams());
    expect(r2.html).toMatch(/<section[^>]*data-es-recos/);
    expect(r2.html).toContain(catalogSample.products[0].title);
  });

  it("CSS : nom géant du pied de page non rogné, galerie alignée sur le titre, une seule inscription par page, mosaïque sans trou", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "theme-base/assets/theme.css"), "utf8");
    expect(css).toMatch(/\.es-footer__wordmark \{[^}]*padding-bottom: \.16em/);
    expect(css).toMatch(/\.es-footer__wordmark--bottom \{[^}]*padding-bottom/);
    expect(css).toMatch(/\.es-hgallery__track \{[^}]*--hg-inset: max\(var\(--gutter\), calc\(\(100vw - var\(--page-width\)\) \/ 2/);
    expect(css).toContain("body:has(.es-newsletter) .es-footer__card");
    expect(css).toContain(".es-mosaic--even .es-mosaic__grid:has(> :nth-child(3):last-child)");
  });
});

// ---------------------------------------------------------------- composition et relecture par l'IA (simulées)

const BRAND = { name: "SOVA", nameStatus: "provided", tagline: "Grandir en douceur.", positioning: "Compagnon pour enfant", audience: "Parents", personality: ["doux"], tone: { voice: "chaleureux", do: ["précis"], dont: ["superlatifs"] }, palette: { primary: "#B03A48", secondary: "#F2D7DA", accent: "#E07A5F", light: "#FBF4F4", dark: "#2A1416" }, fonts: { heading: "montserrat_n8", body: "karla_n4" }, direction: "pop", story: "", values: [], validated: [], generatedBy: "local" };

async function setupProject() {
  const { createUser } = await import("@/lib/auth");
  const { id, now, run } = await import("@/lib/db");
  const u = await createUser(`qb-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "Qualité boutique");
  const pid = id();
  run("INSERT INTO projects (id, user_id, name, status, platform, store_type, product_json, brand_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", pid, u.id, "SOVA", "draft", "shopify", "mono", JSON.stringify(SOVA), JSON.stringify(BRAND), "{}", "[]", now(), now());
  return { pid, userId: u.id };
}
async function runBuild() {
  const { enqueue, claimNext, JobContext } = await import("@/lib/jobs");
  const { buildShop } = await import("@/lib/engine/shop");
  const { currentTheme } = await import("@/lib/projects");
  const { pid, userId } = await setupProject();
  enqueue({ userId, projectId: pid, type: "shop.build", payload: { projectId: pid } });
  const job = claimNext(["shop.build"])!;
  // Composition de l'accueil par l'IA et relecture visuelle : parcours du moteur V1 (le Theme Engine V2 compose localement).
  await buildShop(new JobContext(job), pid, { engine: "v1" });
  return currentTheme(pid)!;
}
const hero = { type: "hero-split", settings: { heading: "Grandir en", heading_accent: "douceur", button_label: "Découvrir", button_link: "/products/sova", image_asset: "es-photo-inventee.jpg", badge: "SOVA • Grandir en douceur" } };
const designWithFlaws = {
  reasoning: "Une page tendre et lumineuse.",
  index: [
    hero,
    { type: "rich-text", settings: { align: "center" }, blocks: [{ type: "heading", settings: { text: "Pour les petits" } }] },
    { type: "features-grid", settings: { heading: "Ce qu'il faut savoir" }, blocks: [1, 2, 3].map((i) => ({ type: "feature", settings: { title: `Point ${i}`, text: "Texte", link: "/products/sova", link_label: "Découvrir" } })) },
    { type: "faq", settings: { heading: "Questions" }, blocks: [{ type: "question", settings: { question: "Q", answer: "R" } }] },
    { type: "newsletter", settings: { heading: "Restons en contact" } },
    { type: "newsletter", settings: { heading: "Restons en contact" } },
  ],
};

describe("composition et relecture visuelle par l'IA (simulées)", () => {
  it("composition avec défauts : finitions appliquées ; la relecture reçoit l'accueil ET la fiche produit ; relecture hors format tolérée", async () => {
    sim.design = designWithFlaws;
    // Relecture « bavarde » : 7 forces (5 permises), une gravité inconnue, une opération mal formée.
    sim.review = { score: 7.5, strengths: ["a", "b", "c", "d", "e", "f", "g"], issues: [{ where: "héros", problem: "contraste", severity: "critique" }], ops: [{ op: "n_existe_pas" }, { op: "set_global", key: "button_radius", value: 30 }] };
    sim.calls.length = 0;
    const cur = await runBuild();
    const types = sections(cur.spec).map((s) => s.type);
    expect(cur.version.author).toBe("ai");
    expect(types.filter((t) => t === "newsletter")).toHaveLength(0); // pied de page « card » de la direction pop
    const h = sections(cur.spec)[0];
    // Nom de fichier inventé par l'IA : jamais un cadre cassé (ici aucun média dans le projet : image vide, le héros garde son repli).
    expect(String(h.settings.image_asset)).not.toBe("es-photo-inventee.jpg");
    expect(String(h.settings.badge)).not.toMatch(/SOVA/);
    expect(cur.spec.settings.button_radius).toBe(30); // l'opération valide de la relecture est appliquée
    const review = sim.calls.find((c) => c.images?.length)!;
    expect(review.images).toHaveLength(4); // accueil (ordinateur + téléphone) + fiche produit (ordinateur + téléphone)
    expect(review.prompt).toContain("fiche produit");
    expect(review.prompt).toMatch(/## product/);
  });

  it("relecture sévère (3/10) d'une composition de l'IA : elle n'est pas montrée, la composition éprouvée de la direction est gardée", async () => {
    sim.design = designWithFlaws;
    sim.review = { score: 3, strengths: [], issues: [{ where: "accueil", problem: "rendu générique, sections vides", severity: "bloquant" }], ops: [] };
    const cur = await runBuild();
    expect(cur.version.author).toBe("system");
    expect(cur.version.summary).toMatch(/écartée à la relecture visuelle \(3\/10\)/);
    // Sections de la direction pop (bandeau défilant, produit en vedette), aucune de la composition de l'IA (texte « reveal »).
    const types = sections(cur.spec).map((s) => s.type);
    expect(types).toEqual(expect.arrayContaining(["hero-split", "marquee", "featured-product"]));
    expect(types).not.toContain("rich-text");
  });

  it("relecture qui retirerait l'ouverture ou viderait l'accueil : non appliquée", async () => {
    sim.design = designWithFlaws;
    sim.review = { score: 8, strengths: [], issues: [], ops: [] };
    const base = await runBuild();
    const ids = base.spec.templates.index.order;
    sim.review = { score: 6, strengths: [], issues: [], ops: ids.map((section) => ({ op: "remove_section", template: "index", section })) };
    const cur = await runBuild();
    expect(sections(cur.spec)[0].type).toMatch(/^hero-/);
    expect(cur.spec.templates.index.order.length).toBeGreaterThanOrEqual(4);
  });
});

describe("consignes de composition et de relecture (niveau agence)", () => {
  it("les consignes nomment les défauts qui font « modèle gratuit » et demandent la relecture de la fiche produit", async () => {
    const { systemPrompts } = await import("@/lib/ai/prompts");
    const s = systemPrompts("fr");
    for (const p of [s.themeDesign, s.themeEdit, s.themeReview]) {
      expect(p).toContain("modèle gratuit");
      expect(p).toMatch(/deux inscriptions à la lettre d'information/);
      expect(p).toMatch(/logo, le filigrane ou le texte d'un autre vendeur/);
    }
    expect(s.themeReview).toMatch(/lettres rognées/);
    expect(s.themeReview).toMatch(/« bloquant »/);
    const en = systemPrompts("en");
    expect(en.themeDesign).toContain("\"In use\"");
  });
});
