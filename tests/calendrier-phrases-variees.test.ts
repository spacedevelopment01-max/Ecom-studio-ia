/**
 * « Il faut accepter beaucoup plus de requêtes » (propriétaire) : 40 phrases françaises et 14 anglaises, variées
 * (synonymes, fautes, sans accents), avec le résultat attendu ; aperçu avant d'agir ; publications envoyées jamais
 * touchées ; annulation de la dernière modification. Moteur local, aucune IA.
 */
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("@/lib/ai/access", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/access")>()), aiActiveFor: () => false }));

describe("Calendrier en une phrase — phrases variées", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { all, one, run } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { createPlanV2 } = await import("@/lib/social-v2/planner");
  const { applySocialEdit } = await import("@/lib/social-v2/engine");
  const { planSocialEdit, findTime } = await import("@/lib/social-v2/local-edit");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { mockSocialDeps } = await import("./social-v2-mock");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const en = <T,>(fn: () => T) => runWithLang({ ui: "en", content: "en" }, fn);
  const TZ = "Europe/Paris";
  const AT = Date.parse("2027-02-25T09:00:00Z"); // jeudi 25 février 2027 ; calendrier de mars 2027
  const project = async () => {
    const u = await createUser(`calv-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "C");
    const pid = seedImageFixture(u.id, "cosmetic");
    grantProjectPlan(pid, "dominer");
    return loadProject(pid);
  };
  type R = { id: string; network: string; format: string; scheduled_at: number; status: string };
  const ymd = (t: number) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(t);
  const hm = (t: number) => new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(t);
  const dow = (t: number) => new Date(`${ymd(t)}T12:00:00Z`).getUTCDay();
  const isVid = (r: R) => ["video", "reel", "short"].includes(r.format);

  it("54 phrases : action et publications visées", async () => {
    const p = await project();
    const plan = fr(() => createPlanV2(p, { startDate: "2027-03-01", endDate: "2027-03-31", perDay: 2, timezone: TZ, platforms: [{ platform: "instagram" }, { platform: "facebook" }], formatMix: { image: 40, carousel: 20, video: 25, text: 15 } }));
    // Quelques publications Facebook en texte seul (format natif de Facebook).
    for (const r of all<{ id: string }>("SELECT id FROM posts WHERE plan_id = ? AND network = 'facebook' AND format = 'image' ORDER BY scheduled_at LIMIT 5", plan.planId)) run("UPDATE posts SET format = 'text' WHERE id = ?", r.id);
    const rows = all<R>("SELECT id, network, format, scheduled_at, status FROM posts WHERE plan_id = ? ORDER BY scheduled_at", plan.planId);
    expect(rows).toHaveLength(62);
    const n = (f: (r: R) => boolean) => rows.filter(f).length;
    const between = (a: string, b: string) => (r: R) => ymd(r.scheduled_at) >= a && ymd(r.scheduled_at) <= b;
    const next = (k: number) => rows.slice(0, k);
    const weekDrop = (k: number) => {
      const weeks = new Map<string, number>();
      for (const r of rows) {
        const d = new Date(`${ymd(r.scheduled_at)}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
        weeks.set(d.toISOString().slice(0, 10), (weeks.get(d.toISOString().slice(0, 10)) ?? 0) + 1);
      }
      return [...weeks.values()].reduce((s, c) => s + Math.max(0, c - k), 0);
    };
    type Case = [string, string, number | null, Record<string, unknown>?];
    const FR: Case[] = [
      ["efface tout à partir du 19 mars", "cancel", n(between("2027-03-19", "2027-03-31"))],
      ["supprime tout", "cancel", 62],
      ["suprime les publications du 5 au 7 mars", "cancel", 6],
      ["Effacer les posts du dimanche", "cancel", n((r) => dow(r.scheduled_at) === 0)],
      ["retire les vidéos de la semaine prochaine", "cancel", n((r) => isVid(r) && between("2027-03-01", "2027-03-07")(r))],
      ["vide mars", "cancel", 62],
      ["enlève les publications Facebook", "cancel", n((r) => r.network === "facebook")],
      ["annule les publications du 10 mars", "cancel", 2],
      ["supprime les idées du 1er au 3 mars", "cancel", 6],
      ["efface les publications de 18h30", "cancel", n((r) => hm(r.scheduled_at) === "18:30")],
      ["supprimer les publi jusqu'au 4 mars", "cancel", 8],
      ["pas le week-end", "cancel", n((r) => [0, 6].includes(dow(r.scheduled_at)))],
      ["plus de publication le dimanche", "cancel", n((r) => dow(r.scheduled_at) === 0)],
      ["seulement lundi, mercredi et vendredi", "cancel", n((r) => ![1, 3, 5].includes(dow(r.scheduled_at)))],
      ["uniquement le mardi", "cancel", n((r) => dow(r.scheduled_at) !== 2)],
      ["3 publications par semaine", "per_week", weekDrop(3)],
      ["une publication par jour", "reduce_per_day", 31],
      ["Mets les vidéos le vendredi", "move_weekday", n(isVid), { weekday: 5 }],
      ["mets les videos le vendredi a 18h", "move_weekday", n(isVid), { weekday: 5, time: "18:00" }],
      ["décale tout d'une semaine", "shift", 62, { days: 7 }],
      ["avance les vidéos de 2 jours", "shift", n(isVid), { days: -2 }],
      ["repousse les publications Instagram d'un jour", "shift", n((r) => r.network === "instagram"), { days: 1 }],
      ["reporte les publications du 10 mars au 12 mars", "move_date", 2, { ymd: "2027-03-12" }],
      ["mets tout à 18h", "set_time", 62, { time: "18:00" }],
      ["les vidéos à 12h", "set_time", n(isVid), { time: "12:00" }],
      ["programme les publications à midi", "set_time", 62, { time: "12:00" }],
      ["passe les publications Facebook sur Instagram", "network", n((r) => r.network === "facebook"), { network: "instagram" }],
      ["ajoute aussi LinkedIn pour les publications du 1er au 7 mars", "add_network", 14, { network: "linkedin" }],
      ["transforme les textes en images", "format", n((r) => r.format === "text"), { format: "image" }],
      ["change les carrousels en vidéos", "format", n((r) => r.format === "carousel"), { format: "video" }],
      ["plus de vidéos", "format", Math.ceil(n((r) => !isVid(r)) / 3), { format: "video" }],
      ["duplique les publications du 4 mars", "duplicate", 2],
      ["valide les publications du 1er au 3 mars", "approve", 6],
      ["approuve les idées du 2 mars", "approve", 2],
      ["remplace les images des 3 prochaines publications", "replace_media", next(3).filter((r) => !isVid(r) && r.format !== "text").length],
      ["refais les vidéos des 6 prochaines publications", "replace_video", next(6).filter(isVid).length],
      ["mets en pause", "pause", null],
      ["reprends le calendrier", "resume", null],
      ["annule ma dernière modification", "undo", null],
      ["rends les publications plus premium", "ai", null],
    ];
    const EN: Case[] = [
      ["Delete everything from March 19", "cancel", n(between("2027-03-19", "2027-03-31"))],
      ["delete posts on Sundays", "cancel", n((r) => dow(r.scheduled_at) === 0)],
      ["Clear March", "cancel", 62],
      ["No weekends", "cancel", n((r) => [0, 6].includes(dow(r.scheduled_at)))],
      ["only Monday and Thursday", "cancel", n((r) => ![1, 4].includes(dow(r.scheduled_at)))],
      ["2 posts per week", "per_week", weekDrop(2)],
      ["Move videos to Friday at 6pm", "move_weekday", n(isVid), { weekday: 5, time: "18:00" }],
      ["Push everything back a week", "shift", 62, { days: 7 }],
      ["set all posts at 9am", "set_time", 62, { time: "09:00" }],
      ["Move Facebook posts to Instagram", "network", n((r) => r.network === "facebook"), { network: "instagram" }],
      ["Turn text posts into images", "format", n((r) => r.format === "text"), { format: "image" }],
      ["Replace the images of the next 3 posts", "replace_media", next(3).filter((r) => !isVid(r) && r.format !== "text").length],
      ["Approve posts from March 1 to 3", "approve", 6],
      ["Undo my last change", "undo", null],
    ];
    expect(FR.length).toBeGreaterThanOrEqual(40);
    expect(EN.length).toBeGreaterThanOrEqual(10);
    const check = (lang: "fr" | "en", [text, action, count, extra]: Case) => {
      const plan = (lang === "fr" ? fr : en)(() => planSocialEdit(text, p.id, AT));
      const got = plan.kind === "local" ? plan.action : plan.kind;
      expect(got, text).toBe(action);
      if (count != null) expect(plan.ids.length, text).toBe(count);
      if (extra) expect(plan, text).toMatchObject(extra);
      // Toute modification de publications passe par un aperçu ; une suppression est marquée comme telle.
      if (plan.kind === "local" && plan.ids.length) {
        expect(plan.confirm, text).toMatch(lang === "fr" ? /Confirmer \?$/ : /Confirm\?$/);
        expect(!!plan.destructive, text).toBe(["cancel", "per_week", "reduce_per_day"].includes(plan.action));
      }
    };
    for (const c of FR) check("fr", c);
    for (const c of EN) check("en", c);
    // Non comprise : message avec exemples, en français et en anglais.
    for (const [lang, text] of [["fr", "bonjour"], ["en", "hello"]] as const) {
      const u = (lang === "fr" ? fr : en)(() => planSocialEdit(text, p.id, AT));
      expect(u.kind).toBe("unclear");
      expect(u.summary).toMatch(lang === "fr" ? /Exemples de phrases comprises/ : /Examples of sentences understood/);
    }
    expect(findTime("à 18 h 30")?.time).toBe("18:30");
    expect(findTime("at 6pm")?.time).toBe("18:00");
  });

  it("aperçu puis action ; publications envoyées jamais touchées ; dernière modification annulée", async () => {
    const p = await project();
    const start = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    const end = new Date(Date.now() + 18 * 86_400_000).toISOString().slice(0, 10);
    const plan = fr(() => createPlanV2(p, { startDate: start, endDate: end, perDay: 1, timezone: TZ, platforms: [{ platform: "instagram" }, { platform: "facebook" }], formatMix: { image: 50, carousel: 0, video: 20, text: 30 } }));
    const rows = () => all<R>("SELECT id, network, format, scheduled_at, status FROM posts WHERE plan_id = ? AND status != 'cancelled' ORDER BY scheduled_at", plan.planId);
    const before = rows();
    run("UPDATE posts SET status = 'published' WHERE id = ?", before[3].id);
    const { deps } = mockSocialDeps();
    // Aperçu : rien ne bouge avant la confirmation.
    const ask = await fr(() => applySocialEdit(p, "décale tout d'un jour", deps));
    expect(ask).toMatchObject({ needsConfirm: true, confirmKind: "change", applied: false });
    expect(ask.summary).toMatch(/^13 publication\(s\) du .* : décalées de 1 jour\(s\)\. Confirmer \?$/);
    expect(rows().map((r) => r.scheduled_at)).toEqual(before.map((r) => r.scheduled_at));
    const done = await fr(() => applySocialEdit(p, "décale tout d'un jour", deps, { confirm: true }));
    expect(done.applied).toBe(true);
    const after = rows();
    for (const [i, r] of after.entries()) expect(r.scheduled_at - before[i].scheduled_at).toBe(i === 3 ? 0 : 86_400_000);
    // Annuler : tout revient comme avant.
    const undo = await fr(() => applySocialEdit(p, "annule ma dernière modification", deps));
    expect(undo.applied).toBe(true);
    expect(rows().map((r) => r.scheduled_at)).toEqual(before.map((r) => r.scheduled_at));
    expect((await fr(() => applySocialEdit(p, "annule ma dernière modification", deps))).summary).toMatch(/Aucune modification récente/);
    // Réseau changé, puis annulé.
    await fr(() => applySocialEdit(p, "passe les publications Facebook sur Instagram", deps, { confirm: true }));
    expect(rows().filter((r) => r.status !== "published").every((r) => r.network === "instagram")).toBe(true);
    await en(() => applySocialEdit(p, "Undo my last change", deps));
    expect(rows().map((r) => r.network)).toEqual(before.map((r) => r.network));
    // Textes en images : photo de la banque posée gratuitement.
    for (const k of [1, 2]) await saveAsset({ projectId: p.id, userId: p.userId, data: await sharp({ create: { width: 500, height: 600, channels: 3, background: { r: 60 * k, g: 90, b: 80 } } }).jpeg().toBuffer(), name: `f-${k}.jpg`, mime: "image/jpeg", role: "original", folderKey: "product.originals", origin: "upload", status: "approved", meta: {} } as any);
    const texts = rows().filter((r) => r.format === "text" && r.status !== "published").map((r) => r.id);
    expect(texts.length).toBeGreaterThan(0);
    await fr(() => applySocialEdit(p, "transforme les textes en images", deps, { confirm: true }));
    const conv = texts.map((pid) => one<{ format: string; media: string }>("SELECT format, media FROM posts WHERE id = ?", pid)!);
    expect(conv.every((r) => r.format !== "text" && JSON.parse(r.media).length === 1)).toBe(true);
    // Heure changée ; la publication déjà publiée garde la sienne.
    await en(() => applySocialEdit(p, "set all posts at 9am", deps, { confirm: true }));
    const timed = rows();
    expect(timed.filter((r) => r.status !== "published").every((r) => hm(r.scheduled_at) === "09:00")).toBe(true);
    expect(timed.find((r) => r.status === "published")!.scheduled_at).toBe(before[3].scheduled_at);
    // Suppression de tout : la publication publiée reste.
    await fr(() => applySocialEdit(p, "efface tout", deps, { confirm: true }));
    expect(rows().map((r) => r.status)).toEqual(["published"]);
  });
});
