/**
 * Social Engine V2 (phase 9A) — parcours complets avec outils et comptes SIMULÉS : aucune IA, aucune dépense,
 * AUCUNE publication réelle. Vérifie : calendrier de 90 publications sans média payant, idempotence, production
 * gratuite puis payante seulement acceptée et plafonnée, barrière et approbation par version, programmation,
 * publication simulée, absence de doublon (deux workers, redémarrage, délai dépassé), état incertain, jeton expiré,
 * compte révoqué, pause, automatisations, statistiques réelles, retouches en conversation, benchmarks A–E,
 * compatibilité des anciennes publications.
 */
import { describe, expect, it } from "vitest";

describe("Social V2 — parcours", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, id, now, one, run } = await import("@/lib/db");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { createPlanV2 } = await import("@/lib/social-v2/planner");
  const { planFromAsk, approve, editPostV2, applySocialEdit, duplicatePostV2, deletePostV2 } = await import("@/lib/social-v2/engine");
  const { estimateProduction, produceBatch, postsOfPlan } = await import("@/lib/social-v2/production");
  const { checkPost, gatePost, varietyReport } = await import("@/lib/social-v2/quality");
  const { schedulePosts, publishOne, recoverStale, confirmUncertain, enqueueDueV2, setPlanPaused, attemptsOf, unschedule } = await import("@/lib/social-v2/scheduler");
  const { realPublisher } = await import("@/lib/social-v2/deps");
  const { createAutomation, runDueAutomations, setAutomationStatus, listAutomations } = await import("@/lib/social-v2/automations");
  const { socialStats, recordMetrics } = await import("@/lib/social-v2/analytics");
  const { lintClaims } = await import("@/lib/ai/tasks");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { mockSocialDeps, mockPublisher, fakeImage } = await import("./social-v2-mock");
  const { SOCIAL_SCENARIOS, SOCIAL_FIXTURE, SOCIAL_PLAN } = await import("./social-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  async function account(plan: "dominer" | null = "dominer") {
    const u = await createUser(`soc2e-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "S");
    getSubscription(u.id);
    if (plan) run("UPDATE subscriptions SET status = 'active', plan = ? WHERE user_id = ?", plan, u.id);
    syncAllowance(u.id);
    return u;
  }
  function connect(userId: string, provider: string, status = "active") {
    const cid = id();
    run("INSERT INTO connections (id, user_id, provider, external_id, name, access_token, scopes, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", cid, userId, provider, `ext-${cid}`, `Compte ${provider}`, null, "", status, now(), now());
    return cid;
  }
  const start = () => new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  const statusOf = (pid: string) => one<{ status: string }>("SELECT status FROM posts WHERE id = ?", pid)!.status;

  /** Publication prête : média validé, texte sans « à compléter », approuvée, programmée dans 1 minute. */
  async function readyPost(p: ReturnType<typeof loadProject>, provider = "instagram", userId = p.userId) {
    const cid = connect(userId, provider);
    const video = provider === "tiktok" || provider === "youtube";
    const r = fr(() => createPlanV2(p, { startDate: start(), days: 1, perDay: 1, timezone: "Europe/Paris", platforms: [{ platform: provider as never, connectionId: cid }], formatMix: video ? { video: 100 } : { image: 100 } }));
    const pid = postsOfPlan(r.planId)[0];
    const img = await fakeImage(p, `ok-${pid}.jpg`, video ? "video" : "image");
    editPostV2(p, pid, { caption: `Contenance : 30 ml. Un geste précis, matin et soir. ${pid}`, title: "Le geste", media: [img.id] });
    const ap = approve(p, [pid], userId);
    expect(ap.approved).toEqual([pid]);
    run("UPDATE posts SET scheduled_at = ? WHERE id = ?", now() + 60_000, pid);
    expect(schedulePosts([pid], (x) => checkPost(p, x)).scheduled).toEqual([pid]);
    run("UPDATE posts SET scheduled_at = ? WHERE id = ?", now() - 1000, pid);
    return { pid, cid, planId: r.planId };
  }

  it("niveau 1 : 30 jours × 3 = 90 publications planifiées, texte proposé, AUCUN média ni appel d'IA ; relancer ne crée aucun doublon", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const r = fr(() => planFromAsk(p, "Prépare mes publications pour les 30 prochains jours, avec 3 publications par jour, des images, des vidéos et des textes, puis programme-les sur mes comptes connectés."));
    expect(r.created).toBe(90);
    expect(r.notes.join(" ")).toMatch(/après votre approbation/);
    const rows = all<{ status: string; media: string; engine: string; caption: string }>("SELECT status, media, engine, caption FROM posts WHERE plan_id = ?", r.planId);
    expect(rows.every((x) => x.status === "planned" && x.media === "[]" && x.engine === "v2" && x.caption.length > 0)).toBe(true);
    expect(all("SELECT 1 FROM ai_calls WHERE project_id = ?", p.id)).toHaveLength(0);
    const again = fr(() => createPlanV2(p, r.request, { planId: r.planId }));
    expect(again).toMatchObject({ created: 0, existing: 90 });
    const v = varietyReport(p.id, r.planId);
    expect(v.repeatedHooks).toEqual([]);
    expect(Object.keys(v.pillars).length).toBeGreaterThanOrEqual(4);
    expect(v.promoShare).toBeLessThanOrEqual(0.35);
  });

  it("niveau 2 : estimation (gratuit / payant) puis production — gratuite sans accord, payante seulement estimée, acceptée et plafonnée", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const r = fr(() => createPlanV2(p, { startDate: start(), days: 5, perDay: 2, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], formatMix: { image: 100 } }));
    const ids = postsOfPlan(r.planId);
    const { deps, log } = mockSocialDeps({ aiActive: true, cost: 100_000 });
    const est = estimateProduction(p, ids, deps, { allowPaid: true });
    expect(est.posts).toBe(10);
    expect(est.paid).toBeGreaterThan(0);
    expect(est.estimateMicro).toBe(est.paid * 100_000);
    // Sans estimation acceptée : rien de payant.
    const free = await produceBatch(p, ids.slice(0, 4), deps, { allowPaid: true, maxCostEur: 5, approvedEstimateMicro: null });
    expect(free.spentMicro).toBe(0);
    expect(log.paid).toBe(0);
    expect(free.produced).toBe(4);
    // Médias validés déjà dans la bibliothèque : réutilisés avant toute dépense (aucune image repayée).
    const reuse = await produceBatch(p, ids.slice(4, 6), deps, { allowPaid: true, maxCostEur: 5, approvedEstimateMicro: 200_000 });
    expect(reuse.spentMicro).toBe(0);
    expect(reuse.byMethod.library).toBe(2);
    // Bibliothèque vide, estimation acceptée, plafond de 0,25 € : au plus 2 productions payantes, puis rendu local.
    const p2 = loadProject(seedImageFixture(u.id, "cosmetic"));
    const r2 = fr(() => createPlanV2(p2, { startDate: start(), days: 3, perDay: 2, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], formatMix: { image: 100 } }));
    const ids2 = postsOfPlan(r2.planId);
    const capped = mockSocialDeps({ aiActive: true, cost: 100_000 });
    const paid = await produceBatch(p2, ids2, { ...capped.deps, image: async (pp, post, m) => { const out = await capped.deps.image(pp, post, m); run("UPDATE assets SET status = 'review' WHERE id = ?", out.assetId); return out; }, ad: async (pp, post, m) => { const out = await capped.deps.ad(pp, post, m); run("UPDATE assets SET status = 'review' WHERE id = ?", out.assetId); return out; } }, { allowPaid: true, maxCostEur: 0.25, approvedEstimateMicro: 200_000 });
    expect(paid.spentMicro).toBeLessThanOrEqual(250_000);
    expect(capped.log.paid).toBeLessThanOrEqual(2);
    expect(paid.stoppedByCap).toBe(true);
    expect(all<{ media: string }>("SELECT media FROM posts WHERE plan_id = ?", r2.planId).every((x) => x.media !== "[]")).toBe(true);
    expect(free.produced + reuse.produced).toBe(6);
    // IA coupée : aucune dépense même si demandée.
    const off = mockSocialDeps({ aiActive: false });
    expect(estimateProduction(p, ids, off.deps, { allowPaid: true }).notes.join(" ")).toMatch(/IA non disponible/);
  });

  it("barrière : affirmation inventée, information à compléter, média refusé, réel sans vidéo → approbation refusée ; contrôle local = PROVISOIRE", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const r = fr(() => createPlanV2(p, { startDate: start(), days: 1, perDay: 2, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], formatMix: { image: 100 } }));
    const [a, b] = postsOfPlan(r.planId);
    const img = await fakeImage(p, "x.jpg");
    editPostV2(p, a, { caption: "Certifié bio et anti-âge prouvé.", media: [img.id] });
    expect(fr(() => checkPost(p, a)).blocking.join(" ")).toMatch(/non confirmée|à éviter/);
    expect(approve(p, [a], u.id).refused[0].id).toBe(a);
    editPostV2(p, b, { caption: "[À compléter : votre réponse]", media: [img.id] });
    expect(fr(() => checkPost(p, b)).codes).toContain("incomplete");
    run("UPDATE assets SET status = 'rejected' WHERE id = ?", img.id);
    editPostV2(p, b, { caption: "Contenance : 30 ml, au quotidien." });
    expect(fr(() => checkPost(p, b)).codes).toContain("media_rejected");
    const vid = fr(() => createPlanV2(p, { startDate: start(), days: 1, perDay: 1, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], formatMix: { video: 100 } }));
    const v = postsOfPlan(vid.planId)[0];
    const still = await fakeImage(p, "still.jpg");
    editPostV2(p, v, { caption: "Le flacon en mouvement.", media: [still.id] });
    expect(fr(() => checkPost(p, v)).codes).toContain("wrong_media");
    const clean = await fakeImage(p, "clean.jpg");
    editPostV2(p, b, { media: [clean.id] });
    const ck = fr(() => checkPost(p, b));
    const g = gatePost(ck);
    expect(g.verdict).toBe("PROVISIONAL");
  });

  it("approbation par version et programmation : compte actif requis, LinkedIn en export, modification après approbation → nouvelle approbation", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const { pid } = await readyPost(p);
    expect(statusOf(pid)).toBe("scheduled");
    // Déplacer la date ne change pas la version approuvée.
    expect(editPostV2(p, pid, { scheduledAt: now() + 3_600_000 }).reapproval).toBe(false);
    expect(statusOf(pid)).toBe("scheduled");
    // Modifier le texte : retour « à valider », programmation refusée tant que non réapprouvée.
    expect(editPostV2(p, pid, { caption: "Contenance : 30 ml. Nouveau texte." }).reapproval).toBe(true);
    expect(statusOf(pid)).toBe("review");
    expect(schedulePosts([pid], (x) => checkPost(p, x)).refused[0].reason).toMatch(/à approuver/);
    // LinkedIn : jamais programmé (export).
    const li = fr(() => createPlanV2(p, { startDate: start(), days: 1, perDay: 1, timezone: "Europe/Paris", platforms: [{ platform: "linkedin" }] }));
    const lp = postsOfPlan(li.planId)[0];
    editPostV2(p, lp, { caption: "Contenance : 30 ml." });
    approve(p, [lp], u.id);
    expect(schedulePosts([lp], (x) => checkPost(p, x)).refused[0].reason).toMatch(/export/);
    // Compte expiré : refus clair.
    const exp = connect(u.id, "facebook", "expired");
    const fb = fr(() => createPlanV2(p, { startDate: start(), days: 1, perDay: 1, timezone: "Europe/Paris", platforms: [{ platform: "facebook", connectionId: exp }] }));
    const fp = postsOfPlan(fb.planId)[0];
    editPostV2(p, fp, { caption: "Une page Facebook, un texte simple." });
    approve(p, [fp], u.id);
    expect(schedulePosts([fp], (x) => checkPost(p, x)).refused[0].reason).toMatch(/reconnecter/);
  });

  it("publication simulée : publiée une seule fois, identifiant distant, journal ; rejouer ne renvoie rien", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const { pid } = await readyPost(p);
    const { publisher, sent } = mockPublisher();
    expect((await publishOne(pid, publisher)).outcome).toBe("published");
    expect((await publishOne(pid, publisher)).outcome).toBe("skipped");
    expect(sent).toEqual([pid]);
    const row = one<{ status: string; remote_id: string; remote_url: string }>("SELECT status, remote_id, remote_url FROM posts WHERE id = ?", pid)!;
    expect(row).toMatchObject({ status: "published", remote_id: `remote-${pid}` });
    expect(attemptsOf(pid).map((a) => a.outcome)).toEqual(["published"]);
  });

  it("deux workers sur la même publication : un seul envoi", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const { pid } = await readyPost(p);
    const { publisher, sent } = mockPublisher({ delayMs: 30 });
    const out = await Promise.all([publishOne(pid, publisher), publishOne(pid, publisher), publishOne(pid, publisher)]);
    expect(sent).toHaveLength(1);
    expect(out.filter((o) => o.outcome === "published")).toHaveLength(1);
  });

  it("délai dépassé : plateforme non vérifiable → INCERTAIN, aucun nouvel envoi ; vérifiable → retrouvée (publiée) ou absente (nouvel essai)", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const a = await readyPost(p, "tiktok");
    const m1 = mockPublisher({ mode: "timeout" });
    expect((await publishOne(a.pid, m1.publisher)).outcome).toBe("uncertain");
    expect(statusOf(a.pid)).toBe("uncertain");
    expect(enqueueDueV2()).toBeGreaterThanOrEqual(0);
    expect((await publishOne(a.pid, m1.publisher)).outcome).toBe("skipped");
    expect(m1.sent).toHaveLength(1);
    confirmUncertain(a.pid, true, "https://example.test/vu");
    expect(statusOf(a.pid)).toBe("published");
    const b = await readyPost(p, "instagram");
    const m2 = mockPublisher({ mode: "timeout", verifiable: true, existing: "ig-123" });
    const r2 = await publishOne(b.pid, m2.publisher);
    expect(r2).toMatchObject({ outcome: "published", deduplicated: true, remoteId: "ig-123" });
    const c = await readyPost(p, "facebook");
    const m3 = mockPublisher({ mode: "timeout", verifiable: true, existing: null });
    expect((await publishOne(c.pid, m3.publisher)).outcome).toBe("retry");
    expect(statusOf(c.pid)).toBe("scheduled");
  });

  it("limite de débit → nouvel essai plus tard ; refus de la plateforme → échec ; jeton expiré → compte à reconnecter ; compte révoqué → aucun envoi", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const a = await readyPost(p);
    expect((await publishOne(a.pid, mockPublisher({ mode: "rate" }).publisher)).outcome).toBe("retry");
    expect(one<{ scheduled_at: number }>("SELECT scheduled_at FROM posts WHERE id = ?", a.pid)!.scheduled_at).toBeGreaterThan(now());
    const b = await readyPost(p);
    expect((await publishOne(b.pid, mockPublisher({ mode: "permanent" }).publisher)).outcome).toBe("failed");
    const c = await readyPost(p);
    expect((await publishOne(c.pid, mockPublisher({ mode: "reconnect" }).publisher)).outcome).toBe("failed");
    expect(one<{ status: string }>("SELECT status FROM connections WHERE id = ?", c.cid)!.status).toBe("expired");
    const d = await readyPost(p);
    run("UPDATE connections SET status = 'revoked' WHERE id = ?", d.cid);
    const m = mockPublisher();
    expect((await publishOne(d.pid, m.publisher)).outcome).toBe("failed");
    expect(m.sent).toHaveLength(0);
  });

  it("worker arrêté pendant l'envoi (verrou orphelin) : reprise sans renvoi à l'aveugle ; serveur redémarré avant l'échéance : rien de perdu", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const a = await readyPost(p, "tiktok");
    run("UPDATE posts SET status = 'publishing', lock_token = 'mort', locked_at = ? WHERE id = ?", now() - 3_600_000, a.pid);
    run("INSERT INTO post_attempts (id, post_id, attempt, lock_token, started_at, outcome) VALUES (?,?,?,?,?,?)", id(), a.pid, 1, "mort", now() - 3_600_000, "sending");
    const m = mockPublisher();
    expect(await recoverStale(m.publisher)).toBeGreaterThanOrEqual(1);
    expect(statusOf(a.pid)).toBe("uncertain");
    expect(m.sent).toHaveLength(0);
    // Vérifiable et retrouvée : publiée sans nouvel envoi.
    const b = await readyPost(p, "instagram");
    run("UPDATE posts SET status = 'publishing', lock_token = 'mort2', locked_at = ? WHERE id = ?", now() - 3_600_000, b.pid);
    await recoverStale(mockPublisher({ verifiable: true, existing: "ig-9" }).publisher);
    expect(one<{ status: string; remote_id: string }>("SELECT status, remote_id FROM posts WHERE id = ?", b.pid)).toMatchObject({ status: "published", remote_id: "ig-9" });
    // Redémarrage avant l'échéance : la publication programmée est toujours en base et repart à l'heure.
    const c = await readyPost(p);
    expect(statusOf(c.pid)).toBe("scheduled");
    expect(enqueueDueV2()).toBeGreaterThanOrEqual(1);
    expect(one("SELECT 1 FROM jobs WHERE type = 'post.publish' AND payload LIKE ?", `%${c.pid}%`)).toBeTruthy();
  });

  it("calendrier en pause : rien ne part ; reprise ; contenu modifié après approbation alors que programmé : jamais publié", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const a = await readyPost(p);
    setPlanPaused(a.planId, true);
    expect(statusOf(a.pid)).toBe("paused");
    const m = mockPublisher();
    expect((await publishOne(a.pid, m.publisher)).outcome).toBe("skipped");
    expect(m.sent).toHaveLength(0);
    setPlanPaused(a.planId, false);
    const b = await readyPost(p);
    run("UPDATE posts SET caption = 'texte changé en base' WHERE id = ?", b.pid);
    expect((await publishOne(b.pid, m.publisher)).detail).toMatch(/version non approuvée/);
    expect(statusOf(b.pid)).toBe("review");
    expect(m.sent).toHaveLength(0);
  });

  it("sans forfait : jamais publiée ; publieur réel refusé dans les tests", async () => {
    const u = await account(null);
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const pro = await account();
    const a = await readyPost(p, "instagram", u.id);
    expect((await publishOne(a.pid, mockPublisher().publisher)).detail).toBe("sans forfait");
    await expect(realPublisher.publish({} as never, {} as never)).rejects.toThrow(/désactivée/);
    expect(pro.id).toBeTruthy();
  });

  it("automatisations persistantes : semaine suivante en brouillons (0 €), programmation des seules versions approuvées, pause", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    fr(() => createPlanV2(p, { startDate: start(), days: 3, perDay: 1, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }] }));
    const prep = createAutomation(p.id, "prepare_next_week");
    const sched = createAutomation(p.id, "schedule_approved");
    const a = await readyPost(p);
    unschedule([a.pid]);
    expect(statusOf(a.pid)).toBe("approved");
    run("UPDATE posts SET scheduled_at = ? WHERE id = ?", now() + 3_600_000, a.pid);
    await fr(() => runDueAutomations());
    expect(statusOf(a.pid)).toBe("scheduled");
    const drafts = all<{ status: string }>("SELECT status FROM posts WHERE plan_id LIKE ?", `auto-${prep}-%`);
    expect(drafts.length).toBe(7);
    expect(drafts.every((d) => d.status === "planned")).toBe(true);
    expect(all("SELECT 1 FROM ai_calls WHERE project_id = ?", p.id)).toHaveLength(0);
    setAutomationStatus(p.id, sched, "paused");
    expect(listAutomations(p.id).find((x) => x.id === sched)!.status).toBe("paused");
  });

  it("statistiques : comptes réels du studio ; métriques « non connecté » / « indisponible » tant qu'aucune plateforme ne les fournit", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const a = await readyPost(p);
    await publishOne(a.pid, mockPublisher().publisher);
    const s = socialStats(p.id, u.id);
    expect(s.counts.published).toBe(1);
    const ig = s.byPlatform.find((x) => x.platform === "instagram")!;
    expect(ig.connected).toBe(true);
    expect(ig.metrics.impressions).toEqual({ state: "unavailable", value: null });
    recordMetrics(a.pid, { impressions: 120 }, "test");
    expect(socialStats(p.id, u.id).byPlatform.find((x) => x.platform === "instagram")!.metrics.impressions).toEqual({ state: "available", value: 120 });
    expect(JSON.stringify(s)).not.toMatch(/"reach":\{"state":"available"/);
  });

  it("retouches en conversation : dimanche supprimé, vidéos au vendredi, 2 par jour au lieu de 3, images remplacées — sans IA ; réécriture IA estimée, confirmée, refusée si elle invente", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const r = fr(() => createPlanV2(p, { startDate: start(), days: 14, perDay: 3, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], formatMix: { image: 60, video: 40 } }));
    const { deps, log } = mockSocialDeps({ aiActive: true });
    const sun = await fr(() => applySocialEdit(p, "Supprime les publications du dimanche", deps));
    expect(sun.by).toBe("local");
    expect(sun.ids.length).toBe(6);
    const vids = await fr(() => applySocialEdit(p, "Mets les vidéos le vendredi", deps));
    expect(vids.applied).toBe(true);
    const days = all<{ d: string }>("SELECT strftime('%w', scheduled_at / 1000, 'unixepoch') d FROM posts WHERE plan_id = ? AND format = 'reel' AND status != 'cancelled'", r.planId);
    expect(days.every((x) => x.d === "5")).toBe(true);
    const red = await fr(() => applySocialEdit(p, "Programme deux publications par jour au lieu de trois", deps));
    expect(red.by).toBe("local");
    const counts = new Map<string, number>();
    for (const x of all<{ scheduled_at: number }>("SELECT scheduled_at FROM posts WHERE plan_id = ? AND status != 'cancelled'", r.planId)) {
      const d = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short" }).format(x.scheduled_at);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    const rep = await fr(() => applySocialEdit(p, "Remplace les images des trois prochaines publications", deps));
    expect(rep.ids).toHaveLength(3);
    expect(log.local + log.paid).toBeGreaterThanOrEqual(1);
    expect(log.rewrite).toBe(0);
    const ask = await fr(() => applySocialEdit(p, "Change uniquement le texte de la publication de demain", deps));
    expect(ask.needsConfirm).toBe(true);
    expect(log.rewrite).toBe(0);
    const ok2 = await fr(() => applySocialEdit(p, "Rends les publications plus premium", deps, { confirm: true, maxCostEur: 0.1 }));
    expect(ok2.by).toBe("ai");
    expect(ok2.costMicro).toBeLessThanOrEqual(100_000);
    const liar = mockSocialDeps({ aiActive: true, rewrite: (c) => `${c} Certifié bio et cliniquement prouvé.` });
    const no = await fr(() => applySocialEdit(p, "Rends les publications plus premium", liar.deps, { confirm: true, maxCostEur: 0.05 }));
    expect(no.refused?.join(" ")).toMatch(/affirmation non confirmée/);
    const off = await fr(() => applySocialEdit(p, "Rends les publications plus premium", mockSocialDeps({ aiActive: false }).deps));
    expect(off.needsAi).toBe(true);
  });

  it("édition manuelle protégée, duplication, suppression ; publication envoyée jamais modifiable ; média d'un autre projet refusé", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const other = loadProject(seedImageFixture(u.id, "hightech"));
    const foreign = await fakeImage(other, "autre.jpg");
    const r = fr(() => createPlanV2(p, { startDate: start(), days: 1, perDay: 2, timezone: "Europe/Paris", platforms: [{ platform: "facebook" }] }));
    const [a, b] = postsOfPlan(r.planId);
    expect(() => editPostV2(p, a, { media: [foreign.id] })).toThrow(/étranger/);
    editPostV2(p, a, { caption: "Mon texte." });
    expect(one<{ user_edited: number }>("SELECT user_edited FROM posts WHERE id = ?", a)!.user_edited).toBe(1);
    const d = duplicatePostV2(p, a);
    expect(one<{ caption: string }>("SELECT caption FROM posts WHERE id = ?", d)!.caption).toBe("Mon texte.");
    deletePostV2(p, b);
    expect(one("SELECT 1 FROM posts WHERE id = ?", b)).toBeFalsy();
    run("UPDATE posts SET status = 'published' WHERE id = ?", a);
    expect(() => editPostV2(p, a, { caption: "x" })).toThrow(/déjà envoyée/);
    expect(() => deletePostV2(p, a)).toThrow(/historique/);
    expect(() => approve(other, [d], u.id)).not.toThrow();
    expect(approve(other, [d], u.id).approved).toEqual([]);
  });

  it("compatibilité : une ancienne publication (V1) programmée part toujours (approbation par date), une seule fois", async () => {
    const u = await account();
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const cid = connect(u.id, "facebook");
    const pid = id();
    run("INSERT INTO posts (id, project_id, connection_id, network, format, status, scheduled_at, timezone, title, caption, hashtags, media, publish_key, approved_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", pid, p.id, cid, "facebook", "text", "scheduled", now() - 1000, "Europe/Paris", "", "Ancienne publication.", "", "[]", `manual:${pid}`, now(), now(), now());
    const m = mockPublisher();
    expect((await publishOne(pid, m.publisher)).outcome).toBe("published");
    expect((await publishOne(pid, m.publisher)).outcome).toBe("skipped");
    expect(m.sent).toEqual([pid]);
  });

  it("benchmarks simulés A–E : volume demandé, stratégie du métier, aucune affirmation inventée, variété, réseaux adaptés", async () => {
    for (const s of SOCIAL_SCENARIOS) {
      const u = await account();
      const p = loadProject(seedImageFixture(u.id, SOCIAL_FIXTURE[s]));
      const c = SOCIAL_PLAN[s];
      const r = fr(() => createPlanV2(p, { startDate: start(), days: c.days, perDay: c.perDay, timezone: "Europe/Paris", platforms: c.platforms.map((platform) => ({ platform })), formatMix: c.mix }));
      expect(r.created, s).toBe(c.days * c.perDay);
      expect(r.strategy.archetype, s).toBe(c.archetype);
      const rows = all<{ network: string; format: string; title: string; caption: string; hashtags: string }>("SELECT network, format, title, caption, hashtags FROM posts WHERE plan_id = ?", r.planId);
      for (const x of rows) {
        expect(fr(() => lintClaims(`${x.title}\n${x.caption}`, p)), `${s} ${x.caption}`).toEqual([]);
        if (x.network === "tiktok") expect(x.format).toBe("video");
        if (x.network === "youtube") expect(x.format).toBe("short");
        if (x.network === "instagram") expect(x.caption).not.toMatch(/https?:\/\//);
        expect(x.hashtags.split(" ").filter(Boolean).length).toBeLessThanOrEqual(5);
      }
      if (s === "A") expect(rows.map((x) => x.caption).join(" ")).not.toMatch(/RGE|certifi|qualifi|ans d'expérience|chantier réalisé/i);
      if (s === "D") expect(rows.map((x) => x.caption).join(" ")).not.toMatch(/soirée|concert|menu spécial/i);
      if (s === "E") expect(r.warnings.join(" ")).toMatch(/LinkedIn.*export/);
      expect(varietyReport(p.id, r.planId).repeatedHooks, s).toEqual([]);
    }
  });
});
