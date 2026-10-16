/** Ouverture de la boutique : une photo en situation horizontale passe devant une verticale (pas de zoom excessif). */
import { describe, expect, it } from "vitest";
import sharp from "sharp";

const { createUser } = await import("@/lib/auth");
const { id, now, run } = await import("@/lib/db");
const { saveAsset } = await import("@/lib/library");
const { collectImages } = await import("@/lib/engine/shop");

describe("Héros de la boutique", () => {
  it("prend la photo horizontale, la verticale reste pour le second emplacement", async () => {
    const u = await createUser(`heros${Date.now()}@test.fr`, "motdepasse-test", "H");
    const pid = id();
    run(
      "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      pid, u.id, "Montre", "ready", "shopify", JSON.stringify({ name: "Montre", category: "montre", facts: [], questions: [] }), "{}", JSON.stringify({ language: "fr" }), "[]", now(), now(),
    );
    const photo = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: "#876" } }).jpeg().toBuffer();
    const large = await saveAsset({ projectId: pid, userId: u.id, data: await photo(64, 36), name: "large.jpg", mime: "image/jpeg", role: "lifestyle", origin: "upload", meta: {} });
    // La plus récente est verticale : elle ne doit pas ouvrir la boutique.
    const haute = await saveAsset({ projectId: pid, userId: u.id, data: await photo(36, 64), name: "haute.jpg", mime: "image/jpeg", role: "lifestyle", origin: "upload", meta: {} });
    run("UPDATE assets SET created_at = created_at + 1000 WHERE id = ?", haute.id);
    const { slots, files } = collectImages(pid);
    expect(files[slots.lifestyle!]).toBe(large.id);
    expect(files[slots.lifestyle2!]).toBe(haute.id);
  });
});
