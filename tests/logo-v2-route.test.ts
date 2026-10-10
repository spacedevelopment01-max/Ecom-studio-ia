/**
 * Logo V2 (point d'accès) : style choisi transmis à la tâche ; « Nouvelle version » seulement pour un logo complet,
 * refusée en Découverte (0 € d'IA) ; un logo complet écarté avec un nom faux ne peut pas être choisi.
 */
import { describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});

describe("Logo V2 — point d'accès", async () => {
  const { createUser } = await import("@/lib/auth");
  const { id, json, now, one, run } = await import("@/lib/db");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { seedLogoFixture } = await import("./logo-v2-fixtures");
  const route = await import("@/app/api/projects/[id]/brand/logo-v2/route");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const req = (pid: string, body: object) => new Request(`http://localhost:3000/api/projects/${pid}/brand/logo-v2`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const ctx = (pid: string) => ({ params: Promise.resolve({ id: pid }) }) as any;
  const asset = (pid: string, userId: string, role: string, meta: object) => {
    const aid = id();
    run("INSERT INTO assets (id, project_id, user_id, kind, role, name, mime, storage_key, size, status, origin, meta, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", aid, pid, userId, "image", role, "logo.png", "image/png", `x/${aid}.png`, 1, "review", "generated", JSON.stringify(meta), now());
    return aid;
  };

  it("style transmis ; nouvelle version : logo complet seulement, refusée en Découverte ; nom faux jamais choisi", async () => {
    const u = await createUser(`lv2route${Date.now()}@test.fr`, "motdepasse-test", "R");
    getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    sessionUser = { ...u, role: "client" };
    const pid = fr(() => seedLogoFixture(u.id, "artisan"));
    const r = await route.POST(req(pid, { action: "generate", style: "textured" }), ctx(pid));
    expect(r.status).toBe(200);
    const jobRow = one<{ id: string; payload: string }>("SELECT id, payload FROM jobs WHERE project_id = ? AND type = 'brand.logo.v2'", pid)!;
    expect(json<any>(jobRow.payload, {}).style).toBe("textured");
    run("UPDATE jobs SET status = 'done' WHERE id = ?", jobRow.id);
    expect((await route.POST(req(pid, { action: "generate", style: "baroque" }), ctx(pid))).status).toBe(400);
    const built = asset(pid, u.id, "logo-v2", { engine: "logo-v2", territory: { name: "T" }, gate: { verdict: "FINAL" } });
    expect((await route.POST(req(pid, { action: "redraw", assetId: built }), ctx(pid))).status).toBe(404);
    const art = asset(pid, u.id, "logo-v2", { engine: "logo-v2", territory: { name: "T" }, artwork: { expected: { name: "x" } }, gate: { verdict: "FINAL" } });
    const ok = await route.POST(req(pid, { action: "redraw", assetId: art, feedback: "plus chaud" }), ctx(pid));
    expect(ok.status).toBe(200);
    const redraw = one<{ id: string; payload: string }>("SELECT id, payload FROM jobs WHERE project_id = ? AND type = 'brand.logo.v2.redraw'", pid)!;
    expect(json<any>(redraw.payload, {})).toMatchObject({ assetId: art, feedback: "plus chaud" });
    run("UPDATE jobs SET status = 'done' WHERE id = ?", redraw.id);
    const wrong = asset(pid, u.id, "logo-v2-trial", { engine: "logo-v2", territory: { name: "T" }, artwork: { expected: { name: "x" } }, gate: { verdict: "REJECTED", codes: ["name_mismatch"] } });
    expect((await route.POST(req(pid, { action: "choose", assetId: wrong }), ctx(pid))).status).toBe(404);
    // Découverte : aucune image payée.
    run("UPDATE subscriptions SET plan = NULL, status = 'canceled' WHERE user_id = ?", u.id);
    expect((await route.POST(req(pid, { action: "redraw", assetId: art }), ctx(pid))).status).toBe(403);
  });
});
