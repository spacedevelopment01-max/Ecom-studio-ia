/**
 * Les trois publications de la marque finie deviennent les premières du calendrier (référence du propriétaire, partie
 * 13 ; décision appliquée le 22 novembre 2026), offertes : aucune image recréée, aucun appel payant, aucune publication
 * réelle. Une image refusée à la relecture (absente de la planche) n'y va jamais.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("Calendrier : les publications de la marque d'abord, offertes", async () => {
  const { all, one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { createManualPost } = await import("@/lib/social-v2/manual");
  const { createUser } = await import("@/lib/auth");
  const { seedCutout, seedImageFixture } = await import("./image-v2-fixtures");
  const { grantProjectPlan } = await import("./communication-choice-fixture");
  const { threadFor } = await import("@/lib/syna-agent/thread");
  const J = await import("@/lib/syna-agent/journey");
  const C = await import("@/lib/syna-agent/calendar");
  const M = await import("@/lib/syna-agent/publications-de-la-marque");
  const { calendarTools } = await import("@/lib/syna-agent/tools/calendar");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const plan = calendarTools.find((t) => t.name === "calendar.plan")!;

  beforeEach(() => vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Aucun appel réseau permis"); })));
  afterEach(() => vi.unstubAllGlobals());

  const spend = () => ({ jobs: one<{ n: number }>("SELECT COUNT(*) n FROM jobs")!.n, calls: one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n });

  async function setup() {
    const u = await createUser(`cal-marque-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "M");
    const pid = seedImageFixture(u.id, "cosmetic");
    grantProjectPlan(pid, "dominer");
    const user = one<any>("SELECT * FROM users WHERE id=?", u.id);
    const cid = threadFor(user, pid);
    const [a0, a2, other] = [await seedCutout(u.id, pid, "#C77B30"), await seedCutout(u.id, pid, "#1D4ED8"), await seedCutout(u.id, pid, "#16A34A")];
    // La planche de la marque finie : la 2e publication a été refusée à la relecture (pas d'image), elle n'existe pas.
    J.updateJourney(cid, (x) => {
      x.outside = false;
      x.identities = { round: 1, issues: [], comparison: "", at: 1, list: [{ key: "A", name: "Rive", board: { posts: [{ text: "Le sérum se pose le soir, sur une peau encore tiède. Découvre-le maintenant.", look: "fond" }, { text: "Refusée à la relecture.", look: "couleur" }, { text: "Trois gouttes suffisent, et la peau boit tout.", look: "motif" }], images: { posts: [{ id: a0, w: 1024, h: 1280 }, null, { id: a2, w: 1024, h: 1280 }] } } }] } as any;
      x.identityChoice = { key: "A", mix: {}, at: 1 } as any;
    });
    // Une publication ordinaire déjà prête (étape 9).
    const p = loadProject(pid);
    createManualPost(p, u.id, { network: "instagram", format: "image", title: "Publication", caption: "Un détail du flacon, vu de près.", hashtags: "", media: [other] }, { brief: { serie: 1 } });
    const ctx = { user: u, projectId: pid, conversationId: cid, runId: "test", attachment: () => null } as any;
    return { u, pid, cid, ctx };
  }

  it("ouvrent le calendrier, dans l'ordre de la planche, sur Instagram et Facebook, sans appel payant ni ordre en fin de texte", async () => {
    const s = await setup();
    const before = spend();
    expect(M.publicationsDeLaMarque(J.journeyOf(s.cid)).map((x) => x.index)).toEqual([0, 2]);
    const r: any = await fr(() => plan.run(s.ctx, plan.args.parse({ days: 7, perDay: 1, networks: ["instagram", "facebook"] })));
    expect(r.ok).toBe(true);
    expect(r.summary).toMatch(/^Les 2 publications de ta marque ouvrent le calendrier, offertes\./);
    const cal = C.readCalendar(s.pid)!;
    const order = [...new Set([...cal.entries].sort((a, b) => a.at - b.at).map((e) => e.unit))];
    expect(order.slice(0, 2)).toEqual(["marque:0", "marque:2"]);
    expect(order.length).toBe(3);
    expect(cal.entries.filter((e) => e.unit === "marque:0").map((e) => e.network).sort()).toEqual(["facebook", "instagram"]);
    // Le texte de la planche, sans l'ordre de la fin ; aucun mot-dièse ; offerte et marquée comme venant de la marque.
    const row = one<any>("SELECT caption, hashtags, brief, status FROM posts WHERE id=?", M.idPublicationDeLaMarque(s.pid, 0, "instagram"));
    expect(row.caption).toBe("Le sérum se pose le soir, sur une peau encore tiède.");
    expect(row.hashtags).toBe("");
    expect(JSON.parse(row.brief)).toMatchObject({ marque: true, offerte: true, serie: "La marque" });
    expect(row.status).toBe("review");
    expect(spend()).toEqual(before);
    expect(all("SELECT id FROM posts WHERE project_id=? AND status IN ('scheduled','publishing','published')", s.pid)).toHaveLength(0);
    // Refaire le calendrier ne les ajoute pas deux fois.
    await fr(() => plan.run(s.ctx, plan.args.parse({ days: 7, perDay: 1, networks: ["instagram", "facebook"] })));
    expect(all("SELECT id FROM posts WHERE project_id=? AND id LIKE 'marque-%'", s.pid)).toHaveLength(4);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sans Instagram ni Facebook, elles ne sont pas placées et SINA le dit", async () => {
    const s = await setup();
    const p = loadProject(s.pid);
    const r = M.offrirLesPublicationsDeLaMarque(p, s.u.id, J.journeyOf(s.cid), ["tiktok"]);
    expect(r.added).toEqual([]);
    expect(r.notes.join(" ")).toMatch(/Instagram et Facebook/);
  });
});
