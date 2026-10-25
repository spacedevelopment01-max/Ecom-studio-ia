/**
 * Mission #190 — droits par thème et par forfait (plus de familles) : réglage d'administration enregistré, nettoyé,
 * appliqué côté serveur (choix d'un thème), publié pour la grille des tarifs ; aucune répartition décidée d'office.
 */
import { describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { id, now, run } from "@/lib/db";
import { HttpError } from "@/lib/auth";

const session = vi.hoisted(() => ({ user: null as any }));
vi.mock("@/lib/auth", async (o) => {
  const real = await o<typeof import("@/lib/auth")>();
  const requireUser = async () => { if (!session.user) throw new real.HttpError(401, "non connecté"); return session.user; };
  return { ...real, requireUser, currentUser: async () => session.user, requireAdmin: async () => { const u = await requireUser(); if (u.role !== "admin") throw new real.HttpError(403, "réservé"); return u; } };
});

const { GET: adminGet, POST: adminPost } = await import("@/app/api/admin/theme-rights/route");
const { GET: publicGet } = await import("@/app/api/public/theme-rights/route");
const { assertThemeAllowed } = await import("@/lib/plan-gates");
const { loadThemeRights } = await import("@/lib/theme/theme-rights-store");
const { undecidedPlans, themesOpenTo } = await import("@/lib/theme/theme-rights");
const { ACTIVE_THEMES } = await import("@/lib/theme/theme-fit");
const { directionCards } = await import("@/lib/theme/directions");

const post = (b: unknown) => adminPost(new Request("http://localhost/api/admin/theme-rights", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }));
const project = async (plan: "creer" | "vendre" | "dominer") => {
  const u = await createUser(`droits190-${id()}@example.invalid`, "isolated-test-only", "Droits");
  const pid = id();
  run("INSERT INTO projects(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)", pid, u.id, "Projet isolé", now(), now());
  grantProjectPlan(pid, plan);
  return pid;
};

describe("droits par thème et par forfait (mission #190)", () => {
  it("par défaut : aucun forfait n'a de liste choisie, tous les thèmes sur maquettes leur sont ouverts", () => {
    const r = loadThemeRights();
    expect(undecidedPlans(r)).toEqual(["creer", "vendre", "dominer"]);
    for (const p of ["creer", "vendre", "dominer"] as const) expect(themesOpenTo(p, r)).toEqual([...ACTIVE_THEMES]);
  });

  it("administration : réservée à l'administrateur ; liste nettoyée (thèmes inconnus ou retirés ignorés) ; null = à choisir", async () => {
    session.user = null;
    expect((await adminGet()).status).toBe(401);
    session.user = { ...(await createUser(`client190-${id()}@example.invalid`, "isolated-test-only", "Client")), role: "user" };
    expect((await post({ plans: { creer: ["phase"] } })).status).toBe(403);
    session.user = { ...(await createUser(`admin190-${id()}@example.invalid`, "isolated-test-only", "Admin")), role: "admin" };
    const res = await post({ plans: { creer: ["phase", "onde", "orbe", "vitrine", "inconnu"], vendre: null } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rights.plans.creer).toEqual(["onde", "phase"]);
    expect(body.undecided).toEqual(["vendre", "dominer"]);
    expect(body.withdrawn).toEqual(["orbe", "alcove"]);
    // Grille des tarifs : listes publiées, rien de privé.
    const pub = await (await publicGet()).json();
    expect(pub).toEqual({ rights: { plans: { creer: ["onde", "phase"] } } });
  });

  it("le serveur applique la liste choisie : thème hors liste refusé (402), thème de la liste accepté, thème déjà utilisé conservé", async () => {
    const pid = await project("creer");
    expect(() => assertThemeAllowed(pid, "phase")).not.toThrow();
    let err: unknown;
    try { assertThemeAllowed(pid, "sillon"); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(402);
    expect((err as HttpError).message).not.toMatch(/famille/);
    expect(() => assertThemeAllowed(pid, "sillon", "sillon")).not.toThrow();
    // Forfait encore « à choisir » : tous les thèmes proposés restent ouverts.
    const v = await project("vendre");
    expect(() => assertThemeAllowed(v, "sillon")).not.toThrow();
    // Cartes de la galerie : forfaits qui ouvrent chaque thème.
    const cards = directionCards("fr", [], loadThemeRights());
    expect(cards.find((c) => c.id === "sillon")?.plans).toEqual(["vendre", "dominer"]);
    expect(cards.find((c) => c.id === "phase")?.plans).toEqual(["creer", "vendre", "dominer"]);
  });

  it("remise « à choisir » : le forfait retrouve tous les thèmes proposés", async () => {
    session.user = { ...(await createUser(`admin190b-${id()}@example.invalid`, "isolated-test-only", "Admin")), role: "admin" };
    const body = await (await post({ plans: { creer: null } })).json();
    expect(body.undecided).toEqual(["creer", "vendre", "dominer"]);
    const pid = await project("creer");
    expect(() => assertThemeAllowed(pid, "sillon")).not.toThrow();
  });
});
