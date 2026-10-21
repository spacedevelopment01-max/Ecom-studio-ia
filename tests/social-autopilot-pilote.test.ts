/**
 * « Ma communication automatique » (Autopilot V2) — outils et comptes SIMULÉS : aucune IA réelle, aucune dépense,
 * AUCUNE publication réelle. Vérifie : état réel des réseaux (6 états, jamais « connecté » parce que le code existe),
 * réglages dans les limites du forfait, validation manuelle par défaut, pilote seulement avec consentement exact et
 * tracé, désactivation immédiate, suspension d'un réseau, pause générale, production progressive gratuite, budget,
 * adaptations d'un même contenu non bloquées comme doublons, TikTok sans vidéo, produit retiré / prix modifié,
 * suppression mémorisée, prise en charge atomique par le worker.
 */
import { describe, expect, it } from "vitest";

describe("Autopilot V2 — pilote", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, id, now, one, run } = await import("@/lib/db");
  const { grantProjectPlan } = await import("./communication-choice-fixture");
  const { loadProject, saveCatalog } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const ap = await import("@/lib/social-v2/autopilot");
  const { networkStatus } = await import("@/lib/social-v2/networks");
  const { checkPost } = await import("@/lib/social-v2/quality");
  const { createPlanV2 } = await import("@/lib/social-v2/planner");
  const { editPostV2, deletePostV2, approve } = await import("@/lib/social-v2/engine");
  const { schedulePosts, publishOne } = await import("@/lib/social-v2/scheduler");
  const { usedHooks } = await import("@/lib/social-v2/memory");
  const { fold } = await import("@/lib/seo-v2/lang");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { mockSocialDeps, mockPublisher, fakeImage } = await import("./social-v2-mock");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  async function project(plan: "creer" | "vendre" | "dominer" | null, kind: "cosmetic" | "artisan" = "cosmetic") {
    const u = await createUser(`pilote-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, kind);
    if (plan) grantProjectPlan(pid, plan);
    return loadProject(pid);
  }
  function connect(userId: string, provider: string, o: { status?: string; scopes?: string; expiresAt?: number | null } = {}) {
    const scopes = o.scopes ?? { instagram: "instagram_basic,instagram_content_publish,pages_show_list", facebook: "pages_manage_posts,pages_read_engagement,pages_show_list", tiktok: "video.publish,video.upload", youtube: "https://www.googleapis.com/auth/youtube.upload", pinterest: "pins:write,boards:read" }[provider] ?? "";
    const cid = id();
    run("INSERT INTO connections (id, user_id, provider, external_id, name, access_token, scopes, status, expires_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", cid, userId, provider, `ext-${cid}`, `Compte ${provider} (test)`, null, scopes, o.status ?? "active", o.expiresAt ?? null, now(), now());
    return cid;
  }
  const autoPosts = (pid: string) => all<{ id: string; status: string; media: string; network: string; approved_by: string | null; caption: string; scheduled_at: number }>("SELECT id, status, media, network, approved_by, caption, scheduled_at FROM posts WHERE plan_id = ? ORDER BY scheduled_at", `auto-${pid}`);

  it("réseaux : 6 états réels — à connecter, expirée, autorisation manquante, connecté, publication automatique disponible (non vérifiée), non disponible", async () => {
    const p = await project("vendre");
    expect(networkStatus(p, "instagram").state).toBe("to_connect");
    expect(networkStatus(p, "linkedin").state).toBe("unavailable");
    connect(p.userId, "facebook", { status: "expired" });
    expect(networkStatus(p, "facebook").state).toBe("expired");
    connect(p.userId, "pinterest", { scopes: "boards:read" });
    expect(networkStatus(p, "pinterest")).toMatchObject({ state: "needs_permission", missing: ["pins:write"] });
    connect(p.userId, "instagram");
    const ig = networkStatus(p, "instagram");
    expect(ig).toMatchObject({ state: "auto_available", verified: false });
    expect(ig.note?.fr).toMatch(/Jamais encore vérifiée/);
    const free = await project(null);
    connect(free.userId, "instagram");
    expect(networkStatus(free, "instagram").state).toBe("connected");
  });

  it("réglages : limites du forfait, Découverte = démonstration, objectif changé sans perdre le calendrier", async () => {
    const free = await project(null);
    expect(() => ap.saveSettings(free, { active: true })).toThrow(/forfait actif/);
    const p = await project("creer");
    expect(() => ap.saveSettings(p, { perDay: 3 })).toThrow(/au plus 1/);
    const s = ap.saveSettings(p, { active: true, perDay: 1, horizonDays: 60, platforms: ["instagram"] });
    expect(s.config.horizonDays).toBe(7);
    expect(s.autopilot).toBe(false);
    const { deps } = mockSocialDeps();
    await fr(() => ap.runAutopilot(p, deps));
    const before = autoPosts(p.id).length;
    expect(before).toBeGreaterThan(0);
    ap.saveSettings(p, { goal: "sales" });
    await fr(() => ap.runAutopilot(p, deps));
    expect(autoPosts(p.id).length).toBe(before);
  });

  it("validation manuelle (par défaut) : calendrier préparé, visuels GRATUITS des 3 prochains jours seulement, rien d'approuvé ni d'envoyé", async () => {
    const p = await project("vendre");
    connect(p.userId, "instagram");
    connect(p.userId, "facebook");
    ap.saveSettings(p, { active: true, perDay: 3, horizonDays: 14, platforms: ["instagram", "facebook"] });
    const { deps, log } = mockSocialDeps({ aiActive: true });
    const r = await fr(() => ap.runAutopilot(p, deps));
    expect(r.created).toBe(14 * 3 * 2);
    const rows = autoPosts(p.id);
    // Un contenu éditorial = une création ; ses adaptations Instagram / Facebook en sont des variantes (même groupe).
    expect(new Set(all<{ g: string }>("SELECT group_id g FROM posts WHERE plan_id = ?", `auto-${p.id}`).map((x) => x.g)).size).toBe(14 * 3);
    // Sans accord de dépense : aucun visuel « gratuit » monté par un gabarit (règle : toute image finale est créée
    // par l'IA) ; les publications attendent leur visuel IA.
    const withMedia = rows.filter((x) => x.media !== "[]");
    expect(withMedia.length).toBe(0);
    expect(log.local).toBe(0);
    expect(log.paid).toBe(0);
    expect(rows.some((x) => ["approved", "scheduled"].includes(x.status))).toBe(false);
    // Rien à valider tant que les images n'ont pas été créées par l'IA (avec accord de dépense).
    expect(r.waiting).toBe(0);
    // Relancer : rien n'est recréé.
    expect((await fr(() => ap.runAutopilot(p, deps))).created).toBe(0);
  });

  it("pilote automatique : consentement exact et tracé ; approuve et programme seulement le sans-défaut ; désactivation immédiate", async () => {
    const p = await project("vendre");
    connect(p.userId, "instagram");
    ap.saveSettings(p, { active: true, perDay: 3, horizonDays: 7, platforms: ["instagram"] });
    // Un enregistrement ne suffit jamais à activer le pilote.
    expect(ap.saveSettings(p, { approval: "auto" } as never).autopilot).toBe(false);
    expect(() => ap.enableAutopilot(p, p.userId, "ok vas-y, publie tout")).toThrow(/accord/);
    const s = ap.enableAutopilot(p, p.userId, ap.CONSENT_TEXT.fr);
    expect(s.autopilot).toBe(true);
    expect(s.consent).toMatchObject({ by: p.userId, text: ap.CONSENT_TEXT.fr });
    expect(ap.autopilotLog(p.id).some((l) => l.action === "consent")).toBe(true);

    const { deps } = mockSocialDeps();
    const r = await fr(() => ap.runAutopilot(p, deps));
    const rows = autoPosts(p.id);
    const auto = rows.filter((x) => x.approved_by === "autopilot");
    expect(auto.length).toBe(r.approved);
    // Tout ce que le pilote a approuvé passe le contrôle ; le reste attend le client avec une raison.
    for (const x of auto) expect(checkPost(p, x.id).blocking).toEqual([]);
    for (const x of r.refused) expect(x.reason.length).toBeGreaterThan(3);
    expect(rows.filter((x) => x.status === "scheduled").every((x) => x.approved_by === "autopilot")).toBe(true);

    const off = ap.disableAutopilot(p, p.userId);
    expect(off.autopilot).toBe(false);
    expect(autoPosts(p.id).some((x) => x.approved_by === "autopilot")).toBe(false);
    expect(autoPosts(p.id).some((x) => x.status === "scheduled")).toBe(false);
  });

  it("suspension d'un réseau et pause générale : rien ne part ; reprise revérifiée", async () => {
    const p = await project("vendre");
    const cid = connect(p.userId, "instagram");
    const a = await scheduledPost(p, cid);
    ap.saveSettings(p, { suspended: ["instagram"] });
    expect(statusOf(a)).toBe("paused");
    ap.saveSettings(p, { suspended: [] });
    expect(statusOf(a)).toBe("approved");
    expect(schedulePosts([a], (x) => checkPost(p, x)).scheduled).toEqual([a]);
    ap.pauseAll(p, true);
    expect(statusOf(a)).toBe("paused");
    expect((await fr(() => ap.runAutopilot(p, mockSocialDeps().deps))).skipped).toMatch(/pause/);
    const res = ap.pauseAll(p, false);
    expect(res.resumed).toEqual([a]);
  });

  it("budget : sans IA disponible, visuels gratuits et recharge de 10 € proposée ; avec IA, tâche payante seulement dans le plafond de la semaine", async () => {
    const p = await project("vendre");
    ap.saveSettings(p, { active: true, perDay: 1, horizonDays: 7, platforms: ["instagram"], paidCapEurWeek: 2, visual: "ai_image" });
    const free = mockSocialDeps({ aiActive: false });
    const r = await fr(() => ap.runAutopilot(p, free.deps));
    expect(free.log.paid).toBe(0);
    // Sans IA : aucune image (jamais un gabarit à la place), recharge proposée.
    expect(r.produced).toBe(0);
    expect(free.log.local).toBe(0);
    expect(one<{ body: string }>("SELECT body FROM notifications WHERE project_id = ? AND title LIKE 'Budget IA%'", p.id)!.body).toMatch(/recharge de 10 €/);

    const q = await project("vendre");
    ap.saveSettings(q, { active: true, perDay: 1, horizonDays: 7, platforms: ["instagram"], paidCapEurWeek: 0.5, visual: "ai_image" });
    const paid = mockSocialDeps({ aiActive: true, cost: 100_000 });
    const r1 = await fr(() => ap.runAutopilot(q, paid.deps));
    expect(r1.paidJob).toBeTruthy();
    expect(paid.log.paid).toBe(0); // la dépense passe par la tâche de production (réservation du budget), pas ici
    const job = one<{ payload: string }>("SELECT payload FROM jobs WHERE id = ?", r1.paidJob)!;
    expect(JSON.parse(job.payload).approvedEstimateMicro).toBeLessThanOrEqual(500_000);
    // Nouvelles publications à produire, plafond de la semaine déjà engagé : gratuit.
    run("UPDATE posts SET media = '[]' WHERE plan_id = ?", `auto-${q.id}`);
    const r2 = await fr(() => ap.runAutopilot(q, paid.deps));
    expect(r2.paidJob).toBeNull();
    expect(r2.notes.join(" ")).toMatch(/plafond de la semaine/);
    // Visuel « gratuit » choisi : jamais de tâche payante, même avec un budget saisi.
    const g = await project("vendre");
    ap.saveSettings(g, { active: true, perDay: 1, horizonDays: 7, platforms: ["instagram"], paidCapEurWeek: 5, visual: "free" });
    expect((await fr(() => ap.runAutopilot(g, mockSocialDeps({ aiActive: true }).deps))).paidJob).toBeNull();
  });

  it("qualité : adaptations d'un même contenu non vues comme doublons ; TikTok sans vraie vidéo ne peut pas partir", async () => {
    const p = await project("vendre");
    const r = fr(() => createPlanV2(p, { startDate: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10), days: 1, perDay: 1, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }, { platform: "facebook" }, { platform: "tiktok" }], distribution: "all", structure: "weekly" }));
    const rows = all<{ id: string; network: string }>("SELECT id, network FROM posts WHERE plan_id = ?", r.planId);
    expect(rows).toHaveLength(3);
    for (const x of rows) expect(checkPost(p, x.id).codes).not.toContain("duplicate_hook");
    const tk = rows.find((x) => x.network === "tiktok")!;
    const img = await fakeImage(p, "image.jpg");
    editPostV2(p, tk.id, { media: [img.id] });
    expect(checkPost(p, tk.id).blocking.join(" ")).toMatch(/ne peut pas partir sans vraie vidéo/);
  });

  it("Project Brain : produit retiré → plus promu (bloqué, retenu à l'envoi) ; prix modifié → remis en relecture", async () => {
    const p = await project("vendre");
    if (p.catalog.length < 1) saveCatalog(p.id, [{ key: "serum", name: "Sérum test", category: "", price: 2900, compareAt: null, description: "Sérum de test.", features: [], originalAssetId: null }]);
    const q = loadProject(p.id);
    const r = fr(() => createPlanV2(q, { startDate: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10), days: 7, perDay: 1, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], structure: "weekly" }));
    const about = all<{ id: string; brief: string }>("SELECT id, brief FROM posts WHERE plan_id = ?", r.planId).filter((x) => (JSON.parse(x.brief).items ?? []).length);
    expect(about.length).toBeGreaterThan(0);
    const target = about[0];
    const key = JSON.parse(target.brief).items[0].key as string;
    // Prix modifié
    saveCatalog(q.id, q.catalog.map((c) => (c.key === key ? { ...c, price: (c.price ?? 0) + 500 } : c)));
    expect(checkPost(loadProject(q.id), target.id).codes).toContain("price_changed");
    // Produit retiré
    saveCatalog(q.id, q.catalog.filter((c) => c.key !== key));
    expect(checkPost(loadProject(q.id), target.id).codes).toContain("product_removed");
    // Déjà programmé avant le retrait : retenu au moment de l'envoi, jamais publié.
    const cid = connect(q.userId, "instagram");
    run("UPDATE posts SET status = 'scheduled', connection_id = ?, scheduled_at = ? WHERE id = ?", cid, now() - 1000, target.id);
    const { publisher, sent } = mockPublisher();
    expect((await publishOne(target.id, publisher)).detail).toMatch(/catalogue/);
    expect(sent).toHaveLength(0);
    expect(statusOf(target.id)).toBe("review");
  });

  it("suppression dans le calendrier automatique : la case reste annulée, l'accroche ne revient plus ; le worker prend chaque projet une seule fois", async () => {
    const p = await project("creer");
    ap.saveSettings(p, { active: true, perDay: 1, horizonDays: 7, platforms: ["instagram"] });
    const { deps } = mockSocialDeps();
    await fr(() => ap.runAutopilot(p, deps));
    const victim = autoPosts(p.id)[0];
    deletePostV2(p, victim.id);
    expect(statusOf(victim.id)).toBe("cancelled");
    expect(usedHooks(p.id).has(fold(victim.caption.split("\n")[0]))).toBe(true);
    expect((await fr(() => ap.runAutopilot(p, deps))).created).toBe(0);

    run("UPDATE social_settings SET next_run_at = ? WHERE project_id = ?", now() - 1, p.id);
    const at = now();
    const ran = await Promise.all([ap.runDueAutopilots(() => deps, at), ap.runDueAutopilots(() => deps, at)]);
    expect(ran.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(1);
    expect(all("SELECT 1 FROM social_autopilot_log WHERE project_id = ? AND action = 'run'", p.id)).toHaveLength(1);
  });

  const statusOf = (pid: string) => one<{ status: string }>("SELECT status FROM posts WHERE id = ?", pid)!.status;
  async function scheduledPost(p: ReturnType<typeof loadProject>, cid: string) {
    const r = fr(() => createPlanV2(p, { startDate: new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10), days: 1, perDay: 1, timezone: "Europe/Paris", platforms: [{ platform: "instagram", connectionId: cid }], formatMix: { image: 100 } }));
    const pid = all<{ id: string }>("SELECT id FROM posts WHERE plan_id = ?", r.planId)[0].id;
    const img = await fakeImage(p, `ok-${pid}.jpg`);
    editPostV2(p, pid, { caption: `Contenance : 30 ml. Un geste précis, matin et soir. ${pid}`, title: "Le geste", media: [img.id] });
    expect(approve(p, [pid], p.userId).approved).toEqual([pid]);
    expect(schedulePosts([pid], (x) => checkPost(p, x)).scheduled).toEqual([pid]);
    return pid;
  }
});
