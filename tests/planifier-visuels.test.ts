/**
 * « J'ai cliqué planifier 60 publications mais j'ai pas d'image ou de vidéos avec » (propriétaire) : Planifier
 * plusieurs publications propose « Visuels » — sans visuel, visuels gratuits (banque du projet, montage local) ou
 * créés par l'IA (devis en % du budget IA, accord par un clic). Aucun appel d'IA, aucune publication réelle ici :
 * l'IA est simulée (active ou non), les tâches de fond ne sont pas exécutées.
 */
import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
let aiOn = false;
vi.mock("@/lib/ai/access", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/access")>()), aiActiveFor: () => aiOn }));
beforeEach(() => vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 })));
afterEach(() => vi.unstubAllGlobals());

describe("Planifier plusieurs publications › Visuels", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { all, json, one, run } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { getJob } = await import("@/lib/jobs");
  const { balance } = await import("@/lib/billing");
  const { accountKeyFor } = await import("@/lib/project-billing");
  const { postViewV2 } = await import("@/lib/social-v2/view");
  const { quoteVisuals, attachFreeVisuals, freeImagePool } = await import("@/lib/social-v2/plan-visuals");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const social = await import("@/app/api/projects/[id]/social/v2/route");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const en = <T,>(fn: () => T) => runWithLang({ ui: "en", content: "en" }, fn);
  const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  const project = async (kind: "cosmetic" | "artisan") => {
    const u = await createUser(`plv-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    sessionUser = { ...u, role: "client" };
    const pid = seedImageFixture(u.id, kind);
    grantProjectPlan(pid, "vendre");
    return loadProject(pid);
  };
  const photo = async (p: ReturnType<typeof loadProject>, name: string, extra: Record<string, unknown> = {}) =>
    saveAsset({ projectId: p.id, userId: p.userId, data: await sharp({ create: { width: 800, height: 1000, channels: 3, background: { r: 40 + name.length * 9, g: 90, b: 60 } } }).jpeg().toBuffer(), name, mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "upload", status: "approved", meta: {}, ...extra } as any);
  const call = (pid: string, body: unknown, lang: "fr" | "en" = "fr") => (lang === "fr" ? fr : en)(() => social.POST(new Request(`http://localhost:3000/api/projects/${pid}/social/v2`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: pid }) } as any)) as Promise<Response>;
  const request = (o: { days?: number; perDay?: number; mix?: Record<string, number> } = {}) => ({ startDate: day(2), endDate: day(1 + (o.days ?? 7)), perDay: o.perDay ?? 1, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], formatMix: { image: 0, carousel: 0, video: 0, text: 0, ...(o.mix ?? { image: 60, video: 40 }) }, structure: "weekly" });
  const postsOf = (planId: string) => all<{ id: string; format: string; media: string; brief: string; status: string }>("SELECT id, format, media, brief, status FROM posts WHERE plan_id = ? ORDER BY scheduled_at", planId);
  const isVideo = (f: string) => ["video", "reel", "short"].includes(f);
  const jobsOf = (pid: string) => all<{ id: string; type: string; payload: string }>("SELECT id, type, payload FROM jobs WHERE project_id = ?", pid);

  it("écran : choix « Visuels » à trois possibilités, envoyé avec la planification ; bouton qui suit le choix ; jamais d'euros", () => {
    const src = fs.readFileSync("src/components/studio/social-studio.tsx", "utf8");
    expect(src).toContain("function VisualsChoice");
    for (const s of ["Sans visuel (textes seulement)", "Visuels gratuits", "Visuels créés par l'IA", "No visual (text only)", "Free visuals", "Visuals created by AI"]) expect(src).toContain(s);
    expect(src).toMatch(/action: "plan", request: request\(\), visuals/);
    // Le bouton ne dit « (gratuit) » que pour les textes seuls.
    expect(src).toContain("avec visuels gratuits");
    expect(src).toContain("Voir le coût : ${days * f.perDay} publications avec visuels IA");
    const quoteBox = src.slice(src.indexOf("function VisualQuoteBox"), src.indexOf("// ------------------------------------------------------------------ calendrier"));
    expect(quoteBox).toContain("% {t(\"de votre budget IA\"");
    expect(quoteBox).not.toMatch(/€|EUR|1e6/);
  });

  it("sans visuel : comportement d'origine (textes seulement, aucune tâche)", async () => {
    const p = await project("artisan");
    await photo(p, "chantier-1.jpg");
    const r = await call(p.id, { action: "plan", request: request(), visuals: "none" });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.created).toBeGreaterThan(0);
    expect(postsOf(j.planId).every((x) => x.media === "[]")).toBe(true);
    expect(jobsOf(p.id)).toHaveLength(0);
  });

  it("visuels gratuits (services) : photos du client et photo libre signalée posées, jamais deux fois de suite ; vidéos montées sans IA en tâche de fond", async () => {
    const p = await project("artisan");
    expect(p.business).toBe("services");
    const own = [await photo(p, "chantier-1.jpg"), await photo(p, "chantier-2.jpg"), await photo(p, "chantier-3.jpg")];
    const stock = await photo(p, "pixabay-peintre.jpg", { origin: "import", meta: { stock: { source: "pixabay", id: "42", license: "Pixabay Content License", author: "x" } } });
    // Jamais un logo ni une affiche du studio.
    await photo(p, "logo.png", { role: "logo" });
    const r = await call(p.id, { action: "plan", request: request({ days: 14, perDay: 1 }), visuals: "free" });
    expect(r.status).toBe(200);
    const j = await r.json();
    const rows = postsOf(j.planId);
    const imgs = rows.filter((x) => !isVideo(x.format) && x.format !== "text");
    const vids = rows.filter((x) => isVideo(x.format));
    expect(imgs.length).toBeGreaterThan(3);
    expect(vids.length).toBeGreaterThan(0);
    const allowed = new Set([...own.map((a) => a.id), stock.id]);
    const media = imgs.map((x) => JSON.parse(x.media)[0]);
    expect(media.every((m) => allowed.has(m))).toBe(true);
    for (let i = 1; i < media.length; i++) expect(media[i]).not.toBe(media[i - 1]);
    expect(j.visuals).toMatchObject({ mode: "free", images: imgs.length, waiting: 0, message: null });
    expect(j.visuals.stock).toBe(media.filter((m) => m === stock.id).length);
    expect(j.visuals.stock).toBeGreaterThan(0);
    // Vidéos : une tâche de fond, gratuite (aucune dépense permise), une publication à la fois avec suivi.
    const job = getJob(j.jobId)!;
    expect(job.type).toBe("social.v2.produce");
    const payload = JSON.parse(job.payload);
    expect(payload).toMatchObject({ allowPaid: false, maxCostEur: 0, markWaiting: true });
    expect(payload.ids.sort()).toEqual(vids.map((x) => x.id).sort());
    expect(all("SELECT 1 FROM ai_calls WHERE project_id = ?", p.id)).toHaveLength(0);
  });

  it("visuels gratuits (boutique) : jamais de photo libre de droits ; banque vide = texte gardé et message clair, sur la publication aussi", async () => {
    const p = await project("cosmetic");
    await photo(p, "pixabay.jpg", { origin: "import", meta: { stock: { source: "pixabay", id: "1", license: "Pixabay Content License" } } });
    expect(freeImagePool(p)).toHaveLength(0);
    const r = await call(p.id, { action: "plan", request: request({ mix: { image: 100 } }), visuals: "free" });
    const j = await r.json();
    expect(j.visuals.images).toBe(0);
    expect(j.visuals.message).toMatch(/Ajoutez des photos à votre banque d'images, ou choisissez les visuels par l'IA/);
    const rows = postsOf(j.planId);
    expect(rows.every((x) => x.media === "[]")).toBe(true);
    const view = fr(() => postViewV2(p, one("SELECT * FROM posts WHERE id = ?", rows[0].id), { gate: true }));
    expect(view.visualNote).toMatch(/Ajoutez des photos à votre banque d'images/);
    const viewEn = en(() => postViewV2(p, one("SELECT * FROM posts WHERE id = ?", rows[0].id)));
    expect(viewEn.visualNote).toMatch(/Add photos to your image bank, or choose AI visuals/);
    // Une seule photo : posée une publication sur deux (jamais deux fois de suite), les autres le disent.
    const solo = await photo(p, "flacon.jpg", { role: "original" });
    const f = fr(() => attachFreeVisuals(p, rows.map((x) => x.id)));
    expect(f.images).toBe(Math.ceil(rows.length / 2));
    expect(f.message).toMatch(/pas assez de photos différentes/);
    const after = postsOf(j.planId).map((x) => JSON.parse(x.media)[0] ?? null);
    for (let i = 1; i < after.length; i++) expect(after[i] && after[i] === after[i - 1]).toBeFalsy();
    expect(after.filter(Boolean).every((m) => m === solo.id)).toBe(true);
    // La publication qui a reçu une image n'affiche plus de message d'attente.
    const withImg = postsOf(j.planId).find((x) => x.media !== "[]")!;
    expect(json<{ visualNote?: unknown }>(withImg.brief, {}).visualNote).toBeUndefined();
  });

  it("visuels IA : devis en % du budget IA (sans €), rien créé ni lancé sans le clic de confirmation ; budget insuffisant refusé avec proposition", async () => {
    const p = await project("cosmetic");
    aiOn = true;
    try {
      const body = { action: "plan", request: request({ days: 10, perDay: 2, mix: { image: 60, video: 40 } }), visuals: "ai" };
      const r = await call(p.id, body);
      expect(r.status).toBe(200);
      const text = await r.text();
      expect(text).not.toMatch(/€|Micro|eur/i);
      const j = JSON.parse(text);
      expect(j.needsConfirm).toBe(true);
      expect(j.quote.images + j.quote.videos).toBe(20);
      expect(j.quote.videos).toBeGreaterThan(0);
      expect(typeof j.quote.pct).toBe("number");
      // Aucun appel payant sans confirmation : aucune publication, aucune tâche, aucun appel d'IA.
      expect(all("SELECT 1 FROM posts WHERE project_id = ?", p.id)).toHaveLength(0);
      expect(jobsOf(p.id)).toHaveLength(0);
      // Confirmation sans le devis accepté : refusée.
      expect((await call(p.id, { ...body, confirm: true })).status).toBe(409);
      expect(all("SELECT 1 FROM posts WHERE project_id = ?", p.id)).toHaveLength(0);
      // Même base que la jauge « Reste … % » : coût probable / capacité du mois.
      const b = balance(p.userId, p.id);
      const q = fr(() => quoteVisuals(p, { images: 12, videos: 8 }, (k) => (k === "image" ? 10_000 : 50_000)));
      expect(q.pct).toBeCloseTo(Math.round(((12 * 10_000 + 8 * 50_000) / b.capacity) * 1000) / 10, 5);
      if (j.quote.enough) {
        const ok = await call(p.id, { ...body, confirm: true, approvedPct: j.quote.pct });
        expect(ok.status).toBe(200);
        const k = await ok.json();
        const job = getJob(k.jobId)!;
        const payload = JSON.parse(job.payload);
        expect(payload).toMatchObject({ allowPaid: true, markWaiting: true, aiImages: null });
        expect(payload.ids).toHaveLength(20);
        expect(payload.batchSize).toBe(20);
        expect(payload.approvedEstimateMicro).toBeLessThanOrEqual(Math.round(payload.maxCostEur * 1_000_000));
      }
      // Budget épuisé : refus clair, avec moins de publications ou les visuels gratuits proposés.
      run("UPDATE wallets SET monthly_used = monthly_allowance, topup_balance = 0 WHERE user_id = ?", accountKeyFor(p.userId, p.id));
      const none = await (await call(p.id, body)).json();
      expect(none.quote.enough).toBe(false);
      const refused = await call(p.id, { ...body, confirm: true, approvedPct: none.quote.pct });
      expect(refused.status).toBe(402);
      expect((await refused.json()).error).toMatch(/moins de publications.*visuels gratuits/);
      const src = fs.readFileSync("src/components/studio/social-studio.tsx", "utf8");
      expect(src).toContain("Choisir les visuels gratuits");
    } finally {
      aiOn = false;
    }
    expect(all("SELECT 1 FROM ai_calls WHERE project_id = ?", p.id)).toHaveLength(0);
  });

  it("visuels IA sans IA active : refusé, visuels gratuits proposés", async () => {
    const p = await project("cosmetic");
    aiOn = false;
    const r = await call(p.id, { action: "plan", request: request(), visuals: "ai" });
    expect(r.status).toBe(402);
    expect((await r.json()).error).toMatch(/visuels gratuits/);
    expect(jobsOf(p.id)).toHaveLength(0);
  });

  it("calendrier : la vignette remplace le « T » dès qu'un média est posé (image, ou image de la vidéo) ; sinon le message d'attente", () => {
    const src = fs.readFileSync("src/components/studio/social-studio.tsx", "utf8");
    const card = src.slice(src.indexOf("function CalCard"), src.indexOf("function CalendarPanel"));
    expect(card).toMatch(/media \? <AssetThumb a=\{media\}/);
    expect(card).toContain("data-visual-note");
    expect(card).toContain("data-stock-badge");
    // Vidéo : la vignette de la vidéo (image extraite à l'enregistrement) est affichée par AssetThumb.
    const common = fs.readFileSync("src/components/studio/common.tsx", "utf8");
    expect(common).toMatch(/a\.kind === "video"[\s\S]{0,200}a\.thumbUrl \? <img src=\{a\.thumbUrl\}/);
  });
});
