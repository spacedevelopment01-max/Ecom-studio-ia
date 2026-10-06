/**
 * Thème entièrement sur mesure (forfait Dominer) : plan de page puis sections écrites par l'IA (simulée ici),
 * contrôles (Liquid, schéma, allégations, rendu, Theme Check), repli honnête sur la bibliothèque, accès par forfait.
 */
import { describe, expect, it, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { sampleSpec } from "./fixtures";

// Session simulée pour les routes.
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }) }));

// IA simulée : plan, puis sections. La section « preuves » est toujours refusée (allégation inventée).
const calls: { task: string; usageKey?: string; prompt: string }[] = [];
const sim = { replaces: "" as string, product: "" as string };
vi.mock("@/lib/ai/llm", async (orig) => {
  const real = (await orig()) as any;
  return {
    ...real,
    llmConfigured: () => true,
    llmJson: async (call: { task: string; usageKey?: string; prompt: string }) => {
      calls.push(call);
      if (call.prompt.includes("Conçois le PLAN")) return simPlan();
      const type = call.prompt.match(/\(type (es-custom-[a-z0-9-]+)/)![1];
      return simSection(type, call.prompt);
    },
  };
});

function simPlan() {
  const s = (key: string, name: string, extra: Record<string, unknown> = {}) => ({ template: "index", key, name, intent: `Rôle ${name}`, content: "Textes du projet", layout: "Deux colonnes", effects: "Apparition douce", images: ["es-hero.jpg"], ...extra });
  return {
    reasoning: "Une page calme et lumineuse, centrée sur le flacon.",
    sections: [
      s("ouverture", "Ouverture Éclat"),
      s("rituel", "Le rituel"),
      s("preuves", "Preuves", { replaces: sim.replaces, fallback: "rich-text" }),
      s("matiere", "La matière"),
      s("appel", "Appel final"),
      { ...s("details-produit", "Détails produit"), template: "product", position: "after" },
    ],
  };
}

const sectionLiquid = (type: string, opts: { claim?: boolean } = {}) => {
  const key = type.replace(/^es-custom-/, "");
  const name = key.slice(0, 20);
  return `<section id="es-{{ section.id }}" class="es-section es-cx-${key} color-{{ section.settings.color_scheme }}" style="--pt: {{ section.settings.padding_top }}px; --pb: {{ section.settings.padding_bottom }}px;">
  <div class="es-container es-cx-${key}__grid">
    <div class="es-cx-${key}__text">
      <h2 class="es-heading es-h2" data-reveal="words">{{ section.settings.heading | escape }}</h2>
      <div class="es-rte" data-reveal="up">{{ section.settings.text }}</div>
      {%- if product -%}<p class="es-cx-${key}__product">{{ product.title | escape }}</p>{%- endif -%}
      <ul class="es-cx-${key}__list">
        {%- for block in section.blocks -%}
          <li class="es-cx-${key}__item" {{ block.shopify_attributes }}>{{ block.settings.title | escape }}</li>
        {%- endfor -%}
      </ul>
    </div>
    <div class="es-cx-${key}__media">
      {% render 'es-image', image: section.settings.image, asset: section.settings.image_asset, alt: section.settings.heading, sizes: '(min-width: 990px) 50vw, 100vw', class: 'es-cover' %}
    </div>
  </div>
</section>

{% stylesheet %}
.es-cx-${key}__grid { display: grid; gap: clamp(24px, 4vw, 64px); }
@media (min-width: 990px) { .es-cx-${key}__grid { grid-template-columns: 1fr 1fr; } }
.es-cx-${key}__item { padding: 12px 16px; border-radius: var(--radius-card); background: var(--c-surface); }
@media (prefers-reduced-motion: reduce) { .es-cx-${key}__item { transition: none; } }
{% endstylesheet %}

{% schema %}
{
  "name": "${name}",
  "tag": "div",
  "class": "es-section-wrapper",
  "settings": [
    { "type": "text", "id": "heading", "label": "Titre", "default": "Sérum Éclat, ${key}" },
    { "type": "richtext", "id": "text", "label": "Texte", "default": "<p>${opts.claim ? "Livraison offerte et des milliers d'avis 5 étoiles." : "Un flacon de 30 ml, à appliquer matin et soir."}</p>" },
    { "type": "image_picker", "id": "image", "label": "Image" },
    { "type": "text", "id": "image_asset", "label": "Image fournie avec le thème", "default": "es-hero.jpg" },
    { "type": "color_scheme", "id": "color_scheme", "label": "Schéma de couleurs", "default": "scheme-1" },
    { "type": "range", "id": "padding_top", "min": 0, "max": 200, "step": 8, "unit": "px", "label": "Marge haute", "default": 96 },
    { "type": "range", "id": "padding_bottom", "min": 0, "max": 200, "step": 8, "unit": "px", "label": "Marge basse", "default": 96 }
  ],
  "blocks": [
    { "type": "point", "name": "Point", "settings": [ { "type": "text", "id": "title", "label": "Texte", "default": "Contenance : 30 ml" } ] }
  ],
  "max_blocks": 6,
  "presets": [ { "name": "${name}", "blocks": [ { "type": "point" } ] } ]
}
{% endschema %}
`;
};

function simSection(type: string, prompt = "") {
  // « La matière » : passe les contrôles du studio mais pas Theme Check (image sans dimensions), corrigée ensuite.
  if (type === "es-custom-matiere" && !prompt.includes("Theme Check")) return { liquid: sectionLiquid(type).replace("</section>", `<img src="{{ section.settings.image_asset | asset_url }}" alt="">\n</section>`), settings: {} };
  if (type === "es-custom-preuves") return { liquid: sectionLiquid(type, { claim: true }), settings: {}, blocks: [{ type: "point" }] };
  return { liquid: sectionLiquid(type), settings: { heading: `Titre ${type}` }, blocks: [{ type: "point", settings: { title: "Contenance : 30 ml" } }, { type: "point" }], notes: "ok" };
}

const BRAND = { name: "Maison Ondine", nameStatus: "provided", tagline: "Le soin, simplement.", positioning: "Soin du visage sobre", audience: "Adultes", personality: ["sobre"], tone: { voice: "calme", do: ["précis"], dont: ["superlatifs"] }, palette: { primary: "#8A4B2A", secondary: "#E9D8C4", accent: "#C9A27E", light: "#F6F1EA", dark: "#1E1612" }, direction: "atelier", story: "", values: [], validated: [] };

async function setup(plan: "creer" | "vendre" | "dominer" | null, role: "client" | "admin" = "client") {
  const { createUser } = await import("@/lib/auth");
  const { id, now, run } = await import("@/lib/db");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { saveThemeVersion } = await import("@/lib/projects");
  const { product } = await import("./fixtures");
  const u = await createUser(`custom-${plan}-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "Sur mesure");
  run("UPDATE users SET role = ? WHERE id = ?", role, u.id);
  getSubscription(u.id);
  if (plan) run("UPDATE subscriptions SET status = 'active', plan = ? WHERE user_id = ?", plan, u.id);
  syncAllowance(u.id);
  const pid = id();
  run("INSERT INTO projects (id, user_id, name, status, platform, store_type, product_json, brand_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", pid, u.id, "Maison Ondine", "draft", "shopify", "mono", JSON.stringify(product), JSON.stringify(BRAND), "{}", "[]", now(), now());
  const spec = sampleSpec();
  const v = saveThemeVersion(pid, spec, "Boutique créée", "system");
  return { user: { ...u, role }, pid, spec, versionId: v.id };
}

describe("thème entièrement sur mesure (IA simulée)", () => {
  it("plan + sections valides → nouvelle version, Theme Check propre ; section refusée → bibliothèque à cet endroit, signalée", async () => {
    const { enqueue, claimNext, JobContext } = await import("@/lib/jobs");
    const { buildCustomTheme } = await import("@/lib/engine/custom-theme");
    const { currentTheme, listThemeVersions } = await import("@/lib/projects");
    const { validateSpec } = await import("@/lib/theme/ops");
    const { themeCheck } = await import("@/lib/theme/theme-check");
    const { compileTheme, exportThemeZip } = await import("@/lib/theme/compile");
    const { renderPage } = await import("@/lib/theme/render");
    const { all } = await import("@/lib/db");
    const { pid, spec, versionId } = await setup("dominer");
    // La section « Preuves » doit remplacer une section de bibliothèque existante (repli à cet endroit).
    sim.replaces = spec.templates.index.order[2];
    const replacedType = spec.templates.index.sections[sim.replaces].type;

    const job = enqueue({ userId: (await import("@/lib/db")).one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", pid)!.user_id, projectId: pid, type: "theme.custom", payload: { projectId: pid } });
    const claimed = claimNext(["theme.custom"])!;
    expect(claimed.id).toBe(job.id);
    calls.length = 0;
    const r = await buildCustomTheme(new JobContext(claimed), pid, { review: false });

    // Plan puis 6 sections ; « preuves » : écriture + 2 corrections automatiques, puis repli.
    expect(calls.filter((c) => c.prompt.includes("Conçois le PLAN"))).toHaveLength(1);
    expect(calls.filter((c) => c.usageKey?.includes(":section:2"))).toHaveLength(3);
    expect(new Set(calls.map((c) => c.usageKey)).size).toBe(calls.length); // idempotence : une clé par appel
    // Theme Check a relevé une erreur dans « La matière » : une correction ciblée, puis acceptée.
    expect(calls.filter((c) => c.usageKey?.includes(":tc:3"))).toHaveLength(1);
    expect(calls.find((c) => c.usageKey?.includes(":tc:3"))!.prompt).toMatch(/ImgWidthAndHeight/);
    expect(r).toMatchObject({ total: 6, written: 5, themeCheck: "ok" });
    expect(r.fallbacks).toHaveLength(1);
    expect(r.fallbacks[0].name).toBe("Preuves");
    expect(r.fallbacks[0].reason).toMatch(/allégation non confirmée/);
    expect(r.fallbacks[0].replacement).toBeTruthy();

    const cur = currentTheme(pid)!;
    expect(cur.version.id).toBe(r.versionId);
    expect(cur.version.author).toBe("ai");
    expect(listThemeVersions(pid).some((v) => v.id === versionId)).toBe(true); // version précédente restaurable
    const s = cur.spec;
    expect(validateSpec(s)).toEqual([]);
    const types = s.templates.index.order.map((x) => s.templates.index.sections[x].type);
    expect(types).toEqual(["es-custom-ouverture", "es-custom-rituel", replacedType, "es-custom-matiere", "es-custom-appel"]);
    // Le repli reprend la section d'origine avec ses textes.
    const fb = s.templates.index.sections[s.templates.index.order[2]];
    expect(fb.settings).toEqual(spec.templates.index.sections[sim.replaces].settings);
    const ptypes = s.templates.product.order.map((x) => s.templates.product.sections[x].type);
    expect(ptypes[0]).toBe("main-product");
    expect(ptypes).toContain("es-custom-details-produit");
    expect(ptypes.filter((t) => !t.startsWith("es-custom-") && t !== "main-product")).toEqual([]);
    expect(Object.keys(s.customSections)).not.toContain("es-custom-preuves");

    // Theme Check sans erreur, aperçu et export identiques.
    expect((await themeCheck(s)).errors).toEqual([]);
    const files = compileTheme(s);
    expect(files.get("sections/es-custom-ouverture.liquid")).toContain("es-cx-ouverture");
    const home = await renderPage({ spec: s, base: "/p", files, cart: [] }, "/", new URLSearchParams());
    expect(home.html).toContain("Titre es-custom-ouverture");
    expect(home.html).toContain("Contenance : 30 ml");
    expect(home.html).not.toContain("Livraison offerte");
    const prod = await renderPage({ spec: s, base: "/p", files, cart: [] }, "/products/serum-eclat", new URLSearchParams());
    expect(prod.html).toContain("es-cx-details-produit__product");
    const zip = unzipSync(new Uint8Array((await exportThemeZip(s, () => null)).zip));
    expect(strFromU8(zip["sections/es-custom-appel.liquid"])).toBe(files.get("sections/es-custom-appel.liquid"));

    // Compte rendu honnête dans la discussion.
    const msg = all<{ content: string }>("SELECT content FROM chat_messages WHERE project_id = ? AND role = 'assistant'", pid).map((m) => m.content).join("\n");
    expect(msg).toContain("Preuves");
    expect(msg).toMatch(/bibliothèque est gardée à cet endroit/);

    // Reprise : les étapes déjà faites ne sont ni refaites ni repayées.
    calls.length = 0;
    const again = await buildCustomTheme(new JobContext((await import("@/lib/jobs")).getJob(job.id)!), pid, { review: false });
    expect(calls).toHaveLength(0);
    expect(again.written).toBe(5);
  });

  it("refuse le thème entièrement sur mesure hors forfait Dominer (402) et au-delà de 2 par mois", async () => {
    const { customThemeAccess, assertFullyCustomTheme, CUSTOM_THEMES_PER_MONTH } = await import("@/lib/theme/custom-access");
    const { enqueue } = await import("@/lib/jobs");
    const { run } = await import("@/lib/db");
    for (const plan of [null, "creer", "vendre"] as const) {
      const { user } = await setup(plan);
      expect(customThemeAccess(user).allowed).toBe(false);
      expect(customThemeAccess(user).reason).toMatch(/forfait Dominer/);
      expect(() => assertFullyCustomTheme(user)).toThrow(/forfait Dominer/);
    }
    const { user, pid } = await setup("dominer");
    expect(customThemeAccess(user).allowed).toBe(true);
    for (let i = 0; i < CUSTOM_THEMES_PER_MONTH; i++) {
      const j = enqueue({ userId: user.id, projectId: pid, type: "theme.custom", payload: { projectId: pid } });
      run("UPDATE jobs SET status = 'done' WHERE id = ?", j.id);
    }
    expect(customThemeAccess(user)).toMatchObject({ allowed: false, used: 2 });
    expect(customThemeAccess(user).reason).toMatch(/déjà créé 2 thèmes/);
    // Une création échouée ne compte pas ; l'administrateur suit son forfait comme un client (il teste en gratuit et en payant).
    const admin = await setup(null, "admin");
    expect(customThemeAccess(admin.user).allowed).toBe(false);
    expect(customThemeAccess((await setup("dominer", "admin")).user).allowed).toBe(true);

    // Route : 402 clair pour le forfait Vendre.
    const vendre = await setup("vendre");
    await login(vendre.user.id);
    const { POST } = await import("@/app/api/projects/[id]/theme/custom/route");
    const res = await POST(new Request("http://x/api/projects/x/theme/custom", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: vendre.pid }) } as any);
    expect(res.status).toBe(402);
    expect(JSON.stringify(await res.json())).toMatch(/forfait Dominer/);
  });

  it("génération d'une section par l'IA : refusée avec Créer (402), acceptée avec Vendre", async () => {
    const { assertSectionGeneration, sectionGenerationAllowed } = await import("@/lib/theme/custom-access");
    const creer = await setup("creer");
    expect(sectionGenerationAllowed(creer.user)).toBe(false);
    expect(() => assertSectionGeneration(creer.user)).toThrow(/Vendre et Dominer/);
    expect(sectionGenerationAllowed((await setup("vendre")).user)).toBe(true);
    expect(sectionGenerationAllowed((await setup("dominer")).user)).toBe(true);
    expect(sectionGenerationAllowed((await setup(null, "admin")).user)).toBe(false);
    expect(sectionGenerationAllowed((await setup("vendre", "admin")).user)).toBe(true);

    const { POST } = await import("@/app/api/projects/[id]/theme/chat/route");
    const send = (pid: string, generate: boolean) =>
      POST(new Request("http://x/api/projects/x/theme/chat", { method: "POST", body: JSON.stringify({ message: "Une frise des étapes", page: "index", ...(generate ? { generate: { template: "index" } } : {}) }) }), { params: Promise.resolve({ id: pid }) } as any);
    await login(creer.user.id);
    const refused = await send(creer.pid, true);
    expect(refused.status).toBe(402);
    expect(JSON.stringify(await refused.json())).toMatch(/Vendre et Dominer/);
    // Une retouche ordinaire par la discussion reste ouverte à Créer.
    expect((await send(creer.pid, false)).status).toBe(200);
    const vendre = await setup("vendre");
    await login(vendre.user.id);
    expect((await send(vendre.pid, true)).status).toBe(200);
  });
});

async function login(userId: string) {
  const { run } = await import("@/lib/db");
  const { sha256 } = await import("@/lib/secrets");
  const token = `tok-custom-${userId}-${Math.random()}`;
  run("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)", sha256(token), userId, Date.now() + 3600_000, Date.now());
  jar.token = token;
}
