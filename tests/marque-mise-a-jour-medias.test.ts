import { grantProjectPlan } from "@/lib/project-subscriptions";
/**
 * Changement de marque : toutes les créations suivent. Publicités (couleurs, logo, nom ET polices), vidéos (titres,
 * carte de fin, sous-titres, puis nouveau rendu), visuels faits par l'IA (nouvelle version payante seulement avec le
 * prix accepté par le client, jamais cochée d'office).
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";

describe("Changement de marque : images et vidéos mises à jour", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject, saveBrand } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { one } = await import("@/lib/db");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { buildSceneDoc, localScenePlan } = await import("@/lib/video-v2/three-scenes");
  const { saveVideoVersion, latestVideo } = await import("@/lib/video-v2/store");
  const prop = await import("@/lib/workflow/propagation");
  const { snapshotOf } = await import("@/lib/brand-versions");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  async function setup() {
    const u = await createUser(`mm-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "hightech");
    grantProjectPlan(pid,"dominer");
    await seedCutout(u.id, pid);
    const p = loadProject(pid);
    const plan = localScenePlan(p, null, { as: "ad" });
    const doc = buildSceneDoc(p, plan.scenes.map((_, k) => ({ assetId: `a${k}`, durationS: 5, generated: true })), plan, "9:16", "ad");
    saveVideoVersion(pid, "vid:marque-test", doc, { note: "création" });
    const img = await saveAsset({ projectId: pid, userId: u.id, data: await sharp({ create: { width: 64, height: 80, channels: 3, background: "#222" } }).png().toBuffer(), name: "pub-ia.png", mime: "image/png", role: "ad", folderKey: "images.ads", origin: "generated", status: "ready", meta: { aiAd: true, aspect: "4:5", aiPost: { texts: { headline: "Son pur" }, subject: { kind: "product", key: "main", name: "Casque" }, request: "sur un bureau" } } });
    await new Promise((r) => setTimeout(r, 10));
    const old = snapshotOf(p.brand)!;
    saveBrand(pid, { ...p.brand!, name: "Nouvelle Marque", palette: { ...p.brand!.palette, primary: "#1F4E79", accent: "#C0392B" }, fonts: { heading: "Playfair Display", body: "Inter" } });
    return { pid, userId: u.id, img, old, doc };
  }

  it("vidéo et publicité : polices, couleurs et nom remplacés (plus d'ancienne police dans les titres)", async () => {
    const { pid, old, doc } = await setup();
    const now = snapshotOf(loadProject(pid).brand)!;
    const next = prop.rebrandVideoDoc(doc, old, now, null);
    const end = next.clips.at(-1)!.source as any;
    const texts = (next.clips.at(-1)!.overlays as any[]).filter((l: any) => l.kind === "text" || l.kind === "button");
    expect(texts.length).toBeGreaterThan(0);
    if (old.fonts) for (const l of texts) expect([old.fonts.heading, old.fonts.body].filter((f) => f !== now.fonts!.heading && f !== now.fonts!.body)).not.toContain(l.font.family);
    expect(next.brand.name).toBe("Nouvelle Marque");
    expect(JSON.stringify(next).toLowerCase()).not.toContain(old.palette.primary.toLowerCase());
  });

  it("impact : la vidéo se met à jour (nouveau rendu lancé) ; le visuel IA est payant, refusé sans prix accepté", async () => {
    const { pid, userId, img } = await setup();
    const impact = prop.brandImpact(loadProject(pid));
    const video = impact.items.find((i) => i.key === "video:vid:marque-test")!;
    expect(video.updatable).toBe(true);
    const ai = impact.items.find((i) => i.key === `ai_image:${img.id}`)!;
    expect(ai.kind).toBe("ai_image");
    expect(ai.paidMicro).toBeGreaterThan(0);
    const r = await fr(() => prop.applyBrandUpdate(pid, [video.key, ai.key], { userId }));
    expect(r.updated.map((u) => u.key)).toContain(video.key);
    expect(r.skipped.find((s) => s.key === ai.key)?.reason).toMatch(/prix à accepter/);
    expect(latestVideo(pid, "vid:marque-test")!.doc.brand.name).toBe("Nouvelle Marque");
    expect(one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'video.v2.render'", pid)).toBeTruthy();
    expect(one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'image.ai_post'", pid)).toBeFalsy();
    // Prix accepté : la nouvelle version part (dans le plafond de la tâche).
    const r2 = await fr(() => prop.applyBrandUpdate(pid, [ai.key], { userId, approvedPaidMicro: ai.paidMicro }));
    expect(r2.updated.map((u) => u.key)).toEqual([ai.key]);
    const job = one<{ payload: string }>("SELECT payload FROM jobs WHERE project_id = ? AND type = 'image.ai_post'", pid)!;
    // Le prix montré est le coût probable (un essai) ; le plafond de la tâche laisse la place des reprises (3 essais au plus).
    const payload = JSON.parse(job.payload);
    expect(payload).toMatchObject({ request: { as: "ad", format: "4:5", subject: { kind: "product", key: "main" } } });
    expect(payload.costCapMicro).toBeGreaterThan(ai.paidMicro!);
  });
  it("baisse de forfait : met à jour la vidéo locale, conserve la publicité IA sans lancer de tâche ni interrompre les autres éléments",async()=>{
    const {pid,userId,img}=await setup();grantProjectPlan(pid,"vendre");const impact=prop.brandImpact(loadProject(pid));const video=impact.items.find(i=>i.kind==="video")!,ai=impact.items.find(i=>i.key===`ai_image:${img.id}`)!;
    const result=await fr(()=>prop.applyBrandUpdate(pid,[video.key,ai.key],{userId,approvedPaidMicro:ai.paidMicro}));
    expect(result.updated.map(i=>i.key)).toContain(video.key);expect(result.skipped.find(i=>i.key===ai.key)?.reason).toMatch(/Dominer/);
    expect(one("SELECT id FROM jobs WHERE project_id=? AND type='image.ai_post'",pid)).toBeFalsy();expect(one("SELECT id FROM jobs WHERE project_id=? AND type='video.v2.render'",pid)).toBeTruthy();expect(one("SELECT id FROM assets WHERE id=? AND deleted_at IS NULL",img.id)).toBeTruthy();
  });

});
