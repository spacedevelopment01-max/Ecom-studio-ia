/**
 * Isolation des bibliothèques par famille et « section écrite par l'IA » réservée au forfait Dominer, sur les voies
 * corrigées pour l'issue #145 (IA simulée : aucun appel réel ni payant) :
 *  - chat de la boutique : la passe de correction automatique ne peut plus ajouter de section sur mesure hors Dominer ;
 *  - composition IA de l'accueil (moteur V1) : section sur mesure hors Dominer et sections d'une autre famille écartées ;
 *  - recomposition d'un projet déjà dans l'un des quatre thèmes : jamais remplacé par des sections V2 hors bibliothèque ;
 *  - moteur local : une commande dont la section est hors bibliothèque laisse la main (pas de refus muet) ;
 *  - aperçu de section et ancien menu « Choisir la disposition » alignés sur la bibliothèque.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => {
  const root = process.env.DATA_DIR; if (!root) throw new Error("Tests isolés obligatoires");
  const dir = process.getBuiltinModule("fs").mkdtempSync(`${root}/isolation-145-`), shared = globalThis as { __ecomDb?: { close(): void } }, previousDb = shared.__ecomDb; delete shared.__ecomDb; vi.stubEnv("DATA_DIR", dir); return { dir, previousDb };
});
afterAll(() => { const shared = globalThis as { __ecomDb?: { close(): void } }; if (shared.__ecomDb !== session.previousDb) shared.__ecomDb?.close(); if (session.previousDb) shared.__ecomDb = session.previousDb; else delete shared.__ecomDb; vi.unstubAllEnvs(); });
const ai = vi.hoisted(() => ({ configured: false, chat: null as unknown, repair: null as unknown, design: null as unknown }));
const jar = vi.hoisted(() => ({ token: "" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }) }));
vi.mock("@/lib/ai/llm", async (original) => ({ ...await original<object>(), llmConfigured: () => ai.configured }));
vi.mock("@/lib/ai/tasks", async (original) => ({
  ...await original<object>(),
  aiThemeChat: async () => ai.chat,
  aiRepairOps: async () => ai.repair,
  aiDesignHome: async () => ai.design,
  aiReviewHome: async () => null,
}));
import { createUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { sha256 } from "@/lib/secrets";
import { runWithLang } from "@/lib/i18n-server";
import { currentTheme, saveThemeVersion } from "@/lib/projects";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { enqueue, JobContext } from "@/lib/jobs";
import { buildShop } from "@/lib/engine/shop";
import { localFirst } from "@/lib/engine/local-first";
import { localThemeCommand } from "@/lib/engine/local";
import { applyOps } from "@/lib/theme/ops";
import { sectionIncompatibility } from "@/lib/theme/section-compat";
import { handlers } from "../worker/handlers";
import { GET as themeGet } from "@/app/api/projects/[id]/theme/route";
import { GET as previewGet } from "@/app/api/projects/[id]/theme/section-preview/route";
import { demoProject } from "./demo-fixtures";

beforeEach(() => { vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }); ai.configured = false; });
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
async function login(userId: string) {
  const token = `tok-145-${userId}-${Math.random()}`;
  run("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)", sha256(token), userId, Date.now() + 3600_000, Date.now());
  jar.token = token;
}
const demo = async (userId: string, id: "fraise" | "onde" | "orbe" | "rive") => { const d = await fr(() => demoProject(userId, id)); if (!currentTheme(d.pid)) saveThemeVersion(d.pid, d.spec, "Démonstration", "user"); return d; };
const CUSTOM = { op: "custom_section", type: "es-custom-frise", name: "Frise", liquid: "<section class=\"es-frise\">Frise</section>\n{% schema %}{\"name\":\"Frise\",\"settings\":[]}{% endschema %}" };

describe("isolation des familles et forfait Dominer (issue #145)", async () => {
  const user = await createUser("isolation-145@example.invalid", "isolated-test-only", "Isolation");

  it("chat : la correction automatique de l'IA n'ajoute pas de section sur mesure hors Dominer", async () => {
    const d = await demo(user.id, "rive");
    grantProjectPlan(d.pid, "vendre");
    ai.configured = true;
    // Première réponse : une section d'une autre famille (refusée) ; correction : section sur mesure + son ajout.
    ai.chat = { reply: "Je compose une frise.", ops: [{ op: "add_section", template: "index", type: "gallery-mosaic" }], revert: false, remember: [] };
    ai.repair = { ops: [CUSTOM, { op: "add_section", template: "index", type: "es-custom-frise" }] };
    const job = await fr(() => enqueue({ userId: user.id, projectId: d.pid, type: "shop.chat", payload: { projectId: d.pid, messageId: "m-145", message: "Imagine pour l'accueil une frise animée originale qui raconte nos chantiers avec élégance", selection: null, attachments: [], page: "index" } }));
    const result = await fr(() => handlers["shop.chat"](new JobContext(job))) as { applied: string[] };
    const spec = currentTheme(d.pid)!.spec;
    expect(Object.values(spec.templates.index.sections).some((s) => s.type.startsWith("es-custom-"))).toBe(false);
    expect(Object.values(spec.templates.index.sections).some((s) => s.type === "gallery-mosaic")).toBe(false);
    expect(result.applied.join(" ")).not.toMatch(/sur mesure/);
  }, 120_000);

  it("chat : en Dominer, la même section sur mesure est acceptée", async () => {
    const d = await demo(user.id, "rive");
    grantProjectPlan(d.pid, "dominer");
    ai.configured = true;
    ai.chat = { reply: "Je compose une frise.", ops: [CUSTOM, { op: "add_section", template: "index", type: "es-custom-frise" }], revert: false, remember: [] };
    ai.repair = { ops: [] };
    const job = await fr(() => enqueue({ userId: user.id, projectId: d.pid, type: "shop.chat", payload: { projectId: d.pid, messageId: "m-145b", message: "Imagine pour l'accueil une frise animée originale qui raconte nos chantiers avec élégance", selection: null, attachments: [], page: "index" } }));
    await fr(() => handlers["shop.chat"](new JobContext(job)));
    expect(Object.values(currentTheme(d.pid)!.spec.templates.index.sections).some((s) => s.type === "es-custom-frise")).toBe(true);
  }, 120_000);

  it("recomposition d'un projet ORBE : reste dans le thème ORBE et sa bibliothèque (jamais de sections V2)", async () => {
    const d = await demo(user.id, "orbe");
    grantProjectPlan(d.pid, "creer");
    const before = d.spec.templates.index.order.map((id) => d.spec.templates.index.sections[id].type);
    await fr(() => buildShop(null, d.pid, { useAi: false }));
    const spec = currentTheme(d.pid)!.spec;
    expect(spec.direction).toBe("orbe");
    // Avant la correction : accueil refait par le moteur V2 (v2-hero, v2-split, v2-banner…), composition ORBE perdue.
    const types = spec.templates.index.order.map((id) => spec.templates.index.sections[id].type);
    expect(types).toEqual(before);
    for (const t of types) expect(sectionIncompatibility(spec, t, "catalog"), t).toBe("");
    await expect(fr(() => buildShop(null, d.pid, { engine: "v2" }))).rejects.toThrow(/thème/);
  }, 180_000);

  it("composition IA de l'accueil (V1) : ni section sur mesure hors Dominer, ni section d'une autre famille", async () => {
    const d = await demo(user.id, "orbe");
    grantProjectPlan(d.pid, "creer");
    ai.configured = true;
    ai.design = {
      reasoning: "Composition de test",
      globals: {},
      custom: { type: "es-custom-anim", name: "Animation", liquid: "<div>anim</div>\n{% schema %}{\"name\":\"Animation\",\"settings\":[]}{% endschema %}" },
      index: [
        ...currentTheme(d.pid)!.spec.templates.index.order.map((id) => ({ type: currentTheme(d.pid)!.spec.templates.index.sections[id].type, settings: currentTheme(d.pid)!.spec.templates.index.sections[id].settings })),
        { type: "services-list", settings: {} }, { type: "testimonials", settings: {} }, { type: "es-custom-anim", settings: {} },
      ],
    };
    const fake = { job: { id: "job-design-145" }, step: async (_k: string, f: () => unknown) => f(), progress: () => {} } as never;
    await fr(() => buildShop(fake, d.pid, { direction: "orbe", engine: "v1" }));
    const spec = currentTheme(d.pid)!.spec;
    const types = spec.templates.index.order.map((id) => spec.templates.index.sections[id].type);
    expect(types).not.toContain("services-list");
    expect(types.some((t) => t.startsWith("es-custom-"))).toBe(false);
    for (const t of types) expect(sectionIncompatibility(spec, t, "catalog"), t).toBe("");
  }, 180_000);

  it("moteur local : une commande dont la section est hors bibliothèque n'est pas faite « à blanc » puis refusée", async () => {
    for (const id of ["fraise", "orbe", "rive"] as const) {
      const d = await demo(user.id, id);
      const kind = id === "fraise" ? "specialty" : id === "orbe" ? "catalog" : "services";
      for (const message of ["Ajoute une FAQ", "Ajoute une frise des étapes", "Ajoute les infos pratiques", "Ajoute une section avis"]) {
        const quick = fr(() => localFirst(d.spec, message, null, [], d.spec.store.business === "services" ? "services" : "products", () => null, kind));
        if (quick?.ops.length) {
          const r = applyOps(d.spec, quick.ops, { targeted: new Set(), storeKind: kind });
          expect(r.rejected, `${id} « ${message} »`).toEqual([]);
        }
        const local = fr(() => localThemeCommand(d.spec, message, null, d.spec.store.business === "services" ? "services" : "products", kind));
        for (const op of local.ops) if (op.op === "add_section") expect(sectionIncompatibility(d.spec, op.type, kind), `${id} « ${message} » → ${op.type}`).toBe("");
      }
    }
  }, 180_000);

  it("aperçu de section et menu de disposition : alignés sur la bibliothèque de la famille", async () => {
    const d = await demo(user.id, "rive");
    await login(user.id);
    const outside = await fr(() => previewGet(new Request(`http://x/api/projects/${d.pid}/theme/section-preview?type=fs-results`), ctx(d.pid)));
    expect(outside.status).toBe(404);
    const inside = await fr(() => previewGet(new Request(`http://x/api/projects/${d.pid}/theme/section-preview?type=${encodeURIComponent("fam:services.faq")}`), ctx(d.pid)));
    expect(inside.status).toBe(200);
    const theme = await (await fr(() => themeGet(new Request(`http://x/api/projects/${d.pid}/theme`), ctx(d.pid)))).json() as { current: { structure: { template: string; sections: { type: string; layout?: unknown }[] }[] } };
    for (const g of theme.current.structure) for (const s of g.sections) if (s.type === "header" || s.type === "footer") expect(s.layout, s.type).toBeUndefined();
  }, 120_000);
});
