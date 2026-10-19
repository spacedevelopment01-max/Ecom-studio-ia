import { describe, expect, it, vi } from "vitest";
let sessionUser: any = null;
vi.mock("@/lib/auth", async original => {
  const real = await original<typeof import("@/lib/auth")>();
  return { ...real, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise"); })() };
});

describe("Création vidéo guidée : droits natifs, sans fournisseur", async () => {
  const { createUser } = await import("@/lib/auth");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { all, run } = await import("@/lib/db");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { saveAsset } = await import("@/lib/library");
  const route = await import("@/app/api/projects/[id]/creative/video/route");
  it("devis consultable, création refusée sans forfait même pour montage gratuit ; propriétaire payé accepté, étranger refusé", async () => {
    const u = await createUser(`video-droits-${crypto.randomUUID()}@test.fr`, "motdepasse-test", "Test isolé");
    sessionUser = u;
    const pid = seedImageFixture(u.id, "restaurant");
    const ctx = { params: Promise.resolve({ id: pid }) };
    let approvedEstimateMicro: number | undefined;
    const req = (action: string) => new Request(`http://localhost/api/projects/${pid}/creative/video`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, as: "ad", scenes: 3, totalS: 15, approvedEstimateMicro }) });
    expect((await route.POST(req("quote"), ctx)).status).toBe(200);
    expect((await route.POST(req("create"), ctx)).status).toBe(402);
    expect(all("SELECT id FROM jobs WHERE project_id = ?", pid)).toHaveLength(0);
    getSubscription(u.id);
    run("UPDATE subscriptions SET status='active', plan='creer' WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    approvedEstimateMicro = (await (await route.POST(req("quote"), ctx)).json()).estimateMicro;
    expect((await route.POST(req("create"), ctx)).status).toBe(200);
    expect(all("SELECT id FROM jobs WHERE project_id = ? AND type='video.scenes'", pid)).toHaveLength(1);
    await saveAsset({ projectId: pid, userId: u.id, data: Buffer.from("fichier simulé, aucun encodage testé ici"), name: "simulation.mp4", mime: "video/mp4", role: "video", origin: "import", status: "review", meta: { scenes: { as: "ad" }, creative: { notes: ["Voix indisponible"] }, finalCheck: { summary: { unchecked: ["Fidélité produit"], issues: [{ detail: "Scènes trop proches" }] } } } });
    const listed = await (await route.GET(new Request(`http://localhost/api/projects/${pid}/creative/video`), ctx)).json();
    expect(listed.videos[0]).toMatchObject({ reviewRequired: true });
    expect(listed.videos[0].warnings).toEqual(expect.arrayContaining(["Voix indisponible", "Scènes trop proches", "Non vérifié : Fidélité produit"]));
    sessionUser = await createUser(`video-etranger-${crypto.randomUUID()}@test.fr`, "motdepasse-test", "Étranger isolé");
    expect((await route.POST(req("quote"), ctx)).status).toBe(404);
  });
});
