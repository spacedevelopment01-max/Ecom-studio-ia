/**
 * Plus de décompte « à l'unité » (visuels, vidéos, packs) avant une création : seul le budget IA DU PROJET compte,
 * affiché en % (« Reste X % ») dans l'en-tête et dans la confirmation. Et dans Images (services), « une nouvelle
 * image » crée le fond du visuel (photo libre du métier, sinon IA) au lieu d'un visuel seulement typographique.
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
beforeEach(() => vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 })));
afterEach(() => vi.unstubAllGlobals());

const src = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("Confirmation avant une création : budget IA du projet", () => {
  it("plus de quotas de visuels ni de packs dans la confirmation", () => {
    const s = src("src/components/studio/cost-confirm.tsx");
    expect(s).not.toMatch(/quotas|PACK_FOR_QUOTA|Ajouter un|Ajoutez un pack|ce mois-ci/);
    expect(s).toContain("/subscription");
    expect(s).toContain("Reste ${left} %");
    expect(s).toContain("Recharger l'IA");
  });

  it("part restante du budget : forfait, puis recharges, 0 en pause", async () => {
    const { aiLeftPct } = await import("@/lib/ai-left");
    expect(aiLeftPct({ plan: { used: 76 }, credits: null, paused: false })).toBe(24);
    expect(aiLeftPct({ plan: { used: 100 }, credits: { used: 40 }, paused: false })).toBe(60);
    expect(aiLeftPct({ plan: { used: 100 }, credits: null, paused: true })).toBe(0);
  });
});

describe("Budget IA du projet exposé à l'écran", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const overview = await import("@/app/api/projects/[id]/route");
  const subscription = await import("@/app/api/projects/[id]/subscription/route");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as any;

  it("projet avec forfait : jauge du projet (sans abonnement du compte) ; découverte : aucune", async () => {
    const u = await createUser(`bud${Date.now()}@test.fr`, "motdepasse-test", "P");
    sessionUser = { ...u, role: "client" };
    const free = await seedThemeScenario(u.id, "artisan");
    const freeOv = await (await fr(() => overview.GET(new Request(`http://localhost:3000/api/projects/${free}`), ctx(free)))).json();
    expect(freeOv.aiBudget).toBeNull();

    const pid = await seedThemeScenario(u.id, "artisan");
    grantProjectPlan(pid, "vendre");
    const ov = await (await fr(() => overview.GET(new Request(`http://localhost:3000/api/projects/${pid}`), ctx(pid)))).json();
    expect(ov.aiBudget.usage.plan.used).toBeGreaterThanOrEqual(0);
    expect(ov.aiBudget.usage.paused).toBe(false);
    expect(ov.aiBudget.renewsAt).toBeGreaterThan(Date.now());
    const sub = await (await fr(() => subscription.GET(new Request(`http://localhost:3000/api/projects/${pid}/subscription`), ctx(pid)))).json();
    expect(sub.subscription.ai.paused).toBe(false);
    expect(sub.subscription.aiRenewsAt).toBe(ov.aiBudget.renewsAt);
  });
});

describe("Visuel de prestation : choix de l'image", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { getJob, JobContext } = await import("@/lib/jobs");
  const { run } = await import("@/lib/db");
  const { handlers } = await import("../worker/handlers");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const images = await import("@/app/api/projects/[id]/images/route");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const launch = async (pid: string, body: object) => {
    const r = await fr(() => images.POST(new Request(`http://localhost:3000/api/projects/${pid}/images`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: pid }) } as any));
    expect(r.status).toBe(200);
    const job = getJob((await r.json()).jobId)!;
    run("UPDATE jobs SET status = 'running', locked_by = NULL WHERE id = ?", job.id);
    return job;
  };

  it("« une nouvelle image » est transmise à la tâche et cherche une image (jamais un visuel typographique en silence)", async () => {
    const u = await createUser(`bg${Date.now()}@test.fr`, "motdepasse-test", "P");
    sessionUser = { ...u, role: "client" };
    const pid = await seedThemeScenario(u.id, "artisan");
    grantProjectPlan(pid, "vendre");
    const job = await launch(pid, { mode: "single", kind: "service", format: "portrait", serviceIndex: 0, background: "image" });
    expect(new JobContext(job).payload.request.background).toBe("image");
    // Ici : aucune photo libre (hors ligne) et aucune IA d'images configurée → message clair, pas de visuel muet.
    await expect(fr(() => handlers["image.single"](new JobContext(job)))).rejects.toThrow(/photo libre de droits/);
  }, 120_000);

  it("« sans image » : visuel typographique, comme avant", async () => {
    const u = await createUser(`bg2${Date.now()}@test.fr`, "motdepasse-test", "P");
    sessionUser = { ...u, role: "client" };
    const pid = await seedThemeScenario(u.id, "artisan");
    grantProjectPlan(pid, "vendre");
    const job = await launch(pid, { mode: "single", kind: "service", format: "portrait", serviceIndex: 0, background: "none" });
    const result = (await fr(() => handlers["image.single"](new JobContext(job)))) as { assetId?: string };
    expect(result.assetId).toBeTruthy();
  }, 120_000);
});
