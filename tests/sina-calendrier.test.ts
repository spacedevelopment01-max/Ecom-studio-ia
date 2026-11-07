/**
 * SINA (#492) — étape 11 du parcours : calendrier de publication MANUEL (décision du propriétaire du 7 novembre 2026).
 * Construit à partir des publications (étape 9) et publicités (étape 10) déjà créées, sans IA, sans publication réelle,
 * sans tâche de fond : le client publie lui-même et coche « publié ». Aucun appel réseau (fetch interdit).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatInTimeZone } from "date-fns-tz";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — étape 11 : calendrier de publication manuel", async () => {
  const { all, id, now, one, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { createManualPost } = await import("@/lib/social-v2/manual");
  const { addUsage } = await import("@/lib/library");
  const { account, project } = await import("./conversation209-fixtures");
  const { seedCutout } = await import("./image-v2-fixtures");
  const C = await import("@/lib/syna-agent/calendar");
  const { calendarTools } = await import("@/lib/syna-agent/tools/calendar");

  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const TZ = "Europe/Paris";
  const plus = (n: number) => formatInTimeZone(Date.now() + n * 86_400_000, TZ, "yyyy-MM-dd");
  const tool = (name: string) => calendarTools.find((t) => t.name === name)!;
  const call = (name: string, ctx: any, args: unknown) => fr(() => tool(name).run(ctx, tool(name).args.parse(args)));

  beforeEach(() => vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Aucun appel réseau permis"); })));
  afterEach(() => vi.unstubAllGlobals());

  const COLORS = ["#C77B30", "#1D4ED8", "#16A34A", "#B91C1C", "#7C3AED", "#0891B2", "#CA8A04", "#DB2777", "#334155", "#65A30D", "#EA580C", "#4F46E5"];
  let color = 0;
  const img = (uid: string, pid: string) => seedCutout(uid, pid, COLORS[color++ % COLORS.length]);

  /** Une publication de l'étape 9 : même idée sur Instagram (4:5) et Facebook, une image par format, même group_id. */
  async function publication(uid: string, pid: string, n: number, serie: number, o: { networks?: ("instagram" | "facebook" | "tiktok" | "pinterest")[]; caption?: string; media?: string } = {}) {
    const p = loadProject(pid), group = `g${n}-${id()}`, ids: string[] = [];
    for (const network of o.networks ?? ["instagram", "facebook"]) {
      const media = o.media ?? (await img(uid, pid));
      const r = createManualPost(p, uid, { network, format: network === "tiktok" ? "video" : "image", title: `Publication ${n}`, caption: o.caption ?? `Texte de la publication ${n}.`, hashtags: "bougie artisanal", media: [media] }, { brief: { serie } });
      run("UPDATE posts SET group_id=? WHERE id=?", group, r.id);
      ids.push(r.id);
    }
    return ids;
  }

  async function setup(n = 3, series = [1, 2, 3]) {
    const u = await account(), pid = project(u), posts: string[][] = [];
    for (let i = 0; i < n; i++) posts.push(await publication(u.id, pid, i + 1, series[i % series.length]));
    const ctx = { user: u, projectId: pid, conversationId: "test", runId: "test", attachment: () => null } as any;
    return { u, pid, posts, ctx, p: () => loadProject(pid) };
  }

  const spend = () => ({ jobs: one<{ n: number }>("SELECT COUNT(*) n FROM jobs")!.n, calls: one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n });

  it("prépare un calendrier gratuit : une publication par créneau, déclinée sur chaque réseau, rien d'inventé", async () => {
    const s = await setup(3);
    const before = spend();
    const r = await call("calendar.plan", s.ctx, { days: 7, perDay: 1 });
    expect(r.ok).toBe(true);
    const cal = C.readCalendar(s.pid)!;
    // 3 publications prêtes pour 7 créneaux : 6 cases (Instagram + Facebook), 4 créneaux vides annoncés.
    expect(cal.entries).toHaveLength(6);
    expect(cal.missing).toBe(4);
    expect(cal.warnings.join(" ")).toContain("Il manque 4 publication(s)");
    expect(cal.settings).toMatchObject({ startDate: plus(1), days: 7, perDay: 1, times: ["11:30"], networks: ["instagram", "facebook"], timezone: TZ });
    // Même publication = même jour, même heure, sur les deux réseaux ; jamais deux publications le même jour.
    const days = [...new Set(cal.entries.map((e) => e.ymd))];
    expect(days).toEqual([plus(1), plus(2), plus(3)]);
    for (const d of days) expect(new Set(cal.entries.filter((e) => e.ymd === d).map((e) => e.unit)).size).toBe(1);
    expect(cal.entries.every((e) => e.mode === "manuel" && e.status === "a_publier" && e.time === "11:30")).toBe(true);
    expect(C.AUTO_PUBLISH_AVAILABLE).toBe(false);
    // Dates recopiées dans l'onglet Publications, statut inchangé : jamais « scheduled » (aucun envoi automatique).
    for (const e of cal.entries) {
      const row = one<any>("SELECT status, scheduled_at FROM posts WHERE id=?", e.ref);
      expect(row).toMatchObject({ status: "review", scheduled_at: e.at });
    }
    expect(all("SELECT id FROM posts WHERE project_id=? AND status IN ('scheduled','publishing','published')", s.pid)).toHaveLength(0);
    expect(spend()).toEqual(before);
    expect(fetch).not.toHaveBeenCalled();
    expect(r.summary).toContain("Tu publies toi-même");
  });

  it("varie les sujets (groupes de l'étape 9) et respecte les heures du client", async () => {
    const s = await setup(4, [1, 1, 2, 3]);
    await call("calendar.plan", s.ctx, { days: 7, perDay: 2, times: ["19:00", "09:15"], networks: ["instagram"] });
    const cal = C.readCalendar(s.pid)!;
    expect(cal.settings.times).toEqual(["09:15", "19:00"]);
    expect(cal.entries.every((e) => e.network === "instagram")).toBe(true);
    const series = cal.entries.map((e) => JSON.parse(one<any>("SELECT brief FROM posts WHERE id=?", e.ref).brief).serie);
    for (let i = 1; i < series.length - 1; i++) expect(series[i]).not.toBe(series[i - 1]);
    expect(cal.entries.map((e) => e.time)).toEqual(["09:15", "19:00", "09:15", "19:00"]);
  });

  it("forfait : durée et nombre de publications par jour limités, jamais dépassés", async () => {
    const s = await setup(2);
    run("UPDATE subscriptions SET plan='creer' WHERE project_id=?", s.pid);
    await expect(call("calendar.plan", s.ctx, { days: 15, perDay: 1 })).rejects.toThrow("7 jours");
    const r = await call("calendar.plan", s.ctx, { days: 7, perDay: 3 });
    expect(r.ok).toBe(true);
    const cal = C.readCalendar(s.pid)!;
    expect(cal.settings.perDay).toBe(1);
    expect(cal.warnings[0]).toContain("Limité à 1 publication(s) par jour");
    expect(() => tool("calendar.plan").args.parse({ days: 10, perDay: 1 })).toThrow();
    await expect(call("calendar.plan", s.ctx, { days: 7, perDay: 1, startDate: plus(-1) })).rejects.toThrow("passée");
  });

  it("aucune image reprise du site, aucune image répétée d'une publication à l'autre", async () => {
    const s = await setup(1);
    const shared = await img(s.u.id, s.pid);
    await publication(s.u.id, s.pid, 2, 2, { networks: ["instagram"], media: shared });
    await publication(s.u.id, s.pid, 3, 3, { networks: ["facebook"], media: shared });
    const site = await img(s.u.id, s.pid);
    addUsage(site, "theme_section", "hero", "Image du site");
    await publication(s.u.id, s.pid, 4, 1, { networks: ["instagram"], media: site });
    await call("calendar.plan", s.ctx, { days: 7, perDay: 1 });
    const cal = C.readCalendar(s.pid)!;
    expect(new Set(cal.entries.map((e) => e.unit)).size).toBe(2);
    expect(cal.warnings.join(" ")).toContain("image reprise du site");
    expect(cal.warnings.join(" ")).toContain("image déjà utilisée par une autre publication");
  });

  it("vue « à faire » : fichier nommé par date et réseau, texte à copier avec hashtags, emojis retirés au choix", async () => {
    const s = await setup(0);
    await publication(s.u.id, s.pid, 1, 1, { networks: ["instagram"], caption: "Nouvelle bougie 🕯️✨ à la cire de colza 🇫🇷 ©" });
    await call("calendar.plan", s.ctx, { days: 7, perDay: 1, emojis: false });
    const v = await fr(() => C.calendarView(s.p(), C.readCalendar(s.pid)!));
    expect(v.days).toHaveLength(7);
    const item = v.days[0].items[0];
    expect(item).toMatchObject({ network: "instagram", networkLabel: "Instagram", action: "Publier sur Instagram", status: "a_publier", statusLabel: "À publier", mode: "manuel", hashtags: ["#bougie", "#artisanal"] });
    expect(item.copyText).toBe("Nouvelle bougie à la cire de colza ©\n\n#bougie #artisanal");
    expect(item.files).toHaveLength(1);
    expect(item.files[0].fileName).toBe(`${plus(1)}_instagram_11h30.png`);
    expect(item.files[0].href).toMatch(/^\/api\/files\/.+\?download=1$/);
    expect(v.days.slice(1).every((d) => d.items.length === 0)).toBe(true);
    expect(v.icsHref).toBe(`/api/projects/${s.pid}/calendrier?format=ics`);
    expect(C.stripEmojis("Merci 👍🏽 à toi 👨‍👩‍👧 !")).toBe("Merci à toi !");
  });

  it("le client coche « publié » : la publication passe publiée, reste en place si le calendrier est refait, se décoche", async () => {
    const s = await setup(3);
    await call("calendar.plan", s.ctx, { days: 7, perDay: 1 });
    const first = C.readCalendar(s.pid)!.entries.filter((e) => e.ymd === plus(1));
    const r = await call("calendar.mark_done", s.ctx, { entryIds: first.map((e) => e.id) });
    expect(r.ok).toBe(true);
    expect(r.changes!.every((c) => c.verified)).toBe(true);
    for (const e of first) expect(one<any>("SELECT status, published_at, remote_id FROM posts WHERE id=?", e.ref)).toMatchObject({ status: "published", remote_id: null });
    // Calendrier refait (2 par jour) : les cases publiées restent telles quelles, le reste est replacé.
    await call("calendar.plan", s.ctx, { days: 7, perDay: 2 });
    const cal = C.readCalendar(s.pid)!;
    for (const e of first) expect(cal.entries.find((x) => x.id === e.id)).toMatchObject({ status: "publie", ymd: plus(1), time: "11:30" });
    expect(cal.entries.filter((e) => e.ymd === plus(1) && e.status === "a_publier").map((e) => e.time)).toEqual(["18:30", "18:30"]);
    // Décocher : l'état d'origine revient.
    await call("calendar.mark_done", s.ctx, { entryIds: [first[0].id], done: false });
    expect(one<any>("SELECT status, published_at FROM posts WHERE id=?", first[0].ref)).toMatchObject({ status: "review", published_at: null });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("déplacer une date : toute la publication bouge ; même réseau le même jour refusé sauf accord", async () => {
    const s = await setup(3);
    await call("calendar.plan", s.ctx, { days: 7, perDay: 1 });
    const cal = C.readCalendar(s.pid)!;
    const a = cal.entries.find((e) => e.ymd === plus(1))!;
    const r = await call("calendar.move", s.ctx, { entryId: a.id, date: plus(5), time: "18:00" });
    expect(r.ok).toBe(true);
    const moved = C.readCalendar(s.pid)!.entries.filter((e) => e.unit === a.unit);
    expect(moved).toHaveLength(2);
    expect(moved.every((e) => e.ymd === plus(5) && e.time === "18:00" && e.movedByClient)).toBe(true);
    for (const e of moved) expect(one<any>("SELECT scheduled_at FROM posts WHERE id=?", e.ref).scheduled_at).toBe(e.at);
    // Jour déjà occupé sur Instagram : refusé, sauf si le client le veut vraiment.
    const b = C.readCalendar(s.pid)!.entries.find((e) => e.ymd === plus(2) && e.network === "instagram")!;
    await expect(call("calendar.move", s.ctx, { entryId: b.id, date: plus(3) })).rejects.toThrow(/déjà une publication (Instagram|Facebook) ce jour-là/);
    const ok = await call("calendar.move", s.ctx, { entryId: b.id, date: plus(3), time: "19:00", allowSameDay: true });
    expect(ok.ok).toBe(true);
    await expect(call("calendar.move", s.ctx, { entryId: b.id, date: plus(-2) })).rejects.toThrow("passée");
    // Une case publiée ne se déplace plus.
    await call("calendar.mark_done", s.ctx, { entryIds: [b.id] });
    await expect(call("calendar.move", s.ctx, { entryId: b.id, date: plus(6) })).rejects.toThrow("Déjà publiée");
  });

  it("publicités de l'étape 10 : hors du calendrier par défaut ; sur demande du client, une case « à lancer » par publicité", async () => {
    const s = await setup(2);
    for (const [concept, aspects] of [["c1", ["1:1", "9:16"]], ["c2", ["4:5"]]] as const) for (const aspect of aspects) {
      const asset = await img(s.u.id, s.pid);
      const doc = { version: 1, width: 1080, height: 1080, background: "#ffffff", safe: { top: 0, bottom: 0, side: 0 }, format: { platform: "instagram", aspect }, layers: [{ id: "t", kind: "text", role: "title", text: "Le cadeau qui réchauffe 🎁", visible: true }, { id: "c", kind: "text", role: "cta", text: "Commander", visible: true }], brand: { palette: {}, fonts: { heading: "a", body: "b" }, name: "X" }, meta: { conceptId: concept, source: "engine", createdFrom: null } };
      run("INSERT INTO ad_documents(id,project_id,doc_key,version,source,note,doc_json,rendered_asset_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)", id(), s.pid, `${concept}-${aspect}`, 1, "engine", "", JSON.stringify(doc), asset, now());
    }
    // Décision du propriétaire du 7 novembre : les publicités restent hors du calendrier, sauf si le client le demande.
    await call("calendar.plan", s.ctx, { days: 7, perDay: 1 });
    expect(C.readCalendar(s.pid)!.entries.some((e) => e.kind === "publicite")).toBe(false);
    await call("calendar.plan", s.ctx, { days: 7, perDay: 1, includeAds: true });
    const ads = C.readCalendar(s.pid)!.entries.filter((e) => e.kind === "publicite");
    expect(ads.map((e) => e.ref)).toEqual(["c1", "c2"]);
    expect(ads[0].format).toBe("1:1 · 9:16");
    expect(ads[0].ymd).not.toBe(ads[1].ymd);
    const v = await fr(() => C.calendarView(s.p(), C.readCalendar(s.pid)!));
    const item = v.days.flatMap((d) => d.items).find((i) => i.kind === "publicite")!;
    expect(item.action).toContain("Lancer la publicité");
    expect(item.copyText).toBe("Le cadeau qui réchauffe 🎁\nCommander");
    expect(item.files).toHaveLength(2);
    // Sans publicités si le client le veut.
    await call("calendar.plan", s.ctx, { days: 7, perDay: 1, includeAds: false });
    expect(C.readCalendar(s.pid)!.entries.some((e) => e.kind === "publicite")).toBe(false);
  });

  it("fichier d'agenda .ics : un rendez-vous par case, rappel à l'heure prévue, lignes pliées ; liste imprimable", async () => {
    const s = await setup(2);
    await call("calendar.plan", s.ctx, { days: 7, perDay: 1 });
    const cal = C.readCalendar(s.pid)!;
    await call("calendar.mark_done", s.ctx, { entryIds: [cal.entries[0].id] });
    const p = s.p(), v = await fr(() => C.calendarView(p, C.readCalendar(s.pid)!));
    const ics = await fr(() => C.calendarIcs(p, v));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(ics.match(/TRIGGER:PT0M/g)).toHaveLength(3);
    expect(ics).toContain(`SUMMARY:✓ Publié — Publier sur ${cal.entries[0].network === "facebook" ? "Facebook" : "Instagram"}`);
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(`${plus(2)}_instagram_11h30.png`);
    expect(unfolded).toContain("Texte à copier :\\nTexte de la publication");
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    const txt = await fr(() => C.calendarText(p, v));
    expect(txt).toContain(`[x] 11:30 · Publier sur ${cal.entries[0].network === "facebook" ? "Facebook" : "Instagram"}`);
    expect(txt).toContain(`[ ] 11:30 · Publier sur ${cal.entries[0].network === "facebook" ? "Instagram" : "Facebook"}`);
  });

  it("lecture par SINA et rappel du jour dans le Studio et par e-mail (une seule fois par jour)", async () => {
    const s = await setup(2);
    await call("calendar.plan", s.ctx, { days: 7, perDay: 1, startDate: plus(0), times: ["23:59"] });
    const r = await call("calendar.read", s.ctx, { today: true });
    expect(r.ok).toBe(true);
    const data = r.data as any;
    expect(data.days).toHaveLength(1);
    expect(data.days[0].items.map((i: any) => i.network)).toEqual(["facebook", "instagram"]);
    expect(r.summary).toBe("Aujourd'hui : 2 chose(s) à publier.");
    const count = () => one<{ n: number }>("SELECT COUNT(*) n FROM notifications WHERE project_id=?", s.pid)!.n;
    const n0 = count();
    const { atZoned } = await import("@/lib/social-v2/planner");
    // Jamais la nuit : avant 8 h (heure du projet), aucun rappel ; à 9 h, un seul rappel dans la journée.
    expect(await fr(() => C.remindDue(atZoned(plus(0), "06:30", "Europe/Paris")))).toBe(0);
    expect(count()).toBe(n0);
    const nine = atZoned(plus(0), "09:00", "Europe/Paris");
    const mails: { to: string; subject: string; text: string }[] = [];
    C.calendarDeps.sendMail = async (m) => { mails.push(m); };
    try {
      expect(await fr(() => C.remindDue(nine))).toBeGreaterThanOrEqual(1);
      expect(count()).toBe(n0 + 1);
      // Aussi par e-mail (décision du propriétaire du 7 novembre), une seule fois dans la journée.
      const mine = mails.filter((m) => m.to === s.u.email);
      expect(mine).toHaveLength(1);
      expect(mine[0].subject).toContain("Aujourd'hui : 1 publication(s) à faire (2 envois)");
      expect(mine[0].text).toContain("23:59 · ");
      await fr(() => C.remindDue(nine + 3_600_000));
      expect(count()).toBe(n0 + 1);
      expect(mails.filter((m) => m.to === s.u.email)).toHaveLength(1);
    } finally { C.calendarDeps.sendMail = undefined; }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refaire un calendrier demande l'accord du client ; une publication sortie du calendrier retrouve sa date", async () => {
    const s = await setup(3);
    expect((tool("calendar.plan").sensitive as any)({}, s.ctx)).toBe(false);
    await call("calendar.plan", s.ctx, { days: 7, perDay: 1 });
    expect((tool("calendar.plan").sensitive as any)({}, s.ctx)).toBe(true);
    expect(await fr(() => tool("calendar.plan").preview!(s.ctx, { days: 7, perDay: 1 }))).toContain("6 case(s) non publiée(s)");
    await call("calendar.plan", s.ctx, { days: 7, perDay: 1, networks: ["instagram"] });
    const fb = s.posts.flat().filter((pid) => one<any>("SELECT network FROM posts WHERE id=?", pid).network === "facebook");
    for (const pid of fb) expect(one<any>("SELECT scheduled_at, status FROM posts WHERE id=?", pid)).toMatchObject({ scheduled_at: null, status: "review" });
    expect(C.readCalendar(s.pid)!.entries.every((e) => e.network === "instagram")).toBe(true);
  });

  it("mise en place simple pour SINA et le client : valeurs par défaut, coche permise pendant le chantier", async () => {
    const s = await setup(2);
    const r = await call("calendar.plan", s.ctx, {});
    expect(r.ok).toBe(true);
    expect((r.data as any).settings).toMatchObject({ days: 7, perDay: 1 });
    expect(r.summary).toContain("2 publication(s) à faire, soit 4 envois sur 2 réseau(x)");
    const { ALWAYS_ALLOWED } = await import("@/lib/syna-agent/construction");
    expect(ALWAYS_ALLOWED.test(`/api/projects/${s.pid}/calendrier`)).toBe(true);
    expect(ALWAYS_ALLOWED.test(`/api/projects/${s.pid}/brand`)).toBe(false);
  });
});
