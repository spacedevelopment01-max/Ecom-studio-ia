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
    expect(made.map((a) => a.role).sort()).toEqual(["ad", "ad", "ad", "banner", "social", "social"]);
    // Une publicité = une photo et une mise en page, la même dans chaque format.
    const offer = made.filter((a) => JSON.parse(a.meta).concept === "offre");
    expect(new Set(offer.map((a) => a.source_asset_id)).size).toBe(1);
    expect(new Set(offer.map((a) => JSON.parse(a.meta).poster.layout)).size).toBe(1);
    // Photo en situation : uniquement des mises en page où la photo reste entière, en plein cadre.
    for (const a of made) expect(JSON.parse(a.meta).poster.layout).toMatch(/^tpl:/);
    for (const a of made) {
      expect(photos).toContain(a.source_asset_id);
      expect(JSON.parse(a.meta).poster.backgroundAssetId).toBe(a.source_asset_id);
    }
  }, 180_000);
});

describe("visuels sur photo : une publicité par photo, déclinée dans chaque format", () => {
  it("offre (prix confirmé seulement) en 4 formats, photo en situation sur une autre photo", async () => {
    const { photoSetPlan } = await import("@/lib/engine/images");
    const base = { name: "Sonore", product: { name: "Casque audio", category: "Audio", facts: [], variants: [], price: { status: "confirmed", amount: 7900, currency: "EUR" } }, brand: { name: "Sonore", tagline: "Le son vous suit partout." } } as any;
    const plan = runWithLang({ ui: "fr", content: "fr" }, () => photoSetPlan(base, {}, 3));
    expect(plan.map((c) => c.key)).toEqual(["offre", "situation"]);
    expect(plan[0].formats.map((f) => `${f.role}:${f.aspect}`)).toEqual(["ad:1:1", "ad:4:5", "ad:9:16", "banner:16:9"]);
    expect(plan[0]).toMatchObject({ headline: "Casque audio", subline: "79 €", cta: "Commander" });
    // Photo en situation : la phrase de marque seule (la photo fait le travail).
    expect(plan[1]).toMatchObject({ headline: "Le son vous suit partout.", subline: null, cta: null, features: null });
    // Une seule photo : une seule publicité (jamais la même photo réutilisée pour une autre publicité).
    expect(runWithLang({ ui: "fr", content: "fr" }, () => photoSetPlan(base, {}, 1)).map((c) => c.key)).toEqual(["offre"]);
    // Prix non confirmé : jamais affiché.
    const unsure = runWithLang({ ui: "fr", content: "fr" }, () => photoSetPlan({ ...base, product: { ...base.product, price: { status: "unknown", amount: 7900, currency: "EUR" } } }, {}, 2));
    expect(JSON.stringify(unsure)).not.toContain("79");
    expect(unsure[0].cta).toBe("Voir la boutique");
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

describe("photo du client : entière et en vraies couleurs", () => {
  it("jamais un modèle qui la découpe (cercle, demi-image, collage) ni un voile bichrome ou noir et blanc", async () => {
    const { pickPosterLook } = await import("@/lib/ads-v2/poster");
    const { templateById } = await import("@/lib/ads-v2/library");
    const { adArt } = await import("@/lib/ads-v2/art");
    const { brandTypo } = await import("@/lib/engine/images");
    const { loadProject } = await import("@/lib/projects");
    const u = await createUser(`photoentiere${Date.now()}@test.fr`, "motdepasse-test", "E");
    const p = loadProject(seedImageFixture(u.id, "hightech"));
    const art = adArt(p, brandTypo(p));
    for (let n = 0; n < 60; n++) {
      const look = pickPosterLook(art, n * 7919, [], true, false, true);
      expect(look.layout).toMatch(/^tpl:/);
      const t = templateById(look.layout.slice(4))!;
      expect(t.family, t.id).toBe("photo");
      expect(t.coversSubject, t.id).toBeFalsy();
      expect(["duotone", "mono"], t.id).not.toContain(look.variant.treatment);
    }
  });
});
