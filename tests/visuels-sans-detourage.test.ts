/**
 * Produit montré seulement en situation (une personne porte le casque, plage au soir) : rien n'est détouré, et les
 * visuels (publicités, bannière, visuel social) sont mis en page sur les vraies photos du client.
 */
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";

// Moteur local seulement (aucun appel d'IA).
vi.mock("@/lib/ai/llm", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/llm")>()), llmConfigured: () => false }));
import { createUser } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { enqueue, JobContext } from "@/lib/jobs";
import { runWithLang } from "@/lib/i18n-server";
import { saveAsset } from "@/lib/library";
import { seedImageFixture } from "./image-v2-fixtures";

describe("visuels sans détourage", () => {
  it("photos en situation seulement : pas de silhouette découpée, visuels posés sur les vraies photos", async () => {
    const { generateImageSet } = await import("@/lib/engine/images");
    const u = await createUser(`sansdetour${Date.now()}@test.fr`, "motdepasse-test", "C");
    const pid = seedImageFixture(u.id, "hightech");
    const photos: string[] = [];
    for (const f of ["casque-1", "casque-3"]) {
      const data = fs.readFileSync(`scripts/demo-products/inputs/pixabay/${f}.jpg`);
      photos.push((await saveAsset({ projectId: pid, userId: u.id, data, name: `${f}.jpg`, mime: "image/jpeg", role: "original", folderKey: "images.originals", origin: "upload", meta: {}, status: "ready" })).id);
    }
    const job = enqueue({ userId: u.id, projectId: pid, type: "images.generate", payload: {} });
    const r = await runWithLang({ ui: "fr", content: "fr" }, () => generateImageSet(new JobContext(job), pid));
    expect(all("SELECT id FROM assets WHERE project_id = ? AND role = 'cutout' AND deleted_at IS NULL AND status != 'rejected'", pid)).toEqual([]);
    const made = r.created.map((id) => one<{ role: string; source_asset_id: string; meta: string }>("SELECT role, source_asset_id, meta FROM assets WHERE id = ?", id)!);
    expect(made.map((a) => a.role).sort()).toEqual(["ad", "ad", "banner", "social"]);
    for (const a of made) {
      expect(photos).toContain(a.source_asset_id);
      expect(JSON.parse(a.meta).poster.backgroundAssetId).toBe(a.source_asset_id);
    }
  }, 180_000);
});
