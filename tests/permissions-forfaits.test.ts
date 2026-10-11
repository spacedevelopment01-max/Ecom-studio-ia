/**
 * Forfaits V2 — droits appliqués côté serveur, projet par projet (cahier des charges §8, §14, §21) :
 * thèmes 10/20/30 (le thème actuel est conservé après une baisse de forfait), vidéos (aucune / courtes / avancées),
 * UGC, sections IA, calendrier 7/30/90 jours, 1/3/5 publications programmées par jour, variantes publicitaires.
 */
import { describe, expect, it } from "vitest";

describe("droits des forfaits, vérifiés côté serveur", async () => {
  const { createUser, HttpError } = await import("@/lib/auth");
  const { id, now, one, run } = await import("@/lib/db");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const gates = await import("@/lib/plan-gates");
  const { THEME_ORDER, themeOrderComplete, themeAllowed, planForTheme } = await import("@/lib/theme/theme-access");
  const { PLANS } = await import("@/lib/plans");

  const projectWith = async (plan: "creer" | "vendre" | "dominer" | null) => {
    const u = await createUser(`perm-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const pid = id();
    run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, u.id, "Perm", now(), now());
    if (plan) grantProjectPlan(pid, plan);
    return { u, pid };
  };

  it("bibliothèque : 30 thèmes réels, 10 / 20 / 30 sélectionnables selon le forfait, prévisualisation seule sans forfait", async () => {
    expect(themeOrderComplete()).toBe(true);
    expect(THEME_ORDER).toHaveLength(30);
    expect([PLANS.creer.themes, PLANS.vendre.themes, PLANS.dominer.themes]).toEqual([10, 20, 30]);
    expect(themeAllowed(null, THEME_ORDER[0])).toBe(false);
    expect(themeAllowed("creer", THEME_ORDER[9])).toBe(true);
    expect(themeAllowed("creer", THEME_ORDER[10])).toBe(false);
    expect(themeAllowed("vendre", THEME_ORDER[19])).toBe(true);
    expect(themeAllowed("vendre", THEME_ORDER[20])).toBe(false);
    expect(THEME_ORDER.every((t) => themeAllowed("dominer", t))).toBe(true);
    expect(planForTheme(THEME_ORDER[25])).toBe("dominer");
    const creer = await projectWith("creer");
    expect(() => gates.assertThemeAllowed(creer.pid, THEME_ORDER[3])).not.toThrow();
    expect(() => gates.assertThemeAllowed(creer.pid, THEME_ORDER[15])).toThrow(/Développer/);
    // Après un changement de forfait à la baisse : le thème déjà utilisé reste, un nouveau thème premium est refusé.
    expect(() => gates.assertThemeAllowed(creer.pid, THEME_ORDER[25], THEME_ORDER[25])).not.toThrow();
    expect(() => gates.assertThemeAllowed(creer.pid, THEME_ORDER[26], THEME_ORDER[25])).toThrow(HttpError);
    const free = await projectWith(null);
    expect(() => gates.assertThemeAllowed(free.pid, THEME_ORDER[0])).toThrow(/forfait/);
  });

  it("le changement de thème hors forfait est aussi refusé dans le worker (chat, écran)", async () => {
    const { switchDirection } = await import("@/lib/engine/shop");
    const creer = await projectWith("creer");
    await expect(switchDirection(null, creer.pid, THEME_ORDER[29])).rejects.toThrow(/Dominer/);
  });

  it("vidéos : Créer = aucune vidéo IA (montage sans IA possible) ; Développer = courtes ; Dominer = avancées + UGC", async () => {
    const creer = await projectWith("creer");
    const vendre = await projectWith("vendre");
    const dominer = await projectWith("dominer");
    expect(() => gates.requireCreationPlan(null, creer.pid, "videos")).toThrow(/Développer/);
    expect(() => gates.requirePlan(null, creer.pid)).not.toThrow();
    expect(gates.requireCreationPlan(null, vendre.pid, "videos")).toBe("vendre");
    expect(() => gates.requireCreationPlan(null, vendre.pid, "ugc")).toThrow(/Dominer/);
    expect(gates.requireCreationPlan(null, dominer.pid, "ugc")).toBe("dominer");
    expect([PLANS.creer.videos, PLANS.vendre.videos, PLANS.dominer.videos]).toEqual(["none", "short", "advanced"]);
    const { SHORT_VIDEO_MAX_S } = await import("@/lib/video-v2/engine");
    expect(SHORT_VIDEO_MAX_S).toBe(30);
  });

  it("sections IA : Développer et Dominer ; Créer modifie et ajoute les sections de la bibliothèque", async () => {
    const creer = await projectWith("creer");
    const vendre = await projectWith("vendre");
    expect(() => gates.assertAiSections(creer.pid)).toThrow(/Développer/);
    expect(gates.assertAiSections(vendre.pid)).toBe("vendre");
  });

  it("calendrier 7 / 30 / 90 jours et 1 / 3 / 5 publications programmées par jour", async () => {
    expect([PLANS.creer.calendarDays, PLANS.vendre.calendarDays, PLANS.dominer.calendarDays]).toEqual([7, 30, 90]);
    expect([PLANS.creer.postsPerDay, PLANS.vendre.postsPerDay, PLANS.dominer.postsPerDay]).toEqual([1, 3, 5]);
    const creer = await projectWith("creer");
    expect(() => gates.assertCalendarDays(null, creer.pid, 8)).toThrow(/7 jours/);
    const dominer = await projectWith("dominer");
    expect(() => gates.assertCalendarDays(null, dominer.pid, 90)).not.toThrow();
    const day = Date.UTC(2031, 0, 15, 10);
    const post = (pid: string, at: number) => {
      const x = id();
      run("INSERT INTO posts (id, project_id, network, format, status, scheduled_at, caption, publish_key, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", x, pid, "instagram", "image", "scheduled", at, "c", `k-${x}`, now(), now());
      return x;
    };
    post(creer.pid, day);
    expect(() => gates.assertPostsPerDay(creer.pid, day + 3_600_000)).toThrow(/1 publication/);
    expect(() => gates.assertPostsPerDay(creer.pid, day + 86_400_000)).not.toThrow();
    for (let i = 0; i < 4; i++) post(dominer.pid, day + i * 60_000);
    expect(() => gates.assertPostsPerDay(dominer.pid, day)).not.toThrow();
    post(dominer.pid, day + 5 * 60_000);
    expect(() => gates.assertPostsPerDay(dominer.pid, day)).toThrow(/5 publication/);
    // Les autres projets du même compte ne sont pas comptés.
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE project_id = ?", creer.pid)!.n).toBe(1);
  });

  it("une valeur envoyée par le navigateur ne donne aucun droit : seul l'abonnement rattaché au projet compte", async () => {
    const creer = await projectWith("creer");
    // Le forfait n'est lu que dans subscriptions (rattachement définitif) — ni la requête, ni les réglages du projet.
    run("UPDATE projects SET settings_json = ? WHERE id = ?", JSON.stringify({ plan: "dominer" }), creer.pid);
    expect(gates.planOfProject(creer.pid)).toBe("creer");
    expect(() => gates.requireCreationPlan(null, creer.pid, "ugc")).toThrow();
  });
});
