/**
 * Réorganisation demandée par le propriétaire :
 *  - Publications et Calendrier : un seul onglet, sous-menu à gauche (Piloter / Créer / Gérer), sans « Comptes »
 *    (déjà dans Outils avancés) ;
 *  - Créer une publication IMAGE ou VIDÉO, avec ou sans IA : gratuit sans IA, payant seulement avec l'IA active et le
 *    prix accepté ; « une de mes images » de la banque comme fond ;
 *  - Images et Vidéos : banque neutre, sans texte (ni publications, ni publicités, ni montages titrés) ;
 *  - Stratégie long terme (12 mois) : feuille de route, parcours client, publics, temps forts réels, indicateurs,
 *    sans aucun chiffre inventé.
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

describe("Publications, banques et stratégie", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { all, one } = await import("@/lib/db");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { getJob } = await import("@/lib/jobs");
  const { navSpace, SPACES } = await import("@/lib/studio-nav");
  const { isBankImage, isBankVideo } = await import("@/lib/media/bank");
  const { createOnePost, produceParams, quoteOne } = await import("@/lib/social-v2/single");
  const { socialStrategy } = await import("@/lib/social-v2/strategy");
  const { longTermStrategy } = await import("@/lib/social-v2/strategy-long");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const social = await import("@/app/api/projects/[id]/social/v2/route");
  const bank = await import("@/app/api/projects/[id]/videos/bank/route");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const project = async (kind: "cosmetic" | "artisan" = "artisan") => {
    const u = await createUser(`pub-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    sessionUser = { ...u, role: "client" };
    const pid = seedImageFixture(u.id, kind);
    grantProjectPlan(pid, "vendre");
    return loadProject(pid);
  };
  const call = (mod: { POST: Function }, pid: string, path: string, body: unknown) => fr(() => mod.POST(new Request(`http://localhost:3000/api/projects/${pid}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: pid }) } as any)) as Promise<Response>;

  it("menu : Calendrier est une rubrique de Publications (plus d'entrée séparée) ; sous-menu à gauche sans Comptes", () => {
    expect(navSpace("calendrier")).toBe("publications");
    expect(navSpace("images")).toBe("images");
    expect(SPACES.filter((s) => !s.within).map((s) => s.id)).not.toContain("calendrier");
    const src = fs.readFileSync("src/components/studio/social-studio.tsx", "utf8");
    expect(src).toContain("data-social-subnav");
    for (const s of ['"image", "Publication image"', '"video", "Publication vidéo"', '"planifier"', '"pilote"', '"strategie"']) expect(src).toContain(s);
    expect(src).not.toContain('"comptes", "Comptes"');
    expect(src).not.toContain("function AccountsPanel");
  });

  it("une publication : une par réseau choisi, titre du client gardé, format image ou vidéo ; prix seulement en payant", async () => {
    const p = await project();
    const one1 = fr(() => createOnePost(p, { kind: "image", date: tomorrow, time: "11:30", timezone: "Europe/Paris", platforms: [{ platform: "instagram" }, { platform: "facebook" }], headline: "Nos rénovations de printemps", lang: "fr" }));
    expect(one1.ids).toHaveLength(2);
    const rows = all<{ title: string; format: string; brief: string }>(`SELECT title, format, brief FROM posts WHERE id IN (${one1.ids.map(() => "?").join(",")})`, ...one1.ids);
    expect(rows.every((r) => r.title === "Nos rénovations de printemps" && JSON.parse(r.brief).headline === "Nos rénovations de printemps")).toBe(true);
    expect(rows.every((r) => !["video", "reel", "short"].includes(r.format))).toBe(true);
    const vid = fr(() => createOnePost(p, { kind: "video", date: tomorrow, time: "18:30", timezone: "Europe/Paris", platforms: [{ platform: "tiktok" }], lang: "fr" }));
    expect(one<{ format: string }>("SELECT format FROM posts WHERE id = ?", vid.ids[0])!.format).toMatch(/video|reel|short/);
    const est = (k: string) => ({ image: 100, ai_post: 300, video: 900 })[k as "image"] ?? 0;
    expect(quoteOne("image", "free", 3, est as any)).toBe(0);
    expect(quoteOne("image", "ai_image", 2, est as any)).toBe(600); // ancien mode : publication entière par l'IA
    expect(quoteOne("image", "ai_post", 2, est as any)).toBe(600);
    expect(quoteOne("video", "ai_video", 1, est as any)).toBe(900);
    expect(produceParams("image", "free")).toEqual({ allowPaid: false });
    expect(produceParams("image", "ai_image")).toEqual({ allowPaid: true, aiImages: 60 }); // plus de mise en page du studio
    expect(produceParams("image", "ai_post")).toMatchObject({ allowPaid: true, aiImages: 60 });
  });

  it("API create_one : gratuit sans image IA validée = en attente (jamais une photo de la banque mise en page) ; payant refusé sans IA ou sans prix accepté", async () => {
    const p = await project();
    const photo = await saveAsset({ projectId: p.id, userId: p.userId, data: await sharp({ create: { width: 900, height: 1100, channels: 3, background: "#7a5c43" } }).jpeg().toBuffer(), name: "chantier.jpg", mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "upload", status: "approved", meta: {} });
    aiOn = false;
    const r = await call(social, p.id, "social/v2", { action: "create_one", kind: "image", mode: "free", date: tomorrow, time: "11:30", timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], backgroundId: photo.id });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.produced).toBe(0);
    expect(JSON.parse(one<{ media: string }>("SELECT media FROM posts WHERE id = ?", j.ids[0])!.media)).toEqual([]);
    expect(j.notes.join(" ")).toMatch(/aucun gabarit/);
    expect((await call(social, p.id, "social/v2", { action: "create_one", kind: "image", mode: "ai_post", date: tomorrow, time: "12:30", timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], approvedEstimateMicro: 10_000_000 })).status).toBe(402);
    aiOn = true;
    expect((await call(social, p.id, "social/v2", { action: "create_one", kind: "image", mode: "ai_post", date: tomorrow, time: "13:30", timezone: "Europe/Paris", platforms: [{ platform: "instagram" }] })).status).toBe(409);
    expect((await call(social, p.id, "social/v2", { action: "create_one", kind: "image", mode: "ai_video", date: tomorrow, time: "13:30", timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], approvedEstimateMicro: 10_000_000 })).status).toBe(400);
    const paid = await call(social, p.id, "social/v2", { action: "create_one", kind: "image", mode: "ai_image", date: tomorrow, time: "14:30", timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], approvedEstimateMicro: 100_000_000 });
    expect(paid.status).toBe(200);
    const pj = await paid.json();
    expect(getJob(pj.jobId)!.type).toBe("social.v2.produce");
    // Ancien mode « image IA + mise en page du studio » : désormais publication entière par l'IA.
    expect(JSON.parse(getJob(pj.jobId)!.payload)).toMatchObject({ allowPaid: true, aiBackground: false, aiImages: 60 });
    aiOn = false;
  }, 60_000);

  it("banques : seulement des médias neutres, sans texte ; écrans sans création de publication", () => {
    for (const role of ["original", "cutout", "packshot", "scene", "lifestyle", "ambiance", "detail"]) expect(isBankImage({ kind: "image", role })).toBe(true);
    for (const role of ["social", "ad", "banner", "post-photo", "logo"]) expect(isBankImage({ kind: "image", role })).toBe(false);
    expect(isBankVideo({ kind: "video", role: "clip" })).toBe(true);
    expect(isBankVideo({ kind: "video", role: "video" })).toBe(false);
    const img = fs.readFileSync("src/components/studio/tab-images.tsx", "utf8");
    expect(img).toContain("Banque d'images");
    expect(img).toContain("Chercher des photos libres");
    expect(img).not.toContain("VisualChoice");
    const vid = fs.readFileSync("src/components/studio/tab-videos.tsx", "utf8");
    expect(vid).toContain("Banque de vidéos");
    expect(vid).not.toContain("VideoV2Panel");
  });

  it("banque de vidéos : plans libres en tâche gratuite ; plan IA refusé sans IA active ou sans prix accepté", async () => {
    const p = await project();
    const s = await call(bank, p.id, "videos/bank", { action: "stock", topic: "atelier", aspect: "9:16", count: 2 });
    expect(s.status).toBe(200);
    expect(getJob((await s.json()).jobId)!.type).toBe("video.bank.stock");
    aiOn = false;
    expect((await call(bank, p.id, "videos/bank", { action: "ai", imageId: "x", aspect: "9:16", approvedEstimateMicro: 99_000_000 })).status).toBe(402);
    aiOn = true;
    expect((await call(bank, p.id, "videos/bank", { action: "ai", imageId: "x", aspect: "9:16", approvedEstimateMicro: 0 })).status).toBe(409);
    aiOn = false;
  });

  it("stratégie 12 mois : 4 étapes datées, parcours client complet, publics en hypothèses, rien de chiffré inventé", async () => {
    const p = await project();
    const s = fr(() => socialStrategy(p, { lang: "fr" }));
    const lt = fr(() => longTermStrategy(p, s, { lang: "fr", start: new Date("2026-10-15T00:00:00Z"), city: "Lyon", connected: 0 }));
    expect(lt.roadmap.map((q) => q.title)).toEqual(["Poser les bases", "Installer la confiance", "Accélérer", "Fidéliser et préparer l'année 2"]);
    expect(lt.roadmap[0].months).toMatch(/octobre 2026/);
    expect(lt.horizon).toMatch(/octobre 2026 → septembre 2027/);
    expect(lt.funnel.map((f) => f.id)).toEqual(["awareness", "trust", "action", "loyalty"]);
    const total = lt.funnel.reduce((n, f) => n + f.share, 0);
    expect(total).toBeGreaterThanOrEqual(95);
    expect(total).toBeLessThanOrEqual(105);
    expect(lt.personas.some((x) => !x.confirmed)).toBe(true);
    expect(lt.personas[0].name).toMatch(/Lyon|déclaré/);
    // Aucun objectif chiffré inventé : à compléter après de vraies mesures (sauf la régularité, qui dépend du client).
    expect(lt.kpis.filter((k) => k.name !== "Régularité").every((k) => /\[À compléter/.test(k.target))).toBe(true);
    expect(lt.nextActions[0]).toMatch(/Connexions/);
    for (const m of lt.moments) expect(m.date >= "2026-10-15" && m.date <= "2027-10-15").toBe(true);
    expect(lt.rituals).toHaveLength(3);
    const en = runWithLang({ ui: "en", content: "en" }, () => longTermStrategy(p, socialStrategy(p, { lang: "en" }), { lang: "en", start: new Date("2026-10-15T00:00:00Z") }));
    expect(en.roadmap[0].title).toBe("Lay the foundations");
  });
});
