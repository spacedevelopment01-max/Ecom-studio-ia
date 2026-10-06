/** Entreprise de services sans photo : chaque publication « image » du calendrier reçoit bien un visuel à la marque. */
import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { id, now, one, all, run } from "@/lib/db";
import { enqueue, JobContext } from "@/lib/jobs";
import { runWithLang } from "@/lib/i18n-server";
import { localBrand } from "@/lib/engine/local";
import { createContentPlan } from "@/lib/engine/calendar";
import { serviceProduct, serviceProfile } from "./fixtures";

describe("publications d'une entreprise de services", () => {
  it("aucune publication image sans image, même sans photo fournie", async () => {
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
      expect(media.length, `${p.format} ${p.status}`).toBeGreaterThan(0);
      expect(one<{ kind: string }>("SELECT kind FROM assets WHERE id = ?", media[0])?.kind).toBe("image");
      expect(p.status).not.toBe("draft");
    }
  }, 120_000);
});
