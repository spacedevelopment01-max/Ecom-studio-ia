/**
 * Barrière de qualité des logos (phase 1B) : une piste de l'IA notée 4,4 ou 5,9 n'est jamais proposée ni appliquée ;
 * la version du studio sert de remplacement technique PROVISOIRE (ni planche de mises en situation, ni kit réseaux
 * sociaux, ni ligne éditoriale payée, ni charte finale, jamais validée automatiquement) ; une piste FINAL est
 * appliquée avec ses déclinaisons ; une tâche reprise ne repaie pas les pistes et contrôles déjà faits.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const svg = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${inner}</svg>`;
const DRAFTS = [
  { key: "produit", name: "Le geste de la lisseuse", why: "La lame de la lisseuse trace une courbe nette sur le mur. Le symbole garde ce geste en deux formes pleines.", svg: svg(`<rect x="21" y="6" width="17" height="38" rx="8.5" fill="currentColor"/><rect x="62" y="6" width="17" height="38" rx="8.5" fill="currentColor"/><path fill-rule="evenodd" fill="#446274" d="M18 62A32 32 0 1 0 82 62A32 32 0 1 0 18 62Z M36 62A14 14 0 1 1 64 62A14 14 0 1 1 36 62Z"/>`), heading: "Jost", headingWeight: 600, body: "DM Sans", case: "lower", tracking: 0.02, composition: "horizontal", ink: "dark", accent: "primary", ground: "primary" },
  { key: "concept", name: "La surface juste", why: "Une surface parfaitement plane rencontre la lumière rasante. Le symbole dit le soin du fini, sans cliché du bâtiment.", svg: svg(`<path fill-rule="evenodd" fill="currentColor" d="M54 6A44 44 0 1 0 54 94C38 86 30 70 30 50C30 30 38 14 54 6Z M18 84L6 98L30 92Z"/><circle cx="64" cy="50" r="13" fill="#446274"/>`), heading: "Playfair Display", headingWeight: 700, body: "Inter", case: "title", tracking: 0.02, composition: "stacked", ink: "dark", accent: "primary", ground: "dark" },
  { key: "typo", name: "Le S du plâtre", why: "Le S de Sébastien se dessine comme un coup de lisseuse continu, posé d'un seul geste. Le logotype reste sobre et artisan.", svg: svg(`<path d="M30 12V80H74" fill="none" stroke="currentColor" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><circle cx="72" cy="34" r="12" fill="#446274"/>`), heading: "Bricolage Grotesque", headingWeight: 800, body: "DM Sans", case: "lower", tracking: 0, composition: "wordmark", ink: "dark", accent: "accent", ground: "primary" },
];
const scores = (n: number) => ({ originality: n, memorability: n, relevance: n, simplicity: n, smallSizes: n, coherence: n, distinctiveness: n });
const review = (n: number, issues: string[] = []) => ({ scores: scores(n), cliche: false, resemblesKnownBrand: false, readsAsLetters: true, issues, fix: "" });

const calls = { routes: 0, redraw: 0, review: 0, voice: 0 };
let nextReview: (key: string) => any = () => review(4.4);
vi.mock("@/lib/ai/llm", async (orig) => ({ ...(await orig<object>()), llmConfigured: () => true }));
vi.mock("@/lib/ai/media-providers", async (orig) => ({ ...(await orig<object>()), imageProviderAvailable: () => null, imageUnavailableReason: () => "aucun fournisseur d'images (test)" }));
vi.mock("@/lib/ai/tasks", async (orig) => ({
  ...(await orig<object>()),
  aiCreativeRoutes: vi.fn(async () => (calls.routes++, structuredClone(DRAFTS))),
  aiCreativeRedraw: vi.fn(async (_b: unknown, _p: unknown, o: { key: string }) => (calls.redraw++, structuredClone(DRAFTS.find((d) => d.key === o.key)))),
  aiCreativeReview: vi.fn(async (_b: unknown, o: { route: { key: string } }) => (calls.review++, nextReview(o.route.key))),
  aiSocialVoice: vi.fn(async () => {
    calls.voice++;
    throw new Error("pas d'appel réel");
  }),
}));

const { createUser } = await import("@/lib/auth");
const { all, id, now, run } = await import("@/lib/db");
const { runWithLang } = await import("@/lib/i18n-server");
const { localBrand } = await import("@/lib/engine/local");
const { loadProject } = await import("@/lib/projects");
const { generateLogos, latestProposals } = await import("@/lib/engine/identity");
const { JobContext } = await import("@/lib/jobs");
const { serviceProduct, serviceProfile } = await import("./fixtures");

const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);
async function project() {
  const u = await createUser(`logo${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.fr`, "motdepasse-test", "P");
  const product = { ...serviceProduct, name: "Sébastien Blanc", category: "Plâtrier peintre", summary: "Plâtrerie et peinture dans l'Ain." };
  const services = { ...serviceProfile };
  const { brand, strategy } = localBrand(product, "Sébastien Blanc", { business: "services", services } as any);
  const pid = id();
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    pid, u.id, "Sébastien Blanc", "ready", "shopify", JSON.stringify(product), JSON.stringify(brand), JSON.stringify(strategy), JSON.stringify({ language: "fr" }), "[]", "services", JSON.stringify(services), now(), now(),
  );
  return pid;
}
const count = (pid: string, role: string) => all<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id = ? AND role = ? AND deleted_at IS NULL", pid, role)[0].n;

beforeEach(() => Object.assign(calls, { routes: 0, redraw: 0, review: 0, voice: 0 }));

// Génération et rendu réels des pistes (SVG → PNG, planches) : quelques secondes en local, mais bien plus sur la CI
// quand les fichiers de test tournent en parallèle — même marge que les autres tests de rendu de logo (piste-partout).
describe("logos : barrière de qualité branchée", { timeout: 180_000 }, () => {
  it("pistes notées 4,4 et 5,9 : jamais proposées ; version du studio PROVISOIRE, sans planche, kit, ligne éditoriale ni charte", async () => {
    nextReview = (key) => review(key === "produit" ? 4.4 : 5.9, ["symbole générique"]);
    await fr(async () => {
      const pid = await project();
      await generateLogos(null, pid, {});
      const props = latestProposals(pid);
      expect(props.length).toBeGreaterThan(0);
      for (const x of props) {
        expect(x.info.route.source).toBe("local");
        expect(x.info.gate.verdict).toBe("PROVISIONAL");
      }
      const brand = loadProject(pid).brand!;
      expect(brand.logo.provisional).toBe(true);
      expect(brand.logo.status).not.toBe("validated");
      expect(count(pid, "logo-route-board")).toBe(0);
      expect(count(pid, "social-kit")).toBe(0);
      expect(count(pid, "brand-book")).toBe(0);
      expect(calls.voice).toBe(0);
      // Aucune reprise « à l'aveugle » : 4,4 et 5,9 sont sous le seuil de reprise (mauvaise direction).
      expect(calls.redraw).toBe(0);
      const checks = all<{ verdict: string; score: number }>("SELECT verdict, score FROM quality_checks WHERE project_id = ? AND deliverable = 'logo_route'", pid);
      expect(checks.length).toBe(3);
      expect(checks.every((c) => c.verdict === "REJECTED")).toBe(true);
    });
  });

  it("contrôle en panne : aucune piste de l'IA proposée, aucune nouvelle génération", async () => {
    nextReview = () => {
      throw new Error("vision indisponible");
    };
    await fr(async () => {
      const pid = await project();
      await generateLogos(null, pid, {});
      expect(latestProposals(pid).every((x) => x.info.route.source === "local" && x.info.gate.verdict === "PROVISIONAL")).toBe(true);
      expect(calls.redraw).toBe(0);
      expect(all<{ verdict: string; checked: number }>("SELECT verdict, checked FROM quality_checks WHERE project_id = ?", pid).every((c) => c.verdict !== "FINAL" && c.checked === 0)).toBe(true);
    });
  });

  it("piste 7,2 avec défaut précis puis 8,6 : reprise ciblée, puis piste FINAL appliquée (badge contrôlé), gain enregistré", async () => {
    const seen: Record<string, number> = {};
    nextReview = (key) => {
      seen[key] = (seen[key] ?? 0) + 1;
      return key === "produit" && seen[key] === 1 ? review(7.2, ["typographie faible"]) : review(key === "produit" ? 8.6 : 4);
    };
    await fr(async () => {
      const pid = await project();
      await generateLogos(null, pid, {});
      expect(calls.redraw).toBe(1);
      const finals = latestProposals(pid).filter((x) => x.info.gate?.verdict === "FINAL");
      expect(finals.map((x) => x.info.key)).toEqual(["produit"]);
      const brand = loadProject(pid).brand!;
      expect(brand.logo.proposal).toBe("produit");
      expect(brand.logo.provisional).toBe(false);
      expect(count(pid, "logo-route-board")).toBe(1);
      const trail = all<{ score: number; previous_check_id: string | null }>("SELECT score, previous_check_id FROM quality_checks WHERE project_id = ? AND deliverable = 'logo_route' AND candidate_id LIKE '%:produit' ORDER BY attempt", pid);
      expect(trail.map((t) => t.score)).toEqual([7.2, 8.6]);
      expect(trail[1].previous_check_id).toBeTruthy();
    });
  });

  it("reprise d'une tâche interrompue : pistes et contrôles déjà faits relus, aucun nouvel appel", async () => {
    nextReview = () => review(8.5);
    await fr(async () => {
      const pid = await project();
      const ctx = new JobContext({ id: `job-${pid}`, project_id: pid, checkpoint: "{}", status: "running" } as any);
      ctx.progress = () => undefined;
      await generateLogos(ctx, pid, { redrawSymbol: true });
      const first = { ...calls };
      expect(first.routes).toBe(1);
      expect(first.review).toBe(3);
      await generateLogos(ctx, pid, { redrawSymbol: true });
      expect(calls).toEqual(first);
    });
  });
});
