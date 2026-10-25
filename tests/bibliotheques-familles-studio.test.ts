import { grantProjectPlan } from "@/lib/project-subscriptions";
/**
 * Bibliothèques par famille dans le studio (issue #141), par les vraies routes : galerie de la famille seule, ajout
 * depuis la galerie, refus d'une section d'une autre famille (galerie, opérations), changement de disposition qui garde
 * le contenu, cinq dispositions d'en-tête et de pied de page (la n° 1 = celle du thème validé), identité du projet
 * reprise automatiquement (deux marques de la même famille, aucune identité de démonstration croisée).
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => {
  const root = process.env.DATA_DIR; if (!root) throw new Error("Tests isolés obligatoires");
  const dir = process.getBuiltinModule("fs").mkdtempSync(`${root}/familles-`), shared = globalThis as { __ecomDb?: { close(): void } }, previousDb = shared.__ecomDb; delete shared.__ecomDb; vi.stubEnv("DATA_DIR", dir); return { dir, previousDb };
});
afterAll(() => { const shared = globalThis as { __ecomDb?: { close(): void } }; if (shared.__ecomDb !== session.previousDb) shared.__ecomDb?.close(); if (session.previousDb) shared.__ecomDb = session.previousDb; else delete shared.__ecomDb; vi.unstubAllEnvs(); });
const jar = vi.hoisted(() => ({ token: "" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }) }));
vi.mock("@/lib/ai/llm", async (original) => ({ ...await original<object>(), llmConfigured: () => false }));
import { createUser } from "@/lib/auth";
import { demoProject } from "./demo-fixtures";
import { conversionProject } from "./lot2c-fixtures";
import { runWithLang } from "@/lib/i18n-server";
import { currentTheme, saveThemeVersion } from "@/lib/projects";
import { renderPage } from "@/lib/theme/render";
import { run } from "@/lib/db";
import { sha256 } from "@/lib/secrets";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const post = (body: unknown) => new Request("http://x/api", { method: "POST", body: JSON.stringify(body) });
async function login(userId: string) {
  const token = `tok-fam-${userId}-${Math.random()}`;
  run("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)", sha256(token), userId, Date.now() + 3600_000, Date.now());
  jar.token = token;
}
const json = async (r: Response) => (await r.json()) as any;
/** Démonstration enregistrée comme version courante du thème (comme après la composition dans le studio). */
// « fraise » : composition de conversion (sections cv-*, profil « conversion ») gardée constructible par conversionProject pour
// ces contrôles de bibliothèque ; la démonstration FRAISE GUMMIES des sept planches (sections fg-*) a ses propres tests.
const demo = async (userId: string, id: "fraise" | "onde" | "orbe" | "rive" | "sillon") => { const d = await fr(() => (id === "fraise" ? conversionProject(userId, "fraise") : demoProject(userId, id))); grantProjectPlan(d.pid,"dominer"); if (!currentTheme(d.pid)) saveThemeVersion(d.pid, d.spec, "Démonstration", "user"); return d; };

describe("bibliothèques par famille dans le studio", () => {
  it("galerie : 20 fonctions de la famille du projet (+ structure), ajout, refus des autres familles, disposition, en-tête et pied de page", async () => {
    const user = await createUser("familles@example.invalid", "isolated-test-only", "Familles");
    await login(user.id);
    const fraise = await demo(user.id, "fraise");
    const rive = await demo(user.id, "rive");
    const theme = await import("@/app/api/projects/[id]/theme/route");
    const sections = await import("@/app/api/projects/[id]/theme/sections/route");
    const ops = await import("@/app/api/projects/[id]/theme/ops/route");
    const disposition = await import("@/app/api/projects/[id]/theme/disposition/route");
    const panel = await import("@/app/api/projects/[id]/theme/section/route");

    // 1. Galerie de la famille seule.
    for (const [p, fam] of [[fraise, "specialty"], [rive, "services"]] as const) {
      const lib = (await json(await fr(() => theme.GET(new Request("http://x"), ctx(p.pid))))).library as { type: string; addable: boolean; dispositions?: unknown[] }[];
      const own = lib.filter((x) => x.addable !== false);
      expect(own.length, fam).toBe(20);
      expect(own.every((x) => x.type.startsWith(`fam:${fam}.`)), fam).toBe(true);
      expect(own.every((x) => (x.dispositions ?? []).length >= 1), fam).toBe(true);
      expect(lib.filter((x) => x.addable === false).every((x) => !x.type.startsWith("fam:")), fam).toBe(true);
    }

    // 2. Ajout depuis la galerie (disposition choisie) ; refus d'une fonction d'une autre famille.
    const added = await fr(() => sections.POST(post({ type: "fam:specialty.video~split", template: "index", index: 1 }), ctx(fraise.pid)));
    expect(added.status).toBe(200);
    let spec = currentTheme(fraise.pid)!.spec;
    const vid = spec.templates.index.order[1];
    expect(spec.templates.index.sections[vid].type).toBe("fs-video");
    expect(spec.templates.index.sections[vid].settings.layout).toBe("split");
    expect((await fr(() => sections.POST(post({ type: "fam:services.case", template: "index" }), ctx(fraise.pid)))).status).toBe(400);
    expect((await fr(() => sections.POST(post({ type: "cv-hero", template: "index" }), ctx(rive.pid)))).status).toBe(400);
    expect((await fr(() => ops.POST(post({ ops: [{ op: "add_section", template: "index", type: "fs-service" }] }), ctx(fraise.pid)))).status).toBe(400);
    expect((await fr(() => ops.POST(post({ ops: [{ op: "add_section", template: "index", type: "gallery-mosaic" }] }), ctx(rive.pid)))).status).toBe(400);

    // 3. Changement de disposition : même section (réglages) puis autre section (contenu converti), et retour.
    const heroId = spec.templates.index.order.find((id) => spec.templates.index.sections[id].type === "cv-hero")!;
    const heading = String(spec.templates.index.sections[heroId].settings.heading);
    expect(heading.length).toBeGreaterThan(2);
    const info = await json(await fr(() => panel.GET(new Request(`http://x?template=index&section=${heroId}`), ctx(fraise.pid))));
    expect(info.family.entry.key).toBe("specialty.hero");
    expect(info.family.dispositions.find((d: { current: boolean }) => d.current).id).toBe("image-right");
    expect((await fr(() => disposition.POST(post({ template: "index", section: heroId, disposition: "stacked" }), ctx(fraise.pid)))).status).toBe(200);
    spec = currentTheme(fraise.pid)!.spec;
    expect(spec.templates.index.sections[heroId].settings.layout).toBe("stacked");
    expect(spec.templates.index.sections[heroId].settings.heading).toBe(heading);
    expect((await fr(() => disposition.POST(post({ template: "index", section: heroId, disposition: "background" }), ctx(fraise.pid)))).status).toBe(200);
    spec = currentTheme(fraise.pid)!.spec;
    expect(spec.templates.index.sections[heroId].type).toBe("cv-banner");
    expect(spec.templates.index.sections[heroId].settings.heading).toBe(heading);
    expect((await fr(() => disposition.POST(post({ template: "index", section: heroId, disposition: "image-right" }), ctx(fraise.pid)))).status).toBe(200);
    spec = currentTheme(fraise.pid)!.spec;
    expect(spec.templates.index.sections[heroId].type).toBe("cv-hero");
    expect(spec.templates.index.sections[heroId].settings.heading).toBe(heading);
    expect((await fr(() => disposition.POST(post({ template: "index", section: heroId, disposition: "inexistante" }), ctx(fraise.pid)))).status).toBe(400);

    // 4. En-tête et pied de page : la disposition actuelle des thèmes validés est la n° 1 ; une autre se pose sans
    // toucher au logo, au menu ni aux blocs.
    const hdr = (p: { pid: string }) => { const g = currentTheme(p.pid)!.spec.groups.header; const id = g.order.find((k) => g.sections[k].type === "header")!; return { id, s: g.sections[id] }; };
    const ftr = (p: { pid: string }) => { const g = currentTheme(p.pid)!.spec.groups.footer; const id = g.order.find((k) => g.sections[k].type === "footer")!; return { id, s: g.sections[id] }; };
    const cur = async (p: { pid: string }, part: "header" | "footer") => {
      const x = part === "header" ? hdr(p) : ftr(p);
      const r = await json(await fr(() => panel.GET(new Request(`http://x?template=group:${part}&section=${x.id}`), ctx(p.pid))));
      return r.family.chrome.presets as { id: string; current: boolean }[];
    };
    expect((await cur(fraise, "header")).findIndex((x) => x.current)).toBe(0);
    expect((await cur(fraise, "footer")).findIndex((x) => x.current)).toBe(0);
    expect((await cur(rive, "header")).findIndex((x) => x.current)).toBe(0);
    expect((await cur(rive, "footer")).findIndex((x) => x.current)).toBe(0);
    expect((await cur(rive, "header")).length).toBe(5);
    const before = hdr(fraise).s;
    expect((await fr(() => disposition.POST(post({ chrome: { part: "header", preset: "two-rows" } }), ctx(fraise.pid)))).status).toBe(200);
    const after = hdr(fraise).s;
    expect(after.settings.layout).toBe("two-rows");
    expect(after.settings.menu).toBe(before.settings.menu);
    expect((await fr(() => disposition.POST(post({ chrome: { part: "header", preset: "centered" } }), ctx(fraise.pid)))).status).toBe(200);
    expect(hdr(fraise).s.settings.layout).toBe("logo-center");
    const fBefore = ftr(rive).s;
    expect((await fr(() => disposition.POST(post({ chrome: { part: "footer", preset: "brand-left" } }), ctx(rive.pid)))).status).toBe(200);
    const fAfter = ftr(rive).s;
    expect(fAfter.settings.style).toBe("brand-left");
    for (const [k, b] of Object.entries(fBefore.blocks ?? {})) expect(fAfter.blocks?.[k]).toEqual(b);
    // Services : jamais de panier ni de recherche dans les en-têtes proposés.
    expect((await fr(() => disposition.POST(post({ chrome: { part: "header", preset: "phone" } }), ctx(rive.pid)))).status).toBe(200);
    expect(hdr(rive).s.settings.show_cart).toBe(false);
    // Le bouton de la démonstration (« Parlons de votre projet », maquette Atelier Rive du 23 octobre) est conservé.
    expect(hdr(rive).s.settings.cta_label).toBe("Parlons de votre projet");
  }, 240_000);

  it("identité automatique : la même section dans deux marques de la même famille prend le nom, les textes et le style de chacune", async () => {
    const user = await createUser("familles-2@example.invalid", "isolated-test-only", "Familles 2");
    await login(user.id);
    const fraise = await demo(user.id, "fraise");
    // Deux boutiques spécialisées : ONDE est un thème E-commerce depuis #158 (section spécialisée refusée par les droits #150).
    const sillon = await demo(user.id, "sillon");
    const sections = await import("@/app/api/projects/[id]/theme/sections/route");
    const html: Record<string, string> = {};
    for (const p of [fraise, sillon]) {
      expect((await fr(() => sections.POST(post({ type: "fam:specialty.making~steps", template: "index", index: 0 }), ctx(p.pid)))).status).toBe(200);
      const spec = currentTheme(p.pid)!.spec;
      const s = spec.templates.index.sections[spec.templates.index.order[0]];
      expect(s.type).toBe("fs-making");
      html[p.pid] = (await fr(() => renderPage({ spec, base: "", cart: [] }, "/", new URLSearchParams()))).html;
    }
    const nameOf = (p: typeof fraise) => currentTheme(p.pid)!.spec.store.product.title;
    const a = html[fraise.pid], b = html[sillon.pid];
    const sectionOf = (h: string) => h.slice(h.indexOf('class="fs fs-making'), h.indexOf("</section>", h.indexOf('class="fs fs-making')));
    expect(nameOf(fraise)).not.toBe(nameOf(sillon));
    expect(sectionOf(a)).toContain(nameOf(fraise));
    expect(sectionOf(b)).toContain(nameOf(sillon));
    expect(sectionOf(a)).not.toContain(nameOf(sillon));
    expect(sectionOf(b)).not.toContain(nameOf(fraise));
    // Palettes et polices propres à chaque projet (variables du thème), sans réglage manuel.
    const vars = (h: string) => (h.match(/--c-accent:\s*[^;]+;/) ?? [""])[0];
    expect(vars(a)).not.toBe(vars(b));
    // Style du thème installé (profil « conversion ») et rien d'inventé sur un vrai site.
    expect(sectionOf(a)).toContain("fs--cv");
    expect(sectionOf(a)).toMatch(/À compléter/);
    expect(sectionOf(a)).not.toMatch(/Exemple/);
  }, 240_000);
});
