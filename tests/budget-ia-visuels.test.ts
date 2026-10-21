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
  const { grantProjectPlan } = await import("./communication-choice-fixture");
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
    grantProjectPlan(pid, "dominer");
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
  const { grantProjectPlan } = await import("./communication-choice-fixture");
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

  it("images 100 % IA : un visuel de prestation part vers l'IA (publication entière), jamais un visuel typographique du studio", async () => {
    const u = await createUser(`bg${Date.now()}@test.fr`, "motdepasse-test", "P");
    sessionUser = { ...u, role: "client" };
    const pid = await seedThemeScenario(u.id, "artisan");
    grantProjectPlan(pid, "dominer");
    for (const background of ["image", "none"]) {
      const job = await launch(pid, { mode: "single", kind: "service", format: "portrait", serviceIndex: background === "none" ? 1 : 0, background });
      expect(job.type).toBe("image.ai_post");
    }
  }, 120_000);

  it("ancienne tâche image.single restée en file : passe par l'IA d'images ; sans IA, refus expliqué (aucun gabarit)", async () => {
    const u = await createUser(`bg2${Date.now()}@test.fr`, "motdepasse-test", "P");
    const pid = await seedThemeScenario(u.id, "artisan");
    const jid = `old-single-${Date.now()}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, pid, "image.single", "x", JSON.stringify({ projectId: pid, request: { kind: "service" } }), "running", Date.now(), Date.now(), Date.now());
    await expect(fr(() => handlers["image.single"](new JobContext(getJob(jid)!)))).rejects.toThrow(/aucun gabarit/);
  }, 120_000);
});
