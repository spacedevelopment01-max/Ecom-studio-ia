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

describe("visuels sur photo : un angle par visuel, rien d'inventé", () => {
  it("photo en situation avec phrase courte, offre avec le prix confirmé seulement, bouton qui nomme l'action", async () => {
    const { photoSetPlan } = await import("@/lib/engine/images");
    const base = { name: "Sonore", product: { name: "Casque audio", category: "Audio", facts: [], variants: [], price: { status: "confirmed", amount: 7900, currency: "EUR" } }, brand: { name: "Sonore", tagline: "Le son vous suit partout." } } as any;
    const plan = runWithLang({ ui: "fr", content: "fr" }, () => photoSetPlan(base));
    expect(plan.map((x) => `${x.role}:${x.aspect}`)).toEqual(["social:4:5", "ad:9:16", "ad:1:1", "banner:16:9"]);
    // Photo en situation : la phrase de marque seule (la photo fait le travail).
    expect(plan[0]).toMatchObject({ headline: "Le son vous suit partout.", subline: null, cta: null, features: null });
    // Offre : nom exact du produit et prix confirmé ; bouton « Commander ».
    expect(plan[1]).toMatchObject({ headline: "Casque audio", subline: "79 €", cta: "Commander" });
    // Angles différents : pas deux fois le même titre et le même sous-titre.
    expect(new Set(plan.map((x) => `${x.headline}|${x.subline}`)).size).toBe(plan.length);
    // Prix non confirmé : jamais affiché.
    const unsure = runWithLang({ ui: "fr", content: "fr" }, () => photoSetPlan({ ...base, product: { ...base.product, price: { status: "unknown", amount: 7900, currency: "EUR" } } }));
    expect(JSON.stringify(unsure)).not.toContain("79");
    expect(unsure[1].cta).toBe("Voir la boutique");
  });
});

describe("ponctuation française dans les visuels", () => {
  it("« : » et « ? » ne partent jamais seuls en début de ligne", async () => {
    const { createCanvas } = await import("@napi-rs/canvas");
    const { wrap } = await import("@/lib/ad-doc/render");
    const ctx = createCanvas(10, 10).getContext("2d");
    ctx.font = "40px sans-serif";
    for (const w of [200, 260, 320, 400, 520]) {
      const lines = wrap(ctx as any, "Casque audio : comment l'utiliser ?", w);
      for (const l of lines) expect(l, `${w}px : ${JSON.stringify(lines)}`).not.toMatch(/^[:;?!»]/);
    }
  });
});
