/**
 * « Créer le visuel » (Images, entreprise de services) : la création renvoie le numéro de la tâche, la tâche produit
 * le visuel avec le moteur local (0 € d'IA) en quelques secondes, son état « terminée » est lisible par l'écran
 * (qui recharge alors la liste, `useFollowJob`) et le visuel figure dans la liste des fichiers.
 * Avant : la tâche finissait entre deux rafraîchissements du projet (15 s) et la liste n'était jamais rechargée.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
beforeEach(() => vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 })));
afterEach(() => vi.unstubAllGlobals());

describe("Créer un visuel de prestation", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { completeJob, getJob, JobContext } = await import("@/lib/jobs");
  const { run } = await import("@/lib/db");
  const { handlers } = await import("../worker/handlers");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const images = await import("@/app/api/projects/[id]/images/route");
  const jobs = await import("@/app/api/jobs/[jid]/route");
  const files = await import("@/app/api/projects/[id]/files/route");
  const overview = await import("@/app/api/projects/[id]/route");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  it("story 9:16 sans photo, titre vide : tâche terminée, visuel listé", async () => {
    const u = await createUser(`vis${Date.now()}@test.fr`, "motdepasse-test", "P");
    sessionUser = { ...u, role: "client" };
    const pid = await seedThemeScenario(u.id, "artisan");
    grantProjectPlan(pid, "vendre");
    expect(loadProject(pid).services.services.length).toBeGreaterThan(0);
    // L'écran ouvre la création d'après le forfait DU PROJET (abonnement par projet, sans abonnement du compte).
    const ov = await (await fr(() => overview.GET(new Request(`http://localhost:3000/api/projects/${pid}`), { params: Promise.resolve({ id: pid }) } as any))).json();
    expect(ov.plan).toBe("vendre");
    // Corps envoyé par l'écran (titre, texte et bouton vides : tirés de l'offre).
    const body = { mode: "single", kind: "service", format: "story", serviceIndex: 0, usePhoto: false };
    const r = await fr(() => images.POST(new Request(`http://localhost:3000/api/projects/${pid}/images`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: pid }) } as any));
    expect(r.status).toBe(200);
    const { jobId } = await r.json();
    expect(jobId).toBeTruthy();
    // Sa propre tâche (d'autres tests peuvent laisser des tâches en file dans la même base).
    const job = getJob(jobId)!;
    expect(job.type).toBe("image.single");
    run("UPDATE jobs SET status = 'running', locked_by = NULL WHERE id = ?", jobId);
    const result = await fr(() => handlers["image.single"](new JobContext(job)));
    completeJob(job.id, result);
    // L'écran lit l'état de la tâche : terminée.
    const st = await (await jobs.GET(new Request(`http://localhost:3000/api/jobs/${jobId}`), { params: Promise.resolve({ jid: jobId }) })).json();
    expect(st.job.status).toBe("done");
    // … puis recharge la liste : le visuel y est.
    const list = await (await fr(() => files.GET(new Request(`http://localhost:3000/api/projects/${pid}/files?role=social,ad,banner,lifestyle,packshot,scene`), { params: Promise.resolve({ id: pid }) } as any))).json();
    const assetId = (result as { assetId?: string }).assetId;
    expect(assetId).toBeTruthy();
    expect(list.assets.some((a: { id: string }) => a.id === assetId)).toBe(true);
  }, 120_000);
});
