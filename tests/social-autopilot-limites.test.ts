/**
 * Autopilot V2 — structure de la semaine et limites des forfaits impossibles à contourner. Outils SIMULÉS : aucune IA,
 * aucune dépense, aucune publication réelle.
 * - 1, 3 ou 5 publications par jour selon le forfait, comptées par CONTENU (une publication et ses adaptations pour
 *   d'autres réseaux = un contenu) et par jour du calendrier du client (fuseau du projet, pas UTC) ;
 * - glisser-déposer / modification de date, « mettre les vidéos le mardi », reprise après pause : mêmes contrôles ;
 * - demande écrite, formulaire et automatisation : jamais plus que le forfait.
 */
import { describe, expect, it } from "vitest";

describe("Autopilot V2 — structure éditoriale et limites", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, id, now, one, run } = await import("@/lib/db");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const gates = await import("@/lib/plan-gates");
  const { createPlanV2 } = await import("@/lib/social-v2/planner");
  const { planFromAsk, editPostV2, applySocialEdit } = await import("@/lib/social-v2/engine");
  const { setPlanPaused, moveRefusal } = await import("@/lib/social-v2/scheduler");
  const { createAutomation, runDueAutomations } = await import("@/lib/social-v2/automations");
  const { rolesFor, WEEK } = await import("@/lib/social-v2/editorial");
  const { usedHooks, rememberRefused, hookSimilarity } = await import("@/lib/social-v2/memory");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { mockSocialDeps } = await import("./social-v2-mock");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  async function project(plan: "creer" | "vendre" | "dominer" | null, kind: "cosmetic" | "artisan" = "cosmetic") {
    const u = await createUser(`auto-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "A");
    const pid = seedImageFixture(u.id, kind);
    if (plan) grantProjectPlan(pid, plan);
    return loadProject(pid);
  }
  const post = (projectId: string, at: number, status = "scheduled", group: string | null = null, network = "instagram", planId: string | null = null) => {
    const x = id();
    run("INSERT INTO posts (id, project_id, plan_id, network, format, status, scheduled_at, timezone, caption, publish_key, group_id, engine, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", x, projectId, planId, network, "image", status, at, "Europe/Paris", `c ${x}`, `k-${x}`, group, "v2", now(), now());
    return x;
  };
  const day = (n: number, h = 10) => {
    const d = new Date(Date.now() + n * 86_400_000);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h);
  };
  const start = (n = 2) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

  it("semaine éditoriale : 7 jours distincts, 1 / 3 / 5 rôles par jour, jamais deux fois le même rôle un même jour", () => {
    expect(WEEK.map((d) => d.day).sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (const d of WEEK) {
      expect(d.roles).toHaveLength(5);
      expect(d.roles[0].kind).toBe("main");
      for (const n of [1, 3, 5]) {
        const r = rolesFor(d.day, n);
        expect(r).toHaveLength(n);
        expect(new Set(r.map((x) => x.id)).size).toBe(n);
        expect(r[0]).toBe(d.roles[0]);
      }
      // 3 par jour : la principale + une publication qui informe ou démontre + une qui engage ou convertit.
      const three = rolesFor(d.day, 3);
      expect(["info", "demo"]).toContain(three[1].kind);
      expect(["engage", "convert", "more", "info", "demo"]).toContain(three[2].kind);
    }
    // Niveau commercial 0 : la vente passe en dernier ; objectif « ventes » : la conversion entre dans les 3.
    expect(rolesFor(6, 3, "sales", 2).some((r) => r.kind === "convert")).toBe(true);
    expect(rolesFor(1, 3, "community", 0).some((r) => r.kind === "convert")).toBe(false);
  });

  it("calendrier hebdomadaire : 3 par jour × 7 jours (cosmétique) puis 5 par jour × 7 jours (plâtrier) — rôles du jour, rien d'inventé", async () => {
    const a = await project("vendre", "cosmetic");
    const ra = fr(() => createPlanV2(a, { startDate: start(), days: 7, perDay: 3, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], structure: "weekly" }));
    expect(ra.created).toBe(21);
    const b = await project("dominer", "artisan");
    const rb = fr(() => createPlanV2(b, { startDate: start(), days: 7, perDay: 5, timezone: "Europe/Paris", platforms: [{ platform: "facebook" }], structure: "weekly" }));
    expect(rb.created).toBe(35);
    for (const planId of [ra.planId, rb.planId]) {
      const rows = all<{ caption: string; brief: string; scheduled_at: number }>("SELECT caption, brief, scheduled_at FROM posts WHERE plan_id = ?", planId);
      const byDay = new Map<string, Set<string>>();
      for (const r of rows) {
        const brief = JSON.parse(r.brief);
        expect(brief.role).toBeTruthy();
        const k = new Date(r.scheduled_at).toISOString().slice(0, 10);
        byDay.set(k, (byDay.get(k) ?? new Set()).add(brief.role));
        // Ni équipe, ni avis, ni promotion, ni urgence inventés.
        expect(r.caption).not.toMatch(/notre équipe de \d|\d+ ?% de réduction|derniers jours|stock limité|avis client|★/i);
      }
      for (const set of byDay.values()) expect(set.size).toBeGreaterThanOrEqual(3);
      const hooks = rows.map((r) => r.caption.split("\n")[0]);
      expect(new Set(hooks).size).toBe(hooks.length);
    }
  });

  it("mémoire : les accroches refusées ou déjà utilisées ne reviennent pas, accents compris ; similarité mesurée", async () => {
    const p = await project("vendre");
    rememberRefused(p.id, "Découvrez le Sérum Éclat\nsuite");
    expect(usedHooks(p.id).has("decouvrez le serum eclat")).toBe(true);
    expect(hookSimilarity("Le Sérum Éclat, matin et soir", "Sérum éclat : matin et soir")).toBeGreaterThanOrEqual(0.8);
    expect(hookSimilarity("Le Sérum Éclat, matin et soir", "Trois questions sur la livraison")).toBeLessThan(0.3);
  });

  it("par jour : une publication et ses adaptations (même contenu) comptent pour UN ; le jour est celui du fuseau du projet", async () => {
    const p = await project("creer");
    const g = id();
    const at = Date.UTC(2031, 0, 15, 9);
    post(p.id, at, "scheduled", g, "instagram");
    post(p.id, at, "scheduled", g, "facebook");
    post(p.id, at, "scheduled", g, "pinterest");
    expect(gates.scheduledPostsOn(p.id, at)).toBe(1);
    // 23 h 30 à Paris le 15 = 22 h 30 UTC le 15 ; 0 h 30 à Paris le 16 = 23 h 30 UTC le 15 : deux jours différents pour le client.
    const q = await project("creer");
    post(q.id, Date.UTC(2031, 0, 15, 22, 30));
    expect(gates.scheduledPostsOn(q.id, Date.UTC(2031, 0, 15, 23, 30))).toBe(0);
    expect(gates.scheduledPostsOn(q.id, Date.UTC(2031, 0, 15, 12))).toBe(1);
  });

  it("glisser-déposer / modification de date : jamais dans le passé, jamais au-delà du forfait, jamais au-delà du nombre par jour", async () => {
    const p = await project("creer");
    const busy = post(p.id, day(3), "scheduled");
    const moved = post(p.id, day(4), "approved");
    expect(() => editPostV2(p, moved, { scheduledAt: now() - 86_400_000 })).toThrow(/passée/);
    expect(() => editPostV2(p, moved, { scheduledAt: day(20) })).toThrow(/7 jours/);
    expect(() => editPostV2(p, moved, { scheduledAt: day(3, 15) })).toThrow(/1 publication/);
    expect(one<{ scheduled_at: number }>("SELECT scheduled_at FROM posts WHERE id = ?", moved)!.scheduled_at).toBe(day(4));
    // Un brouillon peut se poser un jour déjà occupé (il sera contrôlé à la programmation) ; un jour libre est accepté.
    const draft = post(p.id, day(5), "review");
    expect(() => editPostV2(p, draft, { scheduledAt: day(3, 16) })).not.toThrow();
    expect(() => editPostV2(p, moved, { scheduledAt: day(6) })).not.toThrow();
    expect(moveRefusal(p.id, busy, day(3, 18))).toBeNull();
  });

  it("« mettre les vidéos le mardi » respecte la limite ; la reprise après pause revérifie chaque publication", async () => {
    const p = await project("creer");
    const planId = id();
    run("INSERT INTO content_plans (id, project_id, params, strategy, status, created_at, engine, updated_at) VALUES (?,?,?,?,?,?,?,?)", planId, p.id, "{}", "{}", "ready", now(), "v2", now());
    const a = post(p.id, day(2), "scheduled", null, "instagram", planId);
    const b = post(p.id, day(3), "scheduled", null, "instagram", planId);
    setPlanPaused(planId, true);
    expect(all<{ status: string }>("SELECT status FROM posts WHERE plan_id = ?", planId).every((r) => r.status === "paused")).toBe(true);
    // Pendant la pause, un autre contenu prend la place du jour de « b » : à la reprise, « b » ne part pas.
    post(p.id, day(3, 14), "scheduled");
    const r = setPlanPaused(planId, false);
    expect(r.resumed).toEqual([a]);
    expect(r.kept.map((k) => k.id)).toEqual([b]);
    expect(one<{ status: string; error: string }>("SELECT status, error FROM posts WHERE id = ?", b)).toMatchObject({ status: "approved", error: expect.stringMatching(/limite du forfait/) });

    // Conversation : « mets les vidéos le mardi » — un seul contenu par jour en Créer, les autres restent à leur date.
    const q = await project("creer");
    const plan2 = id();
    run("INSERT INTO content_plans (id, project_id, params, strategy, status, created_at, engine, updated_at) VALUES (?,?,?,?,?,?,?,?)", plan2, q.id, "{}", "{}", "ready", now(), "v2", now());
    const ids = [1, 2, 3, 4, 5].map((n) => post(q.id, day(n), "approved", null, "instagram", plan2));
    for (const x of ids) run("UPDATE posts SET format = 'reel' WHERE id = ?", x);
    const out = await fr(() => applySocialEdit(q, "mets les vidéos le mardi", mockSocialDeps().deps, { planId: plan2 }));
    const dates = all<{ scheduled_at: number }>(`SELECT scheduled_at FROM posts WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids).map((x) => x.scheduled_at);
    const perDay = new Map<string, number>();
    for (const d of dates) {
      const k = new Date(d).toISOString().slice(0, 10);
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
    }
    expect(Math.max(...perDay.values())).toBe(1);
    expect(out.by).toBe("local");
    expect(out.refused?.length ?? 0).toBeGreaterThan(0);
  });

  it("formulaire, demande écrite et automatisation : jamais plus que le forfait ; Découverte : aucune préparation automatique", async () => {
    const p = await project("creer");
    expect(() => gates.assertPerDayRequest(p.id, 3)).toThrow(/1 publication/);
    expect(gates.assertPerDayRequest(p.id, 1)).toBe("creer");
    const r = fr(() => planFromAsk(p, "Prépare 3 publications par jour pendant 30 jours", { maxDays: 7, maxPerDay: 1 }));
    expect(r.request.perDay).toBe(1);
    expect(r.request.days).toBe(7);
    expect(r.notes.join(" ")).toMatch(/limité à 1 par votre forfait/);
    // Dernier rempart dans le planificateur, même appelé directement.
    const direct = fr(() => createPlanV2(p, { startDate: start(), days: 2, perDay: 5, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }] }));
    expect(direct.created).toBe(2);
    expect(direct.warnings.join(" ")).toMatch(/limité à 1 publication/);

    const free = await project(null);
    run("INSERT INTO content_plans (id, project_id, params, strategy, status, created_at, engine, updated_at) VALUES (?,?,?,?,?,?,?,?)", id(), free.id, JSON.stringify({ startDate: start(), days: 7, perDay: 5, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }] }), "{}", "ready", now(), "v2", now());
    const aid = createAutomation(free.id, "prepare_next_week", { perDay: 5 });
    await runDueAutomations();
    expect(one<{ last_result: string }>("SELECT last_result FROM social_automations WHERE id = ?", aid)!.last_result).toMatch(/sans forfait/);
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE project_id = ?", free.id)!.n).toBe(0);
  });
});
