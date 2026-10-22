/**
 * « Modifier le calendrier en une phrase » (repris de la PR #127, réconcilié avec les règles actuelles) : phrases
 * comprises localement, sans IA, en français et en anglais ; toute suppression demande une confirmation ; les
 * publications envoyées ne sont jamais touchées ; une phrase non comprise reçoit des exemples ; une retouche IA montre
 * son coût en % du budget IA et attend l'accord. Remplacer des images : images finales 100 % IA (devis, accord, une
 * seule tâche, jamais repayée) — l'ancien remplacement par une photo de la banque (« Visuels gratuits ») n'existe
 * plus. IA simulée, aucun appel payant.
 */
import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
let aiOn = false;
vi.mock("@/lib/ai/access", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/access")>()), aiActiveFor: () => aiOn }));
// Horloge au 25 février 2027 (elle avance normalement ensuite) : le calendrier de mars 2027 est dans l'horizon de
// programmation du forfait, quel que soit le jour où le test tourne.
vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
vi.setSystemTime(new Date("2027-02-25T09:00:00Z"));

describe("Modifier le calendrier en une phrase", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { all, one, run } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { createPlanV2 } = await import("@/lib/social-v2/planner");
  const { applySocialEdit } = await import("@/lib/social-v2/engine");
  const { produceBatch } = await import("@/lib/social-v2/production");
  const { findDates, parsePeriod } = await import("@/lib/social-v2/edit-dates");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { fakeImage, mockSocialDeps } = await import("./social-v2-mock");
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
  const near = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

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

  it("une version préparée (stratégie non activée) n'est jamais visée par une phrase", async () => {
    const p = await project();
    const r = plan(p);
    const { deps } = mockSocialDeps();
    const hidden = alive(r.planId)[0].id;
    run("INSERT INTO marketing_strategy_contents (project_id, module, content_id, strategy_id, input_digest) VALUES (?, 'post', ?, 'draft-essai', 'x') ON CONFLICT(project_id, module, content_id) DO UPDATE SET strategy_id = 'draft-essai'", p.id, hidden);
    const ask = await fr(() => applySocialEdit(p, "supprime tout", deps, { at: AT }));
    expect(ask.ids).toHaveLength(61);
    expect(ask.ids).not.toContain(hidden);
  });

  it("déplacer les vidéos à un jour donné (FR / EN), après l'aperçu", async () => {
    const p = await project();
    // Dates proches (le forfait limite les déplacements à son horizon de calendrier, compté depuis aujourd'hui).
    const r = fr(() => createPlanV2(p, { startDate: near(9), endDate: near(30), perDay: 1, timezone: TZ, platforms: [{ platform: "instagram" }], formatMix: { image: 70, video: 30 } }));
    const { deps } = mockSocialDeps();
    const before = alive(r.planId).map((x) => x.scheduled_at);
    const preview = await fr(() => applySocialEdit(p, "Mets les vidéos le vendredi", deps));
    expect(preview).toMatchObject({ needsConfirm: true, confirmKind: "change", applied: false });
    expect(preview.summary).toMatch(/vidéo\(s\).*passeront au vendredi de leur semaine\. Confirmer \?$/);
    expect(alive(r.planId).map((x) => x.scheduled_at)).toEqual(before);
    const fri = await fr(() => applySocialEdit(p, "Mets les vidéos le vendredi", deps, { confirm: true }));
    expect(fri.by).toBe("local");
    const vids = alive(r.planId).filter((x) => ["video", "reel", "short"].includes(x.format));
    const moved = vids.filter((v) => !(fri.refused ?? []).some((x) => x.startsWith(v.id)));
    expect(moved.length).toBeGreaterThan(0);
    expect(moved.every((v) => dow(v.scheduled_at) === 5)).toBe(true);
    const tue = await en(() => applySocialEdit(p, "Move the videos to Tuesday", deps, { confirm: true }));
    expect(tue.summary).toMatch(/video\(s\).*will move to Tuesday/);
  });

  it("changer le nombre de publications par jour : confirmation, puis au plus N par jour ; augmenter renvoie vers Planifier", async () => {
    const p = await project();
    const r = plan(p, { perDay: 3 });
    const { deps } = mockSocialDeps();
    const ask = await fr(() => applySocialEdit(p, "deux publications par jour au lieu de trois", deps, { at: AT }));
    expect(ask).toMatchObject({ needsConfirm: true, confirmKind: "delete" });
    expect(ask.ids).toHaveLength(31);
    expect(ask.summary).toMatch(/31 publication\(s\) du 01\/03 au 31\/03 seront supprimées \(retirées pour passer à 2 par jour\)\..*Confirmer \?/);
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

  it("remplacer les images : sans IA, rien n'est retiré ; avec l'IA, devis en %, accord, UNE tâche, jamais repayée", async () => {
    const p = await project();
    const r = fr(() => createPlanV2(p, { startDate: near(3), endDate: near(20), perDay: 1, timezone: TZ, platforms: [{ platform: "instagram" }], formatMix: { image: 100 } }));
    const first = alive(r.planId).slice(0, 3);
    for (const x of first) run("UPDATE posts SET media = ? WHERE id = ?", JSON.stringify([(await fakeImage(p, `avant-${x.id}.jpg`, "image", { aiPost: { simulated: true } })).id]), x.id);
    const before = () => first.map((x) => one<{ media: string }>("SELECT media FROM posts WHERE id = ?", x.id)!.media);
    const original = before();
    const jobs = () => all<{ id: string; payload: string }>("SELECT id, payload FROM jobs WHERE project_id = ? AND type = 'social.v2.produce'", p.id);

    // IA indisponible : la demande est comprise, mais rien n'est retiré ni remplacé par une photo de banque.
    const off = mockSocialDeps({ aiActive: false });
    const no = await fr(() => applySocialEdit(p, "Remplace les images des 3 prochaines publications", off.deps, { confirm: true }));
    expect(no).toMatchObject({ applied: false, needsAi: true });
    expect(no.summary).toMatch(/les images actuelles restent/);
    expect(before()).toEqual(original);
    expect(off.log.local + off.log.image + off.log.aiPost).toBe(0);

    // IA active : devis en % du budget IA (jamais d'euros), rien n'est lancé sans accord.
    const { deps, log } = mockSocialDeps({ aiActive: true });
    const quote = await fr(() => applySocialEdit(p, "Remplace les images des 3 prochaines publications", deps));
    expect(quote).toMatchObject({ needsConfirm: true, confirmKind: "ai", applied: false });
    expect(quote.ids.sort()).toEqual(first.map((x) => x.id).sort());
    expect(typeof quote.pct).toBe("number");
    expect(quote.summary).toMatch(/de votre budget IA/);
    expect(quote.summary).not.toMatch(/€/);
    // « Confirmer » sans le coût accepté : toujours rien de lancé.
    const blind = await fr(() => applySocialEdit(p, "Remplace les images des 3 prochaines publications", deps, { confirm: true }));
    expect(blind.needsConfirm).toBe(true);
    // Coût monté depuis l'accord : nouvel accord demandé.
    if ((quote.pct ?? 0) > 0.1) {
      const stale = await fr(() => applySocialEdit(p, "Remplace les images des 3 prochaines publications", deps, { confirm: true, approvedPct: (quote.pct ?? 0) / 2 }));
      expect(stale.summary).toMatch(/Le coût a changé/);
    }
    expect(jobs()).toHaveLength(0);
    expect(log.aiPost + log.paid).toBe(0);

    // Accord : une seule tâche de fond ; double clic = même tâche ; l'image actuelle reste en attendant.
    const go = await fr(() => applySocialEdit(p, "Remplace les images des 3 prochaines publications", deps, { confirm: true, approvedPct: quote.pct }));
    expect(go).toMatchObject({ applied: true, by: "ai" });
    const again = await fr(() => applySocialEdit(p, "Remplace les images des 3 prochaines publications", deps, { confirm: true, approvedPct: quote.pct }));
    expect(again.jobId).toBe(go.jobId);
    expect(jobs()).toHaveLength(1);
    expect(before()).toEqual(original);
    // Tâche terminée en échec sans changer les images : la même phrase ne la relance pas toute seule, et le dit.
    run("UPDATE jobs SET status = 'failed' WHERE id = ?", go.jobId);
    const failed = await fr(() => applySocialEdit(p, "Remplace les images des 3 prochaines publications", deps, { confirm: true, approvedPct: quote.pct }));
    expect(failed).toMatchObject({ applied: false, jobId: go.jobId });
    expect(failed.summary).toMatch(/rien n'est relancé tout seul/);
    expect(jobs()).toHaveLength(1);
    const payload = JSON.parse(jobs()[0].payload);
    expect(payload).toMatchObject({ allowPaid: true, replace: true });
    expect(Object.keys(payload.replaceFrom).sort()).toEqual(first.map((x) => x.id).sort());

    // La tâche (moteur habituel, IA simulée) : nouvelles images ; une reprise de la tâche ne refait rien.
    const opts = { allowPaid: payload.allowPaid, maxCostEur: payload.maxCostEur, approvedEstimateMicro: payload.approvedEstimateMicro, aiImages: payload.aiImages, replace: true, replaceFrom: payload.replaceFrom, batchSize: payload.batchSize };
    const res = await fr(() => produceBatch(p, payload.ids, deps, opts));
    expect(res.produced).toBe(3);
    before().forEach((m, i) => expect(m).not.toBe(original[i]));
    const paid = log.aiPost;
    const retry = await fr(() => produceBatch(p, payload.ids, deps, opts));
    expect(retry.produced).toBe(0);
    expect(log.aiPost).toBe(paid);
    expect(log.local + log.image).toBe(0);
  });

  it("vidéos : jamais un montage de remplacement lancé en lot par une phrase", async () => {
    const p = await project();
    plan(p);
    const { deps, log } = mockSocialDeps({ aiActive: true });
    const vids = await fr(() => applySocialEdit(p, "refais les vidéos des 6 prochaines publications", deps, { at: AT, confirm: true }));
    expect(vids).toMatchObject({ applied: false, unclear: true });
    expect(vids.summary).toMatch(/Refaire le visuel/);
    expect(log.video + log.paid).toBe(0);
    expect(all("SELECT 1 FROM jobs WHERE project_id = ?", p.id)).toHaveLength(0);
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
      expect(typeof j.pct).toBe("number");
      expect(j.estimateMicro).toBeUndefined();
      expect(text).not.toMatch(/€/);
      expect(all("SELECT 1 FROM ai_calls WHERE project_id = ?", p.id)).toHaveLength(0);
    } finally {
      aiOn = false;
    }
    // L'écran ne convertit plus aucun montant : il montre le % donné par le serveur et le renvoie avec l'accord.
    const src = fs.readFileSync("src/components/studio/social-studio.tsx", "utf8");
    const chat = src.slice(src.indexOf("data-edit-confirm"), src.indexOf("data-edit-answer"));
    expect(chat).not.toMatch(/€|1e6|estimateMicro/);
    expect(src).toContain("approvedPct: pending.pct");
    expect(one("SELECT 1 FROM posts WHERE project_id = ? AND status = 'cancelled'", p.id)).toBeUndefined();
  });
});
