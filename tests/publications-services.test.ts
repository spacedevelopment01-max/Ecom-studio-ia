/**
 * Entreprise de services : l'ancien calendrier ne compose plus de visuel du studio (images finales 100 % IA) ; les
 * publications en image restent en brouillon jusqu'à leur visuel créé par l'IA dans Publications.
 */
import { describe, expect, it, vi } from "vitest";

// Moteur local seulement : une clé d'IA posée par un autre fichier de tests (même base) ne doit pas déclencher d'appel.
vi.mock("@/lib/ai/llm", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/llm")>()), llmConfigured: () => false }));
import { createUser } from "@/lib/auth";
import { id, now, one, all, run } from "@/lib/db";
import { enqueue, JobContext } from "@/lib/jobs";
import { runWithLang } from "@/lib/i18n-server";
import { localBrand } from "@/lib/engine/local";
import { createContentPlan } from "@/lib/engine/calendar";
import { serviceProduct, serviceProfile } from "./fixtures";

describe("publications d'une entreprise de services", () => {
  it("ancien calendrier : aucune carte du studio ni photo de banque ; la publication image attend son visuel IA", async () => {
    const u = await createUser(`svcpost${Date.now()}@test.fr`, "motdepasse-test", "S");
    const product = { ...serviceProduct, name: "AutoDim", summary: "Carrosserie et peinture automobile à Mâcon." };
    const services = { ...serviceProfile, contactMode: "call" as const, bookingUrl: "" };
    const { brand, strategy } = runWithLang({ ui: "fr", content: "fr" }, () => localBrand(product, "AutoDim", { business: "services", services } as any));
    const pid = id();
    run(
      "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      pid, u.id, "AutoDim", "ready", "shopify", JSON.stringify(product), JSON.stringify(brand), JSON.stringify(strategy), JSON.stringify({ language: "fr" }), "[]", "services", JSON.stringify(services), now(), now(),
    );
    const params = { startDate: "2026-10-08", days: 4, perDay: 1, slots: ["11:30"], timezone: "Europe/Paris", networks: [{ network: "facebook" }, { network: "instagram" }], goals: "", tone: "", mix: { photo: 1, video: 0, text: 0 }, approval: "manual" as const };
    const job = enqueue({ userId: u.id, projectId: pid, type: "calendar.generate", payload: params });
    await runWithLang({ ui: "fr", content: "fr" }, () => createContentPlan(new JobContext(job), pid, params));
    const posts = all<{ media: string; format: string; status: string }>("SELECT media, format, status FROM posts WHERE project_id = ?", pid);
    expect(posts.length).toBeGreaterThan(0);
    for (const p of posts.filter((x) => !["reel", "short", "video"].includes(x.format))) {
      const media = JSON.parse(p.media) as string[];
      expect(media, `${p.format} ${p.status}`).toEqual([]);
    }
  }, 120_000);
});

describe("publications d'une entreprise de services avec ses propres photos", () => {
  it("la plupart des publications montrent les vraies photos du client (pas une photo libre hors sujet)", async () => {
    const sharp = (await import("sharp")).default;
    const { saveAsset } = await import("@/lib/library");
    const { localRender } = await import("@/lib/social-v2/deps");
    const { loadProject } = await import("@/lib/projects");
    const u = await createUser(`svcown${Date.now()}@test.fr`, "motdepasse-test", "S");
    const product = { ...serviceProduct, name: "Le Comptoir", summary: "Barbier à Bordeaux." };
    const services = { ...serviceProfile, contactMode: "booking" as const };
    const { brand, strategy } = runWithLang({ ui: "fr", content: "fr" }, () => localBrand(product, "Le Comptoir", { business: "services", services } as any));
    const pid = id();
    run(
      "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      pid, u.id, "Le Comptoir", "ready", "woocommerce", JSON.stringify(product), JSON.stringify(brand), JSON.stringify(strategy), JSON.stringify({ language: "fr" }), "[]", "services", JSON.stringify(services), now(), now(),
    );
    const own: string[] = [];
    for (const k of [0, 1]) {
      const data = await sharp({ create: { width: 1200, height: 1500, channels: 3, background: { r: 120 + k * 40, g: 80, b: 60 } } }).jpeg().toBuffer();
      own.push((await saveAsset({ projectId: pid, userId: u.id, data, name: `salon-${k}.jpg`, mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "upload", meta: {}, status: "ready" })).id);
    }
    const p = loadProject(pid);
    let ownUsed = 0;
    for (let n = 0; n < 9; n++) {
      const r = await runWithLang({ ui: "fr", content: "fr" }, () => localRender(p, { id: `post-own-${n}`, network: "instagram", format: "image", title: "Coupe homme", caption: "Coupe homme aux ciseaux.", hashtags: [], headline: "Coupe homme", pillar: null } as any));
      const bg = JSON.parse(one<{ meta: string }>("SELECT meta FROM assets WHERE id = ?", r.assetId)!.meta).poster?.backgroundAssetId;
      if (own.includes(bg)) ownUsed++;
    }
    expect(ownUsed).toBeGreaterThanOrEqual(5);
  }, 120_000);
});

describe("publications d'un produit avec les vraies photos du client", () => {
  it("la plupart des publications montrent les photos en situation du client ; un packshot sur fond uni n'en est pas une", async () => {
    const sharp = (await import("sharp")).default;
    const { saveAsset } = await import("@/lib/library");
    const { localRender } = await import("@/lib/social-v2/deps");
    const { loadProject } = await import("@/lib/projects");
    const { seedImageFixture } = await import("./image-v2-fixtures");
    const u = await createUser(`prodown${Date.now()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "cosmetic");
    const scene = (await saveAsset({ projectId: pid, userId: u.id, data: await sharp({ create: { width: 1200, height: 1500, channels: 3, background: { r: 150, g: 90, b: 70 } } }).jpeg().toBuffer(), name: "plage.jpg", mime: "image/jpeg", role: "original", folderKey: "images.originals", origin: "upload", meta: { triage: { kind: "busy", plain: false } }, status: "ready" })).id;
    const pack = (await saveAsset({ projectId: pid, userId: u.id, data: await sharp({ create: { width: 1200, height: 1200, channels: 3, background: { r: 255, g: 255, b: 255 } } }).jpeg().toBuffer(), name: "packshot.jpg", mime: "image/jpeg", role: "original", folderKey: "images.originals", origin: "upload", meta: { triage: { kind: "packshot", plain: true } }, status: "ready" })).id;
    const p = loadProject(pid);
    const used: string[] = [];
    for (let n = 0; n < 10; n++) {
      const r = await runWithLang({ ui: "fr", content: "fr" }, () => localRender(p, { id: `post-prod-${n}`, network: "instagram", format: "image", title: "Le sérum", caption: "Notre sérum.", hashtags: [], headline: "Le sérum", pillar: null } as any));
      used.push(JSON.parse(one<{ meta: string }>("SELECT meta FROM assets WHERE id = ?", r.assetId)!.meta).poster?.backgroundAssetId);
    }
    expect(used.filter((x) => x === scene).length).toBeGreaterThanOrEqual(5);
    expect(used.filter((x) => x === pack).length).toBeLessThanOrEqual(2);
  }, 120_000);
});
