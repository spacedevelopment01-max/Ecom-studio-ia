/**
 * « Rien en fonction dans modifier le calendrier en une phrase » (propriétaire : « efface tout à partir du 19 octobre
 * 2026 » ne faisait rien, sans message). Phrases comprises localement, sans IA, en français et en anglais ; toute
 * suppression demande une confirmation ; les publications envoyées ne sont jamais touchées ; une phrase non comprise
 * reçoit des exemples ; une retouche IA montre son coût en % du budget IA et attend l'accord. IA simulée.
 */
import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
let aiOn = false;
vi.mock("@/lib/ai/access", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/access")>()), aiActiveFor: () => aiOn }));

describe("Modifier le calendrier en une phrase", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { all, one, run } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { createPlanV2 } = await import("@/lib/social-v2/planner");
  const { applySocialEdit } = await import("@/lib/social-v2/engine");
  const { findDates, parsePeriod } = await import("@/lib/social-v2/edit-dates");
  const { attachFreeVisuals } = await import("@/lib/social-v2/plan-visuals");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { mockSocialDeps } = await import("./social-v2-mock");
  const social = await import("@/app/api/projects/[id]/social/v2/route");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const en = <T,>(fn: () => T) => runWithLang({ ui: "en", content: "en" }, fn);
  // Calendrier de mars 2027, demande faite le 25 février 2027 (dates sans année = 2027).
  const AT = Date.parse("2027-02-25T09:00:00Z");
  const TZ = "Europe/Paris";
  const project = async () => {
    const u = await createUser(`cal1-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "C");
    sessionUser = { ...u, role: "client" };
    const pid = seedImageFixture(u.id, "cosmetic");
    grantProjectPlan(pid, "dominer");
    return loadProject(pid);
  };
  const plan = (p: ReturnType<typeof loadProject>, o: { perDay?: number; mix?: Record<string, number> } = {}) =>
    fr(() => createPlanV2(p, { startDate: "2027-03-01", endDate: "2027-03-31", perDay: o.perDay ?? 2, timezone: TZ, platforms: [{ platform: "instagram" }], formatMix: o.mix ?? { image: 60, video: 40 } }));
  const alive = (planId: string) => all<{ id: string; scheduled_at: number; status: string; format: string; media: string }>("SELECT id, scheduled_at, status, format, media FROM posts WHERE plan_id = ? AND status != 'cancelled' ORDER BY scheduled_at", planId);
  const ymd = (t: number) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(t);
  const dow = (t: number) => new Date(`${ymd(t)}T12:00:00Z`).getUTCDay();

  it("dates en clair (FR / EN, avec ou sans année)", () => {
    const today = "2027-02-25";
    expect(findDates("efface tout à partir du 19 octobre 2026", today)).toEqual(["2026-10-19"]);
    expect(findDates("à partir du 19 mars", today)).toEqual(["2027-03-19"]);
    expect(findDates("à partir du 1er février", today)).toEqual(["2028-02-01"]);
    expect(findDates("du 19 au 25 mars", today)).toEqual(["2027-03-19", "2027-03-25"]);
    expect(findDates("du 28/12 au 3/01", today)).toEqual(["2027-12-28", "2028-01-03"]);
    expect(findDates("from March 19 to 25", today)).toEqual(["2027-03-19", "2027-03-25"]);
    expect(findDates("delete everything from October 19, 2026", today)).toEqual(["2026-10-19"]);
    expect(findDates("between Mar 5th and April 2nd", today)).toEqual(["2027-03-05", "2027-04-02"]);
    expect(findDates("le 2027-03-07", today)).toEqual(["2027-03-07"]);
    expect(findDates("supprime les publications du dimanche", today)).toEqual([]);
    const from = parsePeriod("efface tout à partir du 19 mars", AT, TZ)!;
    expect(ymd(from.from!)).toBe("2027-03-19");
    expect(from.to).toBeNull();
    const until = parsePeriod("delete until March 10", AT, TZ)!;
    expect(until.from).toBeNull();
    expect(ymd(until.to! - 1)).toBe("2027-03-10");
  });

  it("supprimer : « tout à partir du … » (la phrase du propriétaire), confirmation obligatoire, publications envoyées jamais touchées", async () => {
    const p = await project();
    const r = plan(p);
    const { deps, log } = mockSocialDeps({ aiActive: false });
    const sent = alive(r.planId).filter((x) => ymd(x.scheduled_at) >= "2027-03-20").slice(0, 2);
    run("UPDATE posts SET status = 'published' WHERE id = ?", sent[0].id);
    run("UPDATE posts SET status = 'publishing' WHERE id = ?", sent[1].id);
    const target = alive(r.planId).filter((x) => ymd(x.scheduled_at) >= "2027-03-19" && !sent.some((s) => s.id === x.id));
    const ask = await fr(() => applySocialEdit(p, "efface tout à partir du 19 mars 2027", deps, { at: AT }));
    expect(ask).toMatchObject({ applied: false, needsConfirm: true, confirmKind: "delete" });
    expect(ask.ids.length).toBe(target.length);
    expect(ask.summary).toBe(`${target.length} publication(s) du 19/03 au 31/03 seront supprimées. Les publications déjà publiées ou en cours de publication ne sont pas touchées. Confirmer ?`);
    // Rien n'a bougé avant la confirmation.
    expect(alive(r.planId)).toHaveLength(62);
    const done = await fr(() => applySocialEdit(p, "efface tout à partir du 19 mars 2027", deps, { at: AT, confirm: true }));
    expect(done.applied).toBe(true);
    const left = alive(r.planId);
    expect(left.filter((x) => ymd(x.scheduled_at) >= "2027-03-19").map((x) => x.status).sort()).toEqual(["published", "publishing"]);
    expect(left.filter((x) => ymd(x.scheduled_at) < "2027-03-19")).toHaveLength(36);
    expect(log.paid + log.rewrite + log.aiPost).toBe(0);
  });

  it("supprimer en anglais, « du … au … », « le dimanche », « tout »", async () => {
    const p = await project();
    const r = plan(p);
    const { deps } = mockSocialDeps();
    const range = await en(() => applySocialEdit(p, "Delete posts from March 5 to 7", deps, { at: AT }));
    expect(range.needsConfirm).toBe(true);
    expect(range.ids).toHaveLength(6);
    expect(range.summary).toMatch(/^6 post\(s\) from 05\/03 to 07\/03 will be deleted\..*Confirm\?$/);
    const rangeFr = await fr(() => applySocialEdit(p, "supprime les publications du 5 au 7 mars", deps, { at: AT }));
    expect(rangeFr.ids.sort()).toEqual(range.ids.sort());
    const sun = await fr(() => applySocialEdit(p, "supprime les publications le dimanche", deps, { at: AT }));
    expect(sun.ids.length).toBe(8); // 4 dimanches en mars 2027 × 2
    const sunEn = await en(() => applySocialEdit(p, "delete posts on Sundays", deps, { at: AT }));
    expect(sunEn.ids.sort()).toEqual(sun.ids.sort());
    await fr(() => applySocialEdit(p, "supprime les publications le dimanche", deps, { at: AT, confirm: true }));
    expect(alive(r.planId).every((x) => dow(x.scheduled_at) !== 0)).toBe(true);
    const everything = await en(() => applySocialEdit(p, "Clear everything", deps, { at: AT }));
    expect(everything.ids).toHaveLength(alive(r.planId).length);
    await en(() => applySocialEdit(p, "Clear everything", deps, { at: AT, confirm: true }));
    expect(alive(r.planId)).toHaveLength(0);
  });

  it("déplacer les vidéos à un jour donné (FR / EN)", async () => {
    const p = await project();
    // Dates proches (le forfait limite les déplacements à son horizon de calendrier, compté depuis aujourd'hui).
    const start = new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10);
    const end = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const r = fr(() => createPlanV2(p, { startDate: start, endDate: end, perDay: 1, timezone: TZ, platforms: [{ platform: "instagram" }], formatMix: { image: 70, video: 30 } }));
    const { deps } = mockSocialDeps();
    const fri = await fr(() => applySocialEdit(p, "Mets les vidéos le vendredi", deps));
    expect(fri.by).toBe("local");
    expect(fri.refused ?? []).toHaveLength(0);
    const vids = alive(r.planId).filter((x) => ["video", "reel", "short"].includes(x.format));
    const moved = vids.filter((v) => !(fri.refused ?? []).some((x) => x.startsWith(v.id)));
    expect(moved.length).toBeGreaterThan(0);
    expect(moved.every((v) => dow(v.scheduled_at) === 5)).toBe(true);
    const tue = await en(() => applySocialEdit(p, "Move the videos to Tuesday", deps));
    expect(tue.summary).toMatch(/video\(s\) moved to Tuesday/);
  });

  it("changer le nombre de publications par jour : confirmation, puis au plus N par jour ; augmenter renvoie vers Planifier", async () => {
    const p = await project();
    const r = plan(p, { perDay: 3 });
    const { deps } = mockSocialDeps();
    const ask = await fr(() => applySocialEdit(p, "deux publications par jour au lieu de trois", deps, { at: AT }));
    expect(ask).toMatchObject({ needsConfirm: true, confirmKind: "delete" });
    expect(ask.ids).toHaveLength(31);
    expect(ask.summary).toMatch(/31 publication\(s\) du 01\/03 au 31\/03 seront supprimées pour passer à 2 par jour\. Confirmer \?/);
    await fr(() => applySocialEdit(p, "deux publications par jour au lieu de trois", deps, { at: AT, confirm: true }));
    const per = new Map<string, number>();
    for (const x of alive(r.planId)) per.set(ymd(x.scheduled_at), (per.get(ymd(x.scheduled_at)) ?? 0) + 1);
    expect(Math.max(...per.values())).toBe(2);
    const one1 = await en(() => applySocialEdit(p, "1 post a day", deps, { at: AT }));
    expect(one1.needsConfirm).toBe(true);
    expect(one1.ids).toHaveLength(31);
    const more = await fr(() => applySocialEdit(p, "passe à 4 publications par jour", deps, { at: AT }));
    expect(more.applied).toBe(false);
    expect(more.summary).toMatch(/Planifier plusieurs publications/);
  });

  it("remplacer les images des N prochaines publications par d'autres photos de la banque (jamais retirées sans rien à la place)", async () => {
    const p = await project();
    const r = plan(p, { perDay: 1, mix: { image: 100 } });
    const photos = [];
    for (const k of [1, 2, 3, 4]) photos.push(await saveAsset({ projectId: p.id, userId: p.userId, data: await sharp({ create: { width: 600, height: 750, channels: 3, background: { r: 30 * k, g: 80, b: 90 } } }).jpeg().toBuffer(), name: `flacon-${k}.jpg`, mime: "image/jpeg", role: "original", folderKey: "product.originals", origin: "upload", status: "approved", meta: {} }));
    fr(() => attachFreeVisuals(p, alive(r.planId).map((x) => x.id)));
    const before = alive(r.planId).slice(0, 3).map((x) => JSON.parse(x.media)[0]);
    const { deps, log } = mockSocialDeps();
    const rep = await fr(() => applySocialEdit(p, "Remplace les images des 3 prochaines publications", deps, { at: AT }));
    expect(rep).toMatchObject({ applied: true, by: "local" });
    expect(rep.ids).toHaveLength(3);
    const after = alive(r.planId).slice(0, 3).map((x) => JSON.parse(x.media)[0]);
    after.forEach((m, i) => expect(m && m !== before[i]).toBeTruthy());
    const repEn = await en(() => applySocialEdit(p, "Replace the images of the next 2 posts", deps, { at: AT }));
    expect(repEn.ids).toHaveLength(2);
    expect(log.local + log.aiPost + log.paid).toBe(0);
    // Banque vide : les images actuelles restent, et c'est dit.
    run("UPDATE assets SET deleted_at = 1 WHERE project_id = ? AND origin = 'upload'", p.id);
    const none = await fr(() => applySocialEdit(p, "Remplace les images des 2 prochaines publications", deps, { at: AT }));
    expect(none.applied).toBe(false);
    expect(none.summary).toMatch(/les images actuelles restent/);
    expect(alive(r.planId).slice(0, 2).every((x) => x.media !== "[]")).toBe(true);
  });

  it("phrase non comprise : message clair avec des exemples (FR / EN), jamais de silence", async () => {
    const p = await project();
    plan(p);
    const { deps } = mockSocialDeps();
    const fr1 = await fr(() => applySocialEdit(p, "bonjour le calendrier", deps, { at: AT }));
    expect(fr1).toMatchObject({ applied: false, unclear: true });
    expect(fr1.summary).toMatch(/Demande non comprise.*Exemples de phrases comprises : « Efface tout à partir du 19 octobre »/);
    const en1 = await en(() => applySocialEdit(p, "hello calendar", deps, { at: AT }));
    expect(en1.summary).toMatch(/Request not understood.*Examples of sentences understood: "Delete everything from October 19"/);
    const nothing = await fr(() => applySocialEdit(p, "supprime tout à partir du 19 mai", deps, { at: AT }));
    expect(nothing.unclear).toBe(true);
    expect(nothing.summary).toMatch(/Aucune publication à venir/);
    // À l'écran : la réponse reste affichée sous la demande (plus seulement une notification fugace).
    const src = fs.readFileSync("src/components/studio/social-studio.tsx", "utf8");
    expect(src).toContain("data-edit-answer");
    expect(src).toContain("data-edit-confirm");
  });

  it("retouche IA (« plus premium ») : coût en % du budget IA d'abord (jamais en €), rien lancé sans accord", async () => {
    const p = await project();
    plan(p);
    const { deps, log } = mockSocialDeps({ aiActive: true });
    const ask = await fr(() => applySocialEdit(p, "Rends les publications plus premium", deps, { at: AT }));
    expect(ask).toMatchObject({ applied: false, needsConfirm: true, confirmKind: "ai" });
    expect(ask.summary).not.toMatch(/€/);
    expect(log.rewrite).toBe(0);
    // Par la route : un pourcentage, aucun montant.
    aiOn = true;
    try {
      const res = await fr(() => social.POST(new Request(`http://localhost:3000/api/projects/${p.id}/social/v2`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "edit", text: "Rends les 3 prochaines publications plus premium" }) }), { params: Promise.resolve({ id: p.id }) } as any)) as Response;
      const text = await res.text();
      const j = JSON.parse(text);
      expect(j.needsConfirm).toBe(true);
      expect(typeof j.cost.pct).toBe("number");
      expect(j.estimateMicro).toBeUndefined();
      expect(text).not.toMatch(/€/);
      expect(all("SELECT 1 FROM ai_calls WHERE project_id = ?", p.id)).toHaveLength(0);
    } finally {
      aiOn = false;
    }
    const src = fs.readFileSync("src/components/studio/social-studio.tsx", "utf8");
    const chat = src.slice(src.indexOf("data-edit-confirm"), src.indexOf("data-edit-answer"));
    expect(chat).toContain("% de votre budget IA");
    expect(chat).not.toMatch(/€|1e6/);
    expect(one("SELECT 1 FROM posts WHERE project_id = ? AND status = 'cancelled'", p.id)).toBeUndefined();
  });
});
